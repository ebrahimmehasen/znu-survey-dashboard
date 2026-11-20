#!/usr/bin/env node
/*
 * بيقرا كل الفورمز اللي في assets/js/config.js (من صفحة الفورم العامة)
 * ويطلع ملف data/forms.json فيه: أقسام الفورم (دكتور/معيد + المادة)، بنود التقييم، وأسئلة الملاحظات.
 * الاستخدام:  node tools/build-schema.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "assets/js/config.js"), "utf8"), ctx);
const CFG = ctx.window.DASHBOARD_CONFIG;

const norm = (s) =>
  String(s ?? "")
    .replace(/[ً-ْـ]/g, "")
    .replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[ھہ]/g, "ه").replace(/[یي]/g, "ي").replace(/ک/g, "ك")
    .replace(/\s+/g, " ").trim();

// بنود التقييم الموحدة (كل الفورمز بتستخدم نفس البنود بصياغات مختلفة شوية)
const CRITERIA = [
  ["يوزع الخطة الدراسية في الأسبوع الأول", /يوزع الخطه/],
  ["عرض المادة بشكل واضح ومنظم", /يعرض الماده/],
  ["استغلال وقت المحاضرة", /يست[غظ]ل وقت/],
  ["التمكن من المادة العلمية", /تمكن/],
  ["التوافق مع مفردات الخطة", /تدريسه فعلا/],
  ["الالتزام بمواعيد المحاضرات", /بمواعيد/],
  ["تحفيز الطلاب على المشاركة", /المشاركه/],
  ["الاهتمام بالتحصيل الدراسي", /اهتمام/],
  ["التعامل مع الطلاب باحترام", /باحترام/],
  ["أساليب تستثير التفكير", /تستثير|تثير التفكير/],
  ["استخدام الأساليب التوضيحية والتطبيقية", /التوضيحيه/],
  ["التنوع في طرق التدريس", /طرائق/],
  ["لغة واضحة ومفهومة", /لغه واضحه/],
  ["توافق الامتحانات مع الشرح", /محتوي الامتحانات/],
  ["مناقشة إجابات الامتحان", /يناقش/],
  ["تنوع أساليب قياس التحصيل", /اساليب قياس/],
  ["الالتزام بالساعات المكتبية", /الساعات المكتبيه/],
  ["الدقة والعدالة في الدرجات", /العداله/],
  ["التحفيز على الاطلاع على المراجع", /مراجع/],
  ["تنمية الأخلاق والعادات الحميدة", /حميده/],
];
const criterionOf = (row) => {
  const n = norm(row);
  const i = CRITERIA.findIndex(([, re]) => re.test(n));
  return i;
};

const DOCTOR = /^(ا\s*\.?\s*م?\s*\.?\s*د(\s*\.?\s*م)?|ام\s*\.?\s*د|د)\s*[\/.\s]/;
// طبيب/طبيبة = طبيب مقيم (هيئة معاونة)
const TA = /^(م\s*\.?\s*م|م|ط|طبيبه?|معيده?|ا)\s*[\/.\s]/;

function parsePerson(rawTitle, description) {
  let title = String(rawTitle).replace(/\s+/g, " ").trim();
  // المادة: يا إما "المادة - الدكتور" في العنوان، يا إما وصف القسم لو سطر واحد قصير (فورمز الصيدلة)
  const desc = String(description || "").trim();
  let course = desc && desc.length <= 90 && !/\n/.test(desc) ? desc : null;
  // فورمز التمريض: "المقرر: <الاسم> — كود: <الكود>" سطر لكل مقرر
  const listed = [...desc.matchAll(/المقرر\s*:\s*(.+?)\s*(?:[—–-]\s*كود\s*:.*)?$/gm)].map((m) => m[1].trim());
  if (listed.length) course = [...new Set(listed)].join("، ");
  const dash = title.lastIndexOf(" - ");
  if (dash > 0) { course = title.slice(0, dash).trim(); title = title.slice(dash + 3).trim(); }
  const n = norm(title);
  let role = "unknown";
  if (DOCTOR.test(n)) role = "doctor";
  else if (TA.test(n)) role = "ta";
  const name = title.replace(/^[^ء-ي]*?((ا|أ|إ)\s*\.?\s*م?\s*\.?\s*د(\s*\.?\s*م)?|أم\s*\.?\s*د|م\s*\.?\s*م|طبيبة?|معيدة?|معيده?|د|م|ط|أ|ا)\s*[\/.\s]\s*/, "").trim() || title;
  return { title, name, role, course, key: norm(name).replace(/[^ء-ي]/g, "") };
}

async function fetchForm(formId) {
  const res = await fetch(`https://docs.google.com/forms/d/${formId}/viewform`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/FB_PUBLIC_LOAD_DATA_ = (\[.*?\]);\s*<\/script>/s);
  if (!m) throw new Error("مش لاقي بيانات الفورم (ممكن الفورم مقفول أو محتاج تسجيل دخول)");
  return JSON.parse(m[1]);
}

function buildSchema(data) {
  const items = data[1][1] || [];
  const sections = [];
  let cur = null;
  for (const it of items) {
    const type = it[3], title = (it[1] || "").trim();
    const isComment = /ملاحظ|مقترح|تعليق/.test(norm(title));
    if ((type === 8 || type === 6) && title && !isComment) {
      cur = { ...parsePerson(title, type === 8 ? it[2] : null), grids: [], comments: [] };
      sections.push(cur);
    } else if (type === 7 && cur) {
      cur.grids.push({
        title,
        rows: it[4].map((r) => ({ text: r[3][0].trim(), c: criterionOf(r[3][0]) })),
      });
    } else if ((type === 0 || type === 1) && cur) {
      cur.comments.push({ title });
    }
  }
  return { title: (data[3] || data[1][8] || "").trim(), sections: sections.filter((s) => s.grids.length) };
}

// الفورمز المقفولة مش بتظهر أسئلتها في لينك الإجابة؛ شكلها محفوظ في tools/closed-forms.json
const CLOSED = fs.existsSync(path.join(__dirname, "closed-forms.json"))
  ? JSON.parse(fs.readFileSync(path.join(__dirname, "closed-forms.json"), "utf8"))
  : { forms: {} };
function closedFormData(formId) {
  const f = CLOSED.forms[formId];
  if (!f) return null;
  const items = [];
  f.sections.forEach(([name, course]) => {
    items.push([0, name, course, 8, null]);
    items.push([0, "", null, 7, CLOSED.rows.map((r) => [0, null, null, [r]])]);
    items.push([0, CLOSED.comment, null, 1, null]);
  });
  return [null, [null, items], null, f.title];
}
const PREVIOUS = fs.existsSync(path.join(root, "data/forms.json"))
  ? JSON.parse(fs.readFileSync(path.join(root, "data/forms.json"), "utf8")).forms
  : {};

(async () => {
  const out = { generatedAt: new Date().toISOString(), criteria: CRITERIA.map(([l]) => l), forms: {} };
  const unknown = [];
  for (const f of CFG.forms) {
    process.stdout.write(`• ${f.id} ... `);
    try {
      let schema;
      try {
        schema = buildSchema(await fetchForm(f.formId));
      } catch (e) {
        const closed = closedFormData(f.formId);
        if (closed) { schema = buildSchema(closed); process.stdout.write("(مقفول — من closed-forms.json) "); }
        else if (PREVIOUS[f.formId]) { schema = PREVIOUS[f.formId]; process.stdout.write("(مقفول — النسخة السابقة) "); }
        else throw e;
      }
      out.forms[f.formId] = schema;
      schema.sections.filter((s) => s.role === "unknown").forEach((s) => unknown.push(`${f.id}: ${s.title}`));
      const bad = schema.sections.flatMap((s) => s.grids.flatMap((g) => g.rows)).filter((r) => r.c < 0);
      console.log(`${schema.sections.length} قسم${bad.length ? ` (⚠️ ${bad.length} بند مش متعرف عليه)` : ""}`);
    } catch (e) {
      console.log("❌ " + e.message);
    }
  }
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  fs.writeFileSync(path.join(root, "data/forms.json"), JSON.stringify(out, null, 1));
  console.log("\n✔ data/forms.json");
  if (unknown.length) console.log("\nأقسام من غير لقب (اتحسبت هيئة معاونة):\n  " + unknown.join("\n  "));
})();

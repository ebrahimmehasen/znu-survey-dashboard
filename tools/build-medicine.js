#!/usr/bin/env node
/*
 * كلية الطب البشري: الاستبيانات على LectaSync مش Google Forms، فالداش بورد مش بيقدر يسحبها لوحده.
 * السكريبت ده بياخد ملف الردود (بعد ما اتشال منه الاسم والكود والمجموعة ووقت الإجابة)
 * ويطلع لكل مستوى ملف data/medicine/<id>.json فيه النتيجة النهائية بنفس شكل تحليل الداش بورد.
 *
 * الاستخدام:  node tools/build-medicine.js <medicine.json>
 *
 * شكل ملف الإدخال: { surveys: [{ id, kind, module, responses, subjects, questions, names?, resp, comments }] }
 *   - تقييم الدكاترة (module_doctor_evaluation): resp = [رقم الصف, "أرقام الإجابات لكل دكتور مفصولة بـ |"]
 *     كل صف = طالب واحد قيّم دكتور واحد. comments = [رقم الصف, رقم الدكتور, النص]
 *   - تقييم المقرر (module_evaluation): resp = [رقم الصف, المستوى, "أرقام الإجابات"]، comments = [رقم الصف, رقم السؤال, النص]
 *   الأرقام: 5 = أوافق بشدة/ممتاز ... 1 = لا أوافق بشدة/ضعيف، و 0 = مفيش إجابة.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "assets/js/analyze.js"), "utf8"), ctx);
const { analyzeForm, isEmptyComment } = ctx.window.SurveyAnalyzer;

// كل مستوى = استبيان دكاترة + استبيان مقرر لنفس الموديول (أرقام الاستبيانات على LectaSync)
const LEVELS = [
  { id: "med-1", course: "S1 Basic Structure and Function", doctors: 9, module: 7 },
  { id: "med-2", course: "S3 Nervous System & Special Senses", doctors: 11, module: 12 },
  { id: "med-3", course: "S5 Systemic Pathology and Therapeutics II", doctors: 4, module: 5 },
  { id: "med-4-medicine", course: "S7 Medicine I", doctors: 18, module: 17 },
  { id: "med-4-pediatrics", course: "S7 Pediatrics", doctors: 16, module: 13 },
  { id: "med-5", course: "S9 Child Health Problem", doctors: 14, module: 15 },
];

// بنود تقييم الدكتور في الطب ← أقرب بند من البنود الموحدة (ترتيبها في tools/build-schema.js)
const CRIT = {
  "يشرح المفاهيم الطبية": 1, // عرض المادة بشكل واضح ومنظم
  "أمثلة وتطبيقات عملية": 10, // استخدام الأساليب التوضيحية والتطبيقية
  "طرح الأسئلة والمناقشة": 6, // تحفيز الطلاب على المشاركة
  "إيجابي ومحترم": 8, // التعامل مع الطلاب باحترام
  "وسائل تعليمية متنوعة": 11, // التنوع في طرق التدريس
  "بوقت المحاضرة": 5, // الالتزام بمواعيد المحاضرات
  "صوت المحاضر": 12, // لغة واضحة ومفهومة
};
const critOf = (q) => {
  const k = Object.keys(CRIT).find((x) => q.includes(x));
  if (k == null) throw new Error("بند مش معروف: " + q);
  return CRIT[k];
};
const isText = (q) => /تعليق|اقتراح/.test(q);
const WORDS = { 5: "موافق تماما", 4: "موافق", 3: "الى حد ما", 2: "غير موافق", 1: "غير موافق تماما" };

function doctorAnalysis(s, course) {
  const qs = s.questions;
  const scored = qs.map((q, j) => j).filter((j) => !isText(qs[j]));
  const textQ = qs.findIndex(isText);
  const commentTitle = textQ >= 0 ? qs[textQ] : "اضف تعليقك";
  const schema = {
    sections: s.names.map((name) => ({
      name, title: name, role: "doctor", course, key: name.replace(/[^ء-ي]/g, ""),
      grids: [{ title: "التقييم", rows: scored.map((j) => ({ text: qs[j], c: critOf(qs[j]) })) }],
      comments: [{ title: commentTitle }],
    })),
  };
  const headers = [];
  schema.sections.forEach((sec) => {
    sec.grids[0].rows.forEach((r) => headers.push(`التقييم [${r.text}]`));
    headers.push(commentTitle);
  });
  const width = scored.length + 1;
  const commentOf = new Map(s.comments.map(([row, prof, text]) => [row + ":" + prof, text]));
  const rows = [];
  for (const [rowNo, packed] of s.resp) {
    packed.split("|").forEach((digits, prof) => {
      if (!digits) return;
      const row = new Array(headers.length).fill("");
      scored.forEach((j, k) => { const v = +digits[j]; if (v) row[prof * width + k] = WORDS[v]; });
      row[prof * width + scored.length] = commentOf.get(rowNo + ":" + prof) || "";
      rows.push(row);
    });
  }
  const a = analyzeForm(schema, headers, rows, { excludeNotTaught: true });
  if (a.coverage !== 1) throw new Error(`${s.id}: الأعمدة مااتربطتش كلها (${a.coverage})`);
  a.responses = s.responses; // كل صف هنا = طالب × دكتور، فعدد الطلاب الفعلي من LectaSync
  a.lastResponse = null;
  return a;
}

function moduleAnalysis(s) {
  const qs = s.questions;
  const advisingQ = qs.findIndex((q) => /رضاؤك عن الإرشاد/.test(q));
  const courseQ = qs.map((q, j) => j).filter((j) => !isText(qs[j]) && j !== advisingQ);
  const blank = () => ({ sum: 0, count: 0, dist: [0, 0, 0, 0, 0] });
  const add = (st, v) => { st.sum += v; st.count++; st.dist[v - 1]++; };
  const items = courseQ.map((j) => ({ text: qs[j], ...blank() }));
  const all = blank(), advising = blank();
  let respondents = 0;
  for (const [, , digits] of s.resp) {
    let any = false;
    courseQ.forEach((j, k) => { const v = +digits[j]; if (v) { add(items[k], v); add(all, v); any = true; } });
    const av = advisingQ >= 0 ? +digits[advisingQ] : 0;
    if (av) add(advising, av);
    if (any) respondents++;
  }
  const comments = { course: [], advising: [] };
  for (const [, j, text] of s.comments) {
    if (!isText(qs[j]) || isEmptyComment(text)) continue;
    (/الإرشاد/.test(qs[j]) ? comments.advising : comments.course).push(String(text).trim());
  }
  return { responses: s.responses, respondents, all, items, advising: advising.count ? advising : null, comments };
}

const input = process.argv[2];
if (!input) { console.error("الاستخدام: node tools/build-medicine.js <medicine.json>"); process.exit(1); }
const src = JSON.parse(fs.readFileSync(input, "utf8"));
const byId = new Map(src.surveys.map((s) => [s.id, s]));
const outDir = path.join(root, "data/medicine");
fs.mkdirSync(outDir, { recursive: true });

for (const L of LEVELS) {
  const d = byId.get(L.doctors), m = byId.get(L.module);
  if (!d || !m) throw new Error(`${L.id}: الاستبيان ناقص من الملف`);
  const a = doctorAnalysis(d, L.course);
  a.source = "LectaSync";
  a.exportedAt = src.exportedAt || null;
  a.module = { name: L.course, ...moduleAnalysis(m) };
  fs.writeFileSync(path.join(outDir, L.id + ".json"), JSON.stringify(a));
  const pct = (st) => (st.count ? Math.round((st.sum / st.count / 5) * 1000) / 10 : null);
  const all = a.sections.reduce((t, s) => ({ sum: t.sum + s.stats.sum, count: t.count + s.stats.count }), { sum: 0, count: 0 });
  console.log(`• ${L.id}: ${a.responses} طالب، ${a.sections.length} دكتور، تقييم ${pct(all)}%، ${a.sections.reduce((n, s) => n + s.comments.length, 0)} ملاحظة | المقرر ${pct(a.module.all)}% من ${a.module.respondents} طالب`);
  a.sections.forEach((s) => console.log(`    ${s.name}: ${s.stats.respondents} طالب، ${pct(s.stats)}%${s.notTaught ? `، ${s.notTaught} مابيدرسلهمش` : ""}`));
}
console.log("\n✔ data/medicine/");

#!/usr/bin/env node
/*
 * تقارير PDF لكل برنامج: صفحة ملخص للبرنامج، وبعدها صفحة لكل مستوى فيها جدول أعضاء هيئة التدريس
 * والهيئة المعاونة (التقييم من 5 والنسبة وعدد الطلاب) وإحصائيات الرضا عن المستوى.
 * البيانات نفسها اللي الداش بورد بيقراها وبنفس طريقة الحساب (assets/js/analyze.js).
 *
 * الاستخدام:  node tools/build-reports.js [فولدر الإخراج]   (الافتراضي: reports/)
 * محتاج Google Chrome أو Microsoft Edge متسطب (بيتطبع منه الـ PDF).
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const outDir = path.resolve(process.argv[2] || path.join(root, "reports"));
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "assets/js/config.js"), "utf8"), ctx);
vm.runInNewContext(fs.readFileSync(path.join(root, "assets/js/analyze.js"), "utf8"), ctx);
const CFG = ctx.window.DASHBOARD_CONFIG;
const { analyzeForm } = ctx.window.SurveyAnalyzer;
const SCHEMA = JSON.parse(fs.readFileSync(path.join(root, "data/forms.json"), "utf8"));
const LOGO = "data:image/webp;base64," + fs.readFileSync(path.join(root, "assets/img/logo.webp")).toString("base64");

const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

/* ---------- البيانات ---------- */
function parseCsv(t) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"' && t[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (ch !== "\r") cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

async function fetchText(url) {
  for (let i = 1; ; i++) {
    try {
      const t = await (await fetch(url + (url.includes("?") ? "&" : "?") + "_=" + Date.now())).text();
      if (/^\s*"?Loading/.test(t)) throw new Error("Loading...");
      return t;
    } catch (e) {
      if (i >= 5) throw e;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

async function loadAnalysis(form) {
  if (form.dataUrl) return JSON.parse(fs.readFileSync(path.join(root, form.dataUrl), "utf8"));
  const d = parseCsv(await fetchText(form.sheetUrl));
  return analyzeForm(SCHEMA.forms[form.formId], d[0], d.slice(1), { excludeNotTaught: true });
}

const blank = () => ({ sum: 0, count: 0, dist: [0, 0, 0, 0, 0], crit: {} });
function add(a, s) {
  a.sum += s.sum; a.count += s.count; s.dist.forEach((v, i) => (a.dist[i] += v));
  for (const [c, v] of Object.entries(s.crit || {})) { a.crit[c] = a.crit[c] || { sum: 0, count: 0 }; a.crit[c].sum += v.sum; a.crit[c].count += v.count; }
  return a;
}
const mean = (s) => (s.count ? s.sum / s.count : null);
const pct = (s) => (s.count ? (s.sum / s.count / 5) * 100 : null);
// طريقة تقارير الجودة: نسبة الإجابات "إلى حد ما" فأعلى
const quality = (s) => { const t = s.dist.reduce((a, b) => a + b, 0); return t ? ((s.dist[2] + s.dist[3] + s.dist[4]) / t) * 100 : null; };

function levelSummary(form, a) {
  const all = blank(), doctor = blank(), ta = blank();
  const members = new Map();
  let notTaught = 0;
  for (const s of a.sections) {
    const role = s.role === "doctor" ? "doctor" : "ta";
    add(all, s.stats); add(role === "doctor" ? doctor : ta, s.stats);
    notTaught += s.notTaught || 0;
    const k = role + ":" + s.key;
    if (!members.has(k)) members.set(k, { title: s.title || s.name, role, courses: [], stats: blank(), students: 0 });
    const m = members.get(k);
    add(m.stats, s.stats);
    m.students = Math.max(m.students, s.stats.respondents || 0);
    if (s.course && !m.courses.includes(s.course)) m.courses.push(s.course);
  }
  const list = [...members.values()].filter((m) => m.stats.count);
  return { form, responses: a.responses, all, doctor, ta, notTaught, module: a.module || null,
    doctors: list.filter((m) => m.role === "doctor"), tas: list.filter((m) => m.role === "ta") };
}

/* ---------- HTML (أبيض وأسود، على قالب مكاتبات الجامعة) ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const f2 = (n) => (n == null ? "—" : n.toFixed(2));
const fp = (n) => (n == null ? "—" : n.toFixed(2) + "%");
const LABELS = ["غير موافق تمامًا", "غير موافق", "إلى حد ما", "موافق", "موافق تمامًا"];
const TERM = "بالفصل الدراسي الأول للعام الأكاديمي 2026-2027";
const TITLE = "تقرير عن نتيجة فحص استبيانات قياس رضا الطلاب عن أداء أعضاء هيئة التدريس والهيئة المعاونة";

// علامة ZNU زي اللي في ترويسة الجامعة: Z و N جنب بعض و U تحت الـ N
const ZNU = `<svg class="znu" viewBox="0 0 120 120" aria-hidden="true">
  <path d="M6 30 H52 L18 86 H58 V98 H2 L36 42 H6 Z" fill="#333"/>
  <path d="M62 8 H74 L100 50 V8 H112 V70 H100 L74 28 V58 H62 Z" fill="#333"/>
  <path d="M62 64 H74 V92 Q74 104 87 104 Q100 104 100 92 V76 H112 V92 Q112 116 87 116 Q62 116 62 92 Z" fill="#333"/>
</svg>`;
const ICON = {
  pin: `<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="none" stroke="#333" stroke-width="1.6"/></svg>`,
  fb: `<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="4" fill="#333"/><path d="M13.5 20v-6.5h2.2l.4-2.6h-2.6V9.3c0-.8.3-1.3 1.4-1.3h1.3V5.7c-.3 0-1.1-.1-2-.1-2 0-3.3 1.2-3.3 3.4v1.9H8.7v2.6h2.2V20z" fill="#fff"/></svg>`,
  www: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="none" stroke="#333" stroke-width="1.6"/><path d="M2.5 12h19M12 2.5c3 3 3 16 0 19M12 2.5c-3 3-3 16 0 19" fill="none" stroke="#333" stroke-width="1.3"/></svg>`,
  phone: `<svg viewBox="0 0 24 24"><path d="M6.6 3.5l2.6 3.7-1.7 2.1a12 12 0 0 0 7.2 7.2l2.1-1.7 3.7 2.6-1.4 3.1C10.5 20 4 13.5 3.5 5z" fill="none" stroke="#333" stroke-width="1.5"/></svg>`,
  at: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="none" stroke="#333" stroke-width="1.6"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1" fill="none" stroke="#333" stroke-width="1.6"/></svg>`,
};

const header = `<div class="hdr">
  <img class="seal" src="${LOGO}" alt="">
  <div class="brand">${ZNU}<div class="names"><div class="ar">جامعة الزقازيق الأهلية</div><div class="bar"></div><div class="en">Zagazig National University</div></div></div>
</div>`;
const footer = `<div class="ftr">
  <div class="addr"><span class="ic">${ICON.pin}</span><div>مدينة العاشر من رمضان، الطريق الموازي لطريق مصر<br>إسماعيلية الصحراوي والطريق الدائري الإقليمي وطريق<br>بلبيس العاشر – محافظة الشرقية<br>جمهورية مصر العربية</div></div>
  <div class="links"><div><span class="ic">${ICON.fb}</span><span class="u">https://www.facebook.com/ZagazigNational<br>University/?locale=ar_AR</span></div><div><span class="ic">${ICON.www}</span><b>Znu.edu.eg</b></div></div>
  <div class="contact"><span class="ic">${ICON.phone}</span><span class="ic">${ICON.at}</span></div>
</div>
<img class="wm" src="${LOGO}" alt="">`;

function page(inner, cls = "") {
  // جدول بيكرر مساحة الهيدر والفوتر في كل صفحة مطبوعة لو المستوى طويل
  return `<table class="page"><thead><tr><td><div class="hs"></div></td></tr></thead>
    <tbody><tr><td class="body ${cls}">${inner}</td></tr></tbody>
    <tfoot><tr><td><div class="fs"></div></td></tr></tfoot></table>`;
}

const titleBlock = `<div class="title"><h1>${TITLE}</h1><h2>${TERM}</h2></div>`;

function memberTable(title, list) {
  if (!list.length) return "";
  return `<p class="lead">${title} (${list.length}):</p>
  <table class="grid"><thead><tr><th class="no">م</th><th>الاسم</th><th>المقرر</th><th class="num">عدد الطلاب</th><th class="num">التقييم من 5</th><th class="num">نسبة الرضا</th></tr></thead><tbody>
  ${list.map((m, i) => `<tr><td class="no">${i + 1}</td><td class="name">${esc(m.title)}</td><td class="course"><div>${esc(m.courses.join("، "))}</div></td>
    <td class="num">${m.students}</td><td class="num b">${f2(mean(m.stats))}</td><td class="num b">${fp(pct(m.stats))}</td></tr>`).join("")}
  </tbody></table>`;
}

function distTable(s) {
  const t = s.dist.reduce((a, b) => a + b, 0) || 1;
  const order = [4, 3, 2, 1, 0];
  return `<table class="grid dist"><thead><tr><th>الإجابة</th>${order.map((i) => `<th class="num">${LABELS[i]}</th>`).join("")}</tr></thead>
    <tbody><tr><td class="name">نسبة الإجابات</td>${order.map((i) => `<td class="num">${((s.dist[i] / t) * 100).toFixed(1)}%</td>`).join("")}</tr></tbody></table>`;
}

function criteriaTable(s) {
  const list = Object.entries(s.crit).map(([c, v]) => ({ label: SCHEMA.criteria[c], p: (v.sum / v.count / 5) * 100, m: v.sum / v.count })).filter((x) => x.label).sort((a, b) => b.p - a.p);
  if (list.length < 4) return "";
  const top = list.slice(0, 3), low = list.slice(-3).reverse();
  return `<table class="grid crit"><thead><tr><th colspan="2">أعلى بنود التقييم</th><th colspan="2">أقل بنود التقييم</th></tr></thead><tbody>
    ${top.map((x, i) => `<tr><td>${esc(x.label)}</td><td class="num">${f2(x.m)} • ${fp(x.p)}</td><td>${esc(low[i].label)}</td><td class="num">${f2(low[i].m)} • ${fp(low[i].p)}</td></tr>`).join("")}
  </tbody></table>`;
}

const score = (s) => (s.count ? `${f2(mean(s))} من 5 (${fp(pct(s))})` : "لا يوجد في الاستبيان");

function levelPage(fac, prog, L) {
  const shared = L.form.programs.length > 1 ? " (مشترك بين برامج الكلية)" : "";
  return page(`
    ${titleBlock}
    <p class="lead">${esc(fac.nameAr)} – برنامج ${esc(prog.nameAr)} – ${esc(L.form.level)}${shared}:</p>
    <p>شارك في الاستبيان <b>${L.responses}</b> طالب، وكانت نسبة رضا الطلاب الإجمالية عن المستوى: <b>${score(L.all)}</b>،
      ومتوسط تقييم أعضاء هيئة التدريس: <b>${score(L.doctor)}</b>، والهيئة المعاونة: <b>${score(L.ta)}</b>.
      وبلغت نسبة الرضا بطريقة وحدة ضمان الجودة (الإجابات "إلى حد ما" فأعلى): <b>${fp(quality(L.all))}</b>.</p>
    ${distTable(L.all)}
    ${criteriaTable(L.all)}
    <p>وفيما يلي نسبة رضا الطلاب عن أداء كل عضو من أعضاء هيئة التدريس والهيئة المعاونة المشاركين في تدريس المقررات بالمستوى:</p>
    ${memberTable("أعضاء هيئة التدريس", L.doctors)}
    ${memberTable("الهيئة المعاونة", L.tas)}
    ${L.module ? `<p class="note">تقييم الطلاب للمقرر نفسه (${esc(L.module.name)}): ${score(L.module.all)} من ${L.module.respondents} طالب، وهو استبيان منفصل غير داخل في نسبة الرضا الإجمالية.</p>` : ""}
    <p class="note">التقييم من 5 = متوسط درجات الطلاب (موافق تمامًا = 5، موافق = 4، إلى حد ما = 3، غير موافق = 2، غير موافق تمامًا = 1)، ونسبة الرضا = التقييم ÷ 5 × 100.
      ${L.notTaught ? `تم استبعاد ${L.notTaught} تقييم لطلاب أفادوا بأن العضو لا يقوم بالتدريس لهم.` : ""}</p>
  `, "lvl" + (L.doctors.length + L.tas.length > 40 ? " dense xdense" : L.doctors.length + L.tas.length > 18 ? " dense" : ""));
}

function programPage(fac, prog, levels) {
  const total = levels.reduce((a, L) => add(a, L.all), blank());
  const doc = levels.reduce((a, L) => add(a, L.doctor), blank());
  const ta = levels.reduce((a, L) => add(a, L.ta), blank());
  const students = levels.reduce((n, L) => n + L.responses, 0);
  return page(`
    ${titleBlock}
    <p>في إطار حرص برنامج <b>${esc(prog.nameAr)}</b> بـ<b>${esc(fac.nameAr)}</b> – جامعة الزقازيق الأهلية على ضمان جودة العملية التعليمية والارتقاء بمستوى الأداء الأكاديمي،
      تم إجراء استبيانات لقياس مدى رضا الطلاب عن أداء أعضاء هيئة التدريس والهيئة المعاونة القائمين بالتدريس في المقررات الدراسية المختلفة، وجاءت النتائج كالتالي:</p>
    <p class="lead">أولًا: ملخص البرنامج</p>
    <p>شارك في الاستبيانات <b>${students}</b> طالب في <b>${levels.length}</b> مستويات، وكانت نسبة رضا الطلاب الإجمالية عن البرنامج: <b>${score(total)}</b>،
      ومتوسط تقييم أعضاء هيئة التدريس: <b>${score(doc)}</b>، والهيئة المعاونة: <b>${score(ta)}</b>.</p>
    <p class="lead">ثانيًا: نسبة الرضا حسب المستوى</p>
    <table class="grid"><thead><tr><th>المستوى</th><th class="num">عدد الطلاب</th><th class="num">الرضا الإجمالي (من 5)</th><th class="num">نسبة الرضا</th><th class="num">أعضاء هيئة التدريس</th><th class="num">الهيئة المعاونة</th><th class="num">طريقة الجودة</th></tr></thead><tbody>
    ${levels.map((L) => `<tr><td class="name">${esc(L.form.level)}</td><td class="num">${L.responses}</td><td class="num b">${f2(mean(L.all))}</td><td class="num b">${fp(pct(L.all))}</td>
      <td class="num">${L.doctor.count ? `${f2(mean(L.doctor))} (${fp(pct(L.doctor))})` : "—"}</td><td class="num">${L.ta.count ? `${f2(mean(L.ta))} (${fp(pct(L.ta))})` : "—"}</td><td class="num">${fp(quality(L.all))}</td></tr>`).join("")}
    <tr class="total"><td class="name">إجمالي البرنامج</td><td class="num">${students}</td><td class="num">${f2(mean(total))}</td><td class="num">${fp(pct(total))}</td>
      <td class="num">${doc.count ? `${f2(mean(doc))} (${fp(pct(doc))})` : "—"}</td><td class="num">${ta.count ? `${f2(mean(ta))} (${fp(pct(ta))})` : "—"}</td><td class="num">${fp(quality(total))}</td></tr>
    </tbody></table>
    <p class="lead">ثالثًا: توزيع إجابات الطلاب على بنود التقييم</p>
    ${distTable(total)}
    ${criteriaTable(total)}
    <p class="note">التقييم من 5 = متوسط درجات الطلاب (موافق تمامًا = 5 … غير موافق تمامًا = 1)، ونسبة الرضا = التقييم ÷ 5 × 100.
      عمود "طريقة الجودة" = نسبة الإجابات "إلى حد ما" فأعلى، وفقًا لطريقة تقارير وحدة ضمان الجودة. وتعرض الصفحات التالية تفاصيل كل مستوى على حدة.</p>
    <p class="note">تاريخ استخراج البيانات: ${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</p>
  `);
}

const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: "Simplified Arabic", "Traditional Arabic", "Amiri", "Times New Roman", serif; color: #000; font-size: 12pt; line-height: 1.5; direction: rtl; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.hdr { position: fixed; top: 0; left: 0; right: 0; height: 33mm; padding: 7mm 16mm 0; display: flex; align-items: center; justify-content: space-between; }
.hdr::after { content: ""; position: absolute; left: 12mm; right: 12mm; bottom: 0; border-bottom: 2.2mm solid #3a3a3a; }
.seal { height: 23mm; width: 23mm; object-fit: contain; filter: grayscale(1) contrast(1.15); }
.brand { display: flex; align-items: center; gap: 3mm; direction: ltr; }
.znu { height: 21mm; width: 21mm; }
.names { direction: rtl; font-family: "Cairo", "Segoe UI", Tahoma, sans-serif; color: #333; }
.names .ar { font-size: 19pt; font-weight: 700; line-height: 1.15; text-align: right; }
.names .bar { height: 1.4mm; background: #444; margin: .8mm 0 1mm; }
.names .en { font-size: 11.5pt; font-weight: 700; direction: ltr; text-align: left; letter-spacing: .1px; }
.ftr { position: fixed; bottom: 0; left: 0; right: 0; height: 21mm; padding: 2mm 14mm 0; display: flex; align-items: flex-start; justify-content: space-between; font-size: 7.6pt; line-height: 1.45; color: #222; }
.ftr .ic { display: inline-block; width: 5mm; height: 5mm; vertical-align: middle; }
.ftr .ic svg { width: 100%; height: 100%; }
.ftr .addr { display: flex; gap: 2mm; align-items: flex-start; text-align: center; }
.ftr .links { direction: ltr; display: flex; flex-direction: column; gap: 1mm; font-family: "Times New Roman", serif; }
.ftr .links div { display: flex; align-items: center; gap: 1.5mm; }
.ftr .links .u { text-decoration: underline; font-size: 7pt; line-height: 1.2; }
.ftr .links b { font-size: 9.5pt; }
.ftr .contact { display: flex; flex-direction: column; gap: 2mm; }
.wm { position: fixed; top: 50%; left: 50%; width: 120mm; height: 120mm; margin: -50mm 0 0 -60mm; opacity: .06; filter: grayscale(1); z-index: -1; }
table.page { width: 100%; border-collapse: collapse; page-break-after: always; }
table.page:last-child { page-break-after: auto; }
.hs { height: 36mm; } .fs { height: 22mm; }
td.body { padding: 0 16mm; vertical-align: top; }
.title { text-align: center; margin: 0 0 3mm; }
h1 { font-size: 15pt; font-weight: 700; margin: 0; line-height: 1.4; }
h2 { font-size: 14pt; font-weight: 700; margin: 0; }
p { margin: 0 0 2mm; text-align: justify; }
p.lead { font-weight: 700; margin: 3mm 0 1.5mm; font-size: 12.5pt; }
.b { font-weight: 700; }
table.grid { width: 100%; border-collapse: collapse; margin: 1mm 0 2.5mm; font-size: 11pt; }
table.grid th, table.grid td { border: 1px solid #000; padding: .8mm 1.6mm; vertical-align: middle; }
table.grid th { background: #e3e3e3; font-weight: 700; text-align: center; }
table.grid td.no, table.grid th.no { width: 8mm; text-align: center; }
table.grid td.num, table.grid th.num { text-align: center; white-space: nowrap; }
table.grid td.name { font-weight: 700; white-space: nowrap; }
table.grid td.course { font-size: 9.5pt; }
table.grid tr.total td { font-weight: 700; background: #f0f0f0; }
table.grid tr { page-break-inside: avoid; }
table.dist th, table.dist td { font-size: 10.5pt; }
table.crit td { font-size: 10.5pt; }
.note { font-size: 9.5pt; line-height: 1.45; margin-top: 2mm; }
/* صفحة المستوى: أصغر عشان المستوى كله يدخل في صفحة واحدة */
.lvl { font-size: 11pt; line-height: 1.4; }
.lvl h1 { font-size: 13.5pt; } .lvl h2 { font-size: 12.5pt; }
.lvl p { margin-bottom: 1.2mm; } .lvl p.lead { margin: 2mm 0 1mm; font-size: 11.5pt; }
.lvl table.grid { font-size: 10pt; margin: .5mm 0 1.8mm; }
.lvl table.grid th, .lvl table.grid td { padding: .35mm 1.4mm; }
.lvl table.grid td.course { font-size: 8pt; line-height: 1.2; }
.lvl table.grid td.course div { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.lvl table.dist th, .lvl table.dist td, .lvl table.crit td { font-size: 9.5pt; }
.lvl .note { font-size: 8pt; margin-top: .6mm; line-height: 1.3; }
.lvl.dense { font-size: 10pt; }
.lvl.dense table.grid { font-size: 8.6pt; line-height: 1.2; }
.lvl.dense table.grid th, .lvl.dense table.grid td { padding: .1mm 1.2mm; }
.lvl.dense table.grid td.course { font-size: 7.4pt; }
.lvl.dense table.grid td.course div { -webkit-line-clamp: 1; max-width: 70mm; }
.lvl.dense table.crit { display: none; }
.lvl.xdense table.grid { font-size: 7.6pt; line-height: 1.08; } .lvl.xdense table.grid th, .lvl.xdense table.grid td { padding: 0 1mm; }
.lvl.xdense table.grid td.course { font-size: 6.8pt; } .lvl.xdense p { margin-bottom: .6mm; line-height: 1.3; } .lvl.xdense p.lead { margin: 1mm 0 .5mm; }
.lvl.xdense .title { margin-bottom: 1mm; } .lvl.xdense h1 { font-size: 12.5pt; } .lvl.xdense h2 { font-size: 11.5pt; }
`;

function findBrowser() {
  const b = BROWSERS.find((p) => fs.existsSync(p));
  if (!b) throw new Error("مش لاقي Chrome أو Edge لطباعة الـ PDF");
  return b;
}

(async () => {
  const browser = findBrowser();
  fs.mkdirSync(path.join(outDir, "html"), { recursive: true });
  const used = CFG.forms.filter((f) => f.sheetUrl || f.dataUrl);
  process.stdout.write(`بيجيب بيانات ${used.length} فورم… `);
  const analyses = new Map();
  await Promise.all(used.map(async (f) => analyses.set(f.id, await loadAnalysis(f))));
  console.log("تمام");

  for (const fac of CFG.faculties) {
    for (const prog of fac.programs) {
      const forms = used.filter((f) => f.programs.includes(prog.id)).sort((a, b) => a.order - b.order);
      if (!forms.length) continue;
      const levels = forms.map((f) => levelSummary(f, analyses.get(f.id))).filter((L) => L.all.count);
      if (!levels.length) continue;
      const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(fac.nameAr)} - ${esc(prog.nameAr)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=block" rel="stylesheet">
        <style>${CSS}</style></head><body>${header}${footer}
        ${programPage(fac, prog, levels)}${levels.map((L) => levelPage(fac, prog, L)).join("")}</body></html>`;
      const name = `${fac.id}-${prog.id}`;
      const htmlPath = path.join(outDir, "html", name + ".html");
      const pdfPath = path.join(outDir, `${fac.nameAr} - ${prog.nameAr}.pdf`);
      fs.writeFileSync(htmlPath, html);
      execFileSync(browser, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=15000",
        `--print-to-pdf=${pdfPath}`, "file:///" + htmlPath.replace(/\\/g, "/")], { stdio: "ignore", timeout: 120000 });
      console.log(`✔ ${path.basename(pdfPath)} — ${levels.length} مستوى، ${levels.reduce((n, L) => n + L.responses, 0)} طالب`);
    }
  }
})().catch((e) => { console.error("❌", e.message); process.exit(1); });

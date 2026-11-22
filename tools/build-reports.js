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

/* ---------- HTML ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const f2 = (n) => (n == null ? "—" : n.toFixed(2));
const fp = (n) => (n == null ? "—" : n.toFixed(1) + "%");
const tone = (p) => (p == null ? "" : p >= 80 ? "good" : p >= 65 ? "mid" : "bad");
const LABELS = ["غير موافق تمامًا", "غير موافق", "إلى حد ما", "موافق", "موافق تمامًا"];
const COLORS = ["#d9534f", "#ee9b4f", "#f0c94f", "#8fcf9f", "#3a9d6a"];
const TERM = "الفصل الدراسي الأول للعام الأكاديمي 2026-2027";

const header = `<div class="hdr">
  <div class="brand"><div class="znu">ZNU</div><div><div class="ar">جامعة الزقازيق الأهلية</div><div class="en">Zagazig National University</div></div></div>
  <img class="seal" src="${LOGO}" alt="">
</div>`;
const footer = `<div class="ftr">
  <div>مدينة العاشر من رمضان، الطريق الموازي لطريق مصر إسماعيلية الصحراوي والطريق الدائري الإقليمي وطريق بلبيس العاشر – محافظة الشرقية – جمهورية مصر العربية</div>
  <div class="web">www.Znu.edu.eg</div>
</div>`;

function page(inner, cls = "") {
  // جدول بيكرر مساحة الهيدر والفوتر في كل صفحة مطبوعة لو المستوى طويل
  return `<table class="page"><thead><tr><td><div class="hs"></div></td></tr></thead>
    <tbody><tr><td class="body ${cls}">${inner}</td></tr></tbody>
    <tfoot><tr><td><div class="fs"></div></td></tr></tfoot></table>`;
}

function memberTable(title, list) {
  if (!list.length) return "";
  return `<h3>${title} <span class="n">(${list.length})</span></h3>
  <table class="grid"><thead><tr><th class="c">م</th><th>الاسم</th><th>المقرر</th><th class="c">عدد الطلاب</th><th class="c">التقييم من 5</th><th class="c">النسبة</th></tr></thead><tbody>
  ${list.map((m, i) => `<tr><td class="c">${i + 1}</td><td class="name">${esc(m.title)}</td><td class="course">${esc(m.courses.join("، "))}</td>
    <td class="c">${m.students}</td><td class="c b">${f2(mean(m.stats))}</td><td class="c b ${tone(pct(m.stats))}">${fp(pct(m.stats))}</td></tr>`).join("")}
  </tbody></table>`;
}

function distBar(s) {
  const t = s.dist.reduce((a, b) => a + b, 0) || 1;
  const parts = [4, 3, 2, 1, 0].map((i) => ({ i, p: (s.dist[i] / t) * 100 }));
  return `<div class="dist">${parts.map(({ i, p }) => `<span style="width:${p}%;background:${COLORS[i]}"></span>`).join("")}</div>
  <div class="legend">${parts.map(({ i, p }) => `<span><i style="background:${COLORS[i]}"></i>${LABELS[i]}: <b>${p.toFixed(1)}%</b></span>`).join("")}</div>`;
}

function criteria(s) {
  const list = Object.entries(s.crit).map(([c, v]) => ({ label: SCHEMA.criteria[c], p: (v.sum / v.count / 5) * 100 })).filter((x) => x.label).sort((a, b) => b.p - a.p);
  if (list.length < 4) return "";
  const row = (x) => `<tr><td>${esc(x.label)}</td><td class="c b ${tone(x.p)}">${fp(x.p)}</td></tr>`;
  return `<div class="two">
    <div><h4>أعلى بنود التقييم</h4><table class="mini">${list.slice(0, 3).map(row).join("")}</table></div>
    <div><h4>أقل بنود التقييم</h4><table class="mini">${list.slice(-3).reverse().map(row).join("")}</table></div></div>`;
}

const kpi = (label, s, extra) => !s.count
  ? `<div class="kpi"><div class="l">${label}</div><div class="v" style="color:#9aa4ae">لا يوجد</div><div class="p">مش موجودة في الاستبيان</div></div>`
  : `<div class="kpi"><div class="l">${label}</div><div class="v ${tone(pct(s))}">${f2(mean(s))} <small>من 5</small></div><div class="p">${fp(pct(s))}${extra || ""}</div></div>`;

function levelPage(fac, prog, L) {
  const shared = L.form.programs.length > 1 ? ` <span class="tag">مشترك بين برامج الكلية</span>` : "";
  return page(`
    <div class="title"><h1>تقرير نتيجة استبيان قياس رضا الطلاب عن أداء أعضاء هيئة التدريس والهيئة المعاونة</h1><div class="sub">${TERM}</div></div>
    <div class="meta"><span>الكلية: <b>${esc(fac.nameAr)}</b></span><span>البرنامج: <b>${esc(prog.nameAr)}</b></span><span>المستوى: <b>${esc(L.form.level)}</b>${shared}</span></div>
    <div class="kpis">
      <div class="kpi"><div class="l">عدد الطلاب المشاركين</div><div class="v">${L.responses}</div><div class="p">طالب</div></div>
      ${kpi("الرضا العام عن المستوى", L.all)}
      ${kpi("أعضاء هيئة التدريس", L.doctor, ` • ${L.doctors.length} عضو`)}
      ${kpi("الهيئة المعاونة", L.ta, ` • ${L.tas.length} عضو`)}
    </div>
    <h4>توزيع إجابات الطلاب على كل بنود التقييم <span class="n">(${L.all.count.toLocaleString("en")} إجابة)</span></h4>
    ${distBar(L.all)}
    ${criteria(L.all)}
    ${memberTable("أعضاء هيئة التدريس", L.doctors)}
    ${memberTable("الهيئة المعاونة", L.tas)}
    ${L.module ? `<p class="note">تقييم الطلاب للمقرر نفسه (${esc(L.module.name)}): <b>${f2(mean(L.module.all))} من 5 (${fp(pct(L.module.all))})</b> من ${L.module.respondents} طالب — استبيان منفصل ومش داخل في الرضا العام.</p>` : ""}
    <p class="note">التقييم من 5 = متوسط درجات الطلاب (موافق تمامًا = 5 … غير موافق تمامًا = 1)، والنسبة = التقييم ÷ 5.
      نسبة الرضا بطريقة تقارير الجودة (نسبة الإجابات "إلى حد ما" فأعلى): <b>${fp(quality(L.all))}</b>.
      ${L.notTaught ? `اتشال من الحساب ${L.notTaught} تقييم لطلاب كتبوا إن العضو مابيدرسلهمش.` : ""}</p>
  `, "lvl" + (L.doctors.length + L.tas.length > 26 ? " dense" : ""));
}

function programPage(fac, prog, levels) {
  const total = levels.reduce((a, L) => add(a, L.all), blank());
  const doc = levels.reduce((a, L) => add(a, L.doctor), blank());
  const ta = levels.reduce((a, L) => add(a, L.ta), blank());
  const students = levels.reduce((n, L) => n + L.responses, 0);
  return page(`
    <div class="title"><h1>تقرير نتيجة استبيان قياس رضا الطلاب عن أداء أعضاء هيئة التدريس والهيئة المعاونة</h1><div class="sub">${TERM}</div></div>
    <div class="meta"><span>الكلية: <b>${esc(fac.nameAr)}</b></span><span>البرنامج: <b>${esc(prog.nameAr)}</b> <span class="en2">${esc(prog.nameEn)}</span></span></div>
    <h2>ملخص البرنامج</h2>
    <div class="kpis">
      <div class="kpi"><div class="l">عدد الطلاب المشاركين</div><div class="v">${students}</div><div class="p">في ${levels.length} مستوى</div></div>
      ${kpi("الرضا العام عن البرنامج", total)}
      ${kpi("أعضاء هيئة التدريس", doc)}
      ${kpi("الهيئة المعاونة", ta)}
    </div>
    <h4>توزيع إجابات الطلاب على كل بنود التقييم</h4>
    ${distBar(total)}
    <h3>الرضا حسب المستوى</h3>
    <table class="grid"><thead><tr><th>المستوى</th><th class="c">عدد الطلاب</th><th class="c">الرضا العام</th><th class="c">أعضاء هيئة التدريس</th><th class="c">الهيئة المعاونة</th><th class="c">طريقة الجودة</th></tr></thead><tbody>
    ${levels.map((L) => `<tr><td class="name">${esc(L.form.level)}</td><td class="c">${L.responses}</td>
      <td class="c b ${tone(pct(L.all))}">${f2(mean(L.all))} • ${fp(pct(L.all))}</td>
      <td class="c">${f2(mean(L.doctor))} • ${fp(pct(L.doctor))}</td><td class="c">${f2(mean(L.ta))} • ${fp(pct(L.ta))}</td>
      <td class="c">${fp(quality(L.all))}</td></tr>`).join("")}
    </tbody></table>
    ${criteria(total)}
    <p class="note">التقييم من 5 = متوسط درجات الطلاب (موافق تمامًا = 5 … غير موافق تمامًا = 1)، والنسبة = التقييم ÷ 5.
      عمود "طريقة الجودة" = نسبة الإجابات "إلى حد ما" فأعلى، زي تقارير وحدة ضمان الجودة. الصفحات الجاية: صفحة لكل مستوى فيها كل عضو.</p>
    <p class="note">تاريخ استخراج البيانات: ${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</p>
  `);
}

const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: "Cairo", "Segoe UI", Tahoma, sans-serif; color: #1d2733; font-size: 10.5pt; direction: rtl; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.hdr { position: fixed; top: 0; left: 0; right: 0; height: 30mm; padding: 6mm 14mm 0; display: flex; align-items: center; justify-content: space-between; }
.hdr::after { content: ""; position: absolute; left: 14mm; right: 14mm; bottom: 0; border-bottom: 2.5px solid #2f3a47; }
.seal { height: 22mm; width: 22mm; object-fit: contain; }
.brand { display: flex; align-items: center; gap: 4mm; direction: ltr; order: 2; }
.znu { font: 800 22pt/1 "Segoe UI", Arial, sans-serif; letter-spacing: -1px; color: #2f3a47; border-left: 2px solid #2f3a47; padding-left: 3mm; }
.brand .ar { font-weight: 800; font-size: 15pt; text-align: right; direction: rtl; }
.brand .en { font-size: 10pt; font-weight: 600; color: #46525f; }
.ftr { position: fixed; bottom: 0; left: 0; right: 0; height: 17mm; padding: 3mm 14mm 0; display: flex; justify-content: space-between; gap: 8mm; font-size: 7.5pt; color: #46525f; border-top: 1px solid #c9d0d8; margin: 0 14mm; padding-left: 0; padding-right: 0; }
.ftr .web { direction: ltr; white-space: nowrap; font-weight: 700; }
table.page { width: 100%; border-collapse: collapse; page-break-after: always; }
table.page:last-child { page-break-after: auto; }
.hs { height: 34mm; } .fs { height: 20mm; }
td.body { padding: 0 14mm; vertical-align: top; }
.title { text-align: center; margin-bottom: 3mm; }
h1 { font-size: 13.5pt; margin: 0; font-weight: 800; }
.sub { font-size: 11pt; font-weight: 700; color: #46525f; }
.meta { display: flex; flex-wrap: wrap; gap: 4mm 10mm; justify-content: center; background: #f2f5f8; border: 1px solid #dde3ea; border-radius: 3mm; padding: 2mm 4mm; margin-bottom: 3mm; font-size: 10.5pt; }
.en2 { color: #6b7785; font-size: 9pt; direction: ltr; unicode-bidi: isolate; }
.tag { font-size: 8pt; background: #fff3d6; border: 1px solid #f0c94f; border-radius: 2mm; padding: 0 2mm; margin-right: 2mm; }
h2 { font-size: 12pt; margin: 3mm 0 2mm; }
h3 { font-size: 11pt; margin: 4mm 0 1.5mm; border-right: 3px solid #3a9d6a; padding-right: 2mm; }
h4 { font-size: 9.5pt; margin: 3mm 0 1mm; color: #2f3a47; }
.n { color: #6b7785; font-weight: 600; font-size: .9em; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.5mm; }
.kpi { border: 1px solid #dde3ea; border-radius: 3mm; padding: 2mm 3mm; text-align: center; background: #fbfcfd; }
.kpi .l { font-size: 8.5pt; color: #46525f; font-weight: 700; }
.kpi .v { font-size: 16pt; font-weight: 800; line-height: 1.3; }
.kpi .v small { font-size: 8pt; color: #6b7785; font-weight: 600; }
.kpi .p { font-size: 9pt; font-weight: 700; color: #46525f; }
.good { color: #23794c; } .mid { color: #a8780a; } .bad { color: #b8332f; }
.dist { display: flex; height: 5mm; border-radius: 1.5mm; overflow: hidden; direction: rtl; }
.dist span { display: block; height: 100%; }
.legend { display: flex; flex-wrap: wrap; gap: 1mm 5mm; font-size: 8pt; margin-top: 1mm; }
.legend i { display: inline-block; width: 3mm; height: 3mm; border-radius: .8mm; margin-left: 1mm; vertical-align: middle; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
table.mini, table.grid { width: 100%; border-collapse: collapse; }
table.mini td { border-bottom: 1px solid #e6eaef; padding: .8mm 1.5mm; font-size: 8.5pt; }
table.grid { font-size: 9pt; }
table.grid th { background: #2f3a47; color: #fff; font-weight: 700; padding: 1.4mm 1.5mm; text-align: right; font-size: 8.5pt; }
table.grid td { border-bottom: 1px solid #e1e6ec; padding: 1.1mm 1.5mm; vertical-align: middle; }
table.grid tbody tr:nth-child(even) td { background: #f6f8fa; }
table.grid tr { page-break-inside: avoid; }
.c { text-align: center !important; } .b { font-weight: 800; }
td.name { font-weight: 700; white-space: nowrap; }
td.course { font-size: 8pt; color: #46525f; }
.note { font-size: 8pt; color: #5b6774; margin: 3mm 0 0; line-height: 1.6; }
/* صفحة المستوى: أصغر عشان المستوى كله يدخل في صفحة واحدة */
.lvl .title { margin-bottom: 1.5mm; } .lvl h1 { font-size: 12pt; } .lvl .sub { font-size: 9.5pt; }
.lvl .meta { padding: 1mm 4mm; margin-bottom: 2mm; font-size: 9.5pt; }
.lvl .kpi { padding: 1mm 2mm; } .lvl .kpi .v { font-size: 13pt; line-height: 1.2; } .lvl .kpi .l, .lvl .kpi .p { font-size: 8pt; }
.lvl h3 { margin: 2.5mm 0 1mm; font-size: 10pt; } .lvl h4 { margin: 2mm 0 .8mm; font-size: 8.5pt; }
.lvl .dist { height: 3.5mm; } .lvl .legend { font-size: 7.5pt; }
.lvl table.mini td { padding: .3mm 1.5mm; font-size: 7.8pt; }
.lvl table.grid { font-size: 8pt; line-height: 1.25; }
.lvl table.grid th { padding: .8mm 1.5mm; font-size: 7.8pt; }
.lvl table.grid td { padding: .45mm 1.5mm; }
.lvl td.course { font-size: 7pt; }
.lvl .note { font-size: 7pt; margin-top: 1.5mm; line-height: 1.45; }
.lvl.dense table.grid { font-size: 7.2pt; line-height: 1.12; } .lvl.dense table.grid td { padding: .1mm 1.2mm; } .lvl.dense td.course { font-size: 6.3pt; }
.lvl.dense table.grid th { padding: .5mm 1.2mm; } .lvl.dense .two { display: none; } .lvl.dense h3 { margin: 1.5mm 0 .6mm; }
.lvl.dense td.course { max-width: 70mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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

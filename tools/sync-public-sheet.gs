/**
 * بينسخ ردود الفورمز للشيت العام "ZNU Survey Dashboard - Public data (no emails)" كقيم ثابتة كل 10 دقايق،
 * بدل IMPORTRANGE. النسخة المنشورة (Publish to web) بتطلع على طول من غير "Loading...".
 *
 * التركيب (مرة واحدة):
 *   1. افتح الشيت العام ← Extensions ← Apps Script، امسح اللي موجود والزق الملف ده كله، واحفظ.
 *   2. اختار setup من فوق ودوس Run، ووافق على الصلاحيات.
 *
 * إضافة فورم جديد بعد كده: زي الأول، اعمل تاب واكتب في A1 معادلة IMPORTRANGE
 * (من غير عمود الإيميل). السكريبت هيلاقيها في أول تشغيل، يحفظ مصدرها، ويحوّلها لقيم.
 * المصادر محفوظة في Script Properties (مش في الشيت، عشان الشيت منشور).
 */

const SOURCES_KEY = "SOURCES"; // { tab: { gid, parts: [{ id, range }] } }
const MINUTES = 10;

function setup() {
  syncAll();
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === "syncAll")
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("syncAll").timeBased().everyMinutes(MINUTES).create();
  Logger.log("✔ التحديث التلقائي شغال كل " + MINUTES + " دقايق");
}

function syncAll() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return; // تشغيل تاني لسه شغال
  try {
    const ss = SpreadsheetApp.getActive();
    const props = PropertiesService.getScriptProperties();
    const sources = JSON.parse(props.getProperty(SOURCES_KEY) || "{}");
    const report = [];

    // تابات فيها IMPORTRANGE لسه: نحفظ مصدرها
    ss.getSheets().forEach((sh) => {
      const f = sh.getRange("A1").getFormula();
      const parts = [...f.matchAll(/IMPORTRANGE\(\s*"([^"]+)"\s*[,;]\s*"([^"]+)"\s*\)/gi)].map((m) => ({ id: m[1], range: m[2] }));
      if (parts.length) sources[sh.getName()] = { gid: sh.getSheetId(), parts };
    });
    props.setProperty(SOURCES_KEY, JSON.stringify(sources));

    const opened = {};
    for (const [tab, src] of Object.entries(sources)) {
      const sh = ss.getSheets().find((s) => s.getSheetId() === src.gid) || ss.getSheetByName(tab);
      if (!sh) { report.push("⚠️ " + tab + ": التاب مش موجود"); continue; }
      try {
        const blocks = src.parts.map((p) => readPart_(opened, p));
        const height = Math.max(...blocks.map((b) => b.length));
        const values = [];
        for (let r = 0; r < height; r++) values.push([].concat(...blocks.map((b) => b[r] || new Array(b[0].length).fill(""))));
        const digest = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(values)));
        const hashKey = "HASH_" + src.gid;
        if (props.getProperty(hashKey) === digest && !sh.getRange("A1").getFormula()) continue; // مفيش جديد
        writeValues_(sh, values);
        props.setProperty(hashKey, digest);
        report.push("✅ " + tab + ": " + (values.length - 1) + " رد");
      } catch (e) {
        report.push("❌ " + tab + ": " + e.message);
      }
    }
    Logger.log(report.join("\n") || "مفيش تغيير");
  } finally {
    lock.releaseLock();
  }
}

// بيقرا جزء زي "'Form Responses 1'!C1:PE2000" لحد آخر صف فيه بيانات بس
function readPart_(opened, part) {
  const ss = opened[part.id] || (opened[part.id] = SpreadsheetApp.openById(part.id));
  const m = part.range.match(/^(?:'((?:[^']|'')+)'|([^!]+))!([A-Z]+)(\d+):([A-Z]+)\d*$/i);
  if (!m) throw new Error("مش فاهم المدى " + part.range);
  const sheet = ss.getSheetByName((m[1] || m[2]).replace(/''/g, "'"));
  if (!sheet) throw new Error("مفيش تاب " + (m[1] || m[2]));
  const c1 = colNum_(m[3]), r1 = +m[4], c2 = colNum_(m[5]);
  const rows = Math.max(1, sheet.getLastRow() - r1 + 1);
  return sheet.getRange(r1, c1, rows, c2 - c1 + 1).getDisplayValues();
}

function writeValues_(sh, values) {
  const rows = values.length, cols = values[0].length;
  // نصوص بتبدأ بـ = أو + أو - أو @ تفضل نص مش معادلة
  const safe = values.map((r) => r.map((v) => (/^[=+\-@]/.test(v) ? "'" + v : v)));
  if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
  if (sh.getMaxRows() < rows + 1) sh.insertRowsAfter(sh.getMaxRows(), rows + 1 - sh.getMaxRows());
  // بنكتب فوق القديم على طول (من غير ما نفضّي التاب الأول) عشان النسخة المنشورة ماتطلعش فاضية ولو لحظة
  sh.getRange(1, 1, rows, cols).setValues(safe);
  if (sh.getMaxRows() > rows) sh.getRange(rows + 1, 1, sh.getMaxRows() - rows, sh.getMaxColumns()).clearContent();
  // نشيل الأعمدة والصفوف الفاضية الزيادة (الملف كله حده 20 مليون خلية)
  if (sh.getMaxColumns() > cols) sh.deleteColumns(cols + 1, sh.getMaxColumns() - cols);
  const keepRows = rows + 200;
  if (sh.getMaxRows() > keepRows) sh.deleteRows(keepRows + 1, sh.getMaxRows() - keepRows);
}

function colNum_(letters) {
  return letters.toUpperCase().split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
}

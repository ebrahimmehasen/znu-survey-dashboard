/**
 * بيربط فورمز جديدة بشيت "ZNU Survey Dashboard - Public data (no emails)".
 *
 * من الموبايل: افتح script.google.com/create في Chrome (Desktop site)، الزق الملف، واعمل Run لـ linkForms.
 *   (السكريبت هيلاقي الشيت العام بالاسم لوحده.)
 *
 * الاستخدام من الكمبيوتر (مرة واحدة):
 *   1. افتح شيت "ZNU Survey Dashboard - Public data (no emails)".
 *   2. Extensions ← Apps Script، امسح اللي موجود والزق الملف ده كله، واحفظ.
 *   3. اختار الدالة linkForms من فوق ودوس Run، ووافق على الصلاحيات.
 *   4. لو ظهر في أي تاب جديد #REF! وزرار "Allow access"، دوس عليه.
 *
 * لكل فورم في FORMS:
 *   - بيدور على الفورم في الدرايف بتاعك (من الـ ID اللي في لينك الفورم العام).
 *   - لو مش مربوط بشيت ردود، بيعمله شيت ردود جديد.
 *   - بيعمل تاب بنفس اسم الـ id في الداش بورد، يسحب الردود بـ IMPORTRANGE من غير عمود الإيميل.
 */
const FORMS = [
  { tab: "pharm-2", publicId: "1FAIpQLSerKc6mu-Aq3GeOAT2ncHI-bbvB1pBn0ibqhH5boKQUAFsxhQ" },
  { tab: "pharm-3", publicId: "1FAIpQLSe4k9kn5nh5FFKP771ILmqX_tlswbAd5bvatoQ_3ARDJQcUMQ" },
  { tab: "pharm-4", publicId: "1FAIpQLSfHV43iUJWiYBxgi7BkcEI5e8-VNrp_s8xtJ0OzgK2Nqjzg7A" },
];

function linkForms() {
  const target = SpreadsheetApp.getActiveSpreadsheet() || findTarget_();
  const forms = findForms_(FORMS.map((f) => f.publicId));
  const report = [];

  FORMS.forEach((f) => {
    const form = forms[f.publicId];
    if (!form) { report.push(`❌ ${f.tab}: الفورم مش لاقيه في الدرايف بتاعك`); return; }

    // شيت الردود
    if (form.getDestinationType() !== FormApp.DestinationType.SPREADSHEET) {
      const ss = SpreadsheetApp.create(`${form.getTitle()} (Responses)`);
      form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
      SpreadsheetApp.flush();
      Utilities.sleep(3000);
    }
    const src = SpreadsheetApp.openById(form.getDestinationId());
    const formId = form.getId();
    const sheet = src.getSheets().find((s) => (s.getFormUrl() || "").indexOf(formId) >= 0) || src.getSheets()[0];

    // عمود الإيميل (لو موجود) بيتشال
    const header = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getDisplayValues()[0];
    const emailCol = header.findIndex((h) => /email|e-mail|بريد/i.test(h)) + 1;

    const ref = `"${src.getId()}", "'${sheet.getName().replace(/'/g, "''")}'"`;
    const formula = emailCol > 0
      ? `=LET(d, IMPORTRANGE(${ref}), FILTER(d, SEQUENCE(1, COLUMNS(d)) <> ${emailCol}))`
      : `=IMPORTRANGE(${ref})`;

    const tab = target.getSheetByName(f.tab) || target.insertSheet(f.tab);
    tab.clear();
    tab.getRange("A1").setFormula(formula);
    report.push(`✅ ${f.tab}: gid=${tab.getSheetId()} ← ${src.getName()}${emailCol ? ` (من غير عمود ${emailCol})` : ""}`);
  });

  const msg = report.join("\n");
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}

// بيدور على الفورمز اللي في الدرايف ويطابقها بالـ ID اللي في اللينك العام
function findForms_(publicIds) {
  const found = {};
  const it = DriveApp.searchFiles('mimeType = "application/vnd.google-apps.form" and trashed = false');
  while (it.hasNext() && Object.keys(found).length < publicIds.length) {
    const file = it.next();
    try {
      const form = FormApp.openById(file.getId());
      const url = form.getPublishedUrl();
      const id = publicIds.find((p) => url.indexOf(p) >= 0);
      if (id) found[id] = form;
    } catch (e) {}
  }
  return found;
}

// لو السكريبت مش جوه الشيت، بيدور على الشيت العام بالاسم
function findTarget_() {
  const it = DriveApp.searchFiles('title = "ZNU Survey Dashboard - Public data (no emails)" and mimeType = "application/vnd.google-apps.spreadsheet" and trashed = false');
  if (!it.hasNext()) throw new Error('مش لاقي شيت "ZNU Survey Dashboard - Public data (no emails)" في الدرايف');
  return SpreadsheetApp.open(it.next());
}

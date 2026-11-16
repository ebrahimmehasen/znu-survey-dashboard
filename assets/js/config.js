/*
 * إعدادات الداش بورد
 * ------------------------------------------------------------
 * - faculties: الكليات وبرامجها (للقائمة الجانبية)
 * - forms: كل فورم استطلاع (فورم لكل مستوى)، مربوط ببرنامج أو أكتر
 *     formId   : الـ ID من لينك الفورم  docs.google.com/forms/d/<formId>/edit
 *     sheetUrl : لينك شيت الردود بتاع الفورم ده. لازم يكون Share لـ "Anyone with the link"
 *                أو منشور من File > Share > Publish to web.
 *                لو فاضي، الفورم يظهر "في انتظار الردود".
 *
 * بعد ما تضيف فورم جديد أو تعدل أسئلة فورم، شغّل:
 *     node tools/build-schema.js
 * عشان يتحدث ملف data/forms.json (أسماء الدكاترة والمعيدين والبنود).
 */
window.DASHBOARD_CONFIG = {
  university: {
    nameAr: "جامعة الزقازيق الأهلية",
    nameEn: "Zagazig National University",
    surveyTitle: "استبيان تقييم أعضاء هيئة التدريس والهيئة المعاونة • الترم الأول 2026/2027",
    logo: "assets/img/logo.png",
    background: "assets/img/background.jpg",
  },

  // تحديث تلقائي كل كام دقيقة (0 = بدون)
  refreshMinutes: 5,

  faculties: [
    {
      id: "engineering", nameAr: "كلية الهندسة", nameEn: "Faculty of Engineering", icon: "⚙️",
      programs: [
        { id: "mechatronics", nameAr: "هندسة الميكاترونكس", nameEn: "Mechatronics Engineering" },
        { id: "construction", nameAr: "هندسة التشييد", nameEn: "Construction Engineering" },
      ],
    },
    {
      id: "dentistry", nameAr: "كلية طب الأسنان", nameEn: "Faculty of Dentistry", icon: "🦷",
      programs: [{ id: "dentistry", nameAr: "طب وجراحة الفم والأسنان", nameEn: "Dentistry" }],
    },
    {
      id: "pharmacy", nameAr: "كلية الصيدلة", nameEn: "Faculty of Pharmacy", icon: "💊",
      programs: [{ id: "clinical-pharmacy", nameAr: "الصيدلة الإكلينيكية", nameEn: "Clinical Pharmacy" }],
    },
    {
      id: "commerce", nameAr: "كلية التجارة", nameEn: "Faculty of Commerce", icon: "📊",
      programs: [
        { id: "accounting", nameAr: "المحاسبة", nameEn: "Accounting" },
        { id: "business", nameAr: "إدارة الأعمال", nameEn: "Business Administration" },
      ],
    },
    {
      id: "computers", nameAr: "كلية الحاسبات والمعلومات", nameEn: "Faculty of Computers & Information", icon: "💻",
      programs: [
        { id: "aviation-is", nameAr: "نظم معلومات الطيران", nameEn: "Aviation Information Systems" },
        { id: "medical-informatics", nameAr: "المعلوماتية الطبية", nameEn: "Medical Informatics" },
        { id: "ai", nameAr: "الذكاء الاصطناعي", nameEn: "Artificial Intelligence" },
      ],
    },
  ],

  forms: [
    // الهندسة - ميكاترونكس
    { id: "mech-000", programs: ["mechatronics"], level: "مستوى 000", order: 0, formId: "1xXIgAZXtV51AMONMYdhxag2wp6GHV0u5BACE-jJBrf8", sheetUrl: "https://docs.google.com/spreadsheets/d/1lR9_N7INcnQP-iINw4XJ1OILZd_9bxe5c7dNYwq5q_Y/edit#gid=1326250009" },
    { id: "mech-100", programs: ["mechatronics"], level: "مستوى 100", order: 1, formId: "1zA6yDl0vUX7FReZ_uoQlZ0A7Z_LksqyBvMqb6v4InUU", sheetUrl: "https://docs.google.com/spreadsheets/d/1-U805bDnCnNXPcMl57-gPwcqZhsfq8kkXLS7GUvKSHE/edit#gid=160576304" },
    { id: "mech-200", programs: ["mechatronics"], level: "مستوى 200", order: 2, formId: "1hxMeBmzj3IyCqxGW5T8JiFxyodS8GEreGwVnQbolrk8", sheetUrl: "https://docs.google.com/spreadsheets/d/1nW3HdUfKhIQdH0v5GrLlIhwlRgVU4E8SRUZD4jqGrXM/edit#gid=1621078087" },
    { id: "mech-300", programs: ["mechatronics"], level: "مستوى 300", order: 3, formId: "1iQ3IwF6DH4Clg66ei-cfQAg2CzFhzlXuUmQw22bJHFI", sheetUrl: "https://docs.google.com/spreadsheets/d/1-sXvcNvRnijQ26CB4UpwgCN2d1bquV_fyxQGjNvqpJ8/edit#gid=1799507178" },
    { id: "mech-400", programs: ["mechatronics"], level: "مستوى 400", order: 4, formId: "1fnVYj086How1OuXLg2NQaDEt5hCMpyz3JfwAgIkRvLE", sheetUrl: "https://docs.google.com/spreadsheets/d/1e3jJjclCBf6DGGt_63Hbk-aJBPU6zSCrpqaLw-W-_CQ/edit#gid=1583630094" },

    // طب الأسنان
    { id: "dent-4", programs: ["dentistry"], level: "الفرقة الرابعة", order: 4, formId: "1xhK_dgQUIcO9ol1zzrHhGn8AZVmnnAKr2fSK5Dgxzsk", sheetUrl: "https://docs.google.com/spreadsheets/d/1aoDJPr4mV_G5D_Rt7lAXflbCIcrF2oL2ZChQenzWmOg/edit#gid=1982398676" },
    { id: "dent-5", programs: ["dentistry"], level: "الفرقة الخامسة", order: 5, formId: "146exCUKU2kMazlTOVbGKUbympyBKGcnZ5Wd6kWEEe4w", sheetUrl: "https://docs.google.com/spreadsheets/d/1nTng1iS4Y9wa8PqG-L-64WPtE8xbuRxtZj8udTdTplw/edit#gid=411111535" },

    // الصيدلة
    { id: "pharm-1", programs: ["clinical-pharmacy"], level: "المستوى الأول", order: 1, formId: "1xwC6eZJ7mhPVKvSfqeScpv5pY5IOFqs0-vCTkWjyGfY", sheetUrl: "https://docs.google.com/spreadsheets/d/1e4xGs8lDeUG0Hp5-bmV_032BH7NJy6L_BSKkbwZBGw8/edit#gid=1080796642" },

    // التجارة (المستويات 1-3 مشتركة بين المحاسبة وإدارة الأعمال)
    { id: "com-1", programs: ["accounting", "business"], level: "المستوى الأول", order: 1, formId: "1bwHZ6K3FRLtkxMVt-J_FqaAE5WJrNJ7nkxkqjxtvNqg", sheetUrl: "https://docs.google.com/spreadsheets/d/1raJfcwz-6Yz5MQWFc9LHmb-FA7YOpeE-m4Isg_90Lb4/edit#gid=1615455050" },
    { id: "com-2", programs: ["accounting", "business"], level: "المستوى الثاني", order: 2, formId: "18GgtQHXGbRRzgReq-7bjcP_dSeuObU5WsYNwV-CCLCo", sheetUrl: "https://docs.google.com/spreadsheets/d/1bsh5OIPIJAJw1av26tFmmczlJM-89_ze3tOx6RA4lWc/edit#gid=1664109150" },
    { id: "com-3", programs: ["accounting", "business"], level: "المستوى الثالث", order: 3, formId: "1PNZt4Rvbyov--hU_jT-2JLzdtMGX5GYuIwCcFGoyx-Y", sheetUrl: "https://docs.google.com/spreadsheets/d/1Ve1zjV8zVRCOgRThJBysqTdDaw3_dG5C3hPM8f_y75k/edit#gid=1534893311" },
    { id: "acc-4", programs: ["accounting"], level: "المستوى الرابع", order: 4, formId: "1sn-2Zoghai12UZYvpkT1z1z_YHvHgKRzVpbF2omMTeI", sheetUrl: "https://docs.google.com/spreadsheets/d/1D3ntcAvm67VIlrQfWOvozecvE1OdyxNAwTDcXIYrxac/edit#gid=513357028" },
    { id: "bus-4", programs: ["business"], level: "المستوى الرابع", order: 4, formId: "1BV7rAaa0FLHzNwKdr2DubsJwqPWYjzRysh1MX3vJLx4", sheetUrl: "https://docs.google.com/spreadsheets/d/1rYth4NqZzkEQgpWk1MFhiBWKx5s4vNcphzqjPfGxN7A/edit#gid=182562303" },
  ],
};

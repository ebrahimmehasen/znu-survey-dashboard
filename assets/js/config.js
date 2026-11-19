/*
 * إعدادات الداش بورد
 * ------------------------------------------------------------
 * - faculties: الكليات وبرامجها (للقائمة الجانبية)
 * - forms: كل فورم استطلاع (فورم لكل مستوى)، مربوط ببرنامج أو أكتر
 *     formId   : الـ ID من لينك الفورم  docs.google.com/forms/d/<formId>/edit
 *     sheetUrl : لينك CSV منشور (Publish to web) للتاب الخاص بالفورم ده في شيت
 *                "ZNU Survey Dashboard - Public data (no emails)" — التاب بيسحب الردود
 *                بـ IMPORTRANGE من غير عمود الإيميل. لو فاضي، الفورم يظهر "في انتظار الردود".
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
    logo: "assets/img/logo.webp",
    background: "assets/img/campus-bg.webp",
    backgroundSmall: "assets/img/campus-bg-sm.webp",
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
    { id: "mech-000", programs: ["mechatronics"], level: "مستوى 000", order: 0, formId: "1xXIgAZXtV51AMONMYdhxag2wp6GHV0u5BACE-jJBrf8", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1722053247&single=true&output=csv" },
    { id: "mech-100", programs: ["mechatronics"], level: "مستوى 100", order: 1, formId: "1zA6yDl0vUX7FReZ_uoQlZ0A7Z_LksqyBvMqb6v4InUU", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1551211116&single=true&output=csv" },
    { id: "mech-200", programs: ["mechatronics"], level: "مستوى 200", order: 2, formId: "1hxMeBmzj3IyCqxGW5T8JiFxyodS8GEreGwVnQbolrk8", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1508018068&single=true&output=csv" },
    { id: "mech-300", programs: ["mechatronics"], level: "مستوى 300", order: 3, formId: "1iQ3IwF6DH4Clg66ei-cfQAg2CzFhzlXuUmQw22bJHFI", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=269743013&single=true&output=csv" },
    { id: "mech-400", programs: ["mechatronics"], level: "مستوى 400", order: 4, formId: "1fnVYj086How1OuXLg2NQaDEt5hCMpyz3JfwAgIkRvLE", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=492010128&single=true&output=csv" },

    // طب الأسنان
    { id: "dent-1", programs: ["dentistry"], level: "الفرقة الأولى", order: 1, formId: "1Rbg1vBxjMZuaP9qisHGtabeIP1t4I8Quf8S_7_MOR98", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=2109208560&single=true&output=csv" },
    { id: "dent-2", programs: ["dentistry"], level: "الفرقة الثانية", order: 2, formId: "1597VMJLwLc0ApPahVFBkBIDxtcmsGxaLkE0QRzdQsmk", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=774907764&single=true&output=csv" },
    { id: "dent-3", programs: ["dentistry"], level: "الفرقة الثالثة", order: 3, formId: "11V2h_S8Ade0OZ7x-oBEXpRga93vkwA1i26_oJk8nzNY", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=2053664040&single=true&output=csv" },
    { id: "dent-4", programs: ["dentistry"], level: "الفرقة الرابعة", order: 4, formId: "1xhK_dgQUIcO9ol1zzrHhGn8AZVmnnAKr2fSK5Dgxzsk", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=757745353&single=true&output=csv" },
    { id: "dent-5", programs: ["dentistry"], level: "الفرقة الخامسة", order: 5, formId: "146exCUKU2kMazlTOVbGKUbympyBKGcnZ5Wd6kWEEe4w", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=2112333678&single=true&output=csv" },

    // الصيدلة
    { id: "pharm-1", programs: ["clinical-pharmacy"], level: "المستوى الأول", order: 1, formId: "1xwC6eZJ7mhPVKvSfqeScpv5pY5IOFqs0-vCTkWjyGfY", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1270752952&single=true&output=csv" },
    { id: "pharm-2", programs: ["clinical-pharmacy"], level: "المستوى الثاني", order: 2, formId: "e/1FAIpQLSerKc6mu-Aq3GeOAT2ncHI-bbvB1pBn0ibqhH5boKQUAFsxhQ", sheetUrl: "" },
    { id: "pharm-3", programs: ["clinical-pharmacy"], level: "المستوى الثالث", order: 3, formId: "e/1FAIpQLSe4k9kn5nh5FFKP771ILmqX_tlswbAd5bvatoQ_3ARDJQcUMQ", sheetUrl: "" },
    { id: "pharm-4", programs: ["clinical-pharmacy"], level: "المستوى الرابع", order: 4, formId: "e/1FAIpQLSfHV43iUJWiYBxgi7BkcEI5e8-VNrp_s8xtJ0OzgK2Nqjzg7A", sheetUrl: "" },

    // التجارة (المستويات 1-3 مشتركة بين المحاسبة وإدارة الأعمال)
    { id: "com-1", programs: ["accounting", "business"], level: "المستوى الأول", order: 1, formId: "1bwHZ6K3FRLtkxMVt-J_FqaAE5WJrNJ7nkxkqjxtvNqg", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1741575006&single=true&output=csv" },
    { id: "com-2", programs: ["accounting", "business"], level: "المستوى الثاني", order: 2, formId: "18GgtQHXGbRRzgReq-7bjcP_dSeuObU5WsYNwV-CCLCo", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=0&single=true&output=csv" },
    { id: "com-3", programs: ["accounting", "business"], level: "المستوى الثالث", order: 3, formId: "1PNZt4Rvbyov--hU_jT-2JLzdtMGX5GYuIwCcFGoyx-Y", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1220290415&single=true&output=csv" },
    { id: "acc-4", programs: ["accounting"], level: "المستوى الرابع", order: 4, formId: "1sn-2Zoghai12UZYvpkT1z1z_YHvHgKRzVpbF2omMTeI", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=437246830&single=true&output=csv" },
    { id: "bus-4", programs: ["business"], level: "المستوى الرابع", order: 4, formId: "1BV7rAaa0FLHzNwKdr2DubsJwqPWYjzRysh1MX3vJLx4", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=456603663&single=true&output=csv" },
  ],
};

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
    { id: "mech-000", programs: ["mechatronics"], level: "مستوى 000", order: 0, formId: "1xXIgAZXtV51AMONMYdhxag2wp6GHV0u5BACE-jJBrf8", sheetUrl: "https://docs.google.com/spreadsheets/d/16hIEdAsn7bBD1daWcx1-csHlFKVcUdrHm9qRVwFlKjw/edit#gid=1903749744" },
    { id: "mech-100", programs: ["mechatronics"], level: "مستوى 100", order: 1, formId: "1zA6yDl0vUX7FReZ_uoQlZ0A7Z_LksqyBvMqb6v4InUU", sheetUrl: "https://docs.google.com/spreadsheets/d/1huWVVMlDgomqocRyvNggKWDnMKnXbFUAbNHZiDZLNyA/edit#gid=261487985" },
    { id: "mech-200", programs: ["mechatronics"], level: "مستوى 200", order: 2, formId: "1hxMeBmzj3IyCqxGW5T8JiFxyodS8GEreGwVnQbolrk8", sheetUrl: "https://docs.google.com/spreadsheets/d/1FRtnQUHkmDSUXKHqDfB_QteFqAMyr0csXTmhwNTZCLY/edit#gid=988102600" },
    { id: "mech-300", programs: ["mechatronics"], level: "مستوى 300", order: 3, formId: "1iQ3IwF6DH4Clg66ei-cfQAg2CzFhzlXuUmQw22bJHFI", sheetUrl: "https://docs.google.com/spreadsheets/d/1HQVN3aD2YmrAF79en35qmujutUhavDYciuC1uJIUpE0/edit#gid=1608694489" },
    { id: "mech-400", programs: ["mechatronics"], level: "مستوى 400", order: 4, formId: "1fnVYj086How1OuXLg2NQaDEt5hCMpyz3JfwAgIkRvLE", sheetUrl: "https://docs.google.com/spreadsheets/d/1KqGkrqRWEq_EqKBf8OTuiw3sJq9Vmw-6Kxnj7WtoBkk/edit#gid=135435316" },

    // طب الأسنان
    { id: "dent-4", programs: ["dentistry"], level: "الفرقة الرابعة", order: 4, formId: "1xhK_dgQUIcO9ol1zzrHhGn8AZVmnnAKr2fSK5Dgxzsk", sheetUrl: "https://docs.google.com/spreadsheets/d/1t92oiMkHtzeJx7DkaWcZIl2wXn1bTl8X5bDyN9gKGYQ/edit#gid=1771623852" },
    { id: "dent-5", programs: ["dentistry"], level: "الفرقة الخامسة", order: 5, formId: "146exCUKU2kMazlTOVbGKUbympyBKGcnZ5Wd6kWEEe4w", sheetUrl: "https://docs.google.com/spreadsheets/d/1UH70SBxwKtruOznTPBY6ycJ7Y24FvnX7_qC6miORy8s/edit#gid=1758312801" },

    // الصيدلة
    { id: "pharm-1", programs: ["clinical-pharmacy"], level: "المستوى الأول", order: 1, formId: "1xwC6eZJ7mhPVKvSfqeScpv5pY5IOFqs0-vCTkWjyGfY", sheetUrl: "https://docs.google.com/spreadsheets/d/1jkoJrDksXLor64uD6A-4_S31hgV68SGZdI4qWfL5RL4/edit#gid=1071604669" },

    // التجارة (المستويات 1-3 مشتركة بين المحاسبة وإدارة الأعمال)
    { id: "com-1", programs: ["accounting", "business"], level: "المستوى الأول", order: 1, formId: "1bwHZ6K3FRLtkxMVt-J_FqaAE5WJrNJ7nkxkqjxtvNqg", sheetUrl: "https://docs.google.com/spreadsheets/d/1yipmNO7gqW6GNXkRacHBbSN6vxsKhAPU0_tnBwimXtI/edit#gid=540834783" },
    { id: "com-2", programs: ["accounting", "business"], level: "المستوى الثاني", order: 2, formId: "18GgtQHXGbRRzgReq-7bjcP_dSeuObU5WsYNwV-CCLCo", sheetUrl: "https://docs.google.com/spreadsheets/d/15p1JPftNmfjWeNiKubyAcCJUK0CaLiABcZSLhHMDgWE/edit#gid=1304267607" },
    { id: "com-3", programs: ["accounting", "business"], level: "المستوى الثالث", order: 3, formId: "1PNZt4Rvbyov--hU_jT-2JLzdtMGX5GYuIwCcFGoyx-Y", sheetUrl: "https://docs.google.com/spreadsheets/d/10LSRJF6268s6m2qZfHYxft-Bnn5nlgrCJUJtDRtfegk/edit#gid=975424160" },
    { id: "acc-4", programs: ["accounting"], level: "المستوى الرابع", order: 4, formId: "1sn-2Zoghai12UZYvpkT1z1z_YHvHgKRzVpbF2omMTeI", sheetUrl: "https://docs.google.com/spreadsheets/d/1Cs6la8CAsd0VkDuTA9gWv4sn2Zip2E-SIpSInrxtqo4/edit#gid=1853121876" },
    { id: "bus-4", programs: ["business"], level: "المستوى الرابع", order: 4, formId: "1BV7rAaa0FLHzNwKdr2DubsJwqPWYjzRysh1MX3vJLx4", sheetUrl: "https://docs.google.com/spreadsheets/d/1WXkPVC1xSFoEFOGkfa3VjTHe06QVQce4f5Huk-MXU5U/edit#gid=430413966" },
  ],
};

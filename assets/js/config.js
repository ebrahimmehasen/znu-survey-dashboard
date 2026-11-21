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
      id: "medicine", nameAr: "كلية الطب البشري", nameEn: "Faculty of Medicine", icon: "🩻",
      programs: [{ id: "medicine", nameAr: "الطب والجراحة", nameEn: "Medicine & Surgery" }],
    },
    {
      id: "pharmacy", nameAr: "كلية الصيدلة", nameEn: "Faculty of Pharmacy", icon: "💊",
      programs: [{ id: "clinical-pharmacy", nameAr: "الصيدلة الإكلينيكية", nameEn: "Clinical Pharmacy" }],
    },
    {
      id: "nursing", nameAr: "كلية التمريض", nameEn: "Faculty of Nursing", icon: "🩺",
      programs: [{ id: "nursing", nameAr: "التمريض", nameEn: "Nursing" }],
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

    // الهندسة - التشييد
    { id: "con-000", programs: ["construction"], level: "مستوى 000", order: 0, formId: "1qDHiMVDjYAW1XbOidMlfVgIXq8sIWemNh8APSma7_Oo", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=6389051&single=true&output=csv" },
    { id: "con-100", programs: ["construction"], level: "مستوى 100", order: 1, formId: "1coqdZKtArxs1U78DhNYj8lypAHGY_l5b7TXsrweQvXY", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1985894696&single=true&output=csv" },
    { id: "con-200", programs: ["construction"], level: "مستوى 200", order: 2, formId: "1cHrDnXDPxlOGUsTmsy512sufZgVUGflAsRTZOEJpNgU", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1482879036&single=true&output=csv" },
    { id: "con-300", programs: ["construction"], level: "مستوى 300", order: 3, formId: "1rKpYVcZIbDjysinXmi7gVnlMhjT-EcERn7JnuERqSnM", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1889785853&single=true&output=csv" },
    { id: "con-400", programs: ["construction"], level: "مستوى 400", order: 4, formId: "1Uv5692z65lgqnO60B5-Z7gZgJIw1O-DzscnOgVxlwM0", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=951531336&single=true&output=csv" },

    // طب الأسنان
    { id: "dent-1", programs: ["dentistry"], level: "الفرقة الأولى", order: 1, formId: "1Rbg1vBxjMZuaP9qisHGtabeIP1t4I8Quf8S_7_MOR98", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=2109208560&single=true&output=csv" },
    { id: "dent-2", programs: ["dentistry"], level: "الفرقة الثانية", order: 2, formId: "1597VMJLwLc0ApPahVFBkBIDxtcmsGxaLkE0QRzdQsmk", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=774907764&single=true&output=csv" },
    { id: "dent-3", programs: ["dentistry"], level: "الفرقة الثالثة", order: 3, formId: "11V2h_S8Ade0OZ7x-oBEXpRga93vkwA1i26_oJk8nzNY", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=2053664040&single=true&output=csv" },
    { id: "dent-4", programs: ["dentistry"], level: "الفرقة الرابعة", order: 4, formId: "1xhK_dgQUIcO9ol1zzrHhGn8AZVmnnAKr2fSK5Dgxzsk", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=757745353&single=true&output=csv" },
    { id: "dent-5", programs: ["dentistry"], level: "الفرقة الخامسة", order: 5, formId: "146exCUKU2kMazlTOVbGKUbympyBKGcnZ5Wd6kWEEe4w", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=2112333678&single=true&output=csv" },

    // الطب البشري: الاستبيانات على LectaSync (مش Google Forms)، فالنتيجة ملف جاهز في data/medicine
    // بيتعمل بـ tools/build-medicine.js من تصدير الردود. formId هنا مجرد مفتاح (رقم استبيان الدكاترة على LectaSync).
    { id: "med-1", programs: ["medicine"], level: "المستوى الأول", order: 1, formId: "lectasync-9", dataUrl: "data/medicine/med-1.json" },
    { id: "med-2", programs: ["medicine"], level: "المستوى الثاني", order: 2, formId: "lectasync-11", dataUrl: "data/medicine/med-2.json" },
    { id: "med-3", programs: ["medicine"], level: "المستوى الثالث", order: 3, formId: "lectasync-4", dataUrl: "data/medicine/med-3.json" },
    { id: "med-4-medicine", programs: ["medicine"], level: "المستوى الرابع — Medicine I", order: 4, formId: "lectasync-18", dataUrl: "data/medicine/med-4-medicine.json" },
    { id: "med-4-pediatrics", programs: ["medicine"], level: "المستوى الرابع — Pediatrics", order: 4.5, formId: "lectasync-16", dataUrl: "data/medicine/med-4-pediatrics.json" },
    { id: "med-5", programs: ["medicine"], level: "المستوى الخامس", order: 5, formId: "lectasync-14", dataUrl: "data/medicine/med-5.json" },

    // الصيدلة
    { id: "pharm-1", programs: ["clinical-pharmacy"], level: "المستوى الأول", order: 1, formId: "1xwC6eZJ7mhPVKvSfqeScpv5pY5IOFqs0-vCTkWjyGfY", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1270752952&single=true&output=csv" },
    { id: "pharm-2", programs: ["clinical-pharmacy"], level: "المستوى الثاني", order: 2, formId: "11zImhKJlmiDkZ90IdYDtM7nxSJwTzjnWQ-Zu7c1CeXY", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1359291224&single=true&output=csv" },
    { id: "pharm-3", programs: ["clinical-pharmacy"], level: "المستوى الثالث", order: 3, formId: "1ug05oS7X8bLkEl5QuqhTb-hLXF6-lgJZdhW6kWyqSpo", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=576110900&single=true&output=csv" },
    { id: "pharm-4", programs: ["clinical-pharmacy"], level: "المستوى الرابع", order: 4, formId: "1k80ZZ8_U441OpdW3CT87jQdM6uhjRB3l5TE8RTSm-EM", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=961260130&single=true&output=csv" },

    // التمريض
    { id: "nurs-1", programs: ["nursing"], level: "المستوى الأول", order: 1, formId: "1whKwIi7SXirr-srUdeJaNw97JFDaN0gFWdF95KzTjjg", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1387576736&single=true&output=csv" },
    { id: "nurs-2", programs: ["nursing"], level: "المستوى الثاني", order: 2, formId: "1NpRpCCkKiNAJD2aNEoaK5JYmvbq-iGo4c9_9dnpO_1I", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1090775901&single=true&output=csv" },
    { id: "nurs-3", programs: ["nursing"], level: "المستوى الثالث", order: 3, formId: "15WBb_xVF9GMjJV0jhdcYNMkzjwLRwvWmTgtbqKCPfZk", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=2017067935&single=true&output=csv" },
    { id: "nurs-4", programs: ["nursing"], level: "المستوى الرابع", order: 4, formId: "1VaZOs5ybi2eAM0Zr21y9VKVFd39UrIndqvmnMas3GFI", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1902641503&single=true&output=csv" },

    // الحاسبات والمعلومات
    { id: "avi-1", programs: ["aviation-is"], level: "المستوى الأول", order: 1, formId: "18h5HMm5fZNLjxOwguelB8WLB6tpEtOaMxWdE_lPt-WY", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=435641527&single=true&output=csv" },
    { id: "avi-2", programs: ["aviation-is"], level: "المستوى الثاني", order: 2, formId: "1tWthuf-sT6Bst6pgaC2_jDHaLkJNuN98cVzFhuehgXs", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=747980681&single=true&output=csv" },
    { id: "avi-3", programs: ["aviation-is"], level: "المستوى الثالث", order: 3, formId: "1s5RhHE4qfazec0pX3raoKWUK2BaybNSd_s9aLtL6uOI", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1014198664&single=true&output=csv" },
    { id: "avi-4", programs: ["aviation-is"], level: "المستوى الرابع", order: 4, formId: "1bTywqVPN2PhKu9sSJsFPPmmdKZNIa7_s5STTrvb5CFA", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1001866161&single=true&output=csv" },
    { id: "mi-1", programs: ["medical-informatics"], level: "المستوى الأول", order: 1, formId: "1AbMhlfdbVj_K1HOBr4G4uBzLoTsi4o1YebId0sKpKHA", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1608509025&single=true&output=csv" },
    { id: "mi-2", programs: ["medical-informatics"], level: "المستوى الثاني", order: 2, formId: "1HeI965fL5GhUBea596E6dH7OM93oIefx9HjM5xIZTZM", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=851503703&single=true&output=csv" },
    { id: "mi-3", programs: ["medical-informatics"], level: "المستوى الثالث", order: 3, formId: "1QSiEhDVvZjc1JgThRAHugE1uxIeBb8wH9iUqUHJ5U_4", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=525033958&single=true&output=csv" },
    { id: "mi-4", programs: ["medical-informatics"], level: "المستوى الرابع", order: 4, formId: "1bPOrG6tXOGOS_7zQA-VffePtWoDasDXZVkABsfqgqUE", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=2117527005&single=true&output=csv" },
    { id: "ai-1", programs: ["ai"], level: "المستوى الأول", order: 1, formId: "19_PtejmOZcMpzxV2q1lq1Onm9Ery9rBEvaJCAk3bij4", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=945482095&single=true&output=csv" },
    { id: "ai-2", programs: ["ai"], level: "المستوى الثاني", order: 2, formId: "1VjbpKKB__TbdF0_DaDQf-fMRV5xzmgOKGA6W6DayAnc", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1438789717&single=true&output=csv" },
    { id: "ai-3", programs: ["ai"], level: "المستوى الثالث", order: 3, formId: "1s_RT6-UclCXOPo2lXlpubgdKpyBQvCW219Y9yImwBpk", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=33631516&single=true&output=csv" },
    { id: "ai-4", programs: ["ai"], level: "المستوى الرابع", order: 4, formId: "1GdNEYjvQJUPNRhlpMRh_2tqxenHjyb5uOIPAA-YnXZY", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=2027810353&single=true&output=csv" },

    // التجارة (المستويات 1-3 مشتركة بين المحاسبة وإدارة الأعمال)
    { id: "com-1", programs: ["accounting", "business"], level: "المستوى الأول", order: 1, formId: "1bwHZ6K3FRLtkxMVt-J_FqaAE5WJrNJ7nkxkqjxtvNqg", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1741575006&single=true&output=csv" },
    { id: "com-2", programs: ["accounting", "business"], level: "المستوى الثاني", order: 2, formId: "18GgtQHXGbRRzgReq-7bjcP_dSeuObU5WsYNwV-CCLCo", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=0&single=true&output=csv" },
    { id: "com-3", programs: ["accounting", "business"], level: "المستوى الثالث", order: 3, formId: "1PNZt4Rvbyov--hU_jT-2JLzdtMGX5GYuIwCcFGoyx-Y", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=1220290415&single=true&output=csv" },
    { id: "acc-4", programs: ["accounting"], level: "المستوى الرابع", order: 4, formId: "1sn-2Zoghai12UZYvpkT1z1z_YHvHgKRzVpbF2omMTeI", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=437246830&single=true&output=csv" },
    { id: "bus-4", programs: ["business"], level: "المستوى الرابع", order: 4, formId: "1BV7rAaa0FLHzNwKdr2DubsJwqPWYjzRysh1MX3vJLx4", sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR20n7KRcF6cT1jMev-23FEUI-_kQFXPRlx9FIz_I-e8bsg_tQXQ38nOIUsYShjHMz_Q9LMuicHxRC/pub?gid=456603663&single=true&output=csv" },
  ],
};

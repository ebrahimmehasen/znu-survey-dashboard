/*
 * إعدادات الداش بورد
 * ------------------------------------------------------------
 * لكل برنامج حط لينك شيت الردود (Google Sheets) في sheetUrl.
 * ينفع تحط:
 *   - لينك الشيت العادي (.../spreadsheets/d/<ID>/edit#gid=0) والشيت متشارك "Anyone with the link"
 *   - أو لينك "Publish to web" بصيغة CSV (.../pub?output=csv)
 * لو sheetUrl فاضي، البرنامج يظهر "لا توجد بيانات بعد".
 */
window.DASHBOARD_CONFIG = {
  university: {
    nameAr: "جامعة الزقازيق الأهلية",
    nameEn: "Zagazig National University",
    surveyTitle: "نتائج استطلاع رأي الطلاب",
    logo: "assets/img/logo.png",
    background: "assets/img/background.jpg",
  },

  // تحديث تلقائي كل كام دقيقة (0 = بدون)
  refreshMinutes: 5,

  faculties: [
    {
      id: "engineering",
      nameAr: "كلية الهندسة",
      nameEn: "Faculty of Engineering",
      icon: "⚙️",
      programs: [
        { id: "mechatronics", nameAr: "هندسة الميكاترونكس", nameEn: "Mechatronics Engineering", formUrl: "", sheetUrl: "" },
        { id: "construction", nameAr: "هندسة التشييد", nameEn: "Construction Engineering", formUrl: "", sheetUrl: "" },
      ],
    },
    {
      id: "dentistry",
      nameAr: "كلية طب الأسنان",
      nameEn: "Faculty of Dentistry",
      icon: "🦷",
      programs: [
        { id: "dentistry", nameAr: "طب وجراحة الفم والأسنان", nameEn: "Dentistry", formUrl: "", sheetUrl: "" },
      ],
    },
    {
      id: "pharmacy",
      nameAr: "كلية الصيدلة",
      nameEn: "Faculty of Pharmacy",
      icon: "💊",
      programs: [
        { id: "pharmacy", nameAr: "الصيدلة", nameEn: "Pharmacy", formUrl: "", sheetUrl: "" },
      ],
    },
    {
      id: "commerce",
      nameAr: "كلية التجارة",
      nameEn: "Faculty of Commerce",
      icon: "📊",
      programs: [
        { id: "accounting", nameAr: "المحاسبة", nameEn: "Accounting", formUrl: "", sheetUrl: "" },
        { id: "business", nameAr: "إدارة الأعمال", nameEn: "Business Administration", formUrl: "", sheetUrl: "" },
      ],
    },
    {
      id: "computers",
      nameAr: "كلية الحاسبات والمعلومات",
      nameEn: "Faculty of Computers & Information",
      icon: "💻",
      programs: [
        { id: "aviation-is", nameAr: "نظم معلومات الطيران", nameEn: "Aviation Information Systems", formUrl: "", sheetUrl: "" },
        { id: "medical-informatics", nameAr: "المعلوماتية الطبية", nameEn: "Medical Informatics", formUrl: "", sheetUrl: "" },
        { id: "ai", nameAr: "الذكاء الاصطناعي", nameEn: "Artificial Intelligence", formUrl: "", sheetUrl: "" },
      ],
    },
  ],
};

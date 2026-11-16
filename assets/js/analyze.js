/*
 * تحليل ردود Google Forms بشكل عام:
 * - بيكتشف أسئلة المقياس (ممتاز/جيد جدا/... أو موافق بشدة/... أو أرقام 1-5)
 * - بيجمع أسئلة الجريد (Question [Item]) مع بعض
 * - بيصنف كل سؤال: دكاترة / معيدين / مواد / عام
 */
(function () {
  const norm = (s) =>
    String(s ?? "")
      .replace(/[ً-ْـ]/g, "") // تشكيل وتطويل
      .replace(/[إأآا]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const SCALE = {
    5: ["ممتاز", "ممتازه", "موافق بشده", "موافق تماما", "راض جدا", "راضي جدا", "دايما", "دائما", "عالي جدا", "excellent", "strongly agree", "always", "very satisfied"],
    4: ["جيد جدا", "موافق", "راض", "راضي", "غالبا", "عالي", "very good", "agree", "often", "satisfied"],
    3: ["جيد", "محايد", "احيانا", "متوسط", "الي حد ما", "إلى حد ما", "good", "neutral", "sometimes", "average"],
    2: ["مقبول", "غير موافق", "نادرا", "منخفض", "غير راض", "fair", "disagree", "rarely", "dissatisfied"],
    1: ["ضعيف", "غير موافق بشده", "غير موافق تماما", "ابدا", "سيء", "سئ", "منخفض جدا", "غير راض تماما", "poor", "strongly disagree", "never", "very dissatisfied"],
  };
  const SCALE_MAP = new Map();
  for (const [score, words] of Object.entries(SCALE)) for (const w of words) SCALE_MAP.set(norm(w), +score);

  function toScore(v) {
    const n = norm(v);
    if (!n) return null;
    if (SCALE_MAP.has(n)) return SCALE_MAP.get(n);
    if (/^\d+(\.\d+)?$/.test(n)) return +n;
    return undefined; // مش قيمة مقياس
  }

  const CATS = {
    doctors: /دكتور|الدكتور|\bد\s*\.|استاذ|عضو هيئه|المحاضر|doctor|professor|lecturer/,
    tas: /معيد|المعيد|مدرس مساعد|هيئه معاونه|teaching assistant|\bta\b/,
    courses: /ماده|الماده|مقرر|المقرر|كورس|المنهج|course|subject/,
  };
  function categorize(text) {
    const n = norm(text);
    if (CATS.tas.test(n)) return "tas";
    if (CATS.doctors.test(n)) return "doctors";
    if (CATS.courses.test(n)) return "courses";
    return "general";
  }

  const SKIP = /timestamp|طابع زمني|الطابع الزمني|email|البريد|الايميل|اسم الطالب|student name|الرقم القومي|كود الطالب|رقم الهاتف|phone/;

  function analyze(rows, headers) {
    const result = {
      responses: rows.length,
      lastResponse: null,
      categories: { doctors: [], tas: [], courses: [], general: [] },
      choices: [],
      texts: [],
    };
    if (!rows.length) return result;

    const tsCol = headers.find((h) => /timestamp|طابع زمني/.test(norm(h)));
    if (tsCol) {
      const last = rows[rows.length - 1][tsCol];
      result.lastResponse = last || null;
    }

    const grids = new Map();
    for (const h of headers) {
      if (!h || SKIP.test(norm(h))) continue;
      const values = rows.map((r) => r[h]).filter((v) => String(v ?? "").trim() !== "");
      if (!values.length) continue;

      const scores = values.map(toScore);
      const numeric = scores.filter((s) => typeof s === "number");
      const isScale = numeric.length / values.length >= 0.8 && Math.max(...numeric) <= 10;

      const m = h.match(/^(.*?)\s*\[(.+)\]\s*$/);
      const question = m ? m[1].trim() : h.trim();
      const item = m ? m[2].trim() : null;

      if (isScale) {
        const max = Math.max(...numeric) > 5 ? 10 : 5;
        const metric = { question, item, label: item || question, scores: numeric, max };
        metric.avg = numeric.reduce((a, b) => a + b, 0) / numeric.length;
        metric.pct = (metric.avg / max) * 100;
        metric.dist = [1, 2, 3, 4, 5].map((k) => numeric.filter((s) => Math.round((s / max) * 5) === k).length);
        const cat = categorize(h);
        if (item) {
          const key = cat + "|" + question;
          if (!grids.has(key)) grids.set(key, { cat, question, metrics: [] });
          grids.get(key).metrics.push(metric);
        } else {
          result.categories[cat].push({ question, metrics: [metric], single: true });
        }
        continue;
      }

      const unique = new Set(values.map((v) => String(v).trim()));
      const counts = {};
      for (const v of values) {
        // اختيارات متعددة (Checkboxes) بتيجي مفصولة بفاصلة
        const parts = String(v).split(/,\s(?=\S)/);
        for (const p of parts) counts[p.trim()] = (counts[p.trim()] || 0) + 1;
      }
      const openEnded = /اقتراح|ملاحظ|تعليق|رايك في|اكتب|suggest|comment|feedback/.test(norm(h));
      if (!openEnded && (unique.size <= 15 || Object.keys(counts).length <= 15)) {
        result.choices.push({ question: h, counts, total: values.length, cat: categorize(h) });
      } else {
        result.texts.push({ question: h, answers: values.map(String) });
      }
    }

    for (const g of grids.values()) result.categories[g.cat].push({ question: g.question, metrics: g.metrics });

    // ملخص كل تصنيف
    result.summary = {};
    for (const [cat, groups] of Object.entries(result.categories)) {
      const all = groups.flatMap((g) => g.metrics);
      result.summary[cat] = all.length ? all.reduce((a, m) => a + m.pct, 0) / all.length : null;
    }
    const allMetrics = Object.values(result.categories).flat().flatMap((g) => g.metrics);
    result.overall = allMetrics.length ? allMetrics.reduce((a, m) => a + m.pct, 0) / allMetrics.length : null;
    return result;
  }

  // يحول أي لينك Google Sheets لـ CSV
  function toCsvUrl(url) {
    if (!url) return "";
    if (/output=csv|tqx=out:csv/.test(url)) return url;
    const id = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (id && !/\/d\/e\//.test(url)) {
      const gid = url.match(/[#&?]gid=(\d+)/);
      return `https://docs.google.com/spreadsheets/d/${id[1]}/gviz/tq?tqx=out:csv${gid ? "&gid=" + gid[1] : ""}`;
    }
    if (/\/pubhtml/.test(url)) return url.replace("/pubhtml", "/pub").replace(/\?.*$/, "") + "?output=csv";
    return url;
  }

  window.SurveyAnalyzer = { analyze, toCsvUrl, norm };
})();

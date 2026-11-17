/*
 * تحليل ردود الاستبيان بالاعتماد على شكل الفورم (data/forms.json)
 * - كل قسم في الفورم = عضو هيئة تدريس أو هيئة معاونة (ومعاه المادة في فورمز التجارة)
 * - أعمدة الشيت بتتربط بالأقسام بالترتيب، لأن عناوين الأعمدة بتتكرر في كل قسم
 */
(function () {
  const norm = (s) =>
    String(s ?? "")
      .replace(/[ً-ْـ]/g, "")
      .replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[ھہ]/g, "ه").replace(/[یي]/g, "ي")
      .replace(/[.\s]+$/g, "").replace(/\s+/g, " ").trim().toLowerCase();

  const SCORE = new Map(Object.entries({
    "موافق تماما": 5, "موافق بشده": 5, "ممتاز": 5,
    "موافق": 4, "جيد جدا": 4,
    "الي حد ما": 3, "محايد": 3, "جيد": 3,
    "غير موافق": 2, "مقبول": 2,
    "غير موافق تماما": 1, "غير موافق بشده": 1, "ضعيف": 1,
  }));
  const toScore = (v) => {
    const n = norm(v);
    if (!n) return null;
    if (SCORE.has(n)) return SCORE.get(n);
    return /^[1-5]$/.test(n) ? +n : null;
  };

  const bracket = (h) => { const m = String(h).match(/\[(.*)\]\s*$/s); return m ? norm(m[1]) : null; };

  // يربط كل قسم بأرقام أعمدته في الشيت.
  // الأعمدة بتتكرر بنفس العنوان في كل قسم، فالربط لازم يمشي لقدام بس وقريب من آخر عمود اتربط:
  // لو عمود ناقص، بنسيبه فاضي بدل ما ناخد عمود القسم اللي بعده ونزحزح كل الأقسام.
  const LOOKAHEAD = 3;
  function mapColumns(schema, headers) {
    const used = new Set();
    const nh = headers.map(norm), nb = headers.map(bracket);
    let cursor = 0, matched = 0, expected = 0;
    const find = (pred) => {
      const end = Math.min(headers.length, cursor + LOOKAHEAD);
      for (let i = cursor; i < end; i++) if (!used.has(i) && pred(i)) return i;
      return -1;
    };
    const take = (i) => { if (i >= 0) { used.add(i); cursor = i + 1; matched++; } expected++; return i; };
    const sections = schema.sections.map((s) => ({
      grids: s.grids.map((g) => g.rows.map((r) => { const t = norm(r.text); return take(find((i) => nb[i] === t)); })),
      comments: s.comments.map((c) => { const t = norm(c.title); return take(find((i) => nh[i] === t)); }),
    }));
    return { sections, matched, expected };
  }

  const emptyStats = () => ({ sum: 0, count: 0, dist: [0, 0, 0, 0, 0], crit: {}, respondents: 0 });
  function addStats(a, b) {
    a.sum += b.sum; a.count += b.count; a.respondents += b.respondents;
    b.dist.forEach((v, i) => (a.dist[i] += v));
    for (const [c, v] of Object.entries(b.crit)) {
      a.crit[c] = a.crit[c] || { sum: 0, count: 0 };
      a.crit[c].sum += v.sum; a.crit[c].count += v.count;
    }
    return a;
  }
  const pct = (st) => (st && st.count ? (st.sum / st.count / 5) * 100 : null);

  /** يحلل فورم واحد: rows = مصفوفة صفوف (كل صف مصفوفة قيم) */
  function analyzeForm(schema, headers, rows) {
    const map = mapColumns(schema, headers);
    const tsIdx = headers.findIndex((h) => /timestamp|طابع زمني|الطابع الزمني/i.test(h));
    const out = {
      responses: rows.length,
      lastResponse: tsIdx >= 0 && rows.length ? rows[rows.length - 1][tsIdx] : null,
      coverage: map.expected ? map.matched / map.expected : 0,
      sections: [],
    };
    schema.sections.forEach((s, si) => {
      const cols = map.sections[si];
      const st = emptyStats();
      const comments = [];
      for (const row of rows) {
        let answered = false;
        s.grids.forEach((g, gi) => g.rows.forEach((r, ri) => {
          const idx = cols.grids[gi][ri];
          if (idx < 0) return;
          // checkbox grids (dentistry) allow several answers in one cell: "موافق, الى حد ما"
          const scores = String(row[idx] ?? "").split(/\s*,\s*/).map(toScore).filter((v) => v != null);
          if (!scores.length) return;
          answered = true;
          const c = r.c;
          st.crit[c] = st.crit[c] || { sum: 0, count: 0 };
          for (const sc of scores) {
            st.sum += sc; st.count++; st.dist[sc - 1]++;
            st.crit[c].sum += sc; st.crit[c].count++;
          }
        }));
        if (answered) st.respondents++;
        cols.comments.forEach((idx) => {
          const t = idx >= 0 ? String(row[idx] ?? "").trim() : "";
          if (t && !/^[-_.\s0]*$|^(لا|لايوجد|لا يوجد|no|none|nothing|مفيش)$/i.test(norm(t))) comments.push(t);
        });
      }
      // hasBox: the form gave students a box to write comments for this person (some sections only have a title)
      out.sections.push({ name: s.name, title: s.title, role: s.role, course: s.course, key: s.key, stats: st, comments, hasBox: s.comments.length > 0 });
    });
    return out;
  }

  // يحوّل أي لينك Google Sheets للينك CSV
  function toCsvUrl(url) {
    if (!url) return "";
    if (/output=csv|tqx=out:csv|format=csv/.test(url)) return url;
    if (/\/d\/e\//.test(url)) return url.replace(/\/pub(html)?.*$/, "/pub?output=csv" + ((url.match(/[?&#]gid=(\d+)/) || [])[1] ? "&gid=" + url.match(/[?&#]gid=(\d+)/)[1] : ""));
    const id = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (id) {
      const gid = url.match(/[#&?]gid=(\d+)/);
      return `https://docs.google.com/spreadsheets/d/${id[1]}/gviz/tq?tqx=out:csv&headers=1${gid ? "&gid=" + gid[1] : ""}`;
    }
    return url;
  }

  window.SurveyAnalyzer = { analyzeForm, toCsvUrl, norm, emptyStats, addStats, pct };
})();

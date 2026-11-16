(function () {
  const CFG = window.DASHBOARD_CONFIG;
  const { analyzeForm, toCsvUrl, emptyStats, addStats, pct } = window.SurveyAnalyzer;
  const DEMO = new URLSearchParams(location.search).has("demo");
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, d = 0) => (n == null || isNaN(n) ? "—" : Number(n).toLocaleString("ar-EG", { maximumFractionDigits: d, minimumFractionDigits: d }));
  const fmtPct = (p) => (p == null ? "—" : fmt(p) + "%");
  const color = (p) => (p == null ? "rgba(255,255,255,.3)" : p >= 80 ? "var(--good)" : p >= 65 ? "var(--mid)" : "var(--bad)");
  const colorHex = (p) => (p >= 80 ? "#4cc38a" : p >= 65 ? "#f0c45c" : "#f2766b");
  const DIST_COLORS = ["#f2766b", "#f0a35c", "#f0c45c", "#8fd6a8", "#4cc38a"];
  const DIST_LABELS = ["غير موافق تمامًا", "غير موافق", "إلى حد ما", "موافق", "موافق تمامًا"];
  const ROLE = { doctor: "عضو هيئة تدريس", ta: "هيئة معاونة", unknown: "هيئة معاونة" };

  let SCHEMA = { criteria: [], forms: {} };
  const cache = new Map(); // formId -> {analysis, error}
  let charts = [];
  let current = null; // آخر ملخص برنامج معروض (للمودال)

  /* ---------- Setup ---------- */
  const U = CFG.university;
  $("#uniNameAr").textContent = U.nameAr;
  $("#uniNameEn").textContent = U.nameEn;
  const logo = $("#logo");
  logo.onerror = () => (logo.style.display = "none");
  logo.src = U.logo;

  Chart.defaults.font.family = "Cairo, sans-serif";
  Chart.defaults.color = "rgba(255,255,255,.85)";
  Chart.defaults.borderColor = "rgba(255,255,255,.12)";

  $("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");
  $("#refreshBtn").onclick = () => { cache.clear(); render(); };
  if (CFG.refreshMinutes > 0) setInterval(() => { if (!$("#modal")) { cache.clear(); render(true); } }, CFG.refreshMinutes * 60000);

  const findFac = (id) => CFG.faculties.find((f) => f.id === id);
  const formsOf = (progId) => CFG.forms.filter((f) => f.programs.includes(progId)).sort((a, b) => a.order - b.order);
  const hasSource = (f) => DEMO || !!f.sheetUrl;

  /* ---------- Data ---------- */
  // One request per form at a time: pages ask for the same form several times while rendering.
  function loadForm(form) {
    if (!cache.has(form.formId)) {
      const p = loadFormNow(form).then((entry) => {
        if (entry.error) cache.delete(form.formId); // retry on the next refresh instead of keeping the failure
        return entry;
      });
      cache.set(form.formId, p);
    }
    return cache.get(form.formId);
  }

  async function loadFormNow(form) {
    const schema = SCHEMA.forms[form.formId];
    try {
      if (!schema) return { analysis: null, error: "شكل الفورم مش موجود — شغّل tools/build-schema.js" };
      if (!hasSource(form)) return { analysis: null };
      const { headers, rows } = DEMO ? demoData(form, schema) : await fetchSheet(form.sheetUrl);
      return { analysis: analyzeForm(schema, headers, rows) };
    } catch (e) {
      console.error(form.id, e);
      return { analysis: null, error: e.message || String(e) };
    }
  }

  async function fetchWithRetry(url, tries = 3) {
    for (let i = 1; ; i++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      try {
        const res = await fetch(url + (url.includes("?") ? "&" : "?") + "_=" + Date.now(), { signal: ctrl.signal });
        if (res.status >= 500 && i < tries) throw new Error("server " + res.status);
        return res;
      } catch (e) {
        if (i >= tries) throw e;
        await new Promise((r) => setTimeout(r, 800 * i));
      } finally {
        clearTimeout(timer);
      }
    }
  }

  async function fetchSheet(url, attempt = 1) {
    const u = toCsvUrl(url);
    const NOT_SHARED = "شيت الردود مش متشارك للعامة — لازم يتعمل Share لـ Anyone with the link (Viewer)";
    let res;
    try { res = await fetchWithRetry(u); } catch { throw new Error("تعذر الاتصال بشيت الردود — جرّب ↻ تحديث"); }
    if (res.status === 401 || res.status === 403) throw new Error(NOT_SHARED);
    if (!res.ok) throw new Error("تعذر قراءة الشيت (" + res.status + ")");
    const text = await res.text();
    // The published copy answers "Loading..." while its imported data recalculates.
    if (/^\s*Loading\.*\s*$/i.test(text)) {
      if (attempt >= 4) throw new Error("الشيت بيتحدث دلوقتي — جرّب ↻ تحديث بعد دقيقة");
      await new Promise((r) => setTimeout(r, 3000 * attempt));
      return fetchSheet(url, attempt + 1);
    }
    if (/^\s*<!doctype html|<html/i.test(text)) throw new Error("الشيت مش متاح للعامة — اعمله Share لـ Anyone with the link");
    const data = Papa.parse(text, { skipEmptyLines: true }).data;
    return { headers: data[0] || [], rows: data.slice(1) };
  }

  /** يجمع بيانات مجموعة فورمز (برنامج / كلية / جامعة) */
  async function summarize(forms) {
    const unique = [...new Map(forms.map((f) => [f.formId, f])).values()];
    const entries = await Promise.all(unique.map(async (f) => ({ form: f, ...(await loadForm(f)) })));
    const S = {
      forms: entries, responses: 0, active: 0, lastResponse: null,
      all: emptyStats(), doctor: emptyStats(), ta: emptyStats(),
      staff: new Map(), courses: [], levels: [],
    };
    for (const e of entries) {
      const a = e.analysis;
      if (!a) continue;
      S.responses += a.responses;
      if (a.responses) S.active++;
      const lv = { level: e.form.level, form: e.form, responses: a.responses, doctor: emptyStats(), ta: emptyStats() };
      for (const s of a.sections) {
        const role = s.role === "doctor" ? "doctor" : "ta";
        addStats(S.all, s.stats); addStats(S[role], s.stats); addStats(lv[role], s.stats);
        const k = role + ":" + s.key;
        if (!S.staff.has(k)) S.staff.set(k, { id: k, name: s.name, title: s.title, role, rawRole: s.role, stats: emptyStats(), courses: new Set(), levels: new Set(), comments: [], parts: [] });
        const p = S.staff.get(k);
        addStats(p.stats, s.stats);
        if (s.course) p.courses.add(s.course);
        p.levels.add(e.form.level);
        p.parts.push({ level: e.form.level, course: s.course, stats: s.stats });
        s.comments.forEach((t) => p.comments.push({ text: t, level: e.form.level, course: s.course }));
        if (s.course) S.courses.push({ course: s.course, name: s.name, staffId: k, level: e.form.level, stats: s.stats });
      }
      S.levels.push(lv);
    }
    S.staffList = [...S.staff.values()].filter((p) => p.stats.count).sort((a, b) => pct(b.stats) - pct(a.stats));
    return S;
  }

  /* ---------- Navigation ---------- */
  function buildNav(route) {
    const nav = $("#nav");
    let html = `<button class="nav-item ${route.view === "home" ? "active" : ""}" data-href="#/">🏠 نظرة عامة على الجامعة</button>`;
    for (const f of CFG.faculties) {
      const open = route.fac === f.id;
      html += `<button class="nav-fac ${open ? "open" : ""}" data-toggle="${f.id}">${f.icon} ${esc(f.nameAr)}<span class="chev">◀</span></button>
        <div class="nav-progs ${open ? "open" : ""}" id="progs-${f.id}">
          <button class="nav-item ${route.view === "fac" && open ? "active" : ""}" data-href="#/f/${f.id}">ملخص الكلية</button>
          ${f.programs.map((p) => {
            const forms = formsOf(p.id);
            const st = !forms.length ? "" : forms.some(hasSource) ? "on" : "wait";
            return `<button class="nav-item ${route.prog === p.id ? "active" : ""}" data-href="#/p/${f.id}/${p.id}"><span class="dot ${st}"></span>${esc(p.nameAr)}</button>`;
          }).join("")}
        </div>`;
    }
    nav.innerHTML = html;
    nav.querySelectorAll("[data-href]").forEach((b) => (b.onclick = () => { location.hash = b.dataset.href; $("#sidebar").classList.remove("open"); }));
    nav.querySelectorAll("[data-toggle]").forEach((b) => (b.onclick = () => { b.classList.toggle("open"); $("#progs-" + b.dataset.toggle).classList.toggle("open"); }));
  }

  function parseRoute() {
    const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
    const q = new URLSearchParams(query);
    if (parts[0] === "f" && findFac(parts[1])) return { view: "fac", fac: parts[1] };
    if (parts[0] === "p" && findFac(parts[1]) && findFac(parts[1]).programs.some((p) => p.id === parts[2]))
      return { view: "prog", fac: parts[1], prog: parts[2], tab: parts[3] || "overview", level: q.get("level") || "" };
    return { view: "home" };
  }

  /* ---------- Rendering helpers ---------- */
  async function render(silent) {
    const route = parseRoute();
    if (!silent && $("#modal")) $("#modal .close").click();
    buildNav(route);
    charts.forEach((c) => c.destroy());
    charts = [];
    if (!silent) $("#content").innerHTML = `<div class="glass loader"><div class="spinner"></div>جاري تحميل البيانات…</div>`;
    if (route.view === "home") await renderHome();
    else if (route.view === "fac") await renderFaculty(findFac(route.fac));
    else await renderProgram(findFac(route.fac), route);
    $("#updated").textContent = "آخر تحديث: " + new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  }

  function setTitle(t, sub) {
    $("#pageTitle").innerHTML = t + (DEMO ? `<span class="badge">بيانات تجريبية</span>` : "");
    $("#pageSub").textContent = sub || "";
    document.title = `${t.replace(/<[^>]+>/g, "")} | ${U.nameAr}`;
  }

  const kpi = (label, value, p, hint) => `<div class="kpi glass"><div class="label">${label}</div><div class="value" ${p !== undefined ? `style="color:${color(p)}"` : ""}>${value}</div>
      ${p !== undefined ? `<div class="bar"><span style="width:${p ?? 0}%;background:${color(p)}"></span></div>` : ""}${hint ? `<div class="hint">${hint}</div>` : ""}</div>`;

  function kpiRow(S) {
    const docs = S.staffList.filter((p) => p.role === "doctor").length, tas = S.staffList.length - docs;
    return `<div class="kpis">
      ${kpi("عدد الطلاب المشاركين", fmt(S.responses))}
      ${kpi("الرضا العام", fmtPct(pct(S.all)), pct(S.all))}
      ${kpi("تقييم أعضاء هيئة التدريس", fmtPct(pct(S.doctor)), pct(S.doctor), `${fmt(docs)} عضو`)}
      ${kpi("تقييم الهيئة المعاونة", fmtPct(pct(S.ta)), pct(S.ta), `${fmt(tas)} عضو`)}
    </div>`;
  }

  const scoreBar = (p) => `<div class="score-bar"><span class="num" style="color:${color(p)}">${fmtPct(p)}</span><div class="track"><div class="fill" style="width:${p ?? 0}%;background:${color(p)}"></div></div></div>`;
  const distBar = (dist) => { const t = dist.reduce((a, b) => a + b, 0) || 1; return `<div class="stack" title="${DIST_LABELS.map((l, i) => `${l}: ${Math.round((dist[i] / t) * 100)}%`).join(" • ")}">${dist.map((v, i) => `<span style="width:${(v / t) * 100}%;background:${DIST_COLORS[i]}"></span>`).join("")}</div>`; };
  const legend = () => `<div class="legend">${DIST_LABELS.map((l, i) => `<span><i style="background:${DIST_COLORS[i]}"></i>${l}</span>`).join("")}</div>`;

  function emptyState(title, msg, icon = "📭") {
    return `<div class="glass empty"><div class="big">${icon}</div><h3>${title}</h3>${msg ? `<p>${msg}</p>` : ""}</div>`;
  }

  /* ---------- Home ---------- */
  async function renderHome() {
    setTitle("نظرة عامة على الجامعة", U.surveyTitle);
    const all = await summarize(CFG.forms);
    const facs = await Promise.all(CFG.faculties.map(async (f) => ({ f, S: await summarize(f.programs.flatMap((p) => formsOf(p.id))) })));
    const withData = facs.filter((x) => x.S.all.count);

    $("#content").innerHTML = `<div class="grid">
      ${kpiRow(all)}
      <div class="fac-cards">${facs.map(({ f, S }) => {
        const nForms = new Set(f.programs.flatMap((p) => formsOf(p.id)).map((x) => x.formId)).size;
        return `<div class="fac-card glass" data-href="#/f/${f.id}">
          <div class="icon">${f.icon}</div><h3>${esc(f.nameAr)}</h3>
          <div class="progs">${f.programs.map((p) => esc(p.nameAr)).join(" • ")}</div>
          ${S.all.count ? `<div class="stats"><div><b>${fmt(S.responses)}</b><small>طالب</small></div>
            <div><b style="color:${color(pct(S.all))}">${fmtPct(pct(S.all))}</b><small>الرضا العام</small></div>
            <div><b>${fmt(S.staffList.length)}</b><small>عضو مُقيَّم</small></div></div>`
          : `<div class="stats"><small>${nForms ? `⏳ ${fmt(nForms)} استبيان في انتظار الردود` : "لا توجد استبيانات بعد"}</small></div>`}
        </div>`; }).join("")}</div>
      ${withData.length ? `<div class="grid grid-2">
        <div class="card glass"><h3>مقارنة الكليات</h3><div class="sub">متوسط التقييم (%)</div><div class="chart-box" style="height:320px"><canvas id="cmp"></canvas></div></div>
        <div class="card glass"><h3>بنود التقييم على مستوى الجامعة</h3><div class="sub">أقوى وأضعف البنود</div>${criteriaMini(all)}</div>
      </div>` : ""}
    </div>`;
    bindHrefs();
    if (withData.length) compareChart("cmp", withData.map((x) => x.f.nameAr), withData.map((x) => x.S));
  }

  /* ---------- Faculty ---------- */
  async function renderFaculty(f) {
    setTitle(`${f.icon} ${esc(f.nameAr)}`, f.nameEn);
    const S = await summarize(f.programs.flatMap((p) => formsOf(p.id)));
    const progs = await Promise.all(f.programs.map(async (p) => ({ p, forms: formsOf(p.id), S: await summarize(formsOf(p.id)) })));
    const withData = progs.filter((x) => x.S.all.count);
    $("#content").innerHTML = `<div class="grid">
      ${kpiRow(S)}
      <div class="fac-cards">${progs.map(({ p, forms, S: ps }) => `
        <div class="fac-card glass" data-href="#/p/${f.id}/${p.id}">
          <h3>${esc(p.nameAr)}</h3><div class="progs">${esc(p.nameEn)}${forms.length ? " • " + forms.map((x) => esc(x.level)).join("، ") : ""}</div>
          ${ps.all.count ? `<div class="stats"><div><b>${fmt(ps.responses)}</b><small>طالب</small></div>
            <div><b style="color:${color(pct(ps.all))}">${fmtPct(pct(ps.all))}</b><small>الرضا العام</small></div>
            <div><b>${fmt(ps.staffList.length)}</b><small>عضو مُقيَّم</small></div></div>`
          : `<div class="stats"><small>${forms.length ? "⏳ في انتظار ردود الطلاب" : "لا يوجد استبيان لهذا البرنامج بعد"}</small></div>`}
        </div>`).join("")}</div>
      ${withData.length ? `<div class="grid grid-2">
        <div class="card glass"><h3>مقارنة البرامج</h3><div class="sub">متوسط التقييم (%)</div><div class="chart-box" style="height:300px"><canvas id="cmp"></canvas></div></div>
        <div class="card glass"><h3>الأعلى تقييمًا في الكلية</h3><div class="sub">أفضل ٥ أعضاء</div>${staffTable(S.staffList.slice(0, 5), { compact: true })}</div>
      </div>` : ""}
    </div>`;
    bindHrefs();
    current = S;
    if (withData.length) compareChart("cmp", withData.map((x) => x.p.nameAr), withData.map((x) => x.S));
  }

  /* ---------- Program ---------- */
  async function renderProgram(f, route) {
    const p = f.programs.find((x) => x.id === route.prog);
    setTitle(esc(p.nameAr), `${f.nameAr} • ${p.nameEn}`);
    const allForms = formsOf(p.id);
    if (!allForms.length) return ($("#content").innerHTML = emptyState("لا يوجد استبيان لهذا البرنامج بعد", "أول ما توصل لينكات الفورم هتتضاف هنا.", "🗂️"));
    if (!allForms.some(hasSource)) return ($("#content").innerHTML = levelsWaiting(allForms));

    const forms = route.level ? allForms.filter((x) => x.id === route.level) : allForms;
    const S = await summarize(forms);
    current = S;
    const base = `#/p/${f.id}/${p.id}`;
    const q = route.level ? `?level=${route.level}` : "";
    const errors = S.forms.filter((e) => e.error);

    const hasCourses = S.courses.length > 0;
    const commentsCount = S.staffList.reduce((n, x) => n + x.comments.length, 0);
    const hasTas = !S.all.count || S.staffList.some((x) => x.role === "ta");
    const tabs = [["overview", "نظرة عامة"], ["doctors", "أعضاء هيئة التدريس"], ...(hasTas ? [["tas", "الهيئة المعاونة"]] : []), ...(hasCourses ? [["courses", "المقررات"]] : []), ["criteria", "بنود التقييم"], ["comments", `آراء الطلاب${commentsCount ? `<span class="count">${fmt(commentsCount)}</span>` : ""}`]];
    const tab = tabs.some(([k]) => k === route.tab) ? route.tab : "overview";

    let body;
    if (!S.all.count) body = emptyState("لسه مفيش ردود", errors.length ? errors.map((e) => `⚠️ ${esc(e.form.level)}: ${esc(e.error)}`).join("<br>") : "أول ما الطلاب يبدأوا يجاوبوا، الإحصائيات هتظهر هنا.", errors.length ? "⚠️" : "📭");
    else if (tab === "overview") body = overviewTab(S);
    else if (tab === "doctors") body = staffTab(S, "doctor");
    else if (tab === "tas") body = staffTab(S, "ta");
    else if (tab === "courses") body = coursesTab(S);
    else if (tab === "criteria") body = criteriaTab(S);
    else body = commentsTab(S);

    $("#content").innerHTML = `<div class="grid">
      <div class="levels glass">
        <span class="lbl">المستوى:</span>
        <button class="chip ${!route.level ? "active" : ""}" data-href="${base}/${tab}">كل المستويات</button>
        ${allForms.map((x) => `<button class="chip ${route.level === x.id ? "active" : ""}" data-href="${base}/${tab}?level=${x.id}"><span class="dot ${hasSource(x) ? "on" : "wait"}"></span>${esc(x.level)}${x.programs.length > 1 ? ` <small>(مشترك)</small>` : ""}</button>`).join("")}
      </div>
      ${kpiRow(S)}
      ${errors.length && S.all.count ? `<div class="glass warn">⚠️ ${errors.map((e) => `${esc(e.form.level)}: ${esc(e.error)}`).join(" • ")}</div>` : ""}
      <div class="tabs glass">${tabs.map(([k, l]) => `<button class="tab ${tab === k ? "active" : ""}" data-href="${base}/${k}${q}">${l}</button>`).join("")}</div>
      ${body}
    </div>`;
    bindHrefs();
    bindStaff();
    if (!S.all.count) return;
    if (tab === "overview") drawOverview(S);
    if (tab === "criteria") drawCriteria("critChart", S.all);
    if (tab === "comments") bindCommentSearch();
    if (tab === "doctors" || tab === "tas") bindStaffSearch();
  }

  function levelsWaiting(forms) {
    return `<div class="grid">${emptyState("في انتظار ردود الطلاب", "الاستبيانات جاهزة ومربوطة. أول ما شيت الردود يتضاف الإحصائيات هتظهر هنا.", "⏳")}
      <div class="card glass"><h3>الاستبيانات</h3><div class="sub">${fmt(forms.length)} استبيان</div>
      <table class="mtable"><thead><tr><th>المستوى</th><th>عدد الأعضاء المُقيَّمين</th><th>الفورم</th></tr></thead><tbody>
      ${forms.map((x) => { const sc = SCHEMA.forms[x.formId]; return `<tr><td>${esc(x.level)}</td><td class="num">${sc ? fmt(sc.sections.length) : "—"}</td>
        <td><a class="link" target="_blank" rel="noopener" href="https://docs.google.com/forms/d/${x.formId}/viewform">فتح الفورم ↗</a></td></tr>`; }).join("")}
      </tbody></table></div></div>`;
  }

  function overviewTab(S) {
    const top = S.staffList.slice(0, 5), bottom = S.staffList.length > 5 ? S.staffList.slice(-5).reverse() : [];
    return `<div class="grid grid-2">
      <div class="card glass"><h3>التقييم حسب المستوى</h3><div class="sub">أعضاء هيئة التدريس مقابل الهيئة المعاونة (%)</div><div class="chart-box" style="height:290px"><canvas id="ovLevels"></canvas></div></div>
      <div class="card glass"><h3>توزيع كل الإجابات</h3><div class="sub">${fmt(S.all.count)} إجابة</div><div class="chart-box" style="height:290px"><canvas id="ovDist"></canvas></div></div>
    </div>
    <div class="grid grid-2">
      <div class="card glass"><h3>🏆 الأعلى تقييمًا</h3><div class="sub">أفضل ٥ أعضاء</div>${staffTable(top, { compact: true })}</div>
      ${bottom.length ? `<div class="card glass"><h3>📉 يحتاج متابعة</h3><div class="sub">أقل ٥ أعضاء تقييمًا</div>${staffTable(bottom, { compact: true })}</div>`
        : `<div class="card glass"><h3>بنود التقييم</h3><div class="sub">أقوى وأضعف البنود</div>${criteriaMini(S)}</div>`}
    </div>
    ${bottom.length ? `<div class="card glass"><h3>بنود التقييم</h3><div class="sub">أقوى وأضعف البنود</div>${criteriaMini(S)}</div>` : ""}`;
  }

  function drawOverview(S) {
    const lv = S.levels.filter((l) => l.doctor.count || l.ta.count);
    charts.push(new Chart($("#ovLevels"), {
      type: "bar",
      data: { labels: lv.map((l) => l.level), datasets: [
        { label: "هيئة التدريس", data: lv.map((l) => round(pct(l.doctor))), backgroundColor: "#6cb4ee", borderRadius: 8, maxBarThickness: 34 },
        { label: "الهيئة المعاونة", data: lv.map((l) => round(pct(l.ta))), backgroundColor: "#c49bff", borderRadius: 8, maxBarThickness: 34 },
      ] },
      options: { maintainAspectRatio: false, plugins: { legend: { position: "top", rtl: true }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw}%` } } }, scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + "%" } }, x: { grid: { display: false } } } },
    }));
    charts.push(new Chart($("#ovDist"), {
      type: "doughnut",
      data: { labels: DIST_LABELS, datasets: [{ data: [...S.all.dist], backgroundColor: DIST_COLORS, borderColor: "rgba(10,16,24,.6)", borderWidth: 2 }] },
      options: { maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "left", rtl: true } } },
    }));
  }

  function staffTable(list, { compact } = {}) {
    if (!list.length) return `<p class="muted">لا يوجد.</p>`;
    return `<table class="mtable"><thead><tr><th>#</th><th>الاسم</th>${compact ? "" : "<th>المقررات / المستويات</th>"}<th>التقييم</th>${compact ? "" : "<th>توزيع الإجابات</th>"}<th>طلاب</th></tr></thead><tbody>
      ${list.map((x, i) => `<tr class="clickable" data-staff="${esc(x.id)}">
        <td class="rank">${fmt(i + 1)}</td>
        <td><div class="pname">${esc(x.name)}</div><div class="prole">${ROLE[x.rawRole]}${compact ? "" : ""}</div></td>
        ${compact ? "" : `<td class="muted small">${esc([...x.courses].join("، ") || [...x.levels].join("، "))}</td>`}
        <td>${scoreBar(pct(x.stats))}</td>
        ${compact ? "" : `<td>${distBar(x.stats.dist)}</td>`}
        <td class="num">${fmt(Math.max(...x.parts.map((pt) => pt.stats.respondents)))}</td></tr>`).join("")}
    </tbody></table>`;
  }

  function staffTab(S, role) {
    const list = S.staffList.filter((x) => x.role === role);
    if (!list.length) return emptyState(role === "doctor" ? "مفيش أعضاء هيئة تدريس في الاستبيان ده" : "مفيش هيئة معاونة في الاستبيان ده", "", "🔍");
    return `<div class="card glass">
      <div class="card-head"><div><h3>${role === "doctor" ? "أعضاء هيئة التدريس" : "الهيئة المعاونة"}</h3><div class="sub">${fmt(list.length)} عضو • متوسط ${fmtPct(pct(S[role]))} • اضغط على أي اسم للتفاصيل</div></div>
        <input class="search" id="staffSearch" placeholder="🔎 بحث بالاسم أو المقرر…" /></div>
      ${legend()}
      <div id="staffTable">${staffTable(list)}</div></div>`;
  }

  function bindStaffSearch() {
    const input = $("#staffSearch");
    if (!input) return;
    input.oninput = () => {
      const t = input.value.trim();
      document.querySelectorAll("#staffTable tbody tr").forEach((tr) => (tr.style.display = !t || tr.textContent.includes(t) ? "" : "none"));
    };
  }

  function coursesTab(S) {
    const list = [...S.courses].sort((a, b) => pct(b.stats) - pct(a.stats));
    return `<div class="card glass"><h3>المقررات</h3><div class="sub">${fmt(list.length)} مقرر • مرتبة حسب التقييم</div>${legend()}
      <table class="mtable"><thead><tr><th>#</th><th>المقرر</th><th>عضو هيئة التدريس</th><th>المستوى</th><th>التقييم</th><th>توزيع الإجابات</th><th>طلاب</th></tr></thead><tbody>
      ${list.map((c, i) => `<tr class="clickable" data-staff="${esc(c.staffId)}"><td class="rank">${fmt(i + 1)}</td><td><b>${esc(c.course)}</b></td><td>${esc(c.name)}</td><td class="muted small">${esc(c.level)}</td>
        <td>${scoreBar(pct(c.stats))}</td><td>${distBar(c.stats.dist)}</td><td class="num">${fmt(c.stats.respondents)}</td></tr>`).join("")}
      </tbody></table></div>`;
  }

  function critList(st) {
    return SCHEMA.criteria.map((label, i) => ({ label, i, p: st.crit[i] ? (st.crit[i].sum / st.crit[i].count / 5) * 100 : null, n: st.crit[i]?.count || 0 })).filter((c) => c.p != null);
  }

  function criteriaMini(S) {
    const list = critList(S.all).sort((a, b) => b.p - a.p);
    if (!list.length) return "";
    const pick = list.length > 6 ? [...list.slice(0, 3), null, ...list.slice(-3)] : list;
    return `<table class="mtable"><tbody>${pick.map((c) => c ? `<tr><td>${esc(c.label)}</td><td style="width:45%">${scoreBar(c.p)}</td></tr>` : `<tr><td colspan="2" class="sep">⋯</td></tr>`).join("")}</tbody></table>`;
  }

  function criteriaTab(S) {
    const list = critList(S.all);
    return `<div class="card glass"><h3>متوسط كل بند من بنود التقييم</h3><div class="sub">على مستوى كل أعضاء هيئة التدريس والهيئة المعاونة المختارين</div>
      <div class="chart-box" style="height:${Math.max(300, list.length * 34)}px"><canvas id="critChart"></canvas></div></div>`;
  }

  function drawCriteria(id, st) {
    const list = critList(st);
    charts.push(new Chart(document.getElementById(id), {
      type: "bar",
      data: { labels: list.map((c) => c.label), datasets: [{ data: list.map((c) => round(c.p)), backgroundColor: list.map((c) => colorHex(c.p)), borderRadius: 8, maxBarThickness: 22 }] },
      options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.raw + "%" } } }, scales: { x: { min: 0, max: 100, ticks: { callback: (v) => v + "%" } }, y: { position: "right", grid: { display: false } } } },
    }));
  }

  function commentsTab(S) {
    const people = S.staffList.filter((x) => x.comments.length).sort((a, b) => b.comments.length - a.comments.length);
    if (!people.length) return emptyState("مفيش ملاحظات مكتوبة من الطلاب", "", "💬");
    return `<div class="card glass"><div class="card-head"><div><h3>ملاحظات ومقترحات الطلاب</h3><div class="sub">${fmt(people.reduce((n, x) => n + x.comments.length, 0))} ملاحظة</div></div>
      <input class="search" id="commentSearch" placeholder="🔎 بحث في الملاحظات أو الأسماء…" /></div></div>
      <div class="grid grid-2" id="commentGrid">${people.map((x) => `<div class="card glass comment-card">
        <div class="card-head"><div><h3 class="clickable" data-staff="${esc(x.id)}">${esc(x.name)}</h3><div class="sub">${ROLE[x.rawRole]} • ${fmt(x.comments.length)} ملاحظة • تقييم ${fmtPct(pct(x.stats))}</div></div></div>
        <div class="comments">${x.comments.map((c) => `<div class="comment">${esc(c.text)}<small>${esc(c.course || c.level)}</small></div>`).join("")}</div></div>`).join("")}</div>`;
  }

  function bindCommentSearch() {
    const input = $("#commentSearch");
    input.oninput = () => {
      const t = input.value.trim();
      document.querySelectorAll(".comment-card").forEach((card) => {
        const nameHit = card.querySelector("h3").textContent.includes(t);
        let any = false;
        card.querySelectorAll(".comment").forEach((c) => { const hit = !t || nameHit || c.textContent.includes(t); c.style.display = hit ? "" : "none"; any ||= hit; });
        card.style.display = any ? "" : "none";
      });
    };
  }

  /* ---------- Staff modal ---------- */
  function bindStaff() {
    document.querySelectorAll("[data-staff]").forEach((el) => (el.onclick = () => openStaff(el.dataset.staff)));
  }

  function openStaff(id) {
    const x = current && current.staff.get(id);
    if (!x) return;
    const p = pct(x.stats);
    const list = critList(x.stats);
    const best = [...list].sort((a, b) => b.p - a.p);
    const div = document.createElement("div");
    div.id = "modal";
    div.className = "modal-wrap";
    div.innerHTML = `<div class="modal glass" role="dialog" aria-modal="true">
      <button class="close" aria-label="إغلاق">✕</button>
      <div class="modal-head"><div class="avatar">${esc(x.name.trim()[0] || "؟")}</div>
        <div><h2>${esc(x.title)}</h2><div class="sub">${ROLE[x.rawRole]} • ${esc([...x.levels].join("، "))}${x.courses.size ? " • " + esc([...x.courses].join("، ")) : ""}</div></div></div>
      <div class="kpis">
        ${kpi("التقييم العام", fmtPct(p), p)}
        ${kpi("عدد الطلاب", fmt(Math.max(...x.parts.map((pt) => pt.stats.respondents))))}
        ${kpi("أقوى بند", `<span class="vtext">${esc(best[0]?.label || "—")} <em>${fmtPct(best[0]?.p)}</em></span>`)}
        ${kpi("أضعف بند", `<span class="vtext">${esc(best[best.length - 1]?.label || "—")} <em>${fmtPct(best[best.length - 1]?.p)}</em></span>`)}
      </div>
      ${x.parts.length > 1 ? `<div class="card glass"><h3>حسب المقرر / المستوى</h3><table class="mtable"><tbody>${x.parts.map((pt) => `<tr><td>${esc(pt.course || pt.level)}</td><td class="muted small">${esc(pt.course ? pt.level : "")}</td><td style="width:40%">${scoreBar(pct(pt.stats))}</td><td class="num">${fmt(pt.stats.respondents)} طالب</td></tr>`).join("")}</tbody></table></div>` : ""}
      <div class="grid grid-2">
        <div class="card glass"><h3>بنود التقييم</h3><div class="chart-box" style="height:${Math.max(280, list.length * 30)}px"><canvas id="mCrit"></canvas></div></div>
        <div class="card glass"><h3>توزيع الإجابات</h3><div class="chart-box" style="height:260px"><canvas id="mDist"></canvas></div>
          <h3 style="margin-top:18px">ملاحظات الطلاب <span class="count">${fmt(x.comments.length)}</span></h3>
          <div class="comments">${x.comments.length ? x.comments.map((c) => `<div class="comment">${esc(c.text)}${x.parts.length > 1 ? `<small>${esc(c.course || c.level)}</small>` : ""}</div>`).join("") : `<p class="muted">لا توجد ملاحظات.</p>`}</div></div>
      </div></div>`;
    document.body.appendChild(div);
    document.body.style.overflow = "hidden";
    const mCharts = [];
    const close = () => { mCharts.forEach((c) => c.destroy()); div.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    div.onclick = (e) => e.target === div && close();
    div.querySelector(".close").onclick = close;
    mCharts.push(new Chart($("#mCrit"), {
      type: "bar",
      data: { labels: list.map((c) => c.label), datasets: [{ data: list.map((c) => round(c.p)), backgroundColor: list.map((c) => colorHex(c.p)), borderRadius: 6, maxBarThickness: 18 }] },
      options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.raw + "%" } } }, scales: { x: { min: 0, max: 100, ticks: { callback: (v) => v + "%" } }, y: { position: "right", grid: { display: false }, ticks: { font: { size: 11 } } } } },
    }));
    mCharts.push(new Chart($("#mDist"), {
      type: "doughnut",
      data: { labels: DIST_LABELS, datasets: [{ data: [...x.stats.dist], backgroundColor: DIST_COLORS, borderColor: "rgba(10,16,24,.6)", borderWidth: 2 }] },
      options: { maintainAspectRatio: false, cutout: "60%", plugins: { legend: { position: "left", rtl: true } } },
    }));
  }

  /* ---------- Shared ---------- */
  const round = (v) => (v == null ? null : Math.round(v * 10) / 10);

  function bindHrefs() {
    document.querySelectorAll("#content [data-href]").forEach((c) => (c.onclick = () => (location.hash = c.dataset.href)));
  }

  function compareChart(id, labels, list) {
    const series = [["all", "الرضا العام", "#3fb59a"], ["doctor", "هيئة التدريس", "#6cb4ee"], ["ta", "الهيئة المعاونة", "#c49bff"]];
    charts.push(new Chart(document.getElementById(id), {
      type: "bar",
      data: { labels, datasets: series.map(([k, l, c]) => ({ label: l, data: list.map((S) => round(pct(S[k]))), backgroundColor: c, borderRadius: 6, maxBarThickness: 30 })) },
      options: { maintainAspectRatio: false, plugins: { legend: { position: "top", rtl: true }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw}%` } } }, scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + "%" } }, x: { grid: { display: false } } } },
    }));
  }

  /* ---------- Demo data (?demo) ---------- */
  function demoData(form, schema) {
    let seed = [...form.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 233280;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const words = ["غير موافق تماما", "غير موافق", "الى حد ما", "موافق", "موافق تماما"];
    const notes = ["الشرح ممتاز وواضح جدًا", "محتاجين أمثلة عملية أكتر", "ياريت الالتزام بمواعيد المحاضرات", "شكرًا على المجهود", "الامتحانات أصعب من الشرح", "أسلوب ممتاز في التعامل مع الطلاب", "محتاجين ساعات مكتبية أكتر"];
    const headers = ["Timestamp"];
    const kinds = [];
    schema.sections.forEach((s) => {
      const bias = 2.4 + rnd() * 1.9;
      s.grids.forEach((g) => g.rows.forEach((r) => { headers.push(`${g.title} [${r.text}]`); kinds.push({ bias: bias + (rnd() - 0.5) * 0.6 }); }));
      s.comments.forEach((c) => { headers.push(c.title); kinds.push({ note: true }); });
    });
    const n = 25 + Math.floor(rnd() * 90);
    const rows = Array.from({ length: n }, (_, i) => ["2026/11/" + (10 + (i % 6)), ...kinds.map((k) => k.note ? (rnd() > 0.9 ? notes[Math.floor(rnd() * notes.length)] : "") : words[Math.min(4, Math.max(0, Math.round(k.bias + (rnd() - 0.5) * 2.2)))])]);
    return { headers, rows };
  }

  /* ---------- Start ---------- */
  fetch("data/forms.json?_=" + Date.now())
    .then((r) => r.json())
    .then((s) => (SCHEMA = s))
    .catch((e) => console.error("forms.json", e))
    .finally(() => {
      window.addEventListener("hashchange", () => render());
      render();
    });
})();

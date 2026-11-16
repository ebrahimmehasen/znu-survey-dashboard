(function () {
  const CFG = window.DASHBOARD_CONFIG;
  const { analyze, toCsvUrl } = window.SurveyAnalyzer;
  const DEMO = new URLSearchParams(location.search).has("demo");
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, d = 0) => (n == null || isNaN(n) ? "—" : Number(n).toLocaleString("ar-EG", { maximumFractionDigits: d, minimumFractionDigits: d }));
  const color = (pct) => (pct == null ? "rgba(255,255,255,.3)" : pct >= 75 ? "var(--good)" : pct >= 55 ? "var(--mid)" : "var(--bad)");
  const colorHex = (pct) => (pct >= 75 ? "#3ddc97" : pct >= 55 ? "#f5c542" : "#ff6b6b");
  const DIST_COLORS = ["#ff6b6b", "#ff9f5a", "#f5c542", "#7fd6a8", "#3ddc97"];
  const CAT_LABELS = { doctors: "الدكاترة", tas: "المعيدين", courses: "المواد", general: "أسئلة عامة" };

  const cache = new Map(); // programId -> {analysis, error}
  let charts = [];

  /* ---------- Setup ---------- */
  const U = CFG.university;
  $("#uniNameAr").textContent = U.nameAr;
  $("#uniNameEn").textContent = U.nameEn;
  const logo = $("#logo");
  logo.src = U.logo;
  logo.onerror = () => (logo.style.display = "none");
  const bgImg = new Image();
  bgImg.onload = () => ($("#bg").style.backgroundImage = `url('${U.background}')`);
  bgImg.src = U.background;

  Chart.defaults.font.family = "Cairo, sans-serif";
  Chart.defaults.color = "rgba(255,255,255,.85)";
  Chart.defaults.borderColor = "rgba(255,255,255,.12)";

  $("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");
  $("#refreshBtn").onclick = () => { cache.clear(); render(); };
  if (CFG.refreshMinutes > 0) setInterval(() => { cache.clear(); render(true); }, CFG.refreshMinutes * 60000);

  const findFac = (id) => CFG.faculties.find((f) => f.id === id);
  const hasSource = (p) => DEMO || !!p.sheetUrl;

  /* ---------- Data ---------- */
  async function load(program) {
    if (cache.has(program.id)) return cache.get(program.id);
    let entry;
    try {
      if (!hasSource(program)) entry = { analysis: null };
      else {
        const { rows, headers } = DEMO && !program.sheetUrl ? demoData(program) : await fetchSheet(program.sheetUrl);
        entry = { analysis: analyze(rows, headers) };
      }
    } catch (e) {
      console.error(program.id, e);
      entry = { analysis: null, error: e.message || String(e) };
    }
    cache.set(program.id, entry);
    return entry;
  }

  async function fetchSheet(url) {
    const res = await fetch(toCsvUrl(url) + (url.includes("?") ? "&" : "?") + "_=" + Date.now());
    if (!res.ok) throw new Error("تعذر قراءة الشيت (" + res.status + ") — تأكد إن الشيت متشارك أو منشور");
    const text = await res.text();
    if (/^\s*<!doctype html|<html/i.test(text)) throw new Error("الشيت مش متاح للعامة — اعمله Share لـ Anyone with the link");
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    return { rows: parsed.data, headers: parsed.meta.fields || [] };
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
          ${f.programs.map((p) => `<button class="nav-item ${route.prog === p.id ? "active" : ""}" data-href="#/p/${f.id}/${p.id}"><span class="dot ${hasSource(p) ? "on" : ""}"></span>${esc(p.nameAr)}</button>`).join("")}
        </div>`;
    }
    nav.innerHTML = html;
    nav.querySelectorAll("[data-href]").forEach((b) => (b.onclick = () => { location.hash = b.dataset.href; $("#sidebar").classList.remove("open"); }));
    nav.querySelectorAll("[data-toggle]").forEach((b) => (b.onclick = () => { b.classList.toggle("open"); $("#progs-" + b.dataset.toggle).classList.toggle("open"); }));
  }

  function parseRoute() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (parts[0] === "f" && findFac(parts[1])) return { view: "fac", fac: parts[1] };
    if (parts[0] === "p" && findFac(parts[1])) {
      const fac = findFac(parts[1]);
      if (fac.programs.some((p) => p.id === parts[2])) return { view: "prog", fac: parts[1], prog: parts[2], tab: parts[3] || "overview" };
    }
    return { view: "home" };
  }

  /* ---------- Rendering ---------- */
  async function render(silent) {
    const route = parseRoute();
    buildNav(route);
    charts.forEach((c) => c.destroy());
    charts = [];
    if (!silent) $("#content").innerHTML = `<div class="glass loader">جاري تحميل البيانات…</div>`;
    if (route.view === "home") await renderHome();
    else if (route.view === "fac") await renderFaculty(findFac(route.fac));
    else await renderProgram(findFac(route.fac), route.prog, route.tab);
    $("#updated").textContent = "آخر تحديث: " + new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  }

  function setTitle(t, sub) {
    $("#pageTitle").innerHTML = t + (DEMO ? `<span class="badge">بيانات تجريبية</span>` : "");
    $("#pageSub").textContent = sub || "";
    document.title = `${t.replace(/<[^>]+>/g, "")} | ${U.nameAr}`;
  }

  function kpi(label, value, pct, suffix = "") {
    return `<div class="kpi glass"><div class="label">${label}</div><div class="value">${value}${suffix}</div>
      ${pct !== undefined ? `<div class="bar"><span style="width:${pct ?? 0}%;background:${color(pct)}"></span></div>` : ""}</div>`;
  }

  function aggregate(analyses) {
    const valid = analyses.filter(Boolean);
    const avgOf = (key) => {
      const vals = valid.map((a) => (key ? a.summary[key] : a.overall)).filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    return {
      responses: valid.reduce((a, b) => a + b.responses, 0),
      overall: avgOf(), doctors: avgOf("doctors"), tas: avgOf("tas"), courses: avgOf("courses"),
      active: valid.filter((a) => a.responses > 0).length,
    };
  }

  function kpiRow(s) {
    return `<div class="kpis">
      ${kpi("عدد الردود", fmt(s.responses))}
      ${kpi("الرضا العام", fmt(s.overall), s.overall, "%")}
      ${kpi("تقييم الدكاترة", fmt(s.doctors), s.doctors, "%")}
      ${kpi("تقييم المعيدين", fmt(s.tas), s.tas, "%")}
      ${kpi("تقييم المواد", fmt(s.courses), s.courses, "%")}
    </div>`;
  }

  function emptyState(msg, icon = "📭") {
    return `<div class="glass empty"><div class="big">${icon}</div><h3>${msg}</h3>
      <p>أول ما لينك شيت الردود يتضاف في <code>assets/js/config.js</code> الإحصائيات هتظهر هنا تلقائيًا.</p></div>`;
  }

  async function renderHome() {
    setTitle("نظرة عامة على الجامعة", CFG.university.surveyTitle);
    const facData = await Promise.all(CFG.faculties.map(async (f) => {
      const entries = await Promise.all(f.programs.map(load));
      return { f, s: aggregate(entries.map((e) => e.analysis)) };
    }));
    const total = aggregate(facData.flatMap((d) => [d.s]).map((s) => ({ ...s, summary: s })));
    total.responses = facData.reduce((a, d) => a + d.s.responses, 0);

    $("#content").innerHTML = `<div class="grid">
      ${kpiRow(total)}
      <div class="fac-cards">${facData.map(({ f, s }) => `
        <div class="fac-card glass" data-href="#/f/${f.id}">
          <div class="icon">${f.icon}</div><h3>${esc(f.nameAr)}</h3>
          <div class="progs">${f.programs.map((p) => esc(p.nameAr)).join(" • ")}</div>
          <div class="stats"><div><b>${fmt(s.responses)}</b><small>رد</small></div>
            <div><b style="color:${color(s.overall)}">${fmt(s.overall)}${s.overall != null ? "%" : ""}</b><small>الرضا العام</small></div></div>
        </div>`).join("")}</div>
      <div class="card glass"><h3>مقارنة الكليات</h3><div class="sub">متوسط التقييم (%) لكل محور</div>
        <div class="chart-box" style="height:340px"><canvas id="cmp"></canvas></div></div>
    </div>`;
    document.querySelectorAll(".fac-card").forEach((c) => (c.onclick = () => (location.hash = c.dataset.href)));
    compareChart("cmp", facData.map((d) => d.f.nameAr), facData.map((d) => d.s));
  }

  async function renderFaculty(f) {
    setTitle(`${f.icon} ${esc(f.nameAr)}`, f.nameEn);
    const entries = await Promise.all(f.programs.map(load));
    const s = aggregate(entries.map((e) => e.analysis));
    const rows = f.programs.map((p, i) => ({ p, a: entries[i].analysis, err: entries[i].error }));
    $("#content").innerHTML = `<div class="grid">
      ${kpiRow(s)}
      <div class="fac-cards">${rows.map(({ p, a, err }) => `
        <div class="fac-card glass" data-href="#/p/${f.id}/${p.id}">
          <h3>${esc(p.nameAr)}</h3><div class="progs">${esc(p.nameEn)}</div>
          ${a ? `<div class="stats"><div><b>${fmt(a.responses)}</b><small>رد</small></div>
            <div><b style="color:${color(a.overall)}">${fmt(a.overall)}${a.overall != null ? "%" : ""}</b><small>الرضا العام</small></div></div>`
          : `<p class="progs">${err ? "⚠️ " + esc(err) : "⏳ في انتظار بيانات الفورم"}</p>`}
        </div>`).join("")}</div>
      ${s.active ? `<div class="card glass"><h3>مقارنة البرامج</h3><div class="sub">متوسط التقييم (%) لكل محور</div>
        <div class="chart-box" style="height:320px"><canvas id="cmp"></canvas></div></div>` : ""}
    </div>`;
    document.querySelectorAll(".fac-card").forEach((c) => (c.onclick = () => (location.hash = c.dataset.href)));
    if (s.active) compareChart("cmp", rows.map((r) => r.p.nameAr), rows.map((r) => r.a ? { ...r.a.summary, overall: r.a.overall } : {}));
  }

  async function renderProgram(f, progId, tab) {
    const p = f.programs.find((x) => x.id === progId);
    setTitle(esc(p.nameAr), `${f.nameAr} • ${p.nameEn}`);
    const { analysis: a, error } = await load(p);
    if (error) return ($("#content").innerHTML = emptyState("مش قادر أقرا البيانات: " + esc(error), "⚠️"));
    if (!a) return ($("#content").innerHTML = emptyState("لسه مفيش فورم مربوط بالبرنامج ده", "⏳"));
    if (!a.responses) return ($("#content").innerHTML = emptyState("الفورم مربوط بس لسه مفيش ردود", "📭"));

    const tabs = [["overview", "نظرة عامة"], ["doctors", "الدكاترة"], ["tas", "المعيدين"], ["courses", "المواد"], ["general", "أسئلة عامة"], ["comments", "آراء الطلاب"]];
    const counts = { doctors: a.categories.doctors.length, tas: a.categories.tas.length, courses: a.categories.courses.length, general: a.categories.general.length + a.choices.length, comments: a.texts.reduce((n, t) => n + t.answers.length, 0) };
    const base = `#/p/${f.id}/${p.id}`;

    let body = "";
    if (tab === "overview") body = overviewTab(a);
    else if (tab === "comments") body = commentsTab(a);
    else if (tab === "general") body = categoryTab(a, "general") + choicesBlock(a.choices);
    else body = categoryTab(a, tab);

    $("#content").innerHTML = `<div class="grid">
      ${kpiRow({ responses: a.responses, overall: a.overall, ...a.summary })}
      <div class="tabs glass">${tabs.map(([k, l]) => `<button class="tab ${tab === k ? "active" : ""}" data-href="${base}/${k}">${l}${counts[k] ? `<span class="count">${fmt(counts[k])}</span>` : ""}</button>`).join("")}</div>
      ${body}
    </div>`;
    document.querySelectorAll(".tab").forEach((b) => (b.onclick = () => (location.hash = b.dataset.href)));
    if (tab === "overview") drawOverview(a);
    else if (tab === "general") { drawCategory(a, "general"); drawChoices(a.choices); }
    else if (tab !== "comments") drawCategory(a, tab);
  }

  function overviewTab(a) {
    const cats = ["doctors", "tas", "courses", "general"].filter((c) => a.categories[c].length);
    return `<div class="grid grid-2">
      <div class="card glass"><h3>التقييم حسب المحور</h3><div class="sub">متوسط الرضا (%)</div><div class="chart-box" style="height:280px"><canvas id="ovCats"></canvas></div></div>
      <div class="card glass"><h3>توزيع كل التقييمات</h3><div class="sub">من ضعيف إلى ممتاز</div><div class="chart-box" style="height:280px"><canvas id="ovDist"></canvas></div></div>
    </div>
    <div class="grid grid-2">${cats.map((c) => {
      const ms = a.categories[c].flatMap((g) => g.metrics).sort((x, y) => y.pct - x.pct);
      return `<div class="card glass"><h3>${CAT_LABELS[c]}: الأعلى والأقل تقييمًا</h3><div class="sub">${fmt(ms.length)} عنصر</div>
        ${metricTable([...ms.slice(0, 3), ...(ms.length > 6 ? ms.slice(-3) : ms.slice(3))])}</div>`;
    }).join("")}</div>`;
  }

  function drawOverview(a) {
    const cats = ["doctors", "tas", "courses", "general"].filter((c) => a.summary[c] != null);
    charts.push(new Chart($("#ovCats"), {
      type: "bar",
      data: { labels: cats.map((c) => CAT_LABELS[c]), datasets: [{ data: cats.map((c) => +a.summary[c].toFixed(1)), backgroundColor: cats.map((c) => colorHex(a.summary[c])), borderRadius: 10, maxBarThickness: 60 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + "%" } }, x: { grid: { display: false } } } },
    }));
    const dist = [0, 0, 0, 0, 0];
    Object.values(a.categories).flat().flatMap((g) => g.metrics).forEach((m) => m.dist.forEach((v, i) => (dist[i] += v)));
    charts.push(new Chart($("#ovDist"), {
      type: "doughnut",
      data: { labels: ["ضعيف", "مقبول", "جيد", "جيد جدًا", "ممتاز"], datasets: [{ data: dist, backgroundColor: DIST_COLORS, borderColor: "rgba(255,255,255,.25)", borderWidth: 2 }] },
      options: { maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "left", rtl: true } } },
    }));
  }

  function metricTable(ms) {
    return `<table class="mtable"><thead><tr><th>البند</th><th>التقييم</th><th>التوزيع</th><th>ردود</th></tr></thead><tbody>
      ${ms.map((m) => { const tot = m.dist.reduce((a, b) => a + b, 0) || 1; return `<tr>
        <td>${esc(m.label)}</td>
        <td><div class="score-bar"><span class="num" style="color:${color(m.pct)}">${fmt(m.pct)}%</span><div class="track"><div class="fill" style="width:${m.pct}%;background:${color(m.pct)}"></div></div></div></td>
        <td><div class="stack" title="ضعيف ← ممتاز">${m.dist.map((v, i) => `<span style="width:${(v / tot) * 100}%;background:${DIST_COLORS[i]}"></span>`).join("")}</div></td>
        <td class="num">${fmt(m.scores.length)}</td></tr>`; }).join("")}
    </tbody></table>`;
  }

  function categoryTab(a, cat) {
    const groups = a.categories[cat];
    if (!groups.length) return cat === "general" ? "" : `<div class="glass empty"><div class="big">🔍</div><h3>مفيش أسئلة خاصة بـ${CAT_LABELS[cat]} في الفورم ده</h3></div>`;
    return `<div class="grid">${groups.map((g, i) => `
      <div class="card glass"><h3>${esc(g.question)}</h3><div class="sub">${g.single ? "سؤال تقييم" : fmt(g.metrics.length) + " بند"} • متوسط ${fmt(g.metrics.reduce((s, m) => s + m.pct, 0) / g.metrics.length)}%</div>
        ${g.single ? "" : `<div class="chart-box" style="height:${Math.max(160, g.metrics.length * 38)}px"><canvas id="c-${cat}-${i}"></canvas></div>`}
        ${metricTable(g.metrics)}
      </div>`).join("")}</div>`;
  }

  function drawCategory(a, cat) {
    a.categories[cat].forEach((g, i) => {
      if (g.single) return;
      const el = document.getElementById(`c-${cat}-${i}`);
      if (!el) return;
      charts.push(new Chart(el, {
        type: "bar",
        data: { labels: g.metrics.map((m) => m.label), datasets: [{ data: g.metrics.map((m) => +m.pct.toFixed(1)), backgroundColor: g.metrics.map((m) => colorHex(m.pct)), borderRadius: 8, maxBarThickness: 26 }] },
        options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.raw + "%" } } }, scales: { x: { min: 0, max: 100, ticks: { callback: (v) => v + "%" } }, y: { position: "right", grid: { display: false } } } },
      }));
    });
  }

  function choicesBlock(choices) {
    if (!choices.length) return "";
    return `<div class="grid grid-2">${choices.map((c, i) => `<div class="card glass"><h3>${esc(c.question)}</h3><div class="sub">${fmt(c.total)} رد</div>
      <div class="chart-box" style="height:260px"><canvas id="ch-${i}"></canvas></div></div>`).join("")}</div>`;
  }

  const PALETTE = ["#5ab0ff", "#3ddc97", "#f5c542", "#ff6b6b", "#b98cff", "#ff9f5a", "#4fd1c5", "#f78fb3", "#a3e635", "#94a3b8"];
  function drawChoices(choices) {
    choices.forEach((c, i) => {
      const entries = Object.entries(c.counts).sort((a, b) => b[1] - a[1]);
      const pie = entries.length <= 5;
      charts.push(new Chart(document.getElementById("ch-" + i), {
        type: pie ? "doughnut" : "bar",
        data: { labels: entries.map((e) => e[0]), datasets: [{ data: entries.map((e) => e[1]), backgroundColor: entries.map((_, k) => PALETTE[k % PALETTE.length]), borderRadius: pie ? 0 : 8, borderColor: "rgba(255,255,255,.25)", borderWidth: pie ? 2 : 0 }] },
        options: pie ? { maintainAspectRatio: false, cutout: "58%", plugins: { legend: { position: "left", rtl: true } } }
          : { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { position: "right", grid: { display: false } } } },
      }));
    });
  }

  function commentsTab(a) {
    if (!a.texts.length) return `<div class="glass empty"><div class="big">💬</div><h3>مفيش أسئلة مقالية في الفورم ده</h3></div>`;
    return `<div class="grid grid-2">${a.texts.map((t) => `<div class="card glass"><h3>${esc(t.question)}</h3><div class="sub">${fmt(t.answers.length)} رد</div>
      <div class="comments">${t.answers.map((x) => `<div class="comment">${esc(x)}</div>`).join("")}</div></div>`).join("")}</div>`;
  }

  function compareChart(id, labels, stats) {
    const series = [["overall", "الرضا العام", "#5ab0ff"], ["doctors", "الدكاترة", "#3ddc97"], ["tas", "المعيدين", "#f5c542"], ["courses", "المواد", "#b98cff"]];
    charts.push(new Chart(document.getElementById(id), {
      type: "bar",
      data: { labels, datasets: series.map(([k, l, c]) => ({ label: l, data: stats.map((s) => (s[k] == null ? null : +s[k].toFixed(1))), backgroundColor: c, borderRadius: 6, maxBarThickness: 28 })) },
      options: { maintainAspectRatio: false, plugins: { legend: { position: "top", rtl: true } }, scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + "%" } }, x: { grid: { display: false } } } },
    }));
  }

  /* ---------- Demo data (?demo=1) ---------- */
  function demoData(program) {
    let seed = [...program.id].reduce((a, c) => a + c.charCodeAt(0), 0);
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const scale = ["ضعيف", "مقبول", "جيد", "جيد جدا", "ممتاز"];
    const pick = (bias) => scale[Math.min(4, Math.max(0, Math.round(bias + (rnd() - 0.5) * 2.4)))];
    const docs = ["د. أحمد علي", "د. منى حسن", "د. محمود سالم", "د. سارة إبراهيم"];
    const tas = ["م. يوسف خالد", "م. نورهان سمير", "م. عمر طارق"];
    const courses = ["المادة 101", "المادة 102", "المادة 103", "المادة 104"];
    const headers = ["Timestamp", "الفرقة الدراسية",
      ...docs.map((d) => `تقييم أداء الدكتور [${d}]`),
      ...tas.map((t) => `تقييم أداء المعيد [${t}]`),
      ...courses.map((c) => `مدى وضوح محتوى المادة [${c}]`),
      "مدى رضاك عن الخدمات التعليمية بشكل عام", "اقتراحات لتحسين العملية التعليمية"];
    const biases = headers.map(() => 1.8 + rnd() * 2);
    const n = 40 + Math.floor(rnd() * 120);
    const comments = ["زيادة الساعات العملية", "المحاضرات ممتازة", "محتاجين معامل أكتر", "تنظيم الجدول أفضل", "شكرًا للدكاترة على المجهود"];
    const rows = Array.from({ length: n }, () => {
      const r = {};
      headers.forEach((h, i) => {
        if (i === 0) r[h] = "2026/11/10";
        else if (i === 1) r[h] = ["الأولى", "الثانية", "الثالثة", "الرابعة"][Math.floor(rnd() * 4)];
        else if (i === headers.length - 1) r[h] = rnd() > 0.6 ? comments[Math.floor(rnd() * comments.length)] : "";
        else r[h] = pick(biases[i]);
      });
      return r;
    });
    return { rows, headers };
  }

  window.addEventListener("hashchange", () => render());
  render();
})();

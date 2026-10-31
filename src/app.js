(function () {
  const ISO_NUM = { USA: "840", NLD: "528", JPN: "392", TWN: "158", DEU: "276", CHN: "156", SGP: "702", MYS: "458", THA: "764", HKG: "344", KOR: "410", IDN: "360", RUS: "643", MMR: "104", COD: "180" };
  const NAME_NUM = { "United States": "840", "Netherlands": "528", "Japan": "392", "Taiwan": "158", "Germany": "276", "China": "156", "Singapore": "702", "Malaysia": "458", "Thailand": "764", "China (Hong Kong)": "344", "Hong Kong": "344", "South Korea": "410", "Indonesia": "360", "Myanmar": "104", "DR Congo": "180", "Russia": "643" };
  const GROUP_LABEL = { us: "United States", ally: "US ally", china: "China", partner: "China's partner", transit: "Transit hub" };
  const STATUS_LABEL = { blocked: "Blocked", restricted: "Restricted", allowed: "Allowed", leaking: "Leaking", dependency: "Dependency" };
  const LEV_LABEL = { us: "US leverage", ally: "Allied leverage", china: "China's leverage" };
  const KIND_LABEL = { blue: "Our leverage", red: "China's leverage", leak: "Leaks" };
  const CAT_LABEL = { "ai-chips": "AI chips", "chipmaking-tools": "Chipmaking tools", software: "Software", memory: "Memory", fabrication: "Chipmaking", materials: "Materials", minerals: "Minerals", "datacenter-hardware": "Data center hardware", "compute-access": "Computing access" };
  const CAT_GROUP = { "ai-chips": "chips", "datacenter-hardware": "chips", "chipmaking-tools": "making", fabrication: "making", materials: "making", memory: "memory", minerals: "minerals", software: "software", "compute-access": "software" };
  const CATG_LABEL = { chips: "Chips & data center gear", making: "Chipmaking & tools", memory: "Memory", minerals: "Minerals", software: "Software & cloud" };
  const ICON = {
    chips: "M3.5 3.5h5v5h-5z M1.5 5h2 M1.5 7h2 M8.5 5h2 M8.5 7h2 M5 1.5v2 M7 1.5v2 M5 8.5v2 M7 8.5v2",
    making: "M2 10h8 M3 10V6h6v4 M5 6V3.5h2V6 M4.2 2h3.6",
    memory: "M2 3h8v2.4H2z M2 6.6h8V9H2z",
    minerals: "M6 1.8L9.8 5L6 10.2L2.2 5Z M2.2 5h7.6 M6 1.8L4.6 5L6 10.2L7.4 5Z",
    software: "M4.3 3.2L1.8 6l2.5 2.8 M7.7 3.2L10.2 6L7.7 8.8"
  };
  const LABELS = [
    ["United States", -100, 41, 1], ["China", 103, 34, 1], ["Russia", 95, 61, 1], ["Netherlands", 5.5, 54.2, 1], ["Germany", 10.5, 49.5, 2],
    ["DR Congo", 23, -3, 1], ["Taiwan", 124.2, 23.4, 2], ["Japan", 143, 41, 2], ["S. Korea", 129.4, 36.4, 2],
    ["Malaysia", 102, 4.2, 2], ["Singapore", 104.4, 0.6, 2], ["Thailand", 101, 15.5, 2], ["Indonesia", 116, -1.5, 1],
    ["Hong Kong", 115.6, 21.6, 2], ["Myanmar", 96, 21, 2]
  ];
  const STEPS = [
    { title: "Overview", text: "Blue lines carry what China needs from the US (bright) and its allies (faint). Red lines carry what the US needs from China. Dotted lines got around export controls. Each line groups related items: double-click one to split it and double-click empty map to regroup, or take the tour." },
    { title: "What only the US makes", text: "Nvidia and AMD AI chips, chip design software, and the machines that etch and inspect chips come from US companies. Most of them are blocked from China or need a license.", test: d => d.kind === "blue" && d.tier === "us" },
    { title: "What our allies make", text: "Dutch lithography machines, Japanese tools and chemicals, Taiwan's chip factories and Korea's memory are hard for China to replace. Allied rules keep the most advanced ones out.", test: d => d.kind === "blue" && d.tier === "ally" },
    { title: "How it leaks", text: "Servers resold through middlemen, front companies and rented cloud computing get banned chips to China anyway. Most routes pass through Taiwan and Southeast Asia. Only one case has ended in a conviction so far.", test: d => d.kind === "leak" },
    { title: "What China holds over us", text: "China supplies most of the world's gallium and rare earth magnets, plus graphite, older chips and battery cells, and it has restricted several of these exports. A US–China truce has paused some limits, but not all.", test: d => d.kind === "red" },
    { title: "What the US is building", text: "New US fabs, packaging plants and mineral sites aim to close these gaps. TSMC Arizona and MP Materials' rare earth mine and magnet plant already operate; most others are still being built.", projects: true }
  ];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const svg = d3.select("#map");
  const mapEl = document.getElementById("map");
  const tip = document.getElementById("tip");
  const panel = document.getElementById("panel");
  const panelBody = document.getElementById("panel-body");
  const indexEl = document.getElementById("index");
  const indexList = document.getElementById("index-list");
  const indexBtn = document.getElementById("t-index");
  const catSelect = document.getElementById("cat");
  const measureEl = document.getElementById("measure");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const narrow = () => window.innerWidth < 761;
  const shortName = s => { const t = s.replace(/\s*\([^)]*\)/g, "").replace(/:.*$/, "").trim(); return t.length > 34 ? t.slice(0, 32).trim() + "…" : t; };

  const groupById = {};
  const countryInfo = {};
  for (const [iso, v] of Object.entries(DATA.countries)) {
    const num = ISO_NUM[iso];
    if (!num) continue;
    groupById[num] = v.group;
    countryInfo[num] = v;
  }

  // items
  const items = DATA.items.map(d => {
    const kind = d.line_style === "dotted" ? "leak" : d.leverage === "china" ? "red" : "blue";
    const tier = d.leverage === "us" ? "us" : d.leverage === "ally" ? "ally" : "cn";
    return Object.assign({}, d, { kind, tier, catg: CAT_GROUP[d.category], pts: [d.from, ...(d.via || []), d.to], isGroup: false, group: null });
  });
  const fanKey = d => d.kind + "|" + d.from.country + ">" + d.to.country;
  { const c = {}; for (const it of items) if (it.pts.length === 2) { const k = fanKey(it); it.fanAll = (c[k] = (c[k] || 0) + 1) - 1; } }

  // groups: same kind, type and route
  const normCountry = c => c === "China (Hong Kong)" ? "China" : c;
  const avg = arr => ({ lat: d3.mean(arr, p => p.lat), lon: d3.mean(arr, p => p.lon) });
  const gm = new Map();
  for (const it of items) {
    const k = [it.kind, it.catg, normCountry(it.from.country), normCountry(it.to.country)].join("|");
    if (!gm.has(k)) gm.set(k, []);
    gm.get(k).push(it);
  }
  const groups = [];
  for (const mem of gm.values()) {
    if (mem.length < 2) continue;
    const id = "group-" + groups.length;
    const f = mem[0];
    mem.forEach((m, j) => { m.group = id; m.delay = (0.05 * j).toFixed(2) + "s"; });
    const vias = mem.flatMap(m => m.via || []);
    const fromC = normCountry(f.from.country), toC = normCountry(f.to.country);
    const from = Object.assign(avg(mem.map(m => m.from)), { site: fromC, country: fromC });
    const to = Object.assign(avg(mem.map(m => m.to)), { site: toC, country: toC });
    const pts = vias.length ? [from, Object.assign(avg(vias), { site: "transit hubs", country: "" }), to] : [from, to];
    const name = f.kind === "leak" ? `${CATG_LABEL[f.catg]} that got around controls` : `${CATG_LABEL[f.catg]} from ${fromC === "United States" ? "the US" : fromC}${toC !== "China" && toC !== "United States" ? " to " + toC : ""}`;
    groups.push({ id, isGroup: true, kind: f.kind, tier: f.tier, catg: f.catg, members: mem, from, to, pts, name, short: `${CATG_LABEL[f.catg]} ×${mem.length}`, chokepoint: mem.some(m => m.chokepoint) });
  }
  const lines = [...groups, ...items];
  lines.filter(l => l.isGroup || !l.group).forEach((l, i) => { l.delay = (0.15 + i * 0.07).toFixed(2) + "s"; });
  const lineById = new Map(lines.map(l => [l.id, l]));

  const byNum = {};
  for (const it of items) {
    const touch = (c, role) => { const n = NAME_NUM[c]; if (!n) return; (byNum[n] = byNum[n] || { out: [], in: [], via: [] })[role].push(it); };
    touch(it.from.country, "out");
    touch(it.to.country, "in");
    for (const v of it.via || []) if (v.country !== it.from.country && v.country !== it.to.country) touch(v.country, "via");
  }

  const world = topojson.feature(WORLD, WORLD.objects.countries).features.filter(f => f.id !== "010");
  const graticule = d3.geoGraticule10();
  const fitPts = { type: "MultiPoint", coordinates: [
    ...items.flatMap(it => it.pts.map(p => [p.lon, p.lat])),
    ...DATA.projects.map(p => [p.lon, p.lat]),
    [-128, 56], [2, 58], [100, -14]
  ] };

  let W = 0, H = 0, T = d3.zoomIdentity, raf = 0, headBottom = 0;
  const proj = d3.geoNaturalEarth1().rotate([-150, 0]);
  const tStream = d3.geoTransform({ point(x, y) { this.stream.point(T.applyX(x), T.applyY(y)); } });
  const zproj = { stream: s => proj.stream(tStream.stream(s)) };
  const geo = d3.geoPath(zproj);
  const P = p => { const xy = proj([p.lon, p.lat]); return [T.applyX(xy[0]), T.applyY(xy[1])]; };
  const smooth = d3.line().curve(d3.curveCatmullRom.alpha(0.5));

  const gCountries = svg.select(".countries"), gLabels = svg.select(".labels");
  const gHalo = svg.select(".halo"), gGlow = svg.select(".glow"), gCores = svg.select(".cores"), gArrows = svg.select(".arrows");
  const gLights = svg.select(".lights"), gVias = svg.select(".vias"), gIcons = svg.select(".icons"), gProj = svg.select(".projects");
  const gLineLabels = svg.select(".line-labels"), gHits = svg.select(".hits"), gPulse = svg.select(".pulse");

  const countries = gCountries.selectAll("path").data(world).join("path")
    .attr("class", d => "country" + (groupById[d.id] ? " g-" + groupById[d.id] : "") + ((groupById[d.id] || byNum[d.id]) ? " clickable" : ""))
    .on("click", (e, d) => { if (groupById[d.id] || byNum[d.id]) openCountry(d); });

  const labels = gLabels.selectAll("text").data(LABELS).join("text")
    .attr("class", d => "label" + (d[3] === 2 ? " zoom-only" : "")).attr("text-anchor", "middle").text(d => d[0]);

  const lineAttrs = (sel, animate) => sel
    .attr("data-kind", d => d.kind).attr("data-id", d => d.id)
    .attr("class", d => "t-" + d.tier + " k-" + d.kind + (animate ? (d.kind === "leak" ? " fadein" : " draw") : ""))
    .attr("pathLength", d => animate && d.kind !== "leak" ? 1 : null)
    .style("--d", d => d.delay);
  const halo = gHalo.selectAll("path").data(lines).join("path").call(lineAttrs, true);
  const glow = gGlow.selectAll("path").data(lines).join("path").call(lineAttrs, true);
  const cores = gCores.selectAll("path").data(lines).join("path").call(lineAttrs, true);
  const arrows = gArrows.selectAll("path").data(lines).join("path")
    .attr("class", d => "t-" + d.tier + " k-" + d.kind + " fadein").style("--d", d => (parseFloat(d.delay) + 1.35).toFixed(2) + "s");
  const icons = gIcons.selectAll("g").data(lines).join("g")
    .attr("class", d => "k-" + d.kind + " fadein").style("--d", d => (parseFloat(d.delay) + 0.6).toFixed(2) + "s");
  icons.append("circle").attr("r", 7.5);
  icons.append("path").attr("transform", "translate(-6,-6)").attr("d", d => ICON[d.catg]);
  icons.filter(d => d.chokepoint).classed("choke", true).append("path").attr("class", "star")
    .attr("transform", "translate(7.5,-7.5)").attr("d", "M0,-4.6L1.2,-1.5L4.4,-1.4L1.9,0.6L2.7,3.7L0,1.9L-2.7,3.7L-1.9,0.6L-4.4,-1.4L-1.2,-1.5Z");
  const lineSets = [halo, glow, cores, arrows, icons];
  const hits = gHits.selectAll("path").data(lines).join("path")
    .attr("data-kind", d => d.kind).attr("tabindex", 0).attr("role", "button")
    .attr("aria-label", d => d.isGroup ? `${d.name}, ${d.members.length} items` : `${d.name}, ${STATUS_LABEL[d.status] || d.status}`)
    .on("pointerenter", (e, d) => { setActive(d.id); showTip(e, d.isGroup ? d.name : (d.short_label || d.name), lineMeta(d), lineTip(d)); })
    .on("pointermove", e => moveTip(e))
    .on("pointerleave", () => { setActive(selectedId); hideTip(); })
    .on("focus", (e, d) => setActive(d.id))
    .on("blur", () => setActive(selectedId))
    .on("click", (e, d) => { clearTimeout(clickTimer); clickTimer = setTimeout(() => d.isGroup ? openGroup(d) : openItem(d), 240); })
    .on("dblclick", (e, d) => { e.preventDefault(); e.stopPropagation(); clearTimeout(clickTimer); toggleSplit(d); })
    .on("keydown", (e, d) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); d.isGroup ? openGroup(d) : openItem(d); } });
  let clickTimer = 0;
  function toggleSplit(d) {
    hideTip();
    if (step > 0) return d.isGroup ? openGroup(d) : openItem(d);
    if (d.isGroup) { expanded.add(d.id); openGroup(d); return; }
    if (d.group) { expandAll = false; expanded.delete(d.group); closePanel(); return; }
    openItem(d);
  }

  const key = p => p.lat.toFixed(2) + "," + p.lon.toFixed(2);
  const lightFill = e => e.kinds.size > 1 ? "url(#light-mix)" : e.kinds.has("red") ? "url(#light-red)" : "url(#light-blue)";
  function drawLights() {
    const m = new Map();
    for (const l of lines) {
      if (!shownSet.has(l.id)) continue;
      for (const p of [l.pts[0], l.pts[l.pts.length - 1]]) {
        const k = key(p);
        if (!m.has(k)) m.set(k, { k, p, kinds: new Set() });
        m.get(k).kinds.add(l.kind === "red" ? "red" : "blue");
      }
    }
    gLights.selectAll("g").data(Array.from(m.values()), d => d.k).join(enter => {
      const g = enter.append("g").attr("class", "fadein").style("--d", "0.6s");
      g.append("circle").attr("class", "halo-dot").attr("r", 9);
      g.append("circle").attr("class", "dot").attr("r", 1.5);
      return g;
    }).attr("transform", d => `translate(${P(d.p)})`).select(".halo-dot").attr("fill", lightFill);
  }

  const projects = gProj.selectAll("circle").data(DATA.projects).join("circle")
    .attr("class", d => "project st-" + d.status.replace(/\s+/g, "-")).attr("r", 5.5)
    .attr("tabindex", 0).attr("role", "button").attr("aria-label", d => d.name)
    .on("pointerenter", (e, d) => showTip(e, d.name, d.site + " · " + d.status))
    .on("pointermove", e => moveTip(e))
    .on("pointerleave", hideTip)
    .on("click", (e, d) => openProject(d))
    .on("keydown", (e, d) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProject(d); } });

  // state
  let step = 0, expandAll = false, activeId = null, selectedId = null, cat = "all";
  const expanded = new Set();
  const kindOn = { blue: true, red: true, leak: true };
  let shownSet = new Set();

  const filterOk = d => (cat === "all" || d.catg === cat) && kindOn[d.kind];
  function baseShown(d) {
    if (!filterOk(d)) return false;
    if (step > 0) return !d.isGroup && !!STEPS[step].test && STEPS[step].test(d);
    if (d.isGroup) return !expandAll && !expanded.has(d.id);
    return !d.group || expandAll || expanded.has(d.group);
  }

  function applyVisibility() {
    const base = lines.filter(baseShown);
    const c = {};
    for (const l of base) if (l.pts.length === 2) { const k = fanKey(l); l.fan = (c[k] = (c[k] || 0) + 1) - 1; }
    shownSet = new Set(base.map(l => l.id));
    for (const id of [activeId, selectedId]) {
      const l = id && lineById.get(id);
      if (l && !l.isGroup && !shownSet.has(id)) { l.fan = l.fanAll || 0; shownSet.add(id); }
    }
    for (const sel of [...lineSets, hits]) sel.style("display", d => shownSet.has(d.id) ? null : "none");
    const split = expandAll || expanded.size > 0;
    expandBtn.textContent = split ? "Group all lines" : "Show every line";
    expandBtn.setAttribute("aria-pressed", String(split));
    schedule();
  }

  function linePath(it) {
    const pts = it.pts.map(P);
    if (pts.length > 2) return smooth(pts);
    const [a, b] = pts;
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    const wantDown = it.kind === "red";
    if ((ny > 0) !== wantDown) { nx = -nx; ny = -ny; }
    const spread = focusGroup && it.group === focusGroup ? 0.07 : 0.03;
    const c = Math.min(0.13 + spread * (it.fan || 0), 0.4) * len;
    const cx = (a[0] + b[0]) / 2 + nx * c, cy = (a[1] + b[1]) / 2 + ny * c;
    return `M${a[0]},${a[1]}Q${cx},${cy} ${b[0]},${b[1]}`;
  }

  function draw() {
    raf = 0;
    viewport.attr("transform", null);
    drawnT = T;
    if (baseT !== T) {
      baseT = T;
      svg.select(".sphere").attr("d", geo({ type: "Sphere" }));
      svg.select(".graticule").attr("d", geo(graticule));
      countries.attr("d", geo);
      labels.attr("transform", d => `translate(${P({ lon: d[1], lat: d[2] })})`);
    }
    const geom = new Map();
    for (const l of lines) {
      if (!shownSet.has(l.id)) continue;
      const d = linePath(l);
      measureEl.setAttribute("d", d);
      const L = measureEl.getTotalLength();
      const at = t => measureEl.getPointAtLength(Math.max(0, Math.min(L, t)));
      const head = (pos, s) => {
        const tipPt = at(pos), back = at(pos - 6);
        const a = Math.atan2(tipPt.y - back.y, tipPt.x - back.x);
        const pt = (r, t) => [tipPt.x + r * Math.cos(a + t), tipPt.y + r * Math.sin(a + t)];
        const l1 = pt(s, Math.PI * 0.82), r1 = pt(s, -Math.PI * 0.82), n = pt(s * 0.45, Math.PI);
        return `M${tipPt.x},${tipPt.y}L${l1[0]},${l1[1]}L${n[0]},${n[1]}L${r1[0]},${r1[1]}Z`;
      };
      let arrow = "";
      if (L >= 24) arrow = head(L - 10, 12) + (L >= 90 ? head(L * 0.66, 9) : "");
      const icon = at(L * 0.28);
      geom.set(l.id, { d, arrow, icon, spots: [0.5, 0.4, 0.6, 0.32, 0.7].map(t => at(L * t)), L });
    }
    for (const sel of [halo, glow, cores, hits]) sel.filter(d => geom.has(d.id)).attr("d", d => geom.get(d.id).d);
    arrows.filter(d => geom.has(d.id)).attr("d", d => geom.get(d.id).arrow);
    icons.filter(d => geom.has(d.id)).attr("transform", d => { const g = geom.get(d.id).icon; return `translate(${g.x},${g.y})`; });
    drawLights();
    const viaPts = Array.from(new Map(lines.filter(l => shownSet.has(l.id) && !l.isGroup).flatMap(l => l.via || []).map(p => [key(p), p])).values());
    gVias.selectAll("circle").data(viaPts).join("circle").attr("class", "via").attr("r", 1.6).attr("transform", d => `translate(${P(d)})`);
    projects.attr("transform", d => `translate(${P(d)})`);
    mapEl.classList.toggle("zoomed-in", T.k >= 1.8);
    drawLabels(geom);
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };

  function drawLabels(geom) {
    const shown = lines.filter(l => geom.has(l.id));
    const cands = [];
    if (shown.length <= 24) {
      const size = l => l.isGroup ? l.members.length : 1;
      const isFocus = l => !!focusGroup && l.group === focusGroup;
      const order = [...shown].sort((a, b) => (b.id === activeId) - (a.id === activeId) || isFocus(b) - isFocus(a) || size(b) - size(a) || geom.get(b.id).L - geom.get(a.id).L);
      for (const l of order) {
        const text = l.isGroup ? l.short : (l.short_label || shortName(l.name));
        const dy = l.kind === "red" ? 15 : -8;
        cands.push({ id: l.id, text, spots: geom.get(l.id).spots.map(m => [m.x, m.y + dy]), cls: "k-" + l.kind + (l.isGroup ? " grp" : "") + (isFocus(l) ? " focus" : ""), anchor: "middle" });
      }
    }
    if (STEPS[step].projects && !mapEl.classList.contains("hide-projects")) {
      for (const p of DATA.projects) {
        const [x, y] = P(p);
        cands.push({ id: p.id, text: p.name, spots: [[x + 10, y + 4]], cls: "proj-label", anchor: "start" });
      }
    }
    const placed = [], boxes = [];
    const panelLeft = panel.classList.contains("open") && !narrow() ? panel.getBoundingClientRect().left : W;
    for (const c of cands) {
      const w = c.text.length * 6.1 + 6, h = 14;
      for (const [x, y] of c.spots) {
        const x0 = c.anchor === "middle" ? x - w / 2 : x - 3;
        const box = [x0, y - 11, x0 + w, y - 11 + h];
        if (box[0] < 4 || box[2] > Math.min(W - 4, panelLeft - 6) || box[1] < headBottom || box[3] > H - 4) continue;
        if (boxes.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
        boxes.push(box); placed.push(Object.assign({}, c, { x, y })); break;
      }
    }
    gLineLabels.selectAll("text").data(placed, d => d.id).join("text")
      .attr("class", d => d.cls + (d.id === activeId ? " on" : ""))
      .attr("text-anchor", d => d.anchor).attr("x", d => d.x).attr("y", d => d.y).text(d => d.text);
  }

  const viewport = svg.select(".viewport");
  let drawnT = d3.zoomIdentity, baseT = null;
  const zoom = d3.zoom().scaleExtent([1, 10])
    .on("start", () => { mapEl.classList.add("moving"); hideTip(); })
    .on("zoom", e => {
      T = e.transform;
      const s = T.k / drawnT.k;
      viewport.attr("transform", `translate(${T.x - s * drawnT.x},${T.y - s * drawnT.y}) scale(${s})`);
    })
    .on("end", () => { mapEl.classList.remove("moving"); schedule(); });
  svg.call(zoom).on("dblclick.zoom", null);
  svg.on("dblclick.regroup", e => {
    if (e.target.closest(".hits, .project")) return;
    if (step === 0 && (expandAll || expanded.size)) { expandAll = false; expanded.clear(); closePanel(); }
  });

  function layout() {
    W = window.innerWidth; H = window.innerHeight;
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    headBottom = document.querySelector(".head").getBoundingClientRect().bottom;
    const top = Math.min(headBottom + (narrow() ? 8 : 24), H * 0.55);
    const side = narrow() ? 8 : 20;
    proj.fitExtent([[side, top], [W - side, H - (narrow() ? 70 : 30)]], fitPts);
    baseT = null;
    zoom.translateExtent([[-W * 0.25, -H * 0.25], [W * 1.25, H * 1.25]]);
    if (!narrow()) indexEl.style.top = (headBottom + 12) + "px";
    schedule();
  }

  function fitTo(points) {
    if (!points.length) return d3.zoomIdentity;
    const xy = points.map(p => proj([p.lon, p.lat]));
    const [x0, x1] = d3.extent(xy, d => d[0]), [y0, y1] = d3.extent(xy, d => d[1]);
    const bx0 = narrow() ? 16 : 60, bx1 = W - (narrow() ? 16 : 360);
    const by0 = headBottom + 40, by1 = H - (narrow() ? 80 : 50);
    const k = Math.max(1, Math.min(4, 0.82 * Math.min((bx1 - bx0) / Math.max(x1 - x0, 1), (by1 - by0) / Math.max(y1 - y0, 1))));
    return d3.zoomIdentity.translate((bx0 + bx1) / 2 - k * (x0 + x1) / 2, (by0 + by1) / 2 - k * (y0 + y1) / 2).scale(k);
  }

  // traveling light along the active line
  let pulseId = null, pulseStart = 0, pulseRaf = 0;
  const sparkGlow = gPulse.select(".spark-glow");
  function runPulse(id) {
    pulseId = id;
    cancelAnimationFrame(pulseRaf);
    const l = id && lineById.get(id);
    gPulse.classed("on", !!l && !reduceMotion);
    if (!l || reduceMotion) return;
    sparkGlow.attr("fill", l.kind === "red" ? "#ff4a3d" : "#4d95ff");
    pulseStart = performance.now();
    const el = cores.filter(d => d.id === id).node();
    const stepFn = now => {
      if (pulseId !== id) return;
      if (el.getAttribute("d")) {
        const L = el.getTotalLength();
        const t = ((now - pulseStart) % 2200) / 2200;
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const pt = el.getPointAtLength(e * L);
        gPulse.attr("transform", `translate(${pt.x},${pt.y})`).style("opacity", Math.min(1, Math.sin(Math.PI * t) * 2.2));
      }
      pulseRaf = requestAnimationFrame(stepFn);
    };
    pulseRaf = requestAnimationFrame(stepFn);
  }

  let focusGroup = null;
  function setFocus(id) {
    focusGroup = id;
    mapEl.classList.toggle("has-focus", !!id);
    for (const sel of lineSets) sel.classed("focus", d => !!id && !d.isGroup && d.group === id);
    schedule();
  }
  function setActive(id) {
    activeId = id;
    mapEl.classList.toggle("has-active", !!id);
    for (const sel of lineSets) sel.classed("on", d => d.id === id);
    document.querySelectorAll(".rowbtn").forEach(b => b.classList.toggle("on", b.dataset.id === id));
    applyVisibility();
    if (id !== pulseId) runPulse(id);
  }

  const lineMeta = d => d.isGroup ? `${d.members.length} items · double-click to split` : (d.chokepoint ? "★ Chokepoint · " : "") + (d.kind === "leak" ? "Got around controls" + (d.proof ? " · " + d.proof : "") : LEV_LABEL[d.leverage]) + " · " + (STATUS_LABEL[d.status] || d.status) + (step === 0 && d.group ? " · double-click to regroup" : "");
  function showTip(e, title, meta, body) { tip.innerHTML = `<b>${esc(title)}</b>${body ? `<p>${esc(body)}</p>` : ""}<span>${esc(meta)}</span>`; tip.style.display = "block"; moveTip(e); }
  const lineTip = d => d.isGroup ? d.members.map(m => m.short_label || shortName(m.name)).join(" · ") : d.tip;
  function moveTip(e) {
    const r = tip.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > W - 8) x = e.clientX - r.width - 14;
    if (y + r.height > H - 8) y = e.clientY - r.height - 14;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function hideTip() { tip.style.display = "none"; }

  // filters and list
  function applyFilters() {
    document.querySelectorAll("[data-f]").forEach(btn => {
      const f = btn.dataset.f;
      btn.querySelector(".n").textContent = f === "projects" ? DATA.projects.length : items.filter(d => d.kind === f && (cat === "all" || d.catg === cat)).length;
    });
    const visible = items.filter(filterOk);
    indexBtn.querySelector(".n").textContent = visible.length;
    renderIndex(visible);
    applyVisibility();
  }
  function rowHtml(it) {
    return `<li><button class="rowbtn" data-id="${esc(it.id)}"><span class="sw ${it.kind === "leak" ? "leak" : it.tier}"></span><span class="nm">${esc(it.name)}${it.chokepoint ? ` <span class="star-txt" title="Chokepoint">★</span>` : ""}</span><span class="st">${esc(STATUS_LABEL[it.status] || it.status)}</span></button></li>`;
  }
  function wireRows(root) {
    root.querySelectorAll(".rowbtn").forEach(b => {
      const it = lineById.get(b.dataset.id);
      b.addEventListener("pointerenter", () => setActive(it.id));
      b.addEventListener("pointerleave", () => setActive(selectedId));
      b.addEventListener("focus", () => setActive(it.id));
      b.addEventListener("blur", () => setActive(selectedId));
      b.addEventListener("click", () => { if (narrow()) toggleIndex(false); openItem(it); });
    });
  }
  function renderIndex(visible) {
    const html = ["blue", "red", "leak"].map(k => {
      const arr = visible.filter(d => d.kind === k);
      if (!arr.length) return "";
      return `<h3><span class="sw ${k === "blue" ? "us" : k === "red" ? "cn" : "leak"}"></span>${KIND_LABEL[k]} · ${arr.length}</h3><ul class="rows">${arr.map(rowHtml).join("")}</ul>`;
    }).join("");
    indexList.innerHTML = html || `<p class="empty">No items match these filters.</p>`;
    wireRows(indexList);
  }
  function toggleIndex(open) {
    indexEl.classList.toggle("open", open);
    indexBtn.setAttribute("aria-expanded", String(open));
    if (open && narrow()) panel.classList.remove("open");
  }

  // detail panel
  function sourcesHtml(list) {
    return `<ol>${(list || []).map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a> <span class="date">${esc(s.date || "")}</span></li>`).join("")}</ol>`;
  }
  function openPanel(html) { panelBody.innerHTML = html; panel.classList.add("open"); panel.scrollTop = 0; if (narrow()) toggleIndex(false); }
  function closePanel() {
    panel.classList.remove("open"); selectedId = null;
    setFocus(null);
    if (!expandAll) expanded.clear();
    setActive(null);
  }

  function openItem(d) {
    if (d.group !== focusGroup) setFocus(null);
    selectedId = d.id; setActive(d.id); hideTip();
    const chips = [
      d.kind === "leak" ? `<span class="chip leak">Got around controls</span>` : `<span class="chip ${d.tier}">${esc(LEV_LABEL[d.leverage])}</span>`,
      `<span class="chip">${esc(STATUS_LABEL[d.status] || d.status)}</span>`,
      d.proof ? `<span class="chip">${esc(d.proof)}</span>` : "",
      `<span class="chip">${esc(CAT_LABEL[d.category] || d.category)}</span>`,
      d.contested ? `<span class="chip warn">Contested</span>` : "",
      d.confidence === "low" ? `<span class="chip warn">Low confidence</span>` : "",
      d.chokepoint ? `<span class="chip choke">★ Chokepoint</span>` : ""
    ].join("");
    openPanel(`
      <div class="chips">${chips}</div>
      <h2>${esc(d.name)}</h2>
      <p class="route">${d.pts.map(p => esc(p.site)).join(" → ")}</p>
      <dl>
        <div><dt>What it is</dt><dd>${esc(d.what_it_is)}</dd></div>
        <div><dt>Used for</dt><dd>${esc(d.used_for)}</dd></div>
        <div><dt>Status</dt><dd>${esc(d.status_detail)}</dd></div>
        <div><dt>Evidence</dt><dd>${esc(d.evidence)}</dd></div>
        ${d.chokepoint ? `<div><dt>Why it's a chokepoint</dt><dd>${esc(d.chokepoint_note)}${d.chokepoint_source ? ` <a href="${esc(d.chokepoint_source.url)}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}</dd></div>` : ""}
        ${d.contested && d.contested_note ? `<div><dt>The other side</dt><dd>${esc(d.contested_note)}</dd></div>` : ""}
        <div><dt>Sources</dt><dd>${sourcesHtml(d.sources)}</dd></div>
      </dl>
      ${step === 0 && d.group && (expanded.has(d.group) || expandAll) ? `<button class="btn" id="regroup-item">Group with related lines</button>` : ""}`);
    const rb = document.getElementById("regroup-item");
    if (rb) rb.addEventListener("click", () => { expandAll = false; expanded.delete(d.group); closePanel(); });
  }

  function openGroup(g) {
    selectedId = null; hideTip(); setActive(null);
    const split = expanded.has(g.id) || expandAll;
    setFocus(split && !expandAll && step === 0 ? g.id : null);
    openPanel(`
      <div class="chips"><span class="chip ${g.kind === "leak" ? "leak" : g.tier}">${esc(g.kind === "leak" ? "Got around controls" : LEV_LABEL[g.members[0].leverage])}</span><span class="chip">${g.members.length} items</span></div>
      <h2>${esc(g.name)}</h2>
      <p class="route">${esc(g.from.site)} → ${esc(g.to.site)}. ${split ? "Split into its items. Double-click an empty spot on the map, or close this card, to group them again." : "Double-click the line to split it into its items. Hover a name to find it."}</p>
      <ul class="rows">${g.members.map(rowHtml).join("")}</ul>
      ${step === 0 ? `<button class="btn" id="regroup">${split ? "Group these lines again" : "Split into items"}</button>` : ""}`);
    wireRows(panelBody);
    const rb = document.getElementById("regroup");
    if (rb) rb.addEventListener("click", () => {
      if (split) { expandAll = false; expanded.delete(g.id); closePanel(); }
      else { expanded.add(g.id); openGroup(g); }
    });
  }

  function openProject(d) {
    selectedId = null; setActive(null); hideTip();
    openPanel(`
      <div class="chips"><span class="chip us">US project</span><span class="chip">${esc(d.status)}</span></div>
      <h2>${esc(d.name)}</h2>
      <p class="route">${esc(d.company)} · ${esc(d.site)}</p>
      <dl>
        <div><dt>What it makes</dt><dd>${esc(d.what)}</dd></div>
        <div><dt>Gap it closes</dt><dd>${esc(d.closes_gap)}</dd></div>
        <div><dt>Status</dt><dd>${esc(d.status_detail)}</dd></div>
        <div><dt>Sources</dt><dd>${sourcesHtml(d.sources)}</dd></div>
      </dl>`);
  }

  function openCountry(f) {
    selectedId = null; setActive(null); hideTip();
    const info = countryInfo[f.id];
    const rel = byNum[f.id] || { out: [], in: [], via: [] };
    const group = groupById[f.id];
    const list = (title, arr) => arr.length ? `<h3>${title} · ${arr.length}</h3><ul class="rows">${arr.map(rowHtml).join("")}</ul>` : "";
    openPanel(`
      <div class="chips">${group ? `<span class="chip ${group === "china" || group === "partner" ? "cn" : group === "transit" ? "" : "us"}">${esc(GROUP_LABEL[group])}</span>` : ""}</div>
      <h2>${esc(f.properties.name)}</h2>
      ${info && info.reason ? `<p class="route">${esc(info.reason)}${info.source ? ` · <a href="${esc(info.source)}" target="_blank" rel="noopener noreferrer">source</a>` : ""}</p>` : ""}
      ${list("Lines out", rel.out)}${list("Lines in", rel.in)}${list("Passes through", rel.via)}
      ${!rel.out.length && !rel.in.length && !rel.via.length ? `<p class="route">No tracked lines start, end or pass through here.</p>` : ""}`);
    wireRows(panelBody);
  }

  // guided tour
  const stepMeta = document.getElementById("step-meta"), stepTitle = document.getElementById("step-title"), stepText = document.getElementById("step-text");
  const prevBtn = document.getElementById("prev"), nextBtn = document.getElementById("next"), expandBtn = document.getElementById("expand-all");
  const dots = d3.select("#dots").selectAll("button").data(STEPS).join("button")
    .attr("class", "dot-btn").attr("aria-label", (d, i) => i ? `Step ${i}: ${d.title}` : "Overview")
    .on("click", (e, d) => goStep(STEPS.indexOf(d)));
  function goStep(n) {
    step = n;
    setFocus(null);
    const s = STEPS[n];
    stepMeta.textContent = n ? `Step ${n} of ${STEPS.length - 1}` : "Overview";
    stepTitle.textContent = n ? s.title : "Click a line to see what it carries";
    stepText.textContent = s.text;
    prevBtn.disabled = n === 0;
    nextBtn.textContent = n === 0 ? "Start the tour" : n === STEPS.length - 1 ? "Explore the full map" : "Next";
    expandBtn.hidden = n !== 0;
    dots.attr("aria-current", (d, i) => i === n ? "step" : null);
    mapEl.classList.toggle("step-projects", !!s.projects);
    panel.classList.remove("open"); selectedId = null;
    setActive(null);
    const pts = n === 0 ? [] : s.projects ? DATA.projects : items.filter(d => s.test(d) && filterOk(d)).flatMap(d => d.pts);
    svg.transition().duration(reduceMotion ? 0 : 900).call(zoom.transform, n === 0 ? d3.zoomIdentity : fitTo(pts));
  }
  prevBtn.addEventListener("click", () => goStep(Math.max(0, step - 1)));
  nextBtn.addEventListener("click", () => goStep(step === STEPS.length - 1 ? 0 : step + 1));
  expandBtn.addEventListener("click", () => {
    if (expandAll || expanded.size) { expandAll = false; expanded.clear(); closePanel(); }
    else { expandAll = true; setFocus(null); }
    applyVisibility();
  });

  document.getElementById("close").addEventListener("click", closePanel);
  document.getElementById("index-close").addEventListener("click", () => toggleIndex(false));
  indexBtn.addEventListener("click", () => toggleIndex(!indexEl.classList.contains("open")));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { if (panel.classList.contains("open")) closePanel(); else toggleIndex(false); }
  });
  catSelect.addEventListener("change", () => { cat = catSelect.value; applyFilters(); });
  document.querySelectorAll("[data-f]").forEach(btn => {
    const f = btn.dataset.f;
    btn.addEventListener("click", () => {
      const on = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(on));
      if (f in kindOn) { kindOn[f] = on; applyFilters(); } else { mapEl.classList.toggle("hide-" + f, !on); schedule(); }
    });
  });

  document.getElementById("zin").addEventListener("click", () => svg.transition().duration(250).call(zoom.scaleBy, 1.6));
  document.getElementById("zout").addEventListener("click", () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.6));
  document.getElementById("zreset").addEventListener("click", () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity));

  if (narrow() || window.innerHeight < 900) document.getElementById("legend-details").open = false;
  window.addEventListener("resize", () => { svg.call(zoom.transform, d3.zoomIdentity); layout(); });
  goStep(0);
  layout();
  applyFilters();
  setTimeout(() => mapEl.classList.add("settled"), reduceMotion ? 0 : 3500);
})();

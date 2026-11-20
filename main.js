/* 2026 — orchestration: scroll acts, ASCII stage, DOM overlays, signals.
   Nothing here leaves the browser. */
(() => {
  "use strict";
  const COPY = window.SCENE_COPY || {};
  const { Stage, hash } = window.ASCII;
  const OB = window.ASCII.Objects;
  const stateApi = window.EXHIBITION_STATE;
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const ascii = (s) => String(s == null ? "" : s).replace(/[^\x20-\x7e]/g, "?");

  /* ═════════════ signals (browser-only) ═════════════ */
  const ALL_KEYS = [
    "document.cookie", "navigator.cookieEnabled", "performance.resources", "navigator.language", "navigator.languages",
    "Intl.timeZone", "Date", "window.inner", "screen", "devicePixelRatio", "screen.colorDepth", "screen.orientation",
    "maxTouchPoints", "hardwareConcurrency", "deviceMemory", "connection", "navigator.onLine", "userAgent",
    "navigator.platform", "prefers-color-scheme", "prefers-reduced-motion", "document.referrer", "history.length",
    "WEBGL_debug_renderer_info", "pointer", "pointer.trail", "scrollY", "scrollSpeed", "dwell", "click",
    "visibility.hidden", "resize", "performance.now",
  ];
  const DETAILS = {
    cookie: ["document.cookie", "navigator.cookieEnabled"],
    cache: ["performance.resources"],
    algo: ["navigator.language", "Intl.timeZone", "pointer", "pointer.trail", "dwell", "click", "scrollY", "scrollSpeed", "visibility.hidden"],
  };
  const RECAP = [...new Set([...DETAILS.cookie, ...DETAILS.cache, ...DETAILS.algo])];
  const ORDERED_KEYS = [...RECAP, ...ALL_KEYS.filter((k) => !RECAP.includes(k))];
  const ALIAS = { scrollSpeed: "scroll_speed", pointer: "cursor_move", "pointer.trail": "cursor_trail", "Intl.timeZone": "timezone", "navigator.language": "language", "window.inner": "viewport", Date: "timestamp" };

  const D = {
    client: { x: 0, y: 0 },
    clicks: 0,
    keys: 0,
    resizes: 0,
    hidden: 0,
    trail: [], // client coords
    cells: [], // cell coords for the ledger
    speed: 0,
    speeds: [],
    dwell: {},
    gpu: "",
    wiped: false,
  };

  /* real, first-party cookies: planted on arrival, readable by this page, removable at the end */
  function readCookies() {
    if (!document.cookie) return [];
    return document.cookie.split(/;\s*/).map((c) => {
      const i = c.indexOf("=");
      return [c.slice(0, i), c.slice(i + 1)];
    });
  }
  function setCookie(name, value) {
    document.cookie = name + "=" + encodeURIComponent(value) + "; Max-Age=" + 60 * 60 * 24 * 30 + "; Path=/; SameSite=Lax";
  }
  function plantCookies() {
    if (!stateApi) return;
    const have = {};
    readCookies().forEach(([n, v]) => (have[n] = v));
    const visits = (parseInt(have.visits, 10) || 0) + 1;
    setCookie("visitor_id", have.visitor_id || stateApi.getVisitorId());
    setCookie("first_seen", have.first_seen ? decodeURIComponent(have.first_seen) : new Date().toISOString());
    setCookie("visits", String(visits));
  }
  function clearCookies() {
    readCookies().forEach(([n]) => {
      document.cookie = n + "=; Max-Age=0; Path=/";
    });
  }

  function readGpu() {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
      if (!gl) return "";
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || "");
    } catch (e) {
      return "";
    }
  }

  function fileOf(url) {
    try {
      const parts = new URL(url, location.href).pathname.split("/");
      return parts[parts.length - 1] || url;
    } catch (e) {
      return String(url).split("/").pop();
    }
  }

  function snapshot() {
    const conn = navigator.connection || {};
    const res = [...new Set(performance.getEntriesByType("resource").map((e) => fileOf(e.name)))].slice(0, 24);
    const dwell = Object.keys(D.dwell).map((k) => k + ":" + Math.round(D.dwell[k])).join(" ");
    return {
      "document.cookie": document.cookie || "",
      "navigator.cookieEnabled": navigator.cookieEnabled ? "1" : "0",
      "performance.resources": res.join(" "),
      "navigator.language": navigator.language || "",
      "navigator.languages": (navigator.languages || []).join(" "),
      "Intl.timeZone": Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      Date: new Date().toISOString(),
      "window.inner": window.innerWidth + " " + window.innerHeight,
      screen: screen.width + " " + screen.height,
      devicePixelRatio: String(window.devicePixelRatio || ""),
      "screen.colorDepth": String(screen.colorDepth || ""),
      "screen.orientation": screen.orientation ? screen.orientation.type : "",
      maxTouchPoints: String(navigator.maxTouchPoints || 0),
      hardwareConcurrency: String(navigator.hardwareConcurrency || ""),
      deviceMemory: navigator.deviceMemory ? String(navigator.deviceMemory) : "",
      connection: [conn.effectiveType, conn.downlink, conn.rtt].filter((v) => v != null && v !== "").join(" "),
      "navigator.onLine": navigator.onLine ? "1" : "0",
      userAgent: navigator.userAgent || "",
      "navigator.platform": navigator.platform || "",
      "prefers-color-scheme": window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      "prefers-reduced-motion": reduced ? "reduce" : "no-preference",
      "document.referrer": document.referrer || "",
      "history.length": String(history.length),
      WEBGL_debug_renderer_info: D.gpu,
      pointer: Math.round(D.client.x) + " " + Math.round(D.client.y),
      "pointer.trail": D.trail.map((p) => p[0] + "," + p[1]).join(" "),
      scrollY: String(Math.round(window.scrollY)),
      scrollSpeed: String(Math.round(D.speed)),
      dwell,
      click: String(D.clicks),
      "visibility.hidden": String(D.hidden),
      resize: String(D.resizes),
      "performance.now": String(Math.round(performance.now())),
      visitor_id: stateApi ? stateApi.getVisitorId() : "",
    };
  }

  function logLine(key, value) {
    const label = ALIAS[key] || key;
    return new Date().toTimeString().slice(0, 8) + " " + label + "=" + String(value == null ? "" : value);
  }

  function allLogLines() {
    const s = snapshot();
    return ORDERED_KEYS.map((k) => logLine(k, s[k]));
  }

  /* ═════════════ acts (the scroll timeline) ═════════════ */
  const DEFS = [
    { id: "tower", vh: 500 },
    { id: "t12", vh: 70 },
    { id: "s2", vh: 320 },
    { id: "t23", vh: 150 },
    { id: "s3", vh: 320 },
    { id: "t34", vh: 100 },
    { id: "s4", vh: 450 },
    { id: "t45", vh: 90 },
    { id: "s5", vh: 260 },
  ];
  let acts = [];
  let totalLen = 1;

  function layout() {
    const H = window.innerHeight;
    let y = 0;
    acts = DEFS.map((d) => {
      const len = (d.vh / 100) * H;
      const a = { id: d.id, start: y, len, end: y + len };
      y += len;
      return a;
    });
    totalLen = y;
    $("track").style.height = y + H + "px";
  }

  function locate() {
    const y = window.scrollY;
    let a = acts[acts.length - 1];
    for (const x of acts) {
      if (y < x.end) {
        a = x;
        break;
      }
    }
    return { act: a, p: clamp((y - a.start) / a.len, 0, 1) };
  }

  function sceneOf(id, p) {
    switch (id) {
      case "tower": return 1;
      case "t12": return p < 0.5 ? 1 : 2;
      case "s2": return 2;
      case "t23": return p < 0.5 ? 2 : 3;
      case "s3": return 3;
      case "t34": return p < 0.5 ? 3 : 4;
      case "s4": return 4;
      case "t45": return p < 0.5 ? 4 : 5;
      default: return 5;
    }
  }

  /* ═════════════ ASCII box (frame made of characters) ═════════════ */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function abox(title, bodyChildren, onClose) {
    const root = el("div", "abox");
    const top = el("div", "abox__top");
    top.append(el("span", null, "+"), el("span", "abox__title", title), el("span", "abox__fill", "-".repeat(160)));
    if (onClose) {
      const x = el("button", "abox__x", "[x]");
      x.type = "button";
      x.setAttribute("aria-label", "닫기");
      x.addEventListener("click", (e) => {
        e.stopPropagation();
        onClose();
      });
      top.append(x);
    }
    top.append(el("span", null, "+"));
    const mid = el("div", "abox__mid");
    const body = el("div", "abox__body");
    bodyChildren.forEach((c) => body.append(c));
    mid.append(el("span", "abox__bar abox__bar--l", "|\n".repeat(48)), body, el("span", "abox__bar abox__bar--r", "|\n".repeat(48)));
    const bot = el("div", "abox__bot");
    bot.append(el("span", null, "+"), el("span", "abox__fill", "-".repeat(160)), el("span", null, "+"));
    root.append(top, mid, bot);
    return root;
  }

  /* ═════════════ S1 hero (types itself, then waits) ═════════════ */
  const S1 = {
    start: 0,
    update(now) {
      const hero = COPY.hero || "";
      const subs = COPY.heroSub || [];
      const el1 = $("hero");
      const t = reduced ? 1e9 : now - this.start;
      const n0 = Math.floor(clamp((t - 500) / 70, 0, hero.length));
      el1.textContent = hero.slice(0, n0);
      const t1 = t - 500 - hero.length * 70 - 300;
      const n1 = Math.floor(clamp(t1 / 28, 0, subs[0].length));
      $("hero-sub1").textContent = (subs[0] || "").slice(0, n1);
      const t2 = t1 - subs[0].length * 28 - 250;
      const n2 = Math.floor(clamp(t2 / 28, 0, subs[1].length));
      $("hero-sub2").textContent = (subs[1] || "").slice(0, n2);
    },
  };

  /* ═════════════ S2 stream + popups ═════════════ */
  const MAX_POPUPS = 15;
  const S2 = { started: false, idx: 0, queue: [], timer: 0, popupN: 0, p: 0 };

  function buildStreamQueue() {
    const s = snapshot();
    const sig = [
      "visitor_id=" + s.visitor_id,
      "timezone=" + s["Intl.timeZone"],
      "language=" + s["navigator.language"],
      "screen=" + s["window.inner"],
      "scroll_speed=" + s.scrollSpeed,
      "pointer=" + s.pointer,
      "cookie=" + (s["document.cookie"] || "(none)"),
      "referrer=" + (s["document.referrer"] || "(none)"),
    ];
    readCookies()
      .reverse()
      .forEach(([n, v]) => sig.unshift("cookie." + n + "=" + decodeURIComponent(v)));
    const paras = COPY.mixChunks || [];
    const q = [];
    for (let i = 0; i < paras.length * 2; i += 1) {
      q.push(i % 2 === 0 ? { type: "prose", text: paras[(i / 2) % paras.length] } : { type: "signal", text: sig[Math.floor(i / 2) % sig.length] });
      if (i % 5 === 4) q.push({ type: "refrain", text: COPY.streamRefrain });
    }
    return q;
  }

  function appendBlock(b) {
    const stream = $("stream");
    const p = el("p", "stream-block stream-block--" + b.type);
    if (b.type === "signal") {
      const i = b.text.indexOf("=");
      const k = el("span", "stream-key", b.text.slice(0, i));
      p.append(k, document.createTextNode(b.text.slice(i)));
    } else {
      p.textContent = b.text;
    }
    stream.append(p);
    while (stream.children.length > 30) stream.firstElementChild.remove();
  }

  function tickStream() {
    if (S2.idx >= S2.queue.length) {
      S2.queue = buildStreamQueue();
      S2.idx = 0;
    }
    appendBlock(S2.queue[S2.idx]);
    S2.idx += 1;
    const delay = reduced ? 1600 : 1900 - S2.p * 1750;
    S2.timer = window.setTimeout(tickStream, Math.max(110, delay));
  }

  function startStream() {
    if (S2.started) return;
    S2.started = true;
    S2.queue = buildStreamQueue();
    spawnPopups(1);
    tickStream();
  }

  function popupDetail(spec) {
    const s = snapshot();
    const keys = DETAILS[spec.detailKey] || [];
    return "무엇을: " + spec.message + "\n어떻게:\n" + keys.map((k) => k + "=" + String(s[k] == null ? "" : s[k]).slice(0, 70)).join("\n");
  }

  function createPopup(spec) {
    const msg = el("p", "abox__msg", spec.message);
    const detail = el("pre", "abox__detail", "");
    const box = abox(spec.name, [msg, detail], () => {
      box.remove();
      spawnPopups(2);
    });
    let t0 = 0;
    box.addEventListener("mouseenter", () => {
      detail.textContent = popupDetail(spec);
      t0 = performance.now();
    });
    box.addEventListener("mouseleave", () => {
      if (t0 && stateApi) stateApi.recordPopupHover(spec.id, performance.now() - t0);
      t0 = 0;
    });
    return box;
  }

  function spawnPopups(n) {
    const root = $("popups");
    const list = COPY.popups || [];
    for (let i = 0; i < n; i += 1) {
      if (root.children.length >= MAX_POPUPS) break;
      root.prepend(createPopup(list[S2.popupN % list.length]));
      S2.popupN += 1;
    }
  }

  function updateS2(p) {
    S2.p = p;
    startStream();
    const target = Math.min(MAX_POPUPS, Math.round(p * MAX_POPUPS * 1.25) + 1);
    while ($("popups").children.length < target) spawnPopups(1);
  }

  /* ═════════════ S3 ledger ═════════════ */
  const S3 = { logCount: 0, labels: [], labelCount: 0, lastLive: 0 };

  function updateS3(p, now) {
    const log = $("obs-log");
    const lines = allLogLines();
    const want = Math.max(1, Math.round(clamp(p / 0.85, 0, 1) * lines.length));
    while (S3.logCount < want) {
      const li = el("li", null, lines[S3.logCount] || "");
      log.append(li);
      S3.logCount += 1;
    }
    if (S3.logCount >= lines.length && now - S3.lastLive > 900) {
      S3.lastLive = now;
      const s = snapshot();
      const k = ["pointer", "scrollSpeed", "click", "Date"][Math.floor(now / 900) % 4];
      log.append(el("li", null, logLine(k, s[k])));
    }
    while (log.children.length > 60) log.firstElementChild.remove();
    if (!stateApi) return;
    S3.labels = stateApi.buildProfileLabels(snapshot(), COPY);
    const nl = Math.round(clamp(p / 0.8, 0, 1) * S3.labels.length);
    const ul = $("labels");
    while (ul.children.length < nl) {
      const item = S3.labels[ul.children.length];
      ul.append(el("li", null, "「" + item.text + "」"));
    }
    if (p > 0.78) $("summary").textContent = stateApi.summaryLabel(S3.labels);
    const idle = stateApi.isIdle();
    $("idle").hidden = !idle;
    if (idle) $("idle").textContent = COPY.scene03Idle;
  }

  /* ═════════════ S4 cards ═════════════ */
  const S4 = { base: [], extra: [], ready: false, hot: -1, interested: 0, nextN: 1 };
  const Cyl = OB.Cylinder;

  function labelVars() {
    const labels = stateApi ? stateApi.buildProfileLabels(snapshot(), COPY) : [];
    const m = {};
    labels.forEach((l) => (m[l.id] = l.text));
    return m;
  }

  function fillTpl(tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] || "");
  }

  function makeCard(def, vars, snap, extra) {
    const labelText = vars[def.label] || "(unclassified)";
    const sig = ascii(def.signal + "=" + String(snap[def.signal] == null ? "" : snap[def.signal]).slice(0, 18));
    const n = S4.nextN;
    S4.nextN += 1;
    return {
      n,
      tag: def.tag,
      def,
      body: fillTpl(def.tpl, vars),
      why: [sig, labelText, "card #" + String(n).padStart(3, "0")],
      sim: !!extra,
      from: extra ? extra.n : 0,
    };
  }

  function ensureCards() {
    if (S4.ready) return;
    S4.ready = true;
    const vars = labelVars();
    const snap = snapshot();
    const types = COPY.cardTypes || [];
    for (let i = 0; i < 60; i += 1) S4.base.push(makeCard(types[i % types.length], vars, snap));
  }

  function visibleCards(p) {
    const k = clamp(Math.round(3 + p * 57), 3, 60);
    return S4.base.slice(0, k).concat(S4.extra);
  }

  function addSimilar(card) {
    const vars = labelVars();
    const snap = snapshot();
    for (let i = 0; i < 3; i += 1) {
      if (S4.base.length + S4.extra.length >= Cyl.capacity() - 2) break;
      S4.extra.push(makeCard(card.def, vars, snap, card));
    }
    S4.interested += 1;
  }

  /* ═════════════ S5 telescreen ═════════════ */
  const S5 = { font: null, slider: 1, b: 1, state: "bright", eraseP: 0, holding: false, done: false, lines: [], built: false, doneAt: 0, freezeUntil: 0, erased: [] };

  function buildTeleLines() {
    const lines = allLogLines().map(ascii);
    const labels = (S3.labels || []).map((l) => "label: " + ascii(l.text));
    const q = COPY.quotes || {};
    const quotes = [q.dimmed, q.simultaneous, q.overheard, q.eyes].filter(Boolean).map((x) => ascii(x.text));
    const out = [];
    lines.forEach((l, i) => {
      out.push(l);
      if (i % 3 === 2 && quotes.length) out.push(quotes[(i / 3) % quotes.length | 0]);
    });
    out.push("BIG BROTHER IS WATCHING YOU");
    S5.lines = out.concat(labels);
    S5.built = true;
  }

  function overheardLines() {
    const sec = stateApi ? stateApi.getSessionSeconds() : 0;
    return [
      "overheard.click=" + D.clicks,
      "overheard.keydown=" + D.keys,
      "overheard.session_s=" + sec,
    ];
  }

  function sliderText(v) {
    const W = 34;
    const n = Math.round(v * W);
    return "[" + "#".repeat(n) + '<span class="thumb">|</span>' + "-".repeat(W - n) + "] " + String(Math.round(v * 100)).padStart(3, " ") + "%";
  }

  function renderSlider() {
    const s = $("slider");
    s.innerHTML = sliderText(S5.slider);
    s.setAttribute("aria-valuenow", String(Math.round(S5.slider * 100)));
  }

  function sliderFromEvent(e) {
    const r = $("slider").getBoundingClientRect();
    const left = r.left + r.width * 0.025;
    const width = r.width * 0.85;
    S5.slider = clamp((e.clientX - left) / width, 0, 1);
    renderSlider();
  }

  function setupS5() {
    $("s5-quote").textContent = (COPY.quotes.dimmed || {}).text || "";
    $("s5-ko").textContent = COPY.s5Dim || "";
    $("s5-quote2").textContent = (COPY.quotes.overheard || {}).text || "";
    $("erase-btn").textContent = "[ " + (COPY.s5Erase || "") + " ]";
    $("final-line").textContent = COPY.s5Final || "";
    $("restart-btn").textContent = "[ " + (COPY.restartLabel || "") + " ]";
    renderSlider();
    const sl = $("slider");
    sl.addEventListener("pointerdown", (e) => {
      sl.setPointerCapture(e.pointerId);
      sliderFromEvent(e);
      const move = (ev) => sliderFromEvent(ev);
      const up = () => {
        sl.removeEventListener("pointermove", move);
        sl.removeEventListener("pointerup", up);
      };
      sl.addEventListener("pointermove", move);
      sl.addEventListener("pointerup", up);
    });
    sl.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") S5.slider = clamp(S5.slider - 0.05, 0, 1);
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") S5.slider = clamp(S5.slider + 0.05, 0, 1);
      else return;
      e.preventDefault();
      renderSlider();
    });
    const btn = $("erase-btn");
    const hold = () => {
      if (!S5.done) S5.holding = true;
    };
    const release = () => {
      S5.holding = false;
    };
    btn.addEventListener("pointerdown", hold);
    window.addEventListener("pointerup", release);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        hold();
      }
    });
    btn.addEventListener("keyup", release);
    btn.addEventListener("blur", release);
    $("restart-btn").addEventListener("click", () => {
      try {
        history.scrollRestoration = "manual";
      } catch (e) {}
      window.scrollTo(0, 0);
      location.reload();
    });
  }

  function fillEraseLog() {
    const ul = $("erase-log");
    if (ul.dataset.built) return;
    ul.dataset.built = "1";
    S5.erased = overheardLines().concat(allLogLines());
    S5.erased.forEach((l) => ul.append(el("li", null, l)));
  }

  function wipeAll() {
    D.wiped = true;
    D.trail.length = 0;
    D.cells.length = 0;
    D.speeds.length = 0;
    D.dwell = {};
    D.clicks = 0;
    D.keys = 0;
    S4.extra.length = 0;
    S3.labels = [];
    clearCookies();
    try {
      sessionStorage.removeItem("exhibition_visitor_id");
    } catch (e) {}
  }

  function updateS5(p, dt, now) {
    if (!S5.built) buildTeleLines();
    const capScroll = 1 - clamp((p - 0.35) / 0.5, 0, 1);
    if (!S5.done) S5.slider = Math.min(S5.slider, capScroll);
    S5.b = S5.slider;
    renderSlider();
    const dark = S5.b < 0.04;
    if (S5.done) {
      S5.state = "done";
    } else if (S5.eraseP > 0 || S5.holding) {
      S5.state = "erasing";
    } else {
      S5.state = dark ? "dark" : "bright";
    }
    const showDark = (S5.state === "dark" || S5.state === "erasing") && !S5.done;
    $("s5-dark").hidden = !showDark;
    $("s5-dim").hidden = S5.state === "erasing" || S5.done;
    $("s5-quote").parentElement.hidden = showDark || S5.done;
    $("s5-final").hidden = !S5.done;
    if (showDark) fillEraseLog();
    if (S5.eraseP === 0 && !S5.holding && !S5.done) $("erase-btn").textContent = "[ " + (COPY.s5Erase || "") + " ]";
    if (S5.state === "erasing" || S5.holding) {
      S5.eraseP = clamp(S5.eraseP + (S5.holding ? dt / 3.2 : -dt / 7), 0, 1);
      const ul = $("erase-log");
      const total = S5.erased.length;
      const keep = Math.ceil((1 - S5.eraseP) * total);
      [...ul.children].forEach((li, i) => (li.style.visibility = i < keep ? "visible" : "hidden"));
      $("erase-btn").textContent = "[ " + (COPY.s5Erasing || "") + " " + "#".repeat(Math.round(S5.eraseP * 16)).padEnd(16, "-") + " ]";
      if (S5.eraseP >= 1) {
        S5.done = true;
        S5.holding = false;
        S5.doneAt = now;
        wipeAll();
        if (stateApi) S5.recFrozen = stateApi.getSessionSeconds();
        $("rec-dot").classList.add("is-off");
      }
    }
  }

  /* ═════════════ rendering ═════════════ */
  const ease = (t) => t * t * (3 - 2 * t);
  let lastCyl = null;
  let logStr = "BIG BROTHER IS WATCHING YOU ";
  let frozenFrame = false;

  function base(extra) {
    return Object.assign({ cols: Stage.cols, rows: Stage.rows, aspect: Stage.aspect, ptr: Stage.ptr, t: reduced ? 0 : performance.now() / 1000 }, extra);
  }

  function labelRects() {
    if (!ov[3].classList.contains("is-on")) return [];
    return [...$("labels").children].map((li) => {
      const r = li.getBoundingClientRect();
      return { x: r.left / Stage.cellW, y: (r.top + r.height / 2) / Stage.cellH };
    });
  }

  function s3ctx(scan) {
    return base({ trail: D.cells, speeds: D.speeds, scan, labelRects: labelRects() });
  }

  function cylCtx(p4) {
    const t = reduced ? 0 : performance.now() / 1000;
    const nx = (Stage.ptr.x / Stage.cols - 0.5) * 2;
    return base({
      p: p4,
      zoom: 1,
      rot: (p4 - 0.5) * 300 + nx * 40 + Math.sin(t * 0.12) * 8,
      bob: Math.sin(t * 0.2) * 1.2,
    });
  }

  function drawCylinder(buf, p4) {
    const c = cylCtx(p4);
    Cyl.setCards(visibleCards(p4));
    Cyl.draw(buf, c);
    lastCyl = c;
  }

  function renderFrame(act, p) {
    const { A, B, C, O, cols, rows } = Stage;
    const cx = cols / 2;
    const cy = rows / 2;
    switch (act.id) {
      case "tower":
        OB.tower(O, base({ p, cutout: { x0: 0, y0: Math.floor(rows * 0.58), x1: Math.floor(cols * 0.7), y1: Math.floor(rows * 0.96) } }));
        break;
      case "t12": {
        OB.tower(A, base({ p: 1 }));
        OB.s2bg(B, base({ p: 0 }));
        const scan = Math.floor(p * rows);
        const out = O;
        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < cols; x += 1) {
            const i = y * cols + x;
            out.copyCell(y < scan ? B : A, i);
          }
        }
        for (let x = 0; x < cols; x += 1) out.set(x, scan, 61, 0); // '='
        break;
      }
      case "s2":
        OB.s2bg(O, base({ p }));
        break;
      case "t23": {
        OB.s2bg(A, base({ p: 1 }));
        const fc = base({ p, logStr });
        OB.funnel(C, fc);
        OB.s3bg(B, s3ctx(0));
        const rh = OB.funnelHole(fc);
        const a = clamp(p / 0.3, 0, 1);
        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < cols; x += 1) {
            const i = y * cols + x;
            const r = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * Stage.aspect);
            if (r < rh - 1.5) O.copyCell(B, i);
            else if (hash(x, y, 4) >= a) O.copyCell(A, i);
            else O.copyCell(C, i);
          }
        }
        break;
      }
      case "s3":
        OB.s3bg(O, s3ctx(clamp(p / 0.7, 0, 1)));
        break;
      case "t34": {
        OB.s3bg(A, s3ctx(1));
        drawCylinder(B, 0);
        const q = Math.floor(p * 10) / 10;
        const half = q * (cols / 2 + 2);
        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < cols; x += 1) {
            const i = y * cols + x;
            O.copyCell(Math.abs(x + 0.5 - cx) < half ? B : A, i);
          }
          if (q > 0) {
            O.set(Math.floor(cx - half), y, 124, 0);
            O.set(Math.floor(cx + half), y, 124, 0);
          }
        }
        break;
      }
      case "s4":
        drawCylinder(O, p);
        break;
      case "t45": {
        drawCylinder(A, 1);
        OB.telescreen(B, base({ b: 1, lines: S5.lines, dark: false }));
        const q = Math.min(1, Math.ceil(p * 8) / 8);
        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < cols; x += 1) {
            const i = y * cols + x;
            const inside = Math.abs(x + 0.5 - cx) / (cols / 2) < q && Math.abs(y + 0.5 - cy) / (rows / 2) < q;
            O.copyCell(inside ? B : A, i);
            if (inside) {
              const edgeX = Math.abs(x + 0.5 - cx) / (cols / 2) > q - 1.2 / cols * 2;
              const edgeY = Math.abs(y + 0.5 - cy) / (rows / 2) > q - 1.2 / rows * 2;
              if (edgeX || edgeY) O.set(x, y, 35, 0); // '#'
            }
          }
        }
        break;
      }
      default: {
        const done = S5.done;
        const dk = S5.b < 0.04 && !done;
        const word = done ? "ERASED" : dk || S5.state === "erasing" ? "OVERHEARD" : "";
        OB.telescreen(O, base({
          b: done ? 0 : S5.b,
          lines: S5.lines,
          dark: dk,
          open: done ? 0 : S5.state === "erasing" ? 1 - S5.eraseP * 0.9 : undefined,
          bigLines: word && S5.font ? OB.bigLines(S5.font, word) : [],
          tag: done ? "SUBJECT: ERASED" : dk ? "SUBJECT: UNSEEN, NOT UNHEARD" : "SUBJECT: YOU",
        }));
      }
    }
  }

  /* ═════════════ chrome + overlays ═════════════ */
  const ov = { 1: $("ov1"), 2: $("ov2"), 3: $("ov3"), 4: $("ov4"), 5: $("ov5") };
  let lastScene = 0;

  function setOverlays(act, p, frozen) {
    const id = act.id;
    ov[1].classList.toggle("is-on", id === "tower" || id === "t12");
    ov[2].classList.toggle("is-on", id === "t12" || id === "s2" || (id === "t23" && p < 0.45));
    ov[3].classList.toggle("is-on", (id === "t23" && p >= 0.8) || id === "s3" || (id === "t34" && p < 0.3));
    ov[4].classList.toggle("is-on", (id === "t34" && p >= 0.5) || id === "s4" || (id === "t45" && p < 0.4));
    ov[5].classList.toggle("is-on", id === "s5" && !frozen);
    if (id === "t12") {
      const y = Math.floor(p * Stage.rows) * Stage.cellH;
      ov[1].style.clipPath = "inset(" + y + "px 0 0 0)";
      ov[2].style.clipPath = "inset(0 0 " + Math.max(0, window.innerHeight - y) + "px 0)";
    } else {
      ov[1].style.clipPath = "";
      ov[2].style.clipPath = "";
    }
    // S2 collapses toward the funnel in steps
    const conv = id === "t23" ? Math.floor(clamp(p / 0.4, 0, 1) * 6) / 6 : 0;
    ov[2].style.setProperty("--conv", String(conv));
    const cols2 = ov[2].querySelector(".cols");
    cols2.style.transform = conv > 0 ? "scale(" + (1 - conv) + ")" : "";
    cols2.style.transformOrigin = "50% 30%";
    ov[2].querySelector(".scene-title").style.visibility = conv > 0.3 ? "hidden" : "";
    ov[2].querySelector(".note").style.visibility = conv > 0 ? "hidden" : "";
    ov[2].querySelector(".stat").style.visibility = conv > 0 ? "hidden" : "";
  }

  let lastFrameT = performance.now();
  let rafId = 0;
  let current = null;

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - lastFrameT) / 1000);
    lastFrameT = now;
    const { act, p } = locate();
    const scene = sceneOf(act.id, p);
    // dwell per scene
    const key = "s" + scene;
    D.dwell[key] = (D.dwell[key] || 0) + dt * 1000;

    // entering the telescreen: 0.6s of nothing
    if (current && current.id === "t45" && act.id === "s5" && !S5.freezeUntil) S5.freezeUntil = now + 600;
    const frozen = act.id === "s5" && now < S5.freezeUntil;
    window.__frozen = frozen;
    current = act;

    if (act.id === "tower" || act.id === "t12") S1.update(now);
    if (act.id === "s2" || act.id === "t12") updateS2(act.id === "t12" ? 0 : p);
    if (act.id === "t23" && p > 0.6) updateS3(0, now);
    if (act.id === "s3") updateS3(p, now);
    if (act.id === "t34" || act.id === "s4" || act.id === "t45") ensureCards();
    if (act.id === "t23" || act.id === "s3" || act.id === "t34") {
      logStr = ascii(ORDERED_KEYS.map((k) => ALIAS[k] || k).join("= ") + "= BIG BROTHER IS WATCHING YOU ");
    }
    if (act.id === "t45" && !S5.built) buildTeleLines();
    if (act.id === "s5" && !frozen) updateS5(p, dt, now);

    // S4 text
    const p4 = act.id === "s4" ? p : act.id === "t45" ? 1 : 0;
    if (act.id === "s4" || act.id === "t34" || act.id === "t45") {
      const n = S4.base.length ? visibleCards(p4).length : 0;
      $("s4-counter").textContent = "cards=" + n + "  interested=" + S4.interested;
      $("s4-end").hidden = !(act.id === "s4" ? p > 0.88 : act.id === "t45" && p < 0.4);
    }

    // chrome
    if (scene !== lastScene) {
      lastScene = scene;
      $("scene-label").textContent = "SCENE 0" + scene + " / 05";
    }
    const sec = S5.done && S5.recFrozen != null ? S5.recFrozen : stateApi ? stateApi.getSessionSeconds() : 0;
    $("rec-time").textContent = stateApi ? stateApi.formatRecTime(sec).padStart(5, "0") .replace(/^/, "00:") : "00:00:00";
    $("bar").style.width = clamp(window.scrollY / Math.max(1, totalLen), 0, 1) * 100 + "%";
    setOverlays(act, p, frozen);

    if (!frozen) {
      renderFrame(act, p);
      Stage.draw(Stage.O);
    }
  }

  /* ═════════════ input ═════════════ */
  function onPointer(e) {
    Cursor.move(e);
    D.client.x = e.clientX;
    D.client.y = e.clientY;
    const c = Stage.cellFromClient(e.clientX, e.clientY);
    Stage.ptr.x = c.x;
    Stage.ptr.y = c.y;
    Stage.ptr.active = true;
    const last = D.cells[D.cells.length - 1];
    if (!last || Math.abs(last[0] - c.x) + Math.abs(last[1] - c.y) > 2) {
      D.cells.push([Math.round(c.x), Math.round(c.y)]);
      D.trail.push([Math.round(e.clientX), Math.round(e.clientY)]);
      if (D.cells.length > 90) D.cells.shift();
      if (D.trail.length > 24) D.trail.shift();
    }
    if (current && current.id === "s4" && finePointer && Cyl && lastCyl) {
      const i = Cyl.pick(lastCyl, c.x, c.y);
      Cyl.setHot(i);
      Cursor.hot(i >= 0);
    }
  }

  function onClick(e) {
    D.clicks += 1;
    if (!current || current.id !== "s4" || e.target !== $("stage") || !lastCyl) return;
    const c = Stage.cellFromClient(e.clientX, e.clientY);
    const i = Cyl.pick(lastCyl, c.x, c.y);
    const list = visibleCards(locate().p);
    if (i >= 0 && list[i]) {
      addSimilar(list[i]);
      Cyl.setHot(i);
    }
  }

  let lastScrollY = window.scrollY;
  let lastScrollT = performance.now();
  function onScroll() {
    const now = performance.now();
    const dy = window.scrollY - lastScrollY;
    const dt = Math.max(1, now - lastScrollT);
    D.speed = D.speed * 0.6 + ((Math.abs(dy) / dt) * 1000) * 0.4;
    lastScrollY = window.scrollY;
    lastScrollT = now;
  }

  function jumpFromHash() {
    const m = /^#(\w+):([0-9.]+)/.exec(location.hash);
    if (!m) return;
    const a = acts.find((x) => x.id === m[1]);
    if (!a) return;
    window.scrollTo(0, a.start + a.len * clamp(parseFloat(m[2]), 0, 1) - (m[2] === "1" ? 1 : 0));
    const b = /b=([0-9.]+)/.exec(location.hash);
    if (b) S5.slider = clamp(parseFloat(b[1]), 0, 1);
  }

  window.__S5 = S5;
  window.__jump = (id, p) => {
    const a = acts.find((x) => x.id === id);
    if (a) window.scrollTo(0, a.start + a.len * clamp(p, 0, 1) - (p >= 1 ? 1 : 0));
  };

  /* ASCII cursor: a reticle that reads out where you are */
  const Cursor = {
    el: null,
    xy: null,
    seen: false,
    init() {
      this.el = $("cursor");
      this.xy = $("cursor-xy");
    },
    move(e) {
      if (!this.el) return;
      if (!this.seen) {
        this.seen = true;
        this.el.classList.add("is-seen");
      }
      this.el.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)";
      this.xy.textContent = String(Math.round(e.clientX)).padStart(4, "0") + "," + String(Math.round(e.clientY)).padStart(4, "0");
      const link = e.target && e.target.closest && e.target.closest("button, .abox, .slider, [role=slider]");
      this.el.classList.toggle("is-link", !!link);
    },
    hot(on) {
      if (this.el) this.el.classList.toggle("is-link", on);
    },
    down(on) {
      if (this.el) this.el.classList.toggle("is-down", on);
    },
  };

  function init() {
    fetch("vendor/figlet/Doom.flf").then((r) => r.text()).then((t) => { S5.font = OB.parseFlf(t); }).catch(() => {});
    plantCookies();
    Cursor.init();
    D.gpu = readGpu();
    Stage.init($("stage"));
    Stage.ptr.x = Stage.cols * 0.5;
    Stage.ptr.y = Stage.rows * 0.45;
    layout();
    setupS5();
    $("s2-title").textContent = COPY.scene02Header || "";
    $("s2-hint").textContent = COPY.scene02Hint || "";
    $("s2-stat").textContent = COPY.statLine || "";
    $("s3-title").textContent = COPY.scene03Header || "";
    $("s3-sub").textContent = COPY.scene03Sub || "";
    $("privacy").textContent = COPY.privacyNotice || "";
    $("s4-title").textContent = COPY.scene04Header || "";
    $("s4-hint").textContent = COPY.scene04Hint || "";
    $("s4-end").textContent = COPY.scene04End || "";
    S1.start = performance.now();
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("click", onClick);
    window.addEventListener("pointerdown", () => Cursor.down(true));
    window.addEventListener("pointerup", () => Cursor.down(false));
    window.addEventListener("keydown", () => (D.keys += 1));
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", (e) => { if (window.__frozen) e.preventDefault(); }, { passive: false });
    window.addEventListener("touchmove", (e) => { if (window.__frozen) e.preventDefault(); }, { passive: false });
    document.addEventListener("visibilitychange", () => { if (document.hidden) D.hidden += 1; });
    window.addEventListener("resize", () => {
      D.resizes += 1;
      const frac = totalLen ? window.scrollY / totalLen : 0;
      Stage.resize();
      layout();
      window.scrollTo(0, frac * totalLen);
    });
    window.setInterval(() => {
      D.speed *= 0.82;
      D.speeds.push(D.speed);
      if (D.speeds.length > 160) D.speeds.shift();
    }, 100);
    try {
      history.scrollRestoration = "manual";
    } catch (e) {}
    jumpFromHash();
    rafId = requestAnimationFrame(frame);
  }

  const fontReady = Promise.race([
    Promise.all([document.fonts.load('12px "IBM Plex Mono"'), document.fonts.load("600 12px Pretendard")]),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  fontReady.then(init, init);
})();

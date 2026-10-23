(() => {
  const ALL_KEYS = [
    "document.cookie",
    "navigator.cookieEnabled",
    "performance.resources",
    "navigator.language",
    "navigator.languages",
    "Intl.timeZone",
    "Date",
    "window.inner",
    "screen",
    "devicePixelRatio",
    "screen.colorDepth",
    "screen.orientation",
    "maxTouchPoints",
    "hardwareConcurrency",
    "deviceMemory",
    "connection",
    "navigator.onLine",
    "userAgent",
    "navigator.platform",
    "prefers-color-scheme",
    "prefers-reduced-motion",
    "document.referrer",
    "history.length",
    "WEBGL_debug_renderer_info",
    "pointer",
    "pointer.trail",
    "scrollY",
    "scrollSpeed",
    "dwell",
    "click",
    "visibility.hidden",
    "resize",
    "camera",
    "deviceorientation",
    "performance.now",
  ];

  const FEEDS = {
    youtube: ["navigator.language", "navigator.languages", "Intl.timeZone", "Date", "window.inner", "dwell"],
    ad: ["prefers-color-scheme", "screen", "devicePixelRatio", "document.referrer", "pointer", "pointer.trail"],
    spam: ["document.cookie", "history.length", "performance.resources", "WEBGL_debug_renderer_info", "hardwareConcurrency", "deviceMemory", "connection"],
  };

  const DETAILS = {
    cookie: ["document.cookie", "navigator.cookieEnabled"],
    cache: ["performance.resources"],
    algo: ["navigator.language", "Intl.timeZone", "pointer", "pointer.trail", "dwell", "click", "scrollY", "scrollSpeed", "visibility.hidden"],
  };

  const RECAP_KEYS = [...new Set([...DETAILS.cookie, ...DETAILS.cache, ...DETAILS.algo])];
  const ORDERED_KEYS = [...RECAP_KEYS, ...ALL_KEYS.filter((key) => !RECAP_KEYS.includes(key))];

  const COPY = window.SCENE_COPY || {};
  const POPUPS = COPY.popups || [];
  const MIX_CHUNKS = COPY.mixChunks || [];
  const STREAM_REFRAIN = COPY.streamRefrain || "BIG BROTHER IS WATCHING YOU";
  const CARD_TEMPLATES = COPY.cardTemplates || {};

  const SCENE02_SPLIT_START = 0.12;
  const SCENE02_SPLIT_END = 0.42;
  const MAX_POPUPS = 15;

  const eyeEl = document.getElementById("eye");
  const streamEl = document.getElementById("stream");
  const popupStack = document.getElementById("popup-stack");
  const sheet02 = document.getElementById("sheet-02");
  const cut02Aside = document.getElementById("cut02-aside");
  const cut02 = document.getElementById("cut-02");
  const obsLog = document.getElementById("obs-log");
  const profileLabels = document.getElementById("profile-labels");
  const profileSummary = document.getElementById("profile-summary");
  const idleHint = document.getElementById("idle-hint");
  const cardGrid = document.getElementById("card-grid");
  const scene04End = document.getElementById("scene04-end");
  const windowsRoot = document.getElementById("windows");
  const closing = document.getElementById("closing");
  const travel = document.getElementById("travel");
  const cut03 = document.getElementById("cut-03");
  const cut04 = document.getElementById("cut-04");
  const cut05 = document.getElementById("cut-05");
  const sceneLabel = document.getElementById("scene-label");
  const recTimeEl = document.getElementById("rec-time");
  const scrollProgressEl = document.getElementById("scroll-progress");
  const scene05Intro = document.getElementById("scene05-intro");
  const removableLabels = document.getElementById("removable-labels");

  const stateApi = window.EXHIBITION_STATE;

  const ramp = " .:-=+*#%@";
  const plate = document.createElement("canvas");
  const plateCtx = plate.getContext("2d", { willReadFrequently: true });

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  let eyeImage = null;
  let eyeCrop = null;
  let eyeStill = false;
  let cellW = 0;
  let cellH = 0;
  let pointerX = 0;
  let pointerY = 0;
  const trail = [];
  let scrollSpeed = 0;
  let lastScrollY = window.scrollY;
  let lastScrollT = performance.now();
  let clickCount = 0;
  let resizeCount = 0;
  let hiddenCount = 0;
  let lastHidden = "";
  let tilt = "";
  let gpu = "";
  let currentScene = 1;
  const dwell = {};
  let lastTick = performance.now();
  let lastDraw = 0;

  let streamIndex = 0;
  let streamTimer = null;
  let streamStarted = false;
  let popupCount = 0;
  let scene02Top = 0;
  let scene05Frozen = false;
  let scene05RedEnabled = false;
  let profileLabelData = [];
  let customCardCount = 0;
  let windowsBuilt = false;

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function fileOf(url) {
    try {
      const path = new URL(url, location.href).pathname.split("/");
      return path[path.length - 1] || url;
    } catch (err) {
      return String(url).split("/").pop();
    }
  }

  function readGpu() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return "";
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (!ext) return String(gl.getParameter(gl.RENDERER) || "");
      return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "");
    } catch (err) {
      return "";
    }
  }

  function dwellLine() {
    return Object.keys(dwell)
      .map((key) => key + ":" + Math.round(dwell[key]))
      .join(" ");
  }

  function snapshot() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const resources = [...new Set(performance.getEntriesByType("resource").map((entry) => fileOf(entry.name)))].slice(0, 24);
    const orientation = screen.orientation ? screen.orientation.type + " " + screen.orientation.angle : "";
    const visitor = stateApi ? stateApi.getVisitorId() : "";
    return {
      "document.cookie": document.cookie || "",
      "navigator.cookieEnabled": navigator.cookieEnabled ? "1" : "0",
      "performance.resources": resources.join(" "),
      "navigator.language": navigator.language || "",
      "navigator.languages": (navigator.languages || []).join(" "),
      "Intl.timeZone": Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      "Date": new Date().toISOString(),
      "window.inner": window.innerWidth + " " + window.innerHeight,
      "screen": screen.width + " " + screen.height,
      "devicePixelRatio": String(window.devicePixelRatio || ""),
      "screen.colorDepth": String(screen.colorDepth || ""),
      "screen.orientation": orientation,
      "maxTouchPoints": String(navigator.maxTouchPoints || 0),
      "hardwareConcurrency": String(navigator.hardwareConcurrency || ""),
      "deviceMemory": navigator.deviceMemory ? String(navigator.deviceMemory) : "",
      "connection": conn ? [conn.effectiveType, conn.downlink, conn.rtt].filter((v) => v != null && v !== "").join(" ") : "",
      "navigator.onLine": navigator.onLine ? "1" : "0",
      "userAgent": navigator.userAgent || "",
      "navigator.platform": navigator.platform || "",
      "prefers-color-scheme": window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      "prefers-reduced-motion": reduced ? "reduce" : "no-preference",
      "document.referrer": document.referrer || "",
      "history.length": String(history.length),
      "WEBGL_debug_renderer_info": gpu,
      "pointer": pointerX + " " + pointerY,
      "pointer.trail": trail.map((point) => point[0] + "," + point[1]).join(" "),
      "scrollY": String(Math.round(window.scrollY)),
      "scrollSpeed": String(Math.round(scrollSpeed)),
      "dwell": dwellLine(),
      "click": String(clickCount),
      "visibility.hidden": String(hiddenCount) + (lastHidden ? " " + lastHidden : ""),
      "resize": String(resizeCount),
      "camera": "0",
      "deviceorientation": tilt,
      "performance.now": String(Math.round(performance.now())),
      visitor_id: visitor,
    };
  }

  function formatKeys(data, keys) {
    return keys.map((key) => key + "=" + (data[key] == null ? "" : data[key])).join("\n");
  }

  function sceneProgress(el) {
    if (!el) return 0;
    const span = Math.max(el.offsetHeight - window.innerHeight, 1);
    return clamp((window.scrollY - el.offsetTop) / span, 0, 1);
  }

  function easeInOut(t) {
    return t * t * (3 - 2 * t);
  }

  function signalLines(data) {
    const vid = data.visitor_id || stateApi.getVisitorId();
    return [
      "visitor_id=" + vid,
      "timezone=" + data["Intl.timeZone"],
      "language=" + data["navigator.language"],
      "screen=" + data["window.inner"],
      "scroll_speed=" + data.scrollSpeed,
      "pointer=" + data.pointer,
    ];
  }

  function buildStreamQueue() {
    const data = snapshot();
    const signals = signalLines(data);
    const queue = [];
    const paras = MIX_CHUNKS.length ? MIX_CHUNKS : [STREAM_REFRAIN];
    for (let i = 0; i < paras.length * 2; i += 1) {
      if (i % 2 === 0) queue.push({ type: "prose", text: paras[(i / 2) % paras.length] });
      else queue.push({ type: "signal", text: signals[(i / 2) % signals.length] });
    }
    queue.push({ type: "refrain", text: STREAM_REFRAIN });
    return queue;
  }

  let streamQueue = buildStreamQueue();

  function appendStreamBlock(block) {
    if (!streamEl) return;
    const el = document.createElement("p");
    el.className = "stream-block stream-block--" + block.type;
    if (block.type === "signal") {
      el.innerHTML = '<span class="stream-key">' + block.text.split("=")[0] + "</span>=" + block.text.split("=").slice(1).join("=");
    } else {
      el.textContent = block.text;
    }
    streamEl.appendChild(el);
    while (streamEl.children.length > 24) streamEl.firstElementChild.remove();
  }

  function streamIntervalMs(progress) {
    return 2000 - progress * 1800;
  }

  function tickStream() {
    if (!streamStarted || streamIndex >= streamQueue.length) {
      streamQueue = buildStreamQueue();
      streamIndex = 0;
    }
    appendStreamBlock(streamQueue[streamIndex]);
    streamIndex += 1;
    const progress = scene02Progress();
    const delay = reduced ? 0 : streamIntervalMs(progress);
    streamTimer = window.setTimeout(tickStream, Math.max(80, delay));
  }

  function startStream() {
    if (streamStarted) return;
    streamStarted = true;
    streamQueue = buildStreamQueue();
    streamIndex = 0;
    spawnPopups(1);
    tickStream();
  }

  function createPopupCard(spec) {
    const card = document.createElement("article");
    card.className = "popup-card";
    card.dataset.popupId = spec.id;
    const head = document.createElement("div");
    head.className = "popup-card__head";
    const title = document.createElement("span");
    title.className = "popup-card__title";
    title.textContent = spec.name;
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "popup-card__close";
    closeBtn.setAttribute("aria-label", "닫기");
    closeBtn.textContent = "×";
    head.append(title, closeBtn);
    const msg = document.createElement("p");
    msg.className = "popup-card__msg";
    msg.textContent = spec.message;
    card.append(head, msg);

    let hoverStart = 0;
    const onHoverStart = () => {
      hoverStart = performance.now();
    };
    const onHoverEnd = () => {
      if (hoverStart && stateApi) {
        stateApi.recordPopupHover(spec.id, performance.now() - hoverStart);
        hoverStart = 0;
      }
    };

    if (finePointer) {
      card.addEventListener("mouseenter", onHoverStart);
      card.addEventListener("mouseleave", onHoverEnd);
    }

    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      card.remove();
      spawnPopups(2);
    });

    return card;
  }

  function spawnPopups(n) {
    if (!popupStack || !POPUPS.length) return;
    for (let i = 0; i < n; i += 1) {
      if (popupStack.children.length >= MAX_POPUPS) break;
      const spec = POPUPS[popupCount % POPUPS.length];
      popupCount += 1;
      popupStack.prepend(createPopupCard(spec));
    }
  }

  function measureScene02() {
    if (cut02) scene02Top = cut02.offsetTop;
  }

  function scene02Progress() {
    return sceneProgress(cut02);
  }

  function updateScene02() {
    if (!sheet02) return;
    const progress = scene02Progress();
    const splitP = easeInOut(clamp((progress - SCENE02_SPLIT_START) / (SCENE02_SPLIT_END - SCENE02_SPLIT_START), 0, 1));
    sheet02.style.setProperty("--scene02-split", String(splitP));
    sheet02.classList.toggle("is-split", splitP > 0.15);
    if (cut02Aside) cut02Aside.setAttribute("aria-hidden", splitP < 0.2 ? "true" : "false");

    const targetPopups = Math.min(MAX_POPUPS, Math.round(progress * MAX_POPUPS * 1.2));
    while (popupStack && popupStack.children.length < targetPopups) spawnPopups(1);

  }

  const LOG_ALIAS = [
    ["scrollSpeed", "scroll_speed"],
    ["pointer", "cursor_move"],
    ["pointer.trail", "cursor_trail"],
    ["Intl.timeZone", "timezone"],
    ["navigator.language", "language"],
    ["window.inner", "viewport"],
    ["Date", "timestamp"],
  ];

  function friendlyLogLine(key, value) {
    const alias = LOG_ALIAS.find(([k]) => k === key);
    const label = alias ? alias[1] : key;
    const time = new Date().toTimeString().slice(0, 8);
    return time + " " + label + "=" + value;
  }

  function updateScene03() {
    if (!cut03 || !obsLog) return;
    const progress = sceneProgress(cut03);
    const data = snapshot();
    const lines = ORDERED_KEYS.map((key) => friendlyLogLine(key, data[key]));
    const visible = Math.max(1, Math.round(progress * lines.length * 0.85));
    while (obsLog.children.length < visible) {
      const li = document.createElement("li");
      li.textContent = lines[obsLog.children.length] || "";
      obsLog.appendChild(li);
    }

    if (stateApi) {
      profileLabelData = stateApi.buildProfileLabels(data, COPY);
      const labelStart = Math.round(progress * profileLabelData.length);
      while (profileLabels.children.length < labelStart) {
        const item = profileLabelData[profileLabels.children.length];
        const li = document.createElement("li");
        li.textContent = "「" + item.text + "」";
        li.dataset.labelId = item.id;
        profileLabels.appendChild(li);
      }
      if (progress > 0.75 && profileSummary) {
        profileSummary.textContent = stateApi.summaryLabel(profileLabelData);
      }
      if (idleHint) {
        const idle = stateApi.isIdle();
        idleHint.hidden = !idle;
        if (idle) idleHint.textContent = COPY.scene03Idle || "";
      }
    }

    const converge = clamp((progress - 0.92) / 0.08, 0, 1);
    if (popupStack) popupStack.style.setProperty("--converge", String(converge));
  }

  function labelVars(labels) {
    const map = {};
    labels.forEach((l) => {
      map[l.id] = l.text;
    });
    return {
      time: map.time || "",
      scroll: map.scroll || "",
      device: map.device || "",
      region: map.region || "",
    };
  }

  function fillCardTemplate(type, vars) {
    const tpl = CARD_TEMPLATES[type] || "「맞춤」";
    return tpl.replace(/\{(\w+)\}/g, (_, key) => vars[key] || "");
  }

  const CARD_TYPES = ["ad", "video", "spam", "notify", "news"];

  function buildFeedCards() {
    if (!cardGrid || cardGrid.dataset.built) return;
    cardGrid.dataset.built = "1";
    const data = snapshot();
    profileLabelData = stateApi.buildProfileLabels(data, COPY);
    const vars = labelVars(profileLabelData);
    for (let i = 0; i < 24; i += 1) {
      const type = CARD_TYPES[i % CARD_TYPES.length];
      const card = document.createElement("button");
      card.type = "button";
      card.className = "feed-card";
      card.dataset.cardType = type;
      card.dataset.feed = type === "video" ? "youtube" : type === "ad" ? "ad" : type === "spam" ? "spam" : "ad";
      const body = document.createElement("span");
      body.className = "feed-card__body";
      body.textContent = fillCardTemplate(type, vars);
      const why = document.createElement("span");
      why.className = "feed-card__why";
      why.hidden = true;
      const signal = type === "video" ? "scrollSpeed" : type === "ad" ? "prefers-color-scheme" : "document.cookie";
      const label = profileLabelData.find((l) => l.id === "scroll" || l.id === "dark") || profileLabelData[0];
      why.textContent = (COPY.cardWhy || "") + " " + signal + " → " + (label ? label.text : "") + " → 이 카드";
      card.append(body, why);
      card.addEventListener("click", (e) => {
        e.preventDefault();
        addSimilarCards(type, vars, 3);
      });
      if (finePointer) {
        card.addEventListener("mouseenter", () => {
          why.hidden = false;
        });
        card.addEventListener("mouseleave", () => {
          why.hidden = true;
        });
      } else {
        card.addEventListener("focus", () => {
          why.hidden = false;
        });
        card.addEventListener("blur", () => {
          why.hidden = true;
        });
      }
      cardGrid.appendChild(card);
    }
  }

  function addSimilarCards(type, vars, n) {
    for (let i = 0; i < n; i += 1) {
      customCardCount += 1;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "feed-card feed-card--spawned";
      card.dataset.cardType = type;
      const body = document.createElement("span");
      body.className = "feed-card__body";
      body.textContent = fillCardTemplate(type, vars) + " +" + customCardCount;
      card.appendChild(body);
      card.addEventListener("click", (e) => {
        e.preventDefault();
        addSimilarCards(type, vars, 3);
      });
      cardGrid.appendChild(card);
    }
    updateScene04();
  }

  function updateScene04() {
    if (!cut04 || !cardGrid) return;
    buildFeedCards();
    const progress = sceneProgress(cut04);
    const total = cardGrid.children.length;
    const show = Math.min(total, Math.max(3, Math.round(3 + progress * 21)));
    [...cardGrid.children].forEach((el, i) => {
      el.hidden = i >= show;
    });
    if (scene04End) {
      scene04End.hidden = progress < 0.88;
      scene04End.textContent = COPY.scene04End || "";
    }
  }

  function updateScene05UI() {
    if (!cut05) return;
    const progress = sceneProgress(cut05);
    if (progress > 0.05 && !windowsBuilt) {
      buildWindows(true);
      windowsBuilt = true;
    }
    if (progress > 0.08 && !scene05Frozen) {
      scene05Frozen = true;
      document.body.classList.add("scene05-freeze");
      window.setTimeout(() => {
        scene05RedEnabled = true;
        document.body.classList.add("scene05-red");
        const firstClose = windowsRoot?.querySelector(".window__close");
        if (firstClose) firstClose.classList.add("window__close--red");
        if (scene05Intro) {
          scene05Intro.hidden = false;
          scene05Intro.textContent = COPY.scene05Intro || "";
        }
      }, reduced ? 0 : 600);
    }
    if (progress > 0.22 && progress < 0.72 && windowsRoot) {
      const cols = 3;
      [...windowsRoot.children].forEach((win, i) => {
        if (win.style.position === "absolute") return;
        const col = i % cols;
        const row = Math.floor(i / cols);
        win.style.gridColumn = (1 + col * 4) + " / span 4";
        win.style.marginTop = row * 0.75 + "rem";
      });
    }
    if (progress > 0.7 && closing && windowsRoot && !windowsRoot.children.length) {
      showClosingLabels();
    }
  }

  function showClosingLabels() {
    if (!removableLabels || removableLabels.dataset.filled) return;
    removableLabels.dataset.filled = "1";
    const data = snapshot();
    profileLabelData = stateApi.buildProfileLabels(data, COPY);
    profileLabelData.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item.text;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "삭제";
      btn.addEventListener("click", () => li.remove());
      li.appendChild(btn);
      removableLabels.appendChild(li);
    });
    closing.hidden = false;
    windowsRoot.hidden = true;
    document.body.classList.remove("is-dark");
    if (window.applySceneCopy) window.applySceneCopy();
  }

  function syncClosing() {
    const any = windowsRoot && windowsRoot.children.length > 0;
    if (windowsRoot) windowsRoot.hidden = !any;
    if (closing) closing.hidden = any;
    if (!any && !removableLabels?.dataset.filled) document.body.classList.remove("is-dark");
    if (!any && sceneProgress(cut05) > 0.65) showClosingLabels();
  }

  function buildWindows(fromScene5) {
    if (!windowsRoot) return;
    windowsRoot.innerHTML = "";
    const cards = cardGrid ? [...cardGrid.querySelectorAll(".feed-card:not([hidden])")] : [];
    const count = Math.min(24, Math.max(6, cards.length || 12));
    for (let i = 0; i < count; i += 1) {
      const feed = i % 3 === 0 ? "youtube" : i % 3 === 1 ? "ad" : "spam";
      const names = { youtube: "추천", ad: "광고", spam: "스팸" };
      const el = document.createElement("div");
      el.className = "window";
      el.dataset.feed = feed;
      el.dataset.windowIndex = String(i + 1);
      el.style.gridColumn = (1 + (i % 4) * 3) + " / span 4";
      el.style.zIndex = String(i + 1);
      const head = document.createElement("div");
      head.className = "window__head";
      const title = document.createElement("span");
      title.className = "feed-name";
      title.textContent = names[feed];
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "window__close";
      closeBtn.textContent = "×";
      closeBtn.setAttribute("aria-label", "닫기");
      closeBtn.addEventListener("click", () => {
        el.remove();
        syncClosing();
      });
      head.append(title, closeBtn);
      const body = document.createElement("span");
      body.className = "log";
      el.append(head, body);

      let drag = null;
      el.addEventListener("pointerdown", (event) => {
        if (event.target.closest(".window__close")) return;
        if (event.button !== 0) return;
        const parent = windowsRoot.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        drag = {
          x: event.clientX,
          y: event.clientY,
          left: rect.left - parent.left,
          top: rect.top - parent.top,
          width: rect.width,
          moved: false,
        };
        el.setPointerCapture(event.pointerId);
      });
      el.addEventListener("pointermove", (event) => {
        if (!drag || !el.hasPointerCapture(event.pointerId)) return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 5) return;
        if (!drag.moved) {
          drag.moved = true;
          el.style.position = "absolute";
          el.style.width = drag.width + "px";
        }
        el.style.left = drag.left + dx + "px";
        el.style.top = drag.top + dy + "px";
      });
      el.addEventListener("pointerup", () => {
        drag = null;
      });

      windowsRoot.appendChild(el);
    }
    syncClosing();
    renderFeedWindows();
    if (fromScene5) document.body.classList.add("is-dark");
  }

  function renderFeedWindows() {
    const data = snapshot();
    windowsRoot?.querySelectorAll(".window").forEach((win) => {
      const keys = FEEDS[win.dataset.feed];
      const log = win.querySelector(".log");
      if (log && keys) log.textContent = formatKeys(data, keys);
    });
  }

  function updateChrome() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    if (scrollProgressEl) scrollProgressEl.style.transform = "scaleX(" + p + ")";

    const y = window.scrollY + window.innerHeight * 0.3;
    let scene = 1;
    document.querySelectorAll("[data-scene]").forEach((el) => {
      const top = el.offsetTop;
      if (top <= y) scene = Number(el.dataset.scene) || scene;
    });
    currentScene = scene;
    if (sceneLabel) sceneLabel.textContent = "SCENE " + String(scene).padStart(2, "0") + " / 05";
    if (recTimeEl && stateApi) {
      const sec = stateApi.getSessionSeconds();
      recTimeEl.textContent = stateApi.formatRecTime(sec);
    }
  }

  function pixelLum(data, index) {
    return data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
  }

  function prepareEye(image) {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const source = document.createElement("canvas");
    source.width = width;
    source.height = height;
    const sourceCtx = source.getContext("2d", { willReadFrequently: true });
    sourceCtx.drawImage(image, 0, 0);
    const data = sourceCtx.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (pixelLum(data, (y * width + x) * 4) <= 16) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    eyeImage = image;
    eyeCrop = { x: minX, y: minY, w: Math.max(1, maxX - minX + 1), h: Math.max(1, maxY - minY + 1) };
    paintEye(performance.now());
  }

  function measureCell() {
    const style = getComputedStyle(eyeEl);
    const probe = document.createElement("span");
    probe.textContent = "M";
    probe.style.fontFamily = style.fontFamily;
    probe.style.fontSize = style.fontSize;
    probe.style.fontWeight = "400";
    probe.style.lineHeight = "1";
    probe.style.letterSpacing = "0";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    const measured = probe.getBoundingClientRect();
    probe.remove();
    cellH = measured.height || parseFloat(style.fontSize) || 7;
    cellW = measured.width || cellH * 0.6;
  }

  function paintEye(now) {
    if (!eyeImage || !eyeEl) return;
    if (!cellW) measureCell();
    const box = eyeEl.getBoundingClientRect();
    const charH = cellH;
    const charW = cellW;
    const cols = Math.max(20, Math.floor(box.width / charW));
    const rows = Math.max(12, Math.floor(box.height / charH));
    const oversample = 2;
    plate.width = cols * oversample;
    plate.height = rows * oversample;
    const targetRatio = (eyeCrop.w / eyeCrop.h) * (charH / charW);
    let drawW = plate.width;
    let drawH = drawW / targetRatio;
    if (drawH < plate.height) {
      drawH = plate.height;
      drawW = drawH * targetRatio;
    }
    const originX = (plate.width - drawW) / 2;
    const originY = (plate.height - drawH) / 2;
    plateCtx.imageSmoothingEnabled = true;
    plateCtx.drawImage(eyeImage, eyeCrop.x, eyeCrop.y, eyeCrop.w, eyeCrop.h, originX, originY, drawW, drawH);
    const pixels = plateCtx.getImageData(0, 0, plate.width, plate.height).data;
    const t = (now || 0) * 0.001;
    const amp = reduced || eyeStill ? 0 : oversample * 1.15;
    const heave = reduced || eyeStill ? 0 : oversample * 0.85;
    const width = plate.width;
    const height = plate.height;
    let text = "";
    for (let y = 0; y < rows; y += 1) {
      const sway = Math.sin(y * 0.055 + t * 1.5) * amp + Math.sin(y * 0.11 - t * 0.7) * heave;
      for (let x = 0; x < cols; x += 1) {
        const dx = sway + Math.sin(x * 0.04 + t * 1.15) * amp * 0.7;
        const dy = Math.cos(x * 0.035 + t * 1.3) * amp + Math.sin(y * 0.06 + t * 0.85) * heave;
        const sx = x * oversample + dx;
        const sy = y * oversample + dy;
        let light = 0;
        for (let oy = 0; oy < oversample; oy += 1) {
          for (let ox = 0; ox < oversample; ox += 1) {
            const px = clamp(Math.round(sx + ox), 0, width - 1);
            const py = clamp(Math.round(sy + oy), 0, height - 1);
            light = Math.max(light, pixelLum(pixels, (py * width + px) * 4));
          }
        }
        const shade = clamp(Math.round((light / 255) * (ramp.length - 1)), 0, ramp.length - 1);
        text += ramp[shade];
      }
      text += "\n";
    }
    eyeEl.textContent = text;
  }

  const watchDive = document.getElementById("watch-dive");
  const LANDING_FOCAL_Y = 0.5;

  function landingProgress() {
    const space = document.getElementById("cut-01");
    if (!space) return 0;
    const rect = space.getBoundingClientRect();
    return clamp(-rect.top / Math.max(space.offsetHeight - window.innerHeight, 1), 0, 1);
  }

  function setCenterScale(el, scale, focalY) {
    if (!el) return;
    if (scale <= 1.001) {
      el.style.transform = "";
      el.style.transformOrigin = "";
      el.classList.remove("is-zooming");
      return;
    }
    const rect = el.getBoundingClientRect();
    const w = rect.width || el.clientWidth || window.innerWidth;
    const h = rect.height || el.clientHeight || window.innerHeight;
    const originX = clamp(((window.innerWidth / 2 - rect.left) / w) * 100, 0, 100);
    const originY = clamp(((window.innerHeight * focalY - rect.top) / h) * 100, 0, 100);
    el.classList.add("is-zooming");
    el.style.transformOrigin = originX + "% " + originY + "%";
    el.style.transform = "scale(" + scale + ")";
  }

  function updateInvert() {
    const space = document.getElementById("cut-01");
    if (!space) return;
    const rect = space.getBoundingClientRect();
    const inLanding = rect.bottom > 0 && rect.top < window.innerHeight;
    if (!inLanding) {
      setCenterScale(watchDive, 1, LANDING_FOCAL_Y);
      if (rect.bottom <= 0) document.body.classList.remove("is-dark");
      eyeStill = false;
      return;
    }
    const progress = landingProgress();
    const diveMax = reduced ? 4 : 14;
    const zoom = clamp((progress - 0.05) / 0.72, 0, 1);
    const zoomEased = zoom * zoom * (3 - 2 * zoom);
    const scale = 1 + Math.pow(zoomEased, 1.15) * diveMax;
    if (progress > 0.03 && progress < 0.92) eyeStill = true;
    else if (progress <= 0.02) eyeStill = false;
    setCenterScale(watchDive, scale, LANDING_FOCAL_Y);
    document.body.classList.toggle("is-dark", progress < 0.82);
  }

  function onScroll() {
    const now = performance.now();
    const dy = window.scrollY - lastScrollY;
    const dt = now - lastScrollT || 1;
    scrollSpeed = (dy / dt) * 1000;
    lastScrollY = window.scrollY;
    lastScrollT = now;
    updateInvert();
    updateChrome();
    updateScene02();
    updateScene03();
    updateScene04();
    updateScene05UI();
  }

  function frame(now) {
    const dt = now - lastTick;
    lastTick = now;
    const cutKey = "scene" + currentScene;
    dwell[cutKey] = (dwell[cutKey] || 0) + dt;
    if (eyeImage && !eyeStill && now - lastDraw > 64) {
      lastDraw = now;
      paintEye(now);
      if (reduced) eyeStill = true;
    }
    requestAnimationFrame(frame);
  }

  function renderLive() {
    renderFeedWindows();
  }

  gpu = readGpu();

  const restartBtn = document.getElementById("restart-btn");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      window.scrollTo(0, 0);
      location.reload();
    });
  }

  const eyePicture = new Image();
  eyePicture.onload = () => prepareEye(eyePicture);
  eyePicture.src = "eye.png";

  window.addEventListener("pointermove", (event) => {
    pointerX = Math.round(event.clientX);
    pointerY = Math.round(event.clientY);
    trail.push([pointerX, pointerY]);
    if (trail.length > 20) trail.shift();
  }, { passive: true });

  window.addEventListener("scroll", onScroll, { passive: true });

  window.addEventListener("resize", () => {
    resizeCount += 1;
    measureCell();
    eyeStill = false;
    paintEye(performance.now());
    measureScene02();
    updateInvert();
    onScroll();
    renderLive();
  });

  document.addEventListener("click", () => {
    clickCount += 1;
  }, true);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenCount += 1;
      lastHidden = new Date().toISOString();
    }
  });

  window.addEventListener("deviceorientation", (event) => {
    if (event.alpha == null) return;
    tilt = [event.alpha, event.beta, event.gamma].map((v) => Math.round(v || 0)).join(" ");
  });

  const streamWatcher = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) startStream();
  }, { threshold: 0.1 });
  if (cut02) streamWatcher.observe(cut02);

  measureScene02();
  updateInvert();
  updateChrome();
  onScroll();
  requestAnimationFrame(frame);
  setInterval(renderLive, 400);

  if (window.applySceneCopy) window.applySceneCopy();
})();

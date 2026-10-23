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
  const LIVE_DIAGRAM_KEY = "Date";

  const MIX_CHUNKS = [
    "one of those pictures which are so contrived that the eyes follow you about when you move. BIG BROTHER IS WATCHING YOU, the caption beneath it ran.",
    "The instrument (the telescreen, it was called) could be dimmed, but there was no way of shutting it off completely.",
    "There was one on the house-front immediately opposite. BIG BROTHER IS WATCHING YOU, the caption said, while the dark eyes looked deep into Winston's own.",
    "Behind Winston's back the voice from the telescreen was still babbling away about pig-iron and the overfulfilment of the Ninth Three-Year Plan. The telescreen received and transmitted simultaneously. Any sound that Winston made, above the level of a very low whisper, would be picked up by it, moreover, so long as he remained within the field of vision which the metal plaque commanded, he could be seen as well as heard. There was of course no way of knowing whether you were being watched at any given moment.",
    "You had to live--did live, from habit that became instinct--in the assumption that every sound you made was overheard, and, except in darkness, every movement scrutinized.",
    "Winston kept his back turned to the telescreen. It was safer; though, as he well knew, even a back can be revealing. A kilometre away the Ministry of Truth, his place of work, towered vast and white above the grimy landscape.",
    "The patrols did not matter, however. Only the Thought Police mattered. The Ministry of Love was the really frightening one. There were no windows in it at all.",
    "Winston turned round abruptly. He had set his features into the expression of quiet optimism which it was advisable to wear when facing the telescreen. He crossed the room into the tiny kitchen.",
    "For some reason the telescreen in the living-room was in an unusual position. Instead of being placed, as was normal, in the end wall, where it could command the whole room, it was in the longer wall, opposite the window.",
    "Winston was able to remain outside the range of the telescreen, so far as sight went. On the other hand his voice was still carrying, and of course there was always the danger of some careless word.",
  ];

  const SCENE02_REPLACE_START = 0.18;
  const SCENE02_REPLACE_END = 0.48;
  const SCENE02_SPLIT_START = 0.48;
  const SCENE02_SPLIT_END = 0.74;

  function mixFullText() {
    return MIX_CHUNKS.join(" ");
  }

  const eyeEl = document.getElementById("eye");
  const mix = document.getElementById("mix");
  const sheet02 = document.getElementById("sheet-02");
  const cut02Aside = document.getElementById("cut02-aside");
  const cut02 = document.getElementById("cut-02");
  const rawLog = document.getElementById("raw-log");
  const diagram = document.getElementById("diagram");
  const windowsRoot = document.getElementById("windows");
  const closing = document.getElementById("closing");
  const travel = document.getElementById("travel");
  const cut03 = document.getElementById("cut-03");
  const conduitEl = document.getElementById("conduit");
  const ramp = " .:-=+*#%@";
  const plate = document.createElement("canvas");
  const plateCtx = plate.getContext("2d", { willReadFrequently: true });

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const narrow = window.matchMedia("(max-width: 800px)");

  let cameraOn = false;
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
  let currentCut = "01.1";
  const dwell = {};
  let lastTick = performance.now();
  let lastDraw = 0;
  let mixStarted = false;
  let mixRevealDone = false;
  let mixReplaceCount = 0;
  let mixWordEls = [];
  let scene02Split = 0;
  let scene02Top = 0;
  let scene02Complete = false;
  let mixTyping = false;
  let mixReplaceTokens = null;

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
      "connection": conn ? [conn.effectiveType, conn.downlink, conn.rtt].filter((value) => value != null && value !== "").join(" ") : "",
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
      "camera": cameraOn ? "1" : "0",
      "deviceorientation": tilt,
      "performance.now": String(Math.round(performance.now())),
    };
  }

  function formatKeys(data, keys) {
    return keys.map((key) => key + "=" + (data[key] == null ? "" : data[key])).join("\n");
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
    eyeCrop = {
      x: minX,
      y: minY,
      w: Math.max(1, maxX - minX + 1),
      h: Math.max(1, maxY - minY + 1),
    };
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
    const amp = reduced ? 0 : oversample * 1.15;
    const heave = reduced ? 0 : oversample * 0.85;
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

  const cross = document.getElementById("cross");
  const watchDive = document.getElementById("watch-dive");
  const LANDING_FOCAL_Y = 0.48;

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
      el.classList.remove("is-zooming");
      return;
    }
    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;
    const ox = w * 0.5;
    const oy = h * focalY;
    el.classList.add("is-zooming");
    el.style.transform =
      "translate(" + ox + "px," + oy + "px) scale(" + scale + ") translate(" + -ox + "px," + -oy + "px)";
  }

  function resetLandingVisuals(lightPage) {
    setCenterScale(watchDive, 1, LANDING_FOCAL_Y);
    if (cross) {
      cross.style.opacity = "0";
      cross.style.webkitMaskImage = "none";
      cross.style.maskImage = "none";
    }
    if (lightPage) document.body.classList.remove("is-dark");
  }

  function updateInvert() {
    const space = document.getElementById("cut-01");
    if (!space) return;
    const rect = space.getBoundingClientRect();
    const inLanding = rect.bottom > 0 && rect.top < window.innerHeight;
    if (!inLanding) {
      resetLandingVisuals(rect.bottom <= 0);
      eyeStill = false;
      return;
    }

    const progress = landingProgress();
    const diveMax = reduced ? 4 : 14;
    const zoom = clamp((progress - 0.05) / 0.72, 0, 1);
    const zoomEased = zoom * zoom * (3 - 2 * zoom);
    const scale = 1 + Math.pow(zoomEased, 1.15) * diveMax;
    const tunnelIn = clamp((progress - 0.38) / 0.42, 0, 1);
    const tunnelOut = clamp((progress - 0.86) / 0.14, 0, 1);
    const overlay = tunnelIn * tunnelIn * (1 - tunnelOut);

    if (progress > 0.03 && progress < 0.92) eyeStill = true;
    else if (progress <= 0.02) eyeStill = false;

    setCenterScale(watchDive, scale, LANDING_FOCAL_Y);

    if (cross) {
      cross.style.opacity = String(overlay);
      const pupil = Math.max(2, (1 - tunnelIn * 0.98) * 95);
      if (overlay > 0.02 && tunnelOut < 0.98) {
        const mask =
          "radial-gradient(circle at 50% " +
          LANDING_FOCAL_Y * 100 +
          "%, transparent 0, transparent " +
          pupil +
          "vh, #000 " +
          (pupil + 3) +
          "vh)";
        cross.style.webkitMaskImage = mask;
        cross.style.maskImage = mask;
      } else {
        cross.style.webkitMaskImage = "none";
        cross.style.maskImage = "none";
      }
    }

    document.body.classList.toggle("is-dark", progress < 0.82 || overlay > 0.12);
  }

  function updatePager() {
    const y = window.scrollY + window.innerHeight * 0.28;
    let current = "01.1";
    document.querySelectorAll("[data-cut]").forEach((el) => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      if (top <= y) current = el.dataset.cut;
    });
    currentCut = current;
  }

  function renderDiagram(data) {
    const lines = ORDERED_KEYS.map((key) => key + "=" + data[key]);
    const showAll = reduced || narrow.matches || travel.offsetHeight < 8;
    let offset = 0;
    let count = lines.length;
    if (!showAll) {
      const span = travel.offsetHeight;
      const progress = clamp((window.scrollY - cut03.offsetTop) / span, 0, 1);
      count = 6;
      offset = Math.round(progress * Math.max(lines.length - count, 0));
    }
    while (diagram.children.length < count) diagram.appendChild(document.createElement("li"));
    while (diagram.children.length > count) diagram.lastElementChild.remove();
    for (let i = 0; i < count; i += 1) {
      const line = lines[offset + i] || "";
      const row = diagram.children[i];
      row.textContent = line;
      row.classList.toggle("diagram-live-key", line.startsWith(LIVE_DIAGRAM_KEY + "="));
    }
    if (conduitEl) {
      const tail = Math.min(12, Math.round(offset / 2));
      conduitEl.textContent = "===●===" + ">".repeat(tail);
    }
  }

  function renderLive() {
    const data = snapshot();
    rawLog.textContent = formatKeys(data, ORDERED_KEYS);
    renderDiagram(data);
    document.querySelectorAll("[data-feed]").forEach((node) => {
      const keys = FEEDS[node.dataset.feed];
      if (!keys) return;
      const log = node.classList.contains("log") ? node : node.querySelector(".log");
      if (log) log.textContent = formatKeys(data, keys);
    });
    document.querySelectorAll(".detail").forEach((detail) => {
      if (detail.hidden) return;
      detail.textContent = formatKeys(data, DETAILS[detail.dataset.detail]);
    });
  }

  function measureScene02() {
    if (!cut02) return;
    scene02Top = cut02.offsetTop;
  }

  function scene02Progress() {
    if (!cut02) return 0;
    const span = Math.max(cut02.offsetHeight - window.innerHeight, 1);
    return clamp((window.scrollY - scene02Top) / span, 0, 1);
  }

  function easeInOut(t) {
    return t * t * (3 - 2 * t);
  }

  function cookieTokens(data) {
    const raw = data["document.cookie"];
    const parts = raw && raw.trim() ? raw.split(";").map((part) => part.trim()).filter(Boolean) : [];
    if (parts.length) return parts;
    return DETAILS.cookie.map((key) => {
      const value = data[key] == null ? "" : data[key];
      return key + "=" + value;
    });
  }

  function setDataWord(el, token) {
    const eq = token.indexOf("=");
    if (eq > -1) {
      const key = token.slice(0, eq);
      const value = token.slice(eq + 1);
      const short = value.length > 36 ? value.slice(0, 33) + "…" : value;
      const safeKey = key.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      const safeVal = short.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      el.innerHTML = '<span class="mix-word-key">' + safeKey + "</span>=" + safeVal;
      el.dataset.dataKey = key;
    } else {
      el.textContent = token;
      delete el.dataset.dataKey;
    }
    el.classList.add("mix-word--data");
  }

  function refreshMixReplaceTokens() {
    mixReplaceTokens = cookieTokens(snapshot());
  }

  function applyMixReplace(count) {
    if (!mixWordEls.length) return;
    const capped = clamp(count, 0, mixWordEls.length);
    if (!mixReplaceTokens || capped === 0) {
      mixWordEls.forEach((el) => {
        el.textContent = el.dataset.original;
        el.classList.remove("mix-word--data", "mix-word--subject");
        delete el.dataset.dataKey;
      });
      return;
    }
    const tokens = mixReplaceTokens;
    mixWordEls.forEach((el, index) => {
      if (index >= capped) {
        el.textContent = el.dataset.original;
        el.classList.remove("mix-word--data", "mix-word--subject");
        delete el.dataset.dataKey;
        return;
      }
      setDataWord(el, tokens[index % tokens.length]);
    });
  }

  function buildMixWordDom() {
    mix.innerHTML = "";
    mixWordEls = [];
    const block = document.createElement("p");
    block.className = "mix-para";
    const words = mixFullText().match(/\S+/g) || [];
    words.forEach((word, index) => {
      if (index > 0) block.append(" ");
      const span = document.createElement("span");
      span.className = "mix-word";
      span.dataset.original = word;
      span.textContent = word;
      block.appendChild(span);
      mixWordEls.push(span);
    });
    mix.appendChild(block);
  }

  function finalizeMixAfterType() {
    if (mixRevealDone) return;
    mixTyping = false;
    buildMixWordDom();
    mixRevealDone = true;
    refreshMixReplaceTokens();
    updateScene02();
  }

  function runMixTypewriter() {
    if (mixTyping) return;
    mixTyping = true;
    const full = mixFullText();
    mix.innerHTML = "";
    const block = document.createElement("p");
    block.className = "mix-para";
    mix.appendChild(block);
    let index = 0;
    const step = () => {
      if (!mixTyping) return;
      index = Math.min(full.length, index + (reduced ? full.length : 4));
      block.textContent = full.slice(0, index);
      if (index < full.length) {
        requestAnimationFrame(step);
        return;
      }
      finalizeMixAfterType();
    };
    requestAnimationFrame(step);
  }

  function updateScene02() {
    if (!sheet02 || !cut02) return;
    const progress = scene02Progress();
    let replaceTarget = 0;
    let split = 0;

    if (progress < SCENE02_REPLACE_START - 0.05) scene02Complete = false;

    if (scene02Complete || progress >= SCENE02_SPLIT_END) {
      scene02Complete = true;
      if (mixRevealDone && mixWordEls.length) {
        replaceTarget = mixWordEls.length;
        split = 1;
      }
    } else if (mixRevealDone && mixWordEls.length) {
      const replaceProgress = easeInOut(
        clamp((progress - SCENE02_REPLACE_START) / (SCENE02_REPLACE_END - SCENE02_REPLACE_START), 0, 1),
      );
      replaceTarget = Math.round(replaceProgress * mixWordEls.length);
      const splitProgress = easeInOut(
        clamp((progress - SCENE02_SPLIT_START) / (SCENE02_SPLIT_END - SCENE02_SPLIT_START), 0, 1),
      );
      split = splitProgress;
    }

    if (replaceTarget !== mixReplaceCount) {
      mixReplaceCount = replaceTarget;
      if (mixReplaceCount > 0 && !mixReplaceTokens) refreshMixReplaceTokens();
      applyMixReplace(mixReplaceCount);
    }

    scene02Split = split;
    sheet02.style.setProperty("--scene02-split", String(split));
    sheet02.classList.toggle("is-split", split > 0.2);
    if (cut02Aside) {
      cut02Aside.setAttribute("aria-hidden", split < 0.35 ? "true" : "false");
    }
  }

  function startMix() {
    if (mixStarted) return;
    mixStarted = true;
    runMixTypewriter();
  }

  function setMixSubjectHighlight(detailId) {
    document.querySelectorAll(".mix-word").forEach((el) => {
      el.classList.remove("mix-word--subject");
    });
    if (!detailId) return;
    const keys = DETAILS[detailId];
    if (!keys) return;
    mixWordEls.forEach((el) => {
      const key = el.dataset.dataKey;
      if (key && keys.includes(key)) el.classList.add("mix-word--subject");
    });
  }

  function bindSubjects() {
    const items = [...document.querySelectorAll("#subjects li")];
    const closeAll = () => {
      items.forEach((item) => {
        item.querySelector(".detail").hidden = true;
        item.querySelector("button").setAttribute("aria-expanded", "false");
      });
      setMixSubjectHighlight(null);
    };
    items.forEach((item) => {
      const button = item.querySelector("button");
      const detail = item.querySelector(".detail");
      const open = () => {
        closeAll();
        detail.hidden = false;
        button.setAttribute("aria-expanded", "true");
        setMixSubjectHighlight(detail.dataset.detail);
        renderLive();
      };
      const close = () => {
        detail.hidden = true;
        button.setAttribute("aria-expanded", "false");
        setMixSubjectHighlight(null);
      };
      if (finePointer) {
        item.addEventListener("mouseenter", open);
        item.addEventListener("mouseleave", close);
        button.addEventListener("focus", open);
        button.addEventListener("blur", close);
      } else {
        button.addEventListener("click", () => {
          const willOpen = detail.hidden;
          closeAll();
          if (willOpen) open();
        });
      }
    });
  }

  function syncClosing() {
    const any = windowsRoot.children.length > 0;
    windowsRoot.hidden = !any;
    closing.hidden = any;
    if (!any) document.body.classList.remove("is-dark");
  }

  function buildWindows() {
    const spec = [
      ["유튜브", "youtube", "1 / 5"],
      ["광고", "ad", "5 / 9"],
      ["스팸", "spam", "9 / 13"],
      ["유튜브", "youtube", "1 / 5"],
      ["광고", "ad", "5 / 9"],
      ["스팸", "spam", "9 / 13"],
    ];
    spec.forEach(([name, feed, column]) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "window";
      el.dataset.feed = feed;
      el.style.gridColumn = column;
      const title = document.createElement("span");
      title.className = "feed-name";
      title.textContent = name;
      const body = document.createElement("span");
      body.className = "log";
      el.append(title, body);

      let drag = null;
      el.addEventListener("pointerdown", (event) => {
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
          el.style.zIndex = "2";
        }
        el.style.left = drag.left + dx + "px";
        el.style.top = drag.top + dy + "px";
      });
      el.addEventListener("pointerup", () => {
        if (drag && drag.moved) el.dataset.dragged = "1";
        drag = null;
      });
      el.addEventListener("click", () => {
        if (el.dataset.dragged === "1") {
          el.dataset.dragged = "";
          return;
        }
        el.remove();
        syncClosing();
      });
      el.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        el.remove();
        syncClosing();
      });
      windowsRoot.appendChild(el);
    });
  }

  function frame(now) {
    const dt = now - lastTick;
    lastTick = now;
    dwell[currentCut] = (dwell[currentCut] || 0) + dt;
    if (eyeImage && !eyeStill && now - lastDraw > 64) {
      lastDraw = now;
      paintEye(now);
      if (reduced) eyeStill = true;
    }
    requestAnimationFrame(frame);
  }

  gpu = readGpu();
  buildWindows();
  bindSubjects();
  const eyePicture = new Image();
  eyePicture.onload = () => prepareEye(eyePicture);
  eyePicture.src = "eye.png";

  window.addEventListener("pointermove", (event) => {
    pointerX = Math.round(event.clientX);
    pointerY = Math.round(event.clientY);
    trail.push([pointerX, pointerY]);
    if (trail.length > 20) trail.shift();
  }, { passive: true });

  window.addEventListener("scroll", () => {
    const now = performance.now();
    const dy = window.scrollY - lastScrollY;
    const dt = now - lastScrollT || 1;
    scrollSpeed = (dy / dt) * 1000;
    lastScrollY = window.scrollY;
    lastScrollT = now;
    updateInvert();
    updatePager();
    updateScene02();
  }, { passive: true });

  window.addEventListener("resize", () => {
    resizeCount += 1;
    measureCell();
    eyeStill = false;
    paintEye(performance.now());
    measureScene02();
    updateInvert();
    updateScene02();
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
    tilt = [event.alpha, event.beta, event.gamma].map((value) => Math.round(value || 0)).join(" ");
  });

  function bootScene02() {
    measureScene02();
    if (mixStarted || !cut02) return;
    const rect = cut02.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85 && rect.bottom > window.innerHeight * 0.15) startMix();
  }

  const mixWatcher = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) startMix();
  }, { threshold: 0.12 });
  mixWatcher.observe(cut02);
  window.addEventListener("load", bootScene02);
  requestAnimationFrame(bootScene02);

  measureScene02();
  updateInvert();
  updatePager();
  updateScene02();
  renderLive();
  requestAnimationFrame(frame);
  setInterval(renderLive, 300);
})();

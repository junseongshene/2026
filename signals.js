(() => {
  const VISITOR_STORAGE = "exhibition_visitor_id";
  const popupHoverMs = {};
  let topHoveredPopup = "";
  let idleActive = false;
  let lastInputAt = performance.now();
  const sessionStart = performance.now();

  function randomId() {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  function getVisitorId() {
    if (document.cookie) {
      const match = document.cookie.match(/(?:^|;\s*)visitor_id=([^;]+)/);
      if (match) return match[1];
    }
    try {
      const stored = sessionStorage.getItem(VISITOR_STORAGE);
      if (stored) return stored;
      const id = "a83f" + randomId();
      sessionStorage.setItem(VISITOR_STORAGE, id);
      return id;
    } catch (err) {
      return "a83f" + randomId();
    }
  }

  function touchInput() {
    lastInputAt = performance.now();
    idleActive = false;
  }

  function tickIdle() {
    idleActive = performance.now() - lastInputAt >= 3000;
  }

  function recordPopupHover(id, ms) {
    if (!id) return;
    popupHoverMs[id] = (popupHoverMs[id] || 0) + ms;
    let best = "";
    let bestMs = 0;
    Object.keys(popupHoverMs).forEach((key) => {
      if (popupHoverMs[key] > bestMs) {
        bestMs = popupHoverMs[key];
        best = key;
      }
    });
    topHoveredPopup = best;
  }

  function getTopHoveredPopup() {
    return topHoveredPopup;
  }

  function getSessionSeconds() {
    return Math.floor((performance.now() - sessionStart) / 1000);
  }

  function formatRecTime(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function hourBucket(data) {
    const raw = data.Date || new Date().toISOString();
    const hour = new Date(raw).getHours();
    if (hour >= 5 && hour < 12) return "아침형";
    if (hour >= 22 || hour < 5) return "야간 활동형";
    return "낮 활동형";
  }

  function scrollHabit(data) {
    const speed = Math.abs(Number(data.scrollSpeed) || 0);
    if (speed > 800) return "빠르게 훑는 편";
    if (speed < 120) return "꼼꼼히 읽는 편";
    return "보통 속도";
  }

  function deviceLabel(data) {
    const inner = data["window.inner"] || "";
    const w = Number(inner.split(" ")[0]) || window.innerWidth;
    return w < 820 ? "모바일 사용자" : "데스크톱 사용자";
  }

  function regionLabel(data) {
    const lang = data["navigator.language"] || "ko";
    const tz = data["Intl.timeZone"] || "";
    const region = tz.includes("Seoul") || lang.startsWith("ko") ? "한국" : "기타 지역";
    return "지역 추정: " + region + " / " + lang + " 사용자";
  }

  function interestFromPopup(popupId, copy) {
    const subjects = (copy && copy.popupSubjects) || {};
    const name = subjects[popupId] || popupId || "추천";
    return "관심사 추정: " + name;
  }

  function cursorHesitation(data) {
    const trail = data["pointer.trail"] || "";
    const points = trail ? trail.split(" ").length : 0;
    return points > 14 ? "망설임 지수 높음" : "망설임 지수 보통";
  }

  function dwellMinutes(data) {
    const line = data.dwell || "";
    const nums = line.match(/\d+/g);
    const total = nums ? nums.reduce((a, b) => a + Number(b), 0) : 0;
    return "이 페이지에 머문 시간: " + Math.max(1, Math.round(total / 60000)) + "분";
  }

  function visitLabel(data) {
    const m = (data["document.cookie"] || "").match(/(?:^|;\s*)visits=(\d+)/);
    const n = m ? Number(m[1]) : 1;
    return n > 1 ? "재방문 사용자: " + n + "번째 방문" : "첫 방문 (쿠키가 저장됨)";
  }

  function buildProfileLabels(data, copy) {
    const labels = [
      { id: "time", text: hourBucket(data) },
      { id: "region", text: regionLabel(data) },
      { id: "device", text: deviceLabel(data) },
      {
        id: "dark",
        text: data["prefers-color-scheme"] === "dark" ? "어두운 화면 선호" : "밝은 화면 선호",
      },
      { id: "scroll", text: scrollHabit(data) },
      { id: "cursor", text: cursorHesitation(data) },
      { id: "dwell", text: dwellMinutes(data) },
      { id: "visit", text: visitLabel(data) },
      { id: "interest", text: interestFromPopup(getTopHoveredPopup(), copy) },
    ];
    if (idleActive) labels.push({ id: "idle", text: "가만히 있음" });
    return labels;
  }

  function summaryLabel(labels) {
    const time = labels.find((l) => l.id === "time");
    const scroll = labels.find((l) => l.id === "scroll");
    const region = labels.find((l) => l.id === "region");
    const langPart = region ? region.text.split("/").pop().trim() : "사용자";
    return (
      "당신은 " +
      (time ? time.text : "") +
      ", " +
      (scroll ? scroll.text.replace(" 편", "") : "") +
      " " +
      langPart +
      "입니다."
    );
  }

  window.EXHIBITION_STATE = {
    getVisitorId,
    recordPopupHover,
    getTopHoveredPopup,
    getPopupHoverMs: () => ({ ...popupHoverMs }),
    touchInput,
    tickIdle,
    isIdle: () => idleActive,
    getSessionSeconds,
    formatRecTime,
    buildProfileLabels,
    summaryLabel,
  };

  ["pointermove", "keydown", "scroll", "click", "touchstart"].forEach((ev) => {
    window.addEventListener(ev, touchInput, { passive: true });
  });
  setInterval(tickIdle, 400);
})();

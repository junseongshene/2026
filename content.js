(() => {
  const mixChunks = [
    "On each landing, opposite the lift-shaft, the poster with the enormous face gazed from the wall. It was one of those pictures which are so contrived that the eyes follow you about when you move. BIG BROTHER IS WATCHING YOU, the caption beneath it ran.",
    "The instrument (the telescreen, it was called) could be dimmed, but there was no way of shutting it off completely.",
    "The black-moustachio'd face gazed down from every commanding corner. There was one on the house-front immediately opposite. BIG BROTHER IS WATCHING YOU, the caption said, while the dark eyes looked deep into Winston's own.",
    "It was the police patrol, snooping into people's windows. The patrols did not matter, however. Only the Thought Police mattered.",
    "Behind Winston's back the voice from the telescreen was still babbling away about pig-iron and the overfulfilment of the Ninth Three-Year Plan. The telescreen received and transmitted simultaneously.",
    "You had to live--did live, from habit that became instinct--in the assumption that every sound you made was overheard, and, except in darkness, every movement scrutinized.",
  ];

  const streamRefrain = "BIG BROTHER IS WATCHING YOU";

  const popups = [
    { id: "cookie", name: "쿠키", message: "당신이 어디를 다녀갔는지 기억합니다.", detailKey: "cookie" },
    { id: "search", name: "검색 엔진", message: "당신이 궁금해한 질문을 보관합니다.", detailKey: "algo" },
    { id: "adid", name: "광고 ID", message: "당신의 기기에 이름표를 붙였습니다.", detailKey: "cookie" },
    { id: "location", name: "위치 정보", message: "당신이 머문 장소와 시간을 압니다.", detailKey: "algo" },
    { id: "recommend", name: "추천 알고리즘", message: "당신이 어디서 멈췄는지 봅니다.", detailKey: "algo" },
    { id: "messenger", name: "메신저", message: "당신의 대화는 더 이상 당신과 상대만의 전유물이 아닙니다.", detailKey: "cache" },
    { id: "cctv", name: "공공 CCTV", message: "당신의 얼굴이 프레임에 들어왔습니다.", detailKey: "algo" },
    { id: "agency", name: "기관 요청", message: "필요하다는 이유로 요청된 정보가 쌓입니다.", detailKey: "cache" },
  ];

  const popupSubjects = {};
  popups.forEach((p) => {
    popupSubjects[p.id] = p.name;
  });

  const excerpts = {
    "03": [
      "You had to live--did live, from habit that became instinct--in the assumption that every sound you made was overheard, and, except in darkness, every movement scrutinized.",
      "Behind Winston's back the voice from the telescreen was still babbling away about pig-iron and the overfulfilment of the Ninth Three-Year Plan.",
    ],
    "04": [
      "On each landing, opposite the lift-shaft, the poster with the enormous face gazed from the wall.",
      "although every day and a thousand times a day, on platforms, on the telescreen, in newspapers, in books, his theories were refuted, smashed, ridiculed, held up to the general gaze for the pitiful rubbish that they were--in spite of all this, his influence never seemed to grow less.",
    ],
  };

  const cardTemplates = {
    ad: "「{time}인 당신에게만: 오늘 밤 12시까지 쿠폰 30%」",
    video: "「{scroll} 당신을 위한 추천: 3분 안에 끝나는 영상 12선」",
    spam: "「[Web발신] {device} 고객님, 확인되지 않은 결제가 있습니다.」",
    notify: "「당신과 비슷한 사람들은 이것도 봤습니다.」",
    news: "「당신이 동의할 만한 기사만 모았습니다.」",
  };

  window.SCENE_COPY = {
    title: "2026",
    scene02Header: "Who Is Watching",
    scene03Header: "This Is How You Are Read",
    scene03Sub: "생각보다 더 사소한 것들도 취합되고 있다.",
    scene03Idle: "아무것도 하지 않는 것도 데이터입니다.",
    privacyNotice:
      "이 페이지는 위 정보를 서버로 보내지 않습니다. 실제 서비스는 그렇지 않을 수 있습니다.",
    scene04Header: "And This Is What They Call Personalization",
    scene04End: "이것은 당신이 고른 것이 아니다.",
    scene05Intro: "이번에는 닫을 수 있다.",
    endingLines: [
      "알고리즘은 당신을 읽는다. 당신도 알고리즘을 읽을 수 있다.",
      "보이는 것을 의심하고, 보이지 않는 것을 물어라.",
    ],
    endingActions: [
      "광고 맞춤 설정 확인하기",
      "앱 권한 점검하기",
      "쿠키는 기본적으로 거부하기",
    ],
    endingPrivacy: "이 페이지는 아무것도 저장하지 않았다. 창을 닫는 순간 당신의 기록은 사라진다.",
    restartLabel: "다시 읽히기",
    cardWhy: "왜 이 카드가 보이나요?",
    statLine:
      "미국 성인의 약 81%는 기업의 데이터 수집이 주는 이익보다 위험이 크다고 느낀다. (퓨 리서치 센터)",
    mixChunks,
    streamRefrain,
    popups,
    popupSubjects,
    cardTemplates,
    excerpts,
    closingQuote:
      "Who controls the past controls the future: who controls the present controls the past.",
  };

  function applySceneCopy() {
    const copy = window.SCENE_COPY;
    if (!copy) return;

    document.querySelectorAll("[data-masthead-part] .masthead__title:not(.scene-header)").forEach((title) => {
      title.textContent = copy.title;
    });

    const h02 = document.querySelector("[data-scene-header='02']");
    if (h02 && copy.scene02Header) h02.textContent = copy.scene02Header;
    const h03 = document.querySelector("[data-scene-header='03']");
    if (h03 && copy.scene03Header) h03.textContent = copy.scene03Header;
    const h04 = document.querySelector("[data-scene-header='04']");
    if (h04 && copy.scene04Header) h04.textContent = copy.scene04Header;

    document.querySelectorAll("[data-excerpt]").forEach((el) => {
      const key = el.dataset.excerpt;
      const paras = copy.excerpts[key];
      if (!paras) return;
      const index = Number(el.dataset.excerptIndex || 0);
      if (paras[index]) el.textContent = paras[index];
    });

    const stat = document.getElementById("scene02-stat");
    if (stat && copy.statLine) stat.textContent = copy.statLine;

    const privacy = document.getElementById("privacy-notice");
    if (privacy && copy.privacyNotice) privacy.textContent = copy.privacyNotice;

    const s03sub = document.getElementById("scene03-sub");
    if (s03sub && copy.scene03Sub) s03sub.textContent = copy.scene03Sub;

    const closingQuote = document.getElementById("closing-quote");
    if (closingQuote && copy.closingQuote) closingQuote.textContent = copy.closingQuote;

    const endingA = document.getElementById("ending-lines");
    if (endingA && copy.endingLines) {
      endingA.innerHTML = copy.endingLines.map((line) => "<p class=\"prose\">" + line + "</p>").join("");
    }
    const actions = document.getElementById("ending-actions");
    if (actions && copy.endingActions) {
      actions.innerHTML = copy.endingActions.map((a) => "<li>" + a + "</li>").join("");
    }
    const endPriv = document.getElementById("ending-privacy");
    if (endPriv && copy.endingPrivacy) endPriv.textContent = copy.endingPrivacy;
    const restart = document.getElementById("restart-btn");
    if (restart && copy.restartLabel) restart.textContent = copy.restartLabel;
  }

  window.applySceneCopy = applySceneCopy;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySceneCopy);
  } else {
    applySceneCopy();
  }
})();

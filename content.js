/* All copy. Orwell excerpts are verbatim from 1984.txt (English, public domain in Australia);
   `line` is the line number in 1984.txt where the excerpt starts. UI copy is Korean. */
(() => {
  const Q = {
    eyes: { line: 62, text: "It was one of those pictures which are so contrived that the eyes follow you about when you move. BIG BROTHER IS WATCHING YOU, the caption beneath it ran." },
    dimmed: { line: 70, text: "The instrument (the telescreen, it was called) could be dimmed, but there was no way of shutting it off completely." },
    simultaneous: { line: 94, text: "The telescreen received and transmitted simultaneously." },
    overheard: { line: 104, text: "You had to live--did live, from habit that became instinct--in the assumption that every sound you made was overheard, and, except in darkness, every movement scrutinized." },
    thoughtPolice: { line: 0, text: "It was the police patrol, snooping into people's windows. The patrols did not matter, however. Only the Thought Police mattered." },
  };

  const mixChunks = [
    Q.eyes.text,
    "The instrument (the telescreen, it was called) could be dimmed, but there was no way of shutting it off completely.",
    "The black-moustachio'd face gazed down from every commanding corner. There was one on the house-front immediately opposite. BIG BROTHER IS WATCHING YOU, the caption said, while the dark eyes looked deep into Winston's own.",
    Q.thoughtPolice.text,
    "Behind Winston's back the voice from the telescreen was still babbling away about pig-iron and the overfulfilment of the Ninth Three-Year Plan. The telescreen received and transmitted simultaneously.",
    Q.overheard.text,
  ];

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

  const cardTypes = [
    { type: "ad", tag: "AD", signal: "prefers-color-scheme", label: "dark", tpl: "{time}인 당신에게만: 오늘 밤 12시까지 쿠폰 30%" },
    { type: "video", tag: "VIDEO", signal: "scrollSpeed", label: "scroll", tpl: "{scroll} 당신을 위한 추천: 3분 안에 끝나는 영상 12선" },
    { type: "spam", tag: "SMS", signal: "document.cookie", label: "device", tpl: "[Web발신] {device} 고객님, 확인되지 않은 결제가 있습니다." },
    { type: "notify", tag: "NOTI", signal: "navigator.language", label: "region", tpl: "당신과 비슷한 사람들은 이것도 봤습니다." },
    { type: "news", tag: "FEED", signal: "dwell", label: "dwell", tpl: "당신이 동의할 만한 기사만 모았습니다." },
  ];

  window.SCENE_COPY = {
    quotes: Q,
    hero: "1984는 더 이상 픽션이 아니다.",
    heroSub: [
      "당신은 지금 이 화면을 보고 있다. 그리고 이 화면도 당신을 보고 있다.",
      "당신의 모든 움직임은 데이터로 서버에 기록된다.",
    ],
    scene02Header: "Who Is Watching",
    scene02Hint: "팝업을 닫아 보세요. 마우스를 올리면 무엇을, 어떻게 보는지 나옵니다.",
    scene03Header: "This Is How You Are Read",
    scene03Sub: "생각보다 더 사소한 것들도 취합되고 있다.",
    scene03Idle: "아무것도 하지 않는 것도 데이터입니다.",
    privacyNotice: "이 페이지는 위 정보를 서버로 보내지 않습니다. 이 브라우저에 쿠키 3개(visitor_id, first_seen, visits)를 저장했고, 마지막 장면에서 직접 지울 수 있습니다. 실제 서비스는 그렇지 않을 수 있습니다.",
    scene04Header: "And This Is What They Call Personalization",
    scene04Hint: "카드에 마우스를 올리면 왜 보이는지, 눌러서 '관심 있음'을 보내면 어떻게 되는지 확인하세요.",
    scene04End: "이것은 당신이 고른 것이 아니다.",
    s5Dim: "밝기를 낮춰 보세요. 이 장치로 할 수 있는 일은 그것뿐입니다.",
    s5Dark: "움직임은 보이지 않는다. 그러나 소리는 들린다.",
    s5Erase: "길게 눌러 내 기록 지우기",
    s5Erasing: "지우는 중",
    s5Final: "여기서는 지워졌다. 다른 곳에서는?",
    restartLabel: "다시 읽히기",
    statLine: "미국 성인의 약 81%는 기업의 데이터 수집이 주는 이익보다 위험이 크다고 느낀다. (퓨 리서치 센터)",
    mixChunks,
    streamRefrain: "BIG BROTHER IS WATCHING YOU",
    popups,
    popupSubjects,
    cardTypes,
    cardWhy: "왜 이 카드가 보이나요?",
  };
})();

# 행동 → 화면 변화 (하이브리드 · storyboard + 데이터 아크)

FigJam 4칸 축: [`FIGJAM_NARRATIVE_STICKIES.md`](FIGJAM_NARRATIVE_STICKIES.md)

## 씬 간 트랜지션 (발표 한 줄)

| From | To | 발표 한 줄 |
|------|-----|------------|
| 01 | 02 | 스크롤하면 감시 화면이 지나가고, 신문처럼 읽히는 스트림과 팝업이 겹친다. |
| 02 | 03 | 팝업이 한 칸으로 수렴하고, 같은 신호가 로그·라벨로 분류된다. |
| 03 | 04 | 라벨이 맞춤 카드 문장에 끼워 넣어진다. |
| 04 | 05 | 포화된 카드가 창으로 겹치고, 이번에만 닫을 수 있다. |
| 05 | end | 창을 닫으면 라벨을 지울 수 있고, 기록은 서버에 없다. |

---

## Scene 01 — 감시 인지

- **행동**: 스크롤 · 커서
- **화면**: ASCII CCTV 다이브 → Scene 02 진입
- **고정 UI**: `SCENE 01/05`, REC 타이머, 상단 진행 바

## Scene 02 — 감시 주체

- **행동**: 스크롤 · 팝업 호버/탭 · X (닫으면 2개 재생)
- **좌**: 1984 문단 ↔ `visitor_id` / `timezone` / `language` … 스트림 (스크롤 시 출력 가속)
- **우**: 감시 주체 팝업 최대 15
- **데이터**: `DETAILS` 키가 팝업 확장 「어떻게」에 표시
- **길이**: 300vh

## Scene 03 — 데이터화

- **행동**: 스크롤 · idle 3초
- **좌**: `ORDERED_KEYS` 기반 관측 로그 (표시용 alias)
- **우**: `signals.js` 라벨 매핑 · 요약 문장 · 프라이버시 고지
- **길이**: 300vh

## Scene 04 — 맞춤화

- **행동**: 카드 호버(경로) · 클릭 시 유사 카드 +3
- **화면**: 와이어 마네킹 + 카드 그리드 3→24 (`FEEDS` 키 묶음 유지)
- **길이**: 350vh

## Scene 05 — 주체성

- **행동**: 0.6s 정지 후 레드 X · 드래그 · 닫기 · 라벨 삭제 · 다시 읽히기
- **증거**: 창 로그 = `FEEDS` 스냅샷
- **길이**: 250vh

---

## 데이터 아크 (한 문장)

Scene 02 팝업에서 본 `document.cookie`·`pointer` 등 **같은 키 문자열**이 03 로그 → 04 카드 맥락 → 05 창 로그로 이어진다.

## State 캡처

1. `python3 -m http.server 8731` 후 `index.html`
2. Playwright: `scripts/capture-class7-plugin-fn.js`
3. 출력: `class7/captures/` — `02-stream.png`, `02-fake-close.png`, `05-red-close.png` 등

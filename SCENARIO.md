# 행동 → 화면 변화 (class7 · 발표용)

FigJam 4칸 축(행동·메시지·증거·다음 씬)과 동기화: [`FIGJAM_NARRATIVE_STICKIES.md`](FIGJAM_NARRATIVE_STICKIES.md)

## 씬 간 트랜지션 (발표 한 줄)

| From | To | 발표 한 줄 |
|------|-----|------------|
| 01 | 02 | 스크롤하면 감시의 시선 안으로 들어가고, 그다음 화면은 이미 나를 읽고 있는 신문이다. |
| 02 | 03 | 신문 기사 한 칸이 내 쿠키였고, 다음 장면에서는 창고 전체가 열린다. |
| 03 | 04 | 데이터는 이름만 있을 때는 공포고, 유튜브·광고·스팸이라는 이름을 쓰면 일상이 된다. |
| 04 | 05 | 피드는 세 번 반복됐고, 그다음은 내 화면 위에 겹쳐진 창이다. |
| 05 | end | 창을 닫아도 로그는 사라지지 않지만, UI는 걷히고 문장만 남는다. |

---

## Scene 01 — 랜딩

- **행동**: 스크롤
- **메시지**: (의도적 무언) — ASCII 눈 = 파놉티콘의 “보는 쪽”
- **증거**: `pointer`·`scrollY` 등 스냅샷 누적 시작 (저장 없음)
- **화면**: 검은 배경의 ASCII 눈 → 중심으로 확대(다이브) → 흰 막이 동공처럼 닫힘 → Scene 02로 연결
- **트랜지션 → 02**: 검은 전면 → 흰 신문; `body` 밝은 톤, mix 타이핑 즉시 시작
- **State 캡처**: `class7/captures/01-entry.png` · `01-dive.png` · `01-to-02.png`

## Scene 02 — 주체

- **행동**: 스크롤 → (타이핑 후) 단어 `key=` 치환 → 2열 전환 · 쿠키/캐시/알고리즘 hover
- **메시지**: FigJam `2:22` (우열 하단 고정)
- **증거**: `DETAILS` 키와 mix 치환·outline 동일 문자열
- **화면**: 1열 full-width 1984 타이핑 → 스크롤 치환 → 우열 주체 ASCII·detail · hover 시 mix 해당 키 outline
- **스크롤 리듬** (`scene02Progress`, 발표 스크립트 합의값): 타자 `0–18%` · 치환 `18–48%` · 2열 `48–74%` · 이후 고정
- **트랜지션 → 03**: 2열에서 주체 이름을 봤음 → 03 `raw-log`는 같은 키의 전체 목록
- **State 캡처**: `02-1col-typing.png` · `02-replace.png` · `02-split.png` · `02-hover-detail.png`

## Scene 03 — 데이터화

- **행동**: 스크롤
- **메시지**: FigJam `2:27`
- **증거**: `ORDERED_KEYS` 순 `raw-log`; diagram 첫 창에 02 리캡 키 우선; `Date=` 레드
- **화면**: 좌 발췌 고정 + 전체 로그 · 우 conduit `===●===>` + diagram 6줄 창 이동
- **트랜지션 → 04**: 중립 `key=` 목록 → 같은 키가 피드 라벨 아래로 재배치
- **State 캡처**: `03-diagram-recap.png` · `03-diagram-scroll.png`

## Scene 04 — 맞춤 정보

- **행동**: 스크롤 (연속 세 cut)
- **메시지**: 1984 발췌 + 유튜브 / 광고 / 스팸 라벨
- **증거**: `FEEDS.youtube` · `FEEDS.ad` · `FEEDS.spam` — 동일 스냅샷, 밀도만 증가
- **화면**: 04a → 04b → 04c, 로그 밀도 증가
- **트랜지션 → 05**: 04c 무게 → 05에서 같은 데이터의 UI화(6창)
- **State 캡처**: `04a-youtube.png` · `04c-spam-dense.png`

## Scene 05 — 정리

- **행동**: 창 닫기 · 드래그
- **메시지**: FigJam `2:24` (2-column 결말)
- **증거**: 창 안 로그 = 04 `FEEDS`
- **화면**: 6창 겹침 → 전부 닫으면 결말 sheet만 · `is-dark` 해제
- **트랜지션 (마무리)**: 추가 스크롤 없음; 문장만 남음
- **State 캡처**: `05-windows.png` · `05-drag.png` · `05-closed.png` · `05-closing.png`

---

## 데이터 아크 (한 문장)

Scene 02에서 열어본 `document.cookie`·`pointer` 등 **같은 키 문자열**이 03 diagram → 04 피드 → 05 창 로그로 따라온다.

## State 캡처 촬영 메모

1. 로컬 서버에서 `index.html` 열기 (예: `python3 -m http.server 8731`).
2. **자동 촬영**: Cursor Playwright MCP에서 `scripts/capture-class7-plugin-fn.js` 실행 (로컬 `node scripts/capture-class7.mjs`는 Chromium 설치 필요).
3. 출력: [`class7/captures/`](class7/captures/) — SCENARIO 표의 파일명과 동일.
4. Scene 02 리듬은 `script.js`의 `SCENE02_*` 상수와 위 **스크롤 리듬** 표가 일치해야 함.

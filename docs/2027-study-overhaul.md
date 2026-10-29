# 2027 상반기 필기 합격 플랜 — 앱 개편 설계

> 목표: 2026년(12·13회) 필기처럼 "지엽적·처음 보는 용어·기출만으론 부족한" 시험에서도 합격(평균 60, 과목별 40 이상).
> 이 문서는 구현 기준(spec)이다. 계약(contract) 파일의 시그니처는 고정이며, 바꾸지 말고 구현만 채운다.

## 1. 왜 바꾸나 — 2026 출제 경향 요약

- 12회(2026-04-04) 합격률 약 28.9%, 13회(2026-09-05) 약 31.9% (커뮤니티 집계). 이전 회차보다 크게 낮다.
- 공통 후기: 지엽적 출제, 처음 보는 개념·용어 다수, 기출 80점이 시험장 50~60점으로 떨어지는 "암기 착시".
- 결론: ① 출제기준 전 범위(세세항목)를 개념 단위로 덮고 ② 보기 하나하나를 학습 단위로 쪼개고
  ③ 보기 섞기·첫 풀이 정답률로 실력을 정직하게 재고 ④ 간격 반복으로 5개월간 유지하고
  ⑤ 계산 문제를 계산기 없이 빠르게 푸는 연습을 매일 한다.
- 목표 시험(제14회, 2027)은 **개정 출제기준**(2027. 1. 1. ~ 2030. 12. 31., 제14회 필기부터, 2026-09-11 공지)을 따른다.
  세세항목 81 → 82: 과목1에 '빅데이터 기술 트랜드 분석'(플랫폼 구조·기술 동향, 인공지능 도입·기술 전망)이 생기고
  '분석모형 설계'가 과목3에서 과목1(1.3.3)로, '데이터 변환·품질 검증'이 과목2 데이터 정제(2.1.1.4–5)로,
  '데이터 분할'이 과목2 데이터 처리(2.1.2.6)로 옮겨졌다. 과목3은 '분석기법 적용' 하나(기초·심화 분석기법 각 8,
  주성분분석 3.1.1.8 신설)만 남고, '분석 도구 선정'·'비즈니스 기여도 평가'는 빠졌다. 앱의 출제기준 트리·문항/카드 태그·
  모의고사 과목 배분은 모두 이 개정판 기준이다.
- (세부 근거·키워드는 `/guide` 페이지와 src/data/guide.ts 참고)

## 2. 학습 방법 (앱이 강제하는 루틴)

| 원칙 | 앱 기능 |
|---|---|
| 출제기준 전범위 개념 | `/concepts` 출제기준 트리 → 세세항목별 개념 카드 (핵심/보통/지엽 표시, 2026 출제 표시) |
| 용어 인식력 | 용어 퀴즈: "다음 설명에 해당하는 용어는?" 카드에서 자동 생성 |
| 보기 단위 학습 | 문제마다 선지별 해설(`optionNotes`) — 왜 틀렸는지, 그 보기는 원래 무엇인지 |
| 암기 착시 제거 | 학습 모드 보기 섞기(기본 ON), 실전 모드 항상 섞기, 대시보드는 "첫 풀이 정답률" 기준 |
| 헷갈림 관리 | 맞혀도 "헷갈림" 표시 → 복습 덱에 들어감 |
| 간격 반복 | Leitner 1·3·7·14·30·60일 (`src/lib/srs.ts`) — 문제·카드 공통 |
| 약점 집중 | 세세항목별 정답률 → 약점 세트 자동 구성 |
| 신유형 대비 | 최신경향 대비 1~3회 (AI 생성·검증, 12·13회 키워드 + 기존 문제가 없던 세세항목) |
| 계산 | `/drill` 무한 생성 계산 드릴 (계산기 없이 풀리는 숫자) |
| 실전 리허설 | 랜덤 모의고사(2027 과목별 20문항 — 문항의 첫 세세항목 태그로 과목을 정하고 세부항목 비례 배분) + 실전 모드 120분 |
| 5개월 페이스 | `/plan` 4단계 플랜 + 홈 "오늘의 학습" |

4단계 플랜 (시험일까지 남은 날 비율): 1 개념 완성 40% · 2 기출·선지 분석 30% · 3 약점·신유형·계산 18% · 4 실전 리허설 12%.

## 3. 아키텍처

- 정적 클라이언트 앱(Next 16 App Router, 모든 페이지 'use client' + localStorage). 백엔드 없음.
- **문제은행 지연 로딩**: `src/data/bank.ts` — 회차별 dynamic import 청크. 홈은 문제 본문을 받지 않는다.
- **메타 인덱스**: `src/data/meta.ts` (생성물, `node scripts/build-meta.mjs`) — 문항 id/과목/토픽, 카드 id/토픽/중요도. 홈 대시보드·준비도는 이것만 쓴다. 메타의 과목은 2027 과목(`criteriaSubjectOf`: 첫 세세항목 태그의 과목, 태그가 없으면 시험지 과목).
- **카탈로그**: `src/data/catalog.ts` — 회차 목록(동기). 출처 라벨: 기출복원 / AI 모의 / 최신경향(AI).
- **출제기준**: `src/data/criteria.ts` — 2027 개정판(제14회 필기부터): 4과목 · 주요항목 10 · 세부항목 21 · 세세항목 82 (과목별 23·25·16·18). 과목 S, 주요항목 S.M, 세부항목 S.M.U, 세세항목 S.M.U.L.
- **개념 카드**: `src/data/concepts/s1..s4.ts` → `loadConcepts()`.
- **기존 storage.ts** 유지(기록·북마크·스트릭·재시도 컨텍스트). 새 통계는 `src/lib/stats.ts`. 기존 전역 오답풀(wrong-stats)은 마이그레이션 후 읽기 전용.

### 3.1 localStorage 키

| 키 | 내용 | 모듈 |
|---|---|---|
| bigdata-cbt-history / -wrong / -answers / -retry-ctx / -bookmarks / -streak / -theme / -reminder* | 기존 | storage.ts 등 |
| bigdata-cbt-wrong-stats | 기존 전역 오답 (마이그레이션 원본) | storage.ts |
| bigdata-cbt-qstats | 문항별 QStat (+복습 덱 srs) | stats.ts |
| bigdata-cbt-cstats | 카드별 CStat | stats.ts |
| bigdata-cbt-activity | 일자별 활동량 | stats.ts |
| bigdata-cbt-mocks | 모의고사/실전 기록 | stats.ts |
| bigdata-cbt-settings | 시험일·목표·보기섞기 | settings.ts |
| bigdata-cbt-migrated-v2 | 마이그레이션 완료 플래그 | stats.ts |
| bigdata-cbt-composed | 구성형 세트(모의고사·약점·토픽)의 시험 키별 문항 id 목록, 최근 30개 키 (기기 로컬, 동기화 안 함) | composed.ts |

### 3.2 모듈 계약 (시그니처 고정 — 파일 상단 주석이 명세)

`src/lib/`: `date.ts`(구현됨) · `rng.ts`(구현됨) · `srs.ts`(구현됨) · `stats.ts` · `settings.ts` · `mastery.ts` · `compose.ts` · `composed.ts` · `plan.ts` · `backup.ts` · `termQuiz.ts` · `drills/{types,index}.ts`

## 4. 화면 명세

공통 스타일: 기존 코드와 동일한 Tailwind 관례 — 카드 `bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6`, 본문 `text-gray-800 dark:text-slate-100`, 보조 `text-gray-500 dark:text-slate-400`, 컨테이너 `max-w-5xl mx-auto px-4 sm:px-6`, 모바일 우선. 새로 만들거나 손대는 요소엔 반드시 `dark:` 변형을 붙인다. 문구는 한국어. localStorage 읽기는 `useEffect` 안에서(SSR/하이드레이션 안전). `useSearchParams`를 쓰는 페이지는 `<Suspense>`로 감싼다.

### 4.1 `/` 홈 허브
1. 헤더: "빅데이터분석기사 필기" + 우측 ThemeToggle, ⚙(/settings).
2. D-day 배너: `D-156 · 2027-04-03 (예상 일정)` + 현재 플랜 단계명 + 전체 진행 바 → /plan. examDateConfirmed=false면 "(예상 · 설정에서 변경)".
3. 오늘의 학습: `dailyTasks()` 결과 — 각 항목 진행(done/target) + 시작 버튼.
4. 합격 준비도: `computeReadiness()` — 상태, 예상 점수와 근거(모의고사/첫 풀이), 과목별 위험 칩, 출제기준 커버리지 n/82, 이유 2개. 최근 실전 모의고사 3회 중 한 번이라도 과목 40점 미만(과락)이면 '합격권'이 아니라 최대 '경계권'.
5. 학습 메뉴 타일: 개념 학습 · 용어 퀴즈 · 오늘의 복습(배지: due 수) · 계산 드릴 · 약점 집중 · 실전 모의고사 · 오답노트 · 북마크 · 합격 전략.
6. 출제기준 히트맵: 과목별 세부항목 셀, 첫 풀이 정답률 색(미응시 회색) → `/concepts?topic=S.M.U`.
7. 회차별 풀기: 섹션 3개 — 최신경향 대비(t1~t3) / 기출복원(2~8회) / AI 모의고사(1·9·10·11). 기존 카드 UI(점수·오답 다시풀기) 재사용.
8. 과목별 풀기(기존 유지, 회차 버튼은 위 그룹 순서).
9. 시험 안내 · 주의사항(출처 라벨 설명, AI 문항은 검증했지만 오류 가능).
10. 첫 방문 시 `migrateLegacyStats(await loadAllQuestions())` 백그라운드 1회 실행 후 통계 갱신.

### 4.2 `/exam` (기존 확장)
- 파라미터: 기존(mode/id/session/wrong/pool) + `pool=review`(due 문항) · `pool=weak&seed=` · `pool=topic&topic=` · `pool=mock&seed=` · `pool=wrong-pool`(복습 덱 전체) · `pool=bookmarks` · `strict=1`(실전 모드).
- seed 없으면 생성 후 `router.replace`로 URL에 고정(새로고침 재현).
- 구성형 세트(mock·weak·topic)는 처음 구성한 문항 id 목록을 시험 키별로 `bigdata-cbt-composed`에 고정해, 새로고침·재방문 때 통계가 바뀌었어도 같은 세트를 다시 쓴다(최근 30개 키). review·wrong-pool은 매번 새로 계산.
- 구성형 세트는 문항을 2027 과목(첫 세세항목 태그의 과목)으로 다시 묶어 화면 그룹·과목별 채점을 2027 배치로 한다. 회차·과목 모드는 시험지 과목 그대로.
- **보기 섞기**: 학습 모드는 settings.shuffleOptions, 실전 모드는 항상. `noShuffle` 문항 제외. 답 저장·채점은 항상 원래 번호 기준(`toOriginalOption`). 키보드 1~4는 화면 위치.
- **헷갈림 토글**: 확인 전 "헷갈림" 버튼 → `recordAnswers([{id, correct, unsure}])`.
- 학습 모드 "확인" 시 즉시 recordAnswers, 제출 시 나머지 답안 일괄 기록(중복 기록 금지). 실전 모드는 제출 시 일괄.
- **실전 모드**: 해설/확인/패스 숨김, 120분(80문항 미만이면 문항당 90초), 제출 후 결과 → saveMockRecord, 해설 보기에서 선지별 해설 공개.
- 해설 영역: 기존 해설 + 선지별 해설(각 보기 아래 작은 글씨, 정답 초록·내 오답 빨강) + 토픽 칩(세세항목명) + "관련 개념 카드" 펼치기(loadConcepts 필터) + `answerDispute` 경고.
- 문항 상단에 출처 배지(기출복원 제5회 / AI 모의 / 최신경향(AI)).
- 결과 화면: 기존 + 이번 시험에서 틀린 세세항목 상위 5개(→ /concepts?topic=).
- 빈 풀: "오늘 복습할 문제가 없어요" 등 안내 + 홈 링크.
- 파일 분리: ExamView 400줄 이하 유지(상태 훅 `useExamSession`, 버튼 영역 컴포넌트 분리).

### 4.3 `/concepts`
- 기본: 출제기준 트리(과목→주요→세부→세세), 각 노드에 카드 수·학습한 카드 수·문항 첫풀이 정답률. 상단 검색(용어/요약 포함 검색).
- `?topic=<id>`: 해당 범위 카드 목록 — 용어, 요약, 핵심 포인트, 헷갈리는 포인트, 공식(KaTeX), 중요도 배지(핵심/보통/지엽), 2026 출제 배지. 카드별 "모름/애매/앎" → gradeCard. 버튼: "이 범위 용어 퀴즈", "이 범위 문제 풀기"(/exam?pool=topic&topic=).
- `?quiz=1[&topic=]`: 용어 퀴즈 20문항(`buildTermQuiz`), 정답 시 gradeCard(good), 오답 시 again, 끝나면 점수 + 틀린 카드 목록.

### 4.4 `/review` 오늘의 복습
- 상단 요약: due 문항 n · due 카드 m.
- 문항 복습 → `/exam?pool=review`.
- 카드 복습(플래시카드): 앞면 용어 → 탭해서 뒤집기(요약·포인트) → 모름/애매/앎/쉬움(again/hard/good/easy) → 다음. 남은 수 표시, 끝나면 요약.
- 아무것도 없으면 축하 + 다음 개념 단원 제안.

### 4.5 `/drill` 계산 드릴
- 종류 칩 다중선택(기본 전체) + 개수(10/20) → `buildDrillSet`. 문제 MathText, 답 후 풀이 공개, 끝나면 점수. addActivity({drills}).

### 4.6 `/plan`
- 4단계 타임라인(날짜·남은 일수·현재 강조), 현재 단계 focus/activities, 세부항목 체크리스트(커버리지 기준), 시험일·목표는 /settings 링크.

### 4.7 `/settings`
- 시험일(date input) + "공식 일정 확정" 체크, 일일 목표 2개, 보기 섞기 토글.
- 백업 내보내기(JSON 다운로드 `bigdata-cbt-backup-YYYYMMDD.json`) / 가져오기(파일 → 병합/교체 확인).
- 초기화: 풀이 기록 · 복습 덱/문항 통계 · 개념 학습 기록 · 전체(각각 confirm).

### 4.8 `/guide` 합격 전략
- `src/data/guide.ts`의 구조화된 콘텐츠를 렌더(섹션 제목, 문단, 불릿, 표). 콘텐츠는 메인이 작성.

## 5. 콘텐츠 파이프라인 (AI 생성 → 독립 검증 → 병합)

- 기존 880문항: 세세항목 태그(2027 개정 id, 가장 관련 깊은 것 먼저 — 첫 태그가 2027 과목을 정함)·문항 유형·키워드·선지별 해설 추가, 번호를 언급하는 해설("4번이 틀림")은 내용 기준으로 재작성(보기 섞기 대비), 위치 의존 보기는 `noShuffle`.
- 정답 의심: AI 모의는 검증 후 수정, 기출복원은 정답을 바꾸지 않고 `answerDispute`로 경고만.
- 개념 카드: 82개 세세항목 전부(2027 개정 출제기준), 핵심 + 지엽 용어, 2026 출제 키워드 표시.
- 최신경향 대비 1~3회(240문항): 12·13회 보고 키워드 + 기존 문항이 없는 세세항목 우선, 계산 약 10%.
- 모든 AI 콘텐츠는 앱에서 출처 라벨로 구분한다. 기출 문제 원문을 외부에서 새로 복제하지 않는다.

## 6. 검증

- `npm test` (vitest, src/**/*.test.ts) — lib 순수 로직·저장소·드릴 정답 재계산·카탈로그 개수 일치·2027 출제기준 트리(82 세세항목)·메타 과목 규칙.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- 수동 스모크: 홈 → 개념 → 퀴즈 → 복습 → 드릴 → 모의고사(실전) → 결과 → 백업/복원.

## 7. 계정 로그인 + 기기 동기화 (사내 공용 PostgreSQL · 전용 스키마)

목표: PC 브라우저에서 풀면 휴대폰에서 로그인했을 때 오답노트·복습 일정·풀이 기록·북마크·설정이 그대로 보이게. 앱은 **로컬 우선**(localStorage)을 유지한다 — 로그인 전에도 그대로 쓸 수 있고, 로그인하면 동기화 엔진이 선택한 키를 레코드 단위로 DB와 맞춘다(레코드별 last-write-wins).

### 7.1 서버 공통
- DB 접근은 Route Handler(Node 런타임)에서만. 접속은 `src/server/db.ts` 하나: pg Pool `max: 2`, `idleTimeoutMillis: 10000`, `connectionTimeoutMillis: 5000`, 모듈 싱글턴(개발 HMR 대비 globalThis 캐시).
- 접속 정보는 환경변수만: `DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME, DB_SCHEMA, DB_CA_PEM_B64`. DB_SCHEMA는 `^[a-z_][a-z0-9_]{0,62}$` 검증 후 SQL에 따옴표 식별자로만 쓴다. **서버 주소·계정 정보를 코드·문서에 쓰지 않는다**(공개 저장소).
- TLS(필수): localhost·127.x·점 없는 이름(문자로 시작하는 라벨만 — 정수·0x 숫자 표기 호스트는 원격으로 취급)이 아니면 `ssl: { ca: <DB_CA_PEM_B64 디코드>, rejectUnauthorized: true }`, IPv4면 `host: <그 IP>`도 추가. 연결문자열은 쓰지 않는다(sslmode가 ssl 객체를 덮어쓰는 문제 회피). CA가 없으면 접속하지 않고 오류.
- 응답 형식 `{ ok: true, data }` / `{ ok: false, error }`(한국어 문구). 서버 오류는 console.error로 남기고 사용자에겐 일반 문구.
- 모든 POST: `Content-Type: application/json`이 아니면 415(쿠키 인증의 CSRF 방어 보조), 본문 크기 제한, IP별 메모리 레이트리밋(로그인 분당 20회, 동기화 분당 60회) → 429. 클라이언트 IP = x-forwarded-for의 **맨 오른쪽** 항목(앞단 프록시가 기록) → x-real-ip. Vercel 같은 프록시 뒤에서 돌린다는 전제(직접 노출하면 헤더 위조 가능).

### 7.2 계정 (회원가입 없음 — 계정은 운영 스크립트로만 만든다)
```sql
create table if not exists <schema>.users (
  id bigserial primary key, username text not null unique, password_hash text not null,
  failed_attempts int not null default 0, locked_until timestamptz,
  created_at timestamptz not null default now(), last_login_at timestamptz);
create table if not exists <schema>.sessions (
  token_hash text primary key, user_id bigint not null references <schema>.users(id) on delete cascade,
  persistent boolean not null, created_at timestamptz not null default now(),
  expires_at timestamptz not null, last_seen_at timestamptz not null default now());
create index if not exists sessions_user on <schema>.sessions (user_id);
```
- 비밀번호 해시: Node 내장 `crypto.scrypt`(N=16384, r=8, p=1, 64바이트, 16바이트 salt) → `scrypt$N$r$p$salt$hash`(base64), 비교는 timingSafeEqual. 존재하지 않는 아이디도 같은 시간이 걸리도록 더미 해시와 비교.
- 로그인 실패 10회 → 15분 잠금(DB의 failed_attempts/locked_until, 성공 시 0으로). 시도는 scrypt 전에 UPDATE 한 문장으로 **먼저 예약**(잠금 중이면 건너뜀, 10번째 예약이 잠금 시작)하고 성공 시 환불 → 동시 요청으로 한도를 넘길 수 없다. 잠금 중이어도 더미 해시를 비교해 응답 시간이 같고, 없는 아이디도 인스턴스 메모리에서 같은 규칙으로 잠긴다(429로 계정 존재가 드러나지 않게). 계정별 잠금이라 남이 실패를 반복해 새 기기 로그인을 막을 수는 있다(기존 400일 세션은 유지) — 알려진 한계. 실패 메시지는 항상 "아이디 또는 비밀번호가 올바르지 않습니다"(잠금 중이면 "잠시 후 다시 시도해 주세요").
- 세션: 무작위 32바이트 토큰 → sha256만 DB에 저장. 원문은 쿠키 `bigdata_session`(HttpOnly, SameSite=Lax, Path=/, 운영에서는 Secure).
  - **로그인 상태 유지 체크(기본 ON)**: 쿠키 Max-Age = **400일**(브라우저 최대치), DB expires_at = 400일. 인증 요청마다, 마지막 연장 후 하루가 지났으면 expires_at과 쿠키를 다시 400일로 연장 → 쓰는 동안 로그인이 풀리지 않는다.
  - 체크 해제: 세션 쿠키(브라우저 종료 시 삭제), DB expires_at = 1일.
- API: `POST /api/auth/login {username, password, remember}` / `POST /api/auth/logout` / `GET /api/auth/me` → `{ username }` 또는 401 / `POST /api/auth/password {current, next}`(8자 이상 권장, 최소 6자; 성공 시 다른 세션 모두 폐기).
- 운영 스크립트 `scripts/db-setup.mjs`: `migrate`(테이블 생성, 멱등, schema_migrations 기록) · `create-user <아이디>`(비밀번호는 환경변수 `NEW_USER_PASSWORD`로만 받고 출력하지 않음, 이미 있으면 비밀번호 갱신 + 잠금 해제 + **그 계정의 세션 전부 폐기** — 탈취 복구 경로) · `users`(계정 수·아이디만 출력).

### 7.3 동기화 API
```sql
create table if not exists <schema>.sync_records (
  user_id bigint not null references <schema>.users(id) on delete cascade,
  ns text not null, key text not null, value jsonb,                 -- null = 삭제(tombstone)
  updated_at timestamptz not null, device text not null, version bigint not null,
  primary key (user_id, ns, key));
create sequence if not exists <schema>.sync_version_seq;
create index if not exists sync_records_user_version on <schema>.sync_records (user_id, version);
create table if not exists <schema>.schema_migrations (id text primary key, applied_at timestamptz not null default now());
```
- `POST /api/sync`(세션 쿠키 필수, 없거나 만료면 401). 요청 `{ device(1..64자, [A-Za-z0-9_-]), cursor(10진 bigint 문자열, 처음 '0'), changes: [{ ns, key(1..160자), value(JSON|null, 직렬화 64KB 이하), updatedAt(ISO) }] (최대 2000) }`, 본문 1.5MB 이하.
- 한 트랜잭션: updatedAt이 now+5분보다 미래면 now로 자름 → unnest 일괄 upsert(`기존.updated_at < 새.updated_at`일 때만 갱신, 같으면 기존 유지, version = nextval) → `version > cursor` 순서대로 최대 3000건 + **거절된 변경의 현재 서버값**을 함께 반환.
- 응답 data: `{ cursor, changes: [{ns,key,value,updatedAt,device}], more, accepted }`.

### 7.4 동기화 대상 (ns → localStorage)
| ns | key | 원본 | 자체 시각(stamp) | 적용 |
|---|---|---|---|---|
| qstat | 문항 id | bigdata-cbt-qstats[id] | value.last | 설정/삭제 |
| cstat | 카드 id | bigdata-cbt-cstats[id] | value.last | 설정/삭제 |
| activity | 날짜 | bigdata-cbt-activity[day] | — | 설정 |
| mock | `key|date` | bigdata-cbt-mocks[] | value.date | 배열 upsert(최신 100개) |
| history | 시험 키 | bigdata-cbt-history[] | value.date | upsert/삭제 |
| wrong | 시험 키 | bigdata-cbt-wrong[key] | history[key].date | 설정/삭제 |
| retry | 시험 키 | bigdata-cbt-retry-ctx[key] | — | 설정/삭제 |
| answers | 시험 키 | bigdata-cbt-answers[key] | history[key].date | 설정/삭제 |
| bookmark | 문항 id | bigdata-cbt-bookmarks[] | — | 추가/제거 |
| studyday | 날짜 | bigdata-cbt-streak.days | — | 추가만, current/best 재계산 |
| settings | 'settings' | bigdata-cbt-settings | — | 설정 |

동기화하지 않음: 테마, 알림 설정, 마이그레이션 플래그, 레거시 wrong-stats, 동기화 메타, 저장된 아이디. 동기화 메타·저장된 아이디는 기기 전용이라 **백업 내보내기/가져오기에서도 제외**(가져온 기록은 다음 scan에서 로컬 변경으로 올라간다).

알려진 한계: 카운터(activity의 하루 집계, qstat의 n/c)도 레코드 단위 LWW라, 두 기기가 같은 날·같은 문항을 오프라인으로 풀면 한쪽 횟수만 남는다(합산하지 않음). 합산하려면 기기별 키('day|device') 등 프로토콜 변경이 필요해 보류.

### 7.5 클라이언트 (`src/lib/auth.ts`, `src/lib/sync/`)
- 메타 키 `bigdata-cbt-sync`: `{ username?, userId?, device, cursor, synced: {"ns|key": hash}, dirty: {"ns|key": ISO}, initialDone, baseline?: {"ns|key": hash}, lastSyncAt?, lastError? }`. 세션 토큰은 HttpOnly 쿠키라 JS가 모른다 — 로그인 여부는 메타의 username + `GET /api/auth/me`로 확인.
- scan: 레코드 해시(FNV-1a, 키 정렬 JSON)가 synced와 다르면 dirty. 시각 = stamp가 있으면 stamp, 없으면 **계정과 첫 동기화가 끝나기 전, 로그인 시점부터 그대로인 기록(baseline: 로그인 때 stamp 없는 로컬 기록의 해시)만 1970-01-01**(서버에 있는 기록을 덮지 않고 빈 곳만 채움), 로그인 후 바뀐 기록·삭제는 첫 동기화가 중단돼도 지금. baseline은 initialDone이 되면 지운다. synced에 있는데 로컬에서 사라진 삭제 가능 ns 레코드는 tombstone(null).
- syncNow: 동시 실행 잠금, 오프라인·비로그인이면 건너뜀. dirty를 2000개씩 보내고, 응답의 각 변경에 대해: 로컬 해시 == 원격 해시 → 완료 처리 / 로컬이 dirty이고 dirty 시각 > 원격 updatedAt → 로컬 유지 / 그 외 → 원격 값을 어댑터로 적용. `more`이거나 dirty가 남으면 반복(최대 20회). 원격 적용이 1건 이상이면 `window`에 `bigdata-cbt-synced` 이벤트. 401이면 로그아웃 상태로 전환.
- 로그인 성공 시: 메타의 userId가 **다른 계정**이면 이 기기의 학습 기록(동기화 대상 키)을 먼저 비우고, 같은 계정이거나 처음이면 로컬 기록을 계정에 합친다(1970 규칙). 로그아웃: 서버 세션 폐기 + 메타의 username/cursor/synced/dirty 초기화(로컬 기록은 남김). 올리지 못한 변경이 남아 있으면 건수를 알리고 사용자가 확인해야 로그아웃(`logout({ force })`). 다른 계정으로 로그인할 때 이전 계정(만료된 세션 포함)의 올리지 못한 변경이 있으면 새 세션을 바로 폐기하고 건수를 알린 뒤, 확인(`discardUnsynced`)해야 기록을 비운다.
- 자동 동기화: 앱 시작(로그인 상태면), 화면 복귀(visible), 화면 이탈(hidden, keepalive), online, dirty가 있으면 45초마다. 자동 재시도는 지수 백오프.
- 공개 API: `getAuthState, login, logout, changePassword, getSyncStatus, syncNow, startAutoSync(): cleanup, SYNC_EVENT`.

### 7.6 화면
- `/login`: 아이디, 비밀번호(브라우저·휴대폰 비밀번호 저장 기능과 호환되도록 `autocomplete="username"` / `"current-password"`), 체크박스 **로그인 상태 유지**(기본 ON) · **아이디 저장**(localStorage `bigdata-cbt-saved-username`, 비밀번호는 저장하지 않음). 성공 → 동기화 → 홈.
- `SyncProvider`(layout에 장착): 로그인 상태면 자동 동기화, 다른 기기 기록을 받으면 짧은 안내.
- `useSyncRefresh()`: 동기화 이벤트마다 증가 → 홈·플랜·개념·복습 목록·설정이 다시 읽기(풀이 중인 시험/드릴/퀴즈는 건드리지 않음).
- 홈 헤더: 로그인 전 "로그인" 버튼, 로그인 후 "아이디 · ☁ n분 전 동기화"(오류 시 ⚠).
- 설정 "계정·동기화": 상태, 지금 동기화, 비밀번호 변경, 로그아웃.

### 7.7 운영
- Vercel 운영 env: DB_*(호스트는 외부 입구 주소). DB_PASS·DB_CA_PEM_B64는 Sensitive.
- 백업: 사내 DB 매일 02:30 전체 백업(14일) — 스키마 자동 포함.

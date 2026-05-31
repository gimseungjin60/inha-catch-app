# Inha-Catch 프로젝트 개요

> 작성일: 2026-04-21 · 대상 브랜치: `develop`
> 이 문서는 팀 신규 인원/교수님이 프로젝트 전체를 빠르게 이해할 수 있도록 정리한 개요입니다. "(추정)"이 붙은 항목은 소스만으로 100% 확정 불가한 부분입니다.

---

## 1. 프로젝트 개요

- **프로젝트명**: Inha-Catch (인하캐치)
- **목적**: 인하공전 학생들을 위한 장학금·공모전 정보 통합 조회 및 맞춤 추천 서비스
- **핵심 기능**
  - 인하공전 공식 사이트, 위비티(wevity), 씽굿(thinkcontest)에서 자동 크롤링
  - Google Gemini API로 공고 본문 요약 / Markdown 정규화
  - 학과·키워드 기반 맞춤 추천
  - 북마크, 마감 임박(D-3) 알림 (FCM 푸시)
  - 이메일/비밀번호 인증 + 카카오 OAuth 로그인

---

## 2. 아키텍처

```
[React Native(Expo) 앱]  ──HTTPS/JSON──▶  [Spring Boot 8080]  ──JPA──▶ [MySQL 8.0]
       │                                      │   │   │
       │                                      │   │   └──▶ Firebase FCM
       │                                      │   └─────▶ Google Gemini
       └─────── 카카오 네이티브 로그인 ──────▶   └─────────▶ 크롤 대상 3개 사이트
                                                           (inhatc / wevity / thinkcontest)
```

### 기술 스택

| 계층 | 기술 |
|---|---|
| 프론트엔드 | React Native 0.83 · Expo 55 · Expo Router · AsyncStorage · axios |
| 백엔드 | Spring Boot 4.0.3 · Java 17 · JPA/Hibernate · jsoup 1.17.1 |
| DB | MySQL 8.0 |
| 인증 | JWT(Access+Refresh) · BCrypt · Kakao OAuth |
| AI | Google Gemini 2.5 Flash |
| 푸시 | Firebase Admin SDK 9.2.0 (FCM) |
| 인프라 | Docker / Docker Compose · GitHub Actions |

### 비동기 파이프라인 흐름

```
CrawlScheduler (1h / 6h)
        │
        ▼
CrawlService ──▶ InhatcCrawler / WevityCrawler / ThinkContestCrawler
        │
        ▼
ApplicationEventPublisher.publishEvent(CrawlEvent)
        │
        ▼   @EventListener @Async
CrawlPipeline
  1) isOutdated() 판정(연도·마감일)
  2) contentHash 중복 판별 → upsert
  3) GeminiService 요약/마크다운화
  4) 신규 시 키워드/학과 매칭 → Notification + FCM
  5) 실패 시 CrawlErrorLog 저장

NotificationScheduler (매일 09:00)
  북마크한 공고 중 D-3 → DEADLINE 알림 생성
```

---

## 3. 디렉토리 구조

### 3.1 백엔드 `inha-catch-server/`

```
src/main/java/com/example/demo/
├── AdminInitializer.java            # 최초 관리자 계정 자동 생성
├── AuthController.java              # 회원가입·로그인·OAuth·토큰 갱신
├── BookmarkController.java          # 북마크 CRUD
├── CrawlScheduler.java              # 내부 1h / 외부 6h 주기 크롤 스케줄러
├── CrawlService.java                # 크롤링 오케스트레이션
├── CrawlingController.java          # 관리자 수동 크롤 트리거
├── FcmService.java                  # Firebase Admin SDK 래퍼
├── GeminiService.java               # Gemini API 호출 + 프롬프트
├── GlobalExceptionHandler.java      # 전역 예외
├── InhatcCrawler.java               # 인하공전 공식 크롤러
├── KakaoOAuthService.java           # 카카오 OAuth 토큰 교환
├── NotificationController.java      # 알림 조회/읽음
├── NotificationScheduler.java       # 마감 D-3 알림 생성
├── ScholarshipController.java       # 장학금 목록/검색/상세/추천
├── ThinkContestCrawler.java         # 씽굿 크롤러
├── UserController.java              # 프로필·FCM 토큰 등록 (추정)
├── UserRepository.java
├── WevityCrawler.java               # 위비티 크롤러
├── config/AsyncConfig.java          # @Async 스레드풀
├── entity/
│   ├── Scholarship.java, ScholarshipAttachment.java
│   ├── User.java, UserBookmark.java, UserViewLog.java
│   ├── Notification.java
│   ├── TokenBlacklist.java, CrawlErrorLog.java
├── event/CrawlEvent.java            # 크롤 완료 이벤트
├── pipeline/CrawlPipeline.java      # @Async 파이프라인
├── repository/CrawlErrorLogRepository.java
└── security/
    ├── JwtUtil.java
    ├── JwtAuthenticationFilter.java
    ├── RateLimitFilter.java
    └── SecurityConfig.java

src/main/resources/
├── application.properties
├── application-local.properties     # .gitignore 처리
└── schema.sql                       # Docker 첫 기동 시 자동 실행
```

### 3.2 프론트엔드 `inha-catch-app/`

```
app/
├── (tabs)/
│   ├── index.tsx          # 홈(전체 목록)
│   ├── search.tsx         # 검색
│   ├── bookmark.tsx       # 북마크
│   ├── notifications.tsx  # 알림
│   ├── profile.tsx        # 내정보
│   └── _layout.tsx        # 탭 네비
├── details/[id].tsx       # 상세 (동적 라우트)
├── login.tsx · signup.tsx
├── admin.tsx              # 관리자 패널 (추정)
├── legal.tsx              # 약관/개인정보
├── _layout.tsx            # 루트 레이아웃 (UserProvider/BookmarkProvider)
└── modal.tsx

api/axios.ts               # 인터셉터: JWT 자동 주입, 401 시 refresh
context/
├── UserContext.tsx        # 프로필(이름/학과/키워드/로그인상태)
└── BookmarkContext.tsx    # 로컬 + 서버 북마크 동기

lib/
├── fcm.ts                 # Firebase 초기화 + 토큰 등록
├── kakao.ts               # 카카오 SDK 초기화/로그인
└── sentry.ts              # 에러 리포팅(DSN 없으면 스킵)

components/ScholarshipCard.tsx 등
app.json · eas.json · .env.example
```

### 3.3 루트

```
docker-compose.yml            # mysql + backend 한 번에 기동
.github/workflows/
  backend-ci.yml              # compileJava + test
  app-typecheck.yml           # tsc --noEmit
docs/
  PRIVACY_POLICY.md
  TERMS_OF_SERVICE.md
  PROJECT_OVERVIEW.md         # ← 이 문서
```

---

## 4. 백엔드 REST 엔드포인트

| Method | Path | 기능 | 인증 | 비고 |
|---|---|---|---|---|
| POST | `/api/auth/signup` | 회원가입 | ❌ | RateLimit 적용 |
| POST | `/api/auth/login` | 로그인 | ❌ | RateLimit 적용 |
| POST | `/api/auth/kakao/token` | 카카오 로그인 | ❌ | accessToken 교환 |
| POST | `/api/auth/refresh` | 토큰 갱신 | ❌ | |
| POST | `/api/auth/logout` | 로그아웃 | ✅ | 토큰 블랙리스트 |
| POST | `/api/auth/change-password` | 비밀번호 변경 | ✅ | |
| POST | `/api/auth/reset-password` | 임시비번 발급 | ❌ | 이메일 발송 **미구현(TODO)** |
| GET | `/api/scholarships` | 목록(페이징) | ❌ | |
| GET | `/api/scholarships/{id}` | 상세 | ❌ | |
| GET | `/api/scholarships/search?keyword=` | 검색 | ❌ | |
| GET | `/api/scholarships/recommended` | 추천 | ❌ (추정) | 점수 기반 상위 20 |
| POST/DELETE/GET | `/api/bookmarks` | 북마크 CRUD | ✅ | |
| GET | `/api/notifications` | 알림 목록 | ✅ | |
| GET | `/api/notifications/unread-count` | 미읽음 수 | ✅ | |
| POST | `/api/notifications/{id}/read` | 읽음 처리 | ✅ | |
| POST | `/api/user/fcm-token` | FCM 토큰 등록 | ✅ | |
| PUT | `/api/user/profile` | 프로필 수정 | ✅ | |
| GET | `/api/crawl/**` | 크롤 수동 실행/관리 | ADMIN | 스케줄러가 자동 수행, 수동은 운영용 |
| GET | `/actuator/health` | 헬스체크 | ❌ | |
| GET | `/actuator/**` | 기타 Actuator | ADMIN | |

**Spring Security 경로 요약**
- `permitAll`: `/api/auth/**` (change-password 제외), `/api/scholarships/**` (GET), `/actuator/health`, `/actuator/info`
- `authenticated`: `/api/auth/change-password`, 그 외 인증 필요 경로
- `hasRole('ADMIN')`: `/api/crawl/**`, 기타 `/actuator/**`

---

## 5. 주요 모듈 상세

### 5.1 크롤러 3종

- **InhatcCrawler**: `https://www.inhatc.ac.kr/bbs/kr/{boardId}/artclList.do` (14·16·17). Jsoup 테이블 파싱, 올해+전년도만, `(source_site, board_id, article_id)` 유니크로 중복 제어.
- **WevityCrawler**: `https://www.wevity.com/?c=find&s=1&gub=1&gp={page}`. 목록에서 `ix=` 추출 후 상세 파싱. "D-n" 정규식으로 D-Day 추출.
- **ThinkContestCrawler**: `https://www.thinkcontest.com` 상세 페이지의 JSON-LD 구조화 데이터 + Jsoup 혼합. contest_pk 탐색 범위 ±N 확장.

### 5.2 GeminiService

- `PROMPT_MARKDOWN`: 앱 상세 화면용 Markdown 재구성. 섹션 순서 고정(`## 지원 대상` → `## 신청 방법` → `## 혜택/시상` → `## 접수 기간` → `## 제출 서류` → `## 문의`), 원문에 없는 내용 금지, 이미지/광고 제거.
- `PROMPT_UNIFIED`: 상태 판정(`NEW` / `UPDATE` / `SKIP_OLD` / `SKIP_DUP`) 및 기본 필드 요약 생성.
- 실패/짧은 본문 시 `SKIP_SHORT` 태그 반환 → Pipeline에서 스킵.

### 5.3 CrawlPipeline

1. `isOutdated()` — 제목·본문의 최대 연도 < `currentYear-1`이거나 접수 마감일 경과면 `basicSummary`/`detailSummary`에 "접수 마감되었거나..." 고정 문구 저장
2. `contentHash = SHA-256(content)` → 동일 해시면 upsert 처리
3. Gemini 요약 후 `detail_summary`, `basic_summary` 채움
4. 신규 데이터면 사용자 키워드/학과 매칭 → `Notification` 생성 + FCM 전송
5. 예외는 `CrawlErrorLog`에 적재하고 다음 항목으로 진행

### 5.4 FcmService / NotificationScheduler

- `FcmService`: `firebase-service-account.json` 경로가 비어있으면 비활성(로컬 개발용 안전장치).
- `NotificationScheduler`: 매일 09:00 북마크 기반 D-3 DEADLINE 알림 생성 후 FCM 발송.
- 알림 타입: `DEADLINE`, `NEW`, `RECOMMEND`, `SYSTEM`.

### 5.5 KakaoOAuthService

1. 앱에서 네이티브 SDK로 카카오 access token 획득
2. 서버 `POST /api/auth/kakao/token {accessToken}`
3. `kapi.kakao.com/v2/user/me` 호출 → id/nickname/email 획득
4. `provider=KAKAO`, `providerId=카카오 ID`로 조회→생성
5. 자체 JWT(Access+Refresh) 발급

### 5.6 JWT / RateLimit

- Access 1h, Refresh 14d. HS256, secret은 `JWT_SECRET`(256bit Base64) 필수.
- 로그아웃 시 토큰을 `token_blacklist`에 기록, `JwtAuthenticationFilter`에서 검증.
- `RateLimitFilter`: IP 기준 1분 윈도우 — 로그인/회원가입 10, 비번 재설정 3, 기타 60 req/min (추정).

### 5.7 추천 알고리즘 (ScholarshipController.calculateScore)

| 조건 | 가산점 |
|---|---|
| 제목/자격/요약에 사용자 `major` 포함 | +30 |
| 사용자 `keywords` 각각 매칭 | +50/개 |
| D-7 이내 마감 | +20 |
| 공모전/대외활동 타입 | +10 |

점수 > 0 항목만 내림차순 정렬 후 상위 20건 반환. 추천 사유 문자열 동반.

---

## 6. 앱 주요 화면

| 화면 | 파일 | 설명 |
|---|---|---|
| 홈 | `app/(tabs)/index.tsx` | 전체 목록, 카테고리 탭, Pull-to-refresh, 알림 벨 |
| 검색 | `app/(tabs)/search.tsx` | 키워드 검색, 실시간 결과 |
| 북마크 | `app/(tabs)/bookmark.tsx` | 저장 공고 목록. 로컬 AsyncStorage ↔ 서버 동기화 |
| 알림 | `app/(tabs)/notifications.tsx` | 타입 아이콘·상대시간·미읽음 뱃지 |
| 내정보 | `app/(tabs)/profile.tsx` | 이름/학과/키워드 편집, 비번 변경, 로그아웃 |
| 상세 | `app/details/[id].tsx` | Markdown 렌더링, 북마크 토글, 원문 링크 |
| 로그인 | `app/login.tsx` | 이메일+카카오, 비번 재설정 모달 |
| 회원가입 | `app/signup.tsx` | 유효성 검사 + 약관 동의 |
| 약관 | `app/legal.tsx` | 개인정보처리방침·서비스 약관 |
| 관리자 | `app/admin.tsx` | 관리자용 화면 (추정) |

---

## 7. 설정 / 운영

### 7.1 환경변수

**서버 `.env`**
```env
JWT_SECRET=                  # 필수, openssl rand -base64 48
DB_URL=jdbc:mysql://localhost:3306/inha_catch?serverTimezone=Asia/Seoul&useUnicode=true&characterEncoding=UTF-8
DB_USERNAME=root
DB_PASSWORD=
GEMINI_API_KEY=              # 필수
KAKAO_REST_API_KEY=          # 필수
KAKAO_REDIRECT_URI=http://localhost:8080/api/auth/kakao/callback
FIREBASE_SERVICE_ACCOUNT_PATH= # 비워두면 FCM 비활성
SERVER_PORT=8080
ADMIN_INIT_EMAIL=            # 둘 다 설정 시만 초기 관리자 생성
ADMIN_INIT_PASSWORD=
ADMIN_INIT_NAME=관리자
```

**앱 `.env`**
```env
EXPO_PUBLIC_API_URL=             # 예: http://localhost:8080, http://10.0.2.2:8080
EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY=
EXPO_PUBLIC_SENTRY_DSN=          # 선택
```

### 7.2 `application.properties` 핵심
- `spring.profiles.active=local`
- `spring.config.import=optional:file:./.env[.properties]`
- `spring.jpa.hibernate.ddl-auto=none` (스키마는 `schema.sql`로 관리)
- Actuator는 `health`, `info`, `metrics`만 노출. 상세는 `when-authorized`.

### 7.3 Docker Compose

`docker-compose.yml`: `mysql` + `backend` 두 서비스. MySQL 첫 부팅 시 `schema.sql`을 `/docker-entrypoint-initdb.d/`에 마운트해 초기화. `backend`는 `depends_on.mysql.condition=service_healthy`로 대기.

### 7.4 CI

- `backend-ci.yml`: JDK 17 + Gradle 캐시 → `./gradlew compileJava` → 테스트.
- `app-typecheck.yml`: Node 20 → `npm ci --legacy-peer-deps` → `tsc --noEmit`.

### 7.5 초기 관리자 생성

`AdminInitializer`가 서버 기동 시 한 번 실행. `ADMIN_INIT_EMAIL`·`ADMIN_INIT_PASSWORD` 둘 다 있어야 생성, 이미 같은 이메일이 있으면 스킵. 첫 로그인 후 비밀번호 변경을 안내.

---

## 8. 적용된 보안 장치

- JWT(Access+Refresh) + 로그아웃 토큰 블랙리스트
- BCrypt 해싱, 비밀번호 정책 `^(?=.*[A-Za-z])(?=.*\d).{8,}$`
- CORS 화이트리스트(localhost:8081 / 19006 / 10.0.2.2:8081) + 허용 헤더 명시
- CSRF 비활성(Stateless), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Cache-Control: no-cache,no-store`
- `RateLimitFilter` (IP 기반)
- 시크릿 전부 `.env` / `@Value` 주입. `.gitignore`에 `.env`, firebase-service-account 키 제외
- 회원가입 시 role 강제 설정(USER) — 권한 상승 요청 차단
- 임시 비밀번호는 UUID 12자리로 발급, 로그에 남기지 않음

---

## 9. 알려진 제한사항 / TODO

- [ ] **비밀번호 재설정 이메일 발송 미구현** — `AuthController.resetPassword` TODO, 현재 임시비번을 사용자에게 전달할 방법 없음
- [ ] 카카오 `nativeAppKey`가 `app.json`에 평문. EAS Secrets로 분리 검토
- [ ] 크롤 실패 외 다른 Observability (대시보드/Sentry 서버측)
- [ ] 추천 알고리즘 고도화(ML/협업 필터링)
- [ ] i18n 미지원 (한국어 전용)
- [ ] 이미지 캐싱, 오프라인 목록 모드
- [ ] 루트 `package.json`/`package-lock.json` 실수로 생성된 흔적 존재 → 정리 및 `.gitignore` 추가 권장

---

## 10. 빌드 / 실행

### 10.1 서버 단독 (로컬 MySQL 이미 있음)
```bash
cd inha-catch-server
cp .env.example .env      # 값 채우기
./gradlew bootRun
```

### 10.2 Docker Compose로 전체 기동
```bash
# 루트에서
cp inha-catch-server/.env.example inha-catch-server/.env   # 값 채우기
docker-compose up -d
docker-compose logs -f backend
```

### 10.3 앱 (개발)
```bash
cd inha-catch-app
npm install --legacy-peer-deps
cp .env.example .env      # EXPO_PUBLIC_API_URL 설정
npx expo start            # i=iOS, a=Android, w=web
```

### 10.4 EAS 빌드
```bash
cd inha-catch-app
eas login
eas build --profile preview --platform android     # APK (테스트)
eas build --profile production --platform android  # AAB (배포)
```

---

## 11. DB 스키마 (요약)

주요 테이블 (`schema.sql` 기준, 상세 컬럼은 `entity/*.java` 참고):

- `user` — 이메일/비밀번호(BCrypt)/이름/학과/키워드/role(USER|ADMIN)/provider
- `scholarship_post` — `(source_site, board_id, article_id)` UNIQUE, title/content/basic_summary/detail_summary/apply_period/d_day/content_hash
- `scholarship_attachment` — scholarship_post N:1, url/filename
- `user_bookmark` — user × scholarship (N:N)
- `notification` — user_id/type(DEADLINE|NEW|RECOMMEND|SYSTEM)/title/body/scholarship_id/read_at
- `user_view_log` — 조회 기록
- `token_blacklist` — 로그아웃 토큰 저장, 만료일
- `crawl_error_log` — 크롤 실패 원인 누적

---

## 부록: 최근 커밋 히스토리

```
feat: 카카오 로그인/FCM/외부 크롤러 통합 및 보안 정리   ← 현재(develop HEAD)
feat: 보안 강화, 추천 알고리즘, 관리자 시스템, DB 스키마 확장
로그인, 회원가입, 로그아웃 기능 수정 완료
llm 연동 및 전체적인 기능 보정
장학금 및 공모전 분류, 검색, 저장, 알림, 내정보 완료 후 커밋
fix: resolve merge conflicts
feat: 피그마 UI 디자인 적용 및 API 연동
인하공전 장학정보 크롤러 구현
```

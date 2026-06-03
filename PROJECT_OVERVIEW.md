# InhaCatch (인하캐치) — 프로젝트 종합 정리

> 인하공전 학생을 위한 **장학금 · 공모전 · 채용정보 자동 수집 + AI 맞춤 추천** 서비스
> 최종 정리일: 2026-06-03

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | InhaCatch (인하캐치) |
| 목적 | 인하공전 및 외부 사이트의 장학금·공모전·채용정보를 자동 크롤링하고, AI 요약·맞춤 추천·챗봇 Q&A 제공 |
| 구성 | **3개 서브 프로젝트** (모바일 앱 / 백엔드 서버 / 어드민 웹) |
| 모바일 앱 | React Native 0.81 + Expo SDK 54 (bare workflow), TypeScript |
| 백엔드 | Spring Boot 4 / Java 17 / JPA(Hibernate) / MySQL 8 |
| 어드민 웹 | Next.js 16 + React 19 + Tailwind v4 + shadcn/ui |
| AI 엔진 | Google Gemini 2.5 Flash (요약 생성 · 챗봇) |
| 푸시 알림 | Firebase Cloud Messaging (FCM) |
| 모니터링 | Sentry + Spring Boot Actuator |

---

## 2. 시스템 아키텍처

```
┌──────────────────────┐     ┌──────────────────────┐
│   모바일 앱 (Expo)    │     │  어드민 웹 (Next.js)  │
│  홈·검색·저장·알림    │     │  대시보드·사용자·크롤  │
│  ·프로필·지원관리·챗봇 │     │  ·알고리즘·알림·설정   │
└───────────┬──────────┘     └───────────┬──────────┘
            │ REST API (HTTPS / JWT)      │
            └──────────────┬──────────────┘
                           ▼
        ┌──────────────────────────────────────┐
        │           Spring Boot 서버            │
        │  ┌────────────────────────────────┐  │
        │  │  REST API + JWT + RateLimit     │  │
        │  │  Auth·Scholarship·Bookmark·     │  │
        │  │  Notification·User·Admin·Chat·  │  │
        │  │  Application·Crawl              │  │
        │  └────────────────────────────────┘  │
        │  ┌─────────┐ ┌──────────┐ ┌────────┐ │
        │  │ Crawler  │→│ Pipeline │→│  FCM   │ │
        │  │ 4종 소스 │ │ (AI 요약) │ │ (푸시) │ │
        │  └─────────┘ └──────────┘ └────────┘ │
        │              ┌──────────┐             │
        │              │ MySQL DB │             │
        │              └──────────┘             │
        └──────────────────────────────────────┘
                           │
        외부 데이터 소스 ───┘
        · 인하공전 게시판(장학·공모전)  · 잡알리오 OpenAPI(채용)
        · 위비티(Wevity 공모전)  · 씽크콘테스트(ThinkContest)
```

---

## 3. 서브 프로젝트 구조

```
Inha_Catch/
├── inha-catch-app/        # 모바일 앱 (Expo / React Native)
├── inha-catch-server/     # 백엔드 (Spring Boot)
├── inha-catch-admin/      # 어드민 웹 (Next.js)
├── docs/                  # 문서
├── docker-compose.yml     # 컨테이너 구성
├── README.md
└── PROJECT_OVERVIEW.md    # (본 문서)
```

### 3.1 모바일 앱 `inha-catch-app/`
```
app/
├── index.tsx              # Welcome 화면
├── login.tsx / signup.tsx # 로그인 / 회원가입
├── agree-terms.tsx        # 약관 동의
├── admin.tsx              # (구) 앱 내장 관리자 화면
├── applications.tsx       # 지원 현황 트래킹
├── legal/                 # 개인정보처리방침 · 이용약관
├── (tabs)/                # 홈·검색·북마크·알림·프로필
└── details/[id].tsx       # 상세 화면 (+ AI 챗봇)
api/axios.ts               # API 클라이언트 (인터셉터, 토큰 자동 갱신, 터널 지원)
components/                # ScholarshipCard, ScholarshipChat, Themed 등
context/                   # User / Bookmark / Application 상태 관리
hooks/                     # useNotifications(FCM) · useKakaoAuth
lib/                       # fcm · kakao · secureStorage · sentry
utils/validation.ts        # 입력값 검증 공통 유틸
```

### 3.2 백엔드 `inha-catch-server/` (`com.example.demo`)
```
Controller : Auth · Scholarship · Bookmark · Notification · User ·
             Admin · Chat · Application · Crawling
Service    : CrawlService · GeminiService · FCMService · EmailService ·
             NotificationService · KakaoAuthService · KakaoOAuthService ·
             AdminConfigService
Crawler    : InhatcCrawler(인하공전) · JobAlioFetcher(채용) ·
             WevityCrawler · ThinkContestCrawler
Scheduler  : CrawlScheduler (1시간 간격 자동 증분 크롤링)
Pipeline   : CrawlPipeline (크롤 → AI 요약 → 매칭 알림)
security/  : SecurityConfig · JwtUtil · JwtAuthenticationFilter ·
             RateLimitFilter · PasswordPolicy
config/    : AsyncConfig · FirebaseConfig
entity/    : User · Scholarship · Notification · UserBookmark ·
             UserViewLog · UserApplication · ApplicationStatus ·
             TokenBlacklist · ScholarshipAttachment · CrawlErrorLog ·
             AdminConfig · PushBatch
repository/: 각 엔티티 JPA 리포지토리
test/      : AuthController / ScholarshipController 통합 테스트 (H2)
```

### 3.3 어드민 웹 `inha-catch-admin/` (Next.js App Router)
```
app/
├── login/page.tsx         # 관리자 로그인
├── page.tsx               # 어드민 메인
└── preview/page.tsx       # 프리뷰
components/admin/          # Dashboard·Users·Posts·Crawling·
                           # Algorithm·Notifications·Settings
components/inha-catch/      # KPICard·DonutChart·LineChart·Sidebar 등
components/ui/             # shadcn/ui 컴포넌트 세트
```

---

## 4. 구현 완료 기능

### 4.1 인증 / 보안
- 이메일 회원가입 (이메일, 비밀번호, 이름, 학과, 관심 키워드) + **이메일 인증**
- 로그인/로그아웃 — JWT 액세스(1h) + 리프레시(14d)
- 비밀번호 재설정(임시 발급) · 비밀번호 변경
- **약관 동의** 처리 (`/api/user/agree-terms`)
- **회원 탈퇴** (`DELETE /api/user/me`)
- 토큰 블랙리스트 + 매일 자동 정리
- 401 응답 시 자동 토큰 갱신 + 재시도 (axios 인터셉터)
- **Rate Limit** (IP 기반 in-memory): 로그인 5회/분, 회원가입 3회/분, 비밀번호 재설정 3회/시간
- **PasswordPolicy** 비밀번호 강도 정책
- 카카오 로그인 (OAuth 2.0 — 코드/콜백 구현 완료)
- 환경변수 기반 시크릿 관리 (JWT, Gemini, Kakao)
- `expo-secure-store` 기반 토큰 보안 저장

### 4.2 크롤링 시스템 (4종 소스)
| 소스 | 크롤러 | 방식 | 내용 |
|------|--------|------|------|
| 인하공전 장학(boardId 17) | InhatcCrawler | Jsoup (SSR) | 장학정보 게시판 |
| 인하공전 공모전(combBbs) | InhatcCrawler | Jsoup | 공모전 게시판 |
| 잡알리오 | JobAlioFetcher | 공공데이터 OpenAPI | 공공기관 채용정보 |
| 위비티(Wevity) | WevityCrawler | Jsoup | 외부 공모전 |
| 씽크콘테스트 | ThinkContestCrawler | JSON API | 외부 공모전 |

- 1시간 간격 자동 증분 크롤링 (`CrawlScheduler`)
- SHA-256 해시 기반 변경 감지 (중복 저장 방지)
- 상세 페이지 파싱 (본문·첨부파일·관련 링크·신청 기간·자격·금액)
- 타임아웃 기반 데드락 방지 / 크롤 에러 로그 DB 저장(`CrawlErrorLog`)
- 구버전 데이터 정리(`/api/crawl/purge-outdated`)

### 4.3 AI 기능 (Gemini 2.5 Flash)
- **자동 요약**: 상태·제목·지원대상·신청기간·핵심혜택·변경내용·상세요약·태그 구조
- 2025년 이전 데이터 자동 필터(SKIP_OLD), 단순 공지/중복 자동 스킵(SKIP_DUP)
- 429/503 에러 자동 재시도(3회, 점진적 대기) · 5000자 초과 truncation
- **AI 챗봇 Q&A** (`POST /api/scholarships/{id}/chat`): 공고 컨텍스트 기반 질의응답
  - 5회/분 rate limit, 최대 10턴 히스토리, 질문 400자/컨텍스트 4000자 제한
- 추천 이유(XAI) 표시

### 4.4 추천 알고리즘 (동적 가중치)
- 학과 매칭 / 키워드 매칭 / 마감 긴급성 / 최신성 / 인기도 가중치 합산
- **가중치를 어드민에서 동적 조정** (`/api/admin/algorithm/weights`, `AdminConfig` 저장)
- 가중치 변경 미리보기 (`/api/admin/algorithm/preview`)
- 개인 관련성 임계값 이상만 추천

### 4.5 목록 / 상세 / 검색
- 홈: 전체·장학금·공모전·채용 탭 필터 + 추천순 정렬
- 상세: AI 요약(마크다운 렌더링), 핵심 정보, D-Day 뱃지, 원문 링크, **AI 챗봇**
- 검색: 400ms 디바운스 실시간 검색
- 오프라인 캐싱 (AsyncStorage)

### 4.6 북마크 / 지원 트래킹
- 북마크 토글(낙관적 UI + 서버 동기화, 연타 방지, 실패 롤백)
- **지원 현황 트래킹** (`/api/applications`): 관심→지원→합격/불합격 상태 관리
  - 지원 통계(`/stats`), 공고별 상태 조회·등록·삭제

### 4.7 알림 시스템
- 새 장학금 알림: 크롤 → 키워드/학과 매칭 → DB 알림 + FCM 푸시
- 마감 임박 알림: 매일 오전 9시, 북마크 중 D-3 이내
- 중복 알림 방지, 읽음/안읽음, 전체 읽음, 개별·전체 삭제
- 탭 바 읽지않은 뱃지(30초 갱신), 푸시 클릭 시 상세 이동
- 관리자 수동 알림 발송(`PushBatch`로 발송 이력 관리)

### 4.8 어드민 웹 대시보드 (Next.js)
- **대시보드**: KPI 카드, 도넛/라인 차트(recharts), 통계 개요
- **사용자 관리**: 목록·페이지네이션, 역할 변경(USER↔ADMIN), 활성/비활성, 사용자 통계
- **공고 관리**: 목록·삭제
- **크롤링 제어**: 증분/전체 크롤, AI 요약 백필, 외부 소스별 크롤, 데이터 삭제
- **추천 알고리즘**: 가중치 조정 + 미리보기
- **알림**: 수동 발송 + 발송 이력
- **설정**: 일반 설정 / 크롤 설정 (`AdminConfig`)

---

## 5. API 엔드포인트 요약

### 인증 `/api/auth`
`POST /signup` · `POST /login` · `POST /refresh` · `POST /logout` ·
`POST /reset-password` · `POST /change-password` ·
`POST /kakao` · `POST /kakao/token` · `GET /kakao/login` · `GET /kakao/callback`

### 장학금/공고 `/api/scholarships`
`GET /` · `GET /{id}` · `GET /search` · `GET /recommended` ·
`POST /{id}/chat` (AI 챗봇)

### 북마크 `/api/bookmarks`
`GET /` · `POST /{scholarshipId}` (토글)

### 지원 트래킹 `/api/applications`
`GET /stats` · `GET /{scholarshipId}` · `POST /{scholarshipId}` · `DELETE /{scholarshipId}`

### 알림 `/api/notifications`
`GET /` · `GET /unread-count` · `POST /{id}/read` · `POST /read-all` ·
`DELETE /{id}` · `DELETE /all`

### 사용자 `/api/user`
`GET /profile` · `PUT /profile` · `POST /fcm-token` ·
`POST /agree-terms` · `DELETE /me` · `POST /view-log`

### 관리자 `/api/admin` (ADMIN 전용)
`GET /stats` · `GET /dashboard/overview` · `GET /users` · `GET /users/stats` ·
`PUT /users/{id}/role` · `PUT /users/{id}/toggle-active` ·
`GET|PUT /algorithm/weights` · `GET /algorithm/preview` ·
`GET /notifications/history` · `POST /notifications` · `POST /test-notification` ·
`GET|PUT /settings/general` · `GET|PUT /settings/crawl` ·
`DELETE /scholarships/{id}`

### 크롤링 `/api/crawl` (ADMIN 전용)
`GET /stats` · `GET /list` · `GET /save` · `GET /save-all` · `GET /backfill` ·
`GET /clear` · `GET /purge-outdated` ·
`GET /external` · `GET /external/wevity` · `GET /external/thinkcontest`

---

## 6. 주요 DB 스키마

### user
`id`(PK) · `email`(UNIQUE) · `password`(BCrypt) · `nickname` · `major` ·
`keywords`(TEXT) · `role`(USER/ADMIN) · `provider`/`provider_id`(소셜) ·
`fcm_token` · `is_active` · `agreed_terms` · `created_at`

### scholarship_post
`id`(PK) · `source_site` · `board_id` · `article_id` · `title` · `content`(LONGTEXT) ·
`basic_summary`/`detail_summary`(AI) · `apply_period` · `eligibility` · `amount_info` ·
`content_hash`(SHA-256) · `posted_at` · `view_count` · `crawled_at`
— UNIQUE(source_site, board_id, article_id), INDEX(article_id, posted_at, content_hash)

### notification
`id`(PK) · `user_id`(FK) · `scholarship_id`(FK) · `type`(NEW/DEADLINE/RECOMMEND) ·
`title` · `message` · `is_read` · `created_at` — INDEX(user_id, is_read)

### user_application (지원 트래킹)
`id`(PK) · `user_id`(FK) · `scholarship_id`(FK) · `status`(ApplicationStatus enum) · `updated_at`

### admin_config (동적 설정)
키-값 기반 추천 가중치 / 일반 / 크롤 설정 저장

### 기타
`user_bookmark` · `user_view_log` · `token_blacklist` · `scholarship_attachment` ·
`crawl_error_log` · `push_batch`

---

## 7. 기술 스택 상세

### 백엔드 (build.gradle)
spring-boot-starter-web/webmvc · data-jpa · security · mail · actuator ·
jjwt 0.11.5(JWT) · jsoup 1.17.1(크롤링) · jackson-databind(JSON) ·
firebase-admin 9.4.3(FCM) · mysql-connector-j · H2(테스트)

### 모바일 앱 (주요 패키지)
expo-router(라우팅) · axios(인터셉터/토큰갱신) · async-storage(캐싱) ·
expo-secure-store(토큰 보안) · expo-notifications(FCM) · expo-auth-session(카카오) ·
expo-web-browser · expo-linear-gradient · lucide-react-native ·
react-native-markdown-display · react-native-reanimated · @sentry(모니터링)

### 어드민 웹 (주요 패키지)
next 16 · react 19 · tailwindcss 4 · shadcn/ui(@radix-ui 다수) ·
recharts(차트) · react-hook-form + zod(폼 검증) · @vercel/analytics · sonner(토스트)

---

## 8. 실행 가이드

### 서버
```bash
cd inha-catch-server
# MySQL 실행 + inha_catch DB 생성
./gradlew bootRun       # 기본 8080 포트
```

### 모바일 앱
```bash
cd inha-catch-app
npm install
npx expo start
```

### 어드민 웹
```bash
cd inha-catch-admin
npm install
npm run dev             # 기본 3000 포트
```

### 외부 테스트 (터널)
```bash
npx localtunnel --port 8080 --subdomain inhacatch
# 변경된 URL을 inha-catch-app/api/axios.ts 의 TUNNEL_URL 에 반영
```

### Docker
루트 `docker-compose.yml`로 서버 + MySQL 컨테이너 구성 가능.

### 환경 변수
| 변수 | 설명 |
|------|------|
| `JWT_SECRET` | JWT 서명 키(Base64) |
| `GEMINI_API_KEY` | Gemini AI API 키 |
| `KAKAO_CLIENT_ID` | 카카오 REST API 키 |
| `JOBALIO_API_KEY` | 공공데이터 잡알리오 OpenAPI 키 |
| 메일(SMTP) 설정 | 이메일 인증/비밀번호 재설정용 |
| `firebase-service-account.json` | Firebase 인증키 (gitignore) |

---

## 9. 향후 추가 예정

| 우선순위 | 항목 |
|----------|------|
| P0 | 카카오 로그인 운영 키 설정 / 푸시 알림(FCM) 운영 안정화 |
| P1 | 어드민 공고 미리보기·사용자 검색 고도화, 상세 공유 |
| P2 | 서버 연결 실패 공통 처리, 상세 캐싱 강화 |
| P3 | 구글 로그인, 알림 커스터마이징, 다국어 |

---

> 본 문서는 현재 코드베이스(브랜치 `last_tset`) 기준으로 자동 정리되었습니다.
> 상세 변경 이력은 `git log` 및 기존 `PROJECT_SUMMARY.md` 참고.

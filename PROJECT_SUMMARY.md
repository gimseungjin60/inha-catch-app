# InhaCatch - 프로젝트 전체 정리

> 인하공전 학생을 위한 장학금/공모전 자동 수집 및 AI 맞춤 추천 서비스

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | InhaCatch (인하캐치) |
| 목적 | 인하공전 장학금·공모전 정보를 자동 크롤링하고, AI 요약 및 개인 맞춤 추천 제공 |
| 프론트엔드 | React Native (Expo SDK 54), TypeScript |
| 백엔드 | Spring Boot 4.0.3, Java 17 |
| 데이터베이스 | MySQL 8.0 |
| AI 엔진 | Google Gemini 2.5 Flash (요약 생성) |
| 푸시 알림 | Firebase Cloud Messaging (FCM) |
| 배포/테스트 | localtunnel (개발), Expo Go (모바일 테스트) |

---

## 2. 시스템 아키텍처

```
┌─────────────────────────────────────────────┐
│                 모바일 앱                      │
│          (Expo / React Native)               │
│                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐ │
│  │ 홈   │ │ 검색 │ │ 저장 │ │ 알림 │ │정보│ │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬─┘ │
│     └────────┴────────┴────────┴────────┘    │
│                    │ API (HTTPS)              │
└────────────────────┼─────────────────────────┘
                     │
┌────────────────────┼─────────────────────────┐
│              Spring Boot 서버                  │
│                    │                          │
│  ┌─────────────────┴──────────────────────┐  │
│  │           REST API Layer               │  │
│  │  Auth · Scholarship · Bookmark         │  │
│  │  Notification · User · Admin · Crawl   │  │
│  └─────────────────┬──────────────────────┘  │
│                    │                          │
│  ┌────────┐  ┌─────┴─────┐  ┌─────────────┐ │
│  │Crawler │  │ Pipeline  │  │ FCM Service │ │
│  │(Jsoup) │→ │(AI 요약)  │→ │(푸시 발송)  │ │
│  └────────┘  └───────────┘  └─────────────┘ │
│                    │                          │
│              ┌─────┴─────┐                   │
│              │  MySQL DB │                   │
│              └───────────┘                   │
└───────────────────────────────────────────────┘
```

---

## 3. 구현 완료 기능

### 3.1 인증/보안
- 이메일 회원가입 (이메일, 비밀번호, 이름, 학과, 관심 키워드)
- 로그인/로그아웃 (JWT 액세스 토큰 1시간 + 리프레시 토큰 14일)
- 비밀번호 재설정 (임시 비밀번호 발급)
- 비밀번호 변경 (현재 → 새 비밀번호 검증)
- 토큰 블랙리스트 + 매일 자동 정리
- 401 응답 시 자동 토큰 갱신 + 재시도
- 카카오 로그인 (OAuth 2.0, 코드 구현 완료 - API 키 설정 필요)
- 환경변수 기반 시크릿 관리 (JWT, Gemini API 키)

### 3.2 크롤링 시스템
- **인하공전 장학정보 게시판** (boardId: 17) 자동 크롤링
- **인하공전 공모전 게시판** (combBbs) 자동 크롤링
- 1시간 간격 자동 증분 크롤링 (CrawlScheduler)
- SHA-256 해시 기반 변경 감지 (중복 저장 방지)
- 상세 페이지 파싱 (본문, 첨부파일, 관련 링크, 신청 기간, 자격 조건, 금액)
- 타임아웃 기반 데드락 방지 (1시간 초과 시 잠금 해제)
- 크롤링 에러 로그 DB 저장 (CrawlErrorLog)

### 3.3 AI 요약 (Gemini)
- 크롤링된 공고에 대해 자동 AI 요약 생성
- 응답 구조: 상태, 제목, 지원 대상, 신청 기간, 핵심 혜택, 변경 내용, 상세 요약, 태그
- 2025년 이전 데이터 자동 필터링 (SKIP_OLD)
- 단순 공지/중복 자동 스킵 (SKIP_DUP)
- 429/503 에러 자동 재시도 (3회, 점진적 대기)
- 5000자 초과 본문 자동 truncation

### 3.4 추천 알고리즘
- 학과 매칭 (+20~30점)
- 키워드 매칭 (+15~25점, 키워드당)
- 마감 긴급성 보너스 (D-1~3: +15, D-4~7: +10)
- 최신성 보너스 (3일 이내: +8)
- 인기도 보너스 (조회수 300+: +5)
- 개인 관련성 25점 이상만 추천 (최대 15건)

### 3.5 장학금 목록/상세
- 홈 화면: 전체/장학금/공모전 탭 필터 + 추천순 정렬
- 상세 화면: AI 요약 (마크다운 렌더링), 핵심 정보, 본문, D-Day 뱃지
- 검색: 400ms 디바운스 실시간 검색 (제목, 본문, 요약 4개 필드)
- 원문 링크 연결 (WebBrowser)
- 오프라인 캐싱 (AsyncStorage)

### 3.6 북마크
- 북마크 토글 (낙관적 UI + 서버 동기화)
- 연타 방지 (pendingIds Set)
- 실패 시 자동 롤백
- AsyncStorage 로컬 캐싱

### 3.7 알림 시스템
- **새 장학금 알림**: 크롤링 → 사용자 키워드/학과 매칭 → DB 알림 + FCM 푸시
- **마감 임박 알림**: 매일 오전 9시, 북마크 장학금 중 D-3 이내
- 중복 알림 방지 (같은 날 같은 장학금 체크)
- 읽음/읽지않음 상태 관리
- 전체 읽음 / 개별·전체 삭제
- 탭 바 읽지않은 알림 뱃지 (30초 갱신)
- FCM 토큰 자동 등록 + 포그라운드 복귀 시 갱신
- 푸시 클릭 시 상세 화면 이동

### 3.8 프로필
- 이름, 학과, 관심 키워드 수정
- 비밀번호 변경 (공통 validation 유틸)
- 로그아웃 (토큰 블랙리스트 + 로컬 캐시 전체 삭제)
- 관리자 대시보드 진입 (ADMIN 역할만)

### 3.9 관리자 대시보드
- **대시보드 탭**: 전체 통계 6개 (공고/가입자/알림/북마크/오늘 신규 공고/오늘 가입)
- **사용자 관리 탭**: 사용자 목록 (페이지네이션), 역할 변경 (USER↔ADMIN), 계정 활성/비활성화
- **크롤링 제어 탭**: 증분/전체 크롤링, AI 요약 생성, 데이터 삭제 (확인 필수)
- 실행 로그 (성공 녹색/실패 빨강 구분, 100개 보관)
- 5분 타임아웃 설정 (장시간 크롤링 대응)

---

## 4. 기술 스택 상세

### 4.1 프론트엔드 패키지
| 패키지 | 용도 |
|--------|------|
| expo-router | 파일 기반 라우팅 |
| axios | HTTP 클라이언트 (인터셉터, 토큰 갱신) |
| @react-native-async-storage | 로컬 저장소 |
| expo-notifications | 푸시 알림 수신 |
| expo-web-browser | 외부 링크, OAuth |
| expo-auth-session | 카카오 OAuth |
| expo-linear-gradient | 헤더 그라데이션 |
| lucide-react-native | 아이콘 |
| react-native-markdown-display | AI 요약 마크다운 렌더링 |

### 4.2 백엔드 의존성
| 패키지 | 용도 |
|--------|------|
| spring-boot-starter-web | REST API |
| spring-boot-starter-data-jpa | ORM (Hibernate) |
| spring-boot-starter-security | 인증/인가 |
| jjwt (0.11.5) | JWT 토큰 생성/검증 |
| jsoup (1.17.1) | HTML 크롤링/파싱 |
| firebase-admin (9.4.3) | FCM 푸시 발송 |
| mysql-connector-j | MySQL 드라이버 |

---

## 5. API 엔드포인트 목록

### 인증 (`/api/auth`)
| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | /signup | - | 회원가입 |
| POST | /login | - | 로그인 |
| POST | /kakao | - | 카카오 로그인 |
| POST | /refresh | - | 토큰 갱신 |
| POST | /logout | O | 로그아웃 |
| POST | /reset-password | - | 비밀번호 초기화 |
| POST | /change-password | O | 비밀번호 변경 |

### 장학금 (`/api/scholarships`)
| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | / | - | 전체 목록 (페이지네이션) |
| GET | /{id} | - | 상세 조회 |
| GET | /search | - | 키워드 검색 |
| GET | /recommended | - | 맞춤 추천 |

### 북마크 (`/api/bookmarks`)
| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | / | O | 내 북마크 목록 |
| POST | /{id} | O | 북마크 토글 |

### 알림 (`/api/notifications`)
| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | / | O | 알림 목록 |
| GET | /unread-count | O | 읽지않은 수 |
| POST | /{id}/read | O | 읽음 처리 |
| POST | /read-all | O | 전체 읽음 |
| DELETE | /{id} | O | 개별 삭제 |
| DELETE | /all | O | 전체 삭제 |

### 사용자 (`/api/user`)
| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | /profile | O | 프로필 조회 |
| PUT | /profile | O | 프로필 수정 |
| POST | /fcm-token | O | FCM 토큰 등록 |
| POST | /view-log | O | 조회 기록 |

### 관리자 (`/api/admin`) - ADMIN 전용
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /stats | 상세 통계 |
| GET | /users | 사용자 목록 |
| PUT | /users/{id}/role | 역할 변경 |
| PUT | /users/{id}/toggle-active | 활성/비활성 |
| DELETE | /scholarships/{id} | 공고 삭제 |

### 크롤링 (`/api/crawl`) - ADMIN 전용
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /stats | 기본 통계 |
| GET | /save | 증분 크롤링 |
| GET | /save-all | 전체 크롤링 |
| GET | /backfill | AI 요약 역채우기 |
| GET | /clear | 데이터 전체 삭제 |

---

## 6. DB 스키마 (주요 테이블)

### user
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT (PK) | |
| email | VARCHAR (UNIQUE) | |
| password | VARCHAR | BCrypt 해시 |
| nickname | VARCHAR | 이름 |
| major | VARCHAR | 학과 |
| keywords | TEXT | 관심 키워드 (쉼표 구분) |
| role | VARCHAR(20) | USER / ADMIN |
| provider | VARCHAR | KAKAO / null |
| provider_id | VARCHAR | 소셜 로그인 ID |
| fcm_token | VARCHAR(512) | FCM 토큰 |
| is_active | BOOLEAN | 활성 상태 |
| created_at | DATETIME | |

### scholarship_post
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT (PK) | |
| source_site | VARCHAR | inhatc |
| board_id | VARCHAR | 17 / contest |
| article_id | BIGINT | 게시글 ID |
| title | VARCHAR | |
| content | LONGTEXT | 본문 |
| basic_summary | LONGTEXT | AI 기본 요약 |
| detail_summary | LONGTEXT | AI 상세 요약 |
| apply_period | VARCHAR | 신청 기간 |
| eligibility | VARCHAR | 자격 조건 |
| amount_info | VARCHAR | 지원 금액 |
| content_hash | VARCHAR | SHA-256 해시 |
| posted_at | DATE | 게시일 |
| view_count | INT | 조회수 |
| crawled_at | DATETIME | |
| **인덱스** | | article_id, posted_at, content_hash |
| **유니크** | | (source_site, board_id, article_id) |

### notification
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT (PK) | |
| user_id | BIGINT (FK) | |
| scholarship_id | BIGINT (FK) | |
| type | VARCHAR(30) | DEADLINE / NEW / RECOMMEND |
| title | VARCHAR(200) | |
| message | TEXT | |
| is_read | BOOLEAN | |
| created_at | DATETIME | |
| **인덱스** | | (user_id), (user_id, is_read) |

---

## 7. 프로젝트 구조

```
inha-catch-app/
├── inha-catch-app/              # 프론트엔드 (Expo)
│   ├── app/
│   │   ├── index.tsx            # Welcome 화면
│   │   ├── login.tsx            # 로그인
│   │   ├── signup.tsx           # 회원가입
│   │   ├── admin.tsx            # 관리자 대시보드
│   │   ├── _layout.tsx          # 루트 레이아웃
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx      # 탭 네비게이션
│   │   │   ├── index.tsx        # 홈 (장학금 목록)
│   │   │   ├── search.tsx       # 검색
│   │   │   ├── bookmark.tsx     # 북마크
│   │   │   ├── notifications.tsx # 알림
│   │   │   └── profile.tsx      # 프로필
│   │   └── details/
│   │       └── [id].tsx         # 상세 화면
│   ├── api/
│   │   └── axios.ts             # API 클라이언트 (터널 지원)
│   ├── components/
│   │   └── ScholarshipCard.tsx  # 장학금 카드 컴포넌트
│   ├── context/
│   │   ├── BookmarkContext.tsx   # 북마크 상태 관리
│   │   └── UserContext.tsx      # 사용자 상태 관리
│   ├── hooks/
│   │   ├── useNotifications.ts  # FCM 푸시 설정
│   │   └── useKakaoAuth.ts     # 카카오 OAuth
│   └── utils/
│       └── validation.ts        # 입력값 검증 공통 유틸
│
├── inha-catch-server/           # 백엔드 (Spring Boot)
│   └── src/main/java/com/example/demo/
│       ├── AuthController.java
│       ├── ScholarshipController.java
│       ├── BookmarkController.java
│       ├── NotificationController.java
│       ├── NotificationService.java
│       ├── UserController.java
│       ├── AdminController.java
│       ├── CrawlingController.java
│       ├── CrawlService.java
│       ├── CrawlScheduler.java
│       ├── InhatcCrawler.java
│       ├── GeminiService.java
│       ├── FCMService.java
│       ├── KakaoAuthService.java
│       ├── AdminInitializer.java
│       ├── GlobalExceptionHandler.java
│       ├── config/
│       │   ├── AsyncConfig.java
│       │   └── FirebaseConfig.java
│       ├── security/
│       │   ├── SecurityConfig.java
│       │   ├── JwtUtil.java
│       │   └── JwtAuthenticationFilter.java
│       ├── entity/
│       │   ├── User.java
│       │   ├── Scholarship.java
│       │   ├── Notification.java
│       │   ├── UserBookmark.java
│       │   ├── UserViewLog.java
│       │   ├── TokenBlacklist.java
│       │   ├── ScholarshipAttachment.java
│       │   └── CrawlErrorLog.java
│       └── pipeline/
│           └── CrawlPipeline.java
│
└── .gitignore
```

---

## 8. 설정 가이드

### 8.1 서버 실행
```bash
cd inha-catch-server
# MySQL 실행 (inha_catch DB 생성 필요)
./gradlew bootRun
```

### 8.2 앱 실행
```bash
cd inha-catch-app
npm install
npx expo start
```

### 8.3 외부 테스트 (터널)
```bash
# 터미널 1: 서버
cd inha-catch-server && ./gradlew bootRun

# 터미널 2: 터널
npx localtunnel --port 8080 --subdomain inhacatch

# 터미널 3: 앱
cd inha-catch-app && npx expo start
```
터널 URL이 변경되면 `api/axios.ts`의 `TUNNEL_URL` 수정.

### 8.4 환경 설정 파일
| 파일 | 설명 | gitignore |
|------|------|-----------|
| `application.properties` | 서버 설정 (DB, JWT, Gemini) | X |
| `application-local.properties` | 로컬 설정 오버라이드 | O |
| `firebase-service-account.json` | Firebase 인증키 | O |

### 8.5 환경 변수
| 변수 | 설명 | 기본값 |
|------|------|--------|
| JWT_SECRET | JWT 서명 키 (Base64) | 내장 기본값 |
| GEMINI_API_KEY | Gemini AI API 키 | 내장 기본값 |
| KAKAO_CLIENT_ID | 카카오 REST API 키 | 미설정 |

---

## 9. 수정 이력 (이번 세션)

### 버그 수정
- 크롤링 NPE (getDDay null 체크)
- InterruptedException 올바른 처리 (3곳)
- CrawlScheduler 데드락 방지 (타임아웃 기반)
- Backfill 개별 에러 핸들링 + OOM 방지 (페이지네이션)
- GeminiService 503/timeout 재시도 + 점진적 대기
- 공모전 상세 URL 수정 (artclView.do → view.do)
- 본문 줄바꿈 파싱 수정 (wholeText 사용)
- 북마크 FlatList 중복 props 제거
- 상세 화면 폴백 색상 33개 제거 → 테마 통일
- 알림 화면 다크모드 색상 수정

### 기능 추가
- FCM 푸시 알림 전체 구현 (서버 + 앱)
- 알림 화면 서버 API 연동 (가짜 알림 → 실제 알림)
- 관리자 대시보드 전면 개편 (3탭 + 사용자 관리)
- 카카오 로그인 (서버 + 앱 코드 완성)
- 검색 디바운싱 (400ms)
- 조회수 업데이트 연결
- 관리자 통계 API (상세 6개 항목)
- 북마크 연타 방지
- DB 인덱스 추가 (5개)
- CORS 환경별 분리
- GlobalExceptionHandler 보강
- 비밀번호 검증 공통 유틸

### 보안 개선
- API 키 환경변수 분리
- Admin 비밀번호 로그 노출 제거
- 비밀번호 초기화 응답 보안 개선
- CORS 허용 헤더 명시화
- `/api/admin/**` ADMIN 전용 보안 경로

---

## 10. 남은 작업 (우선순위)

| 우선순위 | 항목 |
|----------|------|
| P0 | 카카오 로그인 API 키 설정 |
| P1 | 관리자 최근 공고 미리보기, 사용자 검색, 상세 공유 버튼 |
| P2 | 서버 연결 실패 공통 처리, 비밀번호 강도 표시, 상세 캐싱 |
| P3 | 구글 로그인, 알림 커스터마이징, 지원 현황 트래킹, 다국어 |

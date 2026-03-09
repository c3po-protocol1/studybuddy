# StudyBuddy — AI 학습 도우미

> NotebookLM 스타일의 한국 학생을 위한 AI 기반 스마트 학습 도우미

## 주요 기능 | Features

- **스터디 공간** — 과목별 학습 공간 생성 (이모지 & 색상 커스터마이징)
- **자료 업로드** — PDF / TXT 파일 드래그앤드롭 업로드
- **AI 요약** — 업로드한 자료를 AI가 자동 요약 (SummaryAgent)
- **핵심포인트** — 시험에 나올 핵심 암기 포인트 자동 추출 (KeyPointsAgent)
- **문제풀기** — 객관식 + 단답형 연습 문제 자동 생성 (QuestionAgent)
- **적응형 학습** — 틀린 문제 기반 보충 문제 자동 생성 (AdaptiveAgent)

## 기술 스택 | Tech Stack

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Backend | **Go 1.22** (Gin, GORM, JWT, PostgreSQL) — port 8080 |
| Database | **PostgreSQL 16** (Docker Compose for local dev) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| Auth | JWT (HS256) stored in `localStorage` + cookie |

---

## 시작하기 | Getting Started

### 1. 의존성 설치 | Install Dependencies

```bash
# Frontend
npm install

# Backend (Go 1.22+)
cd backend && go mod download
```

### 2. 환경 변수 설정 | Configure Environment

```bash
cp .env.local.example .env.local
```

`.env.local`을 열고 필요한 값을 입력하세요:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
DATABASE_URL="postgres://studybuddy:studybuddy@localhost:5432/studybuddy?sslmode=disable"
AUTH_SECRET=your_jwt_secret_here_change_in_production
NEXT_PUBLIC_API_URL=http://localhost:8080
```

> API 키 발급: https://console.anthropic.com

### 3. 데이터베이스 시작 | Start Database

Docker Compose로 PostgreSQL을 로컬에서 실행합니다:

```bash
docker compose up -d
```

PostgreSQL이 준비되면 (`localhost:5432`), Go 백엔드가 시작 시 자동으로 테이블을 생성합니다 (GORM AutoMigrate).

PostgreSQL 중지:

```bash
docker compose down
```

데이터까지 삭제:

```bash
docker compose down -v
```

### 4. 서버 실행 | Run Servers

두 서버를 **각각 별도 터미널**에서 실행하세요.

#### Go 백엔드 (port 8080)

```bash
cd backend
go run .
```

또는 빌드 후 실행:

```bash
cd backend
go build -o studybuddy-server .
./studybuddy-server
```

#### Next.js 프론트엔드 (port 3000)

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

---

## Go 백엔드 | Go Backend

### 구조 | Structure

```
backend/
├── main.go                # 서버 진입점, 라우터 설정
├── go.mod / go.sum
├── config/
│   └── config.go          # 환경 변수 로드 (DATABASE_URL 등)
├── database/
│   └── db.go              # GORM + PostgreSQL 연결, AutoMigrate
├── middleware/
│   └── auth.go            # JWT 검증 미들웨어
├── models/
│   └── models.go          # GORM 모델 + 응답 구조체
├── handlers/
│   ├── auth.go            # 인증 (register, login)
│   ├── spaces.go          # 스터디 공간 CRUD
│   ├── materials.go       # 자료 관리 + AI 처리
│   ├── questions.go       # 문제 답변 제출
│   └── adaptive.go        # 적응형 학습
└── agents/
    ├── claude.go           # Anthropic API 공통 호출
    ├── summary.go          # 요약 에이전트
    ├── keypoints.go        # 핵심포인트 에이전트
    ├── questions.go        # 문제 생성 에이전트
    └── adaptive.go         # 적응형 문제 에이전트
```

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | ❌ | 회원가입 |
| POST | `/api/auth/login` | ❌ | 로그인 → JWT 반환 |
| GET | `/api/spaces` | ✅ | 공간 목록 |
| POST | `/api/spaces` | ✅ | 공간 생성 |
| GET | `/api/spaces/:id` | ✅ | 공간 상세 |
| DELETE | `/api/spaces/:id` | ✅ | 공간 삭제 |
| POST | `/api/spaces/:id/materials` | ✅ | 파일 업로드 |
| GET | `/api/spaces/:id/materials` | ✅ | 자료 목록 |
| GET | `/api/materials/:id` | ✅ | 자료 상세 |
| DELETE | `/api/materials/:id` | ✅ | 자료 삭제 |
| POST | `/api/materials/:id/process` | ✅ | AI 처리 실행 |
| POST | `/api/questions/:id/answer` | ✅ | 답변 제출 |
| GET | `/api/adaptive?materialId=xxx` | ✅ | 취약 문제 조회 |
| POST | `/api/adaptive` | ✅ | 적응형 문제 생성 |

### 인증 | Authentication

JWT 토큰이 `localStorage`와 `auth_token` 쿠키에 저장됩니다.
모든 보호된 요청에는 `Authorization: Bearer <token>` 헤더가 필요합니다.

### 사용 라이브러리 | Dependencies

- `github.com/gin-gonic/gin` — HTTP 라우터
- `github.com/gin-contrib/cors` — CORS 설정
- `github.com/golang-jwt/jwt/v5` — JWT
- `golang.org/x/crypto/bcrypt` — 비밀번호 해싱
- `gorm.io/gorm` — ORM (AutoMigrate, connection management)
- `gorm.io/driver/postgres` — PostgreSQL GORM 드라이버 (pgx)
- `github.com/google/uuid` — UUID 생성
- `github.com/joho/godotenv` — .env 파일 로드

---

## 프로젝트 구조 | Full Project Structure

```
studybuddy/
├── backend/                   # Go 백엔드 (포트 8080)
├── docker-compose.yml         # PostgreSQL 로컬 개발 환경
├── agents/                    # Next.js AI 에이전트 (레거시)
├── app/
│   ├── auth/                  # 로그인/회원가입 페이지
│   ├── spaces/[id]/           # 스터디 공간 상세 페이지
│   └── page.tsx               # 대시보드 (홈)
├── components/
│   ├── CreateSpaceModal.tsx
│   ├── FileUploader.tsx
│   ├── SummaryTab.tsx
│   ├── KeyPointsTab.tsx
│   └── PracticeTab.tsx
├── lib/
│   ├── api-client.ts          # Go 백엔드 API 클라이언트
│   ├── auth-store.ts          # JWT 인증 유틸리티
│   └── prisma.ts              # Prisma 클라이언트
└── prisma/
    └── schema.prisma          # DB 스키마 (레거시)
```

## DB 스키마 | Database Schema

- **User** — 사용자 (이메일, 비밀번호)
- **Space** — 스터디 공간 (이름, 이모지, 색상)
- **Material** — 업로드된 학습 자료 (파일명, 내용, 처리 상태)
- **Summary** — AI 생성 요약
- **KeyPoints** — AI 추출 핵심포인트 (JSON 배열)
- **Question** — AI 생성 연습 문제 (객관식/단답형)
- **AnswerHistory** — 사용자 답변 이력 (맞춤 학습에 활용)

테이블은 Go 백엔드 시작 시 GORM AutoMigrate로 자동 생성됩니다.

## 라이선스 | License

MIT

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
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Prisma ORM + SQLite |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| File Upload | react-dropzone, pdf-parse |

## 시작하기 | Getting Started

### 1. 의존성 설치 | Install Dependencies

```bash
npm install
```

### 2. 환경 변수 설정 | Configure Environment

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열고 Anthropic API 키를 입력하세요:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
DATABASE_URL="file:./prisma/dev.db"
```

> API 키 발급: https://console.anthropic.com

### 3. 데이터베이스 마이그레이션 | Database Setup

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. 개발 서버 실행 | Run Dev Server

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 프로젝트 구조 | Project Structure

```
studybuddy/
├── agents/                    # AI 서브에이전트
│   ├── summaryAgent.ts        # 요약 생성
│   ├── keyPointsAgent.ts      # 핵심포인트 추출
│   ├── questionAgent.ts       # 문제 생성
│   └── adaptiveAgent.ts       # 적응형 학습
├── app/
│   ├── api/
│   │   ├── spaces/            # 스터디 공간 CRUD
│   │   ├── materials/[id]/    # 자료 관리 & AI 처리
│   │   ├── questions/[id]/    # 문제 답변 제출
│   │   └── adaptive/          # 적응형 문제 생성
│   ├── spaces/[id]/           # 스터디 공간 상세 페이지
│   └── page.tsx               # 대시보드 (홈)
├── components/
│   ├── CreateSpaceModal.tsx   # 공간 생성 모달
│   ├── FileUploader.tsx       # 파일 업로드
│   ├── SummaryTab.tsx         # 요약 탭
│   ├── KeyPointsTab.tsx       # 핵심포인트 탭
│   └── PracticeTab.tsx        # 문제풀기 탭
├── lib/
│   └── prisma.ts              # Prisma 클라이언트 싱글톤
└── prisma/
    └── schema.prisma          # DB 스키마
```

## DB 스키마 | Database Schema

- **Space** — 스터디 공간 (이름, 이모지, 색상)
- **Material** — 업로드된 학습 자료 (파일명, 내용, 처리 상태)
- **Summary** — AI 생성 요약
- **KeyPoints** — AI 추출 핵심포인트 (JSON 배열)
- **Question** — AI 생성 연습 문제 (객관식/단답형)
- **AnswerHistory** — 사용자 답변 이력 (맞춤 학습에 활용)

## 라이선스 | License

MIT

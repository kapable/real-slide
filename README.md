# Real-Slide: 실시간 프레젠테이션 플랫폼

멘티미터(Mentimeter)와 아하슬라이드(AhaSlides)와 같은 실시간 상호작용 프레젠테이션 플랫폼입니다.

## 주요 기능

✅ **기본 슬라이드 관리**: 쉬운 폼으로 슬라이드 추가/수정/삭제
✅ **실시간 동기화**: Supabase Realtime으로 발표자와 참여자 간 즉시 동기화
✅ **투표 및 퀴즈**: 실시간 투표 결과를 차트로 표시
✅ **참여자 상호작용**: 댓글, 손들기, 워드클라우드, 퀴즈
✅ **간단한 인증**: 익명 + 닉네임만으로 즉시 입장
✅ **반응형 디자인**: 모바일과 데스크톱 모두 지원
✅ **별도 백엔드 불필요**: Supabase + Next.js 만으로 완성

## 시작하기

### 필수 요구사항

- Node.js 18+
- npm 또는 yarn
- Supabase 계정

### 설치 및 실행

1. 저장소 클론 및 의존성 설치:

```bash
cd /Users/beseeyong/Development/real-slide
npm install
```

2. Supabase 설정 (상세 가이드는 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 참고):

```bash
cp .env.local.example .env.local
# .env.local에 Supabase 키 입력
```

3. 개발 서버 실행:

```bash
npm run dev
```

4. 브라우저에서 http://localhost:3000 열기

## 사용 방법

### 발표자 (Presenter)

1. 웹사이트에서 "발표 시작" 클릭
2. 프레젠테이션 제목 입력
3. 세션 생성 후 고유 코드 받기
4. 코드를 참여자에게 공유
5. "다음" 버튼으로 슬라이드 전환 (모든 참여자에게 실시간 동기화)
6. 투표 결과를 실시간으로 확인

### 참여자 (Participant)

1. 웹사이트에서 "세션 참여" 클릭
2. 발표자의 코드 입력
3. 닉네임 입력 후 참여
4. 발표자의 슬라이드를 실시간으로 수신
5. 투표, 댓글, 손들기 등 상호작용

## 프로젝트 구조

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 홈페이지
│   ├── creator/page.tsx          # 발표자 세션 생성
│   ├── join/page.tsx             # 참여자 입장
│   ├── session/[sessionId]/      # 세션 페이지
│   │   └── presenter/page.tsx    # 발표자 대시보드
│   ├── join/[sessionId]/page.tsx # 참여자 뷰
│   ├── api/                      # API 라우트
│   │   ├── sessions/             # 세션 관리
│   │   ├── slides/               # 슬라이드 CRUD
│   │   ├── votes/                # 투표
│   │   ├── comments/             # 댓글
│   │   ├── hands-up/             # 손들기
│   │   ├── wordcloud/            # 워드클라우드
│   │   └── participants/         # 참여자
│   ├── layout.tsx                # 루트 레이아웃
│   └── globals.css               # 전역 스타일
├── components/                   # React 컴포넌트
│   ├── SlidePresentation.tsx     # 슬라이드 렌더링
│   └── VoteChart.tsx             # 투표 차트 (Recharts)
├── hooks/                        # Custom Hooks
│   └── useRealtimeChannel.ts     # Supabase Realtime 구독
├── lib/                          # 유틸리티
│   ├── supabase.ts               # Supabase 클라이언트
│   └── api.ts                    # API 함수들
└── types/                        # TypeScript 타입
    └── index.ts                  # 공통 인터페이스
```

## 기술 스택

| 역할             | 기술                  | 설명                                |
| ---------------- | --------------------- | ----------------------------------- |
| **프론트엔드**   | Next.js 16            | React 기반 풀-스택 프레임워크       |
| **스타일링**     | Tailwind CSS          | 유틸리티 중심의 CSS 프레임워크      |
| **실시간 통신**  | Supabase Realtime     | WebSocket 기반 실시간 데이터 동기화 |
| **데이터베이스** | PostgreSQL (Supabase) | 관계형 데이터베이스                 |
| **차트**         | Recharts              | React 차트 라이브러리               |
| **배포**         | Vercel                | Next.js 최적화 호스팅               |

## API 엔드포인트

### 세션

- `POST /api/sessions/create` - 세션 생성
- `GET /api/sessions/validate/[code]` - 세션 코드 검증
- `GET /api/sessions/[sessionId]` - 세션 상세 조회

### 슬라이드

- `GET /api/slides/[sessionId]` - 세션의 모든 슬라이드 조회
- `POST /api/slides/[sessionId]` - 슬라이드 추가
- `PUT /api/slides/[sessionId]/[slideId]` - 슬라이드 수정
- `DELETE /api/slides/[sessionId]/[slideId]` - 슬라이드 삭제

### 투표 & 상호작용

- `POST /api/votes/submit` - 투표 제출
- `POST /api/participants/join` - 참여자 추가

## Realtime 아키텍처

### Broadcast (DB를 거치지 않는 즉시 전송)

- 슬라이드 전환 이벤트
- 발표 시작/종료

### Postgres Changes (DB 변경 감지)

- 투표 실시간 업데이트
- 댓글 실시간 수신
- 손들기 상태 변경

## 개발 로드맵

### Phase 1 ✅ 완료

- [x] 기본 프로젝트 구조
- [x] API 라우트 설계
- [x] 발표자 대시보드 기본 UI
- [x] 참여자 조인 페이지

### Phase 2 🔄 진행 중

- [ ] Supabase 실시간 연결 테스트 (환경 변수 필요)
- [ ] 투표 기능 완성
- [ ] 실시간 차트 업데이트

### Phase 3 ❌ 예정

- [ ] 댓글 기능
- [ ] 손들기 기능
- [ ] 워드클라우드
- [ ] 퀴즈 기능
- [ ] 모바일 최적화

### Phase 4 ❌ 예정

- [ ] 사용자 피드백 수렴
- [ ] 성능 최적화
- [ ] Vercel 배포

### Phase 5 ❌ 예정 — 모더레이터 인증

- [ ] Supabase Anonymous Auth 도입
- [ ] `sessions.created_by` 컬럼 `text` → `uuid` 변경
- [ ] `useAuth` 훅 구현 (익명 세션 자동 생성/복원)
- [ ] 발표자 권한 검증 (`created_by = auth.uid()`)
- [ ] `/my-sessions` 페이지 (내 세션 목록)
- [ ] `/api/sessions/mine` API
- [ ] RLS 정책 소유권 기반으로 업데이트
- [ ] 세션 재접속 UX (발표 전날 준비 → 다음 날 접속)

> 상세 가이드: [AUTH_GUIDE.md](./AUTH_GUIDE.md)

### Phase 6 ❌ 예정 — 소셜 로그인

- [ ] Google OAuth 연동
- [ ] Kakao OAuth 연동
- [ ] 익명 계정 → 소셜 계정 연결 (`linkIdentity`)
- [ ] 로그인 UI 추가 (소셜 로그인 버튼)
- [ ] 세션 소유권 이관 (공유 코드 복구)
- [ ] 사용자 프로필 표시 (이름, 아바타)
- [ ] 익명 계정 자동 정리 Cron job

> 마이그레이션 가이드: [AUTH_GUIDE.md - 5단계](./AUTH_GUIDE.md#5단계-소셜-로그인-마이그레이션-향후)

## 문제 해결

### 문제: 500 에러가 계속 발생합니다

**해결책**: `.env.local` 파일이 올바르게 설정되었는지 확인합니다.

```bash
# .env.local 예시
NEXT_PUBLIC_SUPABASE_URL=https://xxxx-yyyy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 문제: Realtime이 작동하지 않습니다

**해결책**: Supabase 프로젝트에서 테이블에 대해 Realtime이 활성화되었는지 확인합니다.

### 문제: CORS 에러

**해결책**: Supabase 프로젝트 설정에서 배포 도메인을 CORS 화이트리스트에 추가합니다.

## 기여

버그 보고 및 기능 요청은 이슈로 등록해주세요!

## 라이선스

MIT

---

더 자세한 설정 방법은 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)을 참고하세요.

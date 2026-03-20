# Real-Slide Phase 2 구현 완료 가이드

## 개요

Phase 2는 **기본 인프라 + 슬라이드 전환** 기능을 구현했습니다.

- Supabase 데이터베이스 스키마 완성
- API Routes 구현 완료
- Realtime Broadcast 채널 설정
- 발표자/참여자 페이지 기본 완성

## 빠른 시작 (Quick Start)

### 1. Supabase 프로젝트 설정

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성 (`real-slide`)
2. [SUPABASE_SETUP.md](SUPABASE_SETUP.md)의 SQL을 복사하여 **SQL Editor**에서 실행
3. **Realtime** 섹션에서 다음 테이블들 활성화:
   - slides, votes, comments, hands_up, wordcloud_items, quiz_answers

### 2. 환경 변수 설정

프로젝트의 **Settings > API**에서:

- `NEXT_PUBLIC_SUPABASE_URL` 복사
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 복사

`.env.local` 파일에 추가:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### 3. 로컬 개발 시작

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 기능 테스트

### 시나리오: 발표자 + 2명의 참여자

**브라우저 1 (발표자)**

1. `/creator` 접속
2. "프레젠테이션 제목" 입력 후 "발표 시작" 클릭
3. 세션 코드 (예: `AB12CD`) 확인 및 복사
4. 슬라이드 추가 폼에서:
   - 타입: "일반 슬라이드"
   - 제목: "Welcome"
   - 내용: "실시간 프레젠테이션 플랫폼 테스트"
   - "슬라이드 추가" 클릭
5. 반복해서 2-3개 슬라이드 추가

**브라우저 2 (참여자 1)**

1. `/join` 접속
2. 세션 코드: `AB12CD` 입력
3. 닉네임: `Alice` 입력
4. "입장하기" 클릭
5. 발표자가 추가한 슬라이드가 실시간으로 표시되는지 확인

**브라우저 3 (참여자 2)**

1. 브라우저 2와 동일한 과정 진행 (닉네임: `Bob`)
2. Alice, Bob 모두 동일한 슬라이드를 보는지 확인

**발표자 → 슬라이드 전환 테스트**

1. 발표자가 "다음" 버튼 클릭
2. Alice, Bob 화면이 1초 이내에 동일하게 업데이트되는지 확인 ✓

### 투표 기능 테스트 (Phase 3 준비)

**발표자 측**

1. 슬라이드 추가 폼에서:
   - 타입: "투표"
   - 제목: "선호하는 언어는?"
   - 선택지: `Python\nJavaScript\nGo` (줄바꿈으로 구분)
   - "슬라이드 추가" 클릭

**참여자 측 (Alice, Bob)**

1. 발표자가 투표 슬라이드로 전환
2. 4개의 선택지 버튼이 표시됨
3. 한 버튼 클릭 → "투표가 완료되었습니다" 메시지 표시
4. 재투표 불가 확인

**발표자 측**

1. 우측에 "투표 결과" 차트 표시됨 (빈 상태 또는 데이터 반영)

## 파일 구조 (Phase 2 완성 부분)

```
src/
├── app/
│   ├── creator/page.tsx                    ✓ 발표자 세션 생성
│   ├── join/
│   │   ├── page.tsx                       ✓ 세션 코드 입력
│   │   └── [sessionId]/page.tsx           ✓ 참여자 슬라이드 뷰
│   ├── session/[sessionId]/
│   │   └── presenter/page.tsx             ✓ 발표자 제어판 + 슬라이드 추가
│   ├── api/
│   │   ├── sessions/
│   │   │   ├── create/route.ts            ✓ POST 세션 생성
│   │   │   ├── [sessionId]/route.ts       ✓ GET 세션 정보
│   │   │   └── validate/[code]/route.ts   ✓ GET 세션 검증
│   │   ├── slides/
│   │   │   └── [sessionId]/route.ts       ✓ GET/POST/PUT/DELETE 슬라이드
│   │   ├── participants/
│   │   │   └── join/route.ts              ✓ POST 참여자 추가
│   │   └── votes/
│   │       ├── submit/route.ts            ✓ POST 투표 제출
│   │       └── [slideId]/route.ts         ✓ GET 투표 조회
├── components/
│   ├── SlidePresentation.tsx               ✓ 슬라이드 렌더링 (옵션 표시 포함)
│   └── VoteChart.tsx                       ✓ 투표 차트 (Recharts)
├── hooks/
│   └── useRealtimeChannel.ts               ✓ Realtime 구독 & 브로드캐스트
├── lib/
│   ├── supabase.ts                         ✓ Supabase 클라이언트
│   └── api.ts                              ✓ API 유틸리티 (선택사항)
└── types/
    └── index.ts                            ✓ TypeScript 타입
```

## 다음 단계 (Phase 3: 투표, 댓글, 손들기)

Phase 3에서는 다음을 추가합니다:

- ✓ 실시간 투표 결과 업데이트 (Postgres Changes)
- 댓글 기능 (실시간 스트림)
- 손들기 토글 (응답 기반)
- 워드클라우드 (실시간 단어 입력)

### 예상 Phase 3 작업

1. `/api/comments/submit` - 댓글 제출
2. `/api/hands-up/toggle` - 손들기 토글
3. `/api/wordcloud/submit` - 워드클라우드 단어 제출
4. 발표자 대시보드에 실시간 패널 추가
   - 댓글 스트림 뷰
   - 손 든 참여자 카운터
   - 워드클라우드 시각화
5. useRealtimeChannel에 Postgres Changes 구독 추가

## 알려진 이슈 & 해결책

### 1. Realtime이 작동하지 않을 때

```
Supabase 콘솔 > Realtime 탭에서:
- 해당 테이블이 "활성화" 상태인지 확인
- 테이블 선택 후 "Enable" 버튼 클릭
```

### 2. 환경 변수를 못 찾을 때

```bash
# 다시 확인
cat .env.local

# 개발 서버 재시작
npm run dev
```

### 3. 투표가 저장되지 않을 때

```
1. Supabase 콘솔 > Authentication 확인
2. voted_table의 RLS 정책 확인 (INSERT 허용)
3. 네트워크 탭에서 `/api/votes/submit` 응답 상태 확인
```

### 4. 참여자가 다른 슬라이드를 보일 때

```
이는 Realtime broadcast가 제대로 구독되지 않았을 가능성
- 콘솔에서 "Channel status" 로그 확인
- 네트워크 WebSocket 연결 확인
```

## 성능 최적화 팁

- **성능 모니터링**: React DevTools Profiler 사용
- **불필요한 리렌더링**: `useCallback`, `useMemo` 검토
- **Realtime 정리**: `useRealtimeChannel`의 cleanup 함수 확인
- **API 호출 최소화**: 중복 요청 제거

## Vercel 배포 준비

### 배포 전 체크리스트

- [ ] `.env.local` 파일은 커밋하지 않음
- [ ] Supabase 환경 변수를 Vercel 프로젝트 설정에 추가
- [ ] RLS 정책이 프로덕션 환경에 적용됨
- [ ] Realtime 테이블 활성화 확인

### Vercel 배포 명령어

```bash
# GitHub에 푸시
git add .
git commit -m "Phase 2: Realtime presentation platform"
git push origin main

# Vercel 자동 배포 (또는 수동 배포)
vercel deploy --prod
```

## 디버깅 팁

### 브라우저 콘솔에서 확인

```javascript
// Supabase 클라이언트 테스트
import { supabase } from "@/lib/supabase";

// 세션 조회
const { data } = await supabase.from("sessions").select("*").limit(1);
console.log(data);

// Realtime 채널 상태
const channel = supabase.channel("test");
channel.subscribe((status) => console.log(status));
```

### Supabase 콘솔에서 확인

1. **Database** > 각 테이블에서 데이터 확인
2. **Realtime** > 각 테이블 활성화 상태 확인
3. **SQL Editor** > 쿼리 직접 실행해서 데이터 확인

## 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [Next.js 공식 문서](https://nextjs.org/docs)
- [Recharts 차트 라이브러리](https://recharts.org)
- [Realtime 개념](https://supabase.com/docs/realtime/quickstart)

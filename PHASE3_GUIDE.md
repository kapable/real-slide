# Real-Slide Phase 3: 투표 기능 구현 가이드

## 개요

Phase 3는 **실시간 투표 기능**을 구현합니다.

### 완성된 기능

- ✅ 투표 API (submit + 결과 조회)
- ✅ Supabase Postgres Changes 실시간 구독
- ✅ 발표자용 투표 차트 (Recharts 바 차트)
- ✅ 참여자용 투표 인터페이스
- ✅ 중복 투표 방지 (사용자당 슬라이드당 1표)
- ✅ 발표자 슬라이드 전환 시 투표 초기화

## 기술 구조

### 1. 데이터베이스 (Votes 테이블)

```sql
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id UUID NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(slide_id, participant_id) -- 사용자당 슬라이드당 1표만
);
```

### 2. API Endpoints

#### POST `/api/votes/submit`

참여자가 투표를 제출합니다.

**Request:**

```json
{
  "slideId": "uuid-here",
  "participantId": "uuid-here",
  "optionIndex": 0
}
```

**Response:**

```json
{
  "id": "vote-id",
  "slide_id": "slide-id",
  "participant_id": "participant-id",
  "option_index": 0
}
```

**동작:**

- 처음 투표: 새 vote 레코드 INSERT
- 재투표: 기존 vote 레코드 UPDATE (중복 체크)

#### GET `/api/votes/[slideId]`

슬라이드의 모든 투표 데이터를 조회합니다.

**Response:**

```json
[
  {
    "id": "vote-id",
    "slide_id": "slide-id",
    "participant_id": "participant-id",
    "option_index": 0
  }
]
```

### 3. Realtime Subscription

#### Broadcast (발표자 控制板)

```typescript
// 발표자가 슬라이드 전환 시, 모든 참여자에게 브로드캐스트
channel.send({
  type: "broadcast",
  event: "slide:change",
  payload: { slideIndex: nextIndex },
});
```

#### Postgres Changes (발표자 投票 차트)

```typescript
// 새 투표가 INSERT될 때마다 자동으로 차트 갱신
channel.on(
  "postgres_changes",
  {
    event: "INSERT",
    schema: "public",
    table: "votes",
  },
  (payload) => {
    updateVoteChart(payload.new.slide_id);
  },
);
```

## 파일 구조

```
src/
├── app/
│   ├── api/
│   │   └── votes/
│   │       ├── submit/
│   │       │   └── route.ts          ← 투표 제출
│   │       └── [slideId]/
│   │           └── route.ts          ← 슬라이드 투표 조회
│   ├── join/[sessionId]/
│   │   └── page.tsx                  ← 참여자 투표 UI
│   └── session/[sessionId]/presenter/
│       └── page.tsx                  ← 발표자 투표 차트
├── components/
│   ├── SlidePresentation.tsx          ← 투표 옵션 표시
│   └── VoteChart.tsx                 ← Recharts 차트
├── hooks/
│   └── useRealtimeChannel.ts          ← Realtime 구독
└── types/
    └── index.ts                       ← Vote 타입 정의
```

## 테스트 시나리오

### 시나리오 1: 기본 투표 (1명 발표자 + 2명 참여자)

#### 1단계: 발표자 설정

1. **브라우저 1** (`/:presenting`): `/creator` 접속
2. "투표 테스트 세션" 입력 후 "발표 시작" 클릭
3. 세션 코드 확인 (예: `AB12CD`)
4. 슬라이드 추가:
   - 타입: "투표"
   - 제목: "선호하는 언어는?"
   - 선택지:
     ```
     Python
     JavaScript
     Go
     Rust
     ```
   - "슬라이드 추가" 클릭

#### 2단계: 참여자 1 참여

1. **브라우저 2**: `/join` 접속
2. 세션 코드: `AB12CD` 입력
3. 닉네임: `Alice` 입력
4. "입장하기" 클릭
5. "선호하는 언어는?" 슬라이드가 자동으로 표시되는지 확인
6. "Python" 버튼 클릭
7. "✓ 투표가 완료되었습니다" 메시지 표시 확인
8. 버튼이 비활성화되고 회색으로 변하는지 확인

#### 3단계: 참여자 2 참여

1. **브라우저 3**: 브라우저 2와 동일한 과정 진행
2. 닉네임: `Bob` 입력
3. "JavaScript" 버튼 클릭

#### 4단계: 발표자 투표 차트 확인

1. **브라우저 1**의 선택지 아래에 "투표 결과" 차트 표시 확인
2. 차트 데이터:
   - Python: 1표
   - JavaScript: 1표
   - Go: 0표
   - Rust: 0표

### 시나리오 2: 실시간 동기화 (1초 이내)

#### 초기 상태

- 발표자: 빈 차트 (0표)
- Alice: 투표 전
- Bob: 투표 전

#### Alice 투표

1. Alice가 "Python" 클릭
2. 1초 이내에 발표자 차트가 업데이트되는지 확인
   - 차트에 Python: 1표 표시

#### Bob 투표

1. Bob이 "JavaScript" 클릭
2. 1초 이내에 발표자 차트 업데이트
   - 차트에 JavaScript: 1표 추가

### 시나리오 3: 슬라이드 전환 시 투표 초기화

#### 슬라이드 준비

1. 또 다른 투표 슬라이드 추가:
   - 제목: "좋아하는 색은?"
   - 선택지: `빨강\n파랑\n초록`

#### 슬라이드 전환

1. 발표자가 "다음" 버튼 클릭
2. 모든 참여자 화면이 1초 이내에 "좋아하는 색은?" 슬라이드로 변경되는지 확인
3. Alice와 Bob의 투표 상태가 초기화되는지 확인:
   - 버튼이 다시 활성화 (파란색)
   - "✓ 투표가 완료되었습니다" 메시지 사라짐

#### 재투표

1. Alice가 "파랑" 클릭 (이전과 다른 선택)
2. 발표자 차트가 "좋아하는 색은?" 데이터로 업데이트되는지 확인

### 시나리오 4: 중복 투표 방지

#### 재투표 시도

1. Alice가 이미 투표한 슬라이드로 돌아감
2. "선호하는 언어는?" 슬라이드에서 "Go" 버튼 클릭
3. **결과:**
   - 슬라이드가 전환되지 않았으므로 `hasVoted` 상태 때문에 버튼이 비활성화됨
   - 투표 API는 UPDATE 처리 (기존 투표 수정)

#### 새 슬라이드 투표

1. 첫 번째 "선호하는 언어는?" 슬라이드에서 각 참여자가 한 번만 투표 가능
2. 투표 후 슬라이드 전환 → 버튼 활성화 → 새 슬라이드 투표 가능

## 문제 해결

### 문제 1: 발표자 차트가 업데이트되지 않음

**원인:**

- Postgres Changes 구독이 제대로 설정되지 않음
- 투표 API 응답 오류

**해결:**

1. Supabase 콘솔에서 `votes` 테이블의 Realtime이 활성화되어 있는지 확인
   - Settings → Database → Replication → votes 체크 상태 확인
2. 브라우저 콘솔에서 에러 메시지 확인 (`F12` → Console)
3. 네트워크 탭에서 `/api/votes/submit` 요청이 200 응답인지 확인

### 문제 2: 참여자가 투표한 후 버튼이 비활성화되지 않음

**원인:**

- `handleVote` 함수에서 `setHasVoted(true)` 호출 전에 에러 발생

**해결:**

1. 투표 API 응답 상태 확인
2. 브라우저 콘솔 에러 메시지 확인

### 문제 3: 슬라이드 전환이 다른 참여자에게 동기화되지 않음

**원인:**

- Broadcast 채널 구독이 제대로 설정되지 않음

**해결:**

1. 발표자와 참여자가 동일한 `session-${sessionId}` 채널을 구독하는지 확인
2. 발표자의 "다음" 버튼 클릭 시 console.log로 브로드캐스트 사건 확인
3. 참여자 콘솔에서 수신 이벤트 로그 확인

## Supabase 설정 확인 체크리스트

- [ ] Votes 테이블 생성됨
- [ ] Votes 테이블의 Realtime 활성화됨
  - Supabase 콘솔 → Settings → Database → Replication
  - `votes` 행의 토글이 **활성화**되어야 함
- [ ] UNIQUE 제약조건 설정됨 (slide_id + participant_id)
- [ ] 환경 변수 설정됨
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 성능 최적화

### 1. 중복 요청 방지

- 참여자가 투표 후 즉시 `hasVoted = true`로 설정 → 중복 클릭 방지
- 발표자가 슬라이드 전환 시 `setVotes({})`로 초기화 → 이전 투표 데이터 정리

### 2. Realtime 구독 메모리 누수 방지

- `useEffect` cleanup에서 `supabase.removeChannel()` 호출
- 세션 종료 시 채널 자동 정리

### 3. 차트 업데이트 최적화

- `updateVoteChart`를 `useCallback`으로 메모이제이션
- 현재 슬라이드의 투표만 구독 (필터링)

## 다음 단계 (Phase 4)

Phase 3 완료 후, Phase 4에서는:

1. **댓글 기능** — 참여자가 실시간 댓글 입력 → 발표자 스트림 표시
2. **손들기 기능** — 참여자 손들기 → 발표자 카운터 표시
3. **워드클라우드** — 참여자 단어 입력 → 발표자 실시간 워드클라우드

## 참고 자료

- [Supabase Realtime 문서](https://supabase.com/docs/guides/realtime)
- [Recharts 입력창 다큐](https://recharts.org/en-US/api/BarChart)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

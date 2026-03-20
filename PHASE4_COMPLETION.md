# Phase 4 구현 완료 요약

## 상태: ✅ 완료

Phase 4는 상호작용 기능의 3가지 핵심 피처를 구현합니다: 댓글, 손들기, 워드클라우드

---

## 구현된 기능

### 1. 댓글 기능 (Comments)

#### API 엔드포인트

- **POST `/api/comments/submit`** — 댓글 제출
  - Request: `{ slideId, participantId, nickname, text }`
  - Response: 생성된 댓글 객체
  - 실시간 저장 및 자동 좋아요 카운트 (0으로 초기화)

- **GET `/api/comments/[slideId]`** — 슬라이드별 댓글 조회
  - Response: 댓글 배열 (최신순 정렬)

- **POST `/api/comments/[commentId]/like`** — 댓글 좋아요
  - 기존 댓글의 좋아요 수 +1
  - 중복 좋아요 방지 (클라이언트 상태 관리)

#### UI 컴포넌트: `CommentSection.tsx`

- **위치**: 참여자 뷰 오른쪽 패널 (col-span-2)
- **기능**:
  - 댓글 목록 (최신순)
  - 실시간 폴링 (2초 간격)
  - 댓글 입력 폼
  - 좋아요 버튼 (하트 아이콘)
  - 댓글 타임스탐프 표시
  - 발표자 뷰에서도 별도 표시 (닉네임 "발표자" 사용)

**기능 상세:**

```typescript
// 댓글 객체 구조
{
  id: string;
  slide_id: string;
  participant_id: string;
  nickname: string;
  text: string;
  likes: number;
  created_at: string;
}
```

---

### 2. 손들기 기능 (Hands Up)

#### API 엔드포인트

- **POST `/api/hands-up/toggle`** — 손 들기/내리기 토글
  - Request: `{ sessionId, participantId, nickname, isUp }`
  - 동작:
    - 첫 요청: INSERT (새 기록)
    - 재요청: UPDATE (기존 기록 수정)
  - Response: 업데이트된 손들기 기록

- **GET `/api/hands-up/[sessionId]`** — 손 든 사람 리스트
  - Response: 현재 손을 든 참여자 배열 (최신순)
  - 필터: `is_up = true` 인 기록만 반환

#### UI 컴포넌트

**1. `ParticipantControls.tsx`** (참여자 뷰 하단)

- 손 들기 버튼 (Hand 아이콘)
  - 클릭 시 상태 토글
  - 손 든 상태: 빨강색 배경
  - 손 내린 상태: 흰색 배경
- 워드클라우드 입력 폼과 함께 표시

**2. `HandsUpPanel.tsx`** (발표자 뷰 오른쪽 상단)

- 손 든 사람 카운트
- 참여자 리스트
  - 닉네임
  - 손을 든 시간
  - "완료" 버튼 (발표자가 손을 내려줄 수 있음)
- 실시간 폴링 (2초 간격)
- 주황색 테마 (강조)

**기능 상세:**

```typescript
// 손들기 객체 구조
{
  id: string;
  session_id: string;
  participant_id: string;
  nickname: string;
  is_up: boolean;
  toggled_at: string;
}
```

---

### 3. 워드클라우드 기능 (Wordcloud)

#### API 엔드포인트

- **POST `/api/wordcloud/submit`** — 단어 입력
  - Request: `{ slideId, word }`
  - 동작:
    - 첫 입력: INSERT (count = 1)
    - 재입력: UPDATE (count + 1)
    - 정규화: 소문자 + trim() 처리
  - Response: 단어 객체

- **GET `/api/wordcloud/[slideId]`** — 슬라이드 워드클라우드 조회
  - Response: 단어 배열 (빈도순 정렬)
  - 최대 100개 반환

#### UI 컴포넌트

**1. `WordcloudDisplay.tsx`** (참여자/발표자 뷰 중앙)

- 단어들을 시각적으로 표시
- **폰트 크기**: 빈도에 따라 동적 계산
  - 최소: 12px (count=1)
  - 최대: 48px (최고빈도)
- **색상**: 10가지 색상 순환 적용
- 마우스 호버시 확대 (scale-110)
- 단어 클릭시 수를 보여주는 tooltip
- 실시간 폴링 (2초 간격)

**2. `ParticipantControls.tsx`의 워드클라우드 입력**

- 인풋 필드에 단어 입력
- 버튼 클릭으로 제출
- 중복 단어 자동 병합 (count 증가)

**기능 상세:**

```typescript
// 워드클라우드 단어 객체
{
  id: string;
  slide_id: string;
  word: string; // 소문자 + trim 정규화
  count: number;
}
```

---

## 레이아웃 변경사항

### 참여자 뷰 (`/join/[sessionId]`)

```
┌─────────────────────────────────────────────────────┐
│  Top Navigation (닉네임, 슬라이드 카운트)            │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│   Main Slide         │   Comment Section (NEW)       │
│   (16:9 AR)          │   - 댓글 목록                │
│                      │   - 좋아요                   │
│   Vote/Quiz UI       │   - 댓글 입력               │
│                      │                              │
│   Wordcloud (NEW)    │                              │
│   - 단어들 표시       │                              │
│                      │                              │
├──────────────────────┴──────────────────────────────┤
│  Participant Controls (NEW)                          │
│  [손 들기] [단어 입력] [제출]                       │
└──────────────────────────────────────────────────────┘
```

**그리드 구조**: 5칼럼 (3 + 2)

- 왼쪽 3칼럼: 슬라이드, 투표UI, 워드클라우드
- 오른쪽 2칼럼: 댓글 섹션

### 발표자 뷰 (`/session/[sessionId]/presenter`)

```
┌──────────────────────────────────────────────────────────────┐
│  Top Navigation (세션 코드, 종료 버튼)                        │
├──────────┬─────────────────────────────────┬─────────────────┤
│ Slide    │  Main Slide & Controls           │  Hands Up (NEW) │
│ Creation │  - 슬라이드 (16:9 AR)           │  - 손 든 사람   │
│ Panel    │  - 이전/다음 버튼               │  - 완료 버튼   │
│          │  - 투표 차트                    │                │
│ [2칼럼]  │  - Wordcloud (NEW)              │  Comments (NEW) │
│          │  [5칼럼]                        │  - 댓글 목록   │
│          │                                 │  - 좋아요      │
│          │                                 │  [5칼럼]       │
└──────────┴─────────────────────────────────┴─────────────────┘
```

**그리드 구조**: 12칼럼 (2 + 5 + 5)

- 왼쪽 2칼럼: 슬라이드 추가/관리
- 중앙 5칼럼: 메인 슬라이드 + 투표 + 워드클라우드
- 오른쪽 5칼럼: 손들기 + 댓글

---

## 실시간 동기화

### 방식: Polling (2초 간격)

현재 Phase 4는 **폴링**을 사용하여 데이터를 갱신합니다:

- 댓글: `/api/comments/[slideId]` 2초마다 요청
- 손들기: `/api/hands-up/[sessionId]` 2초마다 요청
- 워드클라우드: `/api/wordcloud/[slideId]` 2초마다 요청

**향후 개선**: Supabase Realtime Postgres Changes로 변경 가능

```typescript
// 예시 (구현되지 않음)
channel.on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'comments' },
  (payload) => setComments(...)
)
```

---

## 데이터베이스 스키마 (Supabase)

### Comments 테이블

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id UUID NOT NULL REFERENCES slides(id),
  participant_id UUID NOT NULL REFERENCES participants(id),
  nickname TEXT NOT NULL,
  text TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_slide_id ON comments(slide_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
```

### Hands_up 테이블

```sql
CREATE TABLE hands_up (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  participant_id UUID NOT NULL REFERENCES participants(id),
  nickname TEXT NOT NULL,
  is_up BOOLEAN DEFAULT FALSE,
  toggled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, participant_id)
);

CREATE INDEX idx_hands_up_session_is_up ON hands_up(session_id, is_up);
```

### Wordcloud_items 테이블

```sql
CREATE TABLE wordcloud_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id UUID NOT NULL REFERENCES slides(id),
  word TEXT NOT NULL,
  count INTEGER DEFAULT 1
);

CREATE UNIQUE INDEX idx_wordcloud_unique ON wordcloud_items(slide_id, word);
CREATE INDEX idx_wordcloud_count ON wordcloud_items(count DESC);
```

---

## 파일 구조

```
src/
├── app/
│   ├── api/
│   │   ├── comments/
│   │   │   ├── submit/route.ts (NEW)
│   │   │   ├── [slideId]/route.ts (NEW)
│   │   │   └── [commentId]/like/route.ts (NEW)
│   │   ├── hands-up/
│   │   │   ├── toggle/route.ts (NEW)
│   │   │   └── [sessionId]/route.ts (NEW)
│   │   └── wordcloud/
│   │       ├── submit/route.ts (NEW)
│   │       └── [slideId]/route.ts (NEW)
│   └── join/[sessionId]/page.tsx (UPDATED - 레이아웃 변경)
│   └── session/[sessionId]/presenter/page.tsx (UPDATED - 레이아웃 변경)
│
├── components/
│   ├── CommentSection.tsx (NEW)
│   ├── HandsUpPanel.tsx (NEW)
│   ├── ParticipantControls.tsx (NEW)
│   └── WordcloudDisplay.tsx (NEW)
```

---

## 사용 방법

### 참여자 관점

1. 세션 참여 (`/join/[code]`)
2. 댓글 작성: 오른쪽 댓글 섹션에서 텍스트 입력 → 전송
3. 좋아요: 댓글의 하트 아이콘 클릭 (1회만 가능)
4. 손들기: 하단의 "손 들기" 버튼 클릭 → 발표자에게 표시
5. 워드클라우드: 하단의 워드 입력 필드에 단어 입력 → 제출

### 발표자 관점

1. 세션 생성 및 슬라이드 추가
2. 오른쪽 상단의 "손 들은 사람" 패널에서 참여자 확인
   - "완료" 버튼으로 손을 내려줄 수 있음
3. 오른쪽 하단의 댓글 섹션에서 실시간 댓글 모니터링
4. 중앙의 워드클라우드에서 참여자들의 의견 시각화

---

## 테스트 체크리스트

### 댓글 기능

- [ ] 참여자가 댓글 작성 가능
- [ ] 발표자가 모든 댓글 볼 수 있음
- [ ] 좋아요 버튼 작동 (1회만)
- [ ] 댓글 목록이 최신순으로 정렬됨
- [ ] 슬라이드 변경 시 댓글도 함께 업데이트됨

### 손들기 기능

- [ ] 참여자가 손을 들 수 있음
- [ ] 손을 든 상태가 발표자에게 실시간 표시됨
- [ ] 발표자가 "완료" 버튼으로 손을 내려줄 수 있음
- [ ] 다중 참여자 손들기가 리스트에 표시됨

### 워드클라우드 기능

- [ ] 참여자가 단어 입력 가능
- [ ] 단어가 워드클라우드에 표시됨
- [ ] 같은 단어 입력시 count 증가
- [ ] 폰트 크기가 빈도에 따라 변함
- [ ] 색상이 다양하게 표시됨
- [ ] 마우스 호버시 확대 효과

### 통합 테스트

- [ ] 4개 브라우저 (발표자 1 + 참여자 3) 동시 테스트
- [ ] 모바일 반응형 확인
- [ ] 폴링 간격 (2초) 확인
- [ ] 메모리 누수 없는지 확인 (개발자 도구)

---

## 향후 개선 사항

### Phase 5 (퀴즈)

- Quiz 타입의 슬라이드 완성
- 정답 표시 및 점수 계산

### Phase 6 (UI 개선)

- 모바일 최적화 (현재 데스크톱 중심)
- 댓글 모더레이션 기능
- 손들기 알림 소리

### Phase 7+ (성능 개선)

- Supabase Realtime 전환 (Postgres Changes)
- WebSocket 기반 실시간 동기화
- 100+ 참여자 기반 테스트
- Redis 캐싱 추가

---

## 주요 코드 예시

### 댓글 제출

```typescript
const res = await fetch("/api/comments/submit", {
  method: "POST",
  body: JSON.stringify({
    slideId,
    participantId,
    nickname,
    text,
  }),
});
```

### 손들기 토글

```typescript
const res = await fetch("/api/hands-up/toggle", {
  method: "POST",
  body: JSON.stringify({
    sessionId,
    participantId,
    nickname,
    isUp: true,
  }),
});
```

### 워드클라우드 단어 추가

```typescript
const res = await fetch("/api/wordcloud/submit", {
  method: "POST",
  body: JSON.stringify({
    slideId,
    word: "example",
  }),
});
```

---

## 검증 완료

- [x] 모든 API 엔드포인트 구현
- [x] UI 컴포넌트 완성
- [x] 참여자/발표자 페이지 통합
- [x] 기본 폴링 기반 실시간 갱신
- [x] 에러 핸들링
- [x] 로딩 상태 관리
- [x] 타입스크립트 타입 정의

다음은 **Phase 5: 퀴즈 기능**입니다.

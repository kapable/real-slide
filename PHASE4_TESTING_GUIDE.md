# Phase 4 빠른 시작 가이드

## 설정 전 확인사항

### 1. Supabase 테이블 생성

Supabase 콘솔에서 다음 테이블들을 생성합니다:

#### Comments 테이블

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

#### Hands_up 테이블

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

#### Wordcloud_items 테이블

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

### 2. RLS 정책 설정

각 테이블에 대해 다음 RLS 정책을 설정합니다:

**Comments**

```sql
-- SELECT: 모든 사람이 읽을 수 있음
CREATE POLICY "select_comments" ON comments
  FOR SELECT USING (true);

-- INSERT: 참여자만 삽입 가능
CREATE POLICY "insert_comments" ON comments
  FOR INSERT WITH CHECK (true);

-- UPDATE (좋아요): 모두 가능
CREATE POLICY "update_comments_likes" ON comments
  FOR UPDATE USING (true) WITH CHECK (true);
```

**Hands_up**

```sql
-- SELECT: 모두 볼 수 있음
CREATE POLICY "select_hands_up" ON hands_up
  FOR SELECT USING (true);

-- INSERT/UPDATE: 참여자만 가능
CREATE POLICY "insert_update_hands_up" ON hands_up
  FOR INSERT WITH CHECK (true);

CREATE POLICY "update_hands_up" ON hands_up
  FOR UPDATE USING (true) WITH CHECK (true);
```

**Wordcloud_items**

```sql
-- SELECT: 모두 볼 수 있음
CREATE POLICY "select_wordcloud" ON wordcloud_items
  FOR SELECT USING (true);

-- INSERT: 참여자만 삽입 가능
CREATE POLICY "insert_wordcloud" ON wordcloud_items
  FOR INSERT WITH CHECK (true);

-- UPDATE (count): 모두 가능
CREATE POLICY "update_wordcloud_count" ON wordcloud_items
  FOR UPDATE USING (true) WITH CHECK (true);
```

---

## 테스트 시나리오

### 시나리오 1: 댓글 기능 테스트 (5분)

1. **발표자가 세션 생성**
   - http://localhost:3000/creator 접속
   - 세션 제목 입력 → "세션 시작"
   - 슬라이드 추가
   - Share Code 복사

2. **참여자 1, 2, 3이 세션 참여**
   - http://localhost:3000/join/[code] 접속
   - 닉네임 입력: "참여자1", "참여자2", "참여자3"

3. **댓글 작성 테스트**
   - 각 참여자가 오른쪽 하단의 댓글 입력창에 텍스트 입력
   - 예: "참여자1이 작성한 댓글입니다"
   - 2초 이내에 모든 화면에 실시간으로 표시되어야 함

4. **좋아요 테스트**
   - 댓글의 하트 아이콘 클릭
   - 좋아요 수가 증가해야 함
   - 다시 클릭하면 반응 없음 (중복 방지)

---

### 시나리오 2: 손들기 기능 테스트 (5분)

1. **발표자 화면 확인**
   - 발표자 뷰의 오른쪽 상단에 "손 들은 사람 (0)"이 표시됨

2. **참여자 손들기**
   - 참여자 1, 2가 하단의 "손 들기" 버튼 클릭
   - 버튼이 빨강색으로 변함
   - 발표자 화면에 즉시 "손 들은 사람 (2)" 표시로 변경되어야 함

3. **발표자가 손 내려주기**
   - 발표자가 손들기 패널의 "완료" 버튼 클릭
   - 참여자의 "손 들기" 버튼이 다시 흰색으로 변함
   - 파넬의 손 든 사람 리스트에서 제거됨

---

### 시나리오 3: 워드클라우드 기능 테스트 (5분)

1. **단어 입력**
   - 참여자 1, 2, 3이 하단의 워드클라우드 입력창에 단어 입력
   - 예:
     - 참여자1: "진짜", "좋아", "진짜", "좋은" (진짜 2회)
     - 참여자2: "흥미", "흥미" (2회)
     - 참여자3: "재미있다" (1회)

2. **워드클라우드 표시 확인**
   - 중앙 아래의 워드클라우드 표시 영역 확인
   - "진짜"가 가장 크게 (count=2)
   - "흥미"가 중간 크기 (count=2)
   - "좋아", "좋은", "재미있다"가 작게
   - 각 정렬: 빈도순

3. **색상 다양성 확인**
   - 단어들이 다양한 색상 (파랑, 보라, 핑크, 빨강 등)으로 표시됨

4. **마우스 호버**
   - 단어 위에서 마우스 호버 → 약간 확대되어야 함
   - Tooltip에 단어와 count 표시

---

### 시나리오 4: 통합 테스트 (10분)

**4개 브라우저 또는 탭으로 동시 테스트**

1. **세팅**
   - Chrome: 발표자 뷰 + DevTools (개발자 도구) 열기
   - Safari/Firefox 탭 2개: 참여자 2명
   - Edge 탭: 참여자 1명

2. **동시 작업**
   - 모든 참여자가 동시에:
     - 댓글 작성 (각각 3개씩)
     - 손 들기 (1명씩 2초 간격)
     - 단어 입력 (각각 2개씩)

3. **발표자 대시보드 모니터링**
   - 모든 상호작용이 2초 내에 실시간으로 업데이트되는지 확인
   - DevTools Console에서 에러가 없는지 확인 (Network 탭)

4. **성능 확인**
   - DevTools Memory 탭에서 메모리 usage가 급증하지 않는지 확인
   - 폴링 요청이 정기적으로 일어나는지 Network 탭에서 확인

---

## 문제 해결

### 댓글이 업데이트되지 않을 때

1. **Browser DevTools 확인**

   ```javascript
   // Console에서 실행
   fetch("/api/comments/[slideId]")
     .then((r) => r.json())
     .then(console.log);
   ```

2. **Supabase 콘솔 확인**
   - RLS 정책이 제대로 설정되었는지
   - `comments` 테이블에 데이터가 실제로 저장되는지

3. **API 라우트 확인**
   - `/api/comments/submit`가 정상적으로 응답하는지
   - 응답 상태 코드가 200인지 확인

### 손들기가 작동하지 않을 때

1. **Unique 제약 확인**
   - `hands_up` 테이블의 UNIQUE 제약이 정상인지
   - 같은 session_id와 participant_id의 중복 레코드가 없는지

2. **Toggle 로직 확인**
   - 첫 요청에서 INSERT
   - 두 번째 요청에서 UPDATE (is_up 토글)

### 워드클라우드가 비어있을 때

1. **단어 정규화 확인**
   - 단어가 소문자로 저장되는지 확인
   - 같은 단어가 중복되는지 확인 (예: "진짜" vs "진짜 ")

2. **Count 업데이트 확인**
   - Supabase 콘솔에서 `wordcloud_items` 테이블에 데이터 확인
   - Count가 증가하는지 확인

---

## 성능 튜닝

### 폴링 간격 조정

현재는 2초로 설정되어 있습니다. 필요에 따라 조정:

**댓글** (`src/components/CommentSection.tsx`)

```typescript
const interval = setInterval(async () => {
  // ... polling logic
}, 2000); // 2초 → 1초, 3초로 조정 가능
```

**손들기** (`src/components/HandsUpPanel.tsx`)

```typescript
const interval = setInterval(fetchHandsUp, 2000);
```

**워드클라우드** (`src/components/WordcloudDisplay.tsx`)

```typescript
const interval = setInterval(fetchWordcloud, 2000);
```

### 메모리 누수 방지

모든 컴포넌트에서 cleanup 함수로 interval 정리:

```typescript
useEffect(() => {
  const interval = setInterval(fetchData, 2000);
  return () => clearInterval(interval); // ← 중요!
}, []);
```

---

## 다음 단계

Phase 4가 완료되었으므로, 다음은 **Phase 5: 퀴즈 기능**입니다.

퀴즈는 투표와 유사하지만:

- 정답을 설정할 수 있음
- 정답/오답을 따로 계산
- 점수 시스템 (선택사항)

PHASE5_GUIDE.md를 참고하여 진행하세요.

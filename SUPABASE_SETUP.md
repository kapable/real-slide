# Real-Slide: Supabase 설정 가이드

## 1단계: Supabase 프로젝트 생성

1. https://supabase.com에서 계정을 만들고 로그인합니다.
2. "New Project" 버튼을 클릭합니다.
3. 다음 정보를 입력합니다:
   - **Name**: real-slide
   - **Database Password**: 안전한 비밀번호 생성
   - **Region**: 서울 (ap-northeast-1) 선택
4. "Create new project"를 클릭합니다.

## 2단계: 데이터베이스 스키마 생성

프로젝트가 생성된 후, Supabase 콘솔의 **SQL Editor**로 이동하여 다음 SQL을 실행합니다:

```sql
-- Sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by TEXT NOT NULL,
  title TEXT NOT NULL,
  share_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Slides table
CREATE TABLE public.slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'slide', -- slide, vote, quiz
  title TEXT,
  content TEXT,
  options TEXT, -- JSON string of options
  correct_answer INTEGER, -- For quiz
  show_result BOOLEAN DEFAULT false, -- Reveal quiz/vote results
  created_at TIMESTAMP DEFAULT NOW()
);

-- Participants table
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW()
);

-- Votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id UUID NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(slide_id, participant_id)
);

-- Comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id UUID NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE, -- Null if presenter
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,   -- For replies
  nickname TEXT DEFAULT '익명',
  text TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS policies for comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.comments FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.comments FOR DELETE USING (true);

-- Hands up table
CREATE TABLE public.hands_up (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  is_up BOOLEAN DEFAULT false,
  toggled_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, participant_id)
);

-- Wordcloud items table
CREATE TABLE public.wordcloud_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id UUID NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quiz answers table
CREATE TABLE public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id UUID NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  answer_index INTEGER NOT NULL,
  is_correct BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(slide_id, participant_id)
);

-- RLS Policies (Row Level Security)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hands_up ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wordcloud_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users (everyone can read/write)
CREATE POLICY "Enable read access for all users" ON public.sessions
  AS PERMISSIVE FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.sessions
  AS PERMISSIVE FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.slides
  AS PERMISSIVE FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.slides
  AS PERMISSIVE FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.slides
  AS PERMISSIVE FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public.slides
  AS PERMISSIVE FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.participants
  AS PERMISSIVE FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.participants
  AS PERMISSIVE FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.votes
  AS PERMISSIVE FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.votes
  AS PERMISSIVE FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.votes
  AS PERMISSIVE FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.comments
  AS PERMISSIVE FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.comments
  AS PERMISSIVE FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.hands_up
  AS PERMISSIVE FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.hands_up
  AS PERMISSIVE FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.hands_up
  AS PERMISSIVE FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.wordcloud_items
  AS PERMISSIVE FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.wordcloud_items
  AS PERMISSIVE FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.wordcloud_items
  AS PERMISSIVE FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public.wordcloud_items
  AS PERMISSIVE FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.quiz_answers
  AS PERMISSIVE FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.quiz_answers
  AS PERMISSIVE FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.quiz_answers
  AS PERMISSIVE FOR UPDATE USING (true);
```

## 3단계: Realtime 설정

Supabase Realtime은 데이터베이스 변경사항(INSERT, UPDATE, DELETE)을 WebSocket으로 실시간 전달합니다.

### Realtime 테이블 활성화 방법

1. **Supabase 콘솔** 접속 후 프로젝트 선택
2. 좌측 메뉴에서 **Realtime** 클릭
3. **활성화할 테이블 목록**:
   - ✓ **slides** - 발표자가 슬라이드/투표/퀴즈 추가 시 참여자에게 실시간 전달
   - ✓ **votes** - 참여자들의 투표 결과가 발표자 화면에 실시간 반영
   - ✓ **comments** - 댓글 추가 시 모든 사용자에게 즉시 표시
   - ✓ **hands_up** - 손 든 참여자 카운트 실시간 업데이트
   - ✓ **wordcloud_items** - 단어 입력 시 워드클라우드 실시간 업데이트
   - ✓ **quiz_answers** - 퀴즈 정답 제출 시 정답률 실시간 반영

### 상세 단계별 가이드

#### 방법 1️⃣: Supabase 콘솔에서 테이블별 활성화

1. Supabase 콘솔 → **Realtime** 메뉴 클릭
2. "Production" 또는 "Development" 선택 (일반적으로 "Production" 권장)
3. 각 테이블 우측의 **토글 버튼** 활성화:

   ```
   ☐ sessions      → ☑ (활성화 안 함 - Broadcast 전용)
   ☐ slides        → ☑ (활성화)
   ☐ participants  → ☐ (활성화 안 함)
   ☐ votes         → ☑ (활성화)
   ☐ comments      → ☑ (활성화)
   ☐ hands_up      → ☑ (활성화)
   ☐ wordcloud_items → ☑ (활성화)
   ☐ quiz_answers  → ☑ (활성화)
   ```

4. **저장** 버튼 클릭 (자동 저장되기도 함)
5. 콘솔 하단에 "✓ 설정이 저장되었습니다" 메시지 확인

#### 방법 2️⃣: SQL로 활성화 (선택사항)

SQL Editor에서 다음 명령어로도 활성화 가능:

```sql
-- Realtime 활성화 (테이블별)
alter publication supabase_realtime add table public.slides;
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.hands_up;
alter publication supabase_realtime add table public.wordcloud_items;
alter publication supabase_realtime add table public.quiz_answers;

-- 활성화 확인
select * from pg_publication_tables where pubname = 'supabase_realtime';
```

### Broadcast vs Postgres Changes 차이

| 구분       | Broadcast                                  | Postgres Changes                            |
| ---------- | ------------------------------------------ | ------------------------------------------- |
| **용도**   | 클라이언트가 보낸 메시지 전달              | 데이터베이스 변경사항 감지                  |
| **예시**   | 발표자가 슬라이드 전환 메시지 브로드캐스트 | 투표가 INSERT되면 즉시 모든 구독자에게 전달 |
| **활성화** | 별도 설정 불필요                           | 위의 Realtime 활성화 필수                   |
| **코드**   | `channel.send({ type: 'broadcast' })`      | 자동으로 `postgres_changes` 이벤트 감지     |

**Phase 2에서는**:

- **Broadcast** 사용: 발표자 → `slide:change` 이벤트 브로드캐스트 → 모든 참여자 슬라이드 전환
- **Postgres Changes** 준비: Phase 3에서 활용 (투표, 댓글, 손들기 등)

## 4단계: 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음을 추가합니다:

```bash
# Supabase Configuration
# https://supabase.com에서 프로젝트 생성 후 Settings > API에서 복사합니다

NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**주의**: `.env.local`은 `.gitignore`에 포함되어 있으므로 공개되지 않습니다.

## 5단계: 로컬 개발 시작

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

브라우저에서 `http://localhost:3000`을 열어 테스트합니다.

## Phase 2: 기본 기능 (슬라이드 전환)

### API 엔드포인트

**세션 생성**

```
POST /api/sessions/create
Body: { title: string }
Response: { sessionId: string, shareCode: string }
```

**슬라이드 조회**

```
GET /api/slides/[sessionId]
Response: Slide[]
```

**슬라이드 추가/수정/삭제**

```
POST /api/slides/[sessionId]
Body: { type: "slide"|"vote"|"quiz", title: string, content: string, options?: string[], correctAnswer?: number }
Response: Slide

PUT /api/slides/[sessionId]
Body: { id: string, ...슬라이드 필드 }
Response: Slide

DELETE /api/slides/[sessionId]
Body: { id: string }
Response: { success: boolean }
```

**참여자 추가**

```
POST /api/participants/join
Body: { sessionId: string, nickname: string }
Response: { participantId: string }
```

**세션 코드 검증**

```
GET /api/sessions/validate/[code]
Response: { sessionId: string }
```

**투표 제출**

```
POST /api/votes/submit
Body: { slideId: string, participantId: string, optionIndex: number }
Response: Vote
```

**투표 조회**

```
GET /api/votes/[slideId]
Response: Vote[]
```

### Realtime 채널

**session-{sessionId}** 채널을 통해 다음 이벤트를 브로드캐스트합니다:

- `slide:change` - 발표자가 슬라이드를 전환할 때 (`slideIndex` 포함)
- `vote:update` - 새로운 투표가 제출될 때 (Postgres Changes로도 감지됨)

## 테스트 방법

1. **발표자 측**
   - `/creator`에서 "발표 시작" 클릭
   - 세션이 생성되고 고유 코드(예: `AB12CD`) 표시
   - 슬라이드 추가 및 "다음" 버튼으로 전환

2. **참여자 측 (다른 브라우저/탭)**
   - `/join`에서 세션 코드 입력 및 닉네임 설정
   - 발표자의 슬라이드 변환이 실시간으로 동기화됨
   - 투표 슬라이드에서 선택지 클릭 가능

3. **멀티 클라이언트 테스트**
   - 브라우저 4개 (발표자 1개 + 참여자 3개)를 열어서
   - 모든 참여자가 동일한 슬라이드를 보는지 확인
   - 투표 결과가 발표자 화면에 실시간으로 반영되는지 확인

## 트러블슈팅

### ❌ Realtime이 작동하지 않습니다

**증상**: 참여자의 슬라이드가 실시간으로 업데이트되지 않음

**해결 방법**:

1. **Realtime 활성화 확인**

   ```
   Supabase 콘솔 → Realtime 메뉴
   → 필수 테이블 토글 상태 확인 (slides, votes, comments 등)
   → 토글이 ON 상태인지 확인
   ```

2. **WebSocket 연결 확인** (브라우저 DevTools)

   ```
   F12 → Network 탭
   → Filter: "ws:" 또는 "wss:"로 필터
   → supabase WebSocket 연결 확인
   → Status가 "101 Switching Protocols"인지 확인
   ```

3. **콘솔 로그 확인**

   ```javascript
   // 브라우저 콘솔에서 실행
   supabase.channel("session-XXXXX").subscribe((status) => {
     console.log("Channel status:", status); // SUBSCRIBED 상태 확인
   });
   ```

4. **SQL로 활성화 상태 확인**

   ```sql
   -- Supabase SQL Editor에서 실행
   select * from pg_publication_tables
   where pubname = 'supabase_realtime';

   -- 활성화된 테이블 목록이 표시되어야 함
   ```

### ❌ 투표가 저장되지 않습니다

**증상**: `/api/votes/submit` 호출 후 에러 발생

**해결 방법**:

1. **RLS 정책 확인**

   ```
   Supabase 콘솔 → Authentication → Policies
   → votes 테이블 정책 확인
   → "Enable insert access for all users" 정책이 있는지 확인
   ```

2. **응답 상태 코드 확인**

   ```
   브라우저 DevTools → Network 탭
   → `/api/votes/submit` 요청 클릭
   → Response 상태 코드 확인:
      - 400: 필수 필드 누락
      - 403: RLS 정책 위반
      - 500: 서버 에러
   ```

3. **테이블 권한 확인**

   ```sql
   -- SQL Editor에서 실행
   select tablename from pg_tables
   where tablename = 'votes';

   -- 테이블이 존재하고 RLS가 활성화되었는지 확인
   ```

### ❌ 환경 변수를 찾을 수 없습니다

**증상**: `NEXT_PUBLIC_SUPABASE_URL is not defined` 에러

**해결 방법**:

```bash
# 1️⃣ 환경 변수 파일 확인
ls -la .env.local

# 2️⃣ 파일 내용 확인
cat .env.local

# 3️⃣ 정확한 값 확인
echo $NEXT_PUBLIC_SUPABASE_URL

# 4️⃣ 개발 서버 재시작
npm run dev
```

### ❌ 참여자가 다른 슬라이드를 봅니다

**증상**: 발표자와 참여자의 슬라이드가 다름

**해결 방법**:

1. **Broadcast 메시지 확인**

   ```javascript
   // 발표자 콘솔에서 실행
   supabase
     .channel("session-XXXXX")
     .on("broadcast", { event: "*" }, (msg) => {
       console.log("Broadcast received:", msg);
     })
     .subscribe();
   ```

2. **네트워크 연결 확인**
   - 발표자와 참여자가 인터넷에 연결되어 있는지 확인
   - 방화벽/VPN이 WebSocket을 차단하고 있지 않은지 확인

3. **타이밍 이슈**
   - 참여자가 페이지 로드 후 채널을 구독하기 전에 슬라이드가 전환되었을 수 있음
   - 참여자 페이지의 `useEffect` 의존성 배열 확인

### Q: 투표 결과가 실시간으로 업데이트되지 않습니다

**원인**: Postgres Changes 구독이 아직 구현되지 않음 (Phase 3)

**현재 상태**: Phase 2는 Broadcast만 사용 (슬라이드 전환)

**해결**: Phase 3에서 구현 (댓글, 손들기, 투표 실시간 업데이트)

CREATE POLICY "Enable insert access for all users" ON public.hands_up
AS PERMISSIVE FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.hands_up
AS PERMISSIVE FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.wordcloud_items
AS PERMISSIVE FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.wordcloud_items
AS PERMISSIVE FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.quiz_answers
AS PERMISSIVE FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.quiz_answers
AS PERMISSIVE FOR INSERT WITH CHECK (true);

````

## 3단계: API 키 가져오기

1. Supabase 콘솔에서 **Settings** → **API** 로 이동합니다.
2. 다음 정보를 복사합니다:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: (과거에 "만료 불가능한" 키라고 표시됨)

## 4단계: 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음을 입력합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
````

자신의 Supabase 프로젝트 URL과 키로 교체합니다.

## 5단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`을 열어 앱을 테스트합니다.

---

## Realtime 활성화 (선택사항)

Supabase Realtime을 사용하려면:

1. Supabase 콘솔 → **Realtime** 탭으로 이동합니다.
2. 테이블에 대해 Realtime을 활성화합니다 (자동으로 활성화됨).

---

## 배포 (Vercel)

1. 프로젝트를 GitHub에 푸시합니다.
2. https://vercel.com에서 GitHub 저장소를 연결합니다.
3. 환경 변수 설정:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. "Deploy"를 클릭합니다.

---

## 문제 해결

- **500 에러**: `.env.local` 파일이 설정되었는지 확인합니다.
- **Realtime이 작동하지 않음**: 테이블에 대해 Realtime이 활성화되었는지 확인합니다.
- **CORS 에러**: Supabase 프로젝트 설정에서 CORS를 허용하려면 적절한 도메인을 추가합니다.

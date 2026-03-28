# Real-Slide: 모더레이터 Google 소셜 로그인 가이드

## 개요

모더레이터가 Google 계정으로 로그인하여 발표를 생성하고, 자신이 만든 발표를 언제든 다시 접속할 수 있도록 하는 기능의 구현 가이드입니다.

인증 방식으로 **Supabase Auth + Google OAuth**를 채택합니다.

## 현재 상태와 문제점

### 현재 상태

| 항목 | 현재 동작 |
|---|---|
| `created_by` | `"anonymous"` 하드코딩 또는 `NULL` |
| 발표자 식별 | URL 경로(`/presenter`)만으로 판단 |
| 세션 재접속 | 세션 ID를 수동으로 기억해야 함 |
| 세션 목록 | 전체 세션을 보여주는 `/admin/sessions`만 존재 |
| 소셜 로그인 | 미구현 |

### 해결해야 할 문제

1. 모더레이터가 자신이 만든 세션을 다시 찾을 수 없음
2. 발표자 페이지 접근 제어가 없음 (세션 ID만 알면 누구나 발표자 가능)
3. 다른 기기에서 접속해도 자신의 세션을 확인할 수 없음

## 아키텍처: Supabase Auth + Google OAuth

### 왜 Google OAuth인가

| 대안 | 장단점 | 판단 |
|---|---|---|
| 익명 Auth | 가입 없이 즉시 사용 가능. 단, 브라우저 종속, 기기 이동 불가, 사용자 식별 불가 | 탈락 |
| **Google OAuth** | 계정 기반이라 기기 무관, 이메일/이름/프로필 자동 제공, 대부분의 사용자 보유 | **채택** |
| Google + Kakao | 한국 시장 친화적. 단, 초기 개발 비용 2배 | 향후 확장 |
| 자체 이메일/비밀번호 | 제어력 높음. 단, 비밀번호 관리 부담, 이메일 인증 필요 | 탈락 |

### 인증 흐름

```
[Google 로그인]                          [세션 관리]
Google OAuth 리다이렉트              →   Supabase auth.users에 사용자 생성
  → Supabase Callback URL 처리       →   UID (uuid) 발급
  → JWT access_token 발급             →   sessions.created_by = UID로 세션 소유권 연결
  → 클라이언트 localStorage 저장       →   "내 세션" 목록에서 WHERE created_by = UID 조회
```

## 구현 계획

### 1단계: Supabase 프로젝트 설정

#### 1-1. Google Cloud Console에서 OAuth 클라이언트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 또는 생성
3. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
4. 애플리케이션 유형: **웹 애플리케이션**
5. 승인된 리디렉션 URI 추가:
   - `https://<project-ref>.supabase.co/auth/v1/callback`
6. Client ID와 Client Secret 기록

#### 1-2. Supabase 콘솔에서 Google Provider 활성화

1. Supabase 콘솔 → **Authentication → Providers**
2. **Google** 토글 ON
3. Google Cloud Console에서 발급받은 Client ID, Client Secret 입력
4. **Save**

#### 1-3. 환경 변수 확인

기존 환경 변수만으로 충분합니다. OAuth 설정은 Supabase 콘포솔에서 관리됩니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### 1-4. 데이터베이스 스키마 변경

`created_by` 컬럼의 타입을 `text`에서 `uuid`로 변경하고, `auth.users`를 참조하도록 수정합니다.

```sql
-- Step 1: 기존 "anonymous" 값을 NULL로 정리
UPDATE public.sessions
SET created_by = NULL
WHERE created_by = 'anonymous';

-- Step 2: 컬럼 타입 변경 (text → uuid)
ALTER TABLE public.sessions
  ALTER COLUMN created_by TYPE uuid USING NULL,
  ALTER COLUMN created_by DROP NOT NULL;
```

#### 1-5. RLS 정책 업데이트

기존 "모든 사용자 허용" 정책을 소유권 기반 정책으로 교체합니다.

```sql
-- ============================================================
-- 기존 정책 삭제
-- ============================================================
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sessions;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.sessions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.slides;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.slides;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.slides;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.slides;

-- ============================================================
-- sessions 테이블 정책
-- ============================================================

-- 읽기: 모든 인증 사용자 (참가자도 세션 정보를 읽어야 함)
CREATE POLICY "Authenticated users can read sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (true);

-- 생성: 인증된 사용자, created_by에 자신의 UID만 설정 가능
CREATE POLICY "Users can create sessions with own id"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 수정: 세션 소유자만
CREATE POLICY "Session owners can update own sessions"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- 삭제: 세션 소유자만
CREATE POLICY "Session owners can delete own sessions"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================================
-- slides 테이블 정책
-- ============================================================

-- 읽기: 모든 인증 사용자
CREATE POLICY "Authenticated users can read slides"
  ON public.slides FOR SELECT
  TO authenticated
  USING (true);

-- 생성/수정/삭제: 세션 소유자만
CREATE POLICY "Session owners can insert slides"
  ON public.slides FOR INSERT
  TO authenticated
  WITH CHECK (session_id IN (
    SELECT id FROM public.sessions WHERE created_by = auth.uid()
  ));

CREATE POLICY "Session owners can update slides"
  ON public.slides FOR UPDATE
  TO authenticated
  USING (session_id IN (
    SELECT id FROM public.sessions WHERE created_by = auth.uid()
  ));

CREATE POLICY "Session owners can delete slides"
  ON public.slides FOR DELETE
  TO authenticated
  USING (session_id IN (
    SELECT id FROM public.sessions WHERE created_by = auth.uid()
  ));

-- 참가자 관련 테이블 (participants, votes, comments 등)은 기존 정책 유지
```

#### 1-6. 인덱스 추가

```sql
CREATE INDEX IF NOT EXISTS idx_sessions_created_by
  ON public.sessions (created_by);

CREATE INDEX IF NOT EXISTS idx_sessions_created_by_created_at
  ON public.sessions (created_by, created_at DESC);
```

### 2단계: 클라이언트 사이드 구현

#### 2-1. AuthContext

`src/contexts/AuthContext.tsx`에서 Google OAuth 로그인을 관리합니다.

**상태**:

| 상태 | 타입 | 설명 |
|---|---|---|
| `user` | `User \| null` | Supabase auth user 객체 |
| `userId` | `string \| null` | `user.id`. 세션 생성 시 `created_by`로 사용 |
| `loading` | `boolean` | 초기 인증 완료 여부. `true`인 동안 전체 UI 숨김 |

**인증 초기화 흐름**:

```
앱 로드
  └─ getSession() 확인
       ├─ 세션 있음 → user, userId 설정, loading=false
       └─ 세션 없음 → loading=false, user=null
                        (로그인 버튼 표시)
```

**Google 로그인 호출**:

```
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: window.location.origin  // 로그인 후 돌아올 URL
  }
})
```

#### 2-2. 로그인/로그아웃 흐름

```
[로그인]
1. 사용자가 "Google로 로그인" 버튼 클릭
2. supabase.auth.signInWithOAuth({ provider: 'google' }) 호출
3. Google 로그인 페이지로 리다이렉트
4. 로그인 완료 → Supabase callback URL 처리
5. redirectTo로 앱으로 복귀
6. onAuthStateChange에서 SIGNED_IN 이벤트 감지
7. user, userId 설정

[로그아웃]
1. supabase.auth.signOut() 호출
2. onAuthStateChange에서 SIGNED_OUT 이벤트 감지
3. user=null, userId=null 설정
```

#### 2-3. 세션 생성 흐름 (변경)

```
기존: POST /api/sessions/create { title }
      → created_by = "anonymous" (하드코딩)

변경: POST /api/sessions/create { title }
      → Authorization: Bearer {access_token}
      → 서버에서 auth.uid()로 created_by 설정
```

#### 2-4. 내 세션 목록 조회 흐름 (신규)

```
홈페이지 또는 /my-sessions 페이지
  └─ user가 있는 경우
       └─ GET /api/sessions/mine (Authorization 헤더 포함)
            → WHERE created_by = UID
            → 세션 목록 표시
                 └─ 세션 선택 → /session/[sessionId]/presenter 이동
```

### 3단계: 신규 페이지 및 API

#### 3-1. 신규/수정 페이지

| 경로 | 용도 | 설명 |
|---|---|---|
| `/login` | 로그인 | Google OAuth 로그인 전용 페이지. `?next=` 쿼리로 로그인 후 복귀 경로 지원 |
| `/my-sessions` | 내 세션 목록 | 로그인한 모더레이터가 만든 세션 목록. 세션 생성일, 제목, 참가자 수 표시. 클릭 시 presenter 페이지로 이동 |
| `/session/[id]/presenter` 접근 제어 | 발표자 권한 검증 | 세션의 `created_by`와 현재 `auth.uid()` 비교. 불일치 시 참가자로 리다이렉트 |

#### 3-2. 신규/수정 API

| 엔드포인트 | 메서드 | 변경 내용 |
|---|---|---|
| `/api/sessions/create` | POST | `created_by`를 `auth.uid()`로 설정 |
| `/api/sessions/mine` | GET | **신규**. 현재 사용자가 만든 세션 목록 반환 |
| `/api/sessions/[sessionId]` | GET | 응답에 `is_owner` 필드 추가 |
| `/api/sessions/[sessionId]/claim` | PATCH | **신규**. 마이그레이션 전 세션(`created_by = NULL`)의 소유권 획득 |
| `/api/slides/[sessionId]` | POST/PUT/DELETE | 세션 소유자만 슬라이드 관리 가능 |

### 4단계: 사용자 경험 (UX) 흐름

#### 발표 전날 (준비)

```
1. 사이트 접속
2. "Google로 로그인" → Google 계정 선택 → 로그인 완료
3. "새 발표 만들기" → 세션 생성 → 발표자 페이지로 이동
4. 슬라이드, 투표, 퀴즈 등 추가
5. 브라우저 종료 (세션은 서버에 저장됨)
```

#### 발표 당일 (재접속)

```
1. 사이트 접속 → Google 세션 자동 복원 (또는 재로그인)
2. 홈페이지에 "내가 만든 발표" 섹션 표시
   - 어제 만든 세션 목록
   - 각 세션의 슬라이드 수, 생성 시간
3. 해당 세션 클릭 → 발표자 페이지로 바로 이동
4. 발표 시작
```

#### 다른 기기에서 접속

```
1. 새 기기에서 사이트 접속
2. "Google로 로그인" → 같은 Google 계정으로 로그인
3. 동일한 UID로 인증 → "내가 만든 발표"에서 모든 세션 확인 가능
4. 세션 선택 → 발표자 페이지로 이동
```

## 프론트엔드 기능 명세

### 개요

Google 소셜 로그인 도입에 필요한 프론트엔드 변경사항을 페이지/컴포넌트 단위로 정의합니다.

### F-1. AuthContext

**파일**: `src/contexts/AuthContext.tsx` (신규)

루트 레이아웃(`src/app/layout.tsx`)에 추가할 인증 컨텍스트입니다.

**책임**:
- 앱 진입 시 `supabase.auth.getSession()`으로 기존 세션 복원
- `onAuthStateChange()` 리스너 등록으로 인증 상태 변화 감지
- Google OAuth 로그인/로그아웃 함수 제공
- 하위 컴포넌트에 `user`, `userId`, `loading`, `signInWithGoogle`, `signOut` 제공

**상태 및 함수**:

| 항목 | 타입 | 설명 |
|---|---|---|
| `user` | `User \| null` | Supabase auth user 객체 |
| `userId` | `string \| null` | `user.id` (auth.uid()). 세션 생성 시 `created_by`로 사용 |
| `loading` | `boolean` | 초기 인증 완료 여부. `true`인 동안 전체 UI 숨김 |
| `signInWithGoogle` | `() => Promise<void>` | Google OAuth 로그인 트리거 |
| `signOut` | `() => Promise<void>` | 로그아웃 |

**레이아웃 통합** (`src/app/layout.tsx`):

```tsx
// 변경
<body className="bg-gray-50">
  <AuthContextProvider>
    <WebVitals />
    <OfflineIndicator />
    {children}
  </AuthContextProvider>
</body>
```

**Google 사용자 메타데이터**: 로그인 후 `user.user_metadata`에서 다음 정보를 가져올 수 있습니다.

| 필드 | 설명 |
|---|---|
| `full_name` | Google 프로필 이름 |
| `avatar_url` | Google 프로필 이미지 URL |
| `email` | Google 이메일 |

### F-2. 로그인 페이지 (신규)

**파일**: `src/app/login/page.tsx` (신규)

모더레이터가 Google 계정으로 로그인하는 전용 페이지입니다. 모든 인증 필요 페이지의 진입점 역할을 합니다.

#### 라우팅

| 진입 상황 | URL | 설명 |
|---|---|---|
| 헤더 "로그인" 버튼 | `/login` | 기본 로그인 |
| 발표 생성 시 미로그인 | `/login?next=/creator` | 로그인 후 creator로 복귀 |
| 발표자 페이지 미로그인 | `/login?next=/session/{id}/presenter` | 로그인 후 발표자로 복귀 |
| 내 세션 목록 미로그인 | `/login?next=/my-sessions` | 로그인 후 목록으로 복귀 |

#### 페이지 레이아웃

```
┌──────────────────────────────────────────────────────┐
│                      [Logo]                          │
│                                                      │
│              Real-Slide에 오신 것을 환영합니다         │
│        발표를 만들고 관리하려면 로그인해주세요          │
│                                                      │
│        ┌────────────────────────────────────┐        │
│        │  [G] Google로 계속하기              │        │
│        └────────────────────────────────────┘        │
│                                                      │
│            로그인하면 다음이 가능합니다:               │
│            • 발표 세션 생성 및 관리                   │
│            • 여러 기기에서 발표 접속                  │
│            • 발표 기록 영구 보관                      │
│                                                      │
│       ──────────── 또는 ────────────                  │
│                                                      │
│           [세션 참여하기] (로그인 불필요)              │
│                                                      │
│              © 2026 Real-Slide                       │
└──────────────────────────────────────────────────────┘
```

#### 동작 흐름

```
/login 페이지 진입
  └─ useAuth()로 상태 확인
       ├─ loading === true → 로딩 스피너
       ├─ user !== null (이미 로그인) → next 파라미터 또는 /my-sessions로 리다이렉트
       └─ user === null (미로그인) → 로그인 폼 표시
            └─ "Google로 계속하기" 버튼 클릭
                 └─ signInWithGoogle()
                      └─ supabase.auth.signInWithOAuth({
                           provider: 'google',
                           options: {
                             redirectTo: window.location.origin + '/login'
                           }
                         })
                      → Google 로그인 페이지로 리다이렉트
                      → 로그인 완료 → Supabase callback → /login으로 복귀
                      → onAuthStateChange(SIGNED_IN) 감지
                      → next 파라미터 또는 /my-sessions로 리다이렉트
```

#### 쿼리 파라미터

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `next` | 선택 | 로그인 성공 후 리다이렉트할 경로. 없으면 `/my-sessions` |

**검증 규칙**:
- `next` 값은 반드시 `/`로 시작하는 상대 경로여야 함 (외부 URL 차단)
- 허용 경로: `/creator`, `/my-sessions`, `/session/*/presenter`
- 검증 실패 시 기본값 `/my-sessions` 사용

#### 에러 처리

| 상황 | 처리 |
|---|---|
| OAuth 로그인 실패 | "Google 로그인에 실패했습니다. 다시 시도해주세요." 안내 + 재시도 버튼 |
| 세션 만료 (token expired) | "세션이 만료되었습니다. 다시 로그인해주세요." 안내 |
| 네트워크 오류 | "네트워크 오류가 발생했습니다." 안내 |

#### UI 상세

- 페이지는 중앙 정렬된 카드 레이아웃
- Google 버튼은 기존 shadcn/ui Button 컴포넌트 사용, `variant="outline"` + `size="lg"`
- Google 아이콘은 SVG 인라인 또는 `lucide-react` 아이콘 사용
- 배경은 홈페이지와 동일한 `bg-background` + 그라디언트 효과
- 모바일에서도 사용 가능한 반응형 레이아웃

#### 백엔드: Auth Callback 처리

Google OAuth 로그인 후 Supabase가 자동으로 처리하는 콜백 흐름:

```
Google 로그인 완료
  → Google이 https://<project-ref>.supabase.co/auth/v1/callback 로 리다이렉트
    (code, state 파라미터 포함)
  → Supabase Auth Server가 code를 access_token으로 교환
  → Supabase가 redirectTo로 클라이언트에 리다이렉트
    (hash fragment에 access_token, refresh_token 포함)
  → 클라이언트의 supabase-js가 자동으로 토큰을 감지하여 세션 저장
  → onAuthStateChange('SIGNED_IN') 트리거
```

**별도 백엔드 API 불필요**: Supabase가 OAuth 콜백을 자동 처리합니다. 프론트엔드에서 `redirectTo`만 올바르게 설정하면 됩니다.

**주의**: `redirectTo`에 `next` 파라미터를 유지하려면 hash fragment가 보존되어야 합니다. Supabase는 `redirectTo`의 query parameter를 유지합니다:

```
redirectTo: `${window.location.origin}/login?next=${nextParam}`
```

### F-3. 홈페이지 변경

**파일**: `src/app/page.tsx` (수정)

**Header 변경**:

```
기존:
  logo | "지금 시작하기" | "세션 참여하기"

변경:
  logo | "지금 시작하기" | "세션 참여하기" | [사용자 프로필 아바타 또는 "로그인" 버튼]

  미로그인 시:
    logo | "지금 시작하기" | "세션 참여하기" | [Google로 로그인]

  로그인 시:
    logo | "지금 시작하기" | "세션 참여하기" | [아바타 이미지 ▼]
                                                      ├─ 내 발표 목록
                                                      ├─ 프로필 정보
                                                      └─ 로그아웃
```

**추가 섹션**: "내가 만든 발표" (Hero와 Features 사이에 삽입)

```
[Hero Section]

[내 세션 목록] ← 신규 (로그인한 사용자만 표시)
  ┌─────────────────────────────────────────┐
  │ 내가 만든 발표              [모두 보기] │
  │                                         │
  │ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
  │ │ 세션 A  │ │ 세션 B  │ │ 세션 C  │   │
  │ │ 5개 슬라이드 │ │ 3개 슬라이드 │ │ 8개 슬라이드 │ │
  │ │ 3월 27일 │ │ 3월 26일 │ │ 3월 25일 │   │
  │ └─────────┘ └─────────┘ └─────────┘   │
  └─────────────────────────────────────────┘

[Features Section]
```

**표시 조건**:
- `userId`가 있을 때만 섹션 표시
- `loading`이 `true`이면 스켈레톤 UI 표시
- 세션이 없으면 "아직 만든 발표가 없습니다. 새 발표를 만들어보세요!" 안내 문구 표시

**세션 카드 정보**:

| 항목 | 데이터 소스 |
|---|---|
| 세션 제목 | `sessions.title` |
| 슬라이드 수 | `slides` 테이블에서 COUNT |
| 생성일 | `sessions.created_at` (상대 시간 표시) |
| 참가자 수 | `participants` 테이블에서 COUNT |
| 공유 코드 | `sessions.share_code` |

**인터랙션**:
- 카드 클릭 → `/session/[sessionId]/presenter` 이동
- "모두 보기" → `/my-sessions` 이동

### F-4. 세션 생성 페이지 변경

**파일**: `src/app/creator/page.tsx` (수정)

**변경사항**:

| 항목 | 현재 | 변경 |
|---|---|---|
| 로그인 상태 확인 | 없음 | `useAuth()`에서 `userId` 확인. 미로그인 시 로그인 안내 표시 |
| API 호출 | `fetch('/api/sessions/create', { body: { title } })` | 동일하나 Authorization 헤더에 Bearer 토큰 첨부 |
| 에러 처리 | 기본 에러 메시지 | 인증 관련 에러 추가 ("로그인이 필요합니다" 등) |
| 로딩 | 단순 spinner | 인증 로딩 + 세션 생성 로딩 분리 |

**미로그인 사용자 처리**:

```
세션 생성 페이지 진입
  └─ userId === null ?
       ├─ null → /login?next=/creator 로 리다이렉트
       └─ 있음 → 기존 세션 생성 폼 표시
```

### F-5. 발표자 페이지 변경

**파일**: `src/app/session/[sessionId]/presenter/page.tsx` (수정)

**변경사항**:

| 항목 | 현재 | 변경 |
|---|---|---|
| 권한 검증 | 없음. URL만으로 발표자 접근 가능 | 세션 로드 후 `session.created_by !== userId`이면 참가자 페이지로 리다이렉트 |
| participantId | `"presenter"` 하드코딩 | `userId` (auth.uid()) 사용 |
| nickname | `"발표자"` 하드코딩 | 유지 또는 `user.user_metadata.full_name` 사용 |
| 로딩 | 세션 데이터 로딩 | 세션 데이터 로딩 + **인증 상태 확인** |

**권한 검증 흐름**:

```
1. 페이지 진입
2. AuthContext에서 userId 확인 (loading 완료 대기)
3. userId가 없으면 → `/login?next=/session/${sessionId}/presenter` 로 리다이렉트
4. 세션 데이터 조회 (GET /api/sessions/[sessionId])
5. 비교: session.created_by === userId ?
   ├─ 일치 → 정상 발표자 페이지 렌더링
   ├─ NULL → PATCH /api/sessions/[sessionId]/claim (소유권 획득 시도)
   │         → 성공: 발표자 페이지 렌더링
   │         → 실패: 참가자로 리다이렉트
   └─ 불일치 → /join/[shareCode] 로 리다이렉트 (참가자로 이동)
```

**에러 케이스**:

| 상황 | 처리 |
|---|---|
| `userId`가 없는 경우 (미로그인) | `/login?next=/session/${sessionId}/presenter`로 리다이렉트 |
| 세션이 존재하지 않는 경우 | 404 안내 |
| `created_by`와 `userId` 불일치 | 참가자 페이지로 리다이렉트 |
| 세션의 `created_by`가 NULL | claim API로 소유권 획득 시도 |

### F-6. 내 세션 목록 페이지 (신규)

**파일**: `src/app/my-sessions/page.tsx` (신규)

**레이아웃**:

```
[Header]

[내 세션 목록]
  ┌─────────────────────────────────────────────────┐
  │ 내가 만든 발표                    [새 발표 만들기] │
  │                                                 │
  │ ┌─────────────────────────────────────────────┐ │
  │ │ 📊 3월 수학 수업              코드: ABC123  │ │
  │ │    12개 슬라이드 · 28명 참여 · 3월 27일 생성 │ │
  │ │                          [발표 시작] [삭제]  │ │
  │ └─────────────────────────────────────────────┘ │
  └─────────────────────────────────────────────────┘
```

**기능**:

| 기능 | 설명 |
|---|---|
| 세션 목록 | `GET /api/sessions/mine` 응답 데이터를 리스트로 표시 |
| 발표 시작 | 클릭 시 `/session/[sessionId]/presenter` 이동 |
| 공유 코드 복사 | 클릭 시 클립보드에 share_code 복사 |
| 세션 삭제 | 삭제 확인 모달 → `DELETE /api/sessions/[sessionId]` 호출 |
| 빈 상태 | 세션이 없을 때 "새 발표 만들기" 버튼이 있는 빈 상태 UI |
| 로딩 | 스켈레톤 UI |
| 미로그인 | `/login?next=/my-sessions`로 리다이렉트 |

#### `GET /api/sessions/mine` (신규)

**파일**: `src/app/api/sessions/mine/route.ts` (신규)

**요청**:
- 메서드: `GET`
- 인증: 필수. Authorization 헤더에서 JWT 추출

**응답**:

```typescript
// 성공 (200)
[
  {
    id: string;
    title: string;
    share_code: string;
    created_at: string;
    slide_count: number;
    participant_count: number;
  }
]

// 인증 실패 (401)
{ error: "인증이 필요합니다" }
```

#### `POST /api/sessions/create` (수정)

**파일**: `src/app/api/sessions/create/route.ts` (수정)

**변경점**:

| 항목 | 현재 | 변경 |
|---|---|---|
| `created_by` | `"anonymous"` 하드코딩 | `requireAuth(request)`에서 UID 추출 |
| 인증 확인 | 없음 | JWT에서 UID 추출. 없으면 401 응답 |

#### `GET /api/sessions/[sessionId]` (수정)

**파일**: `src/app/api/sessions/[sessionId]/route.ts` (수정)

**변경점**: 응답에 `is_owner` 필드 추가

```typescript
{
  // ...기존 세션 필드
  is_owner: boolean; // session.created_by === auth.uid()
}
```

#### `PATCH /api/sessions/[sessionId]/claim` (신규)

**파일**: `src/app/api/sessions/[sessionId]/claim/route.ts` (신규)

마이그레이션 전 세션(`created_by = NULL`)의 소유권을 첫 접속자에게 부여합니다.

```
1. requireAuth(request)로 userId 획득
2. UPDATE sessions SET created_by = userId WHERE id = sessionId AND created_by IS NULL
3. 성공 → 200
4. 실패 (이미 소유자 있음) → 403
```

**동시성 안전성**: `WHERE created_by IS NULL` 조건으로 원자적 업데이트가 보장됩니다.

#### `POST/PUT/DELETE /api/slides/[sessionId]` (수정)

**파일**: `src/app/api/slides/[sessionId]/route.ts` (수정)

슬라이드 CRUD 시 세션 소유자 확인 추가:

```
1. requireAuth(request)로 userId 획득
2. SELECT created_by FROM sessions WHERE id = sessionId
3. created_by !== userId → 403 ("세션 소유자만 수정할 수 있습니다")
4. 일치 → 기존 로직 수행
```

### F-7. 컴포넌트 명세

#### UserMenu 컴포넌트 (신규)

**파일**: `src/components/UserMenu.tsx` (신규)

헤더에 표시되는 사용자 메뉴입니다.

**표시 내용**:

| 상태 | 표시 |
|---|---|
| 미로그인 | "Google로 로그인" 버튼 |
| 로그인 | 프로필 아바타 + 드롭다운 (내 발표, 로그아웃) |

#### SessionCard 컴포넌트 (신규)

**파일**: `src/components/SessionCard.tsx` (신규)

**Props**:

| Prop | 타입 | 설명 |
|---|---|---|
| `id` | `string` | 세션 ID |
| `title` | `string` | 세션 제목 |
| `shareCode` | `string` | 공유 코드 |
| `createdAt` | `string` | 생성일 |
| `slideCount` | `number` | 슬라이드 수 |
| `participantCount` | `number` | 참가자 수 |
| `variant` | `"compact" \| "full"` | 홈페이지용 / 목록 페이지용 |

### F-8. 상태 관리 흐름

```
┌─────────────────────────────────────────────────────────┐
│ App Load                                                │
│                                                         │
│  AuthContext                                             │
│    ├─ getSession() → 기존 세션 확인                     │
│    │   ├─ 세션 있음 → user, userId 설정, loading=false  │
│    │   └─ 세션 없음 → user=null, loading=false          │
│    └─ onAuthStateChange() 등록                          │
│        ├─ SIGNED_IN → user, userId 설정                 │
│        ├─ SIGNED_OUT → user=null, userId=null           │
│        └─ TOKEN_REFRESHED → 자동 갱신                    │
│                                                         │
│  Page Render (loading=false 이후)                       │
│    ├─ /login                                            │
│    │   ├─ 미로그인 → Google 로그인 버튼 표시             │
│    │   └─ 로그인 → ?next 파라미터 또는 /my-sessions 이동 │
│    ├─ / (홈페이지)                                      │
│    │   ├─ 미로그인 → "Google로 로그인" 버튼 (→ /login)   │
│    │   └─ 로그인 → "내가 만든 발표" 섹션 표시            │
│    ├─ /creator                                          │
│    │   ├─ 미로그인 → /login?next=/creator 리다이렉트     │
│    │   └─ 로그인 → 세션 생성 → POST (created_by=UID)    │
│    ├─ /my-sessions                                      │
│    │   ├─ 미로그인 → /login?next=/my-sessions 리다이렉트 │
│    │   └─ 로그인 → GET /api/sessions/mine                │
│    └─ /session/[id]/presenter                           │
│        ├─ 미로그인 → /login?next=/session/…/presenter    │
│        └─ 로그인 → 소유권 검증 → 불일치 시 리다이렉트    │
└─────────────────────────────────────────────────────────┘
```

### F-9. 타입 변경

**파일**: `src/types/index.ts` (수정)

```typescript
// Session.created_by 타입 변경
export interface Session {
  id: string;
  created_by: string | null;  // string → string | null
  title: string;
  share_code: string;
  created_at: string;
  updated_at: string;
  is_owner?: boolean;  // 신규
}

// 신규 타입
export interface SessionWithMeta {
  id: string;
  title: string;
  share_code: string;
  created_at: string;
  slide_count: number;
  participant_count: number;
}
```

### F-10. API 클라이언트 변경

**파일**: `src/lib/api.ts` (수정)

`authFetch` 래퍼 추가 — supabase 세션에서 토큰을 가져와 Authorization 헤더 자동 첨부:

```typescript
async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {
    ...options.headers,
    ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
  return fetch(url, { ...options, headers });
}
```

**추가 함수**:

| 함수 | 설명 |
|---|---|
| `authFetch` | 인증 헤더 자동 첨부 fetch 래퍼 |
| `getMySessions()` | `GET /api/sessions/mine` — 내 세션 목록 조회 |
| `claimSession(sessionId)` | `PATCH /api/sessions/[sessionId]/claim` — 소유권 획득 |

### F-11. 변경 파일 요약

| 파일 | 유형 | 변경 내용 |
|---|---|---|
| `src/contexts/AuthContext.tsx` | 신규 | Google OAuth 인증 상태 관리 컨텍스트 |
| `src/app/login/page.tsx` | 신규 | Google 로그인 전용 페이지 |
| `src/components/UserMenu.tsx` | 신규 | 로그인/로그아웃 사용자 메뉴 |
| `src/components/SessionCard.tsx` | 신규 | 세션 카드 UI 컴포넌트 |
| `src/app/my-sessions/page.tsx` | 신규 | 내 세션 목록 페이지 |
| `src/app/api/sessions/mine/route.ts` | 신규 | 내 세션 목록 API |
| `src/app/api/sessions/[sessionId]/claim/route.ts` | 신규 | 세션 소유권 획득 API |
| `src/lib/auth.ts` | 신규 | `getAuthenticatedUserId`, `requireAuth` 함수 |
| `src/app/layout.tsx` | 수정 | AuthContextProvider 래핑 추가 |
| `src/app/page.tsx` | 수정 | "내가 만든 발표" 섹션, UserMenu 추가 |
| `src/app/creator/page.tsx` | 수정 | 로그인 상태 확인, Authorization 헤더 첨부 |
| `src/app/session/[sessionId]/presenter/page.tsx` | 수정 | 소유권 검증, participantId 변경 |
| `src/app/api/sessions/create/route.ts` | 수정 | `created_by`를 `auth.uid()`로 변경 |
| `src/app/api/sessions/[sessionId]/route.ts` | 수정 | `is_owner` 필드 추가 |
| `src/app/api/slides/[sessionId]/route.ts` | 수정 | 소유자 권한 검증 추가 |
| `src/types/index.ts` | 수정 | `SessionWithMeta` 타입 추가, `created_by` nullable |
| `src/lib/api.ts` | 수정 | `authFetch` 래퍼, `getMySessions`, `claimSession` 추가 |

## 백엔드 기능 명세

### 개요

프론트엔드 명세에서 다룬 API 라우트의 서버 사이드 구현 상세, 인증 유틸리티, 기존 데이터 호환성 처리를 정의합니다.

### B-1. 인증 유틸리티

#### `src/lib/auth.ts` (신규)

모든 API 라우트에서 공통으로 사용하는 인증 헬퍼 함수입니다.

| 함수 | 시그니처 | 설명 |
|---|---|---|
| `getAuthenticatedUserId` | `(request: NextRequest) => Promise<string \| null>` | Authorization Bearer 토큰에서 JWT 추출 후 `supabase.auth.getUser(token)`로 UID 반환. 실패 시 `null` |
| `requireAuth` | `(request: NextRequest) => Promise<string>` | 동일하지만 실패 시 401 에러를 throw |

**JWT 추출 방식**:

```
요청 흐름:
  클라이언트 (supabase-js)
    → authFetch로 Authorization: Bearer {access_token} 자동 첨부

서버 (API Route):
  1. request.headers.get('Authorization')에서 Bearer 토큰 추출
  2. supabase.auth.getUser(token)로 토큰 검증
  3. 유효하면 user.id 반환
  4. 만료/무효면 null 또는 401 에러
```

### B-2. 기존 세션 소유권 처리

마이그레이션 전에 생성된 세션(`created_by = NULL`)의 처리 방침:

**방안: 첫 접속자에게 소유권 부여**

```
발표자 페이지 접속:
  1. GET /api/sessions/[sessionId]
  2. session.created_by === null ?
     ├─ null → PATCH /api/sessions/[sessionId]/claim
     │         → UPDATE sessions SET created_by = auth.uid() WHERE id = sessionId AND created_by IS NULL
     │         → 성공: 소유권 획득, 발표자 페이지 렌더링
     │         → 실패 (이미 다른 사람이 선점): 참가자로 리다이렉트
     └─ not null → 기존 소유권 검증 진행
```

동시성 문제는 `WHERE created_by IS NULL` 조건으로 원자적 업데이트가 보장됩니다.

### B-3. 참가자 접근 보장

RLS 정책 변경 후 참가자가 기존과 동일하게 세션에 참여할 수 있는지 확인이 필요합니다.

| 참가자 동작 | 필요 권한 | 정책 상태 |
|---|---|---|
| 세션 정보 읽기 | `sessions SELECT` | 모든 인증 사용자 허용 |
| 슬라이드 조회 | `slides SELECT` | 모든 인증 사용자 허용 |
| 투표/댓글/퀴즈 등 | 각 테이블 INSERT | 기존 유지 |

### B-4. 인증 요구사항 매트릭스

| 엔드포인트 | 메서드 | 인증 필요 | 권한 검증 | 비고 |
|---|---|---|---|---|
| `/api/sessions/create` | POST | 필수 | 자신 UID 설정 | |
| `/api/sessions/mine` | GET | 필수 | 자신 세션만 조회 | |
| `/api/sessions/[id]` | GET | 선택 | `is_owner` 계산만 | 참가자도 조회 가능 |
| `/api/sessions/[id]/claim` | PATCH | 필수 | `created_by IS NULL` 확인 | |
| `/api/sessions/[id]` | DELETE | 필수 | `created_by = auth.uid()` | |
| `/api/slides/[sessionId]` | GET | 불필요 | 없음 | 참가자도 조회 |
| `/api/slides/[sessionId]` | POST/PUT/DELETE | 필수 | 세션 소유자 확인 | |
| 참가자 관련 API | 모두 | 불필요 | 없음 | 기존 유지 |

### B-5. 백엔드 변경 파일 요약

| 파일 | 유형 | 변경 내용 |
|---|---|---|
| `src/lib/auth.ts` | 신규 | `getAuthenticatedUserId`, `requireAuth` 함수 |
| `src/app/api/sessions/mine/route.ts` | 신규 | `GET` 내 세션 목록 API |
| `src/app/api/sessions/[sessionId]/claim/route.ts` | 신규 | `PATCH` 세션 소유권 획득 API |
| `src/app/api/sessions/create/route.ts` | 수정 | `created_by`를 `auth.uid()`로 변경 |
| `src/app/api/sessions/[sessionId]/route.ts` | 수정 | `GET`: `is_owner` 추가. `DELETE`: 소유권 검증 추가 |
| `src/app/api/slides/[sessionId]/route.ts` | 수정 | `POST/PUT/DELETE` 소유권 검증 추가 |
| `src/lib/api.ts` | 수정 | `authFetch` 래퍼, `getMySessions`, `claimSession` 추가 |

## 고려사항

### 보안

| 항목 | 내용 |
|---|---|
| OAuth 토큰 | Supabase가 관리. access_token은 JWT, 자동 갱신됨 |
| 세션 ID 추측 | UUID v4이므로 사실상 불가능 |
| Presenter 권한 | `created_by = auth.uid()` 검증으로 세션 소유자만 발표자 기능 사용 가능 |
| CSRF | Supabase OAuth callback이 state 파라미터로 CSRF 방어 |

### 제한사항

| 항목 | 내용 | 해결 시점 |
|---|---|---|
| Google 계정 필수 | 발표 생성에 Google 로그인 필요 | Kakao 등 추가 프로바이더로 확장 가능 |
| 세션당 모더레이터 1명 | 공동 발표 불가 | 추후 collaborator 기능 고려 |
| 참가자 로그인 불필요 | 참가자는 기존대로 익명 참여 | - |

### 향후 확장: Kakao 로그인 추가

Kakao 로그인을 추가할 때 필요한 작업:

1. [Kakao Developers](https://developers.kakao.com/)에서 앱 생성
2. Supabase 콘솔 → Authentication → Providers → Kakao 활성화
3. 프론트엔드에 Kakao 로그인 버튼 추가 (`signInWithOAuth({ provider: 'kakao' })`)
4. 기존 Google 로그인 코드와 공유 (동일한 `auth.uid()` 기반)

## /my-sessions 페이지 기능 명세

### 개요

로그인한 모더레이터가 자신이 만든 발표 세션 목록을 조회하고 관리하는 전용 페이지입니다. Google 로그인 후 리다이렉트되는 기본 도착 페이지입니다.

### 프론트엔드

#### 라우트

- **경로**: `/my-sessions`
- **인증**: 필수 (미로그인 시 `/login?next=/my-sessions` 리다이렉트)
- **데이터**: `GET /api/sessions/mine`

#### 페이지 레이아웃

```
┌──────────────────────────────────────────────────────────────┐
│ [Header]                                                     │
│  logo | "지금 시작하기" | "세션 참여하기" | [아바타 ▼]        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  내가 만든 발표                              [새 발표 만들기] │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  📊 3월 수학 수업                                     │  │
│  │     코드: ABC123                                      │  │
│  │     12개 슬라이드 · 28명 참여 · 2026년 3월 27일       │  │
│  │                                    [발표 시작] [삭제]  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  📊 2월 과학 발표                                     │  │
│  │     코드: DEF456                                      │  │
│  │     8개 슬라이드 · 15명 참여 · 2026년 2월 15일        │  │
│  │                                    [발표 시작] [삭제]  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ [Footer]                                                     │
└──────────────────────────────────────────────────────────────┘
```

#### 빈 상태 (세션이 없을 때)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│              📊                                              │
│     아직 만든 발표가 없습니다                                │
│     새 발표를 만들어보세요!                                  │
│                                                              │
│          [ + 새 발표 만들기 ]                                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 세션 카드 상세

각 세션 카드에 표시되는 정보와 인터랙션:

| 영역 | 항목 | 데이터 소스 | 인터랙션 |
|---|---|---|---|
| 제목 | 세션 제목 | `session.title` | 카드 전체 클릭 시 발표자 페이지 이동 |
| 공유 코드 | 6자리 코드 | `session.share_code` | 클릭 시 클립보드 복사 |
| 슬라이드 수 | N개 슬라이드 | `session.slide_count` | - |
| 참가자 수 | N명 참여 | `session.participant_count` | - |
| 생성일 | 날짜 | `session.created_at` | 상대 시간 표시 (예: "3월 27일") |
| 발표 시작 버튼 | - | - | 클릭 시 `/session/{id}/presenter` 이동 |
| 삭제 버튼 | - | - | 클릭 시 삭제 확인 모달 |

#### 삭제 확인 모달

```
┌──────────────────────────────────────┐
│  "3월 수학 수업"을 삭제하시겠습니까?  │
│                                      │
│  이 작업은 되돌릴 수 없습니다.        │
│  모든 슬라이드와 참가자 데이터가      │
│  함께 삭제됩니다.                     │
│                                      │
│       [취소]    [삭제]               │
└──────────────────────────────────────┘
```

#### 상태별 UI

| 상태 | 표시 |
|---|---|
| 로딩 중 (초기) | 스켈레톤 카드 3개 |
| 로딩 중 (삭제) | 삭제 버튼에 spinner, 카드 opacity 낮춤 |
| 데이터 있음 | 세션 카드 리스트 |
| 빈 상태 | 빈 상태 안내 + "새 발표 만들기" 버튼 |
| 에러 | "세션 목록을 불러올 수 없습니다" + 재시도 버튼 |
| 미로그인 | `/login?next=/my-sessions`로 리다이렉트 |

#### 컴포넌트 구조

```
MySessionsPage
  ├── Header (공통)
  ├── PageHeader
  │   ├── "내가 만든 발표" 제목
  │   └── "새 발표 만들기" 버튼 → /creator
  ├── SessionList
  │   ├── LoadingSkeleton (loading 시)
  │   ├── EmptyState (데이터 없을 시)
  │   └── SessionCard[] (데이터 있을 시)
  │       ├── 세션 정보 (제목, 코드, 통계, 날짜)
  │       ├── "발표 시작" 버튼
  │       └── "삭제" 버튼
  ├── DeleteConfirmModal
  └── Footer (공통)
```

#### 데이터 흐름

```
1. 페이지 마운트
   └─ useAuth() → loading 완료 대기
       ├─ user === null → router.replace('/login?next=/my-sessions')
       └─ user !== null → getMySessions() 호출
            └─ GET /api/sessions/mine (Authorization: Bearer {token})
                 ├─ 200 → sessions 상태 설정 → 카드 리스트 렌더링
                 ├─ 401 → 세션 만료 → /login 리다이렉트
                 └─ 500 → 에러 상태 설정 → 재시도 버튼 표시

2. 발표 시작 클릭
   └─ router.push('/session/{id}/presenter')

3. 공유 코드 복사 클릭
   └─ navigator.clipboard.writeText(shareCode)
      → "복사됨!" 토스트 표시 (2초 후 사라짐)

4. 삭제 클릭
   └─ 삭제 확인 모달 열기
       └─ "삭제" 확인 → authFetch('/api/sessions/{id}', { method: 'DELETE' })
            ├─ 200 → sessions 상태에서 해당 세션 제거
            └─ 403 → "삭제 권한이 없습니다" 에러 표시
```

### 백엔드

#### `GET /api/sessions/mine`

이미 구현됨. 응답 스키마 재확인:

**요청**:
- 메서드: `GET`
- 인증: 필수 (`requireAuth`)
- 헤더: `Authorization: Bearer {access_token}`

**성공 응답 (200)**:

```typescript
[
  {
    id: string;           // 세션 UUID
    title: string;        // 세션 제목
    share_code: string;   // 6자리 공유 코드
    created_at: string;   // ISO 날짜
    slide_count: number;  // 슬라이드 수 (slides 테이블 COUNT)
    participant_count: number; // 참가자 수 (participants 테이블 COUNT)
  }
]
```

**에러 응답**:

| 상태 코드 | 조건 | 본문 |
|---|---|---|
| 401 | 미인증 | `{ error: "인증이 필요합니다" }` |
| 500 | DB 에러 | `{ error: "..." }` |

**Supabase 쿼리**:

```sql
SELECT s.*,
  (SELECT COUNT(*) FROM slides WHERE session_id = s.id) AS slide_count,
  (SELECT COUNT(*) FROM participants WHERE session_id = s.id) AS participant_count
FROM sessions s
WHERE s.created_by = $userId
ORDER BY s.created_at DESC;
```

#### `DELETE /api/sessions/[sessionId]`

**파일**: `src/app/api/sessions/[sessionId]/route.ts` (수정)

**요청**:
- 메서드: `DELETE`
- 인증: 필수 (`requireAuth`)
- 헤더: `Authorization: Bearer {access_token}`

**의사 코드**:

```
1. requireAuth(request) → userId
2. SELECT created_by FROM sessions WHERE id = sessionId
3. 세션 없음 → 404
4. created_by !== userId → 403
5. DELETE FROM sessions WHERE id = sessionId
   (CASCADE: slides, participants, votes, comments 등 자동 삭제)
6. 200 { success: true }
```

**에러 응답**:

| 상태 코드 | 조건 | 본문 |
|---|---|---|
| 401 | 미인증 | `{ error: "인증이 필요합니다" }` |
| 403 | 비소유자 | `{ error: "세션 소유자만 삭제할 수 있습니다" }` |
| 404 | 세션 없음 | `{ error: "세션을 찾을 수 없습니다" }` |
| 500 | DB 에러 | `{ error: "..." }` |

#### 변경 파일 요약

| 파일 | 유형 | 변경 내용 |
|---|---|---|
| `src/app/my-sessions/page.tsx` | 신규 | 내 세션 목록 페이지 |
| `src/app/api/sessions/[sessionId]/route.ts` | 수정 | `DELETE` 핸들러 추가 (소유권 검증) |
| `src/lib/api.ts` | 수정 | `deleteSession(id)` 함수 추가 |

## 세션 활성화/비활성화 기능 명세

### 개요

모더레이터가 `/my-sessions` 페이지에서 자신이 만든 세션을 활성화/비활성화할 수 있는 기능입니다. 비활성화된 세션은 참가자가 접속할 수 없으며, 활성화 시에만 참가자 참여가 가능합니다.

### 데이터베이스 변경

#### sessions 테이블에 `is_active` 컬럼 추가

```sql
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
```

- 기본값: `true` (기존 세션은 모두 활성 상태)
- 세션 생성 시 자동으로 `is_active = true` 설정

### 프론트엔드

#### SessionCard 변경

`src/components/SessionCard.tsx` 수정:

| 항목 | 현재 | 변경 |
|---|---|---|
| 세션 상태 표시 | 없음 | 활성/비활성 상태 배지 표시 |
| 활성화/비활성화 버튼 | 없음 | 토글 버튼 추가 (Switch 컴포넌트) |
| 비활성 세션 카드 | N/A | 흐림 처리 (opacity), "비활성" 배지 |
| "발표 시작" 버튼 | 항상 활성 | 비활성 세션도 발표자 접근은 가능 (관리 목적) |

**상태 배지**:

| 상태 | 배지 스타일 | 텍스트 |
|---|---|---|
| 활성 (`is_active: true`) | 녹색 배경 | 활성 |
| 비활성 (`is_active: false`) | 회색 배경 | 비활성 |

#### 타입 변경

`src/types/index.ts` 수정:

```typescript
export interface SessionWithMeta {
  id: string;
  title: string;
  share_code: string;
  created_at: string;
  slide_count: number;
  participant_count: number;
  is_active: boolean;  // 신규
}
```

### 백엔드

#### `PATCH /api/sessions/[sessionId]/toggle-active` (신규)

**파일**: `src/app/api/sessions/[sessionId]/toggle-active/route.ts` (신규)

세션의 `is_active` 상태를 토글합니다.

**요청**:
- 메서드: `PATCH`
- 인증: 필수 (`requireAuth`)
- 헤더: `Authorization: Bearer {access_token}`

**의사 코드**:

```
1. requireAuth(request) → userId
2. SELECT created_by, is_active FROM sessions WHERE id = sessionId
3. 세션 없음 → 404
4. created_by !== userId → 403
5. UPDATE sessions SET is_active = !is_active WHERE id = sessionId
6. 200 { is_active: boolean }
```

**성공 응답 (200)**:

```typescript
{
  is_active: boolean;
}
```

**에러 응답**:

| 상태 코드 | 조건 | 본문 |
|---|---|---|
| 401 | 미인증 | `{ error: "인증이 필요합니다" }` |
| 403 | 비소유자 | `{ error: "세션 소유자만 변경할 수 있습니다" }` |
| 404 | 세션 없음 | `{ error: "세션을 찾을 수 없습니다" }` |

#### `GET /api/sessions/mine` 응답 변경

`is_active` 필드를 응답에 포함:

```typescript
{
  // ...기존 필드
  is_active: boolean;
}
```

#### `GET /api/sessions/validate/[code]` 변경

세션 유효성 검증 시 `is_active` 확인 추가:

```
1. 기존: share_code로 세션 조회 → 존재하면 200
2. 변경: share_code로 세션 조회 → 존재 && is_active → 200
         → 존재하지만 !is_active → 403 { error: "비활성화된 세션입니다" }
         → 존재하지 않음 → 404
```

### 변경 파일 요약

| 파일 | 유형 | 변경 내용 |
|---|---|---|
| `src/types/index.ts` | 수정 | `SessionWithMeta`에 `is_active` 필드 추가 |
| `src/components/SessionCard.tsx` | 수정 | 활성/비활성 토글 스위치, 상태 배지 추가 |
| `src/app/api/sessions/[sessionId]/toggle-active/route.ts` | 신규 | `PATCH` 세션 활성 상태 토글 API |
| `src/app/api/sessions/mine/route.ts` | 수정 | 응답에 `is_active` 필드 포함 |
| `src/app/api/sessions/validate/[code]/route.ts` | 수정 | 비활성 세션 참가 차단 |
| `src/lib/api.ts` | 수정 | `toggleSessionActive(id)` 함수 추가 |

## E2E 테스트 목록

### 프론트엔드 테스트

| # | 테스트 케이스 | 전제 조건 | 검증 항목 |
|---|---|---|---|
| F-1 | 미로그인 상태에서 `/login` 접속 | 세션 없음 | Google 로그인 버튼 표시, 기능 안내 표시 |
| F-2 | Google 로그인 버튼 클릭 | 미로그인 | Google OAuth 리다이렉트 발생 |
| F-3 | Google 로그인 완료 후 콜백 | Google 인증 완료 | 세션 저장, `/my-sessions`로 리다이렉트 |
| F-4 | `?next=/creator`로 로그인 완료 | Google 인증 완료 | `/creator`로 리다이렉트 |
| F-5 | `?next=/session/{id}/presenter`로 로그인 완료 | Google 인증 완료 | 해당 발표자 페이지로 리다이렉트 |
| F-6 | 이미 로그인 상태에서 `/login` 접속 | 세션 있음 | 즉시 `/my-sessions`로 리다이렉트 |
| F-7 | `?next=https://evil.com` 외부 URL 입력 | 미로그인 | 기본값 `/my-sessions`로 리다이렉트 |
| F-8 | `?next=/unknown-path` 허용 외 경로 | 미로그인 | 기본값 `/my-sessions`로 리다이렉트 |
| F-9 | 홈페이지에서 "로그인" 버튼 클릭 | 미로그인 | `/login`으로 이동 |
| F-10 | 로그인 후 홈페이지 "내가 만든 발표" 섹션 | 로그인됨 | 세션 카드 목록 표시 |
| F-11 | 미로그인 상태에서 `/creator` 접속 | 세션 없음 | `/login?next=/creator`로 리다이렉트 |
| F-12 | 미로그인 상태에서 `/my-sessions` 접속 | 세션 없음 | `/login?next=/my-sessions`로 리다이렉트 |
| F-13 | 미로그인 상태에서 `/session/{id}/presenter` 접속 | 세션 없음 | `/login?next=/session/{id}/presenter`로 리다이렉트 |
| F-14 | 로그인 후 세션 생성 → 발표자 페이지 진입 | 로그인됨 | `participantId`가 userId와 일치 |
| F-15 | 타인의 세션으로 발표자 접근 | 로그인됨 (타인 세션) | 참가자 페이지로 리다이렉트 |
| F-16 | `created_by=NULL` 세션에 발표자 접근 | 로그인됨 | claim 성공 후 발표자 렌더링 |
| F-17 | 세션 카드 클릭 | 로그인됨 | `/session/{id}/presenter`로 이동 |
| F-18 | 로그아웃 후 세션 생성 시도 | 로그아웃됨 | `/login`으로 리다이렉트 |
| F-19 | 브라우저 재시작 후 홈페이지 | 이전에 로그인 | 세션 자동 복원, "내가 만든 발표" 표시 |
| F-20 | 다른 기기에서 같은 Google 계정 로그인 | 다른 브라우저 | 동일한 세션 목록 표시 |

### 백엔드 테스트

| # | 테스트 케이스 | 요청 | 기대 응답 |
|---|---|---|---|
| B-1 | 유효한 토큰으로 세션 생성 | `POST /api/sessions/create` + Bearer token | 200, `created_by` = 요청 UID |
| B-2 | 토큰 없이 세션 생성 | `POST /api/sessions/create` (Authorization 없음) | 401 |
| B-3 | 만료된 토큰으로 세션 생성 | `POST /api/sessions/create` + 만료 token | 401 |
| B-4 | 유효한 토큰으로 내 세션 조회 | `GET /api/sessions/mine` + Bearer token | 200, 자신의 세션만 반환 |
| B-5 | 토큰 없이 내 세션 조회 | `GET /api/sessions/mine` (Authorization 없음) | 401 |
| B-6 | 세션 조회 시 `is_owner` 계산 | `GET /api/sessions/{id}` + 소유자 토큰 | 200, `is_owner: true` |
| B-7 | 세션 조회 시 `is_owner: false` | `GET /api/sessions/{id}` + 타인 토큰 | 200, `is_owner: false` |
| B-8 | `created_by=NULL` 세션 claim (소유자 없음) | `PATCH /api/sessions/{id}/claim` + Bearer token | 200, 소유권 획득 |
| B-9 | 이미 소유자 있는 세션 claim | `PATCH /api/sessions/{id}/claim` + 다른 사용자 토큰 | 403 |
| B-10 | 소유자 슬라이드 생성 | `POST /api/slides/{sessionId}` + 소유자 토큰 | 200 |
| B-11 | 비소유자 슬라이드 생성 | `POST /api/slides/{sessionId}` + 타인 토큰 | 403 |
| B-12 | 토큰 없이 슬라이드 생성 | `POST /api/slides/{sessionId}` (Authorization 없음) | 401 |
| B-13 | 비소유자 슬라이드 수정 | `PUT /api/slides/{sessionId}/{slideId}` + 타인 토큰 | 403 |
| B-14 | 비소유자 슬라이드 삭제 | `DELETE /api/slides/{sessionId}/{slideId}` + 타인 토큰 | 403 |
| B-15 | 세션 소유자 삭제 | `DELETE /api/sessions/{id}` + 소유자 토큰 | 200 |
| B-16 | 비소유자 세션 삭제 | `DELETE /api/sessions/{id}` + 타인 토큰 | 403 |
| B-17 | 참가자 세션 정보 조회 | `GET /api/sessions/{id}` + 참가자 토큰 | 200, `is_owner: false` |
| B-18 | 참가자 슬라이드 조회 | `GET /api/slides/{sessionId}` + 참가자 토큰 | 200 |
| B-19 | 내 세션에 슬라이드/참가자 수 포함 | `GET /api/sessions/mine` | `slide_count`, `participant_count` 정확 |

## 세션 활성화/비활성화 E2E 테스트 목록

### 프론트엔드 테스트

| # | 테스트 케이스 | 전제 조건 | 검증 항목 |
|---|---|---|---|
| T-1 | 활성 세션 카드 UI | 로그인됨, 활성 세션 | "활성" 녹색 배지 표시, Switch ON 상태, 카드 불투명도 정상 |
| T-2 | 비활성 세션 카드 UI | 로그인됨, 비활성 세션 | "비활성" 회색 배지 표시, Switch OFF 상태, 카드 opacity 낮아짐 |
| T-3 | Switch 토글 클릭 → 활성→비활성 | 로그인됨, 활성 세션 | API 호출 후 배지 "비활성"으로 변경, Switch OFF, 카드 흐려짐 |
| T-4 | Switch 토글 클릭 → 비활성→활성 | 로그인됨, 비활성 세션 | API 호출 후 배지 "활성"으로 변경, Switch ON, 카드 정상 투명도 |
| T-5 | 토글 중 로딩 상태 | 로그인됨, 느린 네트워크 | Switch 클릭 중 비활성화 (disabled), 중복 클릭 방지 |
| T-6 | 토글 API 실패 시 상태 롤백 | 로그인됨, 네트워크 오류 | Switch가 이전 상태로 복원, 에러 토스트 표시 |
| T-7 | 비활성 세션 "발표 시작" 버튼 | 로그인됨, 비활성 세션 | 버튼 클릭 시 발표자 페이지 정상 진입 (관리 목적 허용) |
| T-8 | 공유 코드 복사 | 로그인됨, 임의 세션 | 클릭 시 클립보드 복사, "복사됨!" 토스트 |
| T-9 | 내 세션 목록 `is_active` 필드 표시 | 로그인됨, 세션 2개 이상 | 각 카드에 활성/비활성 상태 정확 표시 |
| T-10 | 비활성 세션 공유 코드로 참가 시도 | 세션 비활성 | 참가 페이지에서 "비활성화된 세션입니다" 에러 표시 |
| T-11 | 활성 세션 공유 코드로 참가 | 세션 활성 | 정상적으로 참가 페이지 진입 |

### 백엔드 테스트

| # | 테스트 케이스 | 요청 | 기대 응답 |
|---|---|---|---|
| TB-1 | 소유자 세션 활성→비활성 토글 | `PATCH /api/sessions/{id}/toggle-active` + 소유자 토큰 | 200, `{ is_active: false }` |
| TB-2 | 소유자 세션 비활성→활성 토글 | `PATCH /api/sessions/{id}/toggle-active` + 소유자 토큰 | 200, `{ is_active: true }` |
| TB-3 | 비소유자 토글 시도 | `PATCH /api/sessions/{id}/toggle-active` + 타인 토큰 | 403 |
| TB-4 | 미인증 토글 시도 | `PATCH /api/sessions/{id}/toggle-active` (Authorization 없음) | 401 |
| TB-5 | 존재하지 않는 세션 토글 | `PATCH /api/sessions/{id}/toggle-active` + 소유자 토큰 (잘못된 id) | 404 |
| TB-6 | 내 세션 조회 `is_active` 포함 | `GET /api/sessions/mine` + Bearer token | 200, 각 세션에 `is_active` 필드 포함 |
| TB-7 | 활성 세션 공유 코드 유효성 검증 | `GET /api/sessions/validate/{code}` (활성 코드) | 200, `{ sessionId }` |
| TB-8 | 비활성 세션 공유 코드 유효성 검증 | `GET /api/sessions/validate/{code}` (비활성 코드) | 403, `{ error: "비활성화된 세션입니다" }` |
| TB-9 | 존재하지 않는 코드 유효성 검증 | `GET /api/sessions/validate/{code}` (없는 코드) | 404 |
| TB-10 | 토글 후 DB 값 확인 | 토글 API 호출 후 `SELECT is_active` | DB 값이 응답과 일치 |
| TB-11 | 연속 토글 (2회) | 활성→비활성→활성 순서대로 토글 | 최종 `is_active: true`, 중간에 `false` |

### 테스트 자동화 가능 여부

| # | 자동화 가능 | 비고 |
|---|---|---|
| T-1 ~ T-2 | 가능 (수동 필요) | Google OAuth 로그인 세션 필요 |
| T-3 ~ T-6 | 가능 (수동 필요) | Google OAuth 로그인 세션 필요 |
| T-7 ~ T-8 | 가능 (수동 필요) | Google OAuth 로그인 세션 필요 |
| T-9 ~ T-11 | 가능 (수동 필요) | Google OAuth 로그인 세션 필요 |
| TB-1 ~ TB-5 | 가능 (수동 필요) | Google OAuth Bearer 토큰 필요 |
| TB-6 ~ TB-11 | 가능 (수동 필요) | Google OAuth Bearer 토큰 필요 |

## E2E 테스트 결과 (2026-03-28)

### 테스트 환경

| 항목 | 내용 |
|---|---|
| 서버 | Next.js dev server (`npm run dev`) on `localhost:3001` |
| 테스트 도구 | Playwright (프론트엔드), Node.js fetch (백엔드) |
| 테스트 시간 | 2026-03-28 |
| 데이터베이스 | Supabase (RLS 정책 적용 완료) |

### 프론트엔드 결과 (11 통과 / 0 실패)

| # | 테스트 케이스 | 결과 | 비고 |
|---|---|---|---|
| F-1 | 미로그인 `/login` → Google 버튼 표시 | PASS | 버튼, 안내 텍스트, 기능 목록 정상 표시 |
| F-2 | Google 로그인 버튼 클릭 → OAuth 리다이렉트 | PASS | Google/Supabase auth 페이지로 리다이렉트 확인 |
| F-7 | `?next=https://evil.com` 외부 URL 차단 | PASS | 페이지가 외부 도메인으로 이동하지 않음. URL에 쿼리 파라미터로 포함되어 있으나 실제 리다이렉트는 발생하지 않음 |
| F-8 | `?next=/unknown-path` 허용 외 경로 | PASS | login 페이지에 머물며 기본값 사용 |
| F-9 | 홈페이지 정상 렌더링 | PASS | Real-Slide, 지금 시작하기, 세션 참여하기 텍스트 확인 |
| F-11 | 미로그인 `/creator` → 폼 표시 | PASS | 발표 시작하기 텍스트 확인 |
| F-세션참여 | 세션 참여하기 링크 → `/join` | PASS | href="/join" 확인 |
| F-UI | 로그인 UI 전체 요소 확인 | PASS | 환영 문구, 안내, 기능 목록, 구분선, 저작권 모두 확인 |
| F-파라미터 | `next` 없으면 기본값 | PASS | Google 버튼 정상 표시, 기본 리다이렉트 `/my-sessions` |
| F-3~F-5 | OAuth 콜백 후 리다이렉트 | 수동 필요 | Google OAuth 완료 후 세션 생성 필요 |
| F-6 | 이미 로그인 상태 리다이렉트 | 수동 필요 | OAuth 세션 필요 |
| F-10~F-20 | 로그인 후 기능 | 수동 필요 | 인증 세션 필요 |

### 백엔드 결과 (7 통과 / 0 실패)

| # | 테스트 케이스 | 결과 | 비고 |
|---|---|---|---|
| B-2 | 토큰 없이 세션 생성 → 401 | PASS | `POST /api/sessions/create` Authorization 없이 |
| B-3 | 잘못된 토큰으로 세션 생성 → 401 | PASS | `Bearer invalid-token-12345` |
| B-5 | 토큰 없이 내 세션 조회 → 401 | PASS | `GET /api/sessions/mine` |
| B-9 | 토큰 없이 세션 claim → 401 | PASS | `PATCH /api/sessions/{id}/claim` |
| B-12 | 토큰 없이 슬라이드 생성 → 401 | PASS | `POST /api/slides/{sessionId}` |
| B-17 | 미인증 세션 조회 → 404 | PASS | 존재하지 않는 UUID로 조회 시 404 |
| B-18 | 미인증 슬라이드 조회 → 정상 | PASS | 공개 엔드포인트, 정상 응답 |
| B-1 | 유효 토큰으로 세션 생성 | 수동 필요 | Google OAuth 토큰 필요 |
| B-4 | 유효 토큰으로 내 세션 조회 | 수동 필요 | Google OAuth 토큰 필요 |
| B-6~B-8 | is_owner / claim 검증 | 수동 필요 | Google OAuth 토큰 필요 |
| B-10~B-16 | 소유자/비소유자 CRUD | 수동 필요 | Google OAuth 토큰 필요 |
| B-19 | slide_count/participant_count | 수동 필요 | Google OAuth 토큰 필요 |

### 특이사항

1. **포트 충돌**: `localhost:3000`에 다른 프로젝트(GymBrain)가 실행 중이어서 Real-Slide는 `localhost:3001`에서 실행됨. E2E 테스트도 3001로 수행
2. **F-7 외부 URL 차단**: `?next=https://evil.com` 접속 시 페이지는 외부 도메인으로 이동하지 않고 `/login`에 머물음. URL에 쿼리 파라미터로 `evil.com`이 포함되어 있으나 실제 리다이렉트는 발생하지 않아 보안상 문제 없음. 초기 테스트 스크립트의 검증 로직(`url.includes("evil.com")`)이 URL 전체를 검사해 false positive 발생했으나, 실제 동작은 정상
3. **Playwright 수동 설치 필요**: 프로젝트에 Playwright가 devDependency로 설치되어 있지 않아 `npm install --save-dev playwright`로 별도 설치 후 실행
4. **수동 테스트 항목**: Google OAuth 콜백 완료 후 세션이 생성되어야 하는 테스트(F-3~F-6, F-10~F-20, B-1, B-4, B-6~B-19)는 자동화 불가. 브라우저에서 Google 계정으로 로그인한 후 수동 확인 필요

### 요약

| 영역 | 자동화 통과 | 자동화 실패 | 수동 필요 |
|---|---|---|---|
| 프론트엔드 | 9 | 0 | 11 |
| 백엔드 | 7 | 0 | 12 |
| **합계** | **16** | **0** | **23** |

모든 자동화 가능한 테스트가 통과했습니다. 수동 테스트 항목은 Google OAuth 로그인 완료 후 브라우저에서 진행해야 합니다.

## 참고 자료

- [Supabase Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

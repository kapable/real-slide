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

### F-2. 홈페이지 변경

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

### F-3. 세션 생성 페이지 변경

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
       ├─ null → "발표를 만들려면 Google 로그인이 필요합니다" 안내
       │         [Google로 로그인] 버튼 표시
       └─ 있음 → 기존 세션 생성 폼 표시
```

### F-4. 발표자 페이지 변경

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
3. userId가 없으면 → 홈페이지로 리다이렉트 (로그인 필요)
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
| `userId`가 없는 경우 (미로그인) | 홈페이지로 리다이렉트 |
| 세션이 존재하지 않는 경우 | 404 안내 |
| `created_by`와 `userId` 불일치 | 참가자 페이지로 리다이렉트 |
| 세션의 `created_by`가 NULL | claim API로 소유권 획득 시도 |

### F-5. 내 세션 목록 페이지 (신규)

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
| 미로그인 | 로그인 안내 + Google 로그인 버튼 |

### F-6. API 라우트 변경

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
│    ├─ / (홈페이지)                                      │
│    │   ├─ 미로그인 → "Google로 로그인" 버튼              │
│    │   └─ 로그인 → "내가 만든 발표" 섹션 표시            │
│    ├─ /creator                                          │
│    │   ├─ 미로그인 → 로그인 안내                         │
│    │   └─ 로그인 → 세션 생성 → POST (created_by=UID)    │
│    ├─ /my-sessions                                      │
│    │   └─ 로그인 필수 → GET /api/sessions/mine           │
│    └─ /session/[id]/presenter                           │
│        └─ 로그인 필수 → 소유권 검증 → 불일치 시 리다이렉트│
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

## 참고 자료

- [Supabase Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

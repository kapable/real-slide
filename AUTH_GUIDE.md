# Real-Slide: 모더레이터 인증 및 세션 관리 가이드

## 개요

모더레이터가 발표 전날 세션을 만들고 슬라이드를 준비한 후, 다음 날 다시 해당 세션에 접속할 수 있도록 하는 기능의 구현 가이드입니다.

인증 방식으로 **Supabase Anonymous Auth**를 채택하며, 향후 Google/Kakao 소셜 로그인 도입 시 데이터 마이그레이션 없이 매끄럽게 전환할 수 있도록 설계합니다.

## 현재 상태와 문제점

### 현재 상태

| 항목 | 현재 동작 |
|---|---|
| `created_by` | `"anonymous"` 하드코딩 |
| 발표자 식별 | URL 경로(`/presenter`)만으로 판단 |
| 세션 재접속 | 세션 ID를 수동으로 기억해야 함 |
| 세션 목록 | 전체 세션을 보여주는 `/admin/sessions`만 존재 |
| 소셜 로그인 | 미구현 |

### 해결해야 할 문제

1. 모더레이터가 자신이 만든 세션을 다시 찾을 수 없음
2. 발표자 페이지 접근 제어가 없음 (세션 ID만 알면 누구나 발표자 가능)
3. 향후 소셜 로그인 도입 시 기존 세션 데이터 연결 필요

## 아키텍처: Supabase Anonymous Auth

### 왜 Anonymous Auth인가

| 대안 | 소셜 로그인 전환 시 | 데이터 마이그레이션 | 판단 |
|---|---|---|---|
| 로컬 토큰 | 전면 재작성 필요 | 크게 발생 | 탈락 |
| **Anonymous Auth** | `linkIdentity()` 한 줄로 연결 | 없음 | **채택** |
| PIN 코드 | 소셜 로그인과 별개 시스템 | 전면 재작성 | 탈락 |
| 하이브리드 | Anonymous Auth로 수렴 | 중간 | 탈락 |

### 전환 시나리오

```
[Phase 1: Anonymous Auth]           [Phase 2: 소셜 로그인 추가]
익명 사용자 (UID: abc-123)    →    Google/Kakao 계정 연결 (linkIdentity)
  ├─ 세션 A (created_by=abc-123)       그대로 유지
  ├─ 세션 B (created_by=abc-123)       그대로 유지
  └─ "내 세션" 페이지                   정상 작동
```

- `created_by`가 UID이므로 익명 → 소셜 전환 후에도 `WHERE created_by = auth.uid()` 동일하게 작동
- RLS 정책도 `auth.uid()` 기반으로 작성하므로 수정 불필요
- JWT의 `is_anonymous` 클레임으로 익명/정식 사용자 구분 가능

## 구현 계획

### 1단계: Supabase 프로젝트 설정

#### 1-1. Anonymous Auth 활성화

Supabase 콘솔 → Authentication → Providers → **Anonymous** 토글 ON

#### 1-2. 데이터베이스 스키마 변경

`created_by` 컬럼의 타입을 `text`에서 `uuid`로 변경하고, `auth.users`를 참조하도록 수정합니다.

```sql
-- sessions 테이블 created_by 컬럼 변경
ALTER TABLE public.sessions
  ALTER COLUMN created_by TYPE uuid USING created_by::uuid,
  ALTER COLUMN created_by DROP NOT NULL;

-- 기존 "anonymous" 값은 NULL로 처리
UPDATE public.sessions SET created_by = NULL WHERE created_by IS NULL OR created_by = 'anonymous';

-- 외래키 제약 추가 (선택사항, auth.users 참조)
-- ALTER TABLE public.sessions
--   ADD CONSTRAINT sessions_created_by_fkey
--   FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
```

> **참고**: 외래키 제약은 선택사항입니다. `auth.users`와 `public.sessions`가 서로 다른 스키마에 있으므로, RLS 정책으로 소유권을 검증하는 방식도 가능합니다.

#### 1-3. RLS 정책 업데이트

기존 "모든 사용자 허용" 정책을 소유권 기반 정책으로 교체합니다.

```sql
-- sessions: 누구나 읽기 가능, 생성은 인증된 사용자만
CREATE POLICY "Authenticated users can read sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create sessions"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 모더레이터만 자신의 세션 수정/삭제 가능
CREATE POLICY "Moderators can update own sessions"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Moderators can delete own sessions"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- slides: 모더레이터만 자신의 세션에 슬라이드 CRUD
CREATE POLICY "Moderators can manage slides in own sessions"
  ON public.slides FOR ALL
  TO authenticated
  USING (session_id IN (
    SELECT id FROM public.sessions WHERE created_by = auth.uid()
  ));

-- 참가자 관련 테이블은 기존 정책 유지 (모든 사용자 읽기/쓰기 가능)
```

> **주의**: Anonymous Auth 사용자도 `authenticated` 역할을 가집니다. RLS에서 `is_anonymous` JWT 클레임으로 익명/정식 구분이 가능합니다.

### 2단계: 클라이언트 사이드 구현

#### 2-1. Supabase 클라이언트 설정

기존 `src/lib/supabase.ts`에 Auth 기능을 추가합니다.

```
- supabase.auth.signInAnonymously() 호출로 익명 세션 생성
- getSession()으로 기존 세션 복원
- onAuthStateChange()로 인증 상태 변화 감지
```

#### 2-2. 인증 초기화 흐름

```
앱 로드
  └─ getSession() 확인
       ├─ 세션 있음 → UID 확보 완료, 세션 목록 조회 가능
       └─ 세션 없음 → signInAnonymously() 호출 → UID 발급
```

#### 2-3. 세션 생성 흐름 (변경)

```
기존: POST /api/sessions/create { title }
      → created_by = "anonymous" (하드코딩)

변경: POST /api/sessions/create { title }
      → 서버에서 auth.uid()로 created_by 설정
      → 응답에 sessionId 포함
```

#### 2-4. 세션 재접속 흐름 (신규)

```
홈페이지 또는 /my-sessions 페이지
  └─ supabase.auth.getSession() → UID 확보
       └─ GET /api/sessions/mine → WHERE created_by = UID
            └─ 세션 목록 표시
                 └─ 세션 선택 → /session/[sessionId]/presenter 이동
```

### 3단계: 신규 페이지 및 API

#### 3-1. 신규 페이지

| 경로 | 용도 | 설명 |
|---|---|---|
| `/my-sessions` | 내 세션 목록 | 모더레이터가 만든 세션 목록. 세션 생성일, 제목, 참가자 수 표시. 클릭 시 presenter 페이지로 이동 |
| `/session/[id]/presenter` 접근 제어 | 발표자 권한 검증 | 세션의 `created_by`와 현재 `auth.uid()` 비교. 불일치 시 참가자로 리다이렉트 또는 접근 거부 |

#### 3-2. 신규/수정 API

| 엔드포인트 | 메서드 | 변경 내용 |
|---|---|---|
| `/api/sessions/create` | POST | `created_by`를 `auth.uid()`로 설정 |
| `/api/sessions/mine` | GET | **신규**. 현재 사용자가 만든 세션 목록 반환 |
| `/api/sessions/[sessionId]` | GET | 발표자 권한 검증 추가 (선택사항) |
| `/api/slides/[sessionId]` | POST/PUT/DELETE | 세션 소유자만 슬라이드 관리 가능 |

### 4단계: 사용자 경험 (UX) 흐름

#### 발표 전날 (준비)

```
1. 사이트 접속 → 자동으로 익명 계정 생성 (사용자 인지 없음)
2. "새 발표 만들기" → 세션 생성 → 발표자 페이지로 이동
3. 슬라이드, 투표, 퀴즈 등 추가
4. 브라우저 종료 (세션은 서버에 저장됨)
```

#### 발표 당일 (재접속)

```
1. 같은 브라우저에서 사이트 접속 → 익명 세션 자동 복원
2. 홈페이지에 "내가 만든 발표" 섹션 표시
   - 어제 만든 세션 목록
   - 각 세션의 슬라이드 수, 생성 시간
3. 해당 세션 클릭 → 발표자 페이지로 바로 이동
4. 발표 시작
```

#### 다른 기기에서 접속해야 할 경우

```
현재: 불가능 (익명 세션은 브라우저에 종속)
대안: 향후 소셜 로그인 도입으로 해결
     또는 세션 share_code를 통한 복구 기능 추가 고려
```

### 5단계: 소셜 로그인 마이그레이션 (향후)

소셜 로그인 도입 시 Anonymous Auth에서 마이그레이션하는 전체 과정을 다룹니다.

#### 5-1. 사전 준비

##### Supabase 콘솔 설정

1. **Authentication → Providers** 에서 다음 항목 활성화:
   - Google OAuth
   - Kakao OAuth
2. **Authentication → Providers → Anonymous Sign-ins** 이 계속 ON 상태인지 확인 (기존 익명 사용자 유지)
3. **Authentication → Providers → Manual Linking** 을 ON으로 설정 (익명 → 소셜 계정 연결에 필요)

##### OAuth 앱 생성

| 프로바이더 | 설정 위치 | 필수 항목 |
|---|---|---|
| Google | [Google Cloud Console](https://console.cloud.google.com/) | Client ID, Client Secret, Redirect URI |
| Kakao | [Kakao Developers](https://developers.kakao.com/) | REST API Key, Redirect URI |

Redirect URI 형식: `https://<project-ref>.supabase.co/auth/v1/callback`

##### 환경 변수 추가

```env
# 기존
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 추가 불필요 — OAuth 설정은 Supabase 콘솔에서 관리
# 클라이언트는 provider 이름만으로 signInWithOAuth() 호출 가능
```

#### 5-2. 데이터베이스 마이그레이션

##### RLS 정책 업데이트

소셜 로그인 사용자와 익명 사용자를 구분하는 정책을 추가합니다. 기존 정책은 그대로 두고, 제한이 필요한 작업에만 restrictive 정책을 겹칩니다.

```sql
-- 익명 사용자도 세션 생성/조회는 계속 가능 (기존과 동일)
-- 단, 정식 사용자(소셜 로그인)에게만 추가 기능 부여하는 예시:

-- 예: 세션 삭제는 소셜 로그인 사용자만 가능하도록 제한하고 싶은 경우
CREATE POLICY "Only permanent users can delete sessions"
  ON public.sessions AS RESTRICTIVE FOR DELETE
  TO authenticated
  USING (
    (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS false
    AND created_by = auth.uid()
  );
```

> **원칙**: Anonymous Auth 도입 단계에서 작성한 RLS 정책은 `auth.uid()` 기반이므로, 소셜 로그인 전환 후에도 수정 없이 그대로 작동합니다. `is_anonymous` 구분이 필요한 시점에만 restrictive 정책을 추가합니다.

##### 사용자 메타데이터 활용

소셜 로그인 연결 후 `raw_user_meta_data`에 프로바이더 정보가 자동 저장됩니다.

```sql
-- 소셜 로그인 사용자의 프로바이더 확인
SELECT id, raw_user_meta_data->>'full_name' AS name,
       raw_user_meta_data->>'avatar_url' AS avatar,
       is_anonymous
FROM auth.users
WHERE is_anonymous IS false;
```

#### 5-3. 클라이언트 마이그레이션

##### 로그인 UI 추가

홈페이지 또는 전용 로그인 페이지에 소셜 로그인 버튼을 추가합니다.

```
기존 홈페이지:
  "새 발표 만들기" | "세션 참여하기"

변경 후:
  "새 발표 만들기" | "세션 참여하기"
  ─────────────────────────────────
  [Google로 로그인] [Kakao로 로그인]

  로그인 시 혜택:
  • 다른 기기에서도 내 발표 확인 가능
  • 발표 기록 영구 보관
```

##### 인증 훅 변경 (`useAuth.ts`)

```
기존 (Anonymous Auth):
  signInAnonymously() → 익명 UID 발급
  getSession() → 세션 복원

추가 (Social Login):
  signInWithOAuth({ provider: 'google' }) → Google 로그인
  signInWithOAuth({ provider: 'kakao' }) → Kakao 로그인
  linkIdentity({ provider: 'google' }) → 기존 익명 계정에 Google 연결
  getSession() → 동일 (UID 기반)
```

##### 핵심 로직: 기존 익명 사용자 처리

소셜 로그인 도입 후, 기존 익명 사용자가 소셜 로그인을 시도할 때 두 가지 경우가 발생합니다.

**사례 1: 익명 계정에 소셜 계정 연결 (linkIdentity)**

가장 일반적인 사례입니다. 기존 익명 사용자가 "Google로 로그인" 버튼을 누르면:

```typescript
// 1. 현재 익명 세션 확인
const { data: { session } } = await supabase.auth.getSession();

if (session?.user?.is_anonymous) {
  // 2. 익명 계정에 소셜 계정 연결
  //    → UID가 동일하게 유지됨
  //    → 기존 세션(created_by) 데이터 그대로 사용 가능
  const { error } = await supabase.auth.linkIdentity({
    provider: 'google'  // 또는 'kakao'
  });

  if (!error) {
    // 연결 성공. 같은 UID에 Google identity가 추가됨
    // "내 세션" 목록이 그대로 표시됨
  }
}
```

**사례 2: 소셜 계정으로 새 로그인 (기존 익명 계정이 없는 경우)**

다른 기기에서 처음 접속하거나 브라우저 데이터를 초기화한 경우:

```typescript
// 소셜 로그인 → 새 UID 발급
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google'
});

// 이 경우 기존 익명 계정의 세션 데이터와 연결되지 않음
// 해결 방법은 아래 "데이터 충돌 해결" 참조
```

#### 5-4. 데이터 충돌 해결 전략

소셜 로그인으로 새 UID가 발급된 경우, 기존 익명 UID의 세션을 어떻게 처리할지 결정해야 합니다.

| 전략 | 방법 | 장단점 |
|---|---|---|
| **세션 이관** | 세션의 `created_by`를 새 UID로 UPDATE | 간단하지만 소유권 증명 어려움 |
| **공유 코드 복구** | 세션의 `share_code` 입력 → 소유권 이관 | 사용자가 코드만 기억하면 됨. 추천 |
| **이중 소유권** | `session_owners` 조인 테이블 생성 | 유연하지만 복잡도 증가 |

**추천: 공유 코드 복구 방식**

```
1. 사용자가 소셜 로그인으로 접속 (새 UID)
2. "기존 발표 불러오기" 메뉴에서 share_code 입력
3. 서버에서 해당 세션의 created_by를 현재 auth.uid()로 업데이트
4. 세션이 새 계정으로 이관됨
```

구현 시 필요한 사항:
- share_code 입력 UI
- 소유권 이관 API (`POST /api/sessions/claim`)
- 이관 전 기존 소유자 확인 (선택사항: 이전 익명 계정의 최근 접속 시간 등)

#### 5-5. 마이그레이션 체크리스트

소셜 로그인 도입 시 아래 항목을 순서대로 진행합니다.

- [ ] **Supabase 콘솔**: Google OAuth 앱 생성 및 설정
- [ ] **Supabase 콘솔**: Kakao OAuth 앱 생성 및 설정
- [ ] **Supabase 콘솔**: Authentication → Providers → Google/Kakao 활성화
- [ ] **Supabase 콘솔**: Authentication → Providers → Manual Linking 활성화
- [ ] **클라이언트**: 로그인 UI 컴포넌트 추가 (Google/Kakao 버튼)
- [ ] **클라이언트**: `useAuth.ts`에 `signInWithOAuth`, `linkIdentity` 로직 추가
- [ ] **클라이언트**: 기존 익명 사용자 감지 → "계정 연결" 프롬프트 표시
- [ ] **클라이언트**: 사용자 프로필 정보 표시 (이름, 아바타 - `raw_user_meta_data`)
- [ ] **API**: `POST /api/sessions/claim` (공유 코드로 세션 소유권 이관) 추가
- [ ] **RLS**: 필요시 `is_anonymous` 기반 restrictive 정책 추가
- [ ] **테스트**: 익명 → Google 연결 후 기존 세션 유지 확인
- [ ] **테스트**: 익명 → Kakao 연결 후 기존 세션 유지 확인
- [ ] **테스트**: 새 기기에서 소셜 로그인 → 공유 코드로 세션 복구 확인
- [ ] **테스트**: 기존 익명 사용자가 소셜 로그인 없이 계속 사용 가능한지 확인
- [ ] **운영**: 익명 계정 자동 정리 Cron job 설정

#### 5-6. 주의사항

| 항목 | 내용 |
|---|---|
| **기존 익명 사용자 영향 없음** | 소셜 로그인 추가 후에도 익명 사용자는 기존 방식 그대로 이용 가능. 강제 전환 없음 |
| **RLS 정책 호환성** | `auth.uid()` 기반 정책은 소셜 로그인 후에도 동일하게 작동. 추가 수정 불필요 |
| **linkIdentity는 한 번만** | 익명 계정에 소셜 계정을 연결하면 되돌릴 수 없음. 신중한 UX 설계 필요 |
| **Next.js 정적 렌더링 주의** | Supabase 공식 문서에서 익명 사용자 메타데이터가 Next.js 정적 렌더링에 의해 캐싱될 수 있음을 경고. 동적 렌더링(`export const dynamic = 'force-dynamic'`) 사용 권장 |
| **세션 만료 관리** | 익명 세션은 브라우저 종료 후에도 Supabase localStorage 토큰으로 유지됨. 단, 토큰 만료(기본 1시간) 후 자동 갱신됨 |

## 프론트엔드 기능 명세

### 개요

Anonymous Auth 도입에 필요한 프론트엔드 변경사항을 페이지/컴포넌트 단위로 정의합니다. 각 항목은 현재 코드 기준에서의 변경점을 명시합니다.

### F-1. AuthProvider 컨텍스트

**파일**: `src/contexts/AuthProvider.tsx` (신규)

루트 레이아웃(`src/app/layout.tsx`)에 추가할 인증 컨텍스트입니다.

**책임**:
- 앱 진입 시 `supabase.auth.getSession()`으로 기존 세션 복원
- 세션이 없으면 `supabase.auth.signInAnonymously()` 호출하여 익명 UID 발급
- `onAuthStateChange()` 리스너 등록으로 인증 상태 변화 감지
- 하위 컴포넌트에 `user`, `userId`, `isAnonymous`, `loading` 상태 제공

**상태**:

| 상태 | 타입 | 설명 |
|---|---|---|
| `user` | `User \| null` | Supabase auth user 객체 |
| `userId` | `string \| null` | `user.id` (auth.uid()). 세션 생성 시 `created_by`로 사용 |
| `isAnonymous` | `boolean` | `user?.is_anonymous` 여부 |
| `loading` | `boolean` | 초기 인증 완료 여부. `true`인 동안 전체 UI 숨김 |

**레이아웃 통합** (`src/app/layout.tsx`):

```
기존:
  <html>
    <body>
      <WebVitals />
      <OfflineIndicator />
      {children}
    </body>
  </html>

변경:
  <html>
    <body>
      <WebVitals />
      <OfflineIndicator />
      <AuthProvider>       ← 추가
        {children}
      </AuthProvider>
    </body>
  </html>
```

**Supabase 클라이언트 변경** (`src/lib/supabase.ts`):

현재는 단순 `createClient` 호출만 있음. Auth 기능을 사용하기 위해 별도 변경은 필요하지 않으나, Next.js App Router 환경에서 Supabase Auth 세션 관리를 위해 서버 컴포넌트와 클라이언트 컴포넌트에서 각각 다른 인스턴스가 필요할 수 있음. 초기 구현에서는 기존 클라이언트 인스턴스에 `auth` 속성만 활용하는 것으로 충분.

### F-2. 홈페이지 변경

**파일**: `src/app/page.tsx` (수정)

현재 홈페이지는 Header, Hero, Features 세 섹션으로 구성되어 있습니다. "내가 만든 발표" 섹션을 추가합니다.

**추가 섹션**: "내가 만든 발표" (Hero와 Features 사이에 삽입)

```
[Header]
  logo | "지금 시작하기" | "세션 참여하기"

[Hero Section] (기존과 동일)
  "실시간 대화형 프레젠테이션의 미래"
  [새 발표 만들기] [세션 참여하기]

[내 세션 목록] ← 신규 섹션 (로그인한 사용자만 표시)
  ┌─────────────────────────────────────────┐
  │ 내가 만든 발표                          │
  │                                         │
  │ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
  │ │ 세션 A  │ │ 세션 B  │ │ 세션 C  │   │
  │ │ 5개 슬라이드 │ │ 3개 슬라이드 │ │ 8개 슬라이드 │ │
  │ │ 3월 27일 │ │ 3월 26일 │ │ 3월 25일 │   │
  │ └─────────┘ └─────────┘ └─────────┘   │
  └─────────────────────────────────────────┘

[Features Section] (기존과 동일)
```

**표시 조건**:
- `userId`가 있을 때 (익명 포함) 섹션 표시
- `loading`이 `true`이면 스켈레톤 UI 표시
- 세션이 없으면 "아직 만든 발표가 없습니다. 새 발표를 만들어보세요!" 안내 문구 표시

**세션 카드 정보**:

| 항목 | 데이터 소스 |
|---|---|
| 세션 제목 | `sessions.title` |
| 슬라이드 수 | `slides` 테이블에서 COUNT |
| 생성일 | `sessions.created_at` (상대 시간 표시, 예: "3월 27일") |
| 참가자 수 | `participants` 테이블에서 COUNT |
| 공유 코드 | `sessions.share_code` |

**인터랙션**:
- 카드 클릭 → `/session/[sessionId]/presenter` 이동
- 공유 코드 복사 버튼 (클립보드 복사)

**데이터 조회**: `GET /api/sessions/mine` 호출 (F-6 참조)

### F-3. 세션 생성 페이지 변경

**파일**: `src/app/creator/page.tsx` (수정)

현재는 제목 입력 후 `POST /api/sessions/create` 호출로 세션을 생성합니다. 변경점은 API 요청 시 인증 토큰이 자동으로 포함되도록 하는 것입니다.

**변경사항**:

| 항목 | 현재 | 변경 |
|---|---|---|
| API 호출 | `fetch('/api/sessions/create', { body: { title } })` | 동일. 인증 토큰은 Supabase 클라이언트에서 자동 관리 |
| 에러 처리 | 기본 에러 메시지 | 인증 관련 에러 추가 ("로그인이 필요합니다" 등) |
| 로딩 | 단순 spinner | 인증 로딩 + 세션 생성 로딩 분리 |

**핵심 변화**: 프론트엔드 코드 변경은 최소화됩니다. 실제 변경은 API 라우트(F-7)에서 발생합니다. 프론트엔드에서는 AuthProvider가 제공하는 `loading` 상태를 확인하여 인증이 완료된 후에만 세션 생성이 가능하도록 합니다.

### F-4. 발표자 페이지 변경

**파일**: `src/app/session/[sessionId]/presenter/page.tsx` (수정)

**현재 하드코딩 값** (변경 필요):
- `participantId="presenter"` (line 466)
- `nickname="발표자"` (line 467)

**변경사항**:

| 항목 | 현재 | 변경 |
|---|---|---|
| 권한 검증 | 없음. URL만으로 발표자 접근 가능 | 세션 로드 후 `session.created_by !== userId`이면 참가자 페이지로 리다이렉트 |
| participantId | `"presenter"` 하드코딩 | `userId` (auth.uid()) 사용 |
| nickname | `"발표자"` 하드코딩 | 유지 (발표자 닉네임은 "발표자"로 고정해도 무방) |
| 로딩 | 세션 데이터 로딩 | 세션 데이터 로딩 + **인증 상태 확인** |

**권한 검증 흐름**:

```
1. 페이지 진입
2. AuthProvider에서 userId 확인 (loading 완료 대기)
3. 세션 데이터 조회 (GET /api/sessions/[sessionId])
4. 비교: session.created_by === userId ?
   ├─ 일치 → 정상 발표자 페이지 렌더링
   └─ 불일치 → /join/[shareCode] 로 리다이렉트 (참가자로 이동)
```

**에러 케이스**:

| 상황 | 처리 |
|---|---|
| `userId`가 없는 경우 (인증 실패) | 홈페이지로 리다이렉트 |
| 세션이 존재하지 않는 경우 | 404 안내 |
| `created_by`와 `userId` 불일치 | 참가자 페이지로 리다이렉트 |
| 세션의 `created_by`가 NULL인 경우 (마이그레이션 전 세션) | 소유자 없음으로 판단. 첫 접속자에게 소유권 부여 또는 읽기 전용으로 처리 |

### F-5. 내 세션 목록 페이지 (신규)

**파일**: `src/app/my-sessions/page.tsx` (신규)

홈페이지의 "내가 만든 발표" 섹션의 확장판입니다. 더 많은 세션을 확인하고 관리할 수 있는 전용 페이지입니다.

**레이아웃**:

```
[Header]
  logo | "지금 시작하기" | "세션 참여하기"

[내 세션 목록]
  ┌─────────────────────────────────────────────────┐
  │ 내가 만든 발표                    [새 발표 만들기] │
  │                                                 │
  │ ┌─────────────────────────────────────────────┐ │
  │ │ 📊 3월 수학 수업              코드: ABC123  │ │
  │ │    12개 슬라이드 · 28명 참여 · 3월 27일 생성 │ │
  │ │                          [발표 시작] [삭제]  │ │
  │ └─────────────────────────────────────────────┘ │
  │                                                 │
  │ ┌─────────────────────────────────────────────┐ │
  │ │ 📊 2월 과학 발표              코드: DEF456  │ │
  │ │    8개 슬라이드 · 15명 참여 · 2월 15일 생성  │ │
  │ │                          [발표 시작] [삭제]  │ │
  │ └─────────────────────────────────────────────┘ │
  │                                                 │
  └─────────────────────────────────────────────────┘
```

**기능**:

| 기능 | 설명 |
|---|---|
| 세션 목록 | `GET /api/sessions/mine` 응답 데이터를 리스트로 표시 |
| 정렬 | 기본: 최신 생성순. 선택: 이름순, 슬라이드 수순 |
| 발표 시작 | 클릭 시 `/session/[sessionId]/presenter` 이동 |
| 공유 코드 복사 | 클릭 시 클립보드에 share_code 복사 |
| 세션 삭제 | 삭제 확인 모달 표시 후 `DELETE /api/sessions/[sessionId]` 호출 |
| 빈 상태 | 세션이 없을 때 "새 발표 만들기" 버튼이 있는 빈 상태 UI |
| 로딩 | 스켈레톤 UI |

**라우팅**: 홈페이지의 "내가 만든 발표" 섹션에서 "모두 보기" 링크로 이동

### F-6. API 라우트 변경

#### `GET /api/sessions/mine` (신규)

**파일**: `src/app/api/sessions/mine/route.ts` (신규)

현재 사용자가 만든 세션 목록을 반환합니다.

**요청**:
- 메서드: `GET`
- 인증: Supabase Auth 세션 필요. 요청 헤더의 Authorization에서 JWT 추출 후 `auth.uid()` 확인

**응답**:

```typescript
// 성공 (200)
{
  sessions: Array<{
    id: string;
    title: string;
    share_code: string;
    created_at: string;
    updated_at: string;
    slide_count: number;     // slides 테이블 COUNT
    participant_count: number; // participants 테이블 COUNT
  }>
}

// 인증 실패 (401)
{ error: "인증이 필요합니다." }
```

**쿼리**:

```sql
SELECT s.*,
       COUNT(DISTINCT sl.id) AS slide_count,
       COUNT(DISTINCT p.id) AS participant_count
FROM public.sessions s
LEFT JOIN public.slides sl ON sl.session_id = s.id
LEFT JOIN public.participants p ON p.session_id = s.id
WHERE s.created_by = auth.uid()
GROUP BY s.id
ORDER BY s.created_at DESC;
```

#### `POST /api/sessions/create` (수정)

**파일**: `src/app/api/sessions/create/route.ts` (수정)

**변경점**:

| 항목 | 현재 (line 33) | 변경 |
|---|---|---|
| `created_by` | `"anonymous"` 하드코딩 | `auth.uid()` 에서 추출 |
| 인증 확인 | 없음 | JWT에서 UID 추출. 없으면 401 응답 |

#### `GET /api/sessions/[sessionId]` (수정)

**파일**: `src/app/api/sessions/[sessionId]/route.ts` (수정)

**변경점**: 응답에 `is_owner` 필드 추가 (프론트엔드에서 권한 판단용)

```typescript
// 추가 필드
{
  is_owner: boolean; // session.created_by === auth.uid()
}
```

#### `POST/PUT/DELETE /api/slides/[sessionId]` (수정)

**파일**: `src/app/api/slides/[sessionId]/route.ts` (수정)

**변경점**: 슬라이드 CRUD 시 세션 소유자 확인 추가

```
1. 요청에서 auth.uid() 추출
2. 세션 조회: SELECT created_by FROM sessions WHERE id = sessionId
3. 비교: created_by === auth.uid()
   ├─ 일치 → 승인
   └─ 불일치 → 403 응답 ("세션 소유자만 수정할 수 있습니다.")
```

### F-7. 컴포넌트 명세

#### SessionCard 컴포넌트

**파일**: `src/components/SessionCard.tsx` (신규)

홈페이지와 내 세션 목록 페이지에서 공통으로 사용하는 세션 카드 컴포넌트입니다.

**Props**:

| Prop | 타입 | 설명 |
|---|---|---|
| `id` | `string` | 세션 ID |
| `title` | `string` | 세션 제목 |
| `shareCode` | `string` | 공유 코드 |
| `createdAt` | `string` | 생성일 (ISO 문자열) |
| `slideCount` | `number` | 슬라이드 수 |
| `participantCount` | `number` | 참가자 수 |
| `variant` | `"compact" \| "full"` | 홈페이지용(compact) / 목록 페이지용(full) |
| `onDelete` | `(id: string) => void` | 삭제 콜백 (full variant에서만 표시) |

**표시 요소**:

- compact: 제목, 슬라이드 수, 생성일
- full: 제목, 공유 코드, 슬라이드 수, 참가자 수, 생성일, 발표 시작 버튼, 삭제 버튼

#### AuthGuard 컴포넌트

**파일**: `src/components/AuthGuard.tsx` (신규)

인증이 필요한 페이지를 감싸는 래퍼 컴포넌트입니다.

**Props**:

| Prop | 타입 | 설명 |
|---|---|---|
| `children` | `ReactNode` | 보호할 자식 컴포넌트 |
| `fallback` | `ReactNode` | 인증 로딩 중 표시할 UI (선택, 기본: spinner) |

**동작**:
- `loading === true` → `fallback` 표시
- `userId === null` → 홈페이지로 리다이렉트
- `userId` 있음 → `children` 렌더링

#### SessionOwnershipGuard 컴포넌트

**파일**: `src/components/SessionOwnershipGuard.tsx` (신규)

발표자 페이지에서 세션 소유권을 검증하는 래퍼 컴포넌트입니다.

**Props**:

| Prop | 타입 | 설명 |
|---|---|---|
| `sessionId` | `string` | 검증할 세션 ID |
| `children` | `ReactNode` | 소유자만 볼 수 있는 UI |
| `fallback` | `ReactNode` | 권한 없을 때 표시할 UI |

**동작**:
- 세션 데이터 로드 후 `session.created_by === userId` 비교
- 일치 → `children` 렌더링
- 불일치 → 참가자 페이지로 리다이렉트

### F-8. 상태 관리 흐름

```
┌─────────────────────────────────────────────────────────┐
│ App Load                                                │
│                                                         │
│  AuthProvider                                           │
│    ├─ getSession() → 기존 세션 확인                     │
│    │   ├─ 세션 있음 → user, userId 설정, loading=false  │
│    │   └─ 세션 없음 → signInAnonymously()               │
│    │       ├─ 성공 → user, userId 설정, loading=false    │
│    │       └─ 실패 → 에러 표시, 재시도 버튼              │
│    └─ onAuthStateChange() 등록                          │
│        └─ 세션 만료/갱신 시 자동 처리                    │
│                                                         │
│  Page Render (loading=false 이후)                       │
│    ├─ / (홈페이지)                                      │
│    │   └─ "내가 만든 발표" 섹션 → GET /api/sessions/mine│
│    ├─ /creator                                          │
│    │   └─ 세션 생성 → POST /api/sessions/create         │
│    │       (created_by = auth.uid())                     │
│    ├─ /my-sessions                                      │
│    │   └─ 세션 목록 → GET /api/sessions/mine            │
│    └─ /session/[id]/presenter                           │
│        └─ SessionOwnershipGuard                         │
│            └─ created_by === userId 검증                 │
└─────────────────────────────────────────────────────────┘
```

### F-9. 변경 파일 요약

| 파일 | 유형 | 변경 내용 |
|---|---|---|
| `src/contexts/AuthProvider.tsx` | 신규 | Auth 상태 관리 컨텍스트 |
| `src/components/AuthGuard.tsx` | 신규 | 인증 가드 컴포넌트 |
| `src/components/SessionOwnershipGuard.tsx` | 신규 | 세션 소유권 검증 컴포넌트 |
| `src/components/SessionCard.tsx` | 신규 | 세션 카드 UI 컴포넌트 |
| `src/app/my-sessions/page.tsx` | 신규 | 내 세션 목록 페이지 |
| `src/app/api/sessions/mine/route.ts` | 신규 | 내 세션 목록 API |
| `src/app/layout.tsx` | 수정 | AuthProvider 래핑 추가 |
| `src/app/page.tsx` | 수정 | "내가 만든 발표" 섹션 추가 |
| `src/app/creator/page.tsx` | 수정 | 인증 상태 확인 로직 추가 |
| `src/app/session/[sessionId]/presenter/page.tsx` | 수정 | 소유권 검증, participantId 변경 |
| `src/app/api/sessions/create/route.ts` | 수정 | `created_by`를 `auth.uid()`로 변경 |
| `src/app/api/sessions/[sessionId]/route.ts` | 수정 | `is_owner` 필드 추가 |
| `src/app/api/slides/[sessionId]/route.ts` | 수정 | 소유자 권한 검증 추가 |
| `src/types/index.ts` | 수정 | `SessionWithMeta` 타입 추가 |

## 백엔드 기능 명세

### 개요

프론트엔드 명세(F-1 ~ F-9)에서 다룬 API 라우트의 서버 사이드 구현 상세, 데이터베이스 마이그레이션, RLS 정책, 인증 유틸리티, 그리고 기존 데이터 호환성 처리를 정의합니다.

### B-1. 인증 유틸리티

#### `src/lib/auth.ts` (신규)

모든 API 라우트에서 공통으로 사용하는 인증 헬퍼 함수입니다.

**함수 목록**:

| 함수 | 시그니처 | 설명 |
|---|---|---|
| `getAuthenticatedUserId` | `(request: Request) => Promise<string \| null>` | 요청 헤더에서 JWT를 추출하여 Supabase Auth로 검증 후 UID 반환. 실패 시 `null` 반환 |
| `requireAuth` | `(request: Request) => Promise<string>` | `getAuthenticatedUserId`와 동일하지만, 실패 시 `null` 대신 401 에러를 throw |

**JWT 추출 방식**:

```
요청 흐름:
  클라이언트 (supabase-js)
    → Authorization 헤더에 Bearer {access_token} 자동 첨부
    → 또는 쿠키에 Supabase auth token 저장

서버 (API Route):
  1. request.headers.get('Authorization')에서 Bearer 토큰 추출
  2. supabase.auth.getUser(token)로 토큰 검증
  3. 유효하면 user.id 반환
  4. 만료/무효면 null 또는 에러
```

**주의**: Next.js API 라우트에서는 Supabase 클라이언트가 자동으로 쿠키를 읽지 않습니다. 클라이언트에서 API 호출 시 `supabase` 인스턴스를 통해 요청하면 Authorization 헤더가 자동으로 첨부됩니다. `fetch` 직접 호출 시에는 수동으로 헤더를 추가해야 합니다.

#### `src/lib/supabase-server.ts` (신규)

서버 사이드에서 사용하는 Supabase 클라이언트입니다. 기존 `src/lib/supabase.ts`는 클라이언트 전용으로 유지하고, 서버용 인스턴스를 별도로 생성합니다.

**차이점**:

| 항목 | `supabase.ts` (클라이언트) | `supabase-server.ts` (서버) |
|---|---|---|
| 용도 | 브라우저에서 실행 | API 라우트에서 실행 |
| 세션 관리 | localStorage 자동 관리 | 요청 헤더에서 수동 추출 |
| Auth 호출 | `signInAnonymously` 등 가능 | `getUser(token)` 검증만 수행 |
| 인스턴스 생성 | `createClient(url, anonKey)` | `createClient(url, anonKey)` 동일하지만, 요청마다 새로 생성하지 않고 싱글톤으로 관리 |

### B-2. 데이터베이스 마이그레이션

#### 마이그레이션 파일: `supabase/migrations/YYYYMMDDHHMMSS_anonymous_auth.sql`

하나의 마이그레이션 파일로 통합 실행합니다.

#### B-2-1. `sessions.created_by` 컬럼 타입 변경

```sql
-- Step 1: 기존 "anonymous" 값을 NULL로 정리 (타입 변경 전)
UPDATE public.sessions
SET created_by = NULL
WHERE created_by = 'anonymous';

-- Step 2: 컬럼 타입 변경 (text → uuid)
ALTER TABLE public.sessions
  ALTER COLUMN created_by TYPE uuid USING NULL,
  ALTER COLUMN created_by DROP NOT NULL;
```

**기존 데이터 처리 기준**:

| `created_by` 값 | 처리 | 사유 |
|---|---|---|
| `"anonymous"` | `NULL`로 변경 | 기존 세션은 소유자 없음으로 표시 |
| `NULL` | `NULL` 유지 | 이미 소유자 없음 |
| 유효한 UUID | 유지 | 소셜 로그인 도입 후 생성된 세션 |

> **마이그레이션 전 세션**: `created_by = NULL`인 세션은 누구나 발표자로 접근 가능(읽기 전용) 또는 첫 접속자에게 소유권 부여(B-2-3 참조)

#### B-2-2. RLS 정책 교체

기존 "모든 사용자 허용" 정책을 삭제하고 소유권 기반 정책으로 교체합니다.

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

-- ============================================================
-- 참가자 관련 테이블 정책 (기존과 동일하게 모든 사용자 허용)
-- ============================================================
-- participants, votes, comments, hands_up, wordcloud_items, quiz_answers
-- 은 기존 정책 유지. 변경 불필요.
```

**정책 적용 테이블별 요약**:

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `sessions` | 모든 인증 사용자 | 소유자만 (`created_by = auth.uid()`) | 소유자만 | 소유자만 |
| `slides` | 모든 인증 사용자 | 소유자만 (서브쿼리) | 소유자만 | 소유자만 |
| `participants` | 모든 인증 사용자 | 모든 인증 사용자 | 기존 유지 | 기존 유지 |
| `votes` | 기존 유지 | 기존 유지 | 기존 유지 | - |
| `comments` | 기존 유지 | 기존 유지 | 기존 유지 | 기존 유지 |
| `hands_up` | 기존 유지 | 기존 유지 | 기존 유지 | - |
| `wordcloud_items` | 기존 유지 | 기존 유지 | 기존 유지 | 기존 유지 |
| `quiz_answers` | 기존 유지 | 기존 유지 | 기존 유지 | - |

#### B-2-3. 기존 세션 소유권 처리

마이그레이션 전에 생성된 세션(`created_by = NULL`)의 처리 방침:

**방안 A: 소유권 포기 (읽기 전용)**

```sql
-- 마이그레이션 전 세션은 created_by가 NULL이므로
-- UPDATE/DELETE 정책에서 자동으로 차단됨
-- 프레젠테이션 진행(Realtime, slide:change broadcast)은 가능
-- 슬라이드 편집은 불가
```

**방안 B: 첫 접속자에게 소유권 부여 (추천)**

API 라우트에서 처리합니다. 발표자 페이지 접속 시 `created_by`가 `NULL`이면 현재 사용자를 소유자로 지정합니다.

```
발표자 페이지 접속:
  1. GET /api/sessions/[sessionId]
  2. session.created_by === null ?
     ├─ null → PATCH /api/sessions/[sessionId]/claim
     │         → UPDATE sessions SET created_by = auth.uid() WHERE id = sessionId AND created_by IS NULL
     │         → 성공: 소유권 획득
     │         → 실패 (이미 다른 사람이 선점): 참가자로 리다이렉트
     └─ not null → 기존 소유권 검증 진행
```

이 방식은 동시성 문제를 방지하기 위해 `WHERE created_by IS NULL` 조건으로 원자적 업데이트를 보장합니다.

#### B-2-4. 참가자 접근 보장

RLS 정책 변경 후 참가자가 기존과 동일하게 세션에 참여할 수 있는지 확인이 필요합니다.

| 참가자 동작 | 필요 권한 | 정책 상태 |
|---|---|---|
| 세션 정보 읽기 (제목, share_code) | `sessions SELECT` | 모든 인증 사용자 허용 |
| 세션 코드로 검증 | `sessions SELECT` | 모든 인증 사용자 허용 |
| 슬라이드 조회 | `slides SELECT` | 모든 인증 사용자 허용 |
| 투표 제출 | `votes INSERT` | 기존 유지 |
| 댓글 작성 | `comments INSERT` | 기존 유지 |
| 손들기 | `hands_up INSERT/UPDATE` | 기존 유지 |
| 워드클라우드 | `wordcloud_items INSERT/UPDATE` | 기존 유지 |
| 퀴즈 답변 | `quiz_answers INSERT` | 기존 유지 |
| 참가자 등록 | `participants INSERT` | 기존 유지 |

> **핵심**: 참가자도 익명 인증 상태이므로 `authenticated` 역할을 가집니다. 기존 "모든 사용자" 정책을 "TO authenticated"로 변경하더라도 참가자 동작에는 영향이 없습니다.

### B-3. API 라우트 상세 명세

#### B-3-1. `GET /api/sessions/mine` (신규)

**파일**: `src/app/api/sessions/mine/route.ts`

**의사 코드**:

```
async function GET(request):
  // 1. 인증
  userId = requireAuth(request)  // 실패 시 401 반환

  // 2. 쿼리
  sessions = supabase
    .from('sessions')
    .select('id, title, share_code, created_at, updated_at, slides(count), participants(count)')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })

  // 3. 응답
  return Response.json({
    sessions: sessions.map(s => ({
      id: s.id,
      title: s.title,
      share_code: s.share_code,
      created_at: s.created_at,
      updated_at: s.updated_at,
      slide_count: s.slides[0].count,
      participant_count: s.participants[0].count
    }))
  })
```

**에러 응답**:

| 상태 코드 | 조건 | 응답 본문 |
|---|---|---|
| 200 | 성공 | `{ sessions: SessionWithMeta[] }` |
| 401 | 인증되지 않음 | `{ error: "인증이 필요합니다." }` |
| 500 | 서버 에러 | `{ error: "세션 목록을 불러오는데 실패했습니다." }` |

#### B-3-2. `POST /api/sessions/create` (수정)

**파일**: `src/app/api/sessions/create/route.ts`

**현재 구현** (변경점):

```
기존 (line 33):
  created_by: "anonymous"

변경:
  created_by: userId  // requireAuth(request)에서 획득
```

**의사 코드**:

```
async function POST(request):
  // 1. 인증
  userId = requireAuth(request)  // 실패 시 401 반환

  // 2. 요청 본문 파싱
  { title } = await request.json()
  validate(title)  // 빈 문자열 검증

  // 3. share_code 생성 (기존과 동일)
  shareCode = generateShareCode()  // 6자리 영숫자

  // 4. 세션 생성
  session = supabase
    .from('sessions')
    .insert({ title, share_code: shareCode, created_by: userId })
    .select()
    .single()

  // 5. 응답
  return Response.json({ sessionId: session.id, shareCode: session.share_code })
```

**에러 응답**:

| 상태 코드 | 조건 | 응답 본문 |
|---|---|---|
| 200 | 성공 | `{ sessionId, shareCode }` |
| 400 | title 누락/빈 문자열 | `{ error: "제목을 입력해주세요." }` |
| 401 | 인증되지 않음 | `{ error: "인증이 필요합니다." }` |
| 500 | DB 에러 | `{ error: "세션 생성에 실패했습니다." }` |

#### B-3-3. `PATCH /api/sessions/[sessionId]/claim` (신규)

**파일**: `src/app/api/sessions/[sessionId]/claim/route.ts`

마이그레이션 전 세션(`created_by = NULL`)의 소유권을 첫 접속자에게 부여합니다.

**의사 코드**:

```
async function PATCH(request, { params }):
  // 1. 인증
  userId = requireAuth(request)

  // 2. 원자적 소유권 획득
  result = supabase
    .from('sessions')
    .update({ created_by: userId })
    .eq('id', params.sessionId)
    .is('created_by', null)  // WHERE created_by IS NULL
    .select()
    .single()

  // 3. 결과
  if (result.data):
    return Response.json({ success: true, session: result.data })
  else:
    // 이미 소유자가 있거나 세션이 존재하지 않음
    existingSession = supabase.from('sessions').select('created_by').eq('id', params.sessionId).single()
    if (!existingSession):
      return Response.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 })
    else:
      return Response.json({ error: "이미 소유자가 있는 세션입니다." }, { status: 403 })
```

**동시성 안전성**: `WHERE created_by IS NULL` 조건으로 두 사용자가 동시에 claim 시 한 명만 성공합니다. Supabase RLS 정책과 결합하여 원자적 업데이트가 보장됩니다.

**에러 응답**:

| 상태 코드 | 조건 | 응답 본문 |
|---|---|---|
| 200 | 소유권 획득 성공 | `{ success: true, session }` |
| 401 | 인증되지 않음 | `{ error: "인증이 필요합니다." }` |
| 403 | 이미 소유자 있음 | `{ error: "이미 소유자가 있는 세션입니다." }` |
| 404 | 세션 없음 | `{ error: "세션을 찾을 수 없습니다." }` |

#### B-3-4. `GET /api/sessions/[sessionId]` (수정)

**파일**: `src/app/api/sessions/[sessionId]/route.ts`

**변경점**: 응답에 `is_owner` 필드 추가

**의사 코드**:

```
async function GET(request, { params }):
  // 1. 인증 (선택적 — 참가자도 조회 가능해야 함)
  userId = getAuthenticatedUserId(request)  // null 허용

  // 2. 세션 조회
  session = supabase.from('sessions').select('*').eq('id', params.sessionId).single()

  // 3. 응답
  return Response.json({
    ...session,
    is_owner: userId !== null && session.created_by === userId
  })
```

#### B-3-5. `DELETE /api/sessions/[sessionId]` (신규)

**파일**: `src/app/api/sessions/[sessionId]/route.ts`

내 세션 목록에서 세션 삭제 기능입니다. RLS 정책으로 소유자만 삭제 가능하지만, API 레벨에서도 검증합니다.

**의사 코드**:

```
async function DELETE(request, { params }):
  // 1. 인증
  userId = requireAuth(request)

  // 2. 소유권 확인
  session = supabase.from('sessions').select('created_by').eq('id', params.sessionId).single()

  if (session.created_by !== userId):
    return Response.json({ error: "세션 소유자만 삭제할 수 있습니다." }, { status: 403 })

  // 3. 삭제 (CASCADE로 slides, participants 등도 함께 삭제됨)
  supabase.from('sessions').delete().eq('id', params.sessionId)

  // 4. 응답
  return Response.json({ success: true })
```

#### B-3-6. `POST /api/slides/[sessionId]` (수정)

**파일**: `src/app/api/slides/[sessionId]/route.ts`

**변경점**: 슬라이드 생성 시 세션 소유자 확인 추가

**의사 코드**:

```
async function POST(request, { params }):
  // 1. 인증
  userId = requireAuth(request)

  // 2. 세션 소유권 확인
  session = supabase.from('sessions').select('created_by').eq('id', params.sessionId).single()

  if (session.created_by !== userId):
    return Response.json({ error: "세션 소유자만 슬라이드를 추가할 수 있습니다." }, { status: 403 })

  // 3. 기존 슬라이드 생성 로직 (변경 없음)
  ...
```

**PUT, DELETE도 동일한 소유권 검증 로직 적용**.

#### B-3-7. 참가자 관련 API (변경 없음)

다음 API 라우트는 인증이 필요하지 않거나, 기존 방식대로 동작합니다. 변경하지 않습니다.

| 라우트 | 변경 여부 | 사유 |
|---|---|---|
| `POST /api/participants/join` | 변경 없음 | 참가자는 익명. 인증 필요하지 않음 |
| `POST /api/votes/submit` | 변경 없음 | 참가자 기능. 인증 필요하지 않음 |
| `POST /api/comments/submit` | 변경 없음 | 참가자 기능. 인증 필요하지 않음 |
| `POST /api/hands-up/toggle` | 변경 없음 | 참가자 기능. 인증 필요하지 않음 |
| `POST /api/wordcloud/submit` | 변경 없음 | 참가자 기능. 인증 필요하지 않음 |
| `POST /api/quiz/submit` | 변경 없음 | 참가자 기능. 인증 필요하지 않음 |

### B-4. 인증 요구사항 매트릭스

모든 API 엔드포인트의 인증 요구사항을 정리합니다.

| 엔드포인트 | 메서드 | 인증 필요 | 권한 검증 | 비고 |
|---|---|---|---|---|
| `/api/sessions/create` | POST | 필수 | 없음 (자동으로 자신 UID 설정) | |
| `/api/sessions/mine` | GET | 필수 | 없음 (자동으로 자신 세션만 조회) | |
| `/api/sessions/[id]` | GET | 선택 | `is_owner` 계산만 | 참가자도 조회 가능 |
| `/api/sessions/[id]/claim` | PATCH | 필수 | `created_by IS NULL` 확인 | |
| `/api/sessions/[id]` | DELETE | 필수 | `created_by = auth.uid()` | |
| `/api/sessions/validate/[code]` | GET | 불필요 | 없음 | |
| `/api/slides/[sessionId]` | GET | 불필요 | 없음 | 참가자도 조회 |
| `/api/slides/[sessionId]` | POST | 필수 | 세션 소유자 확인 | |
| `/api/slides/[sessionId]` | PUT | 필수 | 세션 소유자 확인 | |
| `/api/slides/[sessionId]` | DELETE | 필수 | 세션 소유자 확인 | |
| `/api/participants/join` | POST | 불필요 | 없음 | |
| `/api/votes/submit` | POST | 불필요 | 없음 | |
| `/api/votes/[slideId]` | GET | 불필요 | 없음 | |
| `/api/comments/submit` | POST | 불필요 | 없음 | |
| `/api/hands-up/toggle` | POST | 불필요 | 없음 | |
| `/api/wordcloud/submit` | POST | 불필요 | 없음 | |
| `/api/quiz/submit` | POST | 불필요 | 없음 | |

### B-5. 기존 클라이언트-서버 인증 흐름

현재 프로젝트는 클라이언트에서 `fetch`를 직접 호출하는 방식과 Supabase 클라이언트를 사용하는 방식이 혼재되어 있습니다. Anonymous Auth 도입 시 인증 토큰 전달 방식을 통일해야 합니다.

#### 현재 방식 (`src/lib/api.ts` 기준)

```
클라이언트 → fetch('/api/sessions/create', { method: 'POST', body: ... })
           → 서버 API 라우트에서 supabase 직접 호출
           → Authorization 헤더 없음
```

#### 변경 후 방식

```
클라이언트 → supabase 인스턴스를 통한 fetch
           → Authorization: Bearer {access_token} 자동 첨부
           → 서버 API 라우트에서 토큰 추출 후 auth.uid() 확인
```

**구현 옵션**:

| 옵션 | 방법 | 장단점 |
|---|---|---|
| **A. 수동 헤더 첨부** | `fetch` 호출 시 `supabase.auth.getSession()`에서 토큰을 가져와 Authorization 헤더에 수동 첨부 | 기존 `fetch` 패턴 유지. 매번 토큰 관리 코드 필요 |
| **B. Supabase 클라이언트 활용** | `supabase.functions.invoke()` 또는 `supabase.from()` 사용 | 토큰 자동 관리. 하지만 기존 fetch 패턴 변경 필요 |
| **C. 커스텀 fetch 래퍼** | `src/lib/api.ts`에 인증 헤더를 자동 첨부하는 래퍼 함수 추가 | 기존 패턴 유지 + 토큰 자동 관리. 추천 |

**추천: 옵션 C (커스텀 fetch 래퍼)**

`src/lib/api.ts`의 기존 함수들을 래핑하여 인증 헤더를 자동 첨부합니다.

```
기존:
  export async function createSession(title) {
    const res = await fetch('/api/sessions/create', { ... })
    ...
  }

변경:
  export async function createSession(title) {
    const token = await getAccessToken()  // supabase.auth.getSession()에서 추출
    const res = await fetch('/api/sessions/create', {
      ...
      headers: { 'Authorization': `Bearer ${token}` }
    })
    ...
  }
```

또는 공통 `authFetch` 유틸리티를 만들어 모든 API 호출에 적용:

```
async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = {
    ...options.headers,
    ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {})
  }
  return fetch(url, { ...options, headers })
}
```

### B-6. 데이터베이스 인덱스

소유권 기반 쿼리 성능을 위해 다음 인덱스를 추가합니다.

```sql
-- sessions 테이블: created_by로 내 세션 조회 시 사용
CREATE INDEX IF NOT EXISTS idx_sessions_created_by
  ON public.sessions (created_by);

-- sessions 테이블: created_by + created_at 복합 인덱스 (정렬 포함 조회)
CREATE INDEX IF NOT EXISTS idx_sessions_created_by_created_at
  ON public.sessions (created_by, created_at DESC);
```

**기존 인덱스**: `share_code`는 `UNIQUE` 제약으로 자동 인덱스 생성됨. `id`는 `PRIMARY KEY`로 자동 인덱스 생성됨.

### B-7. 마이그레이션 실행 순서

데이터베이스 변경사항은 다음 순서로 적용해야 합니다.

```
1. Supabase 콘솔 → Authentication → Providers → Anonymous Sign-ins 활성화

2. 마이그레이션 SQL 실행 (단일 트랜잭션 권장):
   a. sessions.created_by NULL 정리
   b. sessions.created_by 타입 변경 (text → uuid)
   c. 기존 RLS 정책 삭제
   d. 신규 RLS 정책 생성
   e. 인덱스 생성

3. 백엔드 코드 배포:
   a. src/lib/auth.ts 추가
   b. src/lib/supabase-server.ts 추가
   c. API 라우트 수정 (create, mine, claim, slides)
   d. src/lib/api.ts에 authFetch 래퍼 추가

4. 프론트엔드 코드 배포:
   a. AuthProvider 추가
   b. layout.tsx에 AuthProvider 통합
   c. 홈페이지, 발표자 페이지, 세션 생성 페이지 수정
   d. 신규 페이지 (my-sessions) 추가

5. 검증:
   a. 익명 로그인 → 세션 생성 → 브라우저 종료 → 재접속 → 세션 목록 확인
   b. 마이그레이션 전 세션 접속 → 소유권 claim → 정상 동작 확인
   c. 참가자 세션 참여 → 투표/댓글/퀴즈 정상 동작 확인
   d. 타인의 세션 ID로 발표자 접속 시도 → 403 확인
```

### B-8. 백엔드 변경 파일 요약

| 파일 | 유형 | 변경 내용 |
|---|---|---|
| `supabase/migrations/..._anonymous_auth.sql` | 신규 | 전체 마이그레이션 SQL |
| `src/lib/auth.ts` | 신규 | `getAuthenticatedUserId`, `requireAuth` 함수 |
| `src/lib/supabase-server.ts` | 신규 | 서버 사이드 Supabase 클라이언트 |
| `src/app/api/sessions/mine/route.ts` | 신규 | `GET` 내 세션 목록 API |
| `src/app/api/sessions/[sessionId]/claim/route.ts` | 신규 | `PATCH` 세션 소유권 획득 API |
| `src/app/api/sessions/create/route.ts` | 수정 | `created_by`를 `auth.uid()`로 변경 |
| `src/app/api/sessions/[sessionId]/route.ts` | 수정 | `GET`: `is_owner` 추가. `DELETE`: 소유권 검증 추가 |
| `src/app/api/slides/[sessionId]/route.ts` | 수정 | `POST/PUT/DELETE` 소유권 검증 추가 |
| `src/lib/api.ts` | 수정 | `authFetch` 래퍼 추가, 기존 함수들에 인증 헤더 첨부 |

## 고려사항

### 보안

| 항목 | 내용 |
|---|---|
| 익명 세션 도용 | 익명 사용자의 JWT 탈취 시 세션 접근 가능. 하지만 익명 세션은 브라우저 localStorage에 저장되며, 기기에 종속적 |
| 세션 ID 추측 | UUID v4이므로 사실상 불가능 |
| Rate limit | Supabase에서 익명 로그인 시 IP당 시간당 30회 제한. CAPTCHA(Turnstile) 도입 권장 |
| Presenter 권한 | `created_by = auth.uid()` 검증으로 세션 소유자만 발표자 기능 사용 가능 |

### 제한사항

| 항목 | 내용 | 해결 시점 |
|---|---|---|
| 다른 기기 접속 | 익명 세션은 브라우저에 종속되어 다른 기기에서 복구 불가 | 소셜 로그인 도입 시 해결 |
| 브라우저 데이터 초기화 | localStorage 삭제 시 익명 세션丢失 | 소셜 로그인 도입 시 해결 |
| 익명 계정 정리 | 장기 미사용 익명 계정 정리 필요 | SQL 스케줄러 또는 Cron job |
| 세션당 모더레이터 1명 | 공동 발표 불가 | 추후 collaborator 기능 고려 |

### 익명 계정 자동 정리

장기간 미사용된 익명 계정의 정리 SQL (선택사항):

```sql
-- 30일 이상 된 익명 계정 삭제
DELETE FROM auth.users
WHERE is_anonymous IS true
  AND created_at < NOW() - INTERVAL '30 days';
```

## 관련 파일

| 파일 | 변경 필요 여부 | 내용 |
|---|---|---|
| `src/lib/supabase.ts` | 수정 | Auth 초기화 로직 추가 |
| `src/app/api/sessions/create/route.ts` | 수정 | `created_by`를 `auth.uid()`로 변경 |
| `src/app/creator/page.tsx` | 수정 | 세션 생성 시 UID 전달 |
| `src/app/session/[sessionId]/presenter/page.tsx` | 수정 | 발표자 권한 검증 |
| `src/app/my-sessions/page.tsx` | 신규 | 내 세션 목록 페이지 |
| `src/app/api/sessions/mine/route.ts` | 신규 | 내 세션 목록 API |
| `src/hooks/useAuth.ts` | 신규 | 인증 상태 관리 훅 |
| `SUPABASE_SETUP.md` | 수정 | RLS 정책 업데이트 반영 |

## 참고 자료

- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase Social Login](https://supabase.com/docs/guides/auth/social-login)
- [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

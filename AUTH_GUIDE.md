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

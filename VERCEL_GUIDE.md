# Phase 7: Vercel 배포 가이드 (Vercel Deployment Guide)

Real-Slide 프로젝트를 Vercel에 배포하여 누구나 접속 가능한 실시간 발표 플랫폼을 만듭니다.

## 1단계: 프로젝트를 GitHub에 푸시

```bash
git add .
git commit -m "Phase 7: 배포 및 보안 설정 완료"
git push origin main
```

## 2단계: Vercel에서 프로젝트 가져오기

1. [Vercel 대시보드](https://vercel.com/dashboard)에 접속합니다.
2. **Add New...** -> **Project**를 클릭합니다.
3. GitHub 저장소에서 `real-slide`를 선택하고 **Import**를 클릭합니다.

## 3단계: 환경 변수(Environment Variables) 설정

**이 단계가 매우 중요합니다!**

프로젝트의 **Environment Variables** 섹션에서 다음 두 가지를 추가합니다. (기존 `.env.local`의 값과 동일해야 함)

| Key | Value (예시) |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-id.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI... (Anon Key)` |

## 4단계: 빌드 및 배포 (Deploy)

1. `Build Command`가 `next build`인지 확인합니다.
2. `Install Command`가 `npm install`인지 확인합니다.
3. **Deploy** 버튼을 클릭합니다.
4. 배포가 완료되면 `real-slide.vercel.app`과 같은 도메인이 생성됩니다.

---

## 5단계: Supabase 도메인 화이트리스트 (CORS)

배포된 Vercel URL을 Supabase에 등록하여 보안을 강화합니다.

1. [Supabase Dashboard](https://supabase.com/dashboard) -> **Authentication** -> **URL Configuration** 으로 이동합니다.
2. **Additional Redirect URLs** 에 자신의 Vercel 도메인을 추가합니다 (예: `https://real-slide.vercel.app`).
3. **Site URL** 은 기본적으로 Vercel 도메인으로 설정하는 것을 권장합니다.

## 6단계: 성능 최적화 (Vercel 전용)

- Vercel은 Edge Runtime을 지원합니다. 성능 향상이 필요한 API 엔드포인트 상단에 `export const runtime = 'edge'`를 추가할 수 있습니다.
- (참주의) 현재는 개발 완료 단계이므로 기본 설정을 유지하는 것이 가장 안정적입니다.

---

## 배포 후 점검 리스트 (Post-Deployment Checklist)

- [ ] 배포 URL로 접속 시 메인 페이지가 정상 로드되는가?
- [ ] `/creator`에서 세션 생성이 가능한가?
- [ ] 생성된 코드로 참여자 뷰(` /join`) 진입이 가능한가?
- [ ] 발표자와 참여자 간의 실시간 동기화가 원활한가? (Vercel 전역망 지연 확인)
- [ ] 로그아웃 후 다시 접속 시 닉네임 유지가 되는가?

배포 중 문제가 발생하면 `PHASE7_REPORT.md`의 트러블슈팅 섹션을 참조하세요.

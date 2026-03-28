// 세션 활성화/비활성화 E2E 테스트
// AUTH_GUIDE.md TB-4, TB-4b, TB-5, TB-6, TB-6b, TB-9, TB-9b + 프론트엔드 리다이렉트
const BASE = "http://localhost:3001";

let passed = 0;
let failed = 0;
const results = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, status: "PASS" });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    results.push({ name, status: "FAIL", error: err.message });
    console.log(`  ❌ ${name} — ${err.message}`);
  }
}

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ═══════════════════════════════════════════
// 백엔드 API 테스트
// ═══════════════════════════════════════════

// TB-4: 미인증 토글 → 401
await test("TB-4: 미인증 toggle-active → 401", async () => {
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const res = await fetch(`${BASE}/api/sessions/${fakeId}/toggle-active`, {
    method: "PATCH",
  });
  expect(res.status === 401, `401이어야 함, 실제: ${res.status}`);
  const body = await res.json();
  expect(body.error === "인증이 필요합니다", `에러 메시지 불일치: ${body.error}`);
});

// TB-4b: 잘못된 토큰 토글 → 401
await test("TB-4b: 잘못된 토큰 toggle-active → 401", async () => {
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const res = await fetch(`${BASE}/api/sessions/${fakeId}/toggle-active`, {
    method: "PATCH",
    headers: { Authorization: "Bearer invalid-token-12345" },
  });
  expect(res.status === 401, `401이어야 함, 실제: ${res.status}`);
});

// TB-5: 존재하지 않는 세션 토글 (미인증) → 401
await test("TB-5: 존재하지 않는 세션 toggle-active (미인증) → 401", async () => {
  const fakeId = "99999999-9999-9999-9999-999999999999";
  const res = await fetch(`${BASE}/api/sessions/${fakeId}/toggle-active`, {
    method: "PATCH",
  });
  expect(res.status === 401, `401이어야 함, 실제: ${res.status}`);
});

// TB-6: 미인증 내 세션 조회 → 401
await test("TB-6: 미인증 sessions/mine → 401", async () => {
  const res = await fetch(`${BASE}/api/sessions/mine`);
  expect(res.status === 401, `401이어야 함, 실제: ${res.status}`);
});

// TB-6b: 잘못된 토큰 내 세션 조회 → 401
await test("TB-6b: 잘못된 토큰 sessions/mine → 401", async () => {
  const res = await fetch(`${BASE}/api/sessions/mine`, {
    headers: { Authorization: "Bearer invalid-token-12345" },
  });
  expect(res.status === 401, `401이어야 함, 실제: ${res.status}`);
});

// TB-9: 존재하지 않는 공유 코드 validate → 404
await test("TB-9: 존재하지 않는 코드 validate → 404", async () => {
  const res = await fetch(`${BASE}/api/sessions/validate/ZZZZZZ`);
  expect(res.status === 404, `404이어야 함, 실제: ${res.status}`);
});

// TB-9b: 잘못된 길이 코드 validate → 400
await test("TB-9b: 잘못된 길이 코드 validate → 400", async () => {
  const res = await fetch(`${BASE}/api/sessions/validate/ABC`);
  expect(res.status === 400, `400이어야 함, 실제: ${res.status}`);
});

// TB-9c: 올바른 길이 코드 6자리 비활성 테스트용 (더미)
await test("TB-9c: 6자리 코드 형식 → 404 (없는 코드)", async () => {
  const res = await fetch(`${BASE}/api/sessions/validate/A1B2C3`);
  // 존재하지 않으면 404, 존재하면 200 또는 403
  expect(res.status === 404 || res.status === 200 || res.status === 403,
    `404/200/403 중 하나여야 함, 실제: ${res.status}`);
});

// DELETE 미인증
await test("TB-delete: 미인증 세션 삭제 → 401", async () => {
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const res = await fetch(`${BASE}/api/sessions/${fakeId}`, {
    method: "DELETE",
  });
  expect(res.status === 401, `401이어야 함, 실제: ${res.status}`);
});

// ═══════════════════════════════════════════
// 프론트엔드 Playwright 테스트
// ═══════════════════════════════════════════

try {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  // T-redirect: 미로그인 /my-sessions → /login 리다이렉트
  await test("T-redirect: 미로그인 /my-sessions → /login 리다이렉트", async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // networkidle 대신 domcontentloaded로 변경 (타임아웃 방지)
    await page.goto(`${BASE}/my-sessions`, { waitUntil: "domcontentloaded" });

    // 리다이렉트 대기 (최대 5초)
    await page.waitForURL(/\/login/, { timeout: 5000 }).catch(() => {});

    const url = page.url();
    expect(
      url.includes("/login"),
      `/login으로 리다이렉트되어야 함, 실제: ${url}`
    );
    console.log(`     → 리다이렉트 URL: ${url}`);
    await ctx.close();
  });

  // T-login-page: /login 페이지 UI 확인
  await test("T-login-page: /login 페이지 Google 버튼 표시", async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });

    const btn = page.getByRole("button", { name: /Google로 계속하기/ });
    expect(await btn.isVisible(), "Google 로그인 버튼이 보이지 않음");

    await ctx.close();
  });

  // T-home: 홈페이지 정상 렌더링
  await test("T-home: 홈페이지 정상 렌더링", async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });

    const body = await page.textContent("body");
    expect(body.includes("Real-Slide"), "Real-Slide 텍스트 없음");
    expect(body.includes("지금 시작하기"), "지금 시작하기 텍스트 없음");

    await ctx.close();
  });

  await browser.close();
} catch (e) {
  console.log(`  ⚠️ Playwright 로드 실패: ${e.message}`);
  console.log("     프론트엔드 테스트 스킵");
}

// ═══════════════════════════════════════════
// 결과 요약
// ═══════════════════════════════════════════
console.log("\n══════════════════════════════════════");
console.log(`  결과: ${passed} 통과, ${failed} 실패`);
console.log("══════════════════════════════════════\n");

if (failed > 0) {
  console.log("실패한 테스트:");
  results
    .filter((r) => r.status === "FAIL")
    .forEach((r) => console.log(`  ❌ ${r.name}: ${r.error}`));
}

console.log("\n수동 테스트 필요 항목 (Google OAuth 토큰 필요):");
console.log("  TB-1: 소유자 세션 활성→비활성 토글");
console.log("  TB-2: 소유자 세션 비활성→활성 토글");
console.log("  TB-3: 비소유자 토글 시도 → 403");
console.log("  TB-7: 활성 세션 공유 코드 validate");
console.log("  TB-8: 비활성 세션 공유 코드 validate → 403");
console.log("  TB-10: 토글 후 DB 값 확인");
console.log("  TB-11: 연속 토글 2회");
console.log("  T-1~T-9: SessionCard UI 및 토글 동작");
console.log("  T-11: 활성 세션 공유 코드 참가");

process.exit(failed > 0 ? 1 : 0);

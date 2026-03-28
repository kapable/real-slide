import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Authorization 헤더에서 인증된 사용자 UID를 추출합니다.
 * 서버 API 라우트에서만 사용합니다.
 */
export async function getAuthenticatedUserId(
  request: NextRequest,
): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  return user?.id ?? null;
}

/**
 * 인증이 필요한 API 라우트에서 사용합니다.
 * 인증되지 않은 경우 401 에러를 throw합니다.
 */
export async function requireAuth(request: NextRequest): Promise<string> {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    throw new Response(JSON.stringify({ error: "인증이 필요합니다" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return userId;
}

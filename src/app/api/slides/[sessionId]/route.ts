import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("❌ 환경 변수가 설정되지 않았습니다");
      return NextResponse.json(
        {
          error: "환경 변수가 설정되지 않았습니다",
          details: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseAnonKey,
          },
        },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log(`📝 슬라이드 조회 요청: sessionId=${sessionId}`);

    const { data, error } = await supabase
      .from("slides")
      .select("*")
      .eq("session_id", sessionId)
      .order("order");

    if (error) {
      console.error("❌ Supabase 쿼리 에러:", error);
      return NextResponse.json(
        {
          error: error.message,
          details: {
            code: error.code,
            hint: error.hint,
          },
        },
        { status: 500 },
      );
    }

    console.log(`✅ 슬라이드 조회 성공: ${data?.length || 0}개`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ API 에러:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "서버 오류",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const userId = await requireAuth(request);
    const { sessionId } = await params;
    const { type, title, content, options, correctAnswer, metadata } =
      await request.json();

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("❌ 환경 변수가 설정되지 않았습니다");
      return NextResponse.json(
        { error: "환경 변수가 설정되지 않았습니다" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 소유권 검증
    const { data: session } = await supabase
      .from("sessions")
      .select("created_by")
      .eq("id", sessionId)
      .single();

    if (!session || session.created_by !== userId) {
      return NextResponse.json(
        { error: "세션 소유자만 슬라이드를 추가할 수 있습니다" },
        { status: 403 },
      );
    }

    console.log(
      `📝 슬라이드 추가 요청: sessionId=${sessionId}, type=${type}, title=${title}`,
    );

    // Get current max order
    const { data: maxData, error: maxError } = await supabase
      .from("slides")
      .select("order")
      .eq("session_id", sessionId)
      .order("order", { ascending: false })
      .limit(1);

    if (maxError) {
      console.error("❌ 최대 order 조회 실패:", maxError);
    }

    const nextOrder = (maxData?.[0]?.order || 0) + 1;

    const { data, error } = await supabase
      .from("slides")
      .insert([
        {
          session_id: sessionId,
          order: nextOrder,
          type: type || "slide",
          title: title || "",
          content: content || "",
          options: type === "slide"
            ? (metadata ? JSON.stringify(metadata) : null)
            : (options || null),
          correct_answer: (correctAnswer !== undefined && correctAnswer !== null) ? correctAnswer : null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ 슬라이드 추가 실패:", error);
      return NextResponse.json(
        {
          error: error.message,
          details: { code: error.code, hint: error.hint },
        },
        { status: 500 },
      );
    }

    console.log(`✅ 슬라이드 추가 성공: id=${data.id}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("❌ POST API 에러:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "서버 오류",
      },
      { status: 500 },
    );
  }
}

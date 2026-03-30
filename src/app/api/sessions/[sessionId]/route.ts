import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, requireAuth } from "@/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 소유자 여부 확인
    const currentUserId = await getAuthenticatedUserId(request);
    const is_owner = currentUserId ? data.created_by === currentUserId : false;

    return NextResponse.json({ ...data, is_owner });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { current_slide_index } = body;

    if (typeof current_slide_index !== "number") {
      return NextResponse.json(
        { error: "current_slide_index is required" },
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { error } = await supabase
      .from("sessions")
      .update({ current_slide_index })
      .eq("id", sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const userId = await requireAuth(request);
    const { sessionId } = await params;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 세션 존재 및 소유권 확인
    const { data: session } = await supabase
      .from("sessions")
      .select("created_by")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    if (session.created_by !== userId) {
      return NextResponse.json(
        { error: "세션 소유자만 삭제할 수 있습니다" },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 },
    );
  }
}

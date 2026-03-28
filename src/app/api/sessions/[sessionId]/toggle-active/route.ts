import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function PATCH(
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
      .select("created_by, is_active")
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
        { error: "세션 소유자만 변경할 수 있습니다" },
        { status: 403 },
      );
    }

    const newActive = !session.is_active;

    const { error } = await supabase
      .from("sessions")
      .update({ is_active: newActive })
      .eq("id", sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ is_active: newActive });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 },
    );
  }
}

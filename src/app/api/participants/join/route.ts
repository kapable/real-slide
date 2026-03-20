import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { sessionId, nickname } = await request.json();

    if (!sessionId || !nickname?.trim()) {
      return NextResponse.json(
        { error: "필수 필드가 없습니다" },
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. 기존 참여자가 있는지 확인 (세션 내 닉네임 기준)
    const { data: existing, error: findError } = await supabase
      .from("participants")
      .select("id")
      .eq("session_id", sessionId)
      .eq("nickname", nickname.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ participantId: existing.id });
    }

    // 2. 신규 참여자 추가
    const { data, error } = await supabase
      .from("participants")
      .insert([
        {
          session_id: sessionId,
          nickname: nickname.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
       console.error("Join insert error:", error);
       return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ participantId: data.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 },
    );
  }
}

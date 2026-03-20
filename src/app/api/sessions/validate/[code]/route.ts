import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code: rawCode } = await params;
    const code = rawCode.toUpperCase();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: "유효하지 않은 코드입니다" },
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from("sessions")
      .select("id")
      .eq("share_code", code)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    return NextResponse.json({ sessionId: data.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 },
    );
  }
}

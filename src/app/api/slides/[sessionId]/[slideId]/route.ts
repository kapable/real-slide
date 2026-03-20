import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; slideId: string }> },
) {
  try {
    const { sessionId, slideId } = await params;
    const body = await request.json();

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from("slides")
      .update(body)
      .eq("id", slideId)
      .eq("session_id", sessionId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; slideId: string }> },
) {
  try {
    const { sessionId, slideId } = await params;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { error } = await supabase
      .from("slides")
      .delete()
      .eq("id", slideId)
      .eq("session_id", sessionId);

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

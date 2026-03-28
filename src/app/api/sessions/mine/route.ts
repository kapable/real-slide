import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from("sessions")
      .select(`
        *,
        slides:slides(count),
        participants:participants(count)
      `)
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sessions = data.map((s: any) => ({
      id: s.id,
      title: s.title,
      share_code: s.share_code,
      created_at: s.created_at,
      slide_count: s.slides?.[0]?.count ?? 0,
      participant_count: s.participants?.[0]?.count ?? 0,
    }));

    return NextResponse.json(sessions);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 },
    );
  }
}

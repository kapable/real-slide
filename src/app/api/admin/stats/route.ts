import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch all counts in parallel
    const [sessionsResult, participantsResult, slidesResult] = await Promise.all([
      supabase.from("sessions").select("id, created_at", { count: "exact", head: false }),
      supabase.from("participants").select("id", { count: "exact", head: true }),
      supabase.from("slides").select("id", { count: "exact", head: true }),
    ]);

    // Calculate active sessions (created in last 24 hours)
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const activeSessions = sessionsResult.data?.filter(
      (s) => new Date(s.created_at) >= twentyFourHoursAgo
    ).length || 0;

    return NextResponse.json({
      totalSessions: sessionsResult.count || 0,
      activeSessions,
      totalParticipants: participantsResult.count || 0,
      totalSlides: slidesResult.count || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

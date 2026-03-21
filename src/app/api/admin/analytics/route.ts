import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Fetch sessions over time
    const { data: sessions } = await supabase
      .from("sessions")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    // Fetch participants over time
    const { data: participants } = await supabase
      .from("participants")
      .select("joined_at")
      .gte("joined_at", startDate.toISOString())
      .order("joined_at", { ascending: true });

    // Fetch slide types distribution
    const { data: slides } = await supabase
      .from("slides")
      .select("type");

    // Fetch all sessions for engagement metrics
    const { data: allSessions } = await supabase
      .from("sessions")
      .select("id, title, created_at");

    // Get participant counts per session
    const sessionCounts: Record<string, number> = {};
    const { data: participantData } = await supabase
      .from("participants")
      .select("session_id");

    participantData?.forEach((p) => {
      sessionCounts[p.session_id] = (sessionCounts[p.session_id] || 0) + 1;
    });

    // Aggregate by day
    const sessionsByDay: Record<string, number> = {};
    const participantsByDay: Record<string, number> = {};

    sessions?.forEach((s) => {
      const day = new Date(s.created_at).toISOString().split("T")[0];
      sessionsByDay[day] = (sessionsByDay[day] || 0) + 1;
    });

    participants?.forEach((p) => {
      const day = new Date(p.joined_at).toISOString().split("T")[0];
      participantsByDay[day] = (participantsByDay[day] || 0) + 1;
    });

    // Generate date range
    const dateRange: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateRange.push(d.toISOString().split("T")[0]);
    }

    // Format sessions over time
    const sessionsOverTime = dateRange.map((date) => ({
      date,
      count: sessionsByDay[date] || 0,
    }));

    // Format participants over time
    const participantsOverTime = dateRange.map((date) => ({
      date,
      count: participantsByDay[date] || 0,
    }));

    // Slide types distribution
    const slideTypes: Record<string, number> = {};
    slides?.forEach((s) => {
      slideTypes[s.type] = (slideTypes[s.type] || 0) + 1;
    });

    const slideTypeDistribution = Object.entries(slideTypes).map(([type, count]) => ({
      type,
      count,
    }));

    // Engagement metrics
    const totalParticipants = participantData?.length || 0;
    const totalSessionsCount = allSessions?.length || 0;
    const avgParticipantsPerSession = totalSessionsCount > 0
      ? Math.round(totalParticipants / totalSessionsCount * 10) / 10
      : 0;

    // Most active sessions (top 5)
    const mostActiveSessions = (allSessions || [])
      .map((s) => ({
        id: s.id,
        title: s.title,
        participantCount: sessionCounts[s.id] || 0,
      }))
      .sort((a, b) => b.participantCount - a.participantCount)
      .slice(0, 5);

    // Peak usage hours
    const hourCounts: Record<number, number> = {};
    participants?.forEach((p) => {
      const hour = new Date(p.joined_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakUsageHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const response = NextResponse.json({
      sessionsOverTime,
      participantsOverTime,
      slideTypeDistribution,
      engagement: {
        totalSessions: totalSessionsCount,
        totalParticipants,
        avgParticipantsPerSession,
        mostActiveSessions,
        peakUsageHours,
      },
    });

    // Cache for 60 seconds to reduce database load
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

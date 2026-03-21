import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("sessions")
      .select("id, title, share_code, created_at", { count: "exact" });

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,share_code.ilike.%${search}%`);
    }

    // Apply status filter (active = created in last 24 hours)
    if (status === "active") {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("created_at", twentyFourHoursAgo);
    } else if (status === "inactive") {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.lt("created_at", twentyFourHoursAgo);
    }

    // Apply pagination and ordering
    const { data: sessions, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch participant counts for each session
    const sessionsWithCounts = await Promise.all(
      (sessions || []).map(async (session) => {
        const { count: participantCount } = await supabase
          .from("participants")
          .select("id", { count: "exact", head: true })
          .eq("session_id", session.id);

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const isActive = new Date(session.created_at) >= twentyFourHoursAgo;

        return {
          ...session,
          participantCount: participantCount || 0,
          isActive,
        };
      })
    );

    return NextResponse.json({
      sessions: sessionsWithCounts,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

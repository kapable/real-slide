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
      .select("id, title, share_code, created_at, is_active", { count: "exact" });

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,share_code.ilike.%${search}%`);
    }

    // Apply status filter based on is_active column
    if (status === "active") {
      query = query.eq("is_active", true);
    } else if (status === "inactive") {
      query = query.eq("is_active", false);
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

        return {
          ...session,
          participantCount: participantCount || 0,
          isActive: session.is_active ?? true,
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

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { is_active } = await request.json();

    if (typeof is_active !== "boolean") {
      return NextResponse.json({ error: "is_active boolean is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("sessions")
      .update({ is_active })
      .neq("is_active", is_active);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, is_active });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// GET /api/hands-up/status?sessionId=...&participantId=...
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const participantId = searchParams.get("participantId");

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!sessionId || !participantId || !uuidRegex.test(sessionId) || !uuidRegex.test(participantId)) {
      return NextResponse.json({ is_up: false });
    }

    const { data, error } = await supabase
      .from("hands_up")
      .select("is_up")
      .eq("session_id", sessionId)
      .eq("participant_id", participantId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching hands up status:", error);
      return NextResponse.json({ error: error.message, is_up: false }, { status: 500 });
    }

    return NextResponse.json({ is_up: data?.is_up || false });
  } catch (err: any) {
    console.error("Unexpected error in hands-up status:", err);
    return NextResponse.json({ error: err.message, is_up: false }, { status: 500 });
  }
}

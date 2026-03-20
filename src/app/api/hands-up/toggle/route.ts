// POST /api/hands-up/toggle
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, participantId, nickname, isUp } = await req.json();

    if (!sessionId || !participantId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check if record exists
    const { data: existing } = await supabase
      .from("hands_up")
      .select("id")
      .eq("session_id", sessionId)
      .eq("participant_id", participantId)
      .single();

    let data, error;

    if (existing) {
      // Update existing
      const result = await supabase
        .from("hands_up")
        .update({
          is_up: isUp,
          toggled_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select();
      data = result.data;
      error = result.error;
    } else {
      // Insert new
      const result = await supabase
        .from("hands_up")
        .insert({
          session_id: sessionId,
          participant_id: participantId,
          nickname: nickname || "Anonymous",
          is_up: isUp,
        })
        .select();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Error toggling hands up:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data?.[0]);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

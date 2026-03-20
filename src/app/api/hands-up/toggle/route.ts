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

    // UUID Format Validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId) || !uuidRegex.test(participantId)) {
       return NextResponse.json(
        { error: "Invalid ID format (must be UUID)" },
        { status: 400 },
      );
    }

    // Check if record exists
    const { data: existing, error: findError } = await supabase
      .from("hands_up")
      .select("id")
      .eq("session_id", sessionId)
      .eq("participant_id", participantId)
      .maybeSingle();

    if (findError) {
      console.error("Error finding hands up record:", findError);
      return NextResponse.json(
        { error: findError.message, details: findError },
        { status: 500 }
      );
    }

    let data, error;
    const now = new Date().toISOString();

    if (existing) {
      // Update existing
      const result = await supabase
        .from("hands_up")
        .update({
          is_up: isUp,
          toggled_at: now,
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
          toggled_at: now,
        })
        .select();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Error toggling hands up:", error);
      return NextResponse.json(
        { error: error.message, details: error }, 
        { status: 500 }
      );
    }

    return NextResponse.json(data?.[0] || { success: true });
  } catch (error: any) {
    console.error("Unexpected error in hands-up toggle:", error);
    return NextResponse.json(
      { 
        error: "Internal Server Error", 
        message: error.message,
        stack: error.stack 
      },
      { status: 500 },
    );
  }
}

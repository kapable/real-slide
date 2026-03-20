// POST /api/comments/submit
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { slideId, participantId, nickname, text, parentId } = await req.json();

    if (!slideId || !text) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate participant_id: must be a valid UUID or null (presenter case)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validParticipantId = participantId && uuidRegex.test(participantId) 
      ? participantId 
      : null;

    const { data, error } = await supabase
      .from("comments")
      .insert({
        slide_id: slideId,
        participant_id: validParticipantId,
        parent_id: parentId || null,
        nickname: nickname || "발표자",
        text,
        likes: 0,
      })
      .select();

    if (error) {
      console.error("Error inserting comment:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

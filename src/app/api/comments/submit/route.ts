// POST /api/comments/submit
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { slideId, participantId, nickname, text } = await req.json();

    if (!slideId || !participantId || !text) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        slide_id: slideId,
        participant_id: participantId,
        nickname: nickname || "Anonymous",
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

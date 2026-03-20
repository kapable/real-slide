import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await params;

    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("likes")
      .eq("id", commentId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("comments")
      .update({ likes: (comment?.likes || 0) + 1 })
      .eq("id", commentId)
      .select();

    if (error) {
      console.error("Error updating likes:", error);
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

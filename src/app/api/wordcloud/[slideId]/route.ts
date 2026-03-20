import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slideId: string }> },
) {
  try {
    const { slideId } = await params;

    const { data, error } = await supabase
      .from("wordcloud_items")
      .select("*")
      .eq("slide_id", slideId)
      .order("count", { ascending: false });

    if (error) {
      console.error("Error fetching wordcloud items:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE /api/wordcloud/[slideId]?wordId=xxx  - delete specific word
// DELETE /api/wordcloud/[slideId]             - delete all words for slide
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slideId: string }> },
) {
  try {
    const { slideId } = await params;
    const { searchParams } = new URL(req.url);
    const wordId = searchParams.get("wordId");

    let error;

    if (wordId) {
      // Delete specific word
      const result = await supabase
        .from("wordcloud_items")
        .delete()
        .eq("id", wordId)
        .eq("slide_id", slideId);
      error = result.error;
    } else {
      // Delete all words for this slide
      const result = await supabase
        .from("wordcloud_items")
        .delete()
        .eq("slide_id", slideId);
      error = result.error;
    }

    if (error) {
      console.error("Error deleting wordcloud items:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

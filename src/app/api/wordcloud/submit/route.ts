// POST /api/wordcloud/submit
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { slideId, word } = await req.json();

    if (!slideId || !word) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const normalizedWord = word.trim().toLowerCase();

    // Check if word already exists
    const { data: existing } = await supabase
      .from("wordcloud_items")
      .select("id, count")
      .eq("slide_id", slideId)
      .eq("word", normalizedWord)
      .single();

    let data, error;

    if (existing) {
      // Increment count
      const result = await supabase
        .from("wordcloud_items")
        .update({ count: existing.count + 1 })
        .eq("id", existing.id)
        .select();
      data = result.data;
      error = result.error;
    } else {
      // Insert new
      const result = await supabase
        .from("wordcloud_items")
        .insert({
          slide_id: slideId,
          word: normalizedWord,
          count: 1,
        })
        .select();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Error submitting wordcloud item:", error);
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

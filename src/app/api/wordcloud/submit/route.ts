// POST /api/wordcloud/submit
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { slideId, word, participantId } = await req.json();

    if (!slideId || !word) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const normalizedWord = word.trim().toLowerCase();

    // Check slide metadata for one-per-user setting
    if (participantId) {
      const { data: slideData } = await supabase
        .from("slides")
        .select("options, type")
        .eq("id", slideId)
        .single();

      if (slideData?.type === "slide" && slideData?.options) {
        try {
          const metadata = JSON.parse(slideData.options);
          if (metadata.wordcloud_one_per_user) {
            const { data: existingSubmission } = await supabase
              .from("wordcloud_items")
              .select("id")
              .eq("slide_id", slideId)
              .eq("submitted_by", participantId)
              .maybeSingle();

            if (existingSubmission) {
              return NextResponse.json(
                { error: "이미 답변을 제출하셨습니다.", code: "ALREADY_SUBMITTED" },
                { status: 409 },
              );
            }
          }
        } catch {
          // options is not valid JSON metadata, ignore
        }
      }
    }

    // Atomic upsert via RPC function (eliminates TOCTOU race condition)
    const { data, error } = await supabase.rpc("increment_wordcloud_word", {
      p_slide_id: slideId,
      p_word: normalizedWord,
      p_participant_id: participantId || null,
    });

    if (error) {
      console.error("Error submitting wordcloud item:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

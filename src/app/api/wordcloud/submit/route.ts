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
            // Check if participant already submitted to this slide
            const storageKey = `wc-submitted-${slideId}-${participantId}`;
            // We can't check localStorage on server, so check by looking for existing submissions
            // Use a simple approach: check wordcloud_submissions tracking
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
      const insertData: any = {
        slide_id: slideId,
        word: normalizedWord,
        count: 1,
      };
      
      // Store participant_id if provided (for one-per-user tracking)
      if (participantId) {
        insertData.submitted_by = participantId;
      }

      const result = await supabase
        .from("wordcloud_items")
        .insert(insertData)
        .select();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Error submitting wordcloud item:", error);
      // If submitted_by column doesn't exist, retry without it
      if (error.message?.includes("submitted_by")) {
        const retryResult = await supabase
          .from("wordcloud_items")
          .insert({
            slide_id: slideId,
            word: normalizedWord,
            count: 1,
          })
          .select();
        if (retryResult.error) {
          return NextResponse.json({ error: retryResult.error.message }, { status: 500 });
        }
        return NextResponse.json(retryResult.data?.[0]);
      }
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

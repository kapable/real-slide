import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { slideId, participantId, optionIndex } = await request.json();

    if (!slideId || !participantId || optionIndex === undefined) {
      return NextResponse.json(
        { error: "필수 필드가 없습니다" },
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check if already voted
    const { data: existing } = await supabase
      .from("votes")
      .select("id")
      .eq("slide_id", slideId)
      .eq("participant_id", participantId)
      .single();

    if (existing) {
      // Update existing vote
      const { data, error } = await supabase
        .from("votes")
        .update({ option_index: optionIndex })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    } else {
      // Insert new vote
      const { data, error } = await supabase
        .from("votes")
        .insert([
          {
            slide_id: slideId,
            participant_id: participantId,
            option_index: optionIndex,
          },
        ])
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 },
    );
  }
}

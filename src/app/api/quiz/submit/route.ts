import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { slideId, participantId, answerIndex } = await request.json();

    if (!slideId || !participantId || answerIndex === undefined) {
      return NextResponse.json(
        { error: "필수 필드가 없습니다" },
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 슬라이드 정보 가져오기 (정답 확인용)
    const { data: slide, error: slideError } = await supabase
      .from("slides")
      .select("correct_answer")
      .eq("id", slideId)
      .single();

    if (slideError || !slide) {
      return NextResponse.json(
        { error: "슬라이드를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    const isCorrect = slide.correct_answer === answerIndex;

    // 이미 제출했는지 확인
    const { data: existing } = await supabase
      .from("quiz_answers")
      .select("id")
      .eq("slide_id", slideId)
      .eq("participant_id", participantId)
      .single();

    if (existing) {
      // 기존 답변 업데이트
      const { data, error } = await supabase
        .from("quiz_answers")
        .update({ 
          answer_index: answerIndex,
          is_correct: isCorrect
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    } else {
      // 새 답변 추가
      const { data, error } = await supabase
        .from("quiz_answers")
        .insert([
          {
            slide_id: slideId,
            participant_id: participantId,
            answer_index: answerIndex,
            is_correct: isCorrect
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

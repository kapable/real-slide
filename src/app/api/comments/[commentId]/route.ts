// src/app/api/comments/[commentId]/route.ts
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// PATCH: 댓글 수정
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { text, participantId } = await req.json();
    const { commentId } = await params;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // 1. 기존 댓글 조회 (작성자 확인용)
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("participant_id")
      .eq("id", commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // 보안: 작성자 본인만 수정 가능 (발표자라 하더라도 남의 글 수정은 안 됨)
    // 발표자로 작성된 글은 participant_id 가 null임
    if (comment.participant_id !== (participantId === "presenter" ? null : participantId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("comments")
      .update({ text })
      .eq("id", commentId)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: 댓글 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const { searchParams } = new URL(req.url);
    const participantId = searchParams.get("participantId");

    // 1. 기존 댓글 조회
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("participant_id")
      .eq("id", commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // 보안: 작성자 본인 또는 발표자만 삭제 가능
    const isOwner = comment.participant_id === (participantId === "presenter" ? null : participantId);
    const isPresenter = participantId === "presenter";

    if (!isOwner && !isPresenter) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

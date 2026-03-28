import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, is_active } = body;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Toggle active/inactive
    if (typeof is_active === "boolean" && !title) {
      const { data, error } = await supabase
        .from("sessions")
        .update({ is_active })
        .eq("id", id)
        .select("is_active")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ is_active: data.is_active });
    }

    // Update title
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("sessions")
      .update({ title: title.trim() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Delete related data first (cascade)
    // Get all slides for this session
    const { data: slides } = await supabase
      .from("slides")
      .select("id")
      .eq("session_id", id);

    if (slides && slides.length > 0) {
      const slideIds = slides.map((s) => s.id);

      // Delete votes
      await supabase.from("votes").delete().in("slide_id", slideIds);

      // Delete quiz answers
      await supabase.from("quiz_answers").delete().in("slide_id", slideIds);

      // Delete wordcloud items
      await supabase.from("wordcloud").delete().in("slide_id", slideIds);

      // Delete comments
      await supabase.from("comments").delete().in("slide_id", slideIds);

      // Delete slides
      await supabase.from("slides").delete().eq("session_id", id);
    }

    // Delete hands up records
    await supabase.from("hands_up").delete().eq("session_id", id);

    // Delete participants
    await supabase.from("participants").delete().eq("session_id", id);

    // Finally delete the session
    const { error } = await supabase.from("sessions").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

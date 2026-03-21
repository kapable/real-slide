import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slideId: string }> }
) {
  try {
    const { slideId } = await params;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Delete related data first
    await supabase.from("votes").delete().eq("slide_id", slideId);
    await supabase.from("quiz_answers").delete().eq("slide_id", slideId);
    await supabase.from("wordcloud").delete().eq("slide_id", slideId);
    await supabase.from("comments").delete().eq("slide_id", slideId);

    // Delete the slide
    const { error } = await supabase.from("slides").delete().eq("id", slideId);

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

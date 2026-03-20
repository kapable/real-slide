import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slideId: string }> },
) {
  try {
    const { slideId } = await params;

    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("slide_id", slideId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
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

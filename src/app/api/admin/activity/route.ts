import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface Activity {
  id: string;
  type: "session_created" | "participant_joined" | "vote_submitted" | "quiz_answered";
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const activities: Activity[] = [];

    // Fetch recent sessions
    const { data: recentSessions } = await supabase
      .from("sessions")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    recentSessions?.forEach((session) => {
      activities.push({
        id: `session-${session.id}`,
        type: "session_created",
        message: `Session "${session.title}" created`,
        timestamp: session.created_at,
        metadata: { sessionId: session.id },
      });
    });

    // Fetch recent participants
    const { data: recentParticipants } = await supabase
      .from("participants")
      .select("id, nickname, joined_at, session_id")
      .order("joined_at", { ascending: false })
      .limit(5);

    recentParticipants?.forEach((participant) => {
      activities.push({
        id: `participant-${participant.id}`,
        type: "participant_joined",
        message: `"${participant.nickname}" joined a session`,
        timestamp: participant.joined_at,
        metadata: { sessionId: participant.session_id },
      });
    });

    // Fetch recent votes
    const { data: recentVotes } = await supabase
      .from("votes")
      .select("id, created_at, slide_id")
      .order("created_at", { ascending: false })
      .limit(5);

    recentVotes?.forEach((vote) => {
      activities.push({
        id: `vote-${vote.id}`,
        type: "vote_submitted",
        message: "New vote submitted",
        timestamp: vote.created_at,
        metadata: { slideId: vote.slide_id },
      });
    });

    // Fetch recent quiz answers
    const { data: recentQuizAnswers } = await supabase
      .from("quiz_answers")
      .select("id, created_at, slide_id, is_correct")
      .order("created_at", { ascending: false })
      .limit(5);

    recentQuizAnswers?.forEach((answer) => {
      activities.push({
        id: `quiz-${answer.id}`,
        type: "quiz_answered",
        message: `Quiz answer submitted (${answer.is_correct ? "correct" : "incorrect"})`,
        timestamp: answer.created_at,
        metadata: { slideId: answer.slide_id },
      });
    });

    // Sort all activities by timestamp and limit to 10
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedActivities = activities.slice(0, 10);

    return NextResponse.json(limitedActivities);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

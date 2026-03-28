// Supabase API 유틸리티
import { supabase } from "./supabase";
import { Session, SessionWithMeta, Slide, Participant } from "@/types";

/**
 * Supabase 세션에서 토큰을 가져와 Authorization 헤더를 자동 첨부합니다.
 */
async function authFetch(url: string, options: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return fetch(url, { ...options, headers });
}

// Session 관리
export const createSession = async (title: string) => {
  const { data, error } = await supabase
    .from("sessions")
    .insert([
      {
        title,
        share_code: generateShareCode(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as Session;
};

export const getSession = async (sessionId: string) => {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) throw error;
  return data as Session;
};

export const getSessionByCode = async (code: string) => {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("share_code", code.toUpperCase())
    .single();

  if (error) throw error;
  return data as Session;
};

export const getMySessions = async (): Promise<SessionWithMeta[]> => {
  const response = await authFetch("/api/sessions/mine");
  if (!response.ok) throw new Error("내 세션 조회 실패");
  return response.json();
};

export const claimSession = async (sessionId: string): Promise<void> => {
  const response = await authFetch(`/api/sessions/${sessionId}/claim`, {
    method: "PATCH",
  });
  if (!response.ok) throw new Error("세션 소유권 획득 실패");
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  const response = await authFetch(`/api/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "삭제 실패" }));
    throw new Error(data.error || "세션 삭제 실패");
  }
};

// Slide 관리
export const getSlides = async (sessionId: string) => {
  const { data, error } = await supabase
    .from("slides")
    .select("*")
    .eq("session_id", sessionId)
    .order("order");

  if (error) throw error;
  return data as Slide[];
};

export const addSlide = async (sessionId: string, slide: Omit<Slide, "id">) => {
  const { data, error } = await supabase
    .from("slides")
    .insert([{ ...slide, session_id: sessionId }])
    .select()
    .single();

  if (error) throw error;
  return data as Slide;
};

export const updateSlide = async (slideId: string, updates: Partial<Slide>) => {
  const { data, error } = await supabase
    .from("slides")
    .update(updates)
    .eq("id", slideId)
    .select()
    .single();

  if (error) throw error;
  return data as Slide;
};

export const deleteSlide = async (slideId: string) => {
  const { error } = await supabase.from("slides").delete().eq("id", slideId);

  if (error) throw error;
};

// Participant 관리
export const addParticipant = async (sessionId: string, nickname: string) => {
  const { data, error } = await supabase
    .from("participants")
    .insert([{ session_id: sessionId, nickname }])
    .select()
    .single();

  if (error) throw error;
  return data as Participant;
};

export const getParticipants = async (sessionId: string) => {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("session_id", sessionId);

  if (error) throw error;
  return data as Participant[];
};

// Helper functions
function generateShareCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

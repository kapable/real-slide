// Supabase API 유틸리티
import { supabase } from "./supabase";
import { Session, Slide, Participant } from "@/types";

// Session 관리
export const createSession = async (title: string) => {
  const { data, error } = await supabase
    .from("sessions")
    .insert([
      {
        title,
        share_code: generateShareCode(),
        created_by: "anonymous",
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

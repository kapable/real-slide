// 타입 정의
export interface Session {
  id: string;
  created_by: string;
  title: string;
  share_code: string;
  created_at: string;
  updated_at: string;
}

export interface Slide {
  id: string;
  session_id: string;
  order: number;
  type: "slide" | "vote" | "quiz";
  title: string;
  content: string;
  options?: string; // JSON 배열을 문자열로 저장 (투표/퀴즈 선택지)
  correct_answer?: number; // 퀴즈용
  show_result?: boolean; // 정답 공개 여부
}

export interface Participant {
  id: string;
  session_id: string;
  nickname: string;
  joined_at: string;
}

export interface Vote {
  id: string;
  slide_id: string;
  participant_id: string;
  option_index: number;
}

export interface Comment {
  id: string;
  slide_id: string;
  participant_id: string | null;
  parent_id?: string | null;
  nickname: string;
  text: string;
  likes: number;
  created_at: string;
}

export interface HandUp {
  id: string;
  session_id: string;
  participant_id: string;
  nickname: string;
  is_up: boolean;
  toggled_at: string;
}

export interface WordcloudItem {
  id: string;
  slide_id: string;
  word: string;
  count: number;
}

export interface QuizAnswer {
  id: string;
  slide_id: string;
  participant_id: string;
  answer_index: number;
  is_correct: boolean;
}

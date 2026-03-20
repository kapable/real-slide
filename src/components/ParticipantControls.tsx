// src/components/ParticipantControls.tsx
"use client";

import { useState } from "react";
import { Hand, MessageSquare } from "lucide-react";

interface ParticipantControlsProps {
  sessionId: string;
  slideId: string;
  participantId: string;
  nickname: string;
}

export default function ParticipantControls({
  sessionId,
  slideId,
  participantId,
  nickname,
}: ParticipantControlsProps) {
  const [handUp, setHandUp] = useState(false);
  const [wordcloudInput, setWordcloudInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleHand = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/hands-up/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          participantId,
          nickname,
          isUp: !handUp,
        }),
      });

      if (res.ok) {
        setHandUp(!handUp);
      }
    } catch (error) {
      console.error("Error toggling hand:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitWordcloud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordcloudInput.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/wordcloud/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideId,
          word: wordcloudInput,
        }),
      });

      if (res.ok) {
        setWordcloudInput("");
      }
    } catch (error) {
      console.error("Error submitting wordcloud:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-3 p-4 bg-gray-50 border-t border-gray-200 flex-wrap">
      {/* Hands Up Button */}
      <button
        onClick={handleToggleHand}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
          handUp
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
        } disabled:opacity-50`}
      >
        <Hand size={18} />손 {handUp ? "내리기" : "들기"}
      </button>

      {/* Wordcloud Input */}
      <form onSubmit={handleSubmitWordcloud} className="flex gap-2 flex-1">
        <input
          type="text"
          placeholder="단어를 입력하세요..."
          value={wordcloudInput}
          onChange={(e) => setWordcloudInput(e.target.value)}
          disabled={isLoading}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading || !wordcloudInput.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition font-medium text-sm"
        >
          <MessageSquare size={18} />
        </button>
      </form>
    </div>
  );
}

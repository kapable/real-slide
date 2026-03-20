// src/components/HandsUpPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { HandUp } from "@/types";
import { Hand } from "lucide-react";

interface HandsUpPanelProps {
  sessionId: string;
}

export default function HandsUpPanel({ sessionId }: HandsUpPanelProps) {
  const [handsUp, setHandsUp] = useState<HandUp[]>([]);

  // Fetch hands up participants
  const fetchHandsUp = async () => {
    try {
      const res = await fetch(`/api/hands-up/${sessionId}`);
      const data = await res.json();
      setHandsUp(data);
    } catch (error) {
      console.error("Error fetching hands up:", error);
    }
  };

  useEffect(() => {
    fetchHandsUp();
  }, [sessionId]);

  // Poll for updates every 2s
  useEffect(() => {
    const interval = setInterval(fetchHandsUp, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleResetHand = async (handId: string) => {
    try {
      const res = await fetch("/api/hands-up/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          participantId: handsUp.find((h) => h.id === handId)?.participant_id,
          isUp: false,
        }),
      });

      if (res.ok) {
        fetchHandsUp();
      }
    } catch (error) {
      console.error("Error resetting hand:", error);
    }
  };

  return (
    <div className="bg-gradient-to-b from-amber-50 to-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Hand size={20} className="text-orange-600" />
        <h3 className="font-semibold text-gray-900">
          손 들은 사람 ({handsUp.length})
        </h3>
      </div>

      {handsUp.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-6">
          손 든 참여자가 없습니다
        </p>
      ) : (
        <div className="space-y-2">
          {handsUp.map((hand) => (
            <div
              key={hand.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 hover:shadow-sm transition"
            >
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-900">
                  {hand.nickname}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(hand.toggled_at).toLocaleTimeString("ko-KR")}
                </p>
              </div>
              <button
                onClick={() => handleResetHand(hand.id)}
                className="ml-2 px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition"
              >
                완료
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

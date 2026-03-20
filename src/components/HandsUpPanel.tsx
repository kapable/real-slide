"use client";

import { useState, useEffect } from "react";
import { HandUp } from "@/types";
import { Hand, Clock, User, Check, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";

interface HandsUpPanelProps {
  sessionId: string;
}

export default function HandsUpPanel({ sessionId }: HandsUpPanelProps) {
  const [handsUp, setHandsUp] = useState<HandUp[]>([]);

  // Fetch hands up participants
  const fetchHandsUp = async () => {
    try {
      const res = await fetch(`/api/hands-up/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setHandsUp(data);
    } catch (error) {
      console.error("Error fetching hands up:", error);
    }
  };

  useRealtimeChannel(`hands-up-${sessionId}`, {
    onPostgresChanges: (payload) => {
      // hands_up 테이블의 변화가 생기면 무조건 다시 불러오기
      if (payload.table === "hands_up") {
         fetchHandsUp();
      }
    },
  });

  useEffect(() => {
    fetchHandsUp();
  }, [sessionId]);

  const handleResetHand = async (handId: string) => {
    const targetHand = handsUp.find((h) => h.id === handId);
    if (!targetHand) return;

    try {
      const res = await fetch("/api/hands-up/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          participantId: targetHand.participant_id,
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
    <div className="flex flex-col h-full bg-amber-50/30 dark:bg-amber-950/10 backdrop-blur-sm rounded-xl border border-amber-200/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 h-14 flex items-center justify-between border-b border-amber-200/50 bg-amber-100/30">
        <div className="flex items-center gap-2">
          <div className="bg-amber-500/10 p-1.5 rounded-lg text-amber-600">
            <Hand className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-sm tracking-tight text-amber-900 dark:text-amber-100">
            손 들기 리스트
          </h3>
        </div>
        <Badge variant="outline" className="h-5 text-[10px] font-bold px-2 bg-amber-500/10 border-amber-200 text-amber-700">
          {handsUp.length}
        </Badge>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 p-4">
        {handsUp.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 opacity-40">
            <div className="bg-amber-100 p-3 rounded-full">
              <Hand className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-xs font-medium text-amber-900/60">현재 질문 대기 중인<br />참여자가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {handsUp.map((hand) => (
              <div
                key={hand.id}
                className="group relative bg-background/80 border border-amber-200/50 rounded-xl p-3 shadow-sm hover:shadow-md transition-all animate-in fade-in zoom-in-95"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-amber-900 dark:text-amber-100 truncate">
                        {hand.nickname}
                      </p>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-700/60 uppercase tracking-wider">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(hand.toggled_at).toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleResetHand(hand.id)}
                    className="h-8 w-8 rounded-full p-0 hover:bg-amber-200 hover:text-amber-800 text-amber-600 focus:ring-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Hand, Sparkles, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ParticipantControlsProps {
  sessionId: string;
  slideId: string;
  participantId: string;
  nickname: string;
  broadcastFn?: (event: string, payload: any) => void;
}

export default function ParticipantControls({
  sessionId,
  slideId,
  participantId,
  nickname,
  broadcastFn,
}: ParticipantControlsProps) {
  const [handUp, setHandUp] = useState(false);
  const [wordcloudInput, setWordcloudInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch initial hand status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/hands-up/status?sessionId=${sessionId}&participantId=${participantId}`);
        if (res.ok) {
           const { is_up } = await res.json();
           setHandUp(is_up);
        }
      } catch (e) {}
    };
    if (sessionId && participantId) fetchStatus();
  }, [sessionId, participantId]);
  
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
        const newStatus = !handUp;
        setHandUp(newStatus);
        broadcastFn?.("hands-up:change", { 
          participantId, 
          nickname, 
          isUp: newStatus,
          toggledAt: new Date().toISOString()
        });
      } else {
        const errorData = await res.json();
        console.error("Failed to toggle hand:", errorData);
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
          participantId,
        }),
      });

      if (res.ok) {
        setWordcloudInput("");
      } else if (res.status === 409) {
        const errorData = await res.json();
        alert(errorData.error || "이미 답변을 제출하셨습니다.");
      }
    } catch (error) {
      console.error("Error submitting wordcloud:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 mb-4 sm:mb-8 pointer-events-none">
      <div className={cn(
        "glass px-6 py-5 rounded-[2.5rem] flex flex-col gap-5 glass-shadow border-white/20 animate-in slide-in-from-bottom-12 duration-700 w-full sm:w-[500px] pointer-events-auto",
        "bg-background/95 backdrop-blur-3xl shadow-[0_12px_60px_-15px_rgba(0,0,0,0.4)]"
      )}>
        {/* 1. Top Row: Large Input Field */}
        <form onSubmit={handleSubmitWordcloud} className="w-full flex flex-col gap-4">
          <div className="relative group">
            <Input
              type="text"
              placeholder="여러분의 생각을 자유롭게 입력하세요..."
              value={wordcloudInput}
              onChange={(e) => setWordcloudInput(e.target.value)}
              disabled={isLoading}
              className={cn(
                "h-16 pl-5 pr-14 rounded-3xl bg-muted/40 border-2 border-transparent transition-all text-base font-semibold placeholder:text-muted-foreground/40",
                "focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary/20 focus-visible:bg-muted/60"
              )}
            />
            {wordcloudInput && (
              <button
                type="button"
                onClick={() => setWordcloudInput("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
  
          {/* 2. Bottom Row: Utility Buttons */}
          <div className="flex items-center justify-between gap-4">
            {/* Hand Raise (Left) */}
            <Button
              type="button"
              onClick={handleToggleHand}
              disabled={isLoading}
              variant={handUp ? "destructive" : "secondary"}
              size="lg"
              className={cn(
                "h-14 px-8 rounded-2xl gap-3 font-black transition-all active:scale-[0.95] relative overflow-hidden group",
                handUp 
                  ? "bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/30" 
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              {isLoading && !wordcloudInput.trim() ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Hand className={cn("h-5 w-5 transition-transform group-hover:rotate-12", handUp && "fill-current")} />
              )}
              <span className="text-xs uppercase tracking-widest">손 {handUp ? "내리기" : "들기"}</span>
              {handUp && (
                <span className="absolute top-0 right-0 flex h-2 w-2 m-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </Button>
  
            {/* Send Button (Right) */}
            <Button
              type="submit"
              disabled={isLoading || !wordcloudInput.trim()}
              size="lg"
              className="h-14 px-10 rounded-2xl shadow-2xl shadow-primary/30 transition-all hover:translate-y-[-2px] active:translate-y-0 active:scale-[0.95] flex items-center gap-3 bg-primary hover:bg-primary/90"
            >
              {isLoading && wordcloudInput.trim() ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span className="font-black text-sm uppercase tracking-wider">전송</span>
                  <Sparkles className="h-5 w-5 text-primary-foreground/80" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

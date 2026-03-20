"use client";

import { useState } from "react";
import { Hand, MessageSquare, Cloud, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";

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

  const { broadcast } = useRealtimeChannel(`session-${sessionId}`);

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
        broadcast("hands-up:change", { 
          participantId, 
          nickname, 
          isUp: newStatus,
          toggledAt: new Date().toISOString()
        });
      } else {
        const errorData = await res.json();
        console.error("Failed to toggle hand:", errorData);
        alert(`손 들기 실패: ${errorData.message || errorData.error || "서버 오류"}`);
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
    <div className="glass px-4 py-2.5 rounded-3xl flex items-center gap-3 glass-shadow border-white/20 animate-in slide-in-from-bottom-8 duration-500">
      {/* Hands Up Button */}
      <Button
        onClick={handleToggleHand}
        disabled={isLoading}
        variant={handUp ? "destructive" : "outline"}
        size="lg"
        className={cn(
          "h-12 rounded-2xl gap-2 font-black uppercase text-[10px] tracking-widest transition-all active:scale-[0.98]",
          handUp 
            ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20" 
            : "bg-background/50 hover:bg-accent border-muted"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Hand size={16} />
        )}
        <span>손 {handUp ? "내리기" : "들기"}</span>
      </Button>

      <div className="w-[1px] h-6 bg-muted-foreground/10 mx-1" />

      {/* Wordcloud Input */}
      <form onSubmit={handleSubmitWordcloud} className="flex items-center gap-2 group">
        <div className="relative flex items-center w-48 sm:w-64">
           <Cloud className="absolute left-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
           <Input
            type="text"
            placeholder="단어를 보내주세요..."
            value={wordcloudInput}
            onChange={(e) => setWordcloudInput(e.target.value)}
            disabled={isLoading}
            className="h-12 pl-10 pr-4 rounded-2xl bg-background/50 border-muted focus-visible:ring-primary/20 text-xs font-medium"
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading || !wordcloudInput.trim()}
          size="icon"
          className="h-12 w-12 rounded-2xl shadow-lg shadow-primary/10 transition-all active:scale-[0.98]"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles size={18} />
          )}
        </Button>
      </form>
    </div>
  );
}

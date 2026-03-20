"use client";

import { useState, useEffect } from "react";
import { Comment } from "@/types";
import { Heart, Send, MessageSquare, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CommentSectionProps {
  slideId: string;
  participantId: string;
  nickname: string;
  className?: string;
}

export default function CommentSection({
  slideId,
  participantId,
  nickname,
  className,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  // Fetch initial comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/comments/list/${slideId}`);
        if (!res.ok) return;
        const data = await res.json();
        setComments(data);
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };

    if (slideId) fetchComments();
  }, [slideId]);

  // Polling for updates
  useEffect(() => {
    if (!slideId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/comments/list/${slideId}`);
        if (!res.ok) return;
        const data = await res.json();
        setComments(data);
      } catch (error) {
        console.error("Error polling comments:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [slideId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !slideId) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/comments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideId,
          participantId,
          nickname,
          text: newComment,
        }),
      });

      if (res.ok) {
        setNewComment("");
        const updated = await fetch(`/api/comments/list/${slideId}`);
        const data = await updated.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (likedComments.has(commentId)) return;

    try {
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
      });

      if (res.ok) {
        setLikedComments(new Set(likedComments).add(commentId));
        const updated = await fetch(`/api/comments/list/${slideId}`);
        const data = await updated.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background/50 backdrop-blur-sm rounded-xl border border-border overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 h-14 flex items-center justify-between border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-sm tracking-tight text-foreground">
            실시간 Q&A
          </h3>
        </div>
        <Badge variant="secondary" className="h-5 text-[10px] font-bold px-2">
          {comments.length}
        </Badge>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1 p-4">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-40">
            <div className="bg-muted p-3 rounded-full">
              <MessageSquare className="h-6 w-6" />
            </div>
            <p className="text-xs font-medium">아직 의견이 없습니다.<br />가장 먼저 질문을 남겨보세요!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="group relative bg-background border rounded-xl p-3 shadow-sm hover:shadow-md hover:border-primary/20 transition-all animate-in fade-in slide-in-from-bottom-2"
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="font-bold text-xs text-foreground truncate max-w-[120px]">
                      {comment.nickname}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLikeComment(comment.id)}
                    disabled={likedComments.has(comment.id)}
                    className={cn(
                      "h-7 px-2 rounded-full gap-1 text-[10px] font-bold transition-all",
                      likedComments.has(comment.id) 
                        ? "text-red-500 bg-red-50" 
                        : "text-muted-foreground hover:text-red-500 hover:bg-red-50"
                    )}
                  >
                    <Heart
                      size={12}
                      className={cn(likedComments.has(comment.id) && "fill-current")}
                    />
                    {comment.likes > 0 && <span>{comment.likes}</span>}
                  </Button>
                </div>
                <p className="text-sm text-foreground/80 leading-snug break-words px-1">
                  {comment.text}
                </p>
                <div className="flex items-center gap-1.5 mt-2 px-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(comment.created_at).toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input Form */}
      <div className="p-4 border-t bg-muted/30">
        <form onSubmit={handleSubmitComment} className="flex gap-2 relative">
          <Input
            placeholder={slideId ? "궁금한 점이나 의견을 남겨주세요..." : "슬라이드가 선택되지 않았습니다"}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isLoading || !slideId}
            className="flex-1 h-10 text-xs pr-10 bg-background focus-visible:ring-primary/30"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !newComment.trim() || !slideId}
            className="h-10 w-10 shrink-0 shadow-lg shadow-primary/20"
          >
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}

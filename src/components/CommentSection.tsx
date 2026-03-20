"use client";

import { useState, useEffect, useMemo } from "react";
import { Comment } from "@/types";
import { 
  Heart, 
  Send, 
  MessageSquare, 
  Clock, 
  User, 
  Trash2, 
  Edit2, 
  Reply, 
  X,
  Check
} from "lucide-react";
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
  
  // States for Edit / Reply
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const isPresenter = participantId === "presenter";

  // Fetch comments
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

  useEffect(() => {
    if (slideId) fetchComments();
  }, [slideId]);

  // Polling
  useEffect(() => {
    if (!slideId) return;
    const interval = setInterval(fetchComments, 2000);
    return () => clearInterval(interval);
  }, [slideId]);

  // Group comments into parent-child structure
  const groupedComments = useMemo(() => {
    const parents = comments.filter(c => !c.parent_id);
    const children = comments.filter(c => c.parent_id);
    return parents.map(p => ({
      ...p,
      replies: children.filter(c => c.parent_id === p.id)
    }));
  }, [comments]);

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
          parentId: replyingTo?.id || null
        }),
      });

      if (res.ok) {
        setNewComment("");
        setReplyingTo(null);
        fetchComments();
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
      const res = await fetch(`/api/comments/${commentId}/like`, { method: "POST" });
      if (res.ok) {
        setLikedComments(new Set(likedComments).add(commentId));
        fetchComments();
      }
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("정말 이 질문을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/comments/${commentId}?participantId=${participantId}`, {
        method: "DELETE",
      });
      if (res.ok) fetchComments();
      else alert("삭제 권한이 없습니다.");
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText, participantId }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchComments();
      } else alert("수정 권한이 없습니다.");
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
  };

  // Helper to check if user is the owner
  const isOwner = (comment: Comment) => {
    if (isPresenter) return comment.participant_id === null;
    return comment.participant_id === participantId;
  };

  return (
    <div className={cn("flex flex-col h-full bg-background/50 backdrop-blur-sm rounded-xl border border-border overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 h-14 flex items-center justify-between border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-sm tracking-tight">실시간 Q&A</h3>
        </div>
        <Badge variant="secondary" className="h-5 text-[10px] font-bold px-2">
          {comments.length}
        </Badge>
      </div>

      {/* Reply Banner */}
      {replyingTo && (
        <div className="bg-primary/5 px-4 py-2 flex items-center justify-between border-b animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 overflow-hidden">
            <Reply className="h-3 w-3 text-primary shrink-0" />
            <span className="text-[10px] text-primary font-bold truncate">
              {replyingTo.nickname}님에게 답글 작성 중...
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-primary/10" onClick={() => setReplyingTo(null)}>
            <X className="h-3 w-3 text-primary" />
          </Button>
        </div>
      )}

      {/* Comments List */}
      <ScrollArea className="flex-1 p-4">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-40">
            <MessageSquare className="h-6 w-6" />
            <p className="text-xs font-medium">아직 질문이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedComments.map((parent) => (
              <div key={parent.id} className="space-y-3">
                {/* Parent Comment */}
                <CommentCard
                  comment={parent}
                  isOwner={isOwner(parent)}
                  isPresenter={isPresenter}
                  liked={likedComments.has(parent.id)}
                  onLike={() => handleLikeComment(parent.id)}
                  onDelete={() => handleDeleteComment(parent.id)}
                  onEdit={() => startEditing(parent)}
                  onReply={() => setReplyingTo(parent)}
                  isEditing={editingId === parent.id}
                  editText={editText}
                  setEditText={setEditText}
                  onUpdate={() => handleUpdateComment(parent.id)}
                  onCancelEdit={() => setEditingId(null)}
                />

                {/* Replies */}
                {parent.replies.length > 0 && (
                  <div className="pl-6 space-y-3 border-l-2 border-muted ml-3">
                    {parent.replies.map((reply) => (
                      <CommentCard
                        key={reply.id}
                        comment={reply}
                        isOwner={isOwner(reply)}
                        isPresenter={isPresenter}
                        isReply
                        liked={likedComments.has(reply.id)}
                        onLike={() => handleLikeComment(reply.id)}
                        onDelete={() => handleDeleteComment(reply.id)}
                        onEdit={() => startEditing(reply)}
                        isEditing={editingId === reply.id}
                        editText={editText}
                        setEditText={setEditText}
                        onUpdate={() => handleUpdateComment(reply.id)}
                        onCancelEdit={() => setEditingId(null)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input Form */}
      <div className="p-4 border-t bg-muted/30">
        <form onSubmit={handleSubmitComment} className="flex gap-2 relative">
          <Input
            placeholder={replyingTo ? "답글을 입력하세요..." : "궁금한 점을 남겨주세요..."}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isLoading || !slideId}
            className="flex-1 h-10 text-xs bg-background"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !newComment.trim() || !slideId}
            className="h-10 w-10 shrink-0"
          >
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}

// Sub-component for individual comment cards
function CommentCard({ 
  comment, isOwner, isPresenter, isReply, liked, onLike, onDelete, onEdit, onReply, 
  isEditing, editText, setEditText, onUpdate, onCancelEdit 
}: any) {
  return (
    <div className={cn(
      "group relative bg-background border rounded-xl p-3 transition-all",
      isReply ? "p-2 bg-muted/20" : "shadow-sm hover:shadow-md",
      isPresenter && comment.participant_id === null && "border-primary/30 bg-primary/5"
    )}>
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
            comment.participant_id === null ? "bg-primary/20" : "bg-muted"
          )}>
            <User className={cn("h-3 w-3", comment.participant_id === null ? "text-primary" : "text-muted-foreground")} />
          </div>
          <span className={cn(
            "font-bold text-xs truncate max-w-[100px]",
            comment.participant_id === null && "text-primary"
          )}>
            {comment.nickname}
            {comment.participant_id === null && <span className="ml-1 opacity-50 text-[9px] uppercase">Host</span>}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Actions: visible on hover or mobile */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
            {!isEditing && isOwner && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            {!isReply && onReply && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={onReply}>
                <Reply className="h-3 w-3" />
              </Button>
            )}
            {(isOwner || isPresenter) && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            disabled={liked}
            className={cn("h-7 px-2 rounded-full gap-1 text-[10px] font-bold", liked ? "text-red-500 bg-red-50" : "text-muted-foreground")}
          >
            <Heart size={12} className={cn(liked && "fill-current")} />
            {comment.likes > 0 && <span>{comment.likes}</span>}
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="flex gap-1 mt-1">
          <Input 
            value={editText} 
            onChange={(e) => setEditText(e.target.value)} 
            className="h-8 text-xs flex-1"
            autoFocus
          />
          <Button size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600" onClick={onUpdate}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={onCancelEdit}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <p className="text-sm text-foreground/80 leading-snug break-words px-1">
          {comment.text}
        </p>
      )}

      <div className="flex items-center gap-1.5 mt-2 px-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
        <Clock className="h-2.5 w-2.5" />
        {new Date(comment.created_at).toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

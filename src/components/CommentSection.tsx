// src/components/CommentSection.tsx
"use client";

import { useState, useEffect } from "react";
import { Comment } from "@/types";
import { Heart, Send } from "lucide-react";

interface CommentSectionProps {
  slideId: string;
  participantId: string;
  nickname: string;
}

export default function CommentSection({
  slideId,
  participantId,
  nickname,
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
        const data = await res.json();
        setComments(data);
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };

    fetchComments();
  }, [slideId]);

  // Subscribe to new comments via polling (for realtime without Supabase subscription)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/comments/list/${slideId}`);
        const data = await res.json();
        setComments(data);
      } catch (error) {
        console.error("Error polling comments:", error);
      }
    }, 2000); // Poll every 2s

    return () => clearInterval(interval);
  }, [slideId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

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
        // Refetch comments
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
    if (likedComments.has(commentId)) return; // Prevent double-like

    try {
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
      });

      if (res.ok) {
        setLikedComments(new Set(likedComments).add(commentId));
        // Refetch comments
        const updated = await fetch(`/api/comments/list/${slideId}`);
        const data = await updated.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          의견 ({comments.length})
        </h3>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">
            아직 댓글이 없습니다
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-sm text-gray-900">
                  {comment.nickname}
                </span>
                <button
                  onClick={() => handleLikeComment(comment.id)}
                  disabled={likedComments.has(comment.id)}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-500 disabled:opacity-50 transition"
                >
                  <Heart
                    size={14}
                    className={
                      likedComments.has(comment.id)
                        ? "fill-red-500 text-red-500"
                        : ""
                    }
                  />
                  {comment.likes > 0 && <span>{comment.likes}</span>}
                </button>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {comment.text}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(comment.created_at).toLocaleTimeString("ko-KR")}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input Form */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <form onSubmit={handleSubmitComment} className="flex gap-2">
          <input
            type="text"
            placeholder="의견을 입력하세요..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading || !newComment.trim()}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

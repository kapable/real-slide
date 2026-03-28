"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Presentation, Users, Clock, Play, Trash2, Copy, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionWithMeta } from "@/types";

interface SessionCardProps {
  session: SessionWithMeta;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
}

export default function SessionCard({ session, onDelete, onToggleActive }: SessionCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isActive, setIsActive] = useState(session.is_active);
  const [isToggling, setIsToggling] = useState(false);

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(session.share_code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(session.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setIsToggling(true);
    try {
      await onToggleActive(session.id, checked);
      setIsActive(checked);
    } catch {
      // 실패 시 이전 상태 유지
    } finally {
      setIsToggling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "오늘";
    if (diffDays === 1) return "어제";
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  };

  return (
    <>
      <Card className={cn(
        "group hover:shadow-lg transition-all duration-200",
        isDeleting && "opacity-50 pointer-events-none",
        !isActive && "opacity-60"
      )}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/session/${session.id}/presenter`}
                  className="hover:underline"
                >
                  <h3 className="font-bold text-lg tracking-tight truncate">
                    {session.title || "제목 없는 발표"}
                  </h3>
                </Link>
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={cn(
                    "text-[10px] font-bold h-5 shrink-0",
                    isActive && "bg-green-500/10 text-green-600 border-green-500/20",
                    !isActive && "bg-muted text-muted-foreground"
                  )}
                >
                  {isActive ? "활성" : "비활성"}
                </Badge>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
              >
                {isCopied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span className="font-mono font-bold">{session.share_code}</span>
                <span>{isCopied ? "복사됨!" : "코드 복사"}</span>
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={isActive}
                  onCheckedChange={handleToggle}
                  disabled={isToggling}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              <Button asChild size="sm" className="h-8 gap-1.5 shadow-sm shadow-primary/20">
                <Link href={`/session/${session.id}/presenter`}>
                  <Play className="h-3.5 w-3.5" />
                  <span className="text-xs font-bold">발표 시작</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Presentation className="h-3.5 w-3.5" />
              {session.slide_count}개 슬라이드
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {session.participant_count}명 참여
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(session.created_at)}
            </span>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>"{session.title || "제목 없는 발표"}"을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 모든 슬라이드와 참가자 데이터가 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

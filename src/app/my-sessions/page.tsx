"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Presentation, Plus, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getMySessions, deleteSession } from "@/lib/api";
import SessionCard from "@/components/SessionCard";
import type { SessionWithMeta } from "@/types";

export default function MySessionsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SessionWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/my-sessions");
      return;
    }

    getMySessions()
      .then(setSessions)
      .catch((err) => setError(err instanceof Error ? err.message : "세션 목록을 불러올 수 없습니다"))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const handleDelete = async (sessionId: string) => {
    await deleteSession(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  // 로딩 스피너
  if (authLoading || (loading && !error)) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MySessionsHeader />
        <main className="flex-1 container py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MySessionsHeader />
        <main className="flex-1 container py-8 flex flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">세션 목록을 불러올 수 없습니다</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={() => {
              setError("");
              setLoading(true);
              getMySessions()
                .then(setSessions)
                .catch((err) => setError(err instanceof Error ? err.message : "다시 시도해주세요"))
                .finally(() => setLoading(false));
            }}
          >
            다시 시도
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MySessionsHeader />

      <main className="flex-1 container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">내가 만든 발표</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {sessions.length > 0 ? `${sessions.length}개의 발표 세션` : "아직 만든 발표가 없습니다"}
            </p>
          </div>
          <Button asChild size="sm" className="gap-2">
            <Link href="/creator">
              <Plus className="h-4 w-4" />
              새 발표 만들기
            </Link>
          </Button>
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-muted/50 p-4 rounded-2xl mb-4">
              <Presentation className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-1">아직 만든 발표가 없습니다</p>
            <p className="text-sm text-muted-foreground mb-6">새 발표를 만들어보세요!</p>
            <Button asChild className="gap-2">
              <Link href="/creator">
                <Plus className="h-4 w-4" />
                새 발표 만들기
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t py-8 bg-background">
        <div className="container flex justify-center">
          <p className="text-xs text-muted-foreground">&copy; 2026 Real-Slide. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function MySessionsHeader() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
            <Presentation className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">Real-Slide</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Button asChild variant="default" size="sm">
            <Link href="/creator">지금 시작하기</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/join">세션 참여하기</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

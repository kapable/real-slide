"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Presentation, Sparkles, Loader2 } from "lucide-react";

export default function CreatorPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("프레젠테이션 제목을 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error("세션 생성 실패");
      }

      const { sessionId } = await response.json();
      router.push(`/session/${sessionId}/presenter`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <div className="container max-w-2xl flex-1 flex flex-col py-12">
        <div className="mb-8">
          <Button variant="ghost" asChild className="gap-2 -ml-4 text-muted-foreground hover:text-foreground">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              메인으로 돌아가기
            </Link>
          </Button>
        </div>

        <Card className="shadow-xl border-none glass-shadow overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary to-purple-600" />
          <CardHeader className="space-y-4 pt-8">
            <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center text-primary">
              <Presentation className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-bold tracking-tight">발표 시작하기</CardTitle>
              <CardDescription className="text-base">
                새로운 프레젠테이션 세션을 생성하고 실시간 상호작용을 시작하세요.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSession} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  프레젠테이션 제목
                </label>
                <Input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 2024년 상반기 성과 발표"
                  className="h-12 text-lg"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    발표 시작하기
                    <Sparkles className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-muted/50 border-t p-6">
            <div className="space-y-3 w-full">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                도움말
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  발표를 시작하면 고유한 세션 코드가 생성됩니다.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  코드를 청중에게 공유하여 실시간 참여를 유도하세요.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  발표 중 언제든지 새로운 슬라이드를 추가하거나 투표를 진행할 수 있습니다.
                </li>
              </ul>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

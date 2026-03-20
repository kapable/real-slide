"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Sparkles, Loader2, KeyRound, UserCircle } from "lucide-react";

export default function JoinPage() {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!sessionCode.trim()) {
      setError("세션 코드를 입력해주세요.");
      return;
    }

    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/sessions/validate/${sessionCode.toUpperCase()}`,
      );

      if (!response.ok) {
        throw new Error("존재하지 않는 세션이거나 진행 중이 아닙니다.");
      }

      const { sessionId } = await response.json();

      router.push(
        `/join/${sessionId}?nickname=${encodeURIComponent(nickname)}`,
      );
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
          <div className="h-2 bg-gradient-to-r from-purple-600 to-pink-600" />
          <CardHeader className="space-y-4 pt-8">
            <div className="bg-purple-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-purple-600">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-bold tracking-tight">세션 참여하기</CardTitle>
              <CardDescription className="text-base">
                발표자가 제공한 코드를 입력하여 실시간 발표에 참여하세요.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="sessionCode" className="text-sm font-medium leading-none flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-purple-600" />
                    세션 코드
                  </label>
                  <Input
                    id="sessionCode"
                    type="text"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    className="h-14 text-2xl text-center tracking-[0.5em] font-mono font-bold uppercase border-2 focus-visible:ring-purple-500"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="nickname" className="text-sm font-medium leading-none flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-purple-600" />
                    닉네임
                  </label>
                  <Input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="참여 시 사용할 이름"
                    className="h-12 text-lg focus-visible:ring-purple-500"
                    disabled={isLoading}
                  />
                </div>
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
                className="w-full h-12 text-lg font-semibold bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    참여 중...
                  </>
                ) : (
                  <>
                    세션 입장하기
                    <Sparkles className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-muted/50 border-t p-6">
            <div className="space-y-3 w-full">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                참여 팁
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  세션 코드는 대소문자를 구분하지 않습니다.
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  참여 후에는 실시간 투표와 퀴즈에 참여할 수 있습니다.
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  궁금한 점은 실시간 댓글창을 통해 질문해 보세요.
                </li>
              </ul>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

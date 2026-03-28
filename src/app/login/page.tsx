"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Presentation, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const ALLOWED_NEXT_PATHS = ["/creator", "/my-sessions"];

function isValidNextPath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (ALLOWED_NEXT_PATHS.includes(path)) return true;
  if (/^\/session\/[^/]+\/presenter$/.test(path)) return true;
  return false;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signInWithGoogle } = useAuth();
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const nextParam = searchParams.get("next") || "";
  const safeNext = isValidNextPath(nextParam) ? nextParam : "/";

  // 이미 로그인된 사용자 리다이렉트
  useEffect(() => {
    if (!loading && user) {
      router.replace(safeNext);
    }
  }, [loading, user, router, safeNext]);

  const handleGoogleLogin = async () => {
    setError("");
    setIsSigningIn(true);
    try {
      await signInWithGoogle(
        `${window.location.origin}/login?next=${encodeURIComponent(safeNext)}`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Google 로그인에 실패했습니다. 다시 시도해주세요."
      );
      setIsSigningIn(false);
    }
  };

  // 로딩 중이거나 이미 로그인 → 리다이렉트 대기
  if (loading || user) {
    return (
      <div className="h-svh w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* 배경 그라디언트 */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-purple-500/5" />

      <div className="w-full max-w-md flex flex-col items-center gap-8">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="bg-primary p-2 rounded-xl text-primary-foreground">
            <Presentation className="h-8 w-8" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Real-Slide</span>
        </Link>

        {/* 안내 문구 */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Real-Slide에 오신 것을 환영합니다
          </h1>
          <p className="text-muted-foreground">
            발표를 만들고 관리하려면 로그인해주세요
          </p>
        </div>

        {/* Google 로그인 버튼 */}
        <Button
          variant="outline"
          size="lg"
          className="w-full h-12 text-base font-medium gap-3 rounded-xl shadow-sm"
          onClick={handleGoogleLogin}
          disabled={isSigningIn}
        >
          {isSigningIn ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Google로 계속하기
        </Button>

        {/* 에러 메시지 */}
        {error && (
          <div className="w-full bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm font-medium text-center animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        {/* 기능 안내 */}
        <div className="text-center text-sm text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground">로그인하면 다음이 가능합니다:</p>
          <ul className="space-y-1">
            <li>발표 세션 생성 및 관리</li>
            <li>여러 기기에서 발표 접속</li>
            <li>발표 기록 영구 보관</li>
          </ul>
        </div>

        {/* 구분선 */}
        <div className="w-full flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">또는</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* 세션 참여하기 */}
        <Button variant="ghost" size="lg" className="text-muted-foreground" asChild>
          <Link href="/join">세션 참여하기 (로그인 불필요)</Link>
        </Button>

        {/* 푸터 */}
        <p className="text-xs text-muted-foreground mt-4">
          &copy; 2026 Real-Slide. All rights reserved.
        </p>
      </div>
    </div>
  );
}

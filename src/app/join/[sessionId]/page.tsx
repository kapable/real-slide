"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Slide } from "@/types";
import { SlidePresentation } from "@/components/SlidePresentation";
import { supabase } from "@/lib/supabase";
import CommentSection from "@/components/CommentSection";
import ParticipantControls from "@/components/ParticipantControls";
import WordcloudDisplay from "@/components/WordcloudDisplay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ParticipantFullScreen } from "@/components/ParticipantFullScreen";
import { 
  Users, 
  Presentation as PresentationIcon, 
  CheckCircle2, 
  Sparkles, 
  HelpCircle, 
  BarChart2,
  Clock,
  ArrowLeft,
  Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

function ParticipantView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const nickname = searchParams.get("nickname") || "익명";

  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [participantId, setParticipantId] = useState("");
  const [resolvedSessionId, setResolvedSessionId] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const resolvedRef = useRef("");
  const channelRef = useRef<any>(null);

  const fetchSlides = async (sId: string) => {
    try {
      const slidesResponse = await fetch(`/api/slides/${sId}`);
      if (!slidesResponse.ok) throw new Error("슬라이드 로드 실패");
      const slidesData = await slidesResponse.json();
      setSlides(slidesData);
    } catch (err) {
      console.error("Error fetching slides:", err);
    }
  };

  // 1. Initialize: resolve session ID + join
  useEffect(() => {
    const initialize = async () => {
      try {
        let actualSessionId = sessionId;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(sessionId)) {
          const resolveResponse = await fetch(`/api/sessions/validate/${sessionId.toUpperCase()}`);
          if (!resolveResponse.ok) throw new Error("유효하지 않은 세션 코드입니다.");
          const { sessionId: resolvedUuid } = await resolveResponse.json();
          actualSessionId = resolvedUuid;
        }

        resolvedRef.current = actualSessionId;
        setResolvedSessionId(actualSessionId);

        const storageKey = `rs-participant-${actualSessionId}`;
        const storedId = localStorage.getItem(storageKey);

        if (storedId) {
          setParticipantId(storedId);
          await fetchSlides(actualSessionId);
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/participants/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: actualSessionId, nickname }),
        });
        if (!response.ok) throw new Error("참여 실패");
        const { participantId: pId } = await response.json();
        
        localStorage.setItem(storageKey, pId);
        setParticipantId(pId);
        await fetchSlides(actualSessionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류 발생");
        setSlides([]);
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [sessionId, nickname]);

  // 2. Realtime: subscribe ONLY when resolvedSessionId is ready
  useEffect(() => {
    if (!resolvedSessionId) return;

    const channelName = `session-${resolvedSessionId}`;
    console.log(`[Participant] Subscribing to ${channelName}`);

    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "slide:change" }, (payload: any) => {
        console.log("[Participant] slide:change received", payload.payload);
        setCurrentSlideIndex(payload.payload.slideIndex);
        setHasVoted(false);
      })
      .on("broadcast", { event: "slides:update" }, (payload: any) => {
        console.log("[Participant] slides:update received");
        const sid = resolvedRef.current;
        if (sid) fetchSlides(sid);
      })
      .on("broadcast", { event: "slide:result" }, (payload: any) => {
        const { slideId, showResult } = payload.payload;
        setSlides(currentSlides => 
          currentSlides.map(s => s.id === slideId ? { ...s, show_result: showResult } : s)
        );
      })
      .subscribe((status) => {
        console.log(`[Participant] Channel ${channelName} status: ${status}`);
      });

    channelRef.current = channel;

    return () => {
      console.log(`[Participant] Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [resolvedSessionId]);

  // Broadcast function to pass to child components (avoids duplicate channel)
  const broadcastFn = (event: string, payload: any) => {
    channelRef.current?.send({ type: "broadcast", event, payload });
  };

  const handleVote = async (optionIndex: number, type: "vote" | "quiz") => {
    if (!participantId || !resolvedSessionId || hasVoted) return;
    try {
      const endpoint = type === "quiz" ? "/api/quiz/submit" : "/api/votes/submit";
      const body = type === "quiz" 
        ? { slideId: slides[currentSlideIndex].id, participantId, answerIndex: optionIndex }
        : { slideId: slides[currentSlideIndex].id, participantId, optionIndex };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) setHasVoted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출 실패");
    }
  };

  if (isLoading) return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-muted/20 animate-in fade-in duration-500">
      <div className="bg-primary/10 p-4 rounded-3xl mb-6">
        <PresentationIcon className="h-10 w-10 text-primary animate-pulse" />
      </div>
      <h2 className="text-xl font-bold tracking-tight mb-2">세션 연결 중...</h2>
      <p className="text-muted-foreground text-sm font-medium">발표자의 슬라이드를 불러오고 있습니다.</p>
    </div>
  );

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="min-h-svh bg-muted/20 flex flex-col selection:bg-primary/20">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-1.5 rounded-lg text-primary-foreground hidden sm:flex">
            <PresentationIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight leading-none mb-1">
              {nickname}
              <span className="text-muted-foreground font-medium ml-1">님</span>
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-4 text-[9px] font-black tracking-widest px-1 uppercase border-primary/20 text-primary bg-primary/5">Participant</Badge>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                {slides.length > 0 ? `${currentSlideIndex + 1} / ${slides.length}` : "0 / 0"}
              </span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild className="h-8 gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/join">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">나가기</span>
          </Link>
        </Button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-[1600px] mx-auto w-full">
        {/* Left: Main Content (Slide + Interaction) */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
              <Sparkles className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Slide Box */}
          <div className="relative aspect-video w-full group">
            {currentSlide ? (
              <>
                <SlidePresentation
                  title={currentSlide.title}
                  content={currentSlide.content}
                  type={currentSlide.type as any}
                  options={currentSlide.options ? JSON.parse(currentSlide.options as string) : []}
                  correctAnswer={currentSlide.correct_answer ?? undefined}
                  showResult={currentSlide.show_result}
                  className="shadow-2xl border-none h-full"
                />
                
                {/* Fullscreen Trigger Overlay */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-10 px-4 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white flex items-center gap-2 shadow-2xl hover:bg-slate-900 transition-all font-black uppercase text-[10px] tracking-widest scale-90 group-hover:scale-100"
                    onClick={() => setIsFullScreen(true)}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>전체화면</span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-full bg-background rounded-2xl border border-dashed flex flex-col items-center justify-center space-y-4 text-muted-foreground opacity-30">
                <Clock className="h-12 w-12" />
                <p className="font-bold uppercase tracking-[0.2em] text-sm">발표를 기다리는 중...</p>
              </div>
            )}
          </div>

          {/* Fullscreen Component */}
          {currentSlide && (
             <ParticipantFullScreen
               slide={currentSlide}
               isOpen={isFullScreen}
               onClose={() => setIsFullScreen(false)}
             />
          )}

          {/* Interaction area */}
          {currentSlide && (currentSlide.type === "vote" || currentSlide.type === "quiz") && (
            <Card className={cn(
              "shadow-2xl border-none glass-shadow overflow-hidden transition-all delay-300 animate-in slide-in-from-bottom-4",
              currentSlide.type === "vote" ? "bg-blue-500/5" : "bg-purple-500/5"
            )}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {currentSlide.type === "vote" ? (
                      <BarChart2 className="h-5 w-5 text-blue-500" />
                    ) : (
                      <HelpCircle className="h-5 w-5 text-purple-500" />
                    )}
                    {currentSlide.title}
                  </CardTitle>
                  <CardDescription>의견을 제출해 실시간 결과에 참여하세요.</CardDescription>
                </div>
                {hasVoted && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 gap-1.5 h-8 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    제출 완료
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {JSON.parse(currentSlide.options as string).map((option: string, index: number) => (
                    <Button
                      key={index}
                      onClick={() => handleVote(index, currentSlide.type as any)}
                      disabled={hasVoted || !option}
                      variant={hasVoted ? "outline" : "default"}
                      className={cn(
                        "h-16 text-lg font-bold rounded-2xl transition-all active:scale-[0.98]",
                        !hasVoted && (currentSlide.type === "vote" ? "bg-blue-500 hover:bg-blue-600" : "bg-purple-600 hover:bg-purple-700"),
                        !option && "opacity-20"
                      )}
                    >
                      {option || "---"}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wordcloud area */}
          {currentSlide && slides[currentSlideIndex].type === "slide" && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
               <WordcloudDisplay slideId={currentSlide.id} className="shadow-2xl border-none min-h-[400px]" />
            </div>
          )}
        </div>

        {/* Right: Comments Sidebar */}
        <div className="w-full lg:w-96 flex flex-col gap-6 flex-shrink-0 min-h-[500px]">
          {participantId && currentSlide && (
            <div className="flex-1 overflow-hidden flex flex-col animate-in slide-in-from-right-4 duration-700 delay-200">
              <CommentSection
                slideId={currentSlide.id}
                participantId={participantId}
                nickname={nickname}
                className="h-full"
              />
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      {participantId && currentSlide && (
        <ParticipantControls
          sessionId={resolvedSessionId}
          slideId={currentSlide.id}
          participantId={participantId}
          nickname={nickname}
          broadcastFn={broadcastFn}
        />
      )}
    </div>
  );
}

export default function JoinSessionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ParticipantView />
    </Suspense>
  )
}

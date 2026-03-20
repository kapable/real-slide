"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Slide } from "@/types";
import { SlidePresentation } from "@/components/SlidePresentation";
import { VoteChart } from "@/components/VoteChart";
import HandsUpPanel from "@/components/HandsUpPanel";
import CommentSection from "@/components/CommentSection";
import WordcloudDisplay from "@/components/WordcloudDisplay";
import { PresenterSidebar } from "@/components/PresenterSidebar";
import { AddSlideForm } from "@/components/AddSlideForm";
import { supabase } from "@/lib/supabase";
import { 
  SidebarProvider, 
  SidebarInset, 
} from "@/components/ui/sidebar";
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Maximize2, 
  Settings, 
  LogOut,
  Presentation as PresentationIcon,
  MessageSquare,
  Hand,
  BarChart2,
  HelpCircle,
  Link as LinkIcon,
  Share2,
  Monitor,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FullScreenPresentation } from "@/components/FullScreenPresentation";

export default function PresenterPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [shareCode, setShareCode] = useState("");
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddSlideOpen, setIsAddSlideOpen] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  
  const channelRef = useRef<any>(null);

  // Fetch slides on mount
  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await fetch(`/api/slides/${sessionId}`);
        if (!response.ok) throw new Error("Failed to load slides");
        const data = await response.json();
        setSlides(data);

        const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setShareCode(sessionData.share_code);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load slides");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlides();
  }, [sessionId]);

  const updateVoteChart = useCallback(async (slideId: string, type: string) => {
    try {
      const endpoint = type === "quiz" ? `/api/quiz/${slideId}` : `/api/votes/${slideId}`;
      const response = await fetch(endpoint);
      if (!response.ok) return;

      const results = await response.json();
      const counts: Record<number, number> = {};
      results.forEach((item: any) => {
        const index = type === "quiz" ? item.answer_index : item.option_index;
        counts[index] = (counts[index] || 0) + 1;
      });

      setVotes(counts);
    } catch (err) {
      console.error("Failed to update voting data:", err);
    }
  }, []);

  const slidesRef = useRef(slides);
  const indexRef = useRef(currentSlideIndex);

  useEffect(() => {
    slidesRef.current = slides;
    indexRef.current = currentSlideIndex;
  }, [slides, currentSlideIndex]);

  // Realtime
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on("broadcast", { event: "slide:change" }, (payload: any) => {
        const newIndex = payload.payload.slideIndex;
        if (newIndex !== indexRef.current) {
          setCurrentSlideIndex(newIndex);
          setVotes({});
        }
      })
      .on("broadcast", { event: "slide:result" }, (payload: any) => {
        const { slideId, showResult } = payload.payload;
        setSlides(currentSlides => 
          currentSlides.map(s => s.id === slideId ? { ...s, show_result: showResult } : s)
        );
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "votes" }, (payload: any) => {
        const curSlide = slidesRef.current[indexRef.current];
        if (curSlide?.type === "vote" && payload.new?.slide_id === curSlide.id) {
          updateVoteChart(curSlide.id, "vote");
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quiz_answers" }, (payload: any) => {
        const curSlide = slidesRef.current[indexRef.current];
        if (curSlide?.type === "quiz" && payload.new?.slide_id === curSlide.id) {
          updateVoteChart(curSlide.id, "quiz");
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Subscribed to session-${sessionId}`);
        }
      });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, updateVoteChart]);

  useEffect(() => {
    const currentSlide = slides[currentSlideIndex];
    if (currentSlide && (currentSlide.type === "vote" || currentSlide.type === "quiz")) {
      updateVoteChart(currentSlide.id, currentSlide.type);
    }
  }, [currentSlideIndex, slides, updateVoteChart]);

  const handleAddSlide = async (slideData: any) => {
    try {
      const response = await fetch(`/api/slides/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slideData),
      });

      if (!response.ok) throw new Error("Failed to add slide");

      const newSlide = await response.json();
      const updatedSlides = [...slides, newSlide];
      setSlides(updatedSlides);
      
      // 참여자들에게 슬라이드 목록이 업데이트 되었음을 알림
      channelRef.current?.send({
        type: "broadcast",
        event: "slides:update",
        payload: { count: updatedSlides.length },
      });

      setIsAddSlideOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error occurred");
    }
  };

  const syncSlide = (index: number) => {
    setCurrentSlideIndex(index);
    channelRef.current?.send({
      type: "broadcast",
      event: "slide:change",
      payload: { slideIndex: index },
    });
    setVotes({});
  };

  const toggleResult = async () => {
    if (!currentSlide) return;
    const nextShowResult = !currentSlide.show_result;
    
    // 1. DB 업데이트
    await supabase
      .from("slides")
      .update({ show_result: nextShowResult })
      .eq("id", currentSlide.id);

    // 2. 로컬 상태 업데이트
    setSlides(slides.map(s => 
      s.id === currentSlide.id ? { ...s, show_result: nextShowResult } : s
    ));

    // 3. 브로드캐스트 (실시간)
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "slide:result",
        payload: { slideId: currentSlide.id, showResult: nextShowResult },
      });
    }
  };

  const handleNextSlide = () => syncSlide(Math.min(currentSlideIndex + 1, slides.length - 1));
  const handlePrevSlide = () => syncSlide(Math.max(currentSlideIndex - 1, 0));

  const currentSlide = slides[currentSlideIndex];

  if (isLoading) return <div className="h-svh w-full flex items-center justify-center bg-background"><PresentationIcon className="h-10 w-10 animate-pulse text-primary" /></div>;

  return (
    <SidebarProvider>
      <div className="flex h-svh w-full bg-muted/20 overflow-hidden">
        {/* Left: Slide List Sidebar */}
        <PresenterSidebar 
          slides={slides}
          currentSlideIndex={currentSlideIndex}
          onSelectSlide={syncSlide}
          onAddSlideClick={() => setIsAddSlideOpen(true)}
          shareCode={shareCode}
        />

        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <header className="h-14 flex items-center justify-between px-6 border-b bg-background/50 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <h2 className="font-bold tracking-tight">발표 제어 센터</h2>
              {currentSlide && (
                <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] font-bold uppercase tracking-widest">
                  {currentSlide.type} Mode
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 gap-2" onClick={() => {
                const url = `${window.location.origin}/join/${shareCode}`;
                navigator.clipboard.writeText(url);
              }}>
                <Share2 className="h-3.5 w-3.5" />
                <span className="text-xs">링크 복사</span>
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="h-8 gap-2 shadow-lg shadow-primary/20 bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white"
                onClick={() => setIsPresentationOpen(true)}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span className="text-xs">전체화면 발표</span>
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-2 border-dashed" asChild>
                <Link href={`/join/${sessionId}`} target="_blank">
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="text-xs">참여자 뷰 열기</span>
                </Link>
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-hide">
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* Center Column: Slide + Nav + Results */}
              <div className="flex-1 flex flex-col gap-6 min-w-0">
                <div className="relative aspect-video w-full group">
                  {currentSlide ? (
                    <SlidePresentation
                      title={currentSlide.title}
                      content={currentSlide.content}
                      type={currentSlide.type as any}
                      options={currentSlide.options ? JSON.parse(currentSlide.options as string) : []}
                      correctAnswer={currentSlide.correct_answer || undefined}
                      showResult={currentSlide.show_result}
                      votes={votes}
                      className="shadow-2xl border-none"
                    />
                  ) : (
                    <div className="h-full bg-background rounded-2xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center space-y-4 text-muted-foreground">
                      <Plus className="h-12 w-12 opacity-20" />
                      <p className="font-bold opacity-40 uppercase tracking-widest text-sm text-center">
                        슬라이드를 추가하여<br />발표를 시작하세요
                      </p>
                      <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={() => setIsAddSlideOpen(true)}>
                        첫 슬라이드 만들기
                      </Button>
                    </div>
                  )}
                  
                  {/* Floating Control Overlay */}
                  <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="glass px-2 py-1.5 rounded-2xl flex items-center gap-1 glass-shadow pointer-events-auto border-white/40">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={handlePrevSlide} disabled={currentSlideIndex === 0}>
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <div className="px-4 text-[10px] font-black uppercase tracking-[0.2em] min-w-[80px] text-center">
                        {slides.length > 0 ? `${currentSlideIndex + 1} / ${slides.length}` : "No Slide"}
                      </div>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={handleNextSlide} disabled={currentSlideIndex >= slides.length - 1}>
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Vote/Quiz Results (only for vote/quiz slides) */}
                {currentSlide && (currentSlide.type === "vote" || currentSlide.type === "quiz") && (
                  <Card className="shadow-xl shadow-primary/5 border-none p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm uppercase tracking-tight">실시간 통계</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button 
                          variant={currentSlide.show_result ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "gap-2 px-3 h-7 shadow-sm transition-all active:scale-95",
                            currentSlide.show_result && "bg-primary shadow-primary/20 text-white"
                          )}
                          onClick={toggleResult}
                        >
                          {currentSlide.show_result ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          <span className="text-[10px] font-bold">{currentSlide.show_result ? "공개 중" : "정답 공개"}</span>
                        </Button>
                        <Badge variant="outline" className="text-[9px] font-black h-5">LIVE</Badge>
                      </div>
                    </div>
                    <VoteChart
                      votes={votes}
                      options={currentSlide.options ? JSON.parse(currentSlide.options as string) : []}
                      type="bar"
                      correctAnswer={currentSlide.correct_answer || undefined}
                      showResult={currentSlide.show_result}
                    />
                  </Card>
                )}
              </div>

              {/* Right Column: Interaction Panel */}
              <div className="w-full lg:w-80 flex flex-col gap-6 flex-shrink-0">
                <div className="h-[280px]">
                  <HandsUpPanel sessionId={sessionId} />
                </div>
                <div className="flex-1 min-h-[400px]">
                  <CommentSection
                    slideId={currentSlide?.id || ""}
                    participantId="presenter"
                    nickname="발표자"
                  />
                </div>
              </div>
            </div>

            {/* Full-width Wordcloud (below the 2-column layout) */}
            {currentSlide && (
              <div className="pb-6">
                <WordcloudDisplay slideId={currentSlide.id} isPresenter={true} className="shadow-xl shadow-blue-500/5 border-none min-h-[450px]" />
              </div>
            )}
          </main>
        </SidebarInset>

        {/* Add Slide Dialog */}
        <Dialog open={isAddSlideOpen} onOpenChange={setIsAddSlideOpen}>
          <DialogContent className="sm:max-w-[480px] p-8 gap-0 border-none shadow-2xl overflow-hidden glass rounded-[2rem]">
            <DialogHeader className="sr-only">
              <DialogTitle>새 슬라이드 추가</DialogTitle>
            </DialogHeader>
            <AddSlideForm 
              onAdd={handleAddSlide} 
              isLoading={isLoading} 
              onCancel={() => setIsAddSlideOpen(false)} 
            />
          </DialogContent>
        </Dialog>

        <FullScreenPresentation
          slides={slides}
          currentIndex={currentSlideIndex}
          isOpen={isPresentationOpen}
          votes={votes}
          onClose={() => setIsPresentationOpen(false)}
          onPrev={handlePrevSlide}
          onNext={handleNextSlide}
          onSelect={syncSlide}
          onToggleResult={toggleResult}
        />
      </div>
    </SidebarProvider>
  );
}

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

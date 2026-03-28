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
import { useAuth } from "@/contexts/AuthContext";
import { 
  SidebarProvider, 
  SidebarInset, 
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  EyeOff,
  Check,
  QrCode,
  Loader2,
  Hash
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FullScreenPresentation } from "@/components/FullScreenPresentation";

export default function PresenterPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { userId, loading: authLoading } = useAuth();

  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [shareCode, setShareCode] = useState("");
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isAddSlideOpen, setIsAddSlideOpen] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [presenterId, setPresenterId] = useState<string>("presenter");

  const channelRef = useRef<any>(null);

  // Fetch slides + ownership check
  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setIsLoading(false);
      setError("인증이 필요합니다");
      return;
    }

    const fetchSlides = async () => {
      try {
        const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
        if (!sessionResponse.ok) throw new Error("세션을 찾을 수 없습니다");
        const sessionData = await sessionResponse.json();

        setShareCode(sessionData.share_code);

        // 소유권 확인: 다른 사용자의 세션이면 참가자로 리다이렉트
        if (sessionData.created_by && sessionData.created_by !== userId) {
          router.replace(`/join/${sessionData.share_code}`);
          return;
        }

        // created_by가 null이면 claim
        if (!sessionData.created_by) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await fetch(`/api/sessions/${sessionId}/claim`, {
              method: "PATCH",
              headers: { "Authorization": `Bearer ${session.access_token}` },
            });
          }
        }

        setPresenterId(userId);

        const response = await fetch(`/api/slides/${sessionId}`);
        if (!response.ok) throw new Error("슬라이드를 불러올 수 없습니다");
        const data = await response.json();
        setSlides(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "슬라이드를 불러올 수 없습니다");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlides();
  }, [sessionId, userId, authLoading, router]);

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
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const response = await fetch(`/api/slides/${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authSession ? { "Authorization": `Bearer ${authSession.access_token}` } : {}),
        },
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

  const currentSlide = slides[currentSlideIndex];

  const toggleResult = async () => {
    if (!currentSlide) return;
    const nextShowResult = !currentSlide.show_result;
    
    try {
      // 1. API를 통해 DB 업데이트
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const response = await fetch(`/api/slides/${sessionId}/${currentSlide.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authSession ? { "Authorization": `Bearer ${authSession.access_token}` } : {}),
        },
        body: JSON.stringify({ show_result: nextShowResult }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "DB 업데이트 실패");
      }

      // 2. 로컬 상태 업데이트
      setSlides(prevSlides => 
        prevSlides.map(s => s.id === currentSlide.id ? { ...s, show_result: nextShowResult } : s)
      );

      // 3. 브로드캐스트 (실시간)
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "slide:result",
          payload: { slideId: currentSlide.id, showResult: nextShowResult },
        });
      }
    } catch (err) {
      console.error("[Presenter] Failed to toggle result:", err instanceof Error ? err.message : err);
    }
  };

  const handleNextSlide = () => syncSlide(Math.min(currentSlideIndex + 1, slides.length - 1));
  const handlePrevSlide = () => syncSlide(Math.max(currentSlideIndex - 1, 0));

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
            <div className="flex-1 flex justify-center items-center">
              <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border shadow-inner">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg hover:bg-background transition-all" 
                  onClick={handlePrevSlide} 
                  disabled={currentSlideIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="px-3 flex items-center gap-2 min-w-[80px] justify-center">
                  <span className="text-xs font-bold text-primary">{currentSlideIndex + 1}</span>
                  <span className="text-[10px] text-muted-foreground/30 font-black">/</span>
                  <span className="text-xs font-bold text-muted-foreground">{slides.length}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg hover:bg-background transition-all" 
                  onClick={handleNextSlide} 
                  disabled={currentSlideIndex >= slides.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-2">
                    <QrCode className="h-3.5 w-3.5" />
                    <span className="text-xs">QR 코드</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px] p-0 border-none bg-transparent shadow-none flex flex-col items-center justify-center gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">참여 QR 코드</DialogTitle>
                      <p className="text-xs text-slate-400 font-medium">스마트폰으로 스캔하여 바로 접속하세요</p>
                    </div>
                    
                    <div className="relative group p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                       <img 
                         src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`${window.location.origin}/join/${shareCode}`)}&size=240x240&bgcolor=f8fafc&color=0f172a&margin=10`} 
                         alt="Session QR Code"
                         className="w-60 h-60 min-w-60 min-h-60 rounded-lg shadow-sm group-hover:scale-[1.02] transition-transform duration-300"
                       />
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                         <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-xl border border-slate-100 italic text-[10px] font-bold text-slate-800">
                           {shareCode}
                         </div>
                       </div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                       <div className="bg-primary/5 px-4 py-2 rounded-full border border-primary/10 flex items-center gap-2">
                         <Hash className="h-3 w-3 text-primary" />
                         <span className="text-lg font-mono font-bold tracking-[0.3em] text-primary">{shareCode}</span>
                       </div>
                       <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Room Access Code</p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 text-white hover:bg-white/10 rounded-full gap-2 px-6"
                    onClick={() => {
                       const url = `${window.location.origin}/join/${shareCode}`;
                       navigator.clipboard.writeText(url);
                       setIsCopied(true);
                       setTimeout(() => setIsCopied(false), 2000);
                    }}
                  >
                    {isCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                    <span className="font-bold">{isCopied ? "복사완료!" : "링크 복사하기"}</span>
                  </Button>
                </DialogContent>
              </Dialog>

              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-8 gap-2 transition-all duration-200",
                  isCopied && "text-green-600 bg-green-50 dark:bg-green-900/20"
                )} 
                onClick={() => {
                  const url = `${window.location.origin}/join/${shareCode}`;
                  navigator.clipboard.writeText(url);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
              >
                {isCopied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                <span className="text-xs">{isCopied ? "복사됨!" : "링크 복사"}</span>
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
                      correctAnswer={currentSlide.correct_answer ?? undefined}
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
                      correctAnswer={typeof currentSlide.correct_answer === 'number' ? currentSlide.correct_answer : undefined}
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
                    participantId={presenterId}
                    nickname="발표자"
                  />
                </div>
              </div>
            </div>

            {/* Full-width Wordcloud (below the 2-column layout) */}
            {currentSlide && currentSlide.type === "slide" && (
              <div className="pb-6">
                <WordcloudDisplay slideId={currentSlide.id} isPresenter={true} className="shadow-xl shadow-blue-500/5 border-none min-h-[450px]" />
              </div>
            )}
          </main>
        </SidebarInset>

        {/* Add Slide Dialog */}
        <Dialog open={isAddSlideOpen} onOpenChange={setIsAddSlideOpen}>
          <DialogContent className="sm:max-w-[480px] p-6 gap-0 border border-muted/200 shadow-2xl overflow-hidden bg-background/95 backdrop-blur-xl rounded-3xl">
            <DialogHeader className="sr-only">
              <DialogTitle>새 슬라이드 추가</DialogTitle>
              <DialogDescription>발표에 새로운 슬라이드를 추가합니다</DialogDescription>
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



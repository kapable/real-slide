"use client";

import { useEffect, useState } from "react";
import { Slide } from "@/types";
import { SlidePresentation } from "./SlidePresentation";
import WordcloudDisplay from "./WordcloudDisplay";
import { Button } from "./ui/button";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Monitor,
  Presentation,
  Cloud,
  Layout,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FullScreenPresentationProps {
  slides: Slide[];
  currentIndex: number;
  isOpen: boolean;
  votes?: Record<number, number>;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
  onToggleResult: () => void;
}

export function FullScreenPresentation({
  slides,
  currentIndex,
  isOpen,
  votes,
  onClose,
  onPrev,
  onNext,
  onToggleResult,
}: FullScreenPresentationProps) {
  const [showControls, setShowControls] = useState(true);
  const [lastMouseMove, setLastMouseMove] = useState(Date.now());
  const [showWordcloud, setShowWordcloud] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "Escape") onClose();
      if (e.key === " ") { e.preventDefault(); onNext(); }
      if (e.key === "w" || e.key === "W") setShowWordcloud(prev => !prev);
      if (e.key === "r" || e.key === "R") onToggleResult();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onNext, onPrev, onClose, onToggleResult]);

  // Reset wordcloud view when slide changes
  useEffect(() => {
    setShowWordcloud(false);
  }, [currentIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseMove = () => {
      setShowControls(true);
      setLastMouseMove(Date.now());
    };

    const interval = setInterval(() => {
      if (Date.now() - lastMouseMove > 3000) {
        setShowControls(false);
      }
    }, 1000);

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(interval);
    };
  }, [isOpen, lastMouseMove]);

  if (!isOpen) return null;

  const currentSlide = slides[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Close Button */}
      <div className={cn(
        "absolute top-8 right-8 z-[110] transition-opacity duration-500",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-background/50 backdrop-blur-md shadow-xl border border-white/20 hover:scale-110 transition-transform"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Wordcloud Toggle */}
      {currentSlide && (
        <div className={cn(
          "absolute top-8 right-24 z-[110] transition-opacity duration-500",
          showControls ? "opacity-100" : "opacity-0"
        )}>
          <Button
            variant={showWordcloud ? "default" : "ghost"}
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full backdrop-blur-md shadow-xl border border-white/20 hover:scale-110 transition-all",
              showWordcloud 
                ? "bg-primary text-primary-foreground"
                : "bg-background/50"
            )}
            onClick={() => setShowWordcloud(!showWordcloud)}
          >
            <Cloud className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Main Content Area */}
      <div className={cn(
        "w-full h-full px-8 md:px-12 pb-36 flex items-center justify-center overflow-hidden",
        showWordcloud ? "pt-16" : "pt-4"
      )}>
        <div className="w-full h-full max-w-[1600px] flex items-center justify-center">
          {currentSlide ? (
            showWordcloud ? (
              /* Wordcloud Full View */
              <div className="w-full h-full flex flex-col animate-in fade-in duration-300 overflow-hidden">
                <WordcloudDisplay
                  slideId={currentSlide.id}
                  compact={true}
                  className="w-full h-full"
                />
              </div>
            ) : (
              /* Slide View */
              <SlidePresentation
                title={currentSlide.title}
                content={currentSlide.content}
                type={currentSlide.type as any}
                options={currentSlide.options ? JSON.parse(currentSlide.options as string) : []}
                correctAnswer={currentSlide.correct_answer || undefined}
                showResult={currentSlide.show_result}
                votes={votes}
                isFullScreen={true}
                className="w-full h-full shadow-none border-none bg-transparent"
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full space-y-6 opacity-20">
               <Presentation className="h-32 w-32" />
               <p className="text-4xl font-black uppercase tracking-widest text-center italic">
                 NO SLIDE FOUND
               </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className={cn(
        "absolute bottom-12 inset-x-0 flex justify-center items-center gap-8 z-[110] transition-all duration-500",
        showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        <div className="glass px-6 py-4 rounded-[2.5rem] flex items-center gap-6 shadow-2xl glass-shadow border-white/40">
           <Button
             variant="ghost"
             size="icon"
             className="h-14 w-14 rounded-2xl hover:bg-primary/10 transition-colors"
             onClick={onPrev}
             disabled={currentIndex === 0}
           >
             <ChevronLeft className="h-8 w-8" />
           </Button>

           <div className="flex flex-col items-center min-w-[120px]">
             <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">Slide</span>
             <span className="text-xl font-bold font-mono">
               {currentIndex + 1} <span className="text-muted-foreground/30 font-light mx-1">/</span> {slides.length}
             </span>
           </div>

           <Button
             variant="ghost"
             size="icon"
             className="h-14 w-14 rounded-2xl hover:bg-primary/10 transition-colors"
             onClick={onNext}
             disabled={currentIndex >= slides.length - 1}
           >
             <ChevronRight className="h-8 w-8" />
           </Button>

           {/* Interactive Controls */}
           {currentSlide && (
             <>
               <div className="w-[1px] h-8 bg-white/10" />
               {(currentSlide.type === "quiz" || currentSlide.type === "vote") && (
                 <Button
                   variant="ghost"
                   size="icon"
                   className={cn(
                     "h-14 w-14 rounded-2xl transition-all",
                     currentSlide.show_result
                       ? "bg-primary/20 text-primary border border-primary/20" 
                       : "hover:bg-primary/10"
                   )}
                   onClick={onToggleResult}
                   title={currentSlide.show_result ? "정답 숨기기" : "정답 공개"}
                 >
                   {currentSlide.show_result ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                 </Button>
               )}
               <Button
                 variant="ghost"
                 size="icon"
                 className={cn(
                   "h-14 w-14 rounded-2xl transition-all",
                   showWordcloud 
                     ? "bg-primary/20 text-primary" 
                     : "hover:bg-primary/10"
                 )}
                 onClick={() => setShowWordcloud(!showWordcloud)}
                 title="워드클라우드 전환"
               >
                 {showWordcloud ? <Layout className="h-6 w-6" /> : <Cloud className="h-6 w-6" />}
               </Button>
             </>
           )}
        </div>
        
        {/* Helper Badge */}
        <div className="absolute bottom-[-24px] text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.3em] whitespace-nowrap">
           Space to next · arrows to navigate · W for wordcloud · R for Reveal · esc to exit
        </div>
      </div>

      {/* Fullscreen Tooltip */}
      <div className="absolute top-8 left-8 flex items-center gap-3">
         <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Monitor className="h-5 w-5" />
         </div>
         <div className="flex flex-col">
            <h4 className="text-xs font-black uppercase tracking-wider leading-none">Presentation Mode</h4>
            <span className="text-[9px] text-muted-foreground font-bold tracking-tight">Broadcasting real-time to all participants</span>
         </div>
      </div>
    </div>
  );
}

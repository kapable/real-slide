"use client";

import { useEffect, useState } from "react";
import { Slide } from "@/types";
import { SlidePresentation } from "./SlidePresentation";
import WordcloudDisplay from "./WordcloudDisplay";
import { Button } from "./ui/button";
import { 
  X, 
  Maximize2,
  Minimize2,
  Cloud,
  Layout,
  Info,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ParticipantFullScreenProps {
  slide: Slide | null;
  isOpen: boolean;
  onClose: () => void;
  isWordcloudActive?: boolean;
}

export function ParticipantFullScreen({
  slide,
  isOpen,
  onClose,
  isWordcloudActive = false,
}: ParticipantFullScreenProps) {
  const [showControls, setShowControls] = useState(true);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const [showWordcloud, setShowWordcloud] = useState(isWordcloudActive);
  const [isLandscape, setIsLandscape] = useState(false);

  // Auto-hide controls
  useEffect(() => {
    if (!isOpen) return;

    const handleInteraction = () => {
      setShowControls(true);
      setLastInteraction(Date.now());
    };

    const interval = setInterval(() => {
      if (Date.now() - lastInteraction > 4000) {
        setShowControls(false);
      }
    }, 1000);

    window.addEventListener("mousemove", handleInteraction);
    window.addEventListener("touchstart", handleInteraction);
    
    return () => {
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      clearInterval(interval);
    };
  }, [isOpen, lastInteraction]);

  // Sync Wordcloud state with prop or slide change
  useEffect(() => {
    setShowWordcloud(isWordcloudActive);
  }, [isWordcloudActive, slide?.id]);

  // Orientation Check
  useEffect(() => {
    if (!isOpen) return;
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    return () => window.removeEventListener("resize", checkOrientation);
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Mobile Orientation Tip */}
      {!isLandscape && isOpen && (
         <div className={cn(
           "absolute top-20 inset-x-0 z-[120] flex justify-center pointer-events-none transition-opacity duration-1000",
           showControls ? "opacity-100" : "opacity-0"
         )}>
           <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl">
              <Smartphone className="h-5 w-5 text-blue-400 animate-bounce" />
              <span className="text-xs font-black uppercase tracking-widest text-white leading-none">가로 모드로 돌리시면 더 크게 보입니다</span>
           </div>
         </div>
      )}

      {/* Close Button (Top Left) */}
      <div className={cn(
        "absolute top-6 left-6 z-[110] transition-opacity duration-500 flex items-center gap-4",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-slate-900/50 backdrop-blur-md shadow-2xl border border-white/10 hover:bg-slate-900/80 transition-all text-white"
          onClick={onClose}
        >
          <Minimize2 className="h-6 w-6" />
        </Button>
        <div className="flex flex-col">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 opacity-60 leading-none mb-1">Live Presentation</h4>
            <span className="text-xs font-bold text-white/80 tracking-tight">전체화면 모드</span>
        </div>
      </div>

      {/* Main Container */}
      <div className={cn(
        "w-full h-full flex items-center justify-center transition-all duration-500",
        isLandscape ? "p-0" : "p-4 sm:p-8"
      )}>
        <div className={cn(
          "w-full h-full max-w-[1600px] flex items-center justify-center relative",
          !isLandscape && "aspect-video"
        )}>
           {slide ? (
             showWordcloud ? (
               <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-right-12 duration-500 overflow-hidden">
                 <WordcloudDisplay
                   slideId={slide.id}
                   compact={true}
                   className="w-full h-full bg-transparent border-none shadow-none"
                 />
               </div>
             ) : (
               <div className="w-full h-full animate-in fade-in slide-in-from-left-12 duration-500">
                 <SlidePresentation
                   title={slide.title}
                   content={slide.content}
                   type={slide.type as any}
                   options={slide.options ? JSON.parse(slide.options as string) : []}
                   correctAnswer={slide.correct_answer ?? undefined}
                   showResult={slide.show_result}
                   isFullScreen={true}
                   className="w-full h-full shadow-none border-none bg-transparent"
                 />
               </div>
             )
           ) : (
             <div className="flex flex-col items-center justify-center h-full space-y-6 opacity-20">
               <div className="h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center">
                 <Maximize2 className="h-16 w-16 text-primary" />
               </div>
               <p className="text-4xl font-black uppercase tracking-widest text-center italic">WAITING FOR SLIDE</p>
             </div>
           )}
        </div>
      </div>

      {/* Fixed Bottom Control Bar (Mobile-friendly Pill) */}
      <div className={cn(
        "absolute bottom-8 left-1/2 -translate-x-1/2 z-[110] transition-all duration-500",
        showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      )}>
        <div className="bg-slate-900/90 backdrop-blur-2xl px-8 py-3 rounded-full flex items-center gap-8 shadow-2xl border border-white/10">
           {/* Slide/Wordcloud Toggle */}
           <Button
             variant="ghost"
             className={cn(
               "h-12 px-6 rounded-full flex items-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest group",
               !showWordcloud ? "bg-primary text-white" : "text-white/40 hover:text-white hover:bg-white/10"
             )}
             onClick={() => setShowWordcloud(false)}
           >
              <Layout className={cn("h-4 w-4", !showWordcloud && "fill-current")} />
              <span>슬라이드</span>
           </Button>

           <Button
             variant="ghost"
             className={cn(
               "h-12 px-6 rounded-full flex items-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest group",
               showWordcloud ? "bg-primary text-white" : "text-white/40 hover:text-white hover:bg-white/10"
             )}
             onClick={() => setShowWordcloud(true)}
           >
              <Cloud className={cn("h-4 w-4", showWordcloud && "fill-current")} />
              <span>워드클라우드</span>
           </Button>

           <div className="w-[1px] h-6 bg-white/10 mx-2" />

           <Button
             variant="ghost"
             size="icon"
             className="h-12 w-12 rounded-full text-white/60 hover:text-red-400 hover:bg-red-400/10 transition-all active:scale-95"
             onClick={onClose}
             title="전체화면 종료"
           >
              <X className="h-5 w-5" />
           </Button>
        </div>
      </div>

      {/* Branding Overlay */}
      <div className="absolute bottom-6 right-8 opacity-10 pointer-events-none hidden sm:block">
         <h2 className="text-2xl font-black italic tracking-tighter text-white">REAL SLIDE</h2>
      </div>
    </div>
  );
}

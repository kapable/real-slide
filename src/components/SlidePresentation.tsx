"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

import { VoteChart } from "./VoteChart";
import { Presentation } from "lucide-react";

interface SlideProps {
  title?: string;
  content?: string;
  type?: "slide" | "vote" | "quiz";
  options?: string[];
  correctAnswer?: number;
  votes?: Record<number, number>;
  showResult?: boolean;
  isFullScreen?: boolean;
  className?: string;
}

export function SlidePresentation({
  title,
  content,
  type = "slide",
  options = [],
  correctAnswer,
  votes,
  showResult = false,
  isFullScreen = false,
  className
}: SlideProps) {
  return (
    <div className={cn(
      "w-full h-full bg-background rounded-2xl shadow-2xl border p-6 md:p-12 flex flex-col justify-center items-center relative overflow-hidden transition-all duration-500",
      type === "vote" && "bg-gradient-to-br from-background to-blue-50/30",
      type === "quiz" && "bg-gradient-to-br from-background to-purple-50/30",
      isFullScreen && "p-12 md:p-20 border-none shadow-none bg-transparent",
      className
    )}>
      {/* Decorative Slide Background Element */}
      <div className={cn(
        "absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[100px] opacity-20 transition-colors duration-1000",
        isFullScreen && "w-96 h-96 blur-[150px]",
        type === "slide" && "bg-primary",
        type === "vote" && "bg-blue-500",
        type === "quiz" && "bg-purple-500"
      )} />

      <div className={cn(
        "z-10 w-full flex flex-col items-center justify-center gap-6 md:gap-10 px-4 sm:px-0", 
        isFullScreen ? "max-w-6xl" : "max-w-4xl"
      )}>
        {title && (
          <h1 className={cn(
            "font-extrabold tracking-tighter text-foreground text-center animate-in fade-in slide-in-from-top-4 duration-700 break-words w-full",
            isFullScreen 
              ? "text-4xl sm:text-6xl md:text-8xl" 
              : "text-2xl sm:text-4xl md:text-6xl"
          )}>
            {title}
          </h1>
        )}

        {content && (
          <div className={cn(
            "text-muted-foreground text-center whitespace-pre-wrap leading-relaxed animate-in fade-in fill-mode-both delay-200 duration-700 break-words w-full",
            isFullScreen 
              ? "text-lg sm:text-2xl md:text-4xl max-w-5xl" 
              : "text-sm sm:text-lg md:text-2xl max-w-3xl"
          )}>
            {content}
          </div>
        )}

        {/* 투표/퀴즈 옵션 표시 또는 결과 차트 표시 */}
        {(type === "vote" || type === "quiz") && options.length > 0 && (
          <div className="w-full animate-in fade-in zoom-in-95 duration-700 delay-500">
            {votes ? (
              <div className={cn("w-full bg-background/40 backdrop-blur-sm p-4 md:p-8 rounded-[2rem] border border-white/20", isFullScreen && "p-12")}>
                 <VoteChart 
                   votes={votes} 
                   options={options} 
                   correctAnswer={correctAnswer} 
                   showResult={showResult}
                   className={isFullScreen ? "h-[450px]" : "h-[300px]"}
                 />
              </div>
            ) : (
              <div className={cn("grid grid-cols-1 gap-4 w-full", isFullScreen ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2")}>
                {options.map((option, index) => (
                  <div
                    key={index}
                    className={cn(
                      "rounded-2xl font-bold text-center border shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md relative overflow-hidden",
                      isFullScreen ? "p-8 text-2xl" : "p-6 text-xl",
                      type === "vote"
                        ? "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/15"
                        : "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/15",
                      !option && "opacity-20",
                      showResult && index == correctAnswer && "ring-4 ring-yellow-400 border-yellow-500 bg-yellow-400/20 scale-[1.02] shadow-xl z-20"
                    )}
                  >
                    {showResult && index == correctAnswer && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[200%] sparkle-halo pointer-events-none z-0" />
                    )}
                    
                    <div className="flex items-center gap-4 relative z-10">
                      <span className={cn(
                        "flex items-center justify-center rounded-full bg-background border font-black shadow-inner shrink-0",
                        isFullScreen ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm",
                        showResult && index == correctAnswer && "bg-yellow-400 border-yellow-600 text-yellow-900 shadow-yellow-500/50 animate-sparkle-inner"
                      )}>
                        {index + 1}
                      </span>
                      <span className="flex-1 text-left">{option || "---"}</span>
                      {showResult && index == correctAnswer && (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 text-yellow-900 animate-in zoom-in-0 duration-500 shadow-lg shadow-yellow-500/50">
                          <Check className="h-5 w-5 stroke-[4px]" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!title && !content && !options.length && (
          <div className="flex flex-col items-center justify-center space-y-4 opacity-20">
            <Presentation className="h-20 w-20" />
            <p className={isFullScreen ? "text-4xl font-bold" : "text-2xl font-bold"}>슬라이드가 비어있습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}

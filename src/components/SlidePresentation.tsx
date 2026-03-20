"use client";

import { cn } from "@/lib/utils";
import { Layout, BarChart2, HelpCircle } from "lucide-react";

interface SlideProps {
  title?: string;
  content?: string;
  type?: "slide" | "vote" | "quiz";
  options?: string[];
  className?: string;
}

export function SlidePresentation({
  title,
  content,
  type = "slide",
  options = [],
  className
}: SlideProps) {
  return (
    <div className={cn(
      "w-full h-full bg-background rounded-2xl shadow-2xl border p-12 flex flex-col justify-center items-center relative overflow-hidden transition-all duration-500",
      type === "vote" && "bg-gradient-to-br from-background to-blue-50/30",
      type === "quiz" && "bg-gradient-to-br from-background to-purple-50/30",
      className
    )}>
      {/* Decorative Slide Background Element */}
      <div className={cn(
        "absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[100px] opacity-20 transition-colors duration-1000",
        type === "slide" && "bg-primary",
        type === "vote" && "bg-blue-500",
        type === "quiz" && "bg-purple-500"
      )} />

      {/* Slide Type Indicator */}
      <div className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground/40 font-bold uppercase tracking-[0.2em] text-[10px]">
        {type === "slide" && <Layout className="h-3.5 w-3.5" />}
        {type === "vote" && <BarChart2 className="h-3.5 w-3.5" />}
        {type === "quiz" && <HelpCircle className="h-3.5 w-3.5" />}
        <span>{type}</span>
      </div>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center">
        {title ? (
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-foreground mb-10 text-center animate-in fade-in slide-in-from-top-4 duration-700">
            {title}
          </h1>
        ) : (
          <div className="h-16 mb-10" />
        )}

        {content && (
          <div className="text-xl md:text-2xl text-muted-foreground text-center whitespace-pre-wrap leading-relaxed max-w-3xl mb-12 animate-in fade-in fill-mode-both delay-200 duration-700">
            {content}
          </div>
        )}

        {/* 투표/퀴즈 옵션 표시 */}
        {(type === "vote" || type === "quiz") && options.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4 animate-in fade-in zoom-in-95 duration-700 delay-500">
            {options.map((option, index) => (
              <div
                key={index}
                className={cn(
                  "p-6 rounded-2xl font-bold text-center border shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md",
                  type === "vote"
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/15"
                    : "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/15",
                  !option && "opacity-20"
                )}
              >
                <div className="flex items-center gap-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-background border text-xs font-black shadow-inner">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-left text-lg md:text-xl">{option || "---"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!title && !content && !options.length && (
          <div className="flex flex-col items-center justify-center space-y-4 opacity-20">
            <Presentation className="h-20 w-20" />
            <p className="text-2xl font-bold">슬라이드가 비어있습니다</p>
          </div>
        )}
      </div>

      {/* Slide Page Indicator */}
      <div className="absolute bottom-8 right-8 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">
        Real-Slide Presentation Platform
      </div>
    </div>
  );
}

import { Presentation } from "lucide-react";

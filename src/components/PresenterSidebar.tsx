"use client";

import Link from "next/link";
import { 
  Plus, 
  Presentation, 
  BarChart2, 
  HelpCircle, 
  Layout, 
  Hash, 
  ArrowLeft,
  Copy,
  Check
} from "lucide-react";
import { useState } from "react";
import { Slide } from "@/types";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarGroup, 
  SidebarGroupLabel, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PresenterSidebarProps {
  slides: Slide[];
  currentSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onAddSlideClick: () => void;
  shareCode: string;
}

export function PresenterSidebar({ 
  slides, 
  currentSlideIndex, 
  onSelectSlide, 
  onAddSlideClick,
  shareCode 
}: PresenterSidebarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!shareCode) return;
    navigator.clipboard.writeText(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Sidebar className="border-r shadow-sm">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
            <Presentation className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-sm">Real-Slide</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Presenter</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="px-2 py-4">
            <div className="bg-muted/50 rounded-xl p-3 border space-y-2">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                <Hash className="h-3 w-3" />
                접속 코드
              </div>
              <div 
                className="text-2xl font-mono font-bold tracking-[0.2em] text-primary flex items-center justify-between group/code cursor-pointer p-1 rounded-lg hover:bg-primary/5 transition-colors"
                onClick={handleCopy}
                title="클릭하여 코드 복사"
              >
                <span>{shareCode || "---"}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className={cn(
                    "h-8 w-8 rounded-lg opacity-40 group-hover/code:opacity-100 transition-opacity",
                    copied && "text-green-600 opacity-100"
                  )}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <div className="flex items-center justify-between px-2 mb-2">
            <SidebarGroupLabel className="text-xs font-bold uppercase tracking-wider">슬라이드 목록</SidebarGroupLabel>
            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={onAddSlideClick}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <SidebarGroupContent>
            <ScrollArea className="h-[calc(100vh-280px)] px-2">
              <SidebarMenu>
                {slides.length > 0 ? (
                  slides.map((slide, index) => (
                    <SidebarMenuItem key={slide.id}>
                      <SidebarMenuButton 
                        isActive={index === currentSlideIndex}
                        onClick={() => onSelectSlide(index)}
                        className={cn(
                          "h-14 px-3 rounded-lg transition-all",
                          index === currentSlideIndex 
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20" 
                            : "hover:bg-accent"
                        )}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className={cn(
                            "flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold",
                            index === currentSlideIndex ? "bg-primary-foreground/20" : "bg-muted"
                          )}>
                            {index + 1}
                          </span>
                          <div className="flex flex-col flex-1 truncate">
                            <span className="font-semibold text-sm truncate">
                              {slide.title || "제목 없음"}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {slide.type === "slide" && <Layout className="h-3 w-3 opacity-60" />}
                              {slide.type === "vote" && <BarChart2 className="h-3 w-3 opacity-60" />}
                              {slide.type === "quiz" && <HelpCircle className="h-3 w-3 opacity-60" />}
                              <span className="text-[10px] uppercase font-medium opacity-60">
                                {slide.type === "slide" ? "Slide" : slide.type === "vote" ? "Vote" : "Quiz"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                ) : (
                  <div className="py-8 text-center px-4">
                    <p className="text-xs text-muted-foreground italic">슬라이드가 없습니다.</p>
                    <Button variant="link" size="sm" className="mt-2 text-primary" onClick={onAddSlideClick}>
                      첫 슬라이드 만들기
                    </Button>
                  </div>
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t bg-muted/20">
        <Button variant="outline" className="w-full justify-start gap-2 h-9 text-xs font-semibold" asChild>
          <Link href="/">
            <ArrowLeft className="h-3 w-3" />
            나가기
          </Link>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

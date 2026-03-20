"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { WordcloudItem } from "@/types";
import { Cloud, Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WordcloudDisplayProps {
  slideId: string;
  maxWords?: number;
  className?: string;
  isPresenter?: boolean;
  compact?: boolean;
}

export default function WordcloudDisplay({
  slideId,
  maxWords = 100,
  className,
  isPresenter = false,
  compact = false,
}: WordcloudDisplayProps) {
  const [items, setItems] = useState<WordcloudItem[]>([]);
  const [prevItemIds, setPrevItemIds] = useState<Set<string>>(new Set());
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const initializedRef = useRef(false);

  // Fetch wordcloud items
  const fetchWordcloud = async () => {
    try {
      const res = await fetch(`/api/wordcloud/${slideId}`);
      const data: WordcloudItem[] = await res.json();
      const sliced = data.slice(0, maxWords);
      
      // Track new items for animation
      const currentIds = new Set(sliced.map(i => i.id));
      if (initializedRef.current) {
        const freshIds = new Set<string>();
        currentIds.forEach(id => {
          if (!prevItemIds.has(id)) freshIds.add(id);
        });
        if (freshIds.size > 0) {
          setNewItemIds(prev => new Set([...prev, ...freshIds]));
          // Clear animation flag after animation completes
          setTimeout(() => {
            setNewItemIds(prev => {
              const updated = new Set(prev);
              freshIds.forEach(id => updated.delete(id));
              return updated;
            });
          }, 600);
        }
      }
      
      setPrevItemIds(currentIds);
      initializedRef.current = true;
      setItems(sliced);
    } catch (error) {
      console.error("Error fetching wordcloud:", error);
    }
  };

  useEffect(() => {
    initializedRef.current = false;
    setPrevItemIds(new Set());
    setNewItemIds(new Set());
    fetchWordcloud();
  }, [slideId, maxWords]);

  // Polling
  useEffect(() => {
    const interval = setInterval(fetchWordcloud, 2000);
    return () => clearInterval(interval);
  }, [slideId, maxWords, prevItemIds]);

  const handleDeleteWord = async (wordId: string) => {
    try {
      const res = await fetch(`/api/wordcloud/${slideId}?wordId=${wordId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== wordId));
      }
    } catch (error) {
      console.error("Error deleting word:", error);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("워드클라우드의 모든 단어를 삭제하시겠습니까?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/wordcloud/${slideId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems([]);
      }
    } catch (error) {
      console.error("Error deleting all words:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const maxCount = useMemo(() => {
    return items.length > 0 ? Math.max(...items.map((i) => i.count)) : 1;
  }, [items]);

  const getItemStyle = (item: WordcloudItem, index: number) => {
    const minSize = compact ? 16 : 14;
    // Scale max font size down as word count increases in compact mode
    let maxSize = 56;
    if (compact) {
      if (items.length <= 3) maxSize = 48;
      else if (items.length <= 6) maxSize = 40;
      else if (items.length <= 10) maxSize = 34;
      else if (items.length <= 15) maxSize = 28;
      else maxSize = 22;
    }

    let size = minSize;

    if (items.length === 1) {
      size = maxSize;
    } else {
      const ratio = item.count / maxCount;
      size = minSize + ratio * (maxSize - minSize);
    }

    // 긴 단어의 경우 폰트 크기 축소
    if (item.word.length > 10) {
      size = Math.max(minSize, size * 0.75);
    }
    if (item.word.length > 15) {
      size = Math.max(minSize, size * 0.5);
    }

    // 세로 배치: 짧은 단어만 세로로 배치
    const isVertical = index % 4 === 0 && item.word.length < 10;

    return {
      fontSize: `${size}px`,
      writingMode: isVertical ? "vertical-rl" : "horizontal-tb",
      filter: `drop-shadow(0 4px 6px rgba(0,0,0,0.05))`,
    } as any;
  };

  const getWeight = (count: number): string => {
    const ratio = count / maxCount;
    if (ratio > 0.8) return "font-black";
    if (ratio > 0.5) return "font-extrabold";
    if (ratio > 0.3) return "font-bold";
    return "font-semibold";
  };

  const getColor = (index: number): string => {
    const colors = [
      "text-blue-500",
      "text-purple-500",
      "text-pink-500",
      "text-indigo-500",
      "text-cyan-500",
      "text-violet-500",
      "text-emerald-500",
      "text-rose-500",
      "text-orange-500",
      "text-amber-500",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className={cn(
      "overflow-hidden relative flex flex-col",
      compact ? "p-0" : "bg-background border rounded-2xl p-4 sm:p-8",
      className
    )}>
      {/* Pop-up animation styles */}
      <style jsx>{`
        @keyframes wordPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.3); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .word-pop-in {
          animation: wordPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      {/* Presenter delete controls - discretely placed at bottom */}
      {isPresenter && items.length > 0 && (
        <div className="absolute bottom-4 right-4 z-20">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDeleteAll}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold tracking-wide">결과 초기화</span>
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center space-y-4 opacity-30">
          <Sparkles className={cn("text-primary", compact ? "h-16 w-16" : "h-10 w-10")} />
          <p className={cn("font-bold font-mono tracking-tighter uppercase", compact ? "text-3xl" : "text-xl")}>Waiting for input</p>
        </div>
      ) : (
        <div className={cn(
          "flex flex-wrap justify-center items-center flex-1 relative z-10 content-center",
          compact ? "gap-x-10 gap-y-5 p-2" : "gap-x-8 gap-y-4 py-4 max-w-5xl mx-auto overflow-y-auto"
        )}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={cn(
                "cursor-default transition-all duration-300 hover:scale-110 hover:z-20 relative group",
                "max-w-full break-all text-center select-none",
                getColor(idx),
                getWeight(item.count),
                newItemIds.has(item.id) && "word-pop-in"
              )}
              style={getItemStyle(item, idx)}
              title={`${item.word} (${item.count}회)`}
            >
              {item.word}
              {/* Per-word delete button for presenter */}
              {isPresenter && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWord(item.id);
                  }}
                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center shadow-lg z-30"
                  style={{ fontSize: "10px", writingMode: "horizontal-tb" }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

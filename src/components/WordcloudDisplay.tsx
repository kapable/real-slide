"use client";

import { useState, useEffect, useMemo } from "react";
import { WordcloudItem } from "@/types";
import { Cloud, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface WordcloudDisplayProps {
  slideId: string;
  maxWords?: number;
  className?: string;
}

export default function WordcloudDisplay({
  slideId,
  maxWords = 100,
  className
}: WordcloudDisplayProps) {
  const [items, setItems] = useState<WordcloudItem[]>([]);

  // Fetch wordcloud items
  const fetchWordcloud = async () => {
    try {
      const res = await fetch(`/api/wordcloud/${slideId}`);
      const data = await res.json();
      setItems(data.slice(0, maxWords));
    } catch (error) {
      console.error("Error fetching wordcloud:", error);
    }
  };

  useEffect(() => {
    fetchWordcloud();
  }, [slideId, maxWords]);

  // Polling
  useEffect(() => {
    const interval = setInterval(fetchWordcloud, 2000);
    return () => clearInterval(interval);
  }, [slideId, maxWords]);

  const maxCount = useMemo(() => {
    return items.length > 0 ? Math.max(...items.map((i) => i.count)) : 1;
  }, [items]);

  const getSize = (count: number): number => {
    const minSize = 14;
    const maxSize = 56;
    if (items.length === 1) return maxSize;
    const ratio = (count) / maxCount;
    return minSize + ratio * (maxSize - minSize);
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
    ];
    return colors[index % colors.length];
  };

  return (
    <div className={cn("bg-background border rounded-2xl p-8 overflow-hidden relative", className)}>
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Cloud className="h-32 w-32" />
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/10 p-2 rounded-xl text-primary">
          <Cloud className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <h3 className="font-bold text-lg tracking-tight">실시간 워드클라우드</h3>
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">총 {items.reduce((acc, i) => acc + i.count, 0)}개의 의견</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-30">
          <Sparkles className="h-10 w-10 text-primary" />
          <p className="text-xl font-bold">참여를 기다리고 있습니다</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center items-center py-8 min-h-[300px] max-w-4xl mx-auto">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={cn(
                "cursor-default transition-all duration-300 hover:scale-110 hover:z-10",
                getColor(idx),
                getWeight(item.count)
              )}
              style={{ 
                fontSize: `${getSize(item.count)}px`,
                filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.05))`
              }}
              title={`${item.word} (${item.count}회)`}
            >
              {item.word}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

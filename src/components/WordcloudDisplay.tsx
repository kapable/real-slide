// src/components/WordcloudDisplay.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { WordcloudItem } from "@/types";

interface WordcloudDisplayProps {
  slideId: string;
  maxWords?: number;
}

export default function WordcloudDisplay({
  slideId,
  maxWords = 100,
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

  // Poll for updates every 2s
  useEffect(() => {
    const interval = setInterval(fetchWordcloud, 2000);
    return () => clearInterval(interval);
  }, [slideId, maxWords]);

  // Calculate font sizes based on count
  const maxCount = useMemo(() => {
    return Math.max(...items.map((i) => i.count), 1);
  }, [items]);

  const getSize = (count: number): string => {
    const minSize = 12;
    const maxSize = 48;
    const ratio = count / maxCount;
    const size = minSize + ratio * (maxSize - minSize);
    return `${size}px`;
  };

  const getColor = (index: number): string => {
    const colors = [
      "text-blue-600",
      "text-purple-600",
      "text-pink-600",
      "text-red-600",
      "text-orange-600",
      "text-green-600",
      "text-indigo-600",
      "text-rose-600",
      "text-cyan-600",
      "text-amber-600",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        워드클라우드 ({items.length})
      </h3>

      {items.length === 0 ? (
        <p className="text-center text-gray-500 py-12">
          아직 등록된 단어가 없습니다
        </p>
      ) : (
        <div className="flex flex-wrap gap-4 justify-center items-center min-h-64">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`font-bold cursor-default transition hover:scale-110 ${getColor(idx)}`}
              style={{ fontSize: getSize(item.count) }}
              title={`${item.word} (${item.count})`}
            >
              {item.word}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

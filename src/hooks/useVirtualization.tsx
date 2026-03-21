"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

interface VirtualizationOptions {
  /** Height of each item in pixels */
  itemHeight: number;
  /** Total number of items */
  itemCount: number;
  /** Container height in pixels */
  containerHeight: number;
  /** Overscan count (items to render above/below viewport) */
  overscan?: number;
}

interface VirtualizationResult {
  /** Visible items to render */
  visibleItems: Array<{ index: number; style: React.CSSProperties }>;
  /** Total height of the list */
  totalHeight: number;
  /** Container props to spread */
  containerProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLElement>) => void;
    ref: (node: HTMLElement | null) => void;
  };
  /** Inner container style */
  innerStyle: React.CSSProperties;
  /** Scroll to specific index */
  scrollToIndex: (index: number) => void;
}

/**
 * Hook for virtualizing long lists
 * Only renders items visible in the viewport
 */
export function useVirtualization({
  itemHeight,
  itemCount,
  containerHeight,
  overscan = 3,
}: VirtualizationOptions): VirtualizationResult {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = useMemo(() => itemCount * itemHeight, [itemCount, itemHeight]);

  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const items: Array<{ index: number; style: React.CSSProperties }> = [];

    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        style: {
          position: "absolute" as const,
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        },
      });
    }

    return items;
  }, [scrollTop, itemHeight, itemCount, containerHeight, overscan]);

  const scrollToIndex = useCallback(
    (index: number) => {
      if (containerRef.current) {
        containerRef.current.scrollTop = index * itemHeight;
      }
    },
    [itemHeight]
  );

  const setContainerRef = useCallback((node: HTMLElement | null) => {
    containerRef.current = node;
  }, []);

  return {
    visibleItems,
    totalHeight,
    containerProps: {
      style: { overflowY: "auto", position: "relative", height: containerHeight },
      onScroll: handleScroll,
      ref: setContainerRef,
    },
    innerStyle: {
      position: "relative",
      height: totalHeight,
    },
    scrollToIndex,
  };
}

/**
 * Simple virtualized list component
 */
interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 3,
}: VirtualizedListProps<T>) {
  const { visibleItems, containerProps, innerStyle } = useVirtualization({
    itemHeight,
    itemCount: items.length,
    containerHeight,
    overscan,
  });

  return (
    <div {...containerProps} className={className}>
      <div style={innerStyle}>
        {visibleItems.map(({ index, style }) => (
          <div key={index} style={style}>
            {renderItem(items[index], index)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Hook for infinite scroll loading
 */
interface InfiniteScrollOptions {
  /** Has more items to load */
  hasMore: boolean;
  /** Is currently loading */
  isLoading: boolean;
  /** Callback to load more items */
  onLoadMore: () => void;
  /** Threshold in pixels from bottom to trigger load */
  threshold?: number;
}

export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 200,
}: InfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const options = {
      rootMargin: `${threshold}px`,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLoading && hasMore) {
        onLoadMore();
      }
    }, options);

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, onLoadMore, threshold]);

  return loadMoreRef;
}

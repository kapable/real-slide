"use client";

import { useEffect, useRef } from "react";

interface PerformanceMetrics {
  name: string;
  startTime: number;
  duration?: number;
}

/**
 * Hook to measure component render performance
 * Usage: usePerformance("ComponentName")
 */
export function usePerformance(name: string) {
  const startTime = useRef<number>(0);
  const hasLogged = useRef<boolean>(false);

  useEffect(() => {
    startTime.current = performance.now();

    return () => {
      if (process.env.NODE_ENV === "development" && !hasLogged.current) {
        const duration = performance.now() - startTime.current;
        if (duration > 16) {
          // Only log if render took more than 16ms (1 frame)
          console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
        }
        hasLogged.current = true;
      }
    };
  }, [name]);
}

/**
 * Hook to track Web Vitals
 */
export function useWebVitals() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Report LCP
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      // Log to console in development
      if (process.env.NODE_ENV === "development") {
        console.log("[Web Vitals] LCP:", lastEntry.startTime.toFixed(2), "ms");
      }

      // Could send to analytics service here
    });

    try {
      observer.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // Observer not supported
    }

    return () => observer.disconnect();
  }, []);
}

/**
 * Measure function execution time
 */
export function measurePerformance<T>(name: string, fn: () => T): T {
  if (process.env.NODE_ENV !== "development") {
    return fn();
  }

  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  if (duration > 1) {
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Measure async function execution time
 */
export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (process.env.NODE_ENV !== "development") {
    return fn();
  }

  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);

  return result;
}

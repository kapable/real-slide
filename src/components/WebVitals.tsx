"use client";

import { useEffect } from "react";

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
}

/**
 * Web Vitals Reporter Component
 * Tracks and reports Core Web Vitals metrics
 */
export function WebVitals() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return;

    // Report web vitals
    const reportWebVitals = (metric: WebVitalsMetric) => {
      // Log to console in development
      if (process.env.NODE_ENV === "development") {
        console.log(`[Web Vitals] ${metric.name}:`, {
          value: `${metric.value.toFixed(2)}ms`,
          rating: metric.rating,
          id: metric.id,
        });
      }

      // In production, you could send to analytics service
      // Example: sendToAnalytics(metric);
    };

    // Use web-vitals library if available, otherwise use PerformanceObserver
    const observePerformance = () => {
      // Observe LCP (Largest Contentful Paint)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          reportWebVitals({
            name: "LCP",
            value: lastEntry.startTime,
            rating: lastEntry.startTime <= 2500 ? "good" : lastEntry.startTime <= 4000 ? "needs-improvement" : "poor",
            delta: lastEntry.startTime,
            id: "v1",
          });
        });
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      } catch (e) {
        // Not supported
      }

      // Observe FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            reportWebVitals({
              name: "FID",
              value: entry.processingStart - entry.startTime,
              rating: entry.processingStart - entry.startTime <= 100 ? "good" : entry.processingStart - entry.startTime <= 300 ? "needs-improvement" : "poor",
              delta: entry.processingStart - entry.startTime,
              id: entry.id,
            });
          });
        });
        fidObserver.observe({ type: "first-input", buffered: true });
      } catch (e) {
        // Not supported
      }

      // Observe CLS (Cumulative Layout Shift)
      try {
        let clsValue = 0;
        let clsEntries: any[] = [];
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              clsEntries.push(entry);
            }
          });
        });
        clsObserver.observe({ type: "layout-shift", buffered: true });

        // Report CLS on page hide
        const reportCLS = () => {
          reportWebVitals({
            name: "CLS",
            value: clsValue * 1000,
            rating: clsValue <= 0.1 ? "good" : clsValue <= 0.25 ? "needs-improvement" : "poor",
            delta: clsValue * 1000,
            id: "v1",
          });
        };

        window.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "hidden") {
            reportCLS();
          }
        });

        window.addEventListener("pagehide", reportCLS);
      } catch (e) {
        // Not supported
      }

      // Observe TTFB (Time to First Byte)
      try {
        const navigationEntry = performance.getEntriesByType("navigation")[0] as any;
        if (navigationEntry) {
          const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
          reportWebVitals({
            name: "TTFB",
            value: ttfb,
            rating: ttfb <= 200 ? "good" : ttfb <= 500 ? "needs-improvement" : "poor",
            delta: ttfb,
            id: "v1",
          });
        }
      } catch (e) {
        // Not supported
      }
    };

    // Run after page load
    if (document.readyState === "complete") {
      observePerformance();
    } else {
      window.addEventListener("load", observePerformance);
    }

    return () => {
      // Cleanup is handled by PerformanceObserver automatically
    };
  }, []);

  return null;
}

/**
 * Hook to get current web vitals
 */
export function useWebVitalsReport() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const vitals: Record<string, number> = {};

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "largest-contentful-paint") {
          vitals.LCP = entry.startTime;
        }
      }
    });

    try {
      observer.observe({ entryTypes: ["largest-contentful-paint", "first-input", "layout-shift"] });
    } catch (e) {
      // Not supported
    }

    return () => observer.disconnect();
  }, []);

  return null;
}

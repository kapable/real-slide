/**
 * Performance Utilities
 * Helpers for tracking and measuring performance metrics
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    count: number;
  };
}

const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 500;

/**
 * Track a performance metric
 */
export function trackMetric(
  name: string,
  value: number,
  tags?: Record<string, string>
): void {
  const metric: PerformanceMetric = {
    name,
    value,
    timestamp: Date.now(),
    tags,
  };

  metrics.push(metric);

  // Keep only the last MAX_METRICS
  if (metrics.length > MAX_METRICS) {
    metrics.splice(0, MAX_METRICS);
  }

  // Log in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${name}: ${value.toFixed(2)}ms`, tags || "");
  }
}

/**
 * Start a performance timer
 */
export function startTimer(name: string): () => number {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;
    trackMetric(name, duration);
    return duration;
  };
}

/**
 * Get performance report for a metric
 */
export function getPerformanceReport(metricName?: string): PerformanceReport {
  const filteredMetrics = metricName
    ? metrics.filter((m) => m.name === metricName)
    : metrics;

  const values = filteredMetrics.map((m) => m.value);

  return {
    metrics: filteredMetrics,
    summary: {
    avgDuration: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    minDuration: values.length > 0 ? Math.min(...values) : 0,
    maxDuration: values.length > 0 ? Math.max(...values) : 0,
    count: values.length,
  },
  };
}

/**
 * Clear performance metrics
 */
export function clearPerformanceMetrics(): void {
  metrics.length = 0;
}

/**
 * Create a performance observer
 * Tracks when a function takes longer than a threshold
 */
export function observePerformance(
  name: string,
  fn: () => void,
  options: { threshold?: number; onSlow?: (duration: number) => void } = {}
): void {
  const { threshold = 100, onSlow } = options;

  const stopTimer = startTimer(name);

  try {
    fn();
  } finally {
    const duration = stopTimer();
    if (duration > threshold && onSlow) {
      onSlow(duration);
    }
  }
}

/**
 * Performance threshold constants
 */
export const PERFORMANCE_THRESHOLDS = {
  API_CALL: 500, // 500ms
  RENDER: 16, // 16ms (one frame)
  ANIMATION: 16, // 16ms
  INTERACTION: 100, // 100ms
  DATABASE_QUERY: 200, // 200ms
} as const;

/**
 * Measure API call performance
 */
export async function measureApiCall<T>(
  name: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const stopTimer = startTimer(`api:${name}`);

  try {
    return await fetcher();
  } finally {
    const duration = stopTimer();

    if (duration > PERFORMANCE_THRESHOLDS.API_CALL) {
      console.warn(`[Performance] Slow API call: ${name} took ${duration.toFixed(2)}ms`);
    }
  }
}

/**
 * Hook to track component render time
 */
export function trackRender(componentName: string, renderTime: number): void {
  trackMetric(`render:${componentName}`, renderTime);

  if (renderTime > PERFORMANCE_THRESHOLDS.RENDER) {
    console.warn(`[Performance] Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
  }
}

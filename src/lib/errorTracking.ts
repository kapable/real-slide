/**
 * Error Tracking Utility
 * Simple error tracking that can be extended to integrate with Sentry or other services
 */

interface ErrorContext {
  [key: string]: any;
}

interface TrackedError {
  message: string;
  stack?: string;
  context?: ErrorContext;
  timestamp: number;
  url: string;
  userAgent: string;
}

// In-memory error log for development
const errorLog: TrackedError[] = [];
const MAX_ERRORS = 100;

/**
 * Track an error
 */
export function trackError(error: Error, context?: ErrorContext): void {
  const trackedError: TrackedError = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: Date.now(),
    url: typeof window !== "undefined" ? window.location.href : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error("[Error Tracking]", trackedError);
  }

  // Store in memory
  errorLog.push(trackedError);
  if (errorLog.length > MAX_ERRORS) {
    errorLog.shift();
  }

  // In production, send to error tracking service
  // Example: Sentry.captureException(error, { extra: context });
}

/**
 * Track a custom error message
 */
export function trackErrorMessage(message: string, context?: ErrorContext): void {
  trackError(new Error(message), context);
}

/**
 * Get recent errors
 */
export function getRecentErrors(count: number = 10): TrackedError[] {
  return errorLog.slice(-count);
}

/**
 * Clear error log
 */
export function clearErrorLog(): void {
  errorLog.length = 0;
}

/**
 * Global error handler setup
 */
export function setupErrorTracking(): () => void {
  if (typeof window === "undefined") return () => {};

  // Handle uncaught errors
  const handleError = (event: ErrorEvent) => {
    trackError(event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };

  // Handle unhandled promise rejections
  const handleRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    trackError(error, { type: "unhandledrejection" });
  };

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);

  // Return cleanup function
  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
  };
}

/**
 * Performance timing tracking
 */
export function trackTiming(name: string, duration: number): void {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }

  // In production, send to analytics
  // Example: analytics.track('performance', { name, duration });
}

/**
 * Measure function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    trackTiming(name, performance.now() - start);
  }
}

/**
 * Measure sync function execution time
 */
export function measure<T>(name: string, fn: () => T): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    trackTiming(name, performance.now() - start);
  }
}

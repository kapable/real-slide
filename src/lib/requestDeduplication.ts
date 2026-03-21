/**
 * Request Deduplication Utility
 * Prevents duplicate concurrent requests to the same endpoint
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest<any>>();
const CACHE_DURATION = 5000; // 5 seconds

/**
 * Deduplicate requests to the same endpoint
 * If a request is already pending, return that promise instead of making a new one
 */
export async function dedupeRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  cacheDuration: number = CACHE_DURATION
): Promise<T> {
  const now = Date.now();
  const pending = pendingRequests.get(key);

  // Return existing promise if still valid
  if (pending && now - pending.timestamp < cacheDuration) {
    return pending.promise;
  }

  // Create new request
  const promise = fetcher()
    .finally(() => {
      // Clean up after request completes
      setTimeout(() => {
        const current = pendingRequests.get(key);
        if (current && current.timestamp === now) {
          pendingRequests.delete(key);
        }
      }, cacheDuration);
    });

  pendingRequests.set(key, { promise, timestamp: now });

  return promise;
}

/**
 * Simple in-memory cache for API responses
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const responseCache = new Map<string, CacheEntry<any>>();

interface CacheOptions {
  ttl: number; // Time to live in milliseconds
}

export function getCached<T>(key: string): T | null {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data as T;
  }
  return null;
}

export function setCached<T>(key: string, data: T, ttl: number): void {
  responseCache.set(key, { data, timestamp: Date.now(), ttl });
}

export function clearCache(key?: string): void {
  if (key) {
    responseCache.delete(key);
  } else {
    responseCache.clear();
  }
}

/**
 * Fetch with caching and deduplication
 */
export async function fetchWithCache<T>(
  url: string,
  options: {
    ttl?: number;
    dedupe?: boolean;
    fetchOptions?: RequestInit;
  } = {}
): Promise<T> {
  const { ttl = 30000, dedupe = true, fetchOptions } = options;

  // Check cache first
  const cached = getCached<T>(url);
  if (cached !== null) {
    return cached;
  }

  // Define fetcher
  const fetcher = async () => {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    setCached(url, data, ttl);
    return data;
  };

  // Use deduplication if enabled
  if (dedupe) {
    return dedupeRequest(url, fetcher, ttl);
  }

  return fetcher();
}

/**
 * Batch multiple requests together
 */
export class RequestBatcher<T, R> {
  private batch: Array<{ item: T; resolve: (value: R) => void; reject: (error: Error) => void }> = [];
  private timeout: NodeJS.Timeout | null = null;

  constructor(
    private batchFn: (items: T[]) => Promise<R[]>,
    private delay: number = 10
  ) {}

  add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.batch.push({ item, resolve, reject });
      this.scheduleFlush();
    });
  }

  private scheduleFlush(): void {
    if (this.timeout) return;

    this.timeout = setTimeout(() => {
      const batch = this.batch;
      this.batch = [];
      this.timeout = null;

      this.batchFn(batch.map((b) => b.item))
        .then((results) => {
          batch.forEach((b, i) => b.resolve(results[i]));
        })
        .catch((error) => {
          batch.forEach((b) => b.reject(error));
        });
    }, this.delay);
  }
}

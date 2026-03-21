"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getCached, setCached } from "@/lib/requestDeduplication";

interface UseQueryOptions<T> {
  /** Cache time-to-live in milliseconds */
  ttl?: number;
  /** Enable/disable caching */
  cacheEnabled?: boolean;
  /** Custom cache key (defaults to url) */
  cacheKey?: string;
  /** Auto-fetch on mount */
  enabled?: boolean;
  /** Initial data */
  initialData?: T;
  /** Refetch interval in milliseconds */
  refetchInterval?: number;
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface UseQueryReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
  isFetching: boolean;
}

/**
 * Hook for data fetching with caching and deduplication
 */
export function useQuery<T>(
  url: string,
  options: UseQueryOptions<T> = {}
): UseQueryReturn<T> {
  const {
    ttl = 30000,
    cacheEnabled = true,
    cacheKey,
    enabled = true,
    initialData,
    refetchInterval,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(enabled && !initialData);
  const [isFetching, setIsFetching] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const abortControllerRef = useRef<AbortController | null>(null);
  const key = cacheKey || url;

  const fetchData = useCallback(async () => {
    // Check cache first
    if (cacheEnabled) {
      const cached = getCached<T>(key);
      if (cached !== null) {
        setData(cached);
        setIsLoading(false);
        setIsFetching(false);
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsFetching(true);
    setIsError(false);
    setError(undefined);

    try {
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (cacheEnabled) {
        setCached(key, result, ttl);
      }

      setData(result);
      onSuccess?.(result);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Ignore abort errors
      }
      const error = err instanceof Error ? err : new Error(String(err));
      setIsError(true);
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [url, key, cacheEnabled, ttl, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, fetchData]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(() => {
      fetchData();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled, fetchData]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchData,
    isFetching,
  };
}

/**
 * Hook for mutation operations (POST, PUT, DELETE, PATCH)
 */
interface UseMutationOptions<T, P> {
  /** Callback on success */
  onSuccess?: (data: T, variables: P) => void;
  /** Callback on error */
  onError?: (error: Error, variables: P) => void;
  /** Callback after mutation (success or error) */
  onSettled?: (data: T | undefined, error: Error | undefined, variables: P) => void;
}

interface UseMutationReturn<T, P> {
  mutate: (variables: P) => Promise<T | undefined>;
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  reset: () => void;
}

export function useMutation<T, P>(
  mutationFn: (variables: P) => Promise<T>,
  options: UseMutationOptions<T, P> = {}
): UseMutationReturn<T, P> {
  const { onSuccess, onError, onSettled } = options;

  const [data, setData] = useState<T | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const mutate = useCallback(async (variables: P) => {
    setIsLoading(true);
    setIsError(false);
    setError(undefined);

    try {
      const result = await mutationFn(variables);
      setData(result);
      onSuccess?.(result, variables);
      onSettled?.(result, undefined, variables);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setIsError(true);
      setError(error);
      onError?.(error, variables);
      onSettled?.(undefined, error, variables);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, onSuccess, onError, onSettled]);

  const reset = useCallback(() => {
    setData(undefined);
    setIsLoading(false);
    setIsError(false);
    setError(undefined);
  }, []);

  return {
    mutate,
    data,
    isLoading,
    isError,
    error,
    reset,
  };
}

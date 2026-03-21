"use client";

import { Suspense, ComponentType, memo } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuspenseWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * Loading spinner fallback component
 */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Suspense wrapper with customizable fallback
 */
function SuspenseWrapperComponent({ children, fallback, className }: SuspenseWrapperProps) {
  return (
    <Suspense fallback={fallback || <LoadingSpinner className={className} />}>
      {children}
    </Suspense>
  );
}

export const SuspenseWrapper = memo(SuspenseWrapperComponent);

/**
 * HOC to wrap a component with Suspense
 */
export function withSuspense<P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode
) {
  const WrappedComponent = memo(function WithSuspense(props: P) {
    return (
      <Suspense fallback={fallback || <LoadingSpinner />}>
        <Component {...props} />
      </Suspense>
    );
  });
  WrappedComponent.displayName = `withSuspense(${Component.displayName || Component.name || "Component"})`;
  return WrappedComponent;
}

/**
 * Skeleton loader for cards
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-6 space-y-4 animate-pulse", className)}>
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
      <div className="h-8 bg-muted rounded w-full" />
    </div>
  );
}

/**
 * Skeleton loader for tables
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-md border">
      <div className="border-b bg-muted/50 p-4">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 p-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="h-4 bg-muted rounded flex-1 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for stats
 */
export function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-6 space-y-3 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

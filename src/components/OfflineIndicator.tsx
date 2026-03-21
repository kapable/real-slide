"use client";

import { useState, useEffect, memo } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

function OfflineIndicatorComponent() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Check initial online status
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      // Hide reconnected message after 3 seconds
      setTimeout(() => setShowReconnected(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        isOffline
          ? "bg-destructive text-destructive-foreground"
          : "bg-green-600 text-white"
      )}
      role="alert"
      aria-live="polite"
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">You're offline. Some features may be unavailable.</span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Back online!</span>
        </>
      )}
    </div>
  );
}

export const OfflineIndicator = memo(OfflineIndicatorComponent);

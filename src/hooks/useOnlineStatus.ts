"use client";

import { useState, useEffect } from "react";

/**
 * Hook to track online/offline status
 * @returns boolean indicating if the user is online
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook to detect slow network connection
 * Uses Network Information API if available
 */
export function useNetworkQuality(): {
  isSlowConnection: boolean;
  effectiveType: string;
  downlink: number | null;
} {
  const [networkInfo, setNetworkInfo] = useState({
    isSlowConnection: false,
    effectiveType: "unknown",
    downlink: null as number | null,
  });

  useEffect(() => {
    // Check if Network Information API is available
    const connection = (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (!connection) return;

    const updateNetworkInfo = () => {
      const effectiveType = connection.effectiveType || "unknown";
      const downlink = connection.downlink || null;

      setNetworkInfo({
        isSlowConnection: effectiveType === "2g" || effectiveType === "slow-2g",
        effectiveType,
        downlink,
      });
    };

    updateNetworkInfo();
    connection.addEventListener("change", updateNetworkInfo);

    return () => {
      connection.removeEventListener("change", updateNetworkInfo);
    };
  }, []);

  return networkInfo;
}

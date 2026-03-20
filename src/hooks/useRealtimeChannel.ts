"use client";

import { useEffect, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useRealtimeChannel(
  channelName: string,
  config?: {
    onBroadcast?: (payload: any) => void;
    onPostgresChanges?: (payload: any) => void;
  },
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Subscribe to channel
    const channel = supabase.channel(channelName);

    if (config?.onBroadcast) {
      channel.on("broadcast", { event: "*" }, (payload) => {
        config.onBroadcast?.(payload.payload);
      });
    }

    if (config?.onPostgresChanges) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => {
          config.onPostgresChanges?.(payload);
        },
      );
    }

    channel.subscribe((status) => {
      console.log("Channel status:", status);
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, config?.onBroadcast, config?.onPostgresChanges]);

  return {
    broadcast: (event: string, payload: any) => {
      return channelRef.current?.send({
        type: "broadcast",
        event,
        payload,
      });
    },
  };
}

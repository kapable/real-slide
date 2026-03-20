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

  const onBroadcastRef = useRef(config?.onBroadcast);
  const onPostgresChangesRef = useRef(config?.onPostgresChanges);

  useEffect(() => {
    onBroadcastRef.current = config?.onBroadcast;
    onPostgresChangesRef.current = config?.onPostgresChanges;
  });

  useEffect(() => {
    // Skip empty channel names (e.g. before resolvedSessionId is set)
    if (!channelName) return;

    console.log(`[Realtime] Subscribing to channel: ${channelName}`);
    const channel = supabase.channel(channelName);

    // Always register broadcast listener — use ref so the latest callback is used
    channel.on("broadcast", { event: "*" }, (payload) => {
      console.log(`[Realtime] Broadcast received on ${channelName}:`, payload.event);
      onBroadcastRef.current?.({ event: payload.event, ...payload.payload });
    });

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public" },
      (payload) => {
        onPostgresChangesRef.current?.(payload);
      },
    );

    channel.subscribe((status) => {
      console.log(`[Realtime] Channel ${channelName} status: ${status}`);
    });
    channelRef.current = channel;

    return () => {
      console.log(`[Realtime] Unsubscribing from channel: ${channelName}`);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelName]);

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

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
  }, [config?.onBroadcast, config?.onPostgresChanges]);

  useEffect(() => {
    const channel = supabase.channel(channelName);

    if (onBroadcastRef.current) {
      channel.on("broadcast", { event: "*" }, (payload) => {
        onBroadcastRef.current?.({ event: payload.event, ...payload.payload });
      });
    }

    if (onPostgresChangesRef.current) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => {
          onPostgresChangesRef.current?.(payload);
        },
      );
    }

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
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

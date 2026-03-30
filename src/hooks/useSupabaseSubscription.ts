"use client";

import { useEffect, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface SubscriptionConfig {
  channel: string;
  table: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
}

/**
 * Hook for managing Supabase realtime subscriptions with automatic cleanup
 */
export function useSupabaseSubscription(config: SubscriptionConfig) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    channelRef.current = supabase
      .channel(config.channel)
      .on(
        "postgres_changes",
        {
          event: config.event || "*",
          schema: "public",
          table: config.table,
          filter: config.filter,
        },
        (payload) => {
          switch (payload.eventType) {
            case "INSERT":
              config.onInsert?.(payload);
              break;
            case "UPDATE":
              config.onUpdate?.(payload);
              break;
            case "DELETE":
              config.onDelete?.(payload);
              break;
          }
          config.onChange?.(payload);
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [config.channel, config.table, config.event, config.filter]);

  return channelRef;
}

/**
 * Hook for multiple Supabase subscriptions with cleanup
 */
export function useSupabaseSubscriptions(
  configs: SubscriptionConfig[]
) {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    configs.forEach((config) => {
      const channel = supabase
        .channel(config.channel)
        .on(
          "postgres_changes",
          {
            event: config.event || "*",
            schema: "public",
            table: config.table,
            filter: config.filter,
          },
          (payload) => {
            switch (payload.eventType) {
              case "INSERT":
                config.onInsert?.(payload);
                break;
              case "UPDATE":
                config.onUpdate?.(payload);
                break;
              case "DELETE":
                config.onDelete?.(payload);
                break;
            }
            config.onChange?.(payload);
          }
        )
        .subscribe();

      channelsRef.current.push(channel);
    });

    // Cleanup all channels on unmount
    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, []);

  return channelsRef;
}

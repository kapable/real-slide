"use client";

import { useEffect, useRef } from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

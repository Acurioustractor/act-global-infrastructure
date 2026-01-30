'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase-client';

/**
 * Subscribe to Supabase Realtime INSERT events on the integration_events table.
 * Returns the most recent events as they arrive.
 */
export function useIntegrationEvents(source?: string, maxEvents = 50) {
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const channel = supabaseClient
      .channel('integration-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'integration_events',
          ...(source ? { filter: `source=eq.${source}` } : {}),
        },
        (payload) => {
          setEvents((prev) =>
            [payload.new as IntegrationEvent, ...prev].slice(0, maxEvents)
          );
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [source, maxEvents]);

  const clear = useCallback(() => setEvents([]), []);

  return { events, connected, clear };
}

/**
 * Subscribe to Supabase Realtime changes on any table.
 * Invalidates provided callback on INSERT/UPDATE/DELETE.
 */
export function useRealtimeInvalidation(
  table: string,
  onInvalidate: () => void,
  filter?: string
) {
  useEffect(() => {
    const channel = supabaseClient
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        () => {
          onInvalidate();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [table, filter, onInvalidate]);
}

export interface IntegrationEvent {
  id: string;
  source: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  action: string;
  payload?: Record<string, unknown>;
  latency_ms?: number;
  error?: string;
  processed_at?: string;
  created_at?: string;
}

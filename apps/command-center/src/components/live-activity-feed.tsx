'use client';

import { useEffect, useState } from 'react';
import { useIntegrationEvents, type IntegrationEvent } from '@/hooks/use-realtime';
import { supabaseClient } from '@/lib/supabase-client';

const SOURCE_LABELS: Record<string, string> = {
  ghl: 'GoHighLevel',
  xero: 'Xero',
  notion: 'Notion',
  gmail: 'Gmail',
  calendar: 'Calendar',
  imessage: 'iMessage',
};

const SOURCE_COLORS: Record<string, string> = {
  ghl: 'bg-blue-500',
  xero: 'bg-emerald-500',
  notion: 'bg-gray-500',
  gmail: 'bg-red-500',
  calendar: 'bg-yellow-500',
  imessage: 'bg-green-500',
};

const ACTION_ICONS: Record<string, string> = {
  created: '+',
  updated: '~',
  skipped: '-',
  failed: '!',
};

function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function EventRow({ event }: { event: IntegrationEvent }) {
  const color = SOURCE_COLORS[event.source] || 'bg-gray-500';
  const icon = ACTION_ICONS[event.action] || '?';
  const failed = event.action === 'failed';

  return (
    <div className={`flex items-start gap-3 py-2 px-3 rounded-lg ${failed ? 'bg-red-500/10' : 'hover:bg-zinc-800/50'}`}>
      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono text-xs text-zinc-500">{icon}</span>
          <span className="font-medium text-zinc-200 truncate">
            {event.event_type}
          </span>
          <span className="text-xs text-zinc-500">
            {SOURCE_LABELS[event.source] || event.source}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
          <span>{event.entity_type}/{event.entity_id?.slice(0, 8)}</span>
          {event.latency_ms != null && (
            <span className="text-zinc-600">{event.latency_ms}ms</span>
          )}
          <span className="ml-auto">{formatTime(event.processed_at || event.created_at)}</span>
        </div>
        {failed && event.error && (
          <p className="text-xs text-red-400 mt-1 truncate">{event.error}</p>
        )}
      </div>
    </div>
  );
}

export function LiveActivityFeed({ source, maxEvents = 20 }: { source?: string; maxEvents?: number }) {
  const { events: liveEvents, connected } = useIntegrationEvents(source, maxEvents);
  const [recentEvents, setRecentEvents] = useState<IntegrationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Load recent events on mount
  useEffect(() => {
    async function loadRecent() {
      let query = supabaseClient
        .from('integration_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(maxEvents);

      if (source) {
        query = query.eq('source', source);
      }

      const { data } = await query;
      if (data) {
        setRecentEvents(data as IntegrationEvent[]);
      }
      setLoading(false);
    }
    loadRecent();
  }, [source, maxEvents]);

  // Merge live events with recent, deduplicate by id
  const allEvents = [...liveEvents, ...recentEvents]
    .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
    .slice(0, maxEvents);

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-200">Live Activity</h3>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`} />
          <span className="text-xs text-zinc-500">
            {connected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-zinc-800/50">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">
            Loading events...
          </div>
        ) : allEvents.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">
            No events yet. Webhook events will appear here in real-time.
          </div>
        ) : (
          allEvents.map((event) => (
            <EventRow key={event.id} event={event} />
          ))
        )}
      </div>
    </div>
  );
}

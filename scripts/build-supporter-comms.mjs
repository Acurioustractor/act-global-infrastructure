#!/usr/bin/env node
/**
 * Aggregates communications_history by email domain into supporter_comms_summary.
 *
 * Source data: 27K rows in communications_history (gmail + imessage + calendar).
 * Most rows have contact_email = NULL but metadata->>'from' / metadata->>'to'
 * carries the addresses. We parse those, extract domain, aggregate per domain.
 *
 * Output: supporter_comms_summary table keyed by domain. The /supporters page
 * joins this to supporters_intelligence on email-domain match.
 *
 * Cron: daily 06:15am AEST (after supporters-intelligence 06:00 + project-pipelines 06:10).
 *
 * Plan: act-communication-pipeline-2026-05-23-locked § supporter comms aggregation
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Domains we don't care about (own + system + spam-ish)
const SKIP_DOMAINS = new Set([
  'act.place', 'benjamink.com.au', 'gmail.com', 'googlegroups.com',
  'noreply.com', 'no-reply.com', 'mail.google.com',
  'slack.com', 'notion.so', 'github.com', 'linkedin.com',
  'apple.com', 'icloud.com', 'me.com',
]);

function extractDomain(s) {
  if (!s) return null;
  // Strip "Name <email>" → email
  const m = s.match(/<([^>]+)>/) || [null, s];
  const email = (m[1] || s).trim().toLowerCase();
  const at = email.indexOf('@');
  if (at < 0) return null;
  const domain = email.slice(at + 1).split(/[>\s,;]/)[0].toLowerCase();
  if (!domain || domain.length < 4) return null;
  if (SKIP_DOMAINS.has(domain)) return null;
  return domain;
}

function pickDomain(comm) {
  // Direction tells us which side is the "other party"
  const m = comm.metadata || {};
  if (comm.direction === 'outbound' || comm.direction === 'out') {
    // We sent → other party is in 'to'
    return extractDomain(m.to || m.recipient);
  } else if (comm.direction === 'inbound' || comm.direction === 'in') {
    // They sent → other party is in 'from'
    return extractDomain(m.from || m.sender);
  }
  // Unknown direction: try contact_email first, then from
  return extractDomain(comm.contact_email)
    || extractDomain(m.from)
    || extractDomain(m.to);
}

async function main() {
  console.log('📧 Building supporter comms summary...\n');

  const nowMs = Date.now();
  const day = 24 * 3600_000;

  // Pull comms in batches. Supabase default cap is 1000/query so we paginate at that boundary.
  const PAGE = 1000;
  let from = 0;
  const agg = new Map(); // domain → aggregator

  while (true) {
    const { data, error } = await supabase
      .from('communications_history')
      .select('id, channel, direction, subject, content_preview, source_system, source_id, occurred_at, contact_email, metadata, waiting_for_response')
      .order('occurred_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const c of data) {
      const domain = pickDomain(c);
      if (!domain) continue;
      if (!agg.has(domain)) {
        agg.set(domain, {
          domain,
          last_touch_at: null,
          last_touch_channel: null,
          last_touch_direction: null,
          last_touch_subject: null,
          last_touch_snippet: null,
          last_touch_source_id: null,
          total_30d: 0, total_90d: 0, total_365d: 0,
          in_30d: 0, out_30d: 0,
          waiting_for_response_count: 0,
          channels: new Set(),
          first_touch_at: null,
        });
      }
      const a = agg.get(domain);
      const at = c.occurred_at;
      if (at && (!a.last_touch_at || at > a.last_touch_at)) {
        a.last_touch_at = at;
        a.last_touch_channel = c.channel;
        a.last_touch_direction = c.direction;
        a.last_touch_subject = c.subject;
        a.last_touch_snippet = (c.content_preview || '').slice(0, 240);
        a.last_touch_source_id = c.source_id;
      }
      if (at && (!a.first_touch_at || at < a.first_touch_at)) {
        a.first_touch_at = at;
      }
      const ageDays = at ? (nowMs - new Date(at).getTime()) / day : 999;
      if (ageDays <= 30) {
        a.total_30d++;
        if (c.direction === 'inbound' || c.direction === 'in') a.in_30d++;
        if (c.direction === 'outbound' || c.direction === 'out') a.out_30d++;
      }
      if (ageDays <= 90)  a.total_90d++;
      if (ageDays <= 365) a.total_365d++;
      if (c.waiting_for_response) a.waiting_for_response_count++;
      if (c.channel) a.channels.add(c.channel);
    }
    if (data.length < PAGE) break;
    from += PAGE;
    process.stdout.write('.');
  }
  console.log('');
  console.log(`✓ Aggregated ${agg.size} unique domains from ${from + PAGE} comms scanned`);

  // Convert to insert rows
  const rows = [...agg.values()].map(a => ({
    domain: a.domain,
    last_touch_at: a.last_touch_at,
    last_touch_channel: a.last_touch_channel,
    last_touch_direction: a.last_touch_direction,
    last_touch_subject: a.last_touch_subject ? a.last_touch_subject.slice(0, 500) : null,
    last_touch_snippet: a.last_touch_snippet,
    last_touch_source_id: a.last_touch_source_id,
    total_30d: a.total_30d,
    total_90d: a.total_90d,
    total_365d: a.total_365d,
    in_30d: a.in_30d,
    out_30d: a.out_30d,
    waiting_for_response_count: a.waiting_for_response_count,
    channels: [...a.channels],
    first_touch_at: a.first_touch_at,
    computed_at: new Date().toISOString(),
  }));

  // Wipe + bulk insert
  await supabase.from('supporter_comms_summary').delete().neq('domain', '___never_match');
  // Batch insert (Supabase limit ~1000 per insert)
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase.from('supporter_comms_summary').insert(batch);
    if (error) { console.error(`Batch ${i}:`, error.message); throw error; }
    inserted += batch.length;
  }
  console.log(`✓ Wrote ${inserted} domain rows to supporter_comms_summary`);

  // Quick visibility
  const topActive = rows
    .filter(r => r.total_30d > 0)
    .sort((a, b) => b.total_30d - a.total_30d)
    .slice(0, 10);
  console.log('\nMost-active domains (last 30d):');
  for (const r of topActive) {
    console.log(`  ${r.total_30d.toString().padStart(3)}  ${r.domain.padEnd(35)} latest: ${r.last_touch_at?.slice(0,10)} (${r.last_touch_direction || '?'})`);
  }
}

main().catch(e => { console.error('Build failed:', e); process.exit(1); });

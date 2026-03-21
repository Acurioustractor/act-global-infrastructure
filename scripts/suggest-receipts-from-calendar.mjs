#!/usr/bin/env node

/**
 * Suggest Missing Receipts Based on Calendar Events
 *
 * Cross-references calendar events (travel, meetings, dinners) with
 * Xero transactions to find likely missing receipts.
 *
 * Usage:
 *   node scripts/suggest-receipts-from-calendar.mjs              # Last 30 days
 *   node scripts/suggest-receipts-from-calendar.mjs --days 90    # Last 90 days
 *   node scripts/suggest-receipts-from-calendar.mjs --notify     # Send Telegram alert
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const args = process.argv.slice(2);
const NOTIFY = args.includes('--notify');
const daysBack = (() => {
  const idx = args.indexOf('--days');
  return idx !== -1 ? parseInt(args[idx + 1], 10) : 30;
})();

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// ============================================================================
// CALENDAR EVENT TYPES THAT GENERATE RECEIPTS
// ============================================================================

const RECEIPT_EVENT_PATTERNS = [
  { type: 'flight', patterns: [/flight/i, /qantas/i, /virgin/i, /jetstar/i, /airport/i, /fly to/i, /flying/i, /rex\b/i, /bonza/i, /alliance air/i], vendors: ['Qantas', 'Virgin Australia', 'Jetstar', 'Rex', 'Bonza', 'Alliance Airlines'], rdRelevant: true },
  { type: 'hotel', patterns: [/hotel/i, /airbnb/i, /accommodation/i, /stay at/i, /check.?in/i, /motel/i, /lodge/i, /resort/i, /hostel/i], vendors: ['Airbnb', 'Booking.com', 'Wotif', 'Expedia', 'Agoda'], rdRelevant: true },
  { type: 'car_rental', patterns: [/rental car/i, /car hire/i, /avis/i, /budget/i, /thrifty/i, /hertz/i, /hire car/i], vendors: ['Avis', 'Budget', 'Thrifty', 'Hertz', 'Enterprise'], rdRelevant: true },
  { type: 'fuel', patterns: [/fuel/i, /petrol/i, /servo/i, /bp\b/i, /caltex/i, /shell\b/i, /ampol/i, /7-?eleven/i], vendors: ['BP', 'Caltex', 'Shell', 'Ampol', '7-Eleven'], rdRelevant: true },
  { type: 'meal', patterns: [/dinner/i, /lunch/i, /breakfast/i, /team meal/i, /restaurant/i, /team drinks/i], vendors: [], rdRelevant: false },
  { type: 'uber', patterns: [/uber/i, /taxi/i, /cab/i, /rideshare/i, /didi/i, /ola\b/i], vendors: ['Uber', 'DiDi', 'Ola', '13cabs'], rdRelevant: true },
  { type: 'event', patterns: [/conference/i, /summit/i, /workshop/i, /meetup/i, /festival/i, /hackathon/i, /demo day/i, /pitch night/i], vendors: ['Humanitix', 'Ticketmaster', 'Eventbrite', 'Luma'], rdRelevant: true },
  { type: 'travel_day', patterns: [/palm island/i, /yarrabah/i, /darwin/i, /cairns/i, /townsville/i, /travel to/i, /travelling/i, /road trip/i, /site visit/i, /field trip/i, /community visit/i], vendors: [], rdRelevant: true },
  { type: 'meeting', patterns: [/coffee with/i, /catch up with/i, /meeting at/i], vendors: [], rdRelevant: false },
];

// R&D eligible project codes for flagging receipt importance
const RD_PROJECT_CODES = ['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD'];

function classifyEvent(title, description) {
  const text = `${title} ${description || ''}`;
  for (const pattern of RECEIPT_EVENT_PATTERNS) {
    if (pattern.patterns.some(p => p.test(text))) {
      return pattern;
    }
  }
  return null;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log('=== Calendar-Based Receipt Suggestions ===');

  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  // 1. Fetch calendar events in date range
  const { data: events, error: evErr } = await supabase
    .from('calendar_events')
    .select('id, title, description, start_time, end_time, calendar_email, project_code, location')
    .gte('start_time', cutoff)
    .lte('start_time', now)
    .order('start_time', { ascending: false });

  if (evErr) { log(`ERROR loading events: ${evErr.message}`); return; }
  log(`Calendar events in last ${daysBack} days: ${events.length}`);

  // 2. Classify events that might generate receipts
  const receiptEvents = [];
  for (const event of events) {
    const classification = classifyEvent(event.title, event.description);
    if (classification) {
      receiptEvents.push({ ...event, classification });
    }
  }
  log(`Events likely to generate receipts: ${receiptEvents.length}`);

  if (receiptEvents.length === 0) {
    log('No receipt-generating events found');
    return;
  }

  // 3. Fetch Xero SPEND transactions without attachments in date range
  const transactions = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('xero_transactions')
      .select('id, xero_transaction_id, contact_name, total, date, has_attachments, project_code')
      .in('type', ['SPEND', 'SPEND-TRANSFER'])
      .gte('date', cutoff.split('T')[0])
      .order('date', { ascending: false })
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error) break;
    transactions.push(...(data || []));
    if (!data || data.length < 1000) break;
    page++;
  }
  log(`Xero SPEND transactions: ${transactions.length}`);

  // 4. Fetch existing receipts to exclude already-covered transactions
  const { data: existingReceipts } = await supabase
    .from('receipt_emails')
    .select('xero_transaction_id')
    .not('xero_transaction_id', 'is', null);
  const coveredTxnIds = new Set((existingReceipts || []).map(r => r.xero_transaction_id));

  // 5. Cross-reference: for each receipt event, find nearby unreceipted transactions
  const suggestions = [];

  for (const event of receiptEvents) {
    const eventDate = new Date(event.start_time);
    const windowStart = new Date(eventDate.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days before
    const windowEnd = new Date(eventDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days after

    for (const tx of transactions) {
      if (coveredTxnIds.has(tx.id)) continue;
      if (tx.has_attachments) continue;

      const txDate = new Date(tx.date);
      if (txDate < windowStart || txDate > windowEnd) continue;

      // Check if vendor matches event type
      const vendorLower = (tx.contact_name || '').toLowerCase();
      const eventVendors = event.classification.vendors.map(v => v.toLowerCase());
      const vendorMatch = eventVendors.length === 0 || eventVendors.some(v => vendorLower.includes(v) || v.includes(vendorLower));

      // For meals/meetings, any spend near the event is relevant
      const isGenericSpend = ['meal', 'meeting'].includes(event.classification.type);

      if (vendorMatch || isGenericSpend) {
        suggestions.push({
          event_title: event.title,
          event_date: event.start_time,
          event_type: event.classification.type,
          project_code: event.project_code || tx.project_code,
          transaction_contact: tx.contact_name,
          transaction_amount: Math.abs(parseFloat(tx.total)),
          transaction_date: tx.date,
          transaction_id: tx.id,
          xero_id: tx.xero_transaction_id,
        });
      }
    }
  }

  // Deduplicate by transaction ID
  const seen = new Set();
  const uniqueSuggestions = suggestions.filter(s => {
    if (seen.has(s.transaction_id)) return false;
    seen.add(s.transaction_id);
    return true;
  });

  // Sort by amount descending (biggest missing receipts first)
  uniqueSuggestions.sort((a, b) => b.transaction_amount - a.transaction_amount);

  // 6. Output with R&D impact analysis
  console.log(`\n=== Missing Receipt Suggestions (${uniqueSuggestions.length}) ===\n`);

  if (uniqueSuggestions.length === 0) {
    log('No missing receipts found based on calendar events!');
    return;
  }

  // Tag R&D relevance
  for (const s of uniqueSuggestions) {
    s.is_rd = RD_PROJECT_CODES.includes(s.project_code);
    s.rd_relevant_type = RECEIPT_EVENT_PATTERNS.find(p => p.type === s.event_type)?.rdRelevant || false;
  }

  let totalMissing = 0;
  let rdMissing = 0;
  for (const s of uniqueSuggestions) {
    const amt = `$${s.transaction_amount.toFixed(2)}`;
    const proj = s.project_code ? ` [${s.project_code}]` : '';
    const rdFlag = s.is_rd ? ' 🔬' : '';
    console.log(`  ${s.event_type.padEnd(12)} ${s.event_title.slice(0, 35).padEnd(37)} → ${(s.transaction_contact || '?').slice(0, 25).padEnd(27)} ${amt.padStart(10)}  ${s.transaction_date}${proj}${rdFlag}`);
    totalMissing += s.transaction_amount;
    if (s.is_rd) rdMissing += s.transaction_amount;
  }

  console.log(`\n  Total: $${totalMissing.toFixed(2)} across ${uniqueSuggestions.length} transactions`);

  // R&D impact
  if (rdMissing > 0) {
    const rdCount = uniqueSuggestions.filter(s => s.is_rd).length;
    console.log(`\n  🔬 R&D IMPACT:`);
    console.log(`     ${rdCount} missing receipts on R&D projects worth $${rdMissing.toFixed(2)}`);
    console.log(`     GST at risk: $${(rdMissing / 11).toFixed(2)}`);
    console.log(`     R&D refund at risk (43.5%): $${(rdMissing * 0.435).toFixed(2)}`);
    console.log(`     Combined at risk: $${(rdMissing / 11 + rdMissing * 0.435).toFixed(2)}`);
  }

  // Group by event type
  const byType = {};
  for (const s of uniqueSuggestions) {
    byType[s.event_type] = (byType[s.event_type] || 0) + 1;
  }
  console.log('\n  By type:', Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join(', '));

  // 7. Telegram notification with R&D impact
  if (NOTIFY && uniqueSuggestions.length > 0) {
    const top5 = uniqueSuggestions.slice(0, 5);
    const rdItems = uniqueSuggestions.filter(s => s.is_rd);
    const msg = [
      `📋 *${uniqueSuggestions.length} Missing Receipts Found*`,
      `Based on calendar events (last ${daysBack} days)`,
      '',
      ...top5.map(s => `• ${s.event_type}: ${s.transaction_contact} $${s.transaction_amount.toFixed(2)}${s.is_rd ? ' 🔬' : ''}`),
      uniqueSuggestions.length > 5 ? `...and ${uniqueSuggestions.length - 5} more` : '',
      `\nTotal: $${totalMissing.toFixed(2)}`,
    ];

    if (rdItems.length > 0) {
      msg.push(
        '',
        `🔬 *R&D Impact:* ${rdItems.length} receipts ($${rdMissing.toFixed(0)})`,
        `R&D refund at risk: $${(rdMissing * 0.435).toFixed(0)}`,
      );
    }

    try {
      const { sendTelegramMessage } = await import('./lib/telegram.mjs');
      await sendTelegramMessage(msg.join('\n'));
      log('Telegram notification sent');
    } catch (err) {
      log(`Telegram notification failed: ${err.message}`);
    }
  }
}

if (!supabase) {
  console.error('Supabase credentials not configured');
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

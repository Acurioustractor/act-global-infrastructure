#!/usr/bin/env node
/**
 * BAS Gap Sweep — cross-reference unreceipted Xero SPEND against stuck receipts,
 * calendar events, and vendor patterns to produce actionable follow-up lists.
 *
 * For each unreceipted SPEND in a given quarter, attempts to find:
 *   1. A stuck receipt in receipt_emails (review/captured/failed) that matches
 *      on vendor + date window + amount — these are the highest-value wins
 *      because the receipt already exists, it's just unlinked.
 *   2. A corroborating calendar event (flight/hotel/meeting) that proves the
 *      expense was business-purpose.
 *   3. A vendor classification bucket for action routing:
 *        PORTAL_DOWNLOAD  — vendor has a self-serve portal (Qantas, Uber, Stripe...)
 *        EMAIL_RESEND     — need to email vendor asking for invoice resend
 *        NIC_CONFIRM      — needs business-purpose sign-off (food, hardware, fuel)
 *        LOW_VALUE        — <$82.50, no GST credit, write off
 *        SUBSCRIPTION     — recurring SaaS, receipt should be in inbox
 *
 * Output: thoughts/shared/reports/bas-gap-sweep-<q>-fy26-<date>.md
 *
 * Usage:
 *   node scripts/bas-gap-sweep.mjs Q2
 *   node scripts/bas-gap-sweep.mjs Q3
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const QUARTERS = {
  Q1: { start: '2025-07-01', end: '2025-09-30', label: 'Q1 FY26 (Jul-Sep 2025)' },
  Q2: { start: '2025-10-01', end: '2025-12-31', label: 'Q2 FY26 (Oct-Dec 2025)' },
  Q3: { start: '2026-01-01', end: '2026-03-31', label: 'Q3 FY26 (Jan-Mar 2026)' },
  Q4: { start: '2026-04-01', end: '2026-06-30', label: 'Q4 FY26 (Apr-Jun 2026)' },
};

// Vendor → action category routing
const PORTAL_VENDORS = {
  Qantas: 'https://www.qantasbusinessrewards.com — download monthly invoices CSV',
  'Virgin Australia': 'https://experience.velocityfrequentflyer.com — statement download',
  Uber: 'https://business.uber.com — Reports → Trip activity CSV',
  Stripe: 'https://dashboard.stripe.com/invoices — filter by date, export',
  OpenAI: 'https://platform.openai.com/account/billing/history — invoice per month',
  'Claude.AI': 'https://console.anthropic.com → Billing → Invoice history',
  Anthropic: 'https://console.anthropic.com → Billing → Invoice history',
  Webflow: 'https://webflow.com/dashboard/account/billing — invoice history',
  Vercel: 'https://vercel.com/account/invoices — download PDFs',
  Notion: 'https://notion.so/my-account → Billing → Invoices',
  'Notion Labs': 'https://notion.so/my-account → Billing → Invoices',
  Supabase: 'https://supabase.com/dashboard/org/_/billing/invoices',
  HighLevel: 'GHL agency dashboard → Settings → Billing → Invoices',
  Zapier: 'https://zapier.com/app/billing — invoice history',
  Airbnb: 'Airbnb → Account → Trips → each booking has receipt PDF',
  'Booking.com': 'Booking.com → My Account → Bookings → invoice per stay',
  Descript: 'https://web.descript.com/settings/billing — invoice history',
  Ideogram: 'https://ideogram.ai/manage-account → Billing',
  Humanitix: 'Humanitix → Account → Orders → download invoice per event',
  'Mighty Networks': 'mightynetworks.com → Account → Plans & Billing → Invoices',
  Xero: 'Xero → Subscription → Billing history',
  NAB: 'NAB Internet Banking → Statements & documents',
  AGL: 'AGL MyAccount → Bills & payments',
};

const EMAIL_RESEND_VENDORS = ['Cactus Jacks', 'Chris Witta', 'Piggyback', 'Cabcharge'];

const NIC_CONFIRM_PATTERNS = [
  /bar|grill|restaurant|cafe|coffee|deli|bistro|pub|hotel bar|brewery/i,
  /bunnings|hardware|mitre|kennards|allclass/i,
  /bp\b|caltex|7-eleven|ampol|shell|united petroleum|fuel/i,
  /amazon|ebay/i, // ambiguous — could be business or personal
];

const LOW_VALUE_THRESHOLD = 82.50;

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

function escapeSQL(s) { return String(s || '').replace(/'/g, "''"); }

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function similarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const aw = new Set(a.split(/\W+/).filter(Boolean));
  const bw = new Set(b.split(/\W+/).filter(Boolean));
  let common = 0;
  for (const w of aw) if (bw.has(w)) common++;
  return common / Math.max(aw.size, bw.size, 1);
}

function classifyVendor(name, amount) {
  if (!name) return { category: 'NIC_CONFIRM', reason: 'no vendor name' };
  if (Math.abs(amount) < LOW_VALUE_THRESHOLD) return { category: 'LOW_VALUE', reason: 'below $82.50 GST invoice threshold' };

  // Portal lookup — fuzzy match vendor name
  for (const [portalName, url] of Object.entries(PORTAL_VENDORS)) {
    if (similarity(name, portalName) >= 0.7 || name.toLowerCase().includes(portalName.toLowerCase())) {
      return { category: 'PORTAL_DOWNLOAD', reason: url };
    }
  }

  // Nic confirmation patterns (food/fuel/hardware/ambiguous — business-purpose gate comes first)
  for (const re of NIC_CONFIRM_PATTERNS) {
    if (re.test(name)) return { category: 'NIC_CONFIRM', reason: 'needs business-purpose sign-off' };
  }

  // Explicit email-resend list
  for (const v of EMAIL_RESEND_VENDORS) {
    if (similarity(name, v) >= 0.7 || name.toLowerCase().includes(v.toLowerCase())) {
      return { category: 'EMAIL_RESEND', reason: `ask ${v} to resend invoice/receipt` };
    }
  }

  // Default: email resend (most small vendors)
  return { category: 'EMAIL_RESEND', reason: 'contact vendor for receipt' };
}

async function main() {
  const quarterArg = (process.argv[2] || 'Q3').toUpperCase();
  const quarter = QUARTERS[quarterArg];
  if (!quarter) { console.error('Use Q1|Q2|Q3|Q4'); process.exit(1); }

  console.log(`\nBAS Gap Sweep — ${quarter.label}\n`);

  // 1. Fetch unreceipted SPEND transactions in quarter
  const txns = await q(`
    SELECT xero_transaction_id, date, contact_name, project_code, entity_code,
           total::numeric(12,2), bank_account, is_reconciled, rd_eligible
    FROM xero_transactions
    WHERE type = 'SPEND' AND has_attachments = false
      AND date >= '${quarter.start}' AND date <= '${quarter.end}'
    ORDER BY abs(total) DESC
  `);
  console.log(`Unreceipted SPEND transactions: ${txns.length}`);

  // 2. Fetch stuck receipts in the same window (review/captured/failed)
  const stuckReceipts = await q(`
    SELECT id, vendor_name, amount_detected::numeric(12,2), received_at::date as received_date,
           subject, status, mailbox, from_email
    FROM receipt_emails
    WHERE status IN ('review', 'captured', 'failed', 'matched')
      AND received_at >= '${quarter.start}'::date - interval '14 days'
      AND received_at <= '${quarter.end}'::date + interval '30 days'
  `);
  console.log(`Stuck receipts in window: ${stuckReceipts.length}`);

  // 3. Fetch calendar events for the window (used for travel/meeting corroboration)
  const events = await q(`
    SELECT id, title, start_time::date as event_date, location, project_code, detected_project_code, event_type
    FROM calendar_events
    WHERE start_time >= '${quarter.start}' AND start_time <= '${quarter.end}'::date + interval '2 days'
      AND status != 'cancelled'
  `);
  console.log(`Calendar events in window: ${events.length}`);

  // 4. Build lookups
  const eventsByDate = new Map();
  for (const e of events) {
    const d = e.event_date;
    if (!eventsByDate.has(d)) eventsByDate.set(d, []);
    eventsByDate.get(d).push(e);
  }

  // 5. For each unreceipted txn, find matching stuck receipt + calendar corroboration
  const results = txns.map(tx => {
    const txAmount = Math.abs(Number(tx.total));
    const txDate = new Date(tx.date);

    // Find stuck receipts within ±14 days, amount within 5%
    const receiptCandidates = stuckReceipts
      .map(r => {
        const vSim = similarity(r.vendor_name, tx.contact_name);
        const rAmount = Number(r.amount_detected || 0);
        const amountDiff = rAmount > 0 ? Math.abs(rAmount - txAmount) / txAmount : 1;
        const dayDiff = Math.abs((new Date(r.received_date) - txDate) / 86400000);
        let score = 0;
        if (vSim >= 0.5) score += 40 * vSim;
        if (amountDiff < 0.05) score += 40;
        else if (amountDiff < 0.15) score += 20;
        if (dayDiff < 3) score += 20;
        else if (dayDiff < 7) score += 10;
        else if (dayDiff < 14) score += 5;
        return { receipt: r, score, vSim, amountDiff, dayDiff };
      })
      .filter(c => c.score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Find calendar corroboration (±2 days of txn date)
    const calHints = [];
    for (let offset = -2; offset <= 2; offset++) {
      const d = new Date(txDate);
      d.setDate(d.getDate() + offset);
      const key = d.toISOString().slice(0, 10);
      const dayEvents = eventsByDate.get(key) || [];
      for (const e of dayEvents) {
        const t = (e.title || '').toLowerCase();
        const loc = (e.location || '').toLowerCase();
        // Match travel-related vendors to travel events
        const vendorLc = (tx.contact_name || '').toLowerCase();
        if (/qantas|virgin|jetstar|airport|flight|rex/i.test(vendorLc) && /flight|fly|airport|depart|arrive/i.test(t + ' ' + loc)) {
          calHints.push(`${key}: ${e.title}${loc ? ' @ ' + loc : ''}`);
        } else if (/uber|cab|taxi|goget|cabcharge/i.test(vendorLc) && (t || loc)) {
          calHints.push(`${key}: ${e.title}${loc ? ' @ ' + loc : ''}`);
        } else if (/airbnb|booking|hotel|motel|resort|lodge/i.test(vendorLc) && /stay|overnight|accommodation|check.?in/i.test(t)) {
          calHints.push(`${key}: ${e.title}${loc ? ' @ ' + loc : ''}`);
        } else if (/bar|grill|restaurant|cafe|bistro|pub|brewery/i.test(vendorLc) && /lunch|dinner|breakfast|meet|coffee/i.test(t)) {
          calHints.push(`${key}: ${e.title}`);
        }
      }
    }

    const classification = classifyVendor(tx.contact_name, txAmount);

    return {
      txn: tx,
      classification,
      receiptCandidates,
      calHints: calHints.slice(0, 3),
      gstAtRisk: txAmount / 11,
      rdRefundAtRisk: tx.rd_eligible ? txAmount * 0.435 : 0,
    };
  });

  // 6. Split into buckets
  const autoMatchable = results.filter(r => r.receiptCandidates.length > 0 && r.receiptCandidates[0].score >= 80);
  const likelyMatch = results.filter(r => r.receiptCandidates.length > 0 && r.receiptCandidates[0].score >= 50 && r.receiptCandidates[0].score < 80);
  const portal = results.filter(r => !r.receiptCandidates.length && r.classification.category === 'PORTAL_DOWNLOAD');
  const emailResend = results.filter(r => !r.receiptCandidates.length && r.classification.category === 'EMAIL_RESEND');
  const nicConfirm = results.filter(r => !r.receiptCandidates.length && r.classification.category === 'NIC_CONFIRM');
  const lowValue = results.filter(r => !r.receiptCandidates.length && r.classification.category === 'LOW_VALUE');

  // 7. Aggregate portal downloads by vendor
  const portalByVendor = new Map();
  for (const r of portal) {
    const v = r.txn.contact_name;
    if (!portalByVendor.has(v)) portalByVendor.set(v, { vendor: v, txns: [], total: 0, gstAtRisk: 0, portalUrl: r.classification.reason });
    const g = portalByVendor.get(v);
    g.txns.push(r);
    g.total += Math.abs(Number(r.txn.total));
    g.gstAtRisk += r.gstAtRisk;
  }
  const portalSorted = [...portalByVendor.values()].sort((a, b) => b.total - a.total);

  // 8. Aggregate email resends by vendor
  const resendByVendor = new Map();
  for (const r of emailResend) {
    const v = r.txn.contact_name;
    if (!resendByVendor.has(v)) resendByVendor.set(v, { vendor: v, txns: [], total: 0 });
    const g = resendByVendor.get(v);
    g.txns.push(r);
    g.total += Math.abs(Number(r.txn.total));
  }
  const resendSorted = [...resendByVendor.values()].sort((a, b) => b.total - a.total);

  // 9. Build markdown report
  const lines = [];
  lines.push(`# BAS Gap Sweep — ${quarter.label}`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString().slice(0, 16)}`);
  lines.push(`**Entity:** Nicholas Marchesi T/as A Curious Tractor (ABN 21 591 780 066)`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  const totalMissingValue = results.reduce((s, r) => s + Math.abs(Number(r.txn.total)), 0);
  const totalGSTAtRisk = results.reduce((s, r) => s + r.gstAtRisk, 0);
  const totalRDAtRisk = results.reduce((s, r) => s + r.rdRefundAtRisk, 0);
  lines.push(`- **Unreceipted transactions:** ${results.length}`);
  lines.push(`- **Total value:** ${fmt(totalMissingValue)}`);
  lines.push(`- **GST credits at risk:** ${fmt(totalGSTAtRisk)}`);
  lines.push(`- **R&D refund at risk (43.5%):** ${fmt(totalRDAtRisk)}`);
  lines.push('');
  lines.push('## Bucket Breakdown');
  lines.push('');
  lines.push('| Bucket | Count | Value | GST at risk |');
  lines.push('|---|---:|---:|---:|');
  const bucketSum = (arr) => ({
    cnt: arr.length,
    total: arr.reduce((s, r) => s + Math.abs(Number(r.txn.total)), 0),
    gst: arr.reduce((s, r) => s + r.gstAtRisk, 0),
  });
  const b1 = bucketSum(autoMatchable);
  const b2 = bucketSum(likelyMatch);
  const b3 = bucketSum(portal);
  const b4 = bucketSum(emailResend);
  const b5 = bucketSum(nicConfirm);
  const b6 = bucketSum(lowValue);
  lines.push(`| 🟢 AUTO-MATCHABLE (stuck receipt ≥80%) | ${b1.cnt} | ${fmt(b1.total)} | ${fmt(b1.gst)} |`);
  lines.push(`| 🟡 LIKELY MATCH (stuck receipt 50-79%) | ${b2.cnt} | ${fmt(b2.total)} | ${fmt(b2.gst)} |`);
  lines.push(`| 💻 PORTAL DOWNLOAD (Ben action) | ${b3.cnt} | ${fmt(b3.total)} | ${fmt(b3.gst)} |`);
  lines.push(`| ✉️  EMAIL RESEND (Ben action) | ${b4.cnt} | ${fmt(b4.total)} | ${fmt(b4.gst)} |`);
  lines.push(`| 🙋 NIC TO CONFIRM | ${b5.cnt} | ${fmt(b5.total)} | ${fmt(b5.gst)} |`);
  lines.push(`| 🪙 LOW VALUE (<$82.50) | ${b6.cnt} | ${fmt(b6.total)} | ${fmt(b6.gst)} |`);
  lines.push('');

  // --- Auto-matchable section ---
  if (autoMatchable.length > 0) {
    lines.push('## 🟢 Auto-Matchable (stuck receipts ≥80% confidence)');
    lines.push('');
    lines.push('These have a receipt already in the pipeline that matches with high confidence. Run the resolve script or manually link in Xero.');
    lines.push('');
    lines.push('| Date | Vendor | Amount | Matched receipt | Score |');
    lines.push('|---|---|---:|---|---:|');
    for (const r of autoMatchable.slice(0, 50)) {
      const c = r.receiptCandidates[0];
      lines.push(`| ${r.txn.date} | ${r.txn.contact_name} | ${fmt(r.txn.total)} | ${c.receipt.vendor_name || '?'} · ${c.receipt.received_date} · ${fmt(c.receipt.amount_detected)} (${c.receipt.status}) | ${Math.round(c.score)}% |`);
    }
    lines.push('');
  }

  // --- Likely match section ---
  if (likelyMatch.length > 0) {
    lines.push('## 🟡 Likely Match (needs human review)');
    lines.push('');
    lines.push('These have a stuck receipt that partially matches. Review in Xero and either link or reject.');
    lines.push('');
    lines.push('| Date | Vendor | Amount | Best candidate | Score |');
    lines.push('|---|---|---:|---|---:|');
    for (const r of likelyMatch.slice(0, 30)) {
      const c = r.receiptCandidates[0];
      lines.push(`| ${r.txn.date} | ${r.txn.contact_name} | ${fmt(r.txn.total)} | ${c.receipt.vendor_name || '?'} · ${c.receipt.received_date} · ${fmt(c.receipt.amount_detected)} | ${Math.round(c.score)}% |`);
    }
    lines.push('');
  }

  // --- Ben: Portal Downloads ---
  lines.push('## 💻 Ben Actions: Portal Downloads');
  lines.push('');
  if (portalSorted.length === 0) {
    lines.push('_None._');
  } else {
    lines.push(`${portalSorted.length} vendor${portalSorted.length === 1 ? '' : 's'} with self-serve receipt/invoice portals. Order by value:`);
    lines.push('');
    for (const v of portalSorted) {
      const calHintCount = v.txns.filter(t => t.calHints.length > 0).length;
      lines.push(`### ${v.vendor} — ${v.txns.length} txns, ${fmt(v.total)} (GST ${fmt(v.gstAtRisk)})`);
      lines.push('');
      lines.push(`- **Portal:** ${v.portalUrl}`);
      if (calHintCount > 0) lines.push(`- **Calendar corroboration:** ${calHintCount}/${v.txns.length} txns have matching calendar events (business travel)`);
      lines.push(`- **Date range needed:** ${v.txns.map(t => t.txn.date).sort()[0]} → ${v.txns.map(t => t.txn.date).sort().reverse()[0]}`);
      lines.push('');
      lines.push('<details><summary>Transactions</summary>');
      lines.push('');
      lines.push('| Date | Amount | Project | Calendar hint |');
      lines.push('|---|---:|---|---|');
      for (const t of v.txns.slice(0, 20)) {
        lines.push(`| ${t.txn.date} | ${fmt(t.txn.total)} | ${t.txn.project_code || '-'} | ${t.calHints.join('; ') || '-'} |`);
      }
      if (v.txns.length > 20) lines.push(`| ... | ... | ... | _${v.txns.length - 20} more_ |`);
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }
  }

  // --- Ben: Email Resends ---
  lines.push('## ✉️ Ben Actions: Email Resend Requests');
  lines.push('');
  if (resendSorted.length === 0) {
    lines.push('_None._');
  } else {
    lines.push(`${resendSorted.length} vendor${resendSorted.length === 1 ? '' : 's'} without a known portal. Email each to request receipt resend:`);
    lines.push('');
    lines.push('| Vendor | Txns | Total | Date range |');
    lines.push('|---|---:|---:|---|');
    for (const v of resendSorted.slice(0, 30)) {
      const dates = v.txns.map(t => t.txn.date).sort();
      lines.push(`| ${v.vendor} | ${v.txns.length} | ${fmt(v.total)} | ${dates[0]} → ${dates[dates.length - 1]} |`);
    }
    if (resendSorted.length > 30) lines.push(`| ... | ... | ... | _${resendSorted.length - 30} more_ |`);
    lines.push('');
  }

  // --- Nic: Confirmations ---
  lines.push('## 🙋 Nic Actions: Business-Purpose Confirmations');
  lines.push('');
  if (nicConfirm.length === 0) {
    lines.push('_None._');
  } else {
    lines.push(`${nicConfirm.length} transactions need Nic to confirm business vs personal (food, fuel, hardware, ambiguous retail):`);
    lines.push('');
    lines.push('| Date | Vendor | Amount | Calendar hint |');
    lines.push('|---|---|---:|---|');
    for (const r of nicConfirm.sort((a, b) => Math.abs(Number(b.txn.total)) - Math.abs(Number(a.txn.total))).slice(0, 40)) {
      lines.push(`| ${r.txn.date} | ${r.txn.contact_name} | ${fmt(r.txn.total)} | ${r.calHints.join('; ') || '-'} |`);
    }
    lines.push('');
  }

  // --- Low value ---
  if (lowValue.length > 0) {
    lines.push('## 🪙 Low-Value (write-off or ignore)');
    lines.push('');
    lines.push(`${lowValue.length} transactions under $82.50 — no GST tax invoice required. Total ${fmt(b6.total)}, GST impact ${fmt(b6.gst)}. Safe to skip unless R&D-tagged.`);
    lines.push('');
    const lowRD = lowValue.filter(r => r.txn.rd_eligible);
    if (lowRD.length > 0) {
      lines.push(`**However, ${lowRD.length} are R&D-tagged** — those still need receipts for the 43.5% refund claim.`);
      lines.push('');
    }
  }

  const outPath = path.join('thoughts/shared/reports', `bas-gap-sweep-${quarterArg.toLowerCase()}-fy26-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(outPath, lines.join('\n'));
  console.log(`\n✅ ${outPath}`);
  console.log(`   Auto-matchable: ${b1.cnt} | Likely: ${b2.cnt} | Portal: ${b3.cnt} | Resend: ${b4.cnt} | Nic: ${b5.cnt} | Low: ${b6.cnt}`);
}

main().catch(e => { console.error(e); process.exit(1); });

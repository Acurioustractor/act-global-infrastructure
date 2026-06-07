#!/usr/bin/env node
/**
 * Flag Junk Receipts — marks marketing/notification emails as status='skipped'
 * so they stop polluting the matcher's candidate pool.
 *
 * Conservative classifier: only marks rows that match BOTH:
 *   1. amount_detected is null OR 0
 *   2. subject matches a clear marketing/notification pattern
 *
 * Real Dext OCR-failed receipts ("Receipt from X") are LEFT ALONE — they need
 * re-OCR, not junking.
 *
 * Safe: only writes status column. Idempotent.
 *
 * Usage:
 *   node scripts/flag-junk-receipts.mjs            # dry run
 *   node scripts/flag-junk-receipts.mjs --apply    # write status='skipped'
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const APPLY = process.argv.includes('--apply');

// Marketing/notification subject patterns. These are clear non-receipts.
// Each pattern is matched as a substring, case-insensitive.
const JUNK_PATTERNS = [
  // Marketing
  "you've received",
  "you have received",
  "free 90 days",
  "free trial",
  "last chance",
  "act now",
  "limited time",
  "% off",
  "% discount",
  "save up to",
  "exclusive offer",
  "special offer",
  "early access",
  "new feature",
  "introducing",
  "have you tried",
  "you don't have a",
  "we figured it out",
  "with over 12,000 videos",
  "figured it out",
  // Subscription notifications (not charges)
  "subscription has been activated",
  "subscription confirmation",
  "your subscription",
  "trial has started",
  "trial is ending",
  "your free trial",
  "expiring soon",
  "is expiring",
  "will expire",
  "expires on",
  "expires in",
  "renewal reminder",
  "auto-renewal",
  "auto renewal",
  // Order confirmations (not yet receipts)
  "we're processing your order",
  "we are processing your order",
  "order received",
  "order confirmation",
  "thanks for your order",
  // Account/feature notifications
  "price change",
  "pricing update",
  "policy update",
  "terms update",
  "privacy policy",
  "verify your account",
  "verify your email",
  "password reset",
  "account closure",
  "account closed",
  "account expiring",
  "free tier",
  "plan downgrade",
  "downgraded",
  // Marketing / blog / engagement
  "newsletter",
  "monthly digest",
  "weekly digest",
  "blog post",
  "we've updated",
  "important update",
  "you're invited",
  "join us",
  "register now",
  "save the date",
  // Specific recurring noise from sample
  "client problem",
];

function isJunk(subject) {
  if (!subject) return false;
  const s = subject.toLowerCase();
  return JUNK_PATTERNS.some(p => s.includes(p));
}

async function main() {
  console.log('=== Flag Junk Receipts ===');
  console.log(APPLY ? 'MODE: APPLY' : 'MODE: dry run');

  // Load all rows with no/zero amount across all sources
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from('receipt_emails')
      .select('id, source, status, vendor_name, subject, amount_detected')
      .or('amount_detected.is.null,amount_detected.eq.0')
      .neq('status', 'skipped')
      .range(from, from + 999);
    if (error) { console.error(error); process.exit(1); }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`Examined: ${rows.length} rows with $0 / null amount`);

  const junk = rows.filter(r => isJunk(r.subject));
  const realButOcrFailed = rows.filter(r => !isJunk(r.subject));

  console.log(`\nClassification:`);
  console.log(`  🗑  Junk (marketing/notification): ${junk.length}`);
  console.log(`  📄 Real (needs re-OCR / amount missing): ${realButOcrFailed.length}`);

  // Breakdown by source
  const bySrc = {};
  for (const r of junk) bySrc[r.source] = (bySrc[r.source] || 0) + 1;
  console.log(`\n  Junk by source:`);
  Object.entries(bySrc).forEach(([s, n]) => console.log(`    ${s}: ${n}`));

  // Sample
  console.log(`\n  Sample junk (first 10):`);
  junk.slice(0, 10).forEach(r => console.log(`    [${r.source}] ${(r.vendor_name || '?').slice(0,20)} | ${(r.subject || '').slice(0,70)}`));

  console.log(`\n  Sample real-but-failed (first 10):`);
  realButOcrFailed.slice(0, 10).forEach(r => console.log(`    [${r.source}] ${(r.vendor_name || '?').slice(0,20)} | ${(r.subject || '').slice(0,70)}`));

  if (APPLY && junk.length > 0) {
    console.log(`\nFlagging ${junk.length} as status='skipped'...`);
    const ids = junk.map(r => r.id);
    // Batch in chunks of 100 for safety
    let done = 0;
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error } = await sb.from('receipt_emails')
        .update({ status: 'skipped' })
        .in('id', batch);
      if (error) { console.error('FAIL:', error.message); break; }
      done += batch.length;
    }
    console.log(`Flagged: ${done}`);
  } else if (junk.length > 0) {
    console.log(`\nDry run — re-run with --apply to flag ${junk.length} as skipped.`);
  }

  // Report
  const reportPath = `thoughts/shared/reports/junk-receipts-${new Date().toISOString().slice(0, 10)}.md`;
  const lines = [
    `# Junk Receipt Classification`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Mode:** ${APPLY ? 'APPLIED' : 'dry run'}`,
    ``,
    `## Counts`,
    `- Examined ($0 / null amount, status != skipped): ${rows.length}`,
    `- 🗑 Junk (marketing/notification): ${junk.length}`,
    `- 📄 Real but OCR-failed (kept): ${realButOcrFailed.length}`,
    ``,
    `## Junk by source`,
    ...Object.entries(bySrc).map(([s, n]) => `- ${s}: ${n}`),
    ``,
    `## Real but OCR-failed (need attention)`,
    ...realButOcrFailed.slice(0, 50).map(r => `- [${r.source}] ${r.vendor_name || '?'} — "${(r.subject || '').slice(0, 80)}" (id: \`${r.id}\`)`),
    ``,
    `## Junk samples (first 50)`,
    ...junk.slice(0, 50).map(r => `- [${r.source}] ${r.vendor_name || '?'} — "${(r.subject || '').slice(0, 80)}"`),
  ];
  writeFileSync(reportPath, lines.join('\n'));
  console.log(`\nReport: ${reportPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });

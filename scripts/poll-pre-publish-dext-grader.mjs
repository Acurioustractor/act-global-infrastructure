#!/usr/bin/env node
/**
 * Pre-publish Dext grader — polling wrapper around ai-route-dext-doc.mjs.
 *
 * Runs on cron every 15 min. Grades every fresh finance_receipt_document
 * (OCR'd Dext or email receipt) that doesn't have an AI suggestion yet.
 * Result lands in finance_ai_routing_suggestions so the workbench can
 * surface "Here's the AI grade — accept / change / reject" before you
 * publish to Xero.
 *
 * This is the "AI looks at every receipt before you do" step.
 *
 * Usage:
 *   node scripts/poll-pre-publish-dext-grader.mjs              # dry run
 *   node scripts/poll-pre-publish-dext-grader.mjs --apply      # auto-apply high-conf
 *   node scripts/poll-pre-publish-dext-grader.mjs --batch 50   # bigger batch
 *
 * Cron: every 15 min during business hours, 8:00-18:00 AEST weekdays.
 *   pm2 entry "pre-publish-dext-grader" → ecosystem.config.cjs
 */

import './lib/load-env.mjs';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const TELEGRAM = args.includes('--telegram');
const BATCH = numberAfter('--batch', 30);
const MIN_CONFIDENCE = numberAfter('--min-confidence', 0.85);

function valueAfter(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
}
function numberAfter(flag, fallback) {
  const raw = valueAfter(flag);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = (process.env.TELEGRAM_AUTHORIZED_USERS || '').split(',')[0]?.trim();

async function pendingCount() {
  const { data: graded } = await sb
    .from('finance_ai_routing_suggestions')
    .select('source_record_id')
    .eq('source_table', 'finance_receipt_documents')
    .eq('prompt_version', 'v1')
    .eq('model', 'claude-sonnet-4-6');
  const gradedSet = new Set((graded || []).map((r) => r.source_record_id));

  const { count } = await sb
    .from('finance_receipt_documents')
    .select('*', { count: 'exact', head: true })
    .not('vendor_name', 'is', null)
    .not('amount_total', 'is', null);

  // approximate — gradedSet is a tighter check via run-result diff
  return { ungradedApprox: Math.max((count || 0) - gradedSet.size, 0), totalDocs: count || 0, gradedCount: gradedSet.size };
}

async function sendTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'Markdown' }),
    });
    return res.ok;
  } catch (err) {
    console.warn('telegram failed:', err.message);
    return false;
  }
}

async function main() {
  const before = await pendingCount();
  console.log(`Pre-publish Dext grader poll: ${before.ungradedApprox} ungraded of ${before.totalDocs} documents.`);

  if (before.ungradedApprox === 0) {
    console.log('Nothing to grade. Exiting clean.');
    return;
  }

  const runArgs = ['scripts/ai-route-dext-doc.mjs', '--source', 'documents', '--limit', String(BATCH)];
  if (APPLY) runArgs.push('--apply', '--min-confidence', String(MIN_CONFIDENCE));

  console.log(`Running: node ${runArgs.join(' ')}`);
  const result = spawnSync('node', runArgs, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  if (result.status !== 0) {
    console.error('Grader exited non-zero:', result.status);
    process.exit(result.status || 1);
  }

  const after = await pendingCount();
  const newlyGraded = after.gradedCount - before.gradedCount;
  console.log(`\nNewly graded: ${newlyGraded}.  Remaining ungraded: ${after.ungradedApprox}.`);

  if (TELEGRAM && newlyGraded > 0) {
    // Top high-confidence + risky to surface in the alert
    const { data: latest } = await sb
      .from('finance_ai_routing_suggestions')
      .select('vendor_name, amount, suggested_project_code, confidence, risk_flags, reason')
      .eq('source_table', 'finance_receipt_documents')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('confidence', { ascending: false })
      .limit(10);

    const safe = (latest || []).filter((r) => r.confidence >= MIN_CONFIDENCE && r.suggested_project_code !== 'ASK_USER' && r.suggested_project_code !== 'SL_REVIEW');
    const review = (latest || []).filter((r) => r.confidence < MIN_CONFIDENCE || r.suggested_project_code === 'ASK_USER' || r.suggested_project_code === 'SL_REVIEW');

    const lines = [`🔍 Pre-publish Dext grader: ${newlyGraded} new docs graded.`];
    if (safe.length) {
      lines.push('', `*Safe to publish (≥${(MIN_CONFIDENCE * 100).toFixed(0)}%)*:`);
      safe.slice(0, 5).forEach((r) => {
        lines.push(`• ${r.suggested_project_code}  ${r.vendor_name?.slice(0, 30)}  $${Number(r.amount).toLocaleString()}  ${(r.confidence * 100).toFixed(0)}%`);
      });
    }
    if (review.length) {
      lines.push('', `*Need review*:`);
      review.slice(0, 5).forEach((r) => {
        const flags = r.risk_flags?.length ? ` [${r.risk_flags.slice(0, 3).join(',')}]` : '';
        lines.push(`• ${r.suggested_project_code}  ${r.vendor_name?.slice(0, 30)}  $${Number(r.amount).toLocaleString()}  ${(r.confidence * 100).toFixed(0)}%${flags}`);
      });
    }
    lines.push('', 'Open /finance/workbench filter=needs_project to triage.');
    await sendTelegram(lines.join('\n'));
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

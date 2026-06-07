#!/usr/bin/env node
/**
 * Monday morning chain — runs the 5:30-9:10 weekly sequence as one job.
 *
 * Each step runs in sequence. A failure in one step DOES NOT abort the
 * chain (so a flaky weekly-project-pulse doesn't kill the
 * weekly-reconciliation that follows). All step results land in a
 * wiki/cockpit/monday-chain-YYYY-MM-DD.md log and (with --telegram)
 * a single Telegram summary at the end.
 *
 * Why one wrapper instead of six PM2 entries:
 *   - Single failure surface (one log file, one Telegram alert)
 *   - Cannot have steps overlap when one runs long
 *   - Easy to drop or reorder a step (edit the array, not 6 PM2 entries)
 *   - Failure isolation: step 1 failing doesn't kill step 2-6
 *
 * Usage:
 *   node scripts/monday-morning-chain.mjs                # all steps, no telegram
 *   node scripts/monday-morning-chain.mjs --telegram     # also send summary
 *   node scripts/monday-morning-chain.mjs --skip ghl-cleanup,grant-seed
 *   node scripts/monday-morning-chain.mjs --only weekly-reconciliation,money-framework
 *   node scripts/monday-morning-chain.mjs --dry-run      # print the plan
 *
 * Cron (replaces 6 entries): 'monday-morning-chain' at 5:30am Mon.
 */

import './lib/load-env.mjs';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WIKI_DIR = path.join(ROOT, 'wiki', 'cockpit');

const args = process.argv.slice(2);
const SEND_TELEGRAM = args.includes('--telegram');
const DRY_RUN = args.includes('--dry-run');

function valueAfter(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
}

const SKIP_SET = new Set(
  (valueAfter('--skip') || '').split(',').map((s) => s.trim()).filter(Boolean),
);
const ONLY_SET = new Set(
  (valueAfter('--only') || '').split(',').map((s) => s.trim()).filter(Boolean),
);

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = (process.env.TELEGRAM_AUTHORIZED_USERS || '').split(',')[0]?.trim();

// Ordered chain. Edit here, not in 6 PM2 entries.
const CHAIN = [
  {
    name: 'weekly-project-pulse',
    script: 'scripts/weekly-project-pulse.mjs',
    args: [],
    timeoutMs: 5 * 60 * 1000,
    purpose: 'Per-project open-actions pulse to Notion',
  },
  {
    name: 'ghl-cleanup-auto',
    script: 'scripts/cleanup-stale-ghl-opps.mjs',
    args: ['--apply'],
    timeoutMs: 10 * 60 * 1000,
    purpose: 'Auto-archive past-deadline grants + stale ACT Events invites',
  },
  {
    name: 'grant-seed-weekly',
    script: 'scripts/seed-ghl-grants.mjs',
    args: ['--count', '5'],
    timeoutMs: 10 * 60 * 1000,
    purpose: 'Seed top-5 fresh ACT-fit grants into GHL',
  },
  {
    name: 'xero-payments-sync',
    script: 'scripts/sync-xero-payments.mjs',
    args: ['--days=180'],
    timeoutMs: 10 * 60 * 1000,
    purpose: 'Sync Xero Payments (deposit↔invoice link table)',
  },
  {
    name: 'weekly-reconciliation',
    script: 'scripts/weekly-reconciliation.mjs',
    args: [],
    timeoutMs: 15 * 60 * 1000,
    purpose: 'Reconciliation report + R&D pack grading + Telegram',
  },
  {
    name: 'money-framework-sync',
    script: 'scripts/sync-money-framework-to-notion.mjs',
    args: [],
    timeoutMs: 15 * 60 * 1000,
    purpose: 'Refresh ACT Money Framework Notion panels',
  },
];

function isSelected(step) {
  if (ONLY_SET.size > 0 && !ONLY_SET.has(step.name)) return false;
  if (SKIP_SET.has(step.name)) return false;
  return true;
}

function runStep(step) {
  return new Promise((resolve) => {
    const start = Date.now();
    const log = { name: step.name, start: new Date(start).toISOString(), stdoutBytes: 0, stderrBytes: 0 };
    const stdoutChunks = [];
    const stderrChunks = [];

    const child = spawn('node', [step.script, ...step.args], {
      cwd: ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000);
    }, step.timeoutMs);

    child.stdout.on('data', (data) => {
      stdoutChunks.push(data);
      log.stdoutBytes += data.length;
      // Also surface live so PM2 logs show progress
      process.stdout.write(data);
    });
    child.stderr.on('data', (data) => {
      stderrChunks.push(data);
      log.stderrBytes += data.length;
      process.stderr.write(data);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const end = Date.now();
      log.end = new Date(end).toISOString();
      log.durationMs = end - start;
      log.exitCode = code;
      log.signal = signal || null;
      log.timedOut = killed;
      log.ok = !killed && code === 0;
      const stderr = Buffer.concat(stderrChunks).toString();
      log.stderrTail = stderr.slice(-1000);
      const stdout = Buffer.concat(stdoutChunks).toString();
      log.stdoutTail = stdout.slice(-500);
      resolve(log);
    });
  });
}

async function sendTelegram(text) {
  if (!SEND_TELEGRAM) return false;
  if (!TG_TOKEN || !TG_CHAT) {
    console.log('[telegram] creds not set, skipping');
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
    });
    return res.ok;
  } catch (err) {
    console.warn(`[telegram] failed: ${err.message}`);
    return false;
  }
}

function fmtDuration(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m${rs.toString().padStart(2, '0')}`;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const selectedSteps = CHAIN.filter(isSelected);

  console.log('━'.repeat(72));
  console.log(`Monday morning chain — ${today}`);
  console.log('━'.repeat(72));
  console.log(`${selectedSteps.length} of ${CHAIN.length} steps selected.`);
  selectedSteps.forEach((s, i) => console.log(`  ${i + 1}. ${s.name} (${s.script})`));
  console.log();

  if (DRY_RUN) {
    console.log('Dry run — no steps executed.');
    return;
  }

  const startedAt = Date.now();
  const logs = [];
  for (const step of selectedSteps) {
    console.log();
    console.log(`▶ ${step.name} — ${step.purpose}`);
    console.log('─'.repeat(72));
    const log = await runStep(step);
    logs.push(log);
    const status = log.ok ? '✓' : log.timedOut ? '⏰' : '✗';
    console.log();
    console.log(`${status} ${step.name}  ${fmtDuration(log.durationMs)}  exit=${log.exitCode}${log.timedOut ? ' TIMED OUT' : ''}`);
  }

  const totalMs = Date.now() - startedAt;
  const okCount = logs.filter((l) => l.ok).length;
  const failCount = logs.length - okCount;

  // Markdown log
  if (!existsSync(WIKI_DIR)) mkdirSync(WIKI_DIR, { recursive: true });
  const logPath = path.join(WIKI_DIR, `monday-chain-${today}.md`);
  const lines = [];
  lines.push('---');
  lines.push(`title: Monday chain — ${today}`);
  lines.push(`status: published`);
  lines.push(`generated_by: scripts/monday-morning-chain.mjs`);
  lines.push(`steps_total: ${logs.length}`);
  lines.push(`steps_ok: ${okCount}`);
  lines.push(`steps_failed: ${failCount}`);
  lines.push(`total_duration_ms: ${totalMs}`);
  lines.push('---');
  lines.push('');
  lines.push(`# Monday chain — ${today}`);
  lines.push('');
  lines.push(`Total: ${fmtDuration(totalMs)}.  OK ${okCount} / ${logs.length}. Failures: ${failCount}.`);
  lines.push('');
  lines.push('| # | Step | Duration | Exit | Status |');
  lines.push('|---|---|---:|---:|:-:|');
  logs.forEach((log, i) => {
    const status = log.ok ? 'ok' : log.timedOut ? 'TIMEOUT' : 'FAIL';
    lines.push(`| ${i + 1} | ${log.name} | ${fmtDuration(log.durationMs)} | ${log.exitCode ?? 'null'} | ${status} |`);
  });
  lines.push('');
  for (const log of logs) {
    if (log.ok) continue;
    lines.push(`## ${log.name} — ${log.timedOut ? 'TIMED OUT' : 'FAILED'}`);
    lines.push('');
    lines.push('Stderr tail:');
    lines.push('```');
    lines.push(log.stderrTail || '(empty)');
    lines.push('```');
    lines.push('');
  }
  writeFileSync(logPath, lines.join('\n'));
  console.log();
  console.log(`Log: ${logPath}`);

  // Telegram summary
  if (SEND_TELEGRAM) {
    const summaryLines = [`🌅 *Monday chain* — ${today}`, ''];
    summaryLines.push(`Total: ${fmtDuration(totalMs)}.  OK ${okCount} / ${logs.length}.`);
    if (failCount > 0) summaryLines.push(`*Failures: ${failCount}* ⚠`);
    summaryLines.push('');
    logs.forEach((log, i) => {
      const status = log.ok ? '✓' : log.timedOut ? '⏰' : '✗';
      summaryLines.push(`${status} ${i + 1}. ${log.name} ${fmtDuration(log.durationMs)}`);
    });
    if (failCount > 0) {
      summaryLines.push('');
      summaryLines.push('Failed steps:');
      logs.filter((l) => !l.ok).forEach((l) => {
        summaryLines.push(`• ${l.name}: ${l.timedOut ? 'TIMED OUT' : `exit ${l.exitCode}`}`);
      });
      summaryLines.push('');
      summaryLines.push(`Log: \`wiki/cockpit/monday-chain-${today}.md\``);
    }
    await sendTelegram(summaryLines.join('\n'));
  }

  // Exit non-zero if any step failed so PM2 logs flag the failure.
  if (failCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

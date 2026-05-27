#!/usr/bin/env node
/**
 * set-dominoes.mjs — set this week's Flow Flywheel dominoes for a project.
 *
 * A domino is the highest-leverage action for a project this week. It is stored
 * as a project_knowledge row (knowledge_type='action', title prefixed "Domino:")
 * so it surfaces in the Notion Actions DB via sync-actions-decisions-to-notion.mjs
 * and supports checkbox-completion write-back via poll-notion-checkboxes.mjs.
 *
 * See: wiki/operations/flow-flywheel.md
 *
 * Usage:
 *   node scripts/set-dominoes.mjs ACT-CN "Finalise host brief" "Send QLD ask" "Confirm Adelaide run"
 *   node scripts/set-dominoes.mjs --list                 # show this week's dominoes (all projects)
 *   node scripts/set-dominoes.mjs ACT-GD --dry-run "..." # preview only, no writes
 *
 * Notes:
 *   - Max 3 dominoes per project per week (the constraint is the point).
 *   - Re-running for the same project+week ARCHIVES the prior open set first
 *     (status='archived', reversible — nothing is deleted), then inserts the new set.
 *   - After setting, push to Notion: node scripts/sync-actions-decisions-to-notion.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
await import(join(__dirname, '../lib/load-env.mjs'));

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CODE_RE = /^ACT-[A-Z0-9]+$/;

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// ISO week label (e.g. "2026-W22") and the Friday date for the target work week.
function weekContext(now = new Date()) {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  // Roll Sat/Sun into the upcoming work week so a weekend ritual sets next week.
  if (dow === 6) d.setUTCDate(d.getUTCDate() + 2);
  else if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);
  // Friday of the (now possibly rolled) ISO week.
  const dow2 = d.getUTCDay();
  const friday = new Date(d);
  friday.setUTCDate(d.getUTCDate() + (5 - (dow2 === 0 ? 7 : dow2)));
  // ISO week number from the Friday's Thursday-anchor.
  const anchor = new Date(friday);
  anchor.setUTCDate(friday.getUTCDate() - 1); // Thursday
  const yearStart = new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((anchor - yearStart) / 86400000 + 1) / 7);
  const label = `${anchor.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  return { label, friday: friday.toISOString().slice(0, 10) };
}

async function listDominoes(label) {
  const { data, error } = await supabase
    .from('project_knowledge')
    .select('project_code, title, status, action_required, follow_up_date, metadata')
    .eq('knowledge_type', 'action')
    .eq('status', 'open')
    .like('title', 'Domino:%')
    .order('project_code');
  if (error) { log(`Error: ${error.message}`); process.exit(1); }
  const rows = (data || []).filter(r => (r.metadata?.week || null) === label);
  if (!rows.length) { log(`No open dominoes for ${label}.`); return; }
  log(`Open dominoes for ${label}:`);
  let current = null;
  for (const r of rows.sort((a, b) => (a.metadata?.priority || 9) - (b.metadata?.priority || 9))) {
    if (r.project_code !== current) { current = r.project_code; console.log(`\n  ${current}`); }
    console.log(`    ${r.metadata?.priority || '?'}. ${r.title.replace(/^Domino:\s*/, '')}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const wantList = args.includes('--list');
  const positional = args.filter(a => !a.startsWith('--'));
  const { label, friday } = weekContext();

  if (wantList) { await listDominoes(label); return; }

  const code = (positional[0] || '').toUpperCase();
  const texts = positional.slice(1).filter(Boolean);

  if (!CODE_RE.test(code)) {
    log(`Usage: node scripts/set-dominoes.mjs <ACT-CODE> "domino one" ["two"] ["three"]`);
    log(`       node scripts/set-dominoes.mjs --list`);
    process.exit(1);
  }
  if (texts.length === 0) { log(`No dominoes given for ${code}. Provide 1–3.`); process.exit(1); }
  if (texts.length > 3) { log(`Max 3 dominoes per project per week — you gave ${texts.length}. Trim to the three that matter.`); process.exit(1); }

  const rows = texts.map((t, i) => ({
    project_code: code,
    knowledge_type: 'action',
    title: `Domino: ${t}`,
    content: `Flow Flywheel domino for ${code}, week ${label}. Priority ${i + 1}.`,
    importance: i === 0 ? 'critical' : 'high',
    action_required: true,
    status: 'open',
    follow_up_date: friday,
    recorded_by: 'ben',
    metadata: { domino: true, week: label, priority: i + 1 },
  }));

  if (dryRun) {
    log(`DRY RUN — would set ${rows.length} domino(es) for ${code}, week ${label} (due ${friday}):`);
    rows.forEach(r => console.log(`    ${r.metadata.priority}. ${r.title}`));
    return;
  }

  // Archive any prior open dominoes for this project + week (reversible).
  const { data: prior, error: selErr } = await supabase
    .from('project_knowledge')
    .select('id, metadata')
    .eq('knowledge_type', 'action')
    .eq('project_code', code)
    .eq('status', 'open')
    .like('title', 'Domino:%');
  if (selErr) { log(`Error reading prior dominoes: ${selErr.message}`); process.exit(1); }
  const toArchive = (prior || []).filter(r => (r.metadata?.week || null) === label).map(r => r.id);
  if (toArchive.length) {
    const { error: archErr } = await supabase
      .from('project_knowledge')
      .update({ status: 'archived', action_required: false, updated_at: new Date().toISOString() })
      .in('id', toArchive);
    if (archErr) { log(`Error archiving prior dominoes: ${archErr.message}`); process.exit(1); }
    log(`Archived ${toArchive.length} prior domino(es) for ${code}, week ${label}.`);
  }

  const { data: inserted, error: insErr } = await supabase
    .from('project_knowledge')
    .insert(rows)
    .select('id, title');
  if (insErr) { log(`Insert failed: ${insErr.message}`); process.exit(1); }

  log(`Set ${inserted.length} domino(es) for ${code}, week ${label} (due ${friday}):`);
  inserted.forEach((r, i) => console.log(`    ${i + 1}. ${r.title}`));
  log(`Push to Notion:  node scripts/sync-actions-decisions-to-notion.mjs`);
}

main().catch(e => { log(`Fatal: ${e.message}`); process.exit(1); });

#!/usr/bin/env node
/**
 * Write Xero ME Suggestions Report — regenerates the project-code suggestions
 * for synced Xero ME receipts by cross-referencing each transaction's date
 * against calendar_events, then writes a human-reviewable markdown report.
 *
 * Output: thoughts/shared/reports/xero-me-project-suggestions-<date>.md
 *
 * Usage:
 *   node scripts/write-xero-me-suggestions-report.mjs
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function main() {
  // Pull all xero_me receipts and join to the underlying transaction for current project_code
  const rows = await q(`
    SELECT re.id as receipt_id, re.vendor_name, re.amount_detected::numeric(12,2),
           re.received_at::date as date, re.xero_bank_transaction_id,
           re.attachment_filename, re.attachment_size_bytes,
           tx.project_code as current_project, tx.entity_code, tx.bank_account, tx.total::numeric(12,2) as txn_total
    FROM receipt_emails re
    LEFT JOIN xero_transactions tx ON tx.xero_transaction_id = re.xero_bank_transaction_id
    WHERE re.source = 'xero_me'
    ORDER BY re.received_at DESC
  `);

  console.log(`Loaded ${rows.length} Xero ME receipts`);

  // For each, look up calendar events on the same date and extract suggested project codes
  const suggestions = [];
  const noSuggestion = [];

  for (const row of rows) {
    if (!row.date) { noSuggestion.push(row); continue; }
    const events = await q(`
      SELECT title, location, project_code, detected_project_code, manual_project_code, start_time::date as event_date
      FROM calendar_events
      WHERE start_time::date = '${row.date}'::date
        AND status != 'cancelled'
      LIMIT 10
    `);

    let suggested = null;
    let evidence = null;
    for (const e of events) {
      const code = e.manual_project_code || e.project_code || e.detected_project_code;
      if (code && code !== row.current_project) {
        suggested = code;
        evidence = e.title?.slice(0, 50) || 'calendar event';
        break;
      }
    }

    if (suggested) {
      suggestions.push({ ...row, suggested_project: suggested, evidence });
    } else {
      noSuggestion.push(row);
    }
  }

  // Group suggestions by the suggested target project
  const byTarget = {};
  for (const s of suggestions) {
    if (!byTarget[s.suggested_project]) byTarget[s.suggested_project] = [];
    byTarget[s.suggested_project].push(s);
  }
  const targets = Object.keys(byTarget).sort();

  // Build markdown
  const lines = [];
  lines.push('# Xero ME Project-Code Suggestions Review');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString().slice(0, 16)}`);
  lines.push(`**Source:** \`receipt_emails\` rows where \`source = 'xero_me'\` × calendar events cross-reference`);
  lines.push('');
  lines.push('These are Xero ME mobile app receipts synced to Supabase this session. For each receipt, we looked at your calendar events on the same date and suggest re-tagging the transaction to match the event\'s project code — WHERE the suggestion differs from the current vendor-rule tag.');
  lines.push('');
  lines.push('**Review instructions:** mark each with ✅ (apply), ❌ (reject), or ❓ (needs more context). Ignore rows you don\'t care about. When done, tell me which ones to apply and I\'ll update both our mirror and Xero tracking categories.');
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Xero ME receipts synced:** ${rows.length}`);
  lines.push(`- **With project suggestion:** ${suggestions.length}`);
  lines.push(`- **No change suggested:** ${noSuggestion.length}`);
  lines.push(`- **Unique suggested projects:** ${targets.length}`);
  lines.push('');

  lines.push('## Suggestions by target project');
  lines.push('');

  for (const target of targets) {
    const list = byTarget[target].sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalValue = list.reduce((s, r) => s + Math.abs(Number(r.amount_detected || 0)), 0);
    lines.push(`### → ${target} (${list.length} receipts, ${fmt(totalValue)})`);
    lines.push('');
    lines.push('| ? | Date | Vendor | Amount | Currently | Calendar evidence |');
    lines.push('|---|---|---|---:|---|---|');
    for (const r of list) {
      const curr = r.current_project || '(untagged)';
      lines.push(`| ☐ | ${r.date} | ${r.vendor_name || '?'} | ${fmt(r.amount_detected)} | ${curr} | ${r.evidence || '-'} |`);
    }
    lines.push('');
  }

  lines.push('## No suggestion (current vendor rule is consistent, or no matching calendar event)');
  lines.push('');
  if (noSuggestion.length === 0) {
    lines.push('_None._');
  } else {
    lines.push(`${noSuggestion.length} receipts have no calendar-based re-tag suggestion. Current tags are used as-is.`);
    lines.push('');
    lines.push('<details><summary>Full list</summary>');
    lines.push('');
    lines.push('| Date | Vendor | Amount | Project |');
    lines.push('|---|---|---:|---|');
    for (const r of noSuggestion.slice(0, 50)) {
      lines.push(`| ${r.date || '?'} | ${r.vendor_name || '?'} | ${fmt(r.amount_detected)} | ${r.current_project || '-'} |`);
    }
    if (noSuggestion.length > 50) lines.push(`| _... and ${noSuggestion.length - 50} more_ | | | |`);
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  lines.push('## Next steps');
  lines.push('');
  lines.push('1. Tick the rows you want to apply');
  lines.push('2. Tell Claude which ones: "apply all Q3 suggestions" or paste the specific rows');
  lines.push('3. Claude will `UPDATE xero_transactions SET project_code = ...` in the mirror + update the Xero tracking categories via API');
  lines.push('');
  lines.push('**Safety note:** auto-applying is disabled by default to prevent mass re-tagging. Project codes have real downstream effects (R&D claim calculation, per-project P&L, budget variance).');

  const outPath = path.join('thoughts/shared/reports', `xero-me-project-suggestions-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(outPath, lines.join('\n'));
  console.log(`\n✅ ${outPath}`);
  console.log(`   ${suggestions.length} suggestions / ${noSuggestion.length} no-change / ${targets.length} target projects`);
}

main().catch(e => { console.error(e); process.exit(1); });

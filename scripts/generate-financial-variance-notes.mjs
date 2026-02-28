#!/usr/bin/env node
/**
 * Generate Financial Variance Notes
 *
 * Auto-generates explanations for significant month-to-month changes
 * in project financials (>20% change or >$3K absolute change).
 * Uses LLM to produce human-readable explanations.
 *
 * Run: 1st of each month at 8am via PM2 (after calculate-project-monthly-financials).
 *
 * Usage:
 *   node scripts/generate-financial-variance-notes.mjs
 *   node scripts/generate-financial-variance-notes.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { trackedClaudeCompletion } from './lib/llm-client.mjs';
import { recordSyncStatus } from './lib/sync-status.mjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dryRun = process.argv.includes('--dry-run');

// Thresholds for generating variance notes
const PCT_THRESHOLD = 0.20; // 20% change
const ABS_THRESHOLD = 3000; // $3,000 absolute change

console.log(`Generating financial variance notes${dryRun ? ' (DRY RUN)' : ''}...`);

// Get the last 3 months of project_monthly_financials to compare
const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
threeMonthsAgo.setDate(1);
const sinceStr = threeMonthsAgo.toISOString().split('T')[0];

const { data: financials, error } = await supabase
  .from('project_monthly_financials')
  .select('*')
  .gte('month', sinceStr)
  .order('project_code')
  .order('month');

if (error) {
  console.error('Failed to fetch financials:', error.message);
  process.exit(1);
}

console.log(`Loaded ${financials.length} monthly records.`);

// Group by project_code
const byProject = new Map();
for (const row of financials) {
  if (!byProject.has(row.project_code)) byProject.set(row.project_code, []);
  byProject.get(row.project_code).push(row);
}

// Find significant variances
const variances = [];

for (const [code, months] of byProject) {
  // Sort by month ascending
  months.sort((a, b) => a.month.localeCompare(b.month));

  for (let i = 1; i < months.length; i++) {
    const prev = months[i - 1];
    const curr = months[i];

    // Check revenue variance
    const revChange = curr.revenue - prev.revenue;
    const revPct = prev.revenue > 0 ? revChange / prev.revenue : (curr.revenue > 0 ? 1 : 0);
    const revSignificant = Math.abs(revPct) >= PCT_THRESHOLD || Math.abs(revChange) >= ABS_THRESHOLD;

    // Check expense variance
    const expChange = curr.expenses - prev.expenses;
    const expPct = prev.expenses > 0 ? expChange / prev.expenses : (curr.expenses > 0 ? 1 : 0);
    const expSignificant = Math.abs(expPct) >= PCT_THRESHOLD || Math.abs(expChange) >= ABS_THRESHOLD;

    // Check net variance
    const netChange = curr.net - prev.net;
    const netPct = prev.net !== 0 ? netChange / Math.abs(prev.net) : (curr.net !== 0 ? 1 : 0);
    const netSignificant = Math.abs(netPct) >= PCT_THRESHOLD || Math.abs(netChange) >= ABS_THRESHOLD;

    if (revSignificant || expSignificant || netSignificant) {
      variances.push({
        project_code: code,
        month: curr.month,
        prev_month: prev.month,
        curr,
        prev,
        changes: {
          revenue: { amount: revChange, pct: revPct, significant: revSignificant },
          expenses: { amount: expChange, pct: expPct, significant: expSignificant },
          net: { amount: netChange, pct: netPct, significant: netSignificant },
        },
      });
    }
  }
}

console.log(`Found ${variances.length} significant variances to explain.`);

if (variances.length === 0) {
  console.log('No variances to process.');
  try {
    await recordSyncStatus(supabase, 'financial_variance_notes', {
      status: 'healthy',
      recordCount: 0,
      error: null,
    });
  } catch (e) {
    console.warn('Could not record sync status:', e.message);
  }
  process.exit(0);
}

// Generate explanations in batches
let upsertCount = 0;

for (const v of variances) {
  const { curr, prev, changes } = v;

  // Build context for LLM
  const parts = [];
  if (changes.revenue.significant) {
    const dir = changes.revenue.amount > 0 ? 'increased' : 'decreased';
    parts.push(`Revenue ${dir} by $${Math.abs(changes.revenue.amount).toFixed(0)} (${(Math.abs(changes.revenue.pct) * 100).toFixed(0)}%)`);
    // Top revenue sources
    const topRev = Object.entries(curr.revenue_breakdown || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([vendor, amt]) => `${vendor}: $${amt.toFixed(0)}`)
      .join(', ');
    if (topRev) parts.push(`Top revenue sources: ${topRev}`);
  }
  if (changes.expenses.significant) {
    const dir = changes.expenses.amount > 0 ? 'increased' : 'decreased';
    parts.push(`Expenses ${dir} by $${Math.abs(changes.expenses.amount).toFixed(0)} (${(Math.abs(changes.expenses.pct) * 100).toFixed(0)}%)`);
    // Top expense sources
    const topExp = Object.entries(curr.expense_breakdown || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([vendor, amt]) => `${vendor}: $${amt.toFixed(0)}`)
      .join(', ');
    if (topExp) parts.push(`Top expense sources: ${topExp}`);
  }

  const prompt = `You are a financial analyst for a small nonprofit/social enterprise called ACT (Australian Community Technologies).

Project: ${v.project_code}
Month: ${curr.month} vs prior month ${prev.month}

Changes:
${parts.join('\n')}

Previous month: Revenue $${prev.revenue.toFixed(0)}, Expenses $${prev.expenses.toFixed(0)}, Net $${prev.net.toFixed(0)}
Current month: Revenue $${curr.revenue.toFixed(0)}, Expenses $${curr.expenses.toFixed(0)}, Net $${curr.net.toFixed(0)}

Write a brief (1-2 sentence) explanation of what likely drove these changes. Be specific about vendors/sources. Don't hedge — be direct. Output ONLY the explanation, nothing else.`;

  try {
    const explanation = await trackedClaudeCompletion(prompt, 'generate-financial-variance-notes', {
      maxTokens: 200,
      operation: 'variance_explanation',
    });

    // Determine primary variance type
    const varianceType = changes.net.significant ? 'net_swing'
      : changes.revenue.significant ? 'revenue_change'
      : 'expense_change';
    const primaryChange = changes.net.significant ? changes.net
      : changes.revenue.significant ? changes.revenue
      : changes.expenses;

    // Build top drivers from breakdowns
    const topDrivers = [];
    for (const [vendor, amt] of Object.entries(curr.expense_breakdown || {})) {
      const prevAmt = (prev.expense_breakdown || {})[vendor] || 0;
      if (Math.abs(amt - prevAmt) > 500) {
        topDrivers.push({ vendor, amount: amt, change: amt - prevAmt });
      }
    }
    for (const [vendor, amt] of Object.entries(curr.revenue_breakdown || {})) {
      const prevAmt = (prev.revenue_breakdown || {})[vendor] || 0;
      if (Math.abs(amt - prevAmt) > 500) {
        topDrivers.push({ vendor, amount: amt, change: amt - prevAmt });
      }
    }
    topDrivers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    const severity = Math.abs(primaryChange.pct) >= 0.5 || Math.abs(primaryChange.amount) >= 10000
      ? 'critical'
      : Math.abs(primaryChange.pct) >= 0.3 || Math.abs(primaryChange.amount) >= 5000
        ? 'warning'
        : 'info';

    const row = {
      project_code: v.project_code,
      month: v.month,
      variance_type: varianceType,
      amount_change: Math.round(primaryChange.amount * 100) / 100,
      pct_change: Math.round(primaryChange.pct * 100),
      explanation: explanation.trim(),
      top_drivers: topDrivers.slice(0, 5),
      severity,
      auto_generated: true,
      updated_at: new Date().toISOString(),
    };

    if (dryRun) {
      console.log(`  [DRY RUN] ${v.project_code} ${v.month}: ${explanation.trim()}`);
    } else {
      const { error: upsertError } = await supabase
        .from('financial_variance_notes')
        .upsert(row, { onConflict: 'project_code,month,variance_type' });

      if (upsertError) {
        console.error(`  Error upserting ${v.project_code} ${v.month}:`, upsertError.message);
      } else {
        console.log(`  ${v.project_code} ${v.month}: ${explanation.trim().substring(0, 80)}...`);
        upsertCount++;
      }
    }
  } catch (llmError) {
    console.error(`  LLM error for ${v.project_code} ${v.month}:`, llmError.message);
  }

  // Rate limit: 200ms between LLM calls
  await new Promise(r => setTimeout(r, 200));
}

console.log(`Done. ${upsertCount} variance notes ${dryRun ? 'would be' : ''} upserted.`);

try {
  await recordSyncStatus(supabase, 'financial_variance_notes', {
    status: upsertCount > 0 || dryRun ? 'healthy' : 'error',
    recordCount: upsertCount,
    error: upsertCount === 0 && !dryRun ? 'No notes generated' : null,
  });
} catch (e) {
  console.warn('Could not record sync status:', e.message);
}

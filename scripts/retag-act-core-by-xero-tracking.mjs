#!/usr/bin/env node

import '../lib/load-env.mjs';

import { createClient } from '@supabase/supabase-js';
import { loadProjectsConfig } from './lib/project-loader.mjs';

const args = new Set(process.argv.slice(2));
const applyMode = args.has('--apply');
const sourceCode = 'ACT-CORE';
const retagSource = 'tracking_match';
const PAGE_SIZE = 500;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const projectCodes = await loadProjectsConfig({ supabase });

const GENERAL_TRACKING_LABELS = new Set([
  'a curious tractor',
  'act',
  'act core',
  'act hq',
  'act regenerative studio',
  'act studio',
]);

function normalizeLabel(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[—–-]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildTrackingMap() {
  const trackingMap = new Map();

  for (const [code, project] of Object.entries(projectCodes.projects || {})) {
    const labels = new Set();

    if (project.xero_tracking) {
      labels.add(project.xero_tracking);
      const stripped = project.xero_tracking.split(/\s*[—–-]\s*/).slice(1).join(' ');
      if (stripped) labels.add(stripped);
    }

    for (const alias of project.xero_tracking_aliases || []) {
      labels.add(alias);
    }

    labels.add(code);

    for (const label of labels) {
      const normalized = normalizeLabel(label);
      if (!normalized) continue;
      trackingMap.set(normalized, code);
    }
  }

  return trackingMap;
}

function extractProjectTrackingOptions(lineItems) {
  if (!Array.isArray(lineItems)) return [];

  const options = [];
  for (const item of lineItems) {
    const tracking = Array.isArray(item?.tracking) ? item.tracking : Array.isArray(item?.Tracking) ? item.Tracking : [];
    for (const entry of tracking) {
      const name = entry?.Name || entry?.name || '';
      const option = entry?.Option || entry?.option || '';
      if (name === 'Project Tracking' && option) {
        options.push(option.trim());
      }
    }
  }

  return Array.from(new Set(options));
}

function planRowRetag(row, trackingMap) {
  const options = extractProjectTrackingOptions(row.line_items);
  const relevantOptions = options.filter((option) => !GENERAL_TRACKING_LABELS.has(normalizeLabel(option)));

  if (relevantOptions.length === 0) return null;

  const resolvedCodes = new Set();
  const unknownOptions = [];

  for (const option of relevantOptions) {
    const mappedCode = trackingMap.get(normalizeLabel(option));
    if (mappedCode) {
      resolvedCodes.add(mappedCode);
    } else {
      unknownOptions.push(option);
    }
  }

  if (unknownOptions.length > 0) return null;
  if (resolvedCodes.size !== 1) return null;

  const [nextCode] = Array.from(resolvedCodes);
  if (!nextCode || nextCode === row.project_code) return null;

  return {
    id: row.id,
    current: row.project_code,
    next: nextCode,
    date: row.date,
    contact_name: row.contact_name,
    total: row.total,
    options: relevantOptions,
  };
}

async function fetchAllRows(table, columns) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq('project_code', sourceCode)
      .order('date', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...data);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function buildPlanForTable(table, columns) {
  const trackingMap = buildTrackingMap();
  const rows = await fetchAllRows(table, columns);

  return rows
    .map((row) => planRowRetag(row, trackingMap))
    .filter(Boolean);
}

async function applyPlan(table, plan) {
  for (const entry of plan) {
    const { error } = await supabase
      .from(table)
      .update({
        project_code: entry.next,
        project_code_source: retagSource,
      })
      .eq('id', entry.id);

    if (error) throw error;
  }
}

function summarize(plan) {
  const byCode = {};
  for (const item of plan) {
    byCode[item.next] = (byCode[item.next] || 0) + 1;
  }
  return byCode;
}

async function main() {
  const transactionPlan = await buildPlanForTable(
    'xero_transactions',
    'id, date, contact_name, total, project_code, line_items'
  );

  const invoicePlan = await buildPlanForTable(
    'xero_invoices',
    'id, invoice_number, date, contact_name, total, reference, project_code, line_items'
  );

  const payload = {
    mode: applyMode ? 'live' : 'dry-run',
    sourceCode,
    retagSource,
    transactions: {
      count: transactionPlan.length,
      byCode: summarize(transactionPlan),
      rows: transactionPlan,
    },
    invoices: {
      count: invoicePlan.length,
      byCode: summarize(invoicePlan),
      rows: invoicePlan,
    },
  };

  if (!applyMode) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  await applyPlan('xero_transactions', transactionPlan);
  await applyPlan('xero_invoices', invoicePlan);

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error('retag-act-core-by-xero-tracking failed:', error);
  process.exit(1);
});

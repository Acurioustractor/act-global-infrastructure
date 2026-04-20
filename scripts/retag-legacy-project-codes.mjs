#!/usr/bin/env node

import '../lib/load-env.mjs';

import { createClient } from '@supabase/supabase-js';

const dryRun = process.argv.includes('--dry-run');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const WRAPPER_REPLACEMENTS = {
  'ACT-HQ': 'ACT-CORE',
  'ACT-PC': 'ACT-PI',
};

const OPPORTUNITY_TITLE_OVERRIDES = {
  'GrantScope v1 launch — first paying customers': ['ACT-CS'],
  'GrantScope — foundation/enterprise customers': ['ACT-CS'],
};

async function countByProjectCode(table) {
  const counts = {};

  for (const [fromCode] of Object.entries(WRAPPER_REPLACEMENTS)) {
    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('project_code', fromCode);

    if (error) throw error;
    counts[fromCode] = count || 0;
  }

  return counts;
}

async function updateProjectCode(table, fromCode, toCode) {
  const { error } = await supabase
    .from(table)
    .update({ project_code: toCode })
    .eq('project_code', fromCode);

  if (error) throw error;
}

async function fetchLegacyOpportunities() {
  const [hqResult, pcResult] = await Promise.all([
    supabase
      .from('opportunities_unified')
      .select('id, title, project_codes')
      .contains('project_codes', ['ACT-HQ']),
    supabase
      .from('opportunities_unified')
      .select('id, title, project_codes')
      .contains('project_codes', ['ACT-PC']),
  ]);

  if (hqResult.error) throw hqResult.error;
  if (pcResult.error) throw pcResult.error;

  const merged = [...(hqResult.data || []), ...(pcResult.data || [])];
  const seen = new Set();

  return merged.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function normalizeOpportunityCodes(row) {
  if (OPPORTUNITY_TITLE_OVERRIDES[row.title]) {
    return OPPORTUNITY_TITLE_OVERRIDES[row.title];
  }

  const replaced = (row.project_codes || []).map((code) => WRAPPER_REPLACEMENTS[code] || code);
  return Array.from(new Set(replaced));
}

async function updateOpportunity(row, nextCodes) {
  const { error } = await supabase
    .from('opportunities_unified')
    .update({ project_codes: nextCodes })
    .eq('id', row.id);

  if (error) throw error;
}

async function main() {
  const before = {
    xero_transactions: await countByProjectCode('xero_transactions'),
    xero_invoices: await countByProjectCode('xero_invoices'),
    vendor_project_rules: await countByProjectCode('vendor_project_rules'),
    opportunities: await fetchLegacyOpportunities(),
  };

  const opportunityPlan = before.opportunities.map((row) => ({
    id: row.id,
    title: row.title,
    current: row.project_codes || [],
    next: normalizeOpportunityCodes(row),
  }));

  if (dryRun) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      before,
      opportunityPlan,
    }, null, 2));
    return;
  }

  for (const [fromCode, toCode] of Object.entries(WRAPPER_REPLACEMENTS)) {
    await updateProjectCode('xero_transactions', fromCode, toCode);
    await updateProjectCode('xero_invoices', fromCode, toCode);
    await updateProjectCode('vendor_project_rules', fromCode, toCode);
  }

  for (const plan of opportunityPlan) {
    await updateOpportunity({ id: plan.id }, plan.next);
  }

  const after = {
    xero_transactions: await countByProjectCode('xero_transactions'),
    xero_invoices: await countByProjectCode('xero_invoices'),
    vendor_project_rules: await countByProjectCode('vendor_project_rules'),
    opportunities: await fetchLegacyOpportunities(),
  };

  console.log(JSON.stringify({
    mode: 'live',
    before,
    after,
    updatedOpportunities: opportunityPlan,
  }, null, 2));
}

main().catch((error) => {
  console.error('retag-legacy-project-codes failed:', error);
  process.exit(1);
});

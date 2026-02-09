#!/usr/bin/env node
/**
 * Grants Pipeline Management
 *
 * Connects GHL grants pipeline to financial tracking:
 * - Links grants to project codes
 * - Tracks grant lifecycle (Research → Submitted → Approved → Received → Acquitted)
 * - Syncs with Xero when grants are received
 * - Monitors acquittal deadlines
 *
 * Usage:
 *   node scripts/grants-pipeline.mjs list              # List all grants
 *   node scripts/grants-pipeline.mjs active            # Show active grants
 *   node scripts/grants-pipeline.mjs won               # Show won grants
 *   node scripts/grants-pipeline.mjs link <id> <code>  # Link grant to project code
 *   node scripts/grants-pipeline.mjs received <id>     # Mark grant as received
 *   node scripts/grants-pipeline.mjs acquittal         # Check acquittal deadlines
 *   node scripts/grants-pipeline.mjs summary           # Financial summary by project
 *   node scripts/grants-pipeline.mjs sync              # Sync GHL grants to tracking table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Load project codes
const projectCodesPath = join(__dirname, '../config/project-codes.json');
const projectCodes = JSON.parse(readFileSync(projectCodesPath, 'utf8'));

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(amount || 0);
}

// Infer project code from grant name
function inferProjectCode(grantName) {
  const name = grantName.toLowerCase();

  const mappings = [
    { keywords: ['justicehub', 'justice hub', 'youth justice'], code: 'ACT-JH' },
    { keywords: ['picc', 'palm island', 'photo studio', 'elders'], code: 'ACT-PI' },
    { keywords: ['goods', 'fairfax goods'], code: 'ACT-GD' },
    { keywords: ['harvest', 'witta'], code: 'ACT-HV' },
    { keywords: ['empathy ledger', 'storytelling'], code: 'ACT-EL' },
    { keywords: ['confessional', 'melt'], code: 'ACT-CF' },
    { keywords: ['mounty yarns'], code: 'ACT-MY' },
    { keywords: ['contained'], code: 'ACT-CN' },
    { keywords: ['bg fit', 'bgfit'], code: 'ACT-BG' },
    { keywords: ['diagrama'], code: 'ACT-DG' },
    { keywords: ['first nations', 'indigenous'], code: 'ACT-FN' },
    { keywords: ['bimberi'], code: 'ACT-BM' },
    { keywords: ['storm stories', 'flood stories'], code: 'ACT-SS' },
  ];

  for (const mapping of mappings) {
    if (mapping.keywords.some(kw => name.includes(kw))) {
      return mapping.code;
    }
  }

  return null;
}

// List all grants
async function listGrants(filter = 'all') {
  let query = supabase
    .from('ghl_opportunities')
    .select('*')
    .order('monetary_value', { ascending: false, nullsFirst: false });

  if (filter === 'active' || filter === 'open') {
    query = query.eq('status', 'open');
  } else if (filter === 'won') {
    query = query.eq('status', 'won');
  }

  const { data: grants, error } = await query;

  if (error) {
    console.error('Error fetching grants:', error);
    return;
  }

  console.log(`\n📋 Grants Pipeline (${filter})`);
  console.log('━'.repeat(80));
  console.log('Name'.padEnd(45) + 'Value'.padStart(15) + '  Status'.padEnd(10) + '  Project');
  console.log('─'.repeat(80));

  let totalValue = 0;
  let openValue = 0;
  let wonValue = 0;

  for (const grant of grants) {
    const value = parseFloat(grant.monetary_value) || 0;
    totalValue += value;

    if (grant.status === 'open') openValue += value;
    if (grant.status === 'won') wonValue += value;

    const projectCode = grant.project_code || inferProjectCode(grant.name) || '—';
    const statusIcon = grant.status === 'won' ? '✅' : grant.status === 'open' ? '🔵' : '⚪';

    const name = grant.name.length > 43 ? grant.name.substring(0, 40) + '...' : grant.name;
    console.log(
      name.padEnd(45) +
      formatCurrency(value).padStart(15) +
      `  ${statusIcon} ${grant.status}`.padEnd(12) +
      projectCode
    );
  }

  console.log('─'.repeat(80));
  console.log(`Total: ${grants.length} grants`);
  console.log(`  Open: ${formatCurrency(openValue)}`);
  console.log(`  Won:  ${formatCurrency(wonValue)}`);
  console.log(`  All:  ${formatCurrency(totalValue)}`);
}

// Link grant to project code
async function linkToProject(grantId, projectCode) {
  // Validate project code
  if (!projectCodes.projects[projectCode]) {
    console.error(`\n❌ Invalid project code: ${projectCode}`);
    console.log('\nValid codes:');
    Object.entries(projectCodes.projects).slice(0, 10).forEach(([code, proj]) => {
      console.log(`  ${code}: ${proj.name}`);
    });
    console.log('  ... use "node scripts/unified-search.mjs list-codes" for full list');
    return;
  }

  const { data, error } = await supabase
    .from('ghl_opportunities')
    .update({ project_code: projectCode })
    .eq('id', grantId)
    .select()
    .single();

  if (error) {
    console.error('Error linking grant:', error);
    return;
  }

  console.log(`\n✅ Linked "${data.name}" to ${projectCode} (${projectCodes.projects[projectCode].name})`);
}

// Mark grant as received and create tracking entry
async function markReceived(grantId) {
  const { data: grant, error: fetchError } = await supabase
    .from('ghl_opportunities')
    .select('*')
    .eq('id', grantId)
    .single();

  if (fetchError || !grant) {
    console.error('Grant not found:', fetchError);
    return;
  }

  // Update grant status
  const now = new Date().toISOString();
  const acquittalDue = new Date();
  acquittalDue.setMonth(acquittalDue.getMonth() + 12); // Default 12 months acquittal

  const { error: updateError } = await supabase
    .from('ghl_opportunities')
    .update({
      status: 'won',
      received_date: now,
      acquittal_due_date: acquittalDue.toISOString(),
      acquittal_status: 'pending'
    })
    .eq('id', grantId);

  if (updateError) {
    console.error('Error updating grant:', updateError);
    return;
  }

  // Create tracking entry
  const projectCode = grant.project_code || inferProjectCode(grant.name) || 'ACT-IN';

  const { error: trackError } = await supabase
    .from('grant_financial_tracking')
    .insert({
      opportunity_id: grantId,
      project_code: projectCode,
      grant_name: grant.name,
      monetary_value: grant.monetary_value,
      status: 'received',
      received_date: now,
      acquittal_due_date: acquittalDue.toISOString(),
      acquittal_status: 'pending'
    });

  if (trackError) {
    console.error('Error creating tracking entry:', trackError);
  }

  console.log(`\n✅ Grant marked as received: "${grant.name}"`);
  console.log(`   Value: ${formatCurrency(grant.monetary_value)}`);
  console.log(`   Project: ${projectCode}`);
  console.log(`   Acquittal due: ${acquittalDue.toLocaleDateString()}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Create invoice in Xero (income)');
  console.log('   2. Tag with project code');
  console.log('   3. Reconcile when funds arrive in bank');
}

// Check acquittal deadlines
async function checkAcquittals() {
  const { data: grants, error } = await supabase
    .from('ghl_opportunities')
    .select('*')
    .eq('status', 'won')
    .not('acquittal_due_date', 'is', null)
    .order('acquittal_due_date');

  if (error) {
    console.error('Error fetching acquittals:', error);
    return;
  }

  console.log('\n📅 Acquittal Deadlines');
  console.log('━'.repeat(70));

  const now = new Date();
  const upcoming = [];
  const overdue = [];
  const pending = [];

  for (const grant of grants) {
    const dueDate = new Date(grant.acquittal_due_date);
    const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (grant.acquittal_status === 'completed') continue;

    if (daysUntil < 0) {
      overdue.push({ ...grant, daysUntil });
    } else if (daysUntil <= 30) {
      upcoming.push({ ...grant, daysUntil });
    } else {
      pending.push({ ...grant, daysUntil });
    }
  }

  if (overdue.length > 0) {
    console.log('\n🚨 OVERDUE');
    for (const grant of overdue) {
      console.log(`   ${grant.name}`);
      console.log(`      ${Math.abs(grant.daysUntil)} days overdue | ${formatCurrency(grant.monetary_value)}`);
    }
  }

  if (upcoming.length > 0) {
    console.log('\n⚠️  Due within 30 days');
    for (const grant of upcoming) {
      console.log(`   ${grant.name}`);
      console.log(`      ${grant.daysUntil} days | ${formatCurrency(grant.monetary_value)}`);
    }
  }

  if (pending.length > 0) {
    console.log('\n📋 Upcoming');
    for (const grant of pending.slice(0, 5)) {
      const dueDate = new Date(grant.acquittal_due_date);
      console.log(`   ${grant.name}`);
      console.log(`      Due: ${dueDate.toLocaleDateString()} | ${formatCurrency(grant.monetary_value)}`);
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`Total: ${overdue.length} overdue, ${upcoming.length} due soon, ${pending.length} pending`);
}

// Financial summary by project
async function financialSummary() {
  const { data: grants, error } = await supabase
    .from('ghl_opportunities')
    .select('*');

  if (error) {
    console.error('Error fetching grants:', error);
    return;
  }

  // Group by project code
  const byProject = {};
  let unassigned = { open: 0, won: 0, count: 0 };

  for (const grant of grants) {
    const code = grant.project_code || inferProjectCode(grant.name);
    const value = parseFloat(grant.monetary_value) || 0;

    if (!code) {
      unassigned.count++;
      if (grant.status === 'won') unassigned.won += value;
      else unassigned.open += value;
      continue;
    }

    if (!byProject[code]) {
      byProject[code] = { open: 0, won: 0, count: 0 };
    }

    byProject[code].count++;
    if (grant.status === 'won') {
      byProject[code].won += value;
    } else {
      byProject[code].open += value;
    }
  }

  console.log('\n💰 Grant Financial Summary by Project');
  console.log('━'.repeat(70));
  console.log('Project'.padEnd(10) + 'Name'.padEnd(30) + 'Won'.padStart(15) + 'Pipeline'.padStart(15));
  console.log('─'.repeat(70));

  let totalWon = 0;
  let totalOpen = 0;

  const sorted = Object.entries(byProject).sort((a, b) =>
    (b[1].won + b[1].open) - (a[1].won + a[1].open)
  );

  for (const [code, data] of sorted) {
    const project = projectCodes.projects[code];
    const name = project ? project.name.substring(0, 28) : 'Unknown';

    totalWon += data.won;
    totalOpen += data.open;

    console.log(
      code.padEnd(10) +
      name.padEnd(30) +
      formatCurrency(data.won).padStart(15) +
      formatCurrency(data.open).padStart(15)
    );
  }

  if (unassigned.count > 0) {
    console.log(
      '—'.padEnd(10) +
      `Unassigned (${unassigned.count})`.padEnd(30) +
      formatCurrency(unassigned.won).padStart(15) +
      formatCurrency(unassigned.open).padStart(15)
    );
    totalWon += unassigned.won;
    totalOpen += unassigned.open;
  }

  console.log('─'.repeat(70));
  console.log(
    'TOTAL'.padEnd(40) +
    formatCurrency(totalWon).padStart(15) +
    formatCurrency(totalOpen).padStart(15)
  );

  console.log('\n📊 Overview');
  console.log(`   Total Pipeline: ${formatCurrency(totalOpen + totalWon)}`);
  console.log(`   Won/Received:   ${formatCurrency(totalWon)}`);
  console.log(`   In Progress:    ${formatCurrency(totalOpen)}`);
}

// Sync GHL opportunities to tracking table
async function syncToTracking() {
  const { data: grants, error } = await supabase
    .from('ghl_opportunities')
    .select('*')
    .eq('status', 'won');

  if (error) {
    console.error('Error fetching grants:', error);
    return;
  }

  console.log(`\n🔄 Syncing ${grants.length} won grants to tracking...`);

  let created = 0;
  let skipped = 0;

  for (const grant of grants) {
    // Check if already tracked
    const { data: existing } = await supabase
      .from('grant_financial_tracking')
      .select('id')
      .eq('opportunity_id', grant.id)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    const projectCode = grant.project_code || inferProjectCode(grant.name) || 'ACT-IN';

    const { error: insertError } = await supabase
      .from('grant_financial_tracking')
      .insert({
        opportunity_id: grant.id,
        project_code: projectCode,
        grant_name: grant.name,
        monetary_value: grant.monetary_value,
        status: 'received',
        received_date: grant.received_date || grant.ghl_updated_at,
        acquittal_due_date: grant.acquittal_due_date,
        acquittal_status: grant.acquittal_status || 'pending'
      });

    if (!insertError) {
      created++;
    }
  }

  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped (already tracked): ${skipped}`);
}

// Main CLI
async function main() {
  const command = process.argv[2] || 'list';
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  switch (command) {
    case 'list':
      await listGrants('all');
      break;
    case 'active':
    case 'open':
      await listGrants('open');
      break;
    case 'won':
      await listGrants('won');
      break;
    case 'link':
      if (!arg1 || !arg2) {
        console.error('Usage: grants-pipeline.mjs link <grant-id> <project-code>');
        process.exit(1);
      }
      await linkToProject(arg1, arg2);
      break;
    case 'received':
      if (!arg1) {
        console.error('Usage: grants-pipeline.mjs received <grant-id>');
        process.exit(1);
      }
      await markReceived(arg1);
      break;
    case 'acquittal':
    case 'acquittals':
      await checkAcquittals();
      break;
    case 'summary':
      await financialSummary();
      break;
    case 'sync':
      await syncToTracking();
      break;
    default:
      console.log('Unknown command:', command);
      console.log('\nUsage:');
      console.log('  list              - List all grants');
      console.log('  active            - Show active/open grants');
      console.log('  won               - Show won grants');
      console.log('  link <id> <code>  - Link grant to project code');
      console.log('  received <id>     - Mark grant as received');
      console.log('  acquittal         - Check acquittal deadlines');
      console.log('  summary           - Financial summary by project');
      console.log('  sync              - Sync won grants to tracking table');
  }
}

main().catch(console.error);

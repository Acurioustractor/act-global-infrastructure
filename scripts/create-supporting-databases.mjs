#!/usr/bin/env node
/**
 * Create 5 supporting Notion databases under ACT Money Framework.
 *
 *   1. Decisions Log         — what was decided + why + linked Opp
 *   2. Action Items          — to-do list with owner/due/linked Opp
 *   3. Foundations           — funder profiles (top 200 from Supabase foundations table)
 *   4. Standard Ledger Q&A   — questions to advisors with status
 *   5. Stakeholders          — trust beneficiaries + family + employees
 *
 * Each database created idempotently. IDs saved to config/notion-database-ids.json.
 *
 * Re-runnable: skips databases already in config.
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const cfgPath = join(__dirname, '..', 'config', 'notion-database-ids.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
const PARENT = cfg.moneyFramework;

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const rt = (text) => [{ type: 'text', text: { content: String(text || '').slice(0, 2000) } }];

// ============================================
// DB definitions
// ============================================

const DBS = {
  decisionsLog: {
    title: 'Decisions Log',
    emoji: '\u{1F4DC}',
    cfgKey: 'decisionsLog',
    schema: {
      Title: { title: {} },
      Date: { date: {} },
      Decision: { rich_text: {} },
      Context: { rich_text: {} },
      Owner: { select: { options: [
        { name: 'Ben', color: 'blue' },
        { name: 'Nic', color: 'green' },
        { name: 'Both', color: 'purple' },
        { name: 'Standard Ledger', color: 'orange' },
        { name: 'R&D Consultant', color: 'yellow' },
        { name: 'Lawyer', color: 'red' },
      ]}},
      Status: { select: { options: [
        { name: 'Proposed', color: 'gray' },
        { name: 'Decided', color: 'green' },
        { name: 'Reversed', color: 'red' },
        { name: 'Superseded', color: 'orange' },
      ]}},
      Tags: { multi_select: { options: [
        { name: 'cutover', color: 'blue' },
        { name: 'payroll', color: 'green' },
        { name: 'r-and-d', color: 'purple' },
        { name: 'tax', color: 'orange' },
        { name: 'family', color: 'pink' },
        { name: 'cgt', color: 'yellow' },
        { name: 'trust', color: 'brown' },
        { name: 'commercial', color: 'red' },
      ]}},
      'Linked Page': { url: {} },
    },
    seed: [
      {
        Title: 'Use Subdiv 328-G for sole-trader → Pty asset transfer',
        Date: '2026-05-05',
        Decision: 'Adopt 328-G rollover (not 122-A) for cutover — covers all asset types incl IP and depreciating assets.',
        Context: 'Per rebuttal §2.3 — 122-A leaves gaps for IP/depreciating assets. 328-G handles cleanly. Standard Ledger to draft elections.',
        Owner: 'Standard Ledger',
        Status: 'Proposed',
        Tags: ['cutover', 'tax'],
      },
      {
        Title: 'CivicGraph commercial: defer to FY28',
        Date: '2026-05-06',
        Decision: 'Accept FY27 Flow target haircut. CivicGraph stays research/grant-funded until first paying customer scoped.',
        Context: 'Per fy26-voice-flow-gap analysis. No commercial customers yet, no productisation capacity. Honest reset rather than aspirational $1.45M Flow target.',
        Owner: 'Both',
        Status: 'Proposed',
        Tags: ['commercial'],
      },
    ],
  },

  actionItems: {
    title: 'Action Items',
    emoji: '\u{2705}',
    cfgKey: 'actionItems',
    schema: {
      Task: { title: {} },
      Status: { select: { options: [
        { name: 'To do', color: 'gray' },
        { name: 'Doing', color: 'blue' },
        { name: 'Blocked', color: 'orange' },
        { name: 'Done', color: 'green' },
        { name: 'Cancelled', color: 'red' },
      ]}},
      Owner: { select: { options: [
        { name: 'Ben', color: 'blue' },
        { name: 'Nic', color: 'green' },
        { name: 'Standard Ledger', color: 'orange' },
        { name: 'External', color: 'gray' },
      ]}},
      Due: { date: {} },
      Description: { rich_text: {} },
      Source: { select: { options: [
        { name: 'Friday Digest', color: 'purple' },
        { name: 'Money Sync', color: 'blue' },
        { name: 'Manual', color: 'default' },
        { name: 'Standard Ledger meeting', color: 'orange' },
        { name: 'Cron alert', color: 'red' },
      ]}},
      Priority: { select: { options: [
        { name: 'Critical', color: 'red' },
        { name: 'High', color: 'orange' },
        { name: 'Medium', color: 'yellow' },
        { name: 'Low', color: 'gray' },
      ]}},
    },
    seed: [
      { Task: 'Reconcile INV-0314 Centrecorp $84,700 in Xero', Status: 'To do', Owner: 'Nic', Due: '2026-05-10', Priority: 'High', Source: 'Manual', Description: 'Status currently DRAFT — either approve+match to bank deposit, or void and re-issue.' },
      { Task: 'Reconcile INV-0295 Just Reinvest $27,500 in Xero', Status: 'To do', Owner: 'Nic', Due: '2026-05-08', Priority: 'High', Source: 'Manual', Description: 'Payment exists in Xero but not bank-line reconciled. Open Bank Accounts → match to deposit.' },
      { Task: 'Email Standard Ledger — schedule cutover prep meeting', Status: 'To do', Owner: 'Ben', Due: '2026-05-12', Priority: 'Critical', Source: 'Manual', Description: '55 days to cutover. Need to lock 328-G election forms + Pty payroll setup.' },
      { Task: 'Engage R&D consultant for FY26 claim', Status: 'To do', Owner: 'Ben', Due: '2026-05-19', Priority: 'High', Source: 'Manual', Description: '$190K refund expected. R&D consultant fee ~$15-30K, returns 5-10× via claim quality.' },
      { Task: 'Triage 5 fresh ACT-fit grants seeded in GHL', Status: 'To do', Owner: 'Both', Due: '2026-05-13', Priority: 'Medium', Source: 'Cron alert', Description: 'Sidney Myer $200K, St Vincent\'s $100K, Youth Development $50K, Emerging Artist $50K, Enablers $50K. All marked researching — decide go/no-go on each.' },
      { Task: 'Decide Empathy Ledger pipeline future (commercial vs Contacts list)', Status: 'To do', Owner: 'Both', Due: '2026-05-20', Priority: 'Medium', Source: 'Manual', Description: '21 zero-value opps. Either convert to real commercial pipeline with $ estimates, or demote to GHL Contacts.' },
    ],
  },

  foundations: {
    title: 'Foundations',
    emoji: '\u{1F3DB}\u{FE0F}',
    cfgKey: 'foundationsDb',
    schema: {
      Name: { title: {} },
      Type: { select: { options: [
        { name: 'Private Foundation', color: 'purple' },
        { name: 'Family Trust', color: 'blue' },
        { name: 'Corporate', color: 'green' },
        { name: 'Government', color: 'gray' },
        { name: 'Public Foundation', color: 'orange' },
        { name: 'Indigenous Charitable Trust', color: 'red' },
        { name: 'Other', color: 'default' },
      ]}},
      'Has DGR': { checkbox: {} },
      'Total Giving Annual': { number: { format: 'australian_dollar' } },
      Themes: { multi_select: { options: [
        { name: 'indigenous', color: 'red' },
        { name: 'community', color: 'green' },
        { name: 'arts', color: 'purple' },
        { name: 'health', color: 'blue' },
        { name: 'education', color: 'orange' },
        { name: 'environment', color: 'green' },
        { name: 'youth', color: 'pink' },
        { name: 'social-justice', color: 'yellow' },
        { name: 'employment', color: 'brown' },
        { name: 'innovation', color: 'gray' },
      ]}},
      Geography: { multi_select: {} },
      Website: { url: {} },
      'Application Tips': { rich_text: {} },
      'Profile Confidence': { select: { options: [
        { name: 'High', color: 'green' },
        { name: 'Medium', color: 'yellow' },
        { name: 'Low', color: 'red' },
      ]}},
      'Foundation ID': { rich_text: {} }, // Supabase foundations.id for sync
    },
    // Seed populated from Supabase
  },

  ledgerQA: {
    title: 'Standard Ledger Q&A',
    emoji: '\u{2754}',
    cfgKey: 'ledgerQA',
    schema: {
      Question: { title: {} },
      Status: { select: { options: [
        { name: 'Open', color: 'red' },
        { name: 'Awaiting Reply', color: 'orange' },
        { name: 'Answered', color: 'green' },
        { name: 'Closed', color: 'gray' },
      ]}},
      'Asked Date': { date: {} },
      'Answered Date': { date: {} },
      Recipient: { select: { options: [
        { name: 'Standard Ledger', color: 'blue' },
        { name: 'R&D Consultant', color: 'purple' },
        { name: 'Lawyer', color: 'orange' },
      ]}},
      Topic: { multi_select: { options: [
        { name: 'cutover', color: 'blue' },
        { name: 'payroll', color: 'green' },
        { name: 'r-and-d', color: 'purple' },
        { name: 'trust', color: 'brown' },
        { name: 'cgt', color: 'yellow' },
        { name: 'gst', color: 'orange' },
        { name: 'family', color: 'pink' },
        { name: 'tax', color: 'red' },
      ]}},
      Answer: { rich_text: {} },
      Priority: { select: { options: [
        { name: 'Critical', color: 'red' },
        { name: 'High', color: 'orange' },
        { name: 'Normal', color: 'gray' },
      ]}},
    },
    seed: [
      { Question: 'Confirm Subdiv 328-G is correct rollover for Nic\'s ST → ACT Pty', Status: 'Open', 'Asked Date': '2026-05-06', Recipient: 'Standard Ledger', Topic: ['cutover', 'tax'], Priority: 'Critical' },
      { Question: 'Path C R&D registration mechanic — Pty as registrant for FY26 activities pre-incorporation?', Status: 'Open', 'Asked Date': '2026-05-06', Recipient: 'R&D Consultant', Topic: ['r-and-d'], Priority: 'Critical' },
      { Question: 'Knight Family Trust deed — does it permit franked dividend streaming + capital gains streaming?', Status: 'Open', 'Asked Date': '2026-05-06', Recipient: 'Standard Ledger', Topic: ['trust'], Priority: 'High' },
      { Question: 'KP GST registration date + backdating treatment', Status: 'Open', 'Asked Date': '2026-05-06', Recipient: 'Standard Ledger', Topic: ['gst'], Priority: 'High' },
      { Question: 'Cameron + Pollyanna trust distribution treatment under s100A — what evidence to maintain?', Status: 'Open', 'Asked Date': '2026-05-06', Recipient: 'Standard Ledger', Topic: ['trust', 'family'], Priority: 'High' },
      { Question: 'Africa R&D claim — apportionment % per spend category for trip days?', Status: 'Open', 'Asked Date': '2026-05-06', Recipient: 'R&D Consultant', Topic: ['r-and-d'], Priority: 'High' },
      { Question: 'CGT exit positioning on CivicGraph — share sale vs asset sale, structure 3-5 years out', Status: 'Open', 'Asked Date': '2026-05-06', Recipient: 'Standard Ledger', Topic: ['cgt'], Priority: 'Normal' },
      { Question: 'Founder payroll setup: stapled super or default fund? STP timing?', Status: 'Open', 'Asked Date': '2026-05-06', Recipient: 'Standard Ledger', Topic: ['payroll'], Priority: 'High' },
    ],
  },

  stakeholders: {
    title: 'Stakeholders',
    emoji: '\u{1F465}',
    cfgKey: 'stakeholders',
    schema: {
      Name: { title: {} },
      Relationship: { select: { options: [
        { name: 'Founder', color: 'red' },
        { name: 'Family', color: 'pink' },
        { name: 'Partner', color: 'orange' },
        { name: 'Employee', color: 'blue' },
        { name: 'Contractor', color: 'green' },
        { name: 'Director', color: 'purple' },
        { name: 'Beneficiary only', color: 'gray' },
      ]}},
      'Knight Trust Beneficiary': { checkbox: {} },
      'Marchesi Trust Beneficiary': { checkbox: {} },
      'ACT Pty Employee': { checkbox: {} },
      'Marginal Rate Estimate': { select: { options: [
        { name: '0% (under threshold)', color: 'gray' },
        { name: '19%', color: 'green' },
        { name: '32.5%', color: 'yellow' },
        { name: '37%', color: 'orange' },
        { name: '45% + 2% Medicare', color: 'red' },
      ]}},
      'Super Fund': { rich_text: {} },
      Notes: { rich_text: {} },
    },
    seed: [
      { Name: 'Ben Knight', Relationship: 'Founder', 'Knight Trust Beneficiary': true, 'ACT Pty Employee': true, 'Marginal Rate Estimate': '37%', Notes: 'Co-founder + Director ACT Pty. Salary $120K post-cutover.' },
      { Name: 'Nic Marchesi', Relationship: 'Founder', 'Marchesi Trust Beneficiary': true, 'ACT Pty Employee': true, 'Marginal Rate Estimate': '37%', Notes: 'Co-founder + Director ACT Pty. Currently sole trader (winds down 30 Jun 2026). Salary $120K post-cutover.' },
      { Name: 'Cameron (Ben\'s partner)', Relationship: 'Partner', 'Knight Trust Beneficiary': true, 'Marginal Rate Estimate': '32.5%', Notes: 'Trust beneficiary candidate. Tax channel TBD: distribution at year-end vs formal employment role at ACT Pty.' },
      { Name: 'Pollyanna (Ben\'s daughter)', Relationship: 'Family', 'Knight Trust Beneficiary': true, 'Marginal Rate Estimate': '0% (under threshold)', Notes: 'Status check: if minor (under 18), trust distributions taxed at 47% — NOT efficient. If 18+, distributions efficient up to ~$22.5K tax-free.' },
    ],
  },
};

// ============================================
// Helpers
// ============================================

async function ensureDb(key, def) {
  if (cfg[def.cfgKey]) {
    log(`✓ ${def.title} already exists (${cfg[def.cfgKey]})`);
    return cfg[def.cfgKey];
  }

  log(`Creating ${def.title}...`);
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT },
    title: [{ type: 'text', text: { content: def.title } }],
    icon: { type: 'emoji', emoji: def.emoji },
    properties: def.schema,
  });
  cfg[def.cfgKey] = db.id;

  // Resolve data source ID
  const dsId = db.data_sources?.[0]?.id;
  if (dsId) cfg[def.cfgKey + 'DataSource'] = dsId;
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
  log(`  Created: ${db.id}`);

  // Update schema (Notion's create only adds title — need to push other props via dataSources.update)
  if (dsId) {
    const ds = await notion.dataSources.retrieve({ data_source_id: dsId });
    const existing = new Set(Object.keys(ds.properties || {}));
    const required = Object.keys(def.schema).filter(k => k !== 'Name' && k !== 'Title' && k !== 'Question' && k !== 'Task');
    const missing = required.filter(p => !existing.has(p));
    if (missing.length > 0) {
      const add = {};
      for (const m of missing) add[m] = def.schema[m];
      await notion.dataSources.update({ data_source_id: dsId, properties: add });
      log(`  Added ${missing.length} props`);
    }
  }

  return db.id;
}

function buildProps(def, row) {
  const props = {};
  for (const [name, val] of Object.entries(row)) {
    const schema = def.schema[name];
    if (!schema) continue;
    const t = Object.keys(schema)[0]; // type from schema definition
    if (t === 'title') props[name] = { title: rt(val) };
    else if (t === 'rich_text') props[name] = { rich_text: rt(val) };
    else if (t === 'date') props[name] = { date: { start: val } };
    else if (t === 'number') props[name] = { number: Number(val) };
    else if (t === 'select') props[name] = { select: { name: val } };
    else if (t === 'multi_select') props[name] = { multi_select: (Array.isArray(val) ? val : [val]).map(v => ({ name: v })) };
    else if (t === 'checkbox') props[name] = { checkbox: !!val };
    else if (t === 'url') props[name] = { url: val };
  }
  return props;
}

async function seedDb(def, dsId) {
  if (!def.seed || def.seed.length === 0) return;
  log(`  Seeding ${def.seed.length} rows...`);
  for (const row of def.seed) {
    try {
      await notion.pages.create({
        parent: { type: 'data_source_id', data_source_id: dsId },
        properties: buildProps(def, row),
      });
      await sleep(150);
    } catch (e) {
      log(`    ✗ seed error: ${e.message.slice(0, 100)}`);
    }
  }
  log(`  ✓ Seeded`);
}

async function seedFoundations(dsId) {
  // Pull top 100 foundations from Supabase, prioritised by ACT-relevant themes
  log('  Pulling top foundations from Supabase...');
  const { data } = await supabase
    .from('foundations')
    .select('id, name, type, has_dgr, total_giving_annual, thematic_focus, geographic_focus, website, application_tips, profile_confidence')
    .not('enriched_at', 'is', null)
    .overlaps('thematic_focus', ['indigenous', 'community', 'arts', 'social_justice', 'youth', 'employment', 'capacity_building', 'innovation'])
    .order('total_giving_annual', { ascending: false, nullsFirst: false })
    .limit(100);

  log(`  Seeding ${(data || []).length} foundation rows...`);
  let ok = 0, err = 0;
  for (const f of (data || [])) {
    try {
      const props = {
        Name: { title: rt(f.name || 'unnamed') },
        'Has DGR': { checkbox: !!f.has_dgr },
        'Total Giving Annual': { number: Number(f.total_giving_annual || 0) },
        'Foundation ID': { rich_text: rt(f.id) },
      };
      if (f.type) {
        const typeMap = {
          'Private Foundation': 'Private Foundation', 'Family Trust': 'Family Trust',
          'Corporate': 'Corporate', 'Government': 'Government',
          'Public Foundation': 'Public Foundation', 'Indigenous Charitable Trust': 'Indigenous Charitable Trust',
        };
        props.Type = { select: { name: typeMap[f.type] || 'Other' } };
      }
      if (Array.isArray(f.thematic_focus) && f.thematic_focus.length > 0) {
        // Filter to known options
        const known = ['indigenous', 'community', 'arts', 'health', 'education', 'environment', 'youth', 'social-justice', 'employment', 'innovation'];
        const tags = f.thematic_focus
          .map(t => (t || '').toLowerCase().replace('_', '-'))
          .filter(t => known.includes(t));
        if (tags.length > 0) props.Themes = { multi_select: tags.map(name => ({ name })) };
      }
      if (Array.isArray(f.geographic_focus) && f.geographic_focus.length > 0) {
        props.Geography = { multi_select: f.geographic_focus.slice(0, 5).map(name => ({ name: String(name).slice(0, 100) })) };
      }
      if (f.website) props.Website = { url: f.website };
      if (f.application_tips && f.application_tips.length < 1900) props['Application Tips'] = { rich_text: rt(f.application_tips) };
      if (f.profile_confidence) {
        const pcMap = { high: 'High', medium: 'Medium', low: 'Low' };
        const pc = pcMap[(f.profile_confidence || '').toLowerCase()];
        if (pc) props['Profile Confidence'] = { select: { name: pc } };
      }
      await notion.pages.create({
        parent: { type: 'data_source_id', data_source_id: dsId },
        properties: props,
      });
      ok++;
      if (ok % 20 === 0) log(`    ${ok}/${data.length} so far...`);
      await sleep(150);
    } catch (e) {
      err++;
      if (err <= 3) log(`    ✗ ${f.name}: ${e.message.slice(0, 100)}`);
    }
  }
  log(`  ✓ Foundations seeded: ${ok} ok, ${err} errors`);
}

async function main() {
  log('=== Creating supporting databases ===');

  for (const [key, def] of Object.entries(DBS)) {
    const dbId = await ensureDb(key, def);
    const dsId = cfg[def.cfgKey + 'DataSource'];
    if (!dsId) continue;

    // Check if already seeded
    const { results } = await notion.dataSources.query({ data_source_id: dsId, page_size: 1 });
    if (results.length > 0) {
      log(`  ${def.title}: already has rows, skipping seed`);
      continue;
    }

    if (key === 'foundations') {
      await seedFoundations(dsId);
    } else {
      await seedDb(def, dsId);
    }
  }

  log('\n=== Done ===');
  for (const [key, def] of Object.entries(DBS)) {
    const id = cfg[def.cfgKey];
    if (id) log(`  ${def.title}: notion.so/${id.replace(/-/g, '')}`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

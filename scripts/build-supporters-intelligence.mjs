#!/usr/bin/env node
/**
 * Build the unified supporter-intelligence view.
 *
 * Joins:
 *   - xero_invoices (ACCREC) → paid + outstanding totals per contact
 *   - wiki/narrative/funders.json → relationship state + framing
 *   - ghl_contacts (Supabase mirror) → tags + last touch
 *
 * Output:
 *   - supporters_intelligence table (Supabase) — one row per supporter org
 *   - thoughts/shared/reports/supporters-intelligence-latest.json — daily snapshot
 *
 * Tier classification:
 *   PAID       — has paid invoices in Xero
 *   OUTSTANDING — has AUTHORISED invoices but no PAID (overdue or just-issued)
 *   WARM        — in funders.json with stage active/warm/paused, no Xero record
 *   COLD        — in funders.json with stage cold/dormant, no Xero record
 *   PROSPECT    — in GHL with funder tag, not in funders.json or Xero
 *
 * Outstanding alert level:
 *   CRITICAL  — outstanding >= $50,000
 *   AGING     — outstanding >= $10,000 OR oldest open > 60 days
 *   FLAGGED   — any outstanding
 *   CLEAR     — nothing outstanding
 *
 * PM2 cron: daily 06:00 AEST (refreshes before the morning brief)
 *
 * Plan: act-communication-pipeline-2026-05-23-locked
 */

import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const FUNDERS_PATH = '/Users/benknight/Code/act-global-infrastructure/wiki/narrative/funders.json';
const REPORT_DIR = '/Users/benknight/Code/act-global-infrastructure/thoughts/shared/reports';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// XERO → SLUG MAPPING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Most Xero contact_name → funders.json slug mappings are derivable by
// slugifying the name. Exceptions are hard-coded here.
const NAME_TO_SLUG_OVERRIDES = {
  'Palm Island Community Company Limited (PICC)': 'palm-island-community-company-limited-picc',
  'The Snow Foundation': 'snow-foundation',
  'SMART Recovery Australia': 'smart-recovery-australia',
  'Centrecorp Foundation': 'centrecorp',
  'Ingkerreke Services Aboriginal Corporation': 'ingkerreke-services-aboriginal-corporation',
  'Sonas Properties Pty Ltd': 'sonas-properties-pty-ltd',
  'Vincent Fairfax Family Foundation': 'vincent-fairfax',
  'Regional Arts Australia': 'regional-arts-australia',
  'Just Reinvest': 'just-reinvest',
  'GREEN FOX TRAINING STUDIO LIMITED': 'green-fox-training-studio-limited',
  'Social Impact Hub Foundation': 'qbe-catalysing-impact',  // SIH runs Catalysing Impact for QBE
  'State of Queensland (acting through the Department of Families, Seniors, Disability Services and Child Safety)': 'state-of-queensland-acting-through-the-department-of-familie',
  'Our Community Shed Incorporated': 'our-community-shed-incorporated',
  'Julalikari Council Aboriginal Corporation': 'julalikari-council-aboriginal-corporation',
  'Dusseldorp Forum': 'dusseldorp-forum',
  'Red Dust Role Models Limited': 'red-dust-role-models-limited',
  'Berry Obsession PTY LTD': 'berry-obsession-pty-ltd',
  'QIC LIMITED': 'qic-limited',
  'StreetSmart Australia': 'streetsmart-australia',
  'Paul Ramsay Foundation': 'paul-ramsay-foundation',
  'Brisbane Powerhouse Foundation': 'brisbane-powerhouse-foundation',
  'Blue Gum Station': 'blue-gum-station',
  'Jenn Brazier': 'jenn-brazier',
  'Bigmeats Qld Pty Ltd': 'bigmeats-qld-pty-ltd',
  'Mala’la Health Service Aboriginal Corporation': 'malala-health-service-aboriginal-corporation',
  'UFGC GmbH Grillparzerstraße 26 8010 Graz | Austria': 'ufgc-gmbh',
  'Westpac Scholars Trust': 'westpac-scholars-trust',
  'Department of Housing': 'qld-housing-department',
  'Minjerribah Moorgumpin (Elders-In-Council) Aboriginal Corporation': 'minjerribah-moorgumpin',
  'Rotary Eclub Outback Australia, Division 9560,': 'rotary-eclub-outback-australia-9560',
  'Brodie Germaine Fitness Aboriginal Corporation': 'brodie-germaine-fitness-aboriginal-corporation',
  'Aleisha J Keating': 'aleisha-j-keating',
  'Homeland School Company': 'homeland-school-company',
  'The John Villiers Trust': 'the-john-villiers-trust',
  'Bawinanga Homelands Aboriginal Corporation': 'bawinanga-homelands-aboriginal-corp',
  'Ebony Reimers & Dane Proudfoot': 'ebony-reimers-dane-proudfoot',
};

function xeroNameToSlug(name) {
  return NAME_TO_SLUG_OVERRIDES[name]
    || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function daysAgo(date) {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function classifyOutstandingAlert(outstandingAud, oldestOpenDate) {
  if (outstandingAud >= 50000) return 'CRITICAL';
  if (outstandingAud >= 10000) return 'AGING';
  const age = daysAgo(oldestOpenDate);
  if (age !== null && age > 60) return 'AGING';
  if (outstandingAud > 0) return 'FLAGGED';
  return 'CLEAR';
}

function classifyTier(paid, outstanding, funderEntry) {
  if (paid > 0) return 'PAID';
  if (outstanding > 0) return 'OUTSTANDING';
  if (funderEntry) {
    const stage = funderEntry.stage || '';
    if (/active|warm|ask-pending|paused/.test(stage)) return 'WARM';
    if (/cold|dormant|lapsed/.test(stage)) return 'COLD';
  }
  return 'PROSPECT';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('🔍 Building supporter intelligence view...\n');

  // 1. Load funders.json (relationship state + framing)
  const fundersData = JSON.parse(readFileSync(FUNDERS_PATH, 'utf8'));
  const funders = fundersData.funders;
  console.log(`✓ Loaded funders.json — ${Object.keys(funders).length} entries`);

  // 2. Pull Xero supporters (ACCREC = money flowing in)
  const { data: xeroRows, error: xeroErr } = await supabase
    .from('xero_invoices')
    .select('contact_name, status, total, amount_due, date, tracking_option_1, tracking_option_2, project_code')
    .eq('type', 'ACCREC');
  if (xeroErr) throw xeroErr;

  // 3. Aggregate per contact_name
  const xeroAgg = new Map();
  for (const r of xeroRows) {
    if (!r.contact_name) continue;
    if (!xeroAgg.has(r.contact_name)) {
      xeroAgg.set(r.contact_name, {
        contact_name: r.contact_name,
        invoice_count: 0,
        paid_invoice_count: 0,
        outstanding_invoice_count: 0,
        total_paid_aud: 0,
        outstanding_aud: 0,
        first_invoice_date: null,
        last_invoice_date: null,
        oldest_open_date: null,
        projects: new Set(),
      });
    }
    const agg = xeroAgg.get(r.contact_name);
    agg.invoice_count++;
    const total = Number(r.total || 0);
    if (r.status === 'PAID') {
      agg.paid_invoice_count++;
      agg.total_paid_aud += total;
    } else if (r.status === 'AUTHORISED') {
      agg.outstanding_invoice_count++;
      agg.outstanding_aud += Number(r.amount_due || r.total || 0);
      if (!agg.oldest_open_date || r.date < agg.oldest_open_date) {
        agg.oldest_open_date = r.date;
      }
    }
    if (!agg.first_invoice_date || r.date < agg.first_invoice_date) agg.first_invoice_date = r.date;
    if (!agg.last_invoice_date || r.date > agg.last_invoice_date) agg.last_invoice_date = r.date;
    const proj = r.tracking_option_1 || r.tracking_option_2 || r.project_code;
    if (proj) agg.projects.add(proj);
  }
  console.log(`✓ Aggregated Xero — ${xeroAgg.size} contacts with ACCREC invoices`);

  // 4. Build supporter records — start with Xero contacts, then add funders.json-only entries
  const supporters = [];
  const seenSlugs = new Set();

  for (const [contactName, agg] of xeroAgg) {
    const slug = xeroNameToSlug(contactName);
    seenSlugs.add(slug);
    const funder = funders[slug];

    supporters.push({
      slug,
      name: funder?.name || contactName,
      xero_contact_name: contactName,
      tier: classifyTier(agg.total_paid_aud, agg.outstanding_aud, funder),
      stage: funder?.stage || (agg.total_paid_aud > 0 ? 'paid-no-funders-entry' : 'outstanding-no-funders-entry'),
      total_paid_aud: Math.round(agg.total_paid_aud * 100) / 100,
      outstanding_aud: Math.round(agg.outstanding_aud * 100) / 100,
      invoice_count: agg.invoice_count,
      paid_invoice_count: agg.paid_invoice_count,
      outstanding_invoice_count: agg.outstanding_invoice_count,
      first_invoice_date: agg.first_invoice_date,
      last_invoice_date: agg.last_invoice_date,
      oldest_open_date: agg.oldest_open_date,
      outstanding_age_days: daysAgo(agg.oldest_open_date),
      outstanding_alert: classifyOutstandingAlert(agg.outstanding_aud, agg.oldest_open_date),
      projects: [...agg.projects],
      primary_contact: funder?.primary_contact || null,
      primary_email: funder?.primary_email || null,
      cc_email: funder?.cc_email || null,
      last_communicated_at: funder?.last_communicated_at || null,
      days_since_last_contact: daysAgo(funder?.last_communicated_at),
      themes: funder?.themes || [],
      tone: funder?.tone || null,
      framing_notes_excerpt: funder?.framing_notes ? funder.framing_notes.slice(0, 240) + (funder.framing_notes.length > 240 ? '…' : '') : null,
      next_report_due: funder?.next_report_due || null,
      next_report_name: funder?.next_report_name || null,
      in_funders_json: !!funder,
    });
  }

  // 5. Add funders.json entries that aren't in Xero (warm/cold)
  for (const [slug, funder] of Object.entries(funders)) {
    if (seenSlugs.has(slug)) continue;
    supporters.push({
      slug,
      name: funder.name,
      xero_contact_name: null,
      tier: classifyTier(0, 0, funder),
      stage: funder.stage,
      total_paid_aud: 0,
      outstanding_aud: 0,
      invoice_count: 0,
      paid_invoice_count: 0,
      outstanding_invoice_count: 0,
      first_invoice_date: null,
      last_invoice_date: null,
      oldest_open_date: null,
      outstanding_age_days: null,
      outstanding_alert: 'CLEAR',
      projects: funder.projects_funded || [],
      primary_contact: funder.primary_contact || null,
      primary_email: funder.primary_email || null,
      cc_email: funder.cc_email || null,
      last_communicated_at: funder.last_communicated_at || null,
      days_since_last_contact: daysAgo(funder.last_communicated_at),
      themes: funder.themes || [],
      tone: funder.tone || null,
      framing_notes_excerpt: funder.framing_notes ? funder.framing_notes.slice(0, 240) + (funder.framing_notes.length > 240 ? '…' : '') : null,
      next_report_due: funder.next_report_due || null,
      next_report_name: funder.next_report_name || null,
      in_funders_json: true,
    });
  }

  // 6. Sort: by outstanding desc, then by total paid desc
  supporters.sort((a, b) => {
    if (b.outstanding_aud !== a.outstanding_aud) return b.outstanding_aud - a.outstanding_aud;
    return b.total_paid_aud - a.total_paid_aud;
  });

  // 7. Summary stats
  const tierCounts = {};
  let totalPaid = 0, totalOutstanding = 0;
  for (const s of supporters) {
    tierCounts[s.tier] = (tierCounts[s.tier] || 0) + 1;
    totalPaid += s.total_paid_aud;
    totalOutstanding += s.outstanding_aud;
  }
  console.log(`\n📊 Summary:`);
  console.log(`   Supporters total: ${supporters.length}`);
  for (const [tier, count] of Object.entries(tierCounts)) console.log(`     ${tier.padEnd(12)} ${count}`);
  console.log(`   Lifetime paid: AUD $${totalPaid.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`);
  console.log(`   Outstanding:   AUD $${totalOutstanding.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`);

  // 8. Write JSON snapshot
  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const snapshot = {
    generated_at: new Date().toISOString(),
    summary: {
      supporter_count: supporters.length,
      tier_counts: tierCounts,
      total_paid_aud: Math.round(totalPaid * 100) / 100,
      total_outstanding_aud: Math.round(totalOutstanding * 100) / 100,
    },
    supporters,
  };
  writeFileSync(`${REPORT_DIR}/supporters-intelligence-latest.json`, JSON.stringify(snapshot, null, 2));
  writeFileSync(`${REPORT_DIR}/supporters-intelligence-${today}.json`, JSON.stringify(snapshot, null, 2));
  console.log(`\n✓ Wrote ${REPORT_DIR}/supporters-intelligence-latest.json`);

  // 9. Upsert into supporters_intelligence Supabase table
  const { error: upsertErr } = await supabase
    .from('supporters_intelligence')
    .upsert(supporters, { onConflict: 'slug' });
  if (upsertErr) {
    console.warn(`⚠ Supabase upsert failed (likely table doesn't exist yet — run migration first): ${upsertErr.message}`);
  } else {
    console.log(`✓ Upserted ${supporters.length} supporters to Supabase supporters_intelligence`);
  }
}

main().catch((e) => {
  console.error('Build failed:', e);
  process.exit(1);
});

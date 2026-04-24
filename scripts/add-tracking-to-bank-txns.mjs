#!/usr/bin/env node
/**
 * Add Project Tracking to unreconciled SPEND bank transactions via Xero API.
 *
 * 956 of 1022 SPEND txns on NAB Visa 8815 are missing Project Tracking,
 * meaning project-level reporting is blind to ~93% of card spend. This
 * looks up each vendor in vendor_project_rules and applies the right
 * Business Division + Project Tracking to the LineItems.
 *
 * Post-lock only (date >= 2025-10-01).
 *
 * Usage:
 *   node scripts/add-tracking-to-bank-txns.mjs --dry-run --limit 20
 *   node scripts/add-tracking-to-bank-txns.mjs --limit 50
 *   node scripts/add-tracking-to-bank-txns.mjs                  # full run
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
const TOKEN_FILE = '.xero-tokens.json';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limIdx = args.indexOf('--limit');
const LIMIT = limIdx !== -1 ? parseInt(args[limIdx + 1], 10) : 1000;
const MIN_DATE = '2025-10-01'; // respect BAS lock

const TRACK_BD = '91448ff3-eb13-437a-9d97-4d2e52c86ca4';
const TRACK_PT = '1a1ad7c5-249a-4b1f-842d-06ba2a63a0fe';
const PROJECT_TRACKING_NAME = {
  'ACT-10': 'ACT-10 — 10x10 Retreat', 'ACT-BB': 'ACT-BB — Barkly Backbone',
  'ACT-BG': 'ACT-BG — BG Fit', 'ACT-BM': 'ACT-BM — Bimberi',
  'ACT-BR': 'ACT-BR — ACT Bali Retreat', 'ACT-BV': 'ACT-BV — Black Cockatoo Valley',
  'ACT-CA': 'ACT-CA — Caring for those who care', 'ACT-CB': 'ACT-CB — Marriage Celebrant',
  'ACT-CF': 'ACT-CF — The Confessional', 'ACT-CN': 'ACT-CN — Contained',
  'ACT-DG': 'ACT-DG — Diagrama', 'ACT-DL': 'ACT-DL — DadLab',
  'ACT-DO': 'ACT-DO — Designing for Obsolescence', 'ACT-EL': 'ACT-EL — Empathy Ledger',
  'ACT-ER': 'ACT-ER — PICC Elders Room', 'ACT-FA': 'ACT-FA — Festival Activations',
  'ACT-FG': 'ACT-FG — Feel Good Project', 'ACT-FM': 'ACT-FM — The Farm',
  'ACT-FO': 'ACT-FO — Fishers Oysters', 'ACT-FP': 'ACT-FP — Fairfax PLACE Tech',
  'ACT-GD': 'ACT-GD — Goods', 'ACT-GL': 'ACT-GL — Global Laundry Alliance',
  'ACT-GP': 'ACT-GP — Gold Phone', 'ACT-HS': 'ACT-HS — Project Her-Self',
  'ACT-HV': 'ACT-HV — The Harvest Witta', 'ACT-IN': 'ACT-IN — ACT Infrastructure',
  'ACT-JH': 'ACT-JH — JusticeHub', 'ACT-JP': "ACT-JP — June's Patch",
  'ACT-MC': 'ACT-MC — Cars and Microcontrollers', 'ACT-MD': 'ACT-MD — ACT Monthly Dinners',
  'ACT-MM': 'ACT-MM — MMEIC Justice', 'ACT-MR': 'ACT-MR — MingaMinga Rangers',
  'ACT-MY': 'ACT-MY — Mounty Yarns', 'ACT-OO': 'ACT-OO — Oonchiumpa',
  'ACT-PI': 'ACT-PI — PICC', 'ACT-PS': 'ACT-PS — PICC Photo Studio',
  'ACT-RA': 'ACT-RA — Regional Arts Fellowship', 'ACT-SM': 'ACT-SM — SMART',
  'ACT-SS': 'ACT-SS — Storm Stories', 'ACT-TN': 'ACT-TN — TOMNET',
  'ACT-TR': 'ACT-TR — Treacher', 'ACT-TW': "ACT-TW — Travelling Women's Car",
  'ACT-UA': 'ACT-UA — Uncle Allan Palm Island Art', 'ACT-WE': 'ACT-WE — Westpac Summit 2025',
};

const DELAY_MS = 1100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (msg) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);

function loadToken() {
  if (existsSync(TOKEN_FILE)) return JSON.parse(readFileSync(TOKEN_FILE, 'utf8')).access_token;
  return process.env.XERO_ACCESS_TOKEN;
}

function matchRule(rules, vendor) {
  if (!vendor) return null;
  const v = vendor.toLowerCase().trim();
  for (const r of rules) if ((r.vendor_name || '').toLowerCase() === v) return r;
  for (const r of rules) if (Array.isArray(r.aliases) && r.aliases.some((a) => (a || '').toLowerCase() === v)) return r;
  for (const r of rules) {
    const rv = (r.vendor_name || '').toLowerCase();
    if (rv && (v.includes(rv) || rv.includes(v))) return r;
  }
  return null;
}

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

async function main() {
  log(`Add tracking to SPEND bank txns${DRY_RUN ? ' (DRY RUN)' : ''} — limit=${LIMIT}\n`);

  const token = loadToken();
  if (!token) { log('No access token. Run: node scripts/sync-xero-tokens.mjs'); process.exit(1); }

  const { data: rules } = await sb.from('vendor_project_rules')
    .select('vendor_name, aliases, project_code, xero_business_division');
  log(`${rules.length} vendor rules loaded`);

  const txns = await q(`
    SELECT xero_transaction_id, date, contact_name, total, line_items
    FROM xero_transactions
    WHERE type = 'SPEND'
      AND bank_account = 'NAB Visa ACT #8815'
      AND date >= '${MIN_DATE}'
      AND (is_reconciled IS NOT TRUE)
      AND line_items::text NOT ILIKE '%Project Tracking%'
    ORDER BY total DESC
    LIMIT ${LIMIT}
  `);
  log(`${txns.length} SPEND txns missing Project Tracking\n`);

  let updated = 0, skipped = 0, failed = 0, noRule = 0;

  for (const t of txns) {
    const tag = `${t.date.slice(0, 10)} ${(t.contact_name || '?').slice(0, 26).padEnd(26)} $${Number(t.total).toFixed(2).padStart(9)}`;
    const rule = matchRule(rules, t.contact_name);
    if (!rule || !rule.project_code) {
      log(`${tag}  — no rule`);
      noRule++;
      continue;
    }
    const projName = PROJECT_TRACKING_NAME[rule.project_code];
    if (!projName) { log(`${tag}  — unknown project ${rule.project_code}`); skipped++; continue; }
    const bd = rule.xero_business_division || 'A Curious Tractor';

    // Fetch current transaction
    if (DRY_RUN) {
      log(`${tag}  → ${rule.project_code} + ${bd} (dry)`);
      updated++;
      continue;
    }

    const getRes = await fetch(`https://api.xero.com/api.xro/2.0/BankTransactions/${t.xero_transaction_id}`, {
      headers: { Authorization: `Bearer ${token}`, 'xero-tenant-id': XERO_TENANT_ID, Accept: 'application/json' },
    });
    if (!getRes.ok) {
      if (getRes.status === 401) { log('  401 — token expired. Run sync-xero-tokens.mjs first.'); process.exit(1); }
      log(`${tag}  GET failed ${getRes.status}`);
      failed++; await sleep(DELAY_MS); continue;
    }
    const getData = await getRes.json();
    const txn = getData.BankTransactions?.[0];
    if (!txn?.LineItems?.[0]) { skipped++; await sleep(DELAY_MS); continue; }

    // Update each LineItem with tracking
    const updatedLines = txn.LineItems.map((li) => {
      const existing = li.Tracking || [];
      const hasBD = existing.some((e) => e.TrackingCategoryID === TRACK_BD);
      const hasPT = existing.some((e) => e.TrackingCategoryID === TRACK_PT);
      const newTracking = [...existing];
      if (!hasBD) newTracking.push({ TrackingCategoryID: TRACK_BD, Name: 'Business Divisions', Option: bd });
      if (!hasPT) newTracking.push({ TrackingCategoryID: TRACK_PT, Name: 'Project Tracking', Option: projName });
      return {
        LineItemID: li.LineItemID,
        Description: li.Description,
        Quantity: li.Quantity,
        UnitAmount: li.UnitAmount,
        AccountCode: li.AccountCode,
        TaxType: li.TaxType,
        Tracking: newTracking,
      };
    });

    const body = {
      BankTransactions: [{
        BankTransactionID: t.xero_transaction_id,
        LineItems: updatedLines,
      }],
    };

    const postRes = await fetch(`https://api.xero.com/api.xro/2.0/BankTransactions/${t.xero_transaction_id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'xero-tenant-id': XERO_TENANT_ID,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!postRes.ok) {
      const err = await postRes.text();
      log(`${tag}  FAILED ${postRes.status}: ${err.slice(0, 3000)}`);
      failed++;
    } else {
      log(`${tag}  ✓ → ${rule.project_code}`);
      updated++;
    }
    await sleep(DELAY_MS);
  }

  log(`\nDone. Updated: ${updated} | No rule: ${noRule} | Skipped: ${skipped} | Failed: ${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

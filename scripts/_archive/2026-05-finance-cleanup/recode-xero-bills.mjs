#!/usr/bin/env node
/**
 * Recode existing Xero draft/approved bills with correct vendor rule coding.
 *
 * Some bills were pushed before vendor rules were wired up, so they have
 * placeholder account code 429 + INPUT tax + no project tracking.
 * This script finds each, looks up the matching vendor rule, and updates
 * the bill's line items in place via Xero API.
 *
 * Usage:
 *   node scripts/recode-xero-bills.mjs --dry-run
 *   node scripts/recode-xero-bills.mjs --limit 10
 *   node scripts/recode-xero-bills.mjs            # full run
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
const TOKEN_FILE = '.xero-tokens.json';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limIdx = args.indexOf('--limit');
const LIMIT = limIdx !== -1 ? parseInt(args[limIdx + 1], 10) : 500;

// Copied from push-receipts-to-xero.mjs
const TRACK_BD = '91448ff3-eb13-437a-9d97-4d2e52c86ca4';
const TRACK_PT = '1a1ad7c5-249a-4b1f-842d-06ba2a63a0fe';
const PROJECT_TRACKING_NAME = {
  'ACT-10': 'ACT-10 — 10x10 Retreat',
  'ACT-BB': 'ACT-BB — Barkly Backbone',
  'ACT-BG': 'ACT-BG — BG Fit',
  'ACT-BM': 'ACT-BM — Bimberi',
  'ACT-BR': 'ACT-BR — ACT Bali Retreat',
  'ACT-BV': 'ACT-BV — Black Cockatoo Valley',
  'ACT-CA': 'ACT-CA — Caring for those who care',
  'ACT-CB': 'ACT-CB — Marriage Celebrant',
  'ACT-CF': 'ACT-CF — The Confessional',
  'ACT-CN': 'ACT-CN — Contained',
  'ACT-DG': 'ACT-DG — Diagrama',
  'ACT-DL': 'ACT-DL — DadLab',
  'ACT-DO': 'ACT-DO — Designing for Obsolescence',
  'ACT-EL': 'ACT-EL — Empathy Ledger',
  'ACT-ER': 'ACT-ER — PICC Elders Room',
  'ACT-FA': 'ACT-FA — Festival Activations',
  'ACT-FG': 'ACT-FG — Feel Good Project',
  'ACT-FM': 'ACT-FM — The Farm',
  'ACT-FO': 'ACT-FO — Fishers Oysters',
  'ACT-FP': 'ACT-FP — Fairfax PLACE Tech',
  'ACT-GD': 'ACT-GD — Goods',
  'ACT-GL': 'ACT-GL — Global Laundry Alliance',
  'ACT-GP': 'ACT-GP — Gold Phone',
  'ACT-HS': 'ACT-HS — Project Her-Self',
  'ACT-HV': 'ACT-HV — The Harvest Witta',
  'ACT-IN': 'ACT-IN — ACT Infrastructure',
  'ACT-JH': 'ACT-JH — JusticeHub',
  'ACT-JP': "ACT-JP — June's Patch",
  'ACT-MC': 'ACT-MC — Cars and Microcontrollers',
  'ACT-MD': 'ACT-MD — ACT Monthly Dinners',
  'ACT-MM': 'ACT-MM — MMEIC Justice',
  'ACT-MR': 'ACT-MR — MingaMinga Rangers',
  'ACT-MY': 'ACT-MY — Mounty Yarns',
  'ACT-OO': 'ACT-OO — Oonchiumpa',
  'ACT-PI': 'ACT-PI — PICC',
  'ACT-PS': 'ACT-PS — PICC Photo Studio',
  'ACT-RA': 'ACT-RA — Regional Arts Fellowship',
  'ACT-SM': 'ACT-SM — SMART',
  'ACT-SS': 'ACT-SS — Storm Stories',
  'ACT-TN': 'ACT-TN — TOMNET',
  'ACT-TR': 'ACT-TR — Treacher',
  'ACT-TW': "ACT-TW — Travelling Women's Car",
  'ACT-UA': 'ACT-UA — Uncle Allan Palm Island Art',
  'ACT-WE': 'ACT-WE — Westpac Summit 2025',
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

async function main() {
  log(`Recode Xero Bills${DRY_RUN ? ' (DRY RUN)' : ''} — limit=${LIMIT}\n`);

  const token = loadToken();
  if (!token) {
    log('No access token. Run: node scripts/sync-xero-tokens.mjs or xero-auth.mjs');
    process.exit(1);
  }

  const { data: rules } = await sb.from('vendor_project_rules')
    .select('vendor_name, aliases, project_code, category, xero_account_code, xero_tax_type, xero_currency, xero_business_division');
  log(`${rules.length} vendor rules loaded`);

  const { data: receipts } = await sb.rpc('exec_sql', {
    query: `
      SELECT id, vendor_name, amount_detected, received_at, xero_invoice_id, source, dext_item_id
      FROM receipt_emails
      WHERE xero_invoice_id IS NOT NULL
        AND updated_at::date = CURRENT_DATE
        AND updated_at < '2026-04-22 07:00:00+00'
        AND received_at >= '2025-10-01'
      ORDER BY received_at DESC
      LIMIT ${LIMIT}
    `,
  });
  log(`${receipts.length} bills to check\n`);

  let updated = 0, skipped = 0, failed = 0, unchanged = 0;

  for (const r of receipts) {
    const tag = `${r.received_at.slice(0, 10)} ${(r.vendor_name || '?').slice(0, 25).padEnd(25)} $${Number(r.amount_detected).toFixed(2).padStart(9)}`;
    const rule = matchRule(rules, r.vendor_name);
    if (!rule || !rule.xero_account_code) {
      log(`${tag}  SKIP — no matching vendor rule`);
      skipped++;
      continue;
    }

    // Fetch existing bill to see if it needs updating
    const getRes = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${r.xero_invoice_id}`, {
      headers: { Authorization: `Bearer ${token}`, 'xero-tenant-id': XERO_TENANT_ID, Accept: 'application/json' },
    });
    if (!getRes.ok) {
      log(`${tag}  FAILED GET: ${getRes.status}`);
      failed++;
      await sleep(DELAY_MS);
      continue;
    }
    const getData = await getRes.json();
    const bill = getData.Invoices?.[0];
    if (!bill) {
      log(`${tag}  SKIP — bill not found`);
      skipped++;
      await sleep(DELAY_MS);
      continue;
    }

    if (bill.Status === 'PAID' || bill.Status === 'VOIDED' || bill.Status === 'DELETED') {
      log(`${tag}  SKIP — bill status is ${bill.Status}`);
      skipped++;
      await sleep(DELAY_MS);
      continue;
    }

    const line = bill.LineItems?.[0];
    if (!line) { skipped++; await sleep(DELAY_MS); continue; }

    const currentAcct = line.AccountCode;
    const currentTax = line.TaxType;
    const hasTracking = (line.Tracking || []).length > 0;
    const needsRecode = currentAcct !== rule.xero_account_code
      || currentTax !== (rule.xero_tax_type || 'INPUT')
      || !hasTracking;

    if (!needsRecode) {
      log(`${tag}  already coded correctly`);
      unchanged++;
      await sleep(DELAY_MS);
      continue;
    }

    const projName = rule.project_code ? PROJECT_TRACKING_NAME[rule.project_code] : null;
    const tracking = [
      { TrackingCategoryID: TRACK_BD, Name: 'Business Divisions', Option: rule.xero_business_division || 'A Curious Tractor' },
    ];
    if (projName) tracking.push({ TrackingCategoryID: TRACK_PT, Name: 'Project Tracking', Option: projName });

    const currencyNote = rule.xero_currency && rule.xero_currency !== 'AUD'
      ? ` [native ${rule.xero_currency} ${Number(r.amount_detected).toFixed(2)} — adjust AUD to match bank line]`
      : '';
    const newDescription = `${rule.vendor_name} — ${rule.category || 'Expense'}${rule.project_code ? ` — ${rule.project_code}` : ''}${currencyNote}`;

    // Xero update payload — only touch the line item fields we want to change
    const updatedLine = {
      LineItemID: line.LineItemID,
      Description: newDescription,
      Quantity: line.Quantity,
      UnitAmount: line.UnitAmount,
      AccountCode: rule.xero_account_code,
      TaxType: rule.xero_tax_type || 'INPUT',
      Tracking: tracking,
    };

    const body = {
      Invoices: [{
        InvoiceID: r.xero_invoice_id,
        LineItems: [updatedLine],
      }],
    };

    if (DRY_RUN) {
      log(`${tag}  UPDATE ${currentAcct || '(null)'}→${rule.xero_account_code}  ${currentTax || '(null)'}→${rule.xero_tax_type}  tracking=${tracking.length}`);
      updated++;
      continue;
    }

    const putRes = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${r.xero_invoice_id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'xero-tenant-id': XERO_TENANT_ID,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!putRes.ok) {
      const err = await putRes.text();
      log(`${tag}  FAILED: ${putRes.status} ${err.slice(0, 200)}`);
      failed++;
    } else {
      log(`${tag}  ✓ recoded to ${rule.xero_account_code} ${rule.xero_tax_type}${projName ? ' +project' : ''}`);
      updated++;
    }
    await sleep(DELAY_MS);
  }

  log(`\nDone. Updated: ${updated} | Unchanged: ${unchanged} | Skipped: ${skipped} | Failed: ${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

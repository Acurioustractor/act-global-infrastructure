#!/usr/bin/env node
/**
 * Push AI tracking suggestions to Xero (post-publish).
 *
 * Closes the loop opened by ai-route-dext-doc.mjs --apply: that script
 * writes project_code to xero_transactions.project_code in Supabase, but
 * the Xero record itself stays untracked — so R&D pack + project reports
 * miss the spend even after the AI accepted it.
 *
 * This script polls finance_ai_routing_suggestions for rows where:
 *   - source_table = 'xero_transactions'
 *   - applied_to_source = true (the grader accepted + propagated)
 *   - applied_to_xero_at IS NULL (we haven't pushed yet)
 *   - confidence >= 0.85
 *   - rejected_at IS NULL, suggested_project_code NOT IN (ASK_USER, SL_REVIEW)
 *
 * For each row, fetches the Xero BankTransaction, appends Business Division
 * + Project Tracking to every LineItem (idempotent — skips if Project
 * Tracking already present), POSTs the update, marks applied_to_xero_at on
 * success or applied_to_xero_error on failure.
 *
 * Cron: every 30 min Mon-Fri 8am-6pm AEST via PM2 (ecosystem.config.cjs).
 *
 * Usage:
 *   node scripts/push-ai-tracking-to-xero.mjs --dry-run --limit 5
 *   node scripts/push-ai-tracking-to-xero.mjs --limit 50
 *   node scripts/push-ai-tracking-to-xero.mjs                  # full run, default limit 100
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
const TOKEN_FILE = '.xero-tokens.json';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase URL / service role env vars.');
  process.exit(1);
}
if (!XERO_TENANT_ID) {
  console.error('Missing XERO_TENANT_ID env var.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limIdx = args.indexOf('--limit');
const LIMIT = limIdx !== -1 ? parseInt(args[limIdx + 1], 10) : 100;
const MIN_CONFIDENCE = (() => {
  const i = args.indexOf('--min-confidence');
  return i !== -1 ? parseFloat(args[i + 1]) : 0.85;
})();

// Tracking category IDs — same as scripts/add-tracking-to-bank-txns.mjs
const TRACK_BD = '91448ff3-eb13-437a-9d97-4d2e52c86ca4';
const TRACK_PT = '1a1ad7c5-249a-4b1f-842d-06ba2a63a0fe';

// ACT-XX → full Xero option name. Source of truth: scripts/add-tracking-to-bank-txns.mjs.
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

const DELAY_MS = 1100; // Xero rate limit: 60 req/min per tenant
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (msg) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);

function loadToken() {
  if (existsSync(TOKEN_FILE)) return JSON.parse(readFileSync(TOKEN_FILE, 'utf8')).access_token;
  return process.env.XERO_ACCESS_TOKEN;
}

async function getVendorBusinessDivision(vendorName) {
  if (!vendorName) return null;
  const v = vendorName.toLowerCase().trim();
  const { data } = await sb
    .from('vendor_project_rules')
    .select('vendor_name, aliases, xero_business_division');
  if (!data) return null;
  for (const r of data) if ((r.vendor_name || '').toLowerCase() === v) return r.xero_business_division;
  for (const r of data) {
    if (Array.isArray(r.aliases) && r.aliases.some((a) => (a || '').toLowerCase() === v)) {
      return r.xero_business_division;
    }
  }
  for (const r of data) {
    const rv = (r.vendor_name || '').toLowerCase();
    if (rv && (v.includes(rv) || rv.includes(v))) return r.xero_business_division;
  }
  return null;
}

async function markApplied(id, errorMsg = null) {
  const update = errorMsg
    ? { applied_to_xero_error: errorMsg }
    : { applied_to_xero_at: new Date().toISOString(), applied_to_xero_error: null };
  await sb.from('finance_ai_routing_suggestions').update(update).eq('id', id);
}

async function main() {
  log(`Push AI tracking to Xero${DRY_RUN ? ' (DRY RUN)' : ''} — limit=${LIMIT} min-conf=${MIN_CONFIDENCE}\n`);

  const token = loadToken();
  if (!token) {
    log('No Xero access token. Run: node scripts/sync-xero-tokens.mjs');
    process.exit(1);
  }

  const { data: suggestions, error } = await sb
    .from('finance_ai_routing_suggestions')
    .select('id, source_record_id, suggested_project_code, confidence, vendor_name, amount, txn_date')
    .eq('source_table', 'xero_transactions')
    .eq('applied_to_source', true)
    .is('applied_to_xero_at', null)
    .is('rejected_at', null)
    .gte('confidence', MIN_CONFIDENCE)
    .not('suggested_project_code', 'in', '(ASK_USER,SL_REVIEW)')
    .order('confidence', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  if (error) {
    log(`Query failed: ${error.message}`);
    process.exit(1);
  }
  if (!suggestions.length) {
    log('Nothing to push.');
    return;
  }

  log(`${suggestions.length} suggestions to push\n`);
  let updated = 0, skipped = 0, failed = 0;

  for (const s of suggestions) {
    const dateStr = s.txn_date?.slice(0, 10) || '????-??-??';
    const vendorStr = (s.vendor_name || '?').slice(0, 26).padEnd(26);
    const amtStr = `$${Number(s.amount || 0).toFixed(2).padStart(9)}`;
    const tag = `${dateStr} ${vendorStr} ${amtStr}`;

    const projName = PROJECT_TRACKING_NAME[s.suggested_project_code];
    if (!projName) {
      log(`${tag}  — unknown project code ${s.suggested_project_code}`);
      await markApplied(s.id, `unknown_project_code:${s.suggested_project_code}`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      log(`${tag}  → ${s.suggested_project_code} (dry)`);
      updated++;
      continue;
    }

    // GET current txn
    const getRes = await fetch(`https://api.xero.com/api.xro/2.0/BankTransactions/${s.source_record_id}`, {
      headers: { Authorization: `Bearer ${token}`, 'xero-tenant-id': XERO_TENANT_ID, Accept: 'application/json' },
    });
    if (!getRes.ok) {
      if (getRes.status === 401) {
        log('  401 — token expired. Run sync-xero-tokens.mjs first.');
        process.exit(1);
      }
      log(`${tag}  GET ${getRes.status}`);
      await markApplied(s.id, `GET_${getRes.status}`);
      failed++;
      await sleep(DELAY_MS);
      continue;
    }
    const txn = (await getRes.json()).BankTransactions?.[0];
    if (!txn?.LineItems?.[0]) {
      log(`${tag}  — txn or LineItems missing`);
      await markApplied(s.id, 'missing_line_items');
      skipped++;
      await sleep(DELAY_MS);
      continue;
    }

    // Idempotent: skip if Project Tracking already present on every line
    const alreadyTracked = txn.LineItems.every((li) =>
      (li.Tracking || []).some((t) => t.TrackingCategoryID === TRACK_PT)
    );
    if (alreadyTracked) {
      log(`${tag}  — already tracked, marking applied`);
      await markApplied(s.id);
      skipped++;
      continue;
    }

    const bd = (await getVendorBusinessDivision(txn.Contact?.Name || s.vendor_name)) || 'A Curious Tractor';

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
        BankTransactionID: s.source_record_id,
        LineItems: updatedLines,
      }],
    };

    const postRes = await fetch(`https://api.xero.com/api.xro/2.0/BankTransactions/${s.source_record_id}`, {
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
      const errText = await postRes.text();
      log(`${tag}  FAILED ${postRes.status}: ${errText.slice(0, 200)}`);
      await markApplied(s.id, `POST_${postRes.status}:${errText.slice(0, 500)}`);
      failed++;
    } else {
      log(`${tag}  ✓ → ${s.suggested_project_code} (${(s.confidence * 100).toFixed(0)}%)`);
      await markApplied(s.id);
      updated++;
    }
    await sleep(DELAY_MS);
  }

  log(`\nDone. Updated: ${updated} | Skipped: ${skipped} | Failed: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Match Dext Receipts to Xero Transactions
 *
 * Fuzzy-matches dext_receipts to xero_transactions by:
 *   1. Vendor name similarity (case-insensitive, partial match)
 *   2. Date proximity (within 7 days)
 *   3. Uses vendor_project_rules aliases for better matching
 *
 * Usage:
 *   node scripts/match-dext-to-xero.mjs              # Dry run
 *   node scripts/match-dext-to-xero.mjs --apply       # Write matches to DB
 *   node scripts/match-dext-to-xero.mjs --verbose      # Show match details
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const VERBOSE = args.includes('--verbose');

// Simple string similarity (Dice coefficient on bigrams)
function similarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;

  const bigramsA = new Set();
  const bigramsB = new Set();
  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));
  for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

// Check if names match via contains or alias
function vendorMatch(dextVendor, xeroContact, aliasMap) {
  if (!dextVendor || !xeroContact) return 0;

  const dLower = dextVendor.toLowerCase();
  const xLower = xeroContact.toLowerCase();

  // Exact match
  if (dLower === xLower) return 1;

  // Contains match (either direction)
  if (dLower.includes(xLower) || xLower.includes(dLower)) return 0.9;

  // Alias match — check if xero contact matches any alias of dext vendor
  const aliases = aliasMap.get(dLower) || [];
  for (const alias of aliases) {
    if (alias === xLower || xLower.includes(alias) || alias.includes(xLower)) return 0.85;
  }

  // Dice similarity
  const sim = similarity(dextVendor, xeroContact);
  return sim >= 0.5 ? sim : 0;
}

// Date proximity score (1.0 = same day, 0 = >7 days)
function dateScore(dextDate, xeroDate) {
  if (!dextDate || !xeroDate) return 0;
  const d1 = new Date(dextDate);
  const d2 = new Date(xeroDate);
  const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
  if (diffDays === 0) return 1;
  if (diffDays <= 1) return 0.95;
  if (diffDays <= 3) return 0.8;
  if (diffDays <= 7) return 0.6;
  if (diffDays <= 14) return 0.3;
  return 0;
}

async function main() {
  console.log('=== Match Dext Receipts → Xero Transactions ===');
  if (!APPLY) console.log('DRY RUN — use --apply to write matches\n');

  // Load unmatched dext receipts
  const { data: receipts, error: rErr } = await supabase
    .from('dext_receipts')
    .select('*')
    .is('xero_transaction_id', null)
    .not('vendor_name', 'eq', 'Unknown Supplier');

  if (rErr) { console.error('Error loading receipts:', rErr.message); return; }
  console.log(`Unmatched receipts: ${receipts.length}`);

  // Load ALL xero transactions (SPEND/ACCPAY only, last 18 months)
  // Paginate to avoid Supabase 1000-row default limit
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 18);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const transactions = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('xero_transactions')
      .select('id, contact_name, total, date, type, has_attachments, project_code')
      .in('type', ['SPEND', 'ACCPAY', 'SPEND-TRANSFER'])
      .gte('date', cutoffStr)
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) { console.error('Error loading transactions:', error.message); return; }
    transactions.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    page++;
  }
  console.log(`Xero SPEND transactions: ${transactions.length} (${page + 1} pages)`);

  // Load vendor aliases from vendor_project_rules
  const { data: rules } = await supabase
    .from('vendor_project_rules')
    .select('vendor_name, aliases');

  const aliasMap = new Map();
  for (const rule of rules || []) {
    const key = rule.vendor_name.toLowerCase();
    const aliases = (rule.aliases || []).map(a => a.toLowerCase());
    aliasMap.set(key, aliases);
    // Also map aliases back to vendor name
    for (const alias of aliases) {
      if (!aliasMap.has(alias)) aliasMap.set(alias, [key, ...aliases]);
    }
  }
  console.log(`Vendor alias rules: ${rules?.length || 0}\n`);

  // Match each receipt
  const matches = [];
  const noMatch = [];

  for (const receipt of receipts) {
    let bestMatch = null;
    let bestScore = 0;

    for (const tx of transactions) {
      const vScore = vendorMatch(receipt.vendor_name, tx.contact_name, aliasMap);
      if (vScore === 0) continue;

      const dScore = dateScore(receipt.receipt_date, tx.date);
      if (dScore === 0) continue;

      // Combined score: vendor match weighted more (60% vendor, 40% date)
      const score = Math.round((vScore * 0.6 + dScore * 0.4) * 100);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = { tx, score, vScore, dScore };
      }
    }

    if (bestMatch && bestScore >= 50) {
      matches.push({
        receipt,
        match: bestMatch,
      });
      if (VERBOSE) {
        console.log(`✓ ${receipt.vendor_name} (${receipt.receipt_date}) → ${bestMatch.tx.contact_name} $${bestMatch.tx.total} (${bestMatch.tx.date}) [${bestScore}%]`);
      }
    } else {
      noMatch.push(receipt);
      if (VERBOSE) {
        console.log(`✗ ${receipt.vendor_name} (${receipt.receipt_date}) — no match${bestMatch ? ` (best: ${bestScore}%)` : ''}`);
      }
    }
  }

  // Results
  console.log('\n📊 Matching Results');
  console.log('─'.repeat(50));
  console.log(`Matched:    ${matches.length} (${Math.round(matches.length / receipts.length * 100)}%)`);
  console.log(`Unmatched:  ${noMatch.length}`);

  // Match quality distribution
  const high = matches.filter(m => m.match.score >= 80).length;
  const med = matches.filter(m => m.match.score >= 60 && m.match.score < 80).length;
  const low = matches.filter(m => m.match.score < 60).length;
  console.log(`\nConfidence: High(≥80): ${high} | Medium(60-79): ${med} | Low(50-59): ${low}`);

  // Top unmatched vendors
  if (noMatch.length > 0) {
    const vendorCounts = {};
    for (const r of noMatch) {
      vendorCounts[r.vendor_name] = (vendorCounts[r.vendor_name] || 0) + 1;
    }
    const topUnmatched = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log('\nTop unmatched vendors:');
    for (const [name, count] of topUnmatched) {
      console.log(`  ${String(count).padStart(3)}x ${name}`);
    }
  }

  // Apply matches to DB
  if (APPLY && matches.length > 0) {
    console.log(`\nApplying ${matches.length} matches...`);
    let applied = 0;

    for (const { receipt, match } of matches) {
      const { error } = await supabase
        .from('dext_receipts')
        .update({
          xero_transaction_id: match.tx.id,
          match_confidence: match.score,
          match_method: 'vendor_date',
          matched_at: new Date().toISOString(),
        })
        .eq('id', receipt.id);

      if (error) {
        console.error(`  Error matching ${receipt.vendor_name}:`, error.message);
      } else {
        applied++;
      }
    }
    console.log(`Applied: ${applied}/${matches.length}`);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Match Receipt Emails to Xero Transactions
 *
 * Two-pass matching:
 *   Pass 1: Fast heuristic scoring (vendor name + date + amount)
 *   Pass 2: AI scoring on ambiguous matches (40-80% confidence)
 *
 * Auto-resolves at >=80% confidence.
 * Queues <80% for human review.
 *
 * Usage:
 *   node scripts/match-receipts-to-xero.mjs              # Dry run
 *   node scripts/match-receipts-to-xero.mjs --apply       # Write matches
 *   node scripts/match-receipts-to-xero.mjs --verbose      # Show match details
 *   node scripts/match-receipts-to-xero.mjs --ai           # Enable AI scoring for ambiguous
 *   node scripts/match-receipts-to-xero.mjs --apply --ai   # Full pipeline
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const VERBOSE = args.includes('--verbose');
const USE_AI = args.includes('--ai');

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// ============================================================================
// MATCHING ENGINE
// ============================================================================

// Dice coefficient on bigrams
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

function vendorMatch(receiptVendor, xeroContact, aliasMap) {
  if (!receiptVendor || !xeroContact) return 0;

  const rLower = receiptVendor.toLowerCase();
  const xLower = xeroContact.toLowerCase();

  if (rLower === xLower) return 1;
  if (rLower.includes(xLower) || xLower.includes(rLower)) return 0.9;

  // Alias match
  const aliases = aliasMap.get(rLower) || [];
  for (const alias of aliases) {
    if (alias === xLower || xLower.includes(alias) || alias.includes(xLower)) return 0.85;
  }

  const sim = similarity(receiptVendor, xeroContact);
  return sim >= 0.5 ? sim : 0;
}

function dateScore(receiptDate, xeroDate) {
  if (!receiptDate || !xeroDate) return 0;
  const d1 = new Date(receiptDate);
  const d2 = new Date(xeroDate);
  const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
  if (diffDays === 0) return 1;
  if (diffDays <= 1) return 0.95;
  if (diffDays <= 3) return 0.8;
  if (diffDays <= 7) return 0.6;
  if (diffDays <= 14) return 0.4;
  if (diffDays <= 30) return 0.2;
  return 0;
}

function amountScore(receiptAmount, xeroAmount) {
  if (!receiptAmount || !xeroAmount) return 0;
  const r = Math.abs(parseFloat(receiptAmount));
  const x = Math.abs(parseFloat(xeroAmount));
  if (r === 0 || x === 0) return 0;

  const diff = Math.abs(r - x) / Math.max(r, x);
  if (diff === 0) return 1;       // Exact match
  if (diff <= 0.01) return 0.95;   // Within 1%
  if (diff <= 0.05) return 0.8;    // Within 5%
  if (diff <= 0.10) return 0.6;    // Within 10%
  if (diff <= 0.20) return 0.3;    // Within 20%
  return 0;
}

// ============================================================================
// VENDOR ALIASES
// ============================================================================

const MANUAL_ALIASES = {
  // Hardware & building
  'bunnings warehouse': ['bunnings'],
  'bunnings': ['bunnings warehouse'],
  'maleny hardware and rural supplies': ['maleny hardware'],
  'edmonds landscaping supplies': ['edmonds landscaping'],
  'carbatec brisbane': ['carbatec'],
  'stratco': ['stratco pty ltd'],
  'total tools east brisbane': ['total tools'],
  'total tools': ['total tools east brisbane'],
  'smartwood': ['smartwood timber'],

  // Transport
  'uber': ['uber eats', 'uber amsterdam', 'uber london', 'uber au', 'uber b.v.', 'uber bv'],
  'uber eats': ['uber'],
  'uber amsterdam': ['uber'],
  'uber london': ['uber'],
  'qantas': ['qantas airways', 'qantas airways limited'],
  'qantas airways': ['qantas'],
  'qantas group accommodation': ['qantas', 'qantas hotels'],
  'virgin australia': ['virgin australia airlines', 'virgin australia airlines pty ltd'],
  'virgin australia airlines': ['virgin australia'],
  'taxi receipt': ['taxi', '13cabs', 'silver top', 'black & white cabs'],
  'budget car and truck rental (nt)': ['budget'],
  'budget': ['budget car and truck rental', 'budget car and truck rental (nt)'],
  'greyhound australia': ['greyhound'],
  'greyhound': ['greyhound australia'],

  // Accommodation
  'airbnb': ['airbnb ireland', 'airbnb payments'],
  'sunshine glamping co': ['sunshine glamping'],

  // Hire & services
  'kennards hire': ['kennards'],
  'allclass': ['allclass engineering', 'allclass hire'],
  '1300 washer': ['1300washer'],
  'hatch electrical': ['hatch'],
  'container options': ['container options pty ltd'],
  'tnt plastering & maintenance': ['tnt plastering', 'tnt maintenance'],
  'the sand yard': ['sand yard'],
  'carla furnishers': ['carla'],

  // Tech & SaaS
  'apple pty ltd': ['apple', 'apple.com', 'apple pty limited'],
  'adobe systems software': ['adobe', 'adobe inc', 'adobe systems'],
  'openai': ['openai llc', 'openai inc', 'openai ireland'],
  'notion labs': ['notion'],
  'railway corporation': ['railway', 'railway.app'],
  'highlevel': ['gohighlevel', 'go high level'],
  'xero australia': ['xero'],
  'bitwarden': ['bitwarden inc'],

  // Insurance & utilities
  'aami': ['aami insurance', 'suncorp group'],
  'agl': ['agl energy', 'agl electricity'],

  // Organisations & partners
  'the funding network': ['funding network', 'tfn'],
  'telford smith engineering': ['telford smith'],
  'defy manufacturing': ['defy'],
  'oonchiumpa consultancy and services': ['oonchiumpa'],
  'rw pacific traders': ['rw pacific'],
  'the matnic trust': ['matnic trust', 'matnic'],
  'nicholas marchesi': ['nick marchesi'],

  // Storage
  'bionic self storage': ['bionic storage'],

  // Regional
  'sunshine coast council': ['sunshine coast regional council', 'scc'],
  'alibaba cloud (singapore) private': ['alibaba cloud'],

  // Food & hospitality
  'hermit park - good morning coffee': ['good morning coffee', 'hermit park'],
  "fisher's oysters": ['fishers oysters'],
  'liberty maleny': ['liberty'],

  // Uber/Rasier variants (Uber's legal entity names vary by country)
  'rasier pacific v.o.f.': ['uber', 'uber eats'],
  'rasier operations b.v.': ['uber', 'uber eats'],
  'rasier pacific': ['uber', 'uber eats'],

  // Payment processor aliases (receipts come from Stripe but Xero shows the vendor)
  'stripe': ['stripe payments', 'stripe inc'],

  // Travel extras
  'booking.com': ['booking.com b.v.', 'bookingcom'],
  'wotif': ['wotif.com', 'wotif group'],
  'expedia': ['expedia inc', 'expedia group'],
  'agoda': ['agoda international', 'agoda company'],

  // Telco
  'telstra': ['telstra corporation', 'telstra ltd'],
  'belong': ['belong mobile'],

  // Insurance
  'racq': ['racq insurance', 'racq operations'],

  // Energy
  'agl': ['agl energy', 'agl sales pty ltd', 'agl electricity'],
  'origin energy': ['origin', 'origin electricity'],
};

async function buildAliasMap() {
  const aliasMap = new Map();

  // Load from vendor_project_rules table
  const { data: rules } = await supabase
    .from('vendor_project_rules')
    .select('vendor_name, aliases');

  for (const rule of rules || []) {
    const key = rule.vendor_name.toLowerCase();
    const aliases = (rule.aliases || []).map(a => a.toLowerCase());
    aliasMap.set(key, aliases);
    for (const alias of aliases) {
      if (!aliasMap.has(alias)) aliasMap.set(alias, [key, ...aliases]);
    }
  }

  // Add manual aliases
  for (const [key, aliases] of Object.entries(MANUAL_ALIASES)) {
    const existing = aliasMap.get(key) || [];
    aliasMap.set(key, [...new Set([...existing, ...aliases])]);
  }

  return aliasMap;
}

// ============================================================================
// AI SCORING (optional, for ambiguous matches)
// ============================================================================

async function aiScore(receipt, transaction, heuristicScore) {
  if (!USE_AI) return heuristicScore;

  try {
    const { scoreMatchWithAI } = await import('./lib/receipt-ai-scorer.mjs');
    const result = await scoreMatchWithAI(
      {
        vendor_name: receipt.vendor_name,
        amount: receipt.amount_detected,
        transaction_date: receipt.received_at,
        category: '',
        description: receipt.subject || '',
      },
      {
        email_subject: receipt.subject,
        email_from: receipt.from_email,
        email_date: receipt.received_at,
        email_preview: receipt.subject || '',
        vendor_score: 0,
        amount_score: 0,
        date_score: 0,
        keyword_score: 0,
        total_score: heuristicScore,
      }
    );
    return result?.confidence || heuristicScore;
  } catch (err) {
    if (VERBOSE) log(`AI scoring failed: ${err.message}`);
    return heuristicScore;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log('=== Match Receipts → Xero Transactions ===');
  if (!APPLY) log('DRY RUN — use --apply to write matches');
  if (USE_AI) log('AI scoring enabled for ambiguous matches');
  console.log('');

  // Load unmatched receipt emails (via exec_sql to bypass PostgREST cache for new table)
  const { data: receipts, error: rErr } = await supabase.rpc('exec_sql', {
    query: `SELECT * FROM receipt_emails
            WHERE status IN ('captured', 'no_match', 'review')
            AND vendor_name IS NOT NULL
            ORDER BY received_at DESC`
  });

  if (rErr) { log(`ERROR loading receipts: ${rErr.message}`); return; }
  log(`Unmatched receipts: ${receipts.length}`);

  // Load Xero SPEND transactions (paginated past 1000-row limit)
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 18);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const transactions = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('xero_transactions')
      .select('id, xero_transaction_id, contact_name, total, date, type, has_attachments, project_code')
      .in('type', ['SPEND', 'ACCPAY', 'SPEND-TRANSFER'])
      .gte('date', cutoffStr)
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) { log(`ERROR loading transactions: ${error.message}`); return; }
    transactions.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    page++;
  }
  log(`Xero SPEND transactions: ${transactions.length}`);

  // Also load ACCPAY invoices (bills) — Dext receipts often correspond to bills, not bank transactions
  const invoices = [];
  page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('xero_invoices')
      .select('id, xero_id, contact_name, total, date, type, has_attachments')
      .eq('type', 'ACCPAY')
      .gte('date', cutoffStr)
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) { log(`WARN loading invoices: ${error.message}`); break; }
    // Normalize invoice shape to match transactions for scoring
    for (const inv of data || []) {
      invoices.push({
        id: inv.id,
        xero_transaction_id: inv.xero_id,  // For Attachments API
        contact_name: inv.contact_name,
        total: inv.total,
        date: inv.date,
        type: 'ACCPAY_INVOICE',
        has_attachments: inv.has_attachments,
        project_code: null,
        _is_invoice: true,
      });
    }
    if (!data || data.length < PAGE_SIZE) break;
    page++;
  }
  log(`Xero ACCPAY invoices (bills): ${invoices.length}`);

  // Combine both sources for matching
  const allTargets = [...transactions, ...invoices];
  log(`Total match targets: ${allTargets.length}`);

  const aliasMap = await buildAliasMap();
  log(`Vendor aliases: ${aliasMap.size} entries\n`);

  // Match each receipt
  const matches = [];
  const noMatch = [];
  const ambiguous = [];

  for (const receipt of receipts) {
    let bestMatch = null;
    let bestScore = 0;

    for (const tx of allTargets) {
      const vScore = vendorMatch(receipt.vendor_name, tx.contact_name, aliasMap);
      if (vScore === 0) continue;

      const dScore = dateScore(receipt.received_at, tx.date);
      if (dScore === 0) continue;

      const aScore = amountScore(receipt.amount_detected, tx.total);

      // Weighted scoring:
      // - With amount: vendor 40%, date 30%, amount 30%
      // - Without amount: vendor 55%, date 45%
      // - Strong vendor+date boost: if vendor >=0.85 AND date >=0.8, add 10% bonus
      let score;
      if (receipt.amount_detected && aScore > 0) {
        score = Math.round((vScore * 0.40 + dScore * 0.30 + aScore * 0.30) * 100);
      } else {
        score = Math.round((vScore * 0.55 + dScore * 0.45) * 100);
        // Boost when vendor is very confident and date is close — amount isn't always available
        if (vScore >= 0.85 && dScore >= 0.8) {
          score = Math.min(score + 10, 95);
        }
      }

      // Prefer transactions that already have the receipt (has_attachments = false)
      // Slight penalty for transactions that already have attachments
      if (tx.has_attachments) {
        score = Math.max(score - 5, 0);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = { tx, score, vScore, dScore, aScore };
      }
    }

    if (bestMatch && bestScore >= 80) {
      matches.push({ receipt, match: bestMatch });
      if (VERBOSE) log(`AUTO  ${(receipt.vendor_name || '?').padEnd(30)} → ${bestMatch.tx.contact_name} $${bestMatch.tx.total} [${bestScore}%]`);
    } else if (bestMatch && bestScore >= 40) {
      ambiguous.push({ receipt, match: bestMatch });
      if (VERBOSE) log(`AMBI  ${(receipt.vendor_name || '?').padEnd(30)} → ${bestMatch.tx.contact_name} $${bestMatch.tx.total} [${bestScore}%]`);
    } else {
      noMatch.push(receipt);
      if (VERBOSE) log(`NONE  ${(receipt.vendor_name || '?').padEnd(30)} ${bestMatch ? `(best: ${bestScore}%)` : ''}`);
    }
  }

  // Pass 2: AI scoring for ambiguous matches
  let aiPromoted = 0;
  if (USE_AI && ambiguous.length > 0) {
    log(`\nAI scoring ${ambiguous.length} ambiguous matches...`);
    for (const item of ambiguous) {
      const aiConfidence = await aiScore(item.receipt, item.match.tx, item.match.score);
      if (aiConfidence >= 80) {
        item.match.score = aiConfidence;
        item.match.method = 'auto_ai';
        matches.push(item);
        aiPromoted++;
      }
    }
    log(`AI promoted ${aiPromoted}/${ambiguous.length} to auto-match`);
  }

  // Results
  console.log('\n=== Matching Results ===');
  console.log(`  Auto-match (>=80%): ${matches.length}`);
  console.log(`  Ambiguous (40-79%): ${ambiguous.length - aiPromoted}`);
  console.log(`  No match:           ${noMatch.length}`);
  console.log(`  Total:              ${receipts.length}`);

  if (matches.length > 0) {
    const high = matches.filter(m => m.match.score >= 90).length;
    const med = matches.filter(m => m.match.score >= 80 && m.match.score < 90).length;
    console.log(`  Confidence: 90+: ${high} | 80-89: ${med}`);
  }

  // Top unmatched vendors
  if (noMatch.length > 0) {
    const vendorCounts = {};
    for (const r of noMatch) vendorCounts[r.vendor_name || '?'] = (vendorCounts[r.vendor_name || '?'] || 0) + 1;
    const topUnmatched = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log('\n  Top unmatched vendors:');
    for (const [name, count] of topUnmatched) {
      console.log(`    ${String(count).padStart(3)}x ${name}`);
    }
  }

  // Apply matches
  if (APPLY && matches.length > 0) {
    log(`\nApplying ${matches.length} matches...`);
    let applied = 0;

    for (const { receipt, match } of matches) {
      const isInvoice = match.tx._is_invoice;
      const updateParams = {
        receipt_id: receipt.id,
        new_status: 'matched',
        new_xero_transaction_id: isInvoice ? null : match.tx.id,
        new_xero_bank_transaction_id: isInvoice ? null : match.tx.xero_transaction_id,
        new_match_confidence: match.score,
        new_match_method: match.method || 'auto_heuristic',
        new_project_code: match.tx.project_code || null,
      };

      // For invoice matches, store the invoice ID separately
      if (isInvoice) {
        // Use direct update for invoice matches since RPC doesn't have xero_invoice_id param
        const { error: directErr } = await supabase
          .from('receipt_emails')
          .update({
            status: 'matched',
            xero_invoice_id: match.tx.xero_transaction_id,
            match_confidence: match.score,
            match_method: match.method || 'auto_heuristic',
          })
          .eq('id', receipt.id);
        if (directErr) {
          log(`  ERROR: ${receipt.vendor_name}: ${directErr.message}`);
        } else {
          applied++;
        }
        continue;
      }

      const { error } = await supabase.rpc('update_receipt_match', updateParams);

      if (error) {
        log(`  ERROR: ${receipt.vendor_name}: ${error.message}`);
      } else {
        applied++;
      }
    }
    log(`Applied: ${applied}/${matches.length}`);

    // Mark remaining ambiguous as 'review'
    const remainingAmbiguous = ambiguous.filter(a => a.match.score < 80);
    if (remainingAmbiguous.length > 0) {
      log(`Marking ${remainingAmbiguous.length} ambiguous as 'review'...`);
      for (const { receipt, match } of remainingAmbiguous) {
        await supabase.rpc('update_receipt_match', {
          receipt_id: receipt.id,
          new_status: 'review',
          new_match_confidence: match.score,
          new_match_method: 'needs_review',
        });
      }
    }
  }
}

if (!supabase) {
  console.error('Supabase credentials not configured');
  process.exit(1);
}

main().catch(err => {
  log(`Fatal: ${err.message}`);
  process.exit(1);
});

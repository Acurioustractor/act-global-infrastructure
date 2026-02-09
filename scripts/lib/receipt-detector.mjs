/**
 * Receipt Detector Module
 *
 * Detects missing receipts from Xero transactions and invoices.
 * Categorizes by vendor type (travel, subscriptions, other).
 *
 * Usage:
 *   import { detectMissingReceipts, categorizeVendor } from './lib/receipt-detector.mjs';
 *
 *   const missing = await detectMissingReceipts({ daysBack: 90 });
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Supabase client
const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VENDOR CATEGORIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Vendors that don't need receipts (bank fees, internal transfers, etc.)
const SKIP_VENDORS = [
  'nab fee', 'nab international fee', 'bank fee', 'eftpos fee', 'interest',
  'atm fee', 'account fee', 'monthly fee', 'service fee',
  'nicholas marchesi',  // Internal transfers
  '2up spending',       // Internal account
  'gopayid',            // Payment platform fees
];

const VENDOR_PATTERNS = {
  travel: [
    // Airlines
    'qantas', 'virgin', 'jetstar', 'rex', 'emirates', 'singapore airlines',
    'air new zealand', 'cathay', 'united', 'delta', 'american airlines',
    'british airways', 'lufthansa', 'kiwi.com', 'flight centre', 'webjet',
    // Accommodation
    'airbnb', 'booking.com', 'expedia', 'hotels.com', 'agoda', 'trivago',
    'marriott', 'hilton', 'accor', 'ihg', 'hyatt', 'hostelworld',
    'stayz', 'vrbo', 'wotif',
    // Transport
    'uber', 'lyft', 'ola', 'didi', 'grab', 'gocatch', '13cabs', 'shebah',
    'hertz', 'avis', 'budget', 'thrifty', 'europcar', 'enterprise',
    'car next door', 'goget', 'flexicar',
    // Rail & Bus
    'nsw trainlink', 'v/line', 'queensland rail', 'translink', 'metlink',
    'greyhound', 'firefly', 'premier', 'murrays',
    // Parking
    'wilson parking', 'secure parking', 'care park',
    // Travel insurance
    'cover-more', 'world nomads', 'allianz travel'
  ],

  subscriptions: [
    // Design & Creative
    'adobe', 'figma', 'canva', 'sketch', 'invision', 'miro', 'loom',
    'shutterstock', 'unsplash', 'envato', 'creative market',
    // Development & Cloud
    'aws', 'amazon web services', 'google cloud', 'gcp', 'azure', 'microsoft',
    'vercel', 'netlify', 'heroku', 'digitalocean', 'linode', 'cloudflare',
    'github', 'gitlab', 'bitbucket', 'atlassian', 'jira', 'confluence',
    'npm', 'docker', 'sentry', 'datadog', 'new relic',
    // Communication
    'slack', 'zoom', 'teams', 'discord', 'whereby', 'gather.town',
    'intercom', 'zendesk', 'freshdesk', 'twilio', 'sendgrid', 'mailchimp',
    'mailgun', 'postmark',
    // Productivity
    'notion', 'airtable', 'monday.com', 'asana', 'clickup', 'todoist',
    'dropbox', 'box', 'google workspace', 'office 365', '1password',
    'lastpass', 'dashlane', 'bitwarden', 'calendly', 'cal.com',
    // AI & Analytics
    'openai', 'anthropic', 'replicate', 'hugging face', 'cohere',
    'mixpanel', 'amplitude', 'heap', 'hotjar', 'fullstory', 'posthog',
    // Finance & Business
    'xero', 'quickbooks', 'stripe', 'paypal', 'gocardless', 'wise',
    'gusto', 'deel', 'remote.com', 'rippling',
    // Other SaaS
    'zapier', 'make', 'n8n', 'pipedream', 'supabase', 'firebase',
    'auth0', 'clerk', 'linear', 'descript', 'otter.ai', 'speechify'
  ]
};

/**
 * Check if a vendor should be skipped (bank fees, internal transfers, etc.)
 */
export function shouldSkipVendor(vendorName) {
  if (!vendorName) return false;
  const normalized = vendorName.toLowerCase().trim();
  return SKIP_VENDORS.some(pattern => normalized.includes(pattern));
}

/**
 * Categorize a vendor name
 */
export function categorizeVendor(vendorName) {
  if (!vendorName) return 'other';

  const normalized = vendorName.toLowerCase().trim();

  // Check travel patterns
  for (const pattern of VENDOR_PATTERNS.travel) {
    if (normalized.includes(pattern)) {
      return 'travel';
    }
  }

  // Check subscription patterns
  for (const pattern of VENDOR_PATTERNS.subscriptions) {
    if (normalized.includes(pattern)) {
      return 'subscription';
    }
  }

  return 'other';
}

/**
 * Get vendors that already have bills with receipts attached
 *
 * NOTE: This function is DEPRECATED and should NOT be used for skipping spend transactions.
 * Bills and spend transactions are separate in Xero - having a bill receipt doesn't mean
 * the spend transactions have receipts. Use only for reporting/analysis.
 */
async function getVendorsWithBillReceipts() {
  if (!supabase) return new Set();

  const { data: bills } = await supabase
    .from('xero_invoices')
    .select('contact_name')
    .eq('type', 'ACCPAY')
    .eq('has_attachments', true);

  return new Set((bills || []).map(b => b.contact_name?.toLowerCase()).filter(Boolean));
}

/**
 * Get the Monday of a given date's week
 */
export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Detect missing receipts from Xero data
 *
 * @param {Object} options
 * @param {number} options.daysBack - How many days back to check (default: 90)
 * @param {string[]} options.categories - Filter by categories (default: all)
 * @param {number} options.minAmount - Minimum amount to include (default: 0)
 * @param {boolean} options.excludeExisting - Skip items already in receipt_matches (default: true)
 * @returns {Promise<Object>} Missing receipts grouped by category
 */
export async function detectMissingReceipts(options = {}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const {
    daysBack = 90,
    categories = ['travel', 'subscription', 'other'],
    minAmount = 0,
    excludeExisting = true
  } = options;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const results = {
    transactions: [],
    invoices: [],
    byCategory: {
      travel: [],
      subscription: [],
      other: []
    },
    summary: {
      totalCount: 0,
      totalAmount: 0,
      byCategory: {}
    }
  };

  // Get existing receipt_matches to exclude
  let existingMatches = new Set();
  if (excludeExisting) {
    const { data: existing } = await supabase
      .from('receipt_matches')
      .select('source_type, source_id')
      .in('status', ['pending', 'email_suggested', 'resolved', 'no_receipt_needed']);

    if (existing) {
      existing.forEach(e => {
        existingMatches.add(`${e.source_type}:${e.source_id}`);
      });
    }
  }

  // Query transactions without attachments (SPEND only)
  // Use pagination to get all results (Supabase default limit is 1000)
  let allTransactions = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: transactions, error: txnError } = await supabase
      .from('xero_transactions')
      .select('*')
      .eq('type', 'SPEND')
      .eq('has_attachments', false)
      .gte('date', cutoffStr)
      .gte('total', minAmount)
      .order('date', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (txnError) {
      console.error('Error fetching transactions:', txnError.message);
      break;
    }

    if (!transactions || transactions.length === 0) break;

    allTransactions = allTransactions.concat(transactions);

    if (transactions.length < pageSize) break;
    page++;
  }

  const transactions = allTransactions;

  // NOTE: We no longer skip based on vendor having bill receipts.
  // That logic was flawed - bills and spend transactions are separate in Xero.

  const skippedStats = { bankFees: 0, alreadyTracked: 0 };

  if (transactions.length > 0) {
    for (const txn of transactions) {
      // Skip if already tracked
      if (existingMatches.has(`transaction:${txn.xero_transaction_id}`)) {
        skippedStats.alreadyTracked++;
        continue;
      }

      // Skip bank fees and internal transfers
      if (shouldSkipVendor(txn.contact_name)) {
        skippedStats.bankFees++;
        continue;
      }

      // NOTE: We do NOT skip based on vendor having bill receipts.
      // Bills and spend transactions are separate - a vendor can have bills with
      // receipts AND spend transactions without receipts. Each must be checked individually.

      const category = categorizeVendor(txn.contact_name);
      if (!categories.includes(category)) continue;

      const item = {
        source_type: 'transaction',
        source_id: txn.xero_transaction_id,
        vendor_name: txn.contact_name,
        amount: Math.abs(parseFloat(txn.total) || 0),
        transaction_date: txn.date,
        category,
        description: txn.line_items?.[0]?.description || null,
        bank_account: txn.bank_account,
        project_code: txn.project_code,
        week_start: getWeekStart(new Date(txn.date)).toISOString().split('T')[0]
      };

      results.transactions.push(item);
      results.byCategory[category].push(item);
    }
  }

  // Query invoices without attachments (ACCPAY = expenses/bills)
  const { data: invoices, error: invError } = await supabase
    .from('xero_invoices')
    .select('*')
    .eq('type', 'ACCPAY')
    .eq('has_attachments', false)
    .gte('date', cutoffStr)
    .gte('total', minAmount)
    .not('status', 'in', '("VOIDED","DELETED")')
    .order('date', { ascending: false });

  if (invError) {
    console.error('Error fetching invoices:', invError.message);
  } else if (invoices) {
    for (const inv of invoices) {
      // Skip if already tracked
      if (existingMatches.has(`invoice:${inv.xero_invoice_id}`)) {
        continue;
      }

      const category = categorizeVendor(inv.contact_name);
      if (!categories.includes(category)) continue;

      const item = {
        source_type: 'invoice',
        source_id: inv.xero_invoice_id,
        vendor_name: inv.contact_name,
        amount: Math.abs(parseFloat(inv.total) || 0),
        transaction_date: inv.date,
        category,
        description: inv.line_items?.[0]?.description || inv.reference || null,
        invoice_number: inv.invoice_number,
        project_code: inv.project_code,
        week_start: getWeekStart(new Date(inv.date)).toISOString().split('T')[0]
      };

      results.invoices.push(item);
      results.byCategory[category].push(item);
    }
  }

  // Calculate summary
  const allItems = [...results.transactions, ...results.invoices];
  results.summary.totalCount = allItems.length;
  results.summary.totalAmount = allItems.reduce((sum, item) => sum + item.amount, 0);
  results.summary.skipped = skippedStats;
  results.summary.totalScanned = transactions.length;

  for (const category of Object.keys(results.byCategory)) {
    const items = results.byCategory[category];
    results.summary.byCategory[category] = {
      count: items.length,
      amount: items.reduce((sum, item) => sum + item.amount, 0)
    };
  }

  return results;
}

/**
 * Save detected missing receipts to receipt_matches table
 *
 * @param {Object[]} items - Items from detectMissingReceipts
 * @returns {Promise<Object>} Save results
 */
export async function saveMissingReceipts(items) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const results = {
    inserted: 0,
    skipped: 0,
    errors: []
  };

  for (const item of items) {
    const record = {
      source_type: item.source_type,
      source_id: item.source_id,
      vendor_name: item.vendor_name,
      amount: item.amount,
      transaction_date: item.transaction_date,
      category: item.category,
      description: item.description,
      week_start: item.week_start,
      status: 'pending'
    };

    const { error } = await supabase
      .from('receipt_matches')
      .upsert(record, {
        onConflict: 'source_type,source_id',
        ignoreDuplicates: true
      });

    if (error) {
      if (error.code === '23505') {
        // Duplicate - already exists
        results.skipped++;
      } else {
        results.errors.push({
          source_id: item.source_id,
          error: error.message
        });
      }
    } else {
      results.inserted++;
    }
  }

  return results;
}

/**
 * Get pending receipts from database
 *
 * @param {Object} options
 * @param {string[]} options.statuses - Statuses to include
 * @param {string} options.category - Filter by category
 * @param {number} options.limit - Max results
 * @returns {Promise<Object[]>} Pending receipt matches
 */
export async function getPendingReceipts(options = {}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const {
    statuses = ['pending', 'email_suggested', 'deferred'],
    category,
    limit = 100
  } = options;

  let query = supabase
    .from('receipt_matches')
    .select('*')
    .in('status', statuses)
    .order('match_confidence', { ascending: false, nullsFirst: false })
    .order('transaction_date', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch pending receipts: ${error.message}`);
  }

  return data || [];
}

/**
 * Get receipt reconciliation stats
 *
 * @returns {Promise<Object>} Stats summary
 */
export async function getReconciliationStats() {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Get counts by status
  const { data: statusCounts, error: statusError } = await supabase
    .from('receipt_matches')
    .select('status')
    .then(result => {
      if (result.error) return result;
      const counts = {};
      (result.data || []).forEach(r => {
        counts[r.status] = (counts[r.status] || 0) + 1;
      });
      return { data: counts, error: null };
    });

  // Get amount totals by status
  const { data: allMatches } = await supabase
    .from('receipt_matches')
    .select('status, amount, category');

  const byStatus = {};
  const byCategory = {};

  (allMatches || []).forEach(m => {
    if (!byStatus[m.status]) {
      byStatus[m.status] = { count: 0, amount: 0 };
    }
    byStatus[m.status].count++;
    byStatus[m.status].amount += parseFloat(m.amount) || 0;

    if (!byCategory[m.category]) {
      byCategory[m.category] = { count: 0, amount: 0 };
    }
    byCategory[m.category].count++;
    byCategory[m.category].amount += parseFloat(m.amount) || 0;
  });

  // Get gamification stats
  const { data: gamification } = await supabase
    .from('user_gamification_stats')
    .select('*')
    .eq('user_id', 'act-finance')
    .single();

  return {
    byStatus,
    byCategory,
    gamification: gamification || null,
    pendingCount: (byStatus.pending?.count || 0) +
                  (byStatus.email_suggested?.count || 0) +
                  (byStatus.deferred?.count || 0),
    pendingAmount: (byStatus.pending?.amount || 0) +
                   (byStatus.email_suggested?.amount || 0) +
                   (byStatus.deferred?.amount || 0)
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || 'detect';

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Receipt Detector');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (command === 'detect') {
    const daysBack = parseInt(process.argv[3]) || 90;
    console.log(`Detecting missing receipts (last ${daysBack} days)...\n`);

    const results = await detectMissingReceipts({ daysBack });

    console.log('Summary:');
    console.log(`  Total missing: ${results.summary.totalCount}`);
    console.log(`  Total amount: $${results.summary.totalAmount.toFixed(2)}\n`);

    console.log('By Category:');
    for (const [cat, stats] of Object.entries(results.summary.byCategory)) {
      const emoji = cat === 'travel' ? '✈️' : cat === 'subscription' ? '💻' : '📦';
      console.log(`  ${emoji} ${cat}: ${stats.count} items, $${stats.amount.toFixed(2)}`);
    }

    console.log('\n--- Top 10 Missing Receipts ---\n');

    const allItems = [...results.transactions, ...results.invoices]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    allItems.forEach((item, i) => {
      const emoji = item.category === 'travel' ? '✈️' : item.category === 'subscription' ? '💻' : '📦';
      console.log(`${i + 1}. ${emoji} ${item.vendor_name || 'Unknown'}`);
      console.log(`   $${item.amount.toFixed(2)} | ${item.transaction_date} | ${item.source_type}`);
      if (item.description) {
        console.log(`   "${item.description.substring(0, 50)}${item.description.length > 50 ? '...' : ''}"`);
      }
      console.log('');
    });

  } else if (command === 'save') {
    const daysBack = parseInt(process.argv[3]) || 90;
    console.log(`Detecting and saving missing receipts (last ${daysBack} days)...\n`);

    const results = await detectMissingReceipts({ daysBack });
    const allItems = [...results.transactions, ...results.invoices];

    console.log(`Found ${allItems.length} missing receipts\n`);

    const saveResults = await saveMissingReceipts(allItems);

    console.log('Save Results:');
    console.log(`  Inserted: ${saveResults.inserted}`);
    console.log(`  Skipped (existing): ${saveResults.skipped}`);
    console.log(`  Errors: ${saveResults.errors.length}`);

    if (saveResults.errors.length > 0) {
      console.log('\nErrors:');
      saveResults.errors.slice(0, 5).forEach(e => {
        console.log(`  - ${e.source_id}: ${e.error}`);
      });
    }

  } else if (command === 'stats') {
    console.log('Fetching reconciliation stats...\n');

    const stats = await getReconciliationStats();

    console.log('By Status:');
    for (const [status, data] of Object.entries(stats.byStatus)) {
      console.log(`  ${status}: ${data.count} items, $${data.amount.toFixed(2)}`);
    }

    console.log('\nBy Category:');
    for (const [category, data] of Object.entries(stats.byCategory)) {
      const emoji = category === 'travel' ? '✈️' : category === 'subscription' ? '💻' : '📦';
      console.log(`  ${emoji} ${category}: ${data.count} items, $${data.amount.toFixed(2)}`);
    }

    console.log(`\nPending: ${stats.pendingCount} items, $${stats.pendingAmount.toFixed(2)}`);

    if (stats.gamification) {
      console.log('\nGamification:');
      console.log(`  Total Points: ${stats.gamification.total_points}`);
      console.log(`  Current Streak: ${stats.gamification.current_streak} weeks`);
      console.log(`  Receipts Resolved: ${stats.gamification.receipts_resolved}`);
    }

  } else {
    console.log('Usage:');
    console.log('  node scripts/lib/receipt-detector.mjs detect [days]  - Detect missing receipts');
    console.log('  node scripts/lib/receipt-detector.mjs save [days]    - Detect and save to database');
    console.log('  node scripts/lib/receipt-detector.mjs stats          - Show reconciliation stats');
  }
}

export default {
  categorizeVendor,
  getWeekStart,
  detectMissingReceipts,
  saveMissingReceipts,
  getPendingReceipts,
  getReconciliationStats
};

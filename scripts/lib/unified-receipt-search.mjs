/**
 * Unified Receipt Search Module
 *
 * Searches across all data sources to find potential receipts:
 * - Xero transactions (with/without attachments)
 * - Gmail emails (receipt-like keywords)
 * - Calendar events (travel context)
 * - Dext status (already uploaded)
 *
 * Usage:
 *   import { unifiedReceiptSearch, searchXeroTransactions } from './lib/unified-receipt-search.mjs';
 *
 *   const results = await unifiedReceiptSearch('Qantas January', { sources: ['xero', 'gmail'] });
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Supabase client
const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QUERY PARSING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Parse a natural language search query into structured components
 *
 * Examples:
 *   "Qantas $580 January" -> { vendor: "qantas", amount: 580, dateHints: ["january"] }
 *   "Adobe subscription" -> { vendor: "adobe", keywords: ["subscription"] }
 *   "flight to Brisbane" -> { keywords: ["flight", "brisbane"] }
 *
 * @param {string} query - Natural language search query
 * @returns {Object} Parsed query components
 */
export function parseSearchQuery(query) {
  const result = {
    vendor: null,
    amount: null,
    dateHints: [],
    keywords: [],
    raw: query
  };

  if (!query) return result;

  const normalized = query.toLowerCase().trim();

  // Extract amount patterns ($580, $1,234.56, AUD 500)
  const amountMatch = normalized.match(/\$?([\d,]+\.?\d{0,2})\s*(aud|usd)?/i);
  if (amountMatch) {
    result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  // Extract date hints (month names, year)
  const months = ['january', 'february', 'march', 'april', 'may', 'june',
                  'july', 'august', 'september', 'october', 'november', 'december',
                  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  for (const month of months) {
    if (normalized.includes(month)) {
      result.dateHints.push(month);
    }
  }

  // Extract year
  const yearMatch = normalized.match(/\b(202[0-9])\b/);
  if (yearMatch) {
    result.dateHints.push(yearMatch[1]);
  }

  // Extract vendor (first significant word that's not a number, month, or common word)
  const stopWords = ['the', 'for', 'from', 'with', 'and', 'receipt', 'invoice',
                     'payment', 'transaction', 'subscription', ...months];
  const words = normalized
    .replace(/\$[\d,.]+/g, '')  // Remove amounts
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.includes(w) && !/^\d+$/.test(w));

  if (words.length > 0) {
    result.vendor = words[0];
    result.keywords = words;
  }

  return result;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SOURCE SEARCHES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Search Xero transactions for potential receipts
 *
 * @param {Object} parsed - Parsed search query
 * @param {Object} dateRange - { from, to } date strings
 * @param {Object} amountRange - { min, max } amounts
 * @returns {Promise<Object[]>} Matching transactions
 */
export async function searchXeroTransactions(parsed, dateRange = {}, amountRange = {}) {
  if (!supabase) return [];

  let query = supabase
    .from('xero_transactions')
    .select('*')
    .eq('type', 'SPEND')
    .order('date', { ascending: false })
    .limit(50);

  // Apply date range
  if (dateRange.from) {
    query = query.gte('date', dateRange.from);
  }
  if (dateRange.to) {
    query = query.lte('date', dateRange.to);
  }

  // Apply amount range
  if (amountRange.min !== undefined) {
    query = query.gte('total', amountRange.min);
  }
  if (amountRange.max !== undefined) {
    query = query.lte('total', amountRange.max);
  }

  // Vendor search (if provided)
  if (parsed.vendor) {
    query = query.ilike('contact_name', `%${parsed.vendor}%`);
  }

  const { data: transactions, error } = await query;

  if (error) {
    console.error('Xero search error:', error.message);
    return [];
  }

  return (transactions || []).map(tx => ({
    source: 'xero',
    type: 'transaction',
    id: tx.xero_transaction_id,
    vendor: tx.contact_name,
    amount: Math.abs(parseFloat(tx.total) || 0),
    date: tx.date,
    description: tx.line_items?.[0]?.description || null,
    has_attachment: tx.has_attachments,
    bank_account: tx.bank_account,
    relevance_score: calculateXeroRelevance(tx, parsed)
  }));
}

/**
 * Search Gmail emails for receipts
 *
 * @param {Object} parsed - Parsed search query
 * @param {Object} dateRange - { from, to } date strings
 * @returns {Promise<Object[]>} Matching emails
 */
export async function searchGmailForReceipts(parsed, dateRange = {}) {
  if (!supabase) return [];

  let query = supabase
    .from('communications_history')
    .select('*')
    .eq('channel', 'email')
    .order('occurred_at', { ascending: false })
    .limit(100);

  // Apply date range
  if (dateRange.from) {
    query = query.gte('occurred_at', dateRange.from);
  }
  if (dateRange.to) {
    query = query.lte('occurred_at', dateRange.to);
  }

  const { data: emails, error } = await query;

  if (error) {
    console.error('Gmail search error:', error.message);
    return [];
  }

  // Filter and score emails
  const receiptKeywords = ['receipt', 'invoice', 'confirmation', 'booking', 'payment',
                          'order', 'purchase', 'itinerary', 'e-ticket', 'voucher'];

  return (emails || [])
    .map(email => {
      const subjectLower = (email.subject || '').toLowerCase();
      const contentLower = (email.content_preview || '').toLowerCase();
      const searchText = `${subjectLower} ${contentLower}`;

      // Must have receipt-like keywords
      const hasReceiptKeyword = receiptKeywords.some(k => searchText.includes(k));
      if (!hasReceiptKeyword) return null;

      // Check vendor match
      const vendorMatch = parsed.vendor && searchText.includes(parsed.vendor);

      return {
        source: 'gmail',
        type: 'email',
        id: email.id,
        subject: email.subject,
        from: email.source_id,
        date: email.occurred_at,
        snippet: email.content_preview?.substring(0, 150),
        has_attachment: email.has_attachments || false,
        relevance_score: calculateEmailRelevance(email, parsed, vendorMatch)
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, 30);
}

/**
 * Search calendar events for travel context
 *
 * @param {Object} parsed - Parsed search query
 * @param {Object} dateRange - { from, to } date strings
 * @returns {Promise<Object[]>} Matching calendar events
 */
export async function searchCalendarEvents(parsed, dateRange = {}) {
  if (!supabase) return [];

  let query = supabase
    .from('calendar_events')
    .select('*')
    .order('start_time', { ascending: false })
    .limit(50);

  // Apply date range
  if (dateRange.from) {
    query = query.gte('start_time', dateRange.from);
  }
  if (dateRange.to) {
    query = query.lte('start_time', dateRange.to);
  }

  const { data: events, error } = await query;

  if (error) {
    console.error('Calendar search error:', error.message);
    return [];
  }

  // Filter for travel-related events
  const travelKeywords = ['flight', 'fly', 'travel', 'trip', 'hotel', 'accommodation',
                         'conference', 'meeting', 'airport', 'train', 'uber'];

  return (events || [])
    .map(event => {
      const titleLower = (event.title || '').toLowerCase();
      const descLower = (event.description || '').toLowerCase();
      const searchText = `${titleLower} ${descLower}`;

      // Check for travel keywords or vendor match
      const isTravelRelated = travelKeywords.some(k => searchText.includes(k));
      const vendorMatch = parsed.vendor && searchText.includes(parsed.vendor);

      if (!isTravelRelated && !vendorMatch) return null;

      return {
        source: 'calendar',
        type: 'event',
        id: event.id,
        title: event.title,
        date: event.start_time,
        end_date: event.end_time,
        location: event.location,
        relevance_score: calculateCalendarRelevance(event, parsed)
      };
    })
    .filter(Boolean);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RELEVANCE SCORING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calculateXeroRelevance(tx, parsed) {
  let score = 50;  // Base score

  // Vendor match
  if (parsed.vendor && tx.contact_name?.toLowerCase().includes(parsed.vendor)) {
    score += 30;
  }

  // Amount match (within 10%)
  if (parsed.amount && tx.total) {
    const diff = Math.abs(Math.abs(tx.total) - parsed.amount) / parsed.amount;
    if (diff < 0.01) score += 20;  // Exact match
    else if (diff < 0.10) score += 10;  // Within 10%
  }

  // Missing attachment = more relevant (needs receipt)
  if (!tx.has_attachments) {
    score += 10;
  }

  return Math.min(score, 100);
}

function calculateEmailRelevance(email, parsed, vendorMatch) {
  let score = 40;  // Base score for receipt-like emails

  if (vendorMatch) {
    score += 35;
  }

  // Strong receipt indicators
  const subject = (email.subject || '').toLowerCase();
  if (subject.includes('your receipt') || subject.includes('tax invoice')) {
    score += 15;
  }
  if (subject.includes('confirmation') || subject.includes('booking')) {
    score += 10;
  }

  // Has attachment bonus
  if (email.has_attachments) {
    score += 10;
  }

  return Math.min(score, 100);
}

function calculateCalendarRelevance(event, parsed) {
  let score = 30;  // Base score

  const title = (event.title || '').toLowerCase();

  // Vendor match in title
  if (parsed.vendor && title.includes(parsed.vendor)) {
    score += 40;
  }

  // Travel keywords
  if (title.includes('flight') || title.includes('travel')) {
    score += 20;
  }

  return Math.min(score, 100);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CROSS-SOURCE MATCHING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Find potential matches between transactions and emails
 *
 * @param {Object[]} results - All search results
 * @returns {Object[]} Suggested matches with confidence
 */
export function findCrossSourceMatches(results) {
  const transactions = results.filter(r => r.source === 'xero');
  const emails = results.filter(r => r.source === 'gmail');
  const matches = [];

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    const txVendor = (tx.vendor || '').toLowerCase();

    for (const email of emails) {
      const emailDate = new Date(email.date);
      const daysDiff = Math.abs((txDate - emailDate) / (1000 * 60 * 60 * 24));

      // Must be within 14 days
      if (daysDiff > 14) continue;

      let confidence = 0;
      const reasons = [];

      // Vendor match
      const emailText = `${email.subject || ''} ${email.from || ''}`.toLowerCase();
      if (txVendor && emailText.includes(txVendor)) {
        confidence += 40;
        reasons.push('Vendor match');
      }

      // Date proximity
      if (daysDiff <= 1) {
        confidence += 25;
        reasons.push('Same day');
      } else if (daysDiff <= 7) {
        confidence += 15;
        reasons.push(`${Math.round(daysDiff)} days apart`);
      }

      // Has attachment
      if (email.has_attachment) {
        confidence += 10;
        reasons.push('Has attachment');
      }

      // Only include if reasonable confidence
      if (confidence >= 40) {
        matches.push({
          transaction_id: tx.id,
          transaction_vendor: tx.vendor,
          transaction_amount: tx.amount,
          email_id: email.id,
          email_subject: email.subject,
          confidence,
          reasons
        });
      }
    }
  }

  // Sort by confidence
  matches.sort((a, b) => b.confidence - a.confidence);
  return matches.slice(0, 10);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN SEARCH FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Unified search across all receipt sources
 *
 * @param {string} query - Natural language search query
 * @param {Object} options - Search options
 * @param {string[]} options.sources - Sources to search ['xero', 'gmail', 'calendar']
 * @param {Object} options.dateRange - { from, to } ISO date strings
 * @param {Object} options.amount - { min, max } amount filters
 * @returns {Promise<Object>} Search results with suggested matches
 */
export async function unifiedReceiptSearch(query, options = {}) {
  const {
    sources = ['xero', 'gmail', 'calendar'],
    dateRange = {},
    amount = {}
  } = options;

  // Parse the query
  const parsed = parseSearchQuery(query);

  // Search each source in parallel
  const searchPromises = [];

  if (sources.includes('xero')) {
    searchPromises.push(searchXeroTransactions(parsed, dateRange, amount));
  }
  if (sources.includes('gmail')) {
    searchPromises.push(searchGmailForReceipts(parsed, dateRange));
  }
  if (sources.includes('calendar')) {
    searchPromises.push(searchCalendarEvents(parsed, dateRange));
  }

  const searchResults = await Promise.all(searchPromises);
  const allResults = searchResults.flat().filter(Boolean);

  // Sort by relevance
  allResults.sort((a, b) => b.relevance_score - a.relevance_score);

  // Find cross-source matches
  const suggestedMatches = findCrossSourceMatches(allResults);

  return {
    query: parsed,
    results: allResults,
    suggested_matches: suggestedMatches,
    sources_searched: sources,
    total_results: allResults.length
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv.slice(2).join(' ') || 'Qantas';

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Unified Receipt Search');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Searching for: "${query}"\n`);

  const results = await unifiedReceiptSearch(query);

  console.log(`Found ${results.total_results} results across ${results.sources_searched.join(', ')}\n`);

  // Group by source
  const bySource = {};
  for (const r of results.results) {
    if (!bySource[r.source]) bySource[r.source] = [];
    bySource[r.source].push(r);
  }

  for (const [source, items] of Object.entries(bySource)) {
    const icon = source === 'xero' ? '💳' : source === 'gmail' ? '📧' : '📅';
    console.log(`${icon} ${source.toUpperCase()} (${items.length})`);
    console.log('─'.repeat(40));

    items.slice(0, 5).forEach((item, i) => {
      if (source === 'xero') {
        console.log(`  ${i + 1}. ${item.vendor || 'Unknown'} - $${item.amount?.toFixed(2)}`);
        console.log(`     ${item.date} | ${item.has_attachment ? '📎' : '❌'} Receipt`);
      } else if (source === 'gmail') {
        console.log(`  ${i + 1}. ${item.subject?.substring(0, 50) || 'No subject'}`);
        console.log(`     ${item.date} | From: ${item.from?.substring(0, 30) || 'Unknown'}`);
      } else {
        console.log(`  ${i + 1}. ${item.title || 'No title'}`);
        console.log(`     ${item.date}`);
      }
      console.log(`     Relevance: ${item.relevance_score}%`);
      console.log('');
    });
  }

  if (results.suggested_matches.length > 0) {
    console.log('\n🎯 SUGGESTED MATCHES');
    console.log('─'.repeat(40));
    results.suggested_matches.slice(0, 3).forEach((match, i) => {
      console.log(`  ${i + 1}. ${match.transaction_vendor} ($${match.transaction_amount?.toFixed(2)})`);
      console.log(`     → ${match.email_subject?.substring(0, 40)}`);
      console.log(`     Confidence: ${match.confidence}% | ${match.reasons.join(', ')}`);
      console.log('');
    });
  }
}

export default {
  parseSearchQuery,
  searchXeroTransactions,
  searchGmailForReceipts,
  searchCalendarEvents,
  findCrossSourceMatches,
  unifiedReceiptSearch
};

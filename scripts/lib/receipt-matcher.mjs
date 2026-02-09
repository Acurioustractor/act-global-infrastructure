/**
 * Receipt Matcher Module
 *
 * Matches unreconciled expenses to potential emails using:
 * - Vendor name matching (fuzzy)
 * - Amount matching (within tolerance)
 * - Date proximity matching
 * - Receipt/invoice keyword boosting
 * - Calendar context (travel events)
 *
 * Usage:
 *   import { findEmailMatches, calculateMatchScore } from './lib/receipt-matcher.mjs';
 *
 *   const matches = await findEmailMatches(receiptMatch);
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Supabase client
const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MATCHING CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MATCH_WEIGHTS = {
  vendorMatch: 40,      // Vendor name found in email
  amountMatch: 25,      // Amount within tolerance
  dateMatch: 20,        // Date within window
  keywordBoost: 15      // Receipt/invoice keywords
};

// Keywords that suggest an email contains a receipt
const RECEIPT_KEYWORDS = [
  'receipt', 'invoice', 'confirmation', 'booking', 'reservation',
  'order', 'payment', 'purchase', 'transaction', 'itinerary',
  'e-ticket', 'ticket', 'voucher', 'statement', 'bill'
];

// Strong receipt indicators (higher boost)
const STRONG_RECEIPT_KEYWORDS = [
  'your receipt', 'tax invoice', 'payment receipt', 'booking confirmation',
  'order confirmation', 'purchase confirmation', 'payment confirmation',
  'attached invoice', 'attached receipt'
];

// Amount matching tolerance (percentage)
const AMOUNT_TOLERANCE_PCT = 0.10;  // 10%

// Date matching window (days)
const DATE_WINDOW_DAYS = 7;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STRING MATCHING UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Normalize a string for comparison
 */
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract vendor keywords from vendor name
 * e.g., "Qantas Airways Limited" -> ['qantas', 'airways']
 */
function extractVendorKeywords(vendorName) {
  if (!vendorName) return [];

  const normalized = normalize(vendorName);

  // Remove common suffixes
  const cleaned = normalized
    .replace(/\b(pty|ltd|limited|inc|incorporated|llc|corp|corporation)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into words and filter short ones
  return cleaned.split(' ').filter(word => word.length >= 3);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate string similarity (0-1)
 */
function stringSimilarity(str1, str2) {
  const a = normalize(str1);
  const b = normalize(str2);

  if (!a || !b) return 0;
  if (a === b) return 1;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(a, b);
  return 1 - (distance / maxLen);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCORE CALCULATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calculate vendor match score
 *
 * @param {string} vendorName - Vendor name from transaction
 * @param {Object} email - Email from communications_history
 * @returns {Object} {score, reason}
 */
function calculateVendorScore(vendorName, email) {
  const keywords = extractVendorKeywords(vendorName);
  if (keywords.length === 0) {
    return { score: 0, reason: 'No vendor keywords' };
  }

  const searchText = normalize(
    `${email.subject || ''} ${email.content_preview || ''}`
  );
  const fromText = normalize(email.source_id || '');  // Often contains sender email

  let matchCount = 0;
  const matchedKeywords = [];

  for (const keyword of keywords) {
    // Check exact keyword match
    if (searchText.includes(keyword)) {
      matchCount++;
      matchedKeywords.push(keyword);
    }
    // Check in sender (higher confidence)
    if (fromText.includes(keyword)) {
      matchCount += 1.5;
      if (!matchedKeywords.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
  }

  // Calculate percentage of keywords found
  const matchPct = matchCount / (keywords.length * 1.5);  // Normalize with sender bonus
  const score = Math.min(matchPct * MATCH_WEIGHTS.vendorMatch, MATCH_WEIGHTS.vendorMatch);

  return {
    score: Math.round(score),
    reason: matchedKeywords.length > 0
      ? `Vendor keywords: ${matchedKeywords.join(', ')}`
      : 'No vendor match'
  };
}

/**
 * Calculate amount match score
 *
 * @param {number} transactionAmount - Amount from transaction
 * @param {Object} email - Email from communications_history
 * @returns {Object} {score, reason, matchedAmount}
 */
function calculateAmountScore(transactionAmount, email) {
  if (!transactionAmount) {
    return { score: 0, reason: 'No transaction amount', matchedAmount: null };
  }

  const content = `${email.subject || ''} ${email.content_preview || ''}`;

  // Extract amounts from email (various formats)
  const amountPatterns = [
    /\$[\d,]+\.?\d{0,2}/g,                    // $123.45 or $1,234.56
    /AUD\s*[\d,]+\.?\d{0,2}/gi,               // AUD 123.45
    /[\d,]+\.?\d{0,2}\s*AUD/gi,               // 123.45 AUD
    /Total:?\s*\$?[\d,]+\.?\d{0,2}/gi,        // Total: $123.45
    /Amount:?\s*\$?[\d,]+\.?\d{0,2}/gi        // Amount: 123.45
  ];

  const amounts = new Set();
  for (const pattern of amountPatterns) {
    const matches = content.match(pattern) || [];
    for (const match of matches) {
      const num = parseFloat(match.replace(/[^\d.]/g, ''));
      if (num > 0) {
        amounts.add(num);
      }
    }
  }

  if (amounts.size === 0) {
    return { score: 0, reason: 'No amounts found in email', matchedAmount: null };
  }

  // Find closest match within tolerance
  const tolerance = transactionAmount * AMOUNT_TOLERANCE_PCT;
  let bestMatch = null;
  let bestDiff = Infinity;

  for (const amount of amounts) {
    const diff = Math.abs(amount - transactionAmount);
    if (diff <= tolerance && diff < bestDiff) {
      bestDiff = diff;
      bestMatch = amount;
    }
  }

  if (bestMatch === null) {
    return {
      score: 0,
      reason: `No amount within ${AMOUNT_TOLERANCE_PCT * 100}% tolerance`,
      matchedAmount: null
    };
  }

  // Score based on how close the match is
  const diffPct = bestDiff / transactionAmount;
  const score = Math.round(MATCH_WEIGHTS.amountMatch * (1 - diffPct / AMOUNT_TOLERANCE_PCT));

  return {
    score,
    reason: `Amount match: $${bestMatch.toFixed(2)} (${diffPct < 0.01 ? 'exact' : `${(diffPct * 100).toFixed(1)}% diff`})`,
    matchedAmount: bestMatch
  };
}

/**
 * Calculate date proximity score
 *
 * @param {string} transactionDate - Date string from transaction
 * @param {Object} email - Email from communications_history
 * @returns {Object} {score, reason, daysDiff}
 */
function calculateDateScore(transactionDate, email) {
  if (!transactionDate || !email.occurred_at) {
    return { score: 0, reason: 'Missing date', daysDiff: null };
  }

  const txnDate = new Date(transactionDate);
  const emailDate = new Date(email.occurred_at);

  // Calculate days difference
  const diffMs = Math.abs(txnDate - emailDate);
  const daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysDiff > DATE_WINDOW_DAYS) {
    return {
      score: 0,
      reason: `Email ${daysDiff} days from transaction`,
      daysDiff
    };
  }

  // Score inversely proportional to days difference
  // Same day = full score, 7 days = 0
  const score = Math.round(MATCH_WEIGHTS.dateMatch * (1 - daysDiff / DATE_WINDOW_DAYS));

  return {
    score,
    reason: daysDiff === 0 ? 'Same day' : `${daysDiff} day${daysDiff === 1 ? '' : 's'} apart`,
    daysDiff
  };
}

/**
 * Calculate keyword boost score
 *
 * @param {Object} email - Email from communications_history
 * @returns {Object} {score, reason, keywords}
 */
function calculateKeywordScore(email) {
  const content = normalize(`${email.subject || ''} ${email.content_preview || ''}`);

  const foundKeywords = [];
  let hasStrong = false;

  // Check strong keywords first
  for (const keyword of STRONG_RECEIPT_KEYWORDS) {
    if (content.includes(normalize(keyword))) {
      foundKeywords.push(keyword);
      hasStrong = true;
    }
  }

  // Check regular keywords
  for (const keyword of RECEIPT_KEYWORDS) {
    if (content.includes(keyword) && !foundKeywords.some(k => k.includes(keyword))) {
      foundKeywords.push(keyword);
    }
  }

  if (foundKeywords.length === 0) {
    return { score: 0, reason: 'No receipt keywords', keywords: [] };
  }

  // Strong keyword = full score, regular keywords = partial
  const score = hasStrong
    ? MATCH_WEIGHTS.keywordBoost
    : Math.round(MATCH_WEIGHTS.keywordBoost * Math.min(foundKeywords.length / 3, 1));

  return {
    score,
    reason: `Keywords: ${foundKeywords.slice(0, 3).join(', ')}`,
    keywords: foundKeywords
  };
}

/**
 * Calculate total match score for an email
 *
 * @param {Object} receipt - Receipt match record
 * @param {Object} email - Email from communications_history
 * @returns {Object} Full scoring breakdown
 */
export function calculateMatchScore(receipt, email) {
  const vendorResult = calculateVendorScore(receipt.vendor_name, email);
  const amountResult = calculateAmountScore(receipt.amount, email);
  const dateResult = calculateDateScore(receipt.transaction_date, email);
  const keywordResult = calculateKeywordScore(email);

  const totalScore = vendorResult.score + amountResult.score + dateResult.score + keywordResult.score;

  return {
    totalScore,
    maxScore: Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0),
    confidence: Math.round((totalScore / 100) * 100),
    breakdown: {
      vendor: vendorResult,
      amount: amountResult,
      date: dateResult,
      keywords: keywordResult
    },
    reasons: [
      vendorResult.reason,
      amountResult.reason,
      dateResult.reason,
      keywordResult.reason
    ].filter(r => !r.includes('No '))
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL SEARCH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Find potential email matches for a receipt
 *
 * @param {Object} receipt - Receipt match record
 * @param {Object} options
 * @param {number} options.dateWindowDays - Days before/after transaction to search
 * @param {number} options.minScore - Minimum score to include
 * @param {number} options.limit - Max results
 * @returns {Promise<Object[]>} Sorted email matches with scores
 */
export async function findEmailMatches(receipt, options = {}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const {
    dateWindowDays = 14,
    minScore = 20,
    limit = 10
  } = options;

  const txnDate = new Date(receipt.transaction_date);

  // Calculate date range
  const startDate = new Date(txnDate);
  startDate.setDate(startDate.getDate() - dateWindowDays);

  const endDate = new Date(txnDate);
  endDate.setDate(endDate.getDate() + dateWindowDays);

  // Query emails in date range
  const { data: emails, error } = await supabase
    .from('communications_history')
    .select('*')
    .eq('channel', 'email')
    .gte('occurred_at', startDate.toISOString())
    .lte('occurred_at', endDate.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(200);  // Get more initially, filter by score later

  if (error) {
    throw new Error(`Failed to query emails: ${error.message}`);
  }

  if (!emails || emails.length === 0) {
    return [];
  }

  // Score each email
  const scoredMatches = [];

  for (const email of emails) {
    const scoreResult = calculateMatchScore(receipt, email);

    if (scoreResult.totalScore >= minScore) {
      scoredMatches.push({
        email,
        ...scoreResult
      });
    }
  }

  // Sort by score descending
  scoredMatches.sort((a, b) => b.totalScore - a.totalScore);

  return scoredMatches.slice(0, limit);
}

/**
 * Find matches for all pending receipts
 *
 * @param {Object[]} receipts - Array of receipt match records
 * @param {Object} options - Options for findEmailMatches
 * @returns {Promise<Map>} Map of receipt_id -> matches
 */
export async function findMatchesForAll(receipts, options = {}) {
  const results = new Map();

  for (const receipt of receipts) {
    try {
      const matches = await findEmailMatches(receipt, options);
      results.set(receipt.id, {
        receipt,
        matches,
        bestMatch: matches[0] || null
      });
    } catch (error) {
      results.set(receipt.id, {
        receipt,
        matches: [],
        bestMatch: null,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Update receipt with suggested email match
 *
 * @param {string} receiptId - Receipt match ID
 * @param {Object} emailMatch - Best email match with score
 * @returns {Promise<Object>} Updated receipt
 */
export async function suggestEmailMatch(receiptId, emailMatch) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { email, totalScore, reasons, confidence } = emailMatch;

  const update = {
    status: 'email_suggested',
    suggested_email_id: email.id,
    suggested_email_subject: email.subject?.substring(0, 255),
    suggested_email_from: email.source_id,  // Contains sender info
    suggested_email_date: email.occurred_at,
    match_confidence: confidence,
    match_reasons: reasons.map(reason => ({ reason, weight: 0 })),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('receipt_matches')
    .update(update)
    .eq('id', receiptId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update receipt match: ${error.message}`);
  }

  // Log history
  await supabase.from('receipt_match_history').insert({
    receipt_match_id: receiptId,
    action: 'email_suggested',
    previous_status: 'pending',
    new_status: 'email_suggested',
    triggered_by: 'matcher',
    metadata: {
      email_id: email.id,
      confidence,
      reasons
    }
  });

  return data;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CALENDAR CONTEXT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Check for travel calendar events near transaction date
 *
 * @param {string} transactionDate - Date string
 * @param {number} windowDays - Days to search
 * @returns {Promise<Object[]>} Nearby calendar events
 */
export async function findNearbyTravelEvents(transactionDate, windowDays = 7) {
  if (!supabase) {
    return [];
  }

  const txnDate = new Date(transactionDate);
  const startDate = new Date(txnDate);
  startDate.setDate(startDate.getDate() - windowDays);

  const endDate = new Date(txnDate);
  endDate.setDate(endDate.getDate() + windowDays);

  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .or('title.ilike.%flight%,title.ilike.%travel%,title.ilike.%trip%,title.ilike.%hotel%')
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching calendar events:', error.message);
    return [];
  }

  return events || [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Receipt Matcher');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (command === 'test') {
    // Test with a sample receipt
    const testReceipt = {
      id: 'test',
      vendor_name: 'Qantas Airways',
      amount: 580.00,
      transaction_date: '2026-01-15',
      category: 'travel'
    };

    console.log('Testing with sample receipt:');
    console.log(`  Vendor: ${testReceipt.vendor_name}`);
    console.log(`  Amount: $${testReceipt.amount}`);
    console.log(`  Date: ${testReceipt.transaction_date}\n`);

    const matches = await findEmailMatches(testReceipt, { minScore: 10 });

    if (matches.length === 0) {
      console.log('No email matches found.');
      console.log('(This is expected if no emails are synced for this vendor/date)');
    } else {
      console.log(`Found ${matches.length} potential matches:\n`);

      matches.forEach((match, i) => {
        console.log(`${i + 1}. Score: ${match.totalScore}/100 (${match.confidence}% confidence)`);
        console.log(`   Subject: ${match.email.subject?.substring(0, 60) || 'N/A'}`);
        console.log(`   Date: ${new Date(match.email.occurred_at).toLocaleDateString()}`);
        console.log(`   Reasons: ${match.reasons.join(', ')}`);
        console.log('');
      });
    }

  } else if (command === 'match-pending') {
    // Match all pending receipts
    const { getPendingReceipts } = await import('./receipt-detector.mjs');

    console.log('Fetching pending receipts...');
    const pending = await getPendingReceipts({ statuses: ['pending'] });
    console.log(`Found ${pending.length} pending receipts\n`);

    let matched = 0;
    let noMatch = 0;

    for (const receipt of pending.slice(0, 20)) {  // Limit for testing
      process.stdout.write(`Matching: ${receipt.vendor_name?.substring(0, 30).padEnd(30)} `);

      const matches = await findEmailMatches(receipt, { minScore: 30 });

      if (matches.length > 0 && matches[0].confidence >= 40) {
        await suggestEmailMatch(receipt.id, matches[0]);
        console.log(`✓ ${matches[0].confidence}%`);
        matched++;
      } else {
        console.log('✗ No match');
        noMatch++;
      }
    }

    console.log(`\nResults: ${matched} matched, ${noMatch} no match`);

  } else {
    console.log('Usage:');
    console.log('  node scripts/lib/receipt-matcher.mjs test           - Test with sample receipt');
    console.log('  node scripts/lib/receipt-matcher.mjs match-pending  - Match all pending receipts');
  }
}

export default {
  calculateMatchScore,
  findEmailMatches,
  findMatchesForAll,
  suggestEmailMatch,
  findNearbyTravelEvents
};

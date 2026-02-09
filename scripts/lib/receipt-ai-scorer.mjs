/**
 * Receipt AI Confidence Scorer
 *
 * Uses LLM to analyze ambiguous matches between transactions and emails.
 * Provides enhanced confidence scores and human-readable reasoning.
 *
 * Usage:
 *   import { scoreMatchWithAI, batchScoreMatches } from './lib/receipt-ai-scorer.mjs';
 *
 *   const result = await scoreMatchWithAI(receipt, emailMatch);
 */

import { trackedCompletion } from './llm-client.mjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Supabase client
const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROMPTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SYSTEM_PROMPT = `You are a financial assistant helping match business transactions to email receipts.

Your task: Analyze whether an email likely contains the receipt/confirmation for a specific transaction.

Consider:
1. VENDOR MATCH: Does the email appear to be from the same vendor?
2. AMOUNT MATCH: Does any amount in the email match (within 10%)?
3. DATE MATCH: Is the email date reasonable for this transaction?
4. RECEIPT INDICATORS: Does the email look like a receipt, confirmation, or invoice?

Respond ONLY with valid JSON in this exact format:
{
  "confidence": <0-100>,
  "is_match": <true/false>,
  "reasoning": "<brief explanation in one sentence>",
  "factors": {
    "vendor_match": <"strong"|"partial"|"weak"|"none">,
    "amount_match": <"exact"|"close"|"none">,
    "date_match": <"same_day"|"within_week"|"outside_window">,
    "receipt_indicators": <"strong"|"moderate"|"weak"|"none">
  }
}`;

const USER_PROMPT_TEMPLATE = [
  'Analyze this transaction/email pair:',
  '',
  'TRANSACTION:',
  '- Vendor: {{vendor_name}}',
  '- Amount: ${{amount}}',
  '- Date: {{transaction_date}}',
  '- Category: {{category}}',
  '- Description: {{description}}',
  '',
  'EMAIL:',
  '- Subject: {{email_subject}}',
  '- From: {{email_from}}',
  '- Date: {{email_date}}',
  '- Preview: {{email_preview}}',
  '',
  'HEURISTIC SCORES (for context):',
  '- Vendor Score: {{vendor_score}}/40',
  '- Amount Score: {{amount_score}}/25',
  '- Date Score: {{date_score}}/20',
  '- Keyword Score: {{keyword_score}}/15',
  '- Total: {{total_score}}/100',
  '',
  'Provide your confidence assessment as JSON.'
].join('\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI SCORING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Score a match using AI
 *
 * @param {Object} receipt - Receipt match record
 * @param {Object} emailMatch - Email match with breakdown from receipt-matcher
 * @param {Object} options
 * @param {string} options.model - LLM model to use (default: gpt-4o-mini)
 * @returns {Promise<Object>} AI scoring result
 */
export async function scoreMatchWithAI(receipt, emailMatch, options = {}) {
  const { model = 'gpt-4o-mini' } = options;

  // Build the prompt
  const userPrompt = USER_PROMPT_TEMPLATE
    .replace('{{vendor_name}}', receipt.vendor_name || 'Unknown')
    .replace('{{amount}}', receipt.amount?.toFixed(2) || '0.00')
    .replace('{{transaction_date}}', receipt.transaction_date || 'Unknown')
    .replace('{{category}}', receipt.category || 'other')
    .replace('{{description}}', receipt.description?.substring(0, 100) || 'N/A')
    .replace('{{email_subject}}', emailMatch.email.subject || 'No subject')
    .replace('{{email_from}}', emailMatch.email.source_id || 'Unknown sender')
    .replace('{{email_date}}', new Date(emailMatch.email.occurred_at).toLocaleDateString())
    .replace('{{email_preview}}', (emailMatch.email.content_preview || '').substring(0, 300))
    .replace('{{vendor_score}}', emailMatch.breakdown.vendor.score)
    .replace('{{amount_score}}', emailMatch.breakdown.amount.score)
    .replace('{{date_score}}', emailMatch.breakdown.date.score)
    .replace('{{keyword_score}}', emailMatch.breakdown.keywords.score)
    .replace('{{total_score}}', emailMatch.totalScore);

  try {
    const response = await trackedCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      'receipt-ai-scorer',
      {
        model,
        temperature: 0.3,
        maxTokens: 300
      }
    );

    // Parse JSON response
    const result = JSON.parse(response);

    return {
      success: true,
      confidence: result.confidence,
      is_match: result.is_match,
      reasoning: result.reasoning,
      factors: result.factors,
      heuristicScore: emailMatch.totalScore,
      aiScore: result.confidence,
      // Final score is weighted average: 60% AI, 40% heuristic
      finalScore: Math.round(result.confidence * 0.6 + emailMatch.totalScore * 0.4)
    };

  } catch (error) {
    console.error('AI scoring error:', error.message);

    // Fallback to heuristic score
    return {
      success: false,
      error: error.message,
      confidence: emailMatch.totalScore,
      is_match: emailMatch.totalScore >= 50,
      reasoning: 'AI scoring failed, using heuristic score',
      factors: null,
      heuristicScore: emailMatch.totalScore,
      aiScore: null,
      finalScore: emailMatch.totalScore
    };
  }
}

/**
 * Batch score multiple matches with AI
 *
 * @param {Object[]} matches - Array of {receipt, emailMatch} pairs
 * @param {Object} options
 * @param {number} options.concurrency - Max concurrent requests
 * @param {number} options.minHeuristicScore - Skip AI for low scores
 * @returns {Promise<Object[]>} Scored matches
 */
export async function batchScoreMatches(matches, options = {}) {
  const {
    concurrency = 3,
    minHeuristicScore = 30
  } = options;

  const results = [];

  // Process in batches
  for (let i = 0; i < matches.length; i += concurrency) {
    const batch = matches.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async ({ receipt, emailMatch }) => {
        // Skip AI for low-confidence matches
        if (emailMatch.totalScore < minHeuristicScore) {
          return {
            receipt,
            emailMatch,
            aiResult: {
              success: true,
              skipped: true,
              confidence: emailMatch.totalScore,
              is_match: false,
              reasoning: `Heuristic score ${emailMatch.totalScore} below threshold`,
              finalScore: emailMatch.totalScore
            }
          };
        }

        const aiResult = await scoreMatchWithAI(receipt, emailMatch, options);
        return { receipt, emailMatch, aiResult };
      })
    );

    results.push(...batchResults);

    // Rate limiting pause between batches
    if (i + concurrency < matches.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}

/**
 * Update receipt match with AI confidence score
 *
 * @param {string} receiptId - Receipt match ID
 * @param {Object} aiResult - Result from scoreMatchWithAI
 * @returns {Promise<Object>} Updated receipt
 */
export async function updateReceiptWithAIScore(receiptId, aiResult) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const update = {
    match_confidence: aiResult.finalScore,
    match_reasons: [
      { reason: aiResult.reasoning, weight: aiResult.aiScore || 0 },
      ...(aiResult.factors ? [
        { reason: `Vendor: ${aiResult.factors.vendor_match}`, weight: 0 },
        { reason: `Amount: ${aiResult.factors.amount_match}`, weight: 0 },
        { reason: `Date: ${aiResult.factors.date_match}`, weight: 0 }
      ] : [])
    ],
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('receipt_matches')
    .update(update)
    .eq('id', receiptId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update receipt: ${error.message}`);
  }

  // Log history
  await supabase.from('receipt_match_history').insert({
    receipt_match_id: receiptId,
    action: 'confidence_updated',
    triggered_by: 'ai_scorer',
    metadata: {
      heuristic_score: aiResult.heuristicScore,
      ai_score: aiResult.aiScore,
      final_score: aiResult.finalScore,
      is_match: aiResult.is_match,
      reasoning: aiResult.reasoning
    }
  });

  return data;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BATCH PROCESSING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Process all email-suggested receipts with AI scoring
 *
 * @param {Object} options
 * @param {number} options.limit - Max receipts to process
 * @returns {Promise<Object>} Processing results
 */
export async function enhanceAllSuggestedMatches(options = {}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { limit = 50 } = options;

  // Get receipts with email suggestions but no AI scoring
  const { data: receipts, error } = await supabase
    .from('receipt_matches')
    .select('*')
    .eq('status', 'email_suggested')
    .is('match_reasons', null)
    .order('amount', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch receipts: ${error.message}`);
  }

  if (!receipts || receipts.length === 0) {
    return { processed: 0, enhanced: 0, failed: 0 };
  }

  console.log(`Processing ${receipts.length} receipts...`);

  const results = {
    processed: 0,
    enhanced: 0,
    failed: 0,
    details: []
  };

  for (const receipt of receipts) {
    // Get the suggested email
    const { data: email } = await supabase
      .from('communications_history')
      .select('*')
      .eq('id', receipt.suggested_email_id)
      .single();

    if (!email) {
      results.failed++;
      results.details.push({
        receipt_id: receipt.id,
        error: 'Suggested email not found'
      });
      continue;
    }

    // Create mock emailMatch structure for AI scorer
    const emailMatch = {
      email,
      totalScore: receipt.match_confidence || 50,
      breakdown: {
        vendor: { score: 20 },
        amount: { score: 12 },
        date: { score: 10 },
        keywords: { score: 8 }
      }
    };

    try {
      const aiResult = await scoreMatchWithAI(receipt, emailMatch);
      await updateReceiptWithAIScore(receipt.id, aiResult);

      results.processed++;
      if (aiResult.success) {
        results.enhanced++;
      }

      results.details.push({
        receipt_id: receipt.id,
        vendor: receipt.vendor_name,
        heuristic: emailMatch.totalScore,
        ai_score: aiResult.aiScore,
        final: aiResult.finalScore,
        is_match: aiResult.is_match
      });

      // Rate limiting
      await new Promise(r => setTimeout(r, 300));

    } catch (err) {
      results.failed++;
      results.details.push({
        receipt_id: receipt.id,
        error: err.message
      });
    }
  }

  return results;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Receipt AI Scorer');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (command === 'test') {
    // Test with mock data
    const mockReceipt = {
      vendor_name: 'Qantas Airways',
      amount: 580.00,
      transaction_date: '2026-01-15',
      category: 'travel',
      description: 'Flight MEL-BNE'
    };

    const mockEmailMatch = {
      email: {
        subject: 'Your Qantas booking confirmation - QF432',
        source_id: 'noreply@qantas.com.au',
        occurred_at: '2026-01-14T10:30:00Z',
        content_preview: 'Thank you for your booking. Your flight from Melbourne to Brisbane on 15 January 2026. Total: $580.00 AUD'
      },
      totalScore: 75,
      breakdown: {
        vendor: { score: 35 },
        amount: { score: 25 },
        date: { score: 15 },
        keywords: { score: 0 }
      }
    };

    console.log('Testing AI scorer with mock data...\n');
    console.log('Transaction:', mockReceipt.vendor_name, `$${mockReceipt.amount}`);
    console.log('Email:', mockEmailMatch.email.subject);
    console.log('');

    const result = await scoreMatchWithAI(mockReceipt, mockEmailMatch);

    console.log('AI Result:');
    console.log(`  Confidence: ${result.confidence}%`);
    console.log(`  Is Match: ${result.is_match ? 'Yes' : 'No'}`);
    console.log(`  Reasoning: ${result.reasoning}`);
    console.log(`  Final Score: ${result.finalScore}/100`);

    if (result.factors) {
      console.log('\nFactors:');
      console.log(`  Vendor: ${result.factors.vendor_match}`);
      console.log(`  Amount: ${result.factors.amount_match}`);
      console.log(`  Date: ${result.factors.date_match}`);
      console.log(`  Receipt Indicators: ${result.factors.receipt_indicators}`);
    }

  } else if (command === 'enhance') {
    const limit = parseInt(process.argv[3]) || 20;
    console.log(`Enhancing up to ${limit} suggested matches with AI...\n`);

    const results = await enhanceAllSuggestedMatches({ limit });

    console.log('\nResults:');
    console.log(`  Processed: ${results.processed}`);
    console.log(`  Enhanced: ${results.enhanced}`);
    console.log(`  Failed: ${results.failed}`);

    if (results.details.length > 0) {
      console.log('\nDetails:');
      results.details.slice(0, 10).forEach(d => {
        if (d.error) {
          console.log(`  ✗ ${d.receipt_id}: ${d.error}`);
        } else {
          console.log(`  ✓ ${d.vendor}: ${d.heuristic} → ${d.final} (${d.is_match ? 'match' : 'no match'})`);
        }
      });
    }

  } else {
    console.log('Usage:');
    console.log('  node scripts/lib/receipt-ai-scorer.mjs test         - Test with mock data');
    console.log('  node scripts/lib/receipt-ai-scorer.mjs enhance [n]  - Enhance n suggested matches');
  }
}

export default {
  scoreMatchWithAI,
  batchScoreMatches,
  updateReceiptWithAIScore,
  enhanceAllSuggestedMatches
};

/**
 * ACT Finance Engine — Receipt Classifier
 *
 * Pure functions for classifying emails as receipts, extracting amounts,
 * and parsing HTML receipt data. Extracted from capture-receipts.mjs
 * for testability and reuse.
 *
 * Usage:
 *   import { isLikelyReceipt, extractAmount, extractReceiptFromHtml } from './lib/finance/receipt-classifier.mjs';
 */

// ============================================================================
// RECEIPT CLASSIFICATION
// ============================================================================

/**
 * Classify whether an email is likely a receipt/invoice.
 *
 * @param {string} subject - Email subject line
 * @param {string} from - Email from header
 * @returns {boolean}
 */
export function isLikelyReceipt(subject, from) {
  const subjectLower = (subject || '').toLowerCase();
  const fromLower = (from || '').toLowerCase();

  // Strong positive signals — definitely a receipt
  const strongReceiptSignals = [
    'receipt', 'invoice', 'tax invoice', 'your payment', 'payment confirmed',
    'order confirmation', 'e-ticket', 'booking confirmation', 'your trip with',
    'has been funded', 'payment received', 'your order', 'your bill',
    'your statement', 'your subscription', 'charge of', 'amount due',
    'payment successful', 'paid invoice', 'your purchase',
  ];
  if (strongReceiptSignals.some(s => subjectLower.includes(s))) return true;

  // Strong negative signals — definitely marketing
  const marketingSignals = [
    'earn up to', 'bonus points', "don't miss", 'last chance', 'limited time',
    'off return flights', 'double points', 'new era of', 'love highlevel',
    'get paid to share', 'ecosystem', 'newsletter', 'new form submission',
    "don't forget your", 'smarter inventory', 'permission', 'introducing',
    "what's new", 'tips for', 'webinar', 'event invite', 'masterclass',
    'save up to', 'special offer', 'exclusive', 'promo', 'sale now on',
    'earn triple', 'earn double', 'switch to', 'want the chance',
    'protect your', 'hospital and extras', 'explore these', 'prepare for your flight',
    'bid for an upgrade', 'ready to get packed', 'off to a flying start',
    'still looking for', 'new case', 'task limit', 'onboarding checklist',
    'billing update', 'form submission', 'hear from you', 'valuer-general',
    'trial ends', 'free pro start', 'want to hear', 'your pro trial',
    'how to set up', 'how to get', 'save time', 'organize your',
    'invite your', 'to do today', 'top tips', 'data import',
    'overdue acquittal', 'urgent - overdue',
  ];
  if (marketingSignals.some(s => subjectLower.includes(s))) return false;

  // Billing from-address patterns — likely a receipt
  const billingFromPatterns = [
    'noreply@', 'no-reply@', 'no_reply@', 'receipts@', 'receipt@',
    'billing@', 'payments@', 'invoice@', 'invoices@', 'documents@',
    'payments-noreply@', 'invoice+statements',
  ];
  if (billingFromPatterns.some(p => fromLower.includes(p))) return true;

  return false;
}

// ============================================================================
// AMOUNT EXTRACTION
// ============================================================================

/**
 * Extract a dollar amount from text (subject, snippet, preview).
 *
 * Supports: $123.45, AUD 123.45, A$123.45, Total: $123.45, Amount: $123.45
 * Rejects amounts >= $100,000 (likely not a receipt).
 *
 * @param {string} text
 * @returns {number|null}
 */
export function extractAmount(text) {
  if (!text) return null;

  const patterns = [
    /(?:AUD|A\$)\s?([\d,]+\.?\d{0,2})/i,
    /\$([\d,]+\.\d{2})/,
    /Total:?\s*\$?([\d,]+\.\d{2})/i,
    /Amount:?\s*\$?([\d,]+\.\d{2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (amount > 0 && amount < 100000) return amount;
    }
  }
  return null;
}

// ============================================================================
// HTML RECEIPT PARSING
// ============================================================================

/**
 * Extract receipt data (amount) from HTML email body.
 * Used for vendors that embed receipts in HTML rather than PDF attachments.
 *
 * @param {string} htmlBody
 * @returns {{ amount: number|null }|null}
 */
export function extractReceiptFromHtml(htmlBody) {
  if (!htmlBody) return null;

  const amountPatterns = [
    /(?:Total|Amount|Charge|Price|Cost)[\s:]*\$?([\d,]+\.\d{2})/gi,
    /\$([\d,]+\.\d{2})/g,
    /AUD\s*([\d,]+\.\d{2})/gi,
  ];

  let amount = null;
  for (const pattern of amountPatterns) {
    const matches = [...htmlBody.matchAll(pattern)];
    if (matches.length > 0) {
      // Take the last match (usually the total, not line items)
      const lastMatch = matches[matches.length - 1];
      const parsed = parseFloat(lastMatch[1].replace(/,/g, ''));
      if (parsed > 0 && parsed < 100000) {
        amount = parsed;
        break;
      }
    }
  }
  return { amount };
}

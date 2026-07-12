// Pure helpers for the receipt-acquittal daily loop. No env, no network — unit-testable.
// Spec: ~/.claude/skills/loop-me/workflows/receipt-acquittal.md

export const AUTOLINK_MIN_CONFIDENCE = 0.85; // matches the view's high_confidence_candidate bar
export const AMOUNT_EPSILON = 0.005;         // "to the cent"

const GENERIC_VENDOR_WORDS = new Set(['australia','australian','brisbane','sydney','melbourne','mascot','maleny','alice','springs','townsville','witta','pty','ltd','limited','inc','llc','corp','corporation','company','group','www','com','au','internet','banking','transfer','payment','payments','sales','service','services','station','store','stores','the','and','for','with','mount','mt','isa']);

export function cleanText(v) {
  return String(v || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function meaningfulTokens(v) {
  // >= 4 chars: aligns with the spec's auto-link bar and gmail-receipt-hunt.mjs, and shrinks
  // the substring false-match surface (a 3-char token can match inside a longer unrelated word).
  return cleanText(v).split(' ').filter((t) => t.length >= 4 && !GENERIC_VENDOR_WORDS.has(t));
}

/** The single strongest vendor token from a bank-line payee, or null. */
export function vendorToken(payee) {
  const toks = meaningfulTokens(payee);
  if (!toks.length) return null;
  return toks.sort((a, b) => b.length - a.length)[0];
}

export function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

/**
 * Strict auto-link decision — the money-critical bar. Returns { autoLink, reason }.
 * Auto-link ONLY when ALL hold: exact amount, vendor token present in the receipt,
 * exactly one candidate, and high confidence. Anything softer → residue (human decides).
 *
 * gap: { amount, payee, best_document_id, best_confidence, best_vendor_name, candidate_count }
 * doc: { amount_total, vendor_name, ocr_text } | null  (the best_document_id's row)
 */
export function classifyAutoLink(gap, doc) {
  if (!gap.best_document_id || !doc) return { autoLink: false, reason: 'no ingested candidate' };
  if (num(gap.candidate_count) !== 1) return { autoLink: false, reason: `${num(gap.candidate_count)} candidates (not sole)` };
  if (num(gap.best_confidence) < AUTOLINK_MIN_CONFIDENCE) return { autoLink: false, reason: `confidence ${num(gap.best_confidence).toFixed(2)} < ${AUTOLINK_MIN_CONFIDENCE}` };
  const amountExact = Math.abs(Math.abs(num(doc.amount_total)) - Math.abs(num(gap.amount))) < AMOUNT_EPSILON;
  if (!amountExact) return { autoLink: false, reason: 'amount not exact' };
  const tokens = meaningfulTokens(gap.payee);
  if (!tokens.length) return { autoLink: false, reason: 'no vendor token in payee' };
  // Corroborate against the authoritative best-candidate document only (vendor + OCR text).
  const hay = cleanText(`${doc.vendor_name || ''} ${doc.ocr_text || ''}`);
  const matched = tokens.find((t) => hay.includes(t));
  if (!matched) return { autoLink: false, reason: 'no payee token in receipt' };
  return { autoLink: true, reason: `exact $, token "${matched}", sole candidate, conf ${num(gap.best_confidence).toFixed(2)}` };
}

/** GST-at-risk approximation: GST-inclusive card spend → total / 11. EXPLICITLY an estimate. */
export function gstAtRiskEstimate(amounts) {
  return amounts.reduce((a, x) => a + Math.abs(num(x)) / 11, 0);
}

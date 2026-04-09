/**
 * Shared Gmail vendor query map used by:
 *   - scripts/gmail-deep-search.mjs (read-only reconnaissance)
 *   - scripts/gmail-to-xero-pipeline.mjs (apply pipeline)
 *
 * Each entry maps a normalized vendor name (lowercase, trimmed) to a Gmail
 * search query. The buildQuery() helper appends an after:/before: date window.
 *
 * Update when:
 *   - A vendor changes its billing email address
 *   - A new vendor appears in the bas-completeness MISSING list
 *   - gmail-deep-search runs show a query pattern that works but wasn't in the map
 *
 * Empty string ('') means "skip this vendor entirely" — used for bank fees.
 */
export const VENDOR_QUERY_MAP = {
  // ---- Apple ----
  'apple': '(from:apple.com OR from:itunes.com OR "apple pty ltd") (receipt OR invoice OR subscription OR charge)',
  'apple pty ltd': '(from:apple.com OR from:itunes.com) (receipt OR invoice OR subscription)',
  'apple australia': '(from:apple.com OR from:itunes.com) (receipt OR invoice OR subscription)',

  // ---- Qantas ----
  'qantas': '(from:qantas.com OR from:yourbooking.qantas) (receipt OR invoice OR itinerary OR e-ticket)',
  'qantas group accommodation': '(from:qantas.com OR from:yourbooking.qantas) (receipt OR invoice OR itinerary)',
  'qantas insurance': 'from:qantas.com insurance (receipt OR invoice)',

  // ---- Uber ----
  'uber': '(from:uber.com OR from:noreply@uber.com) (receipt OR trip)',
  'uber for business': 'from:uber.com (receipt OR trip)',

  // ---- SaaS via Stripe (many services use Stripe for billing) ----
  'stripe': 'from:stripe.com (receipt OR invoice)',

  // Anthropic / Claude
  'anthropic': '(from:anthropic.com OR from:stripe.com) (anthropic OR claude) (receipt OR invoice)',
  'claude.ai': '(from:anthropic.com OR from:stripe.com) (anthropic OR claude) (receipt OR invoice)',
  'claude': '(from:anthropic.com OR from:stripe.com) (anthropic OR claude) (receipt OR invoice)',

  // OpenAI / ChatGPT
  'openai': '(from:openai.com OR from:stripe.com) (openai OR chatgpt) (receipt OR invoice)',
  'chatgpt': '(from:openai.com OR from:stripe.com) (openai OR chatgpt) (receipt OR subscription)',

  // Google
  'google': '(from:google.com OR from:googlepayments.com) (receipt OR invoice OR charge OR payment)',
  'google australia': '(from:google.com OR from:googlepayments.com) (receipt OR invoice)',
  'google workspace': 'from:google.com (workspace OR "g suite") (invoice OR receipt)',
  'google cloud': 'from:google.com (cloud OR gcp) (invoice OR receipt)',
  'google ai studio': 'from:google.com ai (invoice OR receipt)',

  // Notion
  'notion labs': '(from:notion.so OR from:stripe.com) notion (receipt OR invoice)',
  'notion': '(from:notion.so OR from:stripe.com) notion (receipt OR invoice)',

  // Dev tools
  'figma': '(from:figma.com OR from:stripe.com) figma (receipt OR invoice)',
  'vercel': '(from:vercel.com OR from:stripe.com) vercel (receipt OR invoice)',
  'bitwarden': '(from:bitwarden.com OR from:stripe.com) bitwarden (receipt OR invoice)',
  'firecrawl': '(from:firecrawl.dev OR from:stripe.com) firecrawl (receipt OR invoice)',
  'cursor ai': '(from:cursor.sh OR from:cursor.com OR from:stripe.com) cursor (receipt OR invoice)',
  'dialpad': '(from:dialpad.com OR from:stripe.com) dialpad (receipt OR invoice)',
  'highlevel': '(from:gohighlevel.com OR from:msgsndr.com OR from:stripe.com) highlevel (receipt OR invoice)',
  'mighty networks': '(from:mightynetworks.com OR from:stripe.com) mighty (receipt OR invoice)',
  'squarespace': 'from:squarespace.com (receipt OR invoice OR renewal)',
  'squarespace domains': 'from:squarespace.com domain (receipt OR invoice OR renewal)',
  'warp': '(from:warp.dev OR from:stripe.com) warp (receipt OR invoice)',
  'kiro': '(from:kiro.ai OR from:stripe.com) kiro (receipt OR invoice)',
  'cognition ai': '(from:cognition.ai OR from:stripe.com) (receipt OR invoice)',
  'ideogram ai': '(from:ideogram.ai OR from:stripe.com) (receipt OR invoice)',
  'codeguide': '(from:codeguide OR from:stripe.com) (receipt OR invoice)',
  'docplay': '(from:docplay OR from:stripe.com) (receipt OR invoice)',
  'only domains': '(from:onlydomains OR from:stripe.com) domain (receipt OR invoice)',

  // Social / professional
  'linkedin singapore': 'from:linkedin.com (receipt OR invoice OR payment)',
  'linkedin': 'from:linkedin.com (receipt OR invoice OR payment)',

  // Communications / collaboration
  'paypal': 'from:paypal.com (receipt OR invoice OR payment)',
  'zapier': '(from:zapier.com OR from:stripe.com) zapier (receipt OR invoice)',

  // Utilities
  'telstra': 'from:telstra.com.au (bill OR invoice OR tax)',
  'agl': 'from:agl.com.au (bill OR invoice OR statement)',
  'belong': 'from:belong.com.au (bill OR invoice)',

  // Travel
  'booking.com': 'from:booking.com (confirmation OR receipt OR invoice)',
  'airbnb': 'from:airbnb (receipt OR invoice OR stay)',
  'thrifty': '(from:thrifty OR from:dollartht) (receipt OR invoice OR rental)',
  'avis': 'from:avis (receipt OR invoice OR rental)',
  'virgin australia': '(from:virginaustralia.com OR from:velocity) (receipt OR invoice OR itinerary)',
  'airnorth contact centre': 'from:airnorth (receipt OR invoice OR itinerary)',
  'hinterland aviation': 'from:hinterland (receipt OR invoice OR booking)',

  // Retail
  'amazon': 'from:amazon (receipt OR invoice OR order OR "tax invoice")',
  'amazon business': 'from:amazon business (receipt OR invoice OR order)',
  'amazon web services': 'from:amazon (aws OR "amazon web") (invoice OR statement)',
  'bunnings': '(from:bunnings.com.au OR from:powerpass) receipt',
  'bunnings warehouse': '(from:bunnings.com.au OR from:powerpass) receipt',

  // Xero
  'xero': 'from:xero.com (invoice OR receipt OR subscription)',
  'xero australia pty limited': 'from:xero.com (invoice OR receipt OR subscription)',

  // Humanitix
  'humanitix': 'from:humanitix.com (receipt OR confirmation OR invoice)',

  // Bank fees — no receipt possible, skip entirely
  'nab': '',
  'nab fee': '',
  'nab international fee': '',
  'nab fx margin': '',
  'bank fee': '',
};

export function buildGmailQuery(vendor, txDate, daysWindow = 7) {
  const key = (vendor || '').toLowerCase().trim();
  let base = VENDOR_QUERY_MAP[key];
  if (base === '') return null; // explicit skip (bank fees)
  if (!base) {
    // Fallback: use vendor first token as a fuzzy from/subject match
    const safe = key.replace(/[^a-z0-9 ]/g, '').trim();
    if (!safe) return null;
    const firstToken = safe.split(' ')[0];
    if (firstToken.length < 3) return null;
    base = `(from:${firstToken} OR "${safe}") (receipt OR invoice OR tax)`;
  }
  const d = new Date(txDate);
  const after = new Date(d.getTime() - daysWindow * 86400000).toISOString().slice(0, 10).replace(/-/g, '/');
  const before = new Date(d.getTime() + daysWindow * 86400000).toISOString().slice(0, 10).replace(/-/g, '/');
  return `${base} after:${after} before:${before}`;
}

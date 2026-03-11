#!/usr/bin/env node

/**
 * Backfill Historical Receipts to Dext
 *
 * Searches Gmail for receipt emails going back 12 months (vs the normal 3-day window)
 * and forwards them to Dext for processing. Uses the same vendor patterns and
 * forwarding logic as forward-receipts-to-dext.mjs.
 *
 * Usage:
 *   node scripts/backfill-receipts-to-dext.mjs                    # Dry run (default)
 *   node scripts/backfill-receipts-to-dext.mjs --apply            # Forward emails
 *   node scripts/backfill-receipts-to-dext.mjs --apply --batch 50 # Limit per run
 *   node scripts/backfill-receipts-to-dext.mjs --months 6         # Look back 6 months
 *   node scripts/backfill-receipts-to-dext.mjs --verbose          # Detailed output
 */

import { execSync } from 'child_process';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { recordSyncStatus } from './lib/sync-status.mjs';

const DEXT_EMAIL = 'nicmarchesi@dext.cc';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const VERBOSE = args.includes('--verbose');
const monthsBack = (() => {
  const idx = args.indexOf('--months');
  return idx !== -1 ? parseInt(args[idx + 1], 10) : 12;
})();
const batchLimit = (() => {
  const idx = args.indexOf('--batch');
  return idx !== -1 ? parseInt(args[idx + 1], 10) : Infinity;
})();

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function verbose(msg) {
  if (VERBOSE) log(msg);
}

// ============================================
// Secrets & Auth (same pattern as forward script)
// ============================================

let secretCache = null;

function loadSecrets() {
  if (secretCache) return secretCache;
  try {
    const token = execSync(
      'security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null',
      { encoding: 'utf8' }
    ).trim();
    const result = execSync(
      `BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`,
      { encoding: 'utf8' }
    );
    const secrets = JSON.parse(result);
    secretCache = {};
    for (const s of secrets) {
      secretCache[s.key] = s.value;
    }
    return secretCache;
  } catch (e) {
    return {};
  }
}

function getSecret(name) {
  const secrets = loadSecrets();
  return secrets[name] || process.env[name];
}

async function getGmailForUser(userEmail) {
  const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');

  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ],
    subject: userEmail,
  });

  await auth.authorize();
  return google.gmail({ version: 'v1', auth });
}

function getDelegatedUsers() {
  const multiUser = getSecret('GOOGLE_DELEGATED_USERS');
  if (multiUser) return multiUser.split(',').map(e => e.trim()).filter(Boolean);
  const singleUser = getSecret('GOOGLE_DELEGATED_USER');
  if (singleUser) return [singleUser.trim()];
  throw new Error('GOOGLE_DELEGATED_USERS or GOOGLE_DELEGATED_USER not configured');
}

function getSupabase() {
  const url = getSecret('SUPABASE_SHARED_URL') || getSecret('SUPABASE_URL') || getSecret('NEXT_PUBLIC_SUPABASE_URL');
  const key = getSecret('SUPABASE_SHARED_SERVICE_ROLE_KEY') || getSecret('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
}

// ============================================
// Vendor patterns (same as forward-receipts-to-dext.mjs)
// ============================================

function loadVendorPatterns() {
  return [
    // === Software & AI ===
    { name: 'Notion', from: ['notion.so', 'notionhq.com'] },
    { name: 'OpenAI', from: ['openai.com', 'email.openai.com', 'tm.openai.com'] },
    { name: 'Anthropic', from: ['anthropic.com'] },
    { name: 'Webflow', from: ['webflow.com'] },
    { name: 'Xero', from: ['xero.com'] },
    { name: 'Descript', from: ['descript.com'] },
    { name: 'Adobe', from: ['adobe.com'] },
    { name: 'Vercel', from: ['vercel.com'] },
    { name: 'Supabase', from: ['supabase.io', 'supabase.com'] },
    { name: 'HighLevel', from: ['gohighlevel.com', 'highlevel.com'] },
    { name: 'GitHub', from: ['github.com'] },
    { name: 'Codeguide', from: ['codeguide.dev'] },
    { name: 'Squarespace', from: ['squarespace.com'] },
    { name: 'Hostinger', from: ['hostinger.com'] },
    { name: 'Dialpad', from: ['dialpad.com'] },
    { name: 'Perplexity', from: ['perplexity.ai', 'mail.perplexity.ai'] },
    { name: 'Railway', from: ['railway.app', 'news.railway.app'] },
    { name: 'Upstash', from: ['upstash.com'] },
    { name: 'Zapier', from: ['zapier.com', 'mail.zapier.com', 'send.zapier.com'] },
    { name: 'Bitwarden', from: ['bitwarden.com'] },
    { name: 'Canva', from: ['canva.com'] },
    { name: 'Cognition AI', from: ['cognition.ai', 'cognitionlabs.ai'] },
    { name: 'Together.ai', from: ['together.ai'] },
    { name: 'Exa Labs', from: ['exa.ai'] },
    { name: 'Jetboost', from: ['jetboost.io'] },
    { name: 'SideGuide', from: ['sideguide.dev'] },
    { name: 'Easel Software', from: ['easel.tv', 'easelsoftware.com'] },
    { name: 'WizBang', from: ['wizbang.com.au'] },
    { name: 'Alibaba Cloud', from: ['alibabacloud.com', 'alibaba-inc.com'] },
    // === Payment processors ===
    { name: 'Stripe', from: ['stripe.com'] },
    { name: 'PayPal', from: ['paypal.com', 'paypal.com.au'] },
    { name: 'Paddle', from: ['paddle.com'] },
    // === Google / Apple / Amazon ===
    { name: 'Google', from: ['payments-noreply@google.com', 'google.com'] },
    { name: 'Apple', from: ['apple.com', 'email.apple.com'] },
    { name: 'Amazon', from: ['amazon.com', 'amazon.com.au'] },
    { name: 'AWS', from: ['amazonaws.com', 'aws.amazon.com'] },
    { name: 'Audible', from: ['audible.com', 'audible.com.au'] },
    // === Utilities & Insurance ===
    { name: 'Telstra', from: ['telstra.com', 'telstra.com.au'] },
    { name: 'AGL', from: ['agl.com.au'] },
    { name: 'Origin Energy', from: ['originenergy.com.au'] },
    { name: 'RACQ', from: ['racq.com.au'] },
    { name: 'AAMI', from: ['aami.com.au'] },
    { name: 'AIG Insurance', from: ['aig.com', 'aig.com.au'] },
    { name: 'Chubb Insurance', from: ['chubb.com'] },
    { name: 'Elders Insurance', from: ['eldersinsurance.com.au'] },
    { name: 'MetLife', from: ['metlife.com', 'metlife.com.au'] },
    { name: 'Sunshine Coast Council', from: ['sunshinecoast.qld.gov.au'] },
    { name: 'Prio Energy', from: ['prioenergy.com.au'] },
    // === Travel & Transport ===
    { name: 'Qantas', from: ['qantas.com', 'qantas.com.au'] },
    { name: 'Virgin Australia', from: ['virginaustralia.com'] },
    { name: 'Booking.com', from: ['booking.com'] },
    { name: 'Airbnb', from: ['airbnb.com'] },
    { name: 'Uber', from: ['uber.com'] },
    { name: 'Avis', from: ['avis.com', 'avis.com.au'] },
    { name: 'Budget', from: ['budget.com', 'budget.com.au'] },
    { name: 'Thrifty', from: ['thrifty.com.au'] },
    { name: 'Greyhound', from: ['greyhound.com.au'] },
    { name: 'SeaLink', from: ['sealink.com.au'] },
    { name: 'Tripsim', from: ['tripsim.com'] },
    { name: 'Garmin', from: ['garmin.com'] },
    // === Retail & Supplies ===
    { name: 'Bunnings', from: ['bunnings.com.au'] },
    { name: 'Woolworths', from: ['woolworths.com.au'] },
    { name: 'Kmart', from: ['kmart.com.au'] },
    { name: 'Dominos', from: ['dominos.com.au'] },
    { name: 'BP', from: ['bp.com', 'bp.com.au'] },
    { name: 'Kennards Hire', from: ['kennards.com.au'] },
    { name: 'Total Tools', from: ['totaltools.com.au'] },
    { name: 'Repco', from: ['repco.com.au'] },
    { name: 'Stratco', from: ['stratco.com.au'] },
    { name: 'Clark Rubber', from: ['clarkrubber.com.au'] },
    { name: 'New Aim', from: ['newaim.com.au'] },
    { name: 'Wild Earth', from: ['wildearth.com.au'] },
    // === Government ===
    { name: 'ATO', from: ['ato.gov.au'] },
    { name: 'Queensland Government', from: ['qld.gov.au'] },
    { name: 'NT Government', from: ['nt.gov.au'] },
    { name: 'Dept Transport QLD', from: ['tmr.qld.gov.au'] },
    // === Events & Orgs ===
    { name: 'Humanitix', from: ['humanitix.com'] },
    { name: 'The Funding Network', from: ['thefundingnetwork.com.au'] },
    { name: 'Woodford Folk Festival', from: ['woodfordfolkfestival.com'] },
    // === Storage & Equipment ===
    { name: 'Bionic Self Storage', from: ['bionicstorage.com.au'] },
    { name: 'Diggermate', from: ['diggermate.com.au'] },
    { name: 'Container Options', from: ['containeroptions.com.au'] },
    // === X/Twitter ===
    { name: 'X Global LLC', from: ['x.com', 'twitter.com'] },
  ];
}

// ============================================
// Gmail helpers (same logic as forward script)
// ============================================

function buildGmailQuery(vendorPatterns, monthsBack) {
  const afterDate = new Date();
  afterDate.setMonth(afterDate.getMonth() - monthsBack);
  const afterStr = `${afterDate.getFullYear()}/${afterDate.getMonth() + 1}/${afterDate.getDate()}`;

  const billingKeywords = 'receipt OR invoice OR payment OR billing OR subscription OR charge OR "order confirmation" OR statement';

  const fromClauses = [];
  for (const vendor of vendorPatterns) {
    for (const domain of vendor.from) {
      fromClauses.push(`from:${domain}`);
    }
  }

  return `(${fromClauses.join(' OR ')}) (${billingKeywords}) after:${afterStr}`;
}

function getHeader(headers, name) {
  const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return h?.value || '';
}

function isLikelyReceipt(subject, from) {
  const subjectLower = (subject || '').toLowerCase();
  const fromLower = (from || '').toLowerCase();

  const receiptSignals = [
    'receipt', 'invoice', 'tax invoice', 'your payment', 'payment confirmed',
    'order confirmation', 'e-ticket', 'booking confirmation', 'your trip with',
    'has been funded', 'your.*receipt', 'payment received',
  ];
  const hasReceiptSignal = receiptSignals.some(s =>
    s.includes('.*') ? new RegExp(s).test(subjectLower) : subjectLower.includes(s)
  );
  if (hasReceiptSignal) return true;

  const marketingSignals = [
    'earn up to', 'bonus points', 'don\'t miss', 'last chance',
    'off return flights', 'double points', 'new era of', 'love highlevel',
    'get paid to share', 'ecosystem', 'newsletter', 'new form submission',
    'don\'t forget your', 'smarter inventory', 'permission', 'introducing',
    'what\'s new', 'tips for', 'webinar', 'event invite',
  ];
  const hasMarketingSignal = marketingSignals.some(s => subjectLower.includes(s));
  if (hasMarketingSignal) return false;

  const billingFromPatterns = [
    'noreply@', 'no-reply@', 'no_reply@', 'receipts@', 'receipt@',
    'billing@', 'payments@', 'invoice@', 'invoices@', 'documents@',
    'payments-noreply@',
  ];
  if (billingFromPatterns.some(p => fromLower.includes(p))) return true;

  return false;
}

function identifyVendor(fromHeader, vendorPatterns) {
  if (!fromHeader) return 'unknown';
  const fromLower = fromHeader.toLowerCase();
  for (const vendor of vendorPatterns) {
    for (const domain of vendor.from) {
      if (fromLower.includes(domain)) return vendor.name;
    }
  }
  return 'unknown';
}

function buildForwardMessage(fromEmail, toEmail, subject, rawBase64) {
  const rawBuffer = Buffer.from(rawBase64, 'base64url');
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const fwdSubject = subject.startsWith('Fwd:') ? subject : `Fwd: ${subject}`;

  const mimeMessage = [
    `From: ${fromEmail}`,
    `To: ${toEmail}`,
    `Subject: ${fwdSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    `Forwarded receipt for Dext processing (backfill).`,
    ``,
    `--${boundary}`,
    `Content-Type: message/rfc822`,
    `Content-Disposition: attachment; filename="original-receipt.eml"`,
    ``,
    rawBuffer.toString('utf-8'),
    ``,
    `--${boundary}--`,
  ].join('\r\n');

  return Buffer.from(mimeMessage).toString('base64url');
}

// ============================================
// Main
// ============================================

async function main() {
  log('=== Receipt Backfill to Dext ===');
  log(`Searching ${monthsBack} months of email history`);
  log(APPLY ? `MODE: APPLY (batch limit: ${batchLimit === Infinity ? 'unlimited' : batchLimit})` : 'MODE: DRY RUN');

  const supabase = getSupabase();
  const users = getDelegatedUsers();
  const vendorPatterns = loadVendorPatterns();

  // Load already-forwarded message IDs for dedup
  const { data: forwarded } = await supabase
    .from('dext_forwarded_emails')
    .select('gmail_message_id');

  const alreadyForwarded = new Set((forwarded || []).map(r => r.gmail_message_id));
  log(`${alreadyForwarded.size} emails already forwarded (will skip)`);

  const query = buildGmailQuery(vendorPatterns, monthsBack);
  verbose(`Gmail query length: ${query.length} chars`);

  const totals = { found: 0, receipts: 0, forwarded: 0, skipped: 0, errors: 0 };
  const vendorCounts = {};
  let totalForwarded = 0;

  for (const userEmail of users) {
    if (totalForwarded >= batchLimit) break;

    log(`\nScanning ${userEmail}...`);

    let gmail;
    try {
      gmail = await getGmailForUser(userEmail);
    } catch (err) {
      log(`  ERROR auth: ${err.message}`);
      totals.errors++;
      continue;
    }

    // Search all billing emails
    let messages = [];
    let pageToken;
    try {
      do {
        const res = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 100,
          pageToken,
        });
        if (res.data.messages) messages.push(...res.data.messages);
        pageToken = res.data.nextPageToken;
      } while (pageToken);
    } catch (err) {
      log(`  ERROR search: ${err.message}`);
      totals.errors++;
      continue;
    }

    log(`  Found ${messages.length} billing emails`);
    totals.found += messages.length;

    const forwardBatch = [];

    for (const msg of messages) {
      if (totalForwarded >= batchLimit) break;

      if (alreadyForwarded.has(msg.id)) {
        totals.skipped++;
        continue;
      }

      try {
        const res = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Message-ID'],
        });

        const headers = res.data.payload?.headers || [];
        const subject = getHeader(headers, 'Subject');
        const from = getHeader(headers, 'From');
        const date = getHeader(headers, 'Date');

        if (!isLikelyReceipt(subject, from)) {
          totals.skipped++;
          continue;
        }

        totals.receipts++;
        const vendor = identifyVendor(from, vendorPatterns);
        vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;

        if (!APPLY) {
          verbose(`  ${vendor}: "${subject}" (${date})`);
          continue;
        }

        // Get raw and forward
        const rawRes = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'raw',
        });

        const encoded = buildForwardMessage(userEmail, DEXT_EMAIL, subject, rawRes.data.raw);
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: encoded },
        });

        forwardBatch.push({
          gmail_message_id: msg.id,
          mailbox: userEmail,
          vendor,
          subject: subject?.slice(0, 500),
          original_date: date,
          forwarded_at: new Date().toISOString(),
        });

        totalForwarded++;
        totals.forwarded++;
        alreadyForwarded.add(msg.id);
        verbose(`  FORWARDED: ${vendor} — "${subject}"`);

        // Rate limit: 1 email/second
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        log(`  ERROR ${msg.id}: ${err.message}`);
        totals.errors++;
      }
    }

    // Record forwarded batch
    if (forwardBatch.length > 0) {
      const { error } = await supabase
        .from('dext_forwarded_emails')
        .upsert(forwardBatch, { onConflict: 'gmail_message_id' });

      if (error) log(`  DB error: ${error.message}`);
    }
  }

  // Summary
  log('\n=== Summary ===');
  log(`Emails found:     ${totals.found}`);
  log(`Likely receipts:  ${totals.receipts}`);
  log(`Forwarded:        ${totals.forwarded}`);
  log(`Already done:     ${totals.skipped}`);
  log(`Errors:           ${totals.errors}`);

  log('\nBy vendor:');
  const sorted = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1]);
  for (const [vendor, count] of sorted) {
    log(`  ${vendor}: ${count}`);
  }

  if (APPLY) {
    await recordSyncStatus(supabase, 'dext_receipt_backfill', {
      success: totals.errors === 0,
      recordCount: totals.forwarded,
    });
  } else {
    log('\nDRY RUN — use --apply to forward emails');
  }
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});

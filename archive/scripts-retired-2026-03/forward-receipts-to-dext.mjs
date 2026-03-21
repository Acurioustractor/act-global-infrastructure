#!/usr/bin/env node

/**
 * Forward Billing Receipts to Dext via Gmail API
 *
 * Scans all delegated mailboxes for billing/receipt emails from known vendors,
 * forwards them to Dext for automated bookkeeping. Uses the same service account
 * + domain-wide delegation as sync-gmail-to-supabase.mjs.
 *
 * Tracked in integration_health via sync_status table.
 *
 * Usage:
 *   node scripts/forward-receipts-to-dext.mjs              # Default: last 3 days
 *   node scripts/forward-receipts-to-dext.mjs --days 7     # Last 7 days
 *   node scripts/forward-receipts-to-dext.mjs --dry-run    # Preview without forwarding
 *   node scripts/forward-receipts-to-dext.mjs --verbose    # Detailed output
 */

import { execSync } from 'child_process';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { recordSyncStatus } from './lib/sync-status.mjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEXT_EMAIL = 'nicmarchesi@dext.cc';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const daysBack = (() => {
  const idx = args.indexOf('--days');
  return idx !== -1 ? parseInt(args[idx + 1], 10) : 3;
})();

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function verbose(msg) {
  if (VERBOSE) log(msg);
}

// ============================================
// Secrets & Auth (same pattern as gmail sync)
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
// Vendor patterns (from dext-supplier-rules.json + apps-scripts patterns)
// ============================================

function loadVendorPatterns() {
  // Vendor → Gmail from: patterns (email domains / sender addresses)
  // Expanded from Dext export (383 receipts, 181 vendors) + known billing domains
  const vendors = [
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
    { name: 'Obsidian', from: ['obsidian.md'] },
    { name: 'Warp', from: ['warp.dev'] },
    { name: 'Landingfolio', from: ['landingfolio.com'] },
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

    // === Health & Subscriptions ===
    { name: 'AHM', from: ['ahm.com.au'] },
    { name: 'HelloFresh', from: ['hellofresh.com', 'hellofresh.com.au'] },
    { name: 'Spotify', from: ['spotify.com'] },
    { name: 'Midjourney', from: ['midjourney.com'] },
    { name: 'Mighty Networks', from: ['mightynetworks.com'] },
    { name: 'Cursor AI', from: ['cursor.sh', 'cursor.com'] },
    { name: 'DocPlay', from: ['docplay.com'] },
    { name: 'Firecrawl', from: ['firecrawl.dev'] },
    { name: 'Linktree', from: ['linktr.ee', 'linktree.com'] },
    { name: 'GoGet', from: ['goget.com.au'] },
    { name: 'Vidzflow', from: ['vidzflow.com'] },
    { name: 'Only Domains', from: ['onlydomains.com'] },
    { name: 'Ticketmaster', from: ['ticketmaster.com', 'ticketmaster.com.au'] },

    // === Accommodation ===
    { name: 'Wotif', from: ['wotif.com'] },
    { name: 'Expedia', from: ['expedia.com', 'expedia.com.au'] },
    { name: 'Agoda', from: ['agoda.com'] },
  ];

  return vendors;
}

// ============================================
// Gmail search & forward
// ============================================

function buildGmailQuery(vendorPatterns, daysBack) {
  const afterDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const afterStr = `${afterDate.getFullYear()}/${afterDate.getMonth() + 1}/${afterDate.getDate()}`;

  // Gmail search: match billing emails from known vendor domains
  const billingKeywords = 'receipt OR invoice OR payment OR billing OR subscription OR charge OR "order confirmation" OR statement';

  // Collect all unique from patterns (email domains)
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

// Filter: is this actually a receipt/invoice, not marketing?
function isLikelyReceipt(subject, from) {
  const subjectLower = (subject || '').toLowerCase();
  const fromLower = (from || '').toLowerCase();

  // Strong receipt indicators — if any match, it's a receipt
  const receiptSignals = [
    'receipt', 'invoice', 'tax invoice', 'your payment', 'payment confirmed',
    'order confirmation', 'e-ticket', 'booking confirmation', 'your trip with',
    'has been funded', 'your.*receipt', 'payment received',
  ];
  const hasReceiptSignal = receiptSignals.some(s =>
    s.includes('.*') ? new RegExp(s).test(subjectLower) : subjectLower.includes(s)
  );
  if (hasReceiptSignal) return true;

  // Strong marketing indicators — reject these
  const marketingSignals = [
    'earn up to', 'bonus points', 'don\'t miss', 'last chance',
    'off return flights', 'double points', 'new era of', 'love highlevel',
    'get paid to share', 'ecosystem', 'newsletter', 'new form submission',
    'don\'t forget your', 'smarter inventory', 'permission', 'introducing',
    'what\'s new', 'tips for', 'webinar', 'event invite',
  ];
  const hasMarketingSignal = marketingSignals.some(s => subjectLower.includes(s));
  if (hasMarketingSignal) return false;

  // Receipts from noreply/billing/payments addresses are likely real
  const billingFromPatterns = [
    'noreply@', 'no-reply@', 'no_reply@', 'receipts@', 'receipt@',
    'billing@', 'payments@', 'invoice@', 'invoices@', 'documents@',
    'payments-noreply@',
  ];
  if (billingFromPatterns.some(p => fromLower.includes(p))) return true;

  // Default: reject (better to miss a few than flood Dext with spam)
  return false;
}

async function searchBillingEmails(gmail, query) {
  const messages = [];
  let pageToken;

  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100,
      pageToken,
    });
    if (res.data.messages) {
      messages.push(...res.data.messages);
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return messages;
}

async function getMessageMetadata(gmail, messageId) {
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'metadata',
    metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Message-ID'],
  });
  return res.data;
}

async function getRawMessage(gmail, messageId) {
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'raw',
  });
  return res.data.raw; // base64url encoded
}

function buildForwardMessage(fromEmail, toEmail, subject, rawBase64) {
  // Decode the raw message
  const rawBuffer = Buffer.from(rawBase64, 'base64url');

  // Build a new MIME message that wraps the original as an attachment
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
    `Forwarded receipt for Dext processing.`,
    ``,
    `--${boundary}`,
    `Content-Type: message/rfc822`,
    `Content-Disposition: attachment; filename="original-receipt.eml"`,
    ``,
    rawBuffer.toString('utf-8'),
    ``,
    `--${boundary}--`,
  ].join('\r\n');

  // Encode as base64url for Gmail API
  return Buffer.from(mimeMessage).toString('base64url');
}

async function forwardMessage(gmail, fromEmail, messageId, subject, rawBase64) {
  const encoded = buildForwardMessage(fromEmail, DEXT_EMAIL, subject, rawBase64);

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encoded,
    },
  });

  return res.data.id;
}

// ============================================
// Deduplication via Supabase
// ============================================

async function getAlreadyForwarded(supabase) {
  const { data, error } = await supabase
    .from('dext_forwarded_emails')
    .select('gmail_message_id');

  if (error) {
    // Table might not exist yet — that's OK
    if (error.code === '42P01') {
      log('dext_forwarded_emails table not found — will create via migration');
      return new Set();
    }
    console.warn('Warning: Could not fetch forwarded emails:', error.message);
    return new Set();
  }

  return new Set((data || []).map(r => r.gmail_message_id));
}

async function recordForwarded(supabase, records) {
  if (records.length === 0) return;

  const { error } = await supabase
    .from('dext_forwarded_emails')
    .upsert(records, { onConflict: 'gmail_message_id' });

  if (error) {
    console.warn('Warning: Could not record forwarded emails:', error.message);
  }
}

// ============================================
// Main
// ============================================

async function main() {
  const startTime = Date.now();
  log('=== Dext Receipt Forwarding ===');
  log(`Scanning last ${daysBack} days across all mailboxes`);
  if (DRY_RUN) log('DRY RUN MODE — no emails will be forwarded');

  const supabase = getSupabase();
  const users = getDelegatedUsers();
  const vendorPatterns = loadVendorPatterns();
  log(`Loaded ${vendorPatterns.length} vendor patterns`);
  verbose(`Vendors: ${vendorPatterns.map(v => v.name).join(', ')}`);

  const alreadyForwarded = await getAlreadyForwarded(supabase);
  log(`${alreadyForwarded.size} emails already forwarded (skipping)`);

  const query = buildGmailQuery(vendorPatterns, daysBack);
  verbose(`Gmail query: ${query}`);

  const totals = { scanned: 0, forwarded: 0, skipped: 0, errors: 0 };

  for (const userEmail of users) {
    log(`\nScanning ${userEmail}...`);

    let gmail;
    try {
      gmail = await getGmailForUser(userEmail);
    } catch (err) {
      log(`  ERROR: Could not authenticate for ${userEmail}: ${err.message}`);
      totals.errors++;
      continue;
    }

    let messages;
    try {
      messages = await searchBillingEmails(gmail, query);
    } catch (err) {
      log(`  ERROR: Search failed for ${userEmail}: ${err.message}`);
      totals.errors++;
      continue;
    }

    log(`  Found ${messages.length} billing emails`);
    totals.scanned += messages.length;

    const forwardBatch = [];

    for (const msg of messages) {
      if (alreadyForwarded.has(msg.id)) {
        verbose(`  SKIP (already forwarded): ${msg.id}`);
        totals.skipped++;
        continue;
      }

      try {
        const metadata = await getMessageMetadata(gmail, msg.id);
        const headers = metadata.payload?.headers || [];
        const subject = getHeader(headers, 'Subject');
        const from = getHeader(headers, 'From');
        const date = getHeader(headers, 'Date');

        verbose(`  Processing: "${subject}" from ${from} (${date})`);

        if (!isLikelyReceipt(subject, from)) {
          verbose(`  SKIP (marketing/promo): "${subject}"`);
          totals.skipped++;
          continue;
        }

        if (DRY_RUN) {
          log(`  WOULD FORWARD: "${subject}" from ${from}`);
          totals.forwarded++;
          continue;
        }

        // Get raw message and forward it
        const raw = await getRawMessage(gmail, msg.id);
        const sentId = await forwardMessage(gmail, userEmail, msg.id, subject, raw);

        verbose(`  FORWARDED → ${DEXT_EMAIL} (sent ID: ${sentId})`);

        forwardBatch.push({
          gmail_message_id: msg.id,
          mailbox: userEmail,
          vendor: identifyVendor(from, vendorPatterns),
          subject: subject?.slice(0, 500),
          original_date: date,
          forwarded_at: new Date().toISOString(),
        });

        totals.forwarded++;

        // Rate limit: Gmail API allows 250 quota units/sec for sending
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        log(`  ERROR forwarding ${msg.id}: ${err.message}`);
        totals.errors++;
      }
    }

    // Record forwarded emails in batch
    if (forwardBatch.length > 0) {
      await recordForwarded(supabase, forwardBatch);
    }
  }

  // Summary
  const durationMs = Date.now() - startTime;
  log('\n=== Summary ===');
  log(`Scanned: ${totals.scanned} | Forwarded: ${totals.forwarded} | Skipped: ${totals.skipped} | Errors: ${totals.errors}`);
  log(`Duration: ${(durationMs / 1000).toFixed(1)}s`);

  // Record to integration health
  if (!DRY_RUN) {
    await recordSyncStatus(supabase, 'dext_receipt_forwarding', {
      success: totals.errors === 0,
      recordCount: totals.forwarded,
      durationMs,
      error: totals.errors > 0 ? `${totals.errors} forwarding errors` : undefined,
    });
    log('Integration health updated');
  }
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

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

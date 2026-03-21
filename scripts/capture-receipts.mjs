#!/usr/bin/env node

/**
 * Capture Receipt Emails → Supabase (replaces forward-receipts-to-dext.mjs)
 *
 * Scans all delegated Gmail mailboxes for billing/receipt emails from known vendors.
 * Downloads attachments and stores them in Supabase Storage.
 * Inserts metadata into receipt_emails table for matching pipeline.
 *
 * Usage:
 *   node scripts/capture-receipts.mjs              # Default: last 3 days
 *   node scripts/capture-receipts.mjs --days 7     # Last 7 days
 *   node scripts/capture-receipts.mjs --days 90    # Full backfill
 *   node scripts/capture-receipts.mjs --dry-run    # Preview without saving
 *   node scripts/capture-receipts.mjs --verbose    # Detailed output
 *   node scripts/capture-receipts.mjs --mailbox benjamin@act.place  # Single mailbox
 */

import { execSync } from 'child_process';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { recordSyncStatus } from './lib/sync-status.mjs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const daysBack = (() => {
  const idx = args.indexOf('--days');
  return idx !== -1 ? parseInt(args[idx + 1], 10) : 3;
})();
const singleMailbox = (() => {
  const idx = args.indexOf('--mailbox');
  return idx !== -1 ? args[idx + 1] : null;
})();

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}
function verbose(msg) {
  if (VERBOSE) log(msg);
}

// ============================================================================
// SECRETS & AUTH (same pattern as forward-receipts-to-dext.mjs)
// ============================================================================

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
    for (const s of secrets) secretCache[s.key] = s.value;
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
    ],
    subject: userEmail,
  });

  await auth.authorize();
  return google.gmail({ version: 'v1', auth });
}

function getDelegatedUsers() {
  if (singleMailbox) return [singleMailbox];
  const multiUser = getSecret('GOOGLE_DELEGATED_USERS');
  if (multiUser) return multiUser.split(',').map(e => e.trim()).filter(Boolean);
  const singleUser = getSecret('GOOGLE_DELEGATED_USER');
  if (singleUser) return [singleUser.trim()];
  throw new Error('GOOGLE_DELEGATED_USERS not configured');
}

function getSupabase() {
  const url = getSecret('SUPABASE_SHARED_URL') || getSecret('SUPABASE_URL') || getSecret('NEXT_PUBLIC_SUPABASE_URL');
  const key = getSecret('SUPABASE_SHARED_SERVICE_ROLE_KEY') || getSecret('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
}

// ============================================================================
// VENDOR PATTERNS (same as forward-receipts-to-dext.mjs — 126 vendors)
// ============================================================================

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
    // REMOVED: Codeguide — unauthorised charges, disputed with NAB 2026-03-17
    // { name: 'Codeguide', from: ['codeguide.dev'] },
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
    { name: 'Claude.AI', from: ['anthropic.com'] },
    { name: 'ChatGPT', from: ['openai.com'] },
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
}

// ============================================================================
// RECEIPT DETECTION (reused from forward-receipts-to-dext.mjs)
// ============================================================================

function isLikelyReceipt(subject, from) {
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

// Vendors that send HTML receipts (no PDF attachment) — need special handling
const HTML_RECEIPT_VENDORS = new Set([
  'uber', 'apple', 'telstra', 'garmin', 'obsidian',
  'highlevel', 'mighty networks', 'docplay', 'audible',
]);

function isHtmlReceiptVendor(vendorName) {
  return vendorName && HTML_RECEIPT_VENDORS.has(vendorName.toLowerCase());
}

// Extract receipt data from HTML email body
function extractReceiptFromHtml(htmlBody) {
  if (!htmlBody) return null;
  // Look for amounts in HTML
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

function identifyVendor(fromHeader, vendorPatterns) {
  if (!fromHeader) return null;
  const fromLower = fromHeader.toLowerCase();
  for (const vendor of vendorPatterns) {
    for (const domain of vendor.from) {
      if (fromLower.includes(domain)) return vendor.name;
    }
  }
  return null;
}

// ============================================================================
// AMOUNT EXTRACTION from email subject/snippet
// ============================================================================

function extractAmount(text) {
  if (!text) return null;
  // Match patterns: $123.45, AUD 123.45, A$123.45, Total: $123.45
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
// GMAIL SEARCH
// ============================================================================

function buildGmailQuery(vendorPatterns, daysBack) {
  const afterDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
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
    if (res.data.messages) messages.push(...res.data.messages);
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return messages;
}

// ============================================================================
// ATTACHMENT HANDLING
// ============================================================================

const RECEIPT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
]);

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB (Xero limit)

async function getMessageWithAttachments(gmail, messageId) {
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });
  return res.data;
}

function findAttachmentParts(parts, result = []) {
  if (!parts) return result;
  for (const part of parts) {
    if (part.filename && part.body?.attachmentId) {
      if (RECEIPT_MIME_TYPES.has(part.mimeType)) {
        result.push({
          filename: part.filename,
          mimeType: part.mimeType,
          attachmentId: part.body.attachmentId,
          size: part.body.size || 0,
        });
      }
    }
    if (part.parts) findAttachmentParts(part.parts, result);
  }
  return result;
}

// Find HTML body part from email payload (for HTML receipt extraction)
function findHtmlPart(payload) {
  if (!payload) return null;
  // Direct HTML body
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf8');
  }
  // Nested parts
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf8');
      }
      // Deeper nesting (multipart/alternative inside multipart/mixed)
      if (part.parts) {
        const nested = findHtmlPart(part);
        if (nested) return nested;
      }
    }
  }
  return null;
}

async function downloadAttachment(gmail, messageId, attachmentId) {
  const res = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId,
  });
  // Gmail returns base64url-encoded data
  return Buffer.from(res.data.data, 'base64url');
}

async function uploadToStorage(supabase, filePath, fileBuffer, contentType) {
  const { data, error } = await supabase.storage
    .from('receipt-attachments')
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    // If file already exists, that's fine (dedup)
    if (error.message?.includes('already exists') || error.statusCode === '409') {
      return filePath;
    }
    // Storage quota exceeded — alert and throw
    if (error.message?.includes('quota') || error.message?.includes('storage limit') || error.statusCode === '413') {
      log('CRITICAL: Supabase Storage quota may be exceeded — receipt capture paused');
      try {
        const { sendTelegram } = await import('./lib/telegram.mjs');
        await sendTelegram('🚨 *Receipt Capture Alert*\nSupabase Storage quota may be exceeded. Receipt capture paused.\n\nCheck storage usage in Supabase dashboard.');
      } catch { /* telegram not critical */ }
    }
    throw error;
  }
  return data.path;
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

async function getAlreadyCaptured(supabase) {
  // Fetch all gmail_message_ids from receipt_emails + dext_forwarded_emails
  const ids = new Set();

  // receipt_emails (new pipeline)
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('receipt_emails')
      .select('gmail_message_id')
      .not('gmail_message_id', 'is', null)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) break;
    for (const row of data || []) ids.add(row.gmail_message_id);
    if (!data || data.length < PAGE_SIZE) break;
    page++;
  }

  // dext_forwarded_emails (old pipeline — don't recapture these)
  const { data: forwarded } = await supabase
    .from('dext_forwarded_emails')
    .select('gmail_message_id');
  for (const row of forwarded || []) ids.add(row.gmail_message_id);

  return ids;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const startTime = Date.now();
  log('=== Receipt Capture (Gmail → Supabase) ===');
  log(`Scanning last ${daysBack} days`);
  if (DRY_RUN) log('DRY RUN — nothing will be saved');

  const supabase = getSupabase();
  const users = getDelegatedUsers();
  const vendorPatterns = loadVendorPatterns();
  log(`${vendorPatterns.length} vendor patterns, ${users.length} mailbox(es)`);

  const alreadyCaptured = await getAlreadyCaptured(supabase);
  log(`${alreadyCaptured.size} emails already captured (skipping)`);

  const query = buildGmailQuery(vendorPatterns, daysBack);
  verbose(`Query: ${query.slice(0, 200)}...`);

  const totals = { scanned: 0, captured: 0, skipped: 0, noAttachment: 0, errors: 0 };

  for (const userEmail of users) {
    log(`\nScanning ${userEmail}...`);

    let gmail;
    try {
      gmail = await getGmailForUser(userEmail);
    } catch (err) {
      log(`  ERROR auth: ${err.message}`);
      totals.errors++;
      continue;
    }

    let messages;
    try {
      messages = await searchBillingEmails(gmail, query);
    } catch (err) {
      log(`  ERROR search: ${err.message}`);
      totals.errors++;
      continue;
    }

    log(`  Found ${messages.length} billing emails`);
    totals.scanned += messages.length;

    // PHASE A: Metadata-first pass — fetch only headers to classify
    const toFetch = [];
    let mailboxSkipped = 0;
    let mailboxMarketing = 0;
    for (const msg of messages) {
      if (alreadyCaptured.has(msg.id)) {
        totals.skipped++;
        mailboxSkipped++;
        continue;
      }

      try {
        // Lightweight fetch: metadata only (no body/attachments)
        const metaRes = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });
        const headers = metaRes.data.payload?.headers || [];
        const subject = getHeader(headers, 'Subject');
        const from = getHeader(headers, 'From');
        const date = getHeader(headers, 'Date');

        if (!isLikelyReceipt(subject, from)) {
          verbose(`  SKIP (marketing): "${subject}"`);
          mailboxMarketing++;
          continue;
        }

        toFetch.push({ id: msg.id, subject, from, date });
      } catch (err) {
        totals.errors++;
      }
    }

    log(`  ${toFetch.length} receipts identified, ${mailboxMarketing} marketing filtered, ${mailboxSkipped} already captured`);

    // PHASE B: Full fetch only for identified receipts
    for (const msg of toFetch) {
      try {
        const fullMessage = await getMessageWithAttachments(gmail, msg.id);
        const vendor = identifyVendor(msg.from, vendorPatterns);
        const amount = extractAmount(msg.subject) || extractAmount(fullMessage.snippet);

        // Find PDF/image attachments
        const attachments = findAttachmentParts(fullMessage.payload?.parts);

        // Also check if the email itself has an inline attachment
        if (fullMessage.payload?.body?.attachmentId && fullMessage.payload?.filename) {
          if (RECEIPT_MIME_TYPES.has(fullMessage.payload.mimeType)) {
            attachments.push({
              filename: fullMessage.payload.filename,
              mimeType: fullMessage.payload.mimeType,
              attachmentId: fullMessage.payload.body.attachmentId,
              size: fullMessage.payload.body.size || 0,
            });
          }
        }

        if (attachments.length === 0) {
          // No PDF attachment — try HTML receipt extraction for known vendors
          let htmlAmount = amount;
          if (isHtmlReceiptVendor(vendor)) {
            // Decode email body HTML
            const htmlPart = findHtmlPart(fullMessage.payload);
            if (htmlPart) {
              const htmlData = extractReceiptFromHtml(htmlPart);
              if (htmlData?.amount && !htmlAmount) htmlAmount = htmlData.amount;
            }
            verbose(`  HTML RECEIPT: "${msg.subject}" from ${vendor} — $${htmlAmount || '?'}`);
          } else {
            verbose(`  NO ATTACH: "${msg.subject}" from ${vendor || msg.from}`);
          }
          totals.noAttachment++;

          if (!DRY_RUN) {
            await supabase.from('receipt_emails').upsert({
              gmail_message_id: msg.id,
              mailbox: userEmail,
              from_email: msg.from,
              subject: msg.subject?.slice(0, 500),
              received_at: msg.date ? new Date(msg.date).toISOString() : null,
              vendor_name: vendor,
              amount_detected: htmlAmount,
              source: 'gmail',
              status: 'captured',
            }, { onConflict: 'gmail_message_id' });
          }
          totals.captured++;
          continue;
        }

        // Download and upload the first receipt-like attachment
        const bestAttachment = attachments[0];

        if (bestAttachment.size > MAX_ATTACHMENT_SIZE) {
          log(`  SKIP (too large): ${bestAttachment.filename} (${(bestAttachment.size / 1024 / 1024).toFixed(1)}MB)`);
          totals.skipped++;
          continue;
        }

        verbose(`  CAPTURE: "${msg.subject}" from ${vendor || 'unknown'} — ${bestAttachment.filename}`);

        if (!DRY_RUN) {
          const fileBuffer = await downloadAttachment(gmail, msg.id, bestAttachment.attachmentId);

          const storagePath = `${userEmail}/${new Date().getFullYear()}/${msg.id}/${bestAttachment.filename}`;
          const uploadedPath = await uploadToStorage(supabase, storagePath, fileBuffer, bestAttachment.mimeType);

          // Try extracting amount from PDF if not found in subject
          let detectedAmount = amount;
          if (!detectedAmount && bestAttachment.mimeType === 'application/pdf') {
            // Skip PDF parsing for files >5MB to prevent OOM
            if (fileBuffer.length > 5 * 1024 * 1024) {
              verbose(`    SKIP PDF parse (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB > 5MB limit)`);
            } else {
              try {
                const pdfParse = (await import('pdf-parse')).default;
                const { text } = await pdfParse(fileBuffer);
                detectedAmount = extractAmount(text);
                if (detectedAmount) verbose(`    PDF extracted: $${detectedAmount}`);
              } catch (e) {
                verbose(`    PDF parse failed: ${e.message?.slice(0, 100)}`);
              }
            }
          }

          await supabase.from('receipt_emails').upsert({
            gmail_message_id: msg.id,
            mailbox: userEmail,
            from_email: msg.from,
            subject: msg.subject?.slice(0, 500),
            received_at: msg.date ? new Date(msg.date).toISOString() : null,
            vendor_name: vendor,
            amount_detected: detectedAmount,
            attachment_url: `receipt-attachments/${uploadedPath}`,
            attachment_filename: bestAttachment.filename,
            attachment_content_type: bestAttachment.mimeType,
            attachment_size_bytes: fileBuffer.length,
            source: 'gmail',
            status: 'captured',
          }, { onConflict: 'gmail_message_id' });
        }

        totals.captured++;
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        log(`  ERROR ${msg.id}: ${err.message}`);
        totals.errors++;
        // Track DNS/network failures for alerting
        if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.message?.includes('getaddrinfo')) {
          totals.dnsErrors = (totals.dnsErrors || 0) + 1;
        }
      }
    }
  }

  // Alert on repeated DNS/network failures
  if (totals.dnsErrors >= 3) {
    log(`WARNING: ${totals.dnsErrors} DNS/network failures detected`);
    try {
      const { sendTelegram } = await import('./lib/telegram.mjs');
      await sendTelegram(`⚠️ *Receipt Capture*\n${totals.dnsErrors} DNS/network failures during capture.\nGmail API may be unreachable. Check network connectivity.`);
    } catch { /* telegram not critical */ }
  }

  // Summary
  const durationMs = Date.now() - startTime;
  log('\n=== Summary ===');
  log(`Scanned: ${totals.scanned} | Captured: ${totals.captured} | No attachment: ${totals.noAttachment} | Skipped: ${totals.skipped} | Errors: ${totals.errors}`);
  log(`Duration: ${(durationMs / 1000).toFixed(1)}s`);

  if (!DRY_RUN) {
    await recordSyncStatus(supabase, 'receipt_capture', {
      success: totals.errors === 0,
      recordCount: totals.captured,
      durationMs,
      error: totals.errors > 0 ? `${totals.errors} capture errors` : undefined,
    });
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * ACT Gmail Sync
 *
 * Syncs Gmail emails to Supabase communications_history with:
 * - Service account + domain-wide delegation
 * - Contact matching via ghl_contacts
 * - Incremental sync via message_id deduplication
 *
 * Usage:
 *   node scripts/sync-gmail-to-supabase.mjs              # Default: 7 days back
 *   node scripts/sync-gmail-to-supabase.mjs --days 14    # 14 days back
 *   node scripts/sync-gmail-to-supabase.mjs --dry-run    # Preview without writing
 *   node scripts/sync-gmail-to-supabase.mjs --verbose    # Detailed output
 */

import { execSync } from 'child_process';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { sendDiscordMessage, sendEmbed } from './discord-notify.mjs';
import OpenAI from 'openai';
import { batchMatchOrCreate } from './lib/contact-intelligence.mjs';
import { isOwnDomainEmail } from './lib/cultural-guard.mjs';

// Stats tracking
const stats = {
  fetched: 0,
  inserted: 0,
  skipped: 0,
  matched: 0,
  errors: 0,
  startTime: Date.now()
};

// Send Discord notification on sync completion
async function notifyDiscord(status, errorMessage = null) {
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);

  if (status === 'success' || status === 'partial') {
    const embed = {
      title: status === 'success' ? 'Gmail Sync Complete' : 'Gmail Sync Partial',
      color: status === 'success' ? 0x57F287 : 0xFEE75C,
      description: `Completed in ${duration}s`,
      fields: [
        { name: 'Fetched', value: stats.fetched.toString(), inline: true },
        { name: 'Inserted', value: stats.inserted.toString(), inline: true },
        { name: 'Skipped', value: stats.skipped.toString(), inline: true },
        { name: 'Contact Matches', value: stats.matched.toString(), inline: true },
        { name: 'AI Enriched', value: (stats.enriched || 0).toString(), inline: true },
        { name: 'Errors', value: stats.errors.toString(), inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'ACT Gmail Sync' }
    };

    await sendEmbed('general', embed);
  } else if (status === 'error') {
    const embed = {
      title: 'Gmail Sync Failed',
      color: 0xED4245,
      description: errorMessage || 'Unknown error occurred',
      fields: [
        { name: 'Duration', value: `${duration}s`, inline: true },
        { name: 'Errors', value: stats.errors.toString(), inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'ACT Gmail Sync' }
    };

    await sendEmbed('errors', embed);
  }
}

// Load secrets from Bitwarden
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

// Initialize Gmail API with service account for a specific user
async function getGmailForUser(userEmail) {
  const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');

  if (!keyJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  }

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

// Get list of delegated users to sync
function getDelegatedUsers() {
  const multiUser = getSecret('GOOGLE_DELEGATED_USERS');
  if (multiUser) {
    return multiUser.split(',').map(e => e.trim()).filter(Boolean);
  }
  const singleUser = getSecret('GOOGLE_DELEGATED_USER');
  if (singleUser) {
    return [singleUser.trim()];
  }
  throw new Error('GOOGLE_DELEGATED_USERS or GOOGLE_DELEGATED_USER not configured');
}

// Legacy wrapper for backward compatibility
async function getGmail() {
  const users = getDelegatedUsers();
  return getGmailForUser(users[0]);
}

// Initialize Supabase
function getSupabase() {
  const url = getSecret('SUPABASE_SHARED_URL') || getSecret('SUPABASE_URL') || getSecret('NEXT_PUBLIC_SUPABASE_URL');
  const key = getSecret('SUPABASE_SHARED_SERVICE_ROLE_KEY') || getSecret('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(url, key);
}

// Fetch GHL contacts for email matching
async function loadGhlContacts(supabase) {
  const { data, error } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, email, full_name')
    .not('email', 'is', null);

  if (error) {
    console.warn('Warning: Could not load GHL contacts:', error.message);
    return new Map();
  }

  const emailMap = new Map();
  for (const contact of data || []) {
    if (contact.email) {
      emailMap.set(contact.email.toLowerCase(), {
        ghl_contact_id: contact.ghl_id,
        full_name: contact.full_name,
      });
    }
  }
  return emailMap;
}

// Get existing message IDs to skip duplicates
async function getExistingMessageIds(supabase) {
  const { data, error } = await supabase
    .from('communications_history')
    .select('source_id')
    .eq('source_system', 'gmail');

  if (error) {
    console.warn('Warning: Could not fetch existing messages:', error.message);
    return new Set();
  }

  return new Set((data || []).map(r => r.source_id));
}

// Parse email header value
function getHeader(headers, name) {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || null;
}

// Extract email address from "Name <email>" format
function extractEmail(value) {
  if (!value) return null;
  const match = value.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : value.toLowerCase().trim();
}

// Extract all email addresses from a header (handles comma-separated)
function extractEmails(value) {
  if (!value) return [];
  return value.split(',').map(part => {
    const email = extractEmail(part.trim());
    return email;
  }).filter(Boolean);
}

// Determine direction based on from/to and delegated user
function determineDirection(from, to, delegatedUser) {
  const fromEmail = extractEmail(from);
  const toEmails = extractEmails(to);

  if (fromEmail === delegatedUser.toLowerCase()) {
    return 'outbound';
  }
  if (toEmails.includes(delegatedUser.toLowerCase())) {
    return 'inbound';
  }
  // If we're CC'd, treat as inbound
  return 'inbound';
}

// Match email addresses to GHL contacts
function matchContact(from, to, cc, direction, ghlContactMap) {
  // For outbound, try to match the recipient
  // For inbound, try to match the sender
  // Special case: if sender is own-domain (e.g. Nic sending from @act.place),
  // treat as outbound — match TO/CC recipients instead of sender
  const fromEmail = extractEmail(from);
  const senderIsInternal = fromEmail && isOwnDomainEmail(fromEmail);

  const emailsToCheck = (direction === 'outbound' || senderIsInternal)
    ? [...extractEmails(to), ...extractEmails(cc)]
    : [fromEmail];

  for (const email of emailsToCheck) {
    if (email && !isOwnDomainEmail(email)) {
      const match = ghlContactMap.get(email);
      if (match) {
        return match.ghl_contact_id;
      }
    }
  }

  return null;
}

// Get labels for a message
function getLabels(labelIds) {
  const labelMap = {
    'INBOX': 'INBOX',
    'SENT': 'SENT',
    'DRAFT': 'DRAFT',
    'TRASH': 'TRASH',
    'SPAM': 'SPAM',
    'STARRED': 'STARRED',
    'IMPORTANT': 'IMPORTANT',
    'UNREAD': 'UNREAD',
    'CATEGORY_PERSONAL': 'Personal',
    'CATEGORY_SOCIAL': 'Social',
    'CATEGORY_PROMOTIONS': 'Promotions',
    'CATEGORY_UPDATES': 'Updates',
    'CATEGORY_FORUMS': 'Forums',
  };

  return (labelIds || []).map(id => labelMap[id] || id);
}

// Transform Gmail message to communications_history format
function transformMessage(message, ghlContactMap, delegatedUser) {
  const headers = message.payload?.headers || [];

  const from = getHeader(headers, 'From');
  const to = getHeader(headers, 'To');
  const cc = getHeader(headers, 'Cc');
  const subject = getHeader(headers, 'Subject');
  const date = getHeader(headers, 'Date');
  const messageId = getHeader(headers, 'Message-ID');

  const direction = determineDirection(from, to, delegatedUser);
  const contactId = matchContact(from, to, cc, direction, ghlContactMap);
  const labels = getLabels(message.labelIds);

  // Parse date - Gmail uses RFC 2822 format
  let occurredAt;
  try {
    occurredAt = date ? new Date(date).toISOString() : new Date(parseInt(message.internalDate)).toISOString();
  } catch (e) {
    occurredAt = new Date(parseInt(message.internalDate)).toISOString();
  }

  // Get snippet (preview)
  const snippet = message.snippet || '';
  const contentPreview = snippet.substring(0, 500);

  return {
    ghl_contact_id: contactId,
    channel: 'email',
    direction,
    subject,
    content_preview: contentPreview,
    source_system: 'gmail',
    source_id: message.id,
    source_thread_id: message.threadId,
    occurred_at: occurredAt,
    metadata: {
      from,
      to,
      cc,
      message_id: messageId,
      labels,
      snippet,
      size_estimate: message.sizeEstimate,
      internal_date: message.internalDate,
    },
    synced_at: new Date().toISOString(),
  };
}

// AI enrichment for recently synced emails missing summary
async function enrichEmails(supabase, verbose = false) {
  const apiKey = getSecret('OPENAI_API_KEY');
  if (!apiKey) {
    console.log('[Enrich] OPENAI_API_KEY not configured, skipping enrichment');
    return 0;
  }

  const openai = new OpenAI({ apiKey });

  // Fetch emails missing summary (batch of 50)
  const { data: unenriched, error } = await supabase
    .from('communications_history')
    .select('id, subject, content_preview, direction, metadata')
    .eq('channel', 'email')
    .is('summary', null)
    .order('occurred_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[Enrich] Failed to fetch unenriched emails:', error.message);
    return 0;
  }

  if (!unenriched || unenriched.length === 0) {
    console.log('[Enrich] No emails need enrichment');
    return 0;
  }

  console.log(`[Enrich] Processing ${unenriched.length} emails...`);
  let enriched = 0;

  for (const email of unenriched) {
    try {
      const subject = email.subject || '(no subject)';
      const preview = email.content_preview || '';
      const from = email.metadata?.from || '';

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: `Analyze this email and return JSON with these fields:
- summary: 1-2 sentence summary
- sentiment: one of "positive", "neutral", "negative", "urgent"
- topics: array of 1-3 short topic tags (lowercase, e.g. "funding", "event planning")
- requires_response: boolean, true if the email expects a reply from us

Return ONLY valid JSON, no markdown.`
          },
          {
            role: 'user',
            content: `Direction: ${email.direction}\nFrom: ${from}\nSubject: ${subject}\n\n${preview}`
          }
        ]
      });

      const raw = response.choices[0].message.content?.trim();
      const result = JSON.parse(raw);

      const { error: updateError } = await supabase
        .from('communications_history')
        .update({
          summary: result.summary || null,
          sentiment: result.sentiment || null,
          topics: Array.isArray(result.topics) ? result.topics : null,
          waiting_for_response: result.requires_response === true,
          response_needed_by: result.requires_response ? 'us' : null,
          enriched_at: new Date().toISOString(),
        })
        .eq('id', email.id);

      if (updateError) {
        console.error(`[Enrich] Update failed for ${email.id}:`, updateError.message);
      } else {
        enriched++;
        if (verbose) {
          console.log(`  [OK] ${subject.substring(0, 60)} → ${result.sentiment}`);
        }
      }

      // Rate limit: ~20 req/s is safe for gpt-4o-mini
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.error(`[Enrich] Error processing ${email.id}:`, err.message);
    }
  }

  console.log(`[Enrich] Enriched ${enriched}/${unenriched.length} emails`);
  return enriched;
}

// Log sync operation to ghl_sync_log
async function logSyncOperation(supabase, status, errorMessage = null) {
  try {
    await supabase.from('ghl_sync_log').insert({
      operation: 'gmail_sync',
      entity_type: 'email',
      direction: 'gmail_to_supabase',
      status,
      error_message: errorMessage,
      records_processed: stats.fetched,
      records_created: stats.inserted,
      records_skipped: stats.skipped,
      records_failed: stats.errors,
      started_at: new Date(stats.startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - stats.startTime,
      triggered_by: 'cron',
      metadata: {
        matched_contacts: stats.matched,
      }
    });
  } catch (error) {
    console.error('Failed to log sync operation:', error.message);
  }
}

// Main sync function
async function syncGmail(options = {}) {
  const {
    days = 7,
    dryRun = false,
    verbose = false,
  } = options;

  console.log('\n[Gmail] ACT Gmail Sync\n');
  console.log('Options:');
  console.log(`  Days: ${days}`);
  console.log(`  Dry run: ${dryRun}`);
  console.log();

  // Calculate date range
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - days);
  const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

  console.log(`Date range: ${afterDate.toISOString().split('T')[0]} to now\n`);

  // Initialize APIs
  const supabase = getSupabase();
  const delegatedUsers = getDelegatedUsers();

  // Load GHL contacts for matching
  console.log('Loading GHL contacts for email matching...');
  const ghlContactMap = await loadGhlContacts(supabase);
  console.log(`  Loaded ${ghlContactMap.size} contacts with email addresses\n`);

  // Get existing message IDs
  console.log('Loading existing synced messages...');
  const existingMessageIds = await getExistingMessageIds(supabase);
  console.log(`  Found ${existingMessageIds.size} already synced messages\n`);

  console.log(`Syncing ${delegatedUsers.length} mailbox(es): ${delegatedUsers.join(', ')}\n`);

  // Query for both sent and received emails
  const query = `after:${afterTimestamp}`;
  const transformed = [];

  for (const delegatedUser of delegatedUsers) {
    console.log(`\n━━━ Mailbox: ${delegatedUser} ━━━\n`);

    let gmail;
    try {
      gmail = await getGmailForUser(delegatedUser);
    } catch (err) {
      console.error(`  Failed to auth for ${delegatedUser}: ${err.message}`);
      stats.errors++;
      continue;
    }

    // Fetch messages from Gmail
    console.log('Fetching emails from Gmail...\n');

    let allMessages = [];
    let pageToken = null;

    do {
      const params = {
        userId: 'me',
        q: query,
        maxResults: 100,
      };

      if (pageToken) {
        params.pageToken = pageToken;
      }

      const { data } = await gmail.users.messages.list(params);

      if (data.messages) {
        allMessages = allMessages.concat(data.messages);
      }

      pageToken = data.nextPageToken;

      if (verbose) {
        console.log(`  Fetched ${allMessages.length} message IDs so far...`);
      }
    } while (pageToken);

    console.log(`Found ${allMessages.length} messages in date range\n`);

    // Filter out already synced messages (dedup across mailboxes via Gmail message ID)
    const newMessages = allMessages.filter(m => !existingMessageIds.has(m.id));
    stats.skipped += allMessages.length - newMessages.length;

    console.log(`  New messages to sync: ${newMessages.length}`);
    console.log(`  Already synced: ${allMessages.length - newMessages.length}\n`);

    if (newMessages.length === 0) {
      console.log(`No new messages for ${delegatedUser}.\n`);
      continue;
    }

    // Fetch full message details and transform
    console.log('Fetching message details and transforming...\n');

    for (let i = 0; i < newMessages.length; i++) {
      const msg = newMessages[i];

      try {
        const { data: fullMessage } = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date', 'Message-ID'],
        });

        const record = transformMessage(fullMessage, ghlContactMap, delegatedUser);
        transformed.push(record);
        // Track this message ID so the next mailbox won't re-fetch it
        existingMessageIds.add(msg.id);
        stats.fetched++;

        if (record.ghl_contact_id) {
          stats.matched++;
        }

        if (verbose || (i % 50 === 0 && i > 0)) {
          console.log(`  Processed ${i + 1}/${newMessages.length} messages...`);
        }

        // Rate limiting - Gmail API has quotas
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        console.error(`  Error fetching message ${msg.id}: ${error.message}`);
        stats.errors++;
      }
    }
  }

  console.log();
  console.log(`Transformed ${transformed.length} messages`);
  console.log(`  Contact matches: ${stats.matched}\n`);

  if (transformed.length === 0) {
    console.log('No new messages to sync across all mailboxes.\n');
    await logSyncOperation(supabase, 'success');
    await notifyDiscord('success');
    return;
  }

  // Count by direction
  const directionCounts = {
    inbound: transformed.filter(m => m.direction === 'inbound').length,
    outbound: transformed.filter(m => m.direction === 'outbound').length,
  };

  console.log('Direction breakdown:');
  console.log(`  Inbound: ${directionCounts.inbound}`);
  console.log(`  Outbound: ${directionCounts.outbound}`);
  console.log();

  if (dryRun) {
    console.log('DRY RUN - No changes written to database\n');

    // Show sample messages
    console.log('Sample messages:');
    for (const msg of transformed.slice(0, 5)) {
      console.log(`  - ${msg.subject || '(no subject)'}`);
      console.log(`    Direction: ${msg.direction}`);
      console.log(`    Date: ${msg.occurred_at}`);
      console.log(`    Contact match: ${msg.ghl_contact_id || '(none)'}`);
      console.log();
    }
    return;
  }

  // Insert to Supabase in batches
  console.log('Syncing to Supabase...\n');
  const batchSize = 50;

  for (let i = 0; i < transformed.length; i += batchSize) {
    const batch = transformed.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('communications_history')
      .upsert(batch, {
        onConflict: 'source_system,source_id',
        ignoreDuplicates: true,
      })
      .select('id');

    if (error) {
      console.error(`Error in batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      stats.errors += batch.length;
    } else {
      stats.inserted += data?.length || 0;
    }

    if (verbose || (i % 100 === 0 && i > 0)) {
      console.log(`  Processed ${Math.min(i + batchSize, transformed.length)}/${transformed.length} records...`);
    }
  }

  // Auto-create contacts for unmatched inbound emails
  console.log();
  try {
    const unmatchedInbound = transformed.filter(m => m.direction === 'inbound' && !m.ghl_contact_id);
    if (unmatchedInbound.length > 0) {
      console.log(`[AutoCreate] Processing ${unmatchedInbound.length} unmatched inbound emails...`);
      const emailsToMatch = unmatchedInbound.map(m => ({
        email: m.metadata?.from,
        from: m.metadata?.from,
        subject: m.subject,
        direction: 'inbound',
      }));
      const { matched: autoMatched, created: autoCreated } = await batchMatchOrCreate(supabase, ghlContactMap, emailsToMatch);
      stats.autoCreated = autoCreated;
      stats.autoMatched = autoMatched;
      console.log(`[AutoCreate] Created ${autoCreated} new contacts, matched ${autoMatched} existing`);

      // Update the inserted records with the newly created contact IDs
      for (const msg of unmatchedInbound) {
        const fromEmail = msg.metadata?.from?.match(/<([^>]+)>/)?.[1]?.toLowerCase() || msg.metadata?.from?.toLowerCase()?.trim();
        if (!fromEmail) continue;
        const contact = ghlContactMap.get(fromEmail);
        if (contact?.ghl_contact_id) {
          await supabase
            .from('communications_history')
            .update({ ghl_contact_id: contact.ghl_contact_id })
            .eq('source_id', msg.source_id)
            .eq('source_system', 'gmail');
        }
      }
    } else {
      console.log('[AutoCreate] All inbound emails matched to existing contacts');
      stats.autoCreated = 0;
    }
  } catch (autoErr) {
    console.error('[AutoCreate] Auto-create failed (non-fatal):', autoErr.message);
    stats.autoCreated = 0;
  }

  // Note: AI enrichment now handled by dedicated enrich-communications.mjs script
  stats.enriched = 0;

  // Log sync operation
  const syncStatus = stats.errors > 0 ? 'partial' : 'success';
  await logSyncOperation(supabase, syncStatus);

  // Send Discord notification
  await notifyDiscord(syncStatus);

  // Summary
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);

  console.log();
  console.log('[OK] Sync complete!');
  console.log(`  Messages fetched: ${stats.fetched}`);
  console.log(`  Messages inserted: ${stats.inserted}`);
  console.log(`  Messages skipped (already synced): ${stats.skipped}`);
  console.log(`  Contact matches: ${stats.matched}`);
  console.log(`  Contacts auto-created: ${stats.autoCreated || 0}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Duration: ${duration}s`);
  console.log();
}

// Parse CLI arguments
const args = process.argv.slice(2);

function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    return args[idx + 1];
  }
  return defaultVal;
}

const options = {
  days: parseInt(getArg('days', '7')),
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose') || args.includes('-v'),
};

// Run sync
try {
  await syncGmail(options);
} catch (err) {
  console.error('\n[ERROR]', err.message);
  if (options.verbose) {
    console.error(err.stack);
  }
  // Notify Discord of failure
  await notifyDiscord('error', err.message);
  process.exit(1);
}

#!/usr/bin/env node

/**
 * Renew Gmail Watch Subscriptions
 *
 * Calls gmail.users.watch() for each delegated mailbox to register
 * Pub/Sub push notifications. Watch expires after 7 days, so this
 * runs daily as a safety margin.
 *
 * Prerequisites:
 * - GCP Pub/Sub topic created
 * - Push subscription pointing to /api/webhooks/gmail
 * - Service account has publish access to topic
 *
 * Usage:
 *   node scripts/renew-gmail-watch.mjs
 *   node scripts/renew-gmail-watch.mjs --verbose
 */

import { execSync } from 'child_process';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Load secrets (same pattern as sync-gmail-to-supabase.mjs)
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
  } catch {
    return {};
  }
}

function getSecret(name) {
  const secrets = loadSecrets();
  return secrets[name] || process.env[name];
}

function getDelegatedUsers() {
  const multiUser = getSecret('GOOGLE_DELEGATED_USERS');
  if (multiUser) {
    return multiUser.split(',').map(e => e.trim()).filter(Boolean);
  }
  const singleUser = getSecret('GOOGLE_DELEGATED_USER');
  if (singleUser) return [singleUser.trim()];
  throw new Error('GOOGLE_DELEGATED_USERS not configured');
}

async function getGmailForUser(userEmail) {
  const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');

  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    subject: userEmail,
  });

  await auth.authorize();
  return google.gmail({ version: 'v1', auth });
}

function getSupabase() {
  const url = getSecret('SUPABASE_SHARED_URL') || getSecret('SUPABASE_URL') || getSecret('NEXT_PUBLIC_SUPABASE_URL');
  const key = getSecret('SUPABASE_SHARED_SERVICE_ROLE_KEY') || getSecret('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
}

async function renewWatch() {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  const topicName = getSecret('GMAIL_PUBSUB_TOPIC');

  if (!topicName) {
    console.error('[GmailWatch] GMAIL_PUBSUB_TOPIC not configured');
    console.error('  Expected format: projects/<project-id>/topics/<topic-name>');
    process.exit(1);
  }

  const users = getDelegatedUsers();
  const supabase = getSupabase();

  console.log(`[GmailWatch] Renewing watch for ${users.length} mailbox(es)`);
  console.log(`  Topic: ${topicName}\n`);

  const results = [];

  for (const userEmail of users) {
    try {
      const gmail = await getGmailForUser(userEmail);

      const { data } = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName,
          labelIds: ['INBOX', 'SENT'],
        },
      });

      const expiration = data.expiration
        ? new Date(parseInt(data.expiration)).toISOString()
        : 'unknown';

      console.log(`  [OK] ${userEmail}`);
      console.log(`    historyId: ${data.historyId}`);
      console.log(`    expires: ${expiration}`);

      // Update sync state with latest historyId
      await supabase.from('gmail_sync_state').upsert(
        {
          email_address: userEmail,
          history_id: String(data.historyId),
          watch_expiration: expiration,
          last_watch_renewal: new Date().toISOString(),
        },
        { onConflict: 'email_address' }
      );

      results.push({ email: userEmail, status: 'ok', historyId: data.historyId, expiration });
    } catch (err) {
      console.error(`  [FAIL] ${userEmail}: ${err.message}`);
      results.push({ email: userEmail, status: 'error', error: err.message });
    }
  }

  // Log to integration_events
  await supabase.from('integration_events').insert({
    source: 'gmail',
    event_type: 'gmail.watch_renewal',
    entity_type: 'system',
    entity_id: 'gmail-watch',
    action: results.every(r => r.status === 'ok') ? 'created' : 'failed',
    payload: { results },
    processed_at: new Date().toISOString(),
  });

  const succeeded = results.filter(r => r.status === 'ok').length;
  const failed = results.filter(r => r.status === 'error').length;

  console.log(`\n[GmailWatch] Done: ${succeeded} renewed, ${failed} failed`);

  if (failed > 0) process.exit(1);
}

try {
  await renewWatch();
} catch (err) {
  console.error('[GmailWatch] Fatal error:', err.message);
  process.exit(1);
}

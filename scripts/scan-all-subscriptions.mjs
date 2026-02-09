#!/usr/bin/env node

/**
 * Comprehensive scan of all ACT mailboxes for subscription emails
 */

import { execSync } from 'child_process';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const MAILBOXES = ['benjamin@act.place', 'nicholas@act.place', 'hi@act.place', 'accounts@act.place'];

const VENDOR_SEARCHES = {
  'Mighty Networks': ['mighty', 'mightynetworks'],
  'LinkedIn Premium': ['linkedin'],
  'Dialpad': ['dialpad'],
  'Codeguide': ['codeguide'],
  'Updoc': ['updoc'],
  'Belong': ['belong'],
  'Garmin Connect': ['garmin'],
  'Cursor AI': ['cursor', 'anysphere'],
  'SumUp': ['sumup'],
  'Zapier': ['zapier'],
  'Dext': ['dext'],
  'Railway': ['railway'],
  'Webflow': ['webflow'],
  'Notion Labs': ['notion', 'makenotion'],
  'OpenAI': ['openai'],
  'Anthropic': ['anthropic'],
  'Adobe': ['adobe'],
  'Descript': ['descript'],
  'Xero': ['xero'],
  'Vercel': ['vercel'],
  'Supabase': ['supabase'],
  'GitHub': ['github'],
  'HighLevel': ['highlevel', 'gohighlevel'],
  'Google': ['google-cloud-billing', 'payments-noreply@google'],
  'Stripe': ['stripe'],
  'Bitwarden': ['bitwarden'],
  'Amazon Prime': ['amazon'],
  'Audible': ['audible'],
  'Apple': ['apple'],
};

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

async function getGmail(delegatedUser) {
  const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');

  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    subject: delegatedUser,
  });

  await auth.authorize();
  return google.gmail({ version: 'v1', auth });
}

function getSupabase() {
  const url = getSecret('SUPABASE_SHARED_URL') || getSecret('SUPABASE_URL');
  const key = getSecret('SUPABASE_SHARED_SERVICE_ROLE_KEY') || getSecret('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
}

async function findVendorEmail(vendor, searchTerms) {
  const results = {};

  for (const mailbox of MAILBOXES) {
    try {
      const gmail = await getGmail(mailbox);

      for (const term of searchTerms) {
        const query = `from:${term} (receipt OR invoice OR billing OR payment OR subscription)`;

        const { data } = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 5,
        });

        if (data.messages && data.messages.length > 0) {
          results[mailbox] = (results[mailbox] || 0) + data.messages.length;
        }

        await new Promise(r => setTimeout(r, 50));
      }
    } catch (error) {
      // Skip mailboxes we can't access
    }
  }

  // Return the mailbox with the most matches
  const sorted = Object.entries(results).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? { email: sorted[0][0], count: sorted[0][1], all: results } : null;
}

async function main() {
  console.log('\n🔍 Comprehensive Subscription Email Scan\n');
  console.log('Scanning all ACT mailboxes for each subscription vendor...\n');

  const supabase = getSupabase();
  const updates = [];

  for (const [vendor, searchTerms] of Object.entries(VENDOR_SEARCHES)) {
    process.stdout.write(`${vendor.padEnd(20)}`);

    const result = await findVendorEmail(vendor, searchTerms);

    if (result) {
      console.log(`→ ${result.email} (${result.count} emails)`);
      if (Object.keys(result.all).length > 1) {
        console.log(`                    also: ${Object.entries(result.all).filter(([e]) => e !== result.email).map(([e, c]) => `${e}(${c})`).join(', ')}`);
      }
      updates.push({ vendor, email: result.email });
    } else {
      console.log(`→ not found`);
    }
  }

  // Update database
  console.log('\n📝 Updating subscriptions table...\n');

  for (const { vendor, email } of updates) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        current_login_email: email,
        account_status: email === 'accounts@act.place' ? 'active' : 'pending_migration'
      })
      .eq('vendor_name', vendor);

    if (!error) {
      console.log(`  ✓ ${vendor} → ${email}`);
    }
  }

  // Summary
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('current_login_email')
    .not('current_login_email', 'is', null);

  const byEmail = {};
  for (const s of subs || []) {
    byEmail[s.current_login_email] = (byEmail[s.current_login_email] || 0) + 1;
  }

  console.log('\n📊 Summary by mailbox:');
  for (const [email, count] of Object.entries(byEmail).sort((a, b) => b[1] - a[1])) {
    const status = email === 'accounts@act.place' ? '✓' : '→ migrate';
    console.log(`  ${email.padEnd(25)} ${count} subscriptions ${status}`);
  }

  console.log('\n');
}

main().catch(console.error);

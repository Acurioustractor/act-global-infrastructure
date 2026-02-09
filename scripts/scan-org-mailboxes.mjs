#!/usr/bin/env node

/**
 * Scan multiple ACT organization mailboxes for subscription emails
 * Uses domain-wide delegation to access other users' Gmail
 */

import { execSync } from 'child_process';
import { google } from 'googleapis';

const MAILBOXES = ['nicholas@act.place', 'hi@act.place', 'accounts@act.place'];

const VENDOR_PATTERNS = [
  'webflow', 'notion', 'openai', 'anthropic', 'adobe', 'descript',
  'xero', 'vercel', 'supabase', 'github', 'gohighlevel', 'highlevel',
  'google', 'stripe', 'bitwarden'
];

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

async function scanMailbox(email) {
  console.log(`\n📬 Scanning ${email}...`);

  try {
    const gmail = await getGmail(email);
    let foundAny = false;

    for (const vendor of VENDOR_PATTERNS) {
      const query = `from:${vendor} (receipt OR invoice OR billing OR payment)`;

      const { data } = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 5,
      });

      if (data.messages && data.messages.length > 0) {
        console.log(`  ✓ ${vendor.padEnd(15)} - ${data.messages.length}+ receipt emails found`);
        foundAny = true;
      }

      await new Promise(r => setTimeout(r, 100));
    }

    if (!foundAny) {
      console.log(`  (no subscription receipts found)`);
    }
  } catch (error) {
    if (error.message.includes('Delegation denied') || error.message.includes('Not Authorized') || error.message.includes('invalid_grant')) {
      console.log(`  ⚠️  No delegation access to ${email}`);
    } else {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

console.log('🔍 Scanning ACT organization mailboxes for subscription receipts...');
console.log('   (Using domain-wide delegation via service account)');

for (const mailbox of MAILBOXES) {
  await scanMailbox(mailbox);
}

console.log('\n');

#!/usr/bin/env node
/**
 * Search for Cursor AI receipts across all mailboxes
 */

import { execSync } from 'child_process';
import { google } from 'googleapis';

const MAILBOXES = ['benjamin@act.place', 'accounts@act.place', 'nicholas@act.place', 'hi@act.place'];

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

async function searchMailbox(mailbox) {
  console.log(`\n📬 Searching ${mailbox} for Cursor receipts...`);

  try {
    const gmail = await getGmail(mailbox);

    const queries = [
      'from:receipts@stripe.com cursor',
      'from:receipts@stripe.com anysphere',
      'from:billing@cursor.sh',
      'from:noreply@cursor.sh',
      'subject:(cursor payment receipt)',
      'subject:(anysphere receipt)',
      'subject:(cursor subscription)',
    ];

    let found = false;

    for (const q of queries) {
      const { data } = await gmail.users.messages.list({
        userId: 'me',
        q: q,
        maxResults: 10,
      });

      if (data.messages && data.messages.length > 0) {
        console.log(`  ✓ Query "${q}" - ${data.messages.length} results`);
        found = true;

        for (const msg of data.messages.slice(0, 5)) {
          const { data: fullMessage } = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date'],
          });

          const headers = fullMessage.payload?.headers || [];
          const from = headers.find(h => h.name === 'From')?.value || '';
          const subject = headers.find(h => h.name === 'Subject')?.value || '';
          const date = headers.find(h => h.name === 'Date')?.value || '';

          console.log(`    - ${date.substring(0, 16)} | ${from.substring(0, 40)}`);
          console.log(`      "${subject.substring(0, 60)}"`);
        }
      }

      await new Promise(r => setTimeout(r, 100));
    }

    if (!found) {
      console.log('  (no Cursor receipts found)');
    }
  } catch (error) {
    if (error.message.includes('Delegation denied') || error.message.includes('Not Authorized')) {
      console.log(`  ⚠️  No delegation access`);
    } else {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

console.log('🔍 Searching all ACT mailboxes for Cursor AI receipts...\n');

for (const mailbox of MAILBOXES) {
  await searchMailbox(mailbox);
}

console.log('\n');

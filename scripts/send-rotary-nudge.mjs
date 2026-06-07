#!/usr/bin/env node

/**
 * send-rotary-nudge.mjs — one-off, Ben-authorized 2026-06-07 ("send it")
 *
 * Replies on the existing "Rotary Global Grant Application" Gmail thread
 * (last message from Pene Curtis 2026-04-13) from benjamin@act.place.
 * Service account + domain delegation, same auth pattern as sync-gmail-to-supabase.mjs.
 *
 * Usage:
 *   node scripts/send-rotary-nudge.mjs           # dry-run: print full MIME, send nothing
 *   node scripts/send-rotary-nudge.mjs --send    # send
 */

import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { google } from 'googleapis';

dotenv.config({ path: '.env.local' });

// Same secrets mechanism as sync-gmail-to-supabase.mjs (Bitwarden Secrets Manager via keychain)
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
    secretCache = Object.fromEntries(JSON.parse(result).map((s) => [s.key, s.value]));
  } catch {
    secretCache = {};
  }
  return secretCache;
}
const getSecret = (name) => loadSecrets()[name] || process.env[name];

const SEND = process.argv.includes('--send');
const FROM = 'benjamin@act.place';
const TO = 'pene.curtis@bigpond.com';
const CC = 'nicholas@act.place, greg@marlowcanete.com.au';
const THREAD_ID = '19d13685bbf18877';
const LAST_MSG_ID = '19d8918d0187b6cf'; // Pene's 13 Apr reply — for In-Reply-To/References
const SUBJECT = 'Re: Rotary Global Grant Application';

const BODY = `Hi Pene,

Hope you're travelling well. Checking in on the Global Grant — last we heard in April everything was in the system and you were lining up partners for the funds. How's it tracking?

If anything from our side would help it over the line — updated photos of the beds already on country, impact numbers from Anyinginyi, another letter of support — say the word and it's yours within the week.

One practical thing: the original invoice (INV-0222, $82,500, April 2025) is still open on our books, and a rough sense of when the club expects the grant to land would really help our planning for the next production run.

Thanks for carrying this one, Pene — it matters.

Ben + Nic`;

const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');
if (!keyJson) { console.error('GOOGLE_SERVICE_ACCOUNT_KEY not configured'); process.exit(1); }
const credentials = JSON.parse(keyJson);

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
  ],
  subject: FROM,
});
await auth.authorize();
const gmail = google.gmail({ version: 'v1', auth });

// Fetch RFC822 Message-ID of the last message so the reply threads in Pene's client too
const last = await gmail.users.messages.get({
  userId: 'me',
  id: LAST_MSG_ID,
  format: 'metadata',
  metadataHeaders: ['Message-ID', 'References'],
});
const headers = last.data.payload?.headers || [];
const rfcId = headers.find((h) => h.name.toLowerCase() === 'message-id')?.value || '';
const prevRefs = headers.find((h) => h.name.toLowerCase() === 'references')?.value || '';
const references = [prevRefs, rfcId].filter(Boolean).join(' ');

const mime = [
  `From: Benjamin Knight <${FROM}>`,
  `To: ${TO}`,
  `Cc: ${CC}`,
  `Subject: ${SUBJECT}`,
  rfcId ? `In-Reply-To: ${rfcId}` : null,
  references ? `References: ${references}` : null,
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  '',
  BODY,
].filter((l) => l !== null).join('\r\n');

console.log('=== MIME message ===');
console.log(mime);
console.log('====================');

if (!SEND) {
  console.log('\nDRY RUN — nothing sent. Rerun with --send.');
  process.exit(0);
}

const raw = Buffer.from(mime).toString('base64url');
const res = await gmail.users.messages.send({
  userId: 'me',
  requestBody: { raw, threadId: THREAD_ID },
});
console.log(`\nSENT. messageId=${res.data.id} threadId=${res.data.threadId}`);

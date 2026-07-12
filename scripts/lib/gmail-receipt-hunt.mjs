// Targeted, GENERIC Gmail receipt hunter for the receipt-acquittal loop.
// Unlike scripts/lib/gmail-vendor-queries.mjs (a curated SaaS-vendor map), this hunts ANY
// vendor by token + amount + date window across all delegated ACT mailboxes. READ-ONLY.
//
// The amount is used as corroboration: if the bank line's amount string appears in the
// email subject/snippet, `amountSeen` is true — strong evidence it's the right receipt
// without needing to download + OCR the attachment.
//
// Auth: Google service account + domain-wide delegation (gmail.readonly). Secrets via
// Bitwarden (keychain bws token) with env fallback. Throws if auth is unavailable so the
// caller can skip gracefully.
import { google } from 'googleapis';
import { execSync } from 'child_process';

let secretCache = null;
function loadSecrets() {
  if (secretCache) return secretCache;
  secretCache = {};
  try {
    const token = execSync('security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null', { encoding: 'utf8' }).trim();
    const result = execSync(`BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`, { encoding: 'utf8' });
    for (const s of JSON.parse(result)) secretCache[s.key] = s.value;
  } catch { /* fall through to env */ }
  return secretCache;
}
const getSecret = (n) => loadSecrets()[n] || process.env[n];

function getDelegatedUsers() {
  const multi = getSecret('GOOGLE_DELEGATED_USERS');
  if (multi) return multi.split(',').map((e) => e.trim()).filter(Boolean);
  const single = getSecret('GOOGLE_DELEGATED_USER');
  return single ? [single.trim()] : [];
}

async function gmailFor(userEmail) {
  const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.JWT({ email: credentials.client_email, key: credentials.private_key, scopes: ['https://www.googleapis.com/auth/gmail.readonly'], subject: userEmail });
  await auth.authorize();
  return google.gmail({ version: 'v1', auth });
}

/** Authenticate all delegated mailboxes. Returns [[email, client], ...]. Throws if none. */
export async function getGmailClients() {
  const users = getDelegatedUsers();
  if (!users.length) throw new Error('no GOOGLE_DELEGATED_USERS configured');
  const clients = await Promise.all(users.map(async (u) => [u, await gmailFor(u)]));
  return clients;
}

const GENERIC = new Set(['australia','australian','brisbane','sydney','melbourne','pty','ltd','limited','the','and','for','with','mount','isa','springs','alice']);
/** Vendor tokens from a bank-line payee/particulars, strongest first. */
export function vendorTokens(payee) {
  return String(payee || '')
    .toLowerCase().replace(/&/g, ' and ').replace(/\b[a-z]?\d{6,}\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter((t) => t.length >= 4 && !GENERIC.has(t))
    .sort((a, b) => b.length - a.length);
}

function ymd(d) { return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`; }
function windowDates(dateStr, days) {
  const base = new Date(`${dateStr}T00:00:00`);
  const after = new Date(base); after.setDate(after.getDate() - days);
  const before = new Date(base); before.setDate(before.getDate() + days);
  return { after: ymd(after), before: ymd(before) };
}

/** Build a generic receipt query for a vendor token + date window. */
export function buildGenericQuery(token, dateStr, days = 12) {
  if (!token) return null;
  const { after, before } = windowDates(dateStr, days);
  return `"${token}" (receipt OR invoice OR "tax invoice" OR order OR confirmation OR payment OR booking OR tickets) after:${after} before:${before}`;
}

/** Does the amount appear in a text blob? Checks "538.12" and bare-dollar "538". */
export function amountAppears(amount, text) {
  const t = String(text || '');
  const a = Math.abs(Number(amount) || 0);
  if (!a) return false;
  const two = a.toFixed(2);
  const whole = String(Math.round(a));
  return t.includes(two) || new RegExp(`(^|[^\\d])${whole}([^\\d]|$)`).test(t);
}

/**
 * Hunt all mailboxes for receipt emails matching one bank line.
 * Returns [{ mailbox, gmail_id, subject, from, internalDate, amountSeen }], best (amountSeen) first.
 */
export async function huntLine(clients, { payee, amount, date, windowDays = 12, perMailbox = 4 }) {
  const token = vendorTokens(payee)[0];
  const query = buildGenericQuery(token, date, windowDays);
  if (!query) return [];
  const hits = [];
  for (const [mailbox, client] of clients) {
    try {
      const { data: list } = await client.users.messages.list({ userId: 'me', q: query, maxResults: perMailbox });
      for (const msg of list.messages || []) {
        const full = await client.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
        const h = full.data.payload?.headers || [];
        const getH = (n) => h.find((x) => x.name === n)?.value || '';
        const subject = getH('Subject');
        const amountSeen = amountAppears(amount, `${subject} ${full.data.snippet || ''}`);
        hits.push({ mailbox, gmail_id: msg.id, subject, from: getH('From'), internalDate: full.data.internalDate, amountSeen });
      }
    } catch { /* per-mailbox ignore */ }
    await new Promise((r) => setTimeout(r, 120));
  }
  return hits.sort((a, b) => Number(b.amountSeen) - Number(a.amountSeen));
}

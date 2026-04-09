#!/usr/bin/env node
/**
 * Gmail Deep Search — for every MISSING (path 7) SPEND transaction in a given
 * quarter, query the raw Gmail API across all delegated mailboxes using
 * vendor + date ± 7 days, and surface any hits as candidate receipts.
 *
 * Goes beyond `receipt_emails` (which only contains what Dext captured) and
 * hits the full Gmail API directly — catches receipts that Dext's filter rules
 * missed OR that went to the wrong inbox.
 *
 * Output: `thoughts/shared/reports/gmail-deep-search-Q{N}-FY{YY}-{date}.md`
 * with one section per txn and any message candidates found.
 *
 * Safe: read-only. Does NOT auto-create receipt_emails rows — surfaces
 * candidates for human review.
 *
 * Usage:
 *   node scripts/gmail-deep-search.mjs Q2
 *   node scripts/gmail-deep-search.mjs Q2 Q3
 *   node scripts/gmail-deep-search.mjs Q2 --limit 50
 *   node scripts/gmail-deep-search.mjs Q2 --vendors "Qantas,Uber"
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { buildGmailQuery } from './lib/gmail-vendor-queries.mjs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;
const VENDOR_FILTER = args.includes('--vendors') ? args[args.indexOf('--vendors') + 1].split(',').map(s => s.toLowerCase().trim()) : null;
const FY_ARG = args.includes('--fy') ? parseInt(args[args.indexOf('--fy') + 1]) : 26;

const QUARTERS_BY_FY = (fy) => {
  const yr1 = 2000 + fy - 1;
  const yr2 = 2000 + fy;
  return {
    Q1: { start: `${yr1}-07-01`, end: `${yr1}-09-30`, label: `Q1 FY${fy}` },
    Q2: { start: `${yr1}-10-01`, end: `${yr1}-12-31`, label: `Q2 FY${fy}` },
    Q3: { start: `${yr2}-01-01`, end: `${yr2}-03-31`, label: `Q3 FY${fy}` },
    Q4: { start: `${yr2}-04-01`, end: `${yr2}-06-30`, label: `Q4 FY${fy}` },
  };
};

// ============================================================================
// GMAIL AUTH
// ============================================================================

// Load secrets from Bitwarden (same pattern as act-briefing.mjs, sync-gmail-to-supabase.mjs)
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
  } catch {
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
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    subject: userEmail,
  });
  await auth.authorize();
  return google.gmail({ version: 'v1', auth });
}

function getDelegatedUsers() {
  const multi = getSecret('GOOGLE_DELEGATED_USERS');
  if (multi) return multi.split(',').map(e => e.trim()).filter(Boolean);
  const single = getSecret('GOOGLE_DELEGATED_USER');
  if (single) return [single.trim()];
  throw new Error('GOOGLE_DELEGATED_USERS not configured');
}

// VENDOR → GMAIL QUERY mapping lives in scripts/lib/gmail-vendor-queries.mjs
// (imported at top of file). Shared with gmail-to-xero-pipeline.mjs.

// ============================================================================
// SEARCH
// ============================================================================

async function searchForTxn(gmailClients, tx) {
  const query = buildGmailQuery(tx.contact_name, tx.date);
  if (!query) return { query: null, hits: [] };

  const allHits = [];
  for (const [mailbox, client] of gmailClients) {
    try {
      const { data } = await client.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 5,
      });
      for (const msg of data.messages || []) {
        // Get headers only
        const full = await client.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        });
        const headers = full.data.payload?.headers || [];
        const getH = (name) => headers.find(h => h.name === name)?.value || '';
        allHits.push({
          mailbox,
          id: msg.id,
          from: getH('From'),
          subject: getH('Subject'),
          date: getH('Date'),
          threadId: full.data.threadId,
        });
      }
    } catch (e) {
      // ignore per-mailbox errors
    }
  }
  return { query, hits: allHits };
}

// ============================================================================
// MAIN
// ============================================================================

async function loadMissingTxns(quarter) {
  // Reuse the same filter as bas-completeness.mjs path 7
  const NO_RECEIPT_EXACT = new Set(['nab','nab fee','nab international fee','nab fx margin','bank fee','dishonour fee','merchant fee','service fee','stripe fee','paypal fee','interest charge','interest','bank interest','account fee']);
  const { data } = await sb.from('xero_transactions')
    .select('xero_transaction_id, contact_name, total, date, type, has_attachments, status, line_items, bank_account')
    .eq('type', 'SPEND')
    .eq('status', 'AUTHORISED')
    .eq('has_attachments', false)
    .gte('date', quarter.start)
    .lte('date', quarter.end)
    .order('total', { ascending: false });

  // Filter out no-receipt-needed client-side
  return (data || []).filter(tx => {
    const name = (tx.contact_name || '').toLowerCase().trim();
    if (NO_RECEIPT_EXACT.has(name)) return false;
    if (name.includes('bank fee') || name.includes('dishonour') || name.includes('interest charge') || name.includes('international fee') || name.includes('fx margin')) return false;
    // BASEXCLUDED
    if (Array.isArray(tx.line_items) && tx.line_items.length > 0 &&
        tx.line_items.every(li => li.tax_type === 'BASEXCLUDED')) return false;
    return true;
  });
}

async function main() {
  const quarterArgs = args.filter(a => /^Q[1-4]$/i.test(a)).map(a => a.toUpperCase());
  if (quarterArgs.length === 0) { console.error('Specify at least one quarter'); process.exit(1); }

  const QUARTERS = QUARTERS_BY_FY(FY_ARG);
  console.log('=== Gmail Deep Search ===');
  console.log('Quarters:', quarterArgs.join(', '));

  // Load Gmail clients for all delegated users
  const users = getDelegatedUsers();
  console.log(`Mailboxes: ${users.join(', ')}`);
  const gmailClients = new Map();
  for (const u of users) {
    try {
      const client = await getGmailForUser(u);
      gmailClients.set(u, client);
    } catch (e) {
      console.error(`  failed to auth ${u}: ${e.message}`);
    }
  }
  console.log(`Authenticated: ${gmailClients.size}/${users.length}\n`);

  const allMissing = [];
  for (const q of quarterArgs) {
    const quarter = QUARTERS[q];
    const missing = await loadMissingTxns(quarter);
    console.log(`${q}: ${missing.length} missing txns to search`);
    allMissing.push(...missing.map(t => ({ ...t, _quarter: q })));
  }

  // Optional vendor filter
  let candidates = allMissing;
  if (VENDOR_FILTER) {
    candidates = allMissing.filter(t => VENDOR_FILTER.some(v => (t.contact_name || '').toLowerCase().includes(v)));
    console.log(`After vendor filter (${VENDOR_FILTER.join(',')}): ${candidates.length}`);
  }
  if (LIMIT) candidates = candidates.slice(0, LIMIT);

  console.log(`\nSearching ${candidates.length} txns × ${gmailClients.size} mailboxes = ${candidates.length * gmailClients.size} queries\n`);

  const results = [];
  let hitCount = 0;
  for (let i = 0; i < candidates.length; i++) {
    const tx = candidates[i];
    const result = await searchForTxn(gmailClients, tx);
    if (result.hits.length > 0) {
      hitCount++;
      console.log(`  🟢 [${i + 1}/${candidates.length}] ${(tx.contact_name || '?').slice(0,25).padEnd(25)} $${tx.total} ${tx.date} — ${result.hits.length} hit(s)`);
    } else if (result.query) {
      console.log(`  ⚪ [${i + 1}/${candidates.length}] ${(tx.contact_name || '?').slice(0,25).padEnd(25)} $${tx.total} ${tx.date} — no hits`);
    }
    results.push({ tx, query: result.query, hits: result.hits });

    // Throttle: Gmail quota is 250 units/user/sec. Each list+get ≈ 6 units.
    // 400ms between searches keeps us comfortable.
    await new Promise(rs => setTimeout(rs, 400));
  }

  console.log(`\n=== Summary ===`);
  console.log(`Searched: ${candidates.length} txns`);
  console.log(`Hits (any mailbox): ${hitCount}`);
  console.log(`Total messages found: ${results.reduce((s, r) => s + r.hits.length, 0)}`);

  // Write report
  const qTag = quarterArgs.join('-');
  const reportPath = `thoughts/shared/reports/gmail-deep-search-${qTag}-FY${FY_ARG}-${new Date().toISOString().slice(0, 10)}.md`;
  const lines = [];
  lines.push(`# Gmail Deep Search — ${quarterArgs.join(' + ')} FY${FY_ARG}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Mailboxes:** ${users.join(', ')}`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(`- Searched: ${candidates.length} missing txns`);
  lines.push(`- Found candidates for: ${hitCount} txns (${((hitCount / candidates.length) * 100).toFixed(1)}%)`);
  lines.push(`- Total messages: ${results.reduce((s, r) => s + r.hits.length, 0)}`);
  lines.push(``);

  const withHits = results.filter(r => r.hits.length > 0);
  if (withHits.length > 0) {
    lines.push(`## Candidate receipts`);
    lines.push(``);
    for (const r of withHits) {
      lines.push(`### ${r.tx.contact_name} — $${r.tx.total} — ${r.tx.date}`);
      lines.push(`**Xero txn:** \`${r.tx.xero_transaction_id}\``);
      lines.push(`**Gmail query:** \`${r.query}\``);
      lines.push(``);
      for (const h of r.hits) {
        lines.push(`- **[${h.mailbox}]** ${h.subject}`);
        lines.push(`  From: ${h.from} · ${h.date}`);
        lines.push(`  Gmail: https://mail.google.com/mail/u/0/#inbox/${h.threadId}`);
      }
      lines.push(``);
    }
  }

  const noHits = results.filter(r => r.hits.length === 0 && r.query);
  if (noHits.length > 0) {
    lines.push(`## No-match txns (${noHits.length})`);
    lines.push(`These txns had a query but returned no Gmail matches. Genuine "no receipt anywhere" candidates.`);
    lines.push(``);
    for (const r of noHits.slice(0, 50)) {
      lines.push(`- ${r.tx.date} ${r.tx.contact_name} $${r.tx.total}`);
    }
  }

  writeFileSync(reportPath, lines.join('\n'));
  console.log(`\nReport: ${reportPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });

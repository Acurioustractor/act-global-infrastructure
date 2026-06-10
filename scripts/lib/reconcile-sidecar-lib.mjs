// Pure functions for reconcile-sidecar.mjs — no env, no I/O, fixture-testable.
// Money-math TDD rule: scripts/tests/reconcile-sidecar.test.mjs pins these BEFORE the live wiring.

export const BANNER = 'Never bulk-accept green Match suggestions — vendor+date must align (amount alone lies)';
export const DRIFT_CAVEAT = 'mirror is_reconciled DRIFTS vs Xero — single-GET BankTransactions/{id} is the only truth; treat every row as candidate until --verify confirms it';
export const KEEPER_REMINDER = 'Deletion candidates for the WEEKLY DESTRUCTIVE verb, not Friday clicks. Verify the keeper bill holds the receipt BEFORE any delete.';

// Two-account rule: ACT spend lives in exactly these two accounts.
export const ACCOUNTS = {
  visa: ['NAB Visa ACT #8815'],
  everyday: ['NJ Marchesi T/as ACT Everyday'],
  both: ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday'],
};

// FY26 windows.
const Q = {
  q1: ['2025-07-01', '2025-09-30'],
  q2: ['2025-10-01', '2025-12-31'],
  q3: ['2026-01-01', '2026-03-31'],
  q4: ['2026-04-01', '2026-06-30'],
  q2q3: ['2025-10-01', '2026-03-31'],
  fy26: ['2025-07-01', '2026-06-30'],
};

export function scopeWindow(scope) {
  const w = Q[String(scope || '').toLowerCase()];
  if (!w) throw new Error(`Unknown scope '${scope}' — use q2|q3|q2q3|q4|fy26`);
  return { start: w[0], end: w[1] };
}

export function accountsFor(key) {
  const a = ACCOUNTS[String(key || '').toLowerCase()];
  if (!a) throw new Error(`Unknown account '${key}' — use visa|everyday|both`);
  return a;
}

const dayDiff = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);

// Bill-twin EXISTS pattern (reconcile-ground-truth.mjs): ACCPAY not DELETED/VOIDED,
// amount within 0.02, date within +/-14d. Bills are pre-filtered to live ACCPAY.
export function findTwins(line, bills) {
  const amt = Math.abs(Number(line.total));
  return (bills || []).filter(b =>
    Math.abs(Math.abs(Number(b.total)) - amt) < 0.02 && dayDiff(line.date, b.date) <= 14);
}

const GROCERY = ['woolworths', 'coles', 'iga ', 'aldi', 'foodworks', 'drakes', 'supabarn', 'spar '];
const OVERSEAS = ['anthropic', 'claude', 'openai', 'github', 'vercel', 'supabase', 'webflow', 'figma',
  'notion', 'railway', 'zapier', 'descript', 'cursor', 'warp', 'x corp', 'x global', 'midjourney',
  'firecrawl', 'exa ', 'serpapi', 'mighty networks', 'cognition'];
const PERSONAL = ['netflix', 'spotify', 'disney', 'stan ', 'binge', 'playstation', 'nintendo', 'steam',
  'afterpay', 'atm ', 'cash out', 'kayo'];

// Precomputed coding for CREATE-IN-UI. Lints: groceries never 493 Travel,
// overseas vendors GST-Free, personal-looking flagged 880 Drawings.
export function suggestCoding(contactName, currentAccountCode = null, projectCode = null) {
  const name = ` ${String(contactName || '').toLowerCase()} `;
  const flags = [];
  let account = currentAccountCode || null;
  let gst = null;

  if (GROCERY.some(v => name.includes(v))) {
    flags.push('groceries-like — never 493 Travel');
    if (!account || account === '493') account = '453';
  }
  if (OVERSEAS.some(v => name.includes(v))) gst = 'GST-Free (overseas vendor)';
  if (PERSONAL.some(v => name.includes(v))) flags.push('personal-looking — 880 Drawings?');
  if (account === '493' && GROCERY.some(v => name.includes(v))) account = '453';

  return { account: account || 'code per vendor', gst, flags, project_code: projectCode || null };
}

export function gmailLink(gmailMessageId) {
  return gmailMessageId ? `https://mail.google.com/mail/u/0/#all/${gmailMessageId}` : null;
}

// Build the evidence list for one txn from pre-keyed sources. Pure.
// emails/docs: arrays already matched to this txn (id-matched upstream).
export function evidenceForTxn(txn, { emails = [], docs = [] } = {}) {
  const ev = [];
  if (txn.has_attachments) ev.push({ kind: 'xero_attachment', label: 'attached in Xero', url: null });
  for (const e of emails) {
    ev.push({
      kind: 'receipt_email',
      label: `receipt email (${e.mailbox || 'mailbox?'}) ${e.vendor_name || e.subject || ''}`.trim(),
      url: gmailLink(e.gmail_message_id),
    });
  }
  for (const d of docs) {
    ev.push({
      kind: 'finance_doc',
      label: `evidence doc [${d.source || 'doc'}] ${d.vendor_name || ''} ${d.attachment_filename || ''}`.trim(),
      url: d.attachment_url || (d.gmail_message_id ? gmailLink(d.gmail_message_id) : null),
    });
  }
  return ev;
}

export const BUCKETS = ['LIKELY-PHANTOM-DUP', 'MATCH-BILL', 'CREATE-IN-UI', 'NEEDS-RECEIPT'];

const fmtAmt = n => Number(Math.abs(n)).toFixed(2);

// Exactly one bucket per line. Precedence:
//   SPEND-TRANSFER      -> CREATE-IN-UI as transfer (never receipt-chased, never a
//                          phantom-delete candidate — bill twins on transfers are
//                          coincidental-amount false matches)
//   PAID twin           -> LIKELY-PHANTOM-DUP (spend-money duplicates a paid bill)
//   AUTHORISED twin     -> MATCH-BILL (matchable on the Reconcile tab)
//   other live twin     -> LIKELY-PHANTOM-DUP (twin exists; not matchable)
//   no twin + evidence  -> CREATE-IN-UI
//   no twin no evidence -> NEEDS-RECEIPT
export function classifyLine(line, twins, evidence) {
  if (/TRANSFER/i.test(String(line.type || ''))) {
    return {
      bucket: 'CREATE-IN-UI',
      coding: { account: 'transfer (own accounts)', gst: null, flags: [], project_code: line.project_code || null },
      action: `Transfer between own accounts — match/create as bank transfer in UI (no receipt needed): ${line.contact_name || '(no contact)'}`,
    };
  }
  const paid = (twins || []).find(t => t.status === 'PAID');
  const auth = (twins || []).find(t => t.status === 'AUTHORISED');
  const other = (twins || [])[0];

  if (paid || (other && !auth)) {
    const twin = paid || other;
    return {
      bucket: 'LIKELY-PHANTOM-DUP',
      twin,
      action: `Deletion candidate (weekly destructive verb): twin bill ${twin.invoice_number || twin.xero_id} `
        + `(${twin.contact_name || '?'}, ${twin.status}) covers this movement — verify keeper receipt BEFORE delete`,
    };
  }
  if (auth) {
    return {
      bucket: 'MATCH-BILL',
      twin: auth,
      action: `Match in Xero UI to bill ${auth.invoice_number || auth.contact_name || auth.xero_id}`,
    };
  }
  if ((evidence || []).length) {
    const coding = suggestCoding(line.contact_name, line.account_code, line.project_code);
    return {
      bucket: 'CREATE-IN-UI',
      coding,
      action: `Create in UI: ${line.contact_name || '(no contact)'} -> acct ${coding.account}`
        + (coding.gst ? ` · ${coding.gst}` : '')
        + (coding.project_code ? ` · ${coding.project_code}` : '')
        + (coding.flags.length ? ` · ⚠ ${coding.flags.join('; ')}` : ''),
    };
  }
  return {
    bucket: 'NEEDS-RECEIPT',
    action: `forward receipt for ${line.contact_name || '(unknown vendor)'} ${line.date} $${fmtAmt(line.total)}`,
  };
}

// Per account x bucket: count + $.
export function summarize(rows) {
  const key = r => `${r.bank_account}|${r.bucket}`;
  const agg = new Map();
  for (const r of rows) {
    const k = key(r);
    const cur = agg.get(k) || { account: r.bank_account, bucket: r.bucket, count: 0, total: 0 };
    cur.count += 1;
    cur.total += Math.abs(Number(r.total));
    agg.set(k, cur);
  }
  return [...agg.values()]
    .map(r => ({ ...r, total: Number(r.total.toFixed(2)) }))
    .sort((a, b) => a.account.localeCompare(b.account) || BUCKETS.indexOf(a.bucket) - BUCKETS.indexOf(b.bucket));
}

export const money = n => Number(n || 0).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const xeroTxnUrl = id => `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${id}`;
const xeroBillUrl = id => `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${id}`;

function rowsTable(rows) {
  const sorted = [...rows].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)) || Math.abs(a.total) - Math.abs(b.total));
  const tr = sorted.map(r => {
    const links = (r.evidence || []).map(e =>
      e.url ? `<a href="${esc(e.url)}" target="_blank">${esc(e.label)}</a>` : esc(e.label)).join('<br>') || '<span class="none">NONE</span>';
    const twin = r.twin
      ? `<a href="${esc(xeroBillUrl(r.twin.xero_id))}" target="_blank">${esc(r.twin.invoice_number || r.twin.xero_id)}</a> (${esc(r.twin.status)})`
      : '';
    return `<tr><td>${esc(r.date)}</td>`
      + `<td><a href="${esc(xeroTxnUrl(r.id))}" target="_blank">${esc(r.contact_name || '(no contact)')}</a>${r.description ? `<div class="desc">${esc(r.description)}</div>` : ''}</td>`
      + `<td class="amt">$${Math.abs(r.total).toFixed(2)}</td>`
      + `<td>${esc(r.bank_account)}</td>`
      + `<td>${links}</td>`
      + `<td>${twin}</td>`
      + `<td>${esc(r.action)}</td></tr>`;
  }).join('\n');
  return `<table><thead><tr><th>Date</th><th>Contact / description</th><th>Amount</th><th>Account</th><th>Receipt evidence</th><th>Bill twin</th><th>Action</th></tr></thead><tbody>${tr}</tbody></table>`;
}

function bucketTotalsHtml(rows) {
  const byAcc = summarize(rows);
  if (!byAcc.length) return '';
  return `<p class="totals">${byAcc.map(s => `${esc(s.account)}: ${s.count} lines · ${esc(money(s.total))}`).join(' &nbsp;·&nbsp; ')}</p>`;
}

const BUCKET_BLURB = {
  'LIKELY-PHANTOM-DUP': KEEPER_REMINDER,
  'MATCH-BILL': 'Friday clicks: match each statement line to its AUTHORISED bill in the Reconcile tab. Check vendor + date, not just the green amount.',
  'CREATE-IN-UI': 'Friday clicks: Create on the Reconcile tab with the precomputed coding below.',
  'NEEDS-RECEIPT': 'No evidence from any source — send the one-line ask, then code.',
  'MIRROR-STALE': 'Live Xero says these are already reconciled (or deleted) — mirror drift, NOT work. Re-sync the mirror.',
};

export function buildHtml({ scope, accounts, generatedAt, buckets, verify = null, evidenceNote = '' }) {
  const sections = [];
  const order = [...BUCKETS, 'MIRROR-STALE'];
  for (const b of order) {
    const rows = buckets[b] || [];
    if (b === 'MIRROR-STALE' && !verify) continue;
    const danger = b === 'LIKELY-PHANTOM-DUP';
    sections.push(`<section class="${danger ? 'danger' : ''} ${b === 'MIRROR-STALE' ? 'stale' : ''}">
<h2>${esc(b)} — ${rows.length} lines</h2>
<p class="blurb">${esc(BUCKET_BLURB[b] || '')}</p>
${bucketTotalsHtml(rows)}
${rows.length ? rowsTable(rows) : '<p class="none">none</p>'}
</section>`);
  }
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Reconcile sidecar — ${esc(scope)} — ${esc(generatedAt)}</title>
<style>
body{font:14px/1.45 -apple-system,system-ui,sans-serif;margin:0;padding:0 24px 60px;color:#1a1a1a;background:#fafaf8}
.banner{position:sticky;top:0;z-index:9;background:#7a1f1f;color:#fff;padding:10px 16px;font-weight:600}
.banner .caveat{display:block;font-weight:400;font-size:12px;opacity:.92;margin-top:4px}
h1{font-size:20px;margin:18px 0 4px}h2{font-size:16px;margin:0 0 4px}
.meta,.blurb{color:#555;font-size:13px}.totals{font-size:13px;font-weight:600}
section{margin:22px 0;padding:14px 16px;background:#fff;border:1px solid #ddd;border-radius:8px}
section.danger{border:2px solid #b3261e;background:#fff6f5}
section.stale{border-style:dashed;opacity:.85}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{padding:5px 8px;border-bottom:1px solid #eee;text-align:left;vertical-align:top}
th{background:#f3f2ee;position:sticky;top:58px}
td.amt{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.desc{color:#777;font-size:12px}.none{color:#999}
a{color:#0b57d0}
</style></head><body>
<div class="banner">${esc(BANNER)}<span class="caveat">${esc(DRIFT_CAVEAT)}</span></div>
<h1>Reconcile sidecar — ${esc(scope)}</h1>
<p class="meta">Generated ${esc(generatedAt)} · accounts: ${(accounts || []).map(esc).join(' + ')} · READ-ONLY artifact (no Xero/Supabase writes)${evidenceNote ? ` · ${esc(evidenceNote)}` : ''}${verify ? ` · verify: ${esc(verify)}` : ' · NOT live-verified (mirror only)'}</p>
${sections.join('\n')}
</body></html>`;
}

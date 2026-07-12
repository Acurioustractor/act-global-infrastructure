#!/usr/bin/env node
/**
 * ACT receipt acquittal — the daily "never lose a receipt" loop (Phase 1).
 *
 * Spec: ~/.claude/skills/loop-me/workflows/receipt-acquittal.md
 *
 * Each weekday it reads the receipt-gap surface (v_finance_bank_line_evidence), pre-hunts,
 * SILENTLY auto-links only the dead-obvious matches, and pushes ONE Telegram brief listing
 * the residue you must adjudicate. Adjudication itself happens in the Workbench
 * (/finance/receipt-evidence) — this script only finds + auto-links + briefs.
 *
 * MONEY SAFETY (grilled decisions, see spec):
 *   - Runtime is READ-ONLY against Xero. The only write is a Supabase mirror row:
 *     promoting the best candidate link in finance_receipt_bank_line_links to 'approved'
 *     (same coverage record the manual "approve_link" action creates). Undo = reject_link.
 *   - Strict auto-link bar: exact amount + vendor token in the receipt + sole candidate +
 *     high confidence. Anything softer falls to the residue you decide.
 *   - DRY-RUN by default. Nothing is written and no Telegram is sent without --apply.
 *
 * SCOPE (Phase 1): NAB Visa ACT #8815 only — the one account v_finance_bank_line_evidence
 *   currently covers. NJ Marchesi T/as ACT Everyday is NOT in that view yet (flagged in spec).
 *   paper_on_file / lost terminal states are Phase 2 (need a view change) — not here.
 *
 * Usage:
 *   node scripts/receipt-acquittal-daily.mjs                 # dry-run, last 10 days
 *   node scripts/receipt-acquittal-daily.mjs --days 240      # dry-run, wide window (tracer)
 *   node scripts/receipt-acquittal-daily.mjs --since 2025-10-01 --until 2025-12-31
 *   node scripts/receipt-acquittal-daily.mjs --apply         # WRITE auto-links + SEND Telegram
 *   node scripts/receipt-acquittal-daily.mjs --apply --no-telegram   # write links, skip push
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { classifyAutoLink, vendorToken, gstAtRiskEstimate, num } from './lib/receipt-acquittal-lib.mjs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sql = async (s) => { const { data, error } = await sb.rpc('exec_sql', { query: s }); if (error) throw new Error(error.message); return data || []; };

const ACCOUNT = 'NAB Visa ACT #8815';          // the only account the evidence view covers (Phase 1)

// ── arg parsing ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i > -1 ? argv[i + 1] : d; };
const flag = (k) => argv.includes(k);
const APPLY = flag('--apply');
const SEND_TELEGRAM = APPLY && !flag('--no-telegram');
const days = Number(arg('--days', 10));
const since = arg('--since', null);
const until = arg('--until', null);
// Gate the only un-coerced SQL interpolations (all other interpolated values are number-coerced,
// DB-sourced UUIDs, or quote-escaped). Cron uses --days, but reject a malformed explicit window.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
if (since && !DATE_RE.test(since)) { console.error('--since must be YYYY-MM-DD'); process.exit(1); }
if (until && !DATE_RE.test(until)) { console.error('--until must be YYYY-MM-DD'); process.exit(1); }
const HUNT = flag('--hunt');                       // live Gmail hunt for uncovered lines (slow, needs auth)
const HUNT_LIMIT = Number(arg('--hunt-limit', 15)); // cap Gmail calls per run

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const where = since
    ? `date BETWEEN '${since}'::date AND '${(until || '2100-01-01')}'::date`
    : `date >= CURRENT_DATE - ${days}`;

  const gaps = await sql(`
    SELECT id, date, amount, payee, particulars, reference,
           best_document_id, best_confidence, best_vendor_name, candidate_count, evidence_status
    FROM v_finance_bank_line_evidence
    WHERE direction = 'debit'
      AND bank_account = '${ACCOUNT.replace(/'/g, "''")}'
      AND evidence_status IN ('uncovered','candidate','high_confidence_candidate')
      AND ${where}
    ORDER BY abs(amount) DESC`);

  const windowLabel = since ? `${since}..${until || 'now'}` : `last ${days} days`;
  console.log(`\n=== Receipt acquittal — ${windowLabel} — ${ACCOUNT} ${APPLY ? '(APPLY)' : '(dry-run)'} ===`);

  if (!gaps.length) {
    console.log('✅ No receipt gaps in window. Nothing to chase. (No Telegram sent — empty run is silent.)');
    return;
  }

  // Batch-fetch the best-candidate docs (amount + vendor + ocr) and the existing links to promote.
  const docIds = [...new Set(gaps.map((g) => g.best_document_id).filter(Boolean))];
  const docs = docIds.length ? await sql(`SELECT id, amount_total, vendor_name, left(ocr_text, 4000) ocr_text FROM finance_receipt_documents WHERE id IN (${docIds.map((d) => `'${d}'`).join(',')})`) : [];
  const docById = Object.fromEntries(docs.map((d) => [d.id, d]));

  const gapIds = gaps.map((g) => g.id);
  const links = await sql(`SELECT id, bank_line_id, receipt_document_id, link_status FROM finance_receipt_bank_line_links WHERE bank_line_id IN (${gapIds.map((g) => `'${g}'`).join(',')})`);
  const linkFor = (bankLineId, docId) => links.find((l) => l.bank_line_id === bankLineId && l.receipt_document_id === docId) || null;

  const autoLinked = [];
  const residue = [];
  for (const g of gaps) {
    const doc = g.best_document_id ? docById[g.best_document_id] : null;
    const link = g.best_document_id ? linkFor(g.id, g.best_document_id) : null;
    const { autoLink, reason } = classifyAutoLink(g, doc);
    // Never silently override a human decision: a link a human flagged needs_review stays residue.
    if (autoLink && link?.link_status === 'needs_review') {
      residue.push({ g, doc, reason: 'human marked needs_review — not auto-linking' });
    } else if (autoLink) {
      autoLinked.push({ g, doc, reason, link });
    } else {
      residue.push({ g, doc, reason });
    }
  }

  // ── Phase 1.5: live Gmail hunt for UNCOVERED residue (no ingested candidate). READ-ONLY. ──
  // Measures yield: how many uncovered lines actually have a findable email receipt (amount-corroborated).
  let huntStats = null;
  if (HUNT) {
    const targets = residue.filter((r) => !r.doc).slice(0, HUNT_LIMIT);
    try {
      const { getGmailClients, huntLine } = await import('./lib/gmail-receipt-hunt.mjs');
      const clients = await getGmailClients();
      console.log(`\n🔎 Gmail hunt: ${targets.length} uncovered lines across ${clients.map((c) => c[0]).join(', ')}...`);
      let withHit = 0, withAmount = 0;
      for (const r of targets) {
        r.gmail = await huntLine(clients, { payee: r.g.payee, amount: r.g.amount, date: r.g.date });
        if (r.gmail.length) withHit++;
        if (r.gmail.some((h) => h.amountSeen)) withAmount++;
      }
      huntStats = { hunted: targets.length, withHit, withAmount };
    } catch (e) {
      console.log(`⚠ Gmail hunt skipped (${e.message}). Residue shown without email candidates.`);
    }
  }

  // ── apply auto-links (mirror-only write) ──
  let written = 0;
  if (APPLY) {
    for (const a of autoLinked) {
      const provenance = JSON.stringify({ source: 'receipt-acquittal-cron', bar: 'auto_strict', reason: a.reason }).replace(/'/g, "''");
      if (a.link) {
        await sql(`UPDATE finance_receipt_bank_line_links SET link_status='approved', match_method='auto_strict', is_best_candidate=true, created_by='receipt-acquittal-cron', provenance=provenance || '${provenance}'::jsonb, updated_at=now() WHERE id='${a.link.id}'`);
      } else {
        const conf = num(a.g.best_confidence);
        await sql(`INSERT INTO finance_receipt_bank_line_links (bank_line_id, receipt_document_id, link_status, match_method, confidence, rank, is_best_candidate, xero_action, created_by, provenance) VALUES ('${a.g.id}','${a.g.best_document_id}','approved','auto_strict',${conf},1,true,'attach_file','receipt-acquittal-cron','${provenance}'::jsonb)`);
      }
      written++;
    }
  }

  // ── compose brief ──
  const gstRisk = gstAtRiskEstimate(gaps.map((g) => g.amount));
  const dd = (d) => String(d).slice(5);  // mm-dd
  const fmt = (n) => `$${Math.abs(num(n)).toFixed(2)}`;
  const lines = [];
  lines.push(`🧾 *Receipt acquittal* — ${windowLabel}`);
  lines.push(`${gaps.length} gaps · ~${fmt(gstRisk)} GST at risk _(est. total/11)_`);
  lines.push(`✅ ${autoLinked.length} auto-linked${APPLY ? '' : ' _(dry-run, not written)_'}  ❓ ${residue.length} need you`);
  if (residue.length) {
    lines.push('');
    for (const r of residue.slice(0, 12)) {
      const gHit = r.gmail && r.gmail[0];
      const cand = r.doc
        ? `found ${r.doc.vendor_name || '?'} ${fmt(r.doc.amount_total)}`
        : gHit
          ? `📧 ${gHit.mailbox.split('@')[0]}: "${(gHit.subject || '').slice(0, 32)}"${gHit.amountSeen ? ' ✓$' : ''}`
          : 'no match';
      lines.push(`• ${fmt(r.g.amount)} ${vendorToken(r.g.payee) || (r.g.payee || '').slice(0, 18)} ${dd(r.g.date)} — ${cand}`);
    }
    if (residue.length > 12) lines.push(`…and ${residue.length - 12} more`);
  }
  lines.push('');
  lines.push('→ Adjudicate in the Workbench: /finance/receipt-evidence');
  const brief = lines.join('\n');

  console.log('\n----- BRIEF -----\n' + brief + '\n-----------------');
  console.log(`\nauto-linked: ${autoLinked.length} (${APPLY ? `${written} written` : 'dry-run'}) · residue: ${residue.length}`);
  if (autoLinked.length) {
    console.log('\nAuto-link detail:');
    for (const a of autoLinked) console.log(`  ✅ ${a.g.date} ${fmt(a.g.amount)} ${(a.g.payee || '').slice(0, 32).padEnd(32)} — ${a.reason}`);
  }
  if (residue.length) {
    console.log('\nResidue (you decide):');
    for (const r of residue.slice(0, 20)) {
      const gHit = r.gmail && r.gmail[0];
      const g = gHit ? `  📧 ${gHit.mailbox.split('@')[0]}:"${(gHit.subject || '').slice(0, 36)}"${gHit.amountSeen ? ' ✓$amount' : ''}` : '';
      console.log(`  ❓ ${r.g.date} ${fmt(r.g.amount)} ${(r.g.payee || '').slice(0, 30).padEnd(30)} — ${r.reason}${g}`);
    }
  }
  if (huntStats) {
    console.log(`\n🔎 Gmail hunt yield: ${huntStats.withHit}/${huntStats.hunted} uncovered lines had an email candidate; ${huntStats.withAmount}/${huntStats.hunted} were amount-corroborated (auto-link-eligible once ingested).`);
  }

  // ── push ──
  const sendable = autoLinked.length > 0 || residue.length > 0;
  if (SEND_TELEGRAM && sendable) {
    const { sendTelegram } = await import('./lib/telegram.mjs');
    await sendTelegram(brief, { parseMode: 'Markdown' });
    console.log('\n📤 Telegram brief sent.');
  } else if (!APPLY) {
    console.log('\n(dry-run: no writes, no Telegram. Re-run with --apply to go live.)');
  }
}

// Only run main when invoked directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
}

#!/usr/bin/env node
/**
 * SL clean-up digest — collapses grounded.json (full match data) into the compact digest.json
 * the classification workflow reads, plus idx.json (i/amt/dir per line) for batching.
 * Run AFTER sl-cleanup-reconcile.mjs (+ optional sl-cleanup-gmail-hunt.mjs).
 *
 * Usage: node scripts/sl-cleanup-digest.mjs [dir]   (default: thoughts/shared/handoffs/sl-cleanup)
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const dir = process.argv[2] || path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup');
const d = JSON.parse(readFileSync(path.join(dir, 'grounded.json'), 'utf8'));
const out = d.lines.map((l, i) => ({
  i, acct: l.account === 'NAB Visa ACT #8815' ? 'CARD' : 'BANK', date: l.date, dir: l.direction,
  amt: l.amount, particulars: l.particulars, sl: l.slComment,
  proj: l.xero_txn?.project_code || l.xero_bill?.project_code || l.bank_line?.project_code || null,
  acct_code: l.xero_txn?.acct || l.xero_bill?.acct || null,
  tax: l.xero_txn?.tax || l.xero_bill?.tax || null,
  has_receipt: l.has_receipt,
  receipt: l.receipt_doc ? { src: l.receipt_doc.source, subject: l.receipt_doc.subject, file: l.receipt_doc.file }
    : l.xero_bill?.has_attachments ? { src: 'xero_bill', num: l.xero_bill.number }
    : l.xero_txn?.has_attachments ? { src: 'xero_txn' } : null,
  gmail: (l.gmail_candidates || []).slice(0, 2).map(g => ({ from: g.from, subject: g.subject, mailbox: g.mailbox })),
}));
writeFileSync(path.join(dir, 'digest.json'), JSON.stringify(out));
writeFileSync(path.join(dir, 'idx.json'), JSON.stringify(out.map(x => ({ i: x.i, amt: x.amt, dir: x.dir }))));
console.log(`digest.json + idx.json written (${out.length} lines) → ${dir}`);

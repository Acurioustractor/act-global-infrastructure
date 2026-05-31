---
title: "$1 test-invoice runbook — validate the Pty operational stack"
status: ready to run once Pty Xero + NAB are live
date: 2026-06-01
critical_item: test-invoice-run (pty-readiness.json)
---

# $1 test-invoice runbook

> Validates the **entire A Curious Tractor Pty Ltd operating stack end-to-end** before cutover — Xero file, bank rail, GST treatment, project tagging, and the Supabase mirror sync — using one real $1 invoice. Critical item #9. Do this *before* any real Pty invoice goes out.

## Pre-requisites (all must be green)
- [ ] Pty Xero file open, chart of accounts + tracking categories ported
- [ ] NAB Pty business account live (PayID or BSB/acct known)
- [ ] Invoice template shows **A Curious Tractor Pty Ltd · ACN 697 347 676 · ABN 36 697 347 676**
- [ ] (Optional) Stripe Pty account — only if testing the card rail; not required (PayID/EFT is enough)

## Steps
1. **Raise** in Pty Xero: ACCREC invoice to a friendly recipient (your own personal account or Nic's), **$1.00 ex-GST + 10% GST = $1.10**, tax type *GST on Income*, with a **project_code tracking tag** set (use `ACT-IN`).
2. **Eyeball the PDF** before sending: correct ACN + ABN, correct NAB bank details in the footer, GST line shows $0.10, tracking category populated.
3. **Send + pay** $1.10 via **PayID/EFT to the NAB account** (and/or Stripe if testing that rail).
4. **Reconcile** in Xero: match the incoming bank line to the invoice. Confirm it marks PAID.
5. **Check GST**: open the draft Activity Statement / GST report — confirm the $0.10 lands in **1A (GST on sales)**.
6. **Sync to mirror**: run `node scripts/sync-xero-to-supabase.mjs`, then confirm the test invoice appears in `xero_invoices` with `type='ACCREC'`, `project_code='ACT-IN'`, and `status='PAID'`.
7. **Tidy up**: void or credit-note the test invoice once verified (or leave the $1 record — your call).

## Pass criteria (all yes = stack is cutover-ready)
- Invoice issued with correct ACN/ABN/bank details ✓
- Payment received into the NAB Pty account ✓
- GST correctly coded to BAS ✓
- Project tag flows through to the Supabase mirror after sync ✓

## If anything fails
Fix it before raising any real Pty invoice. Per **Cutover Rule 2**, if the stack isn't genuinely ready, the sole trader keeps trading until it is — don't issue real Pty invoices against a stack that hasn't passed this run.

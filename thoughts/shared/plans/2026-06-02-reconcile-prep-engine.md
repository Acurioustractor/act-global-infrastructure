# Reconcile-prep engine — make the NAB Visa #8815 Reconcile tab clean 1:1

**Date:** 2026-06-02 · **Entity:** Nicholas Marchesi T/as A Curious Tractor · **Account:** NAB Visa ACT #8815 (CREDITCARD, AccountID `5955b56e-cbce-42f2-a4b4-76412b15a0f5`)

## Verified reality (live Xero, 2026-06-02)
- The 493 "unreconciled lines" are **SPEND BankTransactions** (`Status=AUTHORISED, IsReconciled=false`) — Dext/import-pushed spend-money, **not** statement lines, **not** payments on bills.
- **Bank feed IS connected** (Ben confirmed: statement lines waiting in the Reconcile tab). → Xero will NOT let the API set `IsReconciled` (statement data is not API-exposed; BankStatement report = 401 here).
- The mirror **conflates** spend-money / bills / statement lines and is stale on status — RNM "AUTHORISED bill" is actually **VOIDED** live. **Every write must be verified against live Xero per-line, never the mirror.**

## What the API CAN do here (all proven in-repo)
- Delete a spend-money: `POST /BankTransactions {Status:'DELETED'}` (pattern: `void-429-leftover-dups.mjs`).
- Recode a spend-money (account/project/GST/tracking): xero-client tracking writes.
- Attach a receipt: `uploadAttachment` (pattern: `import-xero-files-receipts.mjs`).
- Create a payment on a bill: `POST /Payments` (marks bill PAID).
- **Cannot:** reconcile statement line ↔ transaction (UI-only, feed connected).

## Goal
Get each real card movement to exactly ONE correctly-coded, receipted transaction so Xero auto-suggests a clean match → Ben does one **"Reconcile all"** bulk pass. Collapse 493 investigations → ~1 bulk click.

## Per-line classification (live-verified)
For each unreconciled NAB SPEND txn, fetch live + its candidate bills, classify:
1. **DELETE_PHANTOM** — a live **PAID** bill (same vendor, amount±surcharge, date±14d) with a receipt already covers this card movement → the spend-money is the Dext dup → delete. *(safest API action)*
2. **DELETE_DUP** — two unreconciled spend-money for one movement → keep the receipted/better-coded one, delete the other.
3. **FLAG_AMBIGUOUS** — a live **AUTHORISED** (unpaid) bill matches → human decides: pay the bill (then delete spend-money) or void the bill. Do NOT auto-act.
4. **RECODE** — clean+real but mis-coded → fix coding so the match is correct.
5. **ATTACH** — clean+real but no receipt, and we have one (e.g. Supabase) → attach.
6. **MATCH_CLEAN** — correctly coded + receipted + real → no API action; Ben just matches.

## Sequence (money-work discipline)
1. **Dry-run** (Tier 1, read-only): `scripts/reconcile-prep.mjs` → per-line action plan with live evidence + confidence. Scope-test on a sample, then full.
2. **One tracer** (Tier 3, explicit OK): execute the single safest highest-confidence action end-to-end; re-read live to confirm; check `prepare-bas.mjs` delta.
3. **Batch** only after the tracer proves the path, by action-class, smallest-blast-radius first (ATTACH → DELETE_PHANTOM → RECODE), FLAG_AMBIGUOUS always to human/SL.

## Guardrails
- Two-account rule; never touch `project_code_source LIKE 'manual%'` coding without intent.
- Surcharge tolerance on amount match (card fee makes bank≠bill); require vendor+date align (reconcile-autocoding-traps memory).
- Re-read live after every write (attempted vs actual). Reconcile click stays Ben's bulk UI pass.

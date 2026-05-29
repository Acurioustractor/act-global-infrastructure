# Reconciliation & Receipts — Operating Model, Diagnosis & Fix Plan

**Date:** 2026-05-29 · **Org:** "Nicholas Marchesi" sole-trader, Xero `786af1ed-…`
**Why this doc:** reconciliation + receipts has been the most confusing part of the whole finance picture. This explains *why* (it's structural, not your fault), gives the one mental model to hold, and lays out exactly how to reconcile as much as possible before Standard Ledger.

---

## 1. The root cause of the confusion (this is the important bit)

There isn't one reconciliation system — there are **two receipt-capture systems and four "is it matched?" status fields**, none of which are wired to each other or kept in sync. Asking "is this reconciled?" or "do we have the receipt?" gives a *different answer depending on which one you look at.* That's the whole problem.

### Two receipt-capture systems running in parallel
| System | What it does | State |
|---|---|---|
| **Dext** (commercial) | You forward supplier bills → Dext extracts → **publishes to Xero as bills with the receipt attached** | Working — this is why ACCPAY bills are well-covered (only 25/1,057 missing attachments) |
| **Homegrown pipeline** (`capture-receipts.mjs` → `finance_receipt_documents`) | Scans Gmail mailboxes → downloads receipts → stores in Supabase → matches to Xero | **Captures fine (7,172 docs) but has NEVER pushed a single one to Xero** |

### Four disagreeing "status" fields
| Field | Says | Reality |
|---|---|---|
| `xero_transactions.is_reconciled` (Xero native) | card 70%, bank 26% reconciled | ✅ **THE source of truth for reconciliation** |
| `bank_statement_lines.status` (homegrown) | ~1,100/1,618 "reconciled" | ❌ stale homegrown flag — disagrees with Xero AND with its own `matched_xero_transaction_id` (which is null for ~99%) |
| `bank_statement_lines.receipt_match_status` | 833 matched / 116 unmatched / 669 n/a | a receipt-found flag (NAB Visa only) |
| `xero_*.has_attachments` (Xero native) | bills good, card spends thin | ✅ source of truth for "is the receipt **in Xero**" |

When four fields answer the same question differently, every report looks contradictory. **The fix is to declare one source of truth per question and ignore the rest.**

---

## 2. The decisive numbers (verified this session)

- **7,172 receipts captured** in `finance_receipt_documents` (Gmail, Aug 2025 → May 2026).
- **0 pushed to Xero.** The last-mile upload step has never run.
- **4,251 are already matched to a Xero transaction/bill** — ready to push *right now*.
- 2,921 captured but not yet matched to a Xero record.
- **Genuinely missing receipts: ~66 items / $31,585** (`receipt_status` + `missing_receipts`) — small.
- **The entire automation suite is STOPPED in PM2:** `receipt-capture`, `receipt-match`, `receipt-upload`, `weekly-reconciliation`, `reconciliation-checklist`, `auto-tag-transactions`, `auto-tag-emails`, `xero-sync` — all stopped. Only `xero-project-tag` + `ai-router-xero-mode` online.

**Conclusion:** We are **not** missing many receipts. Bills are evidenced by **Dext** (only 25/1,057 unattached). The homegrown pipeline captured 7,172 more — but on verification those are **mostly re-captures of the same supplier bills Dext already handles** (the 981 Q2/Q3 bills with a "ready" homegrown receipt *all* already have a Dext attachment). So it's **two overlapping systems doing the same job**, with the homegrown one never completing its push. The genuine gaps are small: the card/bank side (thin coverage) + ~66 truly missing ($31,585). The real fix is **consolidation + turning the automations back on**, not a frantic receipt hunt.

---

## 3. The one mental model to hold

> **Xero is the source of truth. Everything else is an aid to get Xero right.**

Two jobs, per line, and only two:
1. **Reconcile it in Xero** — match the bank-feed line to its bill/transaction so `is_reconciled = true`.
2. **Attach its receipt in Xero** — so `has_attachments = true` and SL/ATO can see the evidence.

The Supabase pipeline's only purpose is to *feed those two jobs*: find the receipt, find the match, push it in. The homegrown `status` flags are **not** reconciliation — retire them from how you think about this.

---

## 4. How reconciliation actually works here (the flow)

```
Bank/card feed → Xero imports statement lines
   → Xero suggests a match (to a bill or a prior transaction)
   → a human OR a bank rule approves it  → is_reconciled = true
Receipt → Dext (bills) or homegrown capture (Gmail) → attach to the Xero line
```

ACT's specific shape:
- **NAB Visa #8815** = the credit card; most operational spend (1,033 lines/$379K). Funded by transfers from Everyday.
- **Everyday** = the bank; receives grants, pays big bills, transfers to the card ($471K of transfers).
- The **$471K of Everyday→card transfers** are the bulk of "unreconciled" and are pure mechanical matching (each SPEND-TRANSFER ↔ the card's RECEIVE-TRANSFER).

---

## 5. Why receipts seem missing — and where they actually are

| Bucket | Count / $ | Where the receipt is | Action |
|---|---|---|---|
| Bills (ACCPAY) | 25/1,057 missing | **Dext already attached the rest in Xero** | chase the 25 |
| Bill-linked homegrown receipts | 2,842 docs → 981 bills | ⚠️ **all 981 bills ALREADY have a Dext attachment** | **do NOT bulk-push — would duplicate.** Skip. |
| Card/bank receipts ready to push | **only 32 docs → 16 bank txns (Q2/Q3)** | Supabase Storage, matched not pushed | push *these few* (the real gap) |
| Captured but unmatched | 2,921 docs | Supabase Storage, need matching | matching is the lever for the card side |
| Genuinely missing | ~66 / $31,585 | nowhere — request from vendor/Nic | hunt (track 05) |
| Founder "Nicholas" R&D payments | $21,159 | structural, not a receipt | Pty salary + Director's Loan |

> **⚠️ Correction to the "0 pushed / 7,172 captured" headline:** verified that the 4,251 "ready" docs are **overwhelmingly bill-linked, and those bills already carry Dext attachments** (981/981 in Q2/Q3 have `has_attachments=true`). So the homegrown pipeline largely **re-captured supplier-bill receipts Dext already handles** — bulk-pushing would create duplicates, not value. The genuine bank/card receipt gap is small (16 txns ready + the ~$5.8K of un-attached card lines + 66 truly missing). **Net: receipts are healthier than the raw numbers implied — bills are evidenced by Dext; the real work is the card side + retiring the redundant pipeline.**

---

## 6. The blockers (named, in priority order)

1. **The automation suite is off.** Pipeline built, not running → nothing flows. (Tier 2 to restart.)
2. **0/7,172 receipts pushed to Xero.** The `receipt-upload` / `receipts-to-xero.mjs` step has never run; 4,251 are ready. (Tier 3 — Xero writes.)
3. **Four disagreeing status systems** → no single dashboard of truth. Needs: trust Xero, retire the homegrown `status` flag.
4. **Everyday bank statement never imported** into `bank_statement_lines` (only NAB Visa) → half the picture is invisible to the pipeline.
5. **Standard Ledger not engaged** (Ignition unsigned) → can't finalise reconciliation/BAS.
6. **Pty cutover ~30 Jun** → decide: fix the sole-trader org now (helps Q3 BAS) vs start clean in the Pty. (Standing decision: fix now.)
7. **Two bank-txn tables** (`xero_transactions` current vs `xero_bank_transactions` stale to Nov-25) — only use `xero_transactions`.

---

## 7. The plan — reconcile as much as we can before SL

**Wave 0 — turn the system back on** (Tier 2, PM2):
- Restart `xero-sync` (fresh data), `receipt-capture --days 90` (full backfill), `receipt-match --apply --ai`.

**Wave 1 — push only the genuine gaps** (Tier 3, Xero writes) — *revised down after verification*:
- **Do NOT bulk-push the 4,251.** ~2,842 are bill-linked to bills that already have Dext attachments → duplicates.
- Push only the **16 bank-transaction receipts** (and any bill genuinely lacking an attachment). Small, clean win.
- The bigger card-side lever is **matching** (2,921 unmatched docs), not pushing — but verify each match before it touches Xero.

**Wave 2 — mechanical reconciliation prep** (read-only → SL executes the clicks):
- Generate the transfer-pair list ($483K) + spend↔bill matches (track 04).
- Import the **Everyday bank statement** so its lines are covered.

**Wave 3 — auto-features so it stays reconciled** (set once):
- **Xero bank rules** for the predictable recurring lines: Qantas → 493 Travel; SaaS (Supabase/Webflow/HighLevel/Adobe/etc.) → 485 Subscriptions + project; bank/merchant fees → 407/411; Airbnb → 493. A bank rule auto-codes future lines so reconciliation becomes one click.
- Keep `vendor_project_rules` auto-tagger (with the manual-source guard) running on a cron.
- Dext supplier rules → auto-route bills to the right project.

**Wave 4 — the genuinely-missing 66 + judgement items** → hunt + the SL questions (§8).

---

## 8. Additional questions for Standard Ledger (to fix before the Pty Xero)

1. **Receipt attachment policy:** are you happy for us to bulk-push the 4,251 matched receipts into Xero as attachments, or do you want them attached only after you've reconciled each line?
2. **Bank rules:** do you maintain Xero bank rules, or should we set them up for the recurring vendors (Qantas, SaaS, fees)?
3. **The homegrown `bank_statement_lines` status** disagrees with Xero — confirm we ignore it and treat Xero `is_reconciled` as truth (we'll retire the flag).
4. **Everyday statement:** can you pull/confirm the Everyday bank statement for Oct–Mar so we reconcile the bank side, not just the card?
5. **Dext vs homegrown:** post-cutover, do we keep BOTH capture systems or consolidate on Dext for the Pty? (Two systems = ongoing confusion.)
6. Plus the 5 judgement calls from the MASTER pack (TFN income reversal + BAS correction, Telford Smith, founder payments, MOL Nyrt, Centrecorp).

---

## 9. What this means for the Pty cutover

Don't carry this mess into the new Pty Xero. Decide the **target operating model now** so the Pty starts clean:
- One capture system (recommend Dext as primary; homegrown pipeline as the Gmail-sweep backstop that *does* push to Xero).
- Xero bank rules seeded from day one.
- One source of truth (Xero), no parallel status tables.
- The automations *running* (cron'd + monitored), not built-and-off.

---

*Verified via Supabase (`tednluwflfhxyucgwigh`, SELECT-only) + PM2 process list, 2026-05-29. No writes to Xero. Companion: the MASTER pack + recon-pack/01–06.*

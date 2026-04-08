# BAS Q2 + Q3 FY26 — Consolidated Action List

**Generated:** 2026-04-09
**Entity:** Nicholas Marchesi T/as A Curious Tractor · ABN 21 591 780 066
**Quarters:** Q2 FY26 (Oct-Dec 2025, overdue ~6wk) + Q3 FY26 (Jan-Mar 2026, due 28 Apr)

---

## Where we are

| Metric | Q2 FY26 | Q3 FY26 | Combined |
|---|---:|---:|---:|
| G1 Sales (inc GST) | $308,946 | $140,322 | $449,268 |
| 1A GST collected | $28,086 | $12,814 | $40,900 |
| 1B GST paid (est) | $11,099 | $5,219 | $16,318 |
| **Net GST payable** | **$16,987** | **$7,595** | **$24,582** |
| Confidence | 50% LOW | 66% MED | — |
| Unreceipted SPEND txns | 516 | 273 | 789 |
| GST credits at risk | $10,379 | $2,275 | $12,654 |
| R&D refund at risk | $18,503 | $11,554 | $30,057 |
| Q2 reconciliation | 53% | 86% | — |
| Phantom payables | 262 bills / $190,827 | — | — |

## What's now on disk (everything is reproducible)

### BAS worksheets (official numbers)
- `thoughts/shared/reports/bas-worksheet-q2-fy26-2026-04-08.md`
- `thoughts/shared/reports/bas-worksheet-q3-fy26-2026-04-08.md`

### Accountant handoff pack
- `thoughts/shared/reports/accountant-email-bas-q2-q3-fy26.md` — email draft
- `thoughts/shared/reports/accountant-brief-q2-fy26-2026-04-08.md` — one-page brief
- `thoughts/shared/reports/accountant-brief-q3-fy26-2026-04-08.md` — one-page brief
- `thoughts/shared/reports/accountant-handoff-q3-fy26.md` — Mar 17 phantom payables playbook

### Bookkeeping workbooks (CSV "tabs")
- `thoughts/shared/reports/bookkeeping-q2-fy26-2026-04-08/` — 7 CSVs + summary.md
- `thoughts/shared/reports/bookkeeping-q3-fy26-2026-04-08/` — 7 CSVs + summary.md

### Gap analysis (this session)
- `thoughts/shared/reports/bas-gap-sweep-q2-fy26-2026-04-08.md` — 516 missing receipts classified
- `thoughts/shared/reports/bas-gap-sweep-q3-fy26-2026-04-08.md` — 273 missing receipts classified
- `thoughts/shared/reports/bank-transfers-q2-fy26-2026-04-08.md` — 24 pairs identified
- `thoughts/shared/reports/bank-transfers-q3-fy26-2026-04-08.md` — 18 pairs identified
- `thoughts/shared/reports/phantom-payables-matches-2026-04-08.md` — 60 matched / 202 unmatched

### New reusable scripts
- `scripts/generate-bookkeeping-workbook.mjs Q#` — per-quarter CSV bundle
- `scripts/generate-accountant-brief.mjs Q#` — per-quarter one-page brief
- `scripts/bas-gap-sweep.mjs Q#` — Gmail/calendar cross-reference classifier
- `scripts/pair-bank-transfers.mjs Q#` — internal transfer pairing
- `scripts/suggest-payables-matches.mjs` — phantom payables matcher

---

## 💻 BEN'S ACTION LIST

**Total effort estimate:** 6–9 hours spread over 2-3 sessions. Most of this is clickwork, not thinking.

### PRIORITY 1 — One-click wins (2 hours, unblocks reconciliation)

#### 1. Reconcile 42 bank transfer pairs (~40 min)
Report: `thoughts/shared/reports/bank-transfers-q2-fy26-2026-04-08.md` + `-q3-`.

In Xero, for each pair:
- Open Reconcile → find the SPEND-TRANSFER line → click Transfer money → select the matching RECEIVE-TRANSFER line → Reconcile.

This clears **48 unreconciled rows in Q2** (lifts reconciliation from 53% → ~61%) and **36 in Q3**. Zero judgment calls — both sides have the same amount on different accounts.

#### 2. Auto-link 106 stuck receipts to Xero transactions (~90 min)
Report: `thoughts/shared/reports/bas-gap-sweep-q2-fy26-2026-04-08.md` "Auto-matchable" section (71 rows) + Q3 (35 rows).

These are receipts that are **already captured in `receipt_emails`** and scored ≥80% confidence against a specific Xero SPEND. Rather than working through one-by-one in Xero UI, let me know if you want me to build a `link-stuck-receipts.mjs` that writes the links via Xero API — it's ~50 lines of code and would run in seconds.

### PRIORITY 2 — Portal downloads (3-4 hours, mostly Qantas)

Report: `bas-gap-sweep-q2-fy26-2026-04-08.md` → "Ben Actions: Portal Downloads" (54 txns across Q2, 23 across Q3).

The big ones by value:

| Vendor | Txns Q2+Q3 | Value | Portal |
|---|---:|---:|---|
| **Qantas** | ~75 | ~$51,778 | [qantasbusinessrewards.com](https://www.qantasbusinessrewards.com) — monthly invoices CSV |
| **Uber** | ~252 | ~$9,222 | [business.uber.com](https://business.uber.com) — Reports → Trip activity CSV (Oct 2025 → Mar 2026) |
| **Webflow** | ~24 | ~$1,319 | [webflow.com/dashboard/account/billing](https://webflow.com/dashboard/account/billing) |
| **Claude.AI / Anthropic** | ~4 | ~$879 | [console.anthropic.com → Billing](https://console.anthropic.com) |
| **Notion Labs** | ~2 | ~$353 | [notion.so/my-account](https://notion.so/my-account) → Billing → Invoices |
| **Descript** | ~1 | ~$448 | [web.descript.com/settings/billing](https://web.descript.com/settings/billing) |
| **AGL** | ~1 | ~$319 | AGL MyAccount → Bills |

For each: download the PDFs/CSVs for the Oct 2025 → Mar 2026 range into `~/Downloads/receipts-backfill-fy26/<vendor>/`, then upload to the corresponding Xero bank transactions as attachments. I can build a `bulk-upload-receipts.mjs` helper if the folder approach works for you.

### PRIORITY 3 — Phantom payables Remove-&-Redo (90 min for the 60 matched)

Report: `thoughts/shared/reports/phantom-payables-matches-2026-04-08.md`.

60 bills matched to bank transactions across 18 vendors. Work vendor-by-vendor in Xero (same bank account filter each time = faster). Each one: Remove & Redo the bank transaction → Find & Match → select the bill → Reconcile. ~90 seconds per bill.

**The 202 unmatched bills ($177,803)** need triage, not one-click clearance. I'll flag those under Nic's section — most will need business-purpose decisions.

### PRIORITY 4 — Email resends (30 min)

From gap-sweep "Email Resend" bucket. Small handful of vendors — Chris Witta ($591), Piggyback, Cabcharge, etc. Template email:

> Hi [vendor], I'm closing out our Q2/Q3 BAS and can't find receipts for a few transactions with you. Could you resend tax invoices for: [date, amount]. ABN 21 591 780 066. Thanks, Ben.

---

## 🙋 NIC'S ACTION LIST

**Total effort estimate:** ~45 min of reading + a call with Ben to talk through decisions.

### 1. Approve lodgement deferral request (5 min)

Ben has an email drafted at `thoughts/shared/reports/accountant-email-bas-q2-q3-fy26.md` asking the accountant to request an ATO deferral for Q2 (6 weeks overdue). Just needs your OK before Ben sends — this stops the failure-to-lodge penalty clock.

### 2. Write-off sign-offs (20 min)

**Aged receivables (uncollectible? chase? write off?):**
- Rotary Eclub Outback Australia — **$82,500** — 364 days old (biggest problem)
- Social Impact Hub Foundation — **$10,800** — 142 days old
- GREEN FOX TRAINING STUDIO — **$9,000** — 266 days old
- Aleisha J Keating — **$1,350** across 3 invoices — 111 days old

Cash-basis BAS isn't affected by write-offs, but these clutter the balance sheet and the accountant will want a decision per debtor.

**Aged payables to review (from phantom payables report):**
- The 202 unmatched AUTHORISED bills ($177,803) — most are probably duplicates from the Qantas/Uber auto-billing integration issue. Need your call on:
  - Void the whole lot and rely on bank transactions as the source of truth?
  - Triage the top 20 by value and void only the confirmed duplicates?
- Virgin $8.4K 400+ days old — almost certainly a reconciliation error — void?

### 3. Confirm 1B GST estimate is reasonable (5 min)

Both BAS worksheets use **total/11 as the GST-on-purchases estimate** because my automation doesn't read Xero's per-line tax_type yet. In Xero → Reports → BAS Report, generate the real numbers for Q2 and Q3 and compare against the worksheets:
- Q2 expected 1B: ~$11,098.80
- Q3 expected 1B: ~$5,219.26

If they're within ~5%, lodge with the estimates. If materially different, we re-run with the real numbers.

### 4. Business-purpose sign-offs (minimal this round)

The gap-sweep found 0 Nic confirmations for Q2 and 1 for Q3 — the vendors that would normally trigger this (restaurants, hardware, fuel) mostly already have receipts attached. The one Q3 item will be in `bas-gap-sweep-q3-fy26-2026-04-08.md` → "Nic Actions" section.

### 5. Big-ticket SPEND sanity check (15 min)

Two items in the Q2 unreceipted list need your eyes because they're likely owner drawings / transfers misclassified as SPEND:

- **Nicholas Marchesi — $51,000 (2 txns)**
- **Nicholas (3 txns) — $21,419**

If these are owner drawings or personal account transfers, they shouldn't be on the business SPEND list at all — they'd go to an equity account, not an expense account, and they carry no GST. Please confirm so we can re-code them correctly.

---

## 🔨 SYSTEM BACKLOG (deferred, not blocking BAS)

Things Ben and Claude should do after the BAS is lodged:

1. **`link-stuck-receipts.mjs`** — automate the 106 auto-match linkings via Xero API (avoids 90 min of clickwork next quarter)
2. **`bulk-upload-receipts.mjs`** — takes a folder of portal-downloaded PDFs and attaches to matching Xero transactions
3. **`tax_type`-aware 1B calculation** — read line items from Xero to compute real 1B instead of total/11
4. **Dext re-export** — the `import-dext-to-pipeline.mjs --scrape` script exists but is unused. **Open question: is Dext still active?** If yes, we should scrape before cancellation. If already cancelled, skip — everything post-Dext is in `receipt_emails` already.
5. **`gmail_messages` full sync** — the table has only 25 rows. If we want proper historical email search for future gap sweeps (rather than relying on receipt_emails), this needs a real backfill.
6. **Receipt matcher tolerance tuning** — the `--ai` matcher only promoted 0/114 ambiguous matches. Worth investigating whether the AI scoring prompt is actually being called and what it returns.
7. **Enrich vendor contacts with ABN + email** — per 17 Mar plan, still open. Needed for ABR cross-check and auto-resend workflow.

---

## 🚦 SUGGESTED EXECUTION ORDER

**This week (before sending accountant email):**
1. Nic: approve deferral email → Ben sends
2. Ben: 40 min bank transfer reconciliation (Priority 1.1)
3. Ben + Claude: build + run `link-stuck-receipts.mjs` (1 hr build, 30 sec run) to clear the 106 auto-matches

**Next week (while waiting for accountant):**
4. Ben: Qantas portal download + bulk upload (~2 hours)
5. Ben: Uber portal download + bulk upload (~1 hour)
6. Ben: phantom payables Remove & Redo for the 60 matched (~90 min)
7. Nic: review and sign off on write-off decisions + 1B verification

**Before 28 Apr:**
8. Ben: re-run `prepare-bas.mjs Q2 --save` and `Q3 --save` to refresh numbers after all the cleanup
9. Ben: re-send updated worksheets to accountant
10. Accountant: lodge both BAS

---

## OPEN QUESTIONS FOR BEN

1. **Is Dext still active** and do you have login to export? (Needed to decide if we scrape.)
2. **Should I build `link-stuck-receipts.mjs`** right now to automate the 106 auto-matches? (~1 hour, saves 90 min of clickwork.)
3. **Should I build `bulk-upload-receipts.mjs`** for the portal download workflow? (~1 hour, saves significant time every quarter going forward.)
4. **The Nicholas Marchesi $51K and Nicholas $21K items in Q2** — are those legitimately business SPEND, or owner drawings misclassified? If drawings, they need to be re-coded before lodgement.

Answer these four and I'll keep going.

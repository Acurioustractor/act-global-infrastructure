# Standard Ledger — Onboarding / Review Response

**Entity:** Nicholas Marchesi (sole trader, trading as A Curious Tractor / "ACT Everyday")
**Date:** 16 June 2026
**Prepared by:** Ben Knight (ACT)
**Figures verified against:** live Xero, tenant *Nicholas Marchesi* (`786af1ed…`), pulled 16 Jun 2026.

> **Context, up front:** this file is mid-reconciliation ahead of the sole-trader → A Curious Tractor Pty Ltd cutover on 30 June 2026. The static accounts (fixed assets, Heritage loan, income tax, retained earnings) are stable; the reconciliation-sensitive accounts (the two banks, the card, AP, drawings, funds-introduced) are actively moving as transactions are coded. So a few balances already differ from your 8 June snapshot — that's expected, and the sequence below is how they settle.

---

## 1. Bank-balance screenshots — *Nic to provide*

Screenshots of the live balance, as at today, for:

| Account | Book bal (your 8 Jun sheet) | Live book bal (16 Jun) |
|---|---|---|
| NM Personal | $375,991.57 | −$388,938 |
| NAB #8536 (NJ Marchesi T/as ACT Everyday) | $288,981.73 | $56,821 |
| NAB #8815 (NAB Visa ACT) | $131,937.70 | ~$64,870 |

**Important framing:** the screenshot (real bank) will **not** match the Xero book figure — the difference is the unreconciled backlog (213 lines on #8536, 321 on #8815). Closing that gap is the reconciliation job below. (Two other accounts exist in the file — *NJ Marchesi T/as ACT Maximiser* savings and an archived *Heritage Visa* — both outside the business scope.)

## 2. Accounts Payable function

- **Mailbox:** supplier invoices are received at **`accounts@act.place`**.
- **Flow:** invoices at that mailbox are captured by **Dext** (OCR) and pushed into Xero as draft bills. In parallel, auto-billing connectors (**Qantas, Webflow, Xero, PayPal, Cognition**) email bills **directly into Xero** — these are the source of the ~170 draft bills currently sitting unapproved.
- **Who actions it:** *Nic to confirm the owner* — the 90+-day backlog suggests approval/matching has not been run consistently, which the reconciliation work will reset.

## 3. Balance Sheet review

Comments are filled into the **Client Comments** column of the attached `balance-sheet-with-client-comments.csv`. The two substantive ones:

### Accounts Receivable — "are these collectible?"
Live AR is **$248,698 across 21 invoices**. Most of the value is aged:

| Invoice | Amount | Age | Status |
|---|---|---|---|
| Homeland School | $44,000 | due 30 Jun | collect (current) |
| Regional Arts Australia | $16,500 | due 30 Jun | collect (current) |
| Brodie Germaine Fitness | $15,400 | 48 days | collect |
| Sonas Properties | $44,000 | 116 days | **coming — payment expected** |
| Rotary Eclub Outback | $82,500 | 418 days | **in progress — being worked through** |
| Social Impact Hub | $21,780 | (due-date mis-keyed) | likely collectible — repeat payer (INV-0272 settled) |
| Berry Obsession | $13,000 | 126 days | likely collectible — commercial, Feb 2026 |
| Feel Good Project | $6,108 | 925 days | **write off** |
| Aleisha Keating ×12 | $5,400 | 270–347 days | **void** (recurring-invoice artifact) |
| Ebony Reimers | $10 | 529 days | write off |

**Answer:** the large aged balances are **collectible, not bad debt** — Sonas ($44K) is coming and Rotary ($82.5K) is being worked through. Net: **~$202K collectible/in-progress**, ~$35K likely collectible (Social Impact Hub is a repeat payer; Berry is a commercial invoice), and only **~$11.5K** to write off (Feel Good Project, Ebony Reimers, the Keating recurring invoices).

### Accounts Payable — "overdue + draft bills?"
Live AP is **$485,116 across 347 bills — 90% ($436,618 / 314 bills) is 90+ days overdue.** This is not live trade debt: it's bills that were paid from the bank/card but never matched, plus Dext duplicates. It clears as the unreconciled bank lines are reconciled. Separately, **170 draft bills ($45,385)** are auto-connector drafts to triage (approve the real ones, delete the duplicates).

**Where the backlog sits (top vendors in the 90+ bucket):**
- 🔴 **The Funding Network — $144,558 (2 bills)** — ~30% of the whole backlog, and almost certainly a **misbooking** (TFN is a fundraising intermediary, not a trade supplier). **First item to investigate** — likely reclassifies out of AP entirely.
- ✈️ **Qantas $43.7K (38 bills) · Virgin $9.2K · Booking.com $3.5K** — travel paid by card, awaiting match (textbook paid-not-matched).
- 🔧 **Real contractor/supplier mix:** Hatch Electrical $50K · The Plasticians $29.8K · Defy Manufacturing $26.3K · AAMI (insurance) $20K · Oonchiumpa $23.9K.

## 4. COA standardisation — **Yes, with one condition**

Happy for you to standardise the chart of accounts — **provided account codes are preserved and only the account names/labels change.** We have automation keyed to account *codes* (e.g. 429, 446, 452, 493, 485). If your standardisation **renumbers or merges codes**, please flag it first so we update those references; if it's a rename-only pass, go ahead.

---

## The clean sequence (how the file settles)

1. **Reconcile the 534 unreconciled bank lines** (#8536: 213, #8815: 321) → clears most of the $485K AP *and* corrects both bank balances and the card.
2. **Triage the 170 draft bills** → approve real, delete connector duplicates.
3. **AR** → Sonas ($44K) and Rotary ($82.5K) are collectible and in progress; confirm Social Impact Hub + Berry; write off only Feel Good Project, Ebony Reimers, Keating (~$11.5K).
4. **Lodge the two overdue BAS** (Oct–Dec 2025, Jan–Mar 2026) — only stable after step 1.
5. **Cutover prep** → split personal (Witta farm, Heritage loan, NM Personal, FFP loans) from business; resolve Nic's loan account (Funds Introduced $1.03M vs Drawings $733K) as part of the 30 Jun Pty structuring.

## Cleanup items acknowledged
- NAB #8536 — 213 unreconciled transactions
- NAB #8815 — 321 unreconciled transactions
- Overdue BAS: Oct–Dec 2025, Jan–Mar 2026

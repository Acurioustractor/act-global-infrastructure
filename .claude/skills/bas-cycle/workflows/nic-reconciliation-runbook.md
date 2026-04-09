# Nic Reconciliation Runbook — Fast and Painless

**For:** Nic (or whoever is doing the Xero UI clicking)
**When to use:** After the automated pipeline has pushed receipts to Xero. The remaining work is 60-70 min of mechanical clicking that can't be automated.

**Mental model:** You're not "approving reconciling." You're doing 3 specific click-tasks in Xero UI. Put music on and don't overthink.

---

## What NOT to worry about

- **The attachments on already-reconciled transactions.** When the pipeline runs, it attaches PDFs/EMLs to transactions that Xero already has as reconciled. These are just sitting there as audit evidence. You don't click on them. Xero auto-displays them in reports.
- **The AUTHORISED (unpaid) bills** — they count for BAS regardless of payment status. Don't touch unless you know a specific bill is wrong.
- **The "remaining MISSING" after you finish** — these are vendor-portal-only receipts (Anthropic, Apple private subs) and genuinely lost paper receipts. Accept ~5% residual as the ceiling.

---

## Setup (2 min)

1. Coffee
2. Full-screen Xero in a browser
3. Open the find-match report in a split screen:
   `thoughts/shared/reports/xero-find-match-Q2-Q3-2026-04-09.md`
4. Put on music that keeps you going through mechanical work

---

## Phase A — Bank transfers (10 min)

**What this is:** Money moved between ACT bank accounts. Doesn't need receipts, just UI reconciliation.

**Xero path:** Bank Accounts → `NJ Marchesi T/as ACT Everyday` → **Reconcile**

**Click path:**
1. Click the **Transfer money** tab at the top of the reconcile screen
2. For each unreconciled transfer line:
   - Click "Transfer money" button next to it
   - Xero shows matching lines on the other account
   - Select the matching line, click Reconcile
3. Repeat until the transfer tab is empty
4. Switch to NAB Visa #8815 → Reconcile → Transfer money tab → finish the last 3

**Expected:** 15 pairs on NJ Marchesi Everyday ($137k), 3 on NAB Visa ($1.1k) = 18 total transfers.

**Key Xero behaviour:** after reconciling each line, Xero auto-advances to the next one. You're not navigating between pages — just click Reconcile → select → Reconcile → repeat.

---

## Phase B — Qantas Find & Match, high-value first (10 min)

**What this is:** Bank SPEND transactions for Qantas flights where the Qantas connector already created a matching bill with the PDF receipt. You're linking the two in Xero.

**Xero path:** Use the direct URLs in the find-match report.

**Click path:**
1. Open the find-match report
2. Scroll to the **Qantas** section (19 pairs, $15k)
3. For each row:
   - Click the "Bank txn" link in the row → opens the unreconciled bank line in Xero
   - Click **Find & Match** (top right of the transaction detail panel)
   - Xero auto-suggests matching bills by amount + vendor
   - Click the matching bill → Reconcile
   - Check the row off in the report (markdown: change `☐` to `☑`)

**Key shortcut:** after reconciling a bank txn from the Find & Match flow, Xero goes back to the reconcile queue automatically. You can close the tab and move to the next row.

**Expected:** 19 Qantas pairs done in ~10 min.

---

## Phase C — Uber + small SaaS Find & Match (10 min)

**What this is:** Same pattern as Phase B but smaller amounts.

**Click path:** Continue down the report:
- **Uber** section: 42 pairs, $1.4k — most should auto-match exactly
- **HighLevel, Webflow, OpenAI, Anthropic, Railway**: 9 pairs, under $1k combined

**Tip:** For exact-tier rows (🟢 in the report), just trust the match and click through without verifying every invoice number. For close-tier (🟡) or loose-tier (🟠), glance at the amounts before confirming.

**Expected:** All 51 remaining pairs done in ~10 min.

---

## Phase D — The 53 residual unreconciled SPEND (15-20 min)

**What this is:** Bank transactions that don't have a matching bill anywhere and need to be categorised directly.

**Xero path:** Bank Accounts → each account → Reconcile → **Create** tab (not Match).

**Click path:**
1. Start with NAB Visa #8815 → Reconcile
2. For each remaining unreconciled line:
   - If it's a known vendor you recognise → type the vendor name, Xero auto-fills account code → Reconcile
   - If it's a bank fee → **Bank Fees** account, **GST Free Expenses** tax code → Reconcile
   - If it's a known SaaS subscription → category `Subscriptions` or `Computer Expenses`, **GST on Expenses**
   - If you have NO idea → check the calendar for that date to jog memory, or leave it (ask accountant later)

**Accounts to know by heart:**
- `429 - General Expenses` (catch-all)
- `404 - Bank Fees` (no GST)
- `485 - Subscriptions` (GST on Expenses)
- `493 - Travel — National` (Qantas, Uber, accommodation)
- `429 - Meals & Entertainment` (cafes, restaurants)

---

## Phase E — Run the completeness check (2 min)

Once you're done clicking, in your terminal:

```bash
node scripts/sync-xero-to-supabase.mjs && node scripts/bas-completeness.mjs Q1 Q2 Q3
```

This refreshes the mirror with your reconciliations and shows the new value coverage. Should be ~96%+ after your work.

---

## If you get stuck

**"I don't recognise this vendor at all"**
Leave it. Check the bank statement, the Google Calendar for that date, or ask the accountant. Unknown < $100 can usually go to General Expenses with GST.

**"Xero says it can't match the amounts"**
Check the tier in the report:
- 🟢 exact — amounts should be identical. If Xero says no match, try searching by invoice number instead.
- 🟡 close — there's a small amount difference (FX, fees). Verify the invoice number matches, then reconcile manually.
- 🟠 loose — amounts differ by 1-5%. Verify carefully. Some of these might be WRONG matches — skip if unsure.

**"The transfer money tab shows weird pairs"**
If the pairs don't make sense (different dates, wrong accounts), don't force it. Skip the weird ones and ask the accountant.

**"I ran out of time"**
Prioritise Phase A (transfers — biggest $ value) > Phase B (Qantas — biggest receipt chunk) > Phase C > Phase D. Everything else can wait.

---

## After you're done

1. Re-run `node scripts/bas-completeness.mjs Q1 Q2 Q3` and note the new % coverage
2. If confidence is ≥95%, send the accountant email (`thoughts/shared/reports/accountant-email-bas-q2-q3-fy26.md`)
3. Celebrate — BAS Q2+Q3 is ready for lodging

---

## Target times

| Phase | Task | Expected |
|---|---|---:|
| Setup | Coffee + screen | 2 min |
| A | Bank transfers | 10 min |
| B | Qantas Find & Match | 10 min |
| C | Uber + SaaS Find & Match | 10 min |
| D | Residual 53 SPEND | 20 min |
| E | Verify | 2 min |
| **Total** | | **~55 min** |

If you're taking more than 90 min, something's off — stop and check whether Xero has stale data that needs a mirror refresh.

---

## Why this runbook exists

Before today, this work looked like a scary 40-hour rodeo of chasing missing receipts, arguing with Dext, and panicking before BAS deadlines. The automated pipeline this week did 95% of the work automatically, so all that's left is 60 minutes of mechanical Xero clicking that no amount of automation can remove — because Xero's reconciliation UI doesn't have a bulk API.

**Your job is just to tell Xero "yes, link these" for an hour. The data is already clean.**

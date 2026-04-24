# Xero BAS Reconciliation — Step-by-Step Walkthrough

**For:** Nicholas Marchesi T/as A Curious Tractor
**Submission date:** 2026-04-22 (Q2 overdue, Q3 due 2026-04-28)
**Companion to:** `bas-submission-ready-2026-04-21.md` (the gap list)

---

## 0. Pre-flight (2 min)

1. Open **go.xero.com** and log in
2. Top-left org picker → select **Nicholas Marchesi T/as A Curious Tractor** (ABN 21 591 780 066) — not the Ventures entity
3. Confirm you're on the Business edition (blue nav bar)
4. Have this walkthrough open on one screen, Xero on the other

**Keep this tab open through the whole session:** Accounting → Reports → Activity Statement (you'll come back to it at the end to submit)

---

## A. Uber bulk Find & Match — 47 transactions (~15 min)

**What you're doing:** Uber Business sends a weekly ACCPAY bill to Xero with a PDF receipt attached. The NAB Visa bank feed creates a *separate* SPEND line for each ride. You need to pair each bank line to its matching bill so Xero knows the receipt is already there.

### Steps

1. **Accounting → Bank accounts → NAB Visa ACT #8815** → click **Reconcile** (blue button)
2. You'll see two columns. Left = bank line (the feed). Right = match options.
3. Type `Uber` in the search box at the top of the reconcile page (filters both columns)
4. For each Uber bank line:
   - Click the bank line on the left
   - Xero usually auto-suggests the matching Uber bill on the right (green "Match" with a tick)
   - If auto-suggested: click **OK** to confirm
   - If not: click **Find & Match** → search "Uber" → tick the matching bill by date → click **Reconcile**
5. Work top-down through the list. Uber bills are dated within 2–7 days of the card swipe.

### Cadence hint

Xero batches Uber rides into a weekly bill. One bill may cover 5–8 ride bank lines. That's normal — click the bill, select the right rides via the checkboxes, confirm the total matches.

### Expected outcome

- Q2: 25 Uber txns ($5–$39 each), Oct–Dec 2025 — all should pair to existing bills
- Q3: 22 Uber txns ($7–$70 each), Feb–Mar 2026 — all should pair to existing bills

If any Uber line *won't* match (no bill exists) → skip, note in a list, come back later.

**After this step, gap drops from 70 → 23 transactions.**

---

## B. Qantas Find & Match — 1 transaction (~2 min)

- **Date:** 2025-11-21
- **Amount:** $281.70
- **Account:** NAB Visa ACT #8815
- **Xero txn ID:** `18475d78-ee58-4087-8e70-736c0f0a2c02`

### Steps

1. Same Reconcile screen as above (NAB Visa #8815)
2. Type `Qantas` in the search box → filter to the $281.70 line dated 2025-11-21
3. Click **Find & Match** → search "Qantas" → tick the matching ACCPAY bill by date/amount → click **Reconcile**

Qantas has 97% bill coverage, so the matching bill should exist.

---

## C. Under-threshold items — document, don't chase (~5 min)

**ATO rule:** If the GST-inclusive amount is ≤ $82.50, a tax invoice is **not required**. The bank statement line is sufficient evidence.

### What to do

1. Open a fresh tab → **Accounting → Reports → Activity Statement** (this is your BAS worksheet for Q2/Q3)
2. For each of the under-threshold items (list below), you don't need to do anything in Xero — just confirm the transaction is categorised correctly (GST type = GST on expenses @ 10% or GST-free depending on vendor) and that the account code is set
3. Optional: add a note in the BAS preparation notebook (Xero → Files → Notes folder) like:
   > "Q2 + Q3 FY26 — under-threshold items totalling ~$571: documented per ATO $82.50 rule, bank statement line sufficient."

### Under-threshold items (no action needed)

**Q2 (1 item):**
- Telstra $80.00 (2025-12-18)

**Q3 (13 items):**
- Xero $75.00
- LinkedIn Singapore $74.99 × 2
- Squarespace $72.90 / $11.80 × 2
- Mighty Networks $71.72
- Webflow $38.41
- OpenAI $30.00, $14.11
- Only Domains $19.79
- Anthropic $15.85, $15.77, $15.76, $9.46
- Linktree $15.78

---

## D. Upload receipts for true chases (~15 min)

These need actual PDF receipts uploaded to the SPEND bank transaction.

### D1. Claude.AI × 2 — $573.52 total (~8 min)

**Step 1 — Download invoices from Anthropic:**
1. Open **console.anthropic.com** → log in
2. Left nav → **Plans & Billing** (or **Billing**)
3. Scroll to **Invoice history**
4. Download PDFs for:
   - February 2026 invoice ($287.07 — bank-charged 2026-02-06)
   - March 2026 invoice ($286.45 — bank-charged 2026-03-06)

**Step 2 — Upload to Xero:**
1. In Xero → **Accounting → Bank accounts → NAB Visa ACT #8815** → **Account transactions** tab
2. Search for "Claude.AI" to find the two transactions
3. Click the first Claude.AI transaction ($287.07, 2026-02-06)
4. Scroll to the right → **Add file** (paperclip icon) → upload the Feb invoice PDF
5. Repeat for the March transaction

### D2. Bunnings $571.10 (2026-02-26) (~3 min)

**Option A — Gmail check first:**
1. Search Gmail across all 4 act.place mailboxes for `Bunnings after:2026/02/19 before:2026/03/05`
2. If receipt found as attachment → download → upload to Xero txn
3. If not found → option B

**Option B — Vendor portal:**
1. **bunnings.com.au** → if Ben has a PowerPass account, receipts are there
2. If no digital receipt exists → this may be an in-store purchase with no emailed receipt → add a note in Xero: "Receipt lost — bank line + card swipe location evidence" and move on. $571 × 10% GST = $51.91 GST claim at risk.

### D3. Chris Witta $591 (2025-10-20) — 2-minute decision

This one needs a decision from you before action:
- **If this was a contractor payment** → Chris should have issued an invoice. Chase via SMS/email.
- **If this was an owner-to-contractor personal transfer that got coded wrong** → recode in Xero:
  1. Open the transaction
  2. Change the account from "NJ Marchesi T/as ACT Everyday" to "Drawings — Nicholas" (880/850)
  3. Change GST type to **BAS Excluded**
  4. Save — this removes it from BAS impact entirely

### D4. Flight Bar Witta $88.95 (2026-02-05) (~2 min)

Small local business. Options:
1. SMS/email the Flight Bar directly — "Hi, can you send me a tax invoice for Feb 5, $88.95?"
2. If no response by tomorrow → note: "local cafe/bar receipt lost, bank line evidence only" — $8.09 GST at risk

---

## E. Run the BAS report (5 min)

Once all reconciliation is done:

1. **Accounting → Reports → Activity Statement**
2. Select the **period**: Q2 = Oct 1 2025 – Dec 31 2025, Q3 = Jan 1 – Mar 31 2026 (do Q2 first, then Q3)
3. Click **Update** — Xero calculates:
   - G1 (Total sales inc GST)
   - 1A (GST on sales)
   - G10 / G11 (Capital / non-capital purchases)
   - 1B (GST on purchases)
   - Net GST (refund or payable)
4. Review each line:
   - **G1 and 1A**: total of all ACCREC invoices issued in the quarter (reviewed against sales records)
   - **G10/G11 and 1B**: total of all ACCPAY bills + SPEND txns coded to expense accounts
   - **W1/W2**: wages and withholding (should be $0 since sole trader, no employees)

### Sanity checks before lodging

Run these in a separate tab while reviewing the BAS:

1. **Accounting → Reports → General Ledger Summary** for the quarter — confirm totals match the BAS
2. **Accounting → Reports → Profit and Loss** for the quarter — does the revenue/expense story match what you remember?
3. **Business → Bank Accounts** — confirm every bank account is reconciled to 100% for the quarter (green tick, no unreconciled lines)

---

## F. Submit the BAS (5 min)

### Option 1 — Direct lodgment via Xero (if Auto Lodgment is active)

1. On the Activity Statement page → **Lodge to ATO** button (bottom right)
2. Confirm the figures → **Submit**
3. Xero returns a lodgment receipt number — save it in Files

### Option 2 — Copy figures to ATO Online Services

If Auto Lodgment isn't set up:

1. Log into **my.gov.au → Australian Taxation Office → Business**
2. Click **BAS and GST** → select the quarter
3. Type the figures from Xero's Activity Statement into each labelled box (G1, 1A, G10, G11, 1B, etc.)
4. **Lodge** — note the confirmation receipt number
5. Return to Xero → **Finalise** the Activity Statement (this locks the period so nothing moves)

### Payment

- If GST is **payable** → ATO sends a payment reference. Pay via BPAY or PayID by the due date (28 April for Q3; Q2 is already late so pay ASAP to stop penalty interest growing).
- If GST is **refundable** → ATO auto-deposits to the nominated bank account (~14 days).

---

## G. Post-lodgment (2 min)

1. In Xero → mark the Activity Statement as **Finalised**
2. Download the PDF of the lodged BAS → upload to **Files → BAS Archive → FY26 Q2** and **FY26 Q3**
3. Update this repo: `node scripts/bas-retrospective.mjs Q2-FY26` and `Q3-FY26` — writes a retro and extracts learnings for next quarter
4. Reply to Ben: "Q2 + Q3 lodged. Net GST [payable/refundable] $X." — he'll tick it off the quarterly ledger.

---

## Emergency escape hatches

- **"I can't find the matching bill for a Uber line"** → skip, move on. Come back at the end.
- **"The Find & Match auto-suggestion is wrong"** → click **Why not?** in Xero, it explains. Override manually.
- **"A transaction has no matching bill and no receipt anywhere"** → that's a D-category chase. Document in the Gaps list, move on. If under $82.50 it's fine. If over, the GST claim on that line should be removed (change GST type from "GST on expenses" to "GST-free") before lodging — conservative play to avoid an audit flag.
- **"I broke something"** → Xero has a full audit trail. **Accounting → Advanced → History and Notes** shows every change. Nothing is unrecoverable.

---

## Time budget

| Step | Estimated time |
|---|---:|
| A. Uber bulk F&M | 15 min |
| B. Qantas F&M | 2 min |
| C. Under-threshold note | 5 min |
| D1. Claude.AI download+upload | 8 min |
| D2. Bunnings hunt | 3 min |
| D3. Chris Witta decision | 2 min |
| D4. Flight Bar chase | 2 min |
| E. Run BAS report + sanity | 5 min |
| F. Submit BAS | 5 min |
| G. Post-lodgment | 2 min |
| **Total** | **~50 min** |

Realistic buffer: 60–75 min if any Uber bills turn out to be missing.

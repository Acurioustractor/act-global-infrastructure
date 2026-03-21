# Xero Bill Matching Fix — Phantom Payables & Missing Receipts

**Created:** 2026-03-17
**Impact:** $190,827 phantom payables, $2,262 GST credits at risk, R&D refund reduced
**Root cause:** Bank transactions reconciled as "Create" instead of "Match to existing bill"
**Fix time:** ~2 hours in Xero UI (batch approach below)

---

## The Problem

Multiple vendors have **automated Xero integrations** that create bills (ACCPAY invoices) with attached receipts. But when the bank feed shows the matching charge, the accountant (or Xero's auto-reconciliation) is **creating a new spend transaction** instead of **matching it to the existing bill**.

Result:
- Bills sit as AUTHORISED forever → inflates Accounts Payable ($190K phantom)
- Bank transactions have no attachments → shows as "missing receipt"
- Double-counting risk if bills are ever paid again
- R&D refund reduced because receipts aren't linked to bank transactions

## Affected Vendors

| Vendor | AUTHORISED Bills | Amount | Has Attachments | Source |
|--------|-----------------|--------|-----------------|--------|
| **Qantas** | 37 | $43,620 | ✅ All | Qantas Business Rewards → Xero |
| **Uber** | 36 | $1,401 | ✅ All | Uber Business → Xero |
| **Rasier Pacific** (Uber rides) | 18 | $674 | ✅ All | Uber Business → Xero |
| **Virgin Australia** | 7 | $8,815 | ✅ All | Virgin Business → Xero? |
| **Booking.com** | 9 | $3,572 | ✅ All | Booking.com → Xero |
| **Hatch Electrical** | 3 | $30,017 | ✅ All | Manual bills |
| **Defy Manufacturing** | 4 | $25,395 | ✅ All | Manual bills |
| **Maleny Hardware** | 21 | $2,177 | ✅ All | Xero integration? |
| **Webflow** | 9 | $923 | ✅ All | Webflow → Xero |
| **Cognition AI** | 4 | $1,142 | ✅ All | Auto-bill |
| **Woodfordia** | 4 | $1,263 | ✅ All | Manual bills |
| **Other** | ~100+ | ~$70K+ | Mixed | Various |
| **TOTAL** | **262** | **$190,827** | | |

## What's Connected to Xero (Auto-Bill Sources)

These integrations create ACCPAY bills automatically with receipt PDFs:

1. **Qantas Business Rewards** — Connected since Sep 4, 2025
   - Shares: flights, seats, bags, carbon offsets
   - Does NOT share: hotel, car, phone/agent bookings
   - Creates numbered bills (081-XXXXX format) + e-ticket PDFs

2. **Uber Business** — Connected (creating bills with RB-prefix numbers)
   - 36 bills as AUTHORISED with receipt attachments
   - "Rasier Pacific" is also Uber (18 more bills)
   - Total: 54 Uber-related AUTHORISED bills

3. **Virgin Australia** — Likely connected (7 AUTHORISED bills with attachments)

4. **Booking.com** — Likely connected (9 AUTHORISED bills with attachments)

5. **Webflow** — Auto-billing (9 AUTHORISED bills)

6. **Maleny Hardware** — Possibly Xero-to-Xero invoicing (21 AUTHORISED bills)

---

## The Fix: Step-by-Step in Xero

### APPROACH 1: Un-reconcile & Re-match (Cleanest, for Q3 March transactions)

This is the correct accounting approach — links bank transaction → bill → receipt.

**For Qantas March 2026 (14 bills, ~$18.5K):**

1. Go to **Accounting → Bank accounts → NAB Visa ACT #8815**
2. Click **Account Transactions** tab
3. Filter: Contact = "Qantas", Date = March 2026
4. For each transaction:
   a. Click the transaction to open it
   b. Click **Options → Remove & Redo** (this un-reconciles it)
   c. The bank line reappears in the reconciliation queue
5. Go to **Bank accounts → NAB Visa → Reconcile** tab
6. For each Qantas bank line, click **Find & Match**
7. The matching Qantas bill (same amount) will appear → select it → **Reconcile**
8. This links: bank transaction ↔ bill ↔ receipt attachment ✅

**Match list for March Qantas:**

| Bank Date | Bank Amount | → Match To Bill | Bill Amount | GST |
|-----------|-------------|-----------------|-------------|-----|
| 2026-03-03 | $2,178.08 | 081-2384032736 | $2,178.08 | $0 |
| 2026-03-04 | $1,366.51 | 081-2384081782 | $1,365.84 | $0 |
| 2026-03-03 | $1,236.97 | 081-2384021223 | $1,236.97 | $112.45 |
| 2026-03-03 | $1,112.89 | 081-2384034814 | $1,112.89 | $0 |
| 2026-03-03 | $854.82 | 081-2384033140 | $854.82 | $0 |
| 2026-03-03 | $838.74 | 081-2384034500 | $838.74 | $76.25 |
| 2026-03-03 | $676.38 | 081-2384033647 | $676.38 | $5.91 |
| 2026-03-03 | $452.38 | 081-2384032117 | $452.38 | $41.13 |
| 2026-03-03 | $415.90 | 081-2384058290 | $415.90 | $37.81 |
| 2026-03-04 | $329.22 | 081-2384105663 | $329.22 | $29.93 |
| 2026-03-03 | $236.16 | 081-2384036864 | $236.16 | $21.47 |
| 2026-03-03 | $179.88 | 081-2384036520 | $179.88 | $16.35 |
| *(missing bank match)* | | 081-2384059457 | $669.88 | $60.90 |
| *(missing bank match)* | | EVTAFC | $8,006.84 | $0 |

**Note:** EVTAFC ($8,006.84) is likely an event/group booking — may have been paid differently (bank transfer? different card?). Check bank statements.

**For Uber March 2026 (8 bills, ~$235):**

Same process. Filter Contact = "Uber", Date = March 2026.

| Bank Date | Bank Amount | → Match To Bill | Bill Amount |
|-----------|-------------|-----------------|-------------|
| 2026-03-06 | $13.06 | RB19874778170 | $13.06 |
| 2026-03-04 | $56.87 | RB19781822910 | $56.87 |
| 2026-03-04 | $31.01 | RB19781823640 | $31.01 |
| 2026-03-04 | $43.28 | RB19781823610 | $43.28 |
| 2026-03-03 | $12.35 | RB19781823910 | $12.35 |
| 2026-03-03 | $29.23 | RB19781823780 | $29.23 |
| 2026-03-03 | $30.28 | RB19781823840 | $30.28 |
| 2026-03-03 | $24.35 | RB19781823990 | $24.35 |
| 2026-03-03 | $25.32 | RB19781823230 | $25.32 |
| 2026-03-03 | $24.61 | RB19781857210 | $24.61 |

### APPROACH 2: Bulk "Add Payment" on Bills (Faster, for older transactions)

For Q1/Q2 transactions that are long-reconciled, un-reconciling creates risk. Instead:

1. Go to **Business → Bills to pay** → filter by vendor (e.g., Qantas)
2. Select the AUTHORISED bills that you KNOW have been paid via bank
3. Click **Make a payment** on each:
   - Bank Account: NAB Visa ACT #8815
   - Amount: Full amount
   - Date: Match the bank transaction date
   - Reference: "Matching to reconciled bank txn"
4. This marks the bill as PAID
5. A new payment entry appears — go to reconcile and match it to the bank line
   (Xero should auto-suggest the match since amounts are identical)

**Caution:** If the bank line is already fully reconciled, the payment may create an unmatched item. In that case, you may need to un-reconcile the original bank transaction first.

### APPROACH 3: Void Old Bills (Pragmatic, for very old unmatched bills)

For bills from Q1 FY26 (Jul-Sep 2025) where matching is impractical:

1. Go to **Business → Bills to pay** → filter AUTHORISED → sort oldest first
2. For each old bill where the bank transaction was already reconciled months ago:
   - Open the bill → **Void** it
   - The receipt/attachment information is preserved in Xero history
3. This removes the phantom payable without creating accounting complications
4. **Do NOT void** if the bill genuinely hasn't been paid yet

---

## Fastest Path (Recommended)

### Q3 (Jan-Mar 2026) — Fix properly: ~45 min

1. Open Xero → Bank accounts → NAB Visa → Account Transactions
2. Filter March 2026, sort by Contact
3. **Qantas** (14 txns): Remove & Redo each → Match to bill from list above
4. **Uber** (10 txns): Remove & Redo each → Match to bill from list above
5. **Booking.com** (check if any March): Same process
6. Total: ~25 transactions × ~2 min each = ~50 min

### Q2 (Oct-Dec 2025) — Fix properly: ~30 min

Same process for the ~15-20 Qantas + Uber transactions from Q2.

### Q1 (Jul-Sep 2025) — Pragmatic void: ~15 min

1. Business → Bills to pay → AUTHORISED → Date before Oct 2025
2. Cross-reference against bank reconciliation
3. Void bills that correspond to already-reconciled bank transactions
4. Keep any bills that are genuinely unpaid

### Other Vendors — Triage: ~30 min

| Vendor | Action |
|--------|--------|
| **Hatch Electrical** ($30K) | CHECK — are these genuinely unpaid? |
| **Defy Manufacturing** ($25K) | CHECK — recent builds, may be genuinely owing |
| **Peak Up Transport** ($12K) | CHECK — may be paid via different account |
| **Thais Pupio Design** ($17K) | CHECK — design work, verify payment status |
| **Virgin Australia** ($8.8K) | Same fix as Qantas — match to bank txns |
| **ATO** ($5.4K) | CHECK — these may be genuine BAS/tax payments due |
| **Maleny Hardware** ($2.2K) | Match or void — 21 small bills |

---

## Prevention: Stop This From Happening Again

### 1. Bank Rule Setup in Xero (UI only — can't automate)

Create bank rules for each auto-billing vendor:

- **Rule: Qantas** — When bank line contains "QANTAS", suggest "Match to existing bill" first
- **Rule: Uber** — When bank line contains "UBER", suggest "Match to existing bill"
- **Rule: Virgin** — When bank line contains "VIRGIN", suggest "Match to existing bill"
- **Rule: Booking.com** — When bank line contains "BOOKING.COM", suggest "Match"

Go to: **Accounting → Bank accounts → NAB Visa → Manage Rules**

### 2. Reconciliation SOP for Accountant

Share this with your accountant:

> **Before clicking "Create" on any bank line:**
> 1. Check if there's a matching bill under "Find & Match"
> 2. Vendors that auto-create bills: Qantas, Uber, Virgin, Booking.com, Webflow
> 3. Always "Match" to existing bill rather than "Create" for these vendors
> 4. The bill has the receipt attached — matching links it to the bank transaction

### 3. Our Automation Can Help

Add to `tag-xero-transactions.mjs`:
- Check for AUTHORISED bills with matching SPEND amounts
- Alert via Telegram when phantom payables are detected
- Weekly report of unmatched bills vs bank transactions

---

## Impact of Fixing This

| Metric | Before Fix | After Fix |
|--------|-----------|-----------|
| Outstanding payables | $190,827 | ~$60K (genuinely unpaid) |
| Q3 receipt coverage | 28% (83/293) | ~65%+ (170+/293) |
| BAS confidence score | 66% MEDIUM | 80%+ HIGH |
| R&D receipted spend | 17% (ACT-IN) | ~60%+ (ACT-IN) |
| GST credits at risk | $2,262 | ~$800 |
| Balance sheet accuracy | Overstated liabilities by ~$130K | Accurate |

---

## Key Insight

**The receipts already exist in Xero.** They're sitting on ACCPAY bills with PDF attachments. The entire "missing receipts" problem for Qantas ($19.5K) and Uber ($1.7K) is actually a **reconciliation workflow problem**, not a receipt capture problem. The automated connections are working perfectly — the human reconciliation step is just not linking them correctly.

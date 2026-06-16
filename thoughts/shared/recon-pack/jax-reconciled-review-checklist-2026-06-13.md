# JAX Reconciled-page review — catch what auto-matched wrong (2026-06-13)

**Why:** JAX auto-reconciles high-confidence lines by **payee + amount**. That's the **amount-not-date trap** — two equal amounts weeks apart can auto-match to the wrong thing — and ACT's track record is double-counting. So before the BAS locks, check what JAX has *already* cleared, not just what's left. This is ~15 minutes and it's the one real risk in letting AI reconcile.

**Where:** Xero → the new **Reconciled** page (the JAX view that shows bank + accounting side by side). Filter to auto-reconciled lines; each shows its method (**Match / Memory / Prediction / Rule**). The risk is concentrated in **Match** (it matched to an existing bill/txn) and **Prediction** (cross-Xero guess).

**The one rule:** for every auto **Match**, confirm **vendor AND date both align** — not just the amount. If the matched bill is a different date or a different obligation, it's wrong → **unreconcile → redo** (Find & Match the correct line, or Transfer, or Create).

## Search these danger names specifically

| Search | What JAX might have got wrong | What "right" looks like |
|---|---|---|
| **Telford Smith** | The 2×$19,800 is a **real double-payment** (recovery item). JAX may have auto-matched one payment to the wrong bill, or collapsed the pair so the double-payment hides. | **Both** $19,800 payments still visible; neither deleted; each matched to its own bill (or parked for SL). Never one matched to cover both. |
| **The Funding Network / TFN** | The $89,361 + $55,197 are grant distributions **miscoded as expense bills** (being voided). JAX may have auto-matched a bank line against one, reinforcing the $13,141 GST error. | **No** bank line matched to these bills — they're pending void, not payment. If JAX matched one, unreconcile it. |
| **Nicholas / Marchesi** | Founder draws — round amounts ($15,000, $6,159…) to equity acct **880**. JAX may have predicted them as vendor spend or matched to an unrelated bill. | Coded to **880 equity / drawings**, not an expense account; not matched to a vendor bill. |
| **Airbnb** | The $2,324.80 **charge has a matching refund** — they net to zero. JAX may have reconciled the charge as a real expense and left the refund, or vice-versa. | Charge **offset against its refund** (nets to zero), not booked as a standalone expense. |
| **Qantas** | Multiple same-amount charges across dates — prime amount-not-date territory. | Each card line matched to **its own** booking by date, not swapped. |

## Two more sweeps

- **Equal-amount / different-date pairs** generally — anything from `dup-worklist-q2q3-2026-06-11.md`. If JAX auto-matched a line whose twin is weeks away, it's the trap. Verify date.
- **"INTERNET PAYMENT" cluster** (~11 lines, ~$12K) — these are card **repayments** that can look like spend. Confirm JAX treated them as **Transfers** (from Everyday), not coded as expenses. If coded as spend, unreconcile and redo as a Transfer.

## How to fix a wrong one
On the Reconciled page → open the line → **Unreconcile** → it returns to the Reconcile tab → redo correctly (Find & Match the true line by ID, or Transfer, or Create). Your `/finance/reconcile` co-pilot's **DANGER badge** flags the same risky lines — keep it open beside this to cross-check.

## Done =
Every danger-name search comes back clean, the INTERNET PAYMENT lines are Transfers, and no equal-amount pair is mismatched on date. Then the auto-reconciled set is trustworthy and the BAS can build on it.

*Pairs with `bank-rules-setup-sheet-2026-06-13.md` (lift JAX's accuracy going forward) and `research-one-click-reconcile-and-receipts-2026-06-13.md` (the why).*

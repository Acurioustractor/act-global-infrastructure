# ☀️ Morning Reconcile Runbook — Q2 + Q3 FY26 BAS to 100%

**Prepared:** 2026-06-01 (night-shift, READ-ONLY) · **For:** Ben, in Xero tomorrow · **Entity:** Nicholas Marchesi T/as A Curious Tractor (ABN 21 591 780 066)

> **The boundary:** everything below is *prepared* — classified, verified, coded. The actual matching, deleting, voiding and the final **reconcile click stay in Xero** (the API can't set IsReconciled). Work top-down; each step is "execute what's already decided," not "figure it out."

## Where the two quarters stand (fresh, 2026-06-01)

| | Q2 (Oct–Dec) | Q3 (Jan–Mar) |
|---|---:|---:|
| Net GST payable | **$8,689.19** | **$5,942.81** |
| — G1 sales / 1A collected / 1B paid | $349,269 / $31,566 / $22,877 | $170,022 / $15,514 / $9,571 |
| NAB Visa reconciled | 72% | 67% |
| Receipt coverage | ~94% (gap all sub-threshold) | ~94% (5 above threshold) |
| Confirmed duplicates → delete | 22 ($18,162) | 16 ($6,443) |
| DRAFT payables → send/void | 71 ($9,270) | 53 ($6,049) |

**Combined net GST payable ≈ $14,632.** Receipts are *not* the blocker — reconciliation is.

## The order of operations (highest GST-accuracy first)

### Step 1 — Delete the confirmed duplicates (38 lines, ~$24,605) 🔴 biggest accuracy win
Same purchase recorded twice (Dext bill + bank-feed card txn). In Xero: match the bank line to the bill, then **delete the duplicate card txn**. Add any surcharge as an Adjustment.
- Q2: 22 dups → `recon-pack/q2-fy26-reconciliation-pack.md` §1
- Q3: 16 dups → `recon-pack/q3-fy26-reconciliation-pack.md` §1
- **GST verify:** if a duplicate card txn was GST-bearing AND counted in 1B, deleting it reduces 1B (raises net payable) — up to ~$1,651 in Q2. Check each in Xero; don't assume.

### Step 2 — ⚠️ DO NOT delete these (3) — verified false positives
- **Townsville City Council $44.90** — bill is *Sunshine Coast Council*; different entity.
- **Good Morning Coffee $58.74** — collision; the $55.96 line is the real match, this is a separate purchase.
- **Bitwarden $17.75** (Q3) — bank is *less* than the $17.87 bill (FX/rounding, not a surcharge). Handle as a normal line, not a dup.

### Step 3 — Match to existing bill/txn (Q2: 17 · Q3: 52)
Find & Match by the contact name shown. Add surcharge Adjustments where flagged. Approve any DRAFT bill first, then match. → §2 of each pack.

### Step 4 — Verify "already in Xero" (Q2: 14 · Q3: 6)
A reconciled txn already exists — do NOT create. Either reconcile the bank line against it, or it's a stale duplicate import. The packs note the per-line recommendation. → §3.

### Step 5 — Create coded transactions (the bulk)
Work in tiers (packs §4–6):
- 🟢 **Bulk-confirm** (Q2: 34 · Q3: ~57) — high-confidence + transfers; confirm and go.
- 🟡 **Skim-confirm** (Q2: 67 · Q3: 50) — clear single guess; quick yes/no, mostly "confirm which site."
- 🔴 **Decide** (Q2: 92 · Q3: 62) — your real attention: low-confidence, possibly-personal, unknown vendors.
- **Flagged for you specifically:** Qatar Airways $5,068 (Q3) — confirm World-Tour / overseas-finding R&D apportionment. Any `PERSONAL?` line — drawings vs business.

### Step 6 — Clear DRAFT payables (Q2: 71/$9,270 · Q3: 53/$6,049)
Each DRAFT ACCPAY bill: send it or void it. Until then they're "phantom" payables.

### Step 7 — Re-run GST + verify, then lodge
```bash
node scripts/prepare-bas.mjs Q2 --save   # after cleanup
node scripts/prepare-bas.mjs Q3 --save
```
Reconcile 1A/1B against the canonical accrual P&L (`project_monthly_financials`) before lodging. Then lodge (you / accountant).

## Receipts (your "get everything in" note)
Already near-maxed: bill→txn copy exhausted (1 pair left), pool matcher has 0 confident auto-matches left (336 unmatched, mostly sub-threshold SaaS — Stripe/Xero/Audible). Genuine remainder:
- **5 Q3 receipts above the $82.50 threshold** — worth chasing: `node scripts/gmail-deep-search.mjs Q3`.
- 221 ambiguous pool matches — review-and-link if you want maximal coverage (won't move GST).
- The "no-receipt-needed" lines (bank fees, transfers, drawings) genuinely have no receipt to attach.

## Estimated time
Steps 1–4 (delete/match/verify ~150 lines, mostly mechanical): ~60–90 min across both quarters. Step 5 (creates — bulk+skim fast, decide slower): ~60–90 min. Steps 6–7: ~30 min. **~3 hours to both quarters at 100%, lodgement-ready.**

## Provenance & packs
- Q2 pack + provenance: `recon-pack/q2-fy26-reconciliation-pack.md` (+ `.provenance.md`)
- Q3 pack: `recon-pack/q3-fy26-reconciliation-pack.md`
- BAS worksheets: `reports/bas-worksheet-q{2,3}-fy26-2026-06-01.md`
- Completeness: `reports/bas-completeness-Q{2,3}-FY26-2026-06-01.md`
- Dext source: `recon-pack/dext/q{2,3}-dext-2026-06-01.csv`

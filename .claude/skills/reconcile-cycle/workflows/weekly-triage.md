# Weekly triage — the reconcile-cycle runbook

The recurring pass that keeps the NAB Visa from piling up. ~15 min once the backlog is cleared. Work in
value order: duplicates first (they double-count and inflate spend), then matches, then creates.

## 0. Orient (read the learning loop first)

- Read `references/confirmed-duplicates.md` + `references/vendor-aliases.md` so you don't re-investigate
  settled lines or re-puzzle messy descriptors.
- Open the cockpit: `https://command.act.place/finance/reconcile`. Or locally on port 3002.

## 1. Duplicates — recover the double-counted money

- Click the **Duplicates** tile (filters the list). Work top-down (biggest first).
- For each: open the bill + card txn shown side-by-side; eyeball the **receipt image** to confirm it's the
  same purchase.
- In **Xero**: match the bank line to the bill, then **delete the duplicate spend txn**.
- Append the resolved pair to `references/confirmed-duplicates.md` (`RESOLVED`, date, who).

## 2. Match to bill — clear the easy wins

- Click **Match to bill** / **Match txn**. For each, in Xero: Find & Match by the contact name shown.
- If a **surcharge badge** shows, add an **Adjustment line** for the Δ so the bank line clears to zero.
- A **DRAFT** bill → approve it first, then match.

## 3. Create — code the genuinely new spend

- Click **Create**. These have no existing Xero record. Use the suggested **project** + **receipt image**.
- Trust nothing blind: the account guess for unseen vendors is heuristic ("code by hand" = exactly that).
- Watch for **`880 - Drawings (personal?)`** suggestions (AMZNPRIME, Audible, etc.) — confirm personal vs
  business; personal → Drawings, not a project (this is the founder-drawings R&D-basis trap).
- **Phase 1 = read-only:** record the coding decision; the actual Xero create/attach is Phase 2
  (`references/phase2-xero-writeback.md`, Tier 3, day-shift, explicit go).

## 4. Export the worklist for Standard Ledger

```bash
node scripts/reconciliation-worklist.mjs            # → scripts/output/reconciliation-worklist-*.md
node scripts/build-sl-reconcile-sheet.mjs           # full per-line sheet (bulk backlog)
```

## 5. Close the loop

- New confirmed duplicates → `references/confirmed-duplicates.md`.
- New messy descriptor you had to decode → `references/vendor-aliases.md`.
- Money sanity check: any total you quote must reconcile against `project_monthly_financials` (accrual P&L).
- Update SKILL.md "Current state" line if the counts moved materially.

## Guard recap

Two-account rule · exclude DELETED/VOIDED · sum in SQL not supabase-js · surcharge ≠ duplicate ·
the reconcile click stays in Xero.

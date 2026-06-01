# Weekly triage — the reconcile-cycle runbook

The recurring pass that keeps the NAB Visa from piling up. ~30 min/week once the backlog is cleared. Work in
value order: duplicates first (they double-count and inflate spend), then matches, then creates.

## The system (Dext → Xero → Supabase → cockpit → Notion)

Three cadences, deliberately split by cost:

1. **Always-live (no cron):** `/finance/reconcile` is the operating surface — it queries Supabase on every
   load, so it's always current. The reconcile click stays in Xero (API can't set IsReconciled).
2. **Weekly nudge (cheap, cron):** `node scripts/weekly-card-reconcile.mjs` hits the live cockpit engine and
   emits a 5-line digest (unreconciled count, duplicates to delete + $ recoverable, decisions needed). It
   re-classifies nothing — single source of truth. Append it to the Monday `weekly-reconciliation.mjs`
   Telegram/Notion push (see "Cron wiring" below). This is Ben's prompt to spend 30 min.
3. **Deep-code (expensive, on-demand — monthly / pre-BAS):** when a batch of new CREATE lines has built up,
   run the agent coding workflow (the `q2-reconcile-full` pattern: fetch the create lines → batch agents →
   propose project/account/personal). Token-heavy, so NOT weekly. Output → an SL pack like
   `thoughts/shared/recon-pack/q2-fy26-reconciliation-pack.md`.

The flow: **Dext** publishes receipts → **Xero** holds bills/txns → the nightly sync mirrors to **Supabase**
→ the **cockpit** classifies live → the weekly digest lands in **Notion/Telegram** → Ben triages 30 min →
confirmed codings feed the learning loop (`references/coding-patterns.md`, `vendor-aliases.md`) so next
week's Decide tier is smaller.

## Cron wiring (Tier-2 — propose before installing)

Add to the Monday chain (after `weekly-reconciliation.mjs`):
```bash
RECONCILE_API_BASE=https://command.act.place node scripts/weekly-card-reconcile.mjs --json
```
Feed its JSON into the existing weekly Telegram/Notion message, or run without `--json` to get the markdown
block. Auth: if the finance route is gated, set `RECONCILE_API_COOKIE`/`RECONCILE_API_TOKEN`.

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

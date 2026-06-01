# Confirmed duplicates — the learning loop

> **What this is:** duplicates the cockpit has flagged + the human verdict after checking Xero. Append
> after each pass. Next pass reads this so settled lines stop re-surfacing and we don't re-investigate
> the same pair. A "duplicate" = the SAME purchase recorded twice — once as a Dext-published ACCPAY bill,
> once as a bank-feed spend line. Resolution = match the bill, **delete the duplicate card txn**.
>
> **Honesty rule:** a row is only `RESOLVED` once the duplicate has actually been killed in Xero. Until
> then it's `FLAGGED` (cockpit thinks so) or `CONFIRMED` (human eyeballed both, agrees, not yet deleted).
> Never mark RESOLVED on the cockpit's say-so alone.

## Verdict log

| Date flagged | Vendor | Amount | Bill | Card txn | Status | Notes |
|---|---|---|---|---|---|---|
| 2026-06-01 | Airbnb | $4,621.18 | PAID, "Airbnb", 27 Nov 2025 | "Airbnb", 27 Nov, unreconciled | CONFIRMED | Live cockpit example; bill+txn same week, same amount. Delete the card txn. |
| 2026-06-01 | Kennards Hire | $3,745 | PAID, 27 Nov 2025 | 28 Nov, unreconciled | FLAGGED | Verify in Xero before deleting. |
| 2026-06-01 | Defy Design | $3,598 | — | — | FLAGGED | From cockpit duplicate list; eyeball receipt. |

## Known prior duplicates (from session memory — verify against current Xero before acting)

- **Telford Smith ~$19.8K double-pay** — flagged in the Q2/Q3 recode work (memory `xero-q2q3-recon-recode`).
  Treat as CONFIRMED-historical; check whether already resolved before re-flagging.
- **Oct–Dec 2025 cluster** — ~105 duplicate pairs, ~$67.7K total; **RNM $26,845** the single biggest.
  This is the bulk SL backlog (`scripts/build-sl-reconcile-sheet.mjs` is their worklist).

## Aggregate (2026-06-01, FY26 NAB Visa)

Cockpit counts 41 duplicate lines = **$24,727 double-counted** in the *unreconciled* set. (The Oct–Dec
$67.7K figure above includes already-reconciled pairs — different scope. Don't add the two.)

## When you resolve one

1. In Xero: match the bank line to the bill, delete the duplicate spend txn.
2. Move its row here to `RESOLVED` with the date + who did it.
3. If the bank descriptor was messy, also add the mapping to `vendor-aliases.md`.

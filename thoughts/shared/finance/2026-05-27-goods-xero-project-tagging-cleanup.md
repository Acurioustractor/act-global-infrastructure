# Ticket: Xero `project_code` derivation overrides real line tracking (Goods + cross-project)

- **Date raised:** 2026-05-27
- **Source:** Goods funder-figure reconciliation (Goods Asset Register repo) against ACT global Supabase (`tednluwflfhxyucgwigh`)
- **Owner:** act-infra / Xero sync
- **Priority:** High (funder reporting depends on it)

## Summary
`xero_invoices.project_code` (and `xero_transactions.project_code`) is a **derived** field set by competing heuristics recorded in `project_code_source`: `xero_tracking`, `vendor_rule`, `tracking_match`, `keyword_match`. A weaker heuristic can **override the actual Xero line-item Project Tracking**, so project-level financial rollups are unreliable. This surfaced while reconciling Goods funder figures.

## Evidence
- **INV-0303 (Homeland School Company):** all 4 tracked line items are `ACT-GD — Goods` in Xero (TrackingOptionID `63aee6ea-0005-48b8-8019-5fe9666ead29`), but the mirror has `project_code = ACT-JH` with `project_code_source = keyword_match`. A keyword heuristic overrode correct line tracking. (The invoice is genuinely Goods: 65 beds + washers, Maningrida, $44,000 AUTHORISED, due 30 Jun 2026.)
- **Goods ACCREC mismatch:** by `project_code = ACT-GD` there are **29** invoices / **$649,711** paid; by line-item Project Tracking `ACT-GD — Goods` there are **7** invoices / **$237,150** paid. The large grant invoices (Snow, Centrecorp, VFFF) are `project_code = ACT-GD` but are NOT line-tagged Goods; INV-0303 is line-tagged Goods but mis-derived. **Neither method alone is authoritative.**
- Other mis-derivations seen: INV-0327 (The John Villiers Trust) line-tagged Goods but `project_code = ACT-CORE` (`tracking_match`); INV-0317 (PICC) `project_code = ACT-PI` (`vendor_rule`).

## Impact
- Goods funder/revenue figures do not reconcile. Downstream consumers: Goods Enterprise HQ dashboard (Notion), `v2/src/lib/data/grant-content.ts`, Funder Reporting pages.
- Any project P&L or funder rollup keyed on `project_code` inherits the error.

## Root cause
Derivation precedence lets weaker heuristics (`keyword_match`) win over the strongest signal (Xero line-item Project Tracking). Relevant code:
- `scripts/sync-xero-to-supabase.mjs` (sets `project_code_source = 'xero_tracking'`, ~L808)
- `scripts/tag-transactions-by-vendor.mjs` (sets `vendor_rule` ~L263, `tracking_match` ~L272)
- `scripts/lib/project-code-resolver.mjs`
- `vendor_project_rules` table

## Recommended fixes
1. **Precedence:** line-item Project Tracking (`xero_tracking`) must always win. Suggested order: `xero_tracking` > `manual` > `vendor_rule` > `keyword_match`. Never let `keyword_match` override an explicit line tracking option.
2. **Backfill:** re-derive `project_code` for every invoice/transaction that has line-item Project Tracking; set `project_code_source = 'xero_tracking'`. This alone fixes INV-0303 and likely others.
3. **Vendor rule:** add `Homeland School Company -> ACT-GD` to `vendor_project_rules`; audit the keyword rule that matched JusticeHub.
4. **Data-quality guard:** flag rows where derived `project_code` disagrees with the line-item Project Tracking option, for review.
5. Optionally expose `project_code_from_tracking` on the row so consumers can prefer the line-tracking truth directly.

## Live Xero finding (2026-05-27): revenue is untagged at source
A live Xero P&L by the `ACT-GD — Goods` tracking option shows: **FY26 = $53,991 income (all "Other Revenue") + $355,246 expenses; FY24 and FY25 = $0 tagged.** Expenses are well-categorised and tagged; **revenue is essentially untagged.**

This means fix #1 (precedence: prefer line tracking) is necessary but **not sufficient for revenue** — there is no Goods line tracking on the grant/sales invoices to prefer. The underlying Xero invoices (Snow, Centrecorp, VFFF, Homeland, Rotary, QIC, and the commercial buyers) must be **tagged** with the `ACT-GD — Goods` Project Tracking option before any project-tracking-based Goods revenue total is correct. Until then, Goods revenue can only be attributed at the **contact level** (which is what the verified funder figures do). Recommend a one-off bulk tagging pass over Goods revenue invoices (dry-run first), then the derivation precedence keeps it clean going forward.

## Manual tagging worklist (dry-run 2026-05-27)
Script: `scripts/tag-goods-revenue-invoices.py` (dry-run by default; `--apply` writes to live Xero; run `node scripts/sync-xero-tokens.mjs` first for a fresh token). 17 live Goods revenue invoices (ACCREC, mirror `project_code = ACT-GD`). Goal: set Project Tracking = `ACT-GD — Goods` on every revenue line.

**To tag manually in Xero:** open the invoice, Edit, set the "Project Tracking" column to `ACT-GD — Goods` on each line, Approve/Save. The UI allows tracking edits on paid invoices.

### ADD canonical tag (lines currently have NO Project Tracking) — 12 invoices, all PAID
- INV-0259 Centrecorp $37,620 (2 lines)
- INV-0291 Centrecorp $85,712 (2 lines)
- INV-0253 Vincent Fairfax (VFFF) $50,000 (1 line)
- INV-0220 Snow $1,285 (2 lines)
- INV-0240 Snow $16,600 (5 lines)
- INV-0258 Snow $5,545 (3 lines)
- INV-0321 Snow $132,000 (2 lines, FY26 Scale-Up)
- INV-0282 Julalikari $19,800 (3 lines)
- INV-0283 Mala'la $5,434 (2 lines)
- INV-0260 Our Community Shed $13,500 (1 line)
- INV-0308 Our Community Shed $6,765 (2 lines)
- INV-0232 QIC $12,000 (2 lines)

### MIGRATE archived `Goods.` -> `ACT-GD — Goods` — 5 invoices
- INV-0208 Snow $27,500 (1 line on `Goods.`)
- INV-0227 Snow $110,000 (4 lines on `Goods.` + 1 to ADD)
- INV-0268 Snow $110,000 (1 line on `Goods.`)
- INV-0255 Red Dust $15,950 (1 line `Goods.` + 1 to ADD)
- INV-0222 Rotary $82,500 (2 lines `Goods.` + 1 to ADD; AUTHORISED, the rest are PAID)

### Already correct (no action)
- INV-0303 Homeland School ($44K, AUTHORISED) — line-tagged `ACT-GD — Goods` already; mirror only mis-derives it to ACT-JH.
- INV-0327 The John Villiers Trust ($1,200) — already line-tagged Goods.

### Notes
- `Goods.` is an ARCHIVED Project Tracking option (`84297961-be6e-48a7-82f3-18484a287ca3`); `ACT-GD — Goods` is the active one (`63aee6ea-0005-48b8-8019-5fe9666ead29`).
- All ADD targets are PAID; API edits on paid invoices may bounce, but the Xero UI handles tracking edits fine.
- Some grant lines (e.g. Snow INV-0268 $110K) may be coded to a non-income account; tagging fixes project attribution, not income classification (bookkeeper to confirm).
- After tagging, the Goods P&L by `ACT-GD — Goods` should reconcile toward the contact-level funder figures (Snow $402,930 etc.).

## Related: `project_funding_allocations` / `project_funding_drawdowns` carry the same voided-invoice defect
Goods funding drawdowns were auto-backfilled 2026-05-21 (`source = xero_invoice_auto`) from Xero invoices **without excluding VOIDED/DELETED**:
- **Centrecorp** allocation `committed_amount = 832,832` (drawing), 12 drawdowns = $832,832 "drawn" — but only INV-0259 ($37,620) + INV-0291 ($85,712) = **$123,332** are real; the other 10 are voided/deleted. Real position: $123,332 received, ~$265K re-pitched as quotes, $420K relationship commitment.
- **Rotary** allocation status `closed` with $0 drawn, but INV-0222 ($82,500) is AUTHORISED/unpaid = an open receivable, not closed.
- **Snow** committed $395K (ex-GST grant) / 6 drawdowns = $395K — reconciles to the grant agreement; note it is ex-GST and differs from the inc-GST cash received ($402,930).
- **Not in Supabase** (tracked in Notion Grants & Capital Pipeline): QIC $12K, Homeland $44K, and most pipeline funders. Minderoo ($900K proposed) IS in Supabase.

### Fix
1. Drawdown backfill/sync must exclude VOIDED/DELETED/DRAFT (count only paid/authorised).
2. Clean the existing 10 voided Centrecorp drawdown records (or re-run a corrected backfill).
3. Set Centrecorp `committed_amount` to the relationship commitment ($420K), not the sum of invoices incl. voided.
4. Correct the Rotary allocation status (open/awaiting, not closed).

## Reproduce
For all `type = ACCREC` invoices, compare the set where `project_code = 'ACT-GD'` against the set where any line item has Project Tracking option containing "Goods". They differ: 29 vs 7 invoices. Spot-check INV-0303 — `line_items[].tracking[].Option` is all `ACT-GD — Goods` while `project_code = ACT-JH`.

## Acceptance criteria
- INV-0303 `project_code = ACT-GD` (`source = xero_tracking`).
- The Goods ACCREC set by `project_code` matches the line-tracking set, except grant invoices that have no line-level Project Tracking (handled by an explicit, documented rule).
- Precedence documented in `project-code-resolver.mjs`.

## Note for Goods side (already handled)
The Goods repo's `grant-content.ts` / Enterprise HQ tracking already treats INV-0303 as Goods and flags the mirror discrepancy. No Goods-side change is blocked by this ticket; it is a data-quality fix for accurate, auditable funder reporting.

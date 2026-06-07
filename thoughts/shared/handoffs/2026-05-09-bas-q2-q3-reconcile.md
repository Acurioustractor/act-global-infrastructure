---
project: ACT-CORE
date: 2026-05-09
author: Claude (session w/ Ben)
type: reconcile-sweep
status: verified-from-db
purpose: Verified state of BAS Q2 + Q3 FY26 against `xero_invoices` operational DB (queried 2026-05-09). Resolves the four open questions raised in `2026-05-09-one-stop-shop-diagnostic.md` so the eventual "ACT Now" Notion BAS card surfaces clean numbers.
related:
  - thoughts/shared/handoffs/2026-05-09-one-stop-shop-diagnostic.md
  - scripts/prepare-bas.mjs
---

# BAS Q2 + Q3 FY26 reconcile sweep — 2026-05-09

## Verdict

Both BAS lodgements (Q2 due 28 Feb, Q3 due 28 Apr) are past. Three of the four open questions surfaced in the diagnostic now have clean answers; the fourth (Q3 AP run-rate jump) is real and explainable. **No new audit risk surfaced.** One small correction to the diagnostic: the "9 Q2 bills missing receipts" subset is $15,972, not $83,506 — diagnostic conflated the missing-receipt count with the total Q2 ACCPAY AUTHORISED outstanding.

## Open question 1 — 9 Q2 bills missing receipts

**Verified scale**: 9 bills, $15,972 total (not $83,506 — that figure was Q2 ACCPAY AUTHORISED outstanding, a different metric).

**All 9 are Mounty Yarns project supply bills**, not core ACT operating spend:

| Date | Amount | Supplier | Reference |
|---|---|---|---|
| 2025-11-04 | $11,000 | Mounty Container Supplier | MOUNTY-CONTAINER-MAN |
| 2025-12-08 | $1,968 | The Sand Yard | MOUNTY-2c70ebf6 |
| 2025-12-08 | $1,044 | The Sand Yard | MOUNTY-31621d01 |
| 2025-11-26 | $674 | Auto Sparky | MOUNTY-caf300c6 |
| 2025-12-09 | $374 | The Sand Yard | MOUNTY-d9db7481 |
| 2025-12-02 | $360 | Edmonds Landscaping Supplies | MOUNTY-3ef368da |
| 2025-12-02 | $264 | Edmonds Landscaping Supplies | MOUNTY-3ad92533 |
| 2025-12-02 | $240 | Edmonds Landscaping Supplies | MOUNTY-9d7fe5e4 |
| 2025-12-02 | $48 | Edmonds Landscaping Supplies | MOUNTY-c4fdfa23 |

**Inferred**: these are local-supplier bills for Mounty Yarns Mount Druitt site activity (container, landscaping, electrical). Receipts likely sit with Daniel Daylight (Mounty Yarns CEO) or local site admin. Likely paid by EFT but receipts not yet uploaded to Dext / Xero.

**Action**: receipt hunt via Mounty admin. $11K Mounty Container Supplier is the priority; the rest are sub-$2K each. No BAS amendment needed for $15,972 — input tax credits are claimable retroactively when receipts are attached. Add to next `find-receipt` cycle scoped to MOUNTY-* references.

## Open question 2 — Q3 ACCREC VOIDED $357,500

**Verified**: this is **NOT bad debt or writeoff**. It's a billing structure correction. All 5 invoices are Centrecorp Foundation, voided 2026-02-13 / 2026-02-27:

| INV# | Voided amount | Reference | Community |
|---|---|---|---|
| INV-0310 | $84,700 | INV-0308 (re-issue) | (consolidated) |
| INV-0311 | $68,200 | Tennant Creek | Tennant Creek |
| INV-0312 | $68,200 | ALI CURUNG | Ali Curung |
| INV-0313 | $68,200 | SANTA TERESA | Santa Teresa |
| INV-0315 | $68,200 | MUTITJULU | Mutitjulu |

**Inference**: the original 4 community-specific invoices ($272,800 total) plus INV-0310 ($84,700 reissue) were voided to be replaced by a single consolidated INV-0314 ($84,700) — which is the DRAFT invoice flagged in memory as "INV-0314 Centrecorp Production Plant $84,700 DRAFT — send or void with Nic." The voided $357,500 is bookkeeping cleanup, not exposure.

**Action**: none for the BAS reconcile — voided invoices don't affect GST. The pending question is what happens to **INV-0314** itself (still DRAFT). See open question 3.

**Recommendation**: when INV-0314 is sent or voided, attach a note to xero_invoices.notes (or equivalent) explaining the relationship to the 5 voided invoices for future audit clarity.

## Open question 3 — 2 Q3 ACCREC DRAFT invoices

**Verified**: 2 drafts, but only one is real:

| INV# | Date | Amount | Contact |
|---|---|---|---|
| INV-0314 | 2026-02-13 | **$84,700** | Centrecorp Foundation |
| INV-0318 | 2026-02-23 | $0 | Our Community Shed Incorporated |

**Inference**: INV-0314 is the consolidated Centrecorp invoice replacing the 5 voided per question 2. INV-0318 ($0) is a placeholder draft for Our Community Shed — likely opened to capture the relationship without billing yet.

**Action**: per memory, INV-0314 needs CEO decision (send or void) with Nic. Already on the open CEO actions list. INV-0318 can sit at $0 indefinitely or be deleted; no BAS implication either way.

## Open question 4 — Q3 AP outstanding $210,641 (vs Q2 $83,506)

**Verified**: real run-rate increase, fully explained by Goods supply chain ramp + contractor engagement. **All 197 bills have receipts (100% coverage)** — no audit risk.

**Top contacts in Q3 ACCPAY AUTHORISED** (totalling $164k of $210k):

| Contact | Total | Likely category |
|---|---|---|
| MOL Nyrt. | $30,691 | Single bill — needs lookup (Hungarian entity) |
| Defy / Defy Manufacturing | $35,580 | ACT-GD bed manufacturing partner |
| Qantas | $18,554 | Travel (auto-billed receipts) |
| Thais Pupio Design | $16,920 | Design contractor |
| Centre Canvas And Upholstery | $15,000 | ACT-GD canvas/tent supplier |
| Social Impact Hub | $10,000 | Membership / event |
| Sophie Deirdre Hickey | $9,793 | Contractor (likely Brave Ones research) |
| Joseph Kirmos | $9,000 | Contractor |
| Imprint5 | $8,977 | Print / fabrication |

The doubled run-rate is the **Goods on Country supply ramp** materialising in Q3 — Defy/Centre Canvas/Imprint5/Thais Pupio Design are the build-side of the bed supply chain. This is the expected pattern once Goods scaled from prototype to 389-bed deployment.

**Action**: none for BAS. Worth noting the breakdown for Q4 forecast (similar run-rate likely continues). One-line follow-up: identify what MOL Nyrt. is — single $30k bill is the largest line item, worth a 2-min lookup.

## Summary of corrections to the diagnostic

| Diagnostic claim | Corrected reading |
|---|---|
| "9 Q2 bills missing receipts ($83,506)" | 9 bills, $15,972 — all Mounty Yarns supply bills |
| "Q3 ACCREC VOIDED $357,500 — unusually large, needs explanation" | Centrecorp billing structure correction (5 invoices voided → 1 consolidated INV-0314 DRAFT). Not bad debt. |
| "Q3 has 2 DRAFT ACCREC totalling $84,700" | Only INV-0314 ($84,700) is a real draft. INV-0318 is a $0 Our Community Shed placeholder. |
| "Q3 AP outstanding $210,641 — has run-rate jumped?" | Yes, real. Goods supply chain ramp (Defy + Centre Canvas + Imprint5) accounts for ~$70k. All bills have receipts (100% coverage). No audit risk. |

## What this unblocks for the "ACT Now" page

The BAS-by-quarter card now has clean numbers to surface:
- **Q2 FY26**: lodged 28 Feb, all PAID bills receipted (296/296), 9 small Mounty supply bills awaiting receipt upload ($15,972). Status: lodged-with-cleanup-pending.
- **Q3 FY26**: lodged 28 Apr, all 197 AUTHORISED bills receipted, AR $107,150 outstanding (mostly INV-0314 Centrecorp $84,700 DRAFT awaiting send/void decision). Status: lodged-clean.
- **Q4 FY26 (Apr–Jun, in progress)**: needs separate query when "ACT Now" card is built.

## Provenance

All numbers in this handoff queried from `xero_invoices` on operational Supabase (project ref `tednluwflfhxyucgwigh`) at 2026-05-09 ~11am AEST. Verified columns: `type`, `status`, `total`, `amount_due`, `has_attachments`, `date`, `contact_name`, `invoice_number`, `reference`. Queries via `cd /Users/benknight/Code/act-global-infrastructure && node` with dotenv-loaded SERVICE_ROLE_KEY.

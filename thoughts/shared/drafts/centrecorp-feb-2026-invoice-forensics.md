# Centrecorp Feb 2026 invoice batch — forensics

> Drafted: 2026-04-23
> Source: Xero via Supabase MCP, `xero_invoices` filtered to `contact_name = 'Centrecorp Foundation'`
> For: Ben Knight, 10-min reconciliation conversation with Nic or bookkeeper

## What the Xero data actually shows

Eight Centrecorp-related invoices across Nov 2025 → Feb 2026. The Feb batch is the confusing one.

### Successful: INV-0291 (PAID Nov 2025)

| Field | Value |
|---|---|
| Invoice | INV-0291 |
| Date | 2025-11-26 |
| Status | PAID |
| Total | $85,712 |
| Line 1 | 107× Goods Weave Bed v2.3 — **Utopia Homelands**, $560/unit = $59,920 |
| Line 2 | 3× Bed Building Workshop (community engagement + elder co-design + transport + accommodation) @ $6,000 = $18,000 |

This is the 107-bed Utopia Homelands deployment working cleanly. Delivered and paid.

### Deleted: INV-0292

| Field | Value |
|---|---|
| Invoice | INV-0292 |
| Date | 2025-11-26 |
| Status | **DELETED** |
| Total | $53,900 |
| Line 1 | 100× Goods Weave Bed v2.3 — **Central Australia Pilot**, $370/unit = $37,000 |
| Line 2 | 2× Bed Building Workshop @ $6,000 = $12,000 |

Note the lower unit price ($370 vs $560 standard). This looks like a proposed pilot invoice that was never issued.

### Feb 2026 batch — five VOIDED, one DRAFT

**The pattern:** one Production Plant invoice was rewritten (VOID + replacement DRAFT), and four 100-bed orders to four NT/remote communities were all VOIDED with no replacement visible in the data.

#### Production Plant (the $84,700 line)

| Invoice | Status | Total | Reference | Content |
|---|---|---|---|---|
| INV-0310 | VOIDED | $84,700 | INV-0308 | Goods Production Plant part 1 — 6-month trial: 6× month rental @ $12,000 + $5,000 transport/install |
| INV-0314 | **DRAFT** | $84,700 | INV-0308 | Same content, same total — this is the active replacement |

Line 1 on both: "Supply and rental of a mobile shipping container-based plastic processing unit ('Goods on Country Production Plant — Part 1'), fitted out to support community-led plastic recovery and pre-processing. The unit includes equipment and internal setup for: Plastic collection and receival; Storage and safe handling; Sorting and basic quality control; Shredding / size reduction to produce shredded plastic feedstock suitable for downstream Goods production."

**This is real money sitting in draft.** $84,700 for the Production Plant trial has not been billed to Centrecorp. If the agreement is live, INV-0314 needs to be authorised and sent. If not, it needs to be voided too.

*Note on reference:* Both INV-0310 and INV-0314 reference "INV-0308". INV-0308 is the $6,765 Our Community Shed invoice from 2026-01-20 (PAID). That reference linkage is unusual — likely a copy-paste from a prior draft. Worth confirming with the bookkeeper.

#### Four 100-bed orders to four communities (all VOIDED)

| Invoice | Total | Community | Line 1 | Line 2 |
|---|---|---|---|---|
| INV-0311 | $68,200 | **Tennant Creek** | 100× Weave Bed v2.3 @ $560 = $56,000 "100 Beds to the communities for Elderly and Young People" | 1× Workshop @ $6,000 |
| INV-0312 | $68,200 | **Ali Curung** | Same | Same |
| INV-0313 | $68,200 | **Santa Teresa** | Same | Same |
| INV-0315 | $68,200 | **Mutitjulu** | Same | Same |

**Four hundred beds across four communities, invoiced at $272,800 total, all VOIDED on 2026-02-13.** No replacement invoices appear in the Centrecorp contact in the ACT-GD window.

Three possibilities:

1. **Orders proposed, not proceeded.** The Feb 13 invoices were drafted in anticipation of a Centrecorp board approval that did not land as expected. Voided when the decision changed.
2. **Rebilled under different structure.** Possibly split into smaller per-community invoices, or rolled into a different contact (Our Community Shed auspicing, community orgs directly), or issued outside the ACT-GD tracking category.
3. **Proposed only as a pricing quote, never as a real bill.** Centrecorp's March board decision may have approved a different scope.

From the wiki: *"Centrecorp — approved 107 beds for Utopia Homelands; applications submitted for 100 beds across 4 communities."* That 100×4 figure = $272,800 matches exactly. So these four invoices WERE the Centrecorp-approval-pending application. If they were voided Feb 13 and no replacement was issued, either:
- Centrecorp did not approve at the expected level
- The March board approved something different
- Orders are live but invoiced elsewhere

## The 10-minute conversation

Things to resolve with Nic or the bookkeeper:

1. **INV-0314 ($84,700 Production Plant, DRAFT).** Is this a live agreement? If yes, authorise and send this week. If no, void.
2. **400 beds to TC / Ali Curung / Santa Teresa / Mutitjulu.** Did these orders happen? If yes, under what invoice numbers? If no, what actually was approved by Centrecorp in March?
3. **Reference field typo.** Both Production Plant invoices reference INV-0308 which is the unrelated $6,765 Our Community Shed invoice. Fix reference on INV-0314 before sending.
4. **INV-0292 deletion.** Was the Central Australia Pilot at $370/unit ever agreed? Lower unit pricing ($370 vs $560) — is that a pilot discount or a data error?

## Implications for the 6-month plan

If INV-0314 is real and should be sent, that's $84,700 cash plausibly inbound within the May-June window if Centrecorp pays on standard terms. That meaningfully changes the capital runway leading into QBE outcome.

If the 400-bed order is real but invoiced elsewhere, the pipeline picture is much stronger than the Xero ACT-GD view suggests — revenue could be flowing through a different tracking code or contact.

If neither is real, Centrecorp in March 2026 approved less than wiki states, and the buyer pipeline anchor for Centrecorp needs to be updated. The Mar-board line *"100 beds across 4 communities, applications submitted"* needs to be re-phrased based on actual March outcome.

**Either way, 10 minutes with Nic resolves it.**

## What changes when this is resolved

- Xero drift detector's first production run should catch the DRAFT INV-0314 as a "live receivable sitting in draft state" flag.
- Capital Stack Weekly Brief agent (A5) should pull `amount_due > 0 AND status = 'DRAFT'` as a weekly panel.
- Wiki Truth Keeper should verify the "100 beds across 4 communities" line against whatever March outcome was, and update.

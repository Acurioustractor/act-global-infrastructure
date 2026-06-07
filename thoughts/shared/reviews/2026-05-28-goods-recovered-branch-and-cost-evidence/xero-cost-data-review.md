# ACT-GD Cost Evidence Review
*Read-only audit. No files modified. All numbers cite table/column.*
*Date: 2026-05-28*

---

## PART 1 — Recovered Tool Logic

### Files reviewed
- `/tmp/wt-gs-recovered/apps/web/src/lib/services/goods-cost-evidence.ts`
- `/tmp/wt-gs-recovered/apps/web/src/lib/services/goods-finance-ledger.ts`
- `/tmp/wt-gs-recovered/apps/web/src/app/api/goods/cost-allocation/route.ts`
- `/tmp/wt-gs-recovered/apps/web/src/app/org/[slug]/[projectSlug]/goods-cost-allocation-table.tsx`

### Tables and columns read

**Primary: `xero_invoices`**
- Filter: `project_code = 'ACT-GD'`, `type = 'ACCPAY'`, status NOT IN (`VOIDED`, `DELETED`)
- Columns: `id, invoice_number, contact_name, status, date, total, amount_paid, amount_due, has_attachments, line_items, synced_at`

**Secondary: `project_monthly_financials`**
- Filter: `project_code = 'ACT-GD'`, latest month
- Columns: `month, fy_ytd_expenses` (cost evidence) + `fy_ytd_revenue, fy_ytd_net` (ledger view)

**Tertiary: `xero_transactions`**
- Filter: `project_code = 'ACT-GD'`, `status != 'DELETED'`
- Columns: `xero_transaction_id, contact_name, type, total, status, date, has_attachments, is_reconciled`

**Receipts: `dext_receipts`**
- Joined to `xero_transactions` via `xero_transaction_id`
- Columns: `xero_transaction_id, vendor_name, receipt_date, filename, match_confidence, match_method`

**Human decisions: `goods_cost_allocation_decisions`**
- Filter: `project_code = 'ACT-GD'`
- Columns: `line_fingerprint, decision, allocation_scope, notes, decided_at`
- Upsert key: `(project_code, line_fingerprint)` — fingerprint is SHA-256 of `[invoiceId, lineIndex, accountCode, description, lineAmount]`

### Classification logic (5 categories + 2 utility)

Classification is done per line item by `categoryForCostLine(account_code, description, supplier)`:

| Priority | Category | Accounts | Keyword fallback |
|---|---|---|---|
| 1 | Materials | 446, 413 | bed, mattress, plastic, canvas, bedding, sheet, fastener, packag, material, defy, zinus, metal, rw pacific |
| 2 | Direct build / manufacture | 400, 412 | (account only) |
| 3 | Freight and delivery | 425 | freight, courier, transport, barge, delivery, sendle, loadshift, sea swift, peak up |
| 4 | Direct labour / build | 486 | labour, labor, assembly, build, manufactur, contractor, sub-contract, cnc, design |
| 5 | Support and warranty | 451 | repair, warranty, replacement, vehicle, mechanic, field support, support |
| 6 | ACT shared-service support | 493 | admin, software, insurance, accounting, crm, reporting, governance, grant, founder, travel, accommodation |
| 7 | Needs finance review | (all others) | no match |

**Account labels hardcoded in the tool (source: `accountLabel()`):**
- 400: Production / supplier cost bucket
- 412: Bed manufacture / product work
- 446: Bedding / product inputs
- 425: Freight / couriers / delivery
- 486: People / design / partner services
- 493: Field travel / accommodation
- 451: Vehicle / mechanical support
- 447: Equipment / field gear
- 413: Materials / production support

**Account 429 (biggest actual spend bucket — ~$99.9K) is NOT in the tool's label map.** The tool would render it as "Unmapped Xero account" and classify it keyword-only (mostly "Needs finance review" or "Materials" if description mentions defy/rw pacific).

### The $600/bed figure

The tool hardcodes three constants at the top of `goods-cost-evidence.ts`:
```
const LAST_50_START = '2025-10-08';
const LAST_50_END = '2025-12-02';
const LAST_50_COUNT = 50;
```

The `goodsUnitEstimateRows()` function sets:
- `productionMid = 600` (the working estimate)
- `productionLow = 550`, `productionHigh = 650`

The $600 is a **hardcoded planning number** cross-checked against a "cost register, Snow review, and Catalysing Impact draft." It is NOT computed from the Xero data.

An additional **Xero date-window proxy** is inserted into the estimate rows only if `last50Total > 0`:
- Formula: `last50Total / 50` = the bill-total for the Oct 8 – Dec 2 2025 date window divided by 50 beds
- This is labelled "proxy only" / "do not quote as actual delivered cost"
- Based on the real data (see Part 2), the last-50 window total is $49,574.58 across 19 bills, giving a proxy of **$991.49/bed** — which is meaningfully higher than $600 and dominated by non-production costs (travel, small purchases, Defy materials not split to exact bed quantities).

### Human review flow (`goods_cost_allocation_decisions`)

The UI presents up to 18 line items (quota-selected by category). Each row gets 5 action buttons:
1. **Use in last 50** → `decision=include_direct, scope=last_50`
2. **Direct later** → `decision=include_direct, scope=current_batch`
3. **ACT support** → `decision=show_separately, scope=shared_service`
4. **Need receipt** → `decision=needs_receipt, scope=unallocated`
5. **Exclude** → `decision=exclude, scope=unallocated`

Decisions are upserted to `goods_cost_allocation_decisions` keyed on `(project_code, line_fingerprint)`. The authenticated user's email is stored as `decided_by`. As of query time: **0 decisions recorded** (the table is empty for ACT-GD).

---

## PART 2 — Real ACT-GD Cost Data

*Source: `xero_invoices` and `xero_transactions` in the shared ACT Supabase DB, queried 2026-05-28.*

### Supplier bills (xero_invoices, type=ACCPAY, project_code='ACT-GD')

| Metric | Value | Source |
|---|---|---|
| Total bills (incl voided) | 255 | `xero_invoices` COUNT |
| Non-voided/deleted bills | 253 | `xero_invoices` WHERE status NOT IN ('VOIDED','DELETED') |
| Total spend | $424,620.30 | `xero_invoices` SUM(total) |
| Amount paid | $296,251.43 | `xero_invoices` SUM(amount_paid) |
| Amount due | $126,877.78 | `xero_invoices` SUM(amount_due) |
| Date range | 2025-01-28 → 2026-04-16 | MIN/MAX(date) |
| Bills with Xero attachments | 253/253 | `has_attachments` = true |
| Bills: PAID status | 214 | COUNT FILTER status='PAID' |
| Bills: AUTHORISED (unpaid) | 38 | COUNT FILTER status='AUTHORISED' |

**Attachment coverage is excellent: 253/253 bills have Xero attachments.** However this means "file attached in Xero", not necessarily a clean supplier invoice (some may be bank receipts or auto-imports from Dext).

### Bank transactions (xero_transactions, project_code='ACT-GD')

| Metric | Value | Source |
|---|---|---|
| Total transactions | 167 | `xero_transactions` COUNT |
| Total spend | $307,962.21 | `xero_transactions` SUM(total) |
| With attachments | 144/167 | `has_attachments` COUNT |
| Reconciled | 45/167 | `is_reconciled` COUNT |
| Date range | 2025-02-19 → 2026-05-26 | MIN/MAX(date) |

**Note: xero_transactions and xero_invoices overlap.** Defy Manufacturing appears in both (e.g., the 2026-03-27 bills appear as both ACCPAY invoices and SPEND transactions). The tool reads them separately; the $424K bills + $307K transactions cannot be simply summed.

### Dext receipt coverage

- Dext receipts matched to ACT-GD xero_transactions: **1 out of 167**
- This is the weakest link in the evidence chain (tool's own language)

### Line-item coverage

- Bills with line_items populated: **235/253** (93%)
- Bills without line_items: **18** (7%)

### Account code distribution (all line items, source: `xero_invoices.line_items` jsonb)

| Account | Tool label | Line count | Subtotal |
|---|---|---|---|
| 429 | **NOT in tool's label map** | 27 | $99,883.55 |
| 412 | Bed manufacture / product work | 11 | $63,558.82 |
| 400 | Production / supplier cost bucket | 16 | $63,539.65 |
| 446 | Bedding / product inputs | 19 | $46,746.60 |
| 486 | People / design / partner services | 7 | $39,514.55 |
| 425 | Freight / couriers / delivery | 15 | $22,160.27 |
| 451 | Vehicle / mechanical support | 5 | $10,241.75 |
| 493 | Field travel / accommodation | 49 | $8,764.81 |
| 447 | Equipment / field gear | 4 | $7,922.06 |
| 413 | Materials / production support | 4 | $5,415.52 |
| Other (710,463,421,417,449,485,720,453,432,448,420,494,880,411,452) | Various | 109 | ~$14,648 |

**Total from line items ~$382,395** (vs $424,620 bill total — the ~$42K gap is from 18 bills with no line items).

### Category mapping using the tool's account-code logic

| Category | Lines | Subtotal |
|---|---|---|
| Direct build / manufacture (400, 412) | 27 | $127,098.47 |
| **Needs finance review (unmapped accounts)** | 147 | **$120,794.26** |
| Materials (446, 413) | 23 | $52,162.12 |
| Direct labour / build (486) | 7 | $39,514.55 |
| Freight and delivery (425) | 15 | $22,160.27 |
| Support and warranty (451) | 5 | $10,241.75 |
| ACT shared-service support (493) | 49 | $8,764.81 |
| Other (447 — Equipment) | 4 | $7,922.06 |

**$120,794 — nearly 32% of all itemised spend — falls into "Needs finance review" because account 429 is unmapped in the tool.** Account 429 lines are overwhelmingly Defy Manufacturing materials/supplies and Carla Furnishers goods (see below), which should map to Materials or Direct build.

### Top suppliers and probable categories

| Supplier | Bills | Total | Probable category | Notes |
|---|---|---|---|---|
| Defy Manufacturing | 22 | $114,888.20 | Materials / Direct build | Recycled HDPE, bed manufacture (INV-1602: "16 Beds...") |
| Defy | 13 | $65,047.71 | Materials | Same entity, different Xero contact — likely duplicate contact issue |
| Zinus Australia | 7 | $28,690.41 | Materials | Bedding/mattress supplier, fully paid |
| Carla Furnishers | 2 | $22,360.00 | Materials (washing machines) | AUTHORISED, unpaid — **DUPLICATE**: two identical $11,180 bills same date |
| R M Tanner | 1 | $19,950.00 | Capital / equipment | "Triple Axle Tiny House" — coded 486, likely a production facility asset, NOT per-bed cost |
| Peak Up Transport | 4 | $18,912.13 | Freight | Road freight |
| Orange Sky Australia | 13 | $16,458.38 | Washing machines / support | Mostly vendor-rule tagged; mix of equipment hire and service |
| 1300 Washer | 1 | $13,980.00 | Washing machines | Tagged ACT-GD, but line item says "ACT-FM" — **cross-project tagging error** |
| Joseph Kirmos | 3 | $11,737.50 | Labour | 3 bills on ACT-GD ($11.7K); 2 more on ACT-HV ($9K). Labour unclear allocation. |
| Carbatec Brisbane | 3 | $8,726.05 | Equipment / Materials | CNC/woodworking equipment or consumables |

### Last-50 date window (2025-10-08 to 2025-12-02)

- Bills in window: **19** (not 50 — the window was calibrated for a pre-Utopia delivery period)
- Window total: **$49,574.58**
- Proxy: $49,574.58 / 50 = **$991.49/bed** (labelled "proxy only" by the tool)
- The window includes: Defy Manufacturing invoices (~$22K, mostly materials/supplies labelled generic), Carla Furnishers ($22,360 washing machines), Trademutt ($3,270 branded clothing), plus many small travel/food expenses
- This window total is **not representative of per-bed production cost** — it includes washing machines, branded gear, and field travel mixed with materials

### FY26 YTD financials (project_monthly_financials, as at 2026-05-01)

| Metric | Value |
|---|---|
| FY26 YTD expenses | $302,122.82 |
| FY26 YTD revenue | $350,427.18 |
| FY26 YTD net | $48,304.36 |

---

## Quality + Gaps for Funder-Grade Evidence

### Critical gaps

1. **Account 429 is unmapped** (~$99.9K, 27 lines). The tool classifies these as "Unmapped Xero account" / "Needs finance review." These are mostly Defy Manufacturing materials+supplies and Carla Furnishers. Until 429 is added to `accountLabel()` and `categoryForCostLine()`, nearly a third of itemised spend is unclassifiable automatically.

2. **Carla Furnishers duplicate**: Two identical $11,180 bills (same date 2025-11-16, both AUTHORISED, both unpaid). Total $22,360 double-counted in spend totals. **Source: `xero_invoices` duplicate query.**

3. **1300 Washer cross-project tag**: $13,980 bill tagged ACT-GD but line item explicitly states "ACT-FM." Tagged by `project_code_source = 'manual_correction_2026-05-14_ben_washing_machine_audit'`. If this is washing machine stock for Goods delivery, the description needs correcting. If it belongs to ACT-FM, the project tag needs removing from ACT-GD totals.

4. **Defy / Defy Manufacturing split contact**: Same physical supplier split across two Xero contacts. $114,888 (Defy Manufacturing) + $65,048 (Defy) = $179,936 combined — the largest single cost item. No bed-quantity allocation on most lines (generic "Materials & Supplies — ACT-GD" descriptions). Only one invoice (INV-1602, $33,589 for 16 beds) explicitly states bed count, giving $2,099/bed for that batch — far above the $600 planning number, though this appears to be a specific batch.

5. **No allocation decisions recorded**: The `goods_cost_allocation_decisions` table has 0 rows for ACT-GD. The human review UI (allocation table) has never been used. Every line item defaults to `needs_allocation`.

6. **R M Tanner $19,950 "Triple Axle Tiny House"**: Coded to account 486 (People/design/partner services) but is almost certainly a capital asset (production facility / vehicle). Should NOT be in per-bed delivered cost but the tool would currently classify it as "Direct labour / build" due to the 486 account code. This is a significant distortion.

7. **Joseph Kirmos allocation**: $11,737.50 on ACT-GD (3 bills) but 2 more bills ($9,000) on ACT-HV. Per memory, he is 50/50 between projects. The ACT-GD bills are currently AUTHORISED (mostly unpaid). Labour category vs direct build vs admin is unclear.

8. **Last-50 proxy is unreliable**: Window of 19 bills, not 50. Proxy of $991/bed is 65% above the $600 planning number, dominated by washing machines and generic materials. Not usable as per-bed evidence without removing non-bed items.

9. **Dext receipt coverage**: Only 1/167 xero_transactions has a matched Dext receipt. This is the evidential gap the tool itself flags as weakest.

10. **36 bills missing invoice numbers**: Out of 253 bills, 36 have no invoice number. Reduces auditability but all have Xero attachments (253/253).

### What IS strong for funder evidence

- **Attachment coverage**: 253/253 supplier bills have Xero attachments — very strong.
- **Defy Manufacturing INV-1602**: $33,589 for "16 Beds made from previously ordered 19mm recycled plastic sheets. Cut and finished" — this is explicit, auditable, per-batch bed production evidence. ~$2,099/bed for this batch (note: this is manufacturing only, not total delivered cost including materials already purchased separately).
- **Freight suppliers are clean**: Peak Up Transport ($18,912), Loadshift (in txns), Sea Swift pattern matches work. Account 425 lines are unambiguously freight.
- **ACT shared-service rows clearly coded**: 49 lines under account 493 totalling $8,765 are separable overhead.
- **FY26 total from project_monthly_financials**: $302,122.82 expenses, $350,427.18 revenue — gives a project-level story of positive net position.

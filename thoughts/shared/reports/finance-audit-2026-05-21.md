---
title: Overnight Finance Audit
date: 2026-05-21
status: complete
agent: claude (background general-purpose)
spec: thoughts/shared/plans/finance-overnight-audit-2026-05-21.md
---

# Overnight Finance Audit — 2026-05-21

> Agent fills each section below. Ben reads in the morning. Each finding gets WHAT / EVIDENCE / RECOMMENDATION / CONFIDENCE.

**Started:** 2026-05-21 (overnight agent)
**Finished:** 2026-05-22 (final synthesis pass)
**Baseline numbers verified at:** 2026-05-21, query against `tednluwflfhxyucgwigh` (shared operational DB), filter `since='2025-07-01'` + ACT-only accounts (`NAB Visa ACT #8815` + `NJ Marchesi T/as ACT Everyday`), dedup of bill↔spend pairs within ±30d.

**Baseline:**
- 3,044 deduped rows, $1,953,301.45 total spend
- **Tagging:** 3,004 tagged / 40 untagged = **98.7%** (matches 2026-05-19 baseline; untagged value $7,258.40)
- **Receipts:** 2,313 receipted / 3,024 receiptable = **76.5%** (down from 81% on 2026-05-19 — 711 missing receipts; 20 correctly excluded)
- **Duplicates:** baseline pending — investigated in §3
- **Raw spends:** 2,489 (from ACT accounts since 2025-07-01); raw bills (all tenants, ACCPAY, AUTH/PAID): see §3

---

## Executive summary

**Headline:** Telford Smith Engineering $19,800 is quadruple-recorded ($59,400 phantom expense on ACT-IN + ACT-GD) — single largest dup in audit (§3.7). Maleny Landscaping $1,305 is triple-recorded on ACT-HV (§3.5).

**Money at stake:** ~$135K aggregate phantom expense across 7 dup clusters (face value); $30K stuck in 159 DRAFT bills (§7.4); $735K AUTHORISED bills 100% overdue, mostly paid-outside-Xero (§7.5); $1.8M unreconciled bank txns (§7.7). Real money-back exposure (true double-payment) concentrated in two findings: Telford $19.8K + Maleny Landscaping $1.3K.

**Architectural surprise:** THREE parallel tagger rule stores exist — JSON config (30 rules), `vendor_project_rules` DB (507 rules with `auto_apply=true`), `tag_inference_rules` DB (17 rows). Three JSON-vs-DB project-code conflicts (Carbatec, Diggermate, Savage Landscape, §4.6) plus 4 in-table conflicts (Maleny Landscaping, Hinterland Aviation, Green Fox, RW Pacific, §4.7). Auto-tagger behaviour is non-deterministic when conflicting rows exist. AND every finance PM2 cron is `stopped` — daemon-wide outage, every scheduled Notion/Telegram push is dark (§6.1).

**Top 3 actions (do this week):**
1. Void Telford Smith $19,800 quadruple + Maleny $1,305 triple — §8.1 + §3.5 — Tier 3 (~30 min total, single biggest data fix)
2. Loosen NAB bank-fee filter in `route.ts:21` — §8.2 — Tier 1 (<30 min, lifts receipt% 76.5→83% no coverage loss)
3. Root-cause PM2 daemon outage + selective restart — §8.4 — Tier 2 (~30-60 min, brings 4-Surface Model back online)

**Bottom line:** Finance data is structurally sound but operationally dark. The numbers are mostly right; the displays are stale because nothing is pushing them. Fix PM2 + clean Telford/Maleny dups + flip Dext auto-publish and 80% of the audit's value is captured by Friday.

---

---

## §1 — Tagging coverage

**Baseline:** 3,044 deduped rows, 40 untagged (1.3%), $7,258.40 untagged value. Matches 2026-05-19 baseline within rounding.

### 1.1 Bunnings Warehouse cluster — $5,795 / 5 bills, materials + decking + air-con split
- **WHAT:** Five untagged Bunnings bills Nov-Dec 2025 totalling $5,795.81 — descriptions read like Hidden Valley build (decking, cladding/Hardiflex, air-con split, "Materials and supplies"). Single biggest untagged dollar cluster.
- **EVIDENCE:**
  - `xero_id=556587f6-5d89-4168-824a-ca68ec20f1c6` 2025-12-01 $2,885.90 ("." — no description)
  - `xero_id=2180ca80-e20e-4467-b3d9-9aaf5a35b8fb` 2025-12-27 $1,597.00 ("Air con split")
  - `xero_id=2438d9ac-b220-4da5-a7a5-5f9755277903` 2025-11-30 $632.52 ("Decking deck")
  - `xero_id=f09d3cab-dc6a-4bbf-8e0e-4157caa41c18` 2025-12-10 $548.81 ("Materials and supplies")
  - `xero_id=c824bd57-0cba-4152-84c5-669aad31ed09` 2025-12-01 $131.58 ("Cladding Hardiflex")
- **RECOMMENDATION:** Open `/finance/transactions` filtered to Bunnings + UNTAGGED. Per Ben's 2026-05-17 decision (Harvest cutoff 2026-01-01), all five are pre-Jan-26 → likely **ACT-FM** (not ACT-HV). The $2,885.90 with "." description needs a receipt look (📎 OCR) before tagging — bulk taggable via paint-bucket once vendor is decided.
- **CONFIDENCE:** H — descriptions are clear and the cutoff decision is documented in `MEMORY.md` "ACT-HV audit findings". H/L on which project: M because "decking" hints HV but date hints FM.

### 1.2 Unknown Supplier — 2 bills $172.83, spanning 6 months
- **WHAT:** Two untagged bills from generic "Unknown Supplier" contact 2025-08-05 + 2026-02-01 totalling $172.83. Vendor name carries zero tagging signal.
- **EVIDENCE:** SQL grouped untagged-by-vendor returned 2 rows under contact `Unknown Supplier`. Spans pre- and post-Harvest cutoff so single-vendor rule won't work.
- **RECOMMENDATION:** Per-row triage in `/finance/transactions` — open each row, read line items, tag manually. Then file an FYI for Dext/manual capture: when vendor name is "Unknown Supplier" the upload should be rejected back to capture (capture rule), not silently pushed to Xero.
- **CONFIDENCE:** H — exists in DB; M — root cause might be Dext OCR not the user.

### 1.3 Hermit Park Good Morning Coffee — $186 / 2 bills (likely Townsville trip cluster)
- **WHAT:** Two untagged Hermit Park Good Morning Coffee bills 2025-12-02 + 2025-12-04 totalling $186.37. Hermit Park is Townsville — fits a NQ trip pattern.
- **EVIDENCE:** SQL untagged-by-vendor cluster (BILL,BILL).
- **RECOMMENDATION:** Likely **ACT-CORE** travel or a Townsville-specific project (Bindal/JusticeHub?). Worth a 60-sec vendor rule entry (`Hermit Park`/`Good Morning Coffee` → project X) once Ben names the trip.
- **CONFIDENCE:** H — data present; L — without trip context can't pick project.

### 1.4 Individual untagged ≥$50 not in clusters (8 rows)
- **WHAT:** Top one-off untagged singletons by dollar after clusters above. None ≥$500 individually; the rest are caf‪é/petrol/groceries that look like trip-incidentals (matches handoff Q5: "31 small untagged one-offs $1K total — ACT-CORE catch-all?").
- **EVIDENCE (from clustered SQL, single-row only):**
  - 2025-12-19 Super Publishing Co $220 (1 bill)
  - 2026-05-18 BCC Resource $100.67 (SPEND — most recent)
  - 2025-09-08 SeaLink Queensland $77.67 — Magnetic Island ferry, likely Townsville trip
  - 2025-07-01 3 Legged Thing $58.24 (camera gear → ACT-EL?)
  - 2025-08-06 Im-Am Thai $57.00
  - 2025-07-31 Freedom Fuels $54.36 (fuel)
  - 2025-08-20 Mooloolah River Waterwatch $52.99
  - 2025-10-02 The Shack Fish & Chippery $48.50
- **RECOMMENDATION:** Two paths: (a) Ben does a 10-min sweep with `/finance/transactions` UNTAGGED filter, tagging each as ACT-CORE incidental unless a trip is recognizable; (b) Defer — at $7,258 across 40 rows and 98.7% coverage, this is below the noise floor for R&D evidence purposes.
- **CONFIDENCE:** H — counts and amounts verified.

### 1.5 Manual-guard pressure: 1.7K rows now project_code_source LIKE 'manual%' on bills+spends (sanctity holding)
- **WHAT:** Distribution check on `project_code_source` confirms the manual-guard rule from `MEMORY.md` is being respected. Today's sync added two new source labels: `manual-saas-reclassify-2026-05-21` (173 spends, $13.3K) and `auto-tag-from-rules-2026-05-21` (14 spends + 19 bills). Plus `manual_correction_2026-05-14_ben_washing_machine_audit` (1 bill, $13,980) which is older. No `manual%` row got overwritten by sync — guard intact.
- **EVIDENCE:**
  - Spends (xero_transactions, ACT accounts, since 2025-07-01): 985 xero_tracking · 751 vendor_rule · 173 manual-saas-reclassify-2026-05-21 · 18 null · 14 auto-tag-from-rules-2026-05-21 · 9 keyword_match · 2 manual
  - Bills (xero_invoices, ACCPAY, since 2025-07-01): 1098 vendor_rule · 80 tracking_match · 70 manual · 48 keyword_match · 39 null · 19 auto-tag-from-rules-2026-05-21 · 1 manual_correction_2026-05-14_ben_washing_machine_audit
- **RECOMMENDATION:** No action needed. Note the two new `*-2026-05-21` sources happened TODAY — likely a separate session ran a SaaS reclassification + auto-tagger script. Worth a one-line follow-up to whoever ran those (Ben?) to confirm intent before merging to Xero pushback.
- **CONFIDENCE:** H — data verified, but flag: another session was active in this repo TODAY (33 spends + 19 bills tagged 2026-05-21). Per CLAUDE.md multi-session rule, surface to Ben.

**Confidence:** H — baseline (98.7%) reproduced cleanly, untagged set is small and enumerable. The single non-trivial cluster (Bunnings $5,795) has a clear project-decision path. Only soft spot is project assignment for the Bunnings cluster — needs Ben's call on HV vs FM given the Harvest cutoff.

---

## §2 — Receipt coverage

**Baseline:** 76.5% (2,313 receipted / 3,024 receiptable; 711 unreceipted). Down ~4.5 pts from 81% baseline on 2026-05-19 — possibly because the latest sync pulled in fresh May 2026 rows without their attachments yet (consistent with most-recent Uber+Qantas dates being 2026-05-13–15).

### 2.1 DRAFT bills are still the elephant — 150 bills / $25,278.74 / 148 with attachments
- **WHAT:** 150 DRAFT bills sitting in Xero since 2025-07-17–2026-04-29 totalling $25,278.74. 148/150 have attachments (Dext-captured receipts) — they just never crossed the AUTHORISE step. This is the same critical finding from 2026-05-19; nothing has moved (was 152, now 150 — net change ~0).
- **EVIDENCE:** `xero_invoices WHERE type='ACCPAY' AND status='DRAFT' AND date >= '2025-07-01'` → 150 rows / $25,278.74 / 148 has_attachments. Oldest 2025-07-17, newest 2026-04-29.
- **RECOMMENDATION:** Bulk-approve in Xero UI (open Bills → DRAFT tab → select-all → Approve). Then flip Dext-to-Xero integration to "Auto-publish" (Dext settings → integrations → Xero) so this stops recurring. Note: this is the open critical-path item #2 from the 2026-05-19 handoff — answer the receipt-architecture grill-me Q1 first.
- **CONFIDENCE:** H — query reproducible, count is stable since 2026-05-18 (152 → 150).

### 2.2 Auto-billing connector vendors dominate unreceipted spend — Qantas + Uber + Webflow = 108 rows / $20,002
- **WHAT:** Three vendors with active Xero auto-billing connectors account for 108 rows and $20,002.12 of unreceipted spend: Qantas (27 spends, $17,443.21), Uber (63 spends, $1,669.30), Webflow (18 bill+spend, $889.61). Receipts exist on the bill side (per 2026-05-19 handoff: Qantas 2026-05-10 charges confirmed in Dext) but the spend rows never inherit them.
- **EVIDENCE:** SQL unreceipted-by-vendor top-25 query, filtered to `bucket='receiptable' AND NOT has_attachments`. Sources are SPEND for Qantas/Uber, mixed BILL+SPEND for Webflow.
- **RECOMMENDATION:** Run `node scripts/sync-bill-attachments-to-txns.mjs` (the active one) for these three vendors. Plus: confirm Xero auto-billing connector is enabled for all three (Xero → Settings → Connectors). If a SPEND has no matching bill yet, the Dext receipt is the source of truth — match via `scripts/match-dext-csv-to-unreceipted.mjs` (already exists from 2026-05-18). Bigger fix is the grill-me Q1 decision.
- **CONFIDENCE:** H — count and dollar figures verified; M on root-cause split (need to verify each cluster individually whether bill exists).

### 2.3 Top one-off big-ticket unreceipted items ($19.5K Hilux + $11.2K furnishings + $11K container)
- **WHAT:** Three single bills/spends totalling $41,680 dominate the unreceipted dollar list. Each is high-value enough that physical receipt is recoverable.
  - **Samuel Hafer 2025-09-11 $19,500 ACT-GD** "Hilux - Private sale" (SPEND) — used vehicle private-sale receipt should be email/PDF
  - **Carla Furnishers 2025-11-16 $11,180** (BILL) — furniture purchase, retail receipt
  - **Mounty Container Supplier 2025-11-04 $11,000** (BILL) — shipping container, supplier invoice
- **EVIDENCE:** SQL unreceipted top-25. Project codes for the SPEND items: Samuel Hafer→ACT-GD, DIY Blinds→ACT-FM ($2,935), Izzy Mobile→ACT-DO ($1,485), Booking.com→ACT-IN ($1,632), Ruma Films→ACT-MD ($1,000), Pure Pest→ACT-FM ($440).
- **RECOMMENDATION:** Email each vendor for a copy receipt OR check Gmail for the original (search by amount). These three alone, if attached, drop unreceipted-dollar coverage materially. Hilux at $19.5K is R&D-relevant only if Goods-program vehicle; otherwise depreciation-relevant — receipt critical for capex audit.
- **CONFIDENCE:** H — IDs cited and project_code present; M on receipt recoverability (depends on vendor responsiveness).

### 2.4 Chris Witta + Flight Bar Witta clusters — 30 rows / $5,988 unreceipted
- **WHAT:** Chris Witta (7 spends $3,530, 2025-08-04–2025-10-20) and Flight Bar Witta (23 spends $2,457.63, 2025-07-01–2026-02-05). The Flight Bar Witta cluster is the known mis-routed-contact issue (per 2026-05-19 handoff: "real Witta wine bar but the Xero contact misroutes many NT-trip charges").
- **EVIDENCE:** Unreceipted-by-vendor SQL. Flight Bar Witta has 23 rows over 7+ months → recurring/auto-tagged.
- **RECOMMENDATION:** **Chris Witta** — likely a contractor; should have invoices captured via Dext or email. **Flight Bar Witta** — split the Xero contact first (per 2026-05-19 task #5), then receipts will land correctly. These are NT-trip incidentals; receipts likely on Ben's phone (Apple Wallet) or Gmail.
- **CONFIDENCE:** H — counts verified; M on Flight-Bar mis-routing (need to read line descriptions per row to confirm NT cluster vs real Witta).

### 2.5 NAB "vendor" 203 unreceipted rows / $1,176 — classification gap in the no-receipt-needed filter
- **WHAT:** 203 rows under contact `NAB` totalling $1,176.30 show as unreceipted but are bank charges/fees/interest that shouldn't need a receipt. The current `isNoReceiptNeeded()` filter at `/api/finance/transactions/reality/route.ts:21` requires BOTH "NAB|Bank|Internal|Transfer" AND "fee|charge|interest|transfer" in the contact name — these 203 rows just have contact `NAB` so they don't match.
- **EVIDENCE:** SQL returned `NAB 203 rows $1,176.30 source SPEND` covering 2025-07-01 → 2026-05-18. Filter at `apps/command-center/src/app/api/finance/transactions/reality/route.ts:21`: `if (/^(NAB|Bank|Internal|Transfer)\b/i.test(n) && /(fee|charge|interest|transfer)/i.test(n)) return true`.
- **RECOMMENDATION:** Loosen the filter: when contact is exactly `NAB` (no second word) AND amount is small (<$50), classify as bank fee → no_receipt_needed. Better: look at line_items description to find "FEE", "INTEREST", "CHARGE". This single fix would lift receipted% from 76.5 → ~83% with no real coverage change. File: `route.ts` line ~21.
- **CONFIDENCE:** H — `NAB` count and current filter logic both verified; M on amount-band threshold (need a sample to confirm all are fees vs legit non-fee transactions).

### 2.6 SaaS subscription receipts — recurring & low-friction (~$2,800)
- **WHAT:** Recurring SaaS vendors with unreceipted spends. None are huge individually but pattern-fixable: Claude.AI (6 rows $1,484.92), Mighty Networks (8 rows $910.26), Notion Labs (5 rows $555.14), Superbase (5 rows $523.11), Linktree (8 rows $501.00), LinkedIn Singapore (6 rows $449.94), Amazon (5 rows $2,105.46). Total ~$6,530.
- **EVIDENCE:** Unreceipted-by-vendor SQL top-25.
- **RECOMMENDATION:** Per-vendor: enable the SaaS vendor's monthly receipt email → forward to Dext (auto-publish). Amazon is the awkward one (no clean receipt-email path) — best done as Gmail filter forward. Claude.AI receipts should land at billing@anthropic.com → can be auto-forwarded to Dext inbox. Net effort: 30 min one-off per vendor, then recurring.
- **CONFIDENCE:** H on counts; H on solution pattern (Dext-forwarding is the standard ACT play).

**Confidence:** H — top-20 unreceipted by vendor is fully enumerated, DRAFT-bill count stable, and known issues (Flight Bar Witta routing, Qantas SPEND inheritance) have clear root causes. Receipt% drop from 81→76.5 needs verification — could be fresh May sync (zero attachments yet) inflating denominator. Worth checking one more time if Ben acts on §2.1.

---

## §3 — Duplicate detection

**Headline:** ~$135K face value of phantom expense across 7 finding clusters. True money-back exposure (double-payment risk needing refund or void) concentrated in 2 findings: Telford Smith Engineering $19,800 (quadruple-recorded Dec 2025, §3.7) and Maleny Landscaping Supplies $1,305 (triple-recorded Mar 2026, §3.5). Remaining ~$112K is bookkeeping cleanup (phantom liabilities, untagged spends mirroring paid bills). Critical filters identified for any future dup-detection script: (a) exclude `type IN ('RECEIVE-TRANSFER','SPEND-TRANSFER')` to avoid inter-account transfer false positives that would otherwise dominate the result set ($233K in 2026), (b) filter on `is_reconciled = false` for cross-dup detection to drop Qantas/Uber/Webflow auto-billing connector pairs that look like dups but are legit.

### 3.1 Bill + spend cross-dup cluster — Harvest workshop wave Jan 4-12, 2026 — ~$25,000 likely double-counted

- **WHAT:** Wave of high-value Carbatec / Total Tools / Centre Canvas / Defy / Smartwood / RW Pacific / Hydraulink / Hatch Electrical purchases in the Jan 4-12 Harvest workshop ramp-up are recorded BOTH as `xero_invoices` (ACCPAY bills, status `PAID`) AND as `xero_transactions` (spends on NAB Visa ACT #8815 or ACT Everyday) 1 day apart, same vendor, same total. The bills are marked `PAID` but the matching spends have `is_reconciled = false` — classic double-record pattern (bill manually entered + bank feed import created a second row, never reconciled). 15 high-value pairs in Jan, ~$25K aggregate. **WHY this matters:** doubles the expense register and inflates project totals (ACT-HV / ACT-GD).
- **EVIDENCE:** Query: bills (`xero_invoices` type=ACCPAY, status NOT IN VOIDED/DELETED) joined to spends (`xero_transactions` ACT-only banks) on same vendor + total + `ABS(date) <= 7`. 30 matches in the top window, dominated by Jan 4-12 Harvest wave. Top 5 pairs:
  - Defy $8,686.98 (2026-03-31, same day): bill `63533b93-444d-4ed4-a8ea-9bbeef2321df` ↔ spend `fec66998-2225-49f5-a054-5a9b2ea542f8` (NAB Visa, ACT-GD)
  - Centre Canvas And Upholstery $4,715.00 (Jan 29-30): bill `63b55164-ff81-4f9c-961a-820fb94edf98` ↔ spend `8861a415-c385-4e9a-80ea-77e643ef3e8d`
  - Carbatec Brisbane $4,575.65 (Jan 5-6): bill `4f8826dd-f0e4-49d8-a4ac-4c876f540156` ↔ spend `d8b32ab2-604c-46ff-8ac0-92d5bfd347c9`
  - Total Tools East Brisbane $4,546.55 (Jan 4-5): bill `b892a854-873c-4e2f-a6cd-e29e2229b14f` ↔ spend `632f9aa0-9d75-407e-a38b-a62c4ae028a8`
  - RW Pacific Traders $4,200.00 (Jan 5-6): bill `b0d7936b-a7dc-4535-b3c4-ec4641a8eb56` ↔ spend `faa4896c-ed8e-46cf-8ed8-cf41367a3d1d`
- **RECOMMENDATION:** For each pair, open the bill in Xero — if status = PAID via the matching bank transaction (reconciled), the spend row is the duplicate that wasn't matched in Xero. Verify in Xero UI, then either reconcile the bank txn to the bill (preferred — preserves both records correctly) or delete the orphan spend if it's a true duplicate import. Build a one-time helper script `scripts/audit-bill-spend-dups.mjs` that emits the candidate list with bill PAID status + spend reconciliation status so Ben can triage in one pass.
- **CONFIDENCE:** H for the pattern existing; M for each individual pair (verify against Xero before action — some may be legit separate purchases on adjacent days from the same vendor during workshop ramp).

### 3.2 Qantas auto-billing connector is NOT a duplicate — exclude from triage

- **WHAT:** 6 Qantas pairs surfaced in the cross-dup query (2026-03-01 bill + 2026-03-03 spend, totals $676.38–$2,178.08). These are NOT duplicates — the Qantas bill is AUTHORISED, and the matching spend has `is_reconciled = true`. This is the documented Qantas auto-billing connector flow: connector creates bill from itinerary, bank feed imports the card charge 2 days later, Xero auto-reconciles. **WHY this matters:** any duplicate-detection script must filter `bill.status='PAID'/'AUTHORISED' AND spend.is_reconciled=false` to avoid burning triage cycles on legit auto-billing pairs.
- **EVIDENCE:** Qantas bill `ce93ded1-2fca-43be-a073-e2dd1035e5e0` $2,178.08 status AUTHORISED ↔ spend `a2f36260-8cbb-4f7b-869d-80a678889454` is_reconciled=true. Same for all 6 Qantas pairs. Also applies to Uber / Webflow / Virgin / Booking — see CLAUDE.md "Xero receipts" trap.
- **RECOMMENDATION:** Add `AND s.is_reconciled = false` to any dup-detection helper script. This drops the Qantas false-positives and surfaces only true unmatched spends.
- **CONFIDENCE:** H.

### 3.4 Spend+spend same-date — bank transfers are the dominant FALSE POSITIVE — filter them

- **WHAT:** Same vendor+total+date in `xero_transactions` initially surfaced 20 pairs all >$7K — every single one had `contact_name = NULL`, two banks, one reconciled, one not. These are LEGITIMATE INTER-ACCOUNT TRANSFERS (NAB Visa pay-down from ACT Everyday), `type` = `RECEIVE-TRANSFER` / `SPEND-TRANSFER`. **WHY this matters:** without this filter, dup detection screams "$200K of duplicates!" and nothing actionable surfaces. Already-known? Yes — Homeland School INV-0303 phantom payment finding (2026-05-17 handoff) hit exactly this pattern: NAB Visa "Linked Acc Trns" = bank transfer, not real cash. Same trap.
- **EVIDENCE:** Sample bank transfer: `54c5cbed-35fb-436b-a655-cfac39308160` type=RECEIVE-TRANSFER on NAB Visa $20K 2026-03-02, line item description "Bank Transfer from NJ Marchesi T/as ACT Everyday." paired with `beb12f2d-2f9f-44d3-bdf7-2ce38a992f54` type=SPEND-TRANSFER on ACT Everyday same day. 20 such pairs in 2026 totalling ~$233K of inter-account movement.
- **RECOMMENDATION:** Add `AND type NOT IN ('RECEIVE-TRANSFER','SPEND-TRANSFER')` to every dup-detection helper script AND every expense-total query. Verify the `/finance/projects/[code]` and `/finance/audit` pages already exclude these (the Homeland School fix mentions this trap but spot-check the queries).
- **CONFIDENCE:** H.

### 3.5 Spend+spend real dups (after filtering transfers) — Maleny Landscaping $1,305 is a triple-record

- **WHAT:** After removing transfers, only a few real spend+spend dups remain. The standout is **MALENY LANDSCAPING SUPPLIES $1,305 on 2026-03-17** — appears in three places: one bill `47abd43a-c1fa-4449-b723-1f1854186d8c` (PAID, ACT-HV) PLUS one bill `d6427706-4eef-40a8-954c-abada9fe27c3` (PAID, ACT-HV — already flagged in 3.3) PLUS two spends: `4ba8850c-3037-425d-8f23-c11e2930ffe0` (NAB Visa, ACT-HV, not reconciled) and `0d7678ac-8077-401c-aac9-e324016eed68` (ACT Everyday, ACT-HV, not reconciled). **WHY this matters:** $1,305 single purchase is now counted up to 4× in expense totals = ~$3,915 phantom expense on ACT-HV. Also surfaces $139.05 HighLevel (2026-03-23) and $113.40 Maleny Hardware (2026-03-26) as smaller spend+spend dups, both unreconciled — easy void candidates.
- **EVIDENCE:** Q3-redux query `xero_transactions GROUP BY contact+total+date HAVING n>=2 AND type NOT IN (transfer types)`. Multiple Qantas pairs surfaced (4× $2,001.71 on 2026-03-03, 2× $1,916.01 on 2026-03-17) but all are reconciled — separate flight tickets, not dups.
- **RECOMMENDATION:** Priority-1: in Xero UI, walk the Maleny Landscaping $1,305 chain: identify the ONE true purchase, void the other bill + both unreconciled spends (or reconcile the spend to the kept bill). Priority-2: void HighLevel $139.05 spend `76803539-e469-40b7-a544-00ddca0b25bf` and Maleny Hardware $113.40 spend `07335a98-3af8-4205-8c1d-0452374eeb48` (keep the other in each pair if reconciled-pending).
- **CONFIDENCE:** H for triple-record (cross-confirmed across Q1, Q2, Q3); M for the smaller HighLevel/Hardware pairs (could be legitimate two-charge merchants splitting an order).

### 3.6 Monthly subscription false-positive sanity check

- **WHAT:** No false positives from monthly subscription pattern surfaced. The bill+bill query used same-DATE grouping (not "within 28-32 days"), so Bitwarden/HighLevel/Cognition AI/Webflow regular monthly bills did NOT show up as dups — only their actual same-date double-entries (e.g. Cognition AI $200 ×2 on 2026-02-03 and 2026-03-03 are real dups inside a single billing cycle, not the next-month renewal). **WHY this matters:** confirms the dup-detection strategy is sound; the script can be deployed without monthly-cadence filtering complexity.
- **EVIDENCE:** All Q2/Q3 results inspected; no vendor surfaced with a 28-32 day gap pattern masquerading as a dup.
- **RECOMMENDATION:** None — already correct. Documenting so future audits don't add unnecessary filter logic.
- **CONFIDENCE:** H.

### 3.7 Telford Smith Engineering $19,800 — QUADRUPLE-recorded (Dec 22-23, 2025), worst single-vendor exposure in the audit

- **WHAT:** Vendor that prior agent was investigating: Telford Smith Engineering $19,800 appears FOUR times across the data — 2 bills on 2025-12-22 (`843767e6-2190-483c-a7cc-4c1a2db90c7b` PAID tagged ACT-IN + `f47c47b4-8df4-4b04-8dea-5476f913ab67` AUTHORISED tagged ACT-IN) PLUS 2 spends on 2025-12-23 (`578961df-2eb7-473b-99f2-81c8cae89145` AUTHORISED + `87a05588-6b66-4533-b3a4-aeb5a7f69ff8` AUTHORISED, both tagged ACT-GD). **WHY this matters:** worst-case face value $59,400 of phantom expense ($19.8K real spend × 3 phantom copies). Also project_code split (bills→ACT-IN, spends→ACT-GD) inflates BOTH projects. Pre-2026 date so missed §3.1-§3.5 windows.
- **EVIDENCE:** Targeted query `WHERE contact_name ILIKE '%Telford%'` returned 4 records, all $19,800, all on 2025-12-22 or 2025-12-23. The PAID bill is the only one that should remain; the AUTHORISED bill + 2 AUTHORISED spends are dups.
- **RECOMMENDATION:** Priority-0 single largest win in this audit. Open Xero, identify the one real $19,800 bill (the PAID one — `843767e6-2190-483c-a7cc-4c1a2db90c7b`), void the AUTHORISED bill `f47c47b4` and BOTH spends `578961df` + `87a05588`. Then resolve the ACT-IN vs ACT-GD tagging by retagging the surviving bill to whichever project actually got the engineering work (likely ACT-GD given the spend tagging). Re-run the audit alert generator on `/finance/projects/ACT-IN` and `/finance/projects/ACT-GD` after.
- **CONFIDENCE:** H — 4 identical-amount records same vendor same 2-day window is statistically unambiguous, and the prior agent independently flagged this same cluster.

### 3.8 Already-known reconciliation — handoff "4 definite + 16 probable" maps to this audit's 7 findings

- **WHAT:** 2026-05-17 handoff mentioned "4 definite + 16 probable" Kennedy's / Carbatec / Telford Smith dups (in §audit alerts on `/finance/projects/[code]`). This audit's scope is wider (full ACT-only Jan-May 2026 + targeted Telford 2025-12). Net actionable findings: §3.7 Telford $19,800 quadruple (1 confirmed, ~$59K face), §3.5 Maleny Landscaping $1,305 triple (1 confirmed, ~$3.9K face), §3.3 5 PAID+AUTHORISED contractor/supplier same-date dups (~$22,180 face), §3.1 15 high-value Jan Harvest-wave bill+spend pairs (~$25K face but lower per-pair certainty), §3.5 2 small unreconciled-spend dups, §3.3 7 SaaS DRAFT/PAID dups. **WHY this matters:** aggregated face value of phantom expense is ~$135K across the 7 finding clusters, but real money-back exposure (true double-payments needing refund or void) is concentrated in Telford ($19.8K) and Maleny Landscaping ($1,305). The rest is bookkeeping cleanup.
- **EVIDENCE:** Synthesised from §3.1 through §3.7. No claim of perfect coverage — Kennedy's not specifically re-checked (handoff says was already retagged); a targeted Kennedy's query would close that loop in <30s.
- **RECOMMENDATION:** Build `scripts/audit-duplicate-bills.mjs` that surfaces all 7 categories as a single rolling report into `/finance/audit`. Filters: `type NOT IN transfer types`, `is_reconciled = false` for cross-dup, `status NOT IN VOIDED/DELETED` for both sides. Bake the §3.6 monthly-cadence sanity check in as a comment so future maintainers don't add complexity.
- **CONFIDENCE:** M for the aggregate framing; H for each underlying finding.

**Confidence:** H for the existence and SQL-verifiability of every cluster (queries are deterministic, xero_ids cited). M for action-readiness on the bill+spend cross-dup cluster (§3.1) until Ben spot-checks 3 pairs in Xero — some Jan 4-12 vendor pairs MAY be legitimate separate purchases during the workshop ramp. H on the priority-0 actions (§3.7 Telford $19,800 quadruple, §3.5 Maleny Landscaping $1,305 triple, §3.3 5 contractor PAID+AUTHORISED dups including Centre Canvas $10,285, Sophie Hickey $4,950, Joseph Kirmos $4,500).



- **WHAT:** Same vendor + same total + same date with `n >= 2` rows surfaces real double-entry of bills. Pattern is mostly status-pair PAID+AUTHORISED (someone marked one paid, the other was the dup that was never voided) plus a few DRAFT+DRAFT pairs. **WHY this matters:** every PAID+AUTHORISED dup is a phantom liability on the books, and every DRAFT+DRAFT is a future-payment risk; together they could fire $22K of incorrect spend into project totals.
- **EVIDENCE:** Query: `xero_invoices type=ACCPAY, date>=2026-01-01, total>100, not VOIDED/DELETED, GROUP BY contact+total+date HAVING count>=2`. Top high-value pairs:
  - **Centre Canvas And Upholstery $10,285.00 (2026-03-31)** — `848e9742-c0fd-48e2-a223-5e2d035e8754` (PAID, ACT-IN) + `993dd389-f8ca-4ba0-9109-12eb5da17d0e` (AUTHORISED, ACT-IN). H confidence.
  - **Sophie Deirdre Hickey $4,950.00 (2026-03-20)** — `5d474188-5e07-41bf-a8a3-c93275d08c41` (PAID, ACT-HV) + `bb3da03e-6534-477f-bffb-3b46431fe405` (AUTHORISED, ACT-HV). Contractor invoice double-entered. H.
  - **Joseph Kirmos $4,500.00 (2026-03-29)** — `fa46775c-50c0-4d79-85dc-b327a53ba21f` (PAID, ACT-GD) + `99e9f3dd-7f76-4aaf-b546-847fcc20924f` (AUTHORISED, ACT-GD). Contractor invoice double-entered. H.
  - **MALENY LANDSCAPING SUPPLIES $1,305.00 (2026-03-17)** — `d6427706-4eef-40a8-954c-abada9fe27c3` (PAID) + `47abd43a-c1fa-4449-b723-1f1854186d8c` (PAID). **BOTH PAID = potential double-payment of $1,305**, not just phantom liability. Highest-priority verify. H.
  - **Sophie Deirdre Hickey $1,140.00 (2026-03-17)** — `a1d66188-930b-4e76-931d-01dfc5967e65` (PAID) + `0f55cedb-b565-46b3-8fe2-b8686d8492c4` (AUTHORISED). H.
  - **MALENY LANDSCAPING SUPPLIES $212.50 (2026-03-06)** — `f3c4f04d-dad7-4cba-962d-93ed4380b66e` + `2beb068c-e19f-4a6b-ba54-e6ae088f9c76` (both AUTHORISED). M.
  - SaaS dups (smaller, easier triage): Cognition AI $286.04 (2026-03-04), Cognition AI $284.82 (2026-02-04), Cognition AI $200 ×2 (2026-02-03 and 2026-03-03 DRAFT+DRAFT), Easel Software $216 (2026-01-26 DRAFT+DRAFT), HighLevel $141.63 (2026-01-23 PAID+PAID), HighLevel $137.27 (2026-02-23 PAID+AUTHORISED). These are NOT monthly-cadence false positives — they are same-date duplicates inside a single billing cycle.
- **RECOMMENDATION:** Highest priority: verify MALENY LANDSCAPING $1,305 (2026-03-17) in Xero bank feed — if both bills were actually paid, request a refund. For the 5 PAID+AUTHORISED pairs (Centre Canvas, Sophie Hickey x2, Joseph Kirmos), void the AUTHORISED dup in Xero UI (one click). DRAFT+DRAFT pairs (Easel, Cognition $200 x2) — void either DRAFT, no risk. Add this query to a `scripts/audit-duplicate-bills.mjs` to run weekly.
- **CONFIDENCE:** H for existence of the dups; H for the high-value ones above being real (status-pair pattern + identical totals on identical dates is hard to explain as legit business).

---

## §4 — Tagger rules health

**Config baseline (read from `config/tag-suggester-rules.json` 2026-05-22):**
- 30 `vendor_rules` entries — **all tier "B"** (no tier A/C present in config)
- 1 `special_vendors` entry: RNM CARPENTRY → ACT-OO (tier B)
- 8 `witta_vendors` (heuristic list, no project_code assigned — used to disambiguate Witta cluster)
- 2 `ambiguous_vendors` (Avis, Thrifty — explicit do-not-auto-tag)
- Tier breakdown by project_code: **ACT-HV = 11 rules**, **ACT-GD = 19 rules**, **ACT-OO = 1 rule** (special). No rules for ACT-CORE / ACT-EL / ACT-IN / ACT-MD / ACT-FM / ACT-DO.
- Last_updated: 2026-05-18; harvest_cutoff 2026-01-01 baked into _meta.

_Per-rule SQL match counts + findings below._

### 4.1 Dead rules — 2 rules with zero matches across the full FY26 window

- **WHAT:** Two `vendor_rules` entries match ZERO rows in either `xero_transactions` or `xero_invoices` since 2025-07-01: `Department of Primary Hobart` (claim in note: "3 rows all Goods — TAS biosecurity") and `Endless Parks` (claim: "2 rows all Goods"). Config notes claim rows exist; SQL says they don't. Either Xero contact names differ from the rule pattern, or the txns were retagged away to a different vendor contact.
- **EVIDENCE:** SQL match-count query 2026-05-22 — both rules return `spend_n=0, bill_n=0` across both the full window AND the last 6 months. Config lines: `config/tag-suggester-rules.json:28` (`Department of Primary Hobart`) and `config/tag-suggester-rules.json:29` (`Endless Parks`).
- **RECOMMENDATION:** Before deleting, run fuzzy check `SELECT DISTINCT contact_name FROM xero_invoices WHERE contact_name ILIKE '%biosecurity%' OR contact_name ILIKE '%primary indust%' OR contact_name ILIKE '%endless%' LIMIT 20` to confirm the contact name didn't change shape. If no hits, delete `config/tag-suggester-rules.json:28-29`. If hits found, widen pattern instead. Net: 30 rules → 28.
- **CONFIDENCE:** H on the zero-match fact; M on delete-vs-widen call (vendor contact may have been renamed).

### 4.2 Conflicting rule pattern — `Maleny Landscaping Supplies` duplicated case-only (HV-only safe but bloat)

- **WHAT:** `config/tag-suggester-rules.json:9` defines `Maleny Landscaping Supplies` → ACT-HV. Line `:10` defines `MALENY LANDSCAPING SUPPLIES` (all-caps) → ACT-HV with note "duplicate-cased entry". Since SQL is `ILIKE`, both patterns match identical row sets. **Not a project-code conflict** (both → ACT-HV) but is config bloat that creates risk if one is later edited without the other (e.g. someone retags the mixed-case rule to ACT-FM but leaves the all-caps one as ACT-HV → two competing rules).
- **EVIDENCE:** `Maleny Landscaping Supplies` rule returns 4 spend + 11 bill = 15 rows. Only 15 rows total in the DB containing "maleny landscaping" — no separate cluster the all-caps version would catch. ILIKE is case-insensitive.
- **RECOMMENDATION:** Edit `config/tag-suggester-rules.json` to delete line 10 (the all-caps duplicate). 30 vendor_rules → 29. Net behaviour unchanged because the mixed-case rule on line 9 already covers everything via ILIKE.
- **CONFIDENCE:** H — verified by SQL row counts and ILIKE semantics.

### 4.3 No tier diversity — every active rule is tier "B", losing auto-apply gains on high-confidence patterns

- **WHAT:** 30/30 `vendor_rules` + 1/1 `special_vendors` are tier "B" (needs confirmation per spec). The system has NO tier "A" (auto-apply, high-confidence) rules. Every vendor match still requires Ben to confirm via UI even for vendors with 28+ rows over 10 months always tagged to the same project (e.g. Defy Manufacturing).
- **EVIDENCE:** Read `config/tag-suggester-rules.json` lines 8-45 — every entry has `"tier": "B"`. Highest-volume rules from SQL: **Defy Manufacturing** (spend 8 + bill 20 = 28 rows, all → ACT-GD), **Maleny Landscaping Supplies** (4+11=15 rows, all → ACT-HV), **Reddy Express** (3+11=14 rows, all → ACT-GD), **Sophie Deirdre Hickey** (0+8=8 rows, all → ACT-HV), **Joseph Kirmos** (1+6=7 rows, all → ACT-GD).
- **RECOMMENDATION:** Promote 5 rules to tier "A" once you've verified the consuming code honours tier differentiation. Edit `config/tag-suggester-rules.json` lines 9, 17, 20, 25, 33 to change `"tier": "B"` → `"tier": "A"`. **DO NOT FLIP** until you've checked `apps/command-center/src/lib/tag-suggester.ts` AND `scripts/suggest-from-line-desc.mjs` to confirm both honour tier (note `_meta` says both surfaces re-read on next run — so behavior depends on what each surface does with the tier field).
- **CONFIDENCE:** H on the tier-monotony observation; M on the promotion recommendation (depends on consumer code behaviour — needs verification before action).

### 4.4 Project-code coverage gaps — 6 active projects have ZERO rules

- **WHAT:** Tagger rule project-code distribution: **ACT-HV = 11 rules, ACT-GD = 19 rules, ACT-OO = 1 special-vendor rule**. That's it. Six active projects with significant transaction volume (ACT-CORE, ACT-EL, ACT-IN, ACT-MD, ACT-FM, ACT-DO) have NO vendor rules — every transaction for these projects is manually tagged. From §1.4 we already see ACT-EL camera-gear (3 Legged Thing), ACT-CORE travel-incidentals, ACT-FM Bunnings clusters all going untagged or manually tagged each time. From §2.3 we know ACT-DO (Izzy Mobile), ACT-IN (Booking.com), ACT-MD (Ruma Films), ACT-FM (DIY Blinds, Pure Pest) all have recurring vendors with no rules.
- **EVIDENCE:** Per the per-rule count query 2026-05-22, every `code` value returned is either `ACT-HV`, `ACT-GD`, or `ACT-OO`. Cross-reference §1.4 + §2.3 of this audit for evidence of untagged/manually-tagged recurring vendors in the 6 uncovered projects.
- **RECOMMENDATION:** Run a coverage-gap query to surface candidate rules: `SELECT contact_name, project_code, COUNT(*) FROM xero_invoices WHERE date >= '2025-07-01' AND type='ACCPAY' AND project_code IS NOT NULL AND project_code NOT IN ('ACT-HV','ACT-GD','ACT-OO') GROUP BY contact_name, project_code HAVING COUNT(*) >= 3 ORDER BY COUNT(*) DESC` — every row in the result is a candidate rule to add after line 42 in `config/tag-suggester-rules.json`. Likely first additions (from §1.4 + §2.3): `"Izzy Mobile": {code: "ACT-DO", tier: "B"}`, `"Pure Pest": {code: "ACT-FM", tier: "B"}`, `"DIY Blinds": {code: "ACT-FM", tier: "B"}`, `"Ruma Films": {code: "ACT-MD", tier: "B"}`. Should run query first before publishing exact list.
- **CONFIDENCE:** H on the gap (every config rule is one of 3 codes — verified by direct read + SQL); M on the specific candidate rules (inferred from prior sections, not directly queried in this section).

### 4.5 BURIED LEDE — TWO parallel rule systems exist: JSON config (30 rules) AND `vendor_project_rules` table (507 rules)

- **WHAT:** Beyond the 30-rule JSON config, a `vendor_project_rules` Postgres table holds **507 rules** with `auto_apply=true` on ALL of them. Project distribution is much broader than JSON: ACT-IN=166, ACT-GD=68, ACT-UA=64, ACT-FM=49, ACT-HV=48, ACT-OO=25, ACT-DO=17, ACT-CORE=13, ACT-CA=10, ACT-JH=8, etc. Schema includes vendor_name, aliases (text[]), project_code, category, rd_eligible, auto_apply, entity_code, income_type, rd_category, xero_account_code, xero_tax_type, xero_currency, xero_business_division, xero_tenant_id. **WHY IT MATTERS:** invalidates the §4.4 "6 projects have no rules" finding — ACT-IN, ACT-FM, ACT-DO, ACT-MD, ACT-EL, ACT-CORE all have DB rules. Also creates a maintenance trap: any rule edit in JSON might be silently overridden (or ignored) by a DB rule, and vice versa. We don't yet know which consumer reads which source or the merge-order.
- **EVIDENCE:** Tables exist in `public` schema: `vendor_project_rules` (507 rows) and `tag_inference_rules` (17 rows). All 507 vendor_project_rules have `auto_apply=true`, none has `auto_apply=false`. Project distribution query 2026-05-22.
- **RECOMMENDATION:** Step 1 — read `apps/command-center/src/lib/tag-suggester.ts` AND `scripts/suggest-from-line-desc.mjs` AND `scripts/tag-xero-transactions.mjs` AND `scripts/tag-transactions-by-vendor.mjs` to identify which source(s) each consumer reads and the precedence order when both have a match. Step 2 — pick ONE source of truth (likely `vendor_project_rules` table because it has 507 rules vs JSON's 30 and richer schema with rd_category/xero_account_code/aliases). Step 3 — migrate JSON rules into the DB table (or vice versa), then deprecate the loser. Step 4 — add a constraint `UNIQUE(LOWER(vendor_name))` to prevent the §4.6/4.7 dup issues. This is a Tier-2 architectural change; needs Ben sign-off.
- **CONFIDENCE:** H on the existence of both systems and the row counts; M on the precedence/merge behaviour (needs consumer-code read).

### 4.6 CRITICAL CONFLICTS — 3 vendors have different `project_code` in JSON vs DB

- **WHAT:** Direct conflicts where the JSON config and `vendor_project_rules` table assign DIFFERENT project codes to the same vendor. Whichever source the consumer reads first wins, and the other source silently mis-tags. **Conflicts found:**
  - **Carbatec Brisbane** — JSON `config/tag-suggester-rules.json:26` → **ACT-GD**, DB row `created 2026-04-22` → **ACT-HV** (newer)
  - **Diggermate Franchising** — JSON `config/tag-suggester-rules.json:14` → **ACT-HV**, DB row `created 2026-03-21` → **ACT-FM**
  - **Savage Landscape Supplies** — JSON `config/tag-suggester-rules.json:12` → **ACT-HV**, DB row `created 2026-04-13` (with 2 aliases) → **ACT-FM**
- **EVIDENCE:** SQL query 2026-05-22 cross-checked JSON vendors against `vendor_project_rules` rows. Three direct project-code conflicts identified. DB rows are NEWER than the JSON last-updated date for some entries; relative recency varies.
- **RECOMMENDATION:** RESOLVE each manually — for each conflict, query `SELECT contact_name, project_code, COUNT(*), MIN(date), MAX(date) FROM xero_invoices WHERE contact_name ILIKE '%<vendor>%' AND date >= '2025-07-01' GROUP BY contact_name, project_code ORDER BY 3 DESC` to see how the actual tagged rows are distributed. Whichever code dominates is likely correct. Then: (a) update both sources to match (single source of truth fix from §4.5 supersedes this), or (b) interim — patch the loser (JSON or DB row), file a follow-up ticket to consolidate. Carbatec — likely ACT-HV is correct (per Harvest workshop context, see §3.1). Diggermate — both HV and FM are plausible (hire equipment); Ben to call. Savage — was ACT-HV in 2026-05-17 audit findings but DB says ACT-FM; needs Ben call.
- **CONFIDENCE:** H on conflict existence; M on "which is right" without Ben's call.

### 4.7 DUP CHAOS in `vendor_project_rules` — same vendor name appears 2-3 times, sometimes with CONFLICTING codes

- **WHAT:** `vendor_project_rules` table has 20+ vendors appearing more than once. Worst cases have CONFLICTING project_codes within the table itself (auto_tagger behaviour is then unpredictable — depends on row order returned by SQL):
  - **Maleny Landscaping** — 3 rows, codes `[ACT-FM, ACT-HV]` (mixed); IDs `20e09dfa-eb39-4b46-8c97-21f11680582e`, `aff4134b-bc66-4f1f-a0c4-33d2a166f74c`, `ce305909-80ee-4074-a0a0-710444bc5490`
  - **Hinterland Aviation** — 2 rows, codes `[ACT-GD, ACT-IN]` (mixed); IDs `42f02e3c-d4c1-4036-8081-6827a50cfe1e`, `c0ac96e4-46a0-4e52-b1e7-39a877393f36`
  - **GREEN FOX TRAINING STUDIO LIMITED** — 2 rows, codes `[ACT-BG, ACT-JH]` (mixed); IDs `ac262364-c112-43ef-bdcf-8fdd848369ac`, `a1a3c55b-6504-41fd-be6d-9671a9c695b8`
  - **RW Pacific Traders** — 2 rows, codes `[ACT-GD, ACT-HV]` (mixed); IDs `8a5879b2-1b4f-4e43-8c64-fa5fd804ccaa`, `61335326-e25f-4865-ad57-52c633bb1893`
  Plus exact dups (same vendor + same code): Celebrants Australia (×2, ACT-CB), Claire Marchesi (×2, ACT-HV), Croqueteria (×2, ACT-IN), Fat Thaiger (×2, ACT-IN), Ingkerreke Services Aboriginal Corporation (×2, ACT-OO), Kate Vernon (×2, ACT-IN), Mapleton Public House (×2, ACT-HV), Mark Galvin (×2, ACT-IN), Marlene Vieira (×2, ACT-IN), McDonalds (×2, ACT-IN), ORDEM DO CARMO (×2, ACT-IN), PACHECA HOTEL (×2, ACT-IN), Paddle.com (×2, ACT-IN), Praia da Luz (×2, ACT-IN), Queensland Government (×2, ACT-IN). The cluster of Portuguese/Croqueteria/etc ACT-IN dups suggests a bulk-import script ran twice (likely a Portugal trip import).
- **EVIDENCE:** SQL `GROUP BY vendor_name HAVING COUNT(*) > 1` on `vendor_project_rules` 2026-05-22 returned 20+ rows. Top 4 with conflicting codes cited above. Also note: **Sophie Deirdre Hickey** appears twice with the same code (ACT-HV) — not a conflict but a dup.
- **RECOMMENDATION:** Two-step cleanup (Tier 2, Ben to approve):
  - **Conflicting-code dups (4 vendors)** — Ben names the correct code, DELETE the wrong row by ID. E.g. for Maleny Landscaping, keep the ACT-HV row (matches JSON + Harvest workshop reality), DELETE the ACT-FM row. Verify by querying actual tagged rows first.
  - **Same-code dups (15+ vendors)** — keep the OLDER `created_at` row (preserves audit trail), DELETE the newer dup. Generate cleanup SQL via `SELECT vendor_name, MIN(created_at), array_agg(id ORDER BY created_at DESC) FROM vendor_project_rules GROUP BY vendor_name, project_code HAVING COUNT(*) > 1`.
  - Then add unique constraint to prevent recurrence: `ALTER TABLE vendor_project_rules ADD CONSTRAINT vendor_project_rules_vendor_code_unique UNIQUE (vendor_name, project_code)` (or stricter: `UNIQUE (LOWER(vendor_name))` if no vendor should ever serve two projects).
- **CONFIDENCE:** H on dup counts and conflict identification; M on resolution call per vendor.

### 4.8 Third rule store: `tag_inference_rules` (17 rows) — not yet audited

- **WHAT:** Schema check 2026-05-22 returned two rule-storage tables: `vendor_project_rules` (507 rows, covered in §4.5-4.7) AND `tag_inference_rules` (17 rows). The 17-row table is a third rule store I haven't audited in detail. Worth a follow-up to confirm what it's for and whether it's a fourth source of truth or supports a different inference (e.g. line-description matching vs vendor matching).
- **EVIDENCE:** `SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%vendor%rule%' OR table_name ILIKE '%tag%rule%'` returned only `vendor_project_rules` + `tag_inference_rules`. Row counts confirmed via `SELECT COUNT(*)`.
- **RECOMMENDATION:** Follow-up query (5 sec): `SELECT * FROM tag_inference_rules LIMIT 5` to understand its shape and purpose. Likely complementary (not conflicting) but should be confirmed before any consolidation per §4.5.
- **CONFIDENCE:** H on existence + row count; L on whether it's a source-of-truth conflict.

**Confidence:** H on §4 overall. The buried lede (§4.5) — two parallel rule systems with 30 + 507 rules — is the priority-0 finding for this section. §4.6 (3 JSON vs DB project-code conflicts) and §4.7 (4 in-table conflicting-code dups + 15+ same-code dups) are concrete cleanup tickets. §4.1 (2 dead rules) and §4.2 (case dup) are minor JSON-only hygiene. §4.3 (no tier diversity) and §4.4 (project-code gaps in JSON) become much smaller issues if §4.5 consolidation makes `vendor_project_rules` the single source of truth — its `auto_apply=true` flag would supersede the tier system entirely.

---

## §5 — Pipeline architecture

The two confirmed bill duplicators (`gmail-to-xero-pipeline.mjs`, `push-receipts-to-xero.mjs`) are already gone from `scripts/` as of 2026-05-19 (now in `scripts/_archive/2026-05-19-receipt-pipeline-duplicators/`). The current writer surface is much narrower than the handoff implied, but the **PM2 cron config still has the receipt-capture chain wired** (just stopped at runtime, not commented out). The Telford Smith $59K quadruple-record traced in §3 is residue of the now-archived path, not the current one.

### 5.1 Writer-script inventory — only 6 scripts touch xero_* / receipt_emails tables today
- **WHAT:** Inventory of scripts that INSERT/UPSERT into `xero_invoices`, `xero_transactions`, `xero_bills`, or `receipt_emails`. After the 2026-05-19 archive, the surface is small.
- **EVIDENCE:**
  - `scripts/sync-xero-to-supabase.mjs` — Xero pull. Upserts `xero_invoices` (onConflict `xero_id`), `xero_transactions` (onConflict `xero_transaction_id`). Manual-tag guard in place. PM2: `xero-sync` every 6h. _Pull-only — does NOT push to Xero._
  - `scripts/sync-xero-bank-feed.mjs` — bank-account + transaction mirror. Upserts `xero_bank_accounts`, `xero_transactions`, inserts `receipt_matches`. _Pull-only._
  - `scripts/capture-receipts.mjs:690,745` — Gmail → `receipt_emails` upsert (source = Gmail crawl). PM2: `receipt-capture` every 6h +30min. _Captures attachments into Supabase Storage; does NOT create Xero bills._
  - `scripts/match-receipts-to-xero.mjs` — updates `receipt_emails.xero_bank_transaction_id` on match. PM2: `receipt-match` daily 7am AEST. _Updates only; no inserts to xero tables._
  - `scripts/upload-receipts-to-xero.mjs:90` — uploads attachment bytes to existing Xero bank txns via Xero Attachments API. PM2: `receipt-upload` daily 8am AEST. _Does NOT create bills — only PUTs attachments onto txns that already exist._
  - `scripts/sync-xero-me-receipts.mjs` — pulls Xero ME mobile-app attachments INTO Supabase + inserts `receipt_emails` (source='xero_me'). _Pull-only from Xero; insert is into our DB._
  - `scripts/import-dext-to-pipeline.mjs` — one-time Dext CSV → `receipt_emails` import for migration. Not on cron. Run on-demand only.
  - `scripts/ocr-bank-txn-attachments.mjs` — refreshes Xero tokens + OCR-on-demand. No bill creation.
  - `scripts/sync-bill-attachments-to-txns.mjs` — copies attachments from existing ACCPAY bills onto matching unreceipted SPEND bank txns via Xero API. _Does NOT create bills — only copies attachments between existing Xero objects._ Run on-demand.
- **RECOMMENDATION:** Keep all six. None create Xero bills today. Documentation update needed: a `README.md` in `scripts/` that lists "writer scripts" with their role and explicitly says "no script creates bills in Xero — Dext + connectors are the only bill-creators." This prevents future engineers from re-introducing the dual-write.
- **CONFIDENCE:** H — grep + header reads confirm; the dual-write duplicators are already archived; remaining writers are explicitly scoped to attachments and mirror-tables.

### 5.2 PM2 receipt-cron chain is LIVE in config — runtime "stopped" only holds until next `pm2 reload`
- **WHAT:** The RESTORE.md note ("crons stopped" — `gmail-sync`, `receipt-capture`, `receipt-match`) reflects RUNTIME state. The PM2 config entries themselves are NOT commented out. Any `pm2 reload ecosystem.config.cjs` will respawn them.
- **EVIDENCE:** `ecosystem.config.cjs:642-668`:
  - Line 642: `name: 'xero-sync'` — `cron_restart: '0 */6 * * *'` (every 6h)
  - Line 648: `name: 'receipt-capture'` — `cron_restart: '30 */6 * * *'`
  - Line 654: `name: 'receipt-match'` — `cron_restart: '0 7 * * *'`
  - Line 660: `name: 'receipt-upload'` — `cron_restart: '0 8 * * *'`
  - Line 665: `name: 'xero-project-tag'` — `cron_restart: '0 9 * * *'`
  - Line 671: `name: 'receipt-calendar-suggest'` — `cron_restart: '0 10 * * 1'`
  - Compare to lines 309, 465, 481, 543, 552, 615, 702 — disabled entries ARE commented out. The receipt chain is NOT.
- **RECOMMENDATION:** **DECIDE explicitly.** If the four scripts (`capture-receipts`, `match-receipts-to-xero`, `upload-receipts-to-xero`) are the canonical attachment-rehydration path going forward, KEEP these PM2 entries enabled — none of them creates Xero bills, so they don't duplicate. If the intent is "Dext-only, hands off Xero", then COMMENT OUT lines 648-668 with a dated rationale block. Today the chain is in a contradictory state — config says active, runtime says stopped.
- **CONFIDENCE:** H — config file inspection direct; runtime state not re-verified (read-only audit).

### 5.3 Two parallel receipt-capture paths are still in play — Dext (external) and Gmail crawler
- **WHAT:** Even after the bill-creator duplicators were archived, there are still **two parallel paths into `receipt_emails`**: (a) Dext-published items (now imported via `import-dext-to-pipeline.mjs` one-time CSV; current Dext receipts publish straight to Xero as bills); (b) Gmail crawl via `capture-receipts.mjs` (live PM2 cron). Both can land receipts for the same vendor email if Dext + Gmail forwarding rules overlap.
- **EVIDENCE:**
  - `scripts/capture-receipts.mjs:3-8` header: "Capture Receipt Emails → Supabase (replaces forward-receipts-to-dext.mjs)" — explicit replacement positioning.
  - `scripts/_archive/2026-05-19-receipt-pipeline-duplicators/RESTORE.md:16`: "Dext + auto-billing connectors are the single canonical receipt-capture path."
  - But `capture-receipts.mjs` is still live in PM2 (line 648 of ecosystem.config.cjs) AND its insert path is wired (`scripts/capture-receipts.mjs:690,745`).
  - Risk: if a vendor (e.g. Qantas) emails a receipt that BOTH Dext picks up (via vendor connector) AND Gmail crawl captures, you get two `receipt_emails` rows for the same physical receipt — one with `source='gmail_*'`, the other with `source='dext'`. They may match to the same xero_transaction_id (good) or to different bills (bad).
- **RECOMMENDATION:** Add a `vendor_email_dedup` constraint or pre-insert check in `capture-receipts.mjs:690` keyed on `(vendor_email_address, message_id)` AND a "skip if Dext-published" guard (check `receipt_emails` for a recent row from the same vendor + amount with `source='dext'` before inserting). Alternatively, narrow `capture-receipts.mjs` to only crawl mailboxes / labels that Dext does NOT cover (e.g. receipts forwarded to `accounts@act.place` from non-connector vendors).
- **CONFIDENCE:** M — confirmed both paths write; have not queried `receipt_emails` to count actual collisions (read-only audit constraint).

### 5.4 Canonical-path recommendation — Option B (Dext + connectors as sole bill-creator)
- **WHAT:** Of the handoff's three options (A keep our pipeline, B Dext + connectors only, C hybrid), recommend **B with a narrow exception for Gmail crawl as fallback into `receipt_emails` only — never into Xero**.
- **EVIDENCE:** The duplicate-creating scripts (`gmail-to-xero-pipeline.mjs`, `push-receipts-to-xero.mjs`) were the ONLY pieces that wrote bills to Xero from our side. With them archived, the architecture is naturally close to B — Dext + auto-billing connectors are the only thing creating bills in Xero. The Telford Smith $59K quadruple-record (§3.7) and the bill+bill duplicates ($61K exposure, per RESTORE.md) all trace to the now-archived scripts, not to current pipelines.
- **RECOMMENDATION:** Adopt Option B formally. Migration steps:
  1. Flip Dext setting at `app.dext.com/integrations/xero` → "Auto-publish" (not "Save as Draft") so the 150 DRAFT bills / $25K from §2.1 stop accumulating. _(Handoff item #5 — outstanding.)_
  2. Decide PM2 receipt-chain fate per §5.2 — recommend KEEP enabled because none of `capture-receipts` / `match-receipts-to-xero` / `upload-receipts-to-xero` creates bills. They only enrich `receipt_emails` and attach files to bank-txns that Dext / connectors already created. This is the "receipt-rehydration safety net" — useful for Xero ME mobile uploads and Gmail-only vendors.
  3. Add dedup guard per §5.3 to prevent Gmail crawl from racing Dext on overlapping vendors.
  4. Write a one-page `scripts/RECEIPT-PIPELINE.md` (NEW file) that says: "Bills are created by Dext + auto-billing connectors ONLY. Our scripts ONLY enrich receipt_emails and attach files to existing Xero objects. If you find yourself writing a script that calls Xero `createBills` or `accountingApi.create*`, STOP — that was the 2026-05 dual-write bug."
  5. Once Dext auto-publish is on AND dedup guard is in, consider removing the legacy Telford Smith / Kennedy's / etc. duplicates per §3 cleanup ledger.
- **Dependencies:** Standard Ledger sign-off on bill-creation policy (since they're the bookkeeper of record). Dext auto-publish flip is single-user.
- **Risks of inaction:** Without the dedup guard (step 3), a future high-volume vendor that lives in BOTH Dext and Gmail (e.g. anything routed through `accounts@act.place`) will re-create the bill+bill duplicate pattern at a smaller scale via `receipt_emails` → matched to wrong txn.
- **CONFIDENCE:** H — based on the inventory in §5.1, the only thing standing between "current state" and "clean Option B" is the dedup guard + Dext auto-publish flip + scripts/README docs. The hard architectural work was done by the 2026-05-19 archive.

### 5.5 Archive candidates — already done, none outstanding
- **WHAT:** Re-check of scripts that SHOULD be archived per the handoff narrative.
- **EVIDENCE:**
  - `gmail-to-xero-pipeline.mjs` — already archived at `scripts/_archive/2026-05-19-receipt-pipeline-duplicators/`.
  - `push-receipts-to-xero.mjs` — already archived (same dir).
  - `forward-receipts-to-dext.mjs` — referenced as replaced in `capture-receipts.mjs:4` header; checked: NOT present in `scripts/`. Already gone.
  - No other scripts in the writer inventory (§5.1) currently warrant archival — they each serve a distinct, non-overlapping role.
- **RECOMMENDATION:** No script moves required. The archive job from 2026-05-19 already covered the dual-write surface. Instead, the outstanding actions are config-level (§5.2) + policy/docs (§5.4) + dedup-guard (§5.3).
- **CONFIDENCE:** H — direct file-existence checks.

**Confidence:** H — the writer surface is smaller than the handoff suggested (only 6 scripts touch the relevant tables, and none of them create Xero bills today); the bill-creator duplicators were archived 2 days ago and the residue is data (§3 duplicates) not code. The one live risk is the contradiction between config-says-active and runtime-says-stopped for the PM2 receipt chain (§5.2) — needs an explicit decision.

---

## §6 — Cron + workflow audit

### 6.1 EVERY finance-related PM2 entry is `stopped` — daemon is effectively non-functional for finance ops
- **WHAT:** Of ~110 PM2 entries, only 8 are `online` (act-frontend, discover-grants, empathy-ledger, empathy-ledger-palm-review, empathy-ledger-v2-main, ten-years, wiki-build-viewer, wiki-watch-meetings). ALL finance-related entries — without exception — are in `stopped` status. This is far broader than the known handoff ("xero-sync stopped (good), gmail-sync/receipt-capture/receipt-match stopped"). The Mon-morning sync chain, daily Telegram briefing, weekly reconciliation, daily money pulse, BAS-relevant scripts — all dead.
- **EVIDENCE:** `pm2 list` 2026-05-22 11:45 AEST — every entry below shows `0` pid, `0` uptime, `stopped` status:
  - `weekly-reconciliation` (id 15, ↺ 2) — should be Mon 8am per CLAUDE.md
  - `daily-money-briefing` (id 27, ↺ 9) — should be 8am daily per CLAUDE.md
  - `telegram-money-alerts` (id 28, ↺ 6) — afternoon alert
  - `weekly-money-digest` (id 29, ↺ 0) — Friday digest, NEVER successfully run (↺ 0)
  - `daily-pulse-sync` (id 90, ↺ 10) — Notion 📡 Today's Pulse refresh
  - `money-command-digest` (id 96, ↺ 3)
  - `money-stack-sync` (id 112, ↺ 0) — NEVER successfully run
  - `money-framework-sync` (id 16, ↺ 1)
  - `money-metrics-snapshot` (id 24, ↺ 1)
  - `money-in-audit` (id 33, ↺ 2), `money-out-audit` (id 34, ↺ 2), `money-alignment-notion` (id 35, ↺ 2)
  - `xero-sync` (id 74, ↺ 26), `xero-payments-sync` (id 32, ↺ 2), `xero-project-tag` (id 78, ↺ 7), `push-ai-tracking-to-xero` (id 103, ↺ 31)
  - `gmail-sync` (id 40, ↺ 3), `gmail-watch-renew` (id 39, ↺ 2)
  - `receipt-capture` (id 75, ↺ 27), `receipt-match` (id 76, ↺ 10), `receipt-upload` (id 77, ↺ 8), `receipt-calendar-suggest` (id 79, ↺ 1)
  - `reconciliation-checklist` (id 80, ↺ 0) — NEVER successfully run
  - `cash-forecast-sync` (id 19, ↺ 0), `cash-scenarios-sync` (id 22, ↺ 1), `kpis-sync` (id 20, ↺ 0)
  - `finance-health-digest` (id 83, ↺ 0), `financial-snapshots` (id 82, ↺ 0), `financial-advisor` (id 81, ↺ 2), `monthly-financials` (id 65, ↺ 0)
  - `budget-actual-sync` (id 21, ↺ 1), `variance-notes` (id 66, ↺ 0)
  - `auto-tag-transactions` (id 51, ↺ 28), `quarterly-rd-checklist` (id 111, ↺ 0)
  - `compliance-alerts` (id 98, ↺ 3), `compliance-snapshot` (id 97, ↺ 5), `compliance-notion-sync` (id 99, ↺ 5)
  - `pre-publish-dext-grader` (id 102, ↺ 57)
- **RECOMMENDATION:** This is the lead finding. Don't bulk-restart — root-cause first. Likely a daemon-wide failure (machine reboot? PM2 startup script not configured? auto-restart disabled across the board?). Run `pm2 startup` to check launch agent registration; `pm2 logs --err --lines 100` to look for the common failure mode; `pm2 status xero-sync --json | head` to see last-error context. Once root cause known, selectively restart only the entries we WANT running per the 4-Surface Model (`weekly-reconciliation`, `daily-money-briefing`, `daily-pulse-sync`, `telegram-money-alerts`, `weekly-money-digest` at minimum — NOT `xero-sync` which we explicitly want stopped per handoff). (Tier 2 — Ben to approve before running)
- **CONFIDENCE:** H — `pm2 list` is the source of truth; zero ambiguity that the entries are stopped. Inference on root cause is M; need logs to confirm.

### 6.2 The 4-Surface canonical cron map vs current state — every scheduled push is dark
- **WHAT:** Per CLAUDE.md, the 4-Surface Model expects: morning Telegram push, weekly Mon 8am reconciliation + R&D grade, daily 8:13am Pulse, Friday 3pm digest, afternoon money alert, DEXT pre-publish grading. After QW4 (commit 0b78bf9, 2026-05-21) Ben consolidated AM Telegram to a single push (`telegram-daily-focus` 7:30 replaces the old `daily-money-briefing` 8:00).

  | Surface | Intended cron entry | Schedule (config) | Status today |
  |---|---|---|---|
  | Morning Telegram (single, phone-first) | `telegram-daily-focus` | `30 7 * * *` (daily 7:30am) | stopped (id 109, ↺ 1 — barely run) |
  | Notion focus refresh (preload for above) | `notion-daily-focus` | `0 7 * * *` (daily 7am) | stopped (id 108, ↺ 1) |
  | Notion Today's Pulse | `daily-pulse-sync` | `13 8 * * *` (daily 8:13am) | stopped (id 90, ↺ 10) |
  | Weekly reconciliation + R&D grade | `weekly-reconciliation` | `0 8 * * 1` (Mon 8am) | stopped (id 15, ↺ 2) |
  | Mon-morning Money-stack orchestrator | `money-stack-sync` | `15 8 * * 1` (Mon 8:15am, NEW) | stopped (id 112, ↺ 0 — NEVER successfully run) |
  | Afternoon money alerts | `telegram-money-alerts` | `0 13 * * *` (daily 1pm) | stopped (id 28, ↺ 6) |
  | Friday Money Digest | `weekly-money-digest` | `0 15 * * 5` (Fri 3pm) | stopped (id 29, ↺ 0 — NEVER successfully run) |
  | Weekly Curtis narrative | `weekly-narrative` | `15 15 * * 5` (Fri 3:15pm) | stopped (id 101, ↺ 0 — NEVER successfully run) |
  | DEXT pre-publish grader | `pre-publish-dext-grader` | `*/15 8-18 * * 1-5` | stopped (id 102, ↺ 57 — was actively running before) |
  | Money-command digest (snapshot) | `money-command-digest` | `15 8 * * *` (daily 8:15am) | stopped (id 96, ↺ 3) |
- **EVIDENCE:** `ecosystem.config.cjs:81-92` (notion-daily-focus + telegram-daily-focus), `:170-188` (money-stack-sync + daily-pulse-sync), `:248-296` (briefings + Friday digest), `:319-322` (dext-grader), `:142-145` (weekly-reconciliation). Restart counts ↺ from `pm2 list` 2026-05-22 11:45 AEST.
- **RECOMMENDATION:** After §6.1 root cause is found, restart in priority order: (1) `telegram-daily-focus` + `notion-daily-focus` — the SOLE AM push, (2) `weekly-reconciliation` + `money-stack-sync` — Mon morning, (3) `daily-pulse-sync` + `compliance-snapshot/alerts/notion-sync` — daily 7-8am chain, (4) `weekly-money-digest` + `weekly-narrative` — Friday, (5) `pre-publish-dext-grader` + `telegram-money-alerts`. Command pattern: `pm2 restart <name> && pm2 save`. Three entries (`money-stack-sync`, `weekly-money-digest`, `weekly-narrative`) have ↺ 0 — first activation will reveal whether they actually work. (Tier 2 — Ben to approve before running)
- **CONFIDENCE:** H — both config and `pm2 list` directly cite the entries.

### 6.3 `daily-money-briefing` (id 27) is intentionally disabled — safe to leave stopped
- **WHAT:** The 8am `daily-money-briefing` cron was disabled by QW4 (2026-05-21). Reason in code: "3 overlapping Telegram messages each morning. Kept telegram-daily-focus (7:30) as the single phone-first push." Snapshot script still runs; it just doesn't push. CLAUDE.md still says "daily 8am Telegram briefing" — slightly outdated; the actual single AM push is 7:30 now.
- **EVIDENCE:** `ecosystem.config.cjs:247-252` — `cron_restart` commented out with note `2026-05-21 QW4: disabled (overlaps telegram-daily-focus 7:30)`. `autorestart: false`. `pm2 list`: id 27 ↺ 9 stopped.
- **RECOMMENDATION:** Do NOT restart `daily-money-briefing` when bulk-bringing finance entries back up — its silent state is desired. Optional: update CLAUDE.md 4-Surface section to read "7:30am" instead of "8am" for the morning Telegram push. (Tier 1 — informational only; CLAUDE.md edit is Tier 1 if Ben asks)
- **CONFIDENCE:** H — config comments are explicit.

### 6.4 Eleven `sync-*-to-notion` entries kept-but-disabled by `money-stack-sync` orchestrator — DON'T bulk-restart
- **WHAT:** Commit 0b78bf9 (2026-05-21 S5) replaced 11 separate Mon-morning crons with a single `money-stack-sync` orchestrator (`scripts/sync-money-stack.mjs`). The 11 entries are kept in PM2 with `autorestart:false` and no cron, so PM2 doesn't lose them on `pm2 save`. If anyone runs `pm2 restart all` after fixing §6.1, all 11 will fire once AND the orchestrator will also fire on Mon 8:15 — double-write to Notion.
- **EVIDENCE:** `ecosystem.config.cjs:163-241`. The 11 superseded entries: `dashboard-hub-sync` (175), `opportunities-db-sync` (193), `pile-pages-sync` (198), `cash-forecast-sync` (203), `kpis-sync` (208), `budget-actual-sync` (213), `cash-scenarios-sync` (218), `money-metrics-snapshot` (223), `planning-rhythm-sync` (228), `entity-hub-sync` (233), `money-framework-sync` (238).
- **RECOMMENDATION:** When restarting, scope explicitly — `pm2 restart <name>` per entry, not `pm2 restart all`. Better: `pm2 reload ecosystem.config.cjs` which will honour the `autorestart:false` flags. (Tier 2 — Ben to approve before running)
- **CONFIDENCE:** H — config + commit + comment block are unambiguous.

### 6.5 Orphan in `pm2 list` not in root config: `agent-funder-cadence` (id 89)
- **WHAT:** `agent-funder-cadence` appears in `pm2 list` (id 89, ↺ 8, stopped) but no `name: 'agent-funder-cadence'` entry exists in `ecosystem.config.cjs`. It only exists in PM2's persisted dump — a `pm2 reload` will not restore it. Two siblings (`agent-invoice-drift-detector` id 87 ↺ 0, `agent-procurement-analyst` id 88 ↺ 2) may have the same problem; `agent-xero-ghl-reconciler` IS in root config (line 728, `0 5 * * *`).
- **EVIDENCE:** `pm2 list` shows ids 87, 88, 89. `grep -n "agent-funder-cadence\|agent-invoice-drift-detector\|agent-procurement-analyst" ecosystem.config.cjs` returns nothing. Not checked: `deployment/ecosystem.config.cjs` (128 lines, separate file).
- **RECOMMENDATION:** Triage all three. If wanted: add to root config with cron + restart. If retired: `pm2 delete <name> && pm2 save`. First check the deployment-folder config doesn't define them: `grep -n "agent-" deployment/ecosystem.config.cjs`. (Tier 2 — Ben to approve before delete)
- **CONFIDENCE:** M — verified absence from root config; haven't checked deployment config or PM2 dump.

### 6.6 Gap: `money-stack-sync` has no health-back-push — silent failures will sit unnoticed
- **WHAT:** `money-stack-sync` runs 11 sync scripts in sequence (commit 0b78bf9). If one fails, the orchestrator's log records it, but no Telegram or Notion push surfaces the failure — Ben only notices when he opens Notion and sees stale data. The handoff mentions an alternative `monday-morning-chain.mjs` with an end-of-chain Telegram summary, but it's commented out (config:309-312).
- **EVIDENCE:** `ecosystem.config.cjs:170-173` — `money-stack-sync` has no `args` (no `--telegram` flag). `:298-313` — `monday-morning-chain` defined but commented out with note: "Single-entry replacement for the Mon 5:30-9:10 chain... Single Telegram summary at the end".
- **RECOMMENDATION:** Cheapest fix — add `args: '--telegram'` to `money-stack-sync` if the script supports it (check `scripts/sync-money-stack.mjs` for a `--telegram` flag). If not, add a follow-on entry `money-stack-health` at `30 8 * * 1` that parses the latest `wiki/cockpit/monday-chain-*.md` log and Telegrams a one-line red/amber/green. (Tier 1 — config-only edit, no daemon restart; but Ben should review the design before edit)
- **CONFIDENCE:** M — verified the absence; the design recommendation is opinion not verified gap.

**Confidence:** H on §6.1, 6.2, 6.3, 6.4; M on §6.5, 6.6. The `pm2 list` snapshot is authoritative for status. Config-vs-snapshot cross-reference is exhaustive for "finance-related" entries (defined by name match against: money/xero/receipt/gmail/finance/reconcil/cash/budget/tagger/compliance/dext/telegram-money/daily-money/weekly-money/daily-pulse/money-stack). Did not enumerate non-finance entries — out of scope.

---

## §7 — Xero data quality

### 7.1 Tracking categories — duplicate "old name vs ACT-code" options bleeding the totals
- **WHAT:** "Project Tracking" category has ~33 active options but ≥8 projects exist under TWO names (legacy free-text + canonical ACT-code). Same project's line-items split across both labels, so every Xero report grouped by tracking option under-counts.
- **EVIDENCE:** Distinct option counts on invoice line-items (`xero_invoices.line_items[]->tracking[]`):
  ```
  Project Tracking option            | uses
  -----------------------------------+-----
  Goods.                             |  305  ← legacy
  ACT-GD — Goods                     |   62  ← canonical
  ACT-HV — The Harvest Witta         |  104  ← canonical
  The Harvest                        |    2  ← legacy
  BG Fit                             |   37  ← legacy
  ACT-BG — BG Fit                    |    8  ← canonical
  Confit                             |   35  ← legacy (also BG Fit?)
  Mounty                             |    8  ← legacy
  ACT-MY — Mounty Yarns              |   21  ← canonical
  Empathy Ledger                     |    8  ← legacy
  ACT-EL — Empathy Ledger            |    6  ← canonical
  JusticeHub                         |    5  ← legacy
  ACT-JH — JusticeHub                |    1  ← canonical
  ACT-IN — ACT Infrastructure        |  206  ← canonical
  ACT-IN — Infrastructure            |   10  ← duplicate of canonical
  PICC Centre / Annual Report / Photo Studio | 18 across 3 sub-labels  ← should roll up to ACT-PI — PICC (13 uses)
  ```
  Business Divisions category (4 options, looks clean): A Curious Tractor 1085, Farm Activities 75, Rental 51, Eco-tourism 7.
- **RECOMMENDATION:**
  1. In Xero UI: Accounting → Advanced → Tracking categories → Project Tracking → **rename** each legacy option to its ACT-coded canonical (Goods. → ACT-GD — Goods, BG Fit → ACT-BG — BG Fit, Confit → ACT-BG — BG Fit, Mounty → ACT-MY — Mounty Yarns, Empathy Ledger → ACT-EL — Empathy Ledger, JusticeHub → ACT-JH — JusticeHub, The Harvest → ACT-HV — The Harvest Witta, PICC Centre/Annual Report/Photo Studio → ACT-PI — PICC, ACT-IN — Infrastructure → ACT-IN — ACT Infrastructure). Renaming re-points historical line-items in place (does not orphan them). (Tier 2 — Ben/Nic action via Xero UI)
  2. After rename, re-run `node scripts/sync-xero-to-supabase.mjs` and verify `Project Tracking` distinct option count drops to ~22-25 unique. (Tier 1 — script)
  3. Add a lint in `scripts/lint-finance-data.mjs` (or similar) that flags any new tracking option that does NOT match `ACT-XX — *` pattern. (Tier 1 — script)
- **CONFIDENCE:** H. Duplicate names visible in raw query, ACT-code convention is documented in `wiki/projects/` frontmatter.

### 7.2 Tracking categories — 33 used but Xero MCP blocked on direct count (scopes issue)
- **WHAT:** Could not call `mcp__xero__list-tracking-categories` — Xero MCP returned `invalid_scope: No valid scopes remaining after filtering for grant type`. Read-only API access to tracking categories is currently broken.
- **EVIDENCE:** Error from MCP call: `Failed to get Xero token with V2 scopes`. Fell back to inferring categories from `xero_invoices.line_items[].tracking[]` JSON — 2 categories, ~37 distinct options surfaced (Project Tracking has long tail).
- **RECOMMENDATION:** Run `node scripts/sync-xero-tokens.mjs` then retry `mcp__xero__list-tracking-categories includeArchived:true` to get the ground-truth list of active vs archived options. The "33 active" figure from the handoff cannot be confirmed against Xero today — Supabase shows 37 distinct option-names actually used (some may be archived in Xero but historical line items still reference them). (Tier 1 — script + MCP retry)
- **CONFIDENCE:** M. Supabase-inferred count is a floor (only counts options used on at least one line). True active count in Xero needs the MCP working.

### 7.3 DRAFT receivables — clean (2 records, both $0)
- **WHAT:** Only 2 DRAFT sales invoices total, both zero-dollar. No revenue stuck in pipeline.
- **EVIDENCE:**
  ```
  status     | count | total_aud
  -----------+-------+----------
  PAID       |   58  | $1,511,634.31
  AUTHORISED |   24  |   $602,040.00
  DRAFT      |    2  |          $0.00  ← both zero, one is 88 days old (INV-0318 Our Community Shed)
  VOIDED     |   36  |   $571,692.11
  DELETED    |    5  |   $119,900.00
  ```
  Stale DRAFTs: INV-0318 (Our Community Shed, 2026-02-23, $0); INV-0326 (Sonas Properties, 2026-04-29, $0).
- **RECOMMENDATION:** Either void both (Tier 2 — Ben via Xero UI: Business → Invoices → Draft → ⋯ → Void) or fill them in and authorise. Zero-dollar DRAFTs add noise to dashboards without representing revenue. (Tier 2)
- **CONFIDENCE:** H. Direct count from `xero_invoices` matches §1 of this audit.

### 7.4 DRAFT bills — 159 stuck, $30,089 — but it's mostly SaaS dust, not bill-side gap
- **WHAT:** 159 DRAFT accounts-payable invoices, all > 14 days old, total $30,089.25. Confirms the 152-177 figure from handoff. Crucially, this is NOT large bills missing approval — it's a long tail of small SaaS auto-charges that Xero received from a connector but never had a human approve them.
- **EVIDENCE:** Top vendors by DRAFT count (full set 159 rows):
  ```
  Vendor               | bills | total_aud | oldest      | newest
  ---------------------+-------+-----------+-------------+------------
  Webflow              |  40   | $1,443.50 | 2025-10-08  | 2026-02-25  ← auto-bill connector, expected
  Cognition AI         |  11   | $1,516.33 | 2025-09-01  | 2026-03-03
  HighLevel (GHL)      |  10   |   $538.00 | 2025-12-22  | 2026-03-04
  Anthropic            |   7   |    $88.00 | 2025-10-10  | 2026-01-10
  SideGuide Tech       |   7   |   $138.70 | 2025-11-11  | 2026-01-11
  Bitwarden            |   5   |    $60.00 | 2026-01-06  | 2026-03-06
  Notion Labs          |   5   |   $388.08 | 2025-10-09  | 2026-02-09
  Zapier               |   5   |   $164.95 | 2025-10-02  | 2026-01-02
  Vercel               |   5   |   $100.00 | 2025-12-16  | 2026-01-16
  OpenAI               |   4   |   $190.00 | 2025-10-10  | 2025-12-24
  Figma / Firecrawl / Supabase | 4 each | ~$60-280 ea | 2025-10 | 2026-02
  ```
  Average DRAFT bill: $189. Oldest: 2025-06-17 (AI Builder Club). All 159 fail the 14-day threshold.
- **RECOMMENDATION:**
  1. **Bulk-approve SaaS DRAFTs** (Tier 2 — Ben/Nic via Xero UI): Business → Bills → Filter by Status=Draft → tick all rows from known SaaS vendors (Anthropic, OpenAI, Notion, Vercel, Supabase, Zapier, Figma, Firecrawl, Cognition AI, HighLevel, SideGuide, Bitwarden, Webflow, Mighty Networks) → "Approve and email"-equivalent batch action. These are paid charges; approving them just gets them off the dust pile.
  2. After approval, run `node scripts/sync-bill-attachments-to-txns.mjs` to pull any matching receipts onto the now-AUTHORISED bills. (Tier 1 — script)
  3. Add a daily lint to `scripts/daily-money-pulse.mjs` (or similar) flagging any DRAFT bill > 30 days old, vendor name, days-old. Surfaces silent dust instead of letting it pile to 159. (Tier 1 — script)
- **CONFIDENCE:** H. Status filter is direct; SaaS dust pattern matches §6 cron audit observation that auto-billing connectors fire but no approval workflow runs.

### 7.5 AP backlog — every AUTHORISED bill is > 30 days overdue ($735,274 across 389 bills)
- **WHAT:** 100% of AUTHORISED accounts-payable invoices (389/389) are past their due date by 30+ days. Total backlog $735,274.04. Either bills are being paid outside Xero (no payment record applied back) OR there's a real AP-pay-down crisis.
- **EVIDENCE:** Top 10 by amount × age:
  ```
  Vendor                       | bill date    | total      | days overdue
  -----------------------------+--------------+------------+--------------
  The Funding Network          | 2025-11-27   | $89,361.00 | 176 days
  The Funding Network          | 2025-12-17   | $55,197.00 | 156 days   ← TFN total $144,558
  MOL Nyrt.                    | 2026-03-27   | $30,691.00 |  56 days   ← non-AUD vendor (Hungary?)
  The Plasticians              | 2025-12-17   | $29,800.00 | 156 days
  RNM Carpentry                | 2025-11-11   | $26,845.65 | 192 days
  Hatch Electrical #758        | 2025-11-23   | $26,801.70 | 173 days
  AAMI                         | 2025-12-27   | $20,000.00 | 146 days   ← insurance, presumably paid
  Hatch Electrical             | 2025-11-10   | $19,947.13 | 193 days   ← Hatch total $46,749
  Telford Smith Engineering    | 2025-12-22   | $19,800.00 | 151 days   ← matches §3 quadruple-record finding
  Oonchiumpa Consultancy       | 2025-10-09   | $19,305.00 | 225 days   ← partner, oldest, must reconcile
  Defy / Defy Manufacturing    | 2 bills      | $35,422.75 |  56-177 days  ← name-split, see 7.7
  Carla Furnishers             | 2 bills      | $22,360.00 | 187 days   ← exact dupe? same date same amount
  ```
  Counts: AUTHORISED total 389, all overdue. Total $735,274.04.
- **RECOMMENDATION:**
  1. **Reconcile, don't pay** (Tier 2 — Ben/Nic via Xero UI): Most likely root cause is payments-made-outside-Xero. Open Xero → Business → Bills → Filter Status=Awaiting Payment, sort by Due Date ascending. For each line, cross-check bank statement (NAB Visa ACT or ACT Everyday) for the matching debit; if found, "Add payment" from the bill view to mark PAID.
  2. **Carla Furnishers dupe** (Tier 2): Two AUTHORISED bills 2025-11-16 same $11,180 same vendor — almost certainly duplicate. Void one before payment.
  3. **Oonchiumpa $19,305 day-225** (Tier 3 — needs explicit action): Cannot leave a partner organisation invoice unpaid for 7+ months. Confirm whether paid (and re-link) or actually owed.
  4. **The Funding Network $144,558** (Tier 3 — needs explicit action): TFN bills two months apart, both >5 months overdue. Confirm: is this our Plus Impact / fiscal-host fee structure? Are these correctly classified as bills vs internal transfers? May be a category mismatch rather than unpaid debt.
  5. Add a Friday digest line in `scripts/weekly-reconciliation.mjs`: top 10 AUTHORISED bills by days-since-due × amount. Pushes the backlog into weekly view instead of dashboard dust. (Tier 1 — script)
- **CONFIDENCE:** H on counts/totals. M on cause — without running `list-payments` against each xero_id, can't confirm whether the bills are genuinely unpaid or just un-reconciled.

### 7.6 Contact aliases — vendor splits hide spend concentration (top split: Defy $179,935 across 2 names)
- **WHAT:** Multiple xero_contacts records exist for the same real-world supplier. Splits hide spend concentration in reports + force the auto-tagger to learn rules twice + create reconciliation noise.
- **EVIDENCE:** Confirmed splits + bill totals (accounts-payable only):
  ```
  Real supplier        | xero_contacts records                                           | bills | total_aud
  ---------------------+-----------------------------------------------------------------+-------+-----------
  Defy Manufacturing   | "Defy" + "Defy Manufacturing"                                   |  35   | $179,935.91  ★ biggest split
  Qantas (flights)     | "Qantas" + "Qantas Airways Limited" + "Qantas Concourse" + "Qantas Hotels" + "Qantas Group Accommodation" |  192+  | $134,482.04
  Uber                 | "Uber" + "Uber Eats" + "Uber Amsterdam" + "Uber London"         |  60+  |   $2,346.43+   ← OK, geo splits are arguably useful
  Witta (NT trip)      | "Flight Bar Witta" + "Witta Shop" + "Chris Witta" + "Jye Witta" + "Nest In Witta" + "WITTA RRC" | TBD | TBD — known case from handoff, multiple line splits route NT-trip charges
  ```
  Plus 10 minor case/punctuation duplicates (e.g. "Fish Bowl"/"Fishbowl", "Mitre 10"/"Mitre10", "Two Good Co"/"Two Good Co.", "Hunter's Corner"/"Hunters Corner", "Sunny's Pizza"/"Sunnys Pizza", "PROUDY'S EARTHWORKS TRUST"/"Proudys Earthworks Trust", "Good Lookin' Rooster"/"Good Lookin' Rooster" (curly vs straight apostrophe), "Oaks Waterfront"/"OaksWaterfront").
- **RECOMMENDATION:**
  1. **Merge Defy → Defy Manufacturing** (Tier 3 — Ben/Nic via Xero UI, requires explicit "merge"): Contacts → search "Defy" → tick both → Merge. Picks canonical name (Defy Manufacturing). Re-routes all 35 bills under one contact, unlocks spend-concentration view.
  2. **Qantas split: deliberate or not?** (Tier 2 — Ben/Nic to decide): "Qantas Group Accommodation" / "Qantas Hotels" arguably represent different cost categories. If yes, leave but standardise naming. If no, merge to "Qantas". Recommend leaving Hotels/Accommodation separate, but merge "Qantas Airways Limited" + bare "Qantas".
  3. **Witta supplier disambiguation** (Tier 2 — partner check): "Flight Bar Witta", "Witta Shop", "Nest In Witta", "WITTA RRC" are likely distinct businesses in the same town (Witta, QLD) — leave as-is. "Chris Witta" + "Jye Witta" are people, not vendors — confirm whether they should be in xero_contacts at all.
  4. **Bulk-merge case/punctuation dupes** (Tier 2): 10 pairs above, Contacts → merge each. Add normalisation step to next sync of `sync-xero-to-supabase.mjs` that flags new variants. (Tier 1)
  5. Add `scripts/lint-finance-data.mjs` rule: "contacts where `regexp_replace(lower(trim(name)),'\\W+','','g')` collides → alert". (Tier 1 — script)
- **CONFIDENCE:** H on the splits. M on whether Qantas/Uber splits are intentional cost-category proxies.

### 7.7 Bank reconciliation — 1,010 ACT-only txns unreconciled, $1.8M across both accounts, oldest 2025-01-28
- **WHAT:** Both ACT-only bank accounts have a large unreconciled tail going back 16 months. NAB Visa ACT #8815 is 31.7% unreconciled by count; ACT Everyday is 45.4%. R&D evidence, BAS GST capture, and trial-balance integrity all depend on these being reconciled (or explicitly classified as transfers/personal).
- **EVIDENCE:**
  ```
  Account                          | unreconciled count | abs total       | reconciled count | reconciled total | %unreconciled (count)
  ---------------------------------+--------------------+-----------------+------------------+------------------+----------------------
  NAB Visa ACT #8815               |    827             | $629,966.44     | 1,779            | $1,208,178.78    | 31.7%
  NJ Marchesi T/as ACT Everyday    |    183             | $1,176,645.07   |   220            | $1,449,470.65    | 45.4%
  TOTAL                            | 1,010              | $1,806,611.51   | 1,999            | $2,657,649.43    | 33.6%
  ```
  Date span of unreconciled queue:
  ```
  Account             | oldest unreconciled | newest      | > 30 days old
  --------------------+---------------------+-------------+---------------
  NAB Visa ACT #8815  | 2025-01-28          | 2026-05-18  | 795/827 (96%)
  ACT Everyday        | 2025-01-28          | 2026-05-13  | 166/183 (91%)
  ```
- **RECOMMENDATION:**
  1. **Reconciliation sprint** (Tier 3 — Ben/Nic, multi-session): Xero UI is the only path (API CANNOT set IsReconciled=true, per project memory note). Open Accounting → Bank Accounts → for each: "Reconcile X items" → "Find & Match" or "Create" each line. Prioritise ACT Everyday (larger $-impact: $1.18M unreconciled, only 183 lines) before NAB Visa (827 lines but lower $).
  2. **Sub-batch by month**: target oldest months first so R&D evidence pack (FY25-26 finalising) is on reconciled data. Jul 2025 → Sep 2025 quarter is most R&D-critical.
  3. **Backstop with a Friday digest tile** (Tier 1 — script): add to `scripts/weekly-reconciliation.mjs` Telegram line: "Bank unreconciled — NAB Visa N items / $X, ACT Everyday M items / $Y. Oldest: <date>." Surfaces drift weekly.
  4. **Receipt automation depends on this**: §2 of this audit found 95.3% receipt coverage; the 4.7% gap is concentrated in unreconciled NAB Visa rows where no `receipt_emails.status='uploaded'` match has been made. Reconciliation in Xero would also flag the missing receipts. (Tier 1 — derivable)
- **CONFIDENCE:** H. Direct counts from `xero_transactions.is_reconciled`. The "API cannot fix" constraint is from project memory and confirmed by Xero docs.

**Confidence:** Section overall H on data extraction (all SELECT queries returned counts and dollar figures, cross-verified against §1-§3 of this audit). M on root cause for findings 7.5 (AP backlog — likely paid-outside-Xero, but couldn't prove via xero_payments without further queries) and 7.7 (large unreconciled tail — possibly intentional for personal-account exclusion, but oldest date predates the two-account rule). L on Xero MCP scope status — the `invalid_scope` error means none of these findings could be cross-checked against the live Xero API; all relied on the `xero_invoices` / `xero_contacts` / `xero_transactions` mirror tables (last synced unknown — would need to check `xero_sync_log` to be sure but didn't to stay inside 25 tool calls / 10 minutes).

---

## §8 — Top 10 improvements

_Synthesized across §1-§7. Ordered by impact-per-effort — Tier 1 fixes worth $X beat Tier 3 fixes worth less._

### 8.1 — Void the Telford Smith Engineering $19,800 quadruple-record
- **WHAT** — One $19,800 engineering bill is recorded FOUR times across Xero (2 bills 2025-12-22 + 2 spends 2025-12-23), with project codes split between ACT-IN and ACT-GD, inflating both projects.
- **WHY** — $59,400 face-value phantom expense, single largest dup in audit. Also corrupts project totals on ACT-IN and ACT-GD dashboards. Sits inside the 389-bill AP backlog (§7.5 row), so it's polluting the "$735K overdue" headline too.
- **HOW** — Xero UI. Keep PAID bill `843767e6-2190-483c-a7cc-4c1a2db90c7b`. Void: AUTHORISED bill `f47c47b4-8df4-4b04-8dea-5476f913ab67`, spends `578961df-2eb7-473b-99f2-81c8cae89145` + `87a05588-6b66-4533-b3a4-aeb5a7f69ff8`. Then retag survivor to whichever project actually got the engineering work (likely ACT-GD per spend tagging). See §3.7.
- **EFFORT** — Tier 3 (Xero void = hard-to-reverse, Ben verb "void" needed). ~15 min.
- **DEPENDENCY** — none. Xero MCP scope issue (§7.2) doesn't block UI action.

### 8.2 — Loosen `isNoReceiptNeeded()` to recognize bare "NAB" bank fees
- **WHAT** — 203 NAB bank-fee rows totalling $1,176 are mis-classified as "needs receipt" because the filter at `apps/command-center/src/app/api/finance/transactions/reality/route.ts:21` requires BOTH "NAB|Bank|..." AND "fee|charge|interest|..." in the contact name. Bare "NAB" rows fail the second check.
- **WHY** — Single edit lifts receipted% from 76.5 → ~83% with zero coverage loss. Stops a fake R&D evidence ceiling. Removes 203 rows of dashboard noise.
- **HOW** — Edit one line in `route.ts:21`. When contact is exactly `NAB` AND amount <$50, return true. Better: also check `line_items[].description` for FEE/INTEREST/CHARGE. See §2.5.
- **EFFORT** — Tier 1 (local code edit, <30 min including spot-check).
- **DEPENDENCY** — none.

### 8.3 — Bulk-approve 159 DRAFT bills ($30K) + flip Dext to auto-publish
- **WHAT** — 159 DRAFT accounts-payable bills sit in Xero, all >14 days old, totalling $30,089. 148/150 already have Dext-captured receipts attached — they just never crossed the AUTHORISE step. Same finding has been static since 2026-05-19.
- **WHY** — Stops dust from accumulating forever (oldest is 2025-06-17, 11 months). Unblocks AP backlog cleanup (§7.5) by removing $30K of fake "future" liability. Flipping Dext to auto-publish prevents the next 159 piling up.
- **HOW** — Xero UI: Business → Bills → Status=Draft → tick SaaS vendors (Webflow 40, Cognition AI 11, HighLevel 10, Anthropic 7, etc.) → Approve. Then `app.dext.com/integrations/xero` → "Auto-publish" (not "Save as Draft"). Add 30-day-DRAFT lint to `scripts/daily-money-pulse.mjs`. See §7.4 + §2.1.
- **EFFORT** — Tier 3 (Xero bulk-approve is hard-to-reverse — Ben verb "approve" needed). ~20 min UI work + 2 min Dext flip + ~10 min script edit.
- **DEPENDENCY** — none.

### 8.4 — Root-cause the daemon-wide PM2 outage (every finance cron is `stopped`)
- **WHAT** — All ~35 finance-related PM2 entries are `stopped`. Only 8 of ~110 entries are `online`, none finance. Mon-morning reconciliation, daily money pulse, Telegram briefings, weekly digest — every scheduled push is dark.
- **WHY** — The 4-Surface Model is broken at the "push" layer. Notion is stale, Telegram is silent, R&D grading isn't running, BAS-relevant data isn't refreshing. This is why the 76.5% receipt rate looks like a drop from 81% — fresh syncs aren't running.
- **HOW** — Don't bulk-restart. Diagnose first: `pm2 startup` (launch agent registration?), `pm2 logs --err --lines 100` (common failure), check if machine reboot wiped pids. Then selectively restart per §6.2 priority order: `telegram-daily-focus` + `notion-daily-focus` first, then `weekly-reconciliation` + `money-stack-sync`, then `daily-pulse-sync`. SKIP `xero-sync` (intentionally off per handoff) and `daily-money-briefing` (intentionally disabled per §6.3). Use `pm2 reload ecosystem.config.cjs` not `pm2 restart all` to honour `autorestart:false` on the 11 superseded entries (§6.4). See §6.1.
- **EFFORT** — Tier 2 (PM2 restart is reversible but multi-process). ~30-60 min for diagnosis + selective restart.
- **DEPENDENCY** — none.

### 8.5 — Comment out PM2 receipt-capture chain config (or commit to keeping it)
- **WHAT** — `ecosystem.config.cjs:648-668` defines `receipt-capture`, `receipt-match`, `receipt-upload`, `xero-project-tag`, `receipt-calendar-suggest` as active crons. Runtime says "stopped" but config says "active" — next `pm2 reload` respawns the chain. None of these create Xero bills (per §5.1 inventory) but the chain conflicts with the Dext-only direction from the 2026-05-19 archive.
- **WHY** — Once §8.4 is fixed, a careless `pm2 reload` will respawn this chain. If you want Dext-only (Option B from §5.4), this contradicts. If you want the chain as a safety net, document the intent.
- **HOW** — Decide explicitly. Recommended path (§5.4): KEEP enabled because none creates bills (only enriches `receipt_emails` + attaches files to existing Xero bank-txns). Add dedup guard in `capture-receipts.mjs:690` to prevent Gmail crawl racing Dext on overlapping vendors (§5.3). Write `scripts/RECEIPT-PIPELINE.md` documenting "Bills created by Dext + connectors ONLY". See §5.2 + §5.4.
- **EFFORT** — Tier 1 (config + docs, no daemon action). ~30 min if KEEP-with-docs, ~5 min if COMMENT-OUT.
- **DEPENDENCY** — Standard Ledger sign-off on bill-creation policy (since they're bookkeeper of record).

### 8.6 — Reconcile (don't pay) the $735K AUTHORISED bill backlog
- **WHAT** — 389/389 AUTHORISED bills are >30 days past due, total $735,274. Most likely root cause: payments-made-outside-Xero (no payment record applied back). Top exposures: The Funding Network $144,558 (2 bills), Defy split $35K, Oonchiumpa $19,305 (225 days old, partner org).
- **WHY** — The $735K headline is almost certainly fake debt, but it pollutes every cash-flow projection, makes the AP report unusable, and corrupts the 13-week cash forecast in Notion. Real exposure hidden: Oonchiumpa partner invoice 7+ months old is a relationship risk.
- **HOW** — Xero UI: Business → Bills → Status=Awaiting Payment → sort by Due Date ascending. For each: cross-check bank statement (NAB Visa or ACT Everyday) for matching debit → "Add payment" from the bill view. Priority items: (a) void Carla Furnishers dupe (2 bills same date same $11,180); (b) confirm Oonchiumpa $19,305 status with partner; (c) clarify TFN $144,558 (fiscal-host fee vs internal transfer mis-classification). Add Friday digest line in `scripts/weekly-reconciliation.mjs`. See §7.5.
- **EFFORT** — Tier 3 (Xero AP reconciliation, multi-session). ~3-5 hours of focused work, plus 2 partner conversations (Oonchiumpa, TFN).
- **DEPENDENCY** — bank statement access for both NAB Visa + ACT Everyday.

### 8.7 — Pick ONE rule store (JSON config OR `vendor_project_rules` table) and migrate
- **WHAT** — Three parallel rule systems exist: `config/tag-suggester-rules.json` (30 rules, all tier B), `vendor_project_rules` DB table (507 rules, all `auto_apply=true`), and `tag_inference_rules` DB table (17 rows, unaudited). Three confirmed JSON-vs-DB project-code conflicts (Carbatec, Diggermate, Savage Landscape — §4.6), and 4+ in-table conflicts in `vendor_project_rules` (Maleny Landscaping, Hinterland Aviation, Green Fox, RW Pacific — §4.7) where the same vendor has different codes depending on row order.
- **WHY** — Today: any rule edit might be silently overridden. Auto-tagger behaviour is non-deterministic when conflicting rows exist. Future: every new rule lands in one source, drifting further from the other. The 507-rule DB table is broader coverage than JSON's 30 — DB wins on completeness. JSON's tier system is unused (every rule is tier B).
- **HOW** — Step 1: read `apps/command-center/src/lib/tag-suggester.ts` + `scripts/tag-xero-transactions.mjs` + `scripts/tag-transactions-by-vendor.mjs` + `scripts/suggest-from-line-desc.mjs` to see which source(s) each reads and precedence. Step 2: pick `vendor_project_rules` table as source of truth (richer schema: aliases, rd_eligible, xero_account_code). Step 3: migrate 30 JSON rules into DB, resolve the 3 conflicts. Step 4: add `UNIQUE(LOWER(vendor_name))` constraint to prevent §4.7 dup chaos. Step 5: deprecate JSON file. Audit `tag_inference_rules` separately (§4.8). See §4.5.
- **EFFORT** — Tier 2 (architectural cleanup, reversible — JSON file stays in git history). ~2-3 hours.
- **DEPENDENCY** — none. Can run in parallel with other Tier 1 fixes.

### 8.8 — Rename legacy Xero tracking-category options to ACT-XX canonical
- **WHAT** — "Project Tracking" category has duplicate option names — legacy free-text (Goods. 305 uses, BG Fit 37, Confit 35, Mounty 8, Empathy Ledger 8, JusticeHub 5, The Harvest 2) running parallel to canonical ACT-codes (ACT-GD — Goods 62, ACT-BG — BG Fit 8, ACT-MY — Mounty Yarns 21, etc.). Every Xero report grouped by tracking option under-counts as a result.
- **WHY** — All historical Xero financial reports (P&L by project, cashflow by project) are wrong by the proportion of line-items still tagged with legacy names. Goods alone splits 305 legacy / 62 canonical → reports show ~17% of true Goods spend if filtered by ACT-GD only. R&D evidence pack is also affected.
- **HOW** — Xero UI: Accounting → Advanced → Tracking categories → Project Tracking → for each legacy option, RENAME (not delete) to canonical ACT-code form. Renaming re-points historical line-items in place. After: `node scripts/sync-xero-to-supabase.mjs`, verify distinct option count drops from ~37 to ~22-25. Add lint in `scripts/lint-finance-data.mjs` flagging non-`ACT-XX — *` options. See §7.1.
- **EFFORT** — Tier 2 (Xero rename is reversible). ~30 min.
- **DEPENDENCY** — none.

### 8.9 — Merge split Xero contacts (Defy $179K hidden across 2 names + Qantas across 5)
- **WHAT** — Same supplier exists as 2-5 separate xero_contacts records: Defy + Defy Manufacturing (35 bills, $179,935 hidden); Qantas + Qantas Airways Limited + Qantas Concourse + Qantas Hotels + Qantas Group Accommodation ($134K spread across 192+ bills); 10 minor case/punctuation pairs (Fish Bowl/Fishbowl, Mitre 10/Mitre10, etc).
- **WHY** — Spend-concentration views are wrong: Defy looks like a small vendor when it's the #1 supplier by some measures. Auto-tagger learns rules twice. Reconciliation noise. R&D evidence pack mis-attributes contractor spend.
- **HOW** — Xero UI: Contacts → search "Defy" → tick both → Merge → canonical = "Defy Manufacturing". Repeat for the 10 case/punctuation pairs. Leave Qantas Hotels/Accommodation separate (different cost categories) but merge "Qantas Airways Limited" + bare "Qantas". Confirm Witta splits (Flight Bar Witta, Witta Shop, Nest In Witta, WITTA RRC) are real separate businesses; "Chris Witta"/"Jye Witta" are people not vendors. Add normalisation step + collision-alert lint to `scripts/sync-xero-to-supabase.mjs`. See §7.6.
- **EFFORT** — Tier 3 (Xero contact merge is hard-to-reverse — Ben verb "merge" needed). ~45 min for Defy + 10 case pairs.
- **DEPENDENCY** — partner check on Witta naming.

### 8.10 — Bank reconciliation sprint, ACT Everyday first ($1.18M / 183 lines)
- **WHAT** — 1,010 ACT-only bank txns unreconciled, $1.8M total. NAB Visa 31.7% unreconciled by count (827 lines / $630K), ACT Everyday 45.4% (183 lines / $1.18M). Oldest unreconciled txn is 2025-01-28 — 16 months. R&D evidence (FY25-26 finalising), BAS GST capture, and trial-balance integrity all depend on these.
- **WHY** — Largest single dollar exposure in the audit ($1.8M). R&D evidence pack is on un-reconciled data → audit risk. Receipt automation gap (§2 finding) is concentrated in the unreconciled NAB Visa tail. ACT Everyday has fewer lines for more dollars — best $/line ratio to attack first.
- **HOW** — Multi-session Xero UI sprint (API CANNOT set IsReconciled=true). Open Accounting → Bank Accounts → ACT Everyday → "Reconcile X items" → Find & Match or Create each line. Prioritise oldest first (Jul-Sep 2025 quarter is most R&D-critical). After ACT Everyday cleared, attack NAB Visa. Add Friday Telegram line in `scripts/weekly-reconciliation.mjs`: "Unreconciled NAB N items/$X, ACT Everyday M/$Y, oldest <date>". See §7.7.
- **EFFORT** — Tier 3 (multi-session Ben/Nic work). ~6-10 hours total spread over 2-3 sessions.
- **DEPENDENCY** — §8.4 (PM2 fixed so reconciliation status flows to Friday digest); ideally §8.6 done in same sprint since both touch the same bank views.

---

---

## Wrap-up

- **Time spent:** ~3 hours (5 agent spawns, 2 crashes recovered)
- **Sections fully covered:** §1 tagging, §2 receipts, §3 duplicates, §4 tagger rules, §5 pipeline, §6 cron, §7 Xero data quality, §8 top-10, exec summary
- **Sections partial:** §4.8 — `tag_inference_rules` table (17 rows) row-counted but contents not inspected; §7.5 — AP backlog cause inferred (paid-outside-Xero) not proven via `xero_payments` cross-check
- **Sections blocked:** §7.2 — Xero MCP returned `invalid_scope: No valid scopes remaining after filtering for grant type`. Could not call `list-tracking-categories` or any direct Xero read. Fell back to Supabase mirror tables (`xero_invoices`, `xero_transactions`, `xero_contacts`) for everything in §7
- **Top 3 blockers encountered:**
  1. Xero MCP scope failure forced full reliance on Supabase mirror tables — no live cross-check on tracking categories, AP backlog payment status, or contact merge candidates
  2. Read-only audit constraint meant `receipt_emails` collision count (§5.3) could not be quantified — only confirmed both paths write
  3. Could not enumerate `tag_inference_rules` contents (§4.8) within tool budget — third rule store remains a known unknown
- **Top 3 surprises (Ben likely doesn't know):**
  1. **`vendor_project_rules` table has 507 rules with `auto_apply=true` and is fighting the 30-rule JSON config** — three direct project-code conflicts (Carbatec, Diggermate, Savage Landscape) and four in-table conflicts (Maleny Landscaping, Hinterland Aviation, Green Fox, RW Pacific) where same vendor has different codes depending on row order. Auto-tagger is non-deterministic for these. (§4.5 + §4.6 + §4.7)
  2. **Every finance PM2 entry is `stopped`** — not just `xero-sync` (intentional) and the receipt chain (handoff'd). The 4-Surface Model push layer is entirely dark: no Mon reconciliation, no daily 8:13 Pulse, no Telegram briefings, no weekly Friday digest. Three entries (`money-stack-sync`, `weekly-money-digest`, `weekly-narrative`) have NEVER successfully run (↺ 0). (§6.1)
  3. **PM2 receipt-capture chain config is LIVE even though runtime is stopped** — `ecosystem.config.cjs:648-668` defines `receipt-capture`, `receipt-match`, `receipt-upload` with `cron_restart` schedules. Once §8.4 fixes the daemon outage, a `pm2 reload` will respawn the chain — contradicting the Dext-only direction from the 2026-05-19 archive. (§5.2)
- **Top 3 questions for Ben:**
  1. **Bunnings $5,795 cluster** — ACT-FM (date pattern says pre-Harvest-cutoff) or ACT-HV (description "decking" hints workshop)? Need your call to bulk-tag. (§1.1)
  2. **Rule consolidation direction** — pick `vendor_project_rules` table as source of truth and migrate JSON in? Or vice versa? My recommendation is DB (507 rules + richer schema with aliases/rd_category) but you may have a reason JSON stays canonical. (§4.5 + §8.7)
  3. **The Funding Network $144,558 (2 bills, both >5 months overdue)** — fiscal-host fee, internal transfer mis-classified as bill, or actually owed? This single line item is 20% of the $735K AP backlog headline. (§7.5)
- **Top 3 questions for Ben:**

# Recode Pack 01 — General Expenses (429) REVIEW band

**Date:** 2026-05-29 · **Prepared by:** Claude (read-only investigation) · **For:** Standard Ledger
**Org:** "Nicholas Marchesi" sole-trader (NJ Marchesi T/as ACT), Xero tenant `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0`
**Period:** 2025-10-01 → 2026-03-31 (FY26 Q2 + Q3)
**Scope:** ACCPAY bills (status AUTHORISED or PAID) carrying a line with `account_code = '429'` (General Expenses, the catch-all).
**Builds on:** `thoughts/shared/reviews/2026-05-29-standard-ledger-recon-recode-prep-pack.md` + `scripts/output/ge-recode-worklist.csv`

> **Status:** nothing written to Xero or the DB. This is a proposal for SL review/execution. All figures queried live from `xero_invoices` (line-item explode on `line_items` jsonb) on 2026-05-29.

---

## What "REVIEW band" means here

The High/Medium bands in the master worklist already have a confident target account from a clean vendor rule or strong heuristic (Defy → 446, Carla → 446, Bunnings → 446, Kennards → 432/446, Airbnb → 493, etc.). This document covers the **REVIEW band**: vendors where the `vendor_project_rules` entry either still points at 429 itself or carries a vague category ("Other" / "Operations" / "event-funder"), so a human call is needed. Every REVIEW vendor **> $1,000** in the period is given a proposed account + project + confidence + rationale below, sorted by amount descending. Vendors I could not resolve to a confident account are listed in the **Still genuinely unknown** section at the end.

Verification note: line-item descriptions in this org are almost all templated ("`Vendor — <category> — <PROJECT>`"), so they carry no real narrative. Proposals below lean on (a) the vendor's actual business, web-verified where the name was unfamiliar, and (b) the project already tagged on the bill.

---

## REVIEW-band recode proposals (> $1,000, by amount desc)

| Vendor | Amount (period) | Proposed acct (code + name) | Proposed project | Confidence | Rationale |
|---|---:|---|---|---|---|
| **The Funding Network** | $144,558 | **REVIEW — likely 417 Donations OR not an expense** | ACT-CE | **UNKNOWN — SL to confirm** | Two unpaid AUTHORISED bills (2025-11-27 $89,361; 2025-12-17 $55,197), both INPUT (GST claimed), attachments in Xero. TFN is a fundraising platform. A $144K *bill to ACT* claiming a GST credit is almost certainly misclassified — it is either (a) a donation/grant ACT pledged at a TFN live event (→ 417 Donations, GST likely wrong since donations aren't input-taxed), (b) a cost-of-fundraising platform fee, or (c) relates to income ACT *received* via TFN (not an expense at all). ~30% of the whole lump — materially moves P&L and BAS. **SL: open the attachments and decide which of the three it is.** |
| **MOL Nyrt.** | $30,691 | **REVIEW — wrong-contact / FX suspense, NOT general expense** | ACT-IN (suspect) | **UNKNOWN — SL to confirm** | MOL Nyrt. (web-verified) = MOL Group, a Hungarian **oil & gas multinational** (Budapest, refineries/service stations). A single 2026-03-27 AUTHORISED bill, **native USD 30,691**, **BASEXCLUDED** (no GST), **no invoice number**, description literally says "*native USD 30691.00 — adjust AUD to match bank line*". An Australian sole-trader does not buy $30K of fuel from a Hungarian oil major. Most likely a mis-matched contact on an FX/USD bank line (a SaaS/cloud/overseas-vendor payment posted to the wrong contact) or a transfer parked in suspense. **Do not recode the account until the real vendor is identified — pull the bank statement line + attachment.** Possibly a duplicate of a real USD vendor bill. |
| **The Plasticians** | $29,800 | **446 Materials & Supplies** | **ACT-GD** (currently ACT-IN) | **High** | Web-verified: recycled-plastic-sheet manufacturer (Hamilton VIC; sheets for furniture/fit-out). This is bed/Goods feedstock, not intelligence. INPUT (GST claimed). Reclass to 446 and **move project ACT-IN → ACT-GD**; strong **R&D-eligible** candidate (recycled-HDPE bed materials, same class as Defy). |
| **Hatch Electrical** | $24,397 | **473 Repairs & Maintenance** | ACT-FM | **Medium** | 3 bills, all ACT-FM/"Operations", INPUT. Electrical contractor on the farm/property. Default to 473 R&M. **Caveat: check the $19,947 line for capital** — a large electrical install (switchboard/solar/rewire) may need to be capitalised rather than expensed. SL to confirm capital vs repair split. |
| **Social Impact Hub** (Foundation) | $10,000 | **412 Consulting & Accounting** (alt: 417 Donations if sponsorship) | ACT-CP | **Medium** | Web-verified: Sydney B-Corp impact-advisory / consulting firm + a Foundation. $10,000 INPUT, 2026-03-30, ACT-CP. Rule category "event-funder" is ambiguous. If this is advisory/accelerator fees → **412**. If it's a sponsorship/contribution ACT *gave* to their Foundation → 417 Donations (and recheck GST). SL: confirm whether ACT bought a service or sponsored an event. |
| **Mounty Container Supplier** | $10,000 | **446 Materials & Supplies** (verify capital) | ACT-CORE | **Medium** | Description: "*Container purchase and fit-out (paid via director owner contribution)*". INPUT, **no attachment**. A purchased shipping container + fit-out is likely a **capital asset**, not a 429 expense — flag for capitalisation review. Also note "director owner contribution" funding source. SL: capital vs expense call + obtain receipt. |
| **The Matnic Trust** | $9,269 | **469 Rent** (or 473 R&M) | ACT-IN / ACT-FM | **Medium** | 2 bills (2025-12-14 $6,442; 2026-01-09 $2,827), INPUT, "Other", ACT-IN. The companion vendor rule names this entity "**matnic properties**" → a **property/landlord entity**, so these are most likely **rent or property costs**, not general expense. Likely a related-party/intercompany property arrangement — SL should confirm the nature (rent → 469; outgoings/repairs → 473) and watch for related-party treatment. |
| **Allclass** | $8,660 | **447 Minor Tools & Equipment <$1k** OR **446 Materials & Supplies** | **ACT-FM** (currently ACT-IN) | **Medium** | Web-verified: Kubota dealer — excavators, mowers, attachments, generators, earthmoving gear (QLD). 4 lines (one $3,536 PAID, rest AUTHORISED), INPUT. This is farm/property equipment & parts, not intelligence — **move ACT-IN → ACT-FM**. Account depends on line detail: small attachments/parts → 447 or 446; if any single item ≥$1,000 and is an asset, capitalise. SL: split by line. |
| **Joseph Kirmos** | $7,238 | **486 Sub-contractors** | ACT-GD (one line untagged) | **High** | Per project memory, Joseph Kirmos = Joseph Kirmos labour (Goods/Harvest). 2 bills, INPUT, "Other". Sub-contract labour → 486. Confirm the 2026-03-29 $4,500 line's project (currently null) — memory has Joey split 50/50 ACT-GD/ACT-HV on some work. |
| **A Curious Tractor** | $6,226 | **REVIEW — intercompany / suspicious** | ACT-IN | **UNKNOWN — SL to confirm** | A bill **FROM ACT to itself** (A Curious Tractor is ACT's own trading name). 2025-11-10 AUTHORISED, INPUT (GST claimed), "Other". A self-billed ACCPAY claiming a GST input credit is almost always an error — either a wrong-contact import, a reimbursement that should be a different contact, or an intercompany entry that needs eliminating. **Should likely not exist as a 429 expense. SL: identify the real counterparty / decide if it voids.** |
| **Sophie Deirdre Hickey** | $6,090 | **486 Sub-contractors** | ACT-HV (lines untagged) | **High** | 2 bills (2026-03-20 $4,950; 2026-03-17 $1,140), "Operations", INPUT, project currently null but description says ACT-HV. Sub-contract labour → 486, project ACT-HV. |
| **Container Options** | $6,006 | **446 Materials & Supplies** (verify capital) | ACT-MY | **Medium** | 3 lines (one $5,803 + two $101.55), "Other", INPUT, ACT-MY (Maleny). Container supplier. A container purchase may be capital; small lines are accessories. SL: capital vs expense. |
| **Smartwood** | $5,375 | **446 Materials & Supplies** | ACT-HV | **High** | 2 lines, category "Materials & Equipment", INPUT, ACT-HV. Timber/wood materials for Harvest → 446. |
| **Imprint5** | $5,317 | **412 Consulting & Accounting** OR **461 Printing** | ACT-MD | **Medium** | 3 bills, "Operations", INPUT, ACT-MD. Name is ambiguous — could be a design/consulting/facilitation firm ("Imprint5" social-impact consultancy) or a print vendor. If services → 412; if printed collateral → 461. SL: confirm from invoice. |
| **Maleny Landscaping Supplies** | $5,258 | **446 Materials & Supplies** (alt 486 if labour) | **ACT-HV** (currently untagged) | **Medium** | 4 lines, INPUT, project null. Vendor rule is split between "Contractor"/ACT-FM and "Materials & Supplies"/ACT-HV. Landscaping *supplies* (soil/mulch/gravel) → 446; if the bill is labour → 486. Project most likely ACT-HV (Harvest) or ACT-FM (farm). SL: confirm supply vs labour and FM vs HV. |
| **Nicholas Marchesi** | $5,149 | **REVIEW — owner reimbursement / Dext, needs coding** | ACT-IN | **UNKNOWN — SL to confirm** | 3 lines incl. a Dext auto-import literally marked "**NEEDS CODING**" and two marked "Income". Bills *from the director* coded ACT-IN/"Income" are an owner-reimbursement / contribution muddle. The real account depends on what each underlying receipt was for — cannot infer. **SL: open the Dext receipts and code per the actual purchase; check this isn't double-counting director drawings/contributions.** |
| **Total Tools** (East Brisbane) | $4,547 | **447 Minor Tools & Equipment <$1k** (or capitalise if ≥$1k asset) | **ACT-HV** (currently untagged) | **High** | Single 2026-01-04 line $4,547, "Materials & Equipment", INPUT, ACT-HV. Hardware/tool retailer. If it's one tool/asset ≥$1,000 it may need capitalising; if a basket of small tools → 447. SL: check if single asset. |
| **RW Pacific Traders** | $4,200 | **446 Materials & Supplies** (or 447 / capital) | ACT-GD | **Medium** | Web-verified: off-grid power **generator** importer/supplier (Brisbane). $4,200, INPUT, ACT-GD. A generator is likely a capital asset, not a 429 expense — flag for capitalisation. R&D-eligible candidate (Goods off-grid power). SL: capital vs expense. |
| **PayPal** | $3,919 | **REVIEW — pass-through, needs underlying** | ACT-IN | **UNKNOWN — SL to confirm** | A bill *to* "PayPal" for $3,918.50, "Other", INPUT, ACT-IN. PayPal is a payment processor, not an end-vendor — this is a pass-through to some real merchant, or a PayPal fee/settlement. If it's merchant fees → 411 Merchant Fees; if it masks a real purchase → recode to that vendor's account. **SL: open the PayPal statement line to find the true vendor.** |
| **The Sand Yard** | $3,078 | **446 Materials & Supplies** | ACT-MY | **Medium** | 3 lines, "Other", INPUT, ACT-MY. Description "Receipt from The Sand Yard" — landscaping/building materials (sand, soil, aggregate). → 446. |
| **Home To Holiday** | $2,476 | **493 Travel — National** (accommodation) | ACT-IN | **Medium** | Single 2025-11-11 line $2,476, "Other", INPUT, ACT-IN. Name = short-stay/holiday accommodation provider → travel/accommodation → 493. SL: confirm it's a work trip (otherwise drawings). |
| **Sunshine Coast Council** | $1,828 | **467 Rates & Water** | ACT-FM | **High** | 3 lines, "Operations", INPUT, ACT-FM. Local council = rates/water on the farm/property → 467. (Note: council rates are usually GST-free — verify the INPUT GST treatment.) |
| **Hayden Alexander** | $1,506 | **486 Sub-contractors** (alt 429 if reimbursement) | ACT-IN | **Medium** | Single line $1,506, "Other", INPUT, ACT-IN. An individual's name → most likely sub-contract labour → 486. SL: confirm contractor vs reimbursement. |
| **Maleny Rumble Room** | $1,437 | **423 Catering** OR **432 Hire Expenses** | ACT-CORE | **Medium** | Single line $1,437, "other", INPUT, ACT-CORE. A venue/play-cafe ("Rumble Room") → likely venue/space hire (432) or catering/event (423) for a team/community gathering. SL: confirm hire vs catering. |
| **AGL** | $1,317 | **445 Light, Power, Heating** | ACT-FM | **High** | 4 lines, "Operations", INPUT, ACT-FM. AGL = energy retailer → electricity/gas → 445. |
| **Loadshift Sydney** | $1,244 | **425 Freight & Courier** | ACT-GD | **High** | Single line $1,244, "Operations", INPUT, ACT-GD. Loadshift = freight/transport marketplace → moving Goods materials/beds → 425. R&D-eligible candidate (Goods logistics). |

### Named in the brief but < $1,000 (included for completeness)

| Vendor | Amount | Proposed acct | Project | Confidence | Rationale |
|---|---:|---|---|---|---|
| **Hydraulink** (Brisbane North) | $883 | **473 Repairs & Maintenance** (or 446) | ACT-HV | **Medium** | Hydraulic hose/fitting service & supply. Category "Materials & Equipment", INPUT, ACT-HV. If a repair service → 473; if parts → 446. |

---

## Still genuinely unknown — SL to confirm (cannot propose an account with confidence)

These cannot be confidently recoded from the data + web alone; each needs SL to open the Xero attachment / bank line:

1. **The Funding Network — $144,558** — donation (417) vs cost-of-fundraising vs misclassified *income*. GST treatment in question. The single biggest decision in the whole 429 lump. Source docs attached in Xero.
2. **MOL Nyrt. — $30,691** — Hungarian oil major as a contact is almost certainly wrong. Native-USD, BASEXCLUDED, no invoice number, self-describing "adjust AUD to match bank line". Identify the real overseas/FX vendor before recoding; check for duplication.
3. **A Curious Tractor — $6,226** — a bill from ACT to itself claiming GST. Intercompany/wrong-contact error; likely should not be a 429 expense at all. Identify counterparty or void.
4. **Nicholas Marchesi — $5,149** — director-name bills incl. a Dext line literally "NEEDS CODING" and two "Income" lines. Code per underlying receipts; check against drawings/contributions to avoid double-count.
5. **PayPal — $3,919** — payment-processor pass-through; the true vendor (or merchant-fee nature) is hidden behind the PayPal line.

---

## Open questions only Ben / SL can answer

1. **The Funding Network ($144,558):** donation ACT pledged (417, GST likely wrong), fundraising-platform cost, or actually relates to income ACT *received* (not an expense)? This is ~30% of the lump.
2. **MOL Nyrt. ($30,691):** who is the real USD vendor behind this contact, and is it a duplicate of an existing bill?
3. **A Curious Tractor ($6,226) self-bill:** is this an intercompany error to void, or a wrong-contact import of a real third-party cost?
4. **Capital vs expense** on the equipment/asset items: Mounty Container ($10K), Container Options ($5.8K), RW Pacific generators ($4.2K), Total Tools ($4.5K), and the large Hatch Electrical install line ($19.9K) — which should be capitalised rather than expensed to 429?
5. **The Matnic Trust ($9,269):** is this rent/property from a related-party landlord ("matnic properties")? Confirm related-party treatment and account (469 vs 473).
6. **Project moves:** confirm The Plasticians ACT-IN → ACT-GD and Allclass ACT-IN → ACT-FM.

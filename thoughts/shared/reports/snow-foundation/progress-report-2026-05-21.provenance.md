---
title: Provenance — Snow Foundation progress report 2026-05-21
report: progress-report-2026-05-21.md
date: 2026-05-21
audience: Ben + Sally Grimsley-Ballard (Snow Foundation)
purpose: Document every source, what's verified vs inferred, and how this report can be reproduced.
---

# Source documents
1. **Successful Grant Letter** — `/Users/benknight/Downloads/Successful Grant Letter - Goods on Country A Curious Tractor - FY26.pdf` (Snow Foundation, 19 May 2026, signed Georgina Byron AM). Confirms one-off grant of $120,000 (Grant ref 2024/OC0014), payment + reporting schedule, main contact Sally Grimsley-Ballard.
2. **Letter Agreement** — `/Users/benknight/Downloads/Letter agreement - Goods on Country A Curious Tractor - FY26.pdf` (Snow Foundation, 19 May 2026, 15 pages). Contains:
   - Payment + reporting schedule (page 1)
   - Grant Acknowledgement form (page 3)
   - Attachment 1: Snow Foundation Proposal Q1 2026 — Goods Production Scale-Up (sections 1-7, pages 4-10)
   - Snow First Nations Principles alignment (section 8, pages 11-12)
   - Do No Harm + Dynamic Consent (section 9, page 13)
   - RHD + Healthy Homes connection (section 10, page 13-14)
   - Investment Priorities (section 11, page 14)
   - Context: 2024 Funding Landscape (section 12, page 14)
   - Attachment 2: Historic funding table + April 2026 update (page 15)

# Verified vs inferred

## ✅ Verified (directly from source documents)
- Total commitment: **$395,000** (Attachment 2 sum + grant letter $120K)
- $275,000 paid · $120,000 to be paid 15/05/2026 (Attachment 2 status column)
- Grant ref **2024/OC0014** (cover letter)
- 6 milestone payments per Attachment 2 historic funding table
- Reports due: 31/07/2026 + 15/05/2027 (Attachment 2 + cover letter)
- Main contact: Sally Grimsley-Ballard / 0417 851 341 / s.grimsley-ballard@snowfoundation.org.au (cover letter)
- CEO signatory: Georgina Byron AM (both documents)
- Investment priorities order: beds → production facility → Nic/Ben time (§ 11)
- FY26 Scale-Up breakdown: $60K beds + $60K production plant (cover letter "$60,000" reference in Grant Acknowledgement + § 2 of Attachment 1)
- Snow First Nations Principles 8 areas (§ 8 sub-sections in Attachment 1)
- Risk register: 5 risk categories with mitigations (§ 6 of Attachment 1)
- Bloomfield family Tennant Creek partnership details (§ 5 + § 8 of Attachment 1)
- $3M/year washing machine dumping cycle in Alice Springs (§ 1 of Attachment 1)
- 15-20 beds deployed, 8 families, 200-350 bed requests (§ 6 + § 1 of Attachment 1)
- Healthy Homes contact Anna Phillip (§ 10 of Attachment 1)

## ✅ Verified via Supabase query (xero_invoices ACCREC)
- 4 invoices matched to milestones with PAID status (INV-0208, INV-0227, INV-0268, INV-0321 AUTHORISED)
- 3 reimbursement invoices identified outside grant envelope (INV-0220 caravan, INV-0240 washing machine sale, INV-0258 flights) totalling $23,429.79
- Total Xero ACCREC under Snow: $402,929.79 inc-GST (PAID + AUTHORISED)

## 🟡 Inferred (consistent with sources but not literal quotes)
- "FY25 Payments 1 + 2 missing as separate Xero invoices" — derived from comparing Attachment 2 (6 payments) to Xero records (4 grant invoices). Possible explanations: merged into another invoice, paid without explicit ACCREC, or recorded as direct deposit. **Action item flagged in Appendix A for ACT finance.**
- "Approximate funds allocated per priority" ($140K beds, $155K facility, $100K time) — assembled by mapping the use-of-funds descriptions in invoice line items + Attachment 1 § 2 to Snow's § 11 priorities. The exact dollar split across priorities is not specified in source documents — these are sensible apportionments not literal quotes.
- "85% complete production facility" — qualitative inference from Attachment 1 § 5 ("the facility is not a sunk cost — it's an impact asset") + § 7 timeline ("complete production facility infrastructure" listed under "Q1 2026 with NEW Snow Foundation funding"). Source documents don't quote a percentage.
- "Snow + Centrecorp + Vincent Fairfax + Rotary Outback alignment closed" — fact verified from `project_funding_allocations` table (4 allocations exist for ACT-GD with status='drawing' or 'closed'). The framing of "closed for FY26" is interpretive.

## ⚠ Unverified / requires Ben + Sally validation before sending
- The 31/01/2026 "FY25 Progress report 2 — Received" line — Attachment 2 marks this as received but I have not located the report in our repo. Confirm with Sally if necessary.
- Specific community deployment counts during FY25 may differ from the document. Field numbers in this report come from Attachment 1 § 1 + § 6 dated 19 May 2026.
- The phrase "Snow Foundation directors recently met and agreed" (cover letter) does not specify the meeting date. Report uses "May 2026" as the implied period.

# Reproducibility

To regenerate this report from scratch:
1. Re-read the 2 PDF source documents
2. Query Supabase: `SELECT * FROM v_project_funding_position WHERE funder_org_name = 'The Snow Foundation'`
3. Query Xero invoices: `SELECT invoice_number, date, total, status, line_items->0->>'description' FROM xero_invoices WHERE contact_name ILIKE '%snow%' ORDER BY date`
4. Cross-reference Attachment 2 milestone table against invoice list
5. Apply the report template (sections 1-10 + appendices A-B)

# Data dependencies
- `project_funding_allocations` row id `6c507b7f-e62e-476c-97f3-0a85e3ed1d94` (created 2026-05-21, updated 2026-05-21 with verified figures)
- `project_funding_drawdowns` 6 milestone records linked to above
- `xero_invoices` ACCREC contact_name='The Snow Foundation' (7 invoices total)
- `canonical_entities` — Sally Grimsley-Ballard, Georgina Byron (linked to ACT-JH, possibly ACT-GD post-migration)

# Confidence assessment

**Use this report for:**
- Internal ACT reference and decision-making (high confidence)
- Draft for Snow Foundation acquittal report due 31/07/2026 (high confidence, with Ben + Sally review)
- Public-facing summaries (review for confidentiality marking from agreement page 4 "Confidential")

**Do NOT use this report for:**
- Legal commitments without checking the signed agreement directly
- Tax/audit purposes without finance reconciliation of the 2 missing invoices
- External announcements without Snow Foundation co-approval per § 2(c) of the agreement

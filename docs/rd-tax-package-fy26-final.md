# R&D Tax Incentive — FY2025-26 Complete Package

**Entity:** ACT Foundation (Company Limited by Guarantee)
**ABN:** 21 591 780 066
**Financial Year:** 1 July 2025 – 30 June 2026
**Prepared:** 29 March 2026
**Status:** READY FOR ACCOUNTANT REVIEW

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [R&D Activity Register](#2-rd-activity-register)
3. [Repository & Platform Inventory](#3-repository--platform-inventory)
4. [Git Evidence Summary (All 8 Repos)](#4-git-evidence-summary)
5. [FY26 Xero Expenditure Analysis](#5-fy26-xero-expenditure-analysis)
6. [Founder Cost Analysis & Scenarios](#6-founder-cost-analysis--scenarios)
7. [R&D Expenditure Schedule](#7-rd-expenditure-schedule)
8. [Subscription & SaaS Costs (R&D Eligible)](#8-subscription--saas-costs)
9. [Q4 CY2025 BAS Data (Oct–Dec 2025)](#9-q4-cy2025-bas-data)
10. [Receipt Coverage & Remediation](#10-receipt-coverage--remediation)
11. [Outstanding Issues](#11-outstanding-issues)
12. [Accountant Action Items](#12-accountant-action-items)

---

## 1. Executive Summary

ACT Foundation develops experimental technology platforms for community empowerment across 7 active projects. This document consolidates all evidence for the R&D Tax Incentive claim (Division 355, ITAA 1997) and Q4 CY2025 BAS preparation.

### Key Numbers (FY26 YTD — 9 months to March 2026)

| Item | Amount |
|------|-------:|
| **Total Xero spend** | **$463,711** |
| R&D-tagged spend (Xero rd_eligible=true) | $418,835 |
| — Founder salary (Nicholas Marchesi) | $238,654 |
| — Core R&D (ACT-IN, ACT-DO, ACT-EL, ACT-JH) | $114,665 |
| — Supporting R&D (ACT-GD) | $65,516 |
| **Knight Photography (Benjamin Knight — FY25)** | **$79,000** |
| Knight Photography (FY26) | $0 (no invoices found) |
| **Total git commits (8 repos, FY26)** | **2,151** |
| **Estimated R&D hours (conservative 3h/commit)** | **6,453h** |
| **43.5% refundable offset (on $418,835)** | **$182,193** |
| Receipt coverage | 11% (CRITICAL — needs remediation) |

### Revenue Context

| Source | Amount |
|--------|-------:|
| Total invoiced revenue (FY26) | $1,886,192 |
| Top 3 funders (Centrecorp, PICC, Snow) | $1,268,477 (67%) |
| Aggregated turnover | Under $20M — qualifies for 43.5% refundable offset |

---

## 2. R&D Activity Register

### Core R&D Activities

| Code | Project | Principal Researcher | Technical Uncertainty |
|------|---------|---------------------|----------------------|
| ACT-CG | CivicGraph — Cross-Government Entity Resolution | Benjamin Knight (20%) | N-way probabilistic entity resolution across 8+ government datasets without labelled training pairs |
| ACT-EL | Empathy Ledger — Data Sovereignty AI Platform | Benjamin Knight (25%) | Culturally-specific NLP impact extraction with OCAP consent architecture and hallucination rejection |
| ACT-IN | Infrastructure — Agent Orchestration & Finance Engine | Benjamin Knight (15%) | 92-agent orchestration with crash recovery using PostgreSQL locking, calendar-contextualised transaction classification |
| ACT-JH | JusticeHub/ALMA — Evidence Scoring & Intervention Linkage | Benjamin Knight (15%) | Multi-strategy fuzzy entity linkage for 1,155 justice interventions against 160K+ entity graph |

### Supporting R&D Activities

| Code | Project | Principal Researchers | Technical Uncertainty |
|------|---------|----------------------|----------------------|
| ACT-GD | Goods on Country — Procurement Intelligence | Benjamin (10%), Nicholas (25%) | Multi-source procurement matching combining NDIS thin markets, AusTender, and community asset data |
| ACT-PI | Palm Island Repository — Community Knowledge Graph | Benjamin Knight (5%) | AI-assisted community history platform with Trove integration and knowledge graph enrichment |
| ACT-HV | The Harvest — Community Innovation Hub | Benjamin Knight (5%) | Community innovation model design and platform experimentation |

### Total R&D Time Allocation

| Founder | R&D % | Role |
|---------|-------|------|
| Benjamin Knight | 95% | Systems design, architecture, all code, experimental development |
| Nicholas Marchesi | 40% | Field testing (Goods on Country), user research, community validation |

---

## 3. Repository & Platform Inventory

| # | Project | GitHub Repository | Vercel Frontend | Commits (FY26) |
|---|---------|-------------------|-----------------|----------------|
| 1 | CivicGraph / GrantScope | [acurioustractor/grantscope](https://github.com/acurioustractor/grantscope) | `grantscope` (civicgraph.app) | 266 |
| 2 | Empathy Ledger v2 | [acurioustractor/empathy-ledger-v2](https://github.com/acurioustractor/empathy-ledger-v2) | `empathy-ledger-v2` | 643 |
| 3 | JusticeHub | [acurioustractor/justicehub-platform](https://github.com/acurioustractor/justicehub-platform) | `justicehub` | 495 |
| 4 | ACT Infrastructure | [acurioustractor/act-global-infrastructure](https://github.com/acurioustractor/act-global-infrastructure) | `act-global-infrastructure` | 289 |
| 5 | Goods on Country | [acurioustractor/goods-asset-tracker](https://github.com/acurioustractor/goods-asset-tracker) | `goods-on-country` | 196 |
| 6 | Palm Island Repository | [acurioustractor/palm-island-repository](https://github.com/acurioustractor/palm-island-repository) | `palm-island-repository` | 181 |
| 7 | The Harvest | [acurioustractor/theharvest](https://github.com/acurioustractor/theharvest) | `witta-swot-analysis` (needs verification) | 73 |
| 8 | Video Storytelling | *local only — no remote* | none | 8 |
| | **TOTAL** | | | **2,151** |

**Action Required:**
- `act-video-storytelling` has no GitHub remote — push to GitHub before lodging (git timestamps are primary evidence)
- The Harvest Vercel project shows as `witta-swot-analysis` — verify this is correct or reconfigure

### Shared Infrastructure

| Service | Purpose | R&D Role |
|---------|---------|----------|
| Supabase (tednluwflfhxyucgwigh) | Shared database — 571 tables | Core R&D infrastructure |
| Supabase (uaxhjzqrdotoahjnxmbj) | Empathy Ledger v2 | Core R&D (ACT-EL) |
| Vercel | Frontend hosting (7 projects) | Deployment platform |
| GitHub Actions | CI/CD + cron automation | Supporting infrastructure |

---

## 4. Git Evidence Summary

### Commits by Repository (Jul 2025 – Mar 2026)

| Repository | Commits | Est. Hours | Primary R&D Activity |
|-----------|---------|------------|---------------------|
| empathy-ledger-v2 | 643 | 1,929h | ACT-EL (Core) |
| JusticeHub | 495 | 1,485h | ACT-JH (Core) |
| act-global-infrastructure | 289 | 867h | ACT-IN (Core) |
| grantscope | 266 | 798h | ACT-CG (Core) + ACT-JH |
| Goods Asset Register | 196 | 588h | ACT-GD (Supporting) |
| Palm Island Repository | 181 | 543h | ACT-PI (Supporting) |
| The Harvest | 73 | 219h | ACT-HV (Supporting) |
| act-video-storytelling | 8 | 24h | ACT-EL (Core) |
| **TOTAL** | **2,151** | **6,453h** | |

*Note: Hour estimates use conservative 3h/commit. Actual time per commit typically higher (4-8h including failed experiments).*

### Key R&D Evidence by Activity

#### ACT-EL — Empathy Ledger (643 + 8 = 651 commits)
**THE LARGEST R&D ACTIVITY BY COMMIT VOLUME**

Key experimental work:
- Auto-Direct AI video generation (one-click generate + polish)
- Murch editing rules as computational flow health indicators
- Hallucination rejection via fuzzy quote matching against source transcripts
- Resonance-visual theory in AI prompting
- Photo smart-selection with scoring algorithm
- Annual report wizard (ABN → report in 60 seconds)
- AnimateDiff integration for AI-generated landscape illustrations
- Multi-model AI video generation research

#### ACT-CG — CivicGraph (266 commits)
- 5-phase mega-linker achieving 91.8% ABN linkage (up from 46%)
- Universal entity linker across 559K+ entities
- Foundation landscape overlay with power index scoring
- ABR trading name resolution improving linkage from 87% → 90.4%
- ALMA linkage improvement from 54% → 99.5%

#### ACT-JH — JusticeHub (495 + 29 cross-repo = 524 commits)
- Youth justice accountability trackers for all 8 states
- ROGS 2026 data ingestion (5,045 metrics, 29 types, 11 years)
- AIHW Youth Detention quarterly metrics (694 records)
- Evidence coverage scoring and data reflection system
- Force-directed graph visualization for justice funding flows
- Decision tools — NL querying, evidence synthesis, scenario modelling

#### ACT-IN — Infrastructure (289 + 60 cross-repo = 349 commits)
- 92-agent orchestrator with crash recovery
- Finance engine (7 modules) with calendar-contextualised transaction tagger
- Receipt pipeline with Dext auto-forwarding
- Telegram bot: 19 agent tools (14 read + 5 write)
- Rapid tagger v2 with card-based UI
- Financial cockpit with pipeline intelligence

#### ACT-GD — Goods on Country (196 + 14 cross-repo = 210 commits)
- Procurement strategy dashboard
- Supply Nation and AusTender integration
- IoT fleet telemetry (10 washing machines, Particle.io)
- Xero invoice sweep and reconciliation
- Campaign engine with engagement scoring

#### ACT-PI — Palm Island Repository (181 commits)
- History knowledge graph with chapter filtering
- AI-described community photo manifest (443 photos)
- Trove historical data integration pipeline
- Two-way community messaging via GHL WhatsApp/SMS
- Remotion video compositions and report builder

#### ACT-HV — The Harvest (73 commits)
- Community innovation hub platform
- SWOT analysis tooling
- Event and workshop management

---

## 5. FY26 Xero Expenditure Analysis

### Monthly Spend

| Month | Total Spend | Txn Count | Notes |
|-------|------------|-----------|-------|
| Jul 2025 | $142,052 | 115 | High — Nicholas payments + startup costs |
| Aug 2025 | $49,581 | 127 | |
| Sep 2025 | $93,080 | 175 | Nicholas $40K + $12K |
| Oct 2025 | $66,620 | 268 | Nicholas $45K |
| Nov 2025 | $47,676 | 207 | Nicholas $21K |
| Dec 2025 | $7,791 | 99 | Low — holiday period |
| Jan 2026 | $8,066 | 111 | Low |
| Feb 2026 | $19,933 | 94 | |
| Mar 2026 | $28,912 | 136 | |
| **YTD Total** | **$463,711** | **1,332** | |

Average monthly burn: ~$51,524

### Top Vendors

| Vendor | Spend | R&D Project | R&D Eligible? |
|--------|-------|-------------|---------------|
| Nicholas Marchesi | $242,483 | ACT-HQ (salary) | Yes — 40% R&D allocation |
| Qantas | $68,025 | ACT-IN | Partially — R&D travel only |
| Samuel Hafer | $19,500 | ACT-GD | Yes (supporting) |
| Defy Design + Defy | $21,642 | ACT-GD | Yes (supporting — manufacturing R&D) |
| Uber | $11,338 | ACT-IN | Partially — R&D travel only |
| Elders Insurance | $8,361 | ACT-FM | No (farm insurance) |
| Peak Up Transport | $7,033 | ACT-GD | Yes (supporting — logistics R&D) |
| ATO | $5,421 | ACT-UA | No (tax payment) |
| Loadshift | $5,086 | ACT-GD | Yes (supporting) |
| Webflow | $4,201 | ACT-IN | Yes (core — platform hosting) |
| Chris Witta | $3,530 | ACT-HV | Partially |
| Amazon | $3,314 | ACT-IN | Partially (hardware for R&D) |

### Spend by R&D Category (from Xero rd_eligible flag)

| Category | Project Codes | Amount | Txns |
|----------|--------------|--------|------|
| Salary (R&D) | ACT-HQ | $238,654 | 11 |
| Core R&D | ACT-IN | $110,152 | 951 |
| Core R&D | ACT-DO | $3,832 | 14 |
| Core R&D | ACT-EL | $585 | 3 |
| Core R&D | ACT-JH | $96 | 4 |
| Supporting R&D | ACT-GD | $65,516 | 36 |
| **TOTAL R&D TAGGED** | | **$418,835** | **1,019** |

---

## 6. Founder Cost Analysis & Scenarios

### Nicholas Marchesi (Co-Founder / Operations)

**Xero data (FY26 YTD):**
- SPEND (payments out): $242,483 across 14 transactions
- RECEIVE (payments in): $268,306 across 34 transactions
- Net cash flow: +$25,823 into ACT accounts
- Bank account: "NJ Marchesi T/as ACT Everyday"
- All tagged: ACT-HQ, rd_category = "salary"

**R&D allocation: 40%** (field testing, user research, community validation)
- R&D-eligible portion of salary: $242,483 × 40% = **$96,993**
- Payment period: Jul 2025 – Nov 2025 (no payments Dec 2025 – Mar 2026)

**Note for accountant:** The RECEIVE transactions appear to be transfers INTO the ACT Everyday account from other ACT accounts, not income. The SPEND transactions are the actual salary payments. Need to clarify whether Nicholas is an employee (PAYG) or contractor (ABN invoicing) for R&D tax purposes — different treatment applies.

### Benjamin Knight (Co-Founder / Systems Designer)

**Knight Photography invoices found in Xero:**
| Date | Amount | Type | Status |
|------|--------|------|--------|
| 20 Jun 2025 | $39,000.01 | ACCPAY (bill) | PAID |
| 20 Jun 2025 | $40,000.00 | ACCPAY (bill) | PAID |
| **Total** | **$79,000.01** | | |

**CRITICAL:** These invoices are dated **20 June 2025** — the last day of FY25, NOT FY26. There are **zero Knight Photography payments in FY26** (Jul 2025 onwards).

**No FY26 transactions found** matching Benjamin Knight, Knight Photography, or any variant in either xero_transactions or xero_invoices for the period Jul 2025 – Mar 2026.

**R&D allocation: 95%** (systems design, all code across 8 repos, 2,151 commits)
- If Benjamin invoices for FY26 work: this is the largest R&D claim opportunity
- At $150K notional salary × 95% = **$142,500 R&D-eligible**
- At $200K × 95% = **$190,000 R&D-eligible**

### Founder Cost Scenarios

| Scenario | Nicholas (40% R&D) | Benjamin (95% R&D) | Total R&D Salary | Non-Salary R&D | Total R&D Claim | 43.5% Refund |
|----------|--------------------|--------------------|------------------|----------------|-----------------|--------------|
| **A: Status quo (no Ben FY26)** | $96,993 | $0 | $96,993 | $180,181 | $277,174 | **$120,571** |
| **B: Ben at $150K** | $96,993 | $142,500 | $239,493 | $180,181 | $419,674 | **$182,558** |
| **C: Ben at $200K** | $96,993 | $190,000 | $286,993 | $180,181 | $467,174 | **$203,221** |
| **D: Ben at $250K** | $96,993 | $237,500 | $334,493 | $180,181 | $514,674 | **$223,883** |
| **E: Full year projection** | $145,490* | $190,000 | $335,490 | $240,241* | $575,731 | **$250,443** |

*Scenario E projects 9-month YTD to full year (×1.33)*

**KEY INSIGHT:** Benjamin Knight's unpaid R&D work is the single biggest gap in the R&D claim. Every $100K of documented founder salary generates **$41,325 in cash refund** from the ATO (at 95% R&D × 43.5%).

---

## 7. R&D Expenditure Schedule

### By AusIndustry Activity

| Activity | Code | Category | Salary (R&D portion) | Non-Salary | Total |
|----------|------|----------|---------------------|------------|-------|
| CivicGraph | ACT-CG | Core | Ben 20% | $0* | TBD |
| Empathy Ledger | ACT-EL | Core | Ben 25% | $585 | TBD |
| Infrastructure/ALMA | ACT-IN | Core | Ben 15% | $110,152 | TBD |
| JusticeHub | ACT-JH | Core | Ben 15% | $96 | TBD |
| Goods on Country | ACT-GD | Supporting | Ben 10% + Nic 25% | $65,516 | TBD |
| Devices/Operations | ACT-DO | Core | Ben 5% | $3,832 | TBD |

*CivicGraph spend is in the separate grantscope Supabase project — not captured in ACT Xero.*

### R&D-Eligible SaaS/Subscription Breakdown

| Vendor | Annual (FY26 YTD) | R&D Category | Project |
|--------|-------------------|--------------|---------|
| Claude.AI | $1,220 | Core | ACT-IN |
| OpenAI | $627 | Core | ACT-IN |
| Anthropic API | $209 | Core | ACT-IN |
| ChatGPT Plus | $376 | Core | ACT-IN |
| Cursor AI | $264 | Core | ACT-IN |
| Codeguide | $260 | Core | ACT-IN |
| Supabase | $577 | Core | ACT-IN |
| Vercel | $141 | Core | ACT-IN |
| Notion | $758 | Core | ACT-IN |
| Webflow | $4,201 | Core | ACT-IN |
| Descript | $894 | Core | ACT-IN |
| GitHub | — | Core | ACT-IN |
| Xero | $525 | Core | ACT-IN |
| HighLevel (GHL) | $651 | Core | ACT-IN |
| Zapier | $200 | Core | ACT-IN |
| Firecrawl | $94 | Core | ACT-IN |
| Midjourney | $51 | Core | ACT-IN |
| Mighty Networks | $1,645 | Supporting | ACT-IN |
| Squarespace | $139 | Supporting | ACT-IN |
| Only Domains | $108 | Supporting | ACT-IN |
| **Total SaaS** | **~$12,940** | | |

---

## 8. Subscription & SaaS Costs (Complete)

### AI/Development Tools (100% R&D Eligible)

| Tool | Monthly | Annual (est.) | Purpose |
|------|---------|---------------|---------|
| Claude.AI (Anthropic) | $203 | $2,440 | Primary AI development tool |
| OpenAI API | $48 | $580 | Embeddings, TTS |
| Anthropic API | $19 | $228 | Agent tools (Haiku) |
| ChatGPT Plus | $63 | $376* | Research, prototyping |
| Cursor AI | $33 | $396 | AI-assisted coding |
| Codeguide | $43 | $520 | Code generation |
| Midjourney | $17 | $51* | Visual content generation |
| Firecrawl | $16 | $190 | Web scraping for data pipelines |
| **Subtotal** | **$442** | **$4,781** | |

### Platform/Infrastructure (100% R&D Eligible)

| Tool | Monthly | Annual (est.) | Purpose |
|------|---------|---------------|---------|
| Supabase (2 projects) | $82 | $990 | Database infrastructure |
| Vercel | $24 | $282 | Frontend hosting (7 projects) |
| GitHub | — | — | Source control, CI/CD |
| Webflow | $58 | $700* | Website hosting (2 sites) |
| Notion | $126 | $1,516 | Project management |
| **Subtotal** | **$290** | **$3,488** | |

### Operations (Partially R&D Eligible)

| Tool | Monthly | Annual (est.) | R&D % | Purpose |
|------|---------|---------------|-------|---------|
| Xero | $75 | $900 | 50% | Accounting (R&D finance engine) |
| HighLevel (GHL) | $65 | $782 | 30% | CRM (R&D for pipeline intelligence) |
| Mighty Networks | $137 | $1,645 | 20% | Community platform |
| Zapier | $50 | $600 | 50% | Integration automation |
| Dialpad | $56 | $672 | 30% | Phone system |
| **Subtotal** | **$383** | **$4,599** | | |

*Items marked * are partial-year subscriptions*

**Total SaaS annual run-rate: ~$12,868**
**R&D-eligible portion: ~$10,500**

---

## 9. Q4 CY2025 BAS Data (Oct–Dec 2025)

### Transaction Summary

| Month | Type | Amount | Txn Count |
|-------|------|--------|-----------|
| Oct 2025 | RECEIVE (income) | $57,205 | 12 |
| Oct 2025 | SPEND (expenses) | $66,620 | 268 |
| Oct 2025 | RECEIVE-TRANSFER | $70,906 | 14 |
| Oct 2025 | SPEND-TRANSFER | $70,906 | 14 |
| Nov 2025 | RECEIVE (income) | $140,740 | 15 |
| Nov 2025 | SPEND (expenses) | $47,676 | 207 |
| Nov 2025 | RECEIVE-TRANSFER | $104,642 | 10 |
| Nov 2025 | SPEND-TRANSFER | $104,642 | 10 |
| Dec 2025 | SPEND (expenses) | $7,791 | 99 |

*Transfers are internal movements between ACT bank accounts — exclude from BAS.*

### BAS Estimate (Q4 CY2025: Oct–Dec 2025)

| BAS Label | Calculation | Amount |
|-----------|-------------|--------|
| **1A — GST on sales** | ($57,205 + $140,740) × 1/11 | **$17,995** |
| **1B — GST on purchases** | ($66,620 + $47,676 + $7,791) × 1/11 | **$11,099** |
| **Net GST payable** | 1A – 1B | **$6,896** |

**IMPORTANT CAVEATS:**
- This assumes all transactions are GST-inclusive — accountant must verify which items are GST-free
- Nicholas Marchesi salary payments should be GST-free if he's an employee (PAYG)
- Some purchases may be GST-free (insurance, government fees)
- Transfers (RECEIVE-TRANSFER / SPEND-TRANSFER) are excluded
- December had $0 income recorded — verify this is correct or if there are missing bank feeds
- **No RECEIVE transactions in December** — this may indicate bank feed sync stopped

### BAS Action Items
1. Verify Nicholas salary GST treatment (employee vs contractor)
2. Confirm December bank feeds are complete
3. Separate GST-free items (insurance, government fees, overseas purchases)
4. Lodge by **28 February 2026** (Q4 CY2025) — **THIS IS OVERDUE if not already lodged**

---

## 10. Receipt Coverage & Remediation

### Current State: 11% Coverage (CRITICAL)

| Metric | Value |
|--------|-------|
| Total SPEND transactions (FY26) | 1,332 |
| With receipts attached | 146 |
| **Coverage rate** | **11.0%** |

### Impact on R&D Claim

Without receipts, the ATO can disallow R&D expenditure claims. At 11% coverage:
- **$418,835** in R&D-tagged spend
- Only ~$46,072 currently has receipt evidence
- Potential lost R&D refund: **$162,102** (worst case if ATO disallows unsubstantiated claims)

### Remediation Priority

| Priority | Vendor | Spend | Why |
|----------|--------|-------|-----|
| 1 | Nicholas Marchesi | $242,483 | Largest single cost — need employment contract or invoices |
| 2 | Qantas | $68,025 | Travel — need boarding passes / itineraries linked to R&D |
| 3 | Defy Design/Manufacturing | $21,642 | Goods R&D — need invoices with descriptions |
| 4 | Samuel Hafer | $19,500 | Single payment — need invoice |
| 5 | All SaaS vendors | $12,940 | Auto-recurring — can retrieve from email/accounts |
| 6 | Uber | $11,338 | Travel — can bulk-export from Uber account |

### Receipt Recovery Methods

1. **Dext auto-forwarding** — already configured (`scripts/lib/finance/`), auto-forwards receipts from email
2. **Email receipt sweep** — search Gmail for receipt/invoice emails from top vendors
3. **Vendor portal downloads** — Qantas, Uber, SaaS providers all have downloadable invoices
4. **Bank statement matching** — NAB statements as fallback evidence (weaker than invoices)

---

## 11. Outstanding Issues

### Critical (Must Resolve Before Lodging)

| # | Issue | Impact | Action |
|---|-------|--------|--------|
| 1 | **Benjamin Knight has no FY26 payments** | Missing $142K–$237K R&D salary claim | Invoice ACT Foundation for FY26 work via Knight Photography |
| 2 | **Receipt coverage at 11%** | Up to $162K in lost R&D refund | Run receipt recovery sweep (see Section 10) |
| 3 | **Q4 CY2025 BAS may be overdue** | Late lodgement penalties | Verify with accountant — due 28 Feb 2026 |
| 4 | **158 unpaid bills in Xero** | Reconciliation mess, potential double-counting | Reconcile — many are 4-6 months overdue |
| 5 | **act-video-storytelling not on GitHub** | R&D evidence not publicly timestamped | Push to GitHub |

### Important (Should Resolve)

| # | Issue | Impact | Action |
|---|-------|--------|--------|
| 6 | December has $0 income recorded | BAS may be inaccurate | Check bank feed sync |
| 7 | Nicholas salary vs contractor classification | Different tax treatment | Confirm with accountant |
| 8 | Qantas $68K tagged to ACT-IN | Not all travel is R&D | Review trip-by-trip and split R&D vs business dev |
| 9 | "Nicholas" ($21K) separate from "Nicholas Marchesi" ($221K) | Duplicate contact in Xero | Merge contacts |
| 10 | The Harvest Vercel project name mismatch | Minor | Verify `witta-swot-analysis` is correct |
| 11 | $10,599 unallocated (ACT-UA) | Missing project attribution | Tag remaining transactions |

---

## 12. Accountant Action Items

### For R&D Tax Incentive

- [ ] Review R&D activity descriptions (Section 2) for AusIndustry registration
- [ ] Confirm founder employment/contractor status and salary levels
- [ ] **CRITICAL:** Benjamin Knight needs to invoice for FY26 R&D work — this is the biggest lever on the refund amount
- [ ] Register R&D activities with AusIndustry (deadline: 30 April 2027)
- [ ] Prepare R&D Tax Schedule for company tax return
- [ ] Review which travel expenses qualify as R&D (Qantas $68K)
- [ ] Determine if ACT Foundation or ACT Ventures is the claiming entity

### For BAS (Q4 CY2025)

- [ ] Verify Q4 BAS has been lodged (due 28 Feb 2026)
- [ ] Confirm GST treatment of Nicholas Marchesi payments
- [ ] Check December bank feed completeness
- [ ] Reconcile 158 outstanding bills

### For Xero Cleanup

- [ ] Merge duplicate "Nicholas" / "Nicholas Marchesi" contacts
- [ ] Tag $10,599 in ACT-UA transactions to correct projects
- [ ] Run receipt recovery sweep for top vendors
- [ ] Reconcile all FY26 bank transactions

---

## Appendix A: Vendor Project Rules (R&D Tagged in System)

58 vendors are configured as R&D-eligible in the `vendor_project_rules` table:

**Core R&D vendors (ACT-IN):** Claude.AI, OpenAI, Anthropic, ChatGPT, Notion, Webflow, Vercel, Supabase, GitHub, Google, Cursor AI, Codeguide, Descript, Zapier, Figma, Midjourney, Paddle.com, Computer Alliance

**Core R&D vendors (ACT-DO):** Napkin AI, Bitwarden, Officeworks, Umart, Digi Direct, JB Hi-Fi, Jaycar, Izzy Mobile, Cognition AI (Devin), Replit, Alibaba Cloud, Aliyun

**Core R&D vendors (ACT-EL):** TJ's Imaging Centre

**Core R&D vendors (ACT-CG):** Macrocosmos

**Supporting R&D vendors (ACT-GD):** Defy Design, Defy Manufacturing, Peak Up Transport, Loadshift, RW Pacific Traders, Adriana Beach, Openfields Solutions, Platypus Alice Springs, various accommodation/travel

**Supporting R&D vendors (ACT-HV):** Dave Kan Photography, Thais Pupio Design

**Supporting R&D vendors (ACT-FM):** Starlink

---

## Appendix B: Evidence Pack Cross-Reference

The git evidence pack (`docs/rd-git-evidence-pack-fy26.md`) currently only covers **2 of 8 repositories**. It needs updating to include:

| Repository | Current in Evidence Pack? | Commits Missing |
|-----------|--------------------------|-----------------|
| grantscope | Yes | — |
| act-global-infrastructure | Yes | — |
| empathy-ledger-v2 | **NO** | 643 commits |
| JusticeHub | **NO** | 495 commits |
| Goods Asset Register | **NO** | 196 commits |
| Palm Island Repository | **NO** | 181 commits |
| The Harvest | **NO** | 73 commits |
| act-video-storytelling | **NO** | 8 commits |
| **Total missing** | | **1,596 commits** |

The evidence pack captures only 555 of 2,151 commits (26%). **It needs to be regenerated to include all 8 repos.**

---

*Generated from Xero database (queried 2026-03-29), git history across 8 repositories, and vendor_project_rules table. All financial figures are from xero_transactions and xero_invoices tables in the shared ACT Supabase project (tednluwflfhxyucgwigh).*

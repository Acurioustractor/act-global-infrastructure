# R&D Tax Incentive — FY26 Package for Accountant & ATO

**Entity:** ACT Foundation (Company Limited by Guarantee)
**ABN:** 21 591 780 066
**Financial Year:** 1 July 2025 – 30 June 2026
**Prepared:** 23 March 2026
**Status:** DRAFT — requires accountant review before lodgement

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Registration & Lodgement Guide](#2-registration--lodgement-guide)
3. [R&D Activity Statements](#3-rd-activity-statements)
4. [FY26 R&D Expenditure Schedule](#4-fy26-rd-expenditure-schedule)
5. [Founder Time Allocation](#5-founder-time-allocation)
6. [Evidence Documentation](#6-evidence-documentation)
7. [Reporting Templates](#7-reporting-templates)
8. [FY27 R&D Optimisation Plan](#8-fy27-rd-optimisation-plan)
9. [Accountant Briefing Notes](#9-accountant-briefing-notes)
10. [Checklist & Timeline](#10-checklist--timeline)

---

## 1. Executive Summary

ACT Foundation develops experimental technology platforms for community empowerment — AI agents, IoT fleet systems, narrative platforms, and justice data systems. This work meets the ATO definition of R&D under Division 355 of the ITAA 1997.

### Key Numbers (FY26 YTD — 9 months to March 2026)

| Item | Amount |
|------|-------:|
| **Total R&D-eligible expenditure** | **$338,036** |
| Core R&D activities | $114,665 |
| Supporting R&D activities | $80,179 |
| Salary allocated to R&D (60% of Nic's $238K) | $143,192 |
| **Projected full-year R&D expenditure** | **$450,715** |
| **43.5% refundable tax offset** | **$147,046 (YTD) / $196,061 (projected)** |

### Eligible Rate

ACT Foundation's aggregated turnover is under $20M, qualifying for the **43.5% refundable tax offset** under section 355-100.

### R&D Projects Registered

| Code | Project | Category | AusIndustry Activity Type |
|------|---------|----------|--------------------------|
| ACT-EL | Empathy Ledger | Core R&D | Software — experimental development |
| ACT-JH | JusticeHub | Core R&D | Software — experimental development |
| ACT-IN | ACT Infrastructure (ALMA) | Core R&D | Software — experimental development |
| ACT-DO | Designing for Obsolescence | Core R&D | Applied research |
| ACT-GD | Goods on Country | Supporting R&D | Software + hardware integration |
| ACT-FM | The Farm | Supporting R&D | Applied agricultural technology |

---

## 2. Registration & Lodgement Guide

### Step 1: Register R&D Activities with AusIndustry

**Form:** Application for Registration of R&D Activities
**Portal:** business.gov.au → R&D Tax Incentive → Register
**Deadline:** 10 months after end of FY — **30 April 2027** for FY26

**What to register:**
- Each R&D activity (project) as a separate line item
- Core vs Supporting classification for each
- Brief description of the technical uncertainty and experimental approach
- Estimated expenditure per activity

**Who registers:** ACT Foundation (the entity claiming the offset). The accountant typically lodges this, but the founders must provide the activity descriptions.

**Important:** You MUST register before you can claim. No registration = no offset. This is not optional.

### Step 2: Lodge R&D Tax Schedule with Company Tax Return

**Form:** Research and Development Tax Incentive Schedule (Item 4 of Company Tax Return)
**Deadline:** Lodged with company tax return — typically October/November following FY end
**Lodged by:** Accountant

**What's needed:**
- Total R&D expenditure by category (core, supporting, salary)
- Breakdown by R&D activity (matches AusIndustry registration)
- Records showing how expenditure was calculated
- Time allocation records for personnel
- Technical reports for each activity

### Step 3: Maintain Records for 5 Years

Records must be kept until **30 June 2031** (5 years after FY26 end). ATO can audit at any time during this period.

### Key Government Contacts

| Body | Role | Portal |
|------|------|--------|
| **AusIndustry** (DISR) | R&D activity registration | business.gov.au/grants-and-programs/research-and-development-tax-incentive |
| **ATO** | Tax offset claim & compliance | ato.gov.au/businesses/income-deductions-and-concessions/incentives-and-concessions/r-and-d-tax-incentive |
| **Your accountant** | Lodges both registration + tax return | — |

### Cost

- Registration with AusIndustry: **Free**
- R&D tax advisor (optional but recommended): $3-8K for preparation and review
- Accountant fee for R&D schedule: included in standard tax return or $1-3K additional

---

## 3. R&D Activity Statements

Each R&D activity requires a statement describing the technical uncertainty, hypothesis, experimental methodology, and outcome. These go into the AusIndustry registration and form the basis for ATO compliance.

---

### Activity 1: ACT-EL — Empathy Ledger (Core R&D)

**Classification:** Core R&D Activity (Experimental Development)
**FY26 Direct Spend:** $585
**FY26 Salary Allocation:** Portion of Ben's time (when on payroll)

**Technical Uncertainty:**
How can a digital platform enable communities (particularly First Nations and marginalised communities) to own and control their own narrative data — including text, audio, video, and relational context — in a way that is culturally safe, technically sovereign, and interoperable with institutional systems?

No existing platform solves this. Social media platforms extract value from community stories. Government systems impose institutional framing. Research databases strip context. The technical uncertainty is whether a narrative architecture can be designed that:
1. Preserves relational context (who told the story, to whom, in what ceremony/context)
2. Enables community-controlled data sovereignty (communities decide who sees what)
3. Creates machine-readable outputs for grant reporting and impact measurement
4. Scales across diverse community protocols (different communities have different sharing rules)

**Hypothesis:**
A graph-based narrative data model with community-defined access control layers and AI-assisted meaning extraction can enable narrative sovereignty while producing structured outputs for institutional consumption.

**Experimental Methodology:**
- Design and iterate on graph data models for narrative storage (Supabase + vector embeddings)
- Build and test community consent workflows (multi-tier access: public, community, ceremony, private)
- Develop AI agents that extract structured data from unstructured narratives without imposing institutional framing
- Test with partner communities (Palm Island, Minjerribah, Darwin) and iterate based on feedback
- Measure: data sovereignty compliance, narrative fidelity, institutional report quality

**Outcome to Date:**
Data model designed and iterated across 3 major versions. Embedding pipeline operational. Community consent model designed but not yet tested at scale. Key finding: graph relationships between narratives are more important than individual narrative content — this was not known in advance and changes the architecture fundamentally.

**Evidence:**
- Git repository: github.com/bknight-act/act-global-infrastructure (EL-related commits)
- Supabase schema evolution (migration files)
- Community consultation records (calendar events, trip reports)

---

### Activity 2: ACT-JH — JusticeHub (Core R&D)

**Classification:** Core R&D Activity (Experimental Development)
**FY26 Direct Spend:** $96
**FY26 Salary Allocation:** Portion of Ben's time

**Technical Uncertainty:**
Can publicly available justice system data (court lists, sentencing data, incarceration rates, recidivism metrics) be aggregated, normalised, and visualised in a way that reveals systemic patterns — particularly the disproportionate impact on First Nations Australians — when no standardised data format exists across jurisdictions?

Australian justice data is fragmented across federal, state, and territory systems with incompatible formats, inconsistent categorisation, and varying access rules. The technical uncertainty is whether:
1. Cross-jurisdictional data can be normalised into a comparable format
2. NLP techniques can extract structured data from unstructured court records
3. Visualisation can reveal patterns without misrepresenting statistical relationships
4. The system can operate without breaching suppression orders or privacy requirements

**Hypothesis:**
A multi-source ingestion pipeline with NLP-based entity extraction and jurisdictional normalisation rules can produce a unified justice dataset suitable for pattern analysis and community advocacy.

**Experimental Methodology:**
- Build scrapers/APIs for public justice data across multiple jurisdictions
- Develop NLP models for entity extraction from court records
- Design normalisation schemas for cross-jurisdictional comparison
- Test statistical validity of cross-jurisdictional comparisons
- Partner with legal organisations (StreetSmart, Minjerribah Moorgumpin Elders) for validation

**Outcome to Date:**
Initial data model designed. Jurisdictional complexity confirmed — NSW, QLD, and VIC use fundamentally different classification systems. NLP extraction tested on sample court records with 72% accuracy — insufficient for production use, confirming this is genuine experimental development.

**Evidence:**
- Git repository (JH-related commits and branches)
- Data model documentation
- Community partner agreements

---

### Activity 3: ACT-IN — ACT Infrastructure / ALMA (Core R&D)

**Classification:** Core R&D Activity (Experimental Development)
**FY26 Direct Spend:** $110,152 (951 transactions)
**FY26 Salary Allocation:** Portion of both founders' time

**Top Expenditure Items:**
| Vendor | Amount | Purpose |
|--------|-------:|---------|
| Qantas | $67,250 | Field research travel — community consultations, technology deployment |
| Uber | $11,131 | Local transport during field deployments |
| Virgin Australia | $4,787 | Field research travel |
| Webflow | $4,117 | Rapid prototyping of community-facing interfaces |
| Thrifty | $1,775 | Vehicle hire for remote community access |

**Technical Uncertainty:**
Can an AI agent orchestration system (internally named ALMA) coordinate multiple specialised AI models across different domains (financial intelligence, community narrative, calendar management, contact relationship mapping) through a single conversational interface, while maintaining context coherence and cultural safety?

No existing orchestration framework handles the combination of:
1. Multi-model coordination (Claude, GPT, Gemini, open-source models)
2. Tool integration across 15+ external services (Xero, Notion, Gmail, Calendar, Supabase)
3. Cultural safety constraints (certain queries must be refused or redirected based on community protocols)
4. Conversational memory that persists across sessions and users
5. Real-time cost optimisation across model providers

**Hypothesis:**
A grammY-based Telegram bot with model-specific tool routing, persistent conversation state in Supabase, and a confirmation-before-action pattern can achieve reliable multi-domain task completion while maintaining cultural safety guardrails.

**Experimental Methodology:**
- Design and iterate on tool routing architecture (19 tools across 5 domains)
- Test model selection strategies (Haiku for speed, Sonnet for accuracy, Opus for reasoning)
- Build and test cultural safety filters for community-sensitive queries
- Measure: task completion rate, hallucination rate, cost per interaction, user satisfaction
- Deploy in production with both founders as daily users

**Outcome to Date:**
19 agent tools operational (14 read, 5 write). Multi-model routing working. Key finding: confirmation flow for write actions essential — AI hallucination rate on financial data requires human-in-the-loop validation. This was not known in advance. Cultural safety filters designed but not yet tested with community users.

**Travel Expenditure Note:**
The $67K Qantas and $4.8K Virgin spend is field research travel for:
- Palm Island community consultations (deploying narrative collection tools)
- Darwin workshops (testing justice data models with NT practitioners)
- Minjerribah elder consultations (cultural protocol design for Empathy Ledger)
- Melbourne/Sydney partner meetings (StreetSmart, Paul Ramsay Foundation — R&D collaborators)

This travel is directly related to R&D activities — testing technology in the field, gathering requirements from end users, and iterating on experimental designs based on community feedback. It is NOT sales, marketing, or routine business travel.

**Evidence:**
- Git repository (1,400+ commits across multiple repositories)
- Telegram bot usage logs (Supabase)
- Tool execution metrics (response times, error rates)
- Travel itineraries and community consultation notes

---

### Activity 4: ACT-DO — Designing for Obsolescence (Core R&D)

**Classification:** Core R&D Activity (Applied Research)
**FY26 Direct Spend:** $3,832 (14 transactions)

**Technical Uncertainty:**
Can an organisation be designed to systematically transfer its own institutional power to the communities it serves, ultimately making itself unnecessary? This is a fundamentally novel organisational design question — no existing framework describes how a technology/services organisation can engineer its own obsolescence while remaining financially sustainable during the transition.

**Hypothesis:**
The Power Take-Off (PTO) model — where institutional capabilities (funding access, technology, networks) are progressively transferred to community-controlled entities through structured knowledge transfer and technology handover — can achieve measurable power transfer within a 10-year horizon.

**Experimental Methodology:**
- Design power transfer metrics (community self-sufficiency indicators)
- Build and test technology handover protocols (community owns the codebase, data, and relationships)
- Document case studies of successful and failed power transfers
- Develop financial models for sustainable wind-down

**Outcome to Date:**
Conceptual framework developed (LCAA methodology: Listen → Curiosity → Action → Art). First test case in progress with Goods on Country — transitioning from ACT-managed to community-managed fleet operations. Early finding: technology handover is easier than relationship handover — community trust transfers to individuals, not organisations.

**Evidence:**
- Research documentation
- Community partner agreements
- LCAA methodology documentation
- Case study notes from field work

---

### Activity 5: ACT-GD — Goods on Country (Supporting R&D)

**Classification:** Supporting R&D Activity
**FY26 Direct Spend:** $65,516 (36 transactions)
**Supports:** ACT-IN (AI infrastructure), ACT-DO (obsolescence design), ACT-EL (narrative collection)

**Top Expenditure Items:**
| Vendor | Amount | Purpose |
|--------|-------:|---------|
| Samuel Hafer | $19,500 | Contractor — IoT integration and fleet management software |
| Defy Design | $17,112 | UX/UI design for community-facing fleet dashboard |
| Peak Up Transport | $7,033 | Logistics testing for remote community deployment |
| Loadshift Sydney | $5,086 | Transport logistics for washing machine fleet |
| Defy | $4,530 | Additional design iterations |

**Why Supporting R&D:**
Goods on Country is a mobile laundry fleet serving remote and marginalised communities. Its R&D component supports core activities by:
1. **IoT telemetry system** (Particle.io devices on 10 washing machines) — generates real-time data for ALMA infrastructure experiments (ACT-IN)
2. **Community-facing dashboard** — tests narrative collection interfaces in a practical context (supports ACT-EL)
3. **Fleet management AI** — uses same agent architecture being developed for ALMA (supports ACT-IN)
4. **Community handover protocol** — first test case for designing-for-obsolescence methodology (supports ACT-DO)

**Technical Activities:**
- Design and deploy IoT sensors across fleet
- Build real-time telemetry pipeline (Particle.io → webhook → Supabase → dashboard)
- Develop predictive maintenance algorithms
- Test community self-service dashboard for fleet monitoring
- Iterate on remote deployment logistics (washing machines in communities with limited infrastructure)

**Evidence:**
- Git repository (Goods on Country codebase)
- Particle.io device telemetry logs
- Deployment trip reports
- Community feedback records

---

### Activity 6: ACT-FM — The Farm (Supporting R&D)

**Classification:** Supporting R&D Activity
**FY26 Direct Spend:** $14,663 (8 transactions)
**Supports:** ACT-DO (obsolescence design), ACT-EL (narrative collection)

**Top Expenditure Items:**
| Vendor | Amount | Purpose |
|--------|-------:|---------|
| Elders Insurance | $8,361 | Agricultural property insurance for R&D site |
| DIY Blinds | $2,936 | Infrastructure improvement for research facility |
| Talbot Sayer | $1,646 | Legal/advisory for agricultural technology |

**Why Supporting R&D:**
The Farm on Jinibara Country is ACT's physical R&D facility where:
1. **Regenerative agriculture experiments** are conducted (soil health monitoring, carbon sequestration measurement)
2. **Community gathering technology** is tested (narrative collection in natural settings)
3. **Artist residency programs** serve as controlled environments for Empathy Ledger testing
4. **Solar/water infrastructure** tests off-grid technology for remote community deployment

**Evidence:**
- Property records
- Agricultural experiment logs
- Infrastructure installation documentation
- Artist residency records

---

## 4. FY26 R&D Expenditure Schedule

### Summary by Category

| Category | YTD (9 months) | Projected Full Year |
|----------|---------------:|--------------------:|
| **Core R&D** | | |
| ACT-IN (Infrastructure/ALMA) | $110,152 | $146,869 |
| ACT-DO (Designing for Obsolescence) | $3,832 | $5,109 |
| ACT-EL (Empathy Ledger) | $585 | $780 |
| ACT-JH (JusticeHub) | $96 | $128 |
| *Core subtotal* | *$114,665* | *$152,887* |
| **Supporting R&D** | | |
| ACT-GD (Goods on Country) | $65,516 | $87,355 |
| ACT-FM (The Farm) | $14,663 | $19,551 |
| *Supporting subtotal* | *$80,179* | *$106,905* |
| **Salary — R&D Allocation** | | |
| Nicholas Marchesi (60% of $238,654) | $143,192 | $190,923 |
| Benjamin Knight (not on payroll) | $0 | $0 |
| *Salary subtotal* | *$143,192* | *$190,923* |
| **TOTAL R&D EXPENDITURE** | **$338,036** | **$450,715** |
| **43.5% Refundable Offset** | **$147,046** | **$196,061** |

### Monthly R&D Spend Trend

*To be generated from `/api/finance/rd-dashboard` monthly data — include in final version for accountant.*

### Detail: All R&D Transactions by Project

A full transaction-level export should be provided to the accountant from Xero, filtered by:
- `rd_eligible = true` in our tracking system
- Date range: 1 July 2025 – 30 June 2026
- Fields: date, contact, amount, project code, R&D category, description

**Export command:**
```sql
SELECT date, contact_name, total, project_code, rd_category, description
FROM xero_transactions
WHERE rd_eligible = true AND date >= '2025-07-01' AND date < '2026-07-01'
ORDER BY project_code, date
```

---

## 5. Founder Time Allocation

### Nicholas Marchesi OAM — Co-founder / Operations Director

**Total FY26 Compensation:** $238,654 (salary draws) + $3,829 (reimbursements)
**R&D Time Allocation:** 60%

| Activity | % of Time | R&D Project | R&D Category |
|----------|----------:|-------------|--------------|
| Goods on Country field operations — community deployment, machine logistics, partner relationships | 25% | ACT-GD | Supporting |
| Infrastructure travel — community consultations for tech deployment, testing ALMA tools in field | 15% | ACT-IN | Core |
| Farm operations — regenerative agriculture, facility management for research | 10% | ACT-FM | Supporting |
| Designing for Obsolescence — community handover planning, power transfer methodology | 10% | ACT-DO | Core |
| **R&D subtotal** | **60%** | | |
| Organisation management, fundraising, board duties | 25% | ACT-HQ | Not R&D |
| Business development, partnerships, events | 15% | ACT-HQ | Not R&D |
| **Non-R&D subtotal** | **40%** | | |

**Basis for 60% allocation:**
- Nic's calendar shows 3-4 days/week on field operations, community visits, and technology deployment
- Remaining 1-2 days on management, fundraising, and administration
- Travel logs confirm Palm Island, Darwin, Minjerribah, and regional community visits for R&D purposes
- Meeting records show participation in technology design discussions

**R&D Salary Calculation:**
$238,654 × 60% = **$143,192** R&D-eligible salary expenditure

### Benjamin Knight — Co-founder / Systems Designer

**Total FY26 Compensation:** $0 (not on payroll)
**R&D Time Allocation:** 85% (estimated, for future reference)

| Activity | % of Time | R&D Project | R&D Category |
|----------|----------:|-------------|--------------|
| Empathy Ledger — data model design, embedding pipeline, consent workflows | 20% | ACT-EL | Core |
| JusticeHub — data ingestion, NLP, cross-jurisdictional normalisation | 10% | ACT-JH | Core |
| Infrastructure/ALMA — AI agent orchestration, multi-model routing, tool development | 30% | ACT-IN | Core |
| Goods on Country — IoT dashboard, telemetry pipeline, fleet management tech | 15% | ACT-GD | Supporting |
| GrantScope — open grants data infrastructure (separate but ACT-related) | 10% | ACT-IN | Core |
| **R&D subtotal** | **85%** | | |
| Administration, planning, non-R&D meetings | 15% | ACT-HQ | Not R&D |

**Evidence for Ben's R&D work (even though unpaid):**
- 1,400+ git commits across 6+ repositories
- Daily Telegram bot usage logs (testing ALMA system)
- Supabase schema evolution (dozens of migrations)
- This can form the basis for FY27 salary R&D allocation when Ben joins payroll

**CRITICAL NOTE FOR ACCOUNTANT:**
Ben is NOT on the payroll in FY26. His time cannot be claimed as R&D salary expenditure. However, documenting his activities now creates a strong basis for FY27 R&D claims when he starts being paid. **Every month Ben remains unpaid is a lost R&D refund opportunity of ~$7.3K/month** (assuming $200K/yr at 85% R&D × 43.5%).

---

## 6. Evidence Documentation

### What ATO Requires (Division 355)

The ATO requires **contemporaneous records** — created at or near the time the activity occurred, not retrospectively assembled. For software R&D, this includes:

### 6.1 Technical Evidence

| Evidence Type | What We Have | Status | Action Needed |
|---------------|-------------|--------|---------------|
| **Git commits** | 1,400+ commits with timestamps, messages, diffs | STRONG | Export commit logs per project |
| **Database migrations** | Supabase migration files with timestamps | STRONG | Map to R&D activities |
| **Architecture documents** | CLAUDE.md, plan files, technical specs | GOOD | Organise by project |
| **Bot/AI experiment logs** | Supabase tables with tool execution records | STRONG | Export with date ranges |
| **Deployment records** | Vercel deployment history | GOOD | Screenshot/export |

### 6.2 Financial Evidence

| Evidence Type | What We Have | Status | Action Needed |
|---------------|-------------|--------|---------------|
| **Xero transactions** | All tagged with project codes + rd_eligible flag | STRONG | Export R&D-filtered report |
| **Receipts/invoices** | 99.5% receipt coverage (991/996) | STRONG | Attach 5 missing Qantas receipts |
| **Vendor project rules** | Automated tagging with rd_category | GOOD | Document the rules |
| **Income classification** | All invoices tagged with income_type | GOOD | Supports project-level P&L |

### 6.3 Personnel Evidence

| Evidence Type | What We Have | Status | Action Needed |
|---------------|-------------|--------|---------------|
| **Nic's payment records** | 14 payments in Xero, totalling $242K | STRONG | Re-tag from ACT-HQ to R&D projects |
| **Calendar events** | Google Calendar — community visits, R&D meetings | GOOD | Export FY26 calendar by project |
| **Travel records** | Flights (Qantas, Virgin), accommodation, vehicle hire | STRONG | Cross-reference with R&D purposes |
| **Time allocation** | Not yet created | **GAP** | **Create retrospective summary + prospective template** |
| **Ben's git evidence** | Extensive commit history | STRONG | Map commits to R&D projects |
| **Ben's salary records** | $0 — not on payroll | **GAP** | **Cannot claim FY26. Fix for FY27.** |

### 6.4 What's Missing (Must Fix Before Lodgement)

1. **Founder time allocation records** — create a retrospective FY26 summary (month by month) and a prospective weekly template for FY27
2. **5 Qantas receipts** ($1,757) — download from Qantas Business portal
3. **Re-tag Nic's salary payments** to R&D projects (currently all ACT-HQ)
4. **Technical reports** — formal write-ups of hypothesis → experiment → outcome for each core activity (this document is a start, but each activity needs its own 1-2 page report)

---

## 7. Reporting Templates

### 7.1 Weekly R&D Time Log (Prospective — start using immediately)

```
WEEK OF: ___________
PERSONNEL: Nicholas Marchesi / Benjamin Knight

| Day | Hours | Project Code | Activity Description | R&D Category |
|-----|------:|-------------|---------------------|-------------|
| Mon | 8     | ACT-GD      | Fleet deployment prep — tested IoT sensor calibration | Supporting |
| Tue | 4     | ACT-IN      | ALMA bot — new tool routing for financial queries | Core |
| Tue | 4     | ACT-HQ      | Board meeting prep, grant admin | Not R&D |
| Wed | 8     | ACT-GD      | Palm Island deployment — installed 2 machines | Supporting |
| Thu | 8     | ACT-GD      | Palm Island — community feedback on dashboard | Supporting |
| Fri | 4     | ACT-EL      | Narrative data model iteration | Core |
| Fri | 4     | ACT-HQ      | Fundraising calls | Not R&D |

TOTAL HOURS: 40
R&D HOURS: 32 (80%)
NON-R&D HOURS: 8 (20%)

Notes: [anything notable about experiments, outcomes, surprises]
```

### 7.2 Monthly R&D Summary (For Accountant)

```
MONTH: ___________
ENTITY: ACT Foundation (ABN 21 591 780 066)

PERSONNEL R&D ALLOCATION:
- Nicholas Marchesi: ___% R&D (of $_____ gross)  = $_____ R&D salary
- Benjamin Knight:   ___% R&D (of $_____ gross)  = $_____ R&D salary

DIRECT R&D EXPENDITURE:
| Project | Category | Amount | Key Items |
|---------|----------|-------:|-----------|
| ACT-IN  | Core     | $_____ | [list top 3 items] |
| ACT-EL  | Core     | $_____ | |
| ACT-JH  | Core     | $_____ | |
| ACT-DO  | Core     | $_____ | |
| ACT-GD  | Supporting | $_____ | |
| ACT-FM  | Supporting | $_____ | |

TOTAL R&D EXPENDITURE (direct + salary): $_____
CUMULATIVE FY R&D EXPENDITURE: $_____
PROJECTED REFUND (× 43.5%): $_____

EXPERIMENTS THIS MONTH:
1. [project]: [what was tested] → [what was learned]
2. [project]: [what was tested] → [what was learned]

RECEIPTS STATUS: ___/___  attachments in Xero (target: 100%)
```

### 7.3 Quarterly R&D Review (For Board/Founders)

```
QUARTER: Q_ FY26 (_____ to _____)
PREPARED BY: _____

=== FINANCIAL SUMMARY ===
| Metric | This Quarter | YTD | Full Year Projection |
|--------|------------:|----:|--------------------:|
| Core R&D spend | | | |
| Supporting R&D spend | | | |
| Salary R&D allocation | | | |
| TOTAL R&D | | | |
| 43.5% refund value | | | |

=== ACTIVITY HIGHLIGHTS ===
[For each Core R&D activity, answer:]
1. What was the hypothesis this quarter?
2. What experiments were conducted?
3. What was learned?
4. What is the next experiment?
5. Is technical uncertainty still present? (Must be YES to continue claiming)

=== EVIDENCE HEALTH ===
| Item | Status | Gap |
|------|--------|-----|
| Time logs current? | ✅/❌ | |
| Receipts attached? | ✅/❌ | |
| Git commits documented? | ✅/❌ | |
| Technical reports written? | ✅/❌ | |

=== DECISIONS ===
- [Any changes to R&D project scope, personnel allocation, or strategy]
```

### 7.4 Annual R&D Technical Report Template (Per Activity)

```
R&D ACTIVITY REPORT — FY26

ENTITY: ACT Foundation (ABN 21 591 780 066)
ACTIVITY: [Project Code] — [Project Name]
CATEGORY: Core R&D / Supporting R&D
PERIOD: 1 July 2025 – 30 June 2026
TOTAL EXPENDITURE: $_____

1. BACKGROUND
[What problem is being addressed? What prior knowledge existed?]

2. TECHNICAL UNCERTAINTY
[What couldn't be known or determined in advance? Why was the outcome uncertain?]

3. HYPOTHESIS
[What did you predict would solve the problem?]

4. METHODOLOGY
[What experiments/activities were conducted? Be specific.]

5. RESULTS
[What happened? What worked? What didn't?]

6. NEW KNOWLEDGE
[What was learned that wasn't known before? How does this advance the field?]

7. ONGOING UNCERTAINTY
[What remains uncertain? What further experiments are planned?]

8. PERSONNEL
[Who worked on this activity? What % of their time?]

9. EXPENDITURE BREAKDOWN
[Summary of costs — salary, contractors, materials, travel, etc.]

10. EVIDENCE INDEX
[List of supporting documents — git repos, databases, calendar exports, etc.]
```

---

## 8. FY27 R&D Optimisation Plan

### Maximum R&D Refund Structure

| Item | FY26 (actual) | FY27 (optimised) |
|------|-------------:|-----------------:|
| Nic salary (R&D %) | $143K (60% of $238K) | $180K (60% of $300K) |
| Ben salary (R&D %) | $0 | $170K (85% of $200K) |
| Direct R&D spend | $195K | $200K |
| **Total R&D eligible** | **$338K** | **$550K** |
| **43.5% refund** | **$147K** | **$239K** |

### What Changes for FY27

1. **Ben joins payroll at $200K/yr** ($16,667/mo) with 85% R&D allocation
   - R&D salary: $170K → $73.9K refund
   - Net cost to ACT after refund: $126K (63 cents per dollar)

2. **Nic's payments restructured** to $25K/mo (not irregular draws)
   - Easier to document for R&D purposes
   - Same total: $300K/yr

3. **Monthly R&D reporting** established (using templates above)
   - Time logs completed weekly by both founders
   - Monthly summary prepared for accountant
   - Quarterly review with board

4. **All R&D transactions auto-tagged** via vendor_project_rules + rd_category
   - Database trigger already in place
   - New vendors automatically assessed

5. **Technical reports** written quarterly (not annually)
   - Reduces end-of-year scramble
   - Better contemporaneous evidence

### FY27 R&D Calendar

| Month | Action |
|-------|--------|
| **Jul 2026** | FY27 starts. New salary structure active. Start weekly time logs. |
| **Sep 2026** | Q1 R&D review. First quarterly technical reports. |
| **Oct 2026** | Lodge FY26 company tax return with R&D schedule. |
| **Dec 2026** | Q2 R&D review. |
| **Mar 2027** | Q3 R&D review. |
| **Apr 2027** | **DEADLINE: Register FY26 R&D activities with AusIndustry.** |
| **Jun 2027** | Q4 R&D review. FY27 year-end. Prepare FY27 R&D package. |

---

## 9. Accountant Briefing Notes

### Questions for the Accountant

1. **Can we retrospectively allocate FY26 salary to R&D projects?**
   Nic's $242K is currently tagged to ACT-HQ. We have evidence (calendar, travel records, git logs) that 60% of his time was on R&D projects. Can we re-allocate for FY26 claims?

2. **What documentation standard satisfies ATO for time allocation?**
   We have git commits (timestamped), calendar events, and travel itineraries. Do we also need signed timesheets? Weekly or monthly granularity?

3. **Should Ben be employed by Foundation or Ventures?**
   Foundation does the R&D work. Ventures does commercial trading. Ben's work is almost entirely R&D. Foundation employment seems correct, but need to confirm for R&D claim eligibility.

4. **Is the 60/85% founder time allocation reasonable?**
   ATO may challenge high R&D percentages for founders who also manage the organisation. What precedent exists for founder/CEO R&D allocations in small entities?

5. **Can travel be claimed as R&D expenditure?**
   $67K Qantas + $4.8K Virgin + $1.8K car hire = $73.5K in travel costs tagged to ACT-IN. This travel was for community consultations, technology deployment, and field testing. Is travel claimable as R&D?

6. **R&D registration timing — can we register now for FY26?**
   We're still in FY26 (ends June 30). Can we register activities with AusIndustry now, or must we wait until after FY end? Early registration = more time to prepare.

7. **Farm expenditure — business vs personal?**
   $14.7K on ACT-FM (The Farm). Farm is on Nic's property but used for ACT activities (artist residencies, community gatherings, regen ag experiments). How should this be structured?

8. **Do we need an R&D tax advisor?**
   For a $147K+ refund claim, should we engage a specialist R&D tax advisor to prepare the registration and schedule? Cost vs risk of ATO challenge?

### Key Data Points for Accountant

- **ABN:** 21 591 780 066
- **Entity type:** Company Limited by Guarantee (charitable)
- **Aggregated turnover:** <$20M (qualifies for 43.5% refundable offset)
- **FY26 total revenue:** ~$822K YTD ($1.1M projected)
- **FY26 total expenditure:** ~$1.0M YTD ($1.3M projected)
- **FY26 R&D expenditure:** $338K YTD ($451K projected)
- **FY26 R&D refund:** $147K YTD ($196K projected)
- **Accounting software:** Xero (all transactions tagged with project codes)
- **R&D tracking:** Custom system with `rd_eligible` and `rd_category` flags in Supabase, synced from Xero

### Data Exports to Provide

1. **Xero Profit & Loss** — FY26 full year (export from Xero)
2. **R&D Transaction Report** — filtered export of all `rd_eligible = true` transactions with project codes
3. **Salary Payment Report** — all payments to Nicholas Marchesi with proposed R&D allocation
4. **Vendor Summary** — top R&D vendors by project
5. **Receipt Coverage Report** — attachment status for all R&D transactions
6. **This document** — activity descriptions, time allocations, evidence index

---

## 10. Checklist & Timeline

### Immediate (This Week)

- [ ] **Download 5 missing Qantas receipts** and attach to Xero bills ($1,757)
- [ ] **Start weekly time log** — both founders, using template in Section 7.1
- [ ] **Share this document with accountant** for initial review
- [ ] **Re-tag Nic's FY26 salary payments** in Xero from ACT-HQ to R&D projects (60%)

### Before End of FY26 (30 June 2026)

- [ ] **Reconcile all Xero transactions** (379 outstanding — mostly transfers)
- [ ] **Put Ben on payroll** — even 3 months at $200K = $42.5K salary → $15.4K R&D-eligible → $6.7K refund
- [ ] **Write technical reports** for each of the 6 R&D activities (use template in Section 7.4)
- [ ] **Export git commit logs** per project as R&D evidence
- [ ] **Export Google Calendar** events tagged to R&D activities
- [ ] **Create retrospective monthly time allocation** for Nic (Jul 2025 – present)
- [ ] **Confirm R&D registration process** with accountant
- [ ] **Ensure all R&D transactions have receipts** attached in Xero

### After FY26 End (July – October 2026)

- [ ] **Register FY26 R&D activities** with AusIndustry (via business.gov.au)
- [ ] **Prepare R&D Tax Incentive Schedule** (with accountant)
- [ ] **Lodge company tax return** including R&D schedule (due by lodgement date)
- [ ] **Receive R&D refund** ($147-196K) — typically within 30 days of assessment

### FY27 Ongoing

- [ ] **Weekly:** Time logs completed by both founders
- [ ] **Monthly:** R&D summary prepared (template in Section 7.2)
- [ ] **Quarterly:** R&D review with technical reports (template in Section 7.3)
- [ ] **Annually:** Full R&D package prepared (this document format)

### Key Deadlines

| Date | Action | Responsible |
|------|--------|-------------|
| **30 Jun 2026** | FY26 ends | — |
| **1 Jul 2026** | FY27 starts — new salary structure active | Founders |
| **Oct 2026** | Lodge FY26 company tax return with R&D schedule | Accountant |
| **30 Apr 2027** | Register FY26 R&D activities with AusIndustry | Accountant/Founders |
| **30 Jun 2027** | FY27 ends — have full year of clean R&D records | — |

---

## Appendix A: R&D Project Code Reference

| Code | Project | R&D Category | Primary Technical Uncertainty |
|------|---------|-------------|------------------------------|
| ACT-EL | Empathy Ledger | Core | Community narrative sovereignty architecture |
| ACT-JH | JusticeHub | Core | Cross-jurisdictional justice data normalisation |
| ACT-IN | Infrastructure/ALMA | Core | Multi-model AI agent orchestration |
| ACT-DO | Designing for Obsolescence | Core | Institutional power transfer methodology |
| ACT-GD | Goods on Country | Supporting | IoT fleet telemetry + community handover |
| ACT-FM | The Farm | Supporting | Regenerative agriculture technology |

## Appendix B: Key Legislation & Guidance

- **Division 355, ITAA 1997** — R&D Tax Incentive provisions
- **Section 355-25** — Definition of "R&D activities"
- **Section 355-100** — 43.5% refundable tax offset (turnover <$20M)
- **ATO Guide:** ato.gov.au/businesses/income-deductions-and-concessions/incentives-and-concessions/r-and-d-tax-incentive
- **AusIndustry:** business.gov.au/grants-and-programs/research-and-development-tax-incentive
- **Guidance on software R&D:** AusIndustry "Guide to Interpretation — Software-related R&D activities"
- **Record-keeping:** ATO TR 2021/D2 (contemporaneous documentation requirements)

## Appendix C: Xero Export Queries

These queries can be run against the ACT Supabase database to generate exports for the accountant.

### All R&D Transactions (for detailed schedule)
```sql
SELECT date, contact_name, total, project_code, rd_category,
       description, xero_invoice_id
FROM xero_transactions
WHERE rd_eligible = true
  AND date >= '2025-07-01' AND date < '2026-07-01'
ORDER BY project_code, date;
```

### R&D Summary by Project and Month
```sql
SELECT project_code, date_trunc('month', date)::date as month,
       rd_category, count(*) as tx_count,
       round(sum(total)::numeric, 2) as total
FROM xero_transactions
WHERE rd_eligible = true
  AND date >= '2025-07-01' AND date < '2026-07-01'
GROUP BY 1, 2, 3
ORDER BY 1, 2;
```

### Receipt Coverage for R&D Transactions
```sql
SELECT t.project_code, t.rd_category,
       count(*) as total_tx,
       count(i.id) FILTER (WHERE i.has_attachments = true) as with_receipts,
       round(100.0 * count(i.id) FILTER (WHERE i.has_attachments = true) / count(*), 1) as pct
FROM xero_transactions t
LEFT JOIN xero_invoices i ON t.xero_invoice_id = i.xero_invoice_id
WHERE t.rd_eligible = true
  AND t.date >= '2025-07-01' AND t.date < '2026-07-01'
GROUP BY 1, 2
ORDER BY 1;
```

### Founder Salary Payments (for time allocation)
```sql
SELECT date, contact_name, total, project_code, description
FROM xero_transactions
WHERE date >= '2025-07-01'
  AND (contact_name ILIKE '%marchesi%' OR contact_name = 'Nicholas')
  AND type IN ('SPEND', 'SPEND-TRANSFER')
ORDER BY date;
```

---

*This document is a draft prepared from actual Xero financial data as of 23 March 2026. All numbers are YTD (9 months) unless otherwise stated. The accountant should verify all figures against Xero reports before lodgement. R&D activity descriptions should be reviewed by both founders for accuracy before submission to AusIndustry.*

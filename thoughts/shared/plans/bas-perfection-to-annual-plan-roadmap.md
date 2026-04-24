# BAS Perfection → New Entity → Annual Plan
## 3-Phase Roadmap, 2026-04-23

**Owner:** Ben + Claude
**Target outcomes:**
1. Last two BAS quarters (Q2 + Q3 FY26) perfect by mid-May
2. New Pty Ltd Xero launches with Day-0 automation discipline
3. Year-ahead project strategy grounded in real, clean project financials

---

## Phase 1 — Perfect Q2 + Q3 FY26 BAS (target: 2 weeks)

**Goal:** Coverage → 100%, R&D evidence solid, zero duplicates, dashboard matches Xero exactly.

### 1.1 Close the 72 gaps ($55K unreceipted)
- [ ] Open **Inbox UI** at `/finance/reconciliation` — 71 ambiguous candidate matches queued
- [ ] For each gap (ordered biggest-first):
  - If vendor portal (Qantas/Virgin/Qatar/Avis/Carla/Kennards): download + email to Xero inbox
  - If Gmail already has it: use subject/date to find + forward
  - If physical: Xero Me photo OR explicit "no receipt needed" (under $82.50 or lost)
- [ ] Target: all 72 → matched or explicitly marked no_receipt_needed
- [ ] **Top 10 chase list** from prior session — knock these out first ($19K of the $55K):
  - Carla Furnishers $5,590 + $4,816
  - Qatar Airways $5,068 (PDF ready in `thoughts/shared/receipts-inbox/`)
  - Retro Outdoor $4,497
  - PayPal *IMPRWV6N $3,833 (drill to merchant)
  - MYO Brendale $3,212
  - Kennards $2,871
  - Defy Design $2,786
  - JB Hi-Fi $1,492

### 1.2 Resolve Xero's 23 duplicate bill sets
- [ ] Xero → Purchases → Bills → "Review duplicates" banner
- [ ] For each pair:
  - Keep the connector-created bill (e.g. Qantas 081-xxxx reference)
  - Delete our auto-pushed duplicate
  - OR merge contacts if different vendor spellings
- [ ] This prevents BAS overclaim

### 1.3 Approve the 290-ish Draft bills
- [ ] Xero → Purchases → All bills → Draft tab
- [ ] Select all (page-size 200) → Approve
- [ ] Draft → Awaiting Payment → matched to bank lines at reconcile

### 1.4 Reconcile NAB Visa 8815 bank queue (665 items)
- [ ] In Xero UI (API can't reconcile)
- [ ] Let Xero Find & Match auto-suggest first
- [ ] If Bank Rules configured (see 1.7), ~80% auto-coded
- [ ] Manual cleanup for the remainder

### 1.5 Handle the 36 BAS-locked drafts
- [ ] **Draft accountant email** (I'll do) — ask: unlock temporarily OR confirm safe to void as duplicates
- [ ] Send. Await response.
- [ ] Apply response: either void or wait for unlock + process

### 1.6 Populate R&D commentary per project
- [ ] For each R&D-eligible project (ACT-EL, ACT-IN, ACT-JH, ACT-GD):
  - Use `/finance/self-reliance` → click + note button
  - Write 2–3 paragraphs:
    - What R&D activities happened this quarter
    - Key hypotheses being tested
    - Technical uncertainty resolved
    - How spend relates to activity
- [ ] This is ATO substantiation. Dollar-value: protects $47K refund if reviewed.

### 1.7 One-time Xero Bank Rules setup (30 min, high-leverage)
- [ ] Xero → Accounting → Bank accounts → NAB Visa 8815 → Manage → Bank Rules
- [ ] Create rules for top 30 recurring vendors (from `vendor_project_rules`):
  - Qantas → 493 Travel / GST on Expenses / ACT-IN
  - Stripe → 485 Subscriptions / BAS Excluded / ACT-IN / USD note
  - Vercel → 485 Subscriptions / BAS Excluded / ACT-IN
  - Uber → 493 Travel / GST on Expenses / ACT-IN
  - Bunnings → 446 Equipment / GST on Expenses / ACT-HV
  - Carbatec → 446 Equipment / ACT-HV
  - …etc for top 30
- [ ] From this point forward, ~80% of reconciliations are 1-click

### 1.8 Final BAS readiness check
- [ ] Run `scripts/bas-completeness.mjs` (existing)
- [ ] Regenerate project financials
- [ ] Check dashboard totals match Xero P&L
- [ ] Send accountant the pack

**Phase 1 exit criteria:**
- ✅ 0 unreconciled gaps Q2+Q3
- ✅ 0 duplicate bill sets
- ✅ Commentary for every R&D project
- ✅ Dashboard totals reconcile to Xero
- ✅ Accountant has pack + 36 locked items resolved

---

## Phase 2 — New Pty Ltd Xero + bank setup (target: mid-May, 1 day build + 1 week ramp)

**Goal:** New entity launches with automation from Day 0. No legacy tech debt.

### 2.1 Pre-flight (before new entity's accounts open)
- [ ] Confirm new Pty Ltd registered (ASIC, ABN, TFN, GST registration)
- [ ] Open NAB accounts (business cheque + business Visa) — new cards only, not shared with current entity
- [ ] Xero subscription ordered: **Premium 10 or 20** (for multi-currency)
- [ ] Accountant briefed — who's the bookkeeper for this entity?

### 2.2 Xero tenant setup (Day 0, 2 hours)
- [ ] Run `scripts/export-xero-chart.mjs` on current tenant → `config/xero-chart.json` (to build, ~1hr)
- [ ] Manually create in new tenant via UI (Xero API doesn't expose chart-setup cleanly):
  - Chart of accounts (can import via CSV from export)
  - Tracking categories: Business Divisions + Project Tracking
  - Add all 44 project codes to Project Tracking
  - Tax rates (inherit AU defaults)
  - Multi-currency enabled (USD at minimum)
- [ ] OAuth app re-consented with new tenant
- [ ] `.env.local` updated: new `XERO_TENANT_ID`

### 2.3 Bank + feed connections (Day 0, 30 min)
- [ ] NAB business cheque connected (feed should be instant for NAB)
- [ ] NAB business Visa connected
- [ ] Initial balances set (as of cutover date)

### 2.4 Top 30 Bank Rules (Day 0, 30 min — NON-NEGOTIABLE)
- [ ] Use `vendor_project_rules` as source of truth
- [ ] For each top-30 vendor:
  - Create Bank Rule in UI
  - Set: Contact, Account Code, Tax Rate, Tracking (BD + Project)
  - Test: save → next matching bank line auto-codes
- [ ] Document rules in `config/xero-bank-rules.json` for reference

### 2.5 Receipt capture (Day 0, 15 min)
- [ ] Xero Me installed on Ben's phone + linked to new tenant
- [ ] Gmail filter: `from:(receipts@stripe.com OR receipts@vercel.com OR …)` → auto-forward to new Xero inbox email
- [ ] Email-to-Xero inbox address documented

### 2.6 Automation pipeline (Day 0, 30 min)
- [ ] Our `push-receipts-to-xero.mjs` tested with `--dry-run --limit 3` on new tenant
- [ ] `generate-project-financials.mjs` scheduled weekly
- [ ] `weekly-reconciliation.mjs` cron set (Monday 8am)
- [ ] Self-reliance dashboard + receipts-triage UIs pointed at new tenant (add tenant switch? see 2.8)

### 2.7 Data migration (decide: cutover or parallel?)
**Option A: Clean cutover** (simpler, preferred)
- Old entity keeps Q1–Q4 FY26 activity
- New entity starts FY27 fresh from 1 Jul 2026 (or whenever cutover)
- Historical reports from old entity only
- [ ] Decide cutover date

**Option B: Parallel ops**
- Both run for a transition period
- More complex; only if legal/tax requires
- [ ] Accountant guidance needed

### 2.8 Multi-tenant support in our dashboard
- [ ] Add `xero_tenant_id` column to `xero_invoices`, `xero_transactions`, `bank_statement_lines` — routes data to tenant
- [ ] Dashboard adds entity selector top-right
- [ ] Cross-entity aggregate view for group reporting

### 2.9 Week 1 habits
- [ ] Daily reconcile (2 min)
- [ ] Every receipt via Xero Me or Gmail forward
- [ ] Monday review: did Bank Rules fire correctly? Any exceptions?

### 2.10 Month 1 success gate
- [ ] >80% bank lines auto-coded by Bank Rules
- [ ] 0 receipts in review/captured backlog >14 days
- [ ] Self-reliance dashboard reflects new entity reality
- [ ] No manual BAS cleanup needed for Month 1

**Phase 2 exit criteria:**
- ✅ New tenant Xero fully configured
- ✅ First month cleanly processed
- ✅ Automation pipeline running for new entity
- ✅ Old entity in maintenance mode

---

## Phase 3 — Annual plan from clean project data (target: early June, 1–2 weeks)

**Goal:** Use perfected project financials to drive strategic decisions re each project's pathway.

### 3.1 Freeze truth (Day 1)
- [ ] Run final project fact-sheet generation
- [ ] Per-project summary for FY26 (12 months of clean data)
- [ ] Export to board pack format
- [ ] Commentary frozen as of FY26 year-end

### 3.2 Per-project strategic question (Day 2–4)

For each active project, answer 4 questions:

#### ACT-GD Goods ($321K earned, 261% self-reliant)
- ✅ **Runway**: profitable, sustainable
- ❓ **Next step**: scale? consolidate? new geographies?
- ❓ **Team**: who owns this? can one person still run it?
- ❓ **R&D vs commercial**: is the commercial work killing the R&D or funding it?

#### ACT-HV The Harvest Witta ($94K earned, 70% self-reliant)
- ✅ **Runway**: 10 months at current burn
- ❓ **Gap to 100%**: $40K more revenue/quarter needed
- ❓ **Revenue channels**: workshops? farm stays? produce? consulting?
- ❓ **Cost reduction**: is $121K spend right-sized?

#### ACT-JH JusticeHub ($0 earned FY26, $1.3K spend)
- ⚠️ **Runway**: zero revenue, dormant
- ❓ **Status**: active project or parked?
- ❓ **Value**: what's the IP/story/asset value?
- ❓ **Decision**: revive with new revenue model OR formally archive

#### ACT-EL Empathy Ledger ($92K earned, 7476% ratio)
- 🎯 **Runway**: profitable but thin spend = mostly unattributed infrastructure cost
- ❓ **Real spend**: what's the true full-cost EL picture? (dev time, SaaS, servers)
- ❓ **Revenue model**: licensing? SaaS? consulting?
- ❓ **Scale**: who could buy this? what's the 10× move?

#### ACT-PI PICC (rolled up $478K earned, 656%)
- 🎯 **Runway**: strongest revenue engine
- ❓ **Concentration risk**: all revenue from one org — diversify?
- ❓ **Sustainability**: is the PICC partnership renewable/expandable?
- ❓ **Learnings**: what made this work? can we replicate?

#### ACT-BG BG Fit ($42K earned, 3528%)
- ✅ **Runway**: profitable on small spend
- ❓ **Scale**: is Brodie's model replicable? franchise?
- ❓ **Product**: what are we actually selling? service? platform?

#### ACT-OO Oonchiumpa ($104K earned, no spend attributed)
- 🎯 **Runway**: revenue side only
- ❓ **True spend**: Ingkerreke + Oonchiumpa = NT community delivery. What's our cost-to-serve?
- ❓ **Partnership model**: similar to PICC? can we expand?

#### ACT-IN Infrastructure ($12K earned, $298K grants, $248K spend)
- 🎯 **Runway**: grant-dependent overhead
- ❓ **Right-sizing**: is $248K the right infrastructure cost for the portfolio?
- ❓ **Allocation**: should some of this load across projects (charge-out model)?
- ❓ **Grant dependency**: what if Snow/Centrecorp don't renew?

### 3.3 Portfolio rebalancing decisions (Day 5)
- [ ] **Invest in**: which 2–3 projects deserve 50%+ of next year's energy?
- [ ] **Maintain**: which keep ticking at current level?
- [ ] **Harvest/close**: which should wind down or archive?
- [ ] **Merge/consolidate**: are any projects redundant or overlapping?

### 3.4 Revenue commitments for FY27 (Day 6–7)
- [ ] Target earned revenue per project
- [ ] Grant pipeline (what to apply for, by when)
- [ ] Self-reliance target per project (e.g. Harvest 100% by Q4 FY27)

### 3.5 Board/stakeholder report (Day 8–10)
- [ ] Generate from dashboard
- [ ] Narrative per project from commentary
- [ ] Self-reliance trend chart across quarters
- [ ] R&D claim pack from FY26 data

**Phase 3 exit criteria:**
- ✅ Per-project decisions documented
- ✅ Investment/maintain/close calls made
- ✅ FY27 revenue targets per project
- ✅ Board/stakeholder report distributed

---

## Cross-cutting: continuous learnings

As each phase runs, record in `thoughts/shared/financials/INDEX.md` bottom section:
- What automation broke and how we fixed it
- Vendor rules added/updated
- Xero quirks discovered
- New habits that stuck
- Patterns to carry to new entity

---

## Timeline overview

| Week | Focus | Deliverable |
|---|---|---|
| Now — Week 2 | Phase 1: gap closure + Bank Rules | Clean Q2+Q3 BAS |
| Week 3 | Accountant review + BAS submission | Q3 BAS lodged |
| Week 4 | New entity admin (registration if needed) | Xero Premium subscribed |
| Week 5 | Phase 2: Day-0 setup new Xero | New tenant live + first week |
| Week 6–7 | Phase 2: Month 1 ramp | Automation validated |
| Week 8–10 | Phase 3: annual strategic review | FY27 plan |

---

## What I (Claude) can do to accelerate each phase

**Phase 1 (this week)**:
- Draft accountant email for BAS-locked drafts
- Build vendor-rule commentary helper (auto-draft R&D narratives per project for Ben to edit)
- Export top-30 Bank Rules config for easy Xero UI entry
- Assist with each gap's chase pattern

**Phase 2 (Day 0 setup)**:
- Build `scripts/export-xero-chart.mjs`
- Build `scripts/seed-new-xero-tenant.mjs` (chart + tracking categories + contact migration)
- Multi-tenant column migration
- Dashboard tenant switcher
- Bank Rules config exporter

**Phase 3 (annual review)**:
- Auto-generate per-project strategy memo templates
- Revenue + grant pipeline aggregation
- Scenario modelling (what-if: HV hits 100%, GD grows 50%, EL scales 3x)
- Board report generator

---

## Risk register (focused)

| Risk | Phase | Mitigation |
|---|---|---|
| Accountant slow to respond on BAS lock | 1 | Start email today, low-effort; carry on other work |
| Bank feeds don't auto-match post-Bank-Rules setup | 2 | Test Week 1, adjust rules |
| Multi-tenant code breaks dashboard | 2 | Roll out behind feature flag |
| Portfolio decisions made on incomplete data | 3 | Don't enter Phase 3 until Phase 1 complete |
| Legal complexity around new entity transfer | 2 | Accountant + lawyer conversation early |

---

## Decision log (to populate as we go)

_Record big calls here as they happen, with reasoning._

- [date] —
- [date] —

---

## References

- [Expert review](spending-intelligence-expert-review.md) — what we've learned
- [v4 automation plan](spending-intelligence-v4-full-automation.md) — phase detail
- [Current handoff](../handoffs/spending-intelligence-v3-handoff.md) — session state
- Dashboard: localhost:3022/finance/self-reliance

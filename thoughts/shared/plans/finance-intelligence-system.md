# ACT Finance Intelligence System — Research Synthesis & Action Plan

**Generated:** 2026-03-11
**Research method:** 6 parallel research agents (Karpathy autoresearch pattern)
**Domains covered:** Dext automation, Xero API, R&D Tax Incentive, loyalty/credit cards, subscription intelligence, current system audit

---

## Executive Summary

ACT's finance automation is already at 96% receipt coverage and has 20+ scripts, a finance dashboard, Telegram bot, and Notion Workers. The next evolution is moving from **reactive bookkeeping** to **proactive financial intelligence** — a system that saves money, earns points, tracks R&D, and surfaces insights automatically.

### The Big Numbers

| Opportunity | Annual Value | Effort | Deadline |
|-------------|-------------|--------|----------|
| R&D Tax Incentive (43.5% refund) | **$63K-$111K cash** | Engage advisor + documentation | **30 April 2026** |
| Qantas Business Rewards (Year 1) | **~240K points ($4,500+)** | Apply + route spend | **31 March 2026** (free join) |
| Nonprofit SaaS discounts | **$3,600-$6,000/yr** | Applications (2-6 week verification) | Ongoing |
| Annual billing switches | **$6,300-$9,600/yr** | One-time switch per vendor | Ongoing |
| Subscription audit (cancel unused) | **$2,000-$4,000/yr** | Review + cancel | Immediate |
| **TOTAL POTENTIAL** | **$80K-$135K/yr** | | |

---

## Part 1: Immediate Actions (This Week)

### 1.1 R&D Tax Incentive — Engage Advisor NOW

**Deadline: 30 April 2026** (7 weeks away)

The R&D Tax Incentive offers a **43.5% refundable tax offset** for companies under $20M turnover. ACT Ventures' AI/software work qualifies:

**Strong R&D candidates:**
- GrantScope: novel matching algorithms, multi-provider LLM architecture, experimental data enrichment
- Telegram AI Agent: 19-tool agent architecture, multi-tool coordination, experimental TTS
- Empathy Ledger: novel platform for narrative sovereignty, experimental community data models

**NOT eligible:** Standard UI development, bug fixes, routine API integrations, Vercel deployments

**Estimated claim (mid-range):** $200K eligible spend → **$87K cash refund** (if tax-loss entity) or **$37K additional benefit** (if profitable)

**Action items:**
- [ ] Contact Standard Ledger ($5,500-$8,800 fixed fee) or Swanson Reed this week
- [ ] Gather FY2025 git commit history as evidence
- [ ] Prepare retrospective time allocation estimate (R&D vs non-R&D)
- [ ] Identify cloud costs attributable to R&D (separate from production)

### 1.2 Qantas Business Rewards — Free Until March 31

**Deadline: 31 March 2026** (20 days)

- [ ] Join QBR free (normally $89.50) at qantas.com/business-rewards — use ACT ABN
- [ ] Apply for NAB Qantas Business Signature Card (150,000 bonus points for $10K spend in 90 days)
- [ ] Set up pay.com.au account (code QBR25 for 25,000 bonus points)
- [ ] Register for Double Status Credits promo (active through Feb 2027)

**Year 1 points estimate:**

| Source | Points |
|--------|--------|
| NAB Qantas Business Sig sign-up | 150,000 |
| NAB ongoing spend (12 months) | 32,000 |
| QBR double-dip on flights | ~5,000 |
| pay.com.au sign-up bonus | 25,000 |
| pay.com.au SaaS routing | 24,000 |
| **Total Year 1** | **~236,000** |

That's 2-3 domestic return flights or a big chunk toward international business class.

### 1.3 Nonprofit Discount Blitz

ACT Foundation (CLG) should qualify for most nonprofit programs. **Estimated savings: $300-500/month.**

**High-value applications to submit immediately:**

| Service | Current Cost? | Nonprofit Benefit | Est. Savings |
|---------|--------------|-------------------|-------------|
| Google Workspace | ~$50/mo | Free for Nonprofits | $50/mo |
| GitHub | ~$20/mo | Free Team plan | $20/mo |
| Canva | ~$15/mo | Free Pro (10 seats) | $15/mo |
| Notion | ~$30/mo | 50% off or free Plus | $15-30/mo |
| 1Password | ~$20/mo | Free Teams | $20/mo |
| Vercel | ~$20/mo | Pro plan discount | ~$10-20/mo |
| AWS | Variable | Imagine Grant ($75K USD cash + $25K credits) | Major |
| Slack | Variable | Free Pro or 85% off | Variable |
| Microsoft | Variable | Free/discounted M365 | $50-200/mo |

**Resources:**
- [software4charities.com](https://software4charities.com/) — searchable directory
- [nonprofitmegaphone.com](https://nonprofitmegaphone.com/blog/100-nonprofit-discounts) — 100+ discounts

---

## Part 2: System Architecture Improvements (Next 2-4 Weeks)

### 2.1 Dext Optimization

**Key finding: Dext has NO public API.** Our Gmail→Dext email forwarding pipeline is the correct approach. Improvements:

**Invoice Fetch (set and forget):**
Dext can automatically log into supplier portals and download invoices weekly. Set up connections for:
- Telstra, AGL, Origin Energy (utilities)
- AWS, Google Cloud (if not already)
- Any other supported supplier at [Dext's fetch partner list](https://help.dext.com/en/articles/416675-list-of-suppliers-for-invoice-fetch)

**Auto-publish rules:**
For predictable recurring expenses (subscriptions, rent, insurance), enable auto-publish in Dext. Items are coded and pushed to Xero without manual review.

**Supplier rules:**
Every vendor should have a Dext supplier rule with default category, tax rate, tracking category, and payment method. Our `config/dext-supplier-rules.json` and `/finance/dext-setup` page support this.

**Consider Hubdoc (free with Xero):**
Hubdoc is included free with all Xero plans. Lower accuracy than Dext (3.3 vs 4.8 stars) but could complement Dext for basic receipt capture. Worth evaluating as a cost-saving measure if Dext monthly fee is a concern.

### 2.2 Xero API Automation Wins

**What we CAN automate (and should):**

| Capability | Current State | Improvement |
|-----------|--------------|-------------|
| Receipt attachments | Match in Supabase only | **Attach receipt images to Xero bank transactions via API** |
| P&L per project | Manual Xero reports | **Pull `Reports/ProfitAndLoss` filtered by tracking category → dashboard** |
| Budget monitoring | Not tracked | **Pull `Reports/BudgetSummary` → alert when over budget** |
| Repeating invoices | Manual in Xero | **Create via API for predictable revenue** |

**What we CANNOT automate (Xero limitations):**
- Bank rules (UI only — no API)
- Reconciliation ("OK" button — UI only)
- Bank feed setup
- GST/BAS lodgement

### 2.3 Subscription Intelligence Layer

**New table: `subscriptions`** in Supabase:
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  xero_contact_name TEXT,
  amount NUMERIC,
  frequency TEXT DEFAULT 'monthly', -- monthly, annual, weekly
  category TEXT, -- software, utilities, insurance, etc.
  next_renewal DATE,
  owner TEXT, -- who manages this subscription
  billing_email TEXT,
  payment_method TEXT, -- which card
  nonprofit_discount_available BOOLEAN DEFAULT FALSE,
  nonprofit_discount_applied BOOLEAN DEFAULT FALSE,
  annual_billing_available BOOLEAN DEFAULT FALSE,
  annual_billing_applied BOOLEAN DEFAULT FALSE,
  usage_notes TEXT,
  status TEXT DEFAULT 'active', -- active, under_review, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**New script: `scripts/detect-subscriptions.mjs`**
- Analyze `xero_transactions` for recurring patterns (same vendor, ~30-day intervals, similar amounts)
- Flag new vendors (subscription creep)
- Flag price increases (>10% from previous period)
- Flag missing charges (vendor disappeared — cancelled or billing issue?)

**Telegram bot additions:**
- `subscription_summary` — monthly total, upcoming renewals, flagged items
- `subscription_alert` — proactive alerts for renewals, price changes, new charges

**Daily briefing additions** (`finance-daily-briefing.mjs`):
- Upcoming renewal reminders (7-day lookahead)
- New vendor alerts
- Monthly subscription spend vs budget

### 2.4 R&D Tracking System

**For FY2026 onward (set up now, document retroactively for FY2025):**

**Git-based tracking:**
- Tag commits with `[RD-XX]` prefix linking to defined R&D activities
- Consider GitClear for automated time estimation from commit patterns

**Xero integration:**
- Add R&D-specific tracking options (or use project codes to flag R&D-eligible projects)
- Tag cloud costs (AWS, Supabase, OpenAI, Anthropic) with R&D vs production split

**New table: `rd_activities`** in Supabase:
```sql
CREATE TABLE rd_activities (
  id TEXT PRIMARY KEY, -- e.g., 'RD-01'
  title TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,
  project_code TEXT, -- links to ACT project codes
  fy TEXT, -- e.g., 'FY2025', 'FY2026'
  is_core BOOLEAN DEFAULT TRUE, -- core vs supporting
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rd_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id TEXT REFERENCES rd_activities(id),
  person TEXT NOT NULL,
  date DATE NOT NULL,
  hours NUMERIC NOT NULL,
  description TEXT,
  git_commits TEXT[], -- array of commit SHAs
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Weekly R&D time logging:**
- Simple Telegram bot command: `/rd_log RD-01 8h "Experimented with multi-provider LLM routing for grant matching"`
- Or weekly form via Notion
- Builds the contemporaneous record that R&D advisors and ATO require

### 2.5 Credit Card Optimization Engine

**Card recommendation system** (add to daily briefing or Telegram bot):

| Category | Best Card | Reason |
|----------|-----------|--------|
| Online SaaS (Amex accepted) | Amex Platinum Business | 2.25 pts/$1 |
| Online SaaS (Amex rejected) | NAB Qantas Business Sig | 0.67 QF pts/$1 |
| Domestic flights | NAB Qantas + QBR | Double-dip points |
| Fuel | BP Plus account | Direct QBR earn |
| Hardware stores | NAB Rewards Business Sig | 2.5 pts/$1 |
| ATO/Government payments | NAB Qantas Business Sig | Same rate as general |

**Track points earned and value:**
- Monthly points earned by source (card, QBR, pay.com.au)
- Running balance estimate
- "Points left on the table" report — flag transactions on wrong card

**FBT considerations:**
- Directors/shareholders earning points on business cards = very low FBT risk
- Keep card in director's name, not company's
- Document business purpose of expenses

---

## Part 3: Notion Agent Intelligence (Ongoing)

### Finance Custom Agent (expand existing)

The existing Notion Worker `financial_summary` tool should be expanded to include:

1. **Subscription Overview** — monthly totals, category breakdown, trend
2. **R&D Spend Summary** — eligible expenditure by activity, running total
3. **Cash Flow Forecast** — 90-day projection from subscriptions + expected revenue
4. **Savings Opportunities** — nonprofit discounts not yet applied, annual billing candidates
5. **Receipt Coverage** — current pipeline status, gap analysis

### Morning Briefing Enhancement

The daily Telegram briefing (`finance-daily-briefing.mjs`) should evolve to include:

```
🌅 Good morning, Ben. Here's your financial pulse:

💰 CASH POSITION
  NAB Business: $XX,XXX (↑$X,XXX from yesterday)

📊 YESTERDAY'S SPEND
  3 transactions totaling $XXX
  ✓ All receipts captured

🔔 THIS WEEK
  - Vercel renewal ($20) on Thursday
  - Anthropic invoice due ($XXX) on Friday

🎯 POINTS UPDATE
  QF balance: ~XX,XXX points
  This month earned: X,XXX points

⚠️ ATTENTION NEEDED
  - HelloFresh price increased 8% ($81 → $87.50)
  - New vendor "Cursor AI" — first charge $20
  - R&D time log: 0 entries this week (please log!)
```

---

## Part 4: Process Efficiency Recommendations

### Receipt Pipeline (current → improved)

**Current flow:**
```
Purchase → Manual scan to Dext → Dext processes → Dext pushes to Xero → Manual reconcile
                                                     ↑
Email receipt → Gmail filter → forward-receipts-to-dext.mjs → Dext email
```

**Improved flow:**
```
Purchase → Dext mobile app (physical) OR Dext Invoice Fetch (digital) OR Gmail auto-forward
  → Dext auto-codes (supplier rules) → Dext auto-publishes (if configured) → Bank Match in Xero
  → One-click reconcile in Xero

Gap detection: correlate-dext-xero.mjs runs daily, flags missing receipts to Telegram
```

**Key efficiency gains:**
1. Invoice Fetch eliminates manual forwarding for supported suppliers
2. Auto-publish eliminates manual review for recurring expenses
3. Bank Match + supplier rules = near-zero-touch reconciliation
4. Daily gap detection catches anything that slips through

### Subscription Lifecycle

```
New subscription detected (detect-subscriptions.mjs)
  → Alert via Telegram: "New vendor: Cursor AI — $20/mo"
  → Check nonprofit discount availability
  → Add to subscriptions table
  → Set up Dext supplier rule
  → Route to optimal credit card

Monthly review (Notion Agent or Telegram):
  → Total spend by category
  → Unused subscriptions flagged
  → Price change alerts
  → Annual billing candidates

Renewal approaching (7-day alert):
  → Telegram: "Vercel renewal in 7 days — $20/mo. Annual = $192/yr (save $48)"
  → Decision: renew, cancel, or switch to annual
```

### R&D Documentation Lifecycle

```
Start experimental work:
  → Create hypothesis doc (markdown in thoughts/rd/)
  → Register R&D activity in rd_activities table
  → Tag commits with [RD-XX]

Weekly:
  → Log time via Telegram: /rd_log RD-01 16h "description"
  → Automated: GitClear generates commit-based time estimates

Monthly:
  → R&D summary in daily briefing: hours logged, spend allocated
  → Notion dashboard: R&D progress by activity

Annually:
  → Export data for R&D advisor
  → Generate AusIndustry-compatible activity descriptions
  → Submit registration before April 30
```

---

## Part 5: Implementation Priority & Phasing

### Phase 0: Urgent Deadlines (This Week)
1. **Join QBR free** (deadline: March 31)
2. **Contact R&D advisor** (deadline: April 30 for FY2025)
3. **Start nonprofit discount applications** (2-6 week verification)

### Phase 1: Quick Wins (Week 1-2)
4. Create `subscriptions` table + populate from Xero transaction patterns
5. Set up Dext Invoice Fetch for supported suppliers
6. Configure Dext auto-publish for recurring expenses
7. Apply for NAB Qantas Business Signature Card

### Phase 2: Intelligence Layer (Week 2-4)
8. Build `detect-subscriptions.mjs` recurring pattern detection
9. Add subscription alerts to daily briefing
10. Create R&D tracking tables + Telegram `/rd_log` command
11. Set up pay.com.au for SaaS double-dip points

### Phase 3: Optimization Engine (Week 4-8)
12. Build per-project P&L dashboard using Xero Reports API
13. Add cash flow forecasting to finance dashboard
14. Build credit card recommendation engine
15. Expand Notion Worker finance tools
16. Monthly AI spend analysis (Claude-powered CFO brief)

### Phase 4: Continuous Improvement (Ongoing)
17. Weekly R&D time logging discipline
18. Monthly subscription review cadence
19. Quarterly nonprofit discount audit
20. Annual: R&D claim preparation, credit card product review

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Subscription management | DIY on Supabase | Already have Xero sync + data pipeline; Cledara at $75/mo not justified for 30 subs |
| Cash flow forecasting | Build basic first, evaluate Float ($59/mo) later | Already have revenue scenarios + financial snapshots infrastructure |
| R&D tracking | Supabase tables + git tagging + weekly Telegram logging | Lightweight, integrated with existing tools |
| Credit card strategy | NAB Qantas Business Sig primary + evaluate Amex Platinum Business | NAB bank relationship, QBR integration, sign-up bonus |
| Receipt automation | Dext Invoice Fetch + auto-publish + existing email forwarding | No Dext API — push automation to edges |
| Financial reporting | Xero Reports API → Supabase → Command Center dashboard | Native API, per-project P&L available |
| Alerting | Telegram bot (proactive) + Notion (dashboard) | Existing infrastructure, zero new cost |

---

## Sources

Full source lists available in individual research reports. Key references:

- **Dext:** [help.dext.com](https://help.dext.com) — Invoice Fetch, auto-publish, supplier rules, Bank Match
- **Xero API:** [developer.xero.com](https://developer.xero.com) — Reports, Attachments, Tracking Categories, rate limits
- **R&D Tax:** [business.gov.au](https://business.gov.au/grants-and-programs/research-and-development-tax-incentive) — registration, software sector guide
- **Loyalty:** [qantas.com/business-rewards](https://qantas.com/au/en/business-rewards/home.html), [pointhacks.com.au](https://pointhacks.com.au)
- **Nonprofit discounts:** [software4charities.com](https://software4charities.com/), [nonprofitmegaphone.com](https://nonprofitmegaphone.com/blog/100-nonprofit-discounts)
- **R&D advisors:** Standard Ledger ($5.5-8.8K fixed), Swanson Reed, Blackwattle Tax

# Phase 1: Build the Engine — Sprint Plan

> **Goal:** First paying customers on Empathy Ledger. R&D tracking started. GrantScope org layer designed.
> **Timeline:** March–August 2026 (6 months)
> **Revenue target:** 2–5 paying EL organisations = $4–30K ARR

---

## Sprint 1.1: Stripe Integration for Empathy Ledger (2 weeks)

### Objective
Get Stripe connected and processing test payments on Empathy Ledger.

### Technical Tasks
- [ ] Install `stripe` + `@stripe/stripe-js` + `@stripe/react-stripe-js` in EL v2
- [ ] Add `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` to env
- [ ] Create Stripe products + prices for 4 tiers (Community/Org/Institution/Enterprise)
- [ ] Build `/api/billing/create-checkout` — Stripe Checkout Session
- [ ] Build `/api/billing/webhook` — handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] Build `/api/billing/portal` — Stripe Customer Portal for self-serve management
- [ ] Create `subscriptions` table in Supabase (org_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end)
- [ ] Add RLS policy: org admins can read their own subscription
- [ ] Wire org creation → Stripe customer creation (sync org to Stripe)
- [ ] Test end-to-end: org signs up → selects plan → pays → subscription active

### Existing Infrastructure to Leverage
- EL already has billing-related enums in DB schema (verified by audit)
- Multi-tenant model (Tenants → Orgs) already exists
- Supabase Auth + RLS already working

### Acceptance Criteria
- Test mode Stripe checkout works end-to-end
- Webhook handles subscription lifecycle events
- Subscription status visible in org settings

### Dependencies
- Stripe account (does ACT have one? Check.)
- Stripe product/price IDs configured

---

## Sprint 1.2: Pricing Page + Tier Management UI (2 weeks)

### Objective
Public pricing page + self-serve plan selection + org billing dashboard.

### Technical Tasks
- [ ] Build `/pricing` public page with 4-tier comparison table
- [ ] Design tier cards: Community (free), Organisation ($299/mo), Institution ($2,499/mo), Enterprise (contact us)
- [ ] Add "Get Started" CTA per tier → routes to signup or checkout
- [ ] Build `/settings/billing` org dashboard page:
  - Current plan + status
  - Usage metrics (stories, storage, API calls)
  - "Upgrade Plan" button → Stripe Checkout
  - "Manage Billing" button → Stripe Customer Portal
  - Invoice history (from Stripe API)
- [ ] Add plan badge to org header/sidebar
- [ ] Feature gate logic: `canAccess(feature, orgPlan)` utility function
- [ ] Implement soft gates first (show upgrade prompts, don't hard-block)

### Copy/Brand
- Use ACT brand palette (ochre, sage, terracotta)
- Cross-subsidy messaging: "Your subscription funds free access for communities"
- No feature restrictions on Community tier — differentiate on support, SLA, API access, white-label

### Acceptance Criteria
- Pricing page looks professional and communicates value
- Org admins can see their plan and manage billing
- Feature gates work but don't break Community tier

---

## Sprint 1.3: Self-Serve Organisation Signup Flow (2 weeks)

### Objective
New organisations can onboard and start using EL without ACT manually creating accounts.

### Technical Tasks
- [ ] Build `/onboard` flow: Create account → Create/join org → Select plan → Configure workspace
- [ ] Step 1: Email + password signup (already exists via Supabase Auth)
- [ ] Step 2: Organisation creation form (name, type, size, sector)
- [ ] Step 3: Plan selection (pre-selected if coming from pricing page)
- [ ] Step 4: Workspace setup (invite team, configure cultural protocols)
- [ ] Auto-create Community tier for orgs that skip payment
- [ ] Email welcome sequence trigger (via Supabase Edge Function or webhook)
- [ ] Admin notification when new org signs up (Telegram bot alert)

### Acceptance Criteria
- Complete self-serve signup in under 5 minutes
- Community tier orgs get full access immediately (no approval gate)
- Paid tier orgs directed to Stripe checkout
- ACT team gets notified of new signups

---

## Sprint 1.4: Usage Metering + Tier Enforcement (2 weeks)

### Objective
Track usage metrics per org. Soft-enforce tier limits.

### Technical Tasks
- [ ] Define usage metrics per tier:

| Metric | Community | Organisation | Institution | Enterprise |
|--------|-----------|-------------|-------------|-----------|
| Stories | Unlimited | Unlimited | Unlimited | Unlimited |
| Storage | 5 GB | 50 GB | 500 GB | Unlimited |
| API calls | 1K/month | 10K/month | 100K/month | Unlimited |
| Team members | 5 | 25 | Unlimited | Unlimited |
| Custom branding | No | Yes | Yes | Yes |
| API access | No | Yes | Yes | Yes |
| White-label | No | No | Yes | Yes |
| SLA | Best effort | 48h response | 24h response | 4h response |
| Priority support | No | Email | Email + call | Dedicated |

- [ ] Create `org_usage` table (org_id, metric, current_value, period_start, period_end)
- [ ] Build usage tracking middleware (increment counters on API calls, story creates, uploads)
- [ ] Build `/api/billing/usage` endpoint for dashboard display
- [ ] Add usage progress bars to billing dashboard
- [ ] Implement soft limits: show warning at 80%, upgrade prompt at 100%
- [ ] DO NOT hard-block Community tier — they get the same features, just lower limits on scale metrics

### Acceptance Criteria
- Usage tracked accurately per org per billing period
- Dashboard shows current usage vs limits
- Upgrade prompts appear at thresholds (not hard blocks)

---

## Sprint 1.5: First 3 Paying Customers (4 weeks — outreach)

### Objective
Get 3 organisations paying for Empathy Ledger.

### Warm Leads
1. **Palm Island Community Company (PICC)** — Active EL user, strong relationship
2. **Oonchiumpa** — Active EL user, cross-cultural proof point
3. **SNAICC** — Connected, conference platform interest
4. **Snow Foundation** — Existing funder relationship
5. **Orange Sky** — Nick's network, natural fit

### Outreach Plan
- [ ] Create 1-page "Empathy Ledger for Organisations" PDF/landing page
- [ ] Personalise pitch for each org (what EL solves for them specifically)
- [ ] Offer **3 months free on Organisation tier** as founding customer deal
- [ ] Schedule demos with decision makers
- [ ] Track in GHL pipeline (Empathy Ledger > Sales)

### Pricing Strategy for Founding Customers
- First 10 customers: 50% off for 12 months ("Founding Partner" rate)
- Organisation tier: $149/mo (normally $299/mo)
- Institution tier: $1,249/mo (normally $2,499/mo)
- Lock in the discount as long as they remain subscribed

### Acceptance Criteria
- 3 organisations on paid plans (even if discounted)
- MRR > $400 (3 × $149)
- Each org actively using the platform (not just paying)

---

## Sprint 1.6: GrantScope Auth + User Accounts (4 weeks)

### Objective
Add team/org model to GrantScope so it can become a multi-tenant SaaS.

### Technical Tasks
- [ ] Design `organizations` table (id, name, type, created_by, plan, stripe_customer_id)
- [ ] Design `org_members` table (org_id, user_id, role: admin|editor|viewer, invited_at, accepted_at)
- [ ] Migrate `saved_grants` and `saved_foundations` from `user_id` → `org_id` foreign key
- [ ] Update RLS policies: filter by org_id via org_members lookup
- [ ] Build org creation flow (post-signup)
- [ ] Build team invitation flow (invite by email)
- [ ] Add org switcher to header (for users in multiple orgs)
- [ ] Update tracker pages to show org-shared data (not just personal)

### Data Model
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT, -- 'nfp', 'foundation', 'government', 'corporate', 'community'
  abn TEXT,
  plan TEXT DEFAULT 'community', -- 'community', 'professional', 'enterprise'
  stripe_customer_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer', -- 'admin', 'editor', 'viewer'
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(org_id, user_id)
);
```

### Acceptance Criteria
- Users can create organisations
- Team members can be invited and join
- Saved grants/foundations are shared within org
- RLS prevents cross-org data leakage

---

## Sprint 1.7: GrantScope Multi-Tenant DB Redesign (4 weeks)

### Objective
Ensure all GrantScope data queries respect org boundaries.

### Technical Tasks
- [ ] Audit all API routes for user_id references → convert to org-aware
- [ ] Add org_id to all user-facing tables
- [ ] Create org-scoped views for common queries
- [ ] Add `charity_claims` org support (claim a charity for your org)
- [ ] Build org dashboard with aggregated grant/foundation data
- [ ] Add org-level settings (notification preferences, data sharing)
- [ ] Performance test RLS policies under multi-tenant load
- [ ] Security audit: verify no cross-org data leakage

### Acceptance Criteria
- No API route returns data from another org
- RLS policies verified via test suite
- Org dashboard shows correct aggregate data

---

## Sprint 1.8: R&D Time Tracking + Documentation (Ongoing)

### Objective
Be claim-ready for R&D Tax Incentive by June 30, 2026.

### Tasks
- [ ] **Git commit tagging**: Add `[R&D]` prefix to commits involving novel R&D work
- [ ] **Time tracking**: Set up simple time log (spreadsheet or tool) for dev hours per project
- [ ] **Activity documentation**: Monthly summary of R&D activities per platform:
  - What technical uncertainty was being resolved?
  - What experiments were tried?
  - What was the outcome?
- [ ] **Engage R&D tax advisor**: Get referral, engage by end of March
- [ ] **Structure review**: Confirm ACT Ventures is NOT controlled by ACT Foundation (critical for 43.5% refund)
- [ ] **Register with AusIndustry**: Submit advance finding application if advisor recommends

### R&D Activity Log Template
```markdown
## [Month] [Year] — R&D Activities

### Platform: [Empathy Ledger / GrantScope / JusticeHub]

**Technical Uncertainty:**
What problem couldn't be solved with existing knowledge?

**Hypothesis:**
What approach did we try?

**Experiments:**
- [Commit hash] — [description]
- [Commit hash] — [description]

**Outcome:**
Did it work? What was learned?

**Hours:** [X hours]
```

### Eligible Activities (Strong Claims)
1. **Consent-first data sovereignty architecture** — No existing solution for OCAP-compliant digital storytelling
2. **Multi-provider LLM enrichment pipeline** — Auto-rotation across 8 AI providers with quality scoring
3. **Embedding-based semantic grant matching** — Novel approach to Australian grants discovery
4. **Cultural protocol enforcement in software** — Elder review workflows, sensitivity gating
5. **Privacy-preserving community analytics** — Aggregate insights without individual identification

### Acceptance Criteria
- Monthly R&D logs maintained from March onwards
- Tax advisor engaged by end of March
- Structure confirmed (Ventures independence from Foundation)
- All commit history preserved as evidence

---

## Phase 1 Budget Summary

| Item | Cost | When |
|------|------|------|
| R&D tax advisor | $5–10K | Month 1 |
| Stripe fees (2.9% + 30¢) | ~$15/mo initially | Month 2+ |
| Marketing materials | $2–5K | Month 3 |
| Part-time BD (optional) | $0–20K | Month 4+ |
| **Total Phase 1** | **$7–35K** | |

## Phase 1 Revenue Target

| Source | Amount | When |
|--------|--------|------|
| 3 EL founding customers @ $149/mo | $5.4K ARR | Month 4 |
| R&D Tax Refund (claim in FY27) | $43–87K | Month 12-14 |
| Grants (Mannifera, others) | $50–150K | Ongoing |
| **Total Year 1** | **$98–242K** | |

---

## Decision Points

Before starting Sprint 1.1, confirm:

1. **Does ACT have a Stripe account?** If not, create one for ACT Ventures (not Foundation).
2. **ACT Ventures ABN** — Needs to be the billing entity, not Foundation.
3. **Pricing validation** — Are these prices right for the Australian NFP sector? Test with PICC/Oonchiumpa.
4. **EL v2 deployment** — Is it stable enough for paying customers? Any critical bugs?
5. **Legal** — Terms of Service, Privacy Policy needed before taking payments.

---

## Sprint Sequence (Gantt-style)

```
Month 1     Month 2     Month 3     Month 4     Month 5     Month 6
|-----------|-----------|-----------|-----------|-----------|-----------|
[== 1.1 ==]                                                              Stripe
            [== 1.2 ==]                                                  Pricing UI
                        [== 1.3 ==]                                      Self-serve signup
                                    [== 1.4 ==]                          Usage metering
                        [======== 1.5 ========]                          Customer outreach
                                    [======== 1.6 ========]              GS Auth
                                                [======== 1.7 ========]  GS Multi-tenant
[======================== 1.8 ==========================================] R&D tracking
```

Sprints 1.1–1.4 are sequential (each builds on the last).
Sprints 1.5–1.7 can run in parallel with 1.3–1.4.
Sprint 1.8 runs continuously.

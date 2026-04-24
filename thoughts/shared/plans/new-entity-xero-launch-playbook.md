# New-Entity Xero Launch Playbook

**Status:** Ready to execute when new Pty Ltd Xero is live.
**Estimated duration:** 1–2 hours Day 0, 1 week ramp.
**Owner:** Ben (with Claude assist at each step).

---

## Prerequisites (before Day 0)

- [ ] New Pty Ltd is **ASIC-registered** with ABN + TFN + GST registration
- [ ] **NAB business accounts opened** — cheque + Visa (fresh cards, not shared with current entity)
- [ ] Accountant briefed on cutover plan; cutover date agreed
- [ ] Xero **Premium 10, 20, or 50** subscription ordered (Premium is required for multi-currency — non-negotiable given USD SaaS spend)
- [ ] New tenant's **OAuth app registration** complete:
  - Either: add new tenant to existing Xero app in developer.xero.com
  - Or: create fresh app for new entity
- [ ] Confirm you have admin access on new Xero

---

## Day 0 — ~90 minutes to full configuration

### Step 1 — Auth with new tenant (5 min)
```bash
node scripts/xero-auth.mjs
# Pick NEW tenant when prompted
# This overwrites .xero-tokens.json + .env.local XERO_TENANT_ID
```
- [ ] Confirm `XERO_TENANT_ID` in `.env.local` matches new tenant UUID
- [ ] Test connection: `node scripts/sync-xero-tokens.mjs` → "✅ All three stores are now in sync"

### Step 2 — Import chart of accounts (10 min)
```bash
# Already exported: config/xero-chart-import.csv (105 accounts)
```
- [ ] Xero (new tenant) → Accounting → Chart of accounts → **Import**
- [ ] Upload `config/xero-chart-import.csv`
- [ ] Review any duplicates / conflicts Xero flags — usually reserved codes
- [ ] Save. ~105 accounts created.

### Step 3 — Seed tracking categories (5 min, scripted)
```bash
node scripts/seed-xero-tracking.mjs              # dry-run first
node scripts/seed-xero-tracking.mjs --confirm    # apply
```
- [ ] Creates Business Divisions (4 options: A Curious Tractor, Eco-tourism, Farm Activities, Rental)
- [ ] Creates Project Tracking (44+ ACT-XX options)
- [ ] Verify in Xero → Accounting → Settings → Tracking Categories

### Step 4 — Verify tax rates (5 min, manual check)
- [ ] Xero → Accounting → Tax Rates
- [ ] Confirm present (AU defaults usually already there):
  - GST on Expenses (10%)
  - GST on Income (10%)
  - GST Free Income / Expenses
  - BAS Excluded
- [ ] Any custom rates from `config/xero-chart.json.tax_rates` → add manually if missing

### Step 5 — Connect bank feeds (10 min, manual — external provider auth)
- [ ] Xero → Accounting → Bank accounts → **Add bank account**
- [ ] Connect NAB business cheque
- [ ] Connect NAB business Visa
- [ ] Initial balances set as of cutover date (from NAB statement)
- [ ] Bank feed usually starts flowing within 24h

### Step 6 — Configure top 30 Bank Rules (30 min, manual — see guide)
- [ ] Open `thoughts/shared/financials/xero-bank-rules-setup-guide.md` side-by-side
- [ ] Xero → Bank Rules → Create Rule (Spend Money)
- [ ] Work through all 30 rows
- [ ] **THIS STEP IS NON-NEGOTIABLE** — saves 5 hr/month forever

### Step 7 — Multi-currency toggle (1 min)
- [ ] Xero → Settings → General Settings → Currencies
- [ ] Add USD (and any other foreign currencies you bill/pay in)

### Step 8 — Migrate contacts (15 min, scripted)
```bash
# Export from OLD tenant
node scripts/migrate-xero-contacts.mjs --phase export
# → writes config/xero-contacts-export.json

# Import into NEW tenant
node scripts/migrate-xero-contacts.mjs --phase import --limit 20              # test 20
node scripts/migrate-xero-contacts.mjs --phase import --confirm               # full run
```
Supports `--filter "PICC"` for selective migration.
- [ ] Verify PICC, Snow Foundation, Ingkerreke, etc. present in new tenant

### Step 9 — Install Xero Me on phone (5 min)
- [ ] App Store → Xero Me → install
- [ ] Log in with new tenant
- [ ] Test snap a receipt → verify lands in new tenant's Inbox

### Step 10 — Gmail forward setup (5 min)
- [ ] Xero (new tenant) → Business → Files → Settings → "Send files to Xero by email"
- [ ] Copy the `xxxxx@xerofiles.com` address
- [ ] Gmail → Filters → create filter:
  - From: `receipts@stripe.com OR receipts@vercel.com OR receipts@* OR billing@*`
  - Action: Forward to Xero inbox address
- [ ] Verify by emailing a test receipt

---

## Day 0 — test the pipeline

### Step 11 — Test push-receipts pipeline (5 min)
```bash
node scripts/push-receipts-to-xero.mjs --dry-run --limit 3
```
- [ ] Script should connect to NEW tenant (verify by seeing its vendor list)
- [ ] Flip off dry-run when confident:
```bash
node scripts/push-receipts-to-xero.mjs --limit 3
```
- [ ] Bills appear in new tenant's Drafts

### Step 12 — Test sync (5 min)
```bash
node scripts/sync-xero-to-supabase.mjs full
```
- [ ] Fetches new tenant's invoices + transactions
- [ ] Verify: `SELECT COUNT(*) FROM xero_invoices WHERE xero_tenant_id = '<new-tenant-uuid>'`
- [ ] Should grow as new bills land

### Step 13 — Smoke test dashboard (5 min)
- [ ] Open `/finance/self-reliance`
- [ ] Should show new tenant's data once bills/invoices flow in
- [ ] If there's a tenant selector (future): pick new tenant

---

## Week 1 habits (NON-NEGOTIABLE)

### Daily (2 min)
- [ ] Open Xero → NAB Visa reconcile view
- [ ] Accept Bank Rule suggestions (should cover 80%)
- [ ] Create/Match for anything new

### End of week (10 min)
- [ ] Confirm all receipts captured (Xero Me app or Gmail forward)
- [ ] Check `/finance/self-reliance` dashboard reflects reality
- [ ] Note any new vendors that should become Bank Rules

---

## Month 1 success criteria

- [ ] >80% of bank lines auto-coded by Bank Rules
- [ ] <5 receipts stuck in review >14 days
- [ ] All transactions have Project Tracking
- [ ] Self-reliance dashboard matches Xero P&L
- [ ] First month BAS prep takes <30 min

---

## Common pitfalls (and how to avoid)

| Pitfall | Symptom | Fix |
|---|---|---|
| Skip Bank Rules setup | Manual reconciliation hell | Spend 30 min day 0 — saves forever |
| Post-reconcile tracking fix attempts | API rejects — Xero locks reconciled | Always code BEFORE reconciling |
| Wrong project on Uber (business vs personal mix) | Mis-attribution | Override at reconcile time, not after |
| Duplicate bills from connectors | Xero flags 23+ sets | Push script's dedupe check catches; don't re-run bulk pushes |
| Multi-currency not enabled | USD bills post as AUD with FX notes | Enable on day 0 — Premium plan required |
| `XERO_TENANT_ID` set wrong | Data syncs to wrong tenant | Always verify `.env.local` before ANY sync run |

---

## What not to do

❌ Don't backfill historical transactions from old entity — they'd have wrong dates.
❌ Don't retroactively re-reconcile things Xero has already locked.
❌ Don't skip Bank Rules thinking "I'll do it later."
❌ Don't let Draft bills accumulate without approving weekly.
❌ Don't turn off the weekly cron without understanding what it does.

---

## Scripts reference

| Script | Purpose | When to run |
|---|---|---|
| `xero-auth.mjs` | OAuth with tenant | Once per tenant setup |
| `sync-xero-tokens.mjs` | Keep tokens fresh | Cron + as-needed |
| `sync-xero-to-supabase.mjs` | Pull invoices + txns to mirror | Daily/hourly |
| `push-receipts-to-xero.mjs` | Create Draft bills from receipts | As receipts ingested |
| `seed-xero-tracking.mjs` | Create tracking categories/options | Once per new tenant |
| `migrate-xero-contacts.mjs` | Copy contacts old→new | Once per new tenant |
| `chart-to-csv.mjs` | Convert chart JSON → CSV | Before tenant launch |
| `generate-project-financials.mjs` | Private fact sheets | Weekly cron |
| `weekly-reconciliation.mjs` | Tag + match + learn | Monday 8am cron |

---

## Exit criteria for this playbook

- ✅ New tenant fully configured
- ✅ Day-0 smoke tests passed
- ✅ Week 1 daily reconciliation rhythm established
- ✅ Month 1 >80% automation achieved
- ✅ First BAS prep demonstrably faster than old entity

Once these hit, the new entity is operationally healthy. Start thinking about the Phase 3 annual review.

---

## References

- `thoughts/shared/plans/spending-intelligence-v4-full-automation.md`
- `thoughts/shared/plans/spending-intelligence-expert-review.md`
- `thoughts/shared/plans/bas-perfection-to-annual-plan-roadmap.md`
- `thoughts/shared/financials/xero-bank-rules-setup-guide.md`
- `thoughts/shared/financials/accountant-email-bas-lock.md`
- `config/xero-chart.json`, `config/xero-chart-import.csv`

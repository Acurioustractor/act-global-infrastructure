# Xero Agentic System — Complete Review + BAS Closeout + Pty Ltd Migration Plan

**Created:** 2026-03-17
**Updated:** 2026-03-17
**Entity:** Nicholas Marchesi T/as A Curious Tractor (ABN 21 591 780 066)
**Xero Plan:** GROW (Business edition)
**Entity Type:** INDIVIDUAL (sole trader)
**GST Basis:** CASH, Quarterly (QUARTERLY1)
**FY End:** June 30

---

## PART 1: CURRENT SYSTEM AUDIT — What We Have

### Xero Configuration
- **4 bank accounts:** NAB Everyday, NAB Maximiser, NAB Visa CC, NM Personal (+ 1 archived Heritage Visa)
- **71 expense accounts** with proper tax types (INPUT, EXEMPTEXPENSES, BASEXCLUDED, CAPEXINPUT)
- **7 revenue accounts** (Sales Rent, Eco-tourism, Consulting, Travel, Grants, Other, Interest)
- **2 tracking categories:** Business Divisions (5 options) + Project Tracking (45 options)
- **772 supplier contacts** — most missing email + ABN (data quality gap)
- **4 repeating invoices** — only 1 active (Green Fox Training $5,500/mo)
- **1 budget** (Overall) — approved but likely stale
- **75 manual journals** — mostly GST clearing + Witta property entries
- **11 tax rates** configured (standard AU GST setup)

### Automation Pipeline (Built This Session)
| Component | Script | Cron | Status |
|-----------|--------|------|--------|
| Xero sync | `sync-xero-to-supabase.mjs` | Every 6hrs | Working |
| Receipt capture | `capture-receipts.mjs` | Every 6hrs | Working |
| Receipt matching | `match-receipts-to-xero.mjs` | Daily 7am | Working (low match rate) |
| Upload to Xero | `upload-receipts-to-xero.mjs` | Daily 8am | Working (attachments scope fixed) |
| Project tagging | `tag-xero-transactions.mjs` | Daily 9am | Working (Supabase + Xero) |
| Calendar suggestions | `suggest-receipts-from-calendar.mjs` | Weekly Mon | Working |
| Reconciliation checklist | `generate-reconciliation-checklist.mjs` | Monthly 1st | Working |
| Financial advisor | `financial-advisor-agent.mjs` | Weekly | Built, needs testing |
| R&D activity log | `generate-rd-activity-log.mjs` | On-demand | Built |

### Data Coverage (FY26)
| Quarter | Transactions | Tagged | With Receipts |
|---------|-------------|--------|---------------|
| Q1 (Jul-Sep 2025) | 526 | 98% | 0% |
| Q2 (Oct-Dec 2025) | 649 | 100% | 9% |
| Q3 (Jan-Mar 2026) | 322 | 90% | 26% |
| **Total FY26** | **1,497** | **96%** | **9%** |

### Vendor Rules
- 332 unique vendors mapped to 18 project codes
- 60+ manual aliases for vendor name variations

---

## PART 2: WHAT'S MISSING — Gaps for a Complete Agentic System

### Gap 1: Vendor Contact Data Quality
**Problem:** 772 supplier contacts, almost none have email addresses or ABNs.
**Impact:** Can't auto-request missing receipts, can't validate GST claims against vendor ABN.
**Fix:**
- [ ] **Enrich vendor contacts from Xero invoices** — many bills have ABN in line items/notes
- [ ] **Cross-reference ABR (Australian Business Register)** — lookup ABN by business name
- [ ] **Extract emails from Gmail correspondence** — we already have `ghl_contacts` with emails
- [ ] Build `scripts/enrich-xero-contacts.mjs` — writes ABN + email back to Xero Contacts API
- [ ] Add to vendor_project_rules: `abn`, `email`, `default_account_code`

### Gap 2: Account Code Automation
**Problem:** Transactions get categorised by the accountant manually. We tag projects but not account codes.
**Impact:** Slow reconciliation — accountant has to classify every transaction.
**Fix:**
- [ ] Build `vendor_account_rules` table — map vendor → default account code (e.g., Qantas → 493 Travel National)
- [ ] Enhance `tag-xero-transactions.mjs` to also set account codes on new (un-reconciled) transactions
- [ ] Learn from historical patterns: "Uber always goes to 452 Parking/Tolls/Taxis"
- [ ] For USD vendors (OpenAI, Webflow, Vercel): handle FX and map to correct account

### Gap 3: Receipt Coverage Is Still Terrible (9% FY26)
**Problem:** 1,356 of 1,497 FY26 transactions have no receipt attached.
**Impact:** $6,386 GST at risk, R&D refund reduced, ATO audit vulnerability.
**Root causes:**
1. **Q1 has 0% coverage** — predates our receipt system. Retrospective capture needed.
2. **Qantas ($52K+) and Uber ($8.6K)** require manual portal downloads — can't be auto-captured from email
3. **Small vendors** (cafes, hardware, fuel) — physical receipts never digitised
4. **Dext receipts (522 in "review")** have amounts but no matching Xero entries — may be from a different date range

**Fix:**
- [ ] **Batch download Qantas receipts** from Qantas Business portal (USER ACTION)
- [ ] **Batch download Uber receipts** from Uber Business dashboard (USER ACTION)
- [ ] **Backfill Q1 receipts** — search Gmail for Jul-Sep 2025 vendor emails
- [ ] **Re-score 522 "review" receipts** — many may match if we widen date/amount tolerance
- [ ] **Add fuzzy matching** — GST-inclusive vs GST-exclusive amount comparison (receipt $110 vs Xero $100 + $10 GST)
- [ ] Set up **Xero Receipt Bank** (mobile app) for physical receipt capture going forward

### Gap 4: Business Division Tracking Is Underused
**Problem:** Xero has 2 tracking categories — "Business Divisions" (5 options) and "Project Tracking" (45 options). Only Project Tracking is used by our automation.
**Impact:** Can't generate P&L by business division (ACT vs Eco-tourism vs Farm vs Rentals).
**Fix:**
- [ ] Map project codes to business divisions: ACT-* → "A Curious Tractor", ACT-FM/ACT-HV → "Farm Activities", etc.
- [ ] Enhance `tag-xero-transactions.mjs` to set BOTH tracking categories
- [ ] Create mapping table: `project_to_division` in Supabase

### Gap 5: Receivables Are Unmanaged
**Problem:** $300,900 outstanding receivables, $93K seriously overdue (>200 days).
**Impact:** Cash flow, and some may need to be written off (affects BAS).
**Fix:**
- [ ] Build `scripts/chase-overdue-invoices.mjs` — generates reminder emails per debtor
- [ ] Triage: collectible vs write-off (Rotary $82.5K, Social Impact Hub $10.8K, Aleisha Keating $4K)
- [ ] Bad debt write-off process for truly uncollectible amounts (account 406)
- [ ] Weekly Telegram alert for invoices >30 days overdue

### Gap 6: Payables Reconciliation
**Problem:** 262 AUTHORISED payable invoices totalling $190,827.
**Impact:** Some may be already paid but not matched in Xero. Inflates liabilities on balance sheet.
**Fix:**
- [ ] Cross-reference AUTHORISED payables against bank transactions — auto-match by amount/date/vendor
- [ ] Flag likely-paid bills for accountant to approve
- [ ] Clean up aged payables (Virgin $8.4K 400+ days — probably reconciliation error)

### Gap 7: No Automated BAS Preparation
**Problem:** BAS prep is manual — accountant reviews everything in Xero UI.
**Impact:** Slow, error-prone, expensive accountant time.
**Fix:**
- [ ] Build `scripts/prepare-bas.mjs` — generates full BAS worksheet:
  - G1 (Total sales): from ACCREC invoices paid in quarter (CASH basis)
  - G10 (Capital purchases): from CAPEXINPUT coded transactions
  - G11 (Non-capital purchases): from INPUT coded transactions
  - 1A (GST collected): 10% of G1
  - 1B (GST paid): 10% of (G10 + G11)
  - Adjustments for bad debts, FX, private use
- [ ] Cross-check: every INPUT/CAPEXINPUT transaction should have a receipt
- [ ] Generate "BAS confidence score" — % of GST claims with full documentation
- [ ] Export checklist + data pack for accountant

### Gap 8: R&D Documentation Is Incomplete
**Problem:** R&D spend of $139.5K across 642 transactions, mostly without receipts.
**Impact:** 43.5% refundable offset at risk — potential $60K+ refund reduction.
**Fix:**
- [ ] Enhanced R&D activity log linking: git commits + calendar events + Xero transactions
- [ ] Separate "core R&D" from "supporting R&D" projects
- [ ] Generate AusIndustry-format activity report
- [ ] Ensure every R&D transaction has receipt (prioritise high-value)

---

## PART 3: BAS CLOSEOUT — April 28 Deadline (Q3 FY26, Jan-Mar 2026)

### What the Accountant Needs

1. **All Q3 transactions reconciled** in Xero
   - Current: 322 transactions, 90% tagged
   - Action: Tag remaining 31, ensure bank feeds are current

2. **GST calculations ready**
   - G1 (Sales): Check ACCREC invoices paid in Jan-Mar
   - G10/G11 (Purchases): Verify INPUT/CAPEXINPUT coding
   - Reconciliation checklist generated ✅

3. **Receipt documentation** for INPUT tax credit claims
   - Current: 26% coverage (83/322)
   - Priority: Qantas ($8.9K), Uber ($2.7K), large one-off purchases
   - Every dollar without a receipt risks losing the 10% GST credit

4. **Outstanding receivables reviewed**
   - Under CASH basis: only paid invoices count for GST
   - But aged debtors need triage: chase, write off, or leave

5. **Payables reconciliation**
   - Ensure paid bills are marked as paid
   - Check if AUTHORISED payables from Q3 have matching bank payments

### BAS Prep Automation Script (`prepare-bas.mjs`)

Should generate:
```
Q3 FY26 BAS WORKSHEET (Cash Basis)
====================================
G1  Total Sales              $XXX,XXX
G2  Export sales              $X,XXX
G3  GST-free sales            $X,XXX
G10 Capital purchases         $X,XXX
G11 Non-capital purchases     $XX,XXX

1A  GST on sales              $X,XXX
1B  GST on purchases         -$X,XXX
    Net GST position          -$X,XXX (refund/payment)

CONFIDENCE:
  Receipts: XX% of purchases documented
  Tagging:  XX% of transactions coded
  Reconciled: XX% of bank lines matched

ACTION ITEMS:
  - X transactions need receipts (GST at risk: $X,XXX)
  - X transactions need project codes
  - X payables may be already paid
  - X receivables need follow-up
```

---

## PART 4: SOLE TRADER CLOSEOUT + PTY LTD MIGRATION

### What Makes This System Portable

Everything we've built is **Supabase-first, Xero-second**:

| Data | Supabase | Xero | Portable? |
|------|----------|------|-----------|
| Vendor → project rules | ✅ `vendor_project_rules` | ❌ | ✅ Fully portable |
| Receipt pipeline | ✅ `receipt_emails` | Attachments only | ✅ Portable |
| Transaction history | ✅ `xero_transactions` | ✅ Source of truth | ✅ Re-sync from new Xero |
| Invoice history | ✅ `xero_invoices` | ✅ Source of truth | ✅ Re-sync |
| Tracking categories | ✅ Cached | ✅ Source of truth | ⚠️ Recreate in new Xero |
| Chart of accounts | ❌ Not cached | ✅ Source of truth | ⚠️ Recreate in new Xero |
| Contact enrichment | ✅ Can build | Partial | ✅ Push to new Xero |
| Gmail receipts | ✅ Source of truth | ❌ | ✅ Fully portable |

### Migration Playbook

When new Pty Ltd is set up (target July 1, 2026):

1. **Export from current Xero:**
   - Chart of accounts (we now have full audit)
   - Contact list (772 suppliers + enrichment)
   - Tracking categories (2 categories, 50 options)
   - Repeating invoices
   - Opening balances

2. **Set up new Xero org:**
   - Import chart of accounts (match codes exactly)
   - Recreate tracking categories with SAME names (our scripts use names, not IDs)
   - Import contacts with ABN/email
   - Set up bank feeds for new bank accounts
   - Configure OAuth app with same scopes

3. **Update our scripts:**
   - Change `XERO_TENANT_ID` in .env.local
   - Re-auth OAuth: `node scripts/xero-auth.mjs`
   - Run `sync-xero-to-supabase.mjs full` to populate
   - Verify tracking category IDs (they'll be different)
   - `xero-tracking.mjs` uses names not IDs — should work automatically

4. **Final sole trader BAS:**
   - Q4 FY26 (Apr-Jun 2026) — last BAS under ABN 21 591 780 066
   - Ensure all transactions to June 30 are reconciled
   - Final income tax return covers full FY26
   - R&D registration under sole trader for FY26

5. **Opening balance in new Pty Ltd:**
   - Transfer assets at market value
   - Record in both Xero orgs
   - New ABN, new GST registration

### What to Cache/Export NOW (Before Migration)

- [ ] **Full chart of accounts** — ✅ Done (in audit report)
- [ ] **All tracking categories + option IDs** — ✅ Done (in audit report)
- [ ] **All contacts with ABN** — need enrichment
- [ ] **Vendor → project → account code rules** — in `vendor_project_rules`
- [ ] **Receipt history** — all in Supabase `receipt_emails`
- [ ] **Transaction history** — all in Supabase `xero_transactions` + `xero_invoices`
- [ ] **Budget data** — minimal (1 overall budget)
- [ ] **Repeating invoice templates** — 1 active (Green Fox)

---

## PART 5: IMPLEMENTATION PRIORITIES

### Immediate (This Week) — BAS Focus
1. [ ] **Build `prepare-bas.mjs`** — automated BAS worksheet generator
2. [ ] **Enrich vendor contacts** — ABN lookup from ABR for top 50 vendors
3. [ ] **Add account code rules** — map top 50 vendors to default account codes
4. [ ] **Chase Qantas + Uber receipts** (manual portal downloads)
5. [ ] **Fix payables** — cross-reference AUTHORISED vs bank transactions

### Short-Term (Before April 28 BAS)
6. [ ] **Backfill Q1 receipts** from Gmail (Jul-Sep 2025)
7. [ ] **Business division tagging** — set both tracking categories
8. [ ] **Bad debt triage** — Rotary, Social Impact Hub, Aleisha Keating
9. [ ] **BAS confidence dashboard** — command center page showing readiness
10. [ ] **Improve matcher** — GST-inclusive/exclusive fuzzy matching, wider date tolerance

### Medium-Term (Before June 30 FY End)
11. [ ] **R&D documentation pack** for AusIndustry registration
12. [ ] **Asset register review** — $20K instant write-off before expiry
13. [ ] **Super contribution max-out** — $30K cap
14. [ ] **Pre-pay subscriptions** — deductible at sole trader marginal rate
15. [ ] **Pty Ltd paperwork** — ASIC reservation, constitution, director appointments

### Post-Migration (July 2026+)
16. [ ] **New Xero setup** with imported chart of accounts + contacts
17. [ ] **Parallel run** — both Xero orgs for transition period
18. [ ] **Final sole trader BAS** — Q4 FY26
19. [ ] **First Pty Ltd BAS** — Q1 FY27

---

## PART 6: SUCCESS METRICS

| Metric | Current | Target (BAS) | Target (FY End) |
|--------|---------|-------------|-----------------|
| Q3 transactions tagged | 90% | 100% | 100% |
| Q3 receipt coverage | 26% | 60% | 80% |
| GST claims documented | ~25% | 90% | 95% |
| Accountant reconciliation time | 2+ hrs/mo | 30 min | 15 min |
| Vendor contacts with ABN | ~0% | 50% | 80% |
| Receivables >90 days | $93K | $20K | $5K |
| R&D documentation complete | 10% | 50% | 95% |
| BAS confidence score | Low | High | High |

---

## KEY INSIGHT: The System Architecture Is Already Right

The Supabase-first approach means:
- **All intelligence lives in our DB**, not Xero
- **Xero is a read/write target**, not the source of truth for tagging/matching/receipts
- **Migration to new Xero = change one tenant ID** + recreate tracking categories
- **All vendor rules, receipt history, project mappings are permanent**

The main gaps are **data quality** (vendor ABNs, receipt coverage, account codes) not **architecture**. The pipes are laid — we just need to fill them with better data.

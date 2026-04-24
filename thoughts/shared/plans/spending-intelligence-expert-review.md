# Spending Intelligence — Expert Review & Practice Guide

**Date:** 2026-04-23
**Author:** Review after ~14 hours of build
**Audience:** Ben + future Ben + accountant + new entity launch
**Lens:** Xero accounting expert + AU tax/BAS + R&D tax incentive + automation architect

---

## TL;DR — The honest state of things

1. **The pipeline works for NEW receipts.** Push-to-Xero + vendor rules + OCR + triage UI = clean capture for anything post-today. Every receipt from here on flows through a pre-coded pipeline.
2. **Historical retroactive fix is mostly blocked.** Xero locks reconciled transactions. 705 of 1022 post-Oct SPEND txns are already reconciled = can't retrofit project tracking via API. Ship has sailed; don't spend more effort chasing it.
3. **Revenue attribution via contact fallback is the big win.** $1.43M of ACCREC invoices; only ~$540K correctly tagged by Xero tracking. Our contact→project map + override layer fixed the rest. Self-reliance picture is now real.
4. **BAS lock date (30 Sep 2025) = iron wall.** 36 pre-lock drafts can't be processed without accountant sign-off. Not a bug, a feature. Respect it.
5. **We re-built a worse version of Xero Bank Rules.** The 30-min Xero UI exercise to configure Bank Rules for top 30 vendors would have delivered 80% of what we automated — and would then apply at reconcile time automatically. Key lesson for the next entity.

---

## What's working (keep doing)

| System | Status | Why it's working |
|---|---|---|
| `push-receipts-to-xero.mjs` | ✅ Solid | 300+ bills pushed with PDFs attached, vendor-rule coded, FX currency notes, date-floor guard, retry with backoff |
| `recode-xero-bills.mjs` | ✅ Solid | 208 bills retrospectively coded — preserves UnitAmount to not clobber manual edits |
| `/finance/receipts-triage` | ✅ Clean UI | PDF preview inline, quick-action buttons, 3 buckets, auto-junk for non-receipts |
| `/finance/vendor-rules-suggest` | ✅ Clean UI | 57 unknown vendors inferred + bulk-saved to rules table |
| `/finance/self-reliance` dashboard | ✅ **The gem** | Real picture by project with overrides, commentary, tags, filters, sort |
| Gemini 2.5 Flash Lite OCR | ✅ Cheap + accurate | 91 items for $0.009. Runnable liberally. Auto-detects non-receipts (junk 49 of 91). |
| Contact→project fallback map | ✅ High leverage | Fixes the 60%+ of Xero invoices that lack Project Tracking |
| Grant vs earned classification | ✅ Structural | Changes the self-reliance narrative from "dependent" to "mixed" |
| Project commentary + overrides | ✅ Institutional memory | Banks the "why" behind numbers for future context |
| `thoughts/shared/financials/` private output | ✅ Safe | Never walked by wiki build — confirmed |
| Xero MCP server connection | ✅ Useful | Already running; 40+ read/write tools exposed for future work |
| `spending-intelligence-v4-full-automation.md` | ✅ Complete | Migration-readiness section covers new-entity launch |

## What's not working (and why)

### Blocked by Xero architecture

1. **Can't edit reconciled bank transactions.** Once `is_reconciled=true` in Xero, API returns validation error. No workaround.
2. **Xero Bank Rules have no API.** Only configurable via UI. Can't bulk-script from our vendor_project_rules.
3. **Attachments API for bank transactions is finicky** — works but with quirks (already mirrored 1639 Dext files).
4. **Multi-currency requires Premium plan** — we fell back to AUD with description notes. Every USD subscription = manual FX fix at reconcile time (~$5 × 20 subs × 12 mo = $1,200/year effort).

### Blocked by data quality

5. **Duplicate bills from connectors** — 23 sets Xero flagged. Qantas/Uber/Paddle/Virgin create ACCPAY bills via their own connectors; our push created dupes. Going forward: dedup check before every push.
6. **Legacy tracking names** ("Goods.", "The Harvest", "Mounty", "June's Patch", "Confit") fragment reporting — bills tagged "Goods." vs "ACT-GD — Goods" are treated as different options. Rename via Xero UI would merge them.
7. **Stale `is_reconciled` in our mirror** — caused 159 failures in the tracking script. Sync mid-run required; not automated.

### Blocked by time / accountant dependency

8. **BAS-locked period** — 36 drafts ($16.4K) pre-30 Sep 2025 can't be approved. Accountant must either unlock or confirm safe-to-void.
9. **No contemporaneous commentary** on most spend — critical for R&D tax substantiation. `project_commentary` table sits empty.
10. **Dext backlog** — 381 items in review/captured. Most are pre-lock; some are non-receipts. Triage slow.

---

## Key learnings

### Tax + BAS angle

- **R&D tax substantiation** requires contemporaneous records. Our bank→receipt→bill→project_code chain is strong evidence — but the **narrative** ("*what* R&D activity did this spend support?") is missing. The `project_commentary` table was built for this but hasn't been populated. Risk: ATO review where `$251K R&D eligible` exists in logs but lacks activity-level evidence.
- **GST < $82.50 rule** is a rock-solid automation lever. Auto-marking these as `no_receipt_needed` eliminated 49 Q2 items with zero tax impact.
- **BASEXCLUDED for foreign suppliers** (Stripe, Vercel, OpenAI, etc.) is correctly applied via vendor rules now. Going forward: when new USD vendor detected, auto-tag BASEXCLUDED.
- **R&D offset target** of 43.5% refund on eligible spend → $109K (per handoff) → ~$47K potential refund. Documentation quality directly affects how much survives ATO scrutiny.
- **BAS lock is protective**, not obstructive. Accountants lock periods post-lodgement to preserve filed numbers. Retroactive edits would invalidate BAS already filed — avoid at all costs.

### Xero angle (the expert lens)

1. **Xero is designed for daily reconciliation**, not monthly/quarterly batch. Letting 300+ bank lines accumulate = manual chore; reconciling daily = 2-minute task per day with Bank Rules doing 80%.
2. **Bank Rules are the primary automation surface**. We skipped them because they're UI-only, and built custom coding instead. For the next entity: configure Bank Rules first, custom code second.
3. **Pre-code, don't retro-code.** Every bill should land in Xero already fully classified (account/tax/tracking). Retroactive edits on reconciled transactions are blocked by design.
4. **ACCPAY bill + bank payment is the canonical flow.** Receipt → ACCPAY bill (DRAFT) → review/approve → pay from bank (SPEND linked to bill) = clean trail. Any deviation creates reconciliation pain.
5. **Tracking categories are dual-axis**: Business Division × Project Tracking. With 44 project codes we may be over-granular. Consider consolidation: Core/Infrastructure/Farm/Harvest/Goods/JusticeHub/EL as primary 7, plus sub-categories for specific initiatives.
6. **Duplicate prevention > duplicate cleanup.** Our push script now needs a pre-flight `alreadyInXero()` check — we have it but it's permissive. Tighten: amount exact + vendor match 0.9+ + date ±3d = skip.
7. **Xero AI (JAX) is coming fast.** 80% auto-reconcile + OpenAI deep research. Plan for the new entity to use it from day 1.

### Automation angle

- **Parallel systems create dual maintenance**. Our `vendor_project_rules` + Xero's Bank Rules + Xero's contact defaults = 3 places where vendor logic lives. Consolidate at reconcile-time in Xero.
- **Gemini 2.5 Flash Lite is a utility layer**, not a core system. Use liberally; don't over-architect around it.
- **Contact-based attribution > tracking-based attribution** when users forget to tag. Build fallback maps early.
- **The biggest ROI action is preventing bad data at entry**, not cleaning it up after. E.g., Qantas Business Rewards connector auto-tags all flights — configure it correctly ONCE, benefit forever.
- **Our system's true value-add over Xero** is cross-project analytics, narrative commentary, and multi-entity aggregation. These are underdeveloped; the rest of what we built is duplicating Xero.

---

## Recommended practice going forward

### Daily (5 min)
- Open Xero → NAB Visa reconcile view
- Bank Rules auto-suggest 80%, click OK
- Find & Match for any bill suggestions
- Create for anything new (use vendor-suggest helper as cheat sheet)

### Weekly (15 min)
- Run `scripts/weekly-reconciliation.mjs` (already scheduled Mondays) — auto-tag + learn + Telegram summary
- Scan self-reliance dashboard for anomalies
- Add commentary to any unusual spend

### Monthly (30 min)
- Approve all Draft bills in Xero
- Run `scripts/generate-project-financials.mjs` + review private fact sheets
- Set any new vendor rules discovered this month

### Quarterly (2 hours — BAS prep)
- Run `scripts/bas-completeness.mjs` + address any gaps
- Regenerate fact sheets with commentary
- Export BAS-ready data
- Board/stakeholder report from dashboard

### Annually (half-day)
- R&D tax incentive prep: compile contemporaneous records per project
- Refresh vendor rules based on year's data
- Review and retire unused project codes

---

## New-entity launch playbook

When the new Pty Ltd Xero is ready, use this 1-day checklist:

### Day 0 pre-flight (1 hr)
- [ ] Xero Premium plan selected (multi-currency enabled)
- [ ] Chart of accounts template from our config (generate via `scripts/export-xero-chart.mjs` — to build)
- [ ] Tracking categories: Business Divisions + Project Tracking created
- [ ] All 44 project codes added to Project Tracking (can delete unused later)
- [ ] Bank feeds connected (NAB Visa, NAB Everyday, any other)
- [ ] Xero Me app installed on Ben's phone
- [ ] Email-to-Xero inbox address captured
- [ ] OAuth app re-authenticated with new tenant ID
- [ ] `.env.local` updated with new `XERO_TENANT_ID`

### Day 0 automation setup (1 hr)
- [ ] Top 30 **Xero Bank Rules** configured via UI (Qantas, Uber, Vercel, Stripe, OpenAI, Dialpad, Anthropic, GitHub, Bunnings, etc.) — **DO NOT SKIP**
- [ ] Gmail auto-forward: `from:(receipts@stripe.com OR receipts@*)` → Xero inbox email
- [ ] `vendor_project_rules` table ported (already tenant-agnostic — just verify)
- [ ] `push-receipts-to-xero.mjs` tested with `--dry-run --limit 3`
- [ ] `generate-project-financials.mjs` cron set
- [ ] `weekly-reconciliation.mjs` cron set (Monday 8am)

### Week 1 habits
- [ ] Reconcile every morning (2 min)
- [ ] Snap photos of physical receipts in Xero Me (10 sec each)
- [ ] Forward receipt emails to Xero inbox (10 sec each)
- [ ] Review Bank Rules matches for false positives

### Month 1 review
- [ ] Compare volume of manual vs auto-coded: target >80% auto
- [ ] Identify new vendors to add to Bank Rules
- [ ] Confirm multi-currency is working for USD subs

### Critical rules for new entity
1. **Never skip Bank Rules setup.** 30 min once = saves 5 hr/month forever.
2. **Pre-code everything.** Never create a Draft bill without account/tax/tracking set.
3. **Reconcile daily, not weekly.** Makes Bank Rules + Find & Match work.
4. **Use Xero Me for physical receipts, Gmail forward for emails.** Don't rely on Dext or custom OCR for new entity.
5. **Commentary as you go.** When you reconcile an unusual item, add a 1-line reference in Description so future you knows what it was.

---

## Automation maturity roadmap

| Level | Features | Current entity | New entity |
|---|---|---|---|
| 0 — Manual | No rules, manual coding per transaction | — | — |
| 1 — Pre-coded bills | Vendor rules + push-to-Xero pipeline | **You are here ✓** | Start here |
| 2 — Xero Bank Rules | Top 30 vendors auto-code at reconcile | **Skipped — do this** | Do this day 0 |
| 3 — JAX auto-reconcile | 80% auto-reconciled by Xero's AI | Not yet on plan | Enable when launched |
| 4 — Cross-org analytics | Our dashboard overlays multi-entity data | **Partially built** | Built-in from day 1 |
| 5 — AI-coded exceptions | Claude/JAX handle remaining 20% of edge cases | Not yet | Phase 2 after launch |

---

## Things to stop / deprecate

1. **`add-tracking-to-bank-txns.mjs`** — low ROI (24 of 270 editable). Retire unless we fix the stale `is_reconciled` sync issue AND find a large unreconciled backlog on a specific account.
2. **`match-bank-txns-to-bills.mjs`** — only found 5 real matches. Not worth scheduling. Keep as ad-hoc reference.
3. **Dext** — sunset. Xero Me + Gmail forward covers the use case. Saves $28–42/mo.
4. **Duplicate push runs** — push script now must respect date floor + dedupe. Never run full 500+ again without guards.
5. **Manual override of correctly-tracked invoices** — if Xero tracking is right, don't add an override. Overrides should only fix mis-tagged or untagged.

---

## Things to build next (prioritised)

### 🥇 Accountant email + BAS lock resolution
- 5 min work. Unblocks 36 drafts ($16.4K).
- Action: draft + send. Await response. Then void or process accordingly.

### 🥈 Xero Bank Rules setup (current entity)
- 30 min one-time. Prevents this whole problem repeating for new Q4 spend.
- Use our top-30 recurring vendors list as the setup guide.

### 🥉 Commentary practice activation
- `/finance/self-reliance` has per-project notes UI but 0 rows populated.
- Target: every project with >$10K FY26 activity gets a commentary paragraph by 30 May 2026.
- This is the R&D substantiation safety net.

### 🏅 Chart of accounts export for new-entity migration
- `scripts/export-xero-chart.mjs` — dumps current chart + tracking categories to `config/xero-chart.json`
- One-day scripting job. Makes new-entity Day-0 trivial.

### 🎖️ Self-reliance dashboard v2
- Add trend over quarters (sparklines)
- Add grant runway calculator: "at current burn, how many months until revenue gap?"
- Add earned-only filter on totals (exclude grants from "self-reliance" for honest number)

### 🥇 (optional, bigger) Multi-entity aggregation
- When new Pty Ltd is live, dashboard should roll up both entities
- `xero_tenant_id` column in main tables (already noted as TODO in v4 plan)

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| ATO challenges R&D claim due to thin narrative | Medium | High ($47K+ at stake) | Populate commentary for all R&D-tagged projects |
| Duplicate bills cause BAS overclaim | Low | High | Resolve 23 Xero-flagged duplicates pre-BAS |
| BAS lock prevents edits causing inaccurate financial reports | Low | Medium | Accountant coordination; document decisions |
| Xero Bank Rules go stale as vendors change | Medium | Low | Quarterly review |
| Dext cancellation before all files scraped | Low (already done) | High (data loss) | All 1639 files already in Supabase Storage ✓ |
| Our system diverges from Xero truth | Medium | Medium | Weekly sync; dashboard reconciles to Xero |
| New entity launches without automation | Medium | High (repeats all these problems) | Use this playbook |

---

## Summary: one-sentence learnings

1. **Pre-code at entry, don't retrofit after reconciliation.**
2. **Xero Bank Rules do 80% of what we built — use them.**
3. **Contact-based attribution is more reliable than user-applied tracking.**
4. **Grant vs earned split changes the self-reliance story materially.**
5. **Commentary is the R&D safety net — populate it.**
6. **The new-entity launch is the chance to do it right from day 0.**

---

## References

- [v4 full-automation plan](spending-intelligence-v4-full-automation.md)
- [v3 session handoff](../handoffs/spending-intelligence-v3-handoff.md)
- [Self-reliance dashboard](http://localhost:3022/finance/self-reliance) (private)
- [Receipt triage](http://localhost:3022/finance/receipts-triage) (private)
- [Xero AI Toolkit](https://developer.xero.com/ai)
- [JAX product page](https://www.xero.com/us/ai-in-accounting/jax-vision/)

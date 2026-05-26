---
title: ACT Operating Picture — First-Principles Blueprint
date: 2026-05-26
author: Ben + Claude
status: blueprint — for direction approval
companion: thoughts/shared/reviews/command-center-trust-map/README.md (the "where we are" audit)
related:
  - thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md
  - thoughts/shared/handoffs/2026-05-08-money-brain-runbook.md
  - wiki/decisions/act-core-facts.md
---

# ACT Operating Picture — a first-principles blueprint

> Companion to the [Command Center Trust Map](../reviews/command-center-trust-map/README.md).
> The trust map says *what's broken*. This says *what we're building and why* — one true operating
> picture for ACT across Notion, GHL, Gmail, Supabase and Xero, every entity, the R&D process, and a
> calendar of everything with a date.

## 0. First principles — what is this actually for?

Strip away every widget. A founder running ACT can only be hurt by missing one of six things. The
operating picture exists to make those six impossible to miss — and nothing else:

1. **Can we pay people and bills?** → real cash + honest runway.
2. **What's owed to us / by us, and when?** → AR/AP with dates.
3. **What must we DO by a date or lose money / breach?** → one compliance + R&D + migration calendar.
4. **Are our projects alive and funded?** → project health + funding position.
5. **Who needs us, who are we dropping?** → relationship attention.
6. **Are we capturing the evidence to claim back money (R&D 43.5%) and prove impact?** → evidence coverage.

**The North Star (three rules that make it "amazing"):**
- **One money truth.** Every dollar is computed one way, from one ledger, across every entity. No surface disagrees with another.
- **No silent zeros.** Every number is either *true* or *visibly marked "not wired / stale since X."* A broken pipe must look broken, never like data.
- **Every date in one place.** If it has a deadline or a dollar, it's on the calendar, source-tagged, owner-assigned, and it pushes a reminder before it's late.

Everything below serves those six questions and these three rules.

---

## 1. The data-source map — who owns which fact

The single biggest source of confusion is *which system is the truth* for a given fact. First principle:
**each external system owns its domain; Supabase is the join layer, not a source of truth; the command
center reads the join layer; Notion is for reading/planning/capture; Telegram is for push.**

| Domain (fact) | System of record | How it reaches Supabase | Surfaced where | Current state |
|---|---|---|---|---|
| Cash, P&L, AR/AP, R&D-eligible spend | **Xero** | `sync-xero-to-supabase.mjs` (daily) | command-center finance · Notion pulse · Telegram | 🟢 txns/invoices fresh · 🔴 **bank balances 26d stale** · 🔴 bank_statement_lines feed dead |
| Relationships, pipeline, opportunities | **GHL** | `sync-ghl-*` | command-center supporters/people/pipeline | 🟢 contacts/opps fresh · 🔴 relationship_health 27d · 🔴 relationship_pipeline 2.5mo |
| Conversations (email) | **Gmail** (4 mailboxes) | sync → `communications_history` | relationship + comms views | 🟢 fresh (27,186 rows) |
| Knowledge, decisions, meetings | **Supabase `project_knowledge`** (compiled) | wiki/voice-note pipeline | knowledge graph | 🟢 real · 🟡 chunk ingestion ~3wk behind |
| Plans, reading, capture, year-plan | **Notion** | outbound sync + capture pages | Notion (read/plan/capture) | 🟢 per 4-surface model |
| External funder/org intel | **GrantScope / CivicGraph** | `gs_*`, `foundations`, `grant_opportunities` | grants/funders | 🟢 huge (24,977 grants) · 🟠 grant-noise pollutes pipeline tables |
| Compliance / dated obligations | **— none yet —** | **must be built** | compliance calendar (route scaffold exists) | ⚫ greenfield |

**"Understand Xero and external better" = three concrete moves:**
- (a) Re-light the **bank-balance** pull and **bank_statement_lines** feed so cash + reconciliation are live, not frozen at Apr 30 / Mar 31.
- (b) Make the sync **entity-aware** (carry `entity_code` + `xero_tenant_id` cleanly) so the migration is a data event.
- (c) Replace the ~9 ad-hoc finance calcs with **one ledger module** that reads Xero data by `type` (not sign), dedupes ACCPAY bills, excludes `%-TRANSFER`, and applies the two-account rule.

**Reconciliation across systems** happens on `canonical_entities` (15,116) + `entity_identifiers` (31,034): a funder in GHL, an invoice contact in Xero, and an org in GrantScope resolve to one entity. That join layer exists and is the right backbone — it's underused, not missing.

---

## 2. The entity model — Pty + charity + sole trader

**Verified today:** 100% of financial data is `ACT-ST` — Nicholas Marchesi's sole trader, one Xero tenant.
The Pty and the charity have **no money in the books yet.** So multi-entity reporting is not a current
gap to backfill — it's a **cutover to prepare for.** Build the dimension now; the migration fills it.

| Entity | Code | Legal | Role | Status | Obligations that switch on |
|---|---|---|---|---|---|
| Nic Marchesi (sole trader) | `ACT-ST` | ABN 21 591 780 066 | Current trading vehicle | 🟢 live, all money here | BAS/GST, income tax (personal), ceases trading 30 Jun 2026 |
| A Curious Tractor Pty Ltd | `ACT-PL` *(new)* | ACN 697 347 676, reg. 2026-04-24 | Future trading co (Knight + Marchesi trusts 50/50) | ⚪ registered, dormant in books | ASIC annual review, company tax, R&D claim, BAS once trading |
| A Kind Tractor Ltd | `ACT-CH` *(new)* | ACN 669 029 341 | Charity, **not DGR**, dormant | ⚪ dormant | ACNC Annual Information Statement (if registered), ASIC/ACNC review |

**Design implications:**
- Add a real **entity registry** (3 rows of reference data) — not a 104k-row `organizations` table (that's the external CivicGraph universe, a different thing).
- The command center shows money **per-entity and consolidated**, with a default of "ACT-ST (everything, today)" and a clear banner: *"Trading migrates to A Curious Tractor Pty Ltd by 30 Jun 2026."*
- The **migration** is a first-class object: a readiness view (checklist already exists at `act-entity-migration-checklist-2026-06-30.md`) + a hard date on the calendar + a "what moves" ledger (which bank accounts, contracts, subscriptions, receivables re-paper to the Pty).
- The charity is tracked **even while dormant**, because activating DGR / running money through it is a future decision with its own dated obligations — and "do we use the charity?" is a strategic question the picture should keep visible.

---

## 3. The R&D business process — protecting the 43.5% refund

First principle: the R&D Tax Incentive refund (realistically **$180–220K**, not a round $250K) is **real cash
the ATO pays back** — but only against **contemporaneous records + receipts + a defensible nexus** from
eligible R&D activities to the dollars spent. The risk isn't the claim; it's failing to capture evidence
*as the year happens.* So R&D is a **process**, not a report. The process we need, end to end:

```
TAG AT SOURCE → EVIDENCE AS YOU GO → QUARTERLY GRADE → REGISTER + LODGE IN WINDOW
```

1. **Tag at source.** Every transaction, when tagged, gets `rd_eligible` + `rd_category` (fields already exist on `xero_transactions`). R&D scope spans the *real* R&D projects — not the stale hardcoded `[EL,IN,JH,GD]` list, and it must **include ACT-HV and ACCPAY bills**, which today's logic drops.
2. **Evidence as you go.** Receipts attached (`receipt_matches`, 95%+ already), and activity notes in `project_knowledge` linking spend → the experiment/uncertainty it funded. This is the contemporaneous record.
3. **Quarterly grade.** The evidence pack (`thoughts/shared/rd-pack-fy26/`) scored by `grade-pack.mjs` (currently WARN/62, ceiling is external-input-gated). A quarterly cadence keeps it audit-ready.
4. **Register + lodge in the window.** **FY25-26, claimed via A Curious Tractor Pty Ltd.** Registration with AusIndustry + lodgement window is **Jul 2026 – 30 Apr 2027** (10 months after the 30 Jun 2026 year-end). **The "30 Apr 2026 / −26 days" alarm hardcoded in `/company` and `api/strategy` is FALSE and must die.** FY24-25 is forfeited (sole-trader period, ineligible).

**The R&D view shows:** eligible spend YTD (by `type`, incl. bills) · % receipted · evidence-pack score · the *real* countdown to the Apr 2027 window · which projects/categories carry the claim. Source: `wiki/decisions/act-core-facts.md` + `project_rd_tax_incentive`.

---

## 4. The calendar — everything with a date

**This is greenfield** (no compliance data exists today). Build a `compliance_calendar` table: one row per
dated obligation, each with `entity_code`, `category`, `due_date`, `source` (auto/manual), `owner`,
`status`, `amount?`, and a `lead_days` for the Telegram nudge. Seed it from five feeds:

**A. Statutory / entity (confidence: ⚠️ confirm exact dates with Standard Ledger — these are best-effort):**

| Obligation | Entity | Due (best-effort) | Confidence |
|---|---|---|---|
| FY2025-26 year end | all | **30 Jun 2026** | 🟢 verified |
| Sole-trader → Pty Ltd trading cutover | ACT-ST→ACT-PL | **by 30 Jun 2026** | 🟢 locked decision |
| BAS Q4 FY26 (Apr–Jun) | ACT-ST | **28 Jul 2026** (25 Aug via agent) | 🟡 confirm GST/agent |
| Super guarantee Q4 (if employees) | ACT-ST | **28 Jul 2026** | ⚠️ confirm payroll status |
| ACNC Annual Information Statement | ACT-CH | **31 Dec 2026** (6mo after FY end, if registered) | ⚠️ confirm ACNC registration |
| Pty Ltd FY26 income tax return | ACT-PL | **~15 May 2027** (via agent) | ⚠️ confirm with accountant |
| R&D registration + lodgement (FY25-26) | ACT-PL | **opens Jul 2026, closes 30 Apr 2027** | 🟢 locked |
| ASIC annual review (first) | ACT-PL | **~24 Apr 2027** (reg. anniversary) + fee | 🟡 inferred from reg date |
| ASIC annual review | ACT-CH | charity review cycle | ⚠️ confirm |

**B. From Xero (auto, already in data):** AR due dates (**$164,250 / 17 invoices**, latest due 30 Jun 2026) and AP due dates (**$765,397 / 549 bills — ⚠️ earliest due 2025-01-28 looks stale/duplicate; validate before trusting the total**). Repeating invoices / subscription renewals (`subscriptions.next_billing_date`, 68 rows).

**C. From GHL / grants (auto, mostly empty today — a gap to fill):** grant milestones + **acquittal due dates** (currently `acquittal_due_date` is unpopulated → 0 rows; wiring this is a real task), application deadlines (`grant_opportunities.closes_at`).

**D. From projects:** funding drawdown dates (`project_funding_drawdowns`, 48 rows), reporting milestones.

**E. Manual / ops:** insurance renewals, domain renewals, board meetings, key partner reviews.

**The calendar view:** a single timeline, filterable by entity, with "next 30 / 90 days" + overdue, colour by category (statutory red, money amber, ops grey), each item one tap to its source, and a daily Telegram digest of what's due in `lead_days`. The route scaffold (`api/finance/compliance-calendar`, `/finance` compliance page) already exists — it just needs the table + feeds.

---

## 5. How the command center delivers this — the clarity spine

Reframe the ~65 pages around the six questions. Everything maps to one of these or gets archived.

| The question | The surface (the spine) | Built on |
|---|---|---|
| Can we pay people/bills? | `/company` (rebuilt) + `/finance` cockpit | the one ledger + live bank balances |
| Owed to/by us, when? | `/finance/invoices` + the calendar | Xero AR/AP by due date |
| What must we DO by a date? | **`/calendar` of obligations** (new) | `compliance_calendar` + 5 feeds |
| Projects alive & funded? | `/finance/projects` + `/projects` | one ledger by project + project_health (overall_score) |
| Who needs us? | `/supporters` + `/people` | ghl_contacts + live relationship recompute |
| Capturing evidence/R&D? | R&D panel + `/finance/audit` | rd_eligible spend + receipt_matches + pack score |

Everything else either feeds these (sync scripts, tagging tools) or is archived (the fakes list in the trust map: `/goals`, `business/balance-sheet`, `/compliance` old, `/pipeline`, `business-dev`, agent autonomy dashboards, `debt`, etc.).

---

## 6. Build sequence (first-principles order: truth → entity → dates → elegance)

> Phase-at-a-time, `npx tsc --noEmit` between files, commit at each boundary. Detailed P0-spec lives in
> the trust-map README; this sequence supersedes it by adding entity + calendar as first-class.

- **Phase 1 — One ledger, true front page.** `lib/finance/ledger.ts` (type-based, deduped bills, two-account, entity-aware). Rebuild `/company` on it. Kill the false R&D deadline (both places). "No silent zero" rule. Re-light the **bank-balance** pull so cash is live.
- **Phase 2 — Entity dimension.** Entity registry (3 rows). Every finance surface gains an entity filter + consolidated view. Migration readiness view wired to the existing checklist. Cutover banner.
- **Phase 3 — The calendar.** `compliance_calendar` table + the 5 feeds (statutory seed, Xero AR/AP, GHL acquittals, drawdowns, manual) + the timeline view + Telegram digest. Populate the statutory dates with Standard Ledger.
- **Phase 4 — Re-light / retire dead pipelines.** bank_statement_lines (reconciliation), relationship_health (recompute or retire), retire relationship_pipeline/fundraising_pipeline → opportunities_unified. Confirm `SUPABASE_SHARED_URL` (storyteller routes).
- **Phase 5 — Honest by construction.** CI schema-contract test (parse `.from()` + columns, assert against live schema). Archive the fakes. Prune nav to the spine. R&D process cadence (quarterly grade) on cron.

---

## Provenance & confidence
- **Verified against shared DB `tednluwflfhxyucgwigh` on 2026-05-26:** single entity ACT-ST; bank balances (ACT Everyday +$679,914.86, NAB Visa −$93,339.15) as of 2026-04-30; AR $164,250/17; AP $765,397/549 (earliest due 2025-01-28 → flagged for validation); table existence/freshness per `_schema-truth.md`.
- **Locked decisions (memory / `wiki/decisions/act-core-facts.md`):** entity structure, ABNs/ACNs, R&D Path C + FY25-26 window, 30 Jun 2026 migration.
- **⚠️ To confirm with Standard Ledger (accountant):** exact BAS/GST cadence, payroll/super status, ACNC registration of A Kind Tractor, Pty Ltd tax-return + ASIC dates. These are marked best-effort above, not asserted.
- This blueprint contains figures → a `.provenance.md` sidecar should accompany any board/funder export derived from it.

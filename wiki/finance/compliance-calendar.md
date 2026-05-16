---
title: ACT Compliance Calendar (canonical)
status: Active
canonical_slug: compliance-calendar
date: 2026-05-16
owner: ben
description: |
  Single source of truth for ACT's fixed compliance obligations. Grant
  acquittals are NOT listed here — they're auto-pulled from
  ghl_opportunities.acquittal_due_date at calendar-build time.

  Read by:
    - scripts/build-compliance-calendar.mjs (merges with grant acquittals)
    - /api/finance/compliance-calendar (live read for /finance/command)
    - scripts/compliance-alerts.mjs (Telegram T-30/T-7/T-1)
    - scripts/sync-compliance-calendar-to-notion.mjs (outbound mirror)

  EDIT THIS FILE when:
    - A new fixed obligation appears (annual review for a new entity, etc.)
    - A due date moves (rare — most are statute-driven)
    - An obligation is filed: change status to 'filed' and bump last_filed_at

obligations:

  # ─── BAS (sole-trader cohort, last 4 quarters before Pty cutover) ───

  - id: bas-q3-fy25-26
    title: BAS Q3 FY25-26 (Jan-Mar 2026)
    type: BAS
    entity: sole-trader
    due_date: 2026-04-28
    status: filed
    last_filed_at: 2026-04-24
    lead_times_days: [30, 7, 1]
    notes: |
      GST + PAYG instalment. Lodged via tax agent.

  - id: bas-q4-fy25-26
    title: BAS Q4 FY25-26 (Apr-Jun 2026)
    type: BAS
    entity: sole-trader
    due_date: 2026-07-28
    status: pending
    lead_times_days: [30, 7, 1]
    notes: |
      LAST sole-trader BAS. Cutover to Pty happens 30 Jun 2026, so
      this quarter is split: Apr-Jun sole-trader BAS, Pty Ltd starts
      its own BAS lifecycle from Q1 FY26-27 (Jul-Sep 2026).

  - id: bas-q1-fy26-27-pty
    title: BAS Q1 FY26-27 (Jul-Sep 2026) — FIRST Pty Ltd BAS
    type: BAS
    entity: pty-ltd
    due_date: 2026-10-28
    status: pending
    lead_times_days: [30, 7, 1]
    notes: |
      First BAS under A Curious Tractor Pty Ltd. Confirms ABN
      registration is working for GST/PAYG.

  - id: bas-q2-fy26-27-pty
    title: BAS Q2 FY26-27 (Oct-Dec 2026)
    type: BAS
    entity: pty-ltd
    due_date: 2027-02-28
    status: pending
    lead_times_days: [30, 7, 1]

  # ─── R&D Tax Incentive (Pty Ltd) ───

  - id: rd-claim-fy25-26
    title: R&D Tax Incentive claim FY25-26 ($200K refund)
    type: R&D
    entity: pty-ltd
    earliest_filable: 2026-07-01
    due_date: 2027-04-30
    status: pending
    lead_times_days: [60, 14]
    expected_refund_aud: 200000
    notes: |
      Path C locked 2026-04-27. FY24-25 forfeited (sole-trader period,
      ineligible). Lodge via A Curious Tractor Pty Ltd Jul 2026 –
      30 Apr 2027. Evidence pack lives at thoughts/shared/rd-pack-fy26/.

  # ─── ATO annual returns ───

  - id: ato-annual-fy25-26-sole-trader
    title: ATO annual return FY25-26 (sole trader, Nicholas Marchesi)
    type: ATO
    entity: sole-trader
    due_date: 2026-10-31
    status: pending
    lead_times_days: [60, 30, 7]
    notes: |
      Standard self-assessment. With tax agent extension can push
      to ~May 2027. Covers Jul 2025 – Jun 2026 sole-trader activity.

  - id: ato-annual-fy25-26-pty
    title: ATO annual return FY25-26 (Pty Ltd partial year)
    type: ATO
    entity: pty-ltd
    due_date: 2027-02-28
    status: pending
    lead_times_days: [60, 30, 7]
    notes: |
      Pty Ltd registered 2026-04-24, so FY25-26 covers only the
      Apr-Jun 2026 stub. Full FY26-27 return due 2028.

  # ─── ASIC (Pty Ltd company review) ───

  - id: asic-annual-act-pty-1st
    title: ASIC annual review — A Curious Tractor Pty Ltd (first)
    type: ASIC
    entity: pty-ltd
    due_date: 2027-04-24
    status: pending
    lead_times_days: [30, 7]
    notes: |
      Registered 2026-04-24. Annual review due 2 months after each
      anniversary. ASIC sends a Company Statement; verify and pay
      the annual review fee.

  # ─── Charity reporting (A Kind Tractor Ltd, dormant) ───

  - id: acnc-annual-aiks-tractor
    title: ACNC Annual Information Statement — A Kind Tractor Ltd
    type: ACNC
    entity: a-kind-tractor-ltd
    due_date: 2026-12-31
    status: pending
    lead_times_days: [60, 14]
    notes: |
      A Kind Tractor Ltd (ACN 669 029 341) is a registered charity
      but dormant + NOT DGR. Annual statement required even when
      dormant. Lodge by 31 Dec for FY ending 30 Jun.

  # ─── Sole trader → Pty Ltd cutover (ONE-OFF) ───

  - id: sole-trader-pty-cutover
    title: Sole trader → Pty Ltd cutover
    type: ONE-OFF
    entity: both
    due_date: 2026-06-30
    status: pending
    lead_times_days: [60, 30, 14, 7, 1]
    notes: |
      All commercial activity must transfer from Nicholas Marchesi
      sole trader (ABN 21 591 780 066) to A Curious Tractor Pty Ltd
      (ACN 697 347 676) by 30 Jun 2026. Canonical checklist at
      thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md
      with ~50 line items: Xero new org, GHL re-keying, contract
      novations, Stripe re-onboarding, etc.

---

# ACT Compliance Calendar

This page is generated from frontmatter above. Edit the `obligations:` array to
add/change items. The companion script `scripts/build-compliance-calendar.mjs`
merges this list with `ghl_opportunities.acquittal_due_date` rows (grant
acquittals — dynamic) into a unified calendar published at
`/finance/command` (AT RISK TODAY pane) + Notion + Telegram.

## Entities

| Entity | Status | Notes |
|---|---|---|
| Nicholas Marchesi sole trader | Active until 2026-06-30 | ABN 21 591 780 066 |
| A Curious Tractor Pty Ltd | Active from 2026-04-24 | ACN 697 347 676. Knight + Marchesi family trusts 50/50. |
| A Kind Tractor Ltd | Dormant charity | ACN 669 029 341. NOT DGR. |

## Lead-time conventions

| `lead_times_days` value | Telegram alert |
|---|---|
| 60 | `[T-60] <title>` (R&D + ATO long lead time) |
| 30 | `[T-30] <title>` (BAS standard) |
| 14 | `[T-14] <title>` (acquittals, last calls) |
| 7 | `[T-7] <title>` (final reminder) |
| 1 | `[T-1] <title> DUE TOMORROW` |

A single obligation can have multiple lead times. Alerts fire only when
`days_until_due` matches a list entry EXACTLY (so you don't get nagged
every day).

## Status values

| Status | Meaning |
|---|---|
| `pending` | Not yet filed. Counts toward AT RISK if any lead time matches today. |
| `filed` | Lodged. Move `last_filed_at` to the filing date. Disappears from AT RISK pane. |
| `superseded` | Replaced by a later obligation (e.g., cutover supersedes sole-trader life). Stays in record for audit but doesn't alert. |
| `waived` | Confirmed not required (e.g., entity dissolved). Audit trail kept. |

## Grant acquittals (dynamic, NOT in this file)

Grant acquittals come from `ghl_opportunities.acquittal_due_date` and
`acquittal_status`. The build script joins them with this static list
at run-time. To see all current grant acquittals on `/finance/command`,
they appear in the AT RISK TODAY pane automatically.

When a grant is acquitted: set `acquittal_status = 'complete'` in GHL
(or via `/finance/workbench`) — the next cron run removes it from AT RISK.

## When to edit this file

- New fixed obligation appears (e.g., new entity registered)
- A statute-driven date changes (rare — ATO sometimes shifts BAS deadlines)
- An obligation is filed: `status: filed` + `last_filed_at: YYYY-MM-DD`
- Annual rollover: at start of each FY, add the new BAS quarters + reset rolling annual obligations

## When NOT to edit

- For grant acquittals (they're auto-pulled)
- For super/PAYG monthly (we don't have employees yet — add when we do)
- For one-offs that already passed (let them stay with `status: filed`)

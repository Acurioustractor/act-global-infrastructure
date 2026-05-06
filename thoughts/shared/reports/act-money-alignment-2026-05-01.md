---
title: ACT Money Alignment — Snapshot 2026-05-01
status: Live snapshot, not accountant-ready
date: 2026-05-01
period: FY26 YTD (1 Jul 2025 → 30 Apr 2026)
type: management-report
canonical_entity: a-curious-tractor-pty-ltd
tags:
  - finance
  - r-and-d
  - migration
  - cockpit
---

# ACT Money Alignment — Snapshot 2026-05-01

> **Purpose.** Single management snapshot underpinning the `/finance/money-alignment` cockpit. Captures who-spent-what across project codes for FY26 YTD, what gate each project sits behind, and which lines are still in the review queue. **Not accountant-ready.** Live ledger is Xero. This file is the operating truth between bookkeeping and Standard Ledger sign-off.
>
> **Period:** 1 July 2025 → 30 April 2026 (FY26 YTD, 10 months).
> **Snapshot date:** 1 May 2026.
> **Surface:** [apps/command-center → /finance/money-alignment](http://localhost:3002/finance/money-alignment).
> **Provenance:** [act-money-alignment-2026-05-01.md.provenance.md](./act-money-alignment-2026-05-01.md.provenance.md).

---

## Workspace model (where the money lives)

| Workspace | Role | Owns |
|---|---|---|
| Xero | Accounting ledger | Invoices, bills, bank feeds, GST/BAS, receivables and payables. |
| Supabase | Automation layer | Tagging coverage, vendor rules, invoice overrides, review queues, cached mirrors. |
| Command Center | Live operating dashboard | This cockpit: source freshness, project allocations, gates, review queues. |
| Notion | Decision cockpit | Gates, actions, owners, dates, secure pointers, adviser question packs. |
| Wiki | Strategy memory | R&D framing, project meaning, long-term thesis, source-of-meaning synthesis. |
| Drive / LastPass | Secure evidence | Documents in Drive; passwords and secrets in LastPass only. |

Rule of thumb: **live numbers stay in Xero, decisions stay in Notion + wiki, this snapshot is the bridge between them.**

---

## Project allocation snapshot (FY26 YTD)

Pulled live from the Xero project-tracking allocation on 1 May 2026. Sorted by absolute spend exposure.

### Fund with controls (positive signal, conditional on evidence)

| Code | Project | Revenue | Expenses | Net | Lines | Decision |
|---|---|---:|---:|---:|---:|---|
| ACT-GD | Goods | $1,028,978 | $374,643 | **$654,335** | 405 | Strongest enterprise engine. Fund growth only with margin, receivables, delivery, product liability and source-doc controls. |
| ACT-ER | PICC Elders Room | $70,000 | $0 | $70,000 | 4 | Archived funded PICC stream. Keep acquittal, cultural protocol and source evidence tied back to ACT-PI. |
| ACT-SM | SMART | $54,218 | $0 | $54,218 | 7 | Positive satellite signal. Confirm contract/deliverable evidence; keep SMART variants under the umbrella code. |
| ACT-BG | BG Fit | $41,000 | $1,080 | $39,920 | 36 | Positive project signal. Keep partner obligations, delivery evidence, future margin separated from general overhead. |
| ACT-JH | JusticeHub | $36,050 | $799 | $35,251 | 22 | Positive management signal. Fund only against live contract/pitch milestones with clean Pty/charity/partner boundaries. |
| ACT-EL | Empathy Ledger | $32,790 | $1,169 | $31,621 | 17 | Positive revenue + R&D proof signal. Needs evidence bundle, cyber/PI posture, product pathway. |
| ACT-CP | Community Capital | $24,300 | $11,358 | $12,942 | 11 | Positive prototype stream. Keep caravan/community-capital evidence pack linked to revenue + delivery obligations. |
| ACT-CF | The Confessional | $6,500 | $0 | $6,500 | 1 | Small positive studio signal. Keep revenue evidence and project scope clean. |
| ACT-GP | Gold Phone | $5,339 | $180 | $5,159 | 8 | Positive studio signal. Confirm whether product, campaign, or reusable storytelling infrastructure. |

### Advice needed (blocked or ambiguous, requires Standard Ledger view)

| Code | Project | Revenue | Expenses | Net | Lines | Decision |
|---|---|---:|---:|---:|---:|---|
| ACT-CE | Capital / Enterprise | $3,786 | $151,868 | -$148,081 | 7 | High-value negative allocation. Needs source-doc review before being treated as ordinary project spend. |
| ACT-HV | Harvest | $137,900 | $170,616 | **-$32,716** | 186 | Manageable launch loss only if lease, insurance, food/event/workshop model and dated break-even path are confirmed. See [decision page](../../wiki/decisions/2026-05-harvest-subsidiary-structure.md). |
| ACT-MD | ACT Monthly Dinners | $0 | $11,727 | -$11,727 | 7 | Relationship-building spend needs clear business purpose, host list, follow-on opportunity evidence. |
| ACT-UA | Uncle Allan Palm Island Art | $0 | $5,886 | -$5,886 | 56 | Cultural/studio spend needs source evidence, consent/cultural protocol notes, project outcome linkage. |
| ACT-PS | PICC Photo Studio | $0 | $5,823 | -$5,823 | 8 | PICC storytelling infrastructure. Link equipment/travel back to ACT-PI evidence. |
| ACT-MY | Mounty Yarns | $15,000 | $20,740 | -$5,740 | 19 | Manageable studio loss. Confirm delivery, rights, partner obligations, next revenue pathway. |
| ACT-PI | PICC | $0 | $5,676 | -$5,676 | 18 | Parent PICC spend. Keep parent/project/sub-project coding consistent across ACT-PI, ACT-ER, ACT-PS, ACT-UA. |
| ACT-OO | Oonchiumpa | $0 | $519 | -$519 | 3 | Keep as own partner stream with clear R&D/travel/partner evidence before expanding spend. |

### Pause (high-risk, stop discretionary spend until controls in place)

| Code | Project | Revenue | Expenses | Net | Lines | Decision |
|---|---|---:|---:|---:|---:|---|
| ACT-FM | Farm | $24,893 | $130,861 | **-$105,969** | 153 | Highest-risk place spend. Pause discretionary spend until lease, insurance, revenue bridge, break-even and stop-loss are explicit. |

### Clean up (small lines or coding issues, fix before reporting)

| Code | Project | Revenue | Expenses | Net | Lines | Decision |
|---|---|---:|---:|---:|---:|---|
| ACT-IN | Infrastructure / R&D | $0 | $490,612 | **-$490,612** | 1,175 | Largest spend pool. Needs evidence ledger, R&D link, and overhead/recharge policy so shared infrastructure is explainable. |
| UNASSIGNED | Unassigned Review Pool | $0 | $10,660 | -$10,660 | 138 | Clean this before using the P&L for tax, R&D or project decisions. First review queue. |
| ACT-DO | Designing for Obsolescence | $0 | $10,493 | -$10,493 | 64 | Sunsetting/legacy spend. Decide what is R&D evidence, reusable IP, or closed project cost. |
| ACT-CORE | Core overhead / IP | $2,967 | $5,105 | -$2,137 | 363 | Small direct loss but many lines. Needs clean ACT-CORE tracking option and policy for ACT-CORE vs ACT-IN. |
| ACT-CA | Caring for Those Who Care | $0 | $2,749 | -$2,749 | 13 | Small spend pool. Backfill source docs and decide whether to continue, fold in, or close. |
| ACT-10 | 10x10 Retreat | $0 | $1,870 | -$1,870 | 28 | Archived/small retreat spend. Keep only if it has clear evidence value or close the code. |
| ACT-BB | Barkly Backbone | $0 | $616 | -$616 | 3 | Tiny ideation spend. Keep source evidence; avoid expanding without a live opportunity gate. |
| ACT-BV | Black Cockatoo Valley | $0 | $525 | -$525 | 1 | Clarify boundary with ACT-FM so farm/place costs do not split unpredictably. |
| ACT-JP | June's Patch | $0 | $368 | -$368 | 4 | Small regenerative/place spend. Link to outcome evidence or close. |
| ACT-CB | Marriage Celebrant | $0 | $265 | -$265 | 4 | Small community-service spend. Confirm business purpose before carrying forward. |
| ACT-RA | Regional Arts Fellowship | $0 | $96 | -$96 | 1 | Tiny studio spend. Keep source doc; no strategic decision needed unless activity resumes. |
| ACT-FG | Feel Good Project | $0 | $71 | -$71 | 1 | Tiny active-project spend. Link to partner/outcome evidence as the project record matures. |

### Snapshot totals

| Metric | Value |
|---|---|
| Revenue (allocated) | ~$1,483,720 |
| Expenses (allocated) | ~$1,418,000 |
| Net (allocated) | ~$65,500 |
| Lines | ~2,800 |

(Live totals are computed in the cockpit at render time from the same allocation array; differences of <1% are rounding.)

---

## Coverage and freshness

(Fetched live by the cockpit from Supabase at render time. Numbers below are the snapshot baseline.)

| Source | Total | Tagged | Untagged | Coverage | Note |
|---|---:|---:|---:|---:|---|
| `xero_transactions` (FY26 YTD) | ~2,810 | ~2,741 | ~69 | ~97.5% | Current. Highest-value untagged group is the first review queue. |
| `xero_invoices` (FY26 YTD) | ~960 | ~785 | ~175 | ~81.8% | Usable. Refresh before accountant-ready packs. |
| `xero_bank_transactions` | n/a | n/a | n/a | n/a | Stale. Don't use for live decisions; query live Xero instead. |
| `project_monthly_financials` | n/a | n/a | n/a | n/a | Cached monthly P&L. Refresh after tagging cleanup. |

Tagging rule pools: `vendor_project_rules`, `invoice_project_overrides`, `location_project_rules` — counts visible in the cockpit.

---

## Review queues

The cockpit shows live "top 12 untagged transaction contacts" and "top 12 untagged invoice contacts" by absolute total. These are the first work queues for the bookkeeper. Snapshot totals on 2026-05-01:

- Untagged transaction lines: ~69 representing the bulk of remaining $-volume to triage.
- Untagged invoice lines: ~175 — many are receivables on revenue accounts that should resolve via Xero Project tagging on the invoice itself.

---

## Sole trader → Pty Ltd cutover context

This snapshot covers Nicholas Marchesi's sole trader (ABN 21 591 780 066). On 30 June 2026 the sole trader stops trading; A Curious Tractor Pty Ltd (ACN 697 347 676) takes over from 1 July 2026.

For the cutover:
- The allocation table above will be **the basis of the "treat sole trader as if acting on behalf of ACT" reallocation spreadsheet** referenced by Standard Ledger (see [Migration checklist §11](../plans/act-entity-migration-checklist-2026-06-30.md#11-meeting-decisions-from-2026-05-05-standard-ledger-conversation)).
- Tracking categories already seeded via `scripts/seed-xero-tracking.mjs` will be re-applied to the new Pty Xero tenant on Day 0 (see [New-entity Xero launch playbook](../plans/new-entity-xero-launch-playbook.md)).
- R&D-eligible lines in this snapshot belong to the sole trader's FY26 R&D claim; FY27 onwards belongs to the Pty.

---

## Next actions (lifted by the cockpit `nextActions` array)

1. Review the ~69 FY26 untagged transactions and ~175 untagged invoices, starting with high-value groups.
2. Don't apply tagger writes until high-value lines are checked and Ben approves.
3. Fix Xero Project Tracking on revenue lines, not only expense lines.
4. Define ACT-CORE vs ACT-IN overhead policy.
5. Refresh `project_monthly_financials` after tagging cleanup.
6. Take this report and the provenance packet to Standard Ledger before using numbers for tax, R&D, or distributions.

---

## Verification

**Verified.**
- Supabase coverage and freshness are queried live from the ACT shared database when the cockpit API runs.
- The allocation table is the 1 May 2026 live Xero management snapshot captured in this report.
- The cockpit is read-only — no write-back to Xero or Supabase from this surface.

**Unverified.**
- Accountant-ready P&L. (Standard Ledger to confirm.)
- GST treatment by line. (Standard Ledger to confirm.)
- Insurance, leases, contracts, and signed source documents. (Each project gate.)
- Standard Ledger sign-off on tracking-category structure for the new Pty tenant.
- Any tagging or coding decisions reflected here without owner approval.

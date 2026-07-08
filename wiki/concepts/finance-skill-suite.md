# ACT Finance Skill Suite

ACT's finance work is run by a **virtual finance team** of Claude Code skills. This is the canonical map
of who's on the team, what each does, and the conventions every finance skill follows. It is durable
taxonomy — for the live build plan and dated state, see `thoughts/shared/plans/` and each skill's own
"Current state" line.

## Framing: skills are operators, not a surface

ACT finance has four **surfaces** (see `.claude/references/finance-surfaces.md`): **Notion reads ·
command-center operates · scripts automate · Telegram pushes.** Skills are not a fifth surface — they are
the **operators** that drive those surfaces with process, memory and guardrails. The suite splits in two:

- **Money Brain (strategic / intelligence)** — "where's the money, who funds us, what if." Mature; lives
  in the `act-money-brain` plugin.
- **The Books (operational / bookkeeping)** — "tag it, receipt it, reconcile it, acquit it, claim it."
  Lives in project skills under `.claude/skills/`.

## The team (role → recurring job → skill → surface)

| Role | Recurring job | Skill(s) | Primary surface |
|---|---|---|---|
| Bookkeeper (daily) | tag spend to projects | `tag-transactions` | command-center `/finance/tagger-v2` |
| | chase / fix receipts | `find-receipt` | command-center `/finance/receipts-triage` |
| Reconciler (weekly) | match/dedupe card lines | `reconcile-cycle` | command-center `/finance/reconcile` |
| BAS agent (quarterly) | GST + acquittal + retro | `bas-cycle` | scripts + command-center |
| Cost controller | recurring/subscription watch | `scan-subscriptions` | command-center |
| R&D claimant | contemporaneous evidence | `rd-capture` · `act-rd-activity-drafter` | filesystem `rd-pack-fy26/` |
| Fundraiser | funder research / brief | `act-funder-research` (`/brief-funder`) | Notion Foundations DB |
| | grant triage | `act-grant-triage` (`/find-grants`) | GrantScope → Notion |
| | outreach drafting | `act-funder-outreach-drafter` (`/draft-funder`) | Notion |
| CFO / strategist | "where's the money now" | `act-money-operations` (`/money-status`) | Notion + Telegram |
| | cash scenarios / forecast | `act-cash-scenario-builder` (`/scenarios`) | Notion Cash Scenarios |
| | pile mix vs target | `act-pile-movement-analyst` (`/pile-mix`) | Notion |
| | decisions log | `act-decisions-drafter` (`/decision`) | Notion Decisions Log |
| | daily standup | `act-standup-synthesizer` (`/standup`) | Telegram |
| Setup / compliance | Pty/trust/insurance/R&D setup | `business-research` | research |

**Soft gaps (build deliberately, gap-driven — not pre-built):** an AR/collections operator (invoice
follow-up; `/finance/invoices` exists, no skill) and a month-end `close-cycle` (`/finance/close` exists,
no skill). Runway/scenarios are already covered by Money Brain; EOFY cutover is a one-off, not skill-worthy.

## The operating rhythm (how the operators run week to week)

The operators aren't invoked ad-hoc — they run on a **fixed weekly cadence**. The
canonical ritual is `wiki/finance/weekly-finance-checkin.md`: one ~30–45 min
day-shift pass that runs `bas-cycle` (receipts/GST) then `reconcile-cycle` (card)
back-to-back, glances the `compliance-calendar.md` deadline ladder, and logs the
pass so the learning loops compound. It rolls up into the quarterly BAS phases
(pre-close → close → prepare-for-accountant → retro) and the annual EOFY / R&D
ladder. **Weekly is the floor; small batches forever is the whole point** — it's
what stops the June-2026 heroic-backlog sprint from ever recurring.

## Suite-wide conventions (every finance skill follows these)

Distilled from `bas-cycle` (the house exemplar), [garrytan/gstack](https://github.com/garrytan/gstack),
and [mattpocock/skills](https://github.com/mattpocock):

1. **Format.** Single-file `SKILL.md` ≤ ~100 lines + `references/` (durable knowledge) + `workflows/`
   (runbooks). Split when content spans distinct domains.
2. **Frontmatter.** `name`; `description` ("what it does. Use when [triggers]." — third person, ≤1024
   chars, the only thing the router sees); `triggers:` (natural-language phrases); `allowed-tools:` (lock
   write-capable finance skills to Read/Bash/named scripts — never free-form write).
3. **Learning loop (mandatory for operational skills).** Accumulate resolved edge-cases into `references/`
   so the skill stops re-deriving them (e.g. `bas-cycle` per-quarter retros; `reconcile-cycle`
   confirmed-duplicates + vendor-aliases).
4. **Money-guards block (mandatory for any skill that emits a dollar figure).** Two-account rule · exclude
   DELETED/VOIDED (NULL-safe) · sum in SQL not supabase-js (PostgREST 1000-row cap) · reconcile against
   the canonical accrual P&L (`project_monthly_financials`) before any figure leaves the building.
5. **Provenance.** Any emitted report/figure gets a `.provenance.md` sidecar.
6. **Tracer-bullet.** Prove ONE transaction end-to-end before any batch.
7. **Maturity gate.** A new skill stays out of the auto-routed set until proven on a tracer-bullet.

## The two-account rule (load-bearing for the whole suite)

ACT business money lives in only **two Xero accounts**: NAB Visa ACT #8815 (card) + NJ Marchesi T/as ACT
Everyday (bank). Exclude `NM Personal` (Nic's pre-cutover) and `NJ Marchesi T/as ACT Maximiser` (savings)
from every ACT total. Every finance skill repeats this guard.

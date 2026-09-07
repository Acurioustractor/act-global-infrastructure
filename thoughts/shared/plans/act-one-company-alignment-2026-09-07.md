# One company, one set of books: the alignment plan (7 September 2026)

> Written after The Harvest's first green trading week and a full read of this repo's entity,
> money, R&D and founder files. Sources are cited inline; anything unsourced says so. Companion
> Harvest-side files: `theharvest/docs/strategy/harvest-money-events-and-people-plan-2026-09.md`,
> `theharvest/.scratch/harvest-financial-model/people-places-entities.ts`, `space-income.ts`.

## Where we actually are, 65 days after the cutover

`wiki/synthesis/entity-migration-truth-state-2026-09-03.md` is the latest dated read:

| Item | State |
|---|---|
| A Curious Tractor Pty Ltd ABN + GST | Done, 1 June 2026 |
| NAB account for the Pty | Unconfirmed. Bank data in the mirror ends 31 March |
| Xero file for the Pty | Unconfirmed. Still one Xero tenant, the sole trader |
| Payroll | Unconfirmed, blocked on the Pty Xero file |
| Shareholders Agreement | Not signed (was Rule 4, week 1 to 2) |
| D&O insurance | 141 days past its deadline |
| Q4 FY26 sole trader BAS | 37 days late |
| Sole trader receivables | $286K over 11 invoices, or $203K over 10 without Rotary. Two files disagree |
| Sole trader tax return | Due 31 October 2026 |

Every project, Harvest included, still trades through Nicholas Marchesi's sole trader. The Harvest
books check on 7 September found the same thing from the other end: Square deposits coded as an
expense, no payroll, one rent payment. The problem is not five entities. It is that the one entity
that should be trading is not switched on.

## The structure, decided once

Three files disagree on the end state (`2026-05-harvest-subsidiary-structure.md`,
`2026-06-12-holdco-structure-proposal.md`, `four-lanes.md`). The holdco proposal's own leaning
note (13 June) is Option A. Take it and stop re-deciding:

```
Knight Family Trust 50 / Marchesi Family Trust 50
    └── A Curious Tractor Pty Ltd            trades everything: Goods on Country, JusticeHub,
        (ACT Pty)                            Empathy Ledger, Studio, Civic Scope, founder payroll,
                                             R&D claimant
            └── The Harvest Pty Ltd          when the landlord takes shares; until then a
                                             tracking category inside ACT Pty
The Butterfly Movement Ltd                   beside the group, arm's length. The only DGR door
The Farm                                     a program on trust-held land. No entity
A Kind Tractor Ltd                           dormant. Not touched
Nicholas Marchesi sole trader                collects its receivables and lodges its return.
                                             Nothing new after the switch date
```

Two things this settles that have been bouncing: no "ACT Projects Pty" until there is a reason
(a Div 615 rollover can add a holdco later without disturbing anything below), and Harvest is a
tracking category first and a company second. The company only earns its keep when Sonas takes
equity; a tracking category gives the founders and the landlord a readable Harvest P&L this
month, not next year.

## The sequence, with dates

Rules first, then containers. Each step is a day-shift job for Ben with Standard Ledger.

| By | Step | Why it is in this order |
|---|---|---|
| 12 Sep | Confirm the NAB Pty account exists and put its feed into a Pty Xero file. Confirm the Pty Xero file exists or open it (same chart, same tracking as `scripts/seed-xero-tracking.mjs`) | Nothing else can start without a file to post to |
| 12 Sep | Bind D&O. Lodge the late Q4 BAS | Both are overdue exposures, not projects |
| 19 Sep | Payroll live in the Pty file: Ben, Nic at the D11.2 base ($10K/month each plus super), Joey and Susie as employees with their splits (`people-places-entities.ts`), any future Harvest host | Founder pay stops being a Div 7A problem; Harvest gets true labour cost; Goods gets an R&D cost base |
| 19 Sep | Switch date for new invoices: everything dated from 22 Sep goes out from ACT Pty. Sole trader keeps its existing receivables (Cutover Rule 1) | Clean line, no re-issue |
| 26 Sep | The monthly recharge journal, first run: Goods facility fee to Harvest, Joey's Goods hours to ACT-GD, shared services from ACT-IN to each project | This is what makes each project's P&L honest |
| 30 Sep | Shareholders Agreement signed (Standard Ledger's lawyer) | Rule 4, four months late; needed before any Harvest share issue |
| Oct | Standard Ledger settles the FY26 fork (journal entry vs market-value sale) and the sole trader return by 31 Oct; Rotary $82.5K chased or written off first | One decision, one return |
| Nov | Cut the four R&D registers to the 24 April to 30 June window and register with AusIndustry; FY27 registers run full-year from the Pty file | Claim ~$26 to 30K for FY26; FY27 is the first real year |
| When Sonas says yes | Incorporate The Harvest Pty Ltd, owned by ACT Pty or the two trusts (decide with the lawyer at the SHA), novate the lease, open its file | Container last |

## Money flows, so the books read

One recharge journal a month, prepared by the same script family that already reads Xero and
Square for Harvest, applied by Standard Ledger:

- **Goods facility fee to Harvest.** Goods on Country builds beds on the Harvest site. Harvest
  charges ACT-GD a share of rent and outgoings by floor area, plus power if metered. Floor area is
  unmeasured; the room map in `theharvest/.scratch/harvest-financial-model/rooms.ts` is where it
  gets written down.
- **Joey's hours the other way.** 50/50 ACT-GD / ACT-HV is the stamped precedent
  (`thoughts/shared/plans/2026-06-10-harvest-goods-10-week-staffing-alignment.md`); Harvest's
  own placeholder is 60/40. Pick one at payroll setup, review quarterly.
- **Shared services.** Ben's build time, GHL, Vercel, Supabase, brand: ACT-IN recharged to each
  project by a fixed monthly share, so ACT-IN stops reading as a $271K hole and each project
  shows what it actually costs to run.
- **Rent on the dwelling.** Joey pays market rent for the front room to the Harvest tenant entity;
  never traded for caretaking by handshake. Susie's Farm rent is Farm income, never Harvest.
- **Donations** go only to Butterfly, which grants to programmes under a written agreement.

## Where the money comes from, and the milestones

Known, sourced income lines, with the entity that should book them from the switch date:

| Line | Entity | Known figures | Source |
|---|---|---|---|
| Goods philanthropy and contracts | ACT Pty (ACT-GD), Butterfly for DGR gifts | FY26 $538K revenue; FY27 projected $585K; capital stack REAL $1.2M/4yr, QLD PFI $640K, QBE ~$210K, Snow ~$200K | `wiki/projects/goods.md` |
| Empathy Ledger field service and MRFF | ACT Pty (ACT-EL) | ~$50K/org/yr; ALIVE $101K paid, $66K outstanding | `wiki/projects/empathy-ledger/annual-field-service.md` |
| JusticeHub grants | ACT Pty (ACT-JH) | FY26 $122K; Minderoo $2.9M paused | `wiki/narrative/funders.json` |
| Harvest till, spaces, events | Harvest tracking, then Harvest Pty | $2,215 best weekend; three rooms let cover rent | Money, weekly (Notion) and `space-income.ts` |
| Civic Scope | ACT Pty until a raise | Tiers $79 to $1,999/mo; not in books yet | `wiki/projects/civicgraph.md` |
| R&D refund | ACT Pty | FY26 window ~$26 to 30K; FY27 full year on ~$354K of registered activity | `thoughts/shared/plans/rd-fy26-window-and-fy27-setup.md` |

The cashflow model that should carry these does not exist. `five-year-cashflow-model.md` (12
April) has FY26 actuals ($1.89M invoiced, $464K burn) and a five-year revenue curve, and the
founders' session on 1 September still lists "runway in months" as open. That is the next build,
and it is small: one script, one Notion table, the same shape as Harvest's Money, weekly, but
ACT-wide and monthly, reading the Pty Xero file once it exists. Until the file exists there is
nothing true to read.

**Milestones the model should show:**
1. Switch date, 22 September: first invoice from the Pty.
2. First payroll run in the Pty, September.
3. First recharge journal, end September, and Harvest's first honest month.
4. Sole trader return lodged, 31 October, receivables collected or written off.
5. R&D registered, November.
6. Harvest Pty incorporated when Sonas commits; lease novated.
7. Twelve months of Pty books, September 2027: the first year anyone can value.

## Equity and profits for the founders, in that order

The founders own ACT Pty 50/50 through their trusts. Equity builds only when the Pty holds
things worth more than it owes: Empathy Ledger's IP, Civic Scope's IP, Goods' capital stack and
contracts, Harvest's lease position and fit-out, and a clean twelve months of books. None of
that is visible while it trades through a sole trader.

The order that builds it: founder base pay on payroll ($10K a month each, D11.2) so "To Us" stops
reading $0; a 25% tax reserve and a $240K a year founder floor (`fy26-27-money-philosophy-and-plan.md`);
the community share of 40% after founder pay (`five-year-cashflow-model.md`); dividends through the
trusts only from Pty profit after those, and only after the FY26 draw question (up to ~$200K each)
is settled with Standard Ledger. Profits for other things come last and are a board decision under
the Shareholders Agreement that is not yet signed.

## The one place this lives

This plan is the strategy; the repo is its home. Status lives in
`wiki/synthesis/entity-migration-truth-state-<date>.md`, refreshed by the existing script. The
Notion Harvest surfaces (review page, dashboard, Money weekly, Spaces) link here and do not copy it.
The per-project pages (`wiki/projects/*`) get one edit each: the entity they trade through from
22 September, and a link to the recharge rule above. Two errors to fix in the same pass:
`goods.md` line 46 gives ACT Pty the sole trader's ABN; `civicgraph.md` still names "ACT
Foundation" and "ACT Ventures".

## Decisions for Ben and Nic

1. **Decided 7 Sep 2026 (Ben): Option A.** A Curious Tractor Pty Ltd trades everything. No holding company and no second trading company now. A holdco can be added later by Div 615 rollover if an investor or a sale forces it.
2. Switch date for Pty invoicing: 22 September, or name another.
3. Joey's split: the stamped 50/50 or Harvest's 60/40.
4. Harvest Pty owner when it is incorporated: ACT Pty or the two trusts direct. Ask the lawyer at the SHA.
5. Rotary $82.5K: chase or write off before 31 October.
6. FY26 founder draw: settle the ~$200K each question with Standard Ledger before the return.
7. Goods facility fee basis: floor area, or a flat monthly number. Someone measures the floor.

## What runs without a decision

- Ben and Standard Ledger: NAB and Xero confirmation, D&O, late BAS. This week.
- The recharge journal script, built from Harvest's `books:check` and `money:week` pattern. Next.
- The ACT-wide monthly money table in Notion, the moment the Pty file has a month in it.
- Project page edits and the two errors above.

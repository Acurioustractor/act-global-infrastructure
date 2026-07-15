# The system, one picture

*Draft for Ben + Nic, 2026-07-15. This is the overview that comes BEFORE the automations, per the design-first decision (`wiki/decisions/2026-07-15-automation-freeze-design-first.md`). React to it, cut it down, then what survives becomes `wiki/concepts/` and everything else gets rebuilt to serve it. Sources: the everyday-engine and relationship-spine syntheses, the field-desk alignment report, and this week's live audits.*

---

## 1. The brand layer: what all of this serves

A Curious Tractor transfers power like a tractor's power take-off: the engine is ours, the work is community's, and we design for handing over the keys. The method is LCAA: Listen, Curiosity, Action, Art. The rule that orders every dollar and every relationship:

**The orbit pays. The constellation is paid.**

Funders, service organisations, government buyers and procurement pay ACT. Storytellers, Elders, anchor communities get paid, get their stories back, get the 40% share. Two lanes, never one funnel. Every system below exists to keep those two lanes honest and moving.

## 2. The system: one mental model, six rooms

One model now spans GrantScope's desk, this repo's infrastructure, and the daily practice. Every piece of work lives in one of six rooms:

| Room | The question it answers | System of record |
|---|---|---|
| **Today** | What needs moving now? | The morning read + the daily action memory |
| **Listen** | Who are we in relationship with, and what does the history say? | GHL (orbit) + Empathy Ledger (constellation) + the comms spine |
| **Curiosity** | What's out there worth pursuing? | GrantScope discovery + funder dossiers + decision memory |
| **Action** | What have we committed to, and what's the next move? | GHL pipelines (4, per the July ADR) |
| **Money** | What was invoiced, paid, owed, reciprocated? | Xero. Only Xero. |
| **Sources** | Is the evidence fresh, and what's broken? | sync_status + the freshness monitor + the drift checks |

Under the rooms, five layers, already real in the code: **ingest** (webhooks, syncs) → **mirror** (the shared Supabase both repos read) → **derive** (rollups, intelligence) → **surface** (what humans open) → **guard** (the write-path libraries that keep money math pinned, rings human-only, and community data out of funnels).

## 3. The surfaces: what two humans actually touch

The test of the whole system is small: a handful of surfaces, opened on a phone or with coffee, that are TRUE. Everything else is plumbing for these.

**Daily (Ben, 5 minutes):** the Field morning read. Seven actions or fewer, the owes block, the energy check, and honest banners when the data behind it is stale.
**Daily (capture, 30 seconds each):** one voice note per yarn to the Telegram bot. The trip stops leaking; the night shift files it.
**Weekly (Ben + Nic, Monday):** the Monday card + PPPP scan. Money truth, pipeline moves, what shipped, what's owed.
**When deciding (either):** a person page before a meeting; the cockpit before a money call; the funder dossier before an ask.

If a surface isn't on this list, it must either earn its way on or stop being generated.

## 4. The automation policy: manual first, cron when earned

What this week proved: unwatched automation rots silently. 131 dead crons, a sync that lied, a canary that lied. So the policy inverts the old habit:

1. **Everything starts manual.** A script is run by hand, its output read by a human, through at least two real cycles.
2. **A schedule is earned, not assumed.** The bar (full text in the ADR): a named surface someone reads, sync_status on success and failure, loud total-failure, a freshness threshold, a place on the field-desk map, and failure that lands in Telegram, never in silence.
3. **The frozen baseline (~42 processes) is the ceiling** until the overview above is agreed. It covers the daily surfaces, the comms/money spine, and the watchers that would have caught this month's failures.
4. **Frozen does not mean forbidden.** Any parked script can be run manually when a live commitment needs it (a funder deadline, BAS, payroll).

## 5. The build sequence from here

1. **Agree this page** (Ben + Nic, 20 minutes of the next session). Cut anything that doesn't ring true.
2. **Name the surfaces** you both commit to reading. That list is the whole demand-side of the system.
3. **Re-add automations one at a time**, only ones that feed a named surface, each clearing the bar. Likely first: the Telegram capture tool (it serves the daily habit, not a report), then the Notion mirrors ONLY if Notion stays a surface you read.
4. **The brand work rides on top:** the same six rooms structure the public story (act.place, funder decks, the wiki). One model inside and out.

## What this replaces

Not the code. The habit of adding a cron because the code exists. The infrastructure built this week (honest canaries, sync_status everywhere, the drift checks, the field-desk map) is what makes a small automation surface trustworthy. The freeze is what keeps it small until the design deserves it.

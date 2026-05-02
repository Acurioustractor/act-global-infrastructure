---
title: ACT CEO Operating Model — how to use the brain every day
summary: How Ben interacts with the ACT Brain daily, weekly, monthly. Function-by-function map of what the brain serves (finance, funders, comms, design, ops, strategy, governance, knowledge). Categorised next steps by business area. The shift from founder-mode to CEO-of-a-system.
tags: [decisions, brain, ceo, operating-model, navigation]
status: live
date: 2026-04-25
---

# ACT CEO Operating Model

The brain (act-core-facts + brand alignment map + cockpit + Alignment Loop) exists so you stop carrying ACT in your head. This doc is how you USE it.

## The shift

Moving FROM → moving TO:

| Before today | After today |
|---|---|
| "I need to remember Snow's still outstanding" | Cockpit says it every morning, named, with $ + days |
| "I think Standard Ledger is doing the SHA next month" | Migration plan has Rule 4 — SHA Week 1-2; cockpit lists it as open |
| "Brand decisions made fresh on each project" | Brand alignment map: read first, deviate intentionally |
| "Each repo has its own context — Claude has to learn each time" | ACT Context block in every CLAUDE.md — every Claude session arrives oriented |
| "I should run a check on outstanding receivables" | Friday's drift PR shows the diff vs last week |
| "How aligned are projects across wiki/DB/code/Xero?" | Q2 synthesis runs weekly, scores all 72 codes |
| Scattered todos in head, Notion, Telegram, email | One open-actions list in act-core-facts.md, one cockpit page |

The unit of CEO attention is now the PR + the cockpit. Not "what's in my head."

## Daily / weekly / monthly cadence

```
EVERY MORNING (07:00 Brisbane, daily)
  └─ Open PR titled "Daily cockpit refresh — YYYY-MM-DD"
     ├─ Headline: days to cutover, $ outstanding, latest commit
     ├─ Decisions blocked on you (named, $, days old)
     ├─ Open actions from CEO review (12 items)
     ├─ What's moving (recent commits + syntheses)
     └─ This week ahead

EVERY FRIDAY (08:00 Brisbane, weekly)
  └─ Open PR "Daily cockpit refresh — YYYY-MM-DD" (Friday's edition)
     PLUS open PR "Alignment Loop drift refresh"
     ├─ Q1 funder-alignment delta
     ├─ Q2 project truth-state delta (now multi-repo)
     ├─ Q3 entity-migration truth-state delta
     └─ Drift summary highlighting what moved this week

EVERY MONTH (first Friday)
  └─ Manual scan of brand alignment map
     ├─ Does each sub-brand still match its DESIGN.md?
     ├─ Has any sub-brand site moved away from its declared cluster?
     └─ Drift = update map or fix the surface

ON ANY EDIT to act-core-facts.md or brand-alignment-map.md
  └─ Run: node scripts/sync-act-context.mjs --apply
     └─ Distributes to 8 ACT repos' CLAUDE.md
     └─ Commit each downstream when ready

ON ANY NEW DESIGN WORK in any ACT repo
  └─ Read brand alignment map FIRST
     └─ Find the closest existing sub-brand
     └─ Work from its DESIGN.md
     └─ If novel: update the map BEFORE shipping
```

## Function-by-function: how the brain serves each area

### Finance + Cash management
- **Cockpit shows**: outstanding receivables ($507K total, top 3 named, age in days), DRAFT count, AUTHORISED count, Xero activity today
- **Synthesis surfaces**: full Q1 funder-alignment with last-comm dates + 90+-day silent funders
- **Source-of-truth**: act-core-facts.md (entity layer, $ table, cutover rules)
- **Daily action**: scan cockpit's "Decisions blocked on you" — anything ≥30 days old needs your attention this week
- **Weekly action**: read Q1 drift PR, action anyone newly silent

### Funder relations + Fundraising
- **Cockpit shows**: Snow / Centrecorp / Rotary status; named decisions
- **Synthesis surfaces**: funder-alignment Q1 with stage transitions, new entries appearing in Xero
- **Source-of-truth**: `wiki/narrative/funders.json` (21 funders, claims_to_lead_with, framing_notes)
- **Drafts**: `thoughts/shared/drafts/novation-letter-templates.md` (ready for Standard Ledger review)
- **Daily action**: if a funder needs a call, do it; if a tranche due, follow up
- **Strategic action**: Minderoo lands mid-May; pitch already in `thoughts/shared/writing/drafts/goods-minderoo-pitch/`

### Brand + Design (any sub-brand work)
- **Read first**: `wiki/decisions/act-brand-alignment-map.md`
- **Decision tree**: data tool → CivicGraph cluster; multi-tenant storytelling → EL v2; STAY journal extension → JusticeHub; default → parent editorial (act-regenerative-studio)
- **Per-repo**: each repo's DESIGN.md now has parent-inheritance header + map pointer
- **Action**: never re-decide what's already decided. If genuinely new, update the map before shipping

### Communications + Public-facing writing
- **Voice rules**: `.claude/skills/act-brand-alignment/references/writing-voice.md` (Curtis method + AI-tells blocklist)
- **Identity**: `.claude/skills/act-brand-alignment/references/brand-core.md` (LCAA, voice, project narratives)
- **Naming rules**: in act-core-facts.md (first-use Accountable Listening and Meaningful Action (ALMA); call the intervention map JusticeHub evidence; no bare "LCAA"; Indigenous place names always; no em-dashes)
- **Daily action**: nothing — this surfaces only when you write
- **Whenever drafting**: load both writing-voice.md + brand-core.md before composing (every Claude session in any ACT repo already has the pointers via CLAUDE.md)

### Project delivery + Operations (74 → 72 codes)
- **Source-of-truth**: `config/project-codes.json` (v1.8.0, all canonical_slug populated)
- **Synthesis surfaces**: Q2 project truth-state — every project scored across wiki/DB/codebase/Xero
- **Multi-repo aware** (as of today): a project living entirely in goods/ or empathy-ledger-v2/ is now visible in Q2
- **Weekly action**: read Q2 drift PR, check if any active project dropped below 2/4 (acceptance criterion)
- **Authoring backlog**: `ACT-PS` PICC On Country Photo Studio still has no wiki article

### Cutover + Entity governance (the 67-day countdown)
- **Source-of-truth**: `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`
- **Cutover rules** (from CEO review): Rule 1 (pre-cutover invoices stay with sole trader) · Rule 2 (honest-delay fallback) · Rule 3 (Rotary is recovery not novation) · Rule 4 (SHA Week 1-2)
- **Synthesis surfaces**: Q3 entity-migration truth-state — section-by-section status counts, red-list items
- **Weekly action**: read Q3 drift PR. Watch for: NAB account appears in bank_statement_lines (Pty bank live); 2nd xero_tenant_id appears (Pty Xero live); novation drafts appear in thoughts/shared/drafts/
- **This-week red-list**: Director IDs, NAB application, ABN filing, insurance broker, SHA drafting

### Strategy + Long-horizon thinking
- **Source-of-truth**: scattered intentionally — strategy emerges from synthesis, not from a single doc
- **Surfaces**: Q1 + Q2 + Q3 syntheses tell you the live state; the cutover plan tells you the binding deadline; the brand map tells you the visual coherence
- **Brain doesn't replace strategy** — it removes the friction so strategy is what you spend time on
- **Action**: weekly. Read all three Friday drift PRs. Spot patterns. Decide.

### Knowledge + Wiki (the wider second-brain)
- **Source-of-truth**: `wiki/` in this repo; auto-builds 3 viewer surfaces (tractorpedia, command-center wiki, regen-studio wiki)
- **OCAP governance**: per-project `wiki/projects/...` notes + `project_wiki_story_sync.md` memory
- **Action**: when a story needs to land publicly, check OCAP status first. The brain doesn't replace consent — it surfaces whether consent exists

### Cross-repo development (any Claude session in any ACT codebase)
- **Every CLAUDE.md** now has the ACT Context block at the bottom: entity, cutover rules, $ outstanding, naming + voice, brand cluster, source-of-truth pointers
- **First action when opening a Claude session in any ACT repo**: the block is read automatically — no manual briefing needed
- **If the block is stale**: edit upstream (`wiki/decisions/act-core-facts.md`), re-run sync, commit per-repo

---

## Next steps — categorised by function

### A. Business operations (the cutover — bound by 30 June)
- [ ] Director IDs confirmed for Ben + Nic — **this week** (blocks ABN filing)
- [ ] NAB Pty business account applied — **this week** (2-week onboarding)
- [ ] ABN + GST issued via Standard Ledger — Week 1-2
- [ ] Pty Xero file opens — Week 3 (Standard Ledger)
- [ ] Insurance broker selection (PL $20M + D&O) — Week 1
- [ ] D&O insurance bound — by **2026-05-24** (within 30 days of registration)
- [ ] Shareholders Agreement drafted + signed — Week 1-2 (per Rule 4)
- [ ] R&D FY26 records review with dedicated R&D consultant — by end May (~$47K audit-exposure protection)
- [ ] IP clause audit on grant + partnership contracts — Week 4-5 (blocks IP deed)
- [ ] Buyer assignment-clause audit for 19 Goods on Country buyers — Week 4-5
- [ ] Stripe subscription migration plan with 30+ day customer notice — Week 6-7
- [ ] Dry-run $1 test invoice from Pty Xero — Week 8
- [ ] Secrets hygiene: rotate Pty Xero / Stripe / NAB creds into env vars — Week 3-4

### B. Finance — receivables + close-out (only-Ben + only-Nic decisions)
- [ ] **INV-0314 Centrecorp $84,700 DRAFT** — send / void / reissue from Pty (10-min Nic conversation, 4+ sessions overdue)
- [ ] **INV-0321 Snow Foundation $132,000 AUTHORISED 37d** — call Sally/Alexandra: confirm payment + Pty migration notice
- [ ] **INV-0222 Rotary eClub $82,500 AUTHORISED 380d** — chase or write off (per Rule 3, recovery not novation)
- [ ] Aleisha Keating retainer ($11.7K outstanding × 26 weekly invoices) — decide if continues under Pty
- [ ] Regional Arts Australia $33K (129d) — chase
- [ ] Just Reinvest $27.5K — chase
- [ ] PICC INV-0317 + INV-0324 ($113K) — confirm payment timing
- [ ] FY26 R&D claim prep — see business operations above

### C. Funder relations + Fundraising
- [ ] Minderoo pitch lands **mid-May 2026** — Lucy Stronach confirmed; ask $900K over 3 years tapered; consolidated draft at `thoughts/shared/writing/drafts/goods-minderoo-pitch/`; awaiting Ben voice review
- [ ] Snow Foundation Pty migration call — combined with INV-0321 follow-up
- [ ] Reconcile Minderoo ask figure — wiki says $2.9M; Goods pitch says $900K; one canonical number with Nic
- [ ] Decide on 4 silent 107-day contacts (Bryan Foundation, The Funding Network, AMP Foundation, Queensland Gives) — re-engage or drop
- [ ] June Canavan Foundation status verification — wiki claims active-partner $60K but no Xero invoice; confirm with Nic
- [ ] Update `funders.json` with any newly verified facts after each funder call
- [ ] Run `node scripts/sync-act-context.mjs --apply` after funder facts change

### D. Communications + Writing
- [ ] **Novation letter template review** — Standard Ledger review of `thoughts/shared/drafts/novation-letter-templates.md` before any letter sends
- [ ] **Novation letters** to all 21 counterparties — Week 5-6 (per current plan; CEO review noted concentration risk but you held the schedule)
- [ ] Cutover announcement email draft — week of 1 July (or earlier if front-loading)
- [ ] Email/website footer updates staged — Week 9
- [ ] Gmail MCP re-auth → send Centrecorp nudge to Nic (drafted but blocked on auth from yesterday)
- [ ] Goods pitch arc — Lucy review when ready

### E. Strategy
- [ ] Read first weekly Alignment Loop drift PR (Friday 2026-05-01) — calibrate what "drift" actually surfaces
- [ ] Decide on the 4 silent 107-day funders (above) — these probably need a strategic re-frame, not just a chase
- [ ] Post-cutover scope: when does Harvest entity design start? Farm entity? DGR application? — these are scoped for after 30 June but worth a 2-week pre-decision window in late June
- [ ] Phase-2 brain expansion priority — Phase 2b (email content surfacing) most likely next; Phase 2c (Notion body sync) second; Phase 3 (bidirectional) deferred. Decide after 2-3 weekly cycles when you see what the loop misses
- [ ] CEO Cockpit Phase 2 — calendar integration, day-over-day diff, email triage, Telegram push (`thoughts/shared/plans/act-ceo-cockpit.md`)

### F. Brand + Design
- [ ] Goods CLAUDE.md exists, DESIGN.md written — but `goods/` isn't a git repo. `git init` + push to a Goods repo if you want it tracked
- [ ] Harvest Bauhaus exploration: explicitly demote `/bauhaus` route to "design sandbox" with banner; or commit to Bauhaus and update the alignment map (you already chose: drop Bauhaus, adopt parent visual)
- [ ] Audit Harvest's existing components against parent palette — re-skin needed before next major Harvest page ships
- [ ] Audit goodsoncountry.com against the new `goods/DESIGN.md` — run `/design-review` against the live site
- [ ] Audit ACT Photography on Country (ACT-PS): only authoring backlog item from Q2 — if active, draft `wiki/projects/picc/picc-on-country-photo-studio.md`

### G. Governance
- [ ] Pty minute book opened (registration entry, director acceptance, share subscription, banking resolution) — Standard Ledger to handle most
- [ ] Shareholders Agreement signed — see business operations above (Week 1-2)
- [ ] First ASIC annual review — ~2026-04-24 (next year); set a calendar reminder for April 2027
- [ ] ACNC annual information statement for A Kind Tractor — ongoing obligation, due in calendar
- [ ] DGR application decision — parked but worth calendar reminder for August (post-cutover, when you have headspace)

### H. Knowledge + Brain (deferred Phase 2 work)
- [ ] Phase 2b — email content surfacing into Q1 (`thoughts/shared/plans/act-brain-expansion.md`)
- [ ] Phase 2c — Notion document body sync into Q2/Q3 (`thoughts/shared/plans/act-brain-expansion.md`)
- [ ] CEO Cockpit Phase 2 — see Strategy above
- [ ] Q1 + Q3 automation scripts (Phase 2 of Alignment Loop — `synthesize-funder-alignment.mjs`, `synthesize-entity-migration-truth-state.mjs`)
- [ ] Day-over-day diff in cockpit
- [ ] Multi-repo Q2 ghosts — re-evaluate whether ACT-EFI + ACT-GCC should be re-added to config (they got removed because of low single-repo refs; multi-repo scan shows they have presence in act-regenerative-studio)
- [ ] PALM ISLAND repository: no CLAUDE.md yet; if it's an active workspace, add one

---

## How to manage this professionally as CEO (the meta)

### Daily ritual (10 minutes max)
1. Open the daily cockpit PR. Read top-to-bottom.
2. The "Decisions blocked on you" list IS today's CEO work. Not your inbox.
3. Anything you do that day, do as your CEO self — not your founder-doing-it-yourself self.

### Weekly ritual (45 min, Friday morning)
1. Open Friday's drift PR. Compare to last week.
2. For each new red item: who owns it? When? What's the next observable signal?
3. Update `act-core-facts.md` if any fact changed. Run sync.
4. Friday's cockpit (Saturday morning's edition) shows the new state.

### Monthly ritual (60 min, first Friday)
1. Brand alignment map scan — drift in any sub-brand?
2. Open-actions audit — any action sitting >30 days? Triage: do, delegate, drop.
3. Plan-level re-read — migration checklist, brain expansion, cockpit plan. Anything that should change, change.

### Quarterly ritual (half day)
1. Full retrospective: what did the brain catch that you would have missed? What did it MISS?
2. Phase-2/3/4 priority decisions for the brain.
3. Any function that's not visible in the brain → add it.

### What you DON'T do anymore
- Carry $ figures in your head (cockpit has them)
- Remember to chase Snow / Centrecorp / Rotary (cockpit names them)
- Re-brief Claude on entity facts in each repo (CLAUDE.md has them)
- Re-decide brand questions per project (alignment map decides them)
- Manually check "are we drifting?" (Friday's drift PR answers it)
- Hold the weekly to-do list in your head (act-core-facts.md holds it)

### What you DO do (the CEO work that's left)
- Decide. The cockpit + drift PRs surface decisions; you make them.
- Talk to people. Funders, Standard Ledger, NAB, partners, communities. The brain doesn't replace these conversations; it makes sure you're in them with current data.
- Set strategy. The brain doesn't tell you what to do; it tells you what's true. Strategy is what you do with the truth.
- Iterate the brain itself. When something's missing, add it. The brain is software; software changes.

---

## When the brain breaks (failure modes)

| Symptom | Diagnosis | Fix |
|---|---|---|
| Daily cockpit PR didn't open this morning | Daily agent failed (Supabase down, env error, branch conflict) | Check https://claude.ai/code/routines/trig_01E6LXqwyCpgCekqvM6M1vKJ ; manual rerun; check `wiki/cockpit/today.md` last-modified |
| Cockpit page shows stale numbers | Xero / GHL sync cron didn't fire overnight | Check PM2 logs; cockpit reads from Supabase, sync writes to Supabase, both must be running |
| Weekly drift PR didn't open Friday | Weekly agent failed | Same trigger pattern; check https://claude.ai/code/routines/trig_018X1ZRtc9zdgFENiYsx5t8c |
| Brand alignment map says X but a sub-brand site does Y | Drift between map and reality | Update map (the prescription) or fix the surface (the description) — don't leave the contradiction |
| ACT Context block in some repo's CLAUDE.md is stale | Sync hasn't run since the source changed | `node scripts/sync-act-context.mjs --apply` from the hub repo |
| New facts emerge but cockpit doesn't show them | act-core-facts.md not updated | Edit the file; sync; commit; tomorrow's cockpit shows them |

---

## Backlinks

- [[README|Brain README — read first]]
- [[act-core-facts|Entity layer source-of-truth]]
- [[act-brand-alignment-map|Brand alignment map]]
- [[../cockpit/today|Today's cockpit]]
- [[../../thoughts/shared/plans/act-brain-expansion|Brain expansion plan]]
- [[../../thoughts/shared/plans/act-ceo-cockpit|CEO cockpit plan]]
- [[../../thoughts/shared/plans/act-alignment-loop|Alignment Loop plan]]
- [[../../thoughts/shared/plans/act-entity-migration-checklist-2026-06-30|Cutover plan]]

---
title: ACT Core Facts — single source of truth for cross-repo context
summary: Authoritative facts about ACT's entities, cutover, key people, projects, and active commitments. This file is the UPSTREAM source for the auto-generated "ACT Context" block synced to every active ACT codebase's CLAUDE.md. If a fact here is wrong, downstream is wrong.
tags: [decisions, brain, source-of-truth, entity-structure, cutover]
status: live
date: 2026-04-25
review_cadence: weekly (via Alignment Loop agent)
---

# ACT Core Facts

> **This file is the upstream source.** `scripts/sync-act-context.mjs` reads this file and updates the "ACT Context" section in every active ACT codebase's CLAUDE.md. Edit here, run the sync, propagate everywhere. Never edit downstream copies — they'll be overwritten.

> **Update cadence:** human-edited as facts change; weekly verification by the Alignment Loop agent diffing against Supabase reality.

> **Source upstream of this file:** [[../concepts/soul|Soul]] holds the founder why. This file holds the facts that serve it. If a fact here ever contradicts soul, soul is right and this file needs an edit.

---

## Last verified
- **Date:** 2026-04-25
- **Verified against:** entity-migration-truth-state-2026-04-24.md, MEMORY.md, ASIC registration record
- **Next verification:** Alignment Loop weekly run (every Friday 08:00 Brisbane)

---

## Entities (legal structure as of 2026-04-25)

| Entity | Type | ACN/ABN | Status | Purpose |
|--------|------|---------|--------|---------|
| **A Curious Tractor Pty Ltd** | Pty Ltd (shares) | ACN 697 347 676; ABN PENDING | **Registered ASIC 2026-04-24** | Primary trading entity from 1 July 2026. Shareholders: Knight Family Trust (50) + Marchesi Family Trust (50). Directors: Ben Knight + Nicholas Marchesi. Bank: NAB. Accountant: Standard Ledger. |
| **Nicholas Marchesi (sole trader)** | Individual | ABN 21 591 780 066 (active 2007, GST since 2022) | **Trading until 30 June 2026** | Currently holds all consulting + grants + Goods + JusticeHub revenue. Hard cutover to Pty 30 June. |
| **A Kind Tractor Ltd** | Company Limited by Guarantee | ACN 669 029 341, ABN 73 669 029 341 | ACNC-registered 2023-12-11 (GST + Income Tax exempt; **NOT DGR**, application parked) | Charitable mission holder, currently dormant. Backstop vehicle for DGR-only funders if ever activated. |
| Harvest entity | TBD | — | Designing | Pending Standard Ledger advice. Drivers: food-safety liability, investor structure, tax. |
| Farm entity | TBD | — | Designing | Pending Standard Ledger advice. Drivers: land ring-fencing, insurance, primary production tax. |

**Do NOT use** the labels "ACT Foundation" or "ACT Ventures" as legal entity names. They are conceptual labels in older docs; not real entities.

**On first reference:** "A Curious Tractor Pty Ltd" → then "the Pty"; "A Kind Tractor Ltd" → then "the charity".

### Why this structure

Three trading entities, one charity, one winding-down sole trader. The point is not bureaucracy.

Each project earns the right to grow on its own revenue. The Harvest's money funds the Harvest's growth. Farm money funds Farm growth. A Curious Tractor Pty Ltd is the holding muscle that carries the founder relationship and the cross-cutting work.

If we ran a single Pty Ltd with three project codes, the financial story would mash. Founders would have no clean way to see whether each project pays its way. To Grow at Harvest would be invisible to Farm.

The structure costs more in compliance. It saves more in legibility. Legibility is what makes the soul able to read its own body.

For how money flows through these entities and into the four lanes (To Us, To Down, To Grow, To Others), see [[../concepts/four-lanes|The Four Lanes]]. For the upstream why behind any of this, see [[../concepts/soul|Soul]].

---

## The cutover (30 June 2026 — 66 days from today)

Sole trader stops accepting new transactions at close of business 30 June 2026. Pty starts trading 1 July 2026 (FY27).

### Cutover rules (decided 2026-04-24 CEO review)

**Rule 1 — Pre-cutover invoices stay with sole trader.**
Invoices issued under sole trader ABN before 30 June 2026 get paid to the sole trader bank account regardless of when payment lands. Matches ATO income recognition. FY26 R&D attribution stays clean. Sole trader bank account stays open through FY27 Q1 minimum for run-off receipts. **Novation letters to existing funders MUST say:** "existing invoices pay as normal; new tranches from 1 July invoice to the Pty."

**Rule 2 — Honest-delay fallback.**
If ABN / NAB / Pty Xero is not invoice-ready by 1 July, the sole trader continues trading until the Pty is genuinely live. Announcement email + website/invoice-footer updates happen when the real cutover occurs, not on an aspirational date. Protects against ATO exposure from sole trader issuing invoices past a registered cutover date or Pty issuing retroactive invoices without an operational Xero file.

**Rule 3 — Rotary INV-0222 is a recovery problem, not a novation one.**
$82,500 AUTHORISED 380+ days unpaid does not need a novation letter. Needs a chase-or-write-off decision. Tracked separately from the migration batch.

**Rule 4 — Shareholders Agreement is Week 1-2, not Week 4-5.**
Pty has two equal shareholders from two separate family trusts. Until SHA is signed, Corporations Act defaults apply (deadlock, dividend discretion, 50/50 removal votes). For 9-week cutover with grants landing + Minderoo potentially due-diligencing the Pty, this is latent risk. Standard Ledger's referred lawyer drafts from template.

### Outstanding receivables on sole trader (~$507K total)

| Counterparty | Invoice | Amount | Status | Notes |
|--------------|---------|--------|--------|-------|
| Snow Foundation | INV-0321 | $132,000 | AUTHORISED | Multi-tranche partner; Sally/Alexandra contact; needs Pty migration call |
| Centrecorp Foundation | INV-0314 | $84,700 | DRAFT | Goods Production Plant tranche 2; awaiting only-Ben send/void/reissue decision |
| Rotary eClub Outback Australia | INV-0222 | $82,500 | AUTHORISED 380d | Per Rule 3 — chase-or-write-off, not novation |
| PICC | INV-0317, INV-0324 | $113,300 | AUTHORISED | Partner receivables |
| Regional Arts Australia | INV-0301, INV-0302 | $33,000 | AUTHORISED 129d | Chase needed |
| Just Reinvest | INV-0295 | $27,500 | AUTHORISED | JusticeHub partner |
| Brodie Germaine Fitness | INV-0325 | $15,400 | AUTHORISED | BG Fit |
| Aleisha J Keating | INV-0238..0307 (×26) | $11,700 | AUTHORISED weekly | Recurring retainer; decide if continues under Pty |
| Homeland School | INV-0303 | $4,950 | AUTHORISED | JusticeHub partner |
| SMART Recovery | INV-0322 | $2,200 | AUTHORISED | SMART partner |

### Open actions (CEO-review 2026-04-24, all owners + due dates)

- [ ] Director IDs confirmed for Ben + Nic — Week 1 (this week)
- [ ] NAB Pty business account applied — Week 1, 2-week onboarding
- [ ] Standard Ledger briefed — DONE per memory
- [ ] Insurance broker selection (PL $20M + D&O) — Week 1, D&O bound by 2026-05-24
- [ ] **Shareholders Agreement drafted + signed** — Week 1-2 (per Rule 4)
- [ ] Centrecorp INV-0314 disposition decided — Week 1
- [ ] **R&D FY26 records review with dedicated R&D consultant** — by end May ($47K audit-exposure protection)
- [ ] **IP clause audit on grant + partnership contracts** — Week 4-5, before IP deed
- [ ] **Buyer assignment-clause audit for 19 Goods on Country buyers** — Week 4-5
- [ ] Novation letters sent to all funders + commercial counterparties — Week 5-6
- [ ] **Stripe subscription migration plan with 30+ day customer notice** — Week 6-7
- [ ] **Secrets hygiene: rotate Pty Xero / Stripe / NAB creds** — Week 3-4
- [ ] **Dry-run $1 test invoice from Pty Xero** — Week 8
- [ ] Pty Xero file opens — Week 3 (Standard Ledger)

---

## Key people

### Founders + directors
- **Benjamin Knight** — co-founder, director. ben@benjamink.com.au. Builds.
- **Nicholas Marchesi OAM** — co-founder, director. nicholas@act.place. Vision/design direction. Orange Sky co-founder.

### Service providers
- **Standard Ledger** — engaged accountant. Handles ABN, GST, BAS, R&D coordination, lawyer referral for Shareholders Agreement.
- **NAB** — bank for Pty. Application in flight.

### Active funders (top of pipe)
- **QBE Catalysing Impact** — already contracted to Pty Ltd
- **Minderoo Foundation** — pitch lands mid-May 2026; primary contact Lucy Stronach (lstronach@minderoo.org)
- **Snow Foundation** — Sally Grimsley-Ballard / Alexandra Lagelee Kean; multi-tranche partner
- **Paul Ramsay Foundation** — William Frazer; partner-tagged in GHL
- **June Canavan Foundation** — relationship status unverified (no Xero invoice)
- **Dusseldorp Forum** — Rachel Fyfe / Jessica Duffy; active partner

### Indigenous community partners (cultural protocols apply)
- **Oonchiumpa (Mparntwe)** — Kristy Bloomfield + Tanya Turner
- **PICC (Palm Island)** — Rachel Atkinson (spelled Rachel, NOT Rachael)
- **Mounty Yarns (Mount Isa)** — Daniel Daylight CEO
- **BG Fit (Mount Isa)** — Brodie Germaine

---

## Projects (74 codes, ecosystem tier first)

### Ecosystem tier (the 5 platforms)
- **ACT-JH** JusticeHub — `justicehub.com.au`
- **ACT-GD** Goods on Country — `goodsoncountry.com`
- **ACT-EL** Empathy Ledger — `empathyledger.com`
- **ACT-CORE** ACT Regenerative Studio — `act.place`
- **ACT-FM** The Farm
- **ACT-HV** The Harvest Witta — `theharvestwitta.com.au` (lease starts 2026-07-01, early access from 2026-01-01)

Full list: `config/project-codes.json` (v1.8.0, 74 projects, all with canonical_slug).

### Active commitments by project
- **ACT-JH** — judges-on-country experience 2026-04-21 hosted at Oonchiumpa
- **ACT-GD** — Minderoo $900K pitch mid-May; Centrecorp tranche 2 pending; Snow tranche 7 outstanding
- **ACT-HV** — lease signing pending Sonas Properties; capital improvement fund $250K; base rent $50K/yr; Harvest entity design TBD
- **ACT-FM** — new lease to Pty (Nic landlord); arm's-length rate from Standard Ledger; Farm entity design TBD
- **ACT-EL** v2 storyteller portal live; OCAP governance + verbal consent active; cross-org photo manager shipped

---

## Naming & voice (always apply)

- **"Accountable Listening and Meaningful Action (ALMA)"** — spell out on first use; never use bare "ALMA" in external copy
- **"JusticeHub evidence map"** or **"ALMA-governed JusticeHub evidence"** — use this for the intervention map; do not call the map "ALMA"
- **"Listen · Curiosity · Action · Art"** — never bare acronym "LCAA" in external copy
- **Indigenous place names always**, colonial in brackets only
- **No em-dashes** in any ACT-facing writing (journals, pitches, web copy, posts)
- **No AI tells**: delve, crucial, pivotal, tapestry, underscore, "not just X but Y", rule-of-three adjectives, "challenges and future prospects", `-ing` significance tails
- **Voice (Curtis method)**: name the room, name the body, load the abstract noun, stop the line before the explanation
- For ANY public-facing ACT writing, load `.claude/skills/act-brand-alignment/references/writing-voice.md` first

---

## Technical infrastructure

### Supabase instances
| Project | Ref | Used by |
|---------|-----|---------|
| **Shared ACT/GS** | `tednluwflfhxyucgwigh` | Command Center, bot, GrantScope, scripts, Alignment Loop |
| **Empathy Ledger v2** | `yvnuayzslukamizrlhwb` | EL v2 storyteller app |
| **EL unused** | `uaxhjzqrdotoahjnxmbj` | No active credentials |

Always run `mcp__supabase__get_project_url` to verify which instance MCP is connected to.

### Wiki + knowledge surfaces
- Source-of-truth: `wiki/` in `act-global-infrastructure` repo (this file lives there)
- Push-triggered CI rebuilds 3 viewer surfaces:
  - `act-global-infrastructure.vercel.app/tractorpedia.html`
  - `act-global-infrastructure.vercel.app/wiki` (Command Center)
  - `act-regenerative-studio.vercel.app/wiki` (full set, 326 articles)
- Synthesis docs (Alignment Loop outputs) at `wiki/synthesis/`

### Alignment Loop
- Plan: `thoughts/shared/plans/act-alignment-loop.md`
- Q2 script: `scripts/synthesize-project-truth-state.mjs`
- Weekly agent: `trig_018X1ZRtc9zdgFENiYsx5t8c` — every Friday 08:00 Brisbane
- Output: `wiki/synthesis/{funder-alignment,project-truth-state,entity-migration-truth-state}-YYYY-MM-DD.md`

### Active ACT codebases (sync targets for this file)
1. `/Users/benknight/Code/act-global-infrastructure` (this — hub)
2. `/Users/benknight/Code/act-regenerative-studio`
3. `/Users/benknight/Code/empathy-ledger-v2`
4. `/Users/benknight/Code/JusticeHub`
5. `/Users/benknight/Code/goods` (or Goods Asset Register)
6. `/Users/benknight/Code/grantscope` (CivicGraph / GrantScope)
7. `/Users/benknight/Code/Palm Island Reposistory` (note original mis-spelling)
8. `/Users/benknight/Code/act-farm`
9. `/Users/benknight/Code/The Harvest Website`

The sync script (`scripts/sync-act-context.mjs`) generates an "ACT Context" block from this file and updates each repo's CLAUDE.md.

---

## How this file gets reviewed

1. **Human edit** — Ben edits this file when a fact changes (Pty ABN issued, novation sent, rule changed)
2. **Weekly verification** — the Alignment Loop agent (Friday 08:00 Brisbane) cross-checks against Supabase reality. If the entity-migration-truth-state synthesis surfaces a contradiction, it flags the diff in the PR.
3. **On-demand** — running `node scripts/sync-act-context.mjs --verify` reads this file, compares to live Supabase + git state, prints diffs.
4. **Distribution** — running `node scripts/sync-act-context.mjs --apply` updates the "ACT Context" block in every target repo's CLAUDE.md.

**Drift policy:** if the live state contradicts this file, this file is the prescription, the live state is the description. Either edit this file (because the prescription changed) or fix the live state (because it drifted from the prescription).

---

## Backlinks

- [[../synthesis/funder-alignment-2026-04-24|Q1 funder alignment]]
- [[../synthesis/project-truth-state-2026-04-24|Q2 project truth-state]]
- [[../synthesis/entity-migration-truth-state-2026-04-24|Q3 entity migration truth-state]]
- [[../../thoughts/shared/plans/act-entity-migration-checklist-2026-06-30|Migration checklist]]
- [[../../thoughts/shared/plans/act-alignment-loop|Alignment Loop plan]]
- [[../../thoughts/shared/plans/act-brain-expansion|Brain expansion plan]] (this file's distribution architecture)

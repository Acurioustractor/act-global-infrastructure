# Plan: Goods on Country — CEO 6-Month Operating Plan (Apr–Oct 2026)

> Slug: `goods-ceo-6-month-plan`
> Created: 2026-04-23
> Status: approved (2026-04-23)
> Owner: Benjamin Knight (CEO, Goods on Country)
> Window: 2026-04-23 through 2026-10-23
> Covers: end of FY26 (Jun-30), Q1 FY27 (Jul–Sep), opening Q2 FY27 (Oct)

## Objective

Goods on Country has delivered 389 products to 8 communities, moved $537,595 through the books, and pulled $445,685 of philanthropic capital into the durable-goods-on-country thesis. The model works. What we are missing is an operating rhythm that turns the $16.5M identified demand pipeline and the $1.5M+ open capital stack into a containerised manufacturing facility on Jinibara Country by Q4, a second on Arrernte Country, and a handover arc that communities can trust because they can see it.

This plan pulls the wiki, Notion HQ, GrantScope CivicGraph, command-center dashboard, and the asset register into one six-month operating system. Five layers: **procurement, philanthropy, brand, Notion/dashboard rhythm, agent automation.** Each layer has concrete commitments, owners, weekly cadence, and the automation that makes it easier to run than to skip.

## Where we are — honest diagnostic (2026-04-23)

**The ground truth.**

- 389 products deployed. 8 communities served. 9,225kg plastic diverted. 33 storytellers documenting it.
- $445,685 philanthropy received. $537,595 total revenue recorded in Xero under ACT-GD.
- 200 v1 beds delivered to Tennant Creek early 2025, **~$36K still outstanding**. That cashflow gap has constrained R&D capacity for 15 months.
- $16,566,450 in GHL opportunity pipeline, 103 open opportunities, dominated by `<COMMUNITY> — Goods Demand` leads (Wadeye $1.09M, Maningrida $1.10M, Galiwinku $998K, Wurrumiyanga $749K, plus 15 more > $250K).
- 5 confirmed anchor community partnerships: Oonchiumpa, PICC, Centrecorp, Anyinginyi, Miwatj.
- 1 manufacturing partner confirmed for Year 1 facility (Oonchiumpa, Alice Springs pathway).
- 1 live Advisory Board: Corey Tutt OAM, April Long, Judith Meiklejohn, Audrey Deemal, Shaun Fisher, Daniel Pittman, Sally Grimsley-Ballard.

**The surfaces and what they say about us.**

| Surface | State | Signal |
|---|---|---|
| Wiki canonical (`wiki/projects/goods.md`) | Rich, current, trustworthy | Truth layer works |
| Wiki mirror in command-center | 404 on `/wiki/goods` route | Slug rename half-applied; `apps/command-center/src/lib/wiki-files.ts:121` still maps `goods → projects/goods-on-country` |
| Notion Goods HQ | Project Intelligence says "QUIET. last activity 8d ago. 11 actions (11 overdue)" | The HQ page is not operating as an HQ |
| CivicGraph Goods Workspace | Live, 2,500 communities, 6,000 procurement entities, GHL push built | Under-used — NT+QLD filter cuts WA/SA; Miwatj missing from buyer anchor list |
| Command-center `/projects/goods` dashboard | Live but shows stale slug `goods-on-country` | Brand/URL inconsistency |
| Asset register | Functional, 389 products tracked | Local-only file dep in `goods-lifecycle-sync.mjs` — cron can't run it |
| Weekly cron (Mon 8am) | Running reconciliation + tagging | Not yet running Goods-specific pipeline checks |
| R&D claim (FY26) | Goods classified as Supporting R&D, $65,516 direct / $87,355 apportioned | Contemporaneous records need tightening before July |

**The load-bearing gaps.**

1. No CEO-level operating rhythm. The Goods HQ in Notion is a dump of sub-pages and grants, not an operating surface. No OKRs. No weekly cadence. No owner-accountable actions.
2. No end-to-end cashflow view. Xero says one thing, asset register says another, GHL pipeline says a third, and nothing reconciles them for me on a Monday morning.
3. No active procurement watch. CivicGraph built the scoring; nobody runs the weekly sweep that would surface when Centrecorp, ALPA, or Miwatj win a new contract worth a phone call.
4. No systematic funder cadence. Snow is warm, QBE is decisive, Minderoo is waiting, Paul Ramsay and Australian Communities Foundation have no named path. One email a week to each would change this quarter. Nobody sends it.
5. No containerised facility on the ground. Year-1 plan says 1,500 units out of Jinibara Country. The shipping container still needs to be ordered. The supply chain with Envirobank is in discussion, not signed.

## The six-month thesis

One sentence: **by 2026-10-23, two containerised manufacturing facilities are funded and in commissioning — one on Jinibara Country (QLD) and one on Arrernte Country (Alice Springs, with Oonchiumpa) — the HQ runs itself from a Monday-morning cockpit view, and no funder relationship dies from silence.**

Year 1 is a twin-facility year, not a single-facility year. Jinibara is the capital-lighter, supply-chain-closest pilot. Alice Springs sits on the REAL Innovation Fund consortium with Oonchiumpa as lead — the two years of co-design and Fred Campbell's cultural leadership mean the relationship is already in place, and the capital pathway is already in motion. Tennant Creek moves to Year 2 once the $36K receivable is resolved and trust is rebuilt through Centrecorp's March-board bed order.

Three forcing questions that cut scope:

1. **What do communities remember about us if we shut down tomorrow?** That shapes every story we tell this quarter.
2. **What contract do we need to sign by 31 October?** That shapes every procurement action.
3. **Which funder, if we lose them, loses the facility?** That shapes every capital action.

The answers right now are: Tennant Creek and Palm Island remember the bed. The Jinibara facility order is the contract. Snow Foundation Round 4 (underwritten by QBE Catalysing Impact shortlist outcome) is the funder.

---

## Layer 1. Procurement — turn $16.5M pipeline into signed orders

**The frame.** Communities have told us what they need. The demand register is loud. What's missing is the procurement path from demand signal to signed purchase order — because institutional buyers (Centrecorp, ALPA, Outback Stores, Miwatj, state housing) operate on procurement cycles, framework agreements, and evidence files we have not yet formalised.

### Three moves

**M1. Weekly procurement sweep — activate and extend CivicGraph's Goods Workspace.**

- Remove the `state IN ('NT', 'QLD')` filter in `apps/web/src/app/goods-workspace/page.tsx` — unlocks 300+ WA Kimberley, Pilbara, Goldfields, and APY Lands communities already seeded with freight corridors.
- Add `'miwatj'` to `BUYER_ANCHOR_NAMES` in `goods-workspace-client.tsx:372` — East Arnhem's largest community store needs the +25 scoring boost to rank correctly.
- Wire `grantscope/scripts/check-contract-alerts.mjs` to a weekly cron that watches a named list: Centrecorp, Centrebuild, Outback Stores, ALPA, Miwatj, Anyinginyi, Julalikari, Tangentyere, QIC, West Arnhem Regional Council, Palm Island Housing.
- Weekly email every Monday 8am: new federal contracts won by any watched entity, plus any new `demand_unmet` signal from `goods-procurement-matcher.mjs`. Two-line summary.

**M2. Five anchor buyer files — the evidence pack.**

One file per anchor, held in the asset register Supabase (`cwsyhpiuepvdjtxaozwf`), linked from Notion Goods HQ as a database view. Each file contains: delivered units to date, cost-per-unit delivered, lifespan evidence (asset register telemetry), community storyteller reference, freight corridor, incumbent pricing analysis from `goods-supply-chain-analyst.mjs`, signed MoU scan, procurement pathway (grant/budget/framework), named contact, last touch date, next action.

| Buyer | Current state | 6-month target |
|---|---|---|
| Centrecorp | 107 beds approved Utopia; 100 beds × 4 communities submitted | Close the 400-bed order; secure March board sign-off confirmation |
| PICC (Palm Island) | 141 beds deployed; housing expansion in discussion | Sign 100-bed Round 2 order; formalise REAL Fund consortium role |
| Oonchiumpa | Manufacturing partner; cultural lead | Finalise Alice Springs facility capital plan; execute REAL Fund EOI outcome |
| Miwatj Health | 8-clinic fleet exploration; 500-mattress + 300-washer demand | Convert to pilot order for 2 clinics; secure East Arnhem freight economics |
| Anyinginyi | Washing machine fleet spec in negotiation | Sign first 10-machine order with IoT fleet-management agreement |

**M3. Government procurement — get on a panel, not in a pitch.**

Commonwealth and state housing departments replace disposable mattresses at scale. The pitch-by-pitch sale does not scale. The six-month goal is not a government contract. It is:
- One pre-qualified listing on a state-level social-enterprise procurement panel (QLD Social Procurement policy is the most plausible entry).
- One named government relationship manager introduced (QLD PFI relationship is the warmest path).
- One commitment from one state housing agency to trial 50 beds under an existing framework agreement.

### Weekly procurement cadence (owner: CEO)

| Day | Action | Time | Output |
|---|---|---|---|
| Monday 8am | Review procurement sweep email | 15 min | Three names to phone this week |
| Tuesday | Anchor-buyer follow-up touches (2 per week rotating) | 45 min | 2 emails, log in GHL |
| Thursday | CivicGraph Goods Workspace review (buyer-led mode) | 30 min | 1 new buyer added to pipeline |
| Friday | Procurement log update in Notion | 15 min | Week's touches reconciled against GHL |

---

## Layer 2. Philanthropy — execute the capital waterfall

**The frame.** The capital stack is mapped. The work is execution, cadence, and sequencing. The near-term dependencies run in a specific order: QBE outcome unlocks Snow R4 impact investment track. Snow R4 unlocks Minderoo catalytic capital. Minderoo unlocks the PFI repayable. PFI unlocks SEFA working capital. SEFA unlocks IBA senior debt. Each one sits on the one before it. Lose the first, lose all of them.

### The waterfall, with dates

| Position | Capital | Funder | Amount | Trigger | Decision by |
|---|---|---|---|---|---|
| 1 | Match grant | QBE Foundation Catalysing Impact | up to $200K | Currently shortlisted | Q1 FY27 (Aug 2026) |
| 2 | Grant (R4) + impact investment | Snow Foundation | $200K grant + impact loan track | QBE outcome | Q1 FY27 proposal (by Sep 2026) |
| 3 | Catalytic recoverable capital | Minderoo Foundation | ~$200K | Snow R4 committed | Q2 FY27 (Oct 2026) |
| 4 | Repayable grant | QLD PFI | $640K (of $3.2M track) | Minderoo committed | Q3 FY27 |
| 5 | Sub-debt working capital | SEFA | $300K+ | PFI executed | Q3 FY27 |
| 6 | Senior debt | IBA Business Loan | up to $5M | Production proven | FY28 |

Parallel to the waterfall:

| Track | Funder | Status | 6-month action |
|---|---|---|---|
| REAL Innovation Fund (DEWR) | Oonchiumpa consortium lead | EOI submitted Mar 2026 | Support Oonchiumpa; complete data room; shadow decision panel prep |
| FRRR | Long relationship | Active | Round-up touch; ask for intro to new program officer; Tennant Creek report |
| Vincent Fairfax | $50K historical | Dormant | One thoughtful update letter in May; no ask until proof pack ready |
| AMP Spark | $21,900 historical | Dormant | One thank-you + impact note in June |
| Paul Ramsay Foundation | `approach_now`, no intro path | Cold | Use GrantScope engagement workflow to frame; ask Corey Tutt or April Long for warm intro by June |
| Australian Communities Foundation | Donor-collaborative route | `approach_now` | Pool-style proposal by July; pair with one Nova Peris or Judith Meiklejohn intro |
| Nova Peris Foundation | Via PICC enterprise development | Researching | Let Palm Island lead the intro; don't go first |
| Centrecorp Foundation | Community grant | Active | March board outcome follow-up; $150K confirm |
| Groote Eylandt Trust | Capital target | Cold | GroenMaskin + capital stack framing by September |
| General Gumala Trust | Capital target (Pilbara) | Cold | Post-workspace-WA-expansion trigger |
| Rio Tinto Foundation | Capital target | Cold | Through Pilbara procurement entry only |

### Funder cadence (owner: CEO)

**Rule: no funder goes silent for more than 21 days.**

A silence rule is enforced by a scheduled agent (see Layer 5). Every three weeks each active funder receives one of: progress note (<150 words), community story link (Empathy Ledger), data-point update (deployments, lives impacted), invitation (site visit, deployment ceremony, storyteller call), or ask.

Weekly writing block: Friday 9–11am, two funder touches per week minimum, four in proposal weeks.

### The three documents the capital stack is waiting on

1. **Integrated 3-statement financial model** (P&L, balance sheet, cash flow) — FY26 actual + FY27–FY30 projections, by product line, by facility. Required for Minderoo, PFI, SEFA, IBA. Due by **31 May 2026**.
2. **Investment memorandum** — 12-page PDF including the capital stack, unit economics, community-ownership transition economics, risk register, governance. Required for Snow impact investment and Minderoo. Due by **30 June 2026**.
3. **Data room** — Dropbox or Notion vault containing MoUs, R&D evidence, audited financials, cultural governance protocols, IoT telemetry samples, storyteller consent records, product spec sheets. Required for all tier-1 capital. Due by **31 July 2026**.

These three documents are the unlock. Without them the capital stack stalls at QBE + Snow.

---

## Layer 3. Brand, focus, and narrative sovereignty

**The frame.** Goods on Country is not a product company that works with communities. It is a community infrastructure project that makes products. The brand job for the next six months is to hold that distinction everywhere the work surfaces — wiki, Notion, website, funder decks, procurement packs, storyteller chains. Communities hold the pen on the story. We hold the spec, the supply chain, and the handover arc.

### Voice rules — load `act-brand-alignment/references/writing-voice.md` for any public writing

Curtis method, four moves per weighted sentence: name the room, name the body, load the abstract noun, stop the line. Goods rooms: basket, market, hand. Goods bodies: picker, weigher, weaver. Plus: the floor where the child slept, the hose at the back of the bed, the container on the truck, the factory door being handed over.

Forbidden on sight: delve, crucial, pivotal, tapestry, underscore, em-dashes, not-just-X-but-Y constructions, rule-of-three adjective padding, challenges-and-future-prospects formulas, -ing significance tails. Every ACT-facing artefact gets screened against this list before it ships.

### Six brand actions in six months

**B1. One CEO letter per month.** Public-facing, signed, published on the Goods website and shared to funders. ~400 words each. Curtis voice — named room, named body, institutional noun loaded in the room, line stops before the explanation. Each letter sits on a single concrete object or moment, not a concept. Archive as `wiki/letters/goods/` under the living ecosystem canon.

Letter calendar:

| Month | Title | The room | The body | The noun to load |
|---|---|---|---|---|
| May | *The bed that doesn't break* | Dianne Stokes' verandah, Tennant Creek | An elder's hand on the hose | *lifespan* |
| June | *Forty kilograms, five minutes* | A bedroom floor, Palm Island, assembly in progress | A woman's shoulder under a 26kg bed, a child watching | *dignity* |
| July | *The chemistry of the floor* | Under the bed, where the floor used to wear through | A toddler's knee, a mother's sweep | *durability* |
| August | *Forty-foot* | The Jinibara gate, a shipping container on a flatbed | A man in steel-caps counting bolts | *manufacturing* |
| September | *Fred's line* | The factory door in Mparntwe (Alice Springs) | Fred Campbell's hand on the frame | *handover* |
| October | *One year from the hose* | Dianne's verandah, one year later | The same hand, the same hose, the machine still running | *permanence* |

Each letter drafted Thursday, passed through the Narrative Gatekeeper Agent (A6) Friday morning, published Friday afternoon, distributed to funders Friday 4pm via the weekly capital-stack note. The titles are working titles — final line emerges from the write.

**B2. Storyteller layer consolidation.** 33 Empathy Ledger storytellers currently hold the community voice. Audit the consent chain per storyteller (verbal OCAP per memory rule). Identify 5 stories ready to feature on the Goods website in Q2 FY27 with full elder approval. Coordinate with Kristy Bloomfield (Oonchiumpa) and Brodie (BG Fit) for cascade design pointers.

**B3. Website truth-line fix.** The website `goodsoncountry.com.au` currently carries marketing language that doesn't match the wiki truth layer. Audit every page against `wiki/projects/goods.md`. Replace where drifted. Adopt the wiki as single source of truth; generate website copy from wiki on push (same pattern as the Compendium sync).

**B4. Wiki-to-command-center path fix (urgent).** The slug rename from `goods-on-country → goods` is half-applied. Twelve files still carry the stale slug, including `apps/command-center/src/lib/wiki-files.ts:121` which breaks the wiki page load. One-day cleanup sprint. List in the Immediate Fixes section below.

**B5. Narrative sovereignty check.** Every external artefact featuring a community member — photo, quote, video, name — runs through the OCAP governance chain before shipping. Per memory rule: verbal consent is first-class but requires Ben's reported word + witness in the audit trail. Kristy + Tanya (Oonchiumpa), Brodie (BG Fit), Richard Cassidy (Palm Island) are the named elder approvers for the Goods community cluster.

**B6. One Founder's Room.** Physical or virtual: a room the CEO can walk into weekly that shows the state of Goods at a glance. Not the dashboard; the feeling of the dashboard. Map of deployed units. Wall of storyteller faces. Shelf of funder letters. One bed. One washing machine frame. This is how the work stays concrete for the person running it. Build by end of May.

---

## Layer 4. Notion HQ + Command-Center dashboard — one operating surface

**The frame.** The CEO needs one Monday-morning view that answers: where is the money, who needs a phone call, what broke in the field, what did we deliver, which stories landed, what is at risk. That view does not exist yet. The pieces exist: Notion Goods HQ has the opportunity pipeline, the command-center `/projects/goods` page has the CRM, GrantScope has the buyer workspace, the asset register has the deployment state, Xero has the money. They do not converge.

### The target — the Goods Cockpit

A single dashboard route at `apps/command-center/src/app/projects/goods/cockpit/page.tsx` that composes:

| Panel | Source | Refresh |
|---|---|---|
| This week's procurement sweep | GrantScope `v_nt_community_procurement_summary` + AusTender watch | Monday 8am cron |
| Capital stack state | Notion Opportunities DB + Xero receipts + GrantScope foundation engagement | Daily |
| Field state | Asset register Supabase (`cwsyhpiuepvdjtxaozwf`) — alerts, overdue check-ins, tickets | Hourly |
| Cashflow 13-week | Xero + GHL pipeline weighted | Daily |
| Storyteller queue | Empathy Ledger v2 (`yvnuayzslukamizrlhwb`) — stories pending elder approval | Daily |
| Anchor relationships | GHL pipeline "Goods" + last-touch | Daily |
| Overdue actions | Notion Actions DB | Hourly |
| R&D evidence log | Xero ACT-GD tagged + IoT telemetry samples | Weekly |

Each panel links deep into the owning system. Nothing is re-entered. The dashboard composes, it does not author.

### Notion Goods HQ — operational rework

The current HQ is an archive. Rework into an operating surface:

1. **Pin a quarterly OKR block at the top.** Three objectives, one key result each. For Q2 FY27 (Jul–Sep):
   - O1: One containerised facility funded and ordered. KR: shipping container purchase order signed by 30 Sep.
   - O2: $400K of the capital waterfall committed. KR: Snow R4 + Minderoo catalytic letters of intent by 30 Sep.
   - O3: 200 new units deployed to community. KR: deployment dashboard shows 589 total units by 30 Sep.
2. **Actions database with owner + due date + status only.** No orphan actions. Clear 11/11 overdue backlog this week. Any action older than 21 days auto-escalates to the CEO weekly review.
3. **Anchor buyer pages.** One page per anchor (Centrecorp, PICC, Oonchiumpa, Miwatj, Anyinginyi). Template: relationship state, MoU, next action, community storyteller link, last touch, open opps value.
4. **Funder cadence view.** Kanban on "days since last touch": green <14, amber 14–21, red >21. No funder sits red.
5. **Weekly CEO review page.** Monday 8am: cockpit snapshot pasted, this week's three commits, this week's two calls to make, this week's one story to ship.
6. **Retire what doesn't run.** Archive the PPPP Dashboard, the Knowledge Hub inline, the orphaned Q&A write-ups. Keep the Goods Engine priority list as a running log; move everything else to a "Historical" subpage.

### RACI for the six-month window

| Function | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Capital stack | Ben (CEO) | Ben | Nic, Advisory Board, Sally Grimsley-Ballard | Funders |
| Procurement — anchor buyers | Ben + Nic | Ben | Fred Campbell (Oonchiumpa), Richard Cassidy (PICC) | Communities |
| Product design iteration | Nic | Ben | Fred Campbell, Dianne Stokes, Defy Design | Communities |
| Manufacturing (Year 1 Jinibara) | Nic | Ben | Envirobank, Oonchiumpa | Advisory Board |
| Asset register + IoT | Ben | Ben | Engineering | Communities |
| Community relationships | Nic | Both | Fred, Brodie, Kristy, Richard | Empathy Ledger team |
| Narrative + brand | Ben | Ben | Storytellers, elders | Public |
| R&D Tax claim | Ben | Ben | Accountant | ATO |
| Weekly cadence + cockpit | Ben | Ben | Nic | Advisory Board |

---

## Layer 5. Automation & agents — the work that runs itself

**The frame.** A six-month operating rhythm can be run by two humans if the right things run themselves. The infrastructure already exists in `scripts/` and `grantscope/scripts/` — most of what is needed is scheduling, chaining, and surfacing to the cockpit. Agents (LLM-driven reasoning processes) get narrow, bounded work where the reasoning adds value over a cron.

### Scheduled jobs (no reasoning required)

| Job | Script | Schedule | Output |
|---|---|---|---|
| Weekly reconciliation + tagging | `scripts/weekly-reconciliation.mjs` (running) | Mon 8am | Telegram + cockpit |
| Procurement sweep | `grantscope/scripts/check-contract-alerts.mjs` (adapted) | Mon 8am | Cockpit panel |
| Goods Workspace GHL push | `grantscope/apps/web/api/goods-workspace/ghl-push` | Wed 9am | GHL pipeline update |
| Asset register alerts | `scripts/asset-register-alerts.mjs` (new, wraps existing alert types) | Daily 7am | Cockpit panel + Telegram on critical |
| Funder silence watcher | `scripts/funder-silence-check.mjs` (new) | Daily | Amber/red list for weekly review |
| Community storyteller queue | `scripts/empathy-ledger-consent-sweep.mjs` (new) | Daily | Cockpit panel |
| Xero ACT-GD categorisation audit | `scripts/tag-statement-lines.mjs` (running) | Mon 8am | BAS readiness |
| Asset lifecycle sync | `grantscope/scripts/goods-lifecycle-sync.mjs` (needs fix — local path dep) | Daily | Replacement procurement signals |
| Wiki → website sync | Existing wiki-sync pipeline | Push-triggered | Website + Compendium + Tractorpedia |
| R&D evidence log | `scripts/rd-evidence-log.mjs` (new) | Weekly | Contemporaneous record for FY27 claim |

### Agents (reasoning adds value)

Seven narrow agents, each with the four-part Opus 4.7 contract (task budget, stop criteria, fallback, scoped files).

**A1. Procurement Analyst Agent** — weekly, runs after the procurement sweep cron. Input: new contract alerts, new demand signals, current anchor state. Task: rank this week's three highest-leverage buyer touches, draft the opening line for each, flag any buyer that needs escalation. Output: three-item action pack in cockpit.

**A2. Funder Cadence Agent** — daily, after funder silence watcher. Input: funder relationship state, last touch content, community deployment this week, stories landed. Task: if any funder is >18 days silent, draft a 120-word progress note matching that funder's engagement style. Output: draft email in CEO inbox for Friday writing block.

**A3. Field Insight Agent** — daily, after asset register alerts. Input: overdue check-ins, active tickets, IoT telemetry anomalies, storyteller activity. Task: summarise field state in 6 lines, flag any community where deployment health is slipping. Output: cockpit panel + escalation to Nic on critical.

**A4. Story Cascade Agent** — weekly, after empathy-ledger-consent-sweep. Input: new storyteller material, consent state per story, elder approver map. Task: identify which stories are eligible to publish, draft the publish queue, flag any consent gap. Output: storyteller queue panel + weekly story-to-ship for Friday CEO review.

**A5. Capital Stack Agent** — weekly, Sunday night. Input: GrantScope foundation engagement state, GHL capital pipeline, bank position, burn rate. Task: model the next four weeks of capital flow, flag any waterfall position that's slipping, draft the weekly CEO read-me. Output: capital cockpit panel + Monday-morning brief.

**A6. Narrative Gatekeeper Agent** — on-demand, before any public artefact ships. Input: draft artefact + `act-brand-alignment/references/writing-voice.md`. Task: screen for AI tells, Curtis-method four-move check, name-and-place verification. Output: pass/fail + specific rewrites. This is the voice-guard for every grant application, pitch, web copy, and board report. Must pass before ship.

**A7. Data Room Builder Agent** — one-shot for each funder ask. Input: funder brief + deliverables list + data sources. Task: assemble data room folder structure, generate provenance sidecars for all financial claims, list any missing document. Output: ready-to-share Dropbox/Notion tree + gap list.

### Agent infrastructure conventions

- Every agent runs under the Opus 4.7 contract (budget, stop, fallback, scoped files).
- Every scheduled agent output is written to a file path first, then summarised to Telegram or cockpit — never inline.
- Every agent action is logged to `project_knowledge` as `pattern` or `action_item` so future sessions inherit the context.
- Verbal OCAP + witness rule applies to any agent output that names a community member.
- Cost ceiling per agent per run is tracked; any agent above $5/run escalates for human review (Haiku for sweeps, Sonnet for drafting, Opus reserved for weekly CEO brief).

---

## Six-month operating calendar

### May 2026 — Ground the rhythm

- Week 1: Fix wiki slug breakage. Clean up 11 overdue Notion actions. Rework Notion Goods HQ to the operating template above.
- Week 2: Stand up the Goods Cockpit first three panels (procurement sweep, capital stack, field state). Miwatj added to buyer anchors. WA/SA filter removed from workspace.
- Week 3: First CEO letter published ("what a bed means on Palm Island"). Founder's Room set up. Anchor buyer evidence packs drafted for Centrecorp, PICC, Oonchiumpa.
- Week 4: Integrated 3-statement financial model delivered (31 May deadline). Procurement watch agent live.

### June 2026 — Lock the capital stack documents

- Week 1: Second CEO letter (the handover arc). Miwatj pilot order conversation. PRF warm-intro attempt.
- Week 2: Investment memorandum drafted (30 June deadline).
- Week 3: Funder cadence agent live. QBE Catalysing Impact final pitch.
- Week 4: FY26 close. R&D evidence log retrospective. Board review of Q1 FY27 OKRs.

### July 2026 — Evidence and proof

- Week 1: Third CEO letter (why containerised manufacturing). Data room delivered (31 July deadline). Snow R4 proposal drafted.
- Week 2: REAL Innovation Fund final submission support (Oonchiumpa consortium).
- Week 3: ACF donor-collaborative proposal. Paul Ramsay Foundation full engagement memo.
- Week 4: Shipping container supplier quote locked. Envirobank supply agreement drafted.

### August 2026 — The first container arrives

- Week 1: Fourth CEO letter (the first shipping container arrives). QBE outcome expected.
- Week 2: If QBE positive: trigger Snow R4 impact investment conversation. If negative: re-route to ACF + PRF.
- Week 3: Jinibara facility site prep. Council approvals.
- Week 4: Minderoo catalytic capital letter of intent target.

### September 2026 — First facility commissioning

- Week 1: Fifth CEO letter (Alice Springs facility). Jinibara container on site. Local hires (6 FTE).
- Week 2: First production run tests. Asset register v3 deployed for Year-1 facility.
- Week 3: Snow R4 submitted. PFI repayable progression. SEFA opening conversation.
- Week 4: Q1 FY27 board meeting. OKR close. Q2 FY27 OKRs set.

### October 2026 — Run the rhythm

- Week 1: Sixth CEO letter (one year from today). First products off Jinibara line.
- Week 2: Second anchor order signed (PICC Round 2 or Miwatj pilot or state housing trial).
- Week 3: Alice Springs facility capital closed (REAL + Minderoo + Oonchiumpa community investment).
- Week 4: Six-month retro. Plan refresh for next six months.

---

## Immediate fixes — 72 hours

These are blocking or silently harmful today. Ship this week.

1. **Fix wiki-files.ts slug mapping.** `apps/command-center/src/lib/wiki-files.ts:121` — update `goods: 'projects/goods-on-country'` to `goods: 'projects/goods'`. The Goods wiki page currently 404s in command-center.
2. **Propagate slug rename.** 12 files carry `goods-on-country` references that should be `goods` (see research notes). One-day sprint:
   - `apps/command-center/src/app/projects/[code]/page.tsx:106,113`
   - `apps/command-center/src/app/api/development/overview/route.ts:25`
   - `apps/command-center/src/app/compendium/page.tsx:59,60`
   - `apps/command-center/src/app/compendium/[project]/page.tsx:141`
   - `apps/command-center/src/lib/webhooks/ghl-handler.ts:47`
   - `wiki/output/living-ecosystem-canon-latest.json:198` (regenerate)
   - `wiki/narrative/goods-on-country/` directory and `wiki/index.md:232` reference
   - `config/active-projects.json:115` vs `:125` — two entries, resolve duplication
3. **Clear 11 overdue Notion actions.** Each action: close, delegate, or kill.
4. **Add Miwatj to buyer anchor names.** `grantscope/apps/web/src/app/goods-workspace/goods-workspace-client.tsx:372`.
5. **Fix the `goods-lifecycle-sync.mjs` local path dep.** Move the asset CSV to Supabase Storage or a shared path so the script can run from CI/cron, not just Ben's machine.
6. **Tennant Creek $36K receivable follow-up.** 15-month-old cashflow gap. Formal payment plan conversation with Centrecorp / Our Community Shed auspicing this week.

---

## Task Ledger

### Urgent (this week)

- [ ] Edit `apps/command-center/src/lib/wiki-files.ts:121` (goods slug)
- [ ] Clear all 12 stale `goods-on-country` references, one-day sprint
- [ ] Clear 11 overdue Notion actions
- [ ] Add `'miwatj'` to `BUYER_ANCHOR_NAMES`
- [ ] Move asset register CSV to Supabase Storage; update `goods-lifecycle-sync.mjs` path
- [ ] Tennant Creek $36K receivable conversation
- [ ] Rework Notion Goods HQ to the operating template (OKR block, anchor pages, funder cadence view, weekly review page)

### May 2026

- [ ] Stand up Goods Cockpit panels (procurement sweep, capital stack, field state)
- [ ] Remove NT/QLD filter from Goods Workspace
- [ ] First CEO letter published (Curtis voice)
- [ ] Founder's Room set up (physical)
- [ ] Draft anchor buyer evidence packs: Centrecorp, PICC, Oonchiumpa, Miwatj, Anyinginyi
- [ ] Deliver integrated 3-statement financial model (due 31 May)
- [ ] Schedule weekly procurement sweep cron
- [ ] Deploy Procurement Analyst Agent (A1)

### June 2026

- [ ] Second CEO letter published
- [ ] Miwatj pilot order conversation
- [ ] Paul Ramsay Foundation warm-intro attempt (via Corey Tutt or April Long)
- [ ] Deliver Investment Memorandum (due 30 June)
- [ ] QBE Catalysing Impact final pitch
- [ ] FY26 R&D evidence log complete
- [ ] Q1 FY27 OKRs set at Advisory Board meeting
- [ ] Deploy Funder Cadence Agent (A2)

### July 2026

- [ ] Third CEO letter published
- [ ] Deliver Data Room (due 31 July)
- [ ] Draft Snow R4 proposal
- [ ] Support Oonchiumpa REAL Innovation Fund final submission
- [ ] ACF donor-collaborative proposal drafted
- [ ] Paul Ramsay Foundation engagement memo drafted
- [ ] Shipping container supplier quote locked
- [ ] Envirobank supply agreement drafted
- [ ] Deploy Field Insight Agent (A3) + Story Cascade Agent (A4)

### August 2026

- [ ] Fourth CEO letter published
- [ ] QBE Catalysing Impact outcome received — branch execution
- [ ] Jinibara facility site prep
- [ ] Council approvals for Jinibara manufacturing
- [ ] Minderoo catalytic capital letter of intent
- [ ] Deploy Capital Stack Agent (A5)

### September 2026

- [ ] Fifth CEO letter published
- [ ] Shipping container on site at Jinibara
- [ ] 6 local FTE hired and onboarded
- [ ] First production run tests
- [ ] Snow R4 submitted
- [ ] PFI repayable progression conversation
- [ ] SEFA opening conversation
- [ ] Q1 FY27 board meeting (OKR close, Q2 set)
- [ ] Deploy Narrative Gatekeeper Agent (A6)

### October 2026

- [ ] Sixth CEO letter published (one year from today)
- [ ] First products off Jinibara line
- [ ] Second anchor order signed
- [ ] Alice Springs facility capital closed (REAL + Minderoo + Oonchiumpa community investment)
- [ ] Data Room Builder Agent (A7) live
- [ ] Six-month retro + plan refresh

---

## Decision Log

| Date | Decision | Rationale | Reversible? |
|---|---|---|---|
| 2026-04-23 | QBE Catalysing Impact is the keystone — all other capital hangs on it | Decision profile at `grantscope/seed-goods-decision-profile.mjs:20` + capital waterfall analysis; every downstream funder is warmer if Snow impact investment track activates, which activates on QBE | Yes — re-route through ACF + PRF if QBE falls through |
| 2026-04-23 | Year 1 is twin-facility: Jinibara (QLD) + Alice Springs (Arrernte / Oonchiumpa). Tennant Creek deferred to Year 2 | Oonchiumpa 2-yr co-design + Fred Campbell cultural lead + REAL Fund consortium already in motion = Alice Springs is warmer than it looks; Jinibara stays for supply-chain proximity; Tennant Creek needs the $36K receivable resolved first before a facility conversation is honest | Yes — Tennant Creek slot reopens once receivable cleared |
| 2026-04-23 | Notion becomes operating surface, command-center becomes cockpit — do not duplicate | CEO cannot run two HQs; Notion handles long-form actions/knowledge, command-center composes live state from system-of-record | Yes |
| 2026-04-23 | Weekly CEO rhythm is Monday cockpit → Friday writing → three anchor touches per week | Forcing functions: no funder silent >21 days, no overdue action >21 days, one named community conversation per week | Yes |
| 2026-04-23 | All public artefacts pass through Narrative Gatekeeper Agent before ship | Curtis voice + no AI tells is load-bearing for brand; human check alone leaks patterns; agent is the forcing function | Yes |
| 2026-04-23 | Wiki canonical file (`wiki/projects/goods.md`) is the single source of truth; website, Compendium, Tractorpedia generate from it | Eliminates drift between marketing and operational truth — drift breaks funder trust | Yes |
| 2026-04-23 | Agents run under the Opus 4.7 four-part contract (budget, stop, fallback, scoped files) | `~/.claude/rules/opus-4-7-prompting.md`: fuzzy agent prompts burn token budget before producing value | No — architectural |

---

## Verification Log

| Claim | Verified? | How | Date |
|---|---|---|---|
| 389 products deployed | Verified (wiki) | `wiki/projects/goods.md` line 73 | 2026-04-23 |
| $445,685 philanthropy received | Verified (wiki) | `wiki/projects/goods.md` line 78 | 2026-04-23 |
| $537,595 total revenue | Verified (wiki, sourced from Xero ACT-GD) | `wiki/projects/goods.md` line 80; needs re-query on Xero to confirm current | 2026-04-23 |
| Tennant Creek $36K unfunded | Verified (wiki) | `wiki/projects/goods.md` line 96 | 2026-04-23 |
| $16,566,450 GHL open opportunities | Verified (Notion) | Notion Goods HQ Opportunities roll-up | 2026-04-23 |
| 11/11 overdue actions in Notion | Verified (Notion Project Intelligence callout) | Notion Goods HQ as of 2026-03-27 | 2026-04-23 |
| Goods wiki page 404s in command-center | Inferred | `apps/command-center/src/lib/wiki-files.ts:121` maps to deleted file `projects/goods-on-country` | 2026-04-23 (needs browser test) |
| Miwatj missing from buyer anchors | Verified (grantscope) | `grantscope/apps/web/src/app/goods-workspace/goods-workspace-client.tsx:372` | 2026-04-23 |
| QBE shortlisted | Unverified (stated in wiki + decision profile, no ATO/Catalysing Impact confirmation checked) | Needs email audit | 2026-04-23 |
| PFI submitted $640K | Unverified | Wiki states `submitted`; seeded from compendium, not live-confirmed | 2026-04-23 |
| FY26 R&D eligible $65,516 direct / $87,355 apportioned | Inferred | `wiki/projects/goods.md` line 237; needs ACT-GD Xero query + apportionment re-run | 2026-04-23 |
| 33 Empathy Ledger storytellers | Verified (wiki) | `wiki/projects/goods.md` line 76 | 2026-04-23 |
| Oonchiumpa REAL Fund EOI submitted Mar 2026 | Verified (wiki) | `wiki/projects/goods.md` line 220; consortium lead is Oonchiumpa not ACT | 2026-04-23 |
| Notion Goods HQ lives at Notion page ID 177ebcf981cf805fb111f407079f9794 | Verified (fetched) | `mcp__claude_ai_Notion__notion-fetch` 2026-04-23 | 2026-04-23 |

---

## Changelog

### 2026-04-23 — Plan created

**Objective:** Synthesise wiki, codebase, grantscope, and Notion research into a single six-month CEO operating plan covering procurement, philanthropy, brand, Notion/dashboard rhythm, and agent automation.

**Changed:** Plan file written at `thoughts/shared/plans/goods-ceo-6-month-plan.md`. Provenance sidecar at `goods-ceo-6-month-plan.provenance.md`. Four tasks created in TaskList for immediate urgent fixes and plan synthesis.

**Verified:** Wiki content verified directly. Notion HQ structure and opportunity roll-up verified via MCP fetch. CivicGraph Goods Workspace logic verified via file read (grantscope scout agent). Codebase slug-rename state verified via git log + grep (codebase scout agent).

**Failed/Learned:** Notion fetch output was 62K chars, over the display limit. Agent was required to slice and summarise — note for next time: prefer `notion-search` with narrow query over `notion-fetch` on rich pages.

**Blockers:** None for plan creation. Execution blockers: three documents (financial model, investment memorandum, data room) are the gating artefacts for the capital waterfall; if May and June delivery slip, the Q1 FY27 capital sequence slips.

**Next:** User review of plan. On approval: start immediate-fixes sprint. Schedule first cockpit panels. Book Tennant Creek receivable conversation. Post first CEO letter draft for Narrative Gatekeeper review.

---

## Provenance

- **Data sources queried:** 
  - `wiki/projects/goods.md` (canonical Goods source, 345 lines)
  - `apps/command-center/public/wiki/goods/index.md` (mirror)
  - `wiki/projects/oonchiumpa.md`, `picc/picc.md`, `empathy-ledger.md`, `civicgraph.md`, `designing-for-obsolescence.md`, `custodian-economy.md`, `lcaa-method.md`
  - `grantscope/MISSION.md`, `OPERATING_PLAN.md`
  - `grantscope/scripts/seed-goods-decision-profile.mjs`, `seed-goods-communities.mjs`, `seed-goods-foundation-contacts.mjs`, `hydrate-goods-communities.mjs`, `hydrate-goods-procurement.mjs`, `estimate-goods-demand.mjs`, `goods-procurement-matcher.mjs`, `goods-supply-chain-analyst.mjs`, `goods-lifecycle-sync.mjs`, `fix-goods-coverage.mjs`, `check-contract-alerts.mjs`, `act-partnership-scan.mjs`, `act-harvest-match.mjs`
  - `grantscope/apps/web/src/app/goods-workspace/page.tsx` and `goods-workspace-client.tsx`
  - `apps/command-center/src/app/goods/page.tsx`, `/api/goods/*`, `src/lib/wiki-files.ts`, `nav-data.ts`, `projects/[code]/page.tsx`
  - `config/project-codes.json`, `active-projects.json`, `living-ecosystem-canon.json`
  - Notion page `Goods HQ` (`177ebcf981cf805fb111f407079f9794`) via `mcp__claude_ai_Notion__notion-fetch`
  - `scripts/weekly-reconciliation.mjs`, `tag-statement-lines.mjs`, `auto-tag-fy26-transactions.mjs`, `tag-rd-eligibility.mjs`
  - `thoughts/shared/plans/goods-civicgraph-review.md`, `fy27-financial-strategy.md`, `rd-tax-incentive-comprehensive-report.md`, `pty-ltd-transition-and-rd-strategy.md`
  - Git log `rename-goods-slug` branch (commits `fe67e53`, `040625d`) + recent 60-day commit history for Goods-related changes
  - `.claude/skills/act-brand-alignment/references/brand-core.md`, `writing-voice.md`

- **Date range:** 2024-10 (Snow seed grant) through 2026-04-23 (today). Forward projections: 2026-04-23 through 2026-10-23 (six-month window).

- **Unverified assumptions:**
  - QBE Catalysing Impact timeline (August 2026 outcome is indicative, not confirmed by QBE)
  - REAL Innovation Fund decision timeline (post-EOI, actual grant decision date unknown)
  - Jinibara Country facility capital requirement (pulled from wiki unit economics, not re-modelled in integrated 3-statement form)
  - FY27 revenue projection $585K (from `fy27-financial-strategy.md`, not re-validated)
  - `PFI submitted` capital stack state — seeded from compendium, not DB-confirmed

- **Generated by:** Hybrid. Research (wiki, codebase, grantscope, Notion) conducted via three parallel sub-agents (scout + scout + general-purpose) on 2026-04-23. Plan synthesis and writing by Claude Opus 4.7 in collaboration with CEO (Ben Knight). Voice aligned against ACT brand-core and writing-voice references. All public-facing artefacts generated from this plan must pass the Narrative Gatekeeper Agent (A6) before ship.

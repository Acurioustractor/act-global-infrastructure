# What the Receipt System Reveals — Strategic Synthesis

**Date:** 2026-04-09
**Context:** End of the session that took BAS receipt coverage from ~54% to 94.4% of value and built the `bas-cycle` learning skill.
**Scope:** Q1+Q2+Q3 FY26 — 1,162 SPEND transactions, 572 ACCPAY bills, 1,843 receipts, $795,840 of total flow.

---

## The real headline

**We built an instrument that can see every dollar that leaves the business in near-real-time, documented with evidence, categorised by vendor and project.**

That sentence sounds mundane. It isn't. Before this week, the state of ACT's finance system was:
- Receipts scattered across Dext, Gmail, Xero ME, personal emails, paper, and nowhere
- BAS prep was a multi-week rodeo starting ~45 days after quarter-end
- No reliable per-project spend visibility
- R&D tax documentation sitting at ~12% coverage — the 43.5% refund was exposed
- "Missing receipts" numbers that were actually inflated 30% by deleted Xero zombies

Now:
- 94.4% of spending value is documented with an attached receipt in Xero
- The pipeline runs end-to-end in ~30 minutes for a quarter
- Patterns and lessons accumulate automatically in a skill that gets smarter each cycle
- The remaining 5.6% gap is known by vendor and classified by reason

**What this unlocks is not "BAS prep in less time." What this unlocks is *finance becomes a signal source for the business* instead of a compliance chore.**

---

## What the data actually reveals about ACT's spending shape

Now that the data is clean, the spending shape is legible for the first time. Here's what it tells us about the organisation we actually are:

### ACT is a physical, hands-on, site-visit-heavy operation
Not a software consultancy. Not a pure-services org. The top-15 vendors by spend are dominated by:
- **Travel:** $158k (Qantas $145k + Qantas Group Accommodation $13k). Plus Uber ($11k across 301 rides), Virgin, Airnorth, Hinterland Aviation. That's **~20% of total business spend on getting to places**.
- **Build/construction:** Defy Manufacturing ($119k), Hatch Electrical ($30k), Bunnings ($31k), Sydney Tools ($7k), Kennards Hire, Stratco, Diggermate. This is active physical work — probably BCV land work, cabin builds, infrastructure.
- **Local Maleny operations:** Maleny Hardware, Liberty Maleny, IGA Maleny, The Source Bulk Foods, Bay Leaf Cafe, Frank Food & Wine. Suggests Maleny is a working base (ACT Farm / training / gatherings).
- **Contractor payments:** Samuel Hafer $19.5k (single line), Thais Pupio Design $17k, Oonchiumpa Consultancy $11k, Chris Witta, Joseph Kirmos, Defy Manufacturing (multiple). These are the real people doing the work.

**Compare this to SaaS spending: ~$6-10k.** AI tools, collaboration software, hosting, billing tools — the whole digital stack — is one order of magnitude smaller than the physical operation.

**Strategic implication #1: ACT's cost structure is much more like a construction/project-build business than a tech startup.** That has consequences for:
- Insurance needs (public liability, construction risk, not just tech E&O)
- Tax structure (GST on materials is real and substantial)
- R&D tax claim shape (physical build activity is *also* R&D-eligible but the documentation shape is different from software R&D)
- Grant narratives (site-visit and build costs are legitimate program costs to declare to funders)
- Decision support (the question "should we do more software or more build?" now has a real denominator)

### The 5 contractors carrying most of the work
| Contractor | Q1+Q2+Q3 spend | What it suggests |
|---|---:|---|
| Defy Manufacturing (+ Defy) | $119k | Major build partner — probably BCV infrastructure |
| Hatch Electrical | $30k | Electrical work — site-based |
| Thais Pupio Design | $17k | Design contractor — probably deliverables across multiple projects |
| Samuel Hafer | $19.5k | Single large Q1 payment — investigate what this was |
| Oonchiumpa Consultancy | $11k | Cultural consultancy — Indigenous partner? |

These 5 people/companies took **~$196k** of ACT spend in 9 months. That's the core operational team outside Ben and Nic. **Any business planning that treats these as "vendors" is missing the point — they are partners.** Worth formalising with longer-term agreements, clear scopes, and honouring relationships as core to the work.

### The Qantas anomaly
**195 Qantas-family transactions, $158k.** That's more than:
- All SaaS combined (~$10k)
- All Maleny local purchases combined
- Samuel Hafer's single-largest contractor payment

**This is a signal.** $158k of travel in 9 months means either:
1. ACT is running a highly distributed program (projects in multiple states), OR
2. Travel is eating capital that could go to program delivery

**Action:** a trip-level analysis. Each Qantas booking has a date and often a ticket number. We can cross-reference with the Google Calendar (already synced to `calendar_events`) to see which trips were which projects. That tells us the cost per project visit — e.g. "the Alice Springs/Palm Island trip cost X in flights plus Y in accommodation plus Z in Uber, across N days." Once we have that, we can decide if the trip cadence is right or if some visits could be:
- Consolidated (fewer, longer trips)
- Replaced with local partner gatherings
- Funded by the relevant project budget (important for grant reporting)

### The 65% that isn't "spending" at all
**$515,297 (65% of total flow) is NO_RECEIPT_NEEDED.** That's:
- 411 bank transfers (mostly between NJ Marchesi Everyday and NM Personal / NM Up)
- Owner drawings tagged BASEXCLUDED
- Bank fees
- Not real business spending

The real "business spend" is $280k. Of that, 94% is now documented.

**Strategic implication #2: the apparent "we spent $800k" figure in the raw Xero data is misleading by 65%.** Any external view (accountant, board, funder) needs to split "money moved" from "money spent." The current framing hides this.

### Where the automation is blind (and why)
The remaining 5.6% ($44k / 210 txns) breaks down into:
- **Vendor-portal-only receipts:** Anthropic, Apple private subs, some Google Cloud. These vendors don't email receipts — you log into their dashboard to see them. The Gmail pipeline can't find what doesn't exist in email.
- **Cash/wallet purchases:** Small in-store items on personal card, farmer's market, cash meals. No digital trail.
- **Small SaaS where the email went to a personal address.** Some subscriptions were started with benjamin@benjaminknight or similar and the receipts go there, not to the business inboxes.
- **The Qantas bookkeeping gap:** 70 pairs where the bill exists but hasn't been linked to the bank txn in Xero's UI — resolvable by Nic in 15 min.

**None of the gap is "receipts lost forever."** The gap is "receipts in places we can't automate."

---

## Strategic implications — the bigger moves this unlocks

### #1 — R&D tax refund becomes defensible

At 12% coverage (Q1 starting state), an AusIndustry audit would have been scary. At 94%, it's trivial.

But the bigger move: **classify every documented receipt by R&D eligibility.** The current `xero_transactions.rd_eligible` column exists but isn't comprehensively populated. A pass through the 540 DIRECT receipts to tag each one as eligible/ineligible gives us:
- Exact R&D spend per project per quarter
- Exact 43.5% refund number
- Clean supporting documentation for AusIndustry registration

Rough estimate: if ~30-40% of the $280k real spend is R&D-eligible (reasonable for a dev/build org with significant SaaS + contractor work), that's **$36-48k in the refund**. Today's documentation work just protected most of that.

### #2 — Per-project P&L stops being a dream

Xero has `project_code` on each line item via tracking. Our mirror has it too, via the `tag-transactions` skill. With 94% receipt coverage, a query like "show me all spend tagged ACT-EL (Empathy Ledger) with receipts attached" is trivially answerable.

This matters for:
- **Funder reporting.** When a funder asks "what did you spend the $50k grant on?" you have a direct answer with receipts.
- **Internal decision support.** "Is Empathy Ledger making money or losing money?" is a real calculation now.
- **Board/stakeholder reporting.** Clean numbers, not estimates.

The bottleneck isn't the data — it's that `project_code` is sparsely populated on older transactions. A one-time backfill pass using Xero tracking categories + calendar events + vendor patterns could get 80%+ tagged. Worth doing.

### #3 — Dext becomes optional / can be cancelled

We proved this session:
- Gmail deep search finds **more** receipts than Dext captured (238 candidates where Dext had nothing)
- Dext injected significant junk (marketing emails as receipts, $0 amounts)
- The direct Gmail→Xero pipeline is cleaner, cheaper, and more idempotent
- Xero's native connectors (Qantas, Uber, Webflow, etc.) cover 100% of ACCPAY bills

**Action: cancel the Dext subscription.** Save the monthly fee. The pipeline we built this week replaces Dext's only useful function — email forwarding — with direct Gmail API queries that are more precise and more current.

### #4 — BAS cycle time collapses from weeks to hours

The weekly hygiene loop (`quarterly-checklist.md`) runs in 20 minutes. Quarterly prep becomes:
1. Run the pipeline (1 hour, mostly unattended)
2. Run completeness classifier (1 minute)
3. Nic's Find & Match click-through (1 hour)
4. Send accountant email (5 minutes)

**Total active time per quarter: ~2 hours.** Down from probably 40+ hours for Q1 FY26. Every future quarter benefits from the accumulated vendor patterns and learnings.

### #5 — The bas-cycle skill becomes the template for all of ACT's finance work

The same learning-loop pattern (skill + scripts + retrospectives + accumulated references) can be cloned for:
- **Grant-cycle skill** — every funder application has a rhythm: research → prep → submit → report. Build once, refine every grant.
- **R&D-tax-cycle skill** — annual AusIndustry registration with project-level R&D notes.
- **Board-reporting-cycle skill** — monthly/quarterly board pack generation.

The architecture we built for BAS (6-path model + learning loop + per-cycle retro + vendor playbooks) is general. The next cycle we codify costs half as much because we know the shape.

---

## The finance system — how all the pieces connect

```
                          BANK STATEMENTS (raw truth)
                          NAB Visa, NJ Everyday, NM Personal, NM Up
                                       ↓
                                  bank feeds
                                       ↓
                    ┌──────────────────────────────────────┐
                    │  XERO (authoritative)                │
                    │  bank transactions + bills + contacts│
                    └──────────────────────────────────────┘
                                       ↓
                       sync-xero-to-supabase.mjs
                         (now zombie-filtered)
                                       ↓
                    ┌──────────────────────────────────────┐
                    │  SUPABASE MIRROR (enriched)          │
                    │  + project_code tags                 │
                    │  + R&D eligibility flags             │
                    │  + line_items JSONB (BASEXCLUDED)    │
                    └──────────────────────────────────────┘
                                       ↓
                        bas-completeness.mjs (6-path)
                                       ↓
                            7-path coverage report
                          (feeds BAS + R&D + funders)

──────────────────────────────────────────────────────────────

         RECEIPTS SIDE (feeds into the system)

  ┌──────────────┐  ┌───────────────┐  ┌────────────┐  ┌────────────────┐
  │ Xero         │  │ Xero ME       │  │ Gmail      │  │ (Dext legacy,  │
  │ Connectors   │  │ (mobile photo)│  │ deep search│  │  deprecating)  │
  │ auto-bills   │  │               │  │            │  │                │
  └──────────────┘  └───────────────┘  └────────────┘  └────────────────┘
         │                 │                │                 │
         └─────────────────┴────────────────┴─────────────────┘
                                  ↓
                         receipt_emails
                                  ↓
                match-receipts-to-xero.mjs (scorer-fixed)
                                  ↓
           gmail-to-xero-pipeline.mjs (PDF + EML fallback)
                                  ↓
                Xero Attachments API (with idempotency + status pre-flight)
                                  ↓
                  Xero transactions + bills now have evidence

──────────────────────────────────────────────────────────────

         LEARNING LOOP (closes every BAS cycle)

            bas-retrospective.mjs → per-quarter retro file
                                       ↓
          .claude/skills/bas-cycle/references/q{N}-fy{YY}-retro.md
                                       ↓
                  Human review → append to quarterly-learnings.md
                                       ↓
          Next quarter's prep reads accumulated learnings FIRST
                                       ↓
                       Each cycle starts smarter
```

**The load-bearing insight:** there are 6 receipt sources, 3 entity types (SPEND bank txns, ACCPAY bills, SPEND-TRANSFER), and 1 unified mirror. Everything in the pipeline serves the goal of "every dollar has a documented home." We achieved that at 94% today. The remaining 6% requires vendor-portal scraping, human click-through, or acceptance.

---

## Streamlining — the path to a self-maintaining finance system

The current state is a one-time heroic cleanup. The goal is for the system to stay at 94%+ with zero heroic effort.

### Weekly (automatic, 0 min)
- **Cron job:** `sync-xero-to-supabase.mjs` every morning
- **Cron job:** `gmail-to-xero-pipeline.mjs --apply` every Sunday night on the previous 7 days
  - Captures new receipts within a week of the transaction
  - Runs while you sleep
  - Idempotent, so re-runs are safe

### Weekly (human, 10 min)
- Nic/Ben glance at the previous week's `bas-completeness.mjs --recent` output
- Anything weird gets manually Xero ME'd or noted

### Monthly (human, 20 min)
- Run `bas-completeness.mjs` for the current quarter
- If any vendor is >$500 unreceipted and recurring, add the pattern to `vendor-patterns.md`
- Update `project_code` tags for any new vendors

### Quarterly (human, 2 hours)
- Run the full quarterly checklist from `.claude/skills/bas-cycle/workflows/quarterly-checklist.md`
- Nic does the reconciliation runbook (now `.claude/skills/bas-cycle/workflows/nic-reconciliation-runbook.md`)
- Send to accountant

### Per BAS (human, 20 min)
- Run `bas-retrospective.mjs Q{N}`
- Read the auto-generated retro
- Append any new learnings to `quarterly-learnings.md`
- Update `vendor-patterns.md` with any new vendor quirks

**Steady-state total human time per quarter: ~3 hours.** Down from ~40 hours.

### What still needs building to reach steady state

1. **Cron setup** — the scripts exist but aren't scheduled. PM2 or a cron entry for the weekly pipeline run. ~20 min to set up.
2. **Xero sync patch validation** — the zombie-guard patch in `sync-xero-to-supabase.mjs` hasn't been tested on a real sync yet. Run it once and confirm the DELETED shadow count drops.
3. **Project-code backfill script** — `tag-transactions` skill exists but should do a one-time pass on the 1000+ AUTHORISED SPEND txns to maximise project-code coverage.
4. **R&D eligibility tagger** — new script, similar shape to tag-transactions. Could be added as Phase 2.
5. **Monthly trend dashboard** — a `bas-dashboard.mjs` that shows month-over-month spend by category, per project. Sparklines. Maybe a web view. This is where finance becomes a signal source.
6. **Dext cancellation** — operational action, not code.

---

## Specific next 90-day steps (CEO-reviewed 2026-04-09)

This roadmap was reviewed via `/plan-ceo-review` and restructured. The original sequence buried the highest-dollar item (R&D eligibility tagger) at position #5, risking the FY26 R&D refund window. The critical insight: **the R&D tax refund is ~$36-48k, which is an order of magnitude larger than anything else on the plan.** It has a June 30 deadline. Everything that follows reflects that priority.

**Mode:** Approach B — "Protect the flank, then expand." Front-load the urgent high-$ items. Defer speculative work (dashboards, trip analysis) until real operational data shows they're needed.

### Phase 1 — Protect the urgent stuff (days 1-14)

**Step 1 — Lock in Q2+Q3 BAS lodgement (days 1-7)**
- Nic runs `nic-reconciliation-runbook.md` (~60 min in Xero UI)
- Send accountant the BAS package
- Lodge Q2 before penalty accrual; lodge Q3 before 28 April
- **Dollar stakes:** unknown but material penalty clock + accountant fees
- **Outcome:** no more overdue BAS

**Step 2 — R&D eligibility tagger (days 8-10)** ⭐ **promoted from item #5**
- Extend existing `tag-transactions` skill with an R&D-eligible classifier
- Tag every DIRECT receipt across FY26 (Q1+Q2+Q3 + partial Q4) as R&D-eligible / not / uncertain
- Generate R&D spend report per project code
- **Dollar stakes:** $36-48k refund at 43.5% on an estimated $85-110k R&D-eligible spend
- **Outcome:** R&D tax claim is defensible, refund window protected
- **Why now, not later:** AusIndustry registration for FY26 has to happen before 30 June. Burning days 1-20 on operational hygiene before starting R&D tagging cuts the buffer unacceptably.

**Step 3 — Weekly cron setup (day 11)**
- PM2 entries for `gmail-to-xero-pipeline.mjs --apply` (Sunday night)
- PM2 entry for `sync-xero-to-supabase.mjs` (daily morning)
- PM2 entry for `bas-completeness.mjs` (Monday morning, alert if coverage < 90%)
- **Outcome:** system is self-maintaining from here

**Step 4 — Project code backfill (days 12-14)**
- Run existing `tag-transactions` skill in bulk mode on FY26 SPEND
- Use Xero tracking categories + vendor rules + calendar events
- **Outcome:** per-project P&L becomes possible (feeds R&D report quality)
- **Reuses:** existing skill, not a new script

### Phase 2 — Verify then streamline (days 15-30)

**Step 5 — Dext cancellation (day 15)** ⬇ **deferred from item #3**
- **Why deferred:** we don't yet have 2 full weekly cron runs proving the replacement captures everything Dext was catching. Cancel too early and we go blind on whatever we forgot to vendor-map in `gmail-vendor-queries.mjs`.
- Prerequisite: two consecutive weekly cron runs must complete cleanly, and Q2+Q3 coverage must stay at 94%+ with no new unreceipted vendors showing up
- **Dollar stakes:** ~$50-100/month saved after cancellation
- **Outcome:** Dext subscription cancelled, replacement verified

**Step 6 — Q3 retrospective + lodgement (day 21+)**
- Run `bas-retrospective.mjs Q3` after Q3 is lodged
- Extract any new learnings into `quarterly-learnings.md`
- Update `vendor-patterns.md` with any new vendor quirks discovered
- **Outcome:** skill knowledge compounds by one more quarter

**Step 7 — Evaluation gate (day 30)**
- Review the last two weeks of weekly cron output
- Answer honestly: is the system self-maintaining? Is coverage staying ≥ 94%?
- Answer honestly: what's the ACTUAL decision we need finance data for in the next 30 days?
- **Decision point:** only proceed to Phase 3 with items that have a concrete decision the data would support

### Phase 3 — Evidence-based expansion (days 30-90, conditional)

**Each item below is opt-in based on what Phase 2's evaluation reveals.** Do not build these on speculation. Build them when a real decision needs them.

**Step 8 (conditional) — Trip-level analysis**
- Trigger: if Phase 2 evaluation finds we're making a travel-pattern decision (reducing trips? changing destinations? grant-reporting question?)
- Cross-reference Qantas + Qantas Group Accommodation bills with calendar events to produce cost-per-trip breakdown
- **Dollar stakes:** unknown — depends on whether the data changes a decision
- **Otherwise:** skip. The data will still be there when needed.

**Step 9 (conditional) — Monthly email dashboard (NOT a new web app)**
- Trigger: if there's a specific person (accountant, board, funder) who would benefit from a monthly PDF/email report
- Implementation: 30-line script that runs `bas-completeness` + 3 SQL queries and emails an HTML digest
- **Warning:** do NOT build a sparkline-heavy HTML dashboard on spec. Start with plain email. Upgrade only if the email is being read and asks for more.
- **Otherwise:** skip. "Finance as a signal source" is aspirational language that often precedes feature bloat.

**Step 10 — Q4 FY26 closes on autopilot (day 90, the actual test)**
- Q4 starts 1 April. Should run mostly on autopilot via cron + weekly hygiene + quarterly retrospective
- This isn't a step to execute. It's a validation that Phase 1+2 succeeded.
- **Outcome:** < 3 hours of human work for Q4 close

### What the review removed from the plan (or deferred conditionally)

| Original item | Status | Why |
|---|---|---|
| Cancel Dext (day 9) | Deferred to day 15 + verification gate | Cancelling before 2 weeks of replacement proof could leave us blind |
| Trip-level analysis (day 30) | Made conditional | Speculative until a real travel decision needs the data |
| Monthly dashboard (day 30-45) | Made conditional + scope-cut | "Dashboard" was turning into a web app. Plain email digest is sufficient until proven otherwise. |

### Effort comparison

| Approach | Hours (human) | CC+gstack | R&D refund protected | Speculative risk |
|---|---:|---:|---|---|
| Original (Maximalist) | 30-45 | 8-12 | Item #5 (late) | High — 2 speculative items |
| **Approach B (this revision)** | **15-20** | **6-8** | **Item #2 (early)** | **Low — speculative items gated** |
| Minimal viable | 10 | 4 | Missed | None |

---

## Review-generated TODOs (CEO review 2026-04-09)

These were surfaced by the `/plan-ceo-review` pass. Each has concrete scope, effort, and priority. Add to `TODOS.md` when you create one, or pick them off directly during Phase 1.

### TODO 1 — Cron coverage alerting (P1)
- **What:** Wrap the weekly `bas-completeness.mjs` cron in a check that emails/Slacks if coverage drops below 90%
- **Why:** Without this, cron runs silently and a broken pipeline goes undetected until quarter-end (which is exactly what this whole plan is trying to prevent)
- **How:** 20-line wrapper script that parses the completeness output, checks the `% by value` number, POSTs to a Slack webhook or sends an email if below threshold
- **Effort:** S (human: ~30 min / CC: ~10 min)
- **Priority:** P1 — blocks the "self-maintaining" promise
- **Depends on:** Step 3 (cron setup) being done first

### TODO 2 — Weekly Xero token health check (P1)
- **What:** Add `node scripts/sync-xero-tokens.mjs --dry-run` to the weekly cron and alert on failure
- **Why:** The 3-store token drift problem is documented — if refresh tokens get invalidated, the entire pipeline goes dark until someone notices at the next quarter
- **How:** Chain it into the existing weekly cron script; if it returns non-zero, email Nic
- **Effort:** S (human: ~15 min / CC: ~5 min)
- **Priority:** P1 — same silent-failure risk as TODO 1
- **Depends on:** Step 3 (cron setup)

### TODO 3 — R&D tagger sampling workflow (P1)
- **What:** Before running the R&D tagger on the full dataset, manually verify 20 random classifications and adjust rules. After running, sample another 20 and spot-check.
- **Why:** R&D classification is the input to a $36-48k tax refund. A 10% classification error could materially affect the claim. Sampling is the only way to catch rule bugs before they hit AusIndustry.
- **How:** Add a `--sample 20` mode to the tagger that pulls random classified txns and writes them to a markdown file for human review
- **Effort:** M (human: 2 hours / CC: 30 min)
- **Priority:** P1 — part of Step 2's delivery, not a separate item
- **Depends on:** Step 2 (R&D tagger build)

### TODO 4 — Document "how to add a new vendor" in bas-cycle skill (P2)
- **What:** Add a workflow doc to `.claude/skills/bas-cycle/workflows/adding-a-new-vendor.md` explaining how to extend `gmail-vendor-queries.mjs` when a new vendor shows up
- **Why:** The vendor query logic currently lives in Ben's head. If Nic (or a future Claude session) needs to add a vendor, the knowledge transfer is incomplete.
- **How:** 1-page doc with a worked example (e.g., adding a fictional "Example Corp" vendor with from-domain variants)
- **Effort:** S (human: 20 min / CC: 5 min)
- **Priority:** P2 — knowledge concentration fix, not urgent
- **Depends on:** none

### TODO 5 — Pty Ltd migration check (P3, for `business-research` skill)
- **What:** Revisit whether the Pty Ltd migration (already on the business-research skill roadmap) should be accelerated based on the $137k of owner-drawings transfers revealed this session
- **Why:** Large blurring of business/personal cash flow through NJ Marchesi Everyday ↔ NM Personal transfers suggests the current sole-trader structure is being strained. A Pty Ltd would clarify the line.
- **How:** Not a code change — a conversation with the accountant and the `business-research` skill
- **Effort:** unknown (human process, not code)
- **Priority:** P3 — important but not blocked on this 90-day plan
- **Depends on:** external (accountant, legal)

### TODO 6 — Grant-cycle skill prototype (P3)
- **What:** Apply the bas-cycle skill pattern to a grant-reporting cycle as a second proof of pattern
- **Why:** The synthesis claims the bas-cycle pattern generalises. A grant-cycle skill would prove it.
- **How:** Identify one grant with upcoming reporting, build a minimal skill (SKILL.md + 2-3 scripts + retro template), run one cycle
- **Effort:** L (human: ~10 hours / CC: ~2 hours)
- **Priority:** P3 — exciting but not urgent
- **Depends on:** Phase 1+2 of this plan completing successfully first

---

## The meta-observation

This session started with a specific operational problem: "BAS receipts are missing." It ended with a reusable learning system that will improve every quarter.

That arc is the template for how ACT should approach any recurring operational problem:
1. Diagnose the real shape (what's actually missing vs what's just unlinked vs what's zombie data)
2. Build the minimum viable tooling to get a clean baseline
3. Codify the patterns and learnings in a skill so the knowledge compounds
4. Run it on a loop until it becomes boring

**The BAS cycle skill is not just a BAS tool — it's proof-of-concept that the same pattern works for any cyclical obligation.** Grant reporting, R&D tax, board reporting, annual compliance, fundraising cycles. Each one deserves its own skill with its own retrospective pipeline. Each one stops being a heroic rodeo and becomes a repeatable system.

That's the larger payoff of today's work. The receipts were the surface. The instrument is what matters.

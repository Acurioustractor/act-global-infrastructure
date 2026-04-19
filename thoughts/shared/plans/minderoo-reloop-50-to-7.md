---
title: Minderoo reloop — 50 to 7, and what we hadn't considered
date: 2026-04-20
supersedes: selected framing from thoughts/shared/plans/minderoo-prototype-strategy.md (the "ten anchors" section specifically)
audience: Ben, for envelope-design decisions before 1 May
purpose: Reframe the anchor-selection architecture. Use GrantScope + JusticeHub data to shortlist 50 candidates from a queryable spine. Workshop with Minderoo to select 7. Cover 15 things the pitch hadn't yet considered.
---

# Minderoo reloop — 50 to 7

## Part 1 — Why the reframe is stronger

The current pitch says *"we have ten anchor communities."* The honest reality is four confirmed, one consolidating, and five in various states of selection. Every other grant application Minderoo receives inflates the same gap. Lucy reads them with calibrated scepticism.

The reframe: **we have a queryable spine of 1,155 verified youth-justice interventions across 100K+ entity-resolved organisations. Here are 50 shortlisted candidates, ranked by a transparent scoring model. Let's workshop to 7 together.**

This is stronger in three specific ways:

1. **It turns Minderoo into co-curator.** Funders who co-select feel invested in the outcome. A funded program Lucy helped choose is a program Lucy defends internally, extends in Year 2, and refers to PRF and Snow. The workshop IS the relationship.

2. **It demonstrates the method before funding it.** If the pitch claim is *"ACT holds data + voice + relational work together,"* the selection process itself proves it. Evidence-led shortlisting (ALMA, CivicGraph) + community-led confirmation (OCAP approvals before naming) is exactly what Year 1 looks like, done in front of Minderoo as demonstration.

3. **It is fair to the 43 who don't make the final 7.** Naming 50 candidates publicly (or semi-publicly) is a form of visibility most never receive. The 43 non-selected communities still gain entity-graph validation, a CivicGraph record, and (if they consent) a standing invitation into the affiliated network. The ecosystem gets larger, not narrower.

## Part 2 — How to actually do the shortlist

The infrastructure already exists. From the Explore agent's audit:

- **Scoring model** already built in GrantScope: `portfolio_score` composites evidence strength (30%) + community authority (25%) + harm risk (15%) + implementation capability (15%) + option value (15%)
- **Materialized view** `mv_youth_justice_entities` pre-joins ALMA interventions + justice funding + AusTender contracts + community-controlled entity flags
- **CLI** at `grantscope/scripts/gsql.mjs` for ad-hoc queries
- **API** at `/api/justice/interventions?...` for filtered listing

**The one query that produces the shortlist:**

```sql
SELECT
  e.gs_id, e.canonical_name, e.abn, e.state, e.lga_name, e.postcode,
  e.is_community_controlled, e.entity_type,
  a.name AS intervention_name,
  a.portfolio_score,
  a.evidence_level,
  a.cultural_authority,
  a.serves_youth_justice,
  a.target_cohort,
  a.years_operating,
  j.justice_funding_total,
  j.alma_intervention_count
FROM mv_youth_justice_entities j
JOIN gs_entities e ON e.id = j.id
LEFT JOIN alma_interventions a ON a.gs_entity_id = e.id
WHERE j.is_community_controlled = true
  AND a.serves_youth_justice = true
  AND a.cultural_authority IS NOT NULL
ORDER BY a.portfolio_score DESC, j.justice_funding_total DESC
LIMIT 50;
```

Run via: `node scripts/gsql.mjs "$(cat query.sql)"` in grantscope. Output to CSV/JSON, pipe into a new wiki page for manual review.

**One known data gap** (flag in the envelope honestly): ALMA's `target_cohort` field isn't cleanly queryable by "youth-focused" — it's a JSONB array. The query above uses `serves_youth_justice=true` as a rough proxy; manual review of the bottom half of the 50 list is needed to catch false positives. That manual review IS the editorial work Minderoo's funding pays for.

## Part 3 — The 7 vs 8 question

Australia has 6 states + 2 territories = 8 jurisdictions. The current brief lists 9 rows covering 7 jurisdictions (VIC missing, QLD ×3). Ben's suggestion: 7 = one per state/territory.

Three options:

**Option A — 7 anchors, drop ACT territory** (Ben's proposal as stated)
Implication: ACT territory young people aren't part of the direct anchor network. They could be served via the NSW Mounty Yarns anchor or be reached through the affiliated-50 network. Neat, defensible, risks looking like ACT-the-territory-is-not-important from an optics angle.

**Option B — 8 anchors, one per state and territory**
Implication: slightly more complex Year 1 than 7. $360K per anchor per year instead of $414K. Every jurisdiction visibly represented. More expensive relational work. Cleaner answer to "who does this miss?"

**Option C — 7 anchors, treat NT + ACT as a single "Territories" seat**
Implication: two territory communities in one anchor seat rotating annually. Adds capacity for two territory communities to share convening, travel, representation. Clean math, slightly clever framing, risks looking gimmicky.

**Recommendation: Option B (8 anchors).** Reason: the incremental relational cost ($432K across 3 years vs 7-anchor path) is worth the *"Indigenous young people in every part of the country are in this"* claim the envelope can make. Minderoo's dollar-per-visibility here is disproportionate. Workshop the number with Minderoo in the meeting — they may prefer 7 as a rhetorical device, or may upsize to 8.

The candidate pool remains 50 regardless of final number.

## Part 4 — Workshop format with Minderoo

Proposed structure for the workshop session (ideally after envelope lands, before Year 1 commits):

**Session 1 · 90 minutes · dashboard-led walkthrough**
- Open the dashboard at `act-global-infrastructure.vercel.app/minderoo-live-dashboard.html`
- Walk Lucy through the live ledger + 4 confirmed anchors
- Show the 50-candidate shortlist with portfolio scores
- Lucy asks clarifying questions, flags communities she has existing relationships with
- Narrow to ~25 by end of session based on state coverage + Minderoo's adjacent knowledge

**Between-sessions · 2 weeks · ACT relational work**
- For each of the 25 narrowed candidates, ACT reaches out to confirm interest, gather cultural context, verify the evidence claims
- Communities that confirm interest + give standing consent to be named in further Minderoo conversations join a "confirmed interest" tier

**Session 2 · 90 minutes · community co-selection**
- Walk through the confirmed-interest tier (likely 15–20 communities)
- Three-way tension to resolve: state coverage + evidence strength + cultural specificity
- Each decision logged with rationale
- Final 7 (or 8) selected
- Minderoo commits, relational work begins formally

**Between-sessions and ongoing · dashboard updates weekly**
- Lucy sees which anchors are active, which are building relationship, which young people have signed on to Brave Ones, what artefacts are flowing

Governance note: communities have the right to decline at ANY point in this process. If a shortlisted community changes their mind, they come off the list and either rejoin the affiliated-50 tier or leave the data altogether, their choice. The workshop is not "Minderoo picks" — it's "Minderoo and ACT signal preferences; communities decide."

## Part 5 — Fifteen things we hadn't considered

Each with a verdict: address in the 1 May envelope, or park.

### 1. Exit / transition criteria for anchors

*What if an anchor community withdraws mid-programme?* Funders increasingly ask. Current pitch is silent.

**Envelope:** one-paragraph note — *"if a community withdraws, the funding pool doesn't shrink. We re-open the shortlist, re-engage, re-select with community consent. Expected to happen 0–2 times across 3 years, planned for."*

### 2. Theory of network effect

*How do 7 communities produce national change?* The pitch implies it — doesn't explain the mechanism.

**Envelope:** simple diagram. Each community runs the method locally. Cross-community exchange shares practice. Co-authored book distils evidence to national audience. Magistrate tool connects each community's approach to sentencing decisions nationally. That's the network effect in three sentences.

### 3. Revenue / sustainability beyond Minderoo

*What happens in Year 4?* The pitch treats Minderoo as the only funder.

**Envelope:** name the intended co-funder stack (PRF, Snow, Dusseldorp, Ritchie per brief) and clarify Minderoo's role as **lead funder holding the core for 3 years while other funders come in around specific communities or streams**. Lucy should know this isn't a blank-cheque ask.

### 4. Co-funder differentiation

*Why does Minderoo get this specific offer vs what PRF or Snow would get?*

**Envelope:** implicit in the Loop-Back Dashboard. Minderoo gets the lead-funder view. Other funders see a narrower, per-community or per-stream view. Minderoo's differentiation is relational centrality, not dollar amount.

### 5. Governance structure of the 7

*How do the anchors relate to each other? Council? Rotating chair? Annual gathering?*

**Park.** Governance emerges Year 1 through how the anchors want to relate. Hard-coding it now would impose a city model on community practice.

### 6. IP / story ownership

*Who owns the stories? The community? ACT? The storyteller?*

**Envelope:** one clean paragraph. Storyteller owns their story in Empathy Ledger v2 with full withdrawal rights. Community (via org approval) has the right to veto use. ACT has editorial license under that two-tier consent, not ownership. The four decision records prove the model works.

### 7. Failure cases

*Year 2 outcomes if anchor performance falls off?*

**Park** in the envelope. Raise in the workshop. Too much failure-framing undersells what's already working.

### 8. Minderoo-specific relational asks beyond dollars

*Door-opening to WA government? Forrest family-adjacent businesses? Minderoo's convening power with other funders?*

**Envelope:** one-line invitation — *"we would value Minderoo's convening across the lead-funder circle, not just financial support."* Keeps door open without specifying.

### 9. The workshopping method as demonstration

*The way ACT invites Minderoo into selection IS the method.*

**Envelope:** not explicitly named but implicit in the dashboard. Lucy should notice the pattern without being told *"this is the method."*

### 10. Alumni / graduate trajectory

*What happens to a young person who finishes the program?*

**Envelope:** note that graduates become **peer mentors** for the next cohort, paid an honorarium. Over 3 years this turns into a national young-advocate network. Already in the Brave Ones v3 insert.

### 11. Digital companion portal for Lucy

*The physical envelope is important; online presence amplifies it.*

**Done** — the Loop-Back Dashboard is live. URL goes on the QR card in the envelope.

### 12. Co-design with young people of the selection criteria

*Radical move: have Isabella, Jackquann, or Taleigha review the 50 and say which communities they'd like to be networked with.*

**Envelope:** add a small section at the bottom of the 10-anchor contact sheet — *"Before final confirmation, 2–3 young people from confirmed anchors review the shortlist with us."* Light-touch, honours the theory of change, adds operational specificity.

### 13. Tier structure — what happens to the 43 non-selected?

*They still showed up in the shortlist. What's the respectful thing to do with their data?*

**Envelope:** three-tier model named explicitly:
- **7 anchors** — funded, resourced, in the core network
- **Affiliated network (~43)** — part of the knowledge graph, invited to convenings, their data informs the platform, no funding obligation
- **Remaining ecosystem (~500+ JH orgs)** — on the JusticeHub public directory, referenced when relevant

Honest and generous.

### 14. Regional / urban balance inside each state

*If WA gets one anchor, is it Perth-metro or a remote town?*

**Park.** Workshop decision. Raise the question in Session 1 so Minderoo can voice preference.

### 15. Brave Ones as pilot vs national

*Is Brave Ones Year 1 running at all 7 anchors simultaneously, or 2–3 deeply?*

**Envelope:** clarify — Brave Ones launches at **3 anchors Year 1** (Oonchiumpa, BG Fit, Mounty Yarns — the three that have given consent). Extends to remaining 4–5 in Year 2 as the final anchors are confirmed. This is honest and makes the pitch deliverable.

## Part 6 — Dashboard additions

The current dashboard has 10 sections. The reloop adds or modifies three:

### Add: "Candidate pool (50)" section

Replaces or sits above the "Communities map" section. Contents:

- A table of 50 candidates with columns: `rank`, `name`, `state`, `portfolio_score`, `evidence_level`, `cultural_authority`, `years_operating`, `justice_funding_total`
- Filter chips: state (all 8), evidence level (5 tiers), community-controlled (yes/no), youth-focused (yes/no/mixed)
- Map view: all 50 plotted on Australia, colour-coded by state, sized by portfolio_score
- Sort controls
- Click a row → drawer with full candidate detail + links to ALMA intervention, CivicGraph entity, and JH org page

### Add: "Workshop track" section

Under the candidate pool. Three-stage visual:
- Stage 1 · Shortlist of 50 (today)
- Stage 2 · Narrowed to 25 after Session 1 with Minderoo
- Stage 3 · Final 7 (or 8) after Session 2 + community consent

Each stage has a date (empty at Stage 1, fills when workshops run).

### Modify: "Communities map" section

Update legend to show three tiers:
- **Anchor (confirmed, funded, active)** — 4 today, target 7 (or 8)
- **Candidate shortlist (50)** — queryable from the data spine
- **Wider ecosystem** — JH's 556 orgs, quietly referenced

### Dashboard data source

The candidate pool section pulls from `mv_youth_justice_entities` via a scheduled export. Sensible cadence: weekly refresh. The dashboard holds a cached CSV/JSON snapshot updated by a script that runs the SQL above.

Candidate file: `apps/command-center/public/minderoo-candidate-shortlist.json` refreshed weekly.

## Part 7 — Envelope narrative update

The envelope's framing changes from *"here are our ten anchors"* to *"here's the method we use to select anchors — evidence-led, community-confirmed, workshopped with you."*

Specific copy changes:

**Before (current pitch):**
> "The Three Circles program is anchored in ten community-led youth justice organisations across Australia..."

**After:**
> "The Three Circles program is anchored in 7 (or 8) community-led youth justice organisations — one per state and territory — selected together with Minderoo from a shortlist of 50 candidates drawn from ACT's data spine (1,155 ALMA-verified interventions, 100K CivicGraph entities, evidence-scored). Four anchors are already confirmed, stories flowing, consent recorded. The remaining 3–4 are selected in the workshop with Minderoo that this proposal proposes we have."

This is ~2 sentences longer. The trade is getting Lucy *into* the selection instead of being *told about* it.

## Part 8 — What to do next (concrete, ordered)

1. **Run the SQL query today.** Produces the 50-candidate file. Manual spot-check pass on the bottom half.
2. **Update the dashboard** — add the candidate pool section + workshop track.
3. **Update the 10-anchor contact sheet** — becomes the "Active anchor + shortlist summary" one-pager. Four confirmed anchors stay named; the 50 shortlist summarised in a one-line breakdown per state.
4. **Update the Three Circles pitch doc** (wiki/projects/justicehub/three-circles.md) with the reframe paragraph.
5. **Draft a one-page "workshop proposal"** for Lucy — what the two sessions would look like, what she decides, what ACT commits to. This goes in the envelope.
6. **Draft a one-paragraph "why not ten"** explanation for the envelope if Ben prefers 7 or 8 — honest, not defensive.

Items 1 and 2 are doable today. 3–6 are editorial passes on existing material.

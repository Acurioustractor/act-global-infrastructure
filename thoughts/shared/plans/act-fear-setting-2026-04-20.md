# ACT Fear-Setting — for Ben + Nic

**Date:** 2026-04-20
**Purpose:** Work through this together *before* signing A Curious Tractor Pty Ltd, before the 1 May Minderoo envelope, before Oonchiumpa hosts 55 judges tomorrow.
**Format:** Tim Ferriss fear-setting, scoped to the seven ACT projects + the entity structure we're about to lock in.
**Audience:** Ben + Nic. Intended to be worked through together, not read alone.

---

## Why this, why now

We're at an unusual moment. In the next 14 days we will:

- Sign ACT Pty Ltd (Ben + Nic as directors, Knight Family Trust as shareholder)
- Land the Minderoo envelope (1 May — 11 days)
- Host 55 judges at Oonchiumpa (17 April — completed)
- Bed down the OCAP consent cascade across live community stories
- Carry 7 projects and a dual-entity structure with a bus factor of roughly 1

Fear-setting is at its cheapest *before* commitment, not after. Visualising the nightmare is not pessimism — it is preparation, the kind Phelps did when he counted strokes blind. The goal of this doc is to make the real moment feel like **confirmation**, not **discovery**.

**The rule:** we write what we actually fear, not what sounds respectable to fear. We pre-experience the worst version so it loses its power.

---

## The frame (condensed Ferriss)

For each area we answer five things:

1. **Nightmare** — what's the worst realistic version?
2. **Prevent** — what can we do now to reduce probability?
3. **Repair** — if it happens, what's the recovery path?
4. **Benefit of attempt** — what do we gain even in partial success?
5. **Cost of inaction** — at 6 months, 12 months, 36 months

---

## Scan: area by area

### 1. Entity structure (ACT Pty Ltd + Foundation CLG + Knight Family Trust)

**Nightmare**
- Mission drift: Ventures trades its way out of LCAA / First Nations partnership and becomes "just a consultancy"
- Foundation loses charitable status over non-arm's-length dealings with Ventures
- Personal director liability flows to Ben + Nic (+ Carla as trustee)
- The structure becomes impossible to explain to funders or communities — the complexity itself undermines trust

**Prevent**
- Written founders' agreement executed with the Pty Ltd (not 12 months later)
- Intercompany agreement with arm's-length pricing between Foundation and Ventures
- Director minutes for every material decision from day one
- D&O insurance before first trading activity
- Independent chair or non-executive director within 12 months
- A one-page explainer of the structure that a funder can understand in 90 seconds

**Repair**
- If mission drift is detected: wind Ventures down, Foundation survives
- If compliance breach: voluntary disclosure, reset board, communicate honestly to partners
- Communications default: "we over-built, we're resetting to mission"

**Cost of inaction**
- 6 mo: governance debt accumulates quietly
- 12 mo: ATO or ACNC asks a question we can't cleanly answer
- 36 mo: forced restructure under stress instead of choice

---

### 2. Minderoo envelope (1 May, 11 days)

**Nightmare**
- Envelope lands flat. Minderoo passes. Five anchor communities watch us fail the first big test after reframing the pitch around them.
- Worse: we win the funding, over-promise, and burn a community relationship executing

**Prevent**
- 11 focused days. No new features. No new scoring runs unless a ground-truth test fails.
- PICC per-story gate-chase fully resolved before submission
- Final pass done by someone who hasn't been in the weeds (ideally Nic)

**Repair**
- Post-mortem to all five anchors within 2 weeks of a "no"
- "Here's what we learned. Here's what we're doing next. You're still the anchor."
- Preserve relationship > preserve envelope

**Benefit of attempt, even if we don't win**
- We will have compiled the most complete anchor-verified data spine in the sector
- The pitch reframe (50-to-7/8 workshopped method) is now permanent IP regardless

**Cost of inaction today**
- Every hour spent elsewhere is an hour off the envelope. Is *this* doc the right use of the next 90 minutes? If not, file it and come back after 1 May.

---

### 3. Oonchiumpa + community anchors (OCAP governance)

**Nightmare**
- An OCAP breach: a story goes public without verbal-consent trail, Kristy or Tanya sees it before we do, the relationship cracks
- Or the reverse: we hold so tightly that stories die in the archive and communities feel silenced by us
- Or: we treat "verbal consent + witness" as a paperwork exercise and fabricate the trail

**Prevent**
- Allow-list config enforced; bulk approval scripts re-audited
- Every verbal consent: witnessed, dated, attributed to Ben's reported word + witness — never inferred
- Elder approval gate active on compilations
- Single named human accountable per anchor community (not "the team")

**Repair**
- Full stop, remove the artefact, apologise in person (not Slack)
- Offer the community time, visibility, and a say in what happens next
- Wait to be invited back. Do not self-rehabilitate.

**Cost of inaction**
- 12 mo: one incident cascades across every OCAP story
- 36 mo: reputation becomes "ACT talks sovereignty but moves faster than consent"

---

### 4. Empathy Ledger v2

**Nightmare**
- Gallery tables still missing from the multi-tenancy migration → storyteller sees incorrect attribution or another org's content → community calls → trust destroyed
- Cross-org leak (we had one in Civic World Model; we cannot have another in EL)

**Prevent**
- Complete the gallery table migration before any new org onboarding
- Every query scoped by `org_id` by default, not by convention
- RLS tests as CI gates, not manual spot-checks

**Repair**
- Notify, correct, pay out of pocket for elder-led redress process
- External review of data architecture

**Cost of inaction**
- 36 mo: EL becomes the thing no community trusts to hold their story

---

### 5. JusticeHub cluster (Brave Ones v3, Mounty Yarns, BG Fit)

**Nightmare**
- Brodie, Daniel Daylight, or an elder sees a story they didn't specifically approve, or a compilation that aggregates their work in a way they didn't consent to
- We scale stories faster than the cascade-consent design supports

**Prevent**
- Per-story elder review before public surface
- Compilation review explicit and active (not assumed)
- The cascade design pointer actually implemented, not just pointed to

**Repair**
- Take down first. Then ring Brodie/Daniel. Ask what the community needs.
- Never defend. Never explain before listening.

**Cost of inaction**
- 12 mo: the partnership stories we're proudest of become the ones we can't talk about

---

### 6. The other four projects (Goods on Country, Black Cockatoo Valley, The Harvest, ACT Farm, Art)

**Nightmare**
- Fragmentation. Seven projects with nobody deeply accountable to any single one. Everything half-built. Nothing fully shippable in 12 months.
- We become "lots of ideas, no delivery" in the sector's eyes

**Prevent**
- Honest tier-ranking: which 2–3 are FY26 priority, which are dormant, which are sunset?
- Single accountable human per active project, not "the team"
- Permission to say "not now" publicly

**Repair**
- Explicit sunset with public communication: "we tried X, not now, resources going to Y"
- Sunsets are not failures — silent neglect is the failure

**Cost of inaction**
- 12 mo: team burnout on breadth
- 36 mo: reputation = scattered

---

### 7. Finance / R&D / BAS

**Nightmare**
- R&D claim rejected post-review → 43.5% refund clawback + penalties
- We've already spent the expected refund → cashflow crunch → we take money we shouldn't

**Prevent**
- Contemporaneous records (already 95.3% receipted in Q2 FY26 — this is a real strength)
- Every experimental hour project-tagged as it happens, not reconstructed
- Do not spend the R&D refund until it's in the bank

**Repair**
- Voluntary disclosure, negotiate, pay back, slow expansion
- Communicate honestly internally — don't hide it

**Cost of inaction**
- 12 mo: cashflow crunch if refund is delayed or rejected
- 36 mo: we stop being able to claim R&D credibly at all

---

### 8. Bus factor (the one we don't talk about)

**Nightmare**
- Ben is hit by a bus, has a health event, or just burns out. No one else can run the spending intelligence system, wiki sync, EL v2 multi-tenancy, CivicGraph, or the ALMA scoring pipeline.
- Nic can't step into these cold without months of ramp

**Prevent**
- Runbooks for every critical system (not just MEMORY.md fragments)
- Paired shadowing with at least one other human per critical system
- Nic spends one deliberate day a month in the ops layer, even if it's not his strength
- External fractional CTO / ops partner identified before it's needed

**Repair**
- Nic + external contractor, 3–6 months to stabilise
- Some things die. Accept that in advance.

**Cost of inaction**
- 6 mo: dependency compounds
- 12 mo: one ops failure = months to recover
- 36 mo: permanent ceiling on scale

---

### 9. The partnership (Ben + Nic)

**Nightmare**
- Unspoken disagreement on mission, money, or method compounds until one of us wants out
- There's no clean exit path because we never wrote one
- The fight happens under stress (funding event, community incident, personal crisis) instead of in a quiet room

**Prevent**
- Founders' agreement executed *with* the Pty Ltd, not "later"
- Quarterly structured check-in (not just operational — relational)
- External coach or mediator on retainer within 6 months
- Explicit agreement: how do we decide when we disagree? What's the tiebreaker?

**Repair**
- Pre-written drag/tag terms, buyout formula, IP split
- A named third party (not a lawyer first — a trusted human)

**Benefit of having the conversation**
- 90%+ of co-founder pairs who don't have this conversation early have it late, under stress. The conversation itself builds the partnership.

**Cost of inaction**
- 6 mo: small resentments
- 12 mo: first real disagreement surfaces, and we don't have the protocol
- 36 mo: exit under stress, with communities watching

---

## Cross-cutting fears (the patterns underneath)

1. **Mission drift** — commercial pressure pulls Ventures away from LCAA
2. **OCAP breach** — the single event that ends the ecosystem in one phone call
3. **Bus factor = 1** — Ben as single point of failure for most systems
4. **Partnership rupture** — cost of not having the hard conversation
5. **Breadth over depth** — doing seven things adequately instead of two things well

---

## For Nic — prompts to work through together

Not eloquent. 2–3 sentences each. Written, not just said.

1. What's your nightmare for ACT in the next 18 months that we don't talk about?
2. Where do you think Ben is over-reaching / burning out?
3. Where do you think you (Nic) are carrying too much elsewhere (Orange Sky, family, board roles) to show up fully here?
4. What's a story in ACT that scares you from a consent / harm perspective?
5. If we had to sunset one of the 7 projects today, which?
6. What would make you want to walk away in 3 years? Say it now, not then.
7. What would make you most proud in 3 years? Specific — not "impact".

---

## The one I'm putting off

*Ben to fill this in. The thing you're not saying to Nic. Write it here. Then show him.*

> [ ... ]

---

## Cost-of-inaction table

| Window | Governance | Minderoo | OCAP | Bus factor | Partnership |
|---|---|---|---|---|---|
| 6 mo  | Debt accrues quietly | Pass / fail binary | Slow degradation risk | Dependency compounds | Small unspoken resentments |
| 12 mo | ATO/ACNC question we can't cleanly answer | Relationship warm or cold | One incident = system-wide cascade | One ops failure = months to recover | First real disagreement surfaces without a protocol |
| 36 mo | Forced restructure under stress | "They had one shot" in the sector narrative | Reputation brittle, partners cautious | Permanent ceiling on scale | Exit under stress, with communities watching |

---

## Decisions this session needs to produce

By the end of the conversation with Nic, we should have explicit answers on:

1. ☐ Do we sign the Pty Ltd on the current docs (with the postcode + residential-address fixes flagged) or wait until the founders' agreement is drafted?
2. ☐ Which 2–3 of the 7 projects are FY26 priority? Which are sunset?
3. ☐ Who's the named accountable human per active project?
4. ☐ When's the quarterly structured check-in on the partnership? Book it now.
5. ☐ Who's the external third party we'd call if we disagreed and couldn't resolve it?
6. ☐ What's our rule on spending the R&D refund before it's in the bank?
7. ☐ What's the one thing each of us commits to document / run-book before 1 June?

---

## Closing frame

Phelps rehearsed disaster so thoroughly that when his goggles filled with water in the Olympic final, he kept swimming. He'd already counted the strokes blind, in his mind, hundreds of times.

We are not hoping this works. We are pre-experiencing the hard version so that if and when it shows up, we've already been there.

*This is a living doc. Revise after Oonchiumpa, after 1 May, after the Pty Ltd is stamped.*

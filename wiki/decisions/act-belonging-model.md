---
title: The ACT Belonging Model — one membership ladder across the ecosystem
date: 2026-06-02
status: active
owner: Ben
related: [comms-architecture, ghl-operating-system, ghl-tag-taxonomy, plans/2026-06-01-goods-drip-feed-content-plan, 2026-06-02-harvest-ghl-system-map]
---

# The ACT Belonging Model

> **The list is never the goal. The depth of belonging is.** ACT does not build audiences — it builds members who become stewards, because the whole mission is to hand over the keys. This is that mission expressed as one system across every site and project.

## The principle

A subscriber is someone you email *at*. A **member** is someone who *belongs*. ACT treats community as co-owners, not an audience, so every relationship across the ecosystem moves through **deepening belonging**, not onto a mailing list. The newsletter is one rung, never the destination.

The endpoint is **Steward** — the person you can hand the keys to. That is not a marketing funnel's "conversion." It is ACT's reason to exist: design for your own obsolescence, and the people who carry it on are stewards. The belonging ladder *is* the theory of change.

## The ladder (5 rungs — universal)

| Rung | What it means | Tag |
|---|---|---|
| **Curious** | aware, in the system, not engaged | `tier:curious` |
| **Connected** | receiving the story, warming, opted in | `tier:connected` |
| **Member** | committed — joined, supports, contributes, belongs | `tier:member` |
| **Active** | shows up — does the thing (volunteers, gives, runs, attends) | `tier:active` |
| **Steward** | aligned — champions it, brings others, co-owns, can be handed to | `tier:steward` |

`tier:` is one namespace across the whole ecosystem; `project:` scopes it. A person can be `tier:steward` in Harvest and `tier:connected` in Goods at the same time.

## The line that must never blur: supporters vs community

The ladder is for the people who **support** the work — funders, members, buyers, partners, the public. It is **NOT** for the communities the work is **with**.

- **First Nations communities, storytellers, the people in the stories** are **co-owners from the first moment** — sovereign, consent-governed, already at the deepest belonging *by right*. They are never "leads," never laddered, never funnelled. (This is Track A from the Goods plan, generalised: community = co-ownership + OCAP, not a journey we move them through.)
- **Supporters and partners** move up the ladder.

Getting this wrong is the exact extraction ACT refuses. One system, two populations: ladder the supporters, honour the community.

## What each rung means per project

| Project | Member | Active | Steward | (community — NOT laddered) |
|---|---|---|---|---|
| **ACT (core)** | aligned supporter of the ecosystem | advocates, gives across projects | ambassador / board, co-owns the mission | — |
| **Goods on Country** | committed funder / supporter / buyer | repeat giving, deploys beds, refers | champion, advisory, backs community ownership | the communities receiving beds |
| **The Harvest** | CSA member | gatherings, volunteering, events | co-steward of the farm + gatherings | — |
| **JusticeHub** | CONTAINED participant / partner adopting the model | runs the experience, forks the model | scales + trains others on it | young people + families with lived experience |
| **Empathy Ledger** | **org partner** using EL ethically | actively syndicating with consent | champions the ethical-storytelling model | **the storytellers** (OCAP, sovereign) |
| **ACT Farm / BCV** | resident / program participant | returns, works the land | long-term custodian / co-steward | — |

## How it's implemented

**One shape, repeated per project:**

1. **Sites = the doors.** Every project site (act.place, goodsoncountry.com, the Harvest site, justicehub.com.au) has a **"belong / become a member"** invitation, not "subscribe." On submit it stamps `project:<x>` + `tier:connected` + `comms:<x>-newsletter` + `source:` + UTM.
2. **GHL = the ladder, made operational.** Each project has a **Journey pipeline** whose stages are the 5 rungs:
   - Goods → *Supporter Journey* (exists)
   - Harvest → *Membership Journey* (build)
   - JusticeHub → *CONTAINED / Membership Journey* (build; the Contained draft workflow seeds it)
   - ACT core → *Ecosystem Membership* (build when ready)
   The **pipeline stage and the `tier:` tag stay in sync** — stage is the board you work, `tier:` is the cross-project status you segment on.
3. **Newsletter = the Connected rung's tool.** `comms:<project>-newsletter` moves Curious → Connected. It is one touch in the journey, gated by `newsletter_consent`.
4. **Workflows = the lifts between rungs.** Welcome (Curious→Connected), nurture + the ask (Connected→Member), activation (Member→Active), recognition + invitation to co-steward (Active→Steward). AI may draft the supporter touches; **community touches stay human** (the commerce-yes/community-never rule).
5. **One person, many memberships.** Belonging is per project. The ACT-main newsletter is the house that cross-promotes the rooms; a Harvest steward can be a Goods member.

## The metric (this is the real change)

Not opens. Not list size. **Movement up the ladder** — how many at each rung per project, and how many climbed this quarter. A healthy project grows its Members and Stewards, not just its Curious. "40% of profits to community ownership" and "handing over the keys" are what Steward *is* — so counting stewards is counting the mission.

## Where each project is now / what to build

| Project | Has | Build |
|---|---|---|
| Goods | Supporter Journey pipeline + the drip plan | map stages → the 5 rungs + `tier:` |
| Harvest | tags + The Shop pipeline | the **Membership Journey** pipeline (the one new board) |
| JusticeHub | the CONTAINED list + draft workflow | a CONTAINED/Membership journey on the same shape |
| ACT core | the main newsletter (114) | the Ecosystem Membership journey, later |
| Empathy Ledger | storyteller content | an **org-partner** journey only — storytellers stay sovereign |

**Rollout order:** Harvest first (the model was born here, ~170 contacts ready), Goods second (re-label the existing Supporter Journey to the 5 rungs), JusticeHub third, ACT core + EL-org last. Same ladder every time — only the meaning of "Member" and "Steward" changes.

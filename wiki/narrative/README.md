# Narrative — what we have already said

> This is not a wiki of topics. It is a registry of **claims** — every distinct argument we have made publicly, the channels it was deployed on, the variants we used, the audience reactions logged, and the angles we have not yet pulled.

A wiki page about CONTAINED tells you what CONTAINED **is**.
A claim file tells you what we have already **said about it**.

The difference matters because we keep saying the same things from memory. This system makes the memory external so we can stand on it and build the next thing instead of re-deriving the last thing.

## Why this exists

Karpathy-style LLM wikis are great for stable concepts (research, projects, definitions). They break down for *narrative* work where the question is "what is the next post we should make?" — because a topic page summarises, it doesn't track deployment history, frame distribution, or unused angles.

The Rowboat / typed-entity approach fits better here. Each unit of storage is one **claim**, with structured frontmatter, backlinks to every place it appears, and an explicit gaps section.

## Structure

```
wiki/narrative/
├── README.md                     ← you are here
├── INDEX.md                      ← all claims grouped by frame, with deploy counts
├── STAT-CONFLICTS.md             ← numbers we have used inconsistently
├── contained/
│   ├── claim-cost-comparison.md
│   ├── claim-detention-doesnt-work.md
│   ├── claim-spain-diagrama-works.md
│   └── ...
├── empathy-ledger/               ← future
├── goods-on-country/             ← future
└── ...
```

Project-scoped from day one so claims can cross-reference across the ecosystem (the cost frame from CONTAINED is the same shape as the funding frame for Goods).

## Claim file frontmatter

```yaml
---
id: claim-<slug>
project: contained
type: claim
frame: evidentiary | moral | constructive | invitational | testimonial | structural | confrontational
secondary_frame: <one of the above, optional>
status: live | retired | needs-refresh | conflict
first_used: YYYY-MM-DD
last_used: YYYY-MM-DD
times_deployed: <integer>
channels: [linkedin, instagram, twitter, email-personal, email-broadcast, essay, oped, website, talk]
audiences: [public, funder, decision-maker, ally, community, media]
sources:
  - path: <file path or URL>
    section: <heading or anchor, optional>
    quote: <verbatim line, optional>
related_claims: [claim-<id>, ...]
backlinks_to_concepts: [<wiki concept slug>, ...]
---
```

## Frame taxonomy

| Frame | What it does | Example opening line |
|---|---|---|
| **evidentiary** | leads with a number | "Australia spends $1.55M per child per year." |
| **moral** | leads with right/wrong | "We are locking children in cages." |
| **constructive** | leads with what works | "There is a place in Spain that proves another way." |
| **invitational** | leads with an ask | "Walk through the container and tell me what you saw." |
| **testimonial** | leads with a person | "Isaiah helped us build the first room." |
| **structural** | leads with how a system works | "The cure already exists. The system just hasn't caught up." |
| **confrontational** | names a failure or villain | "Every inquiry has said it. The question is political will." |

A balanced campaign uses all seven. A campaign that only uses one (we currently lean *evidentiary*) gets ignored by everyone the numbers don't already convince.

## Body sections (every claim file)

1. **The argument** — one or two sentences, the canonical form
2. **Variants used** — every distinct phrasing we have deployed, with where
3. **Audience reactions logged** — who responded, what they said
4. **Stat watch** — any conflicts in the numbers
5. **What we haven't said yet** — explicit list of gaps, unused angles, untouched audiences
6. **Adjacencies** — related claims we could pivot to

## How to use this when drafting a new post

1. Open `INDEX.md` — see which frames are overused and which are starved
2. Pick a frame you have not led with recently
3. Find a claim file under that frame
4. Read its **What we haven't said yet** section
5. Draft the post against the gap, not against memory
6. After publishing, update the claim file: `times_deployed`, new `sources` entry, any reaction logged

## Lint rules (future, for `wiki-lint`)

- Every claim must have at least one entry in **What we haven't said yet** (forces gap thinking)
- Every claim deployed > 5 times in one frame must have a `secondary_frame` exploration
- Every stat used > 3 times must appear in `STAT-CONFLICTS.md` reconciled
- Every claim untouched > 90 days flips to `status: needs-refresh`

## Seed scope (v1)

Extracted from:
- `wiki/raw/2025-10-24-article-building-revolution-in-shipping-containers.md`
- `wiki/raw/2026-03-12-article-the-cure-already-exists.md`
- `JusticeHub/compendium/contained-campaign-bible.md`
- `JusticeHub/compendium/launch-week-posts.md`
- `JusticeHub/compendium/identity.md`
- `JusticeHub/compendium/first-nations-news-oped-draft.md`
- `JusticeHub/output/contained-personal-emails.md`
- `act-global-infrastructure/wiki/projects/contained.md`

18 claims for CONTAINED. Future seeds: Empathy Ledger (consent, story sovereignty, "no story without consent"), Goods on Country (bed-to-courtroom pipeline, enterprise-not-charity), Black Cockatoo Valley, The Harvest.

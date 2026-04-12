---
title: Narrative Dashboard
purpose: Live, queryable view of the entire narrative store from inside Obsidian
updated: 2026-04-09
---

# Narrative Dashboard

> Every claim across every project, queried from the frontmatter the scripts already wrote. No build step, no sync, no extra work — Obsidian's Dataview plugin reads the disk in real time.

**If the queries below show as code blocks instead of tables:** install the Dataview community plugin once.
`Settings → Community plugins → Browse → "Dataview" → Install → Enable`. Reopen this file and the queries render as tables.

**Vault note:** this file assumes you opened `wiki/` as the Obsidian vault root. All paths below are vault-relative (e.g. `narrative/contained/...`, not `wiki/narrative/contained/...`).

---

## What's hot — most recently deployed (last 14 days)

The top of this list is the latest thing the system saw shipped. Use it to confirm what's being said this week.

```dataview
TABLE WITHOUT ID
  file.link as "Claim",
  project as "Project",
  frame as "Frame",
  times_deployed as "Total deployments",
  last_used as "Last deployed"
FROM "narrative"
WHERE startswith(file.name, "claim-") AND last_used != null AND (date(today) - date(last_used)).days <= 14
SORT date(last_used) desc
LIMIT 20
```

---

## Top under-deployed claims (where the next post lives)

These are the claims with material on the shelf and barely used. Open one, scroll to its `## What we haven't said yet` section, draft against the gap.

```dataview
TABLE WITHOUT ID
  file.link as "Claim",
  project as "Project",
  frame as "Frame",
  times_deployed as "Deployments",
  last_used as "Last used"
FROM "narrative"
WHERE startswith(file.name, "claim-")
SORT times_deployed asc
LIMIT 15
```

---

## Cold claims — untouched 30+ days (redeploy or retire)

```dataview
TABLE WITHOUT ID
  file.link as "Claim",
  project as "Project",
  frame as "Frame",
  last_used as "Last used",
  (date(today) - date(last_used)).days as "Days cold"
FROM "narrative"
WHERE startswith(file.name, "claim-") AND last_used != null AND (date(today) - date(last_used)).days >= 30
SORT (date(today) - date(last_used)).days desc
```

---

## Frame distribution per project

A balanced campaign uses every frame. Frames clustered at one end of any row are signs of imbalance. Compare this to each project's `STRATEGY-REVIEW.md` for the "this is starved / this is over" diagnosis.

```dataview
TABLE WITHOUT ID
  project as "Project",
  frame as "Frame",
  length(rows) as "Claims",
  sum(rows.times_deployed) as "Total deployments"
FROM "narrative"
WHERE startswith(file.name, "claim-")
GROUP BY project + " · " + frame
SORT project asc, sum(rows.times_deployed) desc
```

---

## Project rollup — every claim across every project

The full database view. Sort by any column. Use the search box (`Cmd+F` in Obsidian) to filter.

```dataview
TABLE WITHOUT ID
  file.link as "Claim",
  project as "Project",
  frame as "Frame",
  status as "Status",
  times_deployed as "Deployed",
  last_used as "Last used",
  cycle as "Cycle"
FROM "narrative"
WHERE startswith(file.name, "claim-")
SORT project asc, times_deployed desc
```

---

## Channel coverage — what have we touched recently?

```dataview
TABLE WITHOUT ID
  channels as "Channels",
  length(rows) as "Claims using",
  max(rows.last_used) as "Most recent use"
FROM "narrative"
WHERE startswith(file.name, "claim-") AND channels != null
FLATTEN channels
GROUP BY channels
SORT max(rows.last_used) desc
```

---

## Audience coverage — where are we under-serving?

```dataview
TABLE WITHOUT ID
  audiences as "Audience",
  length(rows) as "Claims tagged"
FROM "narrative"
WHERE startswith(file.name, "claim-") AND audiences != null
FLATTEN audiences
GROUP BY audiences
SORT length(rows) desc
```

Audiences with fewer than 5 claims tagged are under-served. The most common gaps are `media` and `community` — look there for the next round of claim extraction.

---

## Cycle coverage — which campaign moments have claims ready?

```dataview
TABLE WITHOUT ID
  cycle as "Cycle phase",
  length(rows) as "Claims tagged",
  filter(rows, (r) => r.times_deployed = 0).length as "Never deployed"
FROM "narrative"
WHERE startswith(file.name, "claim-") AND cycle != null
FLATTEN cycle
GROUP BY cycle
SORT length(rows) desc
```

When you know a campaign moment is approaching (budget week, world-tour-pre, term-sheet), check this table to see if you have enough claims tagged for that moment. If a cycle has under 3 claims and zero deployments, the next sprint should extract more for that moment.

---

## Funder pipeline (manually maintained — see [`narrative/funders.json`](../narrative/funders.json))

These are the active funder relationships and their lead claims. Click into any claim to draft against it.

| Funder | Stage | Deadline | Ask | Lead with |
|---|---|---|---|---|
| **Minderoo** | ask-pending | 2026-05-15 | $3.43M | [[claim-the-library-is-the-destination]] · [[claim-three-circles-start-at-the-edge]] · [[claim-staying-is-the-move]] · [[claim-tier-pricing-against-detention-cost]] |
| **JCF (June Canavan)** | active-partner | — | $60K/year × 5 | [[claim-story-is-the-spine]] · [[claim-stories-from-inside]] · [[claim-corpus-is-the-procurement-weapon]] |
| **QBE Catalysing Impact** | term-sheet-pending | — | TBC | [[claim-unit-economics-must-be-real]] · [[claim-handover-is-the-test]] · [[claim-not-charity-its-enterprise]] |
| **Atlassian Foundation** | cold | — | $200K | [[claim-the-ecosystem-is-one-database]] · [[claim-the-loop-is-the-product]] · [[claim-platform-stress-test]] |
| **Snow Foundation** | warm | — | $200K | [[claim-the-loop-is-the-product]] · [[claim-room-3-community-already-doing-it]] · [[claim-not-charity-its-enterprise]] |
| **Paul Ramsay Foundation** | cold | — | TBC | [[claim-cost-comparison]] · [[claim-room-3-community-already-doing-it]] · [[claim-platform-stack]] |
| **Tim Fairfax Family Foundation** | warm-cold | — | TBC | [[claim-room-3-community-already-doing-it]] · [[claim-the-container-as-method]] · [[claim-young-people-as-experts]] |
| **NIAA** | procurement-prospect | — | TBC | [[claim-not-charity-its-enterprise]] · [[claim-handover-is-the-test]] · [[claim-unit-economics-must-be-real]] |
| **Patagonia** | cold | — | $150K | [[claim-not-charity-its-enterprise]] · [[claim-bed-to-courtroom]] |

To generate any of these pitches:

```bash
node scripts/narrative-draft.mjs <project> --funder <slug> --channel pitch --length long
```

Funder slugs: `minderoo` · `jcf` · `qbe-catalysing-impact` · `atlassian-foundation` · `snow-foundation` · `paul-ramsay-foundation` · `tim-fairfax` · `niaa` · `patagonia` · `allbirds` · `who-gives-a-crap` · `dusseldorp-forum` · `amnesty-australia` · `smith-family`

---

## Stat conflicts — fix these before any pitch ships

| Project | Tracker | Status |
|---|---|---|
| CONTAINED | [[STAT-CONFLICTS\|narrative/contained/STAT-CONFLICTS]] | 7 unreconciled drifts (the "16x" math, detention cost, recidivism rate, Diagrama success rate, community alternative cost, ALMA program count, Indigenous overrepresentation multiplier) |
| Empathy Ledger | (folded into individual claim Stat Watch sections) | The 49 vs 380 youth-justice quote count needs reconciliation |
| Goods on Country | (folded into individual claim Stat Watch sections) | The $400 target vs actual delivered cost — depends on the delivered cost report being run |
| JusticeHub | (folded into individual claim Stat Watch sections) | The $1.33M vs $1.3M vs $1.55M cost-of-detention drift across the constellation; ALMA 1,775 vs 1,004 program count |

**Single biggest pre-publication risk:** the cost-of-detention figure drifts between $1.1M / $1.3M / $1.33M / $1.55M across documents, all attributed to ROGS. A hostile journalist will check this in five minutes. Reconcile to **one number with one date stamp** before any pitch ships.

---

## Strategy reviews — auto-regenerated weekly

Each project has a `STRATEGY-REVIEW.md` that names the frame budget shifts, cold claims, channel freshness, and recommended actions. Open them directly:

- [[STRATEGY-REVIEW|narrative/contained/STRATEGY-REVIEW]]
- [[STRATEGY-REVIEW|narrative/justicehub/STRATEGY-REVIEW]]
- [[STRATEGY-REVIEW|narrative/empathy-ledger/STRATEGY-REVIEW]]
- [[STRATEGY-REVIEW|narrative/goods-on-country/STRATEGY-REVIEW]]

**Refresh them all from the terminal:**

```bash
node scripts/narrative-strategy-review.mjs
```

(Auto-runs after every `narrative-log-deployment.mjs` call.)

---

## Active drafts — what's in the inbox

These are the briefs the system has generated that have NOT yet been turned into shipped drafts. Click in to read.

```dataview
TABLE WITHOUT ID
  file.link as "Brief",
  file.mtime as "Generated"
FROM "output/narrative-drafts"
WHERE !startswith(file.name, "SHIPPED-")
SORT file.mtime desc
```

## Shipped drafts — what's been written but not yet published

These are the actual prose drafts (not just briefs). They are ready for your final edit and publication.

```dataview
TABLE WITHOUT ID
  file.link as "Draft",
  file.mtime as "Written"
FROM "output/narrative-drafts"
WHERE startswith(file.name, "SHIPPED-")
SORT file.mtime desc
```

---

## Quick draft commands (copy any line, paste into terminal)

The next post against the most starved frame in CONTAINED:
```bash
node scripts/narrative-draft.mjs contained --frame moral
```

The Minderoo STAY pitch:
```bash
node scripts/narrative-draft.mjs justicehub --funder minderoo --channel pitch --length long
```

The JCF Final-5 retainer pitch:
```bash
node scripts/narrative-draft.mjs empathy-ledger --funder jcf --channel pitch --length long
```

The QBE Catalysing Impact term sheet:
```bash
node scripts/narrative-draft.mjs goods-on-country --funder qbe-catalysing-impact --channel pitch --length long
```

A budget-week op-ed:
```bash
node scripts/narrative-draft.mjs contained --cycle budget-week --frame confrontational --channel oped
```

A world-tour-pre LinkedIn post:
```bash
node scripts/narrative-draft.mjs empathy-ledger --cycle world-tour-pre --frame invitational --channel linkedin
```

After publishing any draft, log every claim used:

```bash
node scripts/narrative-log-deployment.mjs <claim-id> <channel> \
  --source <published-url> \
  --variant "<the actual line you used>"
```

---

## How to use this dashboard

1. **Open this file in Obsidian** every Monday before drafting anything new
2. **Read "What's hot" first** — see what's been said this week
3. **Scroll to "Top under-deployed"** — pick the next claim
4. **Read the claim file** — open its `## What we haven't said yet` section
5. **Draft against the gap** (in Obsidian, in Claude Code, or by hand)
6. **Log the deployment** when it ships
7. **Re-open this dashboard** — the system has updated itself

## How this dashboard updates itself

This file has no build step. The Dataview queries read the frontmatter of every claim file in `narrative/` every time you open the page. When you log a deployment, refresh a project, or write a new claim, the dashboard reflects it within 2 seconds.

**The disk is the database. Obsidian is the viewer. The scripts are the writers. There is no sync layer — there is nothing to sync.**

If the dashboard ever shows stale data:
1. Check that Dataview is enabled (`Settings → Community plugins`)
2. Press `Cmd+R` in Obsidian to force-reload the vault
3. Check that the script that wrote the file actually completed (look at the file's mtime)

That's it. There is no other failure mode for sync, because there is no sync.

---
title: Project Identity and Tagging System
status: Active
date: 2026-04-11
---

# Project Identity and Tagging System

> Not every page in `wiki/projects/` deserves its own operational project code. The wiki is allowed to be richer than the accounting, CRM, or website tag layer.

## Why This Exists

ACT now has one compiled wiki, one website build graph, one Empathy Ledger syndication layer, one Xero tracking layer, one GHL tagging layer, and legacy Notion traces still hanging around. If every interesting page in `wiki/projects/` gets treated as a standalone project in every system, the registry drifts, codes collide, and the same work gets tagged three different ways.

The fix is simple:

1. **The wiki remains the master inventory of pages and ideas**
2. **The project code registry remains the master inventory of operational project codes**
3. **An identity layer decides which wiki pages get their own code and which ones roll up**

This preserves the [[llm-knowledge-base|LLM knowledge base]] pattern the wiki was built for. The wiki should remain free to hold:

- projects
- hubs
- works
- methodologies
- pitches
- working drafts
- partner proofs

without pretending all of those are the same kind of operational object.

This page sits between [[tractorpedia|Tractorpedia]], [[living-website-operating-system|Living Website Operating System]], and [[continuous-pipeline|Continuous Pipeline Architecture]]. Tractorpedia keeps the memory graph rich; the website operating system explains how that memory composes into public surfaces; the continuous pipeline keeps the generated registry current.

## The Rule

Every wiki page in `wiki/projects/` must end up in one of five tagging states:

| State | Meaning | Cross-system behaviour |
|---|---|---|
| **Own-code** | A real operational project, hub, or budget-bearing sub-project | Gets its own code across EL, site, Xero, GHL, Notion |
| **Parent-code** | A real wiki page that should roll up to a parent project | Keeps its own wiki page, tags to the parent code |
| **Alias-of** | Another name for an already-coded project | Keeps its own wiki page, tags to the canonical project code |
| **Related-proof** | A precedent, partner program, or proof object | May stay in the wiki, but does not get an ACT project code by default |
| **No-tag-yet** | Still unresolved | Must be consciously classified before joining cross-system sync |

## What Gets Its Own Code

A page should get its **own code** only when at least one of the following is true:

- it has its own budget, invoice line, or Xero tracking need
- it has its own CRM / relationship / opportunity routing
- it is a real public-facing project or platform with durable identity
- it is a budget-bearing sub-project that needs distinct reporting

Examples:

- [[justicehub|JusticeHub]]
- [[goods-on-country|Goods on Country]]
- [[empathy-ledger|Empathy Ledger]]
- [[gold-phone|Gold.Phone]]
- [[contained|CONTAINED]]
- [[uncle-allan-palm-island-art|Uncle Allan Palm Island Art]]

## What Should Roll Up

A wiki page should **roll up to a parent code** when it helps explain the field, but is not yet a separate operational entity.

Common cases:

- methodologies
- pitch variants
- working drafts
- sub-pages inside a flagship program
- works that still belong inside a larger field
- place-specific strategy pages that are not yet separately budgeted

Examples right now:

- [[staying|Staying — Country & Council]] -> tag to [[justicehub|JusticeHub]]
- [[three-circles|The Three Circles]] -> tag to [[justicehub|JusticeHub]] until it becomes a separately funded entity
- [[minderoo-pitch-package|Minderoo Pitch Package — STAY]] -> tag to [[justicehub|JusticeHub]]
- [[the-full-idea|The Full Idea]] -> tag to [[justicehub|JusticeHub]]
- [[green-harvest-witta|Green Harvest Witta]] -> tag to [[the-harvest|The Harvest]]

## Alias Pages

Some wiki pages are important because the **name** matters, even when the operational project is already coded elsewhere.

Examples:

- [[grantscope|GrantScope]] is the codebase / technical name
- [[civicgraph|CivicGraph]] is the public product name

These pages should stay in the wiki if the distinction is meaningful. But the code should not fork. The cross-system tag should go to the canonical project code.

## Related Proof Pages

Some pages matter because they prove a pattern, not because they are ACT-owned projects.

Examples:

- [[deadlylabs|DeadlyLabs]] as partner proof
- external comparative or precedent pages that help explain [[justicehub|JusticeHub]] or ACT's method

These should usually stay in the wiki without becoming ACT project codes unless the relationship becomes operationally load-bearing.

## Retagging Rule

Retagging is allowed and should be expected.

When ACT learns that a page was classified wrongly:

1. update `config/project-codes.json` if a real code needs to change
2. update `config/project-identity-rules.json` if the page's classification or roll-up rule changes
3. backfill the wiki page metadata if needed
4. rerun the registry and downstream syncs

The point is **not** to freeze the field forever. The point is to make reclassification explicit instead of accidental.

## Legacy Wrapper Codes

Some rows still exist in operational systems even though they are **not** canonical wiki projects.

These should be treated as retained wrappers, not as new sources of truth:

- `ACT-CG` -> rolls to [[civicgraph|CivicGraph]] / `ACT-CS`
- `ACT-HQ` -> rolls to [[act-studio|ACT Regenerative Studio]] / `ACT-CORE`
- `ACT-PC` -> rolls to [[picc|PICC]] / `ACT-PI`

They remain because historical bookkeeping, R&D evidence, or internal naming conventions still reference them. The fix is not to pretend they are canonical projects. The fix is to mark them explicitly as **legacy wrappers** and keep rolling new tagging toward the canonical code.

## The Canonical Files

The current system has three canonical layers:

1. `config/project-codes.json`
   The master list of real ACT project codes

2. `config/project-identity-rules.json`
   The merge / roll-up / alias / proof decisions for ambiguous wiki pages, plus explicit legacy-wrapper decisions for retained non-canonical rows

3. `wiki/output/project-registry-latest.md`
   The generated human-readable report showing how the current wiki roster maps into the code system

4. [[wiki-project-and-work-sync-contract|Wiki Project and Work Sync Contract]]
   The canonical page-level fields the website, Supabase, and Empathy Ledger may trust downstream

The workflow is:

1. add or refine the page in the wiki
2. decide whether it is own-code, parent-code, alias-of, related-proof, or no-tag-yet
3. update the registry files
4. rerun the sync/build path

## Why This Fits The Wiki

This is the intended use of the wiki.

The wiki is not a ledger of only operationally funded things. It is a living map of ACT's work. That map must remain rich enough to include:

- the program
- the method
- the work
- the pitch
- the proof
- the draft

But the operational layers beneath it need sharper boundaries.

So the split is:

- **wiki** = rich memory graph
- **project code registry** = operational identity graph
- **identity rules** = bridge between the two

That lets the wiki keep compounding without breaking the accounting and syndication systems every time a new page is written.

## Current Output

See [project-registry-latest.md](../output/project-registry-latest.md) for the latest compiled roster and the current collision queue.

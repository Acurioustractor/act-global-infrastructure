# Campaigns — the campaign brain

One place. Four active fronts. Shared voice, shared people, shared learning loop.

## What this is

Every campaign ACT runs ships artefacts into the world — posts, pitches, scripts, docs, events. Each of those artefacts lives or dies by the same filter: the AI-signs checklist, the force-a-trap structure, the named-human-in-a-dated-moment standard.

Before this folder existed, each campaign kept its own voice rules in scattered drafts, its own contacts in scattered spreadsheets, and its own learnings in nowhere. This folder fixes that. One structure. One brain.

## Folder structure

```
campaigns/
├── _shared/
│   ├── voice.md              — voice + AI-signs filter pointer
│   ├── contacts.md           — named humans across all campaigns
│   └── orgs.md               — organisations + relationships
├── _weekly-review-template.md  — Thursday session prompt
├── aesthetics-of-asymmetry/  — Murri Watch live, 5 episodes queued
├── judges-on-country/        — 21 April Alice Springs, 55 judges
├── contained-tour/           — ongoing touring container
└── minderoo-pitch/           — spine + canonical + envelope
```

Each campaign folder has the same shape:

```
<campaign>/
├── brief.md          — one page: what, why, who, when, success metric
├── claims/           — claim files, mirror of wiki/narrative/<project>/
├── drafts/           — posts, scripts, docs
│   └── autoreason-logs/  — Round-by-round critiques and rankings
├── assets/           — posters, diagrams, photographs
├── outreach.md       — who's been contacted, what they said, what's next
└── learnings.md      — what worked, what didn't, what to steal across campaigns
```

## How it feeds the wiki

- **Claims** cross-link to `wiki/narrative/<project>/` via `scripts/narrative-refresh.mjs`
- **People** link to `wiki/people/` by slug
- **Projects** link to `wiki/projects/` by slug
- **Learnings** compound into `_shared/voice.md` as the force-a-trap patterns mature

Everything is plain markdown. No tooling required to read. Tooling optional to aggregate.

## Voice + brand

Voice rules live in `_shared/voice.md`. Brand tokens live in the aesthetics app — `/Users/benknight/Code/act-aesthetics-of-asymmetry/src/app/globals.css` is the source of truth for colours, typography, grid. Any campaign asset that uses a colour or font not in that file needs a deliberate reason.

The AutoReason loop lives at `.claude/skills/autoreason/` and runs against any draft that needs adversarial refinement.

## Weekly review

Run `_weekly-review-template.md` every Thursday. Fifteen minutes. Output goes to `_weekly-reviews/YYYY-MM-DD.md`. This is how the four campaigns learn from each other — what the minister's silence taught Murri Watch becomes evidence for the Minderoo pitch; what the 55 judges said becomes material for Aesthetics Episode 02; what CONTAINED surfaced in Mt Druitt becomes a claim in the narrative store.

## First weekly review

2026-04-16 (this Thursday). Seed data: Post 1 landed 144 reactions, minister still silent, JoC trip Tuesday, Minderoo canonical just drafted.

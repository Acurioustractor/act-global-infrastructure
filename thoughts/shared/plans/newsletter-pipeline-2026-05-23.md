---
title: ACT Newsletter Pipeline — PRD
date: 2026-05-23
status: PRD — awaiting Ben review before implementation
plan_slug: newsletter-pipeline-2026-05-23
related:
  - scripts/prepare-goods-newsletter.mjs (seed pattern — Goods-only)
  - thoughts/shared/plans/minimax-full-migration-2026-05-22.md (cheap LLM unlock)
  - thoughts/shared/audits/bot-tools-llm-adapter-2026-05-23.md (voice-grade in bot tools)
---

# ACT Newsletter Pipeline

## Why now

The MiniMax + Gemini migration removed the cost ceiling on LLM-mediated work. Voice grading is now cheap enough to apply to every public-facing artefact. Newsletters were previously cost-gated (drafting + grading + sending = expensive per touch) — now they're affordable to run as a continuous discipline.

Currently, ACT has one newsletter touchpoint: `prepare-goods-newsletter.mjs` (Goods-specific, one-shot per edition). No funder newsletter. No partner newsletter. No storyteller-facing newsletter. No public brand newsletter. Each audience needs different content, voice, cadence — but the pipeline can be one system.

## Audiences and matrix

| Audience | Cadence | Voice | Content source | Delivery list (GHL) | Success signal |
|---|---|---|---|---|---|
| **Funders** (Minderoo, QBE, Dusseldorp, Snow, etc.) | Quarterly + ad-hoc on milestone | Formal report register. Numbers + outcomes + photo. Curtis-method discipline. | Project status from wiki + Xero per-project numbers + Empathy Ledger story permissions | Funders pipeline contacts | Reply rate (target 30%+ replies), renewal-rate impact |
| **Partners** (Oonchiumpa, PICC, Mounty, BG-Fit, ACT-HV crew) | Monthly | Casual warm. Plain language. Photo-led. First Nations-led where applicable. | Project-specific commits + stories with consent + meeting notes | Partner pipeline contacts (tagged by project) | Engagement (story-share-back, decision-velocity) |
| **Public / brand** | Fortnightly | Curtis Aesthetics of Asymmetry. Counter-mugshot register. Justice + economy + ecology. | Aesthetics of Asymmetry posts + Tractorpedia entries + public-OK stories | act.place subscribers | Open rate (target 35%+), CTR to act.place |
| **Storytellers** (people whose stories ACT holds) | Per-story event + 6-monthly review | Plain English, OCAP-led, consent-renewable | Empathy Ledger v2 stories tagged for this person | EL v2 storyteller list | Consent renewal rate, opt-out rate |

Four audiences. Four voices. One pipeline.

## Surface architecture

```
PLANNING               DRAFTING             GRADING                DELIVERY            FEEDBACK
─────────              ────────             ───────                ────────            ────────
Notion calendar    →   AI draft per     →   voice grader  →       GHL list  →         GHL opens/clicks  →
(by audience,          audience using       (audience-               +
 by cadence,           audience-specific    specific                 GHL workflow      Notion performance
 by status:            prompt + content     rubric: funder,          (cadence rules)   log per send
 idea → drafted →      pulled from          partner, brand,                            (subject, open %, 
 graded → sent)        wiki/EL/Xero         storyteller)                               click %, replies)
                                                                                       
                                                                                       ↓
                                                                                       Next-newsletter
                                                                                       planning page
                                                                                       updates with
                                                                                       what landed,
                                                                                       what didn't
```

### Surface responsibilities

| Surface | Job | Why this surface |
|---|---|---|
| **Notion** | Plan + capture + log performance | Already the human-facing dashboard. Calendar view per audience. Free-form capture of "what should we say next?" |
| **scripts/** | Generate drafts, run graders, push to GHL | Where the LLM work lives. Already has `prepare-goods-newsletter.mjs` as seed. |
| **GHL** | Lists, scheduling, send, track | Already has contact tags by audience. Workflow automation for cadence. |
| **wiki/** + **Empathy Ledger v2** | Content source — what's actually happening across ACT | Already canonical for project state + stories with consent. |
| **Voice grader** (`scripts/grade-voice.mjs` + per-audience rubrics) | Quality gate before send | Already calibrated 10/10 on MiniMax. Just needs per-audience rubrics. |

## Components needed

### A. Per-audience voice rubrics

Four new rubrics under `thoughts/shared/rubrics/`:
- `newsletter-funder-voice.md` — Curtis-discipline + numbers-first + photo-required + signature line
- `newsletter-partner-voice.md` — Plain language + warmth + project-specific + photo if available
- `newsletter-brand-voice.md` — Aesthetics of Asymmetry + counter-mugshot + register variation
- `newsletter-storyteller-voice.md` — OCAP-led + plain English + consent-renewal language

Each follows the calibration pattern: 3 good + 3 bad fixtures, run on grade-pack to verify rubric is sound.

### B. Per-audience content selectors

Four selectors under `scripts/`:
- `select-funder-newsletter-content.mjs <funder-id> <edition>` — pulls project status + financials + stories with funder-visible permission
- `select-partner-newsletter-content.mjs <project-code> <edition>` — pulls project-specific stories + decisions + commits
- `select-brand-newsletter-content.mjs <edition>` — pulls Aesthetics of Asymmetry posts + Tractorpedia + public stories
- `select-storyteller-newsletter-content.mjs <storyteller-id> <edition>` — pulls stories about this person + consent state

Each writes JSON to `thoughts/shared/newsletters/<audience>/<edition>.json`.

### C. AI drafter

One generalized drafter: `scripts/draft-newsletter.mjs <audience> <edition>`. Reads the JSON content blob, the audience-specific rubric, and generates a draft using Sonnet route (mid-tier — Curtis-discipline drafting needs reasoning depth).

Output: `thoughts/shared/newsletters/<audience>/<edition>.draft.md` + draft metadata (subject lines, hero image suggestions).

### D. Voice grade loop

Wire `grade-voice.mjs` (with `--rubric newsletter-<audience>-voice.md`) into the drafter. If grade < pass, regenerate with feedback included as system prompt addendum. Cap regenerations at 3 cycles per draft.

### E. GHL push

Once a draft passes the grader, push to GHL as a scheduled email campaign in the audience's list. Uses existing GHL API service (`scripts/lib/ghl-api-service.mjs`). Schedule date pulled from Notion planning page.

### F. Notion planning + performance pages

One Notion DB: `newsletter_editions` with columns:
- audience (Funder | Partner | Brand | Storyteller)
- edition_name (e.g. "Funders Q4 FY26")
- scheduled_send (datetime)
- status (idea | drafting | graded | sent | analysed)
- subject_line (set after drafting)
- voice_grade_score
- sent_at
- recipients
- opens_pct
- clicks_pct
- replies_count
- notes

Sync scripts: `sync-newsletter-editions-to-notion.mjs` (outbound from Supabase + GHL) and `sync-newsletter-performance-from-ghl.mjs` (post-send tracking).

## MVP scope (one slice end-to-end)

To validate the pipeline before building all 4 audiences, ship ONE audience all the way through:

**MVP = Funders quarterly newsletter.**

Why funders first:
- Highest stakes (renewal pipeline)
- Most measurable (reply rate impact on renewals is trackable)
- Existing voice rubric basis (funder-cadence grader)
- Existing GHL list (Funders pipeline)

MVP slice:
1. Write `newsletter-funder-voice.md` rubric with 6 fixtures
2. Calibrate to 6/6 on Sonnet (using `grade-pack`)
3. Write `select-funder-newsletter-content.mjs <funder-id>`
4. Write `draft-newsletter.mjs funder <edition>` with voice-grade loop
5. Send one edition end-to-end (one funder, e.g. Minderoo, by hand-pasting into GHL — don't build GHL push automation yet)
6. Track replies for 2 weeks
7. Decide: was the draft good enough that the human only did a light edit? If yes, build GHL push automation. If no, iterate on rubric + drafter.

Estimated effort: ~2 days of work, ~3 weeks elapsed (allowing for feedback loop).

## Out of scope (for MVP)

- GHL push automation (one-time hand-paste for MVP)
- All 4 audiences (just funders for now)
- Multi-edition scheduling (just next quarter)
- A/B subject line testing
- Performance dashboard in command-center UI

## Success metrics (MVP)

- Voice grade: 9/10 or higher on first generation (cap regenerations at 3)
- Reply rate: ≥30% from funders within 2 weeks of send
- Human-edit-budget: ≤30 minutes between draft and send (vs current ~4 hours per funder update)
- Cost: ≤$0.50 per draft generation including grader regenerations

## Risks

- **Funder voice drift across MiniMax/Gemini routing** — drafts use Sonnet route which goes to MiniMax. If MiniMax voice doesn't match what funders expect, regeneration loop must catch it. Mitigation: pin draft to Anthropic via env override if MiniMax drift exceeds 1 tier on the funder-voice rubric.
- **Content selector quality** — pulling the "right" project status from wiki+Xero requires good schema. May surface gaps (e.g. project that hasn't been updated in months).
- **Consent / OCAP edge cases** — using a story in a funder newsletter when the storyteller only consented for partner use. Must filter rigorously on story_visibility tags.

## Path forward

1. Ben reviews this PRD, redirects scope if needed
2. /to-issues breaks MVP slice into tracker issues
3. Pick a target funder (suggest Minderoo or Snow) for the first edition
4. Set a target send date (suggest 4 weeks out — allows time for the loop)
5. Build the rubric + content selector + drafter
6. Send + measure + iterate

## Open questions for Ben

- Funder pick for MVP? Minderoo (highest-stakes, mid-pipeline) or Snow (most-recent funder, fresh relationship)?
- Voice grade pass threshold — 9/10 strict, or accept 8/10 with note?
- GHL list naming — is the existing "Funders" tag granular enough, or do we need per-funder lists?
- Photo sourcing — is there a photo library tagged for funder-visible use, or do we manually pick per edition?
- Cadence — quarterly truly, or after-milestone-driven (e.g. when a project's status changes)?

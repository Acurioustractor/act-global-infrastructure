# The newsletter lives in Empathy Ledger

**Written:** 2026-09-07
**Decision (Ben, 2026-09-07):** the newsletter is a syndication destination, so it lives where the stories, the consent and the subscribers already live. The Notion triage loop in this repo is retired once the ledger path is proven.

## What exists today (checked 2026-09-07)

Two newsletter systems, neither has sent an edition.

| | Infra loop (this repo) | Empathy Ledger |
|---|---|---|
| Input | git commits, wiki edits, plan and handoff files (cross-codebase feed) | 57 published public articles across the estate, each with its canonical home (partner site or ledger) |
| Triage | Notion `Newsletter candidates` (recreated today, 35 rows proposed, 799 excluded as noise) | `/admin/newsletter` picker: tick pieces, choose brand |
| Draft | `draft-{brand,partner,funder}-newsletter.mjs` writes Markdown, voice grader | Keep as article → derive (`content_derivatives`, channel `newsletter`) |
| Audience | brand / partner / funder labels, no subscriber list | `newsletter_subscribers` 233 rows; brands Empathy Ledger, JusticeHub, Goods on Country, A Curious Tractor |
| Send | manual paste into GoHighLevel | dispatch route: modes `test`, `newsletter` (direct email), `ghl` (template + workflow); `content_derivative_dispatches` records every recipient |
| Consent | `consent_visibility` empty on all 839 rows | `syndication_consent` per article per destination; `content_syndication.destination_type` already allows `newsletter` |
| Output so far | 1 draft (Snow, May), 0 sent | 1 derivative, 0 approved, 0 sent |

The ledger already has the whole road. What it lacks is use, and three small pieces below. The infra loop's only unique input, shipped code and wiki edits, was judged noise today (none of 839 rows ever included), so nothing is lost by retiring it.

## The road, once

Write → publish → derive → dispatch. A letter is an article (ruling 2026-08-18, `keep-as-article`), so it appears on the site and the send is a copy of it. One record of what went to whom.

## Steps

**1. Prove the existing path with no code.** Ben opens `/admin/newsletter`, ticks three pieces, picks a brand, keeps the letter as an article, publishes it, derives the newsletter variant, sends in `test` mode to himself. Every failure found here is a bug in the ledger, fixed before anything new is built. Day shift; the send is Ben's.

**2. Picker knows "since the last edition" and consent.** Today the estate picker offers the last 200 published pieces. Add: default filter to pieces published after the brand's last dispatched edition (`content_derivative_dispatches.sent_at` max per brand), and show the consent state for destination `newsletter` beside each piece, so an unconsented piece cannot be ticked. Source: `syndication_consent` and `content_syndication`. Repo: empathy-ledger-v2.

**3. Audience per brand reaches GoHighLevel.** `ghl` mode needs a workflow id per brand (readiness currently says "GHL workflow ID is not configured"). Map each brand to its GoHighLevel tag set (`goods-newsletter`, `harvest-newsletter`, `justicehub`, ACT brand list) in `ghl_integrations.contact_field_mappings`, store the workflow id, and make readiness green. Sending stays a human click. Repo: empathy-ledger-v2; the tag names live in `config/project-codes.json` (`ghl_tags`) here.

**4. Retire the infra loop.** After one real edition has gone out via the ledger: remove the four `newsletter-*` entries from `ecosystem.config.cjs`, archive `scripts/draft-*-newsletter.mjs`, `prepare-newsletter-for-send.mjs`, `sync-candidates-to-notion.mjs`, `sync-drafts-to-notion.mjs`, `sync-notion-candidate-status.mjs`, `sync-feed-to-newsletter-candidates.mjs` under `_archive/`, archive the two Notion databases, and drop the two ids from `config/notion-database-ids.json`. The cross-codebase feed itself stays: the Monday card and the digest read it.

**5. Later, if wanted: a "from the studio" paragraph.** If an edition should mention shipped work, it is one hand-written paragraph in the letter, not a feed. No automation.

## What this does not do

- No new tables. Everything named above exists.
- No AI drafting in the ledger. The letter is picked and written by a person; the grader in this repo is not ported.
- No change to who can read what: consent is checked at pick time and again at dispatch, both already in code.

## Sources
- empathy-ledger-v2 `src/app/admin/newsletter/page.tsx`, `src/api/admin/newsletter/keep-as-article/route.ts`, `src/app/api/admin/articles/[id]/derive/**`, `src/lib/ghl/newsletter-dispatch.ts`, migrations `20260411013127`, `20260411114500`.
- Ledger counts via PostgREST with the service key, 2026-09-07.
- `newsletter_candidates` and `newsletter_drafts` counts on the shared project, 2026-09-07.

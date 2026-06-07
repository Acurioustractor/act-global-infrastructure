---
title: ACT Communication Pipeline — 19-question grill-me lockdown + Snow Foundation MVP build plan
date: 2026-05-23
status: architecture locked via grill-me 2026-05-23; Snow Foundation Q4 FY26 MVP ready to build
plan_slug: act-communication-pipeline-2026-05-23-locked
supersedes_section_of: thoughts/shared/plans/act-communication-pipeline-2026-05-23.md
related:
  - thoughts/shared/plans/newsletter-pipeline-2026-05-23.md (original PRD)
  - thoughts/shared/plans/act-communication-pipeline-2026-05-23.md (architecture context)
  - wiki/narrative/funders.json (per-funder context — already exists)
---

# Locked architecture (19 decisions)

| # | Decision | Implication |
|---|---|---|
| Q1 | **Always-review every send.** No auto-send for any audience. | Voice grader is co-pilot, not gate. Bottleneck = human review capacity. |
| Q2 | **Drafts surface in Notion drafts DB.** | Notion is the system-of-record for drafts. Rich editor, multi-device, status-state-machine. |
| Q3 | **Hybrid candidate funnel.** Cross-codebase feed auto-populates Notion candidate DB with `status=proposed`. Human taps `include / exclude / defer`. AI drafts from `include` set. | Two Notion DBs: `newsletter_candidates` + `newsletter_drafts`. |
| Q4 | **Source-type → audience deterministic tagging + human override.** EL stories use consent_visibility; commits with Plan: trailer → brand; Xero payments → funder; project decisions → partner. | Schema: `auto_audiences` (computed) + `audiences` (overridable). Drafter reads `audiences ?? auto_audiences`. |
| Q5 | **Cadence-based trigger with threshold guard + manual override.** Funder = quarterly + min 3 candidates; Partner = monthly + min 2; Brand = fortnightly + min 3; Storyteller = event-triggered + min 1. Skip if threshold not met. Bot can manually trigger. | Per-audience cadence config. PM2 cron per-audience drafter trigger. |
| Q6 | **Per-recipient for funder + partner; per-audience for brand + storyteller.** ~12 funder editions/quarter, ~6 partner editions/month, ~26 brand editions/year, ~60 storyteller editions/year. | ~30 hours/year total review burden. LLM cost ~$30/year. Bottleneck = Ben's eyeballs. |
| Q7 | **Brand archived publicly; funder/partner/storyteller stay private.** `act.place/newsletters/<slug>` for brand. Private editions live only in GHL outbox + Notion drafts. | Funder portal (token-protected URLs) deferred — build only when funder asks. |
| Q8 | **Use existing per-recipient context.** `wiki/narrative/funders.json` (funders — `tone`, `framing_notes`, `claims_to_lead_with/avoid`), `wiki/projects/<code>.md` frontmatter (partners), EL storyteller profile (storytellers). Brand has no per-recipient context. | Zero new schemas. Drafter reads existing data at runtime. |
| Q9 | **Layer existing graders + lazy expansion of new rubrics.** Phase 1: `grade-voice` (Curtis core, 10/10) for all + `grade-funder-cadence` for funders. Partner/brand/storyteller rubrics written only when a gap shows in real drafts. | Don't pre-write 4 rubrics. Calibrate against real fixtures. |
| Q10 | **Two-tier OCAP guardrails.** HARD GATE: `consent_to_share=false`, never-elder-reviewed-but-requires-it, visibility mismatch. SOFT WARN: `elder_reviewed_at` > 12 months, story age > 2 years, sensitive cultural label. Send requires double-confirm if any soft warnings present. | Content selector enforces hard gate. Notion drafts DB shows warnings as red chips. |
| Q11 | **Cron poll Notion → GHL every 5 min.** `scripts/send-notion-drafts.mjs` runs `*/5 * * * *`. Finds `status=send-ready` + not-yet-sent. Pushes via GHL API. Errors → `status=send-error` with reason. | No Notion webhook complexity. Idempotent. ≤5min latency = fine for newsletter cadence. |
| Q12 | **GHL only for delivery metrics.** No sync into Notion. Feedback loop is human: Ben occasionally checks GHL, learns what works, manually refines `funders.json:framing_notes`. | Notion drafts DB stays lean (drafting + sending only). No auto-learning algorithms. |
| Q13 | **Solo curation — Ben does all.** Curation taps + draft review + send. All bot pushes route to Ben's chat. ~3 hours/week peak burden. | If Ben's slammed for a week, drafts queue gracefully in Notion. No multi-owner routing. |
| Q14 | **First slice = Snow Foundation Q4 FY26 end-to-end MVP.** Real funder, real deadline mid-Sept, smaller blast-radius than Minderoo, existing `framing_notes` in funders.json. | Forcing function: a real funder edition exercises every seam. |
| Q15 | **Cross-codebase feed cadence: daily 7am AEST.** Current default. Re-evaluate if a real consumer needs sub-day freshness. | No change to the PM2 cron added today. |
| Q16 | **Storyteller dashboard: split visibility.** Public `/storytellers/[id]` shows only public-visibility uses. Admin `/admin/storytellers/[id]` shows all uses + consent state. | Storyteller agency on public footprint; operator oversight on full picture. |
| Q17 | **Single `cross_codebase_embeddings` pgvector table in studio Supabase.** `source_repo` metadata for filtering. text-embedding-3-small (1536 dim). Refresh at 7:05am after the feed. | One migration, one cron, one query. Cost ~$0.04 first run + incremental. |
| Q18 | **AI generates 3 subject candidates; Ben picks.** Drafter outputs `subject_candidates: [string, string, string]`. Notion shows side-by-side. Default = first if not tapped. | Voice-grader scores subject lines too. Per-audience voice rules apply. |
| Q19 | **Two bot tools: `list_pending_drafts` + `mark_draft_send_ready`.** Bot covers see-what's-ready + fire-the-send. Other newsletter actions stay in Notion. | Tool descriptions enforce "review in Notion first." |

---

# Snow Foundation Q4 FY26 — MVP build plan

## Why Snow Foundation Q4 first

- **Real funder, real deadline.** Snow Foundation pays quarterly to ACT-OO. Q4 FY26 quarterly is due mid-Sept 2026. Forcing function = real recipient + real expectation.
- **Lower blast radius than Minderoo.** Snow ≈ $30k/quarter to ACT-OO; Minderoo would be a $2.9M-ask edition (too high-stakes to learn on).
- **Most recent positive signal.** Snow most-recent payment landed May 2026 (per latest finance data). Warm relationship.
- **Single project to feature.** ACT-OO is the only Snow-funded project. No cross-project complexity yet.
- **`framing_notes` already exist in `wiki/narrative/funders.json`** under the `snow-foundation` key (verify exists; create if missing).
- **OCAP test.** Includes Kristy Bloomfield's stories (likely) — exercises the two-tier consent guardrails on real Indigenous-led content.

## Build sequence (1–2 weeks elapsed, ~12 hr active work)

### Day 1: Foundations (~3 hr)

**1. Supabase migrations** (~30 min)
```sql
-- newsletter_candidates: rows that may go in a future newsletter
CREATE TABLE newsletter_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,        -- 'commit' | 'el_story' | 'xero_payment' | 'decision' | 'wiki_update'
  source_id TEXT NOT NULL,          -- repo+sha or story uuid or invoice id
  source_repo TEXT,                 -- for commits
  title TEXT NOT NULL,
  summary TEXT,
  date DATE NOT NULL,
  project_codes TEXT[],
  auto_audiences TEXT[] NOT NULL,   -- computed by source-type rule
  audiences TEXT[],                 -- human override (NULL = use auto)
  consent_visibility TEXT,          -- for EL stories
  storyteller_ids TEXT[],           -- for EL stories
  status TEXT NOT NULL DEFAULT 'proposed', -- 'proposed' | 'include' | 'exclude' | 'defer'
  status_changed_at TIMESTAMPTZ,
  status_changed_by TEXT,
  notion_page_id TEXT,
  payload JSONB,                    -- full event from cross-codebase feed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON newsletter_candidates (status, date DESC);
CREATE INDEX ON newsletter_candidates USING gin (auto_audiences);

-- newsletter_drafts: editions in various states
CREATE TABLE newsletter_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_slug TEXT UNIQUE NOT NULL,  -- e.g. 'snow-foundation-q4-fy26'
  audience TEXT NOT NULL,             -- 'funder' | 'partner' | 'brand' | 'storyteller'
  recipient_slug TEXT,                -- 'snow-foundation' (NULL for per-audience editions)
  edition_period TEXT,                -- 'Q4 FY26'
  subject_candidates TEXT[],
  selected_subject TEXT,
  body_md TEXT,                       -- markdown body for Notion display
  body_html TEXT,                     -- rendered HTML for GHL
  candidate_ids UUID[],               -- references newsletter_candidates
  consent_warnings JSONB,             -- {storyteller_id: ['elder_review_stale', ...]}
  voice_grade_score INT,
  voice_grade_details JSONB,
  status TEXT NOT NULL DEFAULT 'drafting', -- 'drafting' | 'graded' | 'reviewed' | 'send-ready' | 'sent' | 'send-error' | 'send-blocked'
  status_changed_at TIMESTAMPTZ,
  double_confirmed BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  ghl_campaign_id TEXT,
  send_error TEXT,
  notion_page_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON newsletter_drafts (status, audience);
```

Apply via `mcp__supabase__apply_migration`.

**2. Notion DBs** (~30 min)
- Create `Newsletter candidates` DB with properties matching schema
- Create `Newsletter drafts` DB with properties matching schema
- Capture page IDs into `config/notion-database-ids.json` as `newsletterCandidates` and `newsletterDrafts`

**3. Cross-codebase feed → candidates sync** (~1 hr)
- `scripts/sync-feed-to-newsletter-candidates.mjs`
- Reads `thoughts/shared/cross-codebase-feed/latest.json`
- For each event: compute `auto_audiences` via source-type rule
- Upsert into `newsletter_candidates` table by `(source_type, source_id)`
- Skip events already in DB unless updated_at changed
- PM2 cron: `0 7 30 * * *` (daily 7:30am AEST, 30min after feed completes)

**4. Candidates → Notion sync (one-way write)** (~1 hr)
- `scripts/sync-candidates-to-notion.mjs`
- Reads candidates with `notion_page_id IS NULL OR status_changed_at > last_sync`
- Creates/updates Notion pages
- PM2 cron: same as above

### Day 2: Drafter + voice grading (~3 hr)

**5. Notion → candidates status sync (one-way read)** (~45 min)
- `scripts/sync-notion-candidate-status.mjs`
- Reads Notion candidate pages where status changed via human tap
- Writes status back to `newsletter_candidates.status`
- PM2 cron: every 30 min during business hours

**6. Funder drafter** (~2 hr)
- `scripts/draft-funder-newsletter.mjs <funder-slug> <edition-period>`
  - Reads `wiki/narrative/funders.json[funder-slug]`
  - Reads `newsletter_candidates WHERE status='include' AND 'funder' = ANY(audiences) AND date > last_edition_at`
  - Filters via OCAP two-tier (hard gate + soft warn)
  - Drafts body via Sonnet (route to MiniMax-M2.7 per existing adapter)
  - Generates 3 subject candidates
  - Calls `grade-voice` + `grade-funder-cadence`
  - Writes to `newsletter_drafts` with `status='drafting'` then `'graded'`
  - Syncs to Notion drafts page
- Manual invocation for the first edition: `node scripts/draft-funder-newsletter.mjs snow-foundation Q4-FY26`

### Day 3: Send mechanism + first edition (~2 hr)

**7. Notion → GHL send cron** (~1 hr)
- `scripts/send-notion-drafts.mjs`
- Reads `newsletter_drafts WHERE status='send-ready' AND sent_at IS NULL`
- Checks consent warnings → requires `double_confirmed=true` if present
- Pushes to GHL via existing `ghl-api-service.mjs` (create email campaign + send immediately)
- Updates Notion: `status='sent'`, `sent_at`, `ghl_campaign_id`
- On error: `status='send-error'`, `send_error`
- PM2 cron: `*/5 * * * *`

**8. First Snow Foundation edition** (~1 hr — Ben's drafting time)
- Run `node scripts/draft-funder-newsletter.mjs snow-foundation Q4-FY26`
- Review draft in Notion
- Pick subject candidate
- Edit body for quarter-specific opening + close
- Verify no consent warnings (likely none for Snow/ACT-OO storytellers)
- Set status to `send-ready`
- Wait ≤5 min for cron → GHL → Snow's inbox

### Day 4+: Bot integration (~2 hr)

**9. Bot tools (Q19)** (~2 hr)
- Add `list_pending_drafts` and `mark_draft_send_ready` to `tool-definitions.ts`
- Implement executors in new `apps/command-center/src/lib/tools/newsletter.ts`
- Tool description for `mark_draft_send_ready`: "Use only AFTER reviewing the draft in Notion. This fires the send via the next cron tick (≤5 min)."
- Deploy via existing Vercel auto-deploy

### Optional Day 5: Cross-codebase RAG (~2 hr)

**10. Embeddings table + refresh cron**
- Migration for `cross_codebase_embeddings` (Q17)
- `scripts/refresh-cross-codebase-embeddings.mjs` (chunks + embeds + upserts)
- Update `ask-act.mjs` to query this table when `--feed` not set (regular RAG queries also benefit from cross-codebase index)
- PM2 cron: `5 7 * * *` (5 min after feed)

This deliverable is separate from the newsletter MVP but cheap to add while in flow.

## Success criteria

- **Day 3**: First Snow Foundation Q4 FY26 newsletter sent end-to-end via the pipeline. Body voice-graded ≥9/10. Subject chosen from 3 candidates. No OCAP gate triggers; soft warnings (if any) double-confirmed.
- **Day 5**: Snow opens the email (verifiable in GHL). Optionally replies. Optionally clicks a link.
- **Day 14**: Retro on what broke. Add backlog for next funder (Minderoo or Dusseldorp).

## What this MVP doesn't cover (Phase 2+)

- Partner newsletters (build after Snow proves the funder pipeline)
- Brand newsletters (the public/voice-strict path)
- Storyteller newsletters (the OCAP-strict path with own-story-back pattern)
- "Where used" tracking on storyteller dashboards (Phase 2 of admin view)
- Performance auto-learning (deferred — manual feedback loop suffices per Q12)
- Funder portal (deferred — build only when a funder asks)
- Auto-suggest candidate audience tags via AI (deterministic rule covers most; defer AI suggestion)

## Open items the grilling didn't cover

- **GHL list IDs per audience** — need to confirm which GHL lists/tags map to "Snow Foundation contacts" specifically (one contact for the MVP, or a list of 2-3?)
- **Per-audience-rubric voice cards in funders.json schema** — does it need a new field, or is `tone` + `framing_notes` enough? Probably enough; revisit if drafts feel off.
- **Send-time tracking** — does GHL allow scheduled sends, or only immediate? If scheduled, Notion DB needs a `scheduled_send_at` property.
- **Reply tracking** — funder reply lands in Gmail. Does it close the loop in GHL? Or do we manually note it in funders.json?

These are tactical; sort during the build.

## Commitments locked

By committing this plan, you're committing to:

1. The Snow Foundation Q4 FY26 newsletter ships within 14 days of starting the build.
2. Always-review every send (Q1) — no automation can ship a funder edition without your eyeballs.
3. OCAP discipline (Q10) — soft warnings need double-confirm; hard gates can't be bypassed.
4. The pipeline serves ACT's voice, not engagement metrics (Q12).

If any of these feel wrong, re-grill before building.

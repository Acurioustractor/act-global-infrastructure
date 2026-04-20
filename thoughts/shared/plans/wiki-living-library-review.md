---
slug: wiki-living-library-review
status: draft
date: 2026-04-18
owner: Ben Knight
driver: Minderoo envelope — Friday 1 May 2026
related:
  - thoughts/shared/handoffs/staying/minderoo-deck-v2.md
  - wiki/campaigns/minderoo-pitch/brief.md
  - wiki/campaigns/judges-on-country/brief.md
  - .claude/skills/autoreason/SKILL.md
---

# Wiki as living library — review & loop design

> Close the Karpathy loop between the wiki, the connected codebases (JusticeHub, Empathy Ledger v2, Oonchiumpa), and the pitch/campaign artefacts so that Minderoo iteration and future pitches draw adversarially from real Oonchiumpa stories and strategy claims on a repeating cadence.

**Hard deadline shaping this work:** Fri **1 May 2026** — physical envelope to Lucy Stronach (Minderoo). Anything that doesn't materially sharpen that envelope waits.

---

## Part A — Audit

### A1. Wiki content surface (main repo)

Canonical scope defined in `scripts/lib/wiki-scope.mjs`:

| Layer | Dirs | Role |
|---|---|---|
| Canonical graph (lint + viewer) | `concepts/`, `projects/`, `communities/`, `people/`, `stories/`, `art/`, `finance/`, `technical/`, `decisions/`, `research/`, `synthesis/` | Encyclopedia — public viewer |
| Support (traceability) | `sources/`, `narrative/` | Bridge raw → canonical; claims store |
| Operational (never edit/lint) | `raw/`, `output/`, `library/`, `dashboards/` | Immutable capture + generated artefacts |

Output surfaces (all auto-rebuilt on push to `main`):
1. Tractorpedia viewer at `tools/act-wikipedia.html` → `/tractorpedia.html`
2. Command Center `/wiki` (Next.js, `apps/command-center/src/app/wiki/`)
3. Command Center snapshot mirror (`apps/command-center/public/wiki/`, ~58 files)
4. Regenerative Studio `/wiki` (separate repo, JSON sync)
5. Wiki status API (`apps/command-center/src/app/api/wiki/status/`) — health signals

Core pipeline scripts already in place: `wiki-lint.mjs`, `wiki-build-viewer.mjs`, `wiki-bootstrap-source-summaries.mjs`, `wiki-sync-command-center-snapshot.mjs`, `ingest-articles-to-wiki.mjs`. Auto-tagging is `scripts/lib/wiki-source-bridge.mjs` — 22 pattern rules, already covers `oonchiumpa|atnarpa|mparntwe|alice springs`, `justicehub|youth justice|detention|alma`, `empathy ledger|storytelling`.

### A2. Minderoo / Brave Ones artefacts (both sides)

**Canonical (wiki):**
- `wiki/projects/justicehub/three-circles.md` — $2.9M / 3-year pitch. Frontmatter `canonical_code: ACT-JH`, `funder: Minderoo Foundation`, `tier: flagship`. Lucy-warm 2026-04-08.
- `wiki/projects/justicehub/the-brave-ones.md` — counter-mugshot visual architecture
- `wiki/campaigns/minderoo-pitch/brief.md` — envelope assembly, 9 anchor communities (MMEIC consolidation pending), 1 May ship date
- `wiki/campaigns/judges-on-country/brief.md` — 17 April trip, content capture
- `wiki/output/narrative-drafts/SHIPPED-2026-04-09-minderoo-stay-pitch.md` — deployed prior round

**Deployed (JusticeHub repo, the envelope contents):**
- `JusticeHub/output/proposals/minderoo-canonical-2026.md` — cover
- `JusticeHub/output/proposals/minderoo-three-circles-proposal.md` — spine
- `JusticeHub/output/proposals/minderoo-executive-summary.md`
- `JusticeHub/output/proposals/brave-ones-pitch-insert.md`
- `JusticeHub/output/proposals/brave-ones-framework.md`
- `JusticeHub/output/proposals/minderoo-image-prompts.md`, `minderoo-full-picture.md`

**Drift risk:** wiki and JH carry parallel copies with no automated sync. The brief's own "what's blocked" list flags `Ntumba → Oonchiumpa` corrections pending **inside the JH spine docs** — exactly the failure mode a sync layer prevents.

### A3. Oonchiumpa feedstock

**In wiki** (hand-authored):
- `wiki/stories/oonchiumpa-kristy-tanya-founders.md` — founders, storyteller_ids `["b59a1f4c-94fd-4805-a2c5-cac0922133e0", "dc85700d-f139-46fa-9074-6afee55ea801"]`, series `judges-on-country-postcards`
- `wiki/stories/oonchiumpa-fred-xavier-trust.md`
- `wiki/stories/oonchiumpa-jackquann-detention.md`
- `wiki/stories/oonchiumpa-jackquann-nigel-programs.md`
- `wiki/stories/oonchiumpa-laquisha-darwin.md`
- `wiki/stories/oonchiumpa-nigel-court.md`

Each carries frontmatter: `title`, `subtitle`, `status`, `consent_tier` (`public` | `internal-only`), `project_code: ACT-OO`, `storyteller_ids: [uuid]` (EL v2 FK), `series`, `tags`.

**In wiki/research/** (proof-layer):
- `wiki/research/indigenous-justice-oped.md` — Kristy + Tanya, Aunty Bev + Uncle Terry elders
- `wiki/research/alma-intervention-portfolio.md` — 95% diversion, 97.6% cheaper than detention ($31K vs $1.3M)
- `wiki/research/meeting-intelligence-synthesis.md` — 5 Oonchiumpa meetings in cluster, noted as sparse/unprocessed

**Only in EL v2** (not flowing to wiki):
- `extracted_quotes` — granular quote-level with cultural tagging
- `cultural_sensitivity_level`, `cultural_warnings`, `elder_approved_by`, `elder_approved_at`
- `embedding` (1536-dim vectors — enables semantic retrieval for pitch relevance)
- `gallery_photos`, `story_media`, `story_themes`
- Airtable-synced legacy rows (migration_quality_score tracks confidence)

**Only in Oonchiumpa app** (`/Users/benknight/Code/Oochiumpa`): Vite React frontend reads from EL v2 via `empathy_ledger_id` FK. No push back to wiki.

### A4. autoreason (the pitch-writing engine)

Spec: `.claude/skills/autoreason/SKILL.md`. Adversarial critic → author → synthesizer → 3 blind judges, Borda-count ranked, loops until the incumbent wins twice.

Current knowledge layer (what the agents can read):
- `wiki/narrative/` — claim store
- `wiki/output/narrative-drafts/` — past deployments
- `artefacts/campaign-plan.md` (aesthetics repo)
- `.claude/skills/autoreason/references/ai-signs-to-avoid.md`
- `memory/feedback_force-a-trap-rhetoric.md`

**What's missing:** `wiki/stories/` is not in the knowledge layer. The loop has no access to the Kristy Bloomfield quote, the Fred + Xavier trust arc, the Laquisha Darwin story, or the extracted quotes in EL v2. So the author always writes from claims, never from voice. This is the highest-leverage gap against the Minderoo deadline — if a pitch insert needs to "anchor in Kristy's voice", the current loop can't.

Trace output: `wiki/output/autoreason/<slug>-<ts>.md`.

### A5. Other connected repos

- **JusticeHub** (`/Users/benknight/Code/JusticeHub`): Next.js (port 3004), shares `tednluwflfhxyucgwigh` Supabase. Story tables (`stories`, `participants`, `media_assets`). Airtable (`app7G3Ae65pBblJke`) as secondary source with bidirectional sync. Output lives in `output/proposals/` — markdown, no CI export to wiki.
- **Empathy Ledger v2** (`/Users/benknight/Code/empathy-ledger-v2`): `yvnuayzslukamizrlhwb` Supabase. Multi-tenant (`tenant_id` on stories). Storyteller table, rich cultural metadata. Content-Hub API at `/src/app/api/v1/content-hub/` with `syndicate/articles/stories/quotes` endpoints — the plumbing for export exists, it's just never wired to wiki.
- **Oonchiumpa app** (`/Users/benknight/Code/Oochiumpa`): Vite + Node, reads EL v2 via `empathy_ledger_id`. Standalone.
- **Regenerative Studio, GrantScope, act-farm, act-ecosystem, act-intelligence-platform** — siblings under `/Users/benknight/Code/`. Only Regen Studio currently consumes wiki (JSON sync).

---

## Part B — Loop design

### Target state

```
 EL v2 stories (yvnuayzslukamizrlhwb)           Oonchiumpa app
        │                                           │
        └───────────────┬───────────────────────────┘
                        │ (new) sync-el-stories-to-wiki.mjs
                        ▼
         wiki/stories/ — story corpus (consent/cultural metadata preserved)
                        │
                        ├─► wiki/narrative/ — claim store (existing)
                        │            │
                        │            ▼
                        │    autoreason loop  ← (Gap 2) wiki/stories/ added to knowledge layer
                        │            │
                        │            ▼
                        │    wiki/output/narrative-drafts/ — candidates
                        │            │
                        │            ▼  (new) sync-wiki-pitches-to-jh.mjs
                        │    JusticeHub/output/proposals/ — envelope docs
                        │            │
                        └────────────┘  (new) JH GitHub Action → wiki/output/narrative-drafts/
```

### Gap 1 — `scripts/sync-el-stories-to-wiki.mjs` (EL v2 → wiki) — **SHIPPED 2026-04-18**

Live against EL v2. The allow-list lives at `config/wiki-story-sync.json` (schema_version 2).

**OCAP gate chain** (every story must pass all twelve, in order):

1. `community_status ∈ {active, published, approved}` — Ownership: story is not in draft/withdrawn state
2. `status = 'published'` — only published stories, never drafts
3. `is_archived = false AND archived_at IS NULL` — not retired
4. `deleted_at IS NULL` — not deleted
5. `consent_withdrawn_at IS NULL` — primary withdrawal flag
6. `has_explicit_consent = true` — storyteller affirmative consent to sharing
7. `ai_processing_consent_verified = true` — agents may read the story
8. `enable_ai_processing = true` — second AI consent signal (both required)
9. `syndication_enabled = true` — explicit opt-in for downstream distribution (wiki is downstream)
10. `privacy_level ∈ {public, anonymous}` — access tier
11. For `cultural_sensitivity_level ∈ {medium, high, sacred}`: `elder_approved_at NOT NULL` — Control for culturally sensitive material
12. `cultural_warnings` does NOT include blocked terms (sacred/sorry business/ceremony)

Plus: `cross_tenant_visibility` must include wiki tenant or story must be public; body-text sacred-keyword scan as a secondary safety net (blocks keywords like "elder", "country", "traditional owner" etc. when `elder_approved_at` is null).

**Withdrawal handling:** if a previously-synced file's story drops out of the gate chain (e.g. `syndication_enabled` flipped back off, elder withdraws approval, `consent_withdrawn_at` set), the wiki file is renamed `withdrawn-<YYYY-MM-DD>-<original>.md`. Never silently deleted. Retention: 365 days before any actual cleanup.

**Allow-list matching:** by `project_id` (resolved from `act_project_code`), `organization_id` (resolved from org slug), `storyteller_id` / `linked_storytellers[]`, or `tag` match against `story.tags / themes / cultural_themes`. Unresolved entries (e.g. ACT-OO is an org not a project) are logged but don't break the run.

**Dry-run against live EL v2 on 2026-04-18** (451 stories in EL v2):
- 244 matched the allow-list (Oonchiumpa org, PICC org, ACT-JH project, judges-on-country tag)
- 207 did not match (other orgs, not yet allow-listed — intentional)
- **0 passed all OCAP gates** — correct default posture. Most failed on `community_status = draft`, `ai_processing_consent_verified = false`, and `syndication_enabled = false`. This is storytellers exercising their right not to have stories syndicated yet.

**To unlock the Minderoo feedstock:** Kristy Bloomfield (as Oonchiumpa lead) or PICC equivalent needs to:
- In EL v2, for each story they want flowing: flip `status` to `published`, set `has_explicit_consent`, `ai_processing_consent_verified`, `enable_ai_processing`, and `syndication_enabled` to `true`, set `privacy_level` to `public` or `anonymous`, and set `elder_approved_at` for any culturally sensitive content.
- Once flipped, a re-run of this script will pick them up and the manifest at `wiki/output/story-sync/<timestamp>.md` becomes the autoreason story-anchor index.

**Run:**
```bash
node scripts/sync-el-stories-to-wiki.mjs                 # dry-run
node scripts/sync-el-stories-to-wiki.mjs --verbose       # log per-skip reasons
node scripts/sync-el-stories-to-wiki.mjs --project ACT-OO
node scripts/sync-el-stories-to-wiki.mjs --apply         # write files
```

**Query shape (verified against live EL v2 schema 2026-04-18):**

EL v2 `stories` has direct FK columns `project_id`, `organization_id`, `storyteller_id`, and `linked_storytellers[]` — no junction table needed. Script uses PostgREST via fetch:

```
GET /rest/v1/stories?select=id,title,content,summary,excerpt,themes,cultural_themes,tags,
    privacy_level,cultural_sensitivity_level,cultural_warnings,elder_approved_at,
    community_status,status,is_archived,archived_at,deleted_at,consent_withdrawn_at,
    has_explicit_consent,ai_processing_consent_verified,enable_ai_processing,
    syndication_enabled,cross_tenant_visibility,project_id,organization_id,
    storyteller_id,linked_storytellers,updated_at
    &order=updated_at.desc&limit=500&offset=<n>
```

Allow-list slugs/codes are resolved to IDs at startup (one lookup to `projects` and one to `organizations`), then all filtering happens client-side on the fetched story rows.

**Output file format (matches existing wiki/stories/ frontmatter):**

```markdown
---
title: "<story title>"
subtitle: "<story_type or derived>"
status: active
consent_tier: public | internal-only          # mapped from privacy_level
project_code: ACT-OO
storyteller_ids: ["<uuid-1>", "<uuid-2>"]
cultural_sensitivity_level: low | medium | high
elder_approved_at: <iso>                      # null if not yet approved
series: <series slug if tagged>
tags: [<merged themes + cultural_themes>]
source: el-v2-auto
el_v2_story_id: <uuid>
el_v2_updated_at: <iso>
---
```

**Rules:**
1. Write under `wiki/stories/<project-code>-<kebab-slug>.md`
2. **Diff-before-write:** if a file exists without `source: el-v2-auto` frontmatter, it's hand-authored — never overwrite; emit a warning instead
3. For existing `source: el-v2-auto` files, only rewrite when `el_v2_updated_at` is strictly newer
4. Dry-run by default (`--apply` to write)
5. Emit manifest to `wiki/output/story-sync/<YYYY-MM-DD>.md` with added/updated/skipped/conflicted counts
6. **Privacy mapping:** `privacy_level=private|mentors_only|organization` → `consent_tier: internal-only`; `public|anonymous` → `consent_tier: public`. Lint automatically hides `internal-only` from public viewer.

**Reused building blocks:**
- Supabase client pattern — see scripts that already hit the shared `tednluwflfhxyucgwigh` instance (e.g. `scripts/ingest-articles-to-wiki.mjs`). New script needs separate `VITE_SUPABASE_URL` / service role for EL v2.
- Slugging + frontmatter writing — mirror `scripts/ingest-articles-to-wiki.mjs`
- Auto-tagging for `## Backlinks` — call `inferConnectedPages()` from `scripts/lib/wiki-source-bridge.mjs`

### Gap 2 — autoreason fed by the story corpus

Single-file change: `.claude/skills/autoreason/SKILL.md`.

1. **Add to "Step 2. Load the knowledge layer":**
   > - `wiki/stories/` — consent-gated story corpus (public tier only; internal-only stories are excluded by lint from viewer AND from autoreason).
   > - `wiki/output/story-sync/<latest>.md` — manifest of EL v2 stories synced in the most recent run, with pointers to the story files.

2. **Add a Step 2.5 — Story anchor pre-pass** (new):
   > Before the critic runs, spawn a short `general-purpose` subagent with this single instruction: *"Read `wiki/stories/*.md` and return the 3–5 stories most relevant to this TASK prompt. Select by project_code match, tag overlap, and subject match. Extract: named storyteller, project_code, single most-quotable line. Skip any story with `consent_tier: internal-only`."* The returned list becomes a required input for the critic, the author, and each judge.

3. **Add a new judge criterion** to Step 6 (judges read this):
   > - **Anchored in named story proof.** Does the draft cite at least one named storyteller by name, place, and a quote or fact traceable to `wiki/stories/`? Unanchored pitches rank lower.

4. **Author still has narrow scope** (unchanged) — but now receives the story anchor list as a read-first input, so drafts-from-scratch start with real voice material instead of paraphrase.

5. **No code change needed** — autoreason is a prompt/skill, not a runtime. Editing the SKILL.md ships the change.

### Gap 3 — JusticeHub ↔ wiki two-way sync — **SHIPPED 2026-04-18**

Both halves ship as local scripts in the main repo. No cross-repo CI — Ben runs them on demand from `act-global-infrastructure/`.

**Forward — `scripts/sync-wiki-pitches-to-jh.mjs`**

Sources: `wiki/projects/justicehub/*.md` (curated list), `wiki/campaigns/minderoo-pitch/*.md`, `wiki/campaigns/judges-on-country/*.md`.

Target: `JusticeHub/output/proposals/` — adds the canonical wiki docs as *reference material* alongside Ben's hand-edited envelope docs (which use different filenames, so no collision).

Hard guardrail: **hand-edited JH files are never overwritten.** The script:
- Writes only NEW files when --apply is set
- Stamps every auto-written file with `<!-- source-of-truth: wiki/... -->` header so drift is always visible
- When a same-named JH file exists without the stamp, emits a "divergence" report — leaves reconciliation to a human
- Hash-based content comparison ignores the stamp so refreshes of auto-managed files don't false-positive

Dry-run 2026-04-18: 8 wiki files in scope, 0 divergence (JH envelope docs use different names from wiki canonical docs).

**Reverse — `scripts/sync-jh-proposals-to-wiki.mjs`**

For every `.md` in `JusticeHub/output/proposals/`, write a dated snapshot into `wiki/output/narrative-drafts/<YYYY-MM-DD>-jh-<slug>.md`. Each snapshot carries frontmatter: source path, source mtime, content hash, backlinks auto-inferred via `wiki-source-bridge`.

Idempotent: if today's snapshot exists with matching hash, skip. If the JH file drifted since today's snapshot, overwrite today's file only (never overwrites prior-day snapshots).

Dry-run 2026-04-18: 7 JH proposals scanned, 7 new snapshots pending. This is what autoreason reads as "past drafts" in its knowledge layer — each iteration of the Minderoo envelope adds a dated entry to the deployment log.

**Run:**
```bash
node scripts/sync-wiki-pitches-to-jh.mjs --apply      # safe — new-only
node scripts/sync-jh-proposals-to-wiki.mjs --apply    # snapshots to narrative-drafts
node scripts/sync-jh-proposals-to-wiki.mjs --since 2026-04-15  # incremental
```

**Why not bidirectional auto-merge:** pitch content carries consented named-people material that should get human review before landing in canonical wiki. Snapshots into `wiki/output/narrative-drafts/` are the right venue — they're a log, not canon. If a snapshot surfaces a new claim worth promoting to `wiki/narrative/`, that's a human editorial decision.

---

## Part D — EL v2 super-admin cascade for campaign-wide opt-in

### The scaling problem

The Gap 1 sync correctly refuses to flow stories until each story has all twelve OCAP flags set in EL v2. That's the right default for a platform with one storyteller. It is not workable when Oonchiumpa has 20+ stories in the platform, BG Fit has a cohort, and Ben wants to say in a single action: *"all Oonchiumpa young-people-and-staff stories are available for Brave Ones"*.

Flipping flags one-at-a-time per story doesn't scale, and more importantly it's the wrong governance shape — consent usually lives at the **community and storyteller** level, not the individual story level. A community says "yes, this campaign is one we want our voices in"; an individual storyteller says "yes, I'm willing to be part of that"; the story inherits the consent unless the storyteller explicitly pulls it back for that one piece.

### Proposed design — three-tier cascade with override semantics

```
Organisation (community-level consent, set by leadership)
  ↓ cascades to all storytellers, unless…
Storyteller (personal agency, individual override)
  ↓ cascades to all their stories, unless…
Story (story-specific override — always has final say)
```

**Schema changes in EL v2 (additive, no breaking changes):**

1. Extend `organizations.default_permissions` (jsonb, already exists) with a well-known shape:
   ```json
   {
     "wiki_syndication": {
       "enabled": true,
       "campaigns": ["brave-ones", "minderoo-2026"],
       "set_at": "2026-04-18T10:00:00Z",
       "set_by": "ben@act.place"
     },
     "default_ai_processing": true,
     "default_privacy_level": "public"
   }
   ```
   Community leadership flips this once per campaign. Audit trail is baked in.

2. Add `storytellers.syndication_preferences` (jsonb, new column):
   ```json
   {
     "wiki_syndication": "inherit",
     "campaigns_opt_in": ["brave-ones"],
     "campaigns_opt_out": [],
     "require_explicit_per_story_consent": false
   }
   ```
   Storyteller can `inherit` (follow org default), explicitly opt in, or opt out. Elders or sensitive storytellers can set `require_explicit_per_story_consent: true` — then cascade never enables them, every story needs its own nod.

3. Stories: use existing `syndication_destinations` (jsonb array), add `campaigns` (text[]). Set by the cascade algorithm; overridable per-story.

**Cascade algorithm** (runs on story publish and nightly refresh):

```
for each story in status='published':
  effective = []
  if storyteller.require_explicit_per_story_consent:
    effective = story.campaigns_explicit  # story has final + only say
  else:
    # start with org default
    if storyteller.syndication_preferences.wiki_syndication == 'inherit':
      effective = org.default_permissions.wiki_syndication.campaigns
    elif storyteller.syndication_preferences.wiki_syndication == true:
      effective = ['wiki']
    # apply storyteller opt-ins/outs
    effective = effective ∪ storyteller.campaigns_opt_in
    effective = effective − storyteller.campaigns_opt_out
    # apply story-level overrides (always win)
    effective = effective ∪ story.campaigns_opt_in
    effective = effective − story.campaigns_opt_out
  story.campaigns = effective
  story.syndication_destinations = derive_destinations(effective)
```

The existing 12-gate OCAP chain on each story is **unchanged** — it still has final say at sync time. The cascade only sets *defaults*; per-story fields like `has_explicit_consent`, `elder_approved_at`, and `consent_withdrawn_at` remain the hard gates the wiki sync script reads.

### Super-admin UX in EL v2

**Organisation page → Settings → "Story syndication defaults":**

```
For stories from this organisation, by default:
  [✓] Enable wiki syndication for ai-consenting stories
  Campaigns this org opts into:
    [✓] Brave Ones (2026)
    [✓] Minderoo envelope (2026)
    [ ] Judges on Country
    [ ] JusticeHub featured
  [✓] Require elder approval for culturally sensitive content (always on)

  Apply to:  ( ) only new stories from today
             (•) all published stories from this org  [Apply Now]
```

One click per campaign per org. The "Apply Now" button runs a bulk update with full audit (who, when, before/after) — not destructive because the per-story OCAP gates still govern actual sync.

**Storyteller profile page → Preferences → "Syndication":**

```
Wiki syndication:
  (•) Inherit from my organisation (Oonchiumpa) — current default: enabled, campaigns [brave-ones, minderoo-2026]
  ( ) Always yes
  ( ) Always no (all my stories private)
  ( ) Ask me for every story

Campaign opt-in overrides:
  Add:     [ ]
  Remove:  [ ]

[ ] I require explicit per-story consent (no inheritance)
```

Personal agency sits here. Elder storytellers default to `require_explicit_per_story_consent: true`. Young people + staff inherit from org unless they opt out.

### Why this design respects OCAP

- **Ownership** — the organisation sets the default (community leadership owns campaign-level consent); the storyteller can override at any time (personal ownership of voice)
- **Control** — `require_explicit_per_story_consent` is a first-class flag; cultural_sensitivity still forces elder_approval regardless of cascade
- **Access** — `syndication_destinations` is the resolved output; wiki sync script reads it + the 12 OCAP gates
- **Possession** — EL v2 remains source of truth. The wiki mirror is a derivative surface that re-derives on every sync. Storyteller/org withdrawal immediately cascades to wiki withdrawal on next run (existing Gap 1 withdrawal handling picks it up)

### Rollout — phased against Minderoo timeline

**Before 1 May (manual, no schema work):** Ben runs `sync-el-stories-to-wiki.mjs --verbose`. Takes the OCAP-skip list to Kristy/Tanya. For each Oonchiumpa story they approve for the envelope, flip the flags in EL v2 admin directly. Same for BG Fit.

**After 1 May (phase 1 — schema):** add `storytellers.syndication_preferences` column + `stories.campaigns` array. Backward compatible.

**Phase 2 (admin UX):** ship the two settings panels in EL v2 Next.js app.

**Phase 3 (cascade trigger):** SQL function + trigger on story INSERT/UPDATE that runs the cascade. Lives in EL v2 migrations. One-time backfill script `scripts/cascade-el-defaults.mjs` to apply existing org defaults to pre-existing stories.

**Phase 4 (wiki sync uses cascade output):** update allow-list config to match against `story.campaigns` contains `'brave-ones'` instead of (or alongside) the current org/project/tag matchers.

### What this unlocks at scale

- **Brave Ones cohort:** one flip on Oonchiumpa org + one flip on BG Fit org → every young person or staff member who inherits (default) becomes part of the cohort that feeds Brave Ones autoreason drafts and campaign materials
- **New community joins the ecosystem:** org gets created in EL v2, leadership ticks a few boxes, every story they subsequently publish is auto-eligible for the relevant campaigns
- **Sensitive story comes in:** elder storyteller's `require_explicit_per_story_consent` stops the cascade; admin must review before it becomes eligible
- **Withdrawal:** anyone in the chain (org, storyteller, story) can pull the flag, Gap 1 sync detects on next run and renames the wiki file with `withdrawn-` prefix. Audit trail preserved

This is the architecture that turns the wiki from "a knowledge base Ben curates by hand" into "a living mirror of what communities have actively consented to surface" — with the admin burden measured in checkboxes per campaign, not flags per story.

---

## Part C — Verification against the Minderoo envelope

One end-to-end pass must complete before **26 April 2026** (leaves 5 working days before envelope ship on 1 May):

1. **Sync:** `node scripts/sync-el-stories-to-wiki.mjs --project ACT-OO --apply` — expect ≥6 Oonchiumpa stories (re)written with preserved cultural metadata, plus any new EL v2 rows pulled in. Inspect `wiki/output/story-sync/<date>.md` manifest for conflicts.
2. **Lint:** `node scripts/wiki-lint.mjs` — zero new orphans, zero new broken links. If warnings appear, fix frontmatter/backlinks before continuing.
3. **autoreason pass:** Invoke with task:
   > *Draft a 400-word Minderoo pitch insert, anchored in a named Oonchiumpa story, that survives the AI-signs filter and ends on a plain imperative for Lucy Stronach.*

   Expect output in `wiki/output/autoreason/minderoo-insert-<ts>.md`. Confirm the log shows the story-anchor pre-pass returned named stories, and the winning draft cites at least one by name.
4. **Manual consolidation into the envelope:** Ben edits the relevant JH spine doc (`minderoo-three-circles-proposal.md` or the brave-ones insert) with the autoreason output. No automated write this round — Minderoo is too hot to trust a first-run automation with.
5. **Reverse sync dry-run:** run the JH action in `dry-run: true` mode against the change — confirm `wiki/output/narrative-drafts/<date>-jh-minderoo-insert.md` would be created with correct content + commit SHA.
6. **Spot-check:** does the envelope now carry at least one anchored Oonchiumpa quote that **originated in EL v2**, survived consent gating (public tier only), and passed autoreason's story-anchor judge? If yes, loop is closed. If not, the gap is in the knowledge layer or the story wasn't marked public — fix and re-run.

Success signal: Lucy's walk-through session in early May ends with at least one "tell me more about that Oonchiumpa story" question.

---

## Critical files

**Reference (read before touching):**
- `wiki/AGENTS.md`
- `scripts/lib/wiki-scope.mjs`
- `scripts/lib/wiki-source-bridge.mjs`
- `scripts/ingest-articles-to-wiki.mjs` (Supabase → wiki pattern to mirror)
- `.claude/skills/autoreason/SKILL.md`
- `wiki/projects/justicehub/three-circles.md`
- `wiki/campaigns/minderoo-pitch/brief.md`

**Existing Oonchiumpa corpus (targets for Gap 1 sync):**
- `wiki/stories/oonchiumpa-{kristy-tanya-founders,fred-xavier-trust,jackquann-detention,jackquann-nigel-programs,laquisha-darwin,nigel-court}.md`

**New files introduced by this plan:**
- `scripts/sync-el-stories-to-wiki.mjs`
- `scripts/sync-wiki-pitches-to-jh.mjs`
- `.github/workflows/` entry in JusticeHub repo (reverse sync action)
- `wiki/output/story-sync/` and `wiki/output/pitch-sync/` manifest folders

---

## Open threads (flagged, not in scope this round)

- **Consent/cultural governance layer.** EL v2 carries `elder_approved_by`, `cultural_sensitivity_level`, `cultural_warnings`. Gap 1 preserves the metadata in frontmatter but doesn't enforce gating. **Next round:** extend autoreason's story-anchor pre-pass to refuse unanchored-to-elder-approved stories for Oonchiumpa content specifically.
- **2026-04-17 Judges on Country trip.** 55 judges at Oonchiumpa. Any stories captured must flow through EL v2 first, then Gap 1 sync, then into the envelope. **Treat JoC as the first real-world test after Gap 1 ships.**
- **Oonchiumpa app as a source.** It reads from EL v2 but hosts additional content (blog, outcomes, staff portal). Future work: mirror any public outputs into `wiki/raw/` so the existing `wiki-bootstrap-source-summaries` pipeline picks them up.
- **Embedding-powered relevance.** EL v2 stories carry 1536-dim embeddings. The story-anchor pre-pass in Gap 2 currently picks by project_code/tag match. A later iteration can use cosine similarity against the autoreason task prompt for sharper relevance.
- **Living Source Packet.** `config/living-source-packet.example.json` defines a sovereign syndication schema with consent gates. Not used yet but the right venue for the consent-gating work noted above.

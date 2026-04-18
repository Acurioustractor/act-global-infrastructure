---
title: Wiki Living Library — end-to-end session review
date: 2026-04-18
purpose: Show the full loop working in one document. How storyteller voice flows from Empathy Ledger v2 through the wiki into Brave Ones + Minderoo + JusticeHub, and where every piece sits today.
audience: Ben (verification) + future-Ben (picking up from here)
related:
  - thoughts/shared/plans/wiki-living-library-review.md (canonical plan)
  - wiki/decisions/2026-04-18-oonchiumpa-story-approval.md
  - wiki/decisions/2026-04-18-bg-fit-story-approval.md
  - wiki/decisions/2026-04-18-mounty-yarns-story-approval.md
  - wiki/decisions/2026-04-18-picc-selective-youth-voice.md
---

# Wiki Living Library — end-to-end session review

> On 2026-04-17/18, the connection between Empathy Ledger v2 and the ACT wiki went from manual-curation-with-6-hand-authored-postcards to a consented, auditable, reversible pipeline carrying 25 storyteller records across three communities, feeding one finished pitch insert and two envelope-ready artefacts for the Minderoo 1 May deadline. This document shows how it works and where every piece sits.

## The loop in one picture

```
   STORYTELLER (young person or worker)
        │
        │  records voice with consent (recording / interview)
        ▼
   EMPATHY LEDGER v2 (source of truth, OCAP-governed)
        │   organization_id, storyteller_id, privacy_level,
        │   has_explicit_consent, syndication_enabled,
        │   cross_tenant_visibility, elder_approved_at
        │
        │  scripts/sync-el-stories-to-wiki.mjs
        │  · 12-gate OCAP chain
        │  · allow-list per org (config/wiki-story-sync.json)
        │  · diff-before-write, withdrawal-safe rename
        ▼
   WIKI STORIES (wiki/stories/*.md)
        │   25 records as of this session, across 3 communities
        │
        ├─► autoreason story-anchor pre-pass
        │   (.claude/skills/autoreason/SKILL.md)
        │       · reads wiki/stories/ for campaign writing
        │       · requires named-storyteller proof in drafts
        │
        ├─► Brave Ones insert (thoughts/shared/drafts/brave-ones-minderoo-insert-v3.md)
        │       · 16 named anchor voices, 3 sites, 3 Countries
        │       · ready for JH output/proposals/ swap
        │
        ├─► Judges on Country one-pager (thoughts/shared/drafts/judges-on-country-one-pager-v2.md)
        │       · 3 Brave Ones fills proposed from consented corpus
        │       · [WORKSHOP] section for trip-day content on 21 April
        │
        └─► Insight memo (thoughts/shared/drafts/brave-ones-young-people-insights.md)
                · 4 patterns surfaced across corpus
                · "Come Back Next Week" portrait sub-series concept
```

## What's operational today (with receipts)

### Pipeline scripts — all live

| Script | Purpose | Run today? |
|---|---|---|
| `scripts/sync-el-stories-to-wiki.mjs` | EL v2 → wiki with 12-gate OCAP enforcement | Yes, 6 times |
| `scripts/bulk-update-el-story-consent.mjs` | Apply org-level approval to all org stories | Yes, 3 orgs |
| `scripts/update-el-story-elder-approval.mjs` | Per-story elder review (for non-Traditional-Owner leaders) | Yes, 4 stories |
| `scripts/update-el-story-content.mjs` | Replace summary-only ingest with real transcript | Yes, Benji |
| `scripts/sync-wiki-pitches-to-jh.mjs` | Wiki canonical → JH output (new-only, divergence-flagging) | Dry-run verified |
| `scripts/sync-jh-proposals-to-wiki.mjs` | JH proposals → dated snapshots in wiki/output/narrative-drafts/ | Yes, 7 snapshots |
| `scripts/survey-el-org-stories.mjs` | Read-only audit of any org's consent-gate state | Yes, 4 orgs |

### Stories flowing (25 total across approved communities)

**Oonchiumpa, Mparntwe — 11 stories (6 synced from EL v2 + 5 hand-authored postcards)**

| From EL v2 (2026-04-18 sync) | Hand-authored postcards |
|---|---|
| Kristy Bloomfield — Interview Transcript | Kristy + Tanya founders |
| Aunty Bev and Uncle Tony's Story | Fred on Xavier trust |
| Bringing Kids Back to Country (Kristy) | Jackquann on detention |
| Coming Home to Love's Creek (Henry, 67, elder) | Jackquann & Nigel on programs |
| Creating Our Own History (Kylie) | Laquisha on Darwin |
| Oonchiumpa: What Happens When Community Leads (long-form canonical) | Nigel on court |

**BG Fit, Mount Isa — 12 stories synced**

- **Named young people (with direct quotes):** Benji (Mount Isa — real transcript, *"He right. That big fell. He know half of the black people. That's why."*), Rashad Gavin Isaacson (young Kalkadoon dancer — *"everything"*), Jay (Young Person interview — on Country as protection)
- **Named worker / leader voices:** Brodie (*"Why I Started BG Fit"*), Siva (youth worker at Injalinji), Ben (Canadian social worker), Gracie Ryder (Police Liaison), Danielle Germaine (Brodie's mother)
- **Program / group voices:** Spinifex Residential (25 young people, *"kids started waiting for us at the gate"*), Tuesday Gym Sessions (Flexi group, *"it's not magic, just showing up"*), Mount Isa Bush Camp (first on-Country), Doomadgee Camp (500km remote, 30 kids)

**Mounty Yarns, Mount Druitt — 1 compilation story containing 9 named young voices + 3 worker voices**

- **Named young people:** Isabella (14, Seven Hills — *"easy to talk to. There's no pressure. It's more fun and you don't feel judged"*), Polly (13, Blacktown — *"I can be myself around these people. I don't have to hide my personality"*), Taj (13), Jaylee, Tyrese, Taleigha (Biripi — *"why are the older fellas making choices for the younger fellas"*), Amelia (Mangpa Guara dancer), Adam + Leah (Youth Peak co-runners)
- **Named worker / lived-experience voices:** Daniel Daylight (CEO), Archie Darcy (caseworker), Isaiah (backyard activation), Shayle McKellar (HSC in custody, Just Reinvest — *"they enter the system as victims, and come out as even more victimised people"*)

### Governance — 4 active decision records, 4 governance patterns established

| Pattern | Record | Applies to |
|---|---|---|
| Traditional-Owner-authority satisfies elder-review | Oonchiumpa | Kristy for Mparntwe Country |
| Per-story elder approval by org leader who ISN'T TO | BG Fit | Brodie per-story (Jay + Doomadgee + Mount Isa Bush Camp) |
| CEO-of-originating-org approval for own compilation | Mounty Yarns | Daniel Daylight for the compilation |
| Selective per-story approval (not blanket) | PICC (pending) | Rachael Atkinson for specific candidates only |

### Audit trails — every action traceable

- `wiki/output/el-consent-bulk/` — 3 audit files (org-level applies)
- `wiki/output/el-elder-approvals/` — 4 audit files (per-story approvals)
- `wiki/output/el-content-updates/` — 1 audit file (Benji's transcript replacing summary)
- `wiki/output/story-sync/` — 6 run manifests (what was pulled each sync)
- `wiki/output/pitch-sync/reverse-*` — 1 reverse-sync (JH proposals snapshotted)

## The loop in motion — one concrete example

The verifiable end-to-end trace: **Isabella's voice from Empathy Ledger v2 → wiki → Brave Ones insert, in one session.**

1. **Capture.** Isabella (14, Seven Hills) sat down at Mounty Yarns, gave consent, recorded her words. Stored in EL v2 as part of the *"In Their Own Words"* compilation. Her storyteller profile carries age, location, cultural background, consent status.

2. **Approval.** Daniel Daylight (CEO, Mounty Yarns) gave verbal approval in conversation with Ben on 2026-04-18 for all Mounty stories to flow. Ben recorded that in `wiki/decisions/2026-04-18-mounty-yarns-story-approval.md` using the verbal-consent-in-conversation pattern established for Oonchiumpa — *Ben-as-witness IS the audit trail*, no paperwork required, CEO's authority satisfies elder-review for the org's own compilation.

3. **Gate passes, flag flips.** Ben said *"Daniel Daylight has approved all these — he is the CEO of the Mounty Yarns team."* That sentence triggered: config update → decision-record fill → `update-el-story-elder-approval.mjs` sets `elder_approved_at` under Daniel's named authority → audit file written.

4. **Sync.** `sync-el-stories-to-wiki.mjs --apply` ran. OCAP chain passed. Story written to `wiki/stories/mounty-yarns-mounty-yarns-in-their-own-words.md`.

5. **Surface in campaign draft.** Brave Ones insert v3 (`thoughts/shared/drafts/brave-ones-minderoo-insert-v3.md`) pulls Isabella's line into the Mount Druitt section alongside Polly's. The Minderoo envelope reader sees *"I can be myself around these people. I don't have to hide my personality."* as part of a three-site cohort.

6. **Reversibility preserved.** If Isabella, or Daniel, or any Mounty Yarns storyteller wants this pulled — set `consent_withdrawn_at` in EL v2, or remove `act-wiki` from `cross_tenant_visibility`. Next sync renames the wiki file with `withdrawn-YYYY-MM-DD-` prefix. Never silently deleted. Audit trail preserved.

Total elapsed time from Ben saying Daniel's name to Isabella's voice being in a draft pitch insert: **~5 minutes**.

## How this supports each campaign goal

### Brave Ones

**Before this session:** 6 hand-authored Oonchiumpa postcards. Single-site. Direct youth voices limited to Jackquann, Nigel, Laquisha, Xavier.

**Now:** 16 named anchor voices across 3 sites, 3 Countries, 3 different entry points to the same method. Isabella, Polly, Benji, Rashad add young-people-voice breadth that makes the claim *"distributed cohort"* concrete rather than aspirational.

**v3 insert** at `thoughts/shared/drafts/brave-ones-minderoo-insert-v3.md` — ready to swap into `JusticeHub/output/proposals/brave-ones-pitch-insert.md` when Ben approves.

**"Come Back Next Week" sub-series concept** from the insights memo: portrait + caption pairs pulled from each on-Country camp. Mparntwe's Atnarpa trip and Mount Isa's Bush Camp feed the same series.

### Minderoo envelope (1 May 2026)

**Direct inputs into the envelope:**

- **Brave Ones insert v3** — journal + exchange + book + alumni structure, now anchored in 16 named voices and showing the method working in 3 sites today. Answers Minderoo's "can this travel?" question with evidence rather than promise.
- **Judges on Country one-pager v2** (`thoughts/shared/drafts/judges-on-country-one-pager-v2.md`) — pre-trip fills proposed from consented corpus, [WORKSHOP] section kept open for 21 April trip-day capture.
- **Three Circles canonical pitch** at `wiki/projects/justicehub/three-circles.md` stays canonical; Brave Ones is the human spine inside it.

**Evidence chain for every quote in the envelope:** `wiki/decisions/*` records name who gave approval, when, through what channel, under what authority. If a Minderoo reader or their auditor asks *"how do you know you can use Isabella's words?"* — the chain is two files and one audit entry away.

### JusticeHub

**The data spine** (ALMA 1,155 verified interventions, CivicGraph 100K entities + 199K relationships, GrantScope 71K justice-funding rows) is unchanged. What this session added is the **voice layer on top of it**.

- **`sync-wiki-pitches-to-jh.mjs`** — one-way canonical wiki → JH `output/proposals/` with divergence-flagging. Ready to run once v3 is approved; won't clobber Ben's hand-edited envelope docs.
- **`sync-jh-proposals-to-wiki.mjs`** — reverse: every JH proposal iteration writes a dated snapshot into `wiki/output/narrative-drafts/`. Already has 7 snapshots of the current JH envelope state captured as of 2026-04-18.
- **autoreason loop** — now reads `wiki/stories/` as part of the knowledge layer. Future JH pitch iterations written with autoreason automatically anchor in named storyteller proof or lose the Borda vote by design.

### Digital infrastructure (the wider system)

The Karpathy-style knowledge base (`wiki/AGENTS.md`) is the persistent memory of the ACT ecosystem. Before this session, storyteller voice was the biggest gap — the claims store in `wiki/narrative/` held pitch-ready statements but not their source evidence. This session closes that gap:

- **Wiki now carries voice, not just claims.** `wiki/stories/` has 25+ storyteller entries with provenance.
- **autoreason reads voice.** Campaign writing loops through real quotes, not general copywriting patterns.
- **JusticeHub reverse-sync completes the feedback loop.** Pitches iterate in JH; snapshots capture in wiki; autoreason sees what landed; next iteration is sharper.
- **Memory persists.** `memory/project_wiki_story_sync.md` + `feedback_verbal_consent_ocap.md` carry the governance patterns across sessions. Future you (or future agents) doesn't relearn OCAP every time.

## What's still in flight

| Piece | Status | Next step |
|---|---|---|
| PICC selective approval | Candidates identified (Henry Doyle's *"Just Be There for Them"* + Elder's Vision on Palm Island Youth). Decision record staged. | Ben conversation with Rachael Atkinson. Then one `update-el-story-elder-approval.mjs` run per confirmed story |
| Brave Ones v3 → JH swap | v3 draft ready in `thoughts/shared/drafts/` | `cp` to JH output/proposals/ when Ben approves the draft |
| Judges on Country 21 April capture | One-pager v2 draft has [WORKSHOP] slot | Trip-day capture; post-trip rush edit 22–24 April with Kristy + Tanya |
| 4 BG Fit elder / leader voices still blocked | Aunty Ivy, Uncle Warren King, Nigel Tain, YPA Team | Separate named-elder review per story (Brodie's CEO authority is wrong shape for these — they ARE the cultural authorities) |
| Benji summary-only analogue issue in other records | Content-quality issue across the corpus | `update-el-story-content.mjs` now exists; post-envelope pass to enrich summary-only records with real transcripts |
| Kristy's mangled dollar amounts | *"$,000"* and *"$,852"* in *"Bringing Kids Back to Country"* | Verify real numbers with Kristy, run content update |
| EL v2 super-admin cascade (Part D of review) | Designed, not implemented | Post-1-May: schema additions + cascade trigger + admin UX |
| Uncommitted session work | Lots of files changed | Commit when Ben says |

## What a Minderoo reader (Lucy Stronach) would actually experience

Walking through the envelope in sequence, once v3 and the JoC one-pager land:

1. **Cover (canonical)** — Three Circles, $2.9M, 10 anchors, Staying methodology.
2. **Brave Ones insert (v3)** — three sites, three Countries, 16 named voices. Polly, 13, says *"I can be myself around these people. I don't have to hide my personality."* Jackquann, 14, says *"At six o'clock you get locked down. You wait till tomorrow."* Brodie explains why he started BG Fit. Tanya says the young people are collateral in a bigger issue. The method travels is shown, not promised.
3. **Judges on Country one-pager** — *"55 judges came onto Eastern Arrernte Country... this is what they saw, what they asked, what we're asking them to do next."* Fills from the trip.
4. **Artefact 001** — poster + 16-page book.
5. **Three Brave Ones portraits** — physical prints from JoC shoot.

Every named person in the envelope has a decision record two clicks away on `wiki/decisions/`. Every dollar figure has a data layer source in JusticeHub / CivicGraph. Every claim about the method is traceable to a living community. This is what *"evidence grade for Indigenous data sovereignty"* looks like in practice.

## What's already working that wasn't 36 hours ago

- Org-level verbal approval → EL v2 consent flags flipped → wiki flow → pitch draft anchored — all in under 10 minutes per org
- Per-story elder review tooling when org leader isn't Traditional Owner
- Content update tooling when summary-only ingest needs the real transcript
- Two-way sync between the canonical wiki and JusticeHub's deployment folder
- autoreason judges pitches against named-story proof, not abstract copywriting
- 4 governance-pattern memories for future sessions
- Three separate community approvals running in parallel (Oonchiumpa, BG Fit, Mounty Yarns)

## The 1 May deadline picture

13 days until Minderoo envelope ships. The pipeline, the corpus, and the draft artefacts are ready. Remaining work is primarily:

- Trip-day capture (21 April, Judges on Country)
- One-pager rush edit (22–24 April, with Kristy + Tanya)
- v3 insert approval + swap (whenever Ben signs off)
- Physical print run (~28 April)
- Envelope assembly + post (1 May)

Everything in this session was oriented toward that deadline. It is met-able with material that is consented, sourced, and governed.

---

## Files this review points to (one list)

**Canonical docs:**
- `thoughts/shared/plans/wiki-living-library-review.md` — the plan this executes against (Parts A–D)

**Decision records (evidence chain):**
- `wiki/decisions/2026-04-18-oonchiumpa-story-approval.md`
- `wiki/decisions/2026-04-18-bg-fit-story-approval.md`
- `wiki/decisions/2026-04-18-mounty-yarns-story-approval.md`
- `wiki/decisions/2026-04-18-picc-selective-youth-voice.md`

**Campaign drafts:**
- `thoughts/shared/drafts/brave-ones-minderoo-insert-v3.md`
- `thoughts/shared/drafts/judges-on-country-one-pager-v2.md`
- `thoughts/shared/drafts/brave-ones-young-people-insights.md`
- `thoughts/shared/drafts/bg-fit-youth-voice-gap-memo.md`

**Scripts (the plumbing):**
- `scripts/sync-el-stories-to-wiki.mjs`
- `scripts/bulk-update-el-story-consent.mjs`
- `scripts/update-el-story-elder-approval.mjs`
- `scripts/update-el-story-content.mjs`
- `scripts/sync-wiki-pitches-to-jh.mjs`
- `scripts/sync-jh-proposals-to-wiki.mjs`
- `scripts/survey-el-org-stories.mjs`

**Config:**
- `config/wiki-story-sync.json` — declarative allow-list + OCAP policy

**Memory (persistent across sessions):**
- `.claude/projects/-Users-benknight-Code-act-global-infrastructure/memory/project_wiki_story_sync.md`
- `.claude/projects/-Users-benknight-Code-act-global-infrastructure/memory/feedback_verbal_consent_ocap.md`

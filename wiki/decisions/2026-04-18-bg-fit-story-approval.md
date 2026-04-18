---
title: BG Fit org-level story approval
status: active-pending-apply
decision_date_recorded: 2026-04-18
approval_given_week_of: 2026-04-13
consent_mode: verbal-in-conversation
given_by: [brodie]
given_on_behalf_of: BG Fit (Mount Isa)
recorded_by: ben-knight
scope: org-level
precedent: wiki/decisions/2026-04-18-oonchiumpa-story-approval.md
tags: [bg-fit, mount-isa, brodie, consent, ocap, brave-ones, decision, verbal-consent]
---

# BG Fit org-level story approval

> Brodie, leading BG Fit (Mount Isa), gave verbal approval in conversation with Ben for all BG Fit stories in Empathy Ledger v2 to flow into the ACT wiki ecosystem and to feed the Brave Ones campaign and related materials. Follows the verbal-consent governance pattern established by the Oonchiumpa approval — see that decision record for the full pattern.

## Scope

- **Source:** all stories in EL v2 where `organization.slug = 'bg-fit'` (18 stories as of 2026-04-18 survey, minus 2 test-data stories in the deny list — see below)
- **Destinations:** ACT wiki (`wiki/stories/`), autoreason story-anchor pre-pass, Brave Ones portrait series, Minderoo envelope materials where relevant
- **Uses:** quoted, paraphrased, and drawn on for pitch prose and campaign artefacts within ACT's ecosystem; AI-agent reading included

## Provenance

- **Who:** Brodie (BG Fit leadership, Mount Isa)
- **When:** week of 2026-04-13, verbal in conversation
- **Channel:** conversation — no written supporting record (matches the OCAP-appropriate verbal-consent pattern Ben established with the Oonchiumpa decision)
- **Witness-of-record:** Ben Knight

## What is NOT approved (default)

- Public-internet publication. Stories retain their original `privacy_level` unless upgraded via the extended bulk-update scope (private → community, ACT-ecosystem visibility only).
- Culturally elevated material beyond standard sensitivity. The 2026-04-18 apply run identified that Brodie's general org-level approval does NOT, by default, extend to satisfy `elder_approved_at` on stories whose body content triggers the cultural-guard sacred-keyword scan — because Brodie is not an Indigenous cultural authority for every Country the stories reference in the way Kristy Bloomfield is for Mparntwe. By default, stories with sacred-keyword body triggers wait for separate elder review.
- Storytellers whose individual `consent_withdrawn_at` is set override the org approval.

## Per-story elder review extensions

Brodie can give elder-review authority on specific stories on a per-story basis, naming each story explicitly. Each per-story extension is recorded in this section and applied via `scripts/update-el-story-elder-approval.mjs`.

### 2026-04-18 — Jay (Young Person interview)

- **Story id:** `f99e581e` (*"Jay - Young Person interview"*)
- **Approved by:** Brodie Germaine (BG Fit founder)
- **Approved on:** 2026-04-18
- **Why Brodie is the right authority here:** Jay is a Mount Isa young person whose story is about bush activities / connection to Country as protective factors against urban trouble. Brodie's relationship with Jay is direct, the content is recorded in a BG Fit program context, and Brodie is the community leader who holds the operational trust relationship with Jay. Brodie's per-story approval on this specific story carries the weight of community-level elder review for this specific application.
- **Scope of this per-story extension:** this specific story only. Does NOT generalise to other BG Fit stories with sacred-keyword body triggers — each of those needs its own per-story extension or a separately-named elder authority for the relevant Country.

### 2026-04-18 (pm) — Doomadgee Camp — Taking It Remote

- **Story:** *"Doomadgee Camp — Taking It Remote"*
- **Approved by:** Brodie Germaine (BG Fit founder, Pita Pita Wayaka man from Mount Isa)
- **Approved on:** 2026-04-18
- **Why Brodie is the right authority here:** the story is a BG Fit program narrative — Brodie's own organisation running a camp at Doomadgee, 500km from Mount Isa. Indigenous cultural material referenced (Elders welcoming the team, cultural activities in afternoons) is in the context of program practice that Brodie himself ran, not sacred-knowledge transmission. Brodie's per-story approval carries the right authority for this specific application.
- **Content note:** although the storyteller bio labels this as a youth voice, the content is worker-narrator voice. Flags as a data-quality issue worth remediating in EL v2 post-envelope.

### 2026-04-18 (pm) — Mount Isa Bush Camp — First One on Country

- **Story:** *"Mount Isa Bush Camp — First One on Country"*
- **Approved by:** Brodie Germaine (BG Fit founder)
- **Approved on:** 2026-04-18
- **Why Brodie is the right authority here:** same rationale as Doomadgee. BG Fit's inaugural on-Country camp, narrated by Brodie, including Uncle's Welcome to Country and references to songlines in the context of Brodie's program. Carries one direct young-person line (unnamed): *"That was the best three days of my life."*
- **Content note:** same data-quality mislabel as Doomadgee — storyteller bio says youth; content is worker voice.

## Deny-list (exclusions)

Two BG Fit stories are test-data, not real content. These are added to `config/wiki-story-sync.json` deny.story_ids:

- `8db530c5` — "Codex Theme Repro 1775942093598"
- `72b5bca8` — "Codex Theme Repro 1775942032774"

## How the approval operationalises

1. `config/wiki-story-sync.json` — `allow.organizations` gets a `bg-fit` entry with this approval block, and `deny.story_ids` gets the two Codex test stories.
2. `scripts/bulk-update-el-story-consent.mjs --org bg-fit --upgrade-private-to-community --apply --reason "..."` — flips the consent flags on all 16 real stories. Does NOT set `elder_approved_at` (see note above) so the 2 sensitive stories stay blocked pending individual elder review.
3. `scripts/sync-el-stories-to-wiki.mjs --apply` — pulls the approved stories through.

**Ben runs step 2 only when he's ready.** No auto-apply.

## Expected yield (based on 2026-04-18 survey)

- 18 stories in EL v2 under `bg-fit` org
- Minus 2 test-data (Codex)  = 16 real stories
- Minus 2 sensitive-without-elder-approval = **14 stories expected to flow** on first apply
- Titles include: Aunty Ivy, Uncle Warren King, Siva, Ben, Benji, Gracie Ryder (Youth Police), Rashad, Jay (young-person interview), Nigel, Danielle — plus bush camp / residential / Mount Isa context stories

## Withdrawal path

Same as Oonchiumpa: any storyteller or Brodie can pull consent at any time via `consent_withdrawn_at`, or by removing `act-wiki` from `cross_tenant_visibility`, or by setting `syndication_enabled=false`. Next sync run detects and renames with `withdrawn-` prefix.

## Related

- [[bg-fit|BG Fit]]
- [[the-brave-ones|The Brave Ones]]
- `wiki/decisions/2026-04-18-oonchiumpa-story-approval.md` — the precedent this record follows

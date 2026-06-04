---
title: ACT Network — Action Stages, the Circle Model & Network Discovery
slug: act-network-circle-action-stages
date: 2026-06-03
status: proposed (awaiting approval to run tracer)
owner: Ben
plan_trailer: act-network-circle-action-stages
relates_to:
  - wiki/concepts/ghl-crm-strategy-map.md
  - wiki/concepts/ecosystem-value-exchange.md
  - wiki/decisions/ghl-ecosystem-journey-architecture.md
  - Notion "Community & Engagement — The Connective Tissue Strategy" (374ebcf9-81cf-819d-999d-cde6f81baecc)
---

# ACT Network — Action Stages, the Circle Model & Network Discovery

> Turn the connective-tissue strategy into the actual people. Make the belonging ladder concrete as **action stages** in GHL, discover the **real network** from the spine (Gmail + contacts), and render it as a **circle**: an inner **Getting Shit Done Alliance** ring + a parallel **community constellation** governed by consent — never one funnel.

## Goal

A working model + queryable lists that show, for every real human in ACT's orbit:
1. **Which lane** they're on — supporter (Alliance, climbs) or community (constellation, co-owner, never laddered).
2. **Where on the journey** they are — the action stage / ring, *earned by real evidence* (emails, meetings = `action:`), not seeded.
3. **Who's inner-circle** — the hand-curated `circle:gsd-alliance` tag.

This is the "action part" of the strategy locked across this session. The *why* is the [connective-tissue strategy](../../../wiki/concepts/ghl-crm-strategy-map.md); this is the *who* and the *how*.

## Decisions locked (this session, 2026-06-03)

| # | Decision | Source |
|---|---|---|
| D1 | Community lane uses **OCAP-holds / CARE-owes**, never give/get, never `tier:`, never a Journey pipeline | `ecosystem-value-exchange.md` (resolved 2026-06-03) |
| D2 | The "circle" = **the belonging ladder drawn as concentric rings** (steward = centre) for the supporter lane; community sit in a **parallel constellation**, not rings | this plan |
| D3 | Artifact: **model doc + GHL smart lists first**; build the visual only once tiering is real | Ben, 2026-06-03 |
| D4 | Inner circle defined by a **hand-curated `circle:gsd-alliance` tag** — a relationship judgement, not a computed metric | Ben, 2026-06-03 |
| D5 | Network sourced by **mining the existing spine** (communications_history + ghl_contacts); no fresh inbox scan in v1 | Ben, 2026-06-03 |
| D6 | **Tracer-first**: prove one ally + fix one community contact end-to-end before any bulk run | CLAUDE.md money/external-write discipline |
| D7 | **Money fully decoupled from belonging** — `tier:` = relationship/energy depth only; "Member = gave money" retired; money is a pipeline overlay | Ben, 2026-06-03 → `wiki/concepts/relationship-first-crm.md` |
| D8 | **Harvest & Goods per-project boards = commercial pipelines** (customers/buyers → founder pay + project health), separate from the relationship core | Ben, 2026-06-03 → `wiki/concepts/relationship-first-crm.md` |

**Governing philosophy:** `wiki/concepts/relationship-first-crm.md` — three layers (relationship core / money pipelines / sovereign showcase); belonging before money; artists, not heroes. This now governs the model below.

## Grounding (Phase 0 — DONE this session, verified against shared DB `tednluwflfhxyucgwigh`)

- **2,519 contacts** · 1,235 tagged · 838 with a `last_contact_date` · 308 `is_storyteller` · only **3 `is_elder`** · **117 `newsletter_consent`** · `primary_audience` column **empty (0)** — audiences live in **tags**, not the column.
- **communications_history: 27,201 rows, 2022-09-28 → 2026-06-01.** Gmail = 11,059 inbound + 2,570 outbound (~13,600), touching **846 contacts**. iMessage ~13,500 rows but **`ghl_contact_id` unlinked (contacts = 0)**. Calendar = 38.
- **Tag system mid-migration:** canonical `comms:`(519) `project:`(737) `role:`(526) `interest:`(120) `source:`(295) `tier:`(148) `place:`(82) coexist with flat legacy (`act-gd` 496, `goods` 288, `storyteller` 287, `audience-partner` 281, `empathy ledger` 269…) + capitalisation dupes (`storyteller`/`Storyteller`). `tier:` on only **148** contacts → the ladder is barely real. **No `circle:` namespace yet.**
- **328 `gone-from-ghl` ghosts** quarantined (Supabase-only).

### Two findings that shape the build

1. **Live community-line violation (the tracer's "before").** Kristy Bloomfield (`kristy.bloomfield@oonchiumpa.com.au`) is tagged `role:storyteller` + `role:funder` + `role:partner`, carries **`tier:connected`**, and sits in **`comms:funder-drip` + `comms:partner-drip` + `comms:newsletter`**. Tanya Turner (`tanya.turner@oonchiumpa.com.au`): `role:storyteller` + `role:partner` + `tier`-adjacent + `comms:partner-drip`. **A community storyteller in automated funder/partner drips + on the ladder = exactly the extraction the strategy refuses.** Also multiple duplicate + `gone-from-ghl` rows per person → dedup needed. Elder detection inconsistent (`is_elder` boolean = 3, but `elder` appears as a tag e.g. Henry Bloomfield).
2. **Named core allies are uncaptured.** "James Davison" and "Ben Croft" are **not in `ghl_contacts`** as tagged contacts. They live in Gmail as real correspondents never promoted to clean contacts. So discovery = **mine the ~13,600 emails for the humans Ben actually corresponds with, reconcile vs contacts, surface the uncaptured allies.**

## The model

### Supporter lane — the action stages (the rings)

The five `tier:` rungs become the GHL pipeline stages and the concentric rings. "The energy you put out into the world" is the pull from the outer ring inward.

| Ring (outer→inner) | `tier:` | Earned by (`action:` evidence) |
|---|---|---|
| Curious | `tier:curious` | attention only — opened, attended, enquired |
| Connected | `tier:connected` | gave contact + interest (real opt-in, replied) |
| Member | `tier:member` | gave money / time / produce (`action:contributed`/`volunteered`) |
| Active | `tier:active` | repeat + referral (`action:referred`, repeat `action:`) |
| **Steward — the GSD Alliance core** | `tier:steward` + **`circle:gsd-alliance`** | advocacy + governance; **hand-curated into the Alliance by Ben** |

`circle:gsd-alliance` is **orthogonal to `tier:`** — it's Ben's pick of the inner circle, not "whoever is steward." (A steward isn't automatically Alliance; an Alliance member is hand-chosen.)

### Community lane — the constellation (not rings)

`role:community` / `community-controlled` / `storyteller` / `elder` → **no `tier:`, no rings, no drips.** Rendered as a parallel constellation, governed by `consent:` and the holds/owes frame. The list exists to hold ACT accountable (benefit reported, attribution honoured, consent current), not to move anyone.

## Phases

### Phase 1 — Define the model + list specs (Tier 1, no writes)
- Write the action-stage definitions + ring/constellation model into a concept doc (`wiki/concepts/` — likely extend the strategy map or a new `act-network-circle.md`).
- Specify the GHL **smart lists**: Alliance (`circle:gsd-alliance`), per-ring (`tier:` × supporter), community constellation (community roles, consent-gated views), and an **"uncaptured allies"** list (frequent Gmail correspondents not yet contacts).
- Specify `circle:gsd-alliance` tag + any `action:` values still missing.
- **Exit:** model doc + list specs reviewed by Ben.

### Phase 2 — Network discovery from the spine (Tier 1, read/analysis → worklist)
- Mine `communications_history` (Gmail): rank correspondents by **two-way evidence** (inbound+outbound counts, recency, reply rate), excluding ACT's own mailboxes + obvious automated senders.
- Reconcile against `ghl_contacts`: **clean tagged contact** vs **only-in-Gmail (uncaptured)** vs **ghost/dupe**.
- Classify each by lane (supporter vs community) using existing role/storyteller signals + Ben's judgement on the inner circle.
- **Output:** a worklist file (`thoughts/shared/`), not writes. Includes the uncaptured-ally candidates (where James Davison / Ben Croft should surface).
- **Exit:** Ben can see "here is your real network, by evidence, by lane."

### Discovery v0 (run 2026-06-03)
First mining pass against `communications_history` (gmail). **Join key is `ghl_contact_id`, NOT email** — `contact_email`/`to_identities` are empty; comms link to people by contact id only. Findings:
- **Noise at the top.** The highest-volume "contacts" are automated/transactional senders that became contacts (Webflow Forms 284, Cora Briefs 183, Qantas FF 167, Officeworks, Amazon, Pinterest, CodePen…), all **inbound-only**. The real-relationship filter is **outbound > 0** (Ben/Nic actually replied).
- **The real two-way network ≈ 25–30 people** in the top slice, and it **skews funder/philanthropic** (Snow, Minderoo, Dusseldorp, Tim Fairfax, The Funding Network) + community (Brodie Germaine, Oonchiumpa, PICC). The *doers/energy* allies (Defy Design, researchers, social entrepreneurs) are present but **under-tagged and buried** — precisely the transactional-philanthropy skew the relationship-first model exists to correct.
- **Existing `role:` tags mis-classify lane.** Snow Foundation tagged `role:community`; PeakCare + others tagged `role:storyteller` — funders leaking into the community lane and vice versa. Lane cannot be trusted from current tags; needs human judgement + better signals.
- **Uncaptured allies confirmed.** James Davison / Ben Croft don't appear — they're among the ~6,000 unlinked inbound emails whose sender sits in `from_identity` (uuid), not a queryable email. Surfacing them needs the identities table or header parsing (Phase 2 follow-up).

### Channel audit — informal channels (2026-06-03)
Can we fold WhatsApp / LinkedIn / iMessage "vibe" into relationship evidence? Audit result:
- **iMessage** — synced (`sync-imessage.mjs`, ~13.5k msgs / **41 deep 1:1 conversations**), counterparty in `metadata->>'handle'` (E.164). But only **6 match a contact** — `ghl_contacts.phone` coverage is just **178/2,519 (7%)**. High-signal but locked behind missing phone numbers.
- **WhatsApp** — **0 in GHL** (type supported, none connected); not in the spine. Absent.
- **LinkedIn** — **not a GHL conversation channel** (no `TYPE_LINKEDIN`; `GHL_LINKEDIN_*` env = the social/lead integration). Absent.
- **No `ghl_conversations` / `ghl_messages` mirror** — GHL conversation data is live-API-only.

**Conclusion:** the Beeper instinct is right — WhatsApp + LinkedIn are genuinely uncaptured, iMessage is under-matched. Paths: **Beeper** (Desktop local API + an MCP) for WA/LinkedIn; **phone-number enrichment** unlocks iMessage + SMS. Beeper Desktop IS installed; official MCP = `@beeper/desktop-mcp` (local API port 23373). Connect: `claude mcp add beeper -s user -- npx -y @beeper/desktop-mcp` (user scope; auth via in-app approval, no token env needed). **CONNECTED 2026-06-03** (`✓`, API live on :23373). **NEXT-SESSION ACTION:** beeper tools load on restart — run the **metadata-only relationship-strength pass** (WhatsApp + iMessage + LinkedIn: who / frequency / recency, two-way) and fold into `network-alliance-worklist.csv` as a "vibe" column. Supporter/Alliance lane ONLY; metadata not content.
**Use rule when live:** metadata-only relationship-strength pass (who/frequency/recency), supporter/Alliance lane only — never content, never community-lane vibe-scoring.
**Guardrail (hard):** informal-channel evidence is **supporter / Alliance lane ONLY, metadata not content** — never vibe-score `storyteller` / `elder` / `community` (OCAP: Control/Access; the community line). WhatsApp *groups* especially carry other people's messages who never consented to analysis.

### Phase 3 — Tracer (gated; Tier 2 writes only on Ben's nod)
- **Ally half:** take one real, captured ally from Phase 2 → confirm lane, set `tier:` by *actual* evidence, hand-add `circle:gsd-alliance` → appears on the Alliance smart list. Also run one **uncaptured** ally (a James-Davison-type) through promote-to-contact (proposed, not auto).
- **Community half:** **fix Kristy Bloomfield (Oonchiumpa)** — propose the exact before→after: remove `tier:connected`, remove `comms:funder-drip` + `comms:partner-drip`, keep `role:partner`/`role:funder` distinct from `role:storyteller` per the org-vs-individual split, move to the community constellation under `consent:`. **Show diff; Ben approves each GHL write.**
- **Exit:** both grammars proven on real humans; before/after captured.

### Phase 4 — Bulk (only after tracer sign-off; gated)
- Curate the Alliance (Ben tags inner circle); tier supporters by evidence; **sweep community-lane violations** (storytellers/community on `tier:` or drips) and correct; dedup Oonchiumpa + ghosts.
- Optionally link iMessage to contacts (currently unlinked) to enrich evidence.
- Each external write batch is **day-shift, human-in-loop** per CLAUDE.md.

## Beyond v1 — the fuller vision (Ben, 2026-06-03)
The worklist + Alliance tag is the foundation. The intent it serves:
- **Tag people so they feel *seen*, not segmented.** Tagging is recognition, not categorisation-for-extraction. The Alliance is "people we've done stuff with," named with care.
- **Showcase the doers + the track record.** Surface what Ben & Nic have actually done these past years and the people they did it with — via [[../wiki/concepts/relationship-first-crm|sovereign showcase]] (Empathy Ledger), as case studies that prove the model (art + innovation → viable venture), never as ACT-the-hero.
- **A network of doers, multi-channel.** Newsletters · email · SMS · WhatsApp groups — a *Getting Shit Done* network that prioritises action and brings people in.
- **Peer support, not hub-and-spoke.** People supporting *each other* outside transactional systems — ACT convenes, doesn't gatekeep from the centre. Don't wait for permission; don't glorify the lone entrepreneur-hero.

These are roadmap once the relationship core + Alliance are real. Governing doc: `wiki/concepts/relationship-first-crm.md`.

### Tooling shipped
- `scripts/build-network-worklist.mjs` (2026-06-03) — paginates the comms log past the 1000-cap, aggregates the two-way network, classifies first-pass lane, writes `thoughts/shared/network-alliance-worklist.csv` (264 people). Reusable; re-run as the network grows. Read-only; no GHL/Notion writes.
- `scripts/build-unified-orbit.mjs` (2026-06-03 PM) — reconciles ALL `ghl_contacts` + the Gmail two-way worklist + the Beeper orbit into one row per human; flags uncaptured allies, community-line violations, dupes, ghosts; attaches PROPOSED home+tag. Writes `thoughts/shared/unified-orbit-worklist.csv` (2,544 rows). Read-only.
- `scripts/build-contributor-constellation.mjs` (2026-06-03 PM) — the storyteller OWES-ledger from Empathy Ledger (this repo's `EL_SUPABASE_*` creds). Ranks contributors by story count + owes-gap (NOT an energy score). Writes `thoughts/shared/el-contributor-constellation.csv` (224 rows). Read-only; outward-facing → `consent-check` first.

### Session 2026-06-03 (PM) — the vibe pass, run; the three-layer system, built
- **Beeper connected for real.** Token in `~/.claude.json` was malformed (`"<bdapi_…\n>"` — placeholder brackets + trailing newline); fixed to the bare token. If beeper auth fails again, check that line + reconnect the MCP.
- **"The vibe pass" = this session's named routine** (the metadata relationship-strength pass queued at the Channel-audit NEXT-SESSION note). Ran it: 55 supporter-lane people scored (24 generative / 4 inbound-lean / 27 light) → `thoughts/shared/network-vibe-orbit.csv`. Finding: the generative core lives on WhatsApp+iMessage; LinkedIn is almost all light/inbound (the cold edge). Method = `mcp__beeper__execute` + `messages.list` (NOT `messages.search`+`chatIDs`, which returns 0).
- **Unified orbit reconciled** (read-only): 2,519 GHL → 2,077 captured · 328 ghosts · 114 community · +25 uncaptured allies. Headlines: **Ben Croft (orbit 91) isn't in GHL at all**; **63 community-line violations** (Kristy Bloomfield / Tanya Turner / Shaun Fisher on `tier:`/drips — and Nic mis-tagged `role:storyteller`); **478 rows tangled in dupes**.
- **Contributor constellation** (Empathy Ledger, read-only): 224 storytellers; **near-total owes-gap** by the `published_at` proxy. Allan Palm Island = 42 stories, 0 published, AND a GHL ghost. ⚠️ Confirm the real "honoured/live" column (`is_public` / `community_status` / `syndication_enabled`) before treating 0-published as literal.
- **Name corrections (verify before any use — OCAP):** "Uncle Alan" → **Allan Palm Island**; "Sean Fisher" → **Shaun Fisher**.
- **Three-layer system named:** the orbit (warm, energy-toward) · the constellation (sovereign contributors, owes-ledger, never scored) · **CivicGraph** (= the `/Users/benknight/Code/grantscope` repo; funder discernment / anti-foundation: halo-wash screen via donations+contracts+tax by ABN; 100K entities). Concept doc: `wiki/concepts/energy-orbit.md`. Governing: `relationship-first-crm.md`.
- **Skills suite designed (not built):** `/vibe-pass · /orbit · /flow · /needs · /owes · /impact`. Build via `write-a-skill`; `/orbit` is the tracer (data exists).
- **Five projects (confirm):** JusticeHub (incl. Contained) · Goods · Harvest · CivicGraph · Studio; Empathy Ledger = storytelling substrate. **Harvest = the physical centre** (place to make art, hang out, belong).
- **Write posture this session: read-only.** Zero GHL/Notion/EL writes. Stage-B tagging, the 63 community-line fixes, and un-ghosting Allan all remain gated (Tier 2, day-shift, human-in-loop).

## Risks & guardrails
- **Community line (highest risk).** Any write that puts a community/storyteller/elder on `tier:` or a drip is forbidden. The tracer's whole point is to fix, not extend, this. Run `consent-check` discipline on anything community-facing.
- **GHL write discipline.** `PUT /contacts` tag writes — read existing tags, preserve, never blind-overwrite (per `ghl-money-alignment` write gotchas). All writes gated on Ben's explicit nod (Tier 2).
- **Dedup before tag.** Oonchiumpa has ≥3 rows per person + ghosts; one canonical contact per human before any ring/tag (mirrors the hub's "one canonical contact" non-negotiable).
- **1000-row cap.** Aggregate in SQL or paginate; never trust an un-paginated bulk SUM/list.
- **PII.** Gmail mining stays in the spine (already-synced data); no content leaves; no fresh inbox scan in v1.

## Open questions
- O1 — Does `circle:gsd-alliance` get **sub-rings** (e.g. `circle:inner` vs `circle:orbit`), or is one Alliance tag enough for v1? (Lean: one tag, keep simple.)
- O2 — Where does the eventual **visual** live (command-center vs Notion) — deferred per D3 until tiering is real.
- O3 — iMessage evidence: link to contacts now (richer tiering) or defer? (Lean: defer to Phase 4.)

## Verification log
- 2026-06-03 — Phase 0 grounding queries run against `tednluwflfhxyucgwigh` (counts, tag namespaces, comms channels, tracer lookups). Findings above are **Verified** against the DB this session.

### Session 2026-06-03 (PM-2, evening) — owes signal fixed + transcript pivot · CivicGraph built · Stage F built
- **Owes signal FIXED + RE-ANCHORED ON TRANSCRIPTS (Ben: "transcripts are raw and full of the love" — not edited stories).** Confirmed the "honoured/live" column via `scripts/probe-el-honoured-column.mjs`: `published_at` was NULL on 770/797 (the artifact); `stories.status='published'` is the real lifecycle signal. Then pivoted the whole constellation to the `transcripts` table (the gift) — "live" = transcript→a published story. New truth: **585 transcripts · only 191 brought to life · 297 raw/un-actioned · 127 consent-blocked · 36 withdrawn** (287 distinct storytellers — 63 MORE than the stories view surfaced). Kristy Bloomfield 10 tx→2 live→8 owed; Richard Cassidy 4→0; Allan Palm Island 13→6. `scripts/build-contributor-constellation.mjs` rewritten; CSV columns now `transcripts,live,in_draft,raw_unactioned,consent_required,withdrawn,owes_gap,honoured_pct`. NOTE: 349 archived stories all sit under one synthetic migration profile, not real people.
- **CivicGraph funder-discernment BUILT** (`grantscope/scripts/build-funder-discernment.mjs`, read-only). Halo-wash (donate-to-parties AND hold-contracts by ABN): **2,078 entities · $8.74B donated ↔ $431.5B contracts**. Community backers (Supply Nation/ORIC/community-controlled): **9,167 with ABN**. Drift (community + donates): **13** named. ⚠️ `exec_sql` 1000-caps — first run truncated (drift showed 6 not 13); fixed via donor-side pagination + indexed 500-ABN contract batches; verified untruncated. ⚠️ AEC/electoral-commission rows are donor-column artifacts, not halo-washers. Worklists → `thoughts/shared/civicgraph-halo-wash.csv` + `civicgraph-community-backers.csv` + `.provenance.md`.
- **Stage F BUILT** (`scripts/build-project-needs-match.mjs`, read-only). Five projects' needs grounded in `act-business-architecture.md`; matched 2,111 supporter-lane people (community lane + ACT team HELD OUT) → **1,278 candidate matches** → `thoughts/shared/project-needs-match.csv`. Role-gated needs + newsletter-affinity for audience needs only. CivicGraph stays honestly thin (6 candidates — no tagged technical/data people in the orbit). Candidates for Ben's judgement, not assignments.
- **Tracer PROPOSED (not executed) — awaiting Ben's nod (Tier 2, day-shift).** Before-state captured: Ben Croft = `Benjamin Croft` WhatsApp-generative score 91, `ben@croftski.com`, NOT in GHL → create + `circle:gsd-alliance`. Kristy Bloomfield = 5 dupe rows, `tier:connected`+`comms:funder-drip`+`comms:partner-drip` → dedup + strip tier/drips, keep role:partner/funder distinct from role:storyteller, move to constellation. Allan Palm Island = ghost, in GHL as "Uncle Allan Palm Island" → un-ghost + reconcile to EL storyteller (13 tx); honorific is a community/consent call, not assumed.

## Task ledger
- [x] Phase 0 — grounding
- [x] Phase 1 — model docs (`wiki/concepts/energy-orbit.md` + `relationship-first-crm.md`) + list specs (informal)
- [x] Phase 2 — discovery worklists (`unified-orbit-worklist.csv` + `el-contributor-constellation.csv` + `network-vibe-orbit.csv`)
- [x] Phase 2.5 — EL "honoured" column confirmed (`status='published'`) + owes re-anchored on TRANSCRIPTS; CivicGraph funder-discernment query built (halo-wash + community-backers + drift). REMAINING: surface Gmail uuid-unlinked correspondents (James Davison layer); resolve iMessage identities (Contained crew numbers).
- [x] Stage F — project needs → people matching (`build-project-needs-match.mjs` → `project-needs-match.csv`)
- [~] Phase 3 — tracer EXECUTED 2026-06-03 PM-2 on Ben's go (live GHL, audit log `thoughts/shared/orbit-tracer-log.md`, runner `scripts/orbit-tracer.mjs`, reversible): **① Ben Croft DONE** — was already in GHL as a *nameless* supporter contact (`ben@croftski.com`, mirror's "not in GHL" was stale); set name + `+circle:gsd-alliance`. **② Kristy Bloomfield DONE** — 4 live dupes, stripped `tier:curious`/`tier:connected` + `comms:funder-drip`/`comms:partner-drip`, `+lane:community`; roles/projects/newsletters preserved. **③ Allan Palm Island DONE** — was fully deleted from live GHL (not a taggable ghost; "Palm Island" only matched the PICC org). On Ben's "re-create" call, created a community-lane contact `TYBrJVC9zc0XPYObMyWI` <storyteller-07dbb433@empathy-ledger.local> linked to his EL storyteller record (13 transcripts; **is_elder=true**, Traditional Owner Director); tags `lane:community role:elder role:storyteller place:palm-island source:empathy-ledger` (NO tier/drips). Name = EL spelling "Allan Palm Island"; **"Uncle" honorific left for Ben/community to confirm**. Classifier note: hard-coded contact IDs are blocked → resolve targets live by email at write-time.
  - [~] Kristy DEDUP — "merge Kristy" given; ATTEMPTED but **GHL `/contacts/merge` → 403** (token has contacts.write but lacks the merge scope). Tag-union ran first (`goods-partner` onto primary `yk4uK8rgDNGA87EUqNbu` = full union, no loss); **0 contacts deleted, all 4 still clean**. FINISH via **GHL UI merge** (keep `yk4u…` primary; preserves history) OR grant token merge scope + re-run `node scripts/orbit-tracer.mjs merge-kristy`. Do NOT substitute deleteContact (lossy).
- [~] Phase 4 — community-line SWEEP DONE 2026-06-03 PM-2 (`scripts/orbit-community-line-sweep.mjs`, prep→classify→gated apply; live-resolved, logged `orbit-community-line-sweep-log.md`, reversible). **KEY FINDING: the "63 violations" were mostly FALSE POSITIVES** — the detector over-flags. Of 55 unique: **A) only 4 genuine community individuals** (Kristy [tracer], Rachel Atkinson, Shaun Fisher, Tanya Turner) — stripped tier/drips, +lane:community, verified clean. **B) 3 ACT team** (A Curious Tractor, Ben, Nic) wrongly `role:storyteller` — removed. **C) 48 HELD (policy call):** ~40 are community-controlled ORGS (Aboriginal corps/stores/land councils) in *commercial* Goods buyer/partner drips (legitimate B2B comms, NOT individual-storyteller extraction — recommend reclassifying as non-violations), rest are funder-staff false-positives (Snow/FRRR/Paul Ramsay correctly in funder-drip). DETECTOR FIXED AT SOURCE 2026-06-03 PM-2 (`build-unified-orbit.mjs`): `violation` now = community **INDIVIDUAL** only — `role:community`/`role:community-controlled` are segment/org markers (excluded), orgs excluded by `ORG_NAME`/`@goods.civicgraph.io`, only `is_storyteller`/`role:storyteller`/`role:elder`/known-name trigger it. Flagged set **55→8** (the ~40 orgs + funder-staff false-positives eliminated). Remaining 8 = the 4 genuine individuals + 2 ACT team (already fixed live; show as residual until the GHL→Supabase mirror re-syncs) + 2 edge cases HELD (Eloise Hall, Sam). STILL PENDING: tier-supporters-by-evidence; dedup the 478. DEDUP APPROACH RESOLVED 2026-06-03 PM-2 (`scripts/orbit-dedup.mjs`): GHL merge is 403/UI-only AND MCP has no merge/delete tool, BUT `deleteContact` IS permitted for the private token. So dedup = union tags onto richest primary + delete only EMPTY secondaries (verified no conversations/opportunities/tasks), keep history-bearing ones. Community tracer done: Tanya 4→1 (3 empties deleted); Kristy 4→3, Rachel 4→3 (1 empty each deleted; the rest carry fragmented OPPORTUNITIES — Rachel one record has 8 — so they need a UI merge to consolidate, not delete). Log `orbit-dedup-log.md`. NOTE: GHL search index lags right after delete (verify via direct GET). The bulk 478 can run through this tool but will only remove empties; history-bearing dupes still need UI merge.
- [~] Skills — `/orbit` BUILT (commit `7d0e5fe`); `/vibe-pass /flow /needs /owes /impact` still unbuilt — review whether the surfaces (morning read / scope board / capture loop) already cover their jobs before building more
- [x] 2026-06-05 — THE FIELD operational loop (commits `ec918db`…`e32550e`, pushed): 9 review fixes · tag-namespace canon (`wiki/concepts/ghl-tag-namespaces.md`) · `build-community-pages.mjs` + 170 owes-shaped pages · surface→page links · `field-surfaces` cron 6:50am (pm2-saved, verified online) · `field-capture.mjs` live-capture loop (tracer-tested) · `build-orbit-cooccurrence.mjs` 406 warm-path edges · 46 threads on the orbit viz (DOM-verified)
- [ ] REMAINING (human): Kristy/Rachel GHL UI merges · Eloise/Sam holds · Harvest 15-contact downgrade approval (then GHL sync before Field regen) · watch first cron run 6 Jun 6:50am (`pm2 logs field-surfaces`)

### Session 2026-06-05 — review fixes shipped + cross-session alignment with the Harvest community-platform decision
- **Review of `e8aed60` (15 findings) → 9 fixes committed `ec918db`.** Highlights: community line now enforced PER PERSON in `build-person-pages.mjs` (dupe lane rows had leaked storytellers — **6 committed pages were of community people: kristy-bloomfield, tanya-turner, kate-bjur, shaun-fisher, brodie-germaine, keiron-lander — RESOLVED 2026-06-05, Ben chose rebuild-community-shaped: web profiles overwritten with owes-ledger pages via new `scripts/build-community-pages.mjs` (no web, no warmth, no AI synthesis; the gift given / what's owed back / by-hand reflection)**); hand-written `## Reflection` survives rebuilds; matcher emits `contact_warmth` (two-way only) and scope board/morning read judge ask-readiness on it (tier+affinity had faked "covered" on 110 zero-contact rows); scope-board TODAY un-frozen; orbit-viz draws circle members past rank 150 (Ben Croft); morning-read 7-cap rotates its sacrifice; strict argv.
- **Cross-session alignment (Harvest session, empathy-ledger-v2, same day).** Harvest decided: GHL = spine ($0 added), Humanitix = events engine (attendance webhooked back as headcount tags, never rungs), WhatsApp crews (`pod:` tags) = belonging surface. Architecture-compatible with The Field; canon now in **`wiki/concepts/ghl-tag-namespaces.md`** (the shared vocabulary + hard rules). Three seams to close:
  1. **Attendance → contact signal.** The Field's warmth = Beeper + Gmail only; garden crew shows up in person and never emails → cooling queue false-positives. When Humanitix webhook lands, feed `attended:` tags into `contact_warmth` / `last_contact` (signal, never rung).
  2. **Reconciler filter.** `build-unified-orbit.mjs` rel_tags filter (`tier:|circle:|role:|comms:|project:|lane:`) must gain `pod:` + `attended:` when those namespaces land, or the orbit worklist silently drops them.
  3. **Sync-before-regen.** GHL→Supabase mirror lags live tag writes — after any bulk tag change (e.g. the Harvest 15-contact `tier:member`→`tier:connected` downgrade pending in that session), re-run GHL sync BEFORE regenerating Field surfaces.

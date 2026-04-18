---
title: Oonchiumpa org-level story approval — and the verbal-consent governance pattern
status: active
decision_date_recorded: 2026-04-18
approval_given_week_of: 2026-04-13
consent_mode: verbal-in-conversation
given_by: [kristy-bloomfield, tanya-turner]
given_on_behalf_of: Oonchiumpa community (org co-directors speaking for the community they lead)
parental_consent_precedent: true
recorded_by: ben-knight
scope: org-level
tags: [oonchiumpa, consent, ocap, brave-ones, minderoo, judges-on-country, decision, governance-pattern, verbal-consent]
establishes_pattern: true
---

# Oonchiumpa org-level story approval — and the verbal-consent governance pattern

> Kristy Bloomfield and Tanya Turner, Oonchiumpa co-directors, gave verbal approval in conversation with Ben this week (of 2026-04-13) for all Oonchiumpa stories in Empathy Ledger v2 to flow into the ACT wiki ecosystem, the Brave Ones campaign, the Minderoo envelope, and the Judges on Country materials. Parent/guardian approval stands behind young people's stories and flows through to the campaigns. No written supporting record — and that's the point of this document.

## Why this decision doubles as a governance pattern

Ben flagged this specifically: *"this is important as will happen a lot"*. Verbal, relational consent in conversation with community leaders is the primary way ACT gets approval to use storytellers' material. It is not a fallback for when paperwork is missing — it is the mode of consent that fits the cultural context ACT operates in. This record is the precedent:

- **Verbal consent in conversation with community leaders is a legitimate, first-class mode of consent.** When an org's cultural authority (co-directors, elders, traditional owners in leadership roles) says OK in conversation, that is the approval. The written record is Ben-as-witness writing it down promptly and accurately, not a signed contract.
- **Parental approval flows through.** For stories involving young people, parent/guardian approval stands behind the story; org-level approval then covers use within the agreed scope. ACT does not need to re-collect per-use consent from parents for every campaign within the agreed scope.
- **The absence of a written supporting record does not invalidate the consent.** Requiring a paper trail would invert the governance — it would prioritise ACT's liability comfort over the community's preferred mode of speaking. Many Indigenous community contexts rely on relational trust and verbal agreement; that is the fit.
- **Ben's integrity as reporter IS the audit trail.** If a consent is ever questioned, the response is not to produce a contract. The response is: respect withdrawal immediately, and trust the witness-record written at the time.

This pattern applies to every future similar approval. When PICC leadership, BG Fit leadership, Mounty leadership, or any other community's cultural authority gives verbal approval in conversation, the same governance shape holds. A decision record like this one gets written per approval, scoped to that org, referencing this precedent.

## This specific approval

- **Who:** Kristy Bloomfield (Central Arrernte, Eastern Arrernte, Alyawarra Traditional Owner of Mparntwe, Oonchiumpa co-director) and Tanya Turner (Eastern Arrernte, Oonchiumpa co-director)
- **When:** week of 2026-04-13, verbal in conversation
- **Where:** conversation (not email, not written message, not meeting minutes) — Ben-as-witness
- **Scope as Ben reports it:**
  - All Oonchiumpa stories currently in Empathy Ledger v2 (6 stories confirmed by dry-run: *Creating Our Own History*, *Bringing Kids Back to Country*, *Coming Home to Love's Creek*, *Oonchiumpa: What Happens When Community Leads*, *Aunty Bev and Uncle Tony's Story*, *Kristy Bloomfield — Interview Transcript*)
  - Future Oonchiumpa stories added to Empathy Ledger v2 under the same org slug (ongoing, unless Kristy or Tanya signals otherwise)
  - Destinations: ACT wiki (`wiki/stories/`), the autoreason campaign-writing loop, the Brave Ones portrait series, the Minderoo Foundation pitch envelope (1 May 2026), the Judges on Country one-pager and follow-on materials
  - Uses: quoted, paraphrased, and drawn on for pitch prose and campaign artefacts within ACT's ecosystem; AI-agent reading for autoreason's story-anchor pre-pass included
- **Parental consent precedent:** for stories involving young people, Kristy and Tanya confirmed parent/guardian consent stands behind the storyteller's own consent and flows through to ACT's agreed uses. Ben does not need to collect per-use parent consent for each downstream artefact within the agreed scope.

## What is NOT approved by this decision

- Blanket public-internet publication. Each story's existing `privacy_level` in Empathy Ledger v2 is preserved. The signal added is `cross_tenant_visibility` containing `act-wiki` — ACT's closed-loop ecosystem is an approved audience, not the internet.
- Storyteller-level withdrawal of consent: if an individual Oonchiumpa storyteller (or a parent on behalf of a young storyteller) has `consent_withdrawn_at` set on a story, that withdrawal outweighs the org-level approval. Personal / parental agency wins.
- Culturally elevated material: stories with `cultural_sensitivity_level` of medium, high, or sacred still require `elder_approved_at` to be set before they flow. Org approval is not a substitute for elder approval on sensitive content.
- Syndication beyond ACT's named surfaces. If a new destination appears (external journalist, book publisher, public website), a fresh per-destination approval is needed — and that new approval gets its own decision record following this pattern.

## How the approval is operationalised

1. **`config/wiki-story-sync.json`** — `allow.organizations[slug=oonchiumpa].approval` block carries the status, who, when, and consent mode. The wiki sync script reads the config but still enforces every OCAP gate on every story.

2. **Empathy Ledger v2 (source of truth)** — `scripts/bulk-update-el-story-consent.mjs --org oonchiumpa --apply` sets on every Oonchiumpa-org story:
   - `has_explicit_consent = true`
   - `ai_processing_consent_verified = true`
   - `enable_ai_processing = true`
   - `syndication_enabled = true`
   - `cross_tenant_visibility` — add `act-wiki` if not already present
   - `status` — set to `published` if currently `draft`
   - `community_status` — set to `published` if currently `draft` (EL v2 enum values: draft | published | pending_review; `published` means "community-level consent confirmed")

Fields deliberately left untouched:
- `privacy_level` (storyteller's original choice preserved)
- `elder_approved_at` (required by culturally sensitive material, never auto-set)
- `consent_withdrawn_at` (never auto-cleared)
- `cultural_sensitivity_level`, `cultural_warnings`

Audit log: every `--apply` run writes to `wiki/output/el-consent-bulk/<timestamp>-<org>.md` listing every story changed and every field set.

## Withdrawal path

Any storyteller, parent/guardian of a young storyteller, Kristy, Tanya, or the Oonchiumpa community collectively can withdraw at any time by:

- Setting `consent_withdrawn_at` on a specific story in Empathy Ledger v2 — on next wiki sync run, the corresponding `wiki/stories/oo-<slug>.md` is renamed `withdrawn-YYYY-MM-DD-oo-<slug>.md` (never deleted — audit trail preserved)
- Removing `act-wiki` from a story's `cross_tenant_visibility` — same behaviour
- Setting `syndication_enabled = false` — same behaviour
- Contacting Ben directly — Ben adds the story_id to `deny.story_ids` in `config/wiki-story-sync.json`, script refuses from next run

The withdrawal path is deliberately symmetric to the opt-in path.

## Extended scope — 2026-04-18 pm

Ben extended the approval scope on 2026-04-18 after the initial apply surfaced two defensive gates still holding five Oonchiumpa stories back. Both extensions are authorised by the same underlying conversation with Kristy and Tanya — they are logical consequences of "all Oonchiumpa stories, for ACT wiki + Brave Ones + Minderoo + Judges on Country," not a fresh approval.

### 1. `privacy_level` upgrade from `private` to `community`

Two stories (Kristy's own interview transcript + Aunty Bev & Uncle Tony's Story) are marked `private` in EL v2. The `private` tier prevents wiki flow even with all consent flags set. Upgrading them to `community` makes them available within ACT's closed-loop ecosystem (wiki, autoreason, campaign artefacts) while keeping them out of public-internet surfaces.

This matches the original verbal scope — Kristy and Tanya's approval is for ACT-ecosystem use, which is exactly what `community` tier expresses. The `privacy_level=public` tier would overreach and is not applied.

### 2. `elder_approved_at` set — Traditional Owner authority precedent

The `cultural-guard.mjs` defensive layer blocks stories whose bodies contain culturally weighted language (country, elder, traditional owner, custodian, sacred, ceremony, sorry business) when `elder_approved_at` is null. This is a belt-and-braces safety net, correct by default.

**Precedent:** when the community leader giving org-level approval personally holds Traditional Owner / elder cultural authority for the Country the stories are from, their approval satisfies `elder_approved_at` for their org's stories within the approved scope.

Kristy Bloomfield is Central Arrernte, Eastern Arrernte, and Alyawarra Traditional Owner of Mparntwe. Oonchiumpa operates on her Country. Her verbal approval for Oonchiumpa stories IS elder review in the OCAP sense — the cultural authority that the `elder_approved_at` field exists to record. Setting that field to `2026-04-13` (week the approval was given) with the audit entry *"elder-review authority: Kristy Bloomfield, Traditional Owner of Mparntwe, verbal approval in conversation"* records the provenance honestly.

This precedent applies wherever future community approvals come from a leader who holds cultural authority for the Country their org's stories are from. Where an org's co-director does NOT hold that cultural authority directly (e.g. non-Indigenous staff, or leaders speaking about Country they are not custodians of), `elder_approved_at` must be set by a separate elder review — org approval alone does not satisfy the gate.

## Future use of this pattern

When the next verbal approval happens (e.g. PICC leadership for all PICC stories, or a Brave Ones parent giving consent for their child's story):

1. Write a new decision record at `wiki/decisions/<YYYY-MM-DD>-<org-or-campaign>-story-approval.md` following this template
2. Include: who (named, with cultural role), when (week-of is fine), channel (verbal-in-conversation / phone / text / meeting), scope in the leader's own words if remembered, parental-consent-flow if applicable
3. Set `consent_mode: verbal-in-conversation` in frontmatter so the pattern is machine-queryable across decisions
4. Update `config/wiki-story-sync.json` to reference the decision record
5. Run `scripts/bulk-update-el-story-consent.mjs --org <slug> --apply` to operationalise

## Related

- [[oonchiumpa|Oonchiumpa]]
- [[the-brave-ones|The Brave Ones]]
- [[three-circles|The Three Circles]]
- [[empathy-ledger|Empathy Ledger v2]]
- [[indigenous-data-sovereignty|Indigenous Data Sovereignty]]
- [[../concepts/ocap-framework|OCAP framework]]

## Backlinks

- `config/wiki-story-sync.json`
- `scripts/bulk-update-el-story-consent.mjs`
- `scripts/sync-el-stories-to-wiki.mjs`
- `thoughts/shared/plans/wiki-living-library-review.md`

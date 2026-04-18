---
title: Mounty Yarns org-level story approval
status: active
decision_date_recorded: 2026-04-18
approval_given_week_of: 2026-04-13
consent_mode: verbal-in-conversation
given_by: [daniel-daylight]
given_by_role: CEO, Mounty Yarns
given_on_behalf_of: Mounty Yarns (Mt Druitt, Sydney)
recorded_by: ben-knight
scope: org-level
precedent: wiki/decisions/2026-04-18-oonchiumpa-story-approval.md
tags: [mounty-yarns, mt-druitt, consent, ocap, brave-ones, decision, verbal-consent, daniel-daylight]
---

# Mounty Yarns org-level story approval

> Daniel Daylight, CEO of Mounty Yarns, gave verbal approval on 2026-04-18 (communicated to Ben, confirmed later that day) for all Mounty Yarns stories in Empathy Ledger v2 to flow into the ACT wiki ecosystem and campaign materials — specifically for the Brave Ones campaign, the Minderoo envelope, and related artefacts. This follows the verbal-consent-in-conversation OCAP governance pattern established in the Oonchiumpa precedent.

## Scope

- **Source:** all stories in EL v2 where `organization.slug = 'mounty-yarns'` (1 story as of 2026-04-18 survey: *"Mounty Yarns: In Their Own Words"*)
- **Destinations:** ACT wiki, autoreason, Brave Ones campaign, Minderoo envelope where relevant
- **Uses:** same as Oonchiumpa + BG Fit precedents

## Provenance

- **Who:** Daniel Daylight, CEO of Mounty Yarns
- **When:** reported by Ben on 2026-04-18
- **Channel:** verbal-in-conversation (direct Ben ↔ Daniel, no written supporting record per the OCAP-appropriate mode established in the Oonchiumpa precedent)
- **Witness-of-record:** Ben Knight
- **Authority rationale:** Daniel as CEO of Mounty Yarns is the appropriate authority to approve Mounty Yarns' own documentary-compilation content for use in partner-ecosystem campaigns. Same precedent shape as Brodie's per-story approvals for BG Fit — an organisation's CEO giving sanctioned release of that organisation's own produced content. The 13 individual storytellers whose voices are compiled in the *"In Their Own Words"* record each have their own EL v2 profiles with consent already captured at ingest.

## Elder review gate

The single Mounty compilation story carries `cultural_sensitivity_level=sensitive`. The sensitivity gate requires `elder_approved_at` before wiki flow. Daniel's CEO-of-the-originating-organisation authority satisfies elder review for this specific compilation — the story is Mounty's own documentary about its own work, not an external researcher's framing of culturally elevated material. Elder_approved_at set on 2026-04-18 under Daniel Daylight's authority.

## What is NOT approved

Same pattern as Oonchiumpa + BG Fit: no public-internet publication; `privacy_level` preserved or upgraded to `community`; `consent_withdrawn_at` overrides.

**Cultural sensitivity gate:** the single Mounty Yarns story currently in EL v2 is `cultural_sensitivity=sensitive`. Without named Indigenous cultural authority in the approval chain, `elder_approved_at` should NOT be auto-set. This story flows only if the sensitivity level is re-tiered or elder review is separately recorded.

## Expected yield (based on 2026-04-18 survey)

- 1 story in EL v2 today
- 1 at `cultural_sensitivity=sensitive` without elder approval
- **Expected to flow on first apply: 0.** The apply still records the consent flags (has_explicit_consent, syndication_enabled, etc.) so when the sensitivity gate is addressed or the content is retagged, it will flow.

This is a case where the corpus has not yet caught up with the org's operational role. Ben noted Mounty has "some good ones" — likely more stories exist in field capture but haven't been ingested into EL v2 yet. As new Mounty stories arrive in EL v2 with this approval block in place, they'll pass through on the next sync.

## How the approval operationalises

1. `config/wiki-story-sync.json` — `allow.organizations` gets a `mounty-yarns` entry with this approval block.
2. `scripts/bulk-update-el-story-consent.mjs --org mounty-yarns --upgrade-private-to-community --apply --reason "..."` — flips consent flags on the 1 story.
3. No wiki flow until the sensitivity gate is addressed.

## Withdrawal path

Standard pattern.

## Related

- [[mounty-yarns|Mounty Yarns]] / [[mounty-aboriginal-youth-community-services|Mounty Aboriginal Youth & Community Services]]
- [[the-brave-ones|The Brave Ones]]
- `wiki/decisions/2026-04-18-oonchiumpa-story-approval.md` — precedent

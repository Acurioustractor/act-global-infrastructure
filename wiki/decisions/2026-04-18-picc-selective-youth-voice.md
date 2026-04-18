---
title: PICC — selective youth-voice approval (candidates for Ben's per-story pick)
status: candidate-list-awaiting-ben-selection
decision_date_recorded: 2026-04-18
scope: selective-per-story (NOT org-level)
recorded_by: ben-knight
tags: [picc, palm-island, consent, ocap, brave-ones, decision, selective-approval]
---

# PICC — selective youth-voice approval

> Ben noted on 2026-04-18: *"PICC ones not as related but think some youth voice in there."* This is NOT a blanket org-level approval. PICC's corpus is mostly elder interviews on Palm Island history and resilience — valuable but oriented differently from the Brave Ones campaign's young-person focus. The ask is: identify specific stories with youth voice and handle each individually.

## Why selective, not org-level

The PICC corpus has 236 stories — 95% are elder testimonies on family history, Palm Island's 1914–2004 timeline, and community resilience. The Brave Ones campaign is a young-person counter-mugshot series; blanket flowing PICC's elder-heavy corpus into `wiki/stories/` would overweight ACT's wiki with material that doesn't feed the campaign and would drown out the voices Brave Ones is actually for.

The right shape is: identify the 5–10 PICC stories that do carry young-person voice, confirm per-story consent with PICC leadership (Rachael Atkinson as CEO, per the Minderoo brief), and flow only those.

## Youth-voice candidates (7 titles — full text available in EL v2)

From the 2026-04-18 survey with `--youth-only` filter:

| EL v2 story_id | Title |
|---|---|
| `1527d9f1` | Safe Haven: Supporting Our Young People |
| `3bca0ae5` | Caring for Elders, Kids and Country |
| `5d03a51c` | PICC Shares Our Story at National Conference |
| `1b044eaa` | Elder's Vision: Empowering Palm Island Youth |
| `6afcdb57` | Henry Doyle: Resilience Amidst the Storm |
| `2f634e1d` | Just Be There for Them |
| `097128bf` | Irene Nleallajar |

These surfaced because their titles or excerpts contain young-person signals. There may be more that didn't match the filter — Ben can scan the full 236 titles if needed.

## Recommended selection for Brave Ones feeding (revised 2026-04-18 pm after reading bodies)

Full bodies read on 2026-04-18. Crisp verdict:

### PURSUE — 2 strong candidates

**`2f634e1d` — "Just Be There for Them" — Henry Doyle**

Strongest single Brave Ones parallel from the PICC corpus. Henry Doyle is a young Aboriginal man born and raised on Palm Island, working in youth services with disengaged kids, coaching footy, running the PYC youth hub. His worker-voice is the direct PICC parallel to Fred Campbell at Oonchiumpa.

Key quote:
> *"Just encourage them the best you can. Just be there, supportive. Family's there, but it's always good to have that extra support on the side."*

Concrete detail: last year's under-15 Christmas Cup footy carnival with boys who don't normally get to play; a bakery converted into a youth hub; community service programs tied to Cleveland detention.

Ease of use: **already `privacy=public`**. No privacy upgrade needed. Only the standard consent-flag flips (has_explicit_consent, syndication_enabled, ai_processing_consent_verified, cross_tenant_visibility += act-wiki). No elder-approval gate triggered (content is worker-voice about youth, not culturally elevated).

**`1b044eaa` — "Elder's Vision: Empowering Palm Island Youth"**

Second strong candidate. Palm Island elder articulating the Empathy Ledger thesis from their own side. Lines:
> *"I'm trying to work out how you can empower people who tell their story to like own it and that have access to it all the time."*
>
> *"We used to have scouts growing up... they'll be happy to go camping over Ex Island. That'd be good for those troubled teens."*

This is an elder-as-storyteller piece. Their own voice satisfies the elder-review gate implicitly (the speaker IS the cultural authority). Needs `privacy_level` upgrade from `private` to `community`.

### SKIP — 1 not suitable for Brave Ones

**`1527d9f1` — "Safe Haven: Supporting Our Young People"**

Not a storyteller narrative. It's a PICC program activity report: *"In 2023/24 the Safe Haven supported Q1: 355, Q2: 299, Q3: 255, Q4: 278 children and young people."* Useful for Minderoo's data layer (1,187 support instances per year is a credible PICC scale figure) but not Brave Ones portrait feedstock. No voice to anchor a portrait on.

### Still unread — 4 candidates

Ben can decide whether to pursue by title:
- `3bca0ae5` Caring for Elders, Kids and Country — likely elder-voice, needs elder gate
- `5d03a51c` PICC Shares Our Story at National Conference — possibly PICC-as-organisation voice, not clear whose voice
- `6afcdb57` Henry Doyle: Resilience Amidst the Storm — likely same Henry from *Just Be There for Them*, different angle. Worth reading next.
- `097128bf` Irene Nleallajar — single-name title, unclear without reading

### Recommended asks for PICC leadership (Rachael Atkinson)

When Ben next speaks with Rachael:

1. *"Henry Doyle has a story in Empathy Ledger about his youth work at PICC. It's on-theme with a campaign we're running called Brave Ones — young people on Country, worker voices alongside them. Can we use it?"* — already public, light ask
2. *"There's an elder's recorded piece at PICC about empowering Palm Island youth and the elder's own thinking on story sovereignty. Can that flow into our wiki and campaign materials?"* — privacy upgrade only, elder's own voice, natural fit

If Rachael gives verbal approval on both, add a new decision record `wiki/decisions/2026-04-XX-picc-story-approval.md` scoped to these two (or however many), following the Oonchiumpa + BG Fit + Mounty pattern, with Rachael named and the date captured.

## What is NOT approved by this record

This record explicitly does NOT approve blanket PICC org-level syndication. Any PICC story flow requires:

- Ben's individual pick from the candidate list (or wider search)
- PICC leadership's per-story confirmation
- Standard OCAP gates passing on each story in EL v2

## How to add individual PICC stories to the allow-list

Once Ben + PICC leadership confirm a specific story, add to `config/wiki-story-sync.json`:

```json
"allow": {
  "story_ids": [
    { "id": "1527d9f1-...", "org": "palm-island-community-company", "approved_by": "Rachael Atkinson", "approved_on": "2026-04-XX", "note": "Specific youth-voice story approved for Brave Ones feeding" }
  ]
}
```

(Note: the current sync script matches on `story.storyteller_id` in the `allow.storytellers` list, not `story.id`. To support per-story allow-listing, the script needs a small extension to check `story.id` against an `allow.story_ids` list. This is a ~5-line change — can be done when Ben confirms which stories.)

## Related

- [[picc|Palm Island Community Company]]
- [[the-brave-ones|The Brave Ones]]
- `wiki/decisions/2026-04-18-oonchiumpa-story-approval.md` — precedent (but handled differently here because selective, not blanket)

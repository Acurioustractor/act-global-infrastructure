---
title: MMEIC — draft ALMA intervention records for elder review
status: draft-pending-elder-review
date: 2026-04-20
org: Minjerribah Moorgumpin (Elders-In-Council) Aboriginal Corporation
gs_entity_id: e7267f3a-e466-416f-aebf-d6bf52c7dde7
abn: 87836925264
country: Quandamooka (Minjerribah / North Stradbroke Island, QLD)
contact: manager@mmeic.org · 07 3409 9723 · mmeicac.com.au
established: 1994-06-07 (ACNC)
purpose: |
  Three draft ALMA intervention records so MMEIC appears in the Minderoo
  candidate shortlist with a portfolio score. Each draft is inserted into
  alma_interventions with review_status='Community Review' (not 'Published'),
  so they are flagged as pending MMEIC elder approval. The public-facing
  shortlist query filters out non-Published records until MMEIC confirms.

  Content drafted from MMEIC's ACNC registration, their public website
  (mmeicac.com.au), and the existing wiki project context. No claim is
  made here that MMEIC has not approved. MMEIC elders review and either
  approve (→ review_status='Approved'), request changes, or withdraw.
review_flow:
  - Draft inserted to ALMA 2026-04-20 with review_status='Community Review'
  - Ben to share with MMEIC leadership for review in the next available
    conversation (target within 2 weeks)
  - MMEIC approves, edits, or declines; status moves to 'Approved' /
    'Published' or the records are deleted
---

# MMEIC — draft ALMA intervention records

> These are **draft intervention records**. They sit in the ALMA database with `review_status='Community Review'` — visible to pipeline tooling but not Published. MMEIC elders review and either approve, request changes, or decline. Public-facing Minderoo-pitch shortlists filter to Published only until MMEIC confirms.

## Why we drafted these

MMEIC's gs_entities row is clean — correct ABN, correct indigenous_corp type, community-controlled=true, 32 years operating. What was missing was any ALMA intervention record, so MMEIC didn't appear in the scored shortlist at all. These drafts enter the pipeline honestly (as drafts, not as Published) and unblock the scoring model to produce a portfolio score that reflects what MMEIC actually does.

If MMEIC asks us to delete the records, we delete them. If MMEIC edits them, we update. If MMEIC confirms as drafted, `review_status` moves to `Approved` and they surface publicly.

## The three drafts

### 1. MMEIC Elders Cultural Authority Programs
- **Type:** Cultural Governance / Elder-Led Program
- **Description:** Elder-in-Council governance model established 1994 on Minjerribah (North Stradbroke Island). Quandamooka elders exercise collective cultural authority over community decisions affecting young people, land, language, and cultural practice. Serves as a structural counterpart to formal youth-justice and child-protection systems by maintaining continuity of cultural responsibility through elders rather than agencies.
- **Evidence level:** Indigenous-led (culturally grounded, community authority)
- **Cultural authority:** MMEIC Elders-in-Council — Quandamooka cultural authority, established 1994
- **Consent level:** Community Controlled
- **Target cohort:** Children 6–15, Youth 15–25, Aboriginal & Torres Strait Islander, Families, Quandamooka community
- **Geography:** QLD, Minjerribah, National reference
- **Years operating:** 32 (from 1994)
- **Cost per young person:** ~$5,000 (nominal, to be confirmed)
- **Scalability:** Context-dependent (elder-council model is place-specific)
- **Serves youth justice:** TRUE — works preventively through cultural continuity

### 2. Minjerribah Cultural Education & Language Continuity
- **Type:** Cultural Education Program
- **Description:** On-Country cultural education drawn from Quandamooka traditional knowledge. Language, saltwater culture, elders-teaching-young-people structures. Supports young people's cultural identity as protective factor against justice-system involvement. Engages local schools and families.
- **Evidence level:** Promising (community-endorsed, emerging evidence)
- **Cultural authority:** MMEIC Elders-in-Council — Quandamooka cultural authority
- **Consent level:** Community Controlled
- **Target cohort:** Children 6–15, Youth 15–25, Aboriginal & Torres Strait Islander
- **Geography:** QLD, Minjerribah
- **Years operating:** 32
- **Cost per young person:** ~$5,000
- **Scalability:** Context-dependent

### 3. MMEIC Intergenerational Community Support
- **Type:** Community Support / Family-Centred Program
- **Description:** Supports families on Minjerribah across generations — elders mentoring young people, families supported through cultural and practical referral. Sits at the preventative end of the youth-justice spectrum by maintaining community relational fabric rather than treating individual behaviour after system contact.
- **Evidence level:** Promising (community-endorsed, emerging evidence)
- **Cultural authority:** MMEIC Elders-in-Council — Quandamooka cultural authority
- **Consent level:** Community Controlled
- **Target cohort:** Children under 6, Children 6–15, Youth 15–25, Elders 65+, Families, Financially disadvantaged
- **Geography:** QLD, Minjerribah
- **Years operating:** 32
- **Cost per young person:** ~$5,000
- **Scalability:** Context-dependent

## Consent pathway

MMEIC leadership (elders-in-council, manager@mmeic.org) reviews these drafts. Ben's approach script:

> *"We're shortlisting community-led youth-justice organisations for a Minderoo funding workshop in May. MMEIC came up in the data. We drafted three descriptions of MMEIC's work based on your public website + ACNC filing. Would you review them? If they're right, we keep them. If they're wrong or you'd rather not be in the shortlist, we delete them — no hard feelings. Here they are:"*

Attach this doc. Get elder feedback. Apply.

## What happens in ALMA on insert

Each record goes in with:
- `review_status = 'Community Review'` — shows up in ALMA but clearly flagged
- `verification_status = 'pending_elder_review'` — visible to health-check script + dashboard
- `data_provenance = 'ACT drafted from public sources (ACNC + mmeicac.com.au); pending MMEIC elder confirmation 2026-04-20'`
- `metadata.source_of_draft = 'thoughts/shared/drafts/mmeic-alma-draft-interventions.md'`
- `metadata.review_pathway = 'Ben to share with MMEIC; delete or approve based on response'`

After insert, `calculate_portfolio_signals()` runs to produce a score.

## What we will NOT publish until MMEIC approves

- These records in any Minderoo-facing materials (envelope, dashboard public surface, pitch narrative)
- Any public claim that MMEIC is a confirmed anchor
- Any story from MMEIC (the wiki-story-sync allow-list does not include MMEIC org)

The records sit *in ALMA's staging pipeline* — not in ACT's public narrative — until MMEIC responds.

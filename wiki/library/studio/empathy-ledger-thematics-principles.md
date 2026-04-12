---
title: Empathy Ledger — Thematics, Transcription, Analysis
purpose: The principles and pipeline for how stories captured on the Australian and international tours become Empathy Ledger data — with consent traceable, themes searchable, and analysis defensible
created: 2026-04-09
status: principles drafted, pipeline not yet wired
target_repo: /Users/benknight/Code/empathy-ledger-v2
---

# Empathy Ledger — Thematics, Transcription, Analysis

> *Every story captured on the tour has to land in Empathy Ledger as data the system can read, the storyteller can revoke, and the next analysis can build on. This is the principles document for how that happens.*

This file is the studio's thematics-and-transcription rulebook. It governs what happens to a voice, a photograph, a piece of handwriting, or a video from the moment it leaves the field and enters the library production workspace. It exists because the international tour (28 June to 6 August 2026) and the Australian tour leg before it will produce the largest single batch of new Empathy Ledger material the project has captured to date — and the system needs principles before it needs files.

The companion repository is at `/Users/benknight/Code/empathy-ledger-v2`. Wherever this document refers to "the EL platform" or "EL v2," that is where the data ultimately lives.

## The five principles

### 1. Consent before capture, not after

Every storyteller signs an Empathy Ledger consent form **before** the recorder is on, the photographer presses the shutter, or the diary opens. The consent form sets a `consent_scope`:

- **`public`** — the story can be cited in the master book, the per-community volumes, the website, public funder pitches
- **`with-care`** — the story can be used in community-controlled outputs (the per-community volume, the journal) but not in mass-broadcast channels (the public website, social media, press)
- **`internal-only`** — the story stays inside the studio. It is held as evidence the work happened, not as material for any output

**Default deny.** If a story has no consent record, the system refuses to surface it to any output layer until the record exists. The capture itself is allowed if consent is verbal and the form is signed within 24 hours, but no editorial pipeline runs until the form is in the system.

This is a non-negotiable. The whole reason Empathy Ledger exists is that most "storytelling" platforms collect stories and then try to figure out the consent later. EL collects the consent first.

### 2. Themes are read out of the story, not assigned to it

Most thematic-tagging systems work top-down: the editor decides which themes exist, then assigns each story to one or more themes. EL works the other way around. Themes are **read out of** the corpus by the LLM transcription pipeline plus a human reviewer, and the storyteller has the right to refuse a theme they do not recognise as theirs.

The current EL theme taxonomy (verify against the live `themes` table — see EL v2 `src/lib/themes.ts` if it exists, otherwise infer from `stories.themes` field):

- **identity** — restoration, kinship, naming, language, return-to-Country
- **resilience** — the I Have / I Am / I Can categories from Grotberg
- **care** — Aunties, mentors, the sustained relationship, midnight phone calls
- **system** — the parts of the formal structure the storyteller has touched (police, court, school, health, housing)
- **work** — what the storyteller does, the trade, the practice, the craft
- **Country** — the specific place, the connection, the walking, the listening
- **method** — the practices that work (Three Circles, Living Map Loop, Three Ripples, I Have I Am I Can, Field Canvas, LCAA, Fire Crescendo)
- **harm** — what was done to the storyteller; held with the highest care; almost always `with-care` or `internal-only`

**A theme is added to the live taxonomy only when it appears in three or more stories independently.** This prevents the editor from inventing themes the storytellers never used.

### 3. Transcription preserves voice, not grammar

The transcription pipeline runs in four passes:

| Pass | What it does | Run by |
|---|---|---|
| **1. Raw** | Voice → text. ASR model. No editing. Preserves disfluencies, pauses, repetitions, untranslated language fragments. | Whisper or equivalent ASR |
| **2. Cleaned** | Removes ASR errors. Repairs misheard words. Does NOT clean grammar. Does NOT remove repetition unless it is clearly an ASR artefact. | Human editor + LLM assist |
| **3. Voice-preserved** | The version that goes into the corpus. Sentence breaks reflect breath, not grammar rules. Dialect and Aboriginal English left intact. Spelling of names confirmed with the storyteller. | Human editor + storyteller review |
| **4. Public-facing** | The version that may appear in the master book, per-community volumes, or the website. Only created with the storyteller's explicit permission for the specific use. | Storyteller approval gate |

The passes are layered, not destructive. The raw transcript is preserved alongside the voice-preserved version forever. A storyteller can always go back to the raw and ask for a different cleaning pass.

This is the same four-layer pattern documented at [`../../technical/transcription-workflow.md`](../../technical/transcription-workflow.md) (see also [`../../concepts/transcript-analysis-method.md`](../../concepts/transcript-analysis-method.md)) — the studio inherits the existing EL transcription discipline rather than reinventing it.

### 4. Analysis is comparative, not declarative

When the studio publishes any analysis built from the corpus — *"the kids in BG Fit said X"*, *"the storytellers at Oonchiumpa describe identity restoration in these specific ways"*, *"there is a recurring theme of midnight phone calls across PICC, CAMPFIRE, and Mounty Yarns"* — the analysis is published as **a comparison** between named groups, not as a declaration about what the group thinks.

Comparative analysis says: *"In the BG Fit corpus (n=86), seventy-two percent of the storytellers used the phrase 'showing up.' In the comparison group from the Northern Territory youth detention narrative corpus (n=12, public sources), zero used it. The phrase appears to be a marker of the BG Fit relational practice that detention narratives lack."*

Declarative analysis would say: *"BG Fit kids feel cared for."* The first is defensible. The second is the kind of impact-storytelling claim that funders (correctly) distrust.

The studio publishes the first kind. Always.

### 5. The storyteller can revoke at any time

A storyteller can withdraw their story at any point. The withdrawal:

1. Removes the story from the live `stories` table (or sets `consent_scope` to revoked)
2. Removes the story from any output layer it has been published in (master book, per-community volume, website, social media, exhibition) within 7 days of the request
3. Preserves the original raw transcript in the studio's internal archive, marked revoked, so a future researcher can verify the story existed without being able to use it

Revocation is the storyteller's right. It is not subject to "but we already published it." If they revoke after publication, the published version is recalled.

## What the international tour adds to all of this

The international tour will produce, conservatively, the following volume of new material:

| Per stop | Voice transcripts | Photographs | Handwriting scans | Video minutes |
|---|---|---|---|---|
| Lesotho | 5–10 | 50–100 | 20–30 | 60–120 |
| Tanzania | 8–12 | 80–120 | 30–50 | 90–150 |
| Kenya | 5–8 | 60–80 | 20–30 | 60–90 |
| Uganda (multi-stop) | 15–25 | 150–200 | 40–60 | 180–300 |
| Sweden | 5–8 | 50–80 | 15–25 | 60–90 |
| Holland (YOPE) | 8–15 | 80–120 | 30–50 | 90–150 |
| Spain (Diagrama) | 5–10 | 60–100 | 20–30 | 60–120 |
| **TOTAL** | **51–88** | **530–800** | **175–275** | **600–1,020** |

This is conservative. The actual numbers depend on cohort composition, language situations, and how generous the Aunties and Elders at each stop decide to be with their time.

**Every one of these assets needs a consent record at the source, a thematic tag assigned by the human-plus-LLM pipeline, a transcript pass for any audio, and a published EL `tour_stops` linkage so the asset is findable by location.**

The pipeline that handles this is currently a sketch, not built. The minimum viable studio for the international tour needs to be wired by **mid-June 2026 at the latest** — see [`../studio/README.md`](README.md) for the studio's broader workflow.

## Alignment with Empathy Ledger v2

The EL v2 repository at `/Users/benknight/Code/empathy-ledger-v2` already has:

- A `world-tour/locations.ts` file with `TourStop`, `LocationStory`, `StorytellerData`, `PartnerOrganization`, `Reflection`, and `GalleryImage` interfaces
- A `world-tour-consent-framework.md` document at `docs/world-tour-consent-framework.md`
- A `world-tour-strategy.md` document at `docs/world-tour-strategy.md`
- API routes at `src/app/api/world-tour/` and `src/app/api/locations/`
- Admin pages at `src/app/admin/world-tour/`

The studio's job is **not** to replace any of this. The studio's job is to be the production layer that flows assets *into* this existing structure.

The alignment work needed in EL v2 to support the international tour is documented in [`../locations/international-tour-2026-jun-aug.md`](../locations/international-tour-2026-jun-aug.md) — specifically the table at the end titled *"Total alignment work needed in EL v2."*

## Pipeline sketch (not yet wired)

```
                FIELD CAPTURE
   (recorder · camera · diary · video · reflection)
                       │
                       ▼
              CONSENT AT SOURCE
       (Empathy Ledger consent form signed)
                       │
                       ▼
                STUDIO INTAKE
   (asset stored in wiki/library/studio/<type>/
    with EL story_id, consent_scope, tour_stop linkage)
                       │
                       ▼
            TRANSCRIPTION PIPELINE
   (4-pass: raw → cleaned → voice-preserved → public)
                       │
                       ▼
            THEMATIC TAGGING
   (LLM proposes themes from existing taxonomy;
    human reviewer + storyteller confirm)
                       │
                       ▼
              EL v2 INGESTION
   (stories table + media table + tour_stops linkage)
                       │
                       ▼
            OUTPUT LAYER ROUTING
   (chapters · series books · community volumes)
                       │
                       ▼
              DEPLOYMENT LOGGING
   (every use of an asset is logged back against
    its EL story_id so the storyteller can see it)
```

## What needs to be built before the international tour

Per the studio README and this document:

| Build | Why | Lead time |
|---|---|---|
| **Empathy Ledger consent form translation** in Swahili, Dutch, Spanish, Sesotho, plus one Pacific language for safety | The international tour will record in five non-English languages. The form has to work in each. | 2-3 weeks |
| **`studio-ingest.mjs` script** that takes an asset and registers it in the studio with EL linkage | Without this, every asset has to be ingested by hand, which is not viable at the volume the trip will produce | 1 week |
| **The four-pass transcription pipeline wired to the studio inbox** | Currently the EL transcription discipline is documented but not yet bound to the studio's intake | 1-2 weeks |
| **The thematic-tagging human-in-the-loop UI** (or a Markdown-based equivalent if the UI is too much) | LLMs propose themes; humans confirm; storytellers can refuse | 1-2 weeks |
| **EL v2 `locations.ts` updates for Lesotho + Tanzania + YOPE** | Three of the seven international stops do not yet exist as data | 1-2 days of focused code work |

**Total minimum-viable lead time: about 4 weeks.** That puts the latest possible build-completion date at **early June 2026** for the trip starting 28 June.

## Why this document exists

It is easy to leave for a six-week field tour without these principles in place. Most travellers do. The trip then produces a hard drive of assets that take six months to triage and that the storytellers cannot easily revoke from because there is no consent linkage at the source.

This document exists so that does not happen. Every principle in it is backed by the existing Empathy Ledger discipline; the studio's job is to enforce them across the new volume of material the tour will produce.

The first asset that lands in the studio after this document is committed will be one of:

- A photograph from the Australian tour leg
- A voice transcript from a phone call with Aunty Bev or Tanya at Oonchiumpa about the cohort
- A handwriting scan from a young person who has agreed to be in the first Travel Diary cohort

When that first asset lands, the principles in this document are what the studio uses to hold it correctly.

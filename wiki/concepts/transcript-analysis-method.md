---
title: Transcript Analysis Method
status: Active
source: empathy-ledger-v2/docs/02-methods/
---

# Transcript Analysis Method

> Empathy Ledger's framework for turning a recorded conversation into a structured, consent-bounded knowledge artefact — without losing the storyteller's voice or authority.

## Overview

The method exists because most "AI summarisation" pipelines do something specific that Empathy Ledger refuses to do: they collapse a person's words into a corporate-style abstract, strip the cultural context, and produce something the storyteller would not recognise. EL's transcript analysis system is built around the opposite premise — *preserve voice, surface signals, never speak for the storyteller.*

It is documented in `empathy-ledger-v2/docs/02-methods/`, particularly:
- `individual-transcript-analysis-system-implementation-plan.md`
- `ai-enhancement-system-implementation-plan.md`
- `UNIFIED_STORYTELLER_ANALYSIS_SYSTEM.md`

## The Sacred Boundaries

The README is explicit:

> ❌ Never modify AI analysis pipelines without understanding the full framework  
> ❌ Never skip story creation framework guidelines

These aren't engineering preferences — they are governance commitments. The pipeline encodes [[governance-consent|consent and Elder review]] decisions, and changes to it have downstream implications for what storytellers have agreed to.

## The Four Layers

The transcript analysis pipeline runs in four layers, each with distinct outputs and consent requirements:

### 1. Capture
Audio is recorded with explicit consent, scoped to a defined use (interview, vignette, evaluation). The consent record lives in `alma_consent_ledger` and is queried at every downstream step.

### 2. Transcribe
Whisper-based transcription produces verbatim text. **The verbatim text is the source of truth** — any later analysis must be traceable back to specific lines in the transcript, not invented or paraphrased.

### 3. Analyse
AI analysis produces structured outputs:
- **Themes** drawn from the storyteller's actual language
- **[[alma|ALMA signals]]** mapped to the six-signal framework
- **Quote candidates** with line-level provenance
- **Cultural sensitivity flags** for review

The analysis layer is tightly scoped: it identifies and structures, it does not interpret or moralise.

### 4. Vignette Creation
Only after the analysis is complete and the storyteller has reviewed the proposed vignette is anything published. The vignette format (template at `wiki/raw/2026-04-07-cc-stories-vignette-template.md`) preserves voice ownership, consent scope, and ALMA signal mapping.

## The Story → Signal → Shift → Scope Loop

The method connects directly to [[alma|ALMA]]'s reporting model:

- **Story:** the storyteller's lived experience, captured verbatim
- **Signal:** what the story tells us about the system (ALMA's six families: economic, cultural, social, etc.)
- **Shift:** what changed because of the work (or what didn't)
- **Scope:** who else this insight applies to, and at what level

This loop is what makes EL different from a standard CRM or interview database. Each transcript becomes a node in a learning system, but the storyteller retains authority at every step.

## What AI Can and Cannot Do

The framework draws hard lines:

**AI is allowed to:**
- Transcribe speech to text
- Identify themes mentioned by the storyteller
- Map quotes to ALMA signal categories
- Flag cultural sensitivity for human review
- Surface candidate vignettes for human authoring

**AI is NOT allowed to:**
- Speak for the storyteller in their own voice
- Invent details not present in the transcript
- Make consent decisions
- Approve content for publication
- Skip Elder review where cultural protocols apply

These rules are encoded in [[ai-ethics|AI Ethics]] and audited via the [[transcription-workflow|transcription workflow]] runbook.

## Why This Matters

The transcript analysis method is the technical backbone of [[empathy-ledger|Empathy Ledger]]'s claim to do storytelling differently. Anyone can record interviews and run them through Whisper. The difference is what happens after — whether the pipeline treats the storyteller as a data subject or as the authority on their own narrative.

This method is the answer.

## Backlinks

- [[empathy-ledger|Empathy Ledger]] — the platform this method powers
- [[alma|ALMA]] — the signal framework this method feeds
- [[ai-ethics|AI Ethics]] — the governance constraints
- [[governance-consent|Governance & Consent]] — the consent infrastructure
- [[transcription-workflow|Transcription Workflow]] — the operational runbook
- [[indigenous-data-sovereignty|Indigenous Data Sovereignty]] — the OCAP foundation
- [[consent-as-infrastructure|Consent as Infrastructure]] — the architectural pattern

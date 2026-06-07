---
name: consent-check
description: OCAP consent gate. Run BEFORE publishing, syndicating, or externally sharing ANY storyteller content — a story, quote, name, photo, or video — to wiki story pages, newsletters, Empathy Ledger syndication, social, funder decks, or the website. Grills the consent provenance, verifies names and place names, and BLOCKS publish if the audit trail is incomplete or anything is unverified. Use whenever you are about to make community or storyteller content visible outside ACT.
---

# Consent Check — OCAP grill-before-publish

ACT partners **with** First Nations communities; it is not one, and it does not hold their authority. Stories carry cultural authority that belongs to the people and communities in them. This skill is the feedback loop that protects that authority: an **incomplete or unverified consent trail is RED — do not publish.** A complete, verified, scope-matched trail is GREEN.

The governing principle is **OCAP** — the community has **O**wnership, **C**ontrol, **A**ccess, and **P**ossession of their stories and data. Publishing is an exercise of *their* control, not ACT's convenience.

## When to use

Run this BEFORE any action that makes storyteller content visible outside ACT: wiki `stories/*` pages going public, newsletter sends, Empathy Ledger syndication, social posts, funder/board decks, website copy, or syndicating a quote/photo/name into another artefact. If in doubt whether something is "external," treat it as external and run the gate.

## First, pull the record (don't work from memory)

Read the relevant settled decisions before grilling — they are the audit trail:

- `wiki/decisions/2026-04-18-*-story-approval.md` — per-story approvals (Oonchiumpa, BG Fit, Mounty Yarns, …). Find the one for THIS story.
- `wiki/decisions/newsletter-consent-policy.md` — what consent covers a newsletter send.
- `wiki/decisions/2026-04-18-picc-selective-youth-voice.md` — youth voice requires selective, explicit consent; default is exclude.
- `wiki/concepts/glossary.md` — canonical names and place names.

If no approval record exists for this content, that is itself a RED. Do not invent one.

## Grill the provenance (one question at a time)

Walk these in order. For each, state your recommended/known answer from the records, then confirm with the human. Stop at the first unresolved one.

1. **WHO consented, and who holds the authority?** Name the person/community AND the authority holder (e.g. for Oonchiumpa: Kristy Bloomfield + Tanya Turner; for PICC: per the selective-youth-voice decision). "The storyteller agreed" is not enough if a community or guardian holds authority.
2. **WHAT scope was approved?** This story only, or the storyteller's content generally? Which medium (wiki / newsletter / public web / funder deck)? Which audience? Time-bound? Publishing **beyond** the approved scope is a RED even if consent exists for something narrower.
3. **MEDIUM of consent.** Verbal consent IS a valid audit trail at ACT — but it must be *recorded*: who heard it, when, in what setting. If consent was verbal and nothing records it, capture that now; do not proceed on an unrecorded "I think they said yes."
4. **WHEN, and is it current?** Is the approval recent enough to still hold? Has anything changed (the person's circumstances, a withdrawal, a new sensitivity)?
5. **NAMES + PLACE NAMES verified.** Cross-check every personal and place name against `wiki/concepts/glossary.md` and the story-approval doc. This repo has a history of name drift (Oonchiumpa mis-named "Ntumba" across 9 files; "Rachel" not "Rachael"; "Christine" was wrong). A wrong name is a RED.
6. **Youth / vulnerable voice?** If any storyteller is a young person or vulnerable, the PICC selective-youth-voice rule applies: exclude by default, include only with explicit, specific consent.

## Stop conditions (any one → BLOCK)

- No recorded consent / no approval doc for this content.
- Publishing beyond the approved scope, medium, or audience.
- Any personal or place name unverified against the glossary/approval doc.
- Youth/vulnerable voice without explicit selective consent.
- Consent was verbal and there is no record of who heard it and when.

When blocked, say exactly what is missing and what would unblock it. **Never fabricate a name, date, quote, or consent detail to fill a gap.** If something is unknown, mark it `UNVERIFIED` and stop — an unverified gap surfaced is recoverable; a fabricated fact published is not.

## On GREEN — record the provenance

When all checks pass, write/append a short provenance note in the style of the existing `wiki/decisions/*-story-approval.md` records: who consented, authority holder, scope (medium + audience), consent medium + date, names verified against glossary, and the publish target. This is durable evidence (per the doc-lifecycle rule — evidence, not scaffolding), and it is the record the next publish of the same story will read first.

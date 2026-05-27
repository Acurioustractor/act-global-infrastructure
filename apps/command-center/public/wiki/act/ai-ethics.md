---
title: AI Ethics & Agent Strategy
status: Active
---

> Generated legacy mirror for command-center.
> Source of truth: `wiki/concepts/ai-ethics.md`.
> Regenerated: `2026-05-25T19:37:27.398Z` via `node scripts/wiki-sync-command-center-snapshot.mjs`.

# AI Ethics & Agent Strategy

> The best AI output is the one that gets out of the way and lets the right voice be heard.

## Overview

ACT's approach to AI is built on a single principle: AI serves community voice, it never replaces it. Every AI capability in the ecosystem must respect three composed gatekeepers, each owned by a different layer of the [[civic-operating-system|civic operating system]]:

- **Consent** lives in [[empathy-ledger|Empathy Ledger]] (consent state, AI-use ledger, audit trail)
- **Cultural authority and evidence quality** live in [[alma|Australian Living Map of Alternatives (ALMA)]] scoring methodology (the six dimensions; cultural-authority verification before any score is set)
- **Publication discipline** lives in [[governed-proof|Governed Proof]] (confidence rating, review trail, what can be shared with whom)

Efficiency is never a sufficient reason to bypass any of these. This is the operational expression of the [[civic-reflex-automation|Civic Reflex Automation]] thesis: gatekeeping reflexes are automated and verifiable; the human work (cultural authority, judgment, relationship) stays human.

This article covers the ethical framework, the internal agent roles, and what AI can and cannot do within ACT systems.

## Non-Negotiables

| Rule | Enforcement |
|------|-------------|
| **Cultural sovereignty is sacred** | OCAP enforced in code and practice |
| **No individual profiling** | System-level patterns only |
| **Sacred knowledge hard-blocked** | Cannot be processed, not just warned |
| **Community authority highest weight** | Overrides efficiency in decision paths |
| **Consent before analysis** | No opt-out model, explicit opt-in only |

## AI Under the Composed Gatekeepers

ALMA is the catalogue, not the gatekeeping process. The three gates above (consent, cultural authority and evidence quality, publication discipline) are each owned by a different layer and composed at runtime. The flow:

```
User/Community Input
        ↓
   Composed Gate (at intake)
   - Consent verified?         (Empathy Ledger)
   - Cultural authority?       (ALMA scoring methodology)
   - Evidence supported?       (ALMA scoring methodology)
        ↓
   AI Processing (if permitted)
        ↓
   Human + Community Review
   - Output safe?
   - Individual profiling avoided?
   - Value returned to community?
        ↓
   Composed Gate (at output)
   - Publication permitted?    (Governed Proof)
   - Confidence rating set?    (Governed Proof)
   - Audit trail written?      (Empathy Ledger AI-use ledger)
        ↓
   Output (with provenance, written to audit trail)
```

Each gate is a real check enforced by code in the relevant layer, not an aspirational principle. See [[civic-operating-system|the Civic Operating System concept page]] for how the layers compose.

## What AI Can Do

| Task | Conditions |
|------|------------|
| Summarize meetings | Consent from participants |
| Map relationships between projects | System-level only |
| Check consent scope before release | Automated gatekeeping |
| Draft content for review | Human review required |
| Assist with research synthesis | Attribution maintained |

## What AI Cannot Do

| Task | Reason |
|------|--------|
| Profile, rank, or optimize individuals | Dignity violation |
| Override community voice | Authority breach |
| Process sacred content | Cultural sovereignty |
| Generate final narratives | Human authority required |
| Make consent decisions | Community authority only |
| Analyze without explicit opt-in | Consent violation |

## Internal Agent Roles

ACT uses named agent roles to make AI responsibilities explicit:

| Agent | Role | Guardrails |
|-------|------|------------|
| **Scribe** | Summarizes meetings, captures next actions | Consent from participants, no profiling |
| **Cartographer** | Maps relationships between projects, stories, signals | System-level patterns only |
| **Evidence Steward** | Checks consent scope and shareability | Cannot override community decisions |
| **Studio Assistant** | Supports drafting and editing | Never owns the narrative |
| **Farmhand** | Orchestrates tasks, turns messy inputs into actions | Consent, authority, provenance, and review visible on outputs |

### The Farmhand Role

Farmhand is ACT's primary AI layer — the infrastructure that reduces admin and holds context. It turns messy inputs into clear next actions across the Knowledge Hub.

**Farmhand can:**
- Turn messy inputs into clear tasks
- Protect consent and cultural boundaries in summaries
- Connect LCAA steps to real work
- Keep consent, authority, provenance, and review status visible

**Farmhand cannot:**
- Profile individuals
- Override community voice
- Inflate claims or certainty
- Process without consent

> Intelligence without consent is just extraction. We would rather be slower than wrong.

## Implementation Checklist

For any new AI feature:

| Check | Required |
|-------|----------|
| OCAP principles respected? | Yes |
| Australian Living Map of Alternatives (ALMA) respected? | Yes |
| Individual profiling prevented? | Yes |
| Sacred content hard-blocked? | Yes |
| Community authority preserved? | Yes |
| Opt-in consent required? | Yes |
| Human review on outputs? | Yes |

## Future Development Principles

As AI capabilities grow, ACT maintains:

1. **Community veto** — Any AI use can be blocked by community decision
2. **Transparency** — What AI does is visible, not hidden
3. **Accountability** — Humans answer for AI outputs
4. **Reversibility** — AI decisions can be undone
5. **Locality** — Prefer local/open models where possible

## Backlinks

- [[civic-operating-system|Civic Operating System]] — the three-layer architecture this ethics framework composes across
- [[civic-reflex-automation|Civic Reflex Automation]] — the AI thesis these principles operationalise (automate the boring, amplify the art, never replace judgment)
- [[alma|ALMA]] — the catalogue layer; AI must respect its cultural authority and evidence-scoring methodology
- [[empathy-ledger|Empathy Ledger]] — the consent + audit + AI-use ledger layer
- [[governed-proof|Governed Proof]] — the publication gate AI outputs pass through
- [[governance-consent|Governance & Consent]] — consent architecture AI must respect
- [[ai-community-engagement|AI Community Engagement]] — broader AI use in community contexts
- [[transcript-analysis-method|Transcript Analysis Method]] — the concrete guardrail set for AI transcription and theme extraction

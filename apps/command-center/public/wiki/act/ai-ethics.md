---
title: AI Ethics & Agent Strategy
status: Active
---

> Generated legacy mirror for command-center.
> Source of truth: `wiki/concepts/ai-ethics.md`.
> Regenerated: `2026-04-13T22:30:25.620Z` via `node scripts/wiki-sync-command-center-snapshot.mjs`.

# AI Ethics & Agent Strategy

> The best AI output is the one that gets out of the way and lets the right voice be heard.

## Overview

ACT's approach to AI is built on a single principle: AI serves community voice, it never replaces it. Every AI capability in the ecosystem is gated by consent, aligned to [[alma|ALMA]], and subject to community override. Efficiency is never a sufficient reason to bypass these constraints.

This article covers the ethical framework, the internal agent roles, and what AI can and cannot do within ACT systems.

## Non-Negotiables

| Rule | Enforcement |
|------|-------------|
| **Cultural sovereignty is sacred** | OCAP enforced in code and practice |
| **No individual profiling** | System-level patterns only |
| **Sacred knowledge hard-blocked** | Cannot be processed, not just warned |
| **Community authority highest weight** | Overrides efficiency in decision paths |
| **Consent before analysis** | No opt-out model, explicit opt-in only |

## ALMA as Gatekeeper

All AI learning and ethics checks pass through [[alma|ALMA]]:

```
User/Community Input
        ↓
   ALMA Check
   - Consent verified?
   - Cultural sensitivity flagged?
   - Authority confirmed?
        ↓
   AI Processing (if permitted)
        ↓
   ALMA Review
   - Output safe?
   - Individual profiling avoided?
   - Value returned to community?
        ↓
   Community Review
        ↓
   Output
```

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
| **Farmhand** | Orchestrates tasks, turns messy inputs into actions | ALMA checks on all outputs |

### The Farmhand Role

Farmhand is ACT's primary AI layer — the infrastructure that reduces admin and holds context. It turns messy inputs into clear next actions across the Knowledge Hub.

**Farmhand can:**
- Turn messy inputs into clear tasks
- Protect consent and cultural boundaries in summaries
- Connect LCAA steps to real work
- Keep ALMA signals visible

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
| ALMA gatekeeper integrated? | Yes |
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

- [[alma|ALMA Framework]] — the impact and ethics model that gates all AI
- [[governance-consent|Governance & Consent]] — consent architecture AI must respect
- [[empathy-ledger|Empathy Ledger]] — the platform where AI consent settings live
- [[ai-community-engagement|AI Community Engagement]] — broader AI use in community contexts
- [[transcript-analysis-method|Transcript Analysis Method]] — the concrete guardrail set for AI transcription and theme extraction

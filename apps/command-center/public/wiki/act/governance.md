---
title: Governance & Consent (Operational)
status: Active
---

> Generated legacy mirror for command-center.
> Source of truth: `wiki/concepts/governance-consent.md`.
> Regenerated: `2026-04-13T11:58:00.951Z` via `node scripts/wiki-sync-command-center-snapshot.mjs`.

# Governance & Consent (Operational)

> Consent is a relationship, not a checkbox. Community authority is the default, not the exception.

## Overview

This article covers ACT's operational governance practices — how consent commitments are implemented in daily work, the shareability matrix teams use to make decisions, and the OCAP-aligned systems embedded in Empathy Ledger. For the conceptual and architectural argument for consent as infrastructure, see [[consent-as-infrastructure|Consent as Infrastructure]].

The two articles are complementary: consent-as-infrastructure asks "what must be built?" — this article asks "how do we work within it?"

## Core Commitments

| Commitment | What It Means |
|------------|---------------|
| **Consent is explicit** | No assumed permissions |
| **Consent is ongoing** | Renewable, not permanent |
| **Consent is revocable** | Withdrawal respected immediately |
| **Elder review required** | Where cultural protocols demand it |
| **Sacred knowledge protected** | Hard blocks, not warnings |
| **Partner nuance internal** | Sensitive detail stays private until reviewed |

## OCAP in Practice

ACT implements [OCAP principles](https://fnigc.ca/ocap-training/) in code and practice across all platforms:

| Principle | Implementation |
|-----------|----------------|
| **Ownership** | Communities own their collective data |
| **Control** | Communities control access and use decisions |
| **Access** | Communities can access their own data anytime |
| **Possession** | Data stays under community custody |

In daily work this means: Elder Review Systems for sacred content, ongoing consent with renewable expiry (6–12 months), cultural protocols configurable per organization, AI analysis only with explicit opt-in, and full data export available at any time.

## Shareability Matrix

Every document, story, or piece of content belongs in one of three categories. When in doubt, default to the more conservative tier.

| Level | Meaning | Examples |
|-------|---------|----------|
| **INTERNAL ONLY** | Working notes, partner nuance, sensitive detail | Draft documents, partner negotiations, personal details |
| **EXTERNAL-LITE** | System-level learnings without identifiers | Anonymized patterns, general insights, methodology |
| **EXTERNAL** | Explicit consent, cultural review, safe-to-share | Published stories, case studies, public reports |

### Before Sharing Externally

Ask:
- Is consent explicit and current?
- Has cultural review happened where required?
- Are identifiers removed or approved?
- Is the purpose clear and appropriate?
- Who benefits from this sharing?

## Community Authority

**Community authority carries the highest weight, even when it complicates delivery.**

| Scenario | Response |
|----------|----------|
| Elder says wait | We wait |
| Partner wants speed over safety | We slow down |
| Community questions approach | We revisit |
| Cultural protocol unclear | We ask, not assume |

## Consent Architecture in Empathy Ledger

### Five-Tier Permission Levels

1. **Sacred** — Hard-blocked, Elder review required
2. **Restricted** — Named individuals only
3. **Community Only** — Organization members
4. **Educational** — Approved educational use
5. **Public** — Open sharing with attribution

### Consent Records

Every story tracks:
- Consent scope (what can be shared)
- Consent giver (who approved)
- Consent date (when approved)
- Renewal date (when to check again)
- Cultural sensitivity level
- Revocation history

## Elder Review Workflow

When cultural protocols require Elder review:

1. **Flag** — Content marked for review
2. **Queue** — Added to Elder review queue
3. **Review** — Elder examines content
4. **Decision** — Approve / Restrict / Request changes
5. **Record** — Decision documented
6. **Apply** — Permissions updated

Elder decisions are final on cultural matters.

## AI and Consent

AI analysis requires explicit opt-in. The default is **No AI**.

| Setting | What It Means |
|---------|---------------|
| **No AI** | No automated analysis of content |
| **Internal AI Only** | ACT tools only, no external services |
| **AI Permitted** | Includes external AI services |

See [[ai-ethics|AI Ethics & Agent Strategy]] for the full AI consent framework.

## Partner Protocols

- Governance agreements before data sharing
- Clear boundaries on use
- Mutual accountability
- Regular review cycles
- Partner-specific nuance marked `[INTERNAL ONLY]`, not shared without partner review

## Project Governance Checklist

Every project should be able to answer:

| Question | Answer Required |
|----------|-----------------|
| Who holds authority here? | Named |
| How do we know? | Evidence |
| Is consent in place? | Yes/No/In progress |
| What's the handover plan? | Documented |
| What stays internal? | Listed |

## Backlinks

- [[consent-as-infrastructure|Consent as Infrastructure]] — the architectural and philosophical argument
- [[ocap-principles|OCAP Principles]] — the rights framework this operational model implements in daily work
- [[alma|ALMA Framework]] — impact model that respects consent boundaries
- [[empathy-ledger|Empathy Ledger]] — the platform where consent architecture lives
- [[ai-ethics|AI Ethics & Agent Strategy]] — AI-specific consent rules
- [[beautiful-obsolescence|Beautiful Obsolescence]] — governance as handover discipline
- [[transcript-analysis-method|Transcript Analysis Method]] — the concrete analysis pipeline that applies these consent gates to story processing
- [[visual-system|ACT Visual System]] — the visual discipline that makes consent and attribution legible across media use
- [[ways-of-working|Ways of Working]] — daily operational practice for applying review, shareability, and authority checks

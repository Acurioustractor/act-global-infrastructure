# Consent as Infrastructure

> Consent isn't a checkbox — it's an ongoing relationship that must be built into the foundation of any platform working with Indigenous communities.

## Overview

Most digital platforms treat consent as a permission event: a checkbox, a timestamp, a database field set to `true`. For platforms working with Indigenous communities and their narratives, this model is fundamentally inadequate.

This article documents the argument — first made by Benjamin Knight in February 2026, drawing on two years building [[empathy-ledger|Empathy Ledger]] with Aboriginal communities in Central Australia and Queensland — that consent must be treated as infrastructure. Not a feature layered on top of a system, but an architectural foundation that shapes database schemas, API design, query patterns, and deployment decisions.

The central provocation: **"Yes" isn't a boolean. It's a relationship that evolves over time.**

## Background: OCAP Principles

The framework that makes this argument legible is OCAP — **Ownership, Control, Access, Possession** — developed by the First Nations Information Governance Centre for Indigenous research contexts.

| Principle | Meaning |
|-----------|---------|
| **Ownership** | Communities own data about them, not the platforms that store it |
| **Control** | Communities direct how data is collected, used, and shared |
| **Access** | Communities decide who can see or use their data |
| **Possession** | Communities must be able to retrieve, delete, or move their data |

The critical insight: OCAP principles are not policy guidelines that can be added to an existing system. They are **architectural requirements**. You build them into the foundation or you don't have them.

## The Problem with Checkboxes

The standard platform consent model has four structural failures when applied to Indigenous data sovereignty:

1. **Binary** — You said yes once, so yes forever
2. **Global** — All uses of your data are treated identically
3. **Irrevocable** — Changing your mind requires a special process
4. **Invisible** — No audit trail of what you agreed to, or when

The question that exposed this in Empathy Ledger's early implementation came from an elder in Alice Springs: *"What if I change my mind?"*

The honest answer — contact admin, request removal, wait for manual processing — revealed that the system offered permission, not consent. And permission you can't easily revoke wasn't freely given in the first place.

## Five Types of Consent

Through practice with Aboriginal storytellers, a taxonomy emerged: consent is not one thing, but at least five distinct relationships requiring different technical implementation.

### 1. Collection Consent
*Can we record your story?*

This is closest to traditional consent — agreement before anything enters the system. It covers the recording method (audio, video, text, written) and can cascade to deletion if withdrawn.

### 2. Processing Consent
*Can AI analyze your story?*

Indigenous communities frequently distinguish between sharing a story and having it algorithmically processed. Some trust human listening but not machine analysis. Others have concerns about AI training on Indigenous knowledge. Processing consent is separate from collection consent, can be model-specific (e.g. approve Claude for theme extraction but not for training data), and is revocable without affecting the story itself.

### 3. Sharing Consent
*Who can see your story?*

This maps to a four-tier permission system:

- **Public** — discoverable by anyone
- **Community** — visible to organization members
- **Restricted** — limited to specific individuals or roles
- **Sacred** — highest cultural protocols, explicit authorization required

Critically, sharing consent is mutable. A storyteller might start public, then restrict after community feedback. The change history is tracked, including who changed it and why.

### 4. Attribution Consent
*How do you want to be named?*

This is not a privacy/transparency binary — it's control over identity presentation. Options include legal name, preferred name, community attribution ("Elder from Arrernte country"), or anonymity. Attribution can vary by context: public vs. research vs. internal use.

### 5. Syndication Consent
*Can your story appear on partner platforms?*

ACT works with partners like [[justicehub|JusticeHub]] and [[the-harvest|The Harvest]]. A storyteller might consent to internal use but not external syndication, or approve specific partners but not blanket distribution. Syndication consent is per-partner, revocable, and includes usage reporting back to the storyteller.

## The Technical Architecture

### Consent as a Separate Table

Rather than consent living as columns on a `storytellers` table, a dedicated `consent_records` table maintains a full audit trail:

```sql
CREATE TABLE consent_records (
  id UUID PRIMARY KEY,
  storyteller_id UUID NOT NULL REFERENCES storytellers(id),
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'collection', 'processing', 'sharing', 'attribution', 'syndication'
  )),
  consent_given BOOLEAN NOT NULL,
  consent_scope JSONB NOT NULL,   -- What specifically was consented to
  consent_version TEXT NOT NULL,  -- Which version of protocols
  granted_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Every consent change is logged via audit trigger — you never lose the history of what was agreed to.

### Consent Checked at Query Time

Rather than checking consent once at publication, it is checked every time a story is accessed. Consent changes take effect immediately across all systems — no cached assumptions, no propagation delay.

### The Consent Dashboard

Storytellers see and manage all five consent types through a plain-language dashboard. Each shows the current state, when it was set, and has a "Change" button that updates immediately without requiring admin approval.

*"Control isn't control if you need permission to exercise it."*

## What Changed in Practice

When Empathy Ledger rebuilt its consent model in mid-2025 (at the point of 240 storytellers and 335 stories), the outcome within the first month was telling: 12 storytellers changed consent settings — not because they regretted sharing, but because contexts changed. One moved from public to community after realizing family members weren't ready. Another enabled AI analysis after seeing how it worked. A third approved syndication to a specific partner.

The consent infrastructure worked as intended: consent evolved with relationships.

The performance cost of checking consent at query time is approximately 15ms per request. This is accepted as non-negotiable. Sovereignty isn't a feature you optimize away.

## Implications

### For Platform Design

Consent as infrastructure requires:
- Cultural protocols shaping database schemas, not just UI
- Performance optimizations that cannot compromise sovereignty
- Building for ongoing relationships, not one-time transactions
- Moving "at the speed of trust" rather than moving fast and breaking things

### For Indigenous Data Sovereignty

OCAP is not a policy layer — it is an architecture requirement. A platform cannot claim data sovereignty while:
- Treating consent as irrevocable
- Bundling all uses into one agreement
- Making revocation harder than granting
- Hiding consent history from storytellers

The technical choice to implement granular consent is a cultural choice to honor sovereignty.

## Open Questions

The consent model in Empathy Ledger is described by its own authors as still incomplete:

- **Inter-community consent:** When a story involves multiple communities, whose consent governs? The current model assumes individual storytellers, but some knowledge belongs to groups.
- **Platform control:** Even with perfect consent infrastructure, communities don't control the platform itself. True data sovereignty may require communities hosting their own infrastructure — currently being explored with [[the-harvest|The Harvest]].
- **Consent education:** Granular consent only works if storytellers understand what they're consenting to. Making permission levels legible to elders with limited tech exposure remains an active design challenge.

## Sources

- Raw: `wiki/raw/2026-04-07-el-consent-as-infrastructure.md`
- Author: Benjamin Knight, published February 5, 2026
- OCAP reference: First Nations Information Governance Centre — https://fnigc.ca/ocap-training/
- Implementation: `supabase/migrations/20260205_consent_infrastructure.sql`

## Backlinks

- [[empathy-ledger|Empathy Ledger]] — the platform where this model was built and tested
- [[indigenous-data-sovereignty|Indigenous Data Sovereignty]] — broader governance framework
- [[governance-consent|Governance & Consent (Operational)]] — day-to-day operating practices that apply the architecture in real work
- [[ocap-principles|OCAP Principles]] — Ownership, Control, Access, Possession
- [[third-reality|The Third Reality]] — the methodology consent infrastructure enables
- [[transcript-analysis-method|Transcript Analysis Method]] — the transcript pipeline that checks these consent boundaries before analysis and publication

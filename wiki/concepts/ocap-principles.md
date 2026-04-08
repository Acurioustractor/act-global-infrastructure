---
title: OCAP Principles
status: Active
---

# OCAP Principles

> Ownership, Control, Access, Possession — the four architectural requirements that make Indigenous data sovereignty possible rather than rhetorical.

## Overview

OCAP is the foundational framework for Indigenous data sovereignty, developed by the **First Nations Information Governance Centre (FNIGC)** in Canada in the late 1990s. The acronym stands for Ownership, Control, Access, and Possession — four principles that define how Indigenous communities must relate to data collected about them.

OCAP is not a policy checklist. It is an argument about power: that data is not neutral, that data systems encode values, and that Indigenous communities cannot be sovereign peoples while remaining objects of other people's data collection.

In ACT's practice, OCAP is the reason [[consent-as-infrastructure|consent is built into database architecture]] rather than added as a UI feature, and the reason [[empathy-ledger|Empathy Ledger]] was rebuilt in mid-2025 with granular, revocable, per-use consent.

## The Four Principles

### Ownership

> Communities own data about them, not the platforms that store it.

A First Nations community has collective ownership of the information derived from that community — not the researcher who collected it, not the government that funded the research, not the platform that stores it. This ownership is inherent and does not require legal registration. It cannot be transferred by signing a terms-of-service agreement.

Ownership means the community can determine what happens to their data, including destruction. If a community decides its data should be deleted, that right supersedes any institutional interest in preservation.

*In Empathy Ledger:* Stories belong to storytellers. The platform stores them, but cannot use them for purposes beyond those explicitly consented to. Full data export is available at any time. The platform is designed for fork and transfer.

### Control

> Communities direct how data is collected, used, and shared.

Control is collective: the community, not just individual members, has the right to direct data activities affecting the group. This includes research design, data collection methods, who has access, and what interpretive frameworks are applied.

Control is particularly important in research contexts. An individual community member may consent to participate in a study, but if the study's findings will be attributed to the community as a whole, the community has rights that override individual consent.

*In Empathy Ledger:* The five-type consent model (collection, processing, sharing, attribution, syndication) maps directly to the control principle. Processing consent — whether AI can analyse a story — is separate from collection consent. Some communities trust human listeners but not algorithmic processing. That distinction is real and the architecture honours it.

### Access

> Communities decide who can see or use their data.

Access rights are specific and hierarchical: different people within a community may have different access rights to different categories of information. Sacred knowledge may be restricted to ceremony holders. Historical records may have different protocols than current service data. The right of non-Indigenous researchers to access Indigenous data is not assumed.

Access is dynamic, not fixed. Access rights may change as relationships change, as governance evolves, or as cultural protocols require.

*In Empathy Ledger:* The four-tier sharing model (Public / Community / Restricted / Sacred) directly implements the access principle. Access changes are logged with timestamps and reasons. The Sacred tier enforces explicit authorisation requirements.

### Possession

> Communities must be able to retrieve, delete, or move their data.

Possession is the operational guarantee of ownership. Without the ability to physically access, move, or delete their data, ownership is symbolic. A community that owns data but cannot move it off a proprietary platform has nominal ownership and real dependency.

Possession includes the right to move data to community-controlled infrastructure — local hardware, federated systems, or self-hosted deployments — without losing access or having data corrupted in transit.

*In ACT's architecture:* The [[../technical/local-ai-architecture|Local AI Architecture]] plan for Palm Island is a direct expression of the possession principle. Local hardware, offline-capable models, and community-controlled backups ensure that possession is real, not promised.

## Origin: FNIGC and the Late 1990s

OCAP emerged from the First Nations Information Governance Centre (FNIGC) in Canada, developed as a response to the misuse of research data about Indigenous communities — data collected by government agencies and academic researchers, published without community review, used to justify policies that communities had no role in designing.

The principles were formalised in FNIGC's ongoing governance work and are now referenced internationally as the standard framework for Indigenous data sovereignty in research, health, and service delivery contexts.

OCAP is complemented by the **CARE principles** (from the Global Indigenous Data Alliance), which address the positive responsibilities of data custodians rather than the rights of communities:

| CARE Principle | Meaning |
|----------------|---------|
| **Collective benefit** | Data ecosystems should be designed for Indigenous peoples' benefit and innovation |
| **Authority to control** | Indigenous peoples must be recognised and empowered to govern their data |
| **Responsibility** | Those working with Indigenous data must nurture respectful relationships |
| **Ethics** | Indigenous peoples' rights and wellbeing should be the primary concern |

OCAP defines what communities are entitled to. CARE defines what data practitioners are obliged to do.

## OCAP as Architecture, Not Policy

The critical insight — first articulated in ACT's practice through [[consent-as-infrastructure|Consent as Infrastructure]] — is that OCAP principles cannot be implemented as policy overlays on existing systems. They must be built into foundations.

A platform that holds all data in a single proprietary database with no export mechanism can append an OCAP policy document, but it does not have OCAP-compliant architecture. Ownership and possession require data portability. Control requires granular, revocable consent at the data level. Access requires enforcement at the query level, not just at the UI level.

> "A platform cannot claim data sovereignty while treating consent as irrevocable, bundling all uses into one agreement, making revocation harder than granting, or hiding consent history from storytellers." — Consent as Infrastructure

## In ACT's Practice

OCAP shapes every data-touching system ACT builds:

| System | OCAP Expression |
|--------|-----------------|
| Empathy Ledger | Five-type consent, Sacred tier, full export, revocation dashboard |
| PICC Knowledge Base | Local hardware, Gemma 4 offline, Mukurtu cultural governance |
| JusticeHub | Community governance of intervention data, not just publication |
| The Harvest | Storyteller syndication consent per-partner, not blanket approval |

The gap that OCAP reveals in most government and research data systems — where Indigenous communities are objects of data collection rather than sovereigns of their own information — is the policy target that [[civicgraph|CivicGraph]] and the [[../concepts/third-reality|Third Reality]] methodology are designed to expose and reverse.

## Sources

- FNIGC: https://fnigc.ca/ocap-training/
- Consent as Infrastructure: `wiki/raw/2026-04-07-el-consent-as-infrastructure.md`
- Implementation: `supabase/migrations/20260205_consent_infrastructure.sql`

## Backlinks

- [[consent-as-infrastructure|Consent as Infrastructure]] — OCAP implemented as database architecture
- [[empathy-ledger|Empathy Ledger]] — platform built on OCAP foundations
- [[indigenous-data-sovereignty|Indigenous Data Sovereignty]] — broader governance framework including CARE and TK Labels
- [[governance-consent|Governance & Consent]] — operational shareability matrix and Elder review

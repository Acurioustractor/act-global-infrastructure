---
title: Agentic Publishing and Syndication
created: 2026-04-12
updated: 2026-04-12
status: draft
type: reference
tags:
  - handoff
  - project/living-ecosystem-system
  - publishing
  - syndication
  - content-automation
  - consent-governance
aliases:
  - Agentic Publishing System
  - Syndication and Content Automation
cssclasses: []
---

# Agentic Publishing and Syndication

> [!abstract] Purpose
> Reduce manual content effort across the Empathy Ledger content hub while preserving consent, cultural governance, and auditability.

## Current State

> [!info] Verified State
> The flagship public surface is live and browser-verified, and the supporting content system already has the primitives needed for an agentic publishing lane:
> - EL public content surface is showing the flagship pack on production.
> - Story generation already produces briefs, drafts, quotes, themes, and social-ready outputs in the system.
> - Consent checks and cultural safety gates already exist in the publishing pipeline.
> - Syndication revocation and verification flows already exist, so content can be removed and checked after release.

What is already operational:
- EL content hub can ingest transcript/story/media inputs and store derived outputs.
- Draft generation exists for story composition.
- Publishing can be scheduled.
- Syndication webhook delivery and retry logic exist.
- Story analytics and theme analytics can be queried from the support layer.

## Target State

The target system is a single publishing pipeline that turns one approved source packet into multiple governed outputs.

### Source Packet
- Approved transcript or story brief
- Consent state
- Cultural sensitivity state
- Selected media assets
- Canonical themes and quotes
- Distribution targets

### Outputs
- Editorial story draft
- Story feed item
- Media feed item
- Social share package
- Image explainer
- Video explainer
- Syndication payloads per channel

### Desired Shape
- One source of truth for story intent and approval.
- One set of generated derivatives per approval state.
- One publish decision with channel-specific formatting after governance checks.
- One audit trail for generation, human review, publication, and revocation.

## Automation Opportunities

### High-value automation
- Auto-generate story briefs from transcript analysis.
- Auto-generate story drafts from an approved brief.
- Auto-select hero images from approved media assets.
- Auto-generate social captions, titles, and excerpt variants per platform.
- Auto-generate image explainer copy and layout suggestions.
- Auto-generate video explainer scripts or scene prompts from the same brief.
- Auto-build syndication payloads from the canonical story packet.
- Auto-refresh scheduled publishing queues when approval state changes.

### Lower-risk automation
- Draft-only content generation before human approval.
- Platform formatting and truncation after human approval.
- Notification routing for review and publish readiness.
- Retrying webhook delivery and removal verification.

## Human Requirements / Decisions

> [!warning] Non-automatable decisions
> These require human judgment and should not be bypassed:
> - Sacred or highly sensitive content classification.
> - Elder review requirement or override.
> - Consent approval, consent withdrawal, or expiry handling.
> - Final public publish decision.
> - Which stories are allowed to syndicate to which external sites.
> - Brand/voice approval for public-facing copy.

Required human checkpoints:
- Approve the source packet before public generation.
- Review any content flagged as sacred, sensitive, or culturally restricted.
- Approve media assets before explainer generation.
- Confirm channel allowlist and distribution rules.
- Confirm revocation handling when a storyteller withdraws content.

## Syndication Rules

- No public syndication without valid consent.
- No public release when elder review is required and unresolved.
- No syndication of sacred content unless explicitly cleared by governance.
- Every output must carry provenance back to the source packet.
- Every webhook or external delivery must be tenant-scoped.
- Revocation must trigger downstream removal notifications and verification.
- Retry logic must be bounded and auditable.

## Testing / Verification Checklist

- [ ] Story brief generation produces the same themes/quotes as the approved transcript packet.
- [ ] Draft generation is blocked when consent is missing or expired.
- [ ] Draft generation is blocked when cultural safety requires elder review.
- [ ] Social share outputs are generated only from approved story state.
- [ ] Hero image selection only uses approved media assets.
- [ ] Video/image explainer generation uses canonical story data, not ad hoc text.
- [ ] Syndication payloads include tenant, story, and source references.
- [ ] Revocation triggers webhook delivery and downstream verification.
- [ ] Retry handling does not duplicate publishes or duplicate removals.
- [ ] Audit log entries exist for generation, approval, publish, and revoke actions.
- [ ] Full flow can be replayed from a single approved source packet.

## Notes

- The practical win is fewer manual handoffs between analysis, editorial, design, and distribution.
- The safety constraint is that automation can accelerate packaging, but it cannot replace consent, cultural governance, or final publication judgment.
- The next useful implementation step is to define the canonical source packet schema for story, media, and syndication outputs.

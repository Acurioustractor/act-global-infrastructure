---
title: ACT Brand / Design Readiness
date: 2026-04-12
status: draft
type: handoff
tags:
  - act
  - brand
  - design
  - readiness
  - ecosystem
---

# ACT Brand / Design Readiness

Goal: assess whether the ecosystem is ready to move from systems plumbing into one designed public surface.

## Verified Current Strengths

- The ACT hub already has a stable public shell: shared typography, sticky header, `site-surface` framing, and an earthy palette that reads like one system rather than a generic SaaS site. See [layout.tsx](/Users/benknight/Code/act-regenerative-studio/src/app/layout.tsx:1) and [page.tsx](/Users/benknight/Code/act-regenerative-studio/src/app/page.tsx:171).
- The ecosystem page explicitly states the design intent: one ecosystem, held together by place, method, and living memory. It also names the wiki as durable memory and Empathy Ledger as the live story layer. See [ecosystem/page.tsx](/Users/benknight/Code/act-regenerative-studio/src/app/ecosystem/page.tsx:18).
- Empathy Ledger is already syncing canonical flagship packs from the wiki, so the public project framing is shared rather than invented separately. See [PublicHomepage.tsx](/Users/benknight/Code/empathy-ledger-v2/src/components/public/PublicHomepage.tsx:70) and [PublicHomepage.tsx](/Users/benknight/Code/empathy-ledger-v2/src/components/public/PublicHomepage.tsx:201).
- The public copy on flagship pages already uses the same ACT language: LCAA, handover, community ownership, consent, and narrative sovereignty. See [JusticeHub/page.tsx](/Users/benknight/Code/act-regenerative-studio/src/app/justicehub/page.tsx:1) and [Empathy Ledger/page.tsx](/Users/benknight/Code/act-regenerative-studio/src/app/empathy-ledger/page.tsx:1).

## Verified Gaps

- The visual systems are still split. ACT hub pages use warm stone and green earth tones, while Empathy Ledger uses a cream/charcoal system with a dark resonance block and different ambient motion. Compare [layout.tsx](/Users/benknight/Code/act-regenerative-studio/src/app/layout.tsx:43) with [layout.tsx](/Users/benknight/Code/empathy-ledger-v2/src/app/layout.tsx:22).
- The composition systems are still repo-specific. ACT uses `PageHero`, `SectionHeading`, and `site-surface` patterns, while Empathy Ledger uses `HeroSection`, `ImpactNumbers`, `VoicesCarousel`, and a public homepage with a different hierarchy. See [ecosystem/page.tsx](/Users/benknight/Code/act-regenerative-studio/src/app/ecosystem/page.tsx:18) and [PublicHomepage.tsx](/Users/benknight/Code/empathy-ledger-v2/src/components/public/PublicHomepage.tsx:153).
- The public ecosystem is content-synced more than design-synced. The same canonical packs render through different visual grammars, so the network reads as related but not yet unified.
- Spoke pages still lean toward their own micro-brand styling. JusticeHub already proves this: it is coherent, but its blue-toned presentation still feels like a sibling product rather than a strict member of one ecosystem shell. See [justicehub/page.tsx](/Users/benknight/Code/act-regenerative-studio/src/app/justicehub/page.tsx:1).

## Inferred Opportunities

- Build one ACT ecosystem design layer: shared type scale, surfaces, spacing, card anatomy, and CTA hierarchy, then theme spokes by project.
- Create one reusable public framing pattern for `hub`, `spoke`, `archive`, and `sandbox` states so the map reads as an ecosystem, not a list.
- Make [[ACT Regenerative Studio]] the compositor shell and let [[Empathy Ledger]] and other spokes inherit the same public frame while keeping their own accent colors.
- Use the wiki-synced flagship packs as the content source, but standardize how those packs are displayed across sites.
- Align motion and ambient treatment across the network so the public surfaces feel like one ecosystem even when the projects have distinct emotional temperatures.

## Exact Page Priorities

1. [[ACT Regenerative Studio]] home and `/ecosystem` should become the design contract for the whole network.
2. [[Empathy Ledger]] home should be brought onto the same shell, spacing, and hierarchy model.
3. [[JusticeHub]] should be the first spoke page to prove the shared system works without flattening its own identity.
4. `Projects` index pages and flagship detail pages should adopt one shared card/detail template.
5. Archive and sandbox surfaces should be styled last, once hub/spoke rules are stable.

## Readiness Rubric

1. Fragmented - each repo feels independent and visually unrelated.
2. Connected - copy is aligned, but pages still look like separate products.
3. Coherent - shared primitives exist, but the ecosystem still reads as assembled.
4. Integrated - hub and spokes share one design language with clear thematic variation.
5. Ecosystem-native - every public surface feels like one system, with hub/spoke/archive/sandbox states legible at a glance.

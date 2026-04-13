---
title: The Harvest / Witta Harvest HQ
status: Active
date: 2026-04-11
entity_type: project
tagging_mode: own-code
canonical_slug: the-harvest
canonical_code: ACT-HV
website_slug: the-harvest
website_path: /harvest
public_surface: project
cluster: the-harvest
empathy_ledger_key: the-harvest
---

> Generated legacy mirror for command-center.
> Source of truth: `wiki/projects/the-harvest/the-harvest.md`.
> Regenerated: `2026-04-13T13:28:02.496Z` via `node scripts/wiki-sync-command-center-snapshot.mjs`.

# The Harvest / Witta Harvest HQ

> A regenerative community hub in Witta, QLD — seasonal kitchen, garden centre, workshops, and venue hire on the former Green Harvest site, bringing together local produce, native plants, and hands-on learning.

**Status:** Active | **Code:** ACT-HV | **Tier:** Ecosystem

## Overview

The Harvest (also known as Witta Harvest HQ) is a regenerative community hub located in Witta, Queensland (postcode 4552), operating from the former [[green-harvest-witta|Green Harvest]] site. It brings together a seasonal kitchen, a garden centre focused on native and productive plants for the Sunshine Coast, artisan workshops, and a flexible venue space — all grounded in regenerative land practice and local food culture.

The physical site sits on Witta Farm, which remains in Nic's trust and is leased to [[act-ecosystem|ACT]] for retreats, R&D, and community programs. This arrangement makes The Harvest both a public-facing community business and a core piece of ACT's operational infrastructure.

## Cluster Context

The Harvest should be read through the wider cluster in [[projects/the-harvest/README|The Harvest Cluster]]. The wiki holds the durable program and place logic, [[empathy-ledger|Empathy Ledger]] should hold the live seasonal stories and media, and the websites should compose that into `/harvest`, articles, and event/community pathways.

## Key People

The Harvest should hold only the people needed to explain the site's place logic, inheritance, and operating rhythm.

- [[nicholas-marchesi|Nicholas Marchesi OAM]] — land partner, co-founder, and the person whose Compendium turns the site into a place proposition rather than a venue brief
- [[barry-rodgerig|Barry Rodgerig]] — hinterland memory holder whose shed anchors the inheritance story of the place
- [[shaun-fisher|Shaun Fisher]] — ecological cycle and shell-return practice that makes LCAA tangible in the material build

The broader staff, supplier, and visitor network should remain on project, source, and EL layers until those figures become structurally important to multiple canonical pages.

## Key Details

- **Location:** Witta, QLD 4552 (former Green Harvest site)
- **Website:** [theharvestwitta.com.au](https://theharvestwitta.com.au)
- **Contact:** hello@theharvest.community
- **Trading hours:** Saturday–Sunday, 8am–2pm
- **Land arrangement:** Witta Farm held in Nic's trust, leased to ACT

## What's On Site

### Seasonal Kitchen
Breakfast and brunch service using local produce, operating within the weekend trading hours. The menu follows seasonal availability and reflects the surrounding food landscape of the Sunshine Coast hinterland.

### Garden Centre
Native and productive plants suited to the Sunshine Coast region — sourced and curated for home growers, community gardens, and regenerative smallholders.

### Workshops
Hands-on programs including pottery, food preserving, and gardening. These sit within ACT's broader R&D and community education mission.

### Venue Hire
Indoor-outdoor event space available for community gatherings, private events, and program delivery.

## Relationship to Green Harvest Witta

[[green-harvest-witta|Green Harvest Witta]] is part of the same location and project family. The Harvest builds on the legacy of Green Harvest — the original organic seed and gardening business that operated from this site — evolving it into a broader regenerative community hub.

The current ACT graph also makes two people particularly important to understanding that inheritance: [[barry-rodgerig|Barry Rodgerig]], whose shed holds the memory of the hinterland as working country, and [[shaun-fisher|Shaun Fisher]], whose oyster-shell cycle in the founding Compendium turns LCAA into a material return loop.

## LCAA Phase

**Action** — the hub is active, trading, and demonstrating regenerative practice in daily operation. The workshop and education programs extend into **Curiosity** and **Art** phases through hands-on learning and creative practice.

## Programs

### CSA (Community Supported Agriculture)
Seasonal produce shares, member subscriptions, and local farmer partnerships — reflecting the Jinibara Country land rhythms.

### Events
Seasonal gatherings, workshops, community markets, and venue hire running through the year.

### Enterprise Hub
Local business directory (businesses can claim and manage their profiles), maker pathways, and a business owner portal.

### Content Hub
The Harvest blog is served from the [[empathy-ledger|Empathy Ledger]] Content Hub via the EL syndication API — community stories and seasonal content flowing from EL into the Harvest website automatically.

## Infrastructure & Operations

### Digital Platform

| Detail | Value |
|--------|-------|
| **Live URL** | [theharvestwitta.com.au](https://theharvestwitta.com.au) |
| **Alternate** | harvest.act.place |
| **GitHub** | [act-now-coalition/theharvest](https://github.com/act-now-coalition/theharvest) |
| **Hosting** | Vercel (frontend) |
| **Framework** | Vite + React 19, TypeScript — unique in ecosystem (not Next.js) |
| **API layer** | tRPC + Express |
| **ORM** | Drizzle |
| **Router** | Wouter (lightweight) |
| **Storage** | AWS S3 (presigned URLs for media) |
| **Local dev** | `pnpm dev` → http://localhost:3004 |

The Harvest uses a deliberate lightweight stack — Vite rather than Next.js, Wouter rather than React Router — reflecting its role as a community-facing site rather than a complex application platform.

### Supabase Edge Functions

Five edge functions run on the custom Supabase instance:
- `app-user-sync` — user synchronisation across systems
- `admin-events` — event CRUD for admin panel
- `admin-businesses` — business directory management
- `business-claim` — business ownership claim workflow
- `newsletter-subscribe` — newsletter signups

### External Integrations

- **GHL CRM:** Pipeline "Harvest", tags: `harvest`, `witta`, `csa`, `events`. Location tracking enabled for Witta/Maleny contacts.
- **Xero:** Tracking category `HARVEST`, project codes `HARVEST-CSA`, `HARVEST-VENUE`, `HARVEST-EVENTS`.

### Community Management

Platform routes cover both public visitors and community members:

| Section | Routes | Purpose |
|---------|--------|---------|
| Public | `/`, `/visit`, `/whats-on`, `/venue-hire` | Visitor information |
| Community | `/stories`, `/witta`, `/enterprises` | Place-based content |
| Admin | `/admin`, `/admin/photos`, `/my-business` | Operator management |

## System Position

The Harvest is not only a venue or cafe concept. It is one of the public fronts where ACT's place, enterprise, and story systems meet:

- the wiki holds the durable place logic, operating frame, and relationship to [[act-farm|ACT Farm]]
- [[empathy-ledger|Empathy Ledger]] should carry the live seasonal stories, photos, and community voice
- the Harvest website should stay a focused spoke surface, not a second place where strategic truth gets rewritten by hand

That is why The Harvest needs to stay linked to [[living-website-operating-system|Living Website Operating System]] and to the Studio's wider economic logic in [[art/business/studio-business-model|Studio Business Model]].

## Key Source Bridges

- [Source Summary — The Harvest Index](../../sources/2026-04-07-cc-the-harvest-index.md)
- [Source Summary — ACT Farm Index](../../sources/2026-04-07-cc-the-farm-index.md)
- [Source Summary — Ways of Working](../../sources/2026-04-07-cc-act-ways-of-working.md)

## See Also

- [[green-harvest-witta|Green Harvest Witta]]
- [[act-farm|ACT Farm]]
- [[black-cockatoo-valley|Black Cockatoo Valley]]
- [[lcaa-method|LCAA Method]]

## Backlinks

- [[index|ACT Wikipedia]]
- [[nicholas-marchesi|Nicholas Marchesi OAM]] — co-founder, land partner, and founding Compendium author
- [[barry-rodgerig|Barry Rodgerig]] — Witta memory holder in the founding story
- [[lcaa-method|LCAA Method]]
- [[green-harvest-witta|Green Harvest Witta]]
- [[empathy-ledger|Empathy Ledger]] — content syndication source
- [[consent-as-infrastructure|Consent as Infrastructure]] — consent model for syndicated community stories and partner content
- [[place-land-practice|Place & Land Practice]] — land-based operating frame for the Witta site and its enterprise rhythm
- [[shaun-fisher|Shaun Fisher]] — shell-return loop and ecological practice carried into The Harvest
- [[projects/the-harvest/README|The Harvest Cluster]]
- [[wiki-project-and-work-sync-contract|Wiki Project & Work Sync Contract]]
- [[living-website-operating-system|Living Website Operating System]]
- [[art/business/studio-business-model|Studio Business Model]] — why the place layer must be legible as enterprise, invitation, and field support
- [[2026-04-act-farm-repositioning|Act-Farm Repositioning]] — The Harvest role in the farm repositioning
- [[five-year-cashflow-model|Five-Year Cashflow Model]] — Harvest revenue in the five-year projection
- [[fishers-oysters|Fishers Oysters]] — Shaun Fisher's oyster-shell return practice connecting The Harvest's founding story to regenerative aquaculture on Country

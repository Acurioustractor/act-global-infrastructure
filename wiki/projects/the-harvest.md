# The Harvest / Witta Harvest HQ

> A regenerative community hub in Witta, QLD — seasonal kitchen, garden centre, workshops, and venue hire on the former Green Harvest site, bringing together local produce, native plants, and hands-on learning.

**Status:** Active | **Code:** ACT-HV | **Tier:** Ecosystem

## Overview

The Harvest (also known as Witta Harvest HQ) is a regenerative community hub located in Witta, Queensland (postcode 4552), operating from the former [[green-harvest-witta|Green Harvest]] site. It brings together a seasonal kitchen, a garden centre focused on native and productive plants for the Sunshine Coast, artisan workshops, and a flexible venue space — all grounded in regenerative land practice and local food culture.

The physical site sits on Witta Farm, which remains in Nic's trust and is leased to [[act-ecosystem|ACT]] for retreats, R&D, and community programs. This arrangement makes The Harvest both a public-facing community business and a core piece of ACT's operational infrastructure.

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

## See Also

- [[green-harvest-witta|Green Harvest Witta]]
- [[act-farm|ACT Farm]]
- [[black-cockatoo-valley|Black Cockatoo Valley]]
- [[lcaa-method|LCAA Method]]

## Backlinks

- [[index|ACT Wikipedia]]
- [[lcaa-method|LCAA Method]]
- [[green-harvest-witta|Green Harvest Witta]]
- [[empathy-ledger|Empathy Ledger]] — content syndication source

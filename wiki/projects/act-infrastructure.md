---
title: ACT Infrastructure
status: Active
canonical_slug: act-infrastructure
canonical_code: ACT-IN
tier: ecosystem
website_slug: act-infrastructure
website_path: /projects/act-infrastructure
public_surface: project
cluster: act-infrastructure
---

# ACT Infrastructure

> The operational layer underneath the visible projects — internal tooling, technology, admin costs, and travel that keep the ecosystem running.

**Status:** Active | **Code:** ACT-IN | **Tier:** Ecosystem

## What it is

ACT Infrastructure is the operational backend for the ACT ecosystem. It is not a public-facing project — it is the substrate the public-facing projects sit on. Includes:

- **Tooling:** Command Center (`/Users/benknight/Code/act-global-infrastructure/apps/command-center`), shared scripts, alignment loop, daily cockpit, voice grader
- **Technology:** Supabase (3 instances — shared / EL v2 / media-only), Notion workspace, GHL CRM, Xero, Vercel deployments
- **Admin:** Internal operations, founder time on coordination, governance
- **Travel:** Cross-project visits, community trips, conference attendance

For finance purposes, anything that doesn't roll up to a specific public project (Goods, JusticeHub, Empathy Ledger, ACT Studio, the Farm, the Harvest) lands here under the Xero tracking category `ACT-IN — ACT Infrastructure`.

## Where the live picture lives

This page does not hold operational numbers. For the current state of the infrastructure layer, see:

- **CEO cockpit:** `wiki/cockpit/today.md` (regenerated daily 07:00 Brisbane)
- **Finance overview:** `apps/command-center/src/app/finance/overview/page.tsx` (live)
- **Money alignment:** `apps/command-center/src/app/finance/money-alignment/page.tsx` (live)
- **Weekly digest:** Telegram, Mon 8am (`scripts/weekly-reconciliation.mjs`)
- **Brain README:** `wiki/decisions/README.md` (architecture overview)

## Why this page exists as a stub

The website lint expects a wiki page for every ecosystem-tier project in `config/project-codes.json`. ACT-IN is genuinely ecosystem-tier (it's the operational layer the other ecosystem projects depend on) but it isn't a public destination. This stub satisfies the lint without forcing fake project copy onto the public homepage.

If a richer public-facing surface for "what runs the studio" is ever needed, expand here.

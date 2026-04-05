# Project Alignment Audit — 2026-04-06

Cross-referencing three data sources to identify misalignment:
1. **Notion Projects DB** — 70 projects with live statuses
2. **project-codes.json** — 69 canonical project codes  
3. **Wiki articles** — 39 articles in wiki/projects/

---

## Status Mismatches Between Notion and project-codes.json

These projects have DIFFERENT statuses between the two systems:

| Project | Notion Status | project-codes.json | Action Needed |
|---------|--------------|-------------------|---------------|
| Oonchiumpa | Archived | **active** | Update codes → archived? Or reactivate in Notion? |
| Diagrama | Active | **archived** | Update codes → active? Or archive in Notion? |
| SMART Recovery | Archived | **active** (ACT-SM) | Update codes → archived |
| SMART Connect | Sunsetting | **active** (ACT-SM same code) | Clarify: is SMART one project or three? |
| Designing for Obsolescence | Sunsetting | **active** | Update codes → sunsetting |
| The Harvest Witta | Sunsetting | **active** | Update codes → sunsetting? Or reactivate? |
| Contained | Ideation | **active** | Update codes → ideation? Or activate in Notion? |
| BG Fit | Ideation | **active** | Update codes → ideation? Or activate in Notion? |
| The Confessional | Ideation | **active** | Update codes → ideation? |
| Dad.Lab.25 | Ideation | **active** | Update codes → ideation? |
| Gold.Phone | Active | **active** | Aligned ✓ |
| TOMNET | Ideation | **archived** | Already archived in codes, still ideation in Notion |
| JusticeHub | Ideation | **active** | Codes say active, Notion says ideation — which is true? |
| Empathy Ledger | Transferred | **active** | What does "Transferred" mean here? Still active platform |
| Fishers Oysters | Transferred | **active** | Same question |
| Global Laundry Alliance | Transferred | **active** | Same question |
| Caring for those who care | Active | **active** | Aligned ✓ |
| PICC Storm Stories | Sunsetting | **archived** (ACT-SS) | Aligned (both winding down) |
| Mounty Yarns | Active | **active** | Aligned ✓ |

## Projects in Notion NOT in project-codes.json

These exist in Notion but have no canonical project code:

- BCV: Regenerative Conservation
- Bimberi - Holiday Programs  
- Black Cockatoo Valley HQ
- Cars and microcontrollers (has ACT-MC code, but Notion name differs)
- Deadly Homes and Gardens
- Festival Activations
- MMEIC - Justice Projects
- Olive Express
- PHN Board Role
- QFCC Empathy Ledger
- SEFA Partnership
- SXSW 2025
- The Double Disadvantage
- CivicScope (has ACT-CS code)
- Barkly Backbone (has ACT-BB code)
- Various internal/archived items

## Projects in project-codes.json NOT in Notion

- ACT-FG (Feel Good Project) — active in codes, not in Notion
- ACT-CB (Marriage Celebrant) — active in codes, not in Notion
- ACT-IN (ACT Infrastructure) — active in codes, not in Notion
- ACT-TR (Treacher) — ideation in codes, not in Notion

## Wiki Articles Without Clear Notion/Code Alignment

- `wiki/projects/civicgraph.md` — CivicGraph vs CivicScope (ACT-CS). Same thing?
- `wiki/projects/goods-on-country.md` vs `wiki/projects/goods.md` — Goods (ACT-GD) is one project, wiki has two articles
- `wiki/projects/the-harvest.md` vs `wiki/projects/green-harvest-witta.md` — same project family

## Supabase ecosystem_projects Table

Only 7 entries (very outdated):
- Goods (tier 1), JusticeHub (tier 1), Seeva (tier 1)
- ACT Studio (tier 2), Empathy Ledger (tier 2)
- ACT Farm (tier 3), Claude Bot (tier 3)

Last updated: 2026-01-25. Missing most projects. **Seeva** and **ACT Studio** don't appear in any other system.

---

## Recommended Alignment Actions

### 1. Decide on "Transferred" status
Notion uses "Transferred ✅" for Empathy Ledger, Fishers Oysters, Global Laundry Alliance, Murrup + ACT, RPPP. Does this mean community ownership transferred? If so, these should still be "active" in project-codes.json but tagged differently.

### 2. Sync Notion → project-codes.json statuses
Notion appears to be the most up-to-date source. Batch update project-codes.json:
- Oonchiumpa → archived (or clarify with team)
- SMART → archived
- Designing for Obsolescence → sunsetting
- The Harvest Witta → sunsetting (or reactivate?)
- JusticeHub → active (it IS active, Notion just hasn't been updated)

### 3. Clean up Supabase ecosystem_projects
This table is stale. Either:
a. Auto-sync from project-codes.json (preferred)
b. Delete and rebuild
c. Deprecate in favor of project-codes.json as canonical source

### 4. Merge duplicate wiki articles
- Delete `goods.md` (stub), keep `goods-on-country.md` (full article)
- Delete `green-harvest-witta.md` (stub), keep `the-harvest.md` (full article)

### 5. Add missing Notion projects to wiki
New articles needed for projects active in Notion but not in wiki:
- CivicScope (unless same as CivicGraph)
- Deadly Homes and Gardens
- MMEIC - Justice Projects
- Barkly Backbone
- Black Cockatoo Valley

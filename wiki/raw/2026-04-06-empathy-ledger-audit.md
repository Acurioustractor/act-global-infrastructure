# Empathy Ledger v2 — Project & Media Audit

**Date:** 2026-04-06
**EL Supabase:** yvnuayzslukamizrlhwb

## Current State

### Organizations (20 total)
All ACT partner orgs exist. ACT org is `db0de7bd-eb10-446b-99e9-0f3b7c199b8a`.

### Projects (40 total in `projects` table)
Good coverage — most ACT projects have matching EL projects.

### act_projects Registry (27 entries)
All entries have `organization_id = NULL` — need to link to ACT org.

### Media by Organization

| Organization | Slug | Photos | Org ID |
|-------------|------|--------|--------|
| PICC | palm-island-community-company | 2,611 | 084f851c |
| ACT | a-curious-tractor | 1,036 | db0de7bd |
| SMART Recovery | smart-recovery | 425 | 57046635 |
| JusticeHub | justicehub | 301 | 0e878fa2 |
| Oonchiumpa | oonchiumpa | 276 | c53077e1 |
| June Canavan Foundation | june-canavan-foundation | 118 | 460955e2 |
| Orange Sky | orange-sky | 38 | 1d542d98 |
| Diagrama | diagrama | 20 | fbe80fa6 |
| Confit Pathways | confit-pathways | 13 | f7f70fd6 |
| BG Fit | bg-fit | 0 | cb749bd5 |
| Mounty Yarns | mounty-yarns | 0 | e08b256c |
| Fishers Oysters | fishers-oysters | 0 | d44703a8 |
| TOMNET | tomnet | 0 | 087e9e7e |
| **TOTAL** | | **4,838** | |

## Gaps Identified

### 1. act_projects.organization_id is NULL for all entries
Need to link each act_project to the ACT organization (db0de7bd).

### 2. Missing projects in EL
These ACT projects exist in project-codes.json but NOT in EL projects table:
- Diagrama (exists as "Diagrama Youth Support" under diagrama org — correct)
- CivicScope/CivicGraph — NO EL project
- ACT Farm — NO EL project (has The Harvest but not The Farm)
- Barkly Backbone — NO EL project

### 3. Art projects need tagging
No art-specific tagging system exists. Need:
- A way to tag projects as "art" type
- Art projects: Uncle Allan, CONTAINED, The Confessional, Gold.Phone, Regional Arts, Mounty Yarns
- Each art project needs: cover image, description, exhibition history

### 4. Projects with 0 photos need initial media
- BG Fit (0 photos) — likely has photos somewhere
- Mounty Yarns (0 photos)
- Fishers Oysters (0 photos)
- TOMNET (0 photos)

### 5. Media not tagged by project_code
Most media uses organization_id but not project_code field. The project_code enum only has 7 values: empathy-ledger, justicehub, act-farm, harvest, goods, placemat, studio.

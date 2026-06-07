# Ticket: Consolidate to one CRM spine — Organisations → People → Funds → Impact

- **Date:** 2026-05-27
- **Source:** Goods Enterprise HQ build (Goods Asset Register) — "one logical setup, no duplication"
- **Owner:** act-infra / CRM + finance sync
- **Priority:** Medium-High (blocks clean funder reporting + Goods finance rollup)

## Problem
There are **two parallel CRM stacks** in Notion, plus a funds layer that lives only in Supabase. An organisation's identity, its people, its money and its impact are scattered and re-keyed, which is the root cause of the figure drift seen in the funder work.

## Evidence (audit 2026-05-27)
**Stack A — legacy, human-curated (under "Archived"):**
- Organisations `948f3946` (collection `9ce23468`) ↔ People `47bdc1c4` (collection `44139ffe`, rich: 100s of roles, Org-filtered views) ↔ Opportunities `234ebcf9`.
- Has curated org pages + dashboards (Snow, Centrecorp, Fairfax, PICC "PICCxACT Partnership Dashboard", Minderoo, Brian M Davis, June Canavan). Mostly created Sept 2025. NOT Supabase-fed.

**Stack B — sync-generated, Supabase-fed (the recommended spine):**
- Organisations `361ebcf9…edc9` (`NOTION_ORGANISATIONS_DB_ID`) ↔ Contacts `360ebcf9…e1b7` (`NOTION_CONTACTS_DB_ID`) ↔ Opportunities `361ebcf9…f1e2`.
- Source: Supabase view `v_canonical_contacts` = **2,286 contacts / 157 orgs / 75 with `xero_contact_id`**. Contacts carry cross-system join keys `Xero Contact ID` + `EL Profile ID`.
- **All Goods funders present:** Snow, Centrecorp, Tim/Vincent Fairfax, PICC, Homeland, The Funding Network, FRRR, AMP Foundation, Rotary, Julalikari, Our Community Shed, QIC.
- EL Stories DB `361ebcf9…8117` already RELATES to Stack B Organisations (impact↔org done).

**Funds:** no Notion DB relates funds to orgs. Funds↔org exists only in Supabase (`xero_invoices.xero_contact_id` / `contact_name`, `project_funding_allocations`). Funder reporting pages match by fuzzy `contact_name` string (Knowledge Hub DS `a94a4038`).

## Decision
Make **Stack B canonical**. Migrate Stack A's human curation into it, then archive Stack A. Goods becomes **filtered views**, not parallel DBs.

## Target model (4 layers, joined by relations)
```
Organisations (Stack B 361ebcf9…edc9)
  ├──< Contacts/People (360ebcf9…e1b7)            who   [relation exists]
  ├──< Funds: Money-In invoices + Opportunities    money [ADD relation, join on Xero Contact ID]
  └──< Impact: EL Stories + funder reporting pages  proof [Stories done; relate funder pages]
```
Open any Organisation → its People, its Funds (every payment + pipeline), its Impact (stories + report).

## Migration steps (sequenced; do relation-adds BEFORE archiving A)
1. **Confirm canonical** = Stack B Organisations `361ebcf9…edc9` + Contacts `360ebcf9…e1b7`.
2. **Add the Funds layer:** create (or relate) a Money-In invoices DB synced from `xero_invoices`, with an **Organisation relation** resolved via `xero_contact_id` (already mirrored onto Contacts). Relate Opportunities `361ebcf9…f1e2` to Organisations too (today funder/project are plain text on the opp side).
3. **Relate funder reporting pages** (Knowledge Hub `a94a4038`) to canonical Organisations instead of the fuzzy `contact_name` string.
4. **Migrate Stack A curation** (partnership dashboards + context pages — Brian M Davis, Minderoo, June Canavan, PICCxACT, etc.) onto the matching Stack B org pages; then archive Stack A DBs `948f3946` / `47bdc1c4` / `234ebcf9`.
5. **Rebuild Goods Enterprise HQ** §2 (Money In ledger), §4 (Grants), §5 (Sales) as **filtered views** on the canonical DBs (`Project contains ACT-GD`); retire the standalone Goods DBs `fb04368a` / `75be774d` / `68ca4ed0` once views replace them.
6. **Wire the 4 CRM syncs into cron:** add `sync-organisations-to-notion`, `sync-canonical-contacts-to-notion`, `sync-el-stories-to-notion`, `sync-funder-reporting-to-notion` to `scripts/sync-money-stack.mjs` STEPS so Notion auto-refreshes.
7. **Pre-req:** land the drawdown/`project_code` backfill fix (ticket `2026-05-27-goods-xero-project-tagging-cleanup.md`) FIRST, so the funds layer is built on de-voided data.

## Acceptance criteria
- One Organisations DB, one People/Contacts DB (others archived).
- Funds (invoices + opportunities) relate to Organisations; opening an org shows its money + people + stories.
- Goods Enterprise HQ surfaces are filtered views on the canonical DBs, not separate DBs.
- The 4 CRM syncs run on the cron.

## Cross-refs
- Goods finance reconciliation + void/backfill fix: `thoughts/shared/finance/2026-05-27-goods-xero-project-tagging-cleanup.md`
- Goods Enterprise HQ build (Notion): "Enterprise HQ: Build Workspace" + its Money-In ledger / Grants / Sales DBs (to become views).

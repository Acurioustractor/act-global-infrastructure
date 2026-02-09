# Session Handoff — ACT Strategic Dashboard + Xero Integration

## Where we left off

We've built out 7 new dashboard pages and API routes for the Command Center (`apps/command-center`), created a combined database migration, and fixed all the code to use real Xero data instead of mock data. The **one remaining blocker** is applying the migration to the correct Supabase project.

## What's done

### Database migration file (ready to apply)
- **`supabase/migrations/20260207_combined_apply.sql`** — Combined migration with 22 tables, 10 views, RLS policies, triggers, and seed data. Covers both the Xero integration tables AND the strategic systems tables. Needs to be applied to `tednluwflfhxyucgwigh`.

### MCP config (just updated)
- **`.claude/mcp.json`** now has `supabase-db` pointing at project ref `tednluwflfhxyucgwigh` using `${SUPABASE_ACCESS_TOKEN}`. Named `supabase-db` (not `supabase`) to avoid the known bug where Claude overrides stdio config with built-in OAuth.

### 7 Dashboard pages built (all mock data removed)
1. `apps/command-center/src/app/finance/cashflow/page.tsx` — Cash Flow Intelligence
2. `apps/command-center/src/app/finance/revenue/page.tsx` — Revenue Streams
3. `apps/command-center/src/app/finance/debt/page.tsx` — Property Payoff Tracker
4. `apps/command-center/src/app/assets/page.tsx` — Asset & Property Register
5. `apps/command-center/src/app/team/page.tsx` — Staff & Resource Allocation
6. `apps/command-center/src/app/admin/page.tsx` — Admin & Compliance
7. `apps/command-center/src/app/business-dev/page.tsx` — Business Dev & R&D

### 7 API routes (Xero schema aligned)
1. `apps/command-center/src/app/api/cashflow/route.ts` — Queries `financial_snapshots`, `xero_transactions` (using `total`, `RECEIVE`/`SPEND`), `xero_invoices` (using `total`, `amount_due`, `ACCREC`/`ACCPAY`), `subscriptions`, `cashflow_scenarios`
2. `apps/command-center/src/app/api/revenue-streams/route.ts`
3. `apps/command-center/src/app/api/assets/route.ts`
4. `apps/command-center/src/app/api/debt/route.ts`
5. `apps/command-center/src/app/api/team/route.ts`
6. `apps/command-center/src/app/api/compliance/route.ts`
7. `apps/command-center/src/app/api/business-dev/route.ts`

### Navigation updated
- `apps/command-center/src/components/top-nav.tsx` — Two-column Operations dropdown with Finance & Assets + Systems columns
- `apps/command-center/src/lib/api.ts` — 7 typed fetch functions added

## What needs to happen next

### 1. Apply the migration (FIRST PRIORITY)
Test that the new `supabase-db` MCP is working by running:
```
mcp__supabase-db__get_project_url
```
It should return `https://tednluwflfhxyucgwigh.supabase.co`. If it does, apply the migration:
```
mcp__supabase-db__apply_migration with the contents of supabase/migrations/20260207_combined_apply.sql
```
If the MCP isn't available, the user can paste the SQL directly into https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql

### 2. Run the Xero sync to populate real data
After tables exist, the Xero sync scripts need to run to populate `xero_invoices` and `xero_transactions`:
- `scripts/sync-xero-to-supabase.mjs` — syncs invoices
- `scripts/sync-xero-bank-feed.mjs` — syncs bank transactions
These use `SUPABASE_SHARED_URL || NEXT_PUBLIC_SUPABASE_URL` from env, which resolves to `tednluwflfhxyucgwigh`.

### 3. Verify the dashboard end-to-end
Start the Command Center (`cd apps/command-center && pnpm dev`) and check that the Finance pages show real Xero data flowing through.

### 4. Strategic systems migration was applied to WRONG database
The earlier `20260207000000_strategic_systems.sql` was applied via MCP to `uaxhjzqrdotoahjnxmbj` (wrong project). The combined migration file uses `CREATE TABLE IF NOT EXISTS` so it's safe to re-run on the correct database. The tables on `uaxhjzqrdotoahjnxmbj` can be cleaned up later or ignored.

## Key database details
- **Correct project:** `tednluwflfhxyucgwigh.supabase.co` (ACT primary — Command Center, Xero sync, personal-ai all use this)
- **Wrong project (MCP was pointing here):** `uaxhjzqrdotoahjnxmbj.supabase.co`
- **Shared/EL project:** `yvnuayzslukamizrlhwb.supabase.co`
- **Command Center env:** `apps/command-center/.env.local` has correct URL + service role key

## Xero table schema (important for API routes)
- `xero_transactions`: `total` (not `amount`), `type` is `RECEIVE`/`SPEND`/`TRANSFER`
- `xero_invoices`: `total`, `amount_due`, `amount_paid`, `type` is `ACCREC`/`ACCPAY`, `status` is uppercase (`DRAFT`/`SUBMITTED`/`AUTHORISED`/`PAID`/`VOIDED`/`DELETED`)

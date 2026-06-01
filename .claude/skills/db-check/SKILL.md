---
name: db-check
description: Query actual database schema before writing any query, migration, or API endpoint. Prevents wrong column names — the #1 recurring bug across sessions.
---

# Database Schema Check

**Run this BEFORE writing any query, migration, or API endpoint.**

## Step 1: Identify Target Tables

List every table your implementation will touch (read or write).

## Step 2: Query Actual Schema

For EACH table, run via Supabase MCP:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = '<TABLE>'
ORDER BY ordinal_position;
```

## Step 3: Check Constraints

For tables you'll be upserting into:

```sql
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = '<TABLE>'
ORDER BY tc.constraint_type, kcu.column_name;
```

## Step 4: Check for Existing Views

```sql
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name LIKE 'v_%<keyword>%';
```

If a view already does what you need, use it instead of writing a complex join.

## Step 5: Print Summary

Before writing any implementation code, print:

```
Schema for <table>:
- column_name (data_type, nullable/required, default)
- ...
Primary key: <column>
Unique constraints: <columns>
Existing views: <any matching views>
```

## Money tables — extra checks (`xero_invoices` / `xero_transactions` / `bank_statement_lines`)

Before any query that emits a dollar figure:

- **Column traps:** `xero_invoices.type` (NOT `invoice_type`); PK is `xero_id`; `xero_transactions` has no `reference`. BAS-excluded items live in `line_items[]->>tax_type='BASEXCLUDED'`.
- **Always exclude voided rows:** `xero_transactions` voids are `status='DELETED'`; **`xero_invoices` carry BOTH `'DELETED'` and `'VOIDED'`** (FY26: 96 VOIDED vs 23 DELETED). Filter them NULL-safely (`status IS DISTINCT FROM 'DELETED' AND status IS DISTINCT FROM 'VOIDED'` for invoices; DELETED-only for transactions) from every money read — or use an allow-list (`status IN ('AUTHORISED','PAID')`). Voided rows once inflated the R&D claim ~$32K.
- **Never SUM money through supabase-js:** the PostgREST 1000-row cap silently truncates `.select()` at 1000 rows. Aggregate in SQL (`execute_sql` / `psql`) — SQL `SUM()` is not capped.
- **Two-account rule:** ACT project totals include only **NAB Visa ACT #8815** + **NJ Marchesi T/as ACT Everyday** (exclude `NM Personal` / `NJ Marchesi T/as ACT Maximiser`).
- **Verify against the canonical P&L:** reconcile any project/org total against `project_monthly_financials`.

→ Full money guards: `.claude/skills/tag-transactions/SKILL.md` + memory `command-center-finance-truth.md`.

## Rules

- **NEVER assume column names from memory, grep, or context** — always verify here
- **Check NOT NULL columns without defaults** — these will cause silent insert failures
- **Check unique constraints** — wrong onConflict columns cause upsert bugs
- **If a column doesn't exist, STOP** — don't guess alternatives, query the schema

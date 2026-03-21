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

## Rules

- **NEVER assume column names from memory, grep, or context** — always verify here
- **Check NOT NULL columns without defaults** — these will cause silent insert failures
- **Check unique constraints** — wrong onConflict columns cause upsert bugs
- **If a column doesn't exist, STOP** — don't guess alternatives, query the schema

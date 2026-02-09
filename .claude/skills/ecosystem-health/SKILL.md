---
name: ecosystem-health
description: Check ecosystem data quality and alignment scores across all data sources. Use when user says "ecosystem health", "data quality", "alignment scores", or "how aligned is the data".
---

# Ecosystem Health Check

Audit data quality across the ACT ecosystem.

## Workflow

### Step 1: Query Data Quality Scores

Use Supabase MCP to query `v_data_quality_scores`:

```sql
SELECT * FROM v_data_quality_scores;
```

### Step 2: Show Alignment Report

Present a table with:
- Source name
- Total records
- Tagged records
- Percentage tagged
- Status indicator (green > 70%, amber 40-70%, red < 40%)

### Step 3: Identify Top Gaps

Query top untagged vendors:

```sql
SELECT * FROM v_top_untagged LIMIT 15;
```

### Step 4: Suggest Actions

Based on gaps, recommend:
- If GHL opportunities < 50% tagged: suggest `/align-ghl`
- If subscriptions < 80% tagged: suggest running `node scripts/backfill-subscription-projects.mjs`
- If transactions < 50% tagged: suggest `/tag-transactions`
- If project_health is stale: suggest `node scripts/compute-project-health.mjs --apply`

### Step 5: Run Scripts (if user approves)

Execute suggested scripts with `--apply` flag after user confirmation.

### Step 6: Verify Improvement

Re-query `v_data_quality_scores` and show before/after comparison.

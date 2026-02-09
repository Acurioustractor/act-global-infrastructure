---
name: tag-transactions
description: Review and tag untagged Xero transactions with project codes. Use when user says "tag transactions", "fix transaction tagging", or "improve transaction coverage".
---

# Tag Transactions

Review and tag untagged Xero transactions by vendor matching.

## Workflow

### Step 1: Show Current Stats

```bash
node scripts/tag-transactions-by-vendor.mjs --stats
```

### Step 2: Identify Gaps

Query the top untagged vendors:

```bash
node scripts/tag-transactions-by-vendor.mjs
```

This shows what would be tagged and by which rule (vendor match, tracking match, or keyword match).

### Step 3: User Review

Present:
- Current coverage percentage
- How many transactions would be tagged
- Top vendors and their suggested project codes
- Any ambiguous matches that need manual decision

### Step 4: Apply (after user approval)

```bash
node scripts/tag-transactions-by-vendor.mjs --apply
```

### Step 5: Also Tag Subscriptions (if needed)

Check if subscriptions need tagging:

```bash
node scripts/backfill-subscription-projects.mjs
```

If there are untagged subscriptions, ask user to approve and apply.

### Step 6: Refresh and Verify

```bash
node scripts/compute-project-health.mjs --apply
```

Report the new data quality scores.

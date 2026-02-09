---
name: align-ghl
description: Run the GHL alignment script to review and tag opportunities with project codes. Use when user says "align ghl", "tag opportunities", or "link opportunities to projects".
---

# Align GHL Opportunities

Tag GHL opportunities with project codes from project-codes.json.

## Workflow

### Step 1: Dry Run

```bash
node scripts/align-ghl-opportunities.mjs
```

Show the output to the user. Review the auto-assign, needs-review, and no-match categories.

### Step 2: User Review

Present a summary:
- How many will be auto-assigned (confidence > 0.7)
- How many need manual review (0.3-0.7)
- How many have no match

Ask the user if they want to proceed with auto-assignments.

### Step 3: Apply (after user approval)

```bash
node scripts/align-ghl-opportunities.mjs --apply
```

### Step 4: Refresh Health Scores

After tagging, refresh project health:

```bash
node scripts/compute-project-health.mjs --apply
```

### Step 5: Verify

Query the data quality view to confirm improvement:

```bash
# Use Supabase MCP to query v_data_quality_scores
```

Report the new alignment percentages.

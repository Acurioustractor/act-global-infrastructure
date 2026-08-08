---
name: sync-storytellers
description: Syncs storyteller records from Empathy Ledger v2 into GoHighLevel as tagged contacts, then links them back with story counts and storyteller and elder flags. Use when the user wants storytellers pushed into GHL, GHL contacts refreshed from Empathy Ledger, or the two systems brought back into step. Also use on /sync-storytellers. This writes to GHL, so treat it as a change to an external system of record.
---

# /sync-storytellers - Empathy Ledger v2 → GHL Sync

Sync storyteller data from Empathy Ledger v2 to GHL contacts.

## Description

Two-step sync:
1. **Sync** — Push EL v2 storytellers into GHL as contacts with tags
2. **Link** — Update `ghl_contacts` table with stories_count, is_storyteller, is_elder fields

## Usage

```bash
# Full sync (both steps)
/sync-storytellers

# Dry run (preview only)
/sync-storytellers --dry-run

# Limit to N storytellers (testing)
/sync-storytellers --limit 10

# Link step only (skip GHL push)
/sync-storytellers --link-only
```

## Implementation

```bash
# Step 1: Sync storytellers to GHL
node scripts/sync-storytellers-to-ghl.mjs [--dry-run] [--limit N] [--force]

# Step 2: Link storytellers to ghl_contacts
node scripts/link-storytellers-to-contacts.mjs
```

## Environment

Requires:
- `EL_SUPABASE_URL` — Empathy Ledger v2 Supabase URL
- `EL_SUPABASE_SERVICE_KEY` — EL v2 service role key
- `GHL_API_KEY` — GoHighLevel API key
- `GHL_LOCATION_ID` — GoHighLevel location ID

## Schedule

Runs daily at 4:30am AEST (sync) and 4:45am AEST (link) via PM2 cron.
See `ecosystem.config.cjs`.

## Strategic Context

Core to ACT mission: storytellers OWN their data. The Empathy Ledger v2 is the
source of truth for storyteller profiles. This sync ensures GHL CRM reflects
current storyteller engagement (stories_count, elder status, etc).

## Related

- `/enrich` — Full contact enrichment cycle
- `scripts/sync-storytellers-to-ghl.mjs` — GHL push script
- `scripts/link-storytellers-to-contacts.mjs` — Database link script

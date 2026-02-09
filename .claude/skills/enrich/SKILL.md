# /enrich - Contact Enrichment Cycle

Run the full contact enrichment pipeline to keep relationship data fresh.

## Description

Runs 5-step enrichment cycle:
1. Link communications to contacts
2. Consolidate identity records
3. Update last contact dates
4. Generate relationship alerts
5. Show quality report

## Usage

```bash
# Full enrichment cycle
/enrich

# Brief report only (skip heavy steps)
/enrich --brief
```

## Implementation

```bash
# Full cycle
node scripts/contact-enrichment-cycle.mjs

# Brief report only
node scripts/contact-enrichment-cycle.mjs --brief-only
```

## Output

- Contact-communication links updated
- Identity records consolidated (dedup)
- Relationship health recalculated (hot/warm/cool)
- Stale relationship alerts generated
- Quality report with stats

## Schedule

Runs weekly via Ralph agent, or manually via this skill.
Also available as PM2 cron — see `ecosystem.config.cjs`.

## Related

- `/enrich-project` — Deep enrichment for a specific project
- `/sync-storytellers` — Sync Empathy Ledger storytellers to GHL
- `scripts/contact-enrichment-cycle.mjs` — Source script

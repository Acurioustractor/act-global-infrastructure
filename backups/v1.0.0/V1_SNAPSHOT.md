# ACT Ecosystem V1.0.0 Database Snapshot

**Created:** 2026-01-26T05:19:37Z
**Branch:** main
**Supabase Project:** tednluwflfhxyucgwigh

---

## Data Counts at V1 Lock

| Table | Count |
|-------|-------|
| agents | 13 |
| agent_task_queue | 5 |
| agent_proposals | 44 |
| ghl_contacts | 867 |
| relationship_health | 859 |
| communications_history | 8,468 |
| calendar_events | 523 |
| canonical_entities | 14,079 |
| entity_identifiers | 28,986 |
| knowledge_chunks | 289 |
| agentic_projects | 42 |
| agentic_tasks | 16 |

---

## Files in this Backup

- `schema.sql` - Full database schema (1.3MB)
- `V1_SNAPSHOT.md` - This snapshot document

---

## Integration Status at V1 Lock

| Integration | Status |
|-------------|--------|
| GoHighLevel | Connected |
| Google Calendar | Connected |
| Gmail | Connected |
| Xero | Connected |
| Notion | Connected |

---

## Financial Position at V1 Lock

- **Net Cash:** $47,475.24
- **Receivable:** $156,116.25
- **Payable:** $108,641.01

---

## Restore Instructions

```bash
# To restore schema to a new Supabase project:
psql postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres < schema.sql

# Note: Data should be re-synced from source systems (GHL, Xero, etc.)
# after schema restore, using the sync scripts in scripts/
```

---

## Tags Created

- `act-global-infrastructure`: v1.0.0
- `act-intelligence-platform`: v1.0.0
- `act-regenerative-studio`: v1.0.0

---

*V1 Backup Complete*

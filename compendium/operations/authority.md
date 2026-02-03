# ACT Infrastructure — Authority & Consent

## Authority Check

| Question | Answer |
|----------|--------|
| **Who holds authority?** | ACT core team (Ben, Nic) |
| **How do we know?** | Infrastructure serves the ecosystem — authority delegated to individual projects for their domains |
| **Consent in place?** | Data access follows project-level consent. No backdoor access to storyteller data. |
| **Handover plan?** | Everything documented in wiki. Scripts self-describing. Architecture designed for another team to run. |

## Data Access Principles

Infrastructure touches data from every project, but follows strict principles:

1. **No backdoor access** — Storyteller data accessed via Empathy Ledger's consent-gated APIs
2. **Aggregate, don't profile** — Dashboard shows counts and health scores, not individual tracking
3. **Project autonomy** — Each project controls its own data. Infrastructure coordinates, not controls.
4. **Audit trail** — API usage logged to `api_usage` table for transparency

## Security

- Environment variables for all credentials (never hardcoded)
- Supabase RLS policies enforced at database level
- Separate Supabase projects for separate concerns
- No production data in development environments

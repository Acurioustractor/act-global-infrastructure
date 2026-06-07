# Provenance — ACT GHL & CRM World-Class Audit (2026-05-29)

Sidecar for `2026-05-29-act-ghl-crm-world-class-audit.md`.

## How it was produced

Read-only multi-agent `Workflow` run (run ID `wf_5cda9d55-9aa`, 9 agents, 115 tool calls, ~8 min, ~798k tokens). No mutations: no contact, tag, opportunity, post, field, or pipeline was created/updated/deleted. Three phases:

1. **Survey (6 parallel agents, structured output):** Contacts/Tags/Fields, Pipelines/Opportunities, Conversations/Social/Calendar, Codebase Integration, Supabase Data Model, Documented Operating Model.
2. **Lenses (2 agents):** audience-connection and money-flow, over the full survey JSON.
3. **Synthesis (1 agent):** the report, from the 6 surveys + 2 lenses.

## Sources

| Source | Tool / surface | Used for |
|---|---|---|
| GoHighLevel (live) | `mcp__ghl__*` — locations, contacts, custom fields, pipelines, opportunities, conversations, social posting, calendars, payments | Contact/tag/field counts, pipeline funnels + $ sums, channel cadence, social stats |
| Supabase (shared DB, live) | `mcp__supabase__execute_sql` / `list_tables` | `ghl_contacts` / `ghl_opportunities` counts, fill-rates, referential integrity, Xero linkage, sync freshness |
| Codebase | Read/Grep/Bash in `act-global-infrastructure` | `ghl-api-service.mjs`, `audience-segments.json`, sync/seed scripts, webhook handlers, PM2 cron config, dry-run discipline |
| Notion (live) | `mcp__claude_ai_Notion__*` | Documented Comms & CRM operating model, audience definitions, intended pipelines/cadence |

## Verified (measured / queried in this run)

- Referential integrity: 0 orphans across `contact_project_links` (487/487), opportunity→contact (561/561), opportunity→Xero-invoice (27/27), contact `canonical_entity_id` (1,584/1,584).
- Custom-field fill: 426/500 sampled contacts have zero custom fields; ABN/consent/indigenous_status/engagement_score at 0% in sample. DB: 422/2,389 (17.7%) carry a canonical audience tag.
- Tag sprawl: 174 distinct tags in the 500-contact sample, 41% used once, 48% used ≤twice.
- Pipeline state: 0 opps "Converted" in any forward pipeline; WHSAC = 92% of Buyer value; `monetary_value` sums to A$297,554,932 (WATCH grant-radar ≈ A$237.8M of it).
- Cash linkage: GHL payments = 0; 27/619 opps (4.4%) link a Xero invoice; 75/2,389 contacts (3.1%) carry `xero_contact_id`.
- Social: 0 posts in last 7 days, 0 scheduled, 36% historical failure rate, 7-day reach 34, 7 connected accounts.
- Automation: `assign-audience-segments.mjs` on no cron; `goods-auto-tagger` + `grant-seed-weekly` live-write with no dry-run gate; `gmail_sync` failed 3,811/3,821 on latest run; 514 `gmail_auto` contacts pending.
- Consent: `consent_status` / `ai_processing_consent` / DND at 0/500; webhook auto-writes `newsletter_consent=true` on `goods`-tagged contacts (ghl-handler.ts ~L206-218); webhooks fail open.

## Inferred (reasoned, not directly traced)

- Four-writer race on `ghl_contacts.tags` as the mechanism behind prior tag-overwrite drift — reasoned from code paths, not a live write-conflict trace.
- All dollar **impact estimates** in §6 Money-Flow moves (e.g. "A$200k-500k/yr in newly-won grants") are projections, not pipeline figures.

## Unverified (no second source)

- The A$939,555 legacy "won" figure and all GHL "won" statuses are NOT reconciled against Xero receipts.
- GHL-sample counts vs Supabase-DB counts diverge in several places (noted inline in the report). The 500-contact GHL sample is ~46% of the 1,091 GHL contacts; where sample and DB conflict, the DB population is the more complete figure.

## Gaps / not covered

- Conversation analysis is a sample, not a full thread census; "newest real message 2026-03-07" is from the sampled set.
- Calendar finding ("0 events booked") is for the queried ~6-month window only.
- No live test of webhook spoofing was performed; the fail-open finding is from reading the handler code.

## Reproducibility

Re-run: `Workflow({scriptPath: ".../workflows/scripts/act-ghl-crm-world-class-audit-wf_5cda9d55-9aa.js"})`. Same-session cached agents return instantly via `resumeFromRunId: "wf_5cda9d55-9aa"`. Live numbers will drift as GHL/Supabase change; treat all figures as a 2026-05-29 snapshot.

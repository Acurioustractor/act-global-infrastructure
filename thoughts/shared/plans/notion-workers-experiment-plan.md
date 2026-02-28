# Notion Workers Experiment Plan

**Goal:** Progressively expose ACT ecosystem intelligence inside Notion via Workers, turning Notion from a static workspace into an intelligent, interactive hub.

**Review cadence:** Weekly (every Friday)

---

## Wave 1 — Foundation (Week of 3 Mar 2026)

**Objective:** Deploy first Worker, prove the pattern works end-to-end.

| Experiment | Tool | Success Criteria |
|-----------|------|-----------------|
| Deploy & connect | `check_grant_deadlines` | Notion agent can answer "What grants close this week?" |
| Add daily briefing | `get_daily_briefing` | Morning digest available inline in Notion daily page |
| Contact lookup | `lookup_contact` | "Tell me about [person]" returns relationship intelligence |

**Secrets to configure:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Risk:** Alpha SDK may have breaking changes. Mitigation: pin version, keep Worker code minimal.

---

## Wave 2 — Intelligence Layer (Week of 10 Mar 2026)

**Objective:** Add project health + financial tools. Test with real workflow.

| Experiment | Tool | Success Criteria |
|-----------|------|-----------------|
| Project health | `get_project_health` | Agent shows activity scores per project |
| Financial summary | `get_financial_summary` | Agent answers "What's our spend on X?" |
| Workflow test | All 5 tools | Use Notion agent as primary briefing tool for 1 full week |

**Measure:** How many times per day do you use Notion agent vs Telegram bot vs Command Center?

---

## Wave 3 — Write Actions (Week of 17 Mar 2026)

**Objective:** Give the Notion agent write capabilities (with confirmation).

| Experiment | Tool | Success Criteria |
|-----------|------|-----------------|
| Draft email | `draft_email` | Agent composes email based on Notion page context |
| Log knowledge | `log_knowledge` | "Remember this decision" → inserts into project_knowledge |
| Create follow-up | `create_followup` | "Remind me to follow up with X in 3 days" → creates action |

**Risk:** Write actions from Notion agent. Mitigation: confirmation patterns, audit logging.

---

## Wave 4 — Autonomous Agents (Week of 24 Mar 2026)

**Objective:** Move cron-style intelligence into Notion-triggered workflows.

| Experiment | Tool | Success Criteria |
|-----------|------|-----------------|
| Grant discovery | `discover_grants` | Agent finds new grants matching ACT project criteria |
| Communication enrichment | `enrich_comms` | Agent summarizes recent emails for a contact/project |
| Receipt matching | `match_receipt` | Agent matches a receipt image to Xero transactions |

---

## Wave 5 — Multi-Agent Orchestration (Week of 31 Mar 2026)

**Objective:** Chain multiple Workers together. Notion agent as orchestrator.

| Experiment | Pattern | Success Criteria |
|-----------|---------|-----------------|
| Morning routine | briefing → follow-ups → draft emails | Agent runs full morning workflow |
| Grant pipeline review | deadlines → health → financial → draft update | End-to-end grant review in Notion |
| Relationship nurture | contact lookup → comms summary → draft outreach | Agent suggests + drafts follow-ups |

---

## Wave 6+ — Experimental (April 2026)

Ideas to test as the SDK matures:

- **OAuth Workers**: Connect Xero/Gmail/GHL directly (no Supabase intermediary for real-time data)
- **Notion → GitHub**: Worker that creates issues, PRs, or deploys from Notion pages
- **Voice-to-Worker**: Telegram voice → transcribe → Notion agent processes via Workers
- **Webhook Workers**: GHL/Xero webhooks → Notion agent notified → takes action
- **Embedding search**: Semantic search across all communications via Worker
- **Cultural protocol check**: Worker that validates content against cultural guidelines before sending

---

## Weekly Review Template

Every Friday, answer these:

1. **What worked?** Which Workers got used? Which felt natural?
2. **What didn't?** Friction points, errors, things that felt clunky?
3. **What surprised?** Unexpected use cases or capabilities?
4. **What's next?** Which Wave experiments to run next week?
5. **SDK changes?** Any breaking changes in `@notionhq/workers`?

---

## Architecture Decision

**Why Workers alongside (not replacing) the existing stack:**

- **Telegram bot** stays for mobile-first, quick voice/text interactions
- **Command Center** stays for dashboards, visualizations, bulk operations
- **Workers** add a third interface — inline intelligence inside Notion where project management lives

All three share the same Supabase database. No data duplication. Each interface serves a different context.

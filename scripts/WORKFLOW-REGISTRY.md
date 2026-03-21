# ACT Script Workflow Registry

How data flows through the ACT ecosystem. Each pipeline shows trigger → flow → key tables → failure modes.

> **Source of truth for cron schedules:** `ecosystem.config.cjs`

---

## 1. Finance Pipeline

Keeps Xero data in sync, tags transactions to projects, and calculates per-project financials.

```
xero-sync (every 6h)
  → auto-tag-transactions (6h +15min)
  → receipt-capture (6h +30min)
  → receipt-match (daily 7am)
  → receipt-upload (daily 8am)
  → xero-project-tag (daily 9am)
  → calculate-project-monthly-financials (1st of month 7am)
  → generate-financial-variance-notes (1st of month 8am)
  → populate-financial-snapshots (1st of month 9am)
```

**Additional finance scripts:**
- `finance-daily-briefing` — weekdays 7am, summary to Telegram
- `finance-engine health` — weekly Sunday, health digest
- `financial-advisor-agent` — weekly Monday 8am, proactive advice
- `chase-overdue-invoices` — weekdays 10am, collections autopilot
- `reconciliation-checklist` — 1st of month 7am, monthly close prep
- `sync-finance-to-notion` — daily 8:30am, push financials to Notion

**Key scripts:**
| Script | Purpose |
|--------|---------|
| `sync-xero-to-supabase.mjs` | Full Xero sync — invoices, transactions, contacts, bank accounts |
| `tag-transactions-by-vendor.mjs` | Apply `vendor_project_rules` to tag transactions with project codes |
| `capture-receipts.mjs` | Detect transactions missing receipts, create `receipt_matches` |
| `match-receipts-to-xero.mjs` | AI-match receipts to bank transactions |
| `upload-receipts-to-xero.mjs` | Push matched receipts as Xero attachments |
| `tag-xero-transactions.mjs` | Tag transactions in Xero itself (tracking categories) |
| `calculate-project-monthly-financials.mjs` | Aggregate into `project_monthly_financials` table |
| `generate-financial-variance-notes.mjs` | AI-generated notes on month-over-month changes |

**Key tables:** `xero_transactions`, `xero_invoices`, `vendor_project_rules`, `project_monthly_financials`, `project_budgets`, `receipt_matches`, `financial_snapshots`

**Failure modes:**
- Xero OAuth token expired → `xero-auth.mjs` to refresh (tokens rotate on each use)
- Rate limit (60/min, 5 concurrent, 5K/day) → script backs off automatically
- Missing `vendor_project_rules` → transactions stay untagged (check `/finance/projects` for gaps)
- Receipt upload fails → receipts queue in `receipt_matches` with status `pending`

---

## 2. Communication Pipeline

Syncs Gmail, tags emails to projects, enriches with AI, and computes contact engagement signals.

```
gmail-watch-renew (daily 3am) — keeps push notifications alive
gmail-sync (daily 4am) — reconciliation sweep
  → auto-tag-emails (6h +15min)
  → email-to-knowledge (6h +10min)
  → enrich-communications (6h +20min)
  → link-storytellers-to-contacts (daily 4:45am)
contact-signals (daily 3am)
  → contact-reconciliation (every 6h +30min)
  → engagement-status (daily 11am)
```

**Key scripts:**
| Script | Purpose |
|--------|---------|
| `sync-gmail-to-supabase.mjs` | Sync 4 mailboxes via Google service account + domain delegation |
| `tag-emails-by-project.mjs` | Auto-assign project codes to emails based on contact/content |
| `email-to-knowledge.mjs` | Extract actionable knowledge from emails into `project_knowledge` |
| `enrich-communications.mjs` | AI enrichment — sentiment, topics, action items |
| `compute-contact-signals.mjs` | Calculate engagement scores, last-contact dates, relationship health |
| `reconcile-contacts.mjs` | Merge/deduplicate contacts across Gmail, GHL, Notion |
| `update-engagement-status.mjs` | Update contact lifecycle stage based on signals |

**Key tables:** `communications`, `contacts`, `ghl_contacts`, `contact_signals`, `project_knowledge`

**Failure modes:**
- Gmail watch expires (7-day TTL) → `renew-gmail-watch.mjs` handles daily
- DNS failures under load (90-day sync) → use `--days 1` for incremental
- `ghl_contacts` missing `source` column → new contact creation blocked (non-fatal)
- Google service account permissions → check domain-wide delegation settings

---

## 3. Daily Briefing Pipeline

Pre-computes intelligence overnight so the 7am briefing is fast and comprehensive.

```
2am:  agent-learning
3am:  contact-signals, gmail-watch-renew
4am:  gmail-sync
4:30: storyteller-sync
4:45: storyteller-link
5am:  embed-imessages, auto-link-knowledge, sync-grantscope-matches
5:30: meeting-sync
6am:  detect-episodes, meeting-intelligence, data-freshness, project-intelligence, discover-grants, mission-control
6:30: daily-priorities, pipeline-sync
6:45: sync-priorities-to-notion
7am:  → daily-briefing ← (consumes all above)
      → finance-daily-briefing (weekdays)
      → enrich-grants
      → sprint-suggestions
7:30: notion-intelligence
8am:  knowledge-pipeline
8:30: finance-sync
```

**Key scripts:**
| Script | Purpose |
|--------|---------|
| `daily-briefing.mjs` | Aggregates all sources into a Telegram morning briefing |
| `finance-daily-briefing.mjs` | Finance-focused briefing — cashflow, receivables, overdue |
| `generate-daily-priorities.mjs` | AI-scored priority list from calendar, tasks, signals |
| `sync-priorities-to-notion.mjs` | Push priorities to Notion for the day |
| `generate-project-intelligence-snapshots.mjs` | Per-project health + activity snapshots |

**Key tables:** `daily_briefings`, `daily_priorities`, `project_health`, `contact_signals`, `communications`

**Failure modes:**
- Upstream script fails silently → briefing has stale data (check `data_freshness` table)
- LLM provider down → priorities generation fails (multi-provider fallback in `llm-client.mjs`)
- Notion API rate limit → `sync-priorities-to-notion` retries with backoff

---

## 4. Grant Pipeline

Discovers grant opportunities, enriches them, syncs to GHL CRM, and maintains the unified pipeline.

```
discover-grants (daily 6am)
  → enrich-grants (daily 7am, batch-size 20)
  → pipeline-sync (daily 6:30am) — unify into opportunities_unified
  → sync-grants-ghl (every 6h +15min) — bidirectional GHL sync
  → auto-align-ghl (daily 10am) — assign project codes at 70%+ confidence
  → grantscope-to-notion (every 3h) — push to Notion
  → notion-to-grantscope (every 3h +7min) — pull stage changes back
  → sync-grantscope-matches (daily 5am) — match GrantScope results
```

**Key scripts:**
| Script | Purpose |
|--------|---------|
| `discover-grants.mjs` | Scan grant sources for new opportunities |
| `enrich-grant-opportunities.mjs` | AI enrichment — eligibility, fit score, deadline extraction |
| `sync-opportunities-to-unified-pipeline.mjs` | Merge all sources into `opportunities_unified` |
| `sync-grants-ghl.mjs` | Bidirectional sync between grants DB and GHL CRM |
| `align-ghl-opportunities.mjs` | Auto-assign project codes based on content matching |
| `sync-grantscope-matches.mjs` | Pull matched grants from GrantScope (separate Supabase) |

**Key tables:** `grant_opportunities`, `ghl_opportunities`, `opportunities_unified`, `grant_sources`

**Failure modes:**
- Grant source website changes → `discover-grants` returns 0 (check logs, update scraper)
- GHL API rate limit → sync skips, retries next cycle
- GrantScope on separate Supabase instance (`tednluwflfhxyucgwigh`) → ensure correct project ref
- Missing GHL stages (Grant Awarded, Grant Declined, Acquittal Due) → manual creation needed

---

## 5. Project Health Pipeline

Computes health scores, generates weekly pulse, and syncs intelligence to Notion.

```
project-health (every 6h)
  → weekly-project-pulse (Monday 5:30am)
  → project-intelligence (daily 6am)
  → notion-intelligence (daily 7:30am)
  → mission-control (3x daily: 6am, 12pm, 6pm)
  → engagement-status (daily 11am)
```

**Weekly review cycle:**
```
Friday 6pm:  weekly-relationship-review
Sunday 3am:  extract-impact
Sunday 5pm:  notion-weekly-review
Sunday 6pm:  weekly-digest
```

**Key scripts:**
| Script | Purpose |
|--------|---------|
| `compute-project-health.mjs` | Score each project: data coverage, activity, financials |
| `weekly-project-pulse.mjs` | Weekly summary across all projects — trends, alerts |
| `generate-project-intelligence-snapshots.mjs` | Rich per-project intelligence snapshots |
| `sync-project-intelligence-to-notion.mjs` | Push snapshots to Notion project pages |
| `sync-mission-control-to-notion.mjs` | Sync mission control dashboard to Notion |
| `weekly-digest.mjs` | End-of-week digest to Telegram |
| `extract-impact-metrics.mjs` | Pull impact metrics from project data for reporting |

**Key tables:** `project_health`, `projects`, `project_monthly_financials`, `weekly_digests`, `impact_metrics`

**Failure modes:**
- Missing project data → health score drops (by design — low score = action needed)
- Notion sync fails → intelligence stale in Notion (dashboard still live via Supabase)
- Weekly pulse on Monday depends on health computed over weekend → check last `project_health` update

---

## PM2 Cron Timeline (AEST)

All times are Australia/Brisbane (AEST, UTC+10, no DST).

| Time | Scripts |
|------|---------|
| `* * * * *` | pm2-status-sync |
| `*/5 * * * *` | notion-sync |
| `*/15 * * * *` | imessage-sync, notion-checkbox-poll, actions-decisions-sync |
| `*/30 * * * *` | push-highlights-notion |
| `0 */2 * * *` | generate-insights |
| `0 */3 * * *` | grantscope-to-notion |
| `7 */3 * * *` | notion-to-grantscope |
| `0 */6 * * *` | calendar-sync, notion-calendar-sync, ghl-sync, project-health, xero-sync |
| `10 */6 * * *` | email-to-knowledge |
| `15 */6 * * *` | auto-tag-transactions, auto-tag-emails, sync-grants-ghl |
| `20 */6 * * *` | enrich-communications |
| `30 */6 * * *` | contact-reconciliation, receipt-capture |
| `0 2 * * *` | agent-learning |
| `0 3 * * *` | contact-signals, gmail-watch-renew |
| `0 4 * * *` | gmail-sync |
| `30 4 * * *` | storyteller-sync |
| `45 4 * * *` | storyteller-link |
| `0 5 * * *` | embed-imessages, auto-link-knowledge, sync-grantscope-matches |
| `30 5 * * *` | meeting-sync |
| `0 6 * * *` | detect-episodes, meeting-intelligence, data-freshness, project-intelligence, discover-grants, mission-control |
| `30 6 * * *` | daily-priorities, pipeline-sync |
| `45 6 * * *` | sync-priorities-to-notion |
| `0 7 * * *` | daily-briefing, enrich-grants, sprint-suggestions, receipt-match |
| `0 7 * * 1-5` | finance-daily-briefing |
| `30 7 * * *` | notion-intelligence |
| `0 8 * * *` | knowledge-pipeline, receipt-upload |
| `30 8 * * *` | finance-sync |
| `0 9 * * *` | goods-auto-tagger, xero-project-tag |
| `0 10 * * *` | goods-content-sync, auto-align-ghl |
| `0 10 * * 1` | receipt-calendar-suggest |
| `0 10 * * 1-5` | collections-autopilot |
| `0 11 * * *` | engagement-status |
| `0 6,12,18 * * *` | mission-control |
| `0 17 * * 0` | notion-weekly-review |
| `0 18 * * 0` | weekly-digest |
| `0 18 * * 5` | weekly-relationship-review |
| `0 22 * * 6` | finance-health-digest |
| `30 5 * * 1` | weekly-project-pulse |
| `0 8 * * 1` | financial-advisor |
| `0 3 * * 0` | extract-impact |
| `0 7 1 * *` | monthly-financials, reconciliation-checklist |
| `0 8 1 * *` | variance-notes |
| `0 9 1 * *` | financial-snapshots |

---

## Reverse Index: Script → Pipeline(s)

| Script | Pipeline(s) |
|--------|-------------|
| `sync-xero-to-supabase.mjs` | Finance |
| `tag-transactions-by-vendor.mjs` | Finance |
| `capture-receipts.mjs` | Finance |
| `match-receipts-to-xero.mjs` | Finance |
| `upload-receipts-to-xero.mjs` | Finance |
| `tag-xero-transactions.mjs` | Finance |
| `calculate-project-monthly-financials.mjs` | Finance |
| `generate-financial-variance-notes.mjs` | Finance |
| `populate-financial-snapshots.mjs` | Finance |
| `finance-daily-briefing.mjs` | Finance, Daily Briefing |
| `finance-engine.mjs` | Finance |
| `financial-advisor-agent.mjs` | Finance |
| `chase-overdue-invoices.mjs` | Finance |
| `generate-reconciliation-checklist.mjs` | Finance |
| `sync-finance-to-notion.mjs` | Finance, Project Health |
| `sync-gmail-to-supabase.mjs` | Communication, Daily Briefing |
| `tag-emails-by-project.mjs` | Communication |
| `email-to-knowledge.mjs` | Communication, Daily Briefing |
| `enrich-communications.mjs` | Communication |
| `compute-contact-signals.mjs` | Communication, Daily Briefing |
| `reconcile-contacts.mjs` | Communication |
| `update-engagement-status.mjs` | Communication, Project Health |
| `renew-gmail-watch.mjs` | Communication |
| `daily-briefing.mjs` | Daily Briefing |
| `generate-daily-priorities.mjs` | Daily Briefing |
| `sync-priorities-to-notion.mjs` | Daily Briefing |
| `generate-project-intelligence-snapshots.mjs` | Daily Briefing, Project Health |
| `discover-grants.mjs` | Grant |
| `enrich-grant-opportunities.mjs` | Grant, Daily Briefing |
| `sync-opportunities-to-unified-pipeline.mjs` | Grant |
| `sync-grants-ghl.mjs` | Grant |
| `align-ghl-opportunities.mjs` | Grant |
| `sync-grantscope-matches.mjs` | Grant, Daily Briefing |
| `sync-grantscope-to-notion.mjs` | Grant |
| `sync-notion-stages-to-grantscope.mjs` | Grant |
| `compute-project-health.mjs` | Project Health |
| `weekly-project-pulse.mjs` | Project Health |
| `sync-project-intelligence-to-notion.mjs` | Project Health |
| `sync-mission-control-to-notion.mjs` | Project Health |
| `weekly-digest.mjs` | Project Health |
| `extract-impact-metrics.mjs` | Project Health |
| `sync-notion-to-supabase.mjs` | Project Health, Daily Briefing |
| `agent-learning-job.mjs` | Daily Briefing |
| `detect-episodes.mjs` | Daily Briefing |
| `run-meeting-intelligence.mjs` | Daily Briefing |
| `sync-notion-meetings.mjs` | Daily Briefing |
| `knowledge-pipeline.mjs` | Daily Briefing |
| `data-freshness-monitor.mjs` | Daily Briefing |
| `generate-insights.mjs` | Daily Briefing |
| `sprint-suggestions.mjs` | Daily Briefing |

---

## Shared Libraries (`scripts/lib/`)

| Module | Used by |
|--------|---------|
| `llm-client.mjs` | Any script needing LLM (multi-provider: Gemini, Groq, OpenAI, Anthropic) |
| `project-loader.mjs` | Scripts that need project metadata |
| `receipt-matcher.mjs` | Receipt pipeline (capture, match, upload) |
| `receipt-ai-scorer.mjs` | AI confidence scoring for receipt matches |
| `receipt-detector.mjs` | Detect missing receipts from bank transactions |
| `receipt-notifications.mjs` | Telegram alerts for receipt actions |
| `receipt-gamification.mjs` | Receipt capture streaks and scoring |
| `unified-receipt-search.mjs` | Cross-source receipt search |
| `action-executor.mjs` | Execute actions from AI-generated suggestions |
| `meeting-intelligence.mjs` | Meeting analysis and insight extraction |
| `subscription-discovery.mjs` | Detect recurring transactions as subscriptions |
| `transaction-pattern-detector.mjs` | Anomaly and pattern detection in transactions |
| `xero-repeating-invoices.mjs` | Manage Xero repeating invoices |
| `xero-tracking.mjs` | Xero tracking category operations |
| `telegram.mjs` | Send Telegram notifications |
| `ghl-api-service.mjs` | GoHighLevel CRM API client |

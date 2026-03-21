# Batch API Candidates — ACT Cron Scripts

**Date:** 2026-03-20
**Impact:** 50% cost savings on eligible scripts (Anthropic Batch API), ~$0 effort

---

## What is Batch API?

Anthropic and OpenAI both offer async batch processing at 50% discount:
- Submit requests in bulk
- Results returned within 24 hours (usually minutes)
- No rate limit pressure
- Perfect for nightly/periodic scripts that don't need real-time responses

---

## Candidates (sorted by estimated savings)

### Tier 1: High Volume, Daily — Switch First

| Cron Script | Schedule | Model | API | Batch-Safe? |
|-------------|----------|-------|-----|-------------|
| `generate-insights` | Every 2h | gpt-4o-mini | OpenAI | YES — insights can be async |
| `enrich-communications` | Every 6h | gpt-4o-mini | OpenAI | YES — enrichment is async by nature |
| `meeting-intelligence` | Daily 6am | gpt-4o-mini | OpenAI | YES — processes yesterday's meetings |
| `enrich-grant-opportunities` | Daily 7am | claude-haiku | Anthropic | YES — enrichment doesn't need real-time |
| `generate-daily-priorities` | Daily 6:30am | LLM | Mixed | MAYBE — needs results by 7am briefing |
| `sprint-suggestions` | Daily 7am | LLM | Mixed | YES — suggestions are async |
| `daily-briefing` | Daily 7am | LLM | Mixed | PARTIAL — could pre-compute summaries |

### Tier 2: Weekly/Monthly — Lower Volume, Easy Wins

| Cron Script | Schedule | Model | API | Batch-Safe? |
|-------------|----------|-------|-----|-------------|
| `weekly-digest` | Sunday 6pm | gpt-4o-mini | OpenAI | YES — weekly summary |
| `weekly-project-pulse` | Monday 5:30am | LLM | Mixed | YES — weekly health |
| `extract-impact-metrics` | Sunday 3am | LLM | Mixed | YES — weekly batch |
| `financial-advisor-agent` | Monday 8am | LLM | Mixed | YES — weekly advice |
| `finance-health-digest` | Sunday 8am | LLM | Mixed | YES — weekly health |
| `generate-financial-variance-notes` | 1st of month | LLM | Mixed | YES — monthly |
| `generate-project-intelligence-snapshots` | Daily 6am | LLM | Mixed | YES — snapshots are async |

### Tier 3: NOT Batch Candidates

| Cron Script | Why Not |
|-------------|---------|
| `receipt-match` | Needs AI scoring in real-time for matching decisions |
| `goods-auto-tagger` | Interactive tagging, lower volume |
| `contact-signals` | Runs before briefing, needs fast turnaround |
| `finance-daily-briefing` | Must complete before workday |

---

## Implementation Approach

### For Anthropic (claude-haiku scripts):
```javascript
// Instead of: await anthropic.messages.create({...})
// Use: await anthropic.messages.batches.create({requests: [...]})
// Then poll: await anthropic.messages.batches.retrieve(batch_id)
```

### For OpenAI (gpt-4o-mini scripts):
```javascript
// Create JSONL file with requests
// Upload via: await openai.files.create({file, purpose: 'batch'})
// Submit: await openai.batches.create({input_file_id, endpoint, completion_window: '24h'})
```

### Migration Pattern:
1. Add `--batch` flag to each script
2. When `--batch`, collect all LLM requests into array
3. Submit as single batch
4. Poll for completion (or use webhook)
5. Process results same as sync version
6. Cron timing: shift batch scripts 2 hours earlier to allow completion before downstream consumers

---

## Estimated Savings

- **Tier 1 scripts** (daily, high volume): ~$50-80/month → **$25-40 savings**
- **Tier 2 scripts** (weekly/monthly): ~$15-25/month → **$8-13 savings**
- **Total estimated:** ~$33-53/month savings (50% on eligible spend)
- **Effort:** Low — mostly wrapping existing calls in batch envelope

---

## Recommendation

Start with `enrich-communications` and `enrich-grant-opportunities` — highest volume, most straightforward (pure enrichment, no downstream dependencies in the same cron cycle). These two scripts alone probably account for 60% of the eligible batch savings.

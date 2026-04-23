# Goods Agents — `scripts/agents/`

Narrow-task LLM agents for the Goods operating system. Plugs into the existing ACT agentic infrastructure at `scripts/lib/` — does not replace it.

## Existing infrastructure (reuse, don't rebuild)

| Layer | File | What it gives us |
|---|---|---|
| LLM client + cost tracking | `scripts/lib/llm-client.mjs` | Anthropic + OpenAI clients, `trackedCompletion()`, `selectModel()` for task-based routing (classify/draft/architect → Haiku/Sonnet/Opus), pricing table, `api_usage` table logging |
| Bounded autonomy | `scripts/lib/agentic-workflow.mjs` | Level 1 (suggest) / Level 2 (propose + approve) / Level 3 (autonomous within bounds) workflow |
| Action execution | `scripts/lib/action-executor.mjs` | Bridge between agent suggestions and real Signal/Email/GHL/Notion actions |
| Memory | `memory-lifecycle.mjs`, `procedural-memory.mjs`, `episodic-memory.mjs`, `working-memory.mjs` | 9-layer memory stack |
| Observability | `scripts/lib/agent-learning.mjs` | Performance analysis, confidence threshold tuning |
| Scheduling | `ecosystem.config.cjs` | PM2 cron-style scheduling; agents register here |

**Do not create parallel LLM wrappers, cost logs, or memory systems.** Use the above.

## Convention

Every Goods agent is a single file `scripts/agents/agent-<name>.mjs` that:

1. Uses the Opus 4.7 four-part contract in its system prompt: task budget, stop criteria, fallback, scoped files.
2. Calls `trackedCompletion()` from `lib/llm-client.mjs` so the run is logged to `api_usage`.
3. Declares bounded autonomy level (1/2/3) via `AgenticWorkflow` from `lib/agentic-workflow.mjs`.
4. Writes its output to a stable file path (cockpit panel, draft in `thoughts/shared/drafts/`, or Notion staging).
5. Returns a ≤2-line summary to stdout for the CEO Telegram relay.
6. Appends a `project_knowledge` row with `knowledge_type = 'pattern'` or `'action_item'` so next session inherits context.
7. Is registered in `ecosystem.config.cjs` with a cron schedule.

## File layout

```
scripts/
├── agents/                          ← this directory
│   ├── README.md                    ← you are here
│   ├── agent-narrative-gatekeeper.mjs     (A6 — screens public writing)
│   ├── agent-invoice-drift-detector.mjs   (weekly wiki ↔ Xero truth check)
│   ├── agent-procurement-analyst.mjs      (A1 — weekly top-3 buyer touches)
│   ├── agent-funder-cadence.mjs           (A2 — 18-day silence watcher)
│   ├── agent-capital-stack-brief.mjs      (A5 — Sunday night CEO brief)
│   ├── agent-field-insight.mjs            (A3 — daily field state)
│   ├── agent-story-cascade.mjs            (A4 — weekly publish queue)
│   ├── agent-data-room-builder.mjs        (A7 — per-funder assembly)
│   └── _template.mjs                      ← reference template for new agents
└── lib/
    └── goods-agent-runtime.mjs      ← Goods-specific wrapper over lib/*
```

## Cost tier discipline

Match model to task complexity. `selectModel(task)` in `llm-client.mjs` handles routing:

| Task | Model | Agents |
|---|---|---|
| classify, extract, tag, score, validate | Haiku | Invoice Drift Detector, Contract Watch, Grant Eligibility |
| generate, draft, analyse, summarise | Sonnet | Procurement Analyst, Funder Cadence, Field Insight, Narrative Gatekeeper |
| architect, plan, multi-step reasoning | Opus | Capital Stack Brief, Monthly CEO Letter Drafter, Grant First-Draft Assembler |

Cost ceiling per run enforced via token budget in the call.

## Autonomy levels (from `agentic-workflow.mjs`)

| Level | Pattern | Example |
|---|---|---|
| **L1 — Manual** | Agent suggests, human executes | Grant Discovery (LLM finds fits; Ben sends asks) |
| **L2 — Supervised** | Agent proposes, human approves, agent executes | Invoice Drift Detector (proposes wiki PR; Ben merges) |
| **L3 — Autonomous** | Agent executes within bounds, logs for review | Contract Watch (auto-logs to `ghl_sync_log` with full audit trail) |

Default for Goods agents: **L2**. No autonomous publication, no autonomous community-voice use.

## Output channels

Every agent writes to at least one:

- **Cockpit panel** — `thoughts/shared/cockpit/<agent>-<date>.md` → surfaces to command-center `/projects/goods/cockpit` when that route exists
- **Draft** — `thoughts/shared/drafts/<domain>/<agent>/<name>.md` → human opens, edits, sends
- **Notion staging** — specific page in Goods. HQ; never live-update without L2/L3 explicit scope
- **Telegram** — one-line notification via `scripts/lib/telegram.mjs`; for escalations and daily pulse

## The four-part Opus 4.7 contract

Every agent's system prompt must declare:

```
TASK BUDGET: <X tokens> / <Y tool calls>
STOP CRITERIA: <concrete predicate, e.g., "stop when 3 ranked buyer rows written">
FALLBACK: <what to return if blocked, e.g., "if no new contracts, return 'no movement this week' in plain prose">
SCOPED FILES: <explicit path list, never "the whole repo">
```

Agents without this contract are rejected at review. Fuzzy prompts burn tokens before producing value (see `~/.claude/rules/opus-4-7-prompting.md`).

## Registering an agent with PM2

Edit `ecosystem.config.cjs` and append to `cronScripts`:

```js
{
  name: 'agent-procurement-analyst',
  script: 'scripts/agents/agent-procurement-analyst.mjs',
  cron_restart: '0 8 * * 1', // Monday 08:00 AEST
  autorestart: false,
  max_memory_restart: '512M',
},
```

Then `pm2 reload ecosystem.config.cjs && pm2 save`.

## Testing before scheduling

Always run manually first:

```bash
node scripts/agents/agent-<name>.mjs --dry-run     # no external writes
node scripts/agents/agent-<name>.mjs --verbose     # full logs
node scripts/agents/agent-<name>.mjs               # real run, L2 output (draft for human review)
```

Only schedule in PM2 after three successful manual runs.

## Retirement policy

From the architecture doc: **any agent with <20% read-rate over 4 weeks gets retired.** Track via `agent_read_events` table (TBD schema):

```sql
CREATE TABLE agent_read_events (
  id uuid PRIMARY KEY,
  agent_name text NOT NULL,
  output_path text NOT NULL,
  written_at timestamptz NOT NULL,
  first_read_at timestamptz,
  acted_on_at timestamptz,
  action_taken text
);
```

Weekly `agent-cost-monitor` (Oct build) computes read-rate = `COUNT(first_read_at IS NOT NULL) / COUNT(*)` per agent.

## Current build status

As of 2026-04-23:

- [x] `scripts/agents/` directory + README + convention
- [x] `scripts/lib/goods-agent-runtime.mjs` skeleton
- [x] `scripts/agents/_template.mjs` reference
- [x] `scripts/agents/agent-invoice-drift-detector.mjs` stub (May Week 2 first deploy)
- [x] `scripts/agents/agent-narrative-gatekeeper.mjs` stub (A6 May Week 1 first deploy)
- [ ] Other agents — per architecture doc sequencing

## See also

- `thoughts/shared/plans/goods-agent-architecture.md` — full catalogue (30+ agents) + sequencing
- `thoughts/shared/plans/goods-ceo-6-month-plan.md` — operating plan (Layer 5 = agents)
- `~/.claude/rules/opus-4-7-prompting.md` — prompt contract rules
- `~/.claude/rules/context-efficiency.md` — required agent contract (budget/stop/fallback/scoped files)

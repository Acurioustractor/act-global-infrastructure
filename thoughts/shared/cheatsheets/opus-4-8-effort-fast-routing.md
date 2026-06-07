# Opus 4.8 — effort / fast / workflow routing (cheat card)

_Personal quick-reference for Claude Code daily use. Not auto-loaded into context. Full contract: `~/.claude/rules/opus-4-8-prompting.md`._

## Same price — you pay by token volume, not by effort level

The rate is flat across effort levels. Higher effort = more tokens = more cost. **Route effort per task; don't leave it on max "to be safe."**

## Daily commands

```
/effort low        # formatting, "what does this return?", single lookups, tagging
/effort medium     # routine edits, drafts, finance tagging sweeps, BAS prep, schema checks
/effort high       # default — daily coding + review
/effort xhigh      # money logic, schema-contract design, trade-offs, agent orchestration
/effort max        # hardest architecture, no token cap
/fast              # ~2.5x speed, same model — mechanical breadth only
/effort ultracode  # xhigh + background workflow orchestration (big fan-out)
/model sonnet      # simple tasks      /model haiku   # throwaway questions
/clear             # between unrelated topics — stops stale context causing wrong-approach errors
```

## ACT-specific routing

| Task | Effort | Fast? |
|---|---|---|
| Tag a txn, `/db-check`, status glance | low–medium | — |
| Finance tagging sweep, GHL field writes, routine script edits | medium | ok |
| Multi-file refactor, doc/test gen, code from a spec | high | **yes** |
| Xero source-of-truth logic, schema-contract, `/company` ledger | xhigh–max | **no** |
| Anything writing to Xero / GHL / Supabase / external | xhigh | **no** — depth beats speed |
| Brand/voice writing, funder drafting | high–xhigh | no |

## When a workflow earns its cost (else stay inline)

- ✅ Full-repo schema / dead-table audits · GrantScope scoring sweeps · finance reconciliation audits · cross-repo ecosystem digest · migrations across many files
- ❌ Single-file edits · bug fixes · quick questions
- → Scope-test on one folder first, then calibrate the big run. Workflows only run when you explicitly ask ("run a workflow", "fan out").

## Token hygiene (ACT)

- Keep `MEMORY.md` an index (one line per memory). It auto-loads every session; fat paragraphs there cost tokens every time AND truncate recall once it passes the load limit.
- `/clear` between unrelated topics (data work → UI → funder email).
- MCP queries: `LIMIT 10`, pick columns, never `SELECT *`.
- Ship one feature → commit → `/clear`.

---
title: Money state of play — audit complete, MiniMax Phase 4b shipped
date: 2026-05-22
status: open — Phase 4b done (5 command-center callers wired); Phase 4c spike test + 3b calibration + 4d Telegram flip blocked on MiniMax rate-limit reset (~2026-05-22T10:00:00Z)
session: claude (Opus 4.7, 1M context) — 2026-05-21/22 overnight marathon + brief 2026-05-22 morning continuation
related_handoffs:
  - 2026-05-19-money-state-of-play.md (prior — audit was triggered from this)
  - 2026-05-17-finance-tagging-platform-handoff.md
related_plans:
  - thoughts/shared/plans/minimax-full-migration-2026-05-22.md (master plan, 5 phases)
  - thoughts/shared/plans/finance-fix-runbook-2026-05-22.md (14 fix recipes)
related_reports:
  - thoughts/shared/reports/finance-audit-2026-05-21.md (8 sections, ~45 findings)
  - thoughts/shared/reports/finance-rca-2026-05-22.md (5 structural patterns)
---

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-05-22T05:55:00Z
**Goal:** Finance audit → RCA → fix runbook DONE. MiniMax all-in migration in progress (7 script callers + 5 command-center callers + adapter all refactored, 8 commits on main).
**Branch:** main (clean — all 8 commits pushed). Last commit `fb42a72`.
**Test:** open /finance/transactions → receipt% should be ~87% (was 81%, NAB bank-fee filter loosened). Bot still on Claude — `LLM_PROVIDER` unset = Anthropic passthrough; adapter wired but inert until env var flipped.

### Now (resume after MiniMax 5h window clears — ~2026-05-22T10:00:00Z)
1. ✅ **DONE — rate-limit probe** at session start returned valid content (one-shot success on residual capacity).
2. ✅ **DONE — Phase 4b adapter wiring** committed as `fb42a72`. Five command-center callers swapped from `new Anthropic(...)` → `new LLMClient(...)`: `app/api/agent/chat/route.ts:38`, `app/api/grants/[id]/draft/route.ts:117`, `app/api/transactions/suggest/route.ts:9`, `lib/agent-loop.ts:66`, `lib/tools/actions.ts:1070`. Anthropic import kept in each for types. `tool-definitions.ts` and `telegram/conversation-state.ts` are types-only — untouched. `npx tsc --noEmit` clean.
3. 🟡 **Spike-test adapter — request path verified, response path blocked.** Live test against MiniMax returned a structured `2056` 429 (proves the Anthropic→OpenAI request conversion is valid; MiniMax accepted the payload shape). Response-conversion code is straightforward and TS-clean but not exercised end-to-end yet. Re-run `/tmp` spike (or curl against `/api/transactions/suggest` with `LLM_PROVIDER=minimax`) once the 5h window clears.
4. **Phase 3b — grader calibration** — `node scripts/grade-voice.mjs --calibrate` then `grade-pack.mjs --rubric ... --calibrate ...` then funder-cadence + alignment-loop-synthesis. Compare to Sonnet 4.6 baselines. If any drift > 1 verdict tier, document in rubric calibration history. Will consume ~30 MiniMax requests of the 4,500/5h budget.
5. **Phase 4d — staged Telegram rollout** — flip `LLM_PROVIDER=minimax` in `ecosystem.config.cjs` for `telegram-bot-webhook` (or wherever the bot runs), `pm2 reload ecosystem.config.cjs`. Send 5 test messages exercising different tools (status, finance query, draft, tag review, journal). Observe for 30 min. If clean, leave on MiniMax. If issues, unset → Claude in one command. **Pending Ben verb** (Tier 2, production rollout).

### Session commits (8 on main)

| Commit | What landed |
|---|---|
| `3442592` | Baseline: overnight finance audit + RCA + fix runbook + NAB bank-fee filter loosened (receipt% 81→87%) |
| `07793dd` | Phase 1: llm-client.mjs router hardening — MiniMax pricing, `trackedAgentCompletionWithFallback` (auth/quota smart fallback), `<think>` strip |
| `a73d1f9` | Phase 2: 3 non-grader scripts → MiniMax router (ai-route-dext-doc, grant-sources LLM path, projects/suggest-code). Fallback proven live under real MiniMax 429. |
| `89d9355` | Phase 3a: 4 graders + alignment-loop helper code-refactored. Calibration deferred (3b). |
| `d040861` | Plan progress doc update |
| `e7c1f92` | Small wins: `reasoning_split=true` (cleaner than `<think>` strip), PRICING cleanup (deprecated removed, M2.5/M2.1/M2 added for fallback), Phase 4 scope revised down (MiniMax accepts Anthropic-format tools natively) |
| `ef6d19e` | Phase 4a: `apps/command-center/src/lib/llm-adapter.ts` — `LLMClient` drop-in shim. NOT yet wired. Defaults to Anthropic passthrough; flip `LLM_PROVIDER=minimax` to route. |
| `fb42a72` | **Phase 4b**: wire adapter into 5 command-center callers (agent/chat, grants/draft, transactions/suggest, agent-loop, tools/actions). +10/-5 LoC. `tsc --noEmit` clean. `LLM_PROVIDER` still unset → behavior unchanged. |

### Critical findings to remember
1. **MiniMax has a 5h rolling rate limit** on Token Plan Plus ($20/mo, 4,500 req/5h). Already burned through today by audit + tests. Resets at `2026-05-22T10:00:00Z` (or whatever window we're in).
2. **MiniMax-M2.7 emits `<think>` blocks always** — cannot disable. Use `reasoning_split: true` to keep them out of `content` (now baked into router).
3. **MiniMax accepts Anthropic-format tool definitions** at `/v1/chat/completions`. But response is always OpenAI-shaped → adapter converts to Anthropic shape in `llm-adapter.ts`.
4. **`$6 Anthropic top-up is load-bearing during migration**. Fallback wrapper cascades to Anthropic when MiniMax 429s. Don't let it drain.
5. **`AGENT_PROVIDER=minimax` is already set** in `.env.local`. The provider router uses it. Scripts that bypass the router (graders pre-3a) hit Anthropic directly; after 3a they route via env.
6. **`LLM_PROVIDER` (different env var) controls the bot adapter** (`llm-adapter.ts`). Defaults to `anthropic`. Set to `minimax` to flip. Independent of `AGENT_PROVIDER`.

### Audit findings (separately actionable — see runbook for recipes)
- **§3.7 Telford Smith $59K quadruple** — keep PAID bill `843767e6`, void 3 others via Xero UI (Tier 3)
- **§4.5 Three parallel tagger rule stores** — pick DB as canonical, archive JSON + tag_inference_rules
- **§6.1 PM2 "outage" was misread** — finance crons stopped between firings is NORMAL. Real issues: Anthropic credit (now $6), Xero token expired (Phase 0 still pending)
- **§7.5 $735K AP backlog** — all 389 AUTHORISED bills overdue; mostly paid-outside-Xero, need payment records applied in Xero UI (Tier 2)
- **§7.7 1,010 unreconciled bank txns ($1.8M)** — UI-only; reconciliation sprint needed

### Open from prior session (carried over, still relevant)
1. **Grill-me Q1** — canonical receipt-capture path (recommended B = Dext + connectors). Affects whether to comment out the receipt-chain in PM2 config (Fix 3 in runbook, NOT done).
2. **Xero re-auth** — `node scripts/xero-auth.mjs` (interactive browser flow). Token expired 2026-05-18, blocks Xero MCP reads. Run when you get a chance.
3. **Sydney trip 2025-10-01 + 2025-10-13 cluster** — what project?
4. **Hong Kong $63.70 SP BINGELI SAN PO KONG** — real or skim?
5. **ACT Pty date** — 22 or 24 Apr 2026? Need ASIC extract.

### Pending Ben decisions for Phase 4
1. **OK to replace `claude-3-5-haiku` bot with `MiniMax-M2.7-highspeed`?** Tool-call accuracy may shift.
2. **If voice grader fails calibration, keep on Claude as exception, or accept drift?**
3. **Anthropic — temporary bridge or permanent fallback?** Recommend permanent fallback at small balance.
4. **OK with ~10 min bot downtime during Phase 4d staged rollout?**

### How to resume
1. SessionStart hook loads this ledger.
2. Run the rate-limit probe (curl from step 1 of original plan, or just retry `/tmp` spike if you re-create it).
3. If MiniMax up: re-run spike-test (Phase 4c) to verify response-shape conversion end-to-end, then Phase 3b calibration → Phase 4d Telegram flip.
4. Use `git log --since='2 hours ago' --all --oneline` first to flag any cross-session work.
5. Update this ledger after each phase completes.

### Files state
- Branch: `main`, clean (last 8 commits all on main, last is `fb42a72`)
- Unmodified work-tree (wiki/ auto-syncs from crons NOT staged — left for cron to manage)
- Adapter at `apps/command-center/src/lib/llm-adapter.ts` — 243 lines, **now wired to 5 callers** (passthrough mode while `LLM_PROVIDER` unset)
- Migration plan at `thoughts/shared/plans/minimax-full-migration-2026-05-22.md` — has full phase-by-phase detail
- Fix runbook at `thoughts/shared/plans/finance-fix-runbook-2026-05-22.md` — has 14 recipes
- Audit report at `thoughts/shared/reports/finance-audit-2026-05-21.md` — 8 sections, Top 10 in §8
- RCA at `thoughts/shared/reports/finance-rca-2026-05-22.md` — 5 patterns + 3 watchdog signals

---

## Archive — prior session content

Prior content from 2026-05-19 handoff archived to `thoughts/shared/handoffs/2026-05-19-money-state-of-play.md` (see related_handoffs frontmatter). The "grill-me Q1 awaiting Ben's choice" question is captured in the Open from prior session section above.

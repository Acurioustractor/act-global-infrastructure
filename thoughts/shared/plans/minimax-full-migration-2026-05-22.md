---
title: MiniMax Full Migration (all-in)
date: 2026-05-22
status: in_progress
chosen_option: C-full (everything including bot + dashboard)
trigger: Anthropic credit balance exhausted; AGENT_PROVIDER=minimax already set; provider router exists but only ~half of callers use it
estimated_effort: 2-3 days across multiple sessions
plan_trailer: minimax-full-migration-2026-05-22
progress:
  - Phase 0 (baseline commit 3442592): DONE
  - Phase 1 (router hardening 07793dd): DONE — incl. <think>-block stripping, MiniMax pricing, fallback wrapper
  - Phase 2 (3 non-grader scripts a73d1f9): DONE — ai-route-dext-doc, grant-sources LLM path, suggest-code; fallback wrapper proven under real rate-limit
  - Phase 3a (4 graders code refactor 89d9355): DONE — code only, calibration deferred
  - Phase 3b (calibration runs): DEFERRED — MiniMax 5h rate limit hit; running --calibrate now would cascade to Anthropic and burn the $6 top-up
  - Phase 4 (bot + dashboard adapter): NOT STARTED — needs 1-2 days, fresh session
  - Phase 5 (verification + cleanup): NOT STARTED
findings_during_migration:
  - MiniMax-M2.7 emits <think>...</think> reasoning blocks; strip in router (fixed)
  - MiniMax-M2.7 ~30% larger output for same task vs Claude; bumped maxTokens 50% in all graders
  - MiniMax has 5-hour rolling rate limit on this API key tier; production volume will need paid tier
  - Fallback wrapper transparently caught a MiniMax 429 during Phase 2 and routed to Anthropic — confirms architecture works
---

# MiniMax Full Migration — 2026-05-22

## Scope (16 files, 3 domains)

### Domain A — Non-grader scripts (3 files)
- `scripts/ai-route-dext-doc.mjs` — hardcodes Claude Sonnet via `--model` flag
- `scripts/lib/grant-sources.mjs` — direct Anthropic
- `scripts/lib/projects/suggest-code.mjs` — direct Anthropic

### Domain B — Graders (4 files + 4 fixture sets)
- `scripts/grade-voice.mjs` + 6 Curtis fixtures (writing-voice.md canon)
- `scripts/grade-pack.mjs` + good-*.md/bad-*.md fixtures
- `scripts/grade-funder-cadence.mjs` + `thoughts/shared/rubrics/fixtures/funder-cadence/`
- `scripts/grade-alignment-loop-synthesis.mjs` + `thoughts/shared/rubrics/fixtures/alignment-loop-synthesis/`
- `scripts/lib/alignment-loop-grade.mjs` (helper, used by `synthesize-project-truth-state.mjs`)

### Domain C — Command-center bot + dashboard (7 files)
- `apps/command-center/src/app/api/agent/chat/route.ts` — agent loop, multi-turn, multi-tool
- `apps/command-center/src/app/api/grants/[id]/draft/route.ts` — single completion
- `apps/command-center/src/app/api/transactions/suggest/route.ts` — single completion
- `apps/command-center/src/lib/agent-loop.ts` — agent loop helper
- `apps/command-center/src/lib/telegram/conversation-state.ts` — Telegram conversation state
- `apps/command-center/src/lib/tool-definitions.ts` — **19-tool schema (Anthropic format)**
- `apps/command-center/src/lib/tools/actions.ts` — tool action handlers

## Phases (with explicit stop points)

### Phase 0 — Anthropic top-up + commit baseline (10 min)
**Why:** keep things working during migration. Avoid the "broken services AND migration risk" double-bind.

- [ ] Top up account.anthropic.com (you do this manually)
- [ ] Commit current session work as baseline (Fix 1 NAB filter + audit + RCA + runbook)
- [ ] Tag baseline: `git tag pre-minimax-migration`

**STOP point:** Confirm Anthropic is back online before starting Phase 2.

---

### Phase 1 — Provider router hardening (30 min)
**Why:** before refactoring 16 callers, make sure the router is robust.

- [ ] Add MiniMax pricing entries to `PRICING` in `scripts/lib/llm-client.mjs` (currently empty for minimax, breaks `calculateCost`)
- [ ] Add fallback chain: if MiniMax errors (rate limit / 500), fall back to Anthropic for that call. Cap at 1 retry.
- [ ] Add `trackedAgentCompletionWithFallback` helper that wraps `trackedAgentCompletion` + per-provider error handling
- [ ] Test: `AGENT_PROVIDER=minimax node scripts/lib/llm-client.mjs test`

**STOP point:** router test passes for all 4 providers (anthropic/minimax/gemini/openai) before Phase 2.

---

### Phase 2 — Domain A scripts refactor (1-2 hrs)
**Why:** lowest risk, biggest velocity demonstration. These are routers, not graders.

For each script in Domain A:
- [ ] Replace `new Anthropic({...})` + `anthropic.messages.create(...)` with `import { trackedAgentCompletion } from './lib/llm-client.mjs'` and `trackedAgentCompletion(prompt, 'script-name', { task, system, maxTokens })`
- [ ] Run script with a sample input, verify output shape unchanged
- [ ] Compare a sample MiniMax output side-by-side with a known-good Claude output — flag any structural differences

**Per-script test:**
- `ai-route-dext-doc.mjs`: route 1 doc, verify confidence + project_code chosen reasonably
- `grant-sources.mjs`: search 1 known funder, verify result quality
- `projects/suggest-code.mjs`: suggest code for 1 known vendor, verify

**Commit:** `feat(llm): route Domain A scripts via provider router → MiniMax. Plan: minimax-full-migration-2026-05-22`

**STOP point:** all 3 scripts produce sensible output on MiniMax. If any are wildly off, that's a signal Phase 3 (graders) will need more care.

---

### Phase 3 — Graders + re-calibration (3-5 hrs)
**Why:** graders are the calibration-sensitive payload. Curtis 6/6 baseline must be re-established against MiniMax.

For each grader in Domain B:
- [ ] Refactor to use `trackedAgentCompletion` (or keep direct call if model semantics matter)
- [ ] Run `--calibrate` mode against fixtures
- [ ] Compare results to known-good (Sonnet 4.6) baseline:
  - **6/6 match** → promote to production
  - **5/6 match** → revise rubric threshold OR pick different MiniMax model (M2.7-highspeed for cheap, M2.7 for mid)
  - **<5/6** → document drift, consider keeping Claude for THIS grader only
- [ ] Document calibration history in each rubric file (timestamp + verdict + threshold changes)

**Per-grader detail:**
- `grade-voice.mjs`: 6 fixtures from writing-voice.md. Curtis method (name room/body/abstract noun/stop line). If MiniMax-M2.7 over- or under-detects "AI tells" (delve, crucial, pivotal, tapestry), adjust regex pre-pass OR provide explicit reject-list in system prompt.
- `grade-pack.mjs`: good-*.md / bad-*.md in (fixtures dir TBD — find in script). R&D evidence pack scoring.
- `grade-funder-cadence.mjs`: `thoughts/shared/rubrics/fixtures/funder-cadence/`. Funder relationship cadence rubric.
- `grade-alignment-loop-synthesis.mjs`: `thoughts/shared/rubrics/fixtures/alignment-loop-synthesis/`. Self-grading for synthesize-* scripts.

**Commit:** `feat(graders): migrate to MiniMax-M2.7, re-calibrate against fixtures. Plan: minimax-full-migration-2026-05-22`

**STOP point:** all 4 graders pass calibration (6/6 or documented drift acceptable). If voice grader fails calibration, **do not migrate** — keep it on Claude as a known exception.

---

### Phase 4 — Bot + dashboard (1 day — REVISED, less risky than feared)

**Critical revision after 2026-05-22 research:** MiniMax M2.7 accepts Anthropic-format tool definitions natively at `/v1/chat/completions`. Per their docs (https://platform.minimax.io/docs/guides/text-m2-function-call), both SDK formats work against the same endpoint:

- Anthropic-style: `{ name, description, input_schema, ... }` → response has `tool_use` blocks
- OpenAI-style: `{ type: 'function', function: {...} }` → response has `tool_calls` array

**This means the bot's existing Anthropic-shaped tool definitions can stay.** Phase 4a shrinks from "build a translation adapter" to "swap the SDK base URL + auth header". Estimated effort drops 1-2 days → 4-6 hours.

#### Phase 4a — Adapter layer (1-2 hrs, not 3)
- [ ] Create `apps/command-center/src/lib/llm-adapter.ts`
- [ ] Implement `complete(messages, tools, options)` that picks provider via `LLM_PROVIDER` env (default `anthropic`)
- [ ] For Anthropic path: passthrough using existing SDK
- [ ] For MiniMax path: same Anthropic SDK pattern, but post to `MINIMAX_BASE_URL` with `MINIMAX_API_KEY`. Tool format passes through unchanged.
- [ ] **Verify with one tool-call round-trip** before committing — confirm MiniMax actually emits Anthropic-shaped `tool_use` blocks (docs say yes; trust-but-verify)
- [ ] If MiniMax emits OpenAI-format despite Anthropic-format input, fall back to a thin response converter (~30 lines)

#### Phase 4b — Migrate non-bot routes (2 hrs)
- [ ] `api/grants/[id]/draft/route.ts` — single completion, lowest risk
- [ ] `api/transactions/suggest/route.ts` — single completion, lowest risk
- [ ] Test each via curl with sample payload, compare output to Claude baseline

#### Phase 4c — Migrate agent loop (3 hrs)
- [ ] `lib/agent-loop.ts` — refactor to use adapter
- [ ] `lib/tool-definitions.ts` — make sure tool schemas are adapter-compatible (Anthropic JSON Schema format works for both)
- [ ] `lib/tools/actions.ts` — verify tool handlers don't depend on Anthropic-specific response shape
- [ ] Test with all 19 tools (script: loop through each tool with a synthetic input)

#### Phase 4d — Migrate Telegram bot (3 hrs)
- [ ] `lib/telegram/conversation-state.ts` — adapter integration
- [ ] `api/agent/chat/route.ts` — flip provider behind LLM_PROVIDER flag
- [ ] **Staged rollout:**
  1. Deploy with LLM_PROVIDER=anthropic (no-op)
  2. Set LLM_PROVIDER=minimax for 1 hour, monitor Telegram
  3. If clean, leave at minimax. If issues, flip back.
- [ ] Post test interactions through the bot — exercise: status query, finance question, draft writing, tool use

**Commit:** `feat(bot): migrate command-center + Telegram to MiniMax via adapter layer. Plan: minimax-full-migration-2026-05-22`

**STOP point per sub-phase.** Don't bundle. Each commit is independently reversible.

---

### Phase 5 — Verification + cleanup (1 hr)
- [ ] Run all PM2 finance crons manually (`pm2 start <name>`), check logs for MiniMax provider in `llm_usage` table
- [ ] Send 5 sample Telegram messages exercising different tools
- [ ] Run `node scripts/lib/llm-client.mjs costs` to see provider distribution
- [ ] Update `MEMORY.md` with "MiniMax is primary; Anthropic is fallback"
- [ ] Update `CLAUDE.md` integration table: Anthropic → MiniMax (Anthropic noted as fallback)
- [ ] Decide: keep Anthropic credit topped up for fallback, or let it drain (riskier but cheapest)

**Final commit:** `chore(llm): document MiniMax-primary state in MEMORY + CLAUDE. Plan: minimax-full-migration-2026-05-22`

---

## Rollback strategy

| Phase | Rollback |
|---|---|
| Phase 1 | `git revert` of router-hardening commit |
| Phase 2 | `git revert` of script-refactor commit |
| Phase 3 | `git revert` per grader (each commit is independent) |
| Phase 4 | Set `LLM_PROVIDER=anthropic` env var — adapter routes back to Claude. No code revert needed. |
| Phase 5 | Documentation only — no system effect |

The `LLM_PROVIDER` feature flag in Phase 4 is the load-bearing safety mechanism — if anything breaks in the bot, flip one env var.

---

## Risks + mitigations

1. **MiniMax tool-use format is OpenAI-compat function calling, NOT Anthropic typed `tool_use` blocks.**
   - Mitigation: adapter layer (Phase 4a) hides the difference from existing code.

2. **Grader calibration drift.** Curtis 6/6 baseline was against Sonnet 4.6. MiniMax-M2.7 will score differently.
   - Mitigation: per-grader STOP point. If calibration fails, keep that grader on Claude.

3. **MiniMax international API availability.** Single provider risk.
   - Mitigation: Phase 1 fallback chain in router. If MiniMax 5xx, retry on Anthropic.

4. **Bot regression invisible until user interacts.** Telegram bot is the highest user-impact surface.
   - Mitigation: feature flag rollout (Phase 4d). Stage at 1 hour observation window.

5. **Streaming response semantics may differ.** MiniMax `/chat/completions` is OpenAI-compat; check whether the agent-loop uses streaming (probably not, but verify).
   - Mitigation: read `lib/agent-loop.ts` carefully in Phase 4c.

6. **Cost tracking accuracy.** MiniMax pricing not in `PRICING` table.
   - Mitigation: Phase 1 adds it.

---

## Out of scope (do not touch)

- OCR via Gemini 2.5 Flash Lite (`scripts/ocr-bank-txn-attachments.mjs`, `ocr-dext-processing.mjs`) — separate provider, working well
- Embeddings via OpenAI (`scripts/lib/llm-client.mjs:embed`) — different use case
- Voice transcription
- Image generation (mcp__gemini-image, mcp__pencil)
- Telegram bot's existing Claude integration that's referenced in CLAUDE.md as "19 agent tools, claude-3-5-haiku" — that's the SAME thing as Domain C; it's IN scope, just clarifying naming

---

## Session boundaries

Phase 0-2 fits in one ~3hr session (today).
Phase 3 is its own ~4hr session (graders + calibration).
Phase 4 is 1-2 sessions over 1-2 days (bot is high-risk, needs eyes on each sub-phase).
Phase 5 is 30 min after everything else lands.

**Recommended:** do Phase 0-2 now (we're already here, hot context). Pause. Schedule Phase 3 for tomorrow. Phase 4 across days 2-3.

---

## Open questions for Ben

1. **Are you OK with `claude-3-5-haiku` (current bot model) being replaced by `MiniMax-M2.7-highspeed`?** Latency may shift; tool-call accuracy may differ.
2. **Voice grader: if calibration fails (< 6/6), keep it on Claude as exception, or accept drift and lower threshold?** This affects every public-facing piece of writing.
3. **Want the Anthropic top-up to be temporary (drain after migration) or permanent fallback?**
4. **Are we OK breaking the bot for ~10 min during Phase 4d staged rollout?** Worst case: roll back, no permanent damage, but no Telegram during the window.

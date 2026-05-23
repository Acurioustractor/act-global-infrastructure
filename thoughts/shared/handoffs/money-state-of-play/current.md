---
title: Money state of play — audit complete, MiniMax Phase 4b shipped, D1/D4 locked, Phase 4d mechanics CORRECTED
date: 2026-05-23
status: open — Phase 4b done (5 command-center callers wired); D1+D4 resolved; D2/D3 deferred; Phase 4c spike + 3b calibration + 4d Telegram flip blocked on next MiniMax 5h-window reset (2026-05-23T00:00:00Z)
session: claude (Opus 4.7, 1M context) — 2026-05-22 resume + Phase 4d mechanics correction (bot is Vercel, not PM2)
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
**Updated:** 2026-05-23T03:45:00Z
**Goal:** MiniMax migration complete + Gemini Flash Lite layered for cheap tier. Bot routes Haiku→Gemini (free 1,500/day), Sonnet→MiniMax-M2.7, fallback→Anthropic. Audit doc shipped for 46 bot tools.
**Branch:** main, all 7 session commits pushed through `022ee11`.
**Bot is LIVE on Gemini+MiniMax** in production. Webhook at `command.act.place/api/telegram/webhook`.
**Rollback per layer:**
  - Plan C off: `vercel env rm LLM_CHEAP_PROVIDER production` (Haiku → MiniMax-M2.7)
  - All MiniMax off: `vercel env rm LLM_PROVIDER production` (full Anthropic passthrough)

### Now (production live on Gemini+MiniMax, 4 of 5 tool-gate tests pending)
1. ✅ **Phase 4c spike** (22:21Z): all 3 tests green against `MiniMax-M2.7` regular.
2. ✅ **Phase 3b grader calibration** (22:22–22:38Z), with extractJson() + temp=0:
   | Grader | Final | Notes |
   |---|---|---|
   | grade-voice | **10/10** | OK to flip — D2 not triggered |
   | grade-pack rd-evidence | 4/6 | 1 real drift (good-1: $70k vs $122.5k fixture bug MiniMax caught) |
   | grade-funder-cadence | 4/6 | drifts shift run-to-run despite temp=0 |
   | grade-alignment-loop | 4/6 | drifts shift run-to-run |
   | **TOTAL** | **22-23/28 (~80%)** | (varies slightly run-to-run) |
   - Voice grader stays on MiniMax. Other 3 should pin to Anthropic via `GRADE_*_MODEL=claude-sonnet-4-6` until prompt-tightening reduces drift.
3. ✅ **Plan B — Haiku route remap** (commit `37bfcfa`). MINIMAX_MODEL_MAP cheap-tier now routes to `MiniMax-M2.7` (regular). Highspeed requires separate $40/mo Plus-Highspeed plan we don't have — confirmed via research, MiniMax-M2.7-highspeed returns `429 (0/0 used)` structurally (cap is permanently zero on Plan Plus).
4. ✅ **Phase 4d Test (a) PASSED in production**: "what is our cash position?" returned full structured reply with $851,640 balance, $602K receivables, $735K payables, 44-month runway, "collection trough" insight, actionable next-steps. End-to-end proven: webhook → adapter → MiniMax-M2.7 → Xero tool-call → response synthesis → Telegram delivery.
   - **Vercel runtime logs lag the actual function completion** — only the FIRST console.log surfaced in get_runtime_logs (`[agent] Mode switched to: f...`). Don't roll back on silence; check Telegram delivery instead. I made this mistake at 00:39Z, immediately restored.
5. 🟡 **Tests (b)–(e) deferred** — Ben to run when ready. Bot stays live in the meantime.
   - (b) Notion capture: "Add to money sync: bot now on MiniMax"
   - (c) Gmail draft: "Draft an email to nicholas@act.place subject 'minimax test' body 'ignore'"
   - (d) Calendar create: "Schedule a 15-min event tomorrow 9am called MiniMax verification"
   - (e) Compound (Sonnet route): "Analyze our spend across the last quarter and compare to budget"
6. ✅ **Plan C — Gemini Flash Lite as cheap-tier primary** (commit `0706226`, deployed `022ee11`). Adapter has `createViaGemini` + per-tier routing. Env: `LLM_CHEAP_PROVIDER=gemini` + `GEMINI_API_KEY` set in Vercel prod. Spike: 4/4 tests pass (Haiku→Gemini text/tool/follow-up + Sonnet→MiniMax). Gemini dramatically less verbose than MiniMax (7 tok vs 120 for "2+2=4").
7. ✅ **Bot tools × LLM adapter audit** (commit `022ee11`, doc at `thoughts/shared/audits/bot-tools-llm-adapter-2026-05-23.md`). 46 tools categorised by integration, risk tier, and per-provider compatibility. 32 reads (Tier 1) safe everywhere. 14 writes (mostly Tier 2 reversible) need spot-testing. Priority order documented.
8. 🔴 **Open follow-ups** (none blocking; pick by interest):
   - Rotate `TELEGRAM_WEBHOOK_SECRET` (the value is in this session's conversation log — not exposed elsewhere)
   - Spot-test priority list from audit: `draft_email` → `create_calendar_event` → `add_meeting_to_notion` → `add_action_item` → complex `query_supabase`
   - Pin 3 drift-y graders to Anthropic via `GRADE_*_MODEL=claude-sonnet-4-6` env override (voice grader stays on MiniMax at 10/10)
   - Phase 5: Anthropic credit becomes $6 fallback buffer (alert when fallback fires)
   - Phase 6: extend AI-mediated workflows that were cost-gated (continuous receipt OCR, continuous tagging, continuous drift detection, voice grading on every artefact, AutoReason loops on every public piece)

### Session commits (10 on main — head is `8406804`)

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
| `3ceab07` | docs(handoff): ledger update — Phase 4b shipped, 4c blocked on rate-limit. |
| `8406804` | docs(handoff): lock D1 (bot swap APPROVED w/ 5-tool gate) + D4 (~10 min attention OK); D2/D3 deferred. Phase 4d execution checklist added with concrete test prompts. |

### Critical findings to remember
1. **MiniMax has a 5h rolling rate limit** on Token Plan Plus ($20/mo, 4,500 req/5h). Each window resets on 5h boundaries (00:00, 05:00, 10:00, 15:00, 20:00 UTC).
2. **MiniMax-M2.7 emits `<think>` blocks always** — cannot fully disable. Use `reasoning_split: true` to keep them out of `content` (baked into router + adapter). But **does not always work** — leakage observed in calibration runs (5/8 grader misses were `json_parse_failed`). Harden JSON extractors as follow-up.
3. **MiniMax accepts Anthropic-format tool definitions** at `/v1/chat/completions`. Response is always OpenAI-shaped → adapter converts to Anthropic shape in `llm-adapter.ts`.
4. **`$6 Anthropic top-up is load-bearing during migration**. Fallback wrapper cascades to Anthropic when MiniMax 429s. Don't let it drain.
5. **`AGENT_PROVIDER=minimax` is already set** in `.env.local`. The provider router uses it. Scripts that bypass the router (graders pre-3a) hit Anthropic directly; after 3a they route via env.
6. **MiniMax-M2.7 and MiniMax-M2.7-highspeed have SEPARATE quotas** (confirmed 2026-05-22T22:18Z). Highspeed can be exhausted (0/0) while regular still has capacity. Implications:
   - Bot defaults to Haiku → highspeed → can be locked out while graders (Sonnet→regular) still work.
   - Phase 4d flip must wait for highspeed quota refresh, not just "any MiniMax quota".
   - Calibration testing model choice matters — Haiku-mapped models exercise highspeed, Sonnet/Opus-mapped exercise regular.
7. **Bot is a Vercel webhook**, not PM2 (corrected this session). See Phase 4d execution checklist below.
8. **`LLM_PROVIDER` (different env var) controls the bot adapter** (`llm-adapter.ts`). Defaults to `anthropic`. Set to `minimax` to flip. Independent of `AGENT_PROVIDER`.

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

### Ben decisions for Phase 4
1. ✅ **RESOLVED 2026-05-22** — Bot Haiku → M2.7-highspeed swap APPROVED, conditional on the tighter 5-tool-call check below. If any tool call fails to fire or fires with wrong args → unset `LLM_PROVIDER` immediately, no "close enough".
2. **OPEN** — If voice grader fails calibration, keep on Claude as exception, or accept drift? (Only relevant after Phase 3b runs.)
3. **OPEN** — Anthropic — temporary bridge or permanent fallback? Recommend permanent fallback at small balance (~$6 working capital). Decision deferred.
4. ✅ **RESOLVED 2026-05-22** — ~10 min Phase 4d attention window accepted (implicit in D1).

### Phase 4d execution checklist (highspeed quota refreshes 2026-05-23T00:00:00Z)

**Status as of this update:**
- ✅ Steps 1–3 (probe + spike + grader calibration) DONE this session.
- 🔴 Step 4 (Vercel flip) **blocked on highspeed quota refresh** — bot's Haiku route hits exhausted `MiniMax-M2.7-highspeed` until 00:00Z.
- Once highspeed refreshes, resume from step 4 below.

1. ✅ **DONE — Re-probe** rate-limit (22:07Z + 22:18Z): regular quota OK, highspeed `0/0 used`. Note: base URL already includes `/v1`, append `/chat/completions` only.
2. ✅ **DONE — Phase 4c spike** (22:21Z): all 3 tests pass against `MiniMax-M2.7` (regular). Spike code at `/tmp/spike-llm-adapter.ts`.
3. ✅ **DONE — Phase 3b grader calibration** (22:22–22:27Z): 20/28 (71%) — see table in §Now above. **5/8 misses are JSON parse**, not verdict drift. Voice grader 9/10 is OK to flip. Other 3 graders: pin to Anthropic via `GRADE_*_MODEL=claude-sonnet-4-6` env override OR harden JSON extractor as follow-up.
4. **Phase 4d staged Telegram flip (VERCEL, NOT PM2)** — bot runs in Vercel command-center deployment.
   - `env -u VERCEL_PROJECT_ID -u VERCEL_ORG_ID vercel env add MINIMAX_API_KEY production` (paste value from `.env.local`)
   - `env -u VERCEL_PROJECT_ID -u VERCEL_ORG_ID vercel env add MINIMAX_BASE_URL production` (value: `https://api.minimax.io/v1`)
   - `env -u VERCEL_PROJECT_ID -u VERCEL_ORG_ID vercel env add LLM_PROVIDER production` (value: `minimax`)
   - Trigger redeploy: `env -u VERCEL_PROJECT_ID -u VERCEL_ORG_ID vercel --prod` from `apps/command-center` (or push a no-op commit to main if Vercel auto-deploys from git).
   - Tail logs: `env -u VERCEL_PROJECT_ID -u VERCEL_ORG_ID vercel logs <deployment-url> --since 5m` (watch for adapter errors).
   - **Rollback in one command**: `vercel env rm LLM_PROVIDER production` + redeploy. The other two env vars (MiniMax API key + base URL) can stay set — they're inert unless `LLM_PROVIDER=minimax`.
5. **5-tool accuracy gate** — send these from your phone, in order. Each must produce a correct tool_use call with correct args. **Any failure → `vercel env rm LLM_PROVIDER production`, redeploy, abort.**
   - **(a) Read-only finance query** — e.g. "What's our cash position?" — exercises a read tool, no side effects, fast smoke-test.
   - **(b) Capture-to-Notion write** — e.g. "Add to money sync: bot now on MiniMax" — exercises Notion API + the bot's text-to-structured-data step.
   - **(c) Gmail draft** — e.g. "Draft an email to nicholas@act.place subject 'minimax test' body 'ignore'" — exercises a write tool with multi-field args.
   - **(d) Calendar create** — e.g. "Schedule a 15-min event tomorrow 9am called MiniMax verification" — exercises date parsing + calendar API.
   - **(e) Long compound query that triggers Sonnet route** — e.g. "Analyze our spend across the last quarter and compare to budget" — forces `selectModel()` → SONNET_MODEL → `MiniMax-M2.7` (non-highspeed). Verifies both models work.
6. **Observe 30 min** with `vercel logs`. If clean → leave on MiniMax. If any flake → `vercel env rm LLM_PROVIDER production`, redeploy, file what broke.
7. **Update ledger**: mark Phase 4d closed (or aborted with reason). Commit-trailer `Plan: minimax-full-migration-2026-05-22`.

### How to resume
1. SessionStart hook loads this ledger.
2. `git log --since='2 hours ago' --all --oneline` to flag any cross-session work.
3. **Follow the "Phase 4d execution checklist" above, in order.** Steps 1–7 are the entire resume plan. D1 + D4 are pre-approved; D2 only fires if voice-grader drifts > 1 tier; D3 still open but doesn't block 4d.
4. Update this ledger after each step. Use commit-trailer `Plan: minimax-full-migration-2026-05-22`.

### Files state
- Branch: `main`, **1 commit ahead of pushed `8406804`** (head `3975717` — ledger correction). Not pushed yet.
- Work-tree has cron-managed wiki/ noise + uncommitted ledger updates from this session. Calibration reports updated under `thoughts/shared/rubrics/` (modified by graders).
- Adapter at `apps/command-center/src/lib/llm-adapter.ts` — 243 lines, **wired to 5 callers** in passthrough mode (`LLM_PROVIDER` unset → Anthropic SDK)
- **Vercel command-center prod env (verified 2026-05-22T22:15Z)**: only `ANTHROPIC_API_KEY` set among LLM vars. No `MINIMAX_*`, no `LLM_PROVIDER`. Bot in prod is on Claude. Adapter is inert until Vercel env flipped.
- **Calibration reports written this session:**
  - `thoughts/shared/rubrics/act-voice-curtis.calibration.md` — 9/10
  - `thoughts/shared/rubrics/fixtures/rd-evidence/_calibration.md` — 5/6 (good-1 fixture has real internal salary inconsistency to fix)
  - `thoughts/shared/rubrics/funder-cadence.calibration.md` — 3/6 (2 JSON parse errors)
  - `thoughts/shared/rubrics/alignment-loop-synthesis.calibration.md` — 3/6 (2 JSON parse errors)
- Spike script at `/tmp/spike-llm-adapter.ts` — staged but not run (quota empty)
- Migration plan at `thoughts/shared/plans/minimax-full-migration-2026-05-22.md` — full phase-by-phase detail
- Fix runbook at `thoughts/shared/plans/finance-fix-runbook-2026-05-22.md` — 14 recipes
- Audit report at `thoughts/shared/reports/finance-audit-2026-05-21.md` — 8 sections, Top 10 in §8
- RCA at `thoughts/shared/reports/finance-rca-2026-05-22.md` — 5 patterns + 3 watchdog signals

### Phase 4d mechanics correction note (2026-05-22 resume)
Prior ledger said "flip `LLM_PROVIDER` in `ecosystem.config.cjs` + `pm2 reload`". **Wrong.** Telegram bot is a Vercel-hosted Next.js webhook (`apps/command-center/src/app/api/telegram/webhook/route.ts`), not PM2. PM2 has `telegram-daily-focus` and `telegram-money-alerts` (push-only cron scripts) but **no webhook process**. Real flip is via `vercel env add` + redeploy — see step 4 of the checklist above. Verified by reading the route file (it's an App Router POST handler with `maxDuration = 60`) and `vercel env ls` (no MiniMax config in prod).

---

## Archive — prior session content

Prior content from 2026-05-19 handoff archived to `thoughts/shared/handoffs/2026-05-19-money-state-of-play.md` (see related_handoffs frontmatter). The "grill-me Q1 awaiting Ben's choice" question is captured in the Open from prior session section above.

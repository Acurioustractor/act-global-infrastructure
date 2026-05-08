# ACT Money Brain — daily runbook

> One page. What to run, in what order, every day / week / quarter, to keep the finance, R&D, receipts, and tax stack honest.
> Last verified: 2026-05-08. Branch: `codex/recover-finance-money-alignment`.

## The 4-Surface Model (which surface for which use case)

| Surface | Job | Front door |
|---|---|---|
| **Notion** | Read · plan · capture · decide | `notion.so/357ebcf981cf8101bc12dd5eab9ebec5` (ACT Money Framework) |
| **Command-center `/finance/*`** | Operate (tag, fix receipts, reconcile) | `https://command.act.place/finance` |
| **Scripts `scripts/*.mjs`** | Automate + admin (cron + ops) | `node scripts/<x>.mjs` |
| **Telegram bot** | Push (briefing, digest, /standup) | grammY webhook |

When in doubt: **Notion for reading · command-center for operating · scripts for automating · Telegram for pushing.**

## State of the system, in one paragraph

Three Supabase instances (operational `tednluwflfhxyucgwigh`, EL v2 `yvnuayzslukamizrlhwb`, media-only `uaxhjzqrdotoahjnxmbj`). Xero connected via refresh-token rotation (`scripts/sync-xero-tokens.mjs`). GHL contacts + opportunities synced (333 opps, 276 tagged with `project_code`, 83% coverage). Xero transactions synced (3,062 rows, 2,990 project-tagged at 97.6%, 363 flagged `rd_eligible`). Notion money-stack: 26 fresh dashboards, 0 drift, 0 missing. Receipts: 95.3% of transactions matched to receipt files via Gemini OCR + Xero bill attachment copying. R&D evidence pack scores WARN/62 (ceiling until Standard Ledger + AusIndustry inputs land).

## Daily — 60 seconds

```bash
node scripts/daily-money-briefing.mjs
```

Posts to Telegram. Shows: bank balance, runway, due-this-week, yesterday's wins, new pipeline, top overdue, today's critical/high tasks. The single source of truth for "what does today look like."

If anything looks off:
```bash
node scripts/money-status.mjs              # full money-stack alignment + Notion audit
```

## Weekly — Monday 8am AEST (cron, no manual action)

PM2 cron runs `scripts/weekly-reconciliation.mjs` automatically. It posts a Telegram digest with:

- BAS readiness % by value
- Receipt match rate (matched / no-receipt / missing)
- Tagged / untagged
- R&D eligible $ + offset at risk
- Four-lanes (To Us / To Down / To Grow / To Others)
- Soul check
- **Voice scan** (Tier 1, deterministic, free) — flags Curtis-method failures in any draft modified in the last 7 days
- **R&D pack score** — current rubric grade, top gaps

If the cron didn't fire, run it by hand:
```bash
node scripts/weekly-reconciliation.mjs
```

## When you want to refresh Notion dashboards on demand

```bash
node scripts/populate-money-dashboards.mjs                       # full chain (17 steps)
node scripts/populate-money-dashboards.mjs --skip ghl-cleanup    # skip the destructive --apply step
node scripts/populate-money-dashboards.mjs --dry-run             # list steps, no action
node scripts/populate-money-dashboards.mjs --only money-status,money-framework,opportunities-db
```

After this runs, the Notion money-stack is fresh. Open `notion.so/357ebcf981cf8101bc12dd5eab9ebec5` for the dashboard hub.

## Receipt management — the loop

1. **Email connectors** auto-route receipts (Qantas, Uber, Webflow, Virgin, Booking) to billing addresses — receipts land on Xero bills
2. **`scripts/sync-bill-attachments-to-txns.mjs`** copies receipts from bills to bank transactions (Xero API can't do this natively)
3. **Manual receipts** — drop PDFs/images in `thoughts/shared/receipts-inbox/`
4. **`scripts/ocr-dext-processing.mjs`** — Gemini 2.5 Flash Lite OCRs them (~10× cheaper than Claude Haiku for bulk)
5. **`scripts/auto-tag-fy26-transactions.mjs`** — auto-tags `project_code` from contact + line item rules
6. **`scripts/tag-rd-eligibility.mjs`** — runs the 4-tier conservative R&D classifier (CORE_RD / SUPPORTING_RD / REVIEW / INELIGIBLE) and writes `rd_eligible` + `rd_category` to `xero_transactions`

Receipt match rate today: **95.3%** ([1,772 invoices, 3,062 transactions, 363 R&D-eligible](apps/command-center/src/app/finance/reconciliation/page.tsx))

## R&D Tax Incentive — Australia, Path C

Locked decision (2026-04-27): FY24-25 forfeited (sole-trader period, ineligible). **Claim FY25-26 via A Curious Tractor Pty Ltd ACN 697 347 676**, lodgement window Jul 2026 – 30 Apr 2027. Key reference: [project_rd_tax_incentive.md](~/.claude/projects/-Users-benknight-Code-act-global-infrastructure/memory/project_rd_tax_incentive.md).

### Pack assembly state (today)
- **Location:** `thoughts/shared/rd-pack-fy26/`
- **Registers:** ACT-CG, ACT-EL, ACT-GD, ACT-JH (4 core activities, $354,047 total)
- **Score:** WARN/62 (rubric `thoughts/shared/rubrics/rd-evidence-pack.md`)
- **Re-grade:** `node scripts/grade-pack.mjs --rubric thoughts/shared/rubrics/rd-evidence-pack.md --pack thoughts/shared/rd-pack-fy26`

### Open warnings (in priority)
1. **Rule 1.5 — personnel basis Unverified.** Closes when Standard Ledger countersigns the decision log. Email drafted in Gmail (`thoughts/shared/drafts/standard-ledger-combined-ask-2026-05-07.md`). Send + attach four files.
2. **Rule 1.2 — AusIndustry registration not filed.** Hard fail until Jul 2026 lodgement window opens.
3. **Rule 2.3 — gold sets.** ACT-CG 200-row + ACT-JH 100-row hand-labelled entity-resolution / procurement-code pairs.
4. **Rule 2.4 — outcome capture.** ACT-EL third-party leakage audit; ACT-GD treatment cohort run + A1 in production logs.

### Founder pay basis (FY26)
- **Ben:** 95% × $250K Knight Photography invoicing = $237,500
- **Nic:** 40% × $200K retrospective director-salary characterisation = $80,000
- **Refund range:** $130K – $154K at 43.5% refundable offset (Standard Ledger to confirm aggregated turnover < $20M)

## "Sage work" — Standard Ledger workflow

The accountant is **Standard Ledger** (Remco Marcelis, `remco@standardledger.co`). Single email recurring twice a year typically: BAS prep + EOFY. For the cutover-to-PTY year, the cadence is heavier.

### What Standard Ledger needs from us

1. Bank reconciliation up to date in Xero (cron handles this)
2. Receipts attached on every transaction (95.3% today; gap = real)
3. R&D activity registers + decision log signed off **before** lodgement
4. AusIndustry registration filed before R&DTI claim
5. Bad-debt write-offs decided with explicit account codes

### Current Standard Ledger asks (drafted)

- Aleisha bad-debt write-off ($12,150, ~$4-4.5K saving) — Gmail draft staged 2026-05-08
- R&D decision log countersign — same email
- Cutover meeting (sole trader → ACT Pty Ltd, 30 Jun 2026) — already had 2026-05-05 Zoom

## Connectors — health check

| System | State | Fix command |
|---|---|---|
| Supabase MCP | Worktree `.mcp.json` now correctly targets `tednluwflfhxyucgwigh` (gitignored). Restart Claude Code to load. Direct scripts via `.env.local` work today. | `mcp__supabase__get_project_url` should return `tednluwflfhxyucgwigh` after restart |
| Supabase scripts | Healthy via `.env.local` | n/a |
| Xero refresh tokens | Healthy in 3 stores (`.xero-tokens.json`, supabase `xero_tokens`, `.env.local`) | `node scripts/sync-xero-tokens.mjs` |
| Xero MCP | Broken — `invalid_scope` from `xero-mcp-server` client-credentials flow. App scope misconfigured. Use scripts. | (left for later — not blocking) |
| GHL | 333 opps, 276 tagged. Aligner in dry-run shows 56 review-items, 1 auto-assignable. | `node scripts/align-ghl-opportunities.mjs --dry-run` then `--apply` |
| Notion | Money-stack 26 fresh, 0 drift. 17 stale operational dashboards (commandCenter, sprintTracking, etc.) outside money scope. | `node scripts/audit-notion-money-stack.mjs` |
| Telegram bot | 19 agent tools, grammY webhook on Vercel | (running) |

## Skills available — when to use which

| Skill | When |
|---|---|
| `/money-status` | "Where are we on money?" — runs `money-status.mjs` |
| `/standup` | Morning briefing — runs `daily-money-briefing.mjs` |
| `/find-receipt` | Hunt for a missing receipt by amount/date/contact |
| `/tag-transactions` | Review and tag untagged Xero transactions |
| `/scenarios` | Build Base/Upside/Downside cash scenarios |
| `/pile-mix` | Voice/Flow/Ground/Grants pile mix vs FY27 target |
| `/find-grants` | Triage GrantScope for fresh ACT-fit grants |
| `/brief-funder` | Research a foundation/funder |
| `/draft-funder` | Draft outreach in ACT voice |
| `/decision` | Draft a Decisions Log entry for review |
| `/bas-cycle` | BAS quarter prep + receipt acquittal + retro |
| `/align-ghl` | Tag GHL opportunities with project codes |
| `/preflight` | Verify Supabase + TypeScript + schema before DB work |
| `/db-check` | Query actual DB schema before writing code |
| `/ralph` | Long-running autonomous task agent |

## Known issues to clean up later (not blocking)

- **PICC INV-0317 snooze not honoured by daily-briefing.** `do_not_chase_until: 2026-05-21` is set in metadata but the briefing's "top overdue" still surfaces it. Bug in the overdue selector — should filter on the snooze date.
- **Rotary INV-0222 $82,500 at 378 days overdue.** Real bad debt. Decision needed: write off, or escalate.
- **Phantom "Email Standard Ledger — schedule cutover prep meeting" task.** 2026-05-12 due date but the meeting already happened 2026-05-05. Stale task in priorities.
- **17 missing Notion operational pages** (commandCenter, sprintTracking, githubIssues etc.). Outside money scope; cleanup is its own task.
- **Xero MCP scope error.** `xero-mcp-server` uses client-credentials with V2 scopes the app isn't configured for. Direct scripts work; MCP fix is a Xero developer-portal config change.

## Where to look for state, by question

| Question | Read this |
|---|---|
| What's our cash + runway? | `node scripts/daily-money-briefing.mjs` |
| What's overdue? | Same — "Top overdue" section |
| What's the R&D claim worth? | `thoughts/shared/rd-pack-fy26/README.md` |
| What's pending Standard Ledger sign-off? | `thoughts/shared/drafts/standard-ledger-combined-ask-2026-05-07.md` |
| Which transactions need receipts? | `/finance/reconciliation` UI in command-center, or `node scripts/bas-gap-sweep.mjs` |
| Who's untagged in GHL? | `node scripts/align-ghl-opportunities.mjs --dry-run` |
| Which grants are live? | `node scripts/find-grants.mjs` (or `/find-grants` skill) |
| What is the entity migration state? | `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` |
| What's the Notion money-stack state? | `node scripts/audit-notion-money-stack.mjs` |

## Today's gating action (2026-05-08)

**Send the Standard Ledger combined-ask email.** Gmail draft `r-2891210963336562066` is staged. Open in Gmail, attach the four files listed in the draft body, send. That single round-trip closes ~$4-4.5K tax saving + R&D rule 1.5 (~$130-154K refund unblocked). Everything else is downstream of that email.

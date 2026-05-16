# Money Audit — Decision Queue (2026-05-16)

Companion to `inventory.md`. Each item gets a canonical 4-Surface tag (per `CLAUDE.md` 4-Surface Model: **Notion** read/plan · **CC** command-center operate · **Scripts** automate · **Telegram** push) plus a disposition:

- **KEEP** — canonical for its use case
- **MERGE-INTO X** — feature absorbed into a canonical page
- **ARCHIVE** — `git mv` to `_archived/2026-05-16/`
- **HOLD** — decide later (pending build pass or owner input)

---

## React routes (18 active)

| Route | Surface | Disposition | Reason |
|---|---|---|---|
| `/finance` | CC | KEEP | Hub landing page (210 LOC, recent) |
| `/finance/overview` | CC | **KEEP — canonical exec** | CEO money cockpit, 1043 LOC, last edit 7d. Layer-1 of Money Command. |
| `/finance/money-alignment` | CC | **KEEP — canonical alignment** | 445 LOC, 13d old. Coverage/freshness/queue. Layer-2 of Money Command. |
| `/finance/workbench` | CC | **KEEP — canonical operate** | 869 LOC, untracked (in-flight). Unifies bank_lines + xero_transactions + xero_invoices. The action hub. |
| `/finance/pipeline` | CC | **KEEP — canonical incoming** | 1165 LOC, biggest page. Consumes 5 APIs. Layer-1 of "potential incoming". |
| `/finance/projects` + `[code]` | CC | KEEP | 296 LOC, per-project P&L. Heartbeat table will link here. |
| `/finance/receipt-evidence` | CC | KEEP | 1284 LOC — LARGEST page. NOT in nav. Untracked. Wire to nav after Pass B. |
| `/finance/dext-push-audit` | CC | KEEP | 603 LOC, untracked, in-flight GHL alignment work. |
| `/finance/xero-page-copilot` | CC | KEEP | 565 LOC, untracked, in-flight GHL alignment work. |
| `/finance/reconciliation` | CC | KEEP | 774 LOC, 7d. Active receipts dashboard. |
| `/finance/receipts-triage` | CC | KEEP | 255 LOC, 3w. Active triage queue. |
| `/finance/tagger-v2` | CC | KEEP | 865 LOC, 5w. Rapid tagging UI. (Future: may merge into workbench.) |
| `/finance/invoices` | CC | KEEP | 511 LOC, 8w. Invoice command. |
| `/finance/board` | CC | **HOLD** | 688 LOC, 8w. **Board role depends on this** (`nav-data.ts:163`). Cannot kill without role refactor. |
| `/finance/accountant` | CC | **HOLD** | 575 LOC, 8w. Consumes accountant-pack API. Possibly merge into overview's "export accountant pack" button. |
| `/finance/revenue` | CC | **HOLD** | 387 LOC, 8w. Consumes revenue-model API. Merge candidate for `/finance/pipeline`. |
| `/finance/revenue-planning` | CC | **ARCHIVE** | 406 LOC, **3 months old**. Consumes revenue-scenarios API (single caller). Stalest finance route. Pipeline can absorb. |
| `/finance/review` | CC | **ARCHIVE** | 762 LOC, 8w. Workbench supersedes (workbench is the unified action queue with filters). |

**Net effect:** 18 → 16 active routes after Pass A. Down to 13 if HOLDs go in a future cleanup.

---

## API endpoints (40 endpoints; 9 orphans found)

### Orphans (zero UI consumer outside `/api/`) → ARCHIVE

| Endpoint | LOC | Age | Notes |
|---|---:|---|---|
| `/api/finance/dext-setup` | 143 | 9w | Setup wizard endpoint, no UI |
| `/api/finance/flow` | 393 | 9w | Big orphan, 393 LOC, probably superseded by overview/workbench |
| `/api/finance/health` | 567 | 8w | Big orphan — likely superseded by money-alignment + data-quality |
| `/api/finance/pipeline-viz` | 172 | 8w | Route already archived 2026-05-08; API stranded |
| `/api/finance/project-plan` | 255 | 8w | Route already archived 2026-05-08; API stranded |
| `/api/finance/rd-evidence` | 233 | 8w | No UI consumer; R&D evidence lives in `thoughts/shared/rd-pack-fy26/` filesystem |
| `/api/finance/receipt-finder` | 240 | 8w | Likely superseded by `receipt-evidence` (untracked, 593 LOC) |
| `/api/finance/vendor-rules` | 75 | 8w | Route archived 2026-05-08; API stranded |
| `/api/finance/vendor-rules-suggest` | 193 | 3w | Route archived 2026-05-08 but API recently touched — hold for review |

→ **8 archive candidates** (`vendor-rules-suggest` held back due to recent edit).

### Linked to ARCHIVE routes → ARCHIVE alongside

| Endpoint | Linked route |
|---|---|
| `/api/finance/revenue-scenarios` | `/finance/revenue-planning` |
| `/api/finance/review` | `/finance/review` |

### Linked to HOLD routes → HOLD alongside

| Endpoint | Linked route |
|---|---|
| `/api/finance/accountant-pack` | `/finance/accountant` |
| `/api/finance/board-token` | `/finance/board` |
| `/api/finance/revenue-model` | `/finance/revenue` |
| `/api/finance/revenue-reality` | `/finance/pipeline` (KEEP — pipeline calls it) |

---

## Scripts (119 finance-touching, 46 in cron)

This is the sprawl. Cleanup deferred to Pass A2 (a separate audit), because scripts are mostly harness-aware (run via cron, manually-triggered, or one-shot). The few clear archive candidates:

| Script | LOC | Age | Reason |
|---|---:|---|---|
| `scripts/audit-all-secrets.mjs` | 226 | **5 months** | Stalest non-cron finance-adjacent script |
| `scripts/receipt-pipeline.mjs` | 220 | 9w | Superseded by `capture-receipts` + `match-receipts-to-xero` + `push-receipts-to-xero` |
| `scripts/import-dext-to-pipeline.mjs` | 470 | 8w | One-time migration script (Dext drain). Should be moved to `scripts/_one-off/` |
| `scripts/seed-xero-tracking.mjs` | 120 | 3w | One-time seed |
| `scripts/seed-goods-opps-from-xero.mjs` | 290 | 3w | One-time seed |
| `scripts/seed-ghl-grants.mjs` | 129 | 10d | In cron — KEEP (recurring) |
| `scripts/auto-archive-expired-grants.mjs` | 137 | 8w | Possibly superseded by GHL canonical alignment |

→ **3 archive candidates** for Pass A. Rest is Pass A2 (future session, deeper script audit).

**Untracked scripts (committed in flight):** 14 scripts not yet in git. Most are from the GHL canonical alignment work and should be **committed**, not archived. Separate task.

---

## Wiki finance docs (17)

All recent (≤ 13 days). **KEEP all.** Worth noting that `wiki/finance/README.md` (78 LOC, 7d old) is the canonical index — Pass B should add a `/finance/command` reference to it.

---

## Crons (46 finance-touching)

Confirmed sprawl: the plan estimated 11, actual is **46**. Most are legitimate (sync jobs, daily/weekly briefings, audits). One observation:

- 3 weekly-ish digests: `weekly-reconciliation`, `weekly-money-digest`, `weekly-digest`, `weekly-project-pulse`, `weekly-relationship-review`, `notion-weekly-digest`, `notion-weekly-review`. **Likely overlap.** Pass B should consolidate to one Telegram + one Notion weekly artifact.
- 2 daily briefing crons: `daily-money-briefing` + `daily-pulse-sync` + `finance-daily-briefing` + `telegram-money-alerts`. Some may be redundant.

**No cron archived in this pass** — cron cleanup is its own surgery (PM2 + ecosystem.config.cjs + restart). Defer to Pass A2.

---

## Pass A action plan (this session, if user confirms)

**Tier-2 archive moves to stage (~9 routes/APIs total):**

```bash
mkdir -p apps/command-center/src/app/finance/_archived/2026-05-16
mkdir -p apps/command-center/src/app/api/finance/_archived/2026-05-16

# 2 routes
git mv apps/command-center/src/app/finance/revenue-planning apps/command-center/src/app/finance/_archived/2026-05-16/
git mv apps/command-center/src/app/finance/review apps/command-center/src/app/finance/_archived/2026-05-16/

# 2 paired APIs
git mv apps/command-center/src/app/api/finance/revenue-scenarios apps/command-center/src/app/api/finance/_archived/2026-05-16/
git mv apps/command-center/src/app/api/finance/review apps/command-center/src/app/api/finance/_archived/2026-05-16/

# 8 orphan APIs
git mv apps/command-center/src/app/api/finance/dext-setup apps/command-center/src/app/api/finance/_archived/2026-05-16/
git mv apps/command-center/src/app/api/finance/flow apps/command-center/src/app/api/finance/_archived/2026-05-16/
git mv apps/command-center/src/app/api/finance/health apps/command-center/src/app/api/finance/_archived/2026-05-16/
git mv apps/command-center/src/app/api/finance/pipeline-viz apps/command-center/src/app/api/finance/_archived/2026-05-16/
git mv apps/command-center/src/app/api/finance/project-plan apps/command-center/src/app/api/finance/_archived/2026-05-16/
git mv apps/command-center/src/app/api/finance/rd-evidence apps/command-center/src/app/api/finance/_archived/2026-05-16/
git mv apps/command-center/src/app/api/finance/receipt-finder apps/command-center/src/app/api/finance/_archived/2026-05-16/
git mv apps/command-center/src/app/api/finance/vendor-rules apps/command-center/src/app/api/finance/_archived/2026-05-16/

# 3 stale scripts
mkdir -p scripts/_archive/2026-05-16-finance-cleanup
git mv scripts/audit-all-secrets.mjs scripts/_archive/2026-05-16-finance-cleanup/
git mv scripts/receipt-pipeline.mjs scripts/_archive/2026-05-16-finance-cleanup/

# Update nav-data.ts: remove the 2 archived route entries (lines 122, 124)
# Add RESTORE.md in each _archived/ dir per workflow rules
```

**Verification after move:**
1. `pnpm --filter @act/command-center build` — must pass
2. `npx tsc --noEmit` — must pass
3. Manual: open every KEPT route, confirm renders
4. Confirm `/finance/revenue-planning` and `/finance/review` return 404

**NOT in this pass (deferred):**
- Cron cleanup (3 weekly digests + 4 daily briefings overlap)
- Script archive (119 finance scripts, mostly legitimate)
- HOLD routes (`board`, `accountant`, `revenue`) — need role/consumer refactor first
- Pass B (Money Command view) — next session

---

## Open questions for Ben (resolve before executing archive)

1. **Confirm 8 orphan APIs are truly orphan.** The grep found zero UI consumers, but they might be called from external systems (Postman, Telegram bot, webhooks). Worth a 60-second eyeball.
2. **`/finance/revenue-planning` last edited 3 months ago — confirm it's not load-bearing for FY27 planning.**
3. **Board role:** when we kill `/finance/board`, what does the board see? Options: redirect to overview, or build a "board-mode" toggle on overview.

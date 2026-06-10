---
date: 2026-06-11T09:30:00+10:00
session_name: whole-picture-stack
branch: feat/contained-launch-runbook
status: active
---

# Work Stream: whole-picture-stack

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-06-11T05:45:00+10:00
**Goal:** The full ACT operating stack drawn and shipped: staffing plan → Harvest hub → Whole Picture page → viz rec → FIRST SITTING BUILD (done 2026-06-11).
**Branch:** feat/contained-launch-runbook
**Test:** node scripts/build-monday-card.mjs --dry-run && pm2 jlist | grep -E 'whole-picture|monday-card'

### Now
[->] FIRST SITTING COMPLETE (2026-06-11 ~5:45am, all 8 items — see block below). Next = v1.5 sitting BEFORE 27 Jun (hard deadline): `build-founders-session-kit.mjs` (PM2 entry already in ecosystem.config.cjs, COMMENTED — uncomment when script lands) + GCal recurring 1st-Tue event · extend money-command-digest with cash-on-hand/runway/burn (TDD-pinned) · R&D-basis JSON sidecar from reconciliation-worklist · pre-departure drill + resolve Open choice 1 (local-Mac cron host vs cloud, 27 Jun–7 Aug) · Nic's TELEGRAM_CHAT_ID_NIC. ALSO: add a `foundersHub.parentPage` key to config/notion-database-ids.json (or NOTION_FOUNDERS_HUB_PAGE_ID env) AND share that page with the NOTION_TOKEN integration, so the Monday card's Notion week-page stops skipping. Withheld in v1 by design: cash/runway/R&D-basis (snapshot `.cash` = sum of ALL non-archived xero_bank_accounts balances incl. negative CC — point-in-time cash-in-bank, NOT two-account-scoped, known-stale feed; traced + documented in build-whole-picture.mjs header; never relabel it).

### First sitting (2026-06-11, this session — all 8 items)
- [x] 1. Diagrams file `wiki/concepts/the-whole-picture-diagrams.md` (6 diagrams / 7 blocks) committed f9afd74. GitHub render check pending next push.
- [x] 2+7. Notion paste test + page assembly: all six blocks + nervous-system diagram pasted into the Whole Picture page sections; §6 timeline carries a PASTE-TEST marker (Ben's 10-sec eyeball: raw text → delete timeline, keep fallback); live-surface link line (§1) + page-foot reference links. Page id verified absent from all sync paths.
- [x] 3. `scripts/build-whole-picture.mjs` → `thoughts/shared/the-whole-picture.html` (workflow-built, adversarial verify PASS, no fix needed).
- [x] 4. Registered: `whole` + `monday` in both /api/field routes + nav-data.ts sidebar entry next to /company. tsc clean.
- [x] 5. PM2: whole-picture (20 8 * * *) + monday-card (45 8 * * 1) started + pm2 save. First fires verified: whole-picture built the surface; monday-card exited clean via the NEW Monday day-guard (added post-workflow: bare non-Monday runs exit 0, --force overrides — PM2 registration/restart fires can't stray-send).
- [x] 6. `scripts/build-monday-card.mjs` (workflow-built, 1 fix round, re-verify PASS): dated+latest md, monday-card.html, ≤30-line Telegram (Ben + Nic-if-env), Notion week-page create-if-absent via gitignored ~/.act-monday-card-state.json. First live card Mon 15 Jun 8:45.
- [x] 8. Miro co-draw BOOKED: Tue 16 Jun 10:00–10:30 AEST, Meet link, Nic invited, run-sheet in description. Board prebuild (~20 min via Miro MCP) still to do before the session.
- TRAPS learned: cross-codebase latest.json is a 1-DAY window (weekly views aggregate the dated dailies — build-whole-picture does); snapshot 2026-06-09.json was WRITTEN 06-10 08:15 (filename lags write date — staleness judged on as-of, not mtime); money-command-digest dropped NO snapshot 06-10/06-11 (check the 8:15 cron); field-freshness stale_days=null since ~06-09 (gmail canary quiet — fix upstream); telegram lib silently queues 21:00–06:30 + 8/day budget (urgent:true bypasses).
- CROSS-SESSION: BAS-engine session LIVE in this repo (commit f2220ae 05:29 folded this session's ecosystem.config.cjs PM2 entries in with its day-zero Xero-cron stops; content correct, attribution mixed).

### This Session (2026-06-10, three workflows + two Notion pages shipped)
- [x] **10-week staffing plan** (Katrina/Denis/Joey/Suzie, 27 Jun–4 Sep): `thoughts/shared/plans/2026-06-10-harvest-goods-10-week-staffing-alignment.md` + provenance. Core: all via ACT Pty; Denis = fixed-term employee; Katrina = B2B via Oonchiumpa at $1,500/wk cost-recovery (QLD labour-hire register check before signing); D1–D14 decision list; payroll stack live by 26 Jun.
- [x] **The Harvest Operating Hub** (Notion): https://app.notion.com/p/37bebcf981cf8168ab56c2c700ac966b — draft `thoughts/shared/drafts/harvest-operating-hub-notion-2026-06-10.md`. 8 decide-tonight items, 32-row considerations register. Urgent verified finds: insurance brief names non-existent "The Harvest Pty Ltd"; RSVP form live but source UNCOMMITTED in Harvest repo working tree; GHL gates blocked (2 workflows missing, 2 drafts, no crew users); council pizza permit lead expired; Mighty trial ends 20 Jun.
- [x] **A Curious Tractor — The Whole Picture** (Notion): https://app.notion.com/p/37bebcf981cf81649f4fd1a53f241413 — plan `thoughts/shared/plans/2026-06-10-act-whole-picture-founders-os.md`, draft `thoughts/shared/drafts/act-whole-picture-notion-2026-06-10.md`. Founder pay resolved $120K EACH from Jul 2026 (D11.2); R&D basis NOTHING on paper (collapse-to-$55K risk); Centrecorp remainder REFUTED ($208,032 book); 22 decisions (12 Nic / 10 Standard Ledger before 30 Jun).
- [x] Corrected staffing plan line 40: Suzie = Suzanne "Suzie" Zemek (the "vendor" Dext lines are her own expenses).
- [x] Memory updated: `act-whole-picture-founders-os.md` (new), `harvest-june-20-launch.md` (2026-06-10 update block), MEMORY.md index line.

### Next
- [ ] v1.5 sitting before 27 Jun (see Now block: session kit + GCal event, cash/runway TDD pipe, R&D-basis sidecar, pre-departure drill, Nic chat id, foundersHub Notion key)
- [ ] Ben eyeball: does the §6 timeline block render in Notion? (PASTE-TEST marker on the page) + open the diagrams file on GitHub after next push to confirm all 7 blocks render
- [ ] Prebuild the Miro board before Tue 16 Jun 10:00 (frames 1+2 via diagram_create, 5 horizon cards via layout_create)
- [ ] Ask Ben: did the 10 Jun session with Nic happen — which of the Harvest hub's 8 decisions + Whole Picture N1/N2/N9 got decided? Write outcomes to wiki/decisions/ (convention N12)
- [ ] Investigate: money-command-digest produced no snapshot for 06-10/06-11; gmail spine canary stale_days=null since ~06-09
- [ ] Standing urgent (from hub, dated): broker call (ACT Pty name) + council EH call; commit RSVP form source to main in Harvest repo; GHL gates to green; contracts out Mon 15 Jun

### Decisions
- Whole-stack architecture: Whole Picture (standing, monthly-session-edited) → Harvest hub (weekly ops) → staffing plan (repo). Notion pages created standalone/private, Ben drags into place; both are capture pages, keep OUT of sync-to-notion target lists.
- Notion writes go via claude.ai connector (`mcp__claude_ai_Notion__*`) — local `mcp__notion__*` token is INVALID (401).
- Workflows resume cleanly: same scriptPath + resumeFromRunId; completed agents cached. Used twice today (session-limit kill, API-outage kill).

### Open Questions
- UNCONFIRMED: outcome of the 10 Jun evening session with Nic (all "decide tonight" items).
- UNCONFIRMED: whether the resumed viz workflow completed after this ledger was written — check the output doc path first.
- UNCONFIRMED: Suzie/Susie printed-form spelling choice (Ben+Nic warm-up item).

### Workflow State
pattern: mine → design → check → write (Workflow tool, background)
phase: 2 (design, in flight on resume)
total_phases: 4
retries: 2
max_retries: 3

#### Resolved
- goal: "Recommend how to draw The Whole Picture: diagrams, dashboard, tools, cadence + flows"
- resource_allocation: balanced (~9 agents; mine cached)

#### Unknowns
- none blocking; all inputs cached in run journal

#### Last Failure
2026-06-10 night: design/check/write agents died on API connection errors (socket closed / ConnectionRefused). Mine phase 4/4 completed and is cached. Resumed 2026-06-11 ~9:25am as task w716olp0a.

---

## Context

The 2026-06-10 session ran three large Workflow orchestrations (~5.5M subagent tokens total) building ACT's operating stack top to bottom, then started a fourth (visualization rec) which hit two environment failures (session usage limit, then API outage) and was resumed twice.

Key verified facts a fresh session needs (all in memory files too): founder pay $120K each from first July 2026 pay run per D11.2; payday super live 1 Jul 2026, SG 12%; payroll stack deadline is 26 JUN (Denis), founders ride the same stack; R&D founder basis planned $317,500 vs as-recorded ~$55,532 with KP invoices 15078–81 nonexistent and the recharacterisation journal unbooked — Standard Ledger reconciliation is the biggest pre-30-Jun money action; Centrecorp book is $123,332 paid + $84,700 DRAFT (INV-0314), no larger remainder; four FY26 org nets in circulation (+$719K/+$815K/−$222K/−$178K) pending the "one money truth" call (N3).

Timeline collisions governing everything: 18 Jun admin lock → 20 Jun Harvest open day → 24 Jun contracts → 26 Jun Butterfly handover + employer registrations → 27 Jun crew arrives + Ben flies (remote to 7 Aug / reachable 15 Aug per hub) → 30 Jun Pty cutover → 1 Jul first founder payroll + lease ops.

Related memory: [[act-whole-picture-founders-os]], [[harvest-june-20-launch]], MEMORY.md index. The money-state-of-play handoff is separate and loads via SessionStart hook.

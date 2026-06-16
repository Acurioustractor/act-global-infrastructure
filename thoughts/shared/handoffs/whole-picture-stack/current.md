---
date: 2026-06-11T06:05:00+10:00
session_name: whole-picture-stack
branch: main
status: active
---

# Work Stream: whole-picture-stack

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-06-16 (v1.5 build phases 1-3 SHIPPED today, all on main)
**Goal:** Whole-Picture v1.5 (plan `thoughts/shared/plans/2026-06-16-whole-picture-v1.5.md`) — founders' session kit + un-withholding the money read, TDD-first + display-gated. Build phases done; wiring + ops remain.
**Branch:** main (ef57d45)
**Test:** node scripts/build-founders-session-kit.mjs --dry-run && node --test scripts/tests/two-account-cash.test.mjs scripts/tests/rd-basis.test.mjs

### Now (2026-06-16)
[done] **v1.5 phases 1-3 all merged to main, each TDD-pinned + display-gated:**
- **P1 session kit** (PR #178) — `scripts/build-founders-session-kit.mjs`, monthly sibling of build-monday-card; Sat-7am PM2 with first-Tuesday guard; same withheld treatment. PM2 stub at ecosystem.config.cjs:976 still COMMENTED.
- **P2 two-account cash** (PR #179) — `scripts/lib/two-account-cash-lib.mjs` (+test) + `scripts/build-two-account-cash.mjs`. Cash = #8815 + Everyday ONLY (excludes NM Personal −$388,937, Maximiser, archived). Live cash **$121,691.47**. TWO gates: displayable (fresh+complete) AND n3_decided (`WHOLE_PICTURE_MONEY_CANON`, default OFF). Regression anchor pins the 06-10 figure $223,761.05.
- **P3 R&D basis** (PR #180) — `scripts/lib/rd-basis-lib.mjs` (+test) + `scripts/build-rd-basis.mjs`. Live: gross flagged **$325,947.23**, founder drawings **$238,653.88 (73%, strip)**, defensible CEILING **$87,293.35**, ~$37,972.61 offset. NOT bankable until `RD_BASIS_RECORDS_CURED=1` (nothing on paper: 15078-81 absent + collapse-to-~$55K). Sidecars gitignored.

[->] **LEFT (input-blocked + wiring):**
1. **Wire surfaces** to read the gated cash/R&D sidecars — `build-founders-session-kit.mjs` + `build-whole-picture.mjs` still show static "withheld - no pipeline"; swap to read the sidecar's `gated`/`withhold_reason` so the label upgrades (and un-withholds the moment the gates flip). Tier 1.
2. **Ops:** uncomment PM2 founders-session-prep stub + `pm2 save` (Tier 2) · GCal recurring 1st-Tue founders'-session event (Tier 2/3, invite Nic) · pre-departure cron drill.
3. **NEED FROM BEN (2 inputs):** cron host local-Mac vs cloud for 27 Jun–7 Aug; `TELEGRAM_CHAT_ID_NIC` value.
4. **Founders to decide (not mine):** N3 one-money-truth (then flip `WHOLE_PICTURE_MONEY_CANON=1`) · the #8815 reconciliation that tightens the cash band · the R&D records cure.

### Also shipped 2026-06-16 (separate threads, all merged to main)
PR #175 cron-churn tidy + restored `service_role` EXECUTE on `exec_sql` (was silently blocking ALL PRs via stale schema snapshot) · PR #176 consolidated arbitrary-SQL helpers onto `exec_sql` (dropped `execute_sql`+`exec`) · GrantScope PR #70 repoint · PR #177 Standard Ledger onboarding + EOFY/R&D/entity docs. See [[supabase-search-path-trap]] for the exec_sql grant-loss writeup.

### Notion wiring (2026-06-11 ~6am, VERIFIED end-to-end)
- [x] "Monday cards" page created under the Whole Picture page: https://app.notion.com/p/37bebcf981cf81e99845f8361ce08a97 — the week-per-page home (create-if-absent; founder move-block edits never overwritten).
- [x] `NOTION_FOUNDERS_HUB_PAGE_ID=37bebcf9-81cf-81e9-9845-f8361ce08a97` added to `.env.local` (gitignored; script checks env BEFORE config, so no config/notion-database-ids.json edit needed).
- [x] Ben added the **JusticeHub** connection on the Whole Picture page → integration access VERIFIED (API GET 200 on both pages). Dry-run resolves parent + builds the 82-block week page. Mon 15 Jun 8:45 path fully green: card → Notion week page → Telegram ending with the Notion link.
- [x] §7 of the founders' page now links the live Monday-card surface + the Monday cards page (page now links all four surfaces).

### First sitting (2026-06-11, this session — all 8 items)
- [x] 1. Diagrams file `wiki/concepts/the-whole-picture-diagrams.md` (6 diagrams / 7 blocks) committed f9afd74. GitHub render check pending next push.
- [x] 2+7. Notion paste test + page assembly: all six blocks + nervous-system diagram pasted into the Whole Picture page sections; §6 timeline carries a PASTE-TEST marker (Ben's 10-sec eyeball: raw text → delete timeline, keep fallback); live-surface link line (§1) + page-foot reference links. Page id verified absent from all sync paths.
- [x] 3. `scripts/build-whole-picture.mjs` → `thoughts/shared/the-whole-picture.html` (workflow-built, adversarial verify PASS, no fix needed).
- [x] 4. Registered: `whole` + `monday` in both /api/field routes + nav-data.ts sidebar entry next to /company. tsc clean.
- [x] 5. PM2: whole-picture (20 8 * * *) + monday-card (45 8 * * 1) started + pm2 save. First fires verified: whole-picture built the surface; monday-card exited clean via the NEW Monday day-guard (added post-workflow: bare non-Monday runs exit 0, --force overrides — PM2 registration/restart fires can't stray-send).
- [x] 6. `scripts/build-monday-card.mjs` (workflow-built, 1 fix round, re-verify PASS): dated+latest md, monday-card.html, ≤30-line Telegram (Ben + Nic-if-env), Notion week-page create-if-absent via gitignored ~/.act-monday-card-state.json. First live card Mon 15 Jun 8:45.
- [x] 8. Miro co-draw BOOKED: Tue 16 Jun 10:00–10:30 AEST, Meet link, Nic invited, run-sheet in description. Board prebuild (~20 min via Miro MCP) still to do before the session.
- TRAPS learned: cross-codebase latest.json is a 1-DAY window (weekly views aggregate the dated dailies — build-whole-picture does); snapshot 2026-06-09.json was WRITTEN 06-10 08:15 (filename lags write date — staleness judged on as-of, not mtime); money-command-digest dropped NO snapshot 06-10/06-11 (check the 8:15 cron); field-freshness stale_days=null since ~06-09 (gmail canary quiet — fix upstream); telegram lib silently queues 21:00–06:30 + 8/day budget (urgent:true bypasses).
- CROSS-SESSION (RESOLVED): BAS-engine session was live in this worktree all morning — it folded this session's PM2 entries into its f2220ae commit, merged PR #171, checked out main mid-flight (briefly stranding 00df8ba), then rescued 00df8ba onto feat/whole-picture-v1-surface and merged it as PR #172 (30d2611). Everything from both sessions is now on main; local main pulled current.

### This Session (2026-06-10, three workflows + two Notion pages shipped)
- [x] **10-week staffing plan** (Katrina/Denis/Joey/Suzie, 27 Jun–4 Sep): `thoughts/shared/plans/2026-06-10-harvest-goods-10-week-staffing-alignment.md` + provenance. Core: all via ACT Pty; Denis = fixed-term employee; Katrina = B2B via Oonchiumpa at $1,500/wk cost-recovery (QLD labour-hire register check before signing); D1–D14 decision list; payroll stack live by 26 Jun.
- [x] **The Harvest Operating Hub** (Notion): https://app.notion.com/p/37bebcf981cf8168ab56c2c700ac966b — draft `thoughts/shared/drafts/harvest-operating-hub-notion-2026-06-10.md`. 8 decide-tonight items, 32-row considerations register. Urgent verified finds: insurance brief names non-existent "The Harvest Pty Ltd"; RSVP form live but source UNCOMMITTED in Harvest repo working tree; GHL gates blocked (2 workflows missing, 2 drafts, no crew users); council pizza permit lead expired; Mighty trial ends 20 Jun.
- [x] **A Curious Tractor — The Whole Picture** (Notion): https://app.notion.com/p/37bebcf981cf81649f4fd1a53f241413 — plan `thoughts/shared/plans/2026-06-10-act-whole-picture-founders-os.md`, draft `thoughts/shared/drafts/act-whole-picture-notion-2026-06-10.md`. Founder pay resolved $120K EACH from Jul 2026 (D11.2); R&D basis NOTHING on paper (collapse-to-$55K risk); Centrecorp remainder REFUTED ($208,032 book); 22 decisions (12 Nic / 10 Standard Ledger before 30 Jun).
- [x] Corrected staffing plan line 40: Suzie = Suzanne "Suzie" Zemek (the "vendor" Dext lines are her own expenses).
- [x] Memory updated: `act-whole-picture-founders-os.md` (new), `harvest-june-20-launch.md` (2026-06-10 update block), MEMORY.md index line.

### Next
- [x] Miro board prebuilt 2026-06-11: https://miro.com/app/board/uXjVHHbcARw=/ — frame 1 system map + frame 2 roles split (diagram_create), frame 3 horizon arc as 5 cards + run-sheet DOC (layout_create). Board is disposable scaffolding; corrections flow back to wiki/concepts/the-whole-picture-diagrams.md after the 16 Jun session, then archive the board.
- [ ] v1.5 sitting before 27 Jun (see Now block: session kit + GCal recurring event, cash/runway TDD pipe, R&D-basis sidecar, pre-departure drill, Nic chat id)
- [ ] Ben eyeball: does the §6 timeline block render in Notion? (PASTE-TEST marker on the page) · diagrams file is on GitHub main NOW — confirm all 7 blocks render at wiki/concepts/the-whole-picture-diagrams.md
- [ ] Watch Mon 15 Jun ~8:50: first Monday card arrives on Telegram + week page appears under Monday cards (path verified green 11 Jun, but first unattended run is the real test)
- [ ] Ask Ben: did the 10 Jun session with Nic happen — which of the Harvest hub's 8 decisions + Whole Picture N1/N2/N9 got decided? Write outcomes to wiki/decisions/ (convention N12)
- [ ] Investigate: money-command-digest produced no snapshot for 06-10/06-11 (8:15 cron quiet — whole-picture surface greys those numbers meanwhile); gmail spine canary stale_days=null since ~06-09
- [ ] This handoff file has uncommitted edits on main (Tier 1, rides the next PR sweep)
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
pattern: recon → build×2 → adversarial verify → fix (Workflow tool, background)
phase: COMPLETE (run wf_0048114e-920, 7 agents, both builders PASS; monday-card 1 fix round)
total_phases: 4
retries: 0
max_retries: 3

#### Resolved
- goal: "Execute the 8-item first-sitting build list from the viz rec §6" — DONE, merged to main (PR #172)
- resource_allocation: balanced (7 agents, ~678K subagent tokens)

#### Unknowns
- Notion's pinned mermaid version (timeline render) — settled by Ben's paste-test eyeball on the page

#### Last Failure
(none this session — the 2026-06-10 viz-rec workflow API failures were resolved by resume; rec doc landed ~5:03am)

---

## Context

The 2026-06-10 session ran three large Workflow orchestrations (~5.5M subagent tokens total) building ACT's operating stack top to bottom, then started a fourth (visualization rec) which hit two environment failures (session usage limit, then API outage) and was resumed twice.

Key verified facts a fresh session needs (all in memory files too): founder pay $120K each from first July 2026 pay run per D11.2; payday super live 1 Jul 2026, SG 12%; payroll stack deadline is 26 JUN (Denis), founders ride the same stack; R&D founder basis planned $317,500 vs as-recorded ~$55,532 with KP invoices 15078–81 nonexistent and the recharacterisation journal unbooked — Standard Ledger reconciliation is the biggest pre-30-Jun money action; Centrecorp book is $123,332 paid + $84,700 DRAFT (INV-0314), no larger remainder; four FY26 org nets in circulation (+$719K/+$815K/−$222K/−$178K) pending the "one money truth" call (N3).

Timeline collisions governing everything: 18 Jun admin lock → 20 Jun Harvest open day → 24 Jun contracts → 26 Jun Butterfly handover + employer registrations → 27 Jun crew arrives + Ben flies (remote to 7 Aug / reachable 15 Aug per hub) → 30 Jun Pty cutover → 1 Jul first founder payroll + lease ops.

Related memory: [[act-whole-picture-founders-os]], [[harvest-june-20-launch]], MEMORY.md index. The money-state-of-play handoff is separate and loads via SessionStart hook.

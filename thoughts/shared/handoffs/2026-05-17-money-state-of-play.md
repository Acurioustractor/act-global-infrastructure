---
title: Money state of play — Standard Ledger, Pty, trusts, BAS, R&D, farm, charity
date: 2026-05-17
status: open — picked up across multiple sessions today, /clear-saved here
session: claude (Opus 4.7, 1M context)
related_handoffs:
  - 2026-05-17-end-of-day-sweep.md (parallel session — PR #61/#62/#72/#73/#74/#75 landed)
  - 2026-05-17-money-brain-issue-set.md (parallel session — issue triage)
  - 2026-05-16-money-audit/current.md (parallel session — money UX audit)
  - 2026-05-16-money-brain-phase2/ (parallel session — money brain phase 2)
  - 2026-05-15-money-state-of-play.md (this session's synthesis artifact)
---

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-05-17T00:00:00Z
**Goal:** Map current state across Standard Ledger comms · ACT Pty setup · family trusts · BAS · R&D FY25-26 · farm/Harvest · Butterfly Movement charity transition. Push into Notion as a dated plan.
**Branch:** feat/ghl-canonical-code-alignment (15 behind main, 2 ahead, 20 modified files, 4 untracked dirs — see audit #2 + #7)
**Test:** open the FY26 Close Sprint Notion page — does it have all 8 checklist sections?

### Now
[->] State synthesised + pushed to Notion (FY26 Close Sprint page + 7 Decisions Log entries + SUPERSEDED banner on stale R&D page). 10-item codebase audit complete. Waiting on Ben to act on critical path.

### This session (2026-05-15 → 2026-05-17)
- [x] Audited all Standard Ledger Gmail threads across 4 mailboxes (benjamin@, nicholas@, hi@, accounts@)
- [x] Mapped current state across 5 workstreams (SL · ACT Pty · trusts · BAS · R&D)
- [x] Mapped the farm/Harvest split (ACT-FM inside ACT Pty; The Harvest = separate Pty subsidiary)
- [x] Mapped Butterfly Movement → Goods on Country DGR1 transition mechanics
- [x] Wrote synthesis to `thoughts/shared/handoffs/2026-05-15-money-state-of-play.md` (~2500 words, source-of-truth)
- [x] Created Notion FY26 Close Sprint page: https://www.notion.so/360ebcf981cf81238b9eca4b90fbe2df
- [x] Created 7 Decisions Log entries (R&D Path C · Aleisha · BAS approach · 5-May SL call · Harvest subsidiary · Butterfly Movement · Act-Farm repositioning)
- [x] Added SUPERSEDED banner to stale R&D Tax Package page (333ebcf981cf81069af2fbd6f938179f) — was listing "ACT Foundation CLG" with sole-trader ABN
- [x] Ran codebase audit — 10 issues found, severity-ranked
- [x] User sent the Knight Family Trust TFN reply (was 31-day-old draft, biggest cascade block — now cleared)

### Next (in priority order)
- [ ] **Verify ACT Pty incorporation date 22 vs 24 Apr 2026** — act-core-facts.md says 24, Gmail thread suggests 22. ASIC extract is authoritative. Whichever is wrong propagates to 7 repos via `sync-act-context.mjs --apply`.
- [ ] **Sign the latest Standard Ledger Ignition proposal** (reminder fired 13 May)
- [ ] **Sign + return Form 201 + initial resolutions + share certificates + bank-account resolution** to Vanessa Ordoñez
- [ ] **Chase Vanessa** on Annerley postcode correction + ATO mail status (ABN/TFN/GST/PAYG letters 18+ days overdue from ATO; possibly mis-routed due to wrong postcode)
- [ ] **Send the combined-ask email** to Remco Marcelis — draft is at `thoughts/shared/drafts/standard-ledger-combined-ask-2026-05-07.md`. Closes Aleisha $12,150 writeoff + R&D rule 1.5 sign-off.
- [ ] **Resolve Q2+Q3 FY26 BAS path** with Robhie (combined ~$35,867 GST liability, both overdue). SL now formal BAS agent for Nick as of 13 May.
- [ ] **Book meeting with Sonia** (Butterfly Movement board, legal/tax) this week — she's dark mid-to-late June
- [ ] **Deal with branch hygiene** (audit #2) — 20 uncommitted Xero/finance scripts + 4 untracked finance routes; stash or commit-PR before rebase
- [ ] **Then sync** — `git checkout main && git pull --ff-only && git checkout feat/ghl-canonical-code-alignment && git rebase main`

### Critical decisions captured (now in Notion Decisions Log)
1. R&D Path C — FY24-25 forfeit, claim FY25-26 via ACT Pty (Decided 2026-04-27)
2. Aleisha $12,150 bad-debt write-off (Proposed 2026-05-07, awaiting SL account code)
3. Q2+Q3 FY26 BAS lodgement approach (Proposed 2026-05-15, decision needed)
4. Centralize operations on ACT Pty (Decided 2026-05-05 with SL)
5. The Harvest as separate Pty Ltd subsidiary (Decided 2026-05-05)
6. Butterfly Movement → Goods DGR1 home (Proposed 2026-05-14)
7. Act-Farm repositioning — regenerative capital engine (Decided 2026-04-12)

### Codebase audit — top 10 (full punch-list in session)
1. 🔴 **CONTRADICTION** Pty date 22 vs 24 Apr (verify ASIC extract)
2. 🔴 **WIP RISK** 20 uncommitted modified scripts + 4 untracked finance routes
3. 🟡 **STALE** 8 `.bak` files in working tree (incl. 4 .env.local backups from Jan)
4. 🟡 **DRIFT** Notion sync-policy doc lists 20 sync scripts; disk has 33
5. 🟡 **HYGIENE** Hardcoded Supabase anon JWT in 2 wiki scripts
6. 🟡 **PM2 CRUFT** ~30 stopped processes with high restart counts
7. 🟡 **PROCESS** Branch state messy (15 behind + 2 ahead + 20 modified)
8. 🟢 **TODO DEBT** Placeholder TODOs treated as production code (smart-alerts.mjs:152 `daysElapsed = 15` is worst)
9. 🟢 **UNTRACKED** `Dext/` and `.playwright-mcp/` in repo root, no gitignore decision
10. 🟢 **DEAD CRON** 3 disabled 2026-05-08 entries reference removed surfaces

### Decisions
- **Notion was right surface, not Supabase project_knowledge** — direct create-pages to data source `c8f1cf8e-fef7-4e22-ac71-bf60c1f668b2` since `sync-actions-decisions-to-notion.mjs` only creates from Supabase to Notion (won't overwrite)
- **Banner instead of replace** on stale R&D page (preserves Mar 2026 historical numbers for audit trail)
- **FY26 Close Sprint as parent-of-truth** — checklist by week, links back to repo handoff + decisions

### Open questions for Ben
1. Did the 14 May 5pm call with John Cranwell + Briony happen? Notion meeting page exists but no follow-up captured
2. Adelaide visits 1 Jun + second-last week Jun — flights confirmed? Butterfly Movement AGM mechanics ride on these
3. The Harvest landlord — has subsidiary-structure brief been delivered yet?
4. Sonia (Butterfly Movement legal/tax) — booked yet?

### Key artifacts (DO NOT lose)
- Session synthesis: `thoughts/shared/handoffs/2026-05-15-money-state-of-play.md`
- Notion FY26 Close Sprint: https://www.notion.so/360ebcf981cf81238b9eca4b90fbe2df
- Notion Decisions Log: https://www.notion.so/f8b0bfb6b5ad4b18829e15c4561f55e0
- Migration checklist: `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`
- R&D pack: `thoughts/shared/rd-pack-fy26/` (grade WARN/62)
- Combined-ask draft (UNSENT): `thoughts/shared/drafts/standard-ledger-combined-ask-2026-05-07.md`
- Aleisha write-off script (READY): `scripts/write-off-aleisha-invoices.mjs`
- Harvest subsidiary decision: `wiki/decisions/2026-05-harvest-subsidiary-structure.md`
- Act-Farm repositioning: `wiki/decisions/2026-04-act-farm-repositioning.md`

### Resume context
- Today: 2026-05-17. FY26 close: 30 Jun 2026 (44 days). R&D lodgement window: 1 Jul 2026 – 30 Apr 2027 (≤349 days).
- The TFN unblock cleared the biggest cascade. Next domino: chase ATO mail to Vanessa + sign Ignition + send combined-ask to Remco.
- Parallel sessions today landed 6 PRs (see `2026-05-17-end-of-day-sweep.md`) — check `git log main --oneline -20` before any branch work.

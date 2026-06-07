---
date: 2026-06-07T04:15:47Z
session_name: field-pppp-shipping
branch: main
status: complete
---

# Work Stream: field-pppp-shipping

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-06-07T04:45:00Z
**Goal:** Review + ship the PPPP/Field landscape work — DONE, then extended: Project momentum feed built + people-lane state verified clean.
**Branch:** main (2 commits ahead of origin, local-only: 0608c9a handoff + c2aa820 momentum feed)
**Test:** `node scripts/sync-pppp-scan-to-notion.mjs --dry-run` (5 feeds render incl. stage-moves + gone-quiet, no write)

### Now
[->] Nothing in flight. Next touch is Monday's PPPP scan — now with momentum evidence in the Project row.

### This Session (2026-06-07 PM — "do all now" follow-up)
- [x] Verified community-line violations CLEAR: tracer (3 Jun) + sweep buckets A/B (3+5 Jun) already ran; prep re-run today = 0 flagged all buckets. Tanya, Rachel Atkinson, Shaun Fisher all fixed.
- [x] feat: Project momentum feed in sync-pppp-scan-to-notion.mjs — opportunity stage-moves last 7d (live GHL, cursor-paginated past per-search 100-cap; ≥5 moves/same-minute = batch stamp, excluded but counted) + gone-quiet projects (90d spend, 21d+ silence). Dry-run verified: 17 genuine moves (+149 batch excluded), gone-quiet = ACT-GP 88d · ACT-SM 75d · ACT-PI 61d · ACT-DO 30d · ACT-OO.
- [x] Canon updated to match (pppp-operating-logic.md §Surfaces) — commit c2aa820
- [x] Name verified: "James Davidson" not "Davison" (person_identity_map); no email/GHL id anywhere → promotion needs Houston/Hutchinson LinkedIn-only precedent + Ben's ring call. Plan corrected.

### Prior Session (2026-06-07 AM)
- [x] PPPP landscape reviewed + shipped; PRs #142 + #87 merged; ~190 files swept; canon rescued (full detail in git history of this file)

### Next
- [ ] Mon 8 Jun 7:45am: `pppp-scan` cron first scheduled fire — expect no-op (Run #1 registered); check `pm2 logs pppp-scan` if curious
- [ ] Mon 8 Jun: PPPP scan ritual with Nic — settle the Place-vs-Pulse fork (recommended: keep Place, absorb Pulse into Process)
- [ ] Mon 8 Jun sweep decisions now fed by evidence: gone-quiet projects (stop carrying?) · test junk in live pipelines (Wash Test, QuestionTest, FueyJCXaBUvnatyct) · James Davidson ring call
- [ ] Kristy 4→1 merge still blocked: token lacks contacts-merge scope (403). Ben merges in GHL UI (keep yk4uK8rgDNGA87EUqNbu primary — holds full tag union) or grants scope + `node scripts/orbit-tracer.mjs merge-kristy`. Tier 3 either way.
- [ ] 15 Jun: Run #2 auto-creates as child of field guide page (access verified, no action needed)
- [ ] main is 2 commits ahead of origin (local-only) — push needs explicit word (Tier 3) or ride the next PR

### Decisions
- SPEND filter server-side (`.eq('type','SPEND')`): client-side filter after `.limit(1000)` silently drops rows on a heavy week
- Run-state in gitignored `.pppp-scan-state.json` (pattern: `.xero-sync-state.json`): a cron writing tracked files loses idempotency records to stash/checkout
- PR #142 conflicts: ours-side wholesale for 8 energy-orbit add/add files — main carried the frozen 3 Jun snapshot (PR #141), this branch evolved the same files through 7 Jun
- `nicholas-marchesi-*.csv` gitignored, not committed: personal bank exports don't belong in git
- PR #87 merge held until explicit "merge 87" — "next" during a loop tick is not authorization

### Open Questions
- UNCONFIRMED: none — all claims this session were verified live (dry-runs, no-op runs, check watchers, ABR-verified facts predate session)

### Workflow State
pattern: review-fix-ship
phase: 5
total_phases: 5
retries: 0
max_retries: 3

#### Resolved
- goal: "review the act landscape and skills we were just working on, fix all findings, fold into main"
- resource_allocation: balanced

#### Unknowns
- (none)

#### Last Failure
(none)

---

## Context

**The work under review** was the 7 Jun morning commits: `wiki/concepts/pppp-operating-logic.md` (five-P field scan canon — People/Project/Place/Process/Product, skill-library theory with three divergences from the Shah skills-as-moat thesis) and `scripts/sync-pppp-scan-to-notion.mjs` (Monday 7:45am pre-fill engine; Place gets no feed by design).

**Review findings → all fixed:** (1) 1000-cap exposure in feedProject — fixed server-side; (2) cron dirtying tracked config — fixed via state-file migration; (3) Notion share risk for Run #2 — tested, already shared, non-issue.

**The merge story:** PR #142 carried 229 commits (the-field system, PPPP, GHL architecture, June recon). GitHub said CONFLICTING despite local merge-tree saying clean — old-style merge-tree misses add/add. Eight files conflicted, all energy-orbit scripts/logs committed independently on main via PR #141 (frozen 3 Jun) while this branch kept developing them (vendor filter, cadence clock, ghost-mirror fix). Took ours wholesale, merged clean, checks green, merged 11:56 AEST. PR #87 (May synthesis docs, 656 behind) then un-conflicted the same way — one real conflict in wiki/synthesis/index.md, kept the four 05-08 entries — and merged on Ben's explicit word.

**Loop pattern that worked:** background `gh pr checks --watch` as primary wake signal + ScheduleWakeup 1200–1500s fallback; merge only on CLEAN+MERGEABLE; Vercel treated as blocking because the PR touched `apps/`.

**Live cadence after this session:** pppp-scan (Mon 7:45) → weekly cockpit (Mon 8:00) → ecosystem digest (Mon 7:55). State file `.pppp-scan-state.json` holds `runs["2026-06-08"]` = Run #1, page `377ebcf9-81cf-8160-a494-db2540160590`, parent (field guide) `1553e9c2-4bf3-49d2-960a-d77070f467cb`.

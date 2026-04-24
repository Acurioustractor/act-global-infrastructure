# Session handoff — 2026-04-24 (Goods dedup + wiki + alignment loop)

> Session goal started as "what's priority?" and ended with four distinct shipments: Goods dedup closed, BCV wiki article authored, 11 atomic commits rolled up into PR #47, and a cross-source alignment loop designed + Q1 delivered.
>
> **If you resume today or tomorrow:** the three outstanding human-decisions are Centrecorp INV-0314 (10-min Nic conversation), Snow INV-0321 payment confirmation call, and Rotary INV-0222 chase-or-write-off. All three named in the Q1 synthesis.

## What shipped

### 1. Goods contact dedup — **COMPLETE**
- 6 stub renames (CEO JV Trust, Info SEFA, Invoicing × 4 orgs)
- 91 duplicate rows Tier-2 auto-merged via API
- 1 Rachel Atkinson PICC edge case (direct SQL merge — mirrored endpoint's 6-FK reassignment)
- 11 gmail-tag-only strays (discovered by `.contains(['goods'])` filter gap — base `goods` tag backfilled then auto-merged)
- **Final state: 0 duplicate emails in Goods scope**
- Rachel Atkinson spelling verified clean (no stray "Rachael" anywhere in GHL)

### 2. Tractorpedia sync
- 1 real wiki gap (Black Cockatoo Valley) filled at `wiki/projects/black-cockatoo-valley.md`
- Original "15 missing articles" claim in session-start handoff was mostly wrong — 11 of them already existed under `wiki/projects/act-studio/` subdirectory; my first diff script missed the nesting
- 5 duplicate articles I accidentally created have been deleted
- Lint delta post-session: broken wikilinks 276 → 171, orphans 38 → 28

### 3. Minderoo envelope anchor-health check
- Verdict pre-1-May: **5/5 confirmed anchors ranked in top 200**
- Report at `wiki/output/alma-health/2026-04-24.md` + dashboard JSON
- Phase 3 systemic ALMA recompute remains correctly deferred post-1-May

### 4. Git hygiene
- **PR #47 opened, merged via rebase, branch deleted** — 11 atomic commits now on main
- One legitimate unpushed commit from 2026-04-21 (`refactor(wiki): retire public shell / second CMS` — completes Phase B.3 voice pass paired with act-regenerative-studio) recovered and pushed
- CI fixed mid-flight: one TypeScript error in `vendor-rules-suggest/route.ts` Omit type
- Follow-up commit `docs(alignment-loop)` pushed direct to main (plan + Q1 synthesis)

### 5. ACT Alignment Loop — new capability
- Plan at `thoughts/shared/plans/act-alignment-loop.md`
- Three-phase design: manual Claude pass → scripted → weekly cron with diff-based alerts
- Three starting questions: funder alignment (Q1), project truth-state (Q2), entity migration truth-state (Q3)
- Q1 delivered as `wiki/synthesis/funder-alignment-2026-04-24.md` — see findings below

## What the Q1 synthesis surfaced (read before the next funder conversation)

**The wiki's strategic funder narrative is 15 days stale and missing 7 funders who paid ACT $420K across 10 invoices.** `wiki/narrative/funders.json` holds 14 entries; Xero has 24 funder relationships. Pitch-assembly tooling has been writing from an incomplete ledger.

**$299,200 outstanding on the sole trader's books, 67 days to cutover:**

| Funder | Invoice | Amount | Status | Age | Action |
|---|---|---|---|---|---|
| Snow Foundation | INV-0321 | $132,000 | AUTHORISED | 37d | Call Sally/Alexandra this week — confirm payment + Pty migration notice |
| Rotary eClub | INV-0222 | $82,500 | AUTHORISED | **380d** | Chase or write off — decision with Nic |
| Centrecorp Foundation | INV-0314 | $84,700 | **DRAFT** | 70d | The 10-min Nic decision (4+ sessions old) |

**Wiki stage mismatches to fix:**
- Snow Foundation: wiki says `warm / $200K ask` → reality is `active-partner / $402K paid + $132K outstanding / 7 tranches`
- Paul Ramsay Foundation: wiki says `cold` → reality has 2 paid invoices, William Frazer tagged `partner`
- June Canavan Foundation: wiki says `active-partner / $60K` → no Xero invoice. Validate with Nic.

**Minderoo ask figure has 3 conflicting numbers** (wiki $2.9M / Goods pitch $900K / envelope ?) — canonicalise before Lucy reads anything.

## Open — only-Ben decisions

1. **INV-0314 Centrecorp $84,700 DRAFT** — send / void / reissue-from-Pty. Blocks Goods pitch credibility.
2. **Snow Foundation INV-0321 $132,000 AUTHORISED** — payment confirmation call + Pty migration notice.
3. **Rotary eClub INV-0222 $82,500 AUTHORISED 380d** — chase or write off.
4. **Minderoo ask figure reconciliation** — one number, set with Nic.
5. **Silent 107-day batch** (Bryan Foundation, The Funding Network, AMP Foundation, Queensland Gives) — re-engage or drop.
6. **June Canavan Foundation status** — confirm the "active-partner" claim with Nic.

## Open — agent-doable (next session)

1. **Q2 project truth-state synthesis** — for each of 74 codes in `config/project-codes.json`, score presence across wiki × DB × codebase × Xero tracking. Format defined in `thoughts/shared/plans/act-alignment-loop.md`. ~20 min.
2. **Q3 entity migration truth-state synthesis** — parse `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`, check each item against DB evidence of completion. ~30 min.
3. **Update `wiki/narrative/funders.json`** with the 7 absent funders + 3 stage corrections (Snow, Paul Ramsay, June Canavan validation). Small.
4. **Gmail MCP re-auth** (user-driven) → send the Centrecorp nudge drafted this session to Nic (message text preserved in session log).

## Environment notes to carry forward

- **Command-center dev server port is 3002** (`next dev -p 3002` per package.json). 3010 was the manual override when Oonchiumpa's Vite held 3002 — check `lsof -i :3002` before assuming it's taken. Today 3002 was free and used.
- **`ghl_contacts.full_name` is a GENERATED column** (`first_name || ' ' || last_name`). Only update first_name/last_name.
- **Auto-merge script filter gap:** `tags.contains(['goods'])` misses contacts with only `goods-*` prefixed tags (gmail-enrichment pattern). Backfill the base tag first. See `~/.claude/projects/.../memory/feedback_auto_merge_tag_filter.md`.
- **Wiki subdir naming:** `wiki/projects/` has 2 levels. Any project-gap diff must `os.walk` the tree, not `glob('*/')`. Getting this wrong cost 10 min of cleanup today.
- **Branch `rename-goods-slug` is deleted** (local + remote). Main is current. Next session starts clean.

## File inventory — commits merged to main today

```
83a9e7c docs(alignment-loop): plan + Q1 funder-alignment synthesis
e9c92de refactor(wiki): retire "public shell" / "second CMS" (recovered)
47689dc fix(finance): vendor-rules-suggest — Omit first_seen/last_seen
1046450 chore: cleanup + config refresh
7101d66 docs(thoughts): accumulated session artefacts (70 files)
78f2991 feat(command-center): Goods page + API client tweaks
2ef8ed3 chore(scripts): accumulated tooling (20 scripts)
3544678 feat(command-center): standalone public utility pages
9dc76ad feat(goods): duplicates-by-company API + stub rename push
726efcb feat(finance): receipts-triage + self-reliance + vendor-rules-suggest
6e52b9b feat(minderoo): envelope dashboard + pitch assets for 1 May
8b7af6c chore(wiki): update content + regen snapshot [skip ci]
0204359 docs(wiki): add Black Cockatoo Valley + ALMA health snapshot
```

## Memory updated

- `MEMORY.md` — Goods dedup section rewritten, port note corrected, Rachel spelling retired
- `project_goods_dedup_continuation.md` — marked COMPLETE, gotchas documented
- `feedback_auto_merge_tag_filter.md` — NEW, the `.contains(['goods'])` gap
- `project_minderoo_envelope.md` — Rachael→Rachel crossed out

## Don't-do list for next session

- Don't re-run dedup queries assuming there are more — Goods scope is zero
- Don't re-author `wiki/projects/act-studio/*` articles — they exist (my diff script missed them today)
- Don't run Phase 3 ALMA systemic recompute until post-1-May per the existing plan
- Don't merge the 4 "Invoicing <Org>" contacts via auto-merge Tier 1 — they're intentional (tag stripped today to prevent)
- Don't presume branch names or PR state from memory — always `git status` / `gh pr list` first

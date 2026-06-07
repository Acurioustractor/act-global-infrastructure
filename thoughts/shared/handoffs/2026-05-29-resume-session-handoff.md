---
title: Resume session 2026-05-29 — Goods scoring polish + v6 prep doc + EOFY readiness + Standard Ledger email audit
date: 2026-05-29
session_type: multi-track resume from 2026-05-28 close
status: ready for `/clear`; pick up via "Read this handoff first" prompt next session
---

# Session handoff — 2026-05-29

Five tracks landed back-to-back. Index below; full detail follows.

## What landed (5 tracks)

| # | Track | Output | Status |
|---|---|---|---|
| 1 | **GrantScope scoring-noise polish** | 3 marquee rows enriched 48/48/41 → 100 + Westpac Foundation IEG inserted (score 65) | ✅ DB-only, no code change, no commits |
| 2 | **Cost-model v6 advisor prep doc** | `thoughts/shared/briefs/2026-05-29-cost-model-v6-prep.md` (277 lines, self-contained for PIN advisor) | ✅ Committed `890389d` on branch `wip/qbe-v6-prep-2026-05-29` (not pushed) |
| 3 | **EOFY readiness check** | Notion integration verified live (41 tasks readable), PM2 cron armed surgically, first Telegram countdown sent end-to-end | ✅ Live + verified |
| 4 | **EOFY P0/overdue walkthrough** | 7 P0s, 4 overdue. D&O broker brief + NAB account walkthrough drafted | ✅ Both briefs appended to Notion task pages |
| 5 | **Standard Ledger email audit** | 30+ threads reviewed across 6 months. 4 outstanding items found that Ben promised SL on 22 May | ⚠️ Single most-leveraged Ben action: sign the BAS proposal |

## What's now on Ben (this week)

Three external sends:
1. **Sign the Ignition BAS clean-up proposal** (6 reminders deep, blocking Nic's BAS prep + SL bandwidth on other asks)
2. **Wise Business signup** (10 min online, doesn't need ABN to start)
3. **NAB branch booking** for week of 9 June (use phone script in NAB Notion task)

Three chases:
4. Standard Ledger on Shareholders Agreement (nudge sent today; ⚠ no SL email in 6 months mentions a Shareholders Agreement — may come back as a new proposal)
5. Standard Ledger on ABN + GST landing tomorrow 30 May (status "Doing")
6. D&O insurance broker: BizCover (fastest) or Standard Ledger referral (lowest friction). Brief is on the Notion D&O task page.

Two quick checks:
7. Did you reply to Vanessa's 14 Apr email asking for Ben + Carla TFNs for Knight FT TFN application? (No reply visible in thread; may have been handled offline.)
8. Open the `/eofy` page once at command.act.place/eofy to confirm the "needs connection" callout has dropped (it should have).

## Track 1 — GrantScope scoring polish (DB-only)

**Verified the 2026-05-27 fix landed end-to-end:** all 24,989 grant_opportunities rows scored, zero arc-grants/qld-arts-data at score ≥50, 28 rows at 70+. The "GrantScope scoring-noise fix (start here)" pointer in MEMORY.md was stale — code AND DB rescore were both done.

**Spot-check found 3 marquee anchors miss the top-20 by 1-9 points** due to thin DB rows (empty/short description, no `geography`, sparse `categories`). Fixed via Supabase MCP:

| Row | Before | After | Method |
|---|---:|---:|---|
| FRRR-SRC | 48 | **100** | geography=AU + 463-char description + 8-element categories |
| IAS (alta_agent) | 48 | **100** | geography=AU + 609-char NIAA IAS description + 8-element categories |
| ILSC Our Country Our Future (ilsc) | 41 | **100** | geography=AU + 439-char on-Country description + 8-element categories |
| Westpac Foundation IEG | — | **65** (curated) | Net-new INSERT (distinct from Westpac Social Change Fellowship which already exists at 33) |

Top-20 spot-check (§5 step 6) all green: SEDI Capability 82, SEDI First Nations 88, IBA 82, Supply Nation 80, ABA 75, IAS 100, FRRR-SRC 100, ILSC OCOF 100, Westpac IEG 65. Zero arc-grants, zero qld-arts-data.

**Footprint:** 3 UPDATEs + 1 INSERT + 1 hand-set score in `grant_opportunities` on shared ACT DB. Memory `goods-foundation-pipeline.md` got a one-paragraph polish-pass entry. **No code changes, no commits, no PRs.**

## Track 2 — Cost-model v6 advisor prep doc

**File:** `thoughts/shared/briefs/2026-05-29-cost-model-v6-prep.md` (277 lines / 3,095 words).

**Commit:** `890389d` on branch `wip/qbe-v6-prep-2026-05-29` (off main, **not pushed**).

**Doc structure (11 sections):**
1. What v6 is (one paragraph framing)
2. v5 baseline anchors — verified BOM ($469.79 direct), 4 supply paths, Musk floor $128.99, overhead curve, capex $112-222K, founder time, counterfactual
3. 11 locked grill decisions
4. 5 v5 weaknesses spelled out with exact JSON keys to touch + numeric implications
5. 6 verification calls for Ben to clear pre-advisor-kickoff
6. 5 sensitivity dials (base/-20/+20 + 3-way joint downside)
7. Open Defy questions (volume quote at 100/500/1K/5K)
8. ~$135K mistag list with -$70K to -$90K post-retag delta estimate
9. "Done" deliverable shape
10. Provenance + linked artifacts
11. Confidence ledger (every load-bearing claim tagged verified/inferred/unverified)

**3 author calls flagged in the doc** for Ben to verify:
- Suggested ACT brokerage base case = $200/bed (mid of decision-10's $60-$500 slider)
- Demand-mix segment price points (Centrecorp $801 anchor; corporate RAP $750-$1,500 gift-shaped flagged as biggest unknown)
- Year-1 utilisation framing (150 beds × 3 sites = ~20% utilisation flagged as "hardest cell to defend")

**What this doc deliberately doesn't do:**
- Doesn't pick the brokerage rate
- Doesn't fold in V4 diagnostic language (call 6 in advisor brief §5)
- Doesn't pre-compute post-retag COGS (leaves it as a reconciliation choice for the advisor)

## Track 3 — EOFY readiness check

**Cutover:** 30 June 2026. **Today:** 29 May 2026. **32 days remaining.**

**State now:**
- Notion integration **connected** to EOFY Setup Tracker DB (you did this during the session)
- Script reads 41 tasks live (verified via `node scripts/snapshot-eofy-burndown.mjs --dry-run`)
- `/eofy` page on command.act.place no longer shows "needs connection"
- PM2 `eofy-burndown` armed (ID 128, cron `20 7 * * *`, script path correct)
- `pm2 save` committed to `~/.pm2/dump.pm2` — survives PM2 restart
- **First Telegram countdown sent end-to-end** (34d, 0% done — see your Telegram)

**Surgical PM2 start used (`pm2 start ecosystem.config.cjs --only eofy-burndown`).** Avoided `./dev cron` which would have started ~70 other crons that are intentionally stopped (e.g. xero-sync per 2026-05-17 memory).

**Next firing:** 7:20am AEST tomorrow automatically.

## Track 4 — EOFY P0 + overdue walkthrough

**41 open tasks. 7 P0. 4 overdue. All 4 overdue tasks ARE P0s.**

| Days | Due | Status | Owner | Task |
|---:|---|---|---|---|
| **-21 ⚠** | 2026-05-08 | To do | Standard Ledger | Shareholders Agreement (Knight FT / Marchesi FT) |
| **-14 ⚠** | 2026-05-15 | To do | Ben | Select insurance broker |
| **-14 ⚠** | 2026-05-15 | To do | Ben | Open NAB business account (Pty) |
| **-5 ⚠** | 2026-05-24 | To do | Ben | Bind D&O insurance |
| +1 | 2026-05-30 | Doing | Standard Ledger | GST registration (Pty) |
| +1 | 2026-05-30 | Doing | Standard Ledger | ABN application (Pty) via ABR |
| +8 | 2026-06-06 | Blocked | Ben | Open Pty Xero file (CoA + tracking) |

**Dependency chain:**
```
Shareholders Agreement (overdue 21d) → Pty Xero file (Blocked) → Pty trading 1 Jul
Insurance broker (overdue 14d) → D&O binding (overdue 5d) → directors covered
NAB business account (overdue 14d) → cards/feeds for Pty trading
```

### D&O brief — appended to Notion task page `36debcf9-81cf-8155-b1ee-e75c93b52ca9` (33 blocks)

Content: insured details, activity description (social-impact services holding company, not regulated), revenue Y1 indicative $400-700K, sum-insured asks at $1M/$2M/$5M, extensions priced separately (Entity ✓, Statutory ✓, EPL when hiring, Outside Directorship if Ben sits on boards, Crime/Fidelity skip), clean claim history, brokers shortlist (BizCover first for speed; Standard Ledger referral lowest friction; avoid Gallagher/Marsh for $2M).

### NAB walkthrough — appended to Notion task page `36debcf9-81cf-812f-9ada-c5678b3aea34` (37 blocks)

**Recommended 4-account setup:**

| Slot | Provider | Reason |
|---|---|---|
| Operating | NAB Business Everyday | AU bills + revenue + native Xero feed |
| Buffer | NAB Business Cash Maximiser | 4-state cashflow buffer |
| Local card | NAB Low Rate Business Visa | AU vendors + AU SaaS |
| International card | **Wise Business** multi-currency | US/UK/EU SaaS + travel; **virtual cards per vendor = kills the historical SaaS mistag pattern** |

**Why pair NAB + Wise:**
1. Mistag prevention — Wise virtual cards = one card per SaaS vendor = Xero auto-categorises by card (kills ~80% of historical SaaS mistag pattern)
2. FX cost — NAB ~3% on $20-30K/yr US SaaS = $600-900/yr. Wise ~0.5% mid-market = ~$100-150. Saves $500-700/yr after week-one Wise setup.

**Branch booking** — 3 channel scripts (Phone 13 10 12, Online booker, Walk-in). Phone script: "Hi — I'd like to book an appointment with a Small Business Banker to open a new Pty Ltd banking package. We need a Business Everyday Account, a Cash Maximiser, and to apply for a Low Rate Business Visa. ABN is being issued by our accountant on 30 May, so could we book for the week of 9 June? 60-90 minutes. Two directors will attend."

**Docs to bring:** ASIC cert (post-30-May), ABN confirmation, TFN, Director IDs (Ben + **confirm Nic's is current**), Photo IDs, Trust deeds (Knight FT + Marchesi FT), Standard Ledger letter confirming entity structure.

**Timing reality check:** NAB business account ~10 business days from app to active including card delivery. To open by 30 June, apply by 16 June latest. **Suggested order:** Wise this week → SL confirms ABN ~30 May–3 Jun → book NAB for week of 9 Jun → physical Wise card 5-7 days.

## Track 5 — Standard Ledger email audit

**Reviewed 30+ threads across 6 months.** Findings:

### Timeline (verified from Gmail)

| Date | Event | Status |
|---|---|---|
| 20 Mar | Entity setup proposal **signed** (Ignition) | ✅ |
| 8 Apr | Knight FT trust deed prepared | ✅ |
| **14 Apr** | **Vanessa: TFN application for Knight FT — needs Ben + Carla TFNs** | ❓ **No reply visible** |
| 22 Apr | **A Curious Tractor Pty Ltd CREATED, ACN 697 347 676** | ✅ |
| 22 Apr | SL starts processing ABN + TFN + GST + PAYGW for Pty | 🟡 in-flight |
| 29 Apr | BAS clean-up proposal sent via Ignition | ❌ **Not signed (6 reminders since)** |
| 5 May | Strategy call with Remco (Fathom recap — multi-vertical structure, founder comp, Director's Loan, Dext tagging) | ✅ |
| 14 May | ATO nomination meeting w/ Kylie (sole trader) | ✅ |
| 19 May | Robhie: SL has ATO access, proceeding BAS prep BUT unreconciled txns from Oct 2025 need clean-up | 🟡 |
| 22 May | Robhie asks for: (a) Pty Xero access, (b) Pty ATO Client-to-Agent linking, (c) BAS proposal signature | ❌ All 3 outstanding |
| 22 May | Ben replies: "Send proposal link again, I'll sort Xero + ATO access this week" | ❌ Week has passed |
| 26 May | Final BAS proposal reminder | ❌ Still unsigned |

### 4 outstanding items Ben promised SL in writing on 22 May (overdue)

1. **Sign the Ignition BAS clean-up proposal** (latest reminder 26 May)
2. **Grant SL Xero access** on the A Curious Tractor Pty file (Settings → Users → Invite, Adviser role)
3. **Coordinate Pty ATO Client-to-Agent linking** with Nic (Nic lodges nomination)
4. **Reply to Vanessa's 14 Apr ask** for Ben + Carla TFNs for Knight FT TFN application (may be done offline — verify)

### ⚠ Heads up — Shareholders Agreement is NOT in any SL email

Searched all 6 months. No thread from `*@standardledger.co` mentions "shareholders agreement" or "shareholder agreement". EOFY tracker treats it as "SL to draft, 21 days overdue". Possible reads:
- (a) On Remco's queue but pre-scope (just hasn't materialised in email yet)
- (b) Not in SL's scope — your nudge today asks for new work; their reply may be a new Ignition proposal at $X
- (c) Discussed verbally on 5 May call, never written up

**Worth knowing what response shape to expect when SL replies to today's nudge.**

### Action items from 5 May strategy call (Ben + Nic, no SL action)

- Migrate sole-trader activity → Pty by 1 July
- Reclassify past sole-trader txns as "on behalf of" Pty (retrospective R&D)
- Define base salary (~$120K/yr) + Director's Loan policy + year-end settlement (bonus via payroll OR dividend through trusts)
- **Subsidiary PTY for Harvest** (ring-fences the philanthropic partner) — **NOT in current EOFY tracker**, may need adding
- Implement Dext project-specific email tagging (kills mistag pattern at source)
- Unreconciled Oct 2025 txns (Robhie flagged 19 May)

## Open items going into next session

| Priority | Item | Owner | Notes |
|---|---|---|---|
| 🔴 | Sign BAS Ignition proposal | Ben | The single most-leveraged unblocker |
| 🔴 | Wise Business signup | Ben | 10 min, no ABN needed |
| 🔴 | NAB branch booking | Ben | Use phone script in Notion NAB task |
| 🔴 | Grant SL Xero access on Pty file | Ben | Promised in writing 22 May |
| 🔴 | Coordinate Pty ATO Client-to-Agent linking with Nic | Ben + Nic | Same flow as 14 May sole-trader nomination |
| 🟡 | Verify Knight FT TFN reply to Vanessa (14 Apr) | Ben | May be done offline |
| 🟡 | D&O quote request to BizCover or SL referral | Ben | Brief is on Notion D&O task page |
| 🟡 | Add Harvest subsidiary PTY to EOFY tracker (if needed by 1 Jul) | Ben | From 5 May meeting notes |
| 🟢 | Push v6 prep branch to origin (or merge to main) | Ben | `git push -u origin wip/qbe-v6-prep-2026-05-29` |
| 🟢 | Retire stale "GrantScope scoring-noise fix (start here)" pointer in MEMORY.md | Next session | Cosmetic |

## Files touched this session

```
A  thoughts/shared/briefs/2026-05-29-cost-model-v6-prep.md  (committed 890389d on wip/qbe-v6-prep-2026-05-29)
A  thoughts/shared/handoffs/2026-05-29-resume-session-handoff.md  (this file)
M  ~/.claude/.../memory/goods-foundation-pipeline.md  (one-paragraph polish-pass entry)
M  ~/.claude/.../memory/eofy-burndown-tracker.md  (resume notes updated — see next file)
M  ~/.claude/.../memory/MEMORY.md  (one-line pointer added)
```

**Notion writes (Tier 2, all on the EOFY Setup Tracker DB):**
- D&O insurance task page `36debcf9-81cf-8155-b1ee-e75c93b52ca9` — 33 blocks appended
- NAB business account task page `36debcf9-81cf-812f-9ada-c5678b3aea34` — 37 blocks appended

**DB writes (Tier 2, shared ACT Supabase `tednluwflfhxyucgwigh`):**
- `grant_opportunities`: 3 UPDATEs (FRRR-SRC, IAS, ILSC OCOF) + 1 INSERT (Westpac IEG) + 1 hand-set score on Westpac IEG

**PM2 (Tier 2, local):**
- Started `eofy-burndown` only (surgical, did not run `./dev cron`)
- `pm2 save` committed dump

**External sends (Tier 3, all to Ben's own surface — no external human):**
- 1 Telegram countdown message sent to Ben's chat (verifies EOFY wiring)

**No git pushes, no PRs opened, no external emails sent.**

## Resume prompt for next session

> Read `thoughts/shared/handoffs/2026-05-29-resume-session-handoff.md` + memory `eofy-burndown-tracker.md`. Most-leveraged Ben action is signing the Ignition BAS proposal. v6 prep doc is committed on `wip/qbe-v6-prep-2026-05-29` (unpushed). Three external sends queued (Wise signup, NAB booking, D&O broker). Standard Ledger has 4 specific items Ben promised on 22 May that are still outstanding.

---
title: ALMA health — why we missed PICC, BG Fit, Mounty Yarns, MMEIC, and how to make sure we don't miss again
date: 2026-04-20
purpose: Diagnose the real gaps in ALMA's coverage + scoring, propose a 3-phase fix, and build a health-check mechanism so anchor-to-data drift is visible on the dashboard
audience: Ben, before approving any writes to ALMA production data in GrantScope
---

# ALMA health — diagnosis and fix

## Part 1 — What actually happened

When we ran the 50-candidate shortlist query yesterday, four of ACT's confirmed anchor communities were missing from the top 50. I flagged this as *"not yet ingested into ALMA; post-envelope engineering."* That was half right. The full picture is stranger and more important:

### Four different gap shapes

| Anchor | In `gs_entities`? | In `alma_interventions`? | Youth-justice? | Max portfolio_score | Root cause |
|---|---|---|---|---|---|
| **Oonchiumpa** | ✓ | 9 interventions | 4 | **0.772** | None — working as intended |
| **PICC** | ✓ (`18fc2705-…`) | **21 interventions** | **11** | **0.380** | **Scoring pipeline broken** — signals null/stuck |
| **MMEIC** | ✓ (`e7267f3a-…`) | **0 interventions** | 0 | — | **Interventions not yet authored** |
| **BG Fit** | ✗ | — | — | — | **Entity never created** |
| **Mounty Yarns** | ✗ | — | — | — | **Entity never created** |

PICC is the killer finding. It has **21 ALMA interventions** — more than any other ACT anchor. Eleven of those are youth-justice-specific. The reason it didn't show up in our shortlist is not that PICC is under-recognised — it's that **the ALMA scoring pipeline didn't compute signals for PICC's records**, so they all scored 0.380 on evidence_signal=0.100 and null on everything else. At that score they rank below ~200 other interventions.

PICC was silently penalised by a pipeline bug, not by a real evidence assessment. That's a different class of problem than "not ingested."

### The systemic finding — 46% of youth-justice interventions are mis-scored

A single diagnostic query against the 739 youth-justice interventions in ALMA:

```
total_interventions:       739
evidence_signal_null:       58  (  8%)
auth_signal_null:          107  ( 14%)
risk_signal_null:          107  ( 14%)
impl_signal_null:          107  ( 14%)
option_signal_null:        107  ( 14%)
portfolio_score_null:       58  (  8%)
evidence_signal_stuck_01:  339  ( 46%)
```

**339 of 739 (46%) have evidence_strength_signal stuck at the fallback 0.1.** That means nearly half the ranked landscape is being scored by a default-value path rather than by the actual scoring rules (RCT=0.95, Effective=0.75, Indigenous-led=0.65, Promising=0.40, Untested=0.20).

Even within Oonchiumpa's own 4 youth-justice interventions: only 1 of 4 has all signals populated. The other 3 have evidence=0.5 and null on auth/risk/impl/option — they score 0.500 and fall out of the top 50. We were seeing Oonchiumpa rank 4 on the strength of ONE of its four interventions, not all of them.

## Part 2 — How we missed it

The original ALMA scoring pipeline was built to score the national youth-justice intervention landscape. It was never designed to validate against ground truth. There was no invariant like *"every ACT-known anchor should surface in the top 200"* to fail-stop against.

That invariant only became detectable once this session produced a ground truth (4 confirmed anchors with named verbal consent and known operational scale). When we ran the shortlist query and saw the mismatch, the pipeline bug became visible.

The meta-lesson: **a scoring model without a ground-truth harness silently degrades.** Every subsequent query against the mis-scored pool compounds the error. If Ben had run this shortlist for Minderoo without the 4-anchor sanity check from this session, he would have received a "data-led" top-7 that excluded PICC — and never known.

## Part 3 — Three-phase fix plan

All writes require Ben's approval before execution. Nothing below is self-applied.

### Phase 1 — Recompute PICC + partial-Oonchiumpa signals (fix the scoring pipeline's output on known-good ground truth)

**Scope:** ~24 interventions total — PICC's 21 + the 3 Oonchiumpa interventions currently at score=0.500.

**Approach:** run ALMA's existing signal-recomputation function (likely `recompute_portfolio_signals(intervention_id)` or similar — needs to be located in the grantscope repo) against this narrow set. If no function exists, write one that implements the documented scoring rules (30% evidence / 25% authority / 15% × 3) from `grantscope/supabase/migrations/20260315_alma_portfolio_score.sql`.

**Expected outcome:** PICC's max score shifts from 0.380 → approximately 0.65–0.75 range (they have Indigenous-led + community-controlled + years-operating evidence). At that score PICC enters the top 30.

**Risk:** low. The intervention data is unchanged; only derived signals recompute. Audit trail captured in `wiki/output/alma-recompute/`.

### Phase 2 — Author MMEIC interventions + create BG Fit and Mounty Yarns entities

**MMEIC** — entity exists; no interventions coded. Author 1–2 interventions based on public information:
- *"Elders-in-Council Youth Cultural Programs"* (evidence: Indigenous-led, community authority: Quandamooka elders, years operating: 33 since 1993)
- *"Minjerribah On-Country Cultural Connection"* (same structure)

**BG Fit** — no entity. Create via ABN lookup (need ABN from Brodie; currently empty in our records). Then author 3–4 interventions:
- *"BG Fit Tuesday Gym Sessions"* (evidence: Promising, ~5000/young person)
- *"Mount Isa Bush Camps — On-Country"*
- *"Spinifex Residential Partnership"*
- *"Doomadgee Remote Community Quarterly"*

**Mounty Yarns** — no entity. Create via ABN lookup (Daniel Daylight's org). Then author 1–2 interventions:
- *"Mounty Yarns Youth-Led Peer Programs"*
- *"Youth Peak Co-Led Mentoring (Adam + Leah)"*

**Risk:** medium. Authoring new ALMA records writes community-facing interpretive text about the org's work. Must be done with community-leader review (Brodie, Daniel Daylight, MMEIC elders) before public visibility. Draft in wiki first; confirm with each org; then write to ALMA.

### Phase 3 — Systemic scoring-pipeline recompute

The 339 stuck-at-0.1 interventions are almost certainly distributed across the national landscape, not specific to ACT's anchors. A full-pool recompute is the right fix.

**Scope:** 739 youth-justice interventions (or 1,155 all interventions — decide with GrantScope maintainer).

**Approach:** identify the signal-compute trigger or function in the grantscope repo. Determine why it fired only partially on original ingest (schema migration? manual-only trigger? data-shape edge case?). Re-run it across the pool.

**Risk:** higher — touches the entire scoring landscape. Coordinate with GrantScope maintainer. Not envelope-critical; schedule post-1-May.

**Validation after the recompute:** the ground-truth harness from the health-check script (Phase 4 below) should show all 4 confirmed ACT anchors in the top 200. If any fall out, the recompute itself has a bug.

## Part 4 — The health-check mechanism (ships before Phase 1)

`scripts/alma-health-check.mjs` — read-only against the shared Supabase. Produces a weekly report to `wiki/output/alma-health/<YYYY-MM-DD>.md`.

**Checks performed:**

1. **Coverage counts** — total interventions, youth-justice subset, community-controlled entities, distinct states represented
2. **Signal completeness** — null counts per signal column; stuck-at-fallback counts; null portfolio_score count
3. **Ground-truth harness** — explicitly check that ACT's confirmed anchors (Oonchiumpa, PICC, MMEIC + once authored: BG Fit, Mounty Yarns) are in the top 200 by portfolio_score. Alert if any fall out.
4. **Orphan orgs** — gs_entities records with `is_community_controlled=true` and `entity_type='indigenous_corp'` but zero interventions — potential authoring gaps
5. **Evidence-level distribution vs signal distribution** — sanity check that "Effective" interventions have evidence_signal ≥ 0.75 etc.

**Surfaces:**

- Weekly markdown report in `wiki/output/alma-health/`
- Dashboard addition: a single card on `minderoo-live-dashboard.html` showing "ALMA scoring health: N/M anchors ranked in top 200" with ✓ or ⚠ indicator
- Optional: Telegram alert when a ground-truth anchor falls out

**Why this matters for the Minderoo envelope:** the dashboard already claims *"evidence-led shortlist."* Claiming that without a health check makes the claim fragile — a scoring regression silently breaks our own position. With the health check visible, Lucy sees ACT runs its own data-quality discipline, not just its own scoring.

## Part 5 — What to tell Minderoo (transparency framing)

This is not a problem to hide. It is exactly the kind of editorial work the $2.9M funds.

**For the envelope:** the "What's missing" section already names *"440+ raw stories waiting for editorial infrastructure."* Add one line:

> *"ALMA's scoring pipeline has a known degradation — 46% of youth-justice interventions are mis-scored at fallback values. We identified this while shortlisting Minderoo's candidate pool against ACT's confirmed anchors. Fixing the pipeline is part of Year 1 editorial work. We detected it because we had ground truth to test against. That pattern is the method."*

This is a strength-move, not a weakness. Funders who receive a pitch that admits a data-pipeline bug — and names the fix — trust the pitch more than one that doesn't.

## Part 6 — Ordered action list

1. **Build the health-check script** (read-only, no writes required) — today. Ships immediately.
2. **Add "ALMA scoring health" card** to the dashboard. Links to the latest health report.
3. **Surface the PICC mis-score finding to Ben and the GrantScope maintainer** — triggers Phase 1 conversation.
4. **Phase 1 recompute** — after Ben's go-ahead. Scoped narrow (24 interventions). Immediate dashboard benefit when PICC rank jumps.
5. **Phase 2 — MMEIC authoring** — narrow scope, no community-leader risk.
6. **Phase 2 — BG Fit + Mounty Yarns entity creation** — needs ABN lookup + community-leader draft-review.
7. **Phase 3 — systemic recompute** — post-1-May, with GrantScope maintainer.

Items 1 and 2 can ship today without touching ALMA. Items 3–7 touch production data; pace them after Ben's confirmation.

## Related

- `thoughts/shared/plans/minderoo-reloop-50-to-7.md` — the strategy this supports
- `apps/command-center/public/minderoo-candidate-shortlist.json` — current (mis-scored) shortlist
- `apps/command-center/public/minderoo-live-dashboard.html` — dashboard to augment
- `grantscope/supabase/migrations/20260315_alma_portfolio_score.sql` — the scoring rules we're measuring against

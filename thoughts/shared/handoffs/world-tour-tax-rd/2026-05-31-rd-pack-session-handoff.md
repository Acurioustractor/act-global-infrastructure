# Session handoff — World Tour tax system + FY26 R&D pack (2026-05-31)

> Resume point. Memory `world-tour-tax-rd-tracker.md` (auto-loads via MEMORY.md) carries the same facts;
> this is the end-of-session picture + next actions. **Not advice — Standard Ledger confirms before lodgement.**

## Git state
- Branch `wip/opus-4-8-prompting-2026-05-31`, **pushed to origin** (public repo).
- `ce77ec7` — FY26 R&D pack (overseas finding, master register, compliance check, Path C plan, handoffs).
- `17a5486` — ACT-IN classification resolution.
- Nothing merged. PR into main not opened (Tier-3, awaits explicit "open a PR").
- Unrelated `apps/command-center/public/wiki/...` edits remain unstaged in the working tree (pre-existing, not mine).

## What was built (the chain)
1. **Notion World Tour tax system** under page `371ebcf981cf8020b780c3c25616a44f` ("Empathy Ledger Business Tax and R&D Overview"): 4 databases — 🗓️ Trip Diary (42 days, linked to Tour Stops), 💸 Expense Ledger (CT-RD/CT-BIZ/KP-BIZ/PRIVATE/MIXED + apportionment formula), 🧪 R&D Experiment Log (8 rows), 📎 Evidence Register — plus framework body.
2. **🧾 Overseas Finding draft** (Notion sub-page + `rd-pack-fy26/world-tour-overseas-finding-draft.md`): the 4 conditions, per-activity narratives (PRISM, OCAP, bidirectional Travel Diary), national-priority map.
3. **🗂️ R&D Master Register + Standard Ledger pack** (Notion sub-page + `rd-pack-fy26/`): `rd-master-register.csv`, `rd-project-totals.csv`, `STANDARD-LEDGER-PACK-INDEX.md`, provenance sidecars.
4. **Software-R&D compliance check** (`rd-pack-fy26/software-rd-compliance-check.md`) — TA 2017/5 + sector guide.
5. **Deepened narrative** (`rd-pack-fy26/deepened-rd-narrative.md`) — cross-project thesis + new candidates.
6. **ACT-IN classification** (`rd-pack-fy26/act-in-classification.md`) — the determination.
7. **✅ R&D Evidence To Capture** Notion DB (`collection://16ea55be-d69e-4b3e-b486-f947767f195a`) — 11 tracked items.

## Key decisions / determinations
- **Entity:** A Curious Tractor Pty Ltd (ACN 697 347 676) is the only R&D claimant. Knight Photography (partnership) can't claim R&D; photography is also arts-excluded. The Harvest is a content site, not R&D.
- **Trip:** 27 Jun–7 Aug 2026, straddles FY line (27-30 Jun = FY25-26; 1 Jul on = FY26-27). User decisions: full build; KP minimal/mostly-private; build to support an Overseas Finding.
- **FY26 registered claim = $354,047** (Goods $188,250 / EL $79,750 / CivicGraph $61,500 / JH $24,547), all `in_progress`, grade WARN/62. 43.5% → ~$131-154K refund.
- **Overseas Finding** (FY26-27, due 30 Jun 2027, ~90-day processing): extends EL+JH cores overseas; Condition-3(c) "population not in Australia" is the hook; Condition-4 less-than ties to FY26-27 dev spend.
- **Compliance (TA 2017/5):** per-activity not per-project; internal-admin software excluded from core. ANZSIC M/7000 ok.
- **ACT-IN RESOLVED:** internal tools (Alignment-Loop `synthesize-project-truth-state.mjs`, rubric grader `grade-pack.mjs`, finance harness) are EXCLUDED as core (purpose-based) + fail the supporting test → **no ACT-IN core register**. Re-cut Ben's ~60% ACT-IN time: external-facing experimental work (ALMA→ACT-JH, autoresearch→ACT-CG, Governed-Proof→JH) into product registers; internal-ops time is not R&D. **No ~$95K core gap.**
- **Strongest NEW claim:** JusticeHub **Governed-Proof federated assembler** (publish-ceiling bounded by most-restrictive consent). Recurring novel method: ethically-bounded self-calibration that refuses to learn to rank people.
- **Integrity flags fixed:** restored the missing Path C plan (`plans/rd-tax-incentive-fy2526-path-c.md`); reconciled README's stale $147,250 to $354,047.

## ⚠️ Carry-forward flags
- **TIMING:** GrantScope autoresearch evidence (`autoresearch-log.jsonl`, F1 76.9→94.1) dated 2026-03-08 = PRE-Pty (registered 24 Apr 2026) → likely NOT claimable. Capture fresh runs in-window.
- **JusticeHub** 601 commits live in a separate repo; 100-row gold set unlabelled (SL to verify).

## Next actions (priority order)
1. **Standard Ledger:** AusIndustry FY26 registration (hard blocker, due 30 Apr 2027); confirm ACT-IN resolution + the personnel re-cut; Nic arms-length salary ($80K base); confirm ANZSIC M/7000.
2. **Evidence capture** (the ✅ tracker): Goods conversion cohort (largest register), the gold sets, EL audits, the deep-dive artefacts, **fresh GrantScope autoresearch runs in-window**.
3. **Overseas Finding:** book the R&D adviser pre-departure; lodge early in FY26-27.
4. Optional: open a PR for `wip/opus-4-8-prompting-2026-05-31` into main.

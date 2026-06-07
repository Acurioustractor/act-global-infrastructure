# ACT Finance Skill Suite — design

> **Durable taxonomy graduated → `wiki/concepts/finance-skill-suite.md`** (the role-map + the 7 suite-wide
> conventions live there now, canonical). This file is the **disposable build record**: the gap analysis,
> the `reconcile-cycle` spec, and the decision log for *this* build. `reconcile-cycle` shipped 2026-06-01
> (read-only). Once the soft gaps (`close-cycle`, `ar-chase`) are settled, archive this plan.

**Created:** 2026-06-01 · **Status:** BUILT (reconcile-cycle shipped, read-only) · **Owner:** Ben + Claude
**Trigger:** "we can create skills to make this [reconciliation] process so much easier" — and the broader idea of a small-business finance skill stack, inspired by [garrytan/gstack](https://github.com/garrytan/gstack) (a "virtual engineering team") and [mattpocock/skills](https://github.com/mattpocock).

---

## TL;DR

We don't need a new skill *format* — `bas-cycle` already implements the best patterns from both inspiration repos (flat `SKILL.md` + `references/` + `workflows/` + a learning loop). And we don't need a new strategic-money layer — the `act-money-brain` plugin already covers funders, grants, scenarios, pile-mix, decisions and standups.

**The gap is the operational bookkeeping layer**, and the highest-leverage missing piece is a `reconcile-cycle` skill that drives the reconciliation cockpit (`/finance/reconcile`, shipped 2026-06-01) and bakes in the Tier-3 write-back guardrails. Build that first; treat the rest of the suite as deliberate, gap-driven additions — not a 20-skill build-out.

---

## 1. Framing: skills are operators, not a fifth surface

ACT's finance world is the **4-Surface Model** (`.claude/references/finance-surfaces.md`): **Notion reads · command-center operates · scripts automate · Telegram pushes.** Skills don't add a surface — they're the *operators* that drive those surfaces with process + memory + guardrails. gstack frames this as a "virtual team"; for us it's a **virtual finance team** whose members map to real ACT finance roles.

The suite splits cleanly in two:

- **Money Brain (strategic / intelligence)** — "where's the money, who funds us, what if." Mature, lives in the `act-money-brain` plugin.
- **The Books (operational / bookkeeping)** — "tag it, receipt it, reconcile it, acquit it, claim it." Lives in project skills. **This is where the cockpit and the gaps are.**

## 2. The virtual finance team (role → job → skill → surface)

| Role | Recurring job | Skill(s) | Primary surface | Status |
|---|---|---|---|---|
| **Bookkeeper** (daily) | tag spend to projects | `tag-transactions` | command-center `/finance/tagger-v2` | ✅ |
| | chase / fix receipts | `find-receipt` | command-center `/finance/receipts-triage` | ✅ |
| **Reconciler** (weekly) | match/dedupe card lines | **`reconcile-cycle`** | command-center `/finance/reconcile` (cockpit) | 🔨 **gap** |
| **BAS agent** (quarterly) | GST + acquittal + retro | `bas-cycle` | scripts + command-center | ✅ |
| **Cost controller** | recurring/subscription watch | `scan-subscriptions` | command-center | ✅ |
| **R&D claimant** | contemporaneous evidence | `rd-capture` + `act-rd-activity-drafter` | filesystem `rd-pack-fy26/` | ✅ |
| **Fundraiser** | funder research / brief | `act-funder-research` (`/brief-funder`) | Notion Foundations DB | ✅ |
| | grant triage | `act-grant-triage` (`/find-grants`) | GrantScope → Notion | ✅ |
| | outreach drafting (brand voice) | `act-funder-outreach-drafter` (`/draft-funder`) | Notion | ✅ |
| **CFO / strategist** | "where's the money now" | `act-money-operations` (`/money-status`) | Notion + Telegram | ✅ |
| | cash scenarios / forecast | `act-cash-scenario-builder` (`/scenarios`) | Notion Cash Scenarios | ✅ |
| | pile mix vs target | `act-pile-movement-analyst` (`/pile-mix`) | Notion | ✅ |
| | decisions log | `act-decisions-drafter` (`/decision`) | Notion Decisions Log | ✅ |
| | daily standup | `act-standup-synthesizer` (`/standup`) | Telegram | ✅ |
| **Setup / compliance** | Pty/trust/insurance/R&D setup | `business-research` | research | ✅ |
| **AR / collections** | invoice follow-up, draft→send | — | command-center `/finance/invoices` | 🕳️ candidate |
| **Close manager** (monthly) | month-end close pack | — | command-center `/finance/close` | 🕳️ candidate |

**Read:** the strategic half (Money Brain) is ~11 skills deep and mature. The operational half (the Books) has one clear hole (reconcile) and two soft candidates (AR chase, month-end close). That's the whole gap analysis — the suite is closer to complete than it looks.

## 3. Genuine gaps, prioritized

1. **`reconcile-cycle` — HIGH, build now.** The cockpit is live but nothing *drives* it: no skill knows the work order (duplicates first = the $24,727), the guards (surcharge ≠ duplicate, two-account rule), the read-only boundary, or how to run the Tier-3 write-back safely. It's also the natural home for the Phase-2 guardrails. The tool exists; the operator doesn't.
2. **`close-cycle` — MED, later.** `/finance/close` exists; a skill could run the monthly close checklist (reconciled? tagged? receipts? P&L sane vs `project_monthly_financials`?) and emit a close pack. Worth doing once the monthly rhythm is real.
3. **`ar-chase` — MED, later.** Invoice/AR follow-up (e.g. INV-0314 Centrecorp $84,700 draft). Today this is manual + `act-money-brain` covers funders but not collections. Build only if AR volume justifies it.

**Explicitly NOT gaps:** runway/scenarios (covered by `act-money-brain`), EOFY cutover (a one-off 30-Jun-2026 event with a checklist plan — not recurring, so not skill-worthy).

## 4. Suite-wide conventions (standardize these across every finance skill)

Distilled from gstack + mattpocock + our own `bas-cycle`:

1. **Format:** single-file `SKILL.md` ≤ ~100 lines + `references/` (durable knowledge) + `workflows/` (runbooks). Split when content has distinct domains. (mattpocock flat + gstack `sections/`.)
2. **Frontmatter:** `name`, `description` ("what it does. Use when [triggers]." — third person, ≤1024 chars, the only thing the router sees), plus `triggers:` (natural-language phrases) and `allowed-tools:` (lock write-capable finance skills to Read/Bash/the named scripts — never free-form write).
3. **Learning loop (mandatory for operational skills):** accumulate resolved edge-cases into `references/` so the skill stops re-deriving them. (`bas-cycle` per-quarter retros are the precedent; gstack `learn` is the external one.)
4. **Money-guards block (mandatory for any skill that emits a dollar figure):** two-account rule · exclude DELETED/VOIDED (NULL-safe) · sum in SQL not supabase-js (1000-cap) · reconcile against the canonical accrual P&L before any figure leaves the building.
5. **Provenance:** any emitted report/figure gets a `.provenance.md` sidecar (existing repo rule).
6. **Tracer-bullet:** prove ONE transaction end-to-end before any batch (existing money-work rule).
7. **Maturity gate:** WIP skills stay out of the routed set until proven on a tracer (mattpocock `in-progress/`; our scaffolding-vs-evidence doc-lifecycle rule).

## 5. `reconcile-cycle` — the skill to build first

```
.claude/skills/reconcile-cycle/
├── SKILL.md                        # process, the 5 verdicts, money-guards, read-only boundary, commands
├── references/
│   ├── matching-engine.md          # the cascade + surcharge band, pointing at lib/finance/reconcile.ts
│   ├── confirmed-duplicates.md     # LEARNING LOOP — verified dupes (Airbnb, Telford Smith $19.8K…)
│   ├── vendor-aliases.md           # bank descriptor → real vendor (BARGAINCARRENTALS = Bargain Car Rentals)
│   └── phase2-xero-writeback.md    # Tier-3 runbook: create coded bill + attach receipt, guardrails
└── workflows/
    ├── weekly-triage.md            # run cockpit → duplicates → matches → creates → export worklist
    └── tracer-bullet.md            # one line end-to-end before any batch
```

**Reuses what's already shipped:** `lib/finance/reconcile.ts` (tested engine), `/api/finance/reconcile`, `/finance/reconcile` (cockpit), `scripts/reconcile-line-lookup.mjs`. Cross-links `bas-cycle` and `finance-surfaces.md` so no use case is split across two skills.

**Frontmatter triggers:** "reconcile the card", "what's unmatched", "card duplicates", "reconcile NAB Visa", "weekly reconcile".

**Read-only first** (per the earlier Phase-1/2 split): the Phase-2 write-back is documented as a runbook in `references/phase2-xero-writeback.md` but the skill does not write to Xero until we deliberately wire + grill that step (Tier-3, day-shift, explicit-go-per-batch, verify-counts, dedup-safe).

## 6. Naming coherence (flag before building)

There are now three "reconcile" things — disambiguate so the router doesn't misfire:
- `/finance/reconciliation` — **Spending Intelligence v3** (whole-quarter receipt/reconcile status). Unchanged.
- `/finance/reconcile` — **the new card cockpit** (per-line match/dedupe/create). Labeled "Card Cockpit" on the Operate tab-bar.
- "Operate · Reconcile" → `/finance/xero-page-copilot` — the existing copilot host.
- **`reconcile-cycle`** — the new skill (the operator). Name parallels `bas-cycle`.

Recommendation: keep these names; the skill description makes its scope ("NAB Visa card-line reconciliation") explicit so it doesn't collide with the broader Spending Intelligence surface. Revisit a rename only if the router actually misfires.

## 7. Build order & decision log

1. **[approval gate]** Sign off this map + the `reconcile-cycle` scope.
2. Build `reconcile-cycle` with the `write-a-skill` skill (mattpocock's skill building ours — closes the loop). Read-only.
3. Register it in `skill-rules.json` / routing only after a tracer-bullet run proves it end-to-end.
4. Revisit `close-cycle` and `ar-chase` deliberately, gap-driven, later — do not pre-build.

**Decisions taken:**
- D1: Skills are operators across the 4 surfaces, not a 5th surface.
- D2: New skill, not an extension of `bas-cycle` (card-line reconciliation ≠ whole-quarter BAS; keep the 4-surface "no use case in two places" discipline).
- D3: Strategic money layer is out of scope — `act-money-brain` already covers it; do not duplicate.
- D4: Read-only first; Phase-2 Xero writes are a separately-grilled, day-shift step.

**Open questions for Ben:**
- Q1: Is `reconcile-cycle` the right name, or do you want something that signals "card" explicitly (e.g. `card-reconcile`)?
- Q2: Build `close-cycle` / `ar-chase` now or genuinely defer? (Recommend defer.)
- Q3: Should the durable parts of this map (the role table + conventions) graduate to `wiki/concepts/` once agreed, leaving this file as the disposable build plan?

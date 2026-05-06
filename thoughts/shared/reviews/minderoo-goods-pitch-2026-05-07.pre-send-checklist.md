# Pre-send checklist — Minderoo Goods pitch

> Date issued: 2026-05-07
> Subject: `thoughts/shared/drafts/minderoo-goods-pitch-2026-05.md`
> Lands on Lucy Stronach's desk by: 16 May 2026
> Status entering checklist: **WARN/85, 4/4 structural moves landing** (post-§3 polish, commit `c52bee8`)

## What this checklist is

The pitch is voice-clean on the three weight-bearing sites (cover, exec summary, email). The §3 polish landed. What remains is the substance question Nic needs to resolve, plus two register-discipline polish items the re-grade surfaced.

## Gate 1 — Substance (blocking, Nic's 10-min call)

Lines 122-140 of the draft hold §7 back until Nic resolves three questions. These cannot be ghost-answered by a writer; they need decisions.

- [ ] **Q1 — QBE matched-side classification.** Is the $400K a Catalysing Impact 2026 Stage 2 grant, or a separate bilateral?
- [ ] **Q2 — Minderoo-side mechanism.** Grant from Minderoo Foundation (DGR-side) or PRI from Minderoo Investments (equity / repayable debt to ACT Pty Ltd)?
- [ ] **Q3 — Dollar figure + term.** Pick one:
  - **Match-mirror** — $400K / 12 months, symmetrical with QBE
  - **Stack-step** — $250K + $400K + $400K / 36 months, same total, staged drawdown
  - **Anchor** — $900K / 36 months, signals Minderoo as lead funder
- [ ] **Decision deadline:** 12 May 2026 (per draft line 140)

Once resolved, §7 becomes: dollar figure, term, deliverables (8 quarterly IEI reports + annual Murawin evaluation), matched-side mechanic with QBE tranche releases, governance (ACT Pty Ltd board + First Nations advisory + named Minderoo reporter).

§8 appendices then build out: full budget line items, ACT Pty Ltd governance, IEI evaluation frame, one-page data/acquittal protocol covering Xero + GHL + agent layer.

## Gate 2 — Voice polish (non-blocking, optional pre-send)

Re-grade today flagged two soft structural items. The pitch passes 4/4 structural moves without these — these are upgrades, not fixes.

- [ ] **§2 register discipline.** Tighten first three sentences into pure Curtis voice, then let fund-speak carry data. Current §2 paragraph 1 mixes voice ("The basket is full. The hand that fills it is First Nations. The buyer who carries it home is not.") with fund-speak ("demand-side layer," "employment parity," "Indigenous Procurement Policy reaches Commonwealth agencies") inside the same paragraph. Split the registers across paragraphs.
- [ ] **§5 anchor.** Plant one Curtis-compliant sentence at the top of §5 before the agent-layer description / pipeline numbers arrive. Without it, voice drops out by §3-end and the operational pack reads as a different document.
- [ ] **§7 anchor.** Same move at the top of §7 once Nic's questions resolve. One sentence: room (basket/market/country), body (hand), abstract (parity/route/precondition) loaded against the concrete, line stops cold.

## Gate 3 — Plainness scope (accept as-is for working draft)

The Doomadgee plainness test currently fails on §1 entity reality, §7 the ask, and §8 appendices. Reasons:

- PRI, DGR-endorsed, Catalysing Impact cohort, matched-side mechanic, tranche, drawdown — all technical-register terms a fourteen-year-old in Doomadgee cannot parse.
- Correct for an internal working draft that gets stripped before sending. Cover + exec summary + email — the only sections Lucy reads first — already pass plainness.
- **No action.** Accept as scope. If the operational pack moves into a public-facing version, re-test plainness then.

## Gate 4 — Hold-the-line list (do not touch)

These three weight-bearing sentences pass all four Curtis moves and must not be edited:

1. **Cover.** *"The basket leaves country. The hand at market is paid. Goods is the route between."*
2. **Exec summary §2 paragraph 1.** *"The basket is full. The hand that fills it is First Nations. The buyer who carries it home is not."*
3. **§3 abstract loader (Sonnet's one-word fix).** *"When the basket moves from country to market, the participation precondition resolves through trade, not transfer."*

Plus the envelope email — re-grade marks it as the cleanest piece in the document, passes all four moves and plainness.

## Mechanical sweep (verify before send)

- [ ] No literal em-dashes (`—`) in body copy. Hyphens or full stops only.
- [ ] No banned vocabulary anywhere: delve, crucial, pivotal, tapestry, intricate, leverage/-d/-ing, foster, cultivate, empower, unlock/-s/-ed/-ing, vibrant, thriving, seamless.
- [ ] No "not just X but Y" structures.
- [ ] All voice-loaded sentences stop at the abstract — no explanatory tail.
- [ ] Re-run grader after any text change: `node scripts/grade-voice.mjs --file thoughts/shared/drafts/minderoo-goods-pitch-2026-05.md --project goods --genre pitch`

## Final-send sequence

1. Nic's 10-min call resolves Q1-Q3 (Gate 1) by 12 May.
2. Ben writes §7 final language, builds §8 appendices.
3. Optional: apply Gate 2 voice polish to §2/§5/§7 anchors.
4. Run grader one last time. Target: WARN/85+ with structural 4/4. Acceptable to ship at WARN if doomadgee_test stays scoped to the operational pack only.
5. Mechanical sweep (Gate 4).
6. Cover + exec summary + email diff against the hold-the-line list. Confirm not touched.
7. Send via the envelope email at lines 153-169 of the draft (subject: "Goods on Country, the demand-side piece") to Lucy Stronach (lstronach@minderoo.org), pack attached.

## Cost incurred for this pass

~$0.04 in Anthropic tokens (one re-grade run on Sonnet 4.6).

## What changes if Nic answers Q2 = PRI not grant

The whole §7 architecture changes from a foundation grant to an investment instrument with repayment terms. Implications:

- ACT Pty Ltd takes the PRI (the trading entity registered 2026-04-24). Not the dormant charity Ltd.
- Section needs return-of-capital language, not acquittal language.
- Indigenous Procurement Policy + IEI parity reporting still apply, but acquittal becomes investor reporting.
- Matched-side language to QBE shifts — QBE's catalytic grant draws Minderoo's PRI, not Minderoo's grant.

If Nic lands on PRI, write §7 fresh against the investment-instrument frame. Don't try to retrofit grant language.

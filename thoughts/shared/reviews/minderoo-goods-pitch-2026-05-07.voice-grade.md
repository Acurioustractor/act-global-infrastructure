# Voice grade — Minderoo Goods pitch (working draft)

> Date: 2026-05-07
> Subject: `thoughts/shared/drafts/minderoo-goods-pitch-2026-05.md`
> Grader: `scripts/grade-voice.mjs --file ... --project goods --genre pitch`
> Rubric: `thoughts/shared/rubrics/act-voice-curtis.md` v1.0
> Model: claude-sonnet-4-6

## Two grades, same day, captured for the record

| Pass | Verdict | Score | Tier 1 hits | Structural moves landed |
|------|---------|-------|-------------|-------------------------|
| Before Curtis rewrite | **FAIL** | 0/100 | 9 (5 em-dash, 2 unlock, 1 unlocks, 1 leveraged) | 0/4 |
| After rewriting cover + summary opener + email | **WARN** | 85/100 | 0 | **4/4** |

## What changed

Three sites were rewritten using the grader's per-site advice:

**Cover (§1)** — was: *"Goods on Country: the demand-side infrastructure for First Nations employment parity."*
Now: *"The basket leaves country. The hand at market is paid. Goods is the route between."* (Operational reading kept on the second slide.)

**Executive summary opener (§2)** — was: *"Minderoo has spent a decade building the supply side of First Nations enterprise. Generation One. Dream Venture. Backing Black Business..."*
Now: *"Minderoo built the supply side. Generation One. Dream Venture. Backing Black Business. First Australians Capital. The basket is full. The hand that fills it is First Nations. The buyer who carries it home is not."*

**Envelope email** — opening sentence rewritten with the same three Curtis lines as the cover. `unlock matched investment` → `draw matched investment`. `leveraged 2.7x` → `drew 2.7x` with `QBE writes...` attribution.

Plus a mechanical sweep: 5 literal em-dashes → commas/full stops, `unlocks at each tranche` → `releases at each tranche`.

## What the grader says now

> The Curtis voice is real and working in exactly three places: the cover ('The basket leaves country. The hand at market is paid. Goods is the route between.'), the executive summary's second paragraph ('The basket is full. The hand that fills it is First Nations. The buyer who carries it home is not.'), and the draft email, which reproduces the same moves. Those sentences pass: room (basket/market/country), body (hand), abstract (parity/route) loaded against the concrete, line stopped cold. **Hold those and do not touch them.**

## What still warns (and is OK to leave for a working draft)

- **`doomadgee_test = false`** — the technical register in §1 entity reality, §7 the ask, §8 appendices uses language a fourteen-year-old in Doomadgee can't parse: PRI, DGR-endorsed, Catalysing Impact cohort, matched-side mechanic, tranche. This is correct for an internal working draft that gets stripped before sending. The cover, exec summary opener, and email — the only sections Lucy reads first — already pass plainness on their own.
- One soft structural opportunity in §3: *"When the demand-side infrastructure works, the participation precondition resolves through trade, not transfer."* Strong abstract-loaded sentence but no room/body. Sonnet suggests: *"When the basket moves from country to market, the participation precondition resolves through trade, not transfer."* One-word change, completes the move. Optional.

## Cost

~$0.04 in Anthropic tokens across two grade runs.

## Status

Submission-ready on voice grounds for the three priority sites. The structural questions on lines 124–140 (Nic's 10-min call on the QBE matched-side mechanic) remain the gating issue for the substance of the ask.

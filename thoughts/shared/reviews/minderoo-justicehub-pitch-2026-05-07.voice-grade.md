# Voice grade — Minderoo JusticeHub pitch (canonical + exec summary)

> Date: 2026-05-07
> Subjects:
> - `/Users/benknight/Code/JusticeHub/output/proposals/minderoo-canonical-2026.md`
> - `/Users/benknight/Code/JusticeHub/output/proposals/minderoo-executive-summary.md`
> Grader: `scripts/grade-voice.mjs --project justicehub --genre pitch`
> Rubric: `thoughts/shared/rubrics/act-voice-curtis.md` v1.0
> Model: claude-sonnet-4-6

## Companion validation to the Goods grade

This grade exists to confirm the rubric is not Goods-specific. JusticeHub is a different project with a different room (court, cell, watch-house — not basket and market) and a different body (a kid, an Elder — not a hand at market). If the Curtis rubric travels, it should mark up the JusticeHub envelope the same way it marked up the Goods envelope before its rewrite.

It does. Both JusticeHub artefacts read like the pre-rewrite Goods pitch: the abstractions float, the lines extend, the room and body never land.

## Two grades

| Artefact | Verdict | Score | Tier 1 hits | Structural moves landed |
|----------|---------|-------|-------------|-------------------------|
| `minderoo-canonical-2026.md` | **FAIL** | 0/100 | 10 (9 em-dash, 1 curly quote) | 0/4 |
| `minderoo-executive-summary.md` | **FAIL** | 0/100 | 15 (8 em-dash, 6 curly quotes, 1 title-case heading) | 2/4 (rooms ✓, body ✓, abstract ✗, stops ✗) |

The executive summary is structurally closer because it briefly names the room (court, via `court file`, `judge`) and bodies (a worker, an Elder, a child). But neither lands clean — both are buried in lists, surrounded by institutional scaffolding, and the lines never stop.

## What the grader says

### On the canonical doc

> No room is named. The word 'room' appears metaphorically ('what goes in the room', 'rooms they are normally excluded from') but that is architectural metaphor, not a concrete room from the justicehub table. 'Cell', 'court', 'road', 'remand', 'watch-house' — none appear. The whole document floats above ground.

> No body is named. There is no hand, breath, voice, eye, child's foot, door handle — nothing physical. The closest is 'the system swallows another child' but that child has no body and the sentence does not stop there, it keeps explaining.

> This is a meta-document about a pitch, not a pitch. It describes the logic of the argument rather than making the argument. A Curtis voice pitch for JusticeHub could be two sentences: one that names a court or a watch-house, one that names a body inside it.

### On the executive summary

> The strongest raw material in the document is the four-line sequence about the judge, the funder, the worker, and the Elder. That sequence almost works in Curtis voice. Strip everything else and rebuild from there: name the court, name the Elder's hands, load 'recognition' against the cell, and stop the line.

> The document is doing two jobs at once — arguing the policy case and demonstrating Curtis voice — and it fails at both because it cannot stop explaining. A Curtis-voice pitch is five sentences maximum. Write those five sentences first, then attach the budget table separately.

## Concrete repair path the grader proposed

> Open with a single image from inside a watch-house or a court room — one body, one moment, one line that stops. Then let the numbers follow. Example register (not a prescription): 'The watch-house is not the beginning. By the time a kid is in there, seven earlier moments already failed.' That is the voice this needs.

This is the same surgery that took the Goods pitch from FAIL/0 to WARN/85 yesterday: rewrite three sites (cover, exec summary opener, envelope email) using the room+body+abstract+stop moves, then leave the rest of the document as a working draft.

## What this validates

1. **Rubric is project-portable.** Same rules detect the same failure modes on a project with a totally different room and body vocabulary.
2. **Tier 1 catches the cosmetic layer cleanly.** Em-dashes, curly quotes, and title-case headings show up as deterministic flags before any LLM call.
3. **Tier 2-3 advice is specific and actionable.** Sonnet names the exact room words (`cell`, `court`, `watch-house`), the exact body parts to surface (`Elder's hands`), and the exact paragraph in the existing draft to keep (the four-line judge/funder/worker/Elder sequence).
4. **The Goods rewrite pattern transfers.** Three priority sites (cover, exec summary opener, envelope email) is the leverage point. Don't try to rewrite the whole document — strip and rebuild from the strongest existing image, leave the budget tables and operational text alone.

## What's required for JusticeHub to ship at WARN/85+

Mirroring the Goods rewrite, three sites need Curtis surgery:

1. **Canonical opening line(s)** — name the cell or court, name a body, stop.
2. **Executive summary opener** — start from the judge/funder/worker/Elder sequence, strip the bullet scaffolding, load `recognition` against the concrete room.
3. **Envelope email** — same opening as canonical, replaces any `unlock`/`leverage`/`empower` with neutral verbs (`draws`, `releases`, `holds`).

Then a sweep on em-dashes, curly quotes, and the title-case heading.

Estimate: 30–45 min of focused writing, followed by re-grade. Same workflow as the Goods rewrite.

## Cost

~$0.04 in Anthropic tokens (two `grade-voice.mjs` calls).

## Status

**Validation: pass.** The rubric works on a second project with no Goods-specific assumptions baked in. The repair pattern from yesterday is reusable.

**Action queued for JusticeHub:** Three-site Curtis rewrite of the canonical opener + exec summary opener + envelope email, mirroring the 2026-05-07 Goods rewrite. Lives in `/Users/benknight/Code/JusticeHub/output/proposals/`, not in this repo.

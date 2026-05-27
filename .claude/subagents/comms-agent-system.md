# Comms agent system (ACT-wide)

> The brand, design and communication "expert", built as agents. One human (an intern, then
> Ben on the big calls) orchestrates; the agents make and review; the brand profile carries
> the standard so it scales across every ACT project. Built 2026-05-26 from Benjamin Croft's
> "mini-projects owned by interns + a training guide" and "medium-to-market" feedback.

## The pieces
- **Brand profiles** (`.claude/skills/act-brand-alignment/references/<project>.md`): the
  swappable config per project. Voice rules, audiences, medium-to-market map, canonical
  facts, consent rules, verify checklist. Goods is the first (`goods.md`). A new ACT project
  = a new profile, same machinery.
- **`comms-maker`** subagent: brief + profile → the asset, in the right voice and medium.
- **`brand-reviewer`** subagent: scores the draft against the profile, returns PASS/FAIL +
  exact fixes. The built-in review.
- **Human verify gate**: the intern signs off after PASS; Ben signs off on anything
  outward-facing or sensitive. Trust and verify.

## The loop (how action + review is built in)
```
brief ─▶ comms-maker ─▶ draft ─▶ brand-reviewer ─▶ PASS? ──no──▶ back to maker with fixes
                                                      │yes
                                                      ▼
                                            human verify ─▶ publish/send
```
The maker and reviewer iterate automatically until PASS. The human only spends attention at
the end, on something already brand-clean. That is what lets one person run many projects.

## One intern, many agents
An intern opens a Claude Code session and works the playbook's mini-project catalogue
(`Goods Asset Register/wiki/outputs/2026-05-26-comms-intern-playbook.md`). For each project
they: write the brief, spawn `comms-maker`, let `brand-reviewer` gate it, verify, ship. They
can run several in parallel (one per mini-project). The intern is the orchestrator and the
accountable human; the agents are the throughput.

## Adding a new ACT project
1. Copy `references/goods.md` to `references/<project>.md`, fill in that project's identity,
   voice specifics, audiences, medium map, facts, consent rules.
2. Add the project to the scope table in `act-brand-alignment/SKILL.md`.
3. The same `comms-maker` and `brand-reviewer` now work for it. No new agents needed.

## Tuning
- Models default to `sonnet` for volume. Raise the maker to `opus` for flagship/launch assets.
- Hard-rule breaches are always blocking. Keep the per-project verify checklist current; it
  is the contract the reviewer enforces.

---

## Worked proof: Centrecorp one-pager (2026-05-26)

Demonstrates the loop on a real mini-project. (Run by hand here to prove the spec is
executable; once the subagents are loaded, an intern spawns them instead.)

### Brief
```
Project:        Goods on Country
Asset:          Trustee one-pager (refresh of utopia-outcomes-one-pager)
Goal:           Give Centrecorp's board a clean page that justifies + grows the investment.
Audience:       Centrecorp trustees · Medium: PDF + email (board-facing)
Inputs:         The Utopia trip; existing one-pager at v2/public/docs/partners/centrecorp/
Consent state:  Use only cleared facts. No consent-pending names/quotes/faces.
Definition of done: One page, funder-grade, every figure sourced, brand-clean.
```

### Maker output (copy)
> **Utopia Homelands: what the partnership delivered**
> Centrecorp Foundation funded the materials for the May 2026 build. Young people in Alice
> Springs built Stretch Beds with Oonchiumpa, and local teams delivered them out to the
> Utopia homelands. 107 beds reached homes on this trip, most across Utopia, with four going
> to two senior Alyawarr brothers at Ampilatwatja.
> A Stretch Bed replaces a mattress on a concrete floor. Off the ground means warmer nights,
> fewer skin and chest problems, and dignity for the old people. The work happens in
> community, with community, for community, moving toward production owned On Country.
> *Centrecorp Foundation is an Aboriginal Trust based in the Northern Territory.*
> (Verified financial figures to be pulled from the Goods finance docs before send.)

### Reviewer verdict
```
VERDICT: PASS
Blocking issues: none
  1 em dashes: none. 2 "On Country" capitalised: yes. 3 no "co-design"/charity-framing: ok.
  4 stats sourced: 107 beds + materials-funded + NT trust are canonical; dollar figures left
    as a marked gap to pull from finance docs (correct, not invented). 5 consent: no
    pending names/quotes/faces used. 6 medium: PDF + email is right for a board. 7 track: n/a.
Non-blocking suggestions:
  - When figures land, add the total commitment + beds-locked line for momentum.
Medium check: correct (board lives in PDF + email, not a web page).
Brief met: yes, one funder-grade page, brand-clean.
```
### Human verify gate
Intern confirms the figures against the finance docs and Ben signs off before it goes to the
board. The loop produced a brand-clean draft; the human spent attention only on the figures.

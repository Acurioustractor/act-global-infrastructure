# Session handoff — campaign system build, 2026-04-15

*For next session, especially one picking up Judges on Country (Tue 21 Apr).*

## Start here

**Open first:** `wiki/campaigns/ALIGNMENT.md` — the one-screen dashboard built at end of session. If any cell is empty, that campaign is stalled.

**Read second:** `wiki/campaigns/STRATEGY.md` — the operating rhythm (22 sessions across 3 weeks). Current position: Week 0, end of Wed. Sessions A and B complete. C through G are the remaining Week 0.

**Memory files loaded every session** (in `~/.claude/projects/-Users-benknight-Code-act-global-infrastructure/memory/`):
- `feedback_verify-names-and-places.md` — durable rule: verify names before system-of-record commit
- `project_oonchiumpa.md` — correct facts: Oonchiumpa, Mparntwe, Kristy Bloomfield + Tanya Turner, Aunty Bev + Uncle Terry, Fred Campbell, Atnarpa homestead on Loves Creek Station
- `feedback_force-a-trap-rhetoric.md` — the Ben-approved rhetorical pattern

## What was built this session

1. **AutoReason skill** at `.claude/skills/autoreason/` — adversarial writing loop (critic → author → synthesizer → 3 blind judges, Borda count, convergence on 2-round incumbent survival)

2. **Campaign brain** at `wiki/campaigns/`:
   - `README.md` — structure explainer
   - `STRATEGY.md` — 22-session operating rhythm across 3 weeks
   - `ALIGNMENT.md` — one-screen dashboard
   - `_shared/voice.md` — filter pointer (AI-signs + force-a-trap)
   - `_shared/contacts.md` — 16 named humans, seeded and verified
   - `_shared/orgs.md` — orgs + public statements + silences
   - `_shared/data-to-messaging.md` — signal → claim → frame → artefact pipeline
   - `_weekly-review-template.md` + first populated review at `_weekly-reviews/2026-04-16.md`
   - 4 campaign briefs: aesthetics-of-asymmetry, judges-on-country, contained-tour, minderoo-pitch

3. **Three claim files** at `wiki/narrative/civicgraph/`:
   - `claim-murri-watch-cancellation.md`
   - `claim-gerber-22-unnamed.md` (force-a-trap payload)
   - `claim-qld-detention-ratio.md` (155:1)
   - INDEX.md updated with deployment matrix

4. **Post 2 (silence post)** — AutoReason R2 winner at `wiki/output/narrative-drafts/2026-04-18-murri-watch-post-2-silence.md`. Ships Fri 18 Apr if minister still silent.

5. **Minderoo canonical cover** at `JusticeHub/output/proposals/minderoo-canonical-2026.md` — uses Murri Watch as live proof case.

6. **/support/murri-watch page** at `act-aesthetics-of-asymmetry/src/app/support/murri-watch/page.tsx` — consent-gated surface, EL v2 theme `murri-watch-support`.

## Major corrections made (across ~25 files)

All three repos swept for factual errors propagated from older pitch drafts:

- **Ntumba → Oonchiumpa** (organisation name)
- **Christine / Chrissy / Christine Tanya → Kristy Bloomfield + Tanya Turner** (two people, co-directors)
- **Added** Aunty Bev + Uncle Terry (elder authority), Fred Campbell (youth case worker)
- **Rows 5 and 6 collapsed → MMEIC** (Minjerribah Moorgumpin Elders-in-Council Aboriginal Corporation). "Minjerra Bastow Burke · NSW Mid North Coast" was wrong on both name and location.
- **Mountie Yarns → Mounty Aboriginal Youth & Community Services** (formally, Mounty retained as shorthand)
- **PICC CEO named:** Rachael Atkinson (spelling from "Rachal", verify)
- **Minderoo lead named:** Lucy Stronach
- **Alice Springs → Mparntwe (Alice Springs)** on external-facing mentions
- **Kirsty → Kristy** (KR spelling per canonical wiki article)

## Open decisions blocking the Minderoo envelope (1 May ship)

| # | Decision | Deadline |
|---|---|---|
| 1 | Confirm Kristy vs Kirsty spelling | 2026-04-17 |
| 2 | Confirm Rachael vs Rachal spelling | 2026-04-17 |
| 3 | Ten vs Nine (after MMEIC consolidation): name a tenth anchor OR sweep body text | 2026-04-20 |
| 4 | Tennant Creek: verify "William Junta" + org name | 2026-04-24 |
| 5 | Rows 6 (ACT), 7 (Tas), 8 (WA — Hailey's surname), 9 (SA) — name or ship as TBC | 2026-04-24 |
| 6 | Example 4 attribution flags: Portugal leg traveller + Doing Convening speaker (Kristy, Tanya, or both?) | 2026-04-24 |
| 7 | Mounty leader name | 2026-04-24 |

## Judges on Country focus (next session target)

Tuesday 21 April 2026 · Mparntwe (Alice Springs) · hosted by Oonchiumpa (Kristy Bloomfield + Tanya Turner) · 55 judges and magistrates attending

**Brief:** `wiki/campaigns/judges-on-country/brief.md`

**Outputs needed from trip:**
1. Raw capture (video, audio, stills) with consent envelopes per Empathy Ledger v2
2. Field notes within 24 hours of trip
3. 3 Brave Ones portraits (A5 prints) for Minderoo envelope — subjects pre-selected with Kristy + Tanya
4. JoC one-pager drafted by Fri 24 Apr with Kristy + Tanya sign-off before envelope dispatch
5. Claim file `claim-judges-on-country-alice-2026.md` in `wiki/narrative/justicehub/`
6. Claim file `claim-oonchiumpa-diversion-rate.md` (95% diversion rate) with source

**Prep work for Thursday/Friday (before travel Monday):**
- Capture kit: EL v2 capture tools, signed consent forms, battery packs, SD cards
- Consent protocol sign-off with Kristy + Tanya (call Thursday)
- 3 storyteller pre-selects confirmed with Kristy + Tanya
- Travel logistics final: flights, accommodation, transport to on-country site
- Background: read `wiki/projects/oonchiumpa.md` for Atnarpa/Loves Creek context

## Campaign state at session end

| Campaign | Next ship | Blocker |
|---|---|---|
| aesthetics-of-asymmetry | Post 2 Fri 18 Apr | Minister-named-the-22 gate |
| judges-on-country | On-country Tue 21 Apr | Kristy + Tanya consent sign-off |
| minderoo-pitch | Envelope ~1 May | 7 open decisions above |
| contained-tour | Adelaide scope end Apr | Nick leads; not yet scoped |

## What not to redo

- Post 2 — AutoReason R2 winner is ship-ready. Do not re-draft unless minister names the 22.
- Three civicgraph claim files — citable, don't rewrite.
- The campaigns brain scaffolding — use it, don't rebuild.
- Naming corrections — 25 files swept; verified zero live uses of Ntumba / Christine / Minjerra Bastow. Memory files will catch future drift.

## Files to NOT touch without explicit ask

- `JusticeHub/output/proposals/minderoo-three-circles-proposal.md` — still has `[attribution?]` markers awaiting Ben's call
- `JusticeHub/output/proposals/minderoo-executive-summary.md` — same
- Historical dated emails in `JusticeHub/output/emails/` — preserve as record

## Recommended first action next session

**Option A — JoC prep (recommended if Thursday/Friday):**
Call Kristy + Tanya. Finalise consent protocols. Confirm 3 pre-selects. Pack kit.

**Option B — Weekly review (Thursday):**
Copy `_weekly-review-template.md` to `_weekly-reviews/2026-04-17.md`. Run the 5 questions across all 4 campaigns. Update ALIGNMENT.md cells.

**Option C — Verify remaining anchors (Thursday afternoon):**
Walk through open decisions 3–7 above. Update `wiki/campaigns/_shared/orgs.md` + `contacts.md` + Minderoo spine docs.

---

*End of 2026-04-15 session. Work is saved (not committed — user controls commit timing). Memory files loaded for next session. /clear is safe.*

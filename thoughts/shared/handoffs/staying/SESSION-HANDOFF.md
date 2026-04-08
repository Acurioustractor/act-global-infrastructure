---
title: Session Handoff — Staying / Brave Ones / Edge Holds
date: 2026-04-08
status: Active — resume next session
---

# Session Handoff — Staying / The Brave Ones / The Edge Holds

> A long, generative session that produced: a finished blog + LinkedIn piece, a complete second-brain Karpathy upgrade to Tractorpedia, a GitHub + Vercel URL audit system, the Brave Ones portrait series concept, the Three Ripples + Ledger visual mockups, a verify-fix discipline skill + hooks + CLAUDE.md upgrades, and a complete first-pass design of a Minderoo-funded 3-year, 7-community, Spain-in-the-middle program called **Staying**.

## Where to start the next session

**Read this file first.** Then read `wiki/synthesis/the-edge-is-where-the-healing-is-justicehub-as-the-world-model-for-community-led.md` for the conceptual frame, and `wiki/projects/the-brave-ones.md` for the Studio piece.

The **single most important next move** is to write the full project page for **Staying** at `wiki/projects/staying.md` — the design is in this handoff and is mostly locked.

---

## What got built in this session (by artefact)

### Tractorpedia second-brain upgrade — DONE
- New folders: `wiki/synthesis/`, `wiki/sources/`, `wiki/output/` (with index.md in each)
- `wiki/log.md` — append-only timeline of every wiki operation
- `scripts/wiki-log.mjs` — both a CLI and an importable helper
- `scripts/wiki-save-synthesis.mjs` — the **compounding loop**, query → permanent synthesis article
- `scripts/wiki-verify-urls.mjs` — audits all 48 wiki project articles against Acurioustractor GitHub org + Benjamin Knight's Vercel team
- `scripts/wiki-build-viewer.mjs` — extended with `urlAudit` injection and the new infobox renderer (Website / Repo / Deploy badges + ⚠ knownIssue rows)
- `scripts/wiki-lint.mjs` — wired to log + writes reports to `wiki/output/lint-YYYY-MM-DD.md`
- `ecosystem.config.cjs` — new cron entry: `wiki-verify-urls` Mondays 9:05am AEST
- `.claude/skills/wiki/SKILL.md` — updated with second-brain folder layout, `/wiki synthesize`, `/wiki log`, save-back rules
- All scripts log to `wiki/log.md` automatically

### Verify-fix discipline — DONE
- `CLAUDE.md` — three new pinned sections at the top:
  - `## Debugging Discipline (read first)` — no claim without evidence, 2-strike rule, suspect environment first
  - `## Database & Environment` — Supabase instance verification, trailing newlines, 1000-row default
  - `## Data Model` — Services vs Projects vs Organisations, always scope by org_id
- `.claude/skills/verify-fix/SKILL.md` — full skill, ~5KB, with the evidence ladder, the 2-strike rule, the bad/good example, and the policy backstory
- `.claude/settings.json` — PostToolUse hook running `npx tsc --noEmit` after Edit/Write to .ts/.tsx/.mts files in apps/command-center or apps/website (truncated to 30 lines, JSON-validated)

### URL audit — DONE
- 18 live · 0 dead · 3 known-issue (act-studio build-failing, barkly-backbone build-failing, diagrama domain-down) · 27 no-URL
- justicehub.com.au confirmed wired in Vercel (verified 200) — `gh repo edit` updated
- All 4 broken-repo gh homepage URLs cleared
- Synthesis article saved at `wiki/synthesis/the-edge-is-where-the-healing-is-justicehub-as-the-world-model-for-community-led.md`

### Edge Holds blog + LinkedIn — DONE (in chat, not yet filed)
- **Title:** *The Edge Is Where the Healing Is*
- **Anchors:** Tyson Yunkaporta (Apalech / Wik / Nungar / Lost Mob) + Elinor Ostrom (Nobel 2009) + Jack Dorsey (*From Hierarchy to Intelligence*, 2026)
- **Proof points:** Bourke / Maranguka — Mparntwe / Oonchiumpa (MS story, identity restoration) — Spain / Diagrama
- **Three Ripples model:** The Edge → The World Model → The Capital Rails
- Both pieces ready to publish; needs Yunkaporta sense-check before going live
- **TODO next session:** save full blog + LinkedIn versions to `thoughts/writing/drafts/edge-holds-blog.md` and `.../edge-holds-linkedin.md`

### The Brave Ones — DONE (project filed)
- `wiki/projects/the-brave-ones.md` — full project sketch, ideation status
- Studio cluster, sits alongside CONTAINED
- Counter-mugshot photographic series, Brian Duffy / Bowie 1976 register
- Phase 0–4 cost plan, cultural protocol non-negotiables, seed cohort identified (Xavier, MS, CB, Jackqwann, A, M, L from Oonchiumpa)
- Three placeholder Gemini portraits at `wiki/output/brave-ones-placeholder-0[1-3].png`

### Three Ripples visual mockups — DONE
- `tools/three-ripples-poster.html` — clean modernist B&W version (uses placeholder #03)
- `tools/three-ripples-ledger.html` — **the better version**, ledger-page aesthetic with handwritten entries, foxing, tea stains, tipped-in photo, footnoted system layer
- `wiki/output/three-ripples-poster-mockup.png` — Gemini AI render of the poster
- `wiki/output/three-ripples-ledger-mockup.png` — Gemini AI render of the ledger page
- **The user's preferred direction is the LEDGER** — handwritten, accumulated, lived-in, system as marginalia. Artist references: Christian Boltanski, Sophie Calle, Edmund Clark, Theaster Gates, Anselm Kiefer, Judy Watson, Daniel Boyd, Vernon Ah Kee, Tony Albert, Brook Andrew

---

## STAYING — the program (this is the main thing)

### What it is
A 3-year program in which a small team rotates continuously through 7 Australian communities — one in each state — accompanying community-led youth justice work, photographing it, journaling it, and producing a bound book per young person at the end. The middle year is spent in Spain with Diagrama. After 3 years it culminates in a national exhibition, a published book, and the largest collection of community-led youth justice evidence ever assembled in this country.

**Funded entirely by Minderoo as catalytic capital. Their legacy.**

### Working name
**STAYING — Country & Council**
*A three-year accompaniment of community-led youth justice in seven places.*

The word "Staying" is the methodology. Every other youth justice program leaves. Staying is the move.

### Three movements

| Year | Name | Where | Cadence |
|---|---|---|---|
| **Year 1** | *Listen* | 7 Australian communities | 6 months heavy engagement + 6 months virtual |
| **Year 2** | *Compare* | Spain — Diagrama immersion + community delegations | Year-long, with multiple Aussie elder/leader trips to Murcia |
| **Year 3** | *Tell* | Back to the 7 communities + national exhibition | 6 months heavy + 6 months production & launch |

### Team
**2 FTE + 1 support person** — three people. Lean. Doesn't overwhelm a community.

### Cadence
- **6 months on** (heavy engagement) — ~5-day visits per community in rotation, in person
- **6 months off** (virtual support) — back home in Brisbane, processing, photographing, building journals, prepping next round
- **One community close to Brisbane** for cheap, frequent low-friction visits and shorter feedback loop

### The journal (the centre artefact)
- **Bound book per young person** — A5 size, hand-stitched, ~80–120 pages
- **Three deliveries:** Year 1 first chapter → Year 2 second chapter → Year 3 complete bound volume
- **Contents:** B&W portraits in Brave Ones discipline, the young person's own handwriting, voice transcripts from Empathy Ledger, letters from Aunties/uncles, ledger entries of who showed up and when, drawings, marks, place
- **Owned by the young person.** Not ACT, not Minderoo. OCAP/CARE protocols at the data layer through Empathy Ledger. Right of withdrawal at any point.
- One archival copy (with explicit consent only) held in the gallery as part of the touring exhibition

### Year 3 exhibition
- (a) A national gallery tour — opens at NGA / MCA / NGV, tours all 7 communities afterward — **CONFIRMED by the user**
- Open question for next session: communities-first (open in the 7 places before the funders see it in the city) or institution-first?

### Budget envelope (rough, ~$6M over 3 years)

| Line | Year 1 (AU) | Year 2 (Spain) | Year 3 (AU + exhibition) | Total |
|---|---|---|---|---|
| Core team (2 FTE + 1 support) | $360K | $400K | $380K | $1.14M |
| AU travel + accommodation (6 months on) | $170K | — | $180K | $350K |
| Spain — team (year-long, 3 ppl, accom, fixer, language) | — | $420K | — | $420K |
| Spain — community delegations (~14 people, 3 trips) | — | $280K | — | $280K |
| Diagrama partnership fee + access | — | $80K | — | $80K |
| Community partnership fees (7 × $50K/yr) | $350K | $350K | $350K | $1.05M |
| Young person stipends + journal binding | $80K | $90K | $130K | $300K |
| Equipment, archive, production | $70K | $30K | $30K | $130K |
| Data + tech infra (JusticeHub / ALMA / EL contributions) | $80K | $60K | $60K | $200K |
| Year 3 exhibition + book + tour | — | $40K | $420K | $460K |
| Comms, social, content | $70K | $90K | $110K | $270K |
| Cultural review + Elder governance fees | $100K | $110K | $100K | $310K |
| Operations + admin (10%) | $128K | $195K | $176K | $499K |
| Contingency (10%) | $128K | $215K | $176K | $519K |
| **TOTAL** | **$1.54M** | **$2.36M** | **$2.11M** | **~$6.0M** |

For context: detaining one child for 3 years costs $3.9M. This program runs for the cost of detaining ~1.5 children, reaches ~50 young people across 7 communities, plus a Spain delegation, plus the largest evidence collection ever assembled in Australia.

### The 7 communities — first-pass shortlist

| State | Likely candidate | Status |
|---|---|---|
| **NT** | Oonchiumpa (Mparntwe) — Aunty Bev, Tanya Turner, Kristy Bloomfield | Existing partnership, very strong |
| **QLD (north)** | PICC (Palm Island) — Richard Cassidy and the Bwgcolman families | Existing partnership |
| **QLD (Brisbane)** | EPIC Pathways — Rhian Miller — *or another candidate near Brisbane* | Pipeline, needs confirmation |
| **NSW** | Maranguka (Bourke Tribal Council) | Need to approach |
| **WA** | Olabud Doogethu (Halls Creek) | Need to approach |
| **TAS** | Prevention Not Detention (Loic Fery's coalition) | Pipeline contact |
| **VIC** | ??? | **OPEN — need to find** |
| **SA** | ??? | **OPEN — need to find** |

**Open question for next session:** VIC + SA candidates. Possible asks: Just Reinvest networks, Aboriginal Legal Service VIC, Maggolee, Ngarrindjeri leadership in SA.

### The 30 → 7 filter
**Open question for next session.** Working hypothesis: 6-month discovery phase before Year 1, quiet outreach through ACT's existing network (no public application), communities self-select by what they ask for (capital, comms, cultural authority partnership > service delivery).

### Why Spain Year 2 is the masterstroke
1. Puts Aboriginal Elders and tribal council members on planes to Murcia — Aunty Bev, Tanya, Kristy, Brodie, Rhian, Loic — sitting in a Spanish youth centre talking with the educators and the young people who came through. **That conversation has never happened in this country's history.**
2. Turns Diagrama from an abstract precedent into a relationship — ACT already has the door (Olga meeting); the year cements it.
3. Answers the "but does it scale" question with three decades of evidence and a passport stamp.
4. Gives the program a story arc — Listen / Compare / Tell. Three acts. Funders, audiences, books all need three acts.
5. Makes Minderoo's gift internationally legible — *"The Minderoo Australian Justice Cohort spent a year in Spain."*

---

## OPEN QUESTIONS FOR NEXT SESSION

In priority order — pick these up first:

### Q11 — Spain timing
Spain = Year 2 (months 13–24)? Or wraps around (short trips Y1, deep Y2, return trips Y3)? **Working assumption: Y2 in the middle, with possible short scout trip in Y1.**

### Q12 — Communities (the gaps)
- **VIC:** who?
- **SA:** who?
- **Brisbane:** confirm EPIC Pathways or propose alternative
- All other 5 are likely-locked but need actual conversations to confirm

### Q13 — The 30 → 7 filter mechanism
Discovery phase + self-select-by-ask, or different?

### Q14 — Exhibition order
Communities-first (open in the 7 places before the funders see it in the city) or institution-first (NGA/MCA/NGV first, then tour communities)?

### Q15 — When to actually approach Minderoo
Lucy Stronach is at score 79 in the JusticeHub pipeline. Is the Staying pitch ready as the first contact, or do we want to warm her up with the blog post first?

---

## NEXT-SESSION CHECKLIST (concrete, ordered)

1. **Read this handoff file end to end** — and the synthesis article + the Brave Ones project page
2. **Write `wiki/projects/staying.md`** — full project page using everything in this handoff
3. **Save the blog + LinkedIn drafts** to `thoughts/writing/drafts/edge-holds-blog.md` and `thoughts/writing/drafts/edge-holds-linkedin.md` (the full text is in the prior conversation but should be re-pasted into files)
4. **Cross-link** Staying ↔ Brave Ones ↔ JusticeHub ↔ Diagrama ↔ Empathy Ledger in their respective wiki articles
5. **Run the wiki-build-viewer regen** so Staying and the synthesis article appear in `tools/act-wikipedia.html`
6. **Answer Q11–Q15** with the user — these are the unblockers
7. **Draft the Minderoo deck** (10 slides max) once Q11–Q15 are answered
8. **Photograph commission brief** for the real Brave Ones placeholder portrait (Option B from prior plan) — to replace the AI-generated stand-ins
9. **Email Yunkaporta** with the blog draft + framing — courteous note asking if it lands for him before publication

---

## WHAT NOT TO LOSE FROM THIS SESSION

The user has had several important framing breakthroughs that the next session must inherit:

1. **The architecture is already there.** The pattern is older than fintech — Yunkaporta's *Sand Talk*, Ostrom's commons work, Diagrama's three decades. JusticeHub is the *world model* that makes the pattern legible. Tractorpedia is the second brain that holds the pattern. The Brave Ones is the human face of it. CONTAINED is the room you walk into. **Staying is the program that produces all of it.**

2. **The verify-fix discipline.** Don't claim a bug is fixed without running the actual code path. The skill, the CLAUDE.md sections, and the hook are wired. They only work if the next session honours them.

3. **The aesthetic decision.** The Brave Ones / Three Ripples visual register is the **ledger page**, not the diagram. Christian Boltanski / Sophie Calle / Edmund Clark / Theaster Gates / Judy Watson / Daniel Boyd / Vernon Ah Kee. Hand-made, lived-in, accumulated over time, system-as-marginalia, the young person at the centre.

4. **The "Country & Council" subtitle.** This is the methodology. Country is the place and the people on it. Council is the form of community-led decision-making. Both structures are non-negotiable.

5. **The journal is the centre artefact.** Bound book per young person, three chapters across three years, owned by them. If the program produces nothing else, the journals are the proof.

6. **The Minderoo number is ~$6M for 3 years.** Smaller than detaining 2 children. Reach: 50 young people, 7 communities, plus international delegation, plus national exhibition.

7. **The user is tired.** It is now early morning. Do not pile on more questions in the next session — start by reading this handoff, then ask only Q11–Q15 in a single batch.

---

## FILES CREATED OR MODIFIED THIS SESSION

### New
- `wiki/synthesis/index.md`
- `wiki/sources/index.md`
- `wiki/output/index.md`
- `wiki/log.md`
- `wiki/synthesis/the-edge-is-where-the-healing-is-justicehub-as-the-world-model-for-community-led.md`
- `wiki/projects/the-brave-ones.md`
- `scripts/wiki-log.mjs`
- `scripts/wiki-save-synthesis.mjs`
- `scripts/wiki-verify-urls.mjs`
- `tools/three-ripples-poster.html`
- `tools/three-ripples-ledger.html`
- `wiki/output/brave-ones-placeholder-01.png`
- `wiki/output/brave-ones-placeholder-02.png`
- `wiki/output/brave-ones-placeholder-03-centre.png`
- `wiki/output/three-ripples-poster-mockup.png`
- `wiki/output/three-ripples-ledger-mockup.png`
- `wiki/decisions/url-audit-2026-04-07.md`
- `wiki/decisions/url-audit-latest.json`
- `.claude/skills/verify-fix/SKILL.md`
- `.claude/settings.json`
- `thoughts/shared/handoffs/staying/SESSION-HANDOFF.md` (this file)

### Modified
- `CLAUDE.md` — three new pinned sections at top
- `.claude/skills/wiki/SKILL.md` — second-brain pattern, synthesize command, log convention
- `scripts/wiki-build-viewer.mjs` — urlAudit injection + infobox renderer
- `scripts/wiki-lint.mjs` — log integration + output path
- `ecosystem.config.cjs` — wiki-verify-urls cron entry
- `wiki/projects/justicehub.md` — homepage + URL corrections (via gh repo edit, not the file directly)

### Cleared (gh repo homepage edits)
- justicehub-platform → https://www.justicehub.com.au
- barkly-research-platform → empty (build failing)
- diagrama-australia → empty (DNS down)
- act-regenerative-studio → empty (build failing)

---

## RESUME INSTRUCTION FOR NEXT SESSION

> Read `thoughts/shared/handoffs/staying/SESSION-HANDOFF.md` first. Then answer Q11–Q15 with me, then write `wiki/projects/staying.md` using everything in the handoff. Don't restart the architecture — it's locked. The next session is execution, not re-thinking.

The thing has a name now. **Staying.** It exists.

Tomorrow we make it real on the page.

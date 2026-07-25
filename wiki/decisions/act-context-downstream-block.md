---
title: ACT context — downstream projection
status: source of truth for the CLAUDE.md block in every ACT codebase
sync: scripts/sync-act-context.mjs reads THIS file verbatim
---

# ACT context — downstream projection

This file **is** the `## ACT Context` block that appears in every ACT codebase's
`CLAUDE.md`. `scripts/sync-act-context.mjs` reads everything below the `---` divider
verbatim, wraps it in the BEGIN/END markers with a fresh `Last synced` date, and
writes it to each target repo.

Edit this file to change what every ACT session sees. Nothing else propagates.

**This is a projection, not the canon.** The canon is
[`act-core-facts.md`](act-core-facts.md), which is longer and holds detail that
deliberately does not ship downstream. When the canon changes, update this file too.
The sync warns when the canon has a more recent commit than this projection, but it
cannot merge them for you.

**Keep it short.** It costs every ACT session, in every repo, on every turn. The body
below is ~52 lines and is the largest single always-on cost in most of these repos.

---

### Entities (as of 2026-07-19)
- **A Curious Tractor Pty Ltd** (ACN 697 347 676; **ABN 36 697 347 676, issued with GST 2026-06-01**). Registered ASIC 2026-04-24. Primary trading entity from 1 July 2026; **trades as "Goods on Country"** for the Goods commercial arm (contracting, product sales, R&D claimant). Shareholders: Knight Family Trust 50 + Marchesi Family Trust 50. Directors: Ben Knight + Nicholas Marchesi. Bank: NAB. Accountant: Standard Ledger.
- **Nicholas Marchesi sole trader** (ABN 21 591 780 066). Currently trading; hard cutover to Pty 30 June 2026.
- **The Butterfly Movement Ltd** (ACN 155 132 684; ABN 22 155 132 684, verified ABR 2026-06-02). **The Goods charity + DGR home: endorsed Item 1 DGR + PBI since 17 Jan 2012**, ACNC-registered since Dec 2012 — can auspice/receipt NOW. "TABOO Foundation" is a business name on the same ACN. Stewardship handover 26 Jun 2026; Indigenous-led board being installed. DGR runs ONLY through Butterfly — never ACT Pty or AKT.
- **A Kind Tractor Ltd** (ACN 669 029 341, ABN 73 669 029 341). Charitable CLG, ACNC-registered, **NOT DGR**, dormant. **NOT the Goods vehicle** — that is Butterfly.
- **Harvest entity** + **Farm entity**. Being designed pending Standard Ledger advice. **Interim operating decision (2026-07-19): Harvest trades through Nicholas Marchesi's sole trader and its existing Xero / ACT Everyday account until the whole ACT cutover moves to A Curious Tractor Pty Ltd.** Track all Harvest activity as ACT-HV; do not mix it into the future Pty tenant early.

**Do NOT** use "ACT Foundation" or "ACT Ventures" as legal entity names. They are conceptual labels in older docs, not real entities.

### Why this structure

Three trading entities, one charity, one winding-down sole trader. The point is not bureaucracy. Each project earns the right to grow on its own revenue. The Harvest's money funds The Harvest's growth. Farm money funds Farm growth. A Curious Tractor Pty Ltd is the holding muscle that carries the founder relationship and the cross-cutting work.

If we ran a single Pty Ltd with three project codes, the financial story would mash. Founders would have no clean way to see whether each project pays its way. The structure costs more in compliance and saves more in legibility. Legibility is what makes the soul able to read its own body.

For how money flows through these entities into the four lanes (To Us, To Down, To Grow, To Others), see `act-global-infrastructure/wiki/concepts/four-lanes.md`.

### Cutover (30 June 2026)
- **Rule 1.** Pre-cutover invoices stay with sole trader (no re-issue, no inter-entity loan). Novation letters say "existing invoices pay as normal; new tranches from 1 July to Pty".
- **Rule 2.** Honest-delay fallback: if Pty not invoice-ready 1 July, sole trader continues trading until Pty is genuinely live (no retroactive invoicing, no silent mis-attribution).
- **Rule 3.** Rotary INV-0222 ($82.5K, 380d) is a recovery problem, not a novation one.
- **Rule 4.** Shareholders Agreement is Week 1-2 (drafted by Standard Ledger's lawyer), not Week 4-5.

### Active receivables on sole trader (~$507K total)
Snow $132K · Centrecorp DRAFT $84.7K · Rotary $82.5K · PICC $113.3K · Regional Arts $33K · Just Reinvest $27.5K · BG Fit $15.4K · Aleisha Keating $11.7K · Homeland $5K · SMART Recovery $2.2K

### Naming + voice
- "Australian Living Map of Alternatives" (never bare "ALMA")
- "Listen · Curiosity · Action · Art" (never bare "LCAA")
- Indigenous place names always; colonial in brackets
- No em-dashes in any ACT-facing writing
- For ANY public-facing copy, load `act-global-infrastructure/.claude/skills/act-brand-alignment/references/writing-voice.md`

### Cross-repo sources
- **Entity facts (source-of-truth)**: `act-global-infrastructure/wiki/decisions/act-core-facts.md`
- **This block's source**: `act-global-infrastructure/wiki/decisions/act-context-downstream-block.md`
- **Brand alignment map (READ BEFORE DESIGNING ANYTHING)**: `act-global-infrastructure/wiki/decisions/act-brand-alignment-map.md`
- **Parent brand identity**: `act-global-infrastructure/.claude/skills/act-brand-alignment/references/brand-core.md`
- **Parent writing voice (Curtis method, AI-tells blocklist)**: `act-global-infrastructure/.claude/skills/act-brand-alignment/references/writing-voice.md`
- **Migration plan**: `act-global-infrastructure/thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`
- **Alignment Loop syntheses (weekly drift signal)**: `act-global-infrastructure/wiki/synthesis/`
- **CEO daily cockpit**: `act-global-infrastructure/wiki/cockpit/today.md` (refreshed daily 07:00 Brisbane)
- **Project codes (72 codes, all canonical)**: `act-global-infrastructure/config/project-codes.json`
- **Funder ledger**: `act-global-infrastructure/wiki/narrative/funders.json`

### Visual family (before designing anything in this repo)
This repo's cluster: see brand alignment map. The map says:
- **Editorial Warmth** parent: act-regenerative-studio (Fraunces + forest green + warm white)
- **Editorial Warmth** subfamily: JusticeHub (STAY journal heritage), empathy-ledger-v2 (multi-tenant earth-tone)
- **Civic Bauhaus**: CivicGraph / grantscope (Satoshi + black + signal red, intentional break)
- **Unscoped (need decision)**: goods, act-farm, The Harvest Website

**Rule**: read the map before designing. Update the map BEFORE shipping a new design. Never re-decide what's already decided.

# World Tour Business / Tax / R&D Tracker — Provenance

**Built:** 2026-05-31 · **Surface:** Notion (acurioustractor workspace) · **By:** Claude Code session

## What was built

A searchable, relational tax/R&D evidence system inside the (previously blank) Notion page
**"Empathy Ledger Business Tax and R&D Overview"** (`371ebcf981cf8020b780c3c25616a44f`),
a child of the **Empathy Ledger World Tour Operating System** page (`33febcf981cf8185b16dc3908cbffbeb`).

Four linked databases (parent = the Business Tax page), wired to each other and to the existing **Tour Stops** DB:

| DB | Notion DB id | Data source | Seeded |
| --- | --- | --- | --- |
| 🗓️ Trip Diary (Days) | `49fbe4611af944cd93aaa83d9e7ffab4` | `a9b8bab8-0420-438b-933f-c407d3e0a688` | **42 day rows** (27 Jun–7 Aug 2026) |
| 📎 Evidence Register | `92df0ec719fa4db29b771cd7644198aa` | `b9769f67-0657-49e0-ba90-5818cb4e9581` | empty (ready) |
| 🧪 R&D Experiment Log | `893b3a35386a46b0b46b2a1b1042c5fc` | `90eca41e-ce66-4c9b-a23f-f74e960edba7` | **8 experiment rows** |
| 💸 Expense Ledger | `6f4d111068914e36ba1659f791544283` | `fa580411-e406-48bb-8fe9-be0bca2b27c7` | empty (ready); `Claimable (AUD) = Amount (AUD) × Business-use % ÷ 100` |

Page body: golden rule, overseas-finding critical path, entity map, 5 buckets (CT-RD / CT-BIZ / KP-BIZ /
PRIVATE / MIXED), no-double-dip controls, KP minimal-private posture, nightly routine, adviser questions, disclaimer.

## Decisions (user, 2026-05-31)

1. **Build scope:** full build + seed real structure (no fabricated dollars).
2. **Knight Photography:** minimal / mostly-private posture (small clearly-commercial asset library; KP→CT arm's-length licensing).
3. **Overseas R&D:** build to support an AusIndustry Overseas Finding (due 30 Jun 2027).

## Source / confidence ledger

**VERIFIED** (from ACT canonical records):
- A Curious Tractor Pty Ltd = company, ACN 697 347 676, registered 24 Apr 2026 → eligible R&D entity. (memory `project_act_entity_structure`, `wiki/decisions/act-core-facts.md`)
- Knight Photography = partnership (Ben + Carla) → NOT an R&D entity. (user-stated, consistent with the company-only eligibility rule)
- R&DTI Path C: FY24-25 forfeited; claim FY25-26 (lodge by 30 Apr 2027) + FY26-27 via the Pty. (memory `project_rd_tax_incentive`)
- Trip dates 27 Jun–7 Aug 2026, itinerary, YOPE lock 16-22 Jul. (Notion World Tour OS page, "Trip Spine" synthesis 29 May 2026)
- FY boundary: 27-30 Jun = FY25-26; 1 Jul onward = FY26-27. (Australian FY = Jul-Jun)

**INFERRED** (from repo scouts 2026-05-31 — real code, but R&D *eligibility* is an adviser judgement):
- The 8 R&D experiments are grounded in actual Empathy Ledger v2 / JusticeHub work (PRISM v2.0, OCAP consent-as-code, Guardian gate, bidirectional Travel Diary, offline consent, consent-gated pgvector RLS, ALMA ingestion, cross-platform syndication). Scout handoffs: `empathy-ledger-v2.md`, `justicehub.md`, `the-harvest.md` (same dir).
- The Harvest assessed NOT R&D (content/community site) → excluded from the R&D log. Photography excluded (arts/humanities + partnership).

**UNVERIFIED** (general tax/R&D principles from model knowledge — adviser MUST confirm before lodgement):
- Overseas Finding required for overseas R&D; 4 conditions (significant scientific link to a registered Australian core activity; cannot be conducted in Australia; overseas spend < related Australian spend; lodged before end of the income year).
- $20,000 minimum R&D expenditure; RDTI registration due 10 months after income-year end.
- Statutory exclusion of arts/humanities/market research from core R&D activities.
- These are NOT tax advice. Standard Ledger + the R&D adviser confirm everything.

## Gaps / next steps (not done in this session)

- **Diary↔Tour Stops relation not populated** — days carry a `Country` select (apportionment works on that), but the per-day `Stop` relation is empty. Quick follow-up: link each day to its Tour Stop page.
- **R&D experiments not yet linked** to Field Sites / Days / Evidence (relations exist, rows unlinked).
- **No expense rows** — by design; populate from real receipts on the trip.
- **Adviser actions:** book Standard Ledger + R&D adviser pre-departure; scope the Overseas Finding application; confirm the 8 adviser questions on the page.

## Reproducibility

Notion MCP (`mcp__claude_ai_Notion__*`). Databases created via `notion-create-database` (SQL DDL), rows via
`notion-create-pages` (data_source_id parent), page body via `notion-update-page` insert_content. All ids above.
Relations created in dependency order: Diary → Evidence → R&D → Expense (each only relates to already-created targets +
the pre-existing Tour Stops `4641b250-66ff-4369-906c-cb9418949b42`).

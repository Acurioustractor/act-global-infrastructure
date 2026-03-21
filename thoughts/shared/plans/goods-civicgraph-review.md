# Goods CivicGraph Workspace — Review & Improvement Recommendations

**Reviewed:** 2026-03-13
**Codex output:** `/goods-workspace` route + `goods-workspace-data.ts` (2,612 lines) + export/push APIs

---

## What Codex Built (Impressive)

Codex delivered the full workspace spec almost exactly as designed:

### Built and Working
- `/goods-workspace` page (authenticated, server-rendered)
- **5 panels** implemented: Thesis, Buyer Pipeline, Capital Stack, Community Need + Proof, Delivery + Partner Graph
- **4 search/ranking modes**: Need-led, Buyer-led, Capital-led, Partner-led
- **3 scoring systems**: Buyer plausibility, Capital fit, Need + leverage — all with plain-English reasons
- **Community-first navigation**: Select a community, see procurement picture, partners, and buyers ranked around it
- **NT Remote Community Sweep**: Official NT community coverage audit showing gaps (postcode, buyer, service mapping)
- **Lifecycle + Dump Pressure panel**: Asset age tracking, stale counts, embodied plastic, landfill evidence
- **Outreach exports**: Notion-ready, CSV, JSON CRM payload
- **CRM push endpoint**: Pushes targets to Goods GHL via `/api/goods-workspace/push`
- **One-target smoke test**: Push a single target to verify before batch
- **Tracked identity system**: Multiple outbound identities (commercial vs philanthropic) with per-target-type recommendations
- **Bauhaus design system**: Consistent with CivicGraph visual language

### Seeded Data (6 communities, 8 buyers, 12 capital, 8 partners)
**Communities:** Palm Island, Tennant Creek, Utopia Homelands, Maningrida, Kalgoorlie, Groote Eylandt
**Buyers:** Centrebuild, Centrecorp Foundation, Outback Stores, ALPA, Miwatj, Anyinginyi, Tangentyere, West Arnhem, QIC
**Capital:** Snow, FRRR, VFFF, SEFA, SEDI, Minderoo, Rio Tinto, Fortescue, Centrecorp Foundation, General Gumala, Central Australian Trust, Groote Eylandt Trust
**Partners:** Oonchiumpa, Orange Sky, Miwatj, Anyinginyi, Bawinanga, Tangentyere, West Arnhem, ALPA

---

## Gaps & Improvements

### HIGH PRIORITY — Missing from email reality

These are live active opportunities from the email research that Codex doesn't know about:

| Missing | Type | Why It Matters |
|---------|------|---------------|
| **QBE Catalysing Impact** | Capital (catalytic) | **Shortlisted right now** — $210k catalytic grant that unlocks Snow impact investment. This is the single most time-sensitive opportunity. |
| **REAL Innovation Fund** (DEWR) | Capital (grant) | **EOI submitted 2 Mar** — $1.2M over 4 years. The production facility pathway with Oonchiumpa. |
| **Envirobank** | Partner (supply chain) | Indigenous-owned recycled HDPE supplier — meeting pending. Critical for circular economy story. |
| **Our Community Shed** | Partner (production) | Shredding + moulding unit partnership, quotes sent 25 Feb. |
| **Palm Island Community Company (PICC)** | Partner (delivery) | REAL Innovation Fund consortium partner. Narelle Gleeson, Rachel Atkinson. |
| **StreetSmart Australia** | Capital (grant) | Repeat grant awarded Aug 2025, acquittal due. |
| **FRRR/BTF intro to FCF Services** | Partner | Irene Stanley connection, Witta painting project collab. |

**Recommendation:** Add these to the seed data in `goods-workspace-data.ts`. The capital seeds especially need QBE Catalysing Impact and REAL Innovation Fund — these are the two biggest active bets.

### MEDIUM PRIORITY — Relationship status mismatches

The workspace seed data has generic `relationshipStatus` values that don't match the actual email-verified status:

| Entity | Seed Status | Actual Status (from emails) |
|--------|------------|---------------------------|
| Centrebuild/Centrecorp | `active` | Active but complex — board declined v1 retrospective, excited about v2 Stretch Beds |
| Snow Foundation | `active` (capital) | Active — $200k proposal under internal review, impact investment contingent on QBE |
| Miwatj Health | `warm` | Warm — call held Nov 2025, follow up needed |
| Anyinginyi Health | `warm` | Warm — Tony Miles requested washing machine specs 9 Feb |
| QIC | `warm` (buyer) | Warm — re-engaged Dec 2025, Cat Sullivan meeting set |

**Recommendation:** Update `nextAction` fields to reflect the actual latest email state.

### MEDIUM PRIORITY — Tennant Creek v1 unfunded beds

The 200 unfunded v1 beds (~$36k) are a critical cashflow gap that exhausted ACT's reserves. This needs to appear in the workspace as a distinct "debt/recovery" item, not just a community demand signal. It's blocking R&D on next products.

**Recommendation:** Add a "Cash recovery" or "Outstanding commitments" section to the thesis panel showing this.

### MEDIUM PRIORITY — Governor General / Mutitjulu

Not found in emails — likely a verbal/in-person conversation. Ben needs to provide context. If this is a showcase opportunity (e.g. beds at Mutitjulu during a GG visit), it should be added as a high-visibility buyer/PR opportunity.

### LOW PRIORITY — Autoresearch benchmark

The plan calls for 20+ Goods-specific benchmark scenarios. These aren't visible in the codebase yet. This is future work but important for scoring quality.

### LOW PRIORITY — Cross-repo Goods data sync

The workspace reads from `expanded_assets_final.csv` in the Goods repo and the COMPENDIUM doc. The actual Goods on Country Supabase (`cwsyhpiuepvdjtxaozwf`) has live telemetry data that could enrich the lifecycle panel with real wash counts, asset health signals, etc. Currently the lifecycle data is computed from the CSV — good enough for now but the live DB would be better.

---

## Integration with ACT Infrastructure Pipeline

### What we should do from ACT infra side:

1. **Seed `relationship_pipeline` + `org_action_items`** in ACT Supabase with the 12 opportunities and 11 actions from the pipeline plan — this gives the command center and Telegram bot visibility into Goods opportunities

2. **Update GHL Goods pipeline** with the 12 opportunities — this is the CRM that Nic uses day-to-day

3. **Create Notion pipeline page** — simple view of opportunities for board-level visibility

4. **Do NOT duplicate what CivicGraph does** — CivicGraph handles buyer discovery, scoring, and outreach. ACT infra handles relationship tracking, action items, and CRM management. They complement, not compete.

### Data flow:
```
CivicGraph (GrantScope)              ACT Infrastructure
─────────────────────                ──────────────────
Discovers new buyers/capital    →    Seeds into GHL + relationship_pipeline
Scores & ranks targets          →    Informs priority of action items
Exports to Notion/CSV           →    Feeds Notion pipeline view
Pushes to GHL via API           →    GHL is shared source of truth

                                     Tracks relationship status
                                     Manages action items + due dates
                                     Telegram bot reminders
                                     Command center dashboard
```

---

## Summary

**Codex did excellent work.** The workspace is architecturally sound, visually strong, and covers ~85% of the plan. The main gaps are:

1. **Add the 7 missing active opportunities** to seed data (especially QBE + REAL Innovation Fund)
2. **Update relationship statuses** to match email-verified reality
3. **Add the $36k unfunded beds** as a visible commitment/recovery item
4. **Clarify Mutitjulu/GG** opportunity when Ben provides context

Want me to start seeding the ACT infrastructure data (pipeline + actions + GHL) now?

---
title: Project tagging story — incoming · outgoing · pipeline · contacts
status: briefing
date: 2026-05-21
audience: Ben
purpose: One-page picture of what's tagged, what's not, why a few buckets are misleading, and concrete actions to clean up.
---

# The 4-column tagging matrix

For every ACT project, four columns should add up:

```
┌────────────┬──────────┬──────────┬───────────┬──────────┐
│  Project   │ Incoming │ Outgoing │ Pipeline  │ Contacts │
│  (ACT-XX)  │ (invoiced│ (spent or│ (potential│ (people  │
│            │ revenue) │ billed)  │ revenue)  │ + orgs)  │
└────────────┴──────────┴──────────┴───────────┴──────────┘
```

Today three of the four are working. **Contacts is broken** (uses legacy slugs). Let me walk through each.

---

# 1) INCOMING — strong (99.2% tagged)

ACCREC invoices to ACT customers/funders, tagged with `project_code`. 124 of 125 rows tagged. **$2.8M lifetime, 16 projects with revenue.**

| Project | Invoices | $ Total | Top funder |
|---|---:|---:|---|
| ACT-GD (Goods) | 29 | $1,458,311 | Centrecorp · Snow · VFFF · Rotary |
| ACT-PI (Palm Island) | 7 | $533,500 | PICC |
| ACT-HV (Healing Vehicle) | 9 | $187,080 | Regional Arts Australia |
| ACT-SM (SMART Recovery) | 8 | $158,700 | SMART Recovery Australia |
| ACT-JH (JusticeHub) | 12 | $147,555 | Just Reinvest + Homeland School |
| ACT-OO (Oonchiumpa) | 4 | $103,100 | Ingkerreke |
| ACT-WJ (Wilya Janta) | 3 | $82,500 | Wilya Janta |

**Action: none.** This column is clean. Going forward, every new ACCREC invoice should be tagged via Xero tracking dimensions before it's sent.

---

# 2) OUTGOING — strong on coverage (95.8% / 99.9%), broken on **ACT-IN bucket**

ACCPAY bills + bank SPEND transactions, tagged with `project_code`. ACT accounts only (NAB Visa + ACT Everyday).

**Problem:** ACT-IN is the biggest spend pool ($792K) but it isn't a real project — it's a misclassification bucket:

```
ACT-IN dissection ($992K total, all sources):
  $787K · 106 rows · NULL contact_name · source=transfer_default   ← internal transfers (NOT real spend)
  $159K · 645 rows · Qantas/Virgin/Uber/Booking/Avis              ← cross-project travel
  $ 17K · 217 rows · OpenAI/Claude/Notion/Webflow/Mighty/Anthropic ← SaaS infra → should be ACT-CORE
  $ 30K · 743 rows · misc                                          ← long tail
```

**$787K of "ACT-IN spend" is internal transfers** — money moving between ACT accounts, NOT money leaving ACT. These should be excluded from project-cost totals entirely. The reason they're there: when Xero imports a transfer (no contact_name), the `transfer_default` tagger assigns ACT-IN as a fallback.

**$159K of travel** should be allocated to the project of the trip (Qantas to Palm Island → ACT-PI; Uber to Mounty Yarns → ACT-MY). Where the trip is generic infrastructure/Ben travel, it should go to ACT-CORE.

**$17K of SaaS** is org infrastructure → ACT-CORE.

### Fix in 3 steps

1. **Exclude transfers from project spend** — add a filter `WHERE NOT (contact_name IS NULL AND project_code_source = 'transfer_default')` to the project-page expense aggregation. Already partially done in the `mv_project_quarter_position` view via the two-account rule but doesn't drop NULL-contact transfers. Quick SQL fix.
2. **Reclassify SaaS bucket → ACT-CORE** — one-shot UPDATE that maps known SaaS vendors from ACT-IN to ACT-CORE.
3. **Travel reallocation** — needs per-row judgment (Was that Qantas flight to PICC or for Goods kitchen recce?). 645 rows ~= an afternoon in `/finance/transactions`.

### Top 10 outgoing (after fix scenarios)

| Project | Bills | Bank txns | $ Outgoing |
|---|---:|---:|---:|
| ACT-IN | 1,020 | 1,584 | $792,130 ← **mostly noise, see above** |
| ACT-GD | 258 | 162 | $759,710 |
| ACT-CORE | 46 | 340 | $278,429 |
| ACT-FM | 124 | 57 | $222,547 |
| ACT-HV | 118 | 122 | $181,878 |
| ACT-CE | 10 | 1 | $152,508 |
| ACT-OO | 9 | 28 | $128,702 |
| ACT-PS | 11 | 2 | $89,139 |
| ACT-PI | 11 | 27 | $43,454 |
| ACT-UA | 134 | 56 | $32,562 |

---

# 3) PIPELINE — works for top projects, has 11 legacy codes + double-tagging

`grant_opportunities.aligned_projects[]` links opportunities to project codes. Today:

- **311 opportunities linked** to a project (4%)
- **7,546 unlinked** (96% — mostly noise from public grant scans like GrantConnect, leave them alone)

Of the 311 linked:

**Double-tagging problem:** 313 opportunities are tagged BOTH `goods` AND `ACT-GD` — same opps in both. This is legacy → canonical migration that didn't clean up the old tag. Same with `oonchiumpa-house` (1) overlapping ACT-OO (17).

**11 non-canonical codes** in active use:
```
at-napa-enterprise · at-napa-operations · employment-training
enterprise-setup · goods · on-country-programs · oonchiumpa-house
plastics-recycling · screen-printing · shipping-container · youth-justice-diversion
```

**Suspicious canonical codes** (verify these are real projects, not typos):
```
ACT-AI (8 opps)  · ACT-CC (2)  · ACT-CG (1)  · ACT-CM (5)  · ACT-CS (4)
ACT-CT (4)       · ACT-DD (1)  · ACT-EFI (5) · ACT-ER (1)  · ACT-FA (2)
ACT-FN (6)       · ACT-FO (3)  · ACT-FP (1)  · ACT-GCC (1) · ACT-GOODS (1)
ACT-JC (2)       · ACT-MN (2)  · ACT-MR (2)  · ACT-OE (1)  · ACT-RA (6)
ACT-SE (2)       · ACT-SS (4)  · ACT-TN (2)  · ACT-YC (1)
```

39 wiki/projects entries exist as canonical projects but the project_code column doesn't enforce them. Recommend a `canonical_project_codes` lookup + a validator that flags non-matches.

### Pipeline coverage by top projects

| Project | Linked opps | Total potential | In review |
|---|---:|---:|---:|
| ACT-GD | 212 | $446M | 0 |
| ACT-HV | 48 | $4.1M | 0 |
| ACT-OO | 14 | $4.1M | 1 |
| ACT-PI | 8 | $1.2M | 0 |
| ACT-JH | 7 | $1.05M | 0 |
| ACT-CORE | 3 | $850K | 0 |
| ACT-FM | 9 | $750K | 0 |

Note: ACT-GD's $446M is dominated by public-grant scans, not real cultivated opportunities — heavy-tail noise from automated GrantScope crawls.

### Fix

1. **Migrate legacy → canonical**: write a script that maps the 11 legacy slugs to ACT-XX codes (goods → ACT-GD, on-country-programs → ACT-OO, oonchiumpa-house → ACT-OO, etc) and removes the old slug from `aligned_projects[]`.
2. **Define canonical project codes** as a DB enum / lookup table, validate on insert.
3. **Flag "real pipeline" vs "scan noise"** — add a `provenance` column (`curated` vs `auto_discovered`) so the per-project page only shows curated opportunities, not scan results.

---

# 4) CONTACTS — broken (uses legacy slugs, ACT-XX not represented)

`contact_project_links` table — 503 rows total, ALL using legacy slugs:

| project_code | linked_contacts |
|---|---:|
| justicehub | 225 |
| goods | 121 |
| community | 119 |
| first-nations | 36 |
| the-harvest | 2 |

Zero rows use ACT-XX canonical codes.

So when you open `/finance/projects/ACT-JH`, the page can show pipeline opportunities (because `grant_opportunities.aligned_projects` includes ACT-JH) but **cannot show linked contacts** (because none are tagged `ACT-JH`).

### Fix

1. **Backfill via slug map**: 
   ```sql
   UPDATE contact_project_links SET project_code = 'ACT-JH' WHERE project_code = 'justicehub';
   UPDATE contact_project_links SET project_code = 'ACT-GD' WHERE project_code = 'goods';
   UPDATE contact_project_links SET project_code = 'ACT-CORE' WHERE project_code = 'community';
   UPDATE contact_project_links SET project_code = 'ACT-OO' WHERE project_code = 'first-nations';  -- check
   UPDATE contact_project_links SET project_code = 'ACT-FM' WHERE project_code = 'the-harvest';   -- check
   ```
2. **Add a Contacts panel to `/finance/projects/[code]`** showing top-10 linked contacts with role (funder, partner, advisor) + last interaction date.

---

# What this gives you (after the fixes above)

A per-project page that becomes a **single source of truth** for everything ACT-OO (or any project):

```
┌─────────────────────── ACT-OO — Oonchiumpa ───────────────────────┐
│                                                                    │
│  📈 INCOMING                                  ⬇ OUTGOING            │
│  ─────────                                    ─────────             │
│  $103K invoiced  · 4 invoices                $129K spent · 37 lines │
│  Top: Ingkerreke ($103K)                     Top: payroll, travel   │
│                                                                    │
│  ⚙  BURN                       🎯 RUNWAY IMPACT                     │
│  ─────                         ─────                               │
│  $11K/mo (3mo avg)             89 months @ this burn solo          │
│  +5% vs 12mo                    9.3% of org burn                   │
│                                                                    │
│  💰 FUNDING SOURCES                                                │
│  ─────                                                             │
│  Ingkerreke         $103K drawn / $103K committed   100% [████]    │
│  (+ pipeline)                                                      │
│                                                                    │
│  🚀 PIPELINE (curated only — scan noise hidden)                    │
│  ─────                                                             │
│  14 active opps · $4.1M potential · 1 in review                    │
│                                                                    │
│  👥 KEY CONTACTS (after backfill from 'first-nations' → ACT-OO)    │
│  ─────                                                             │
│  Kristy Bloomfield · Tanya Turner · Adam Briggs · ...              │
│                                                                    │
│  🧾 RECENT TRANSACTIONS                                            │
│  ─────                                                             │
│  (per-row, click to retag, OCR-on-demand)                          │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

The Funding Sources and Burn cards are live now (S1 + S4). Pipeline section is live. Contacts panel needs building (after backfill). Incoming Streams section is live. The only thing missing operationally is the **ACT-IN cleanup** so outgoing numbers stop being inflated by transfers.

---

# Concrete punch list (in priority order)

| # | Action | Effort | Impact | Tier |
|---|---|---|---|---|
| 1 | Drop `transfer_default + NULL contact` from project-spend aggregation in `mv_project_quarter_position` + per-project API | 20 min | -$787K of phantom ACT-IN spend disappears from totals | T1 (DB + code) |
| 2 | Reclassify ACT-IN SaaS vendors → ACT-CORE (Anthropic/OpenAI/Notion/Webflow/etc) | 15 min | +$17K to ACT-CORE (accurate) | T2 (UPDATE ~217 rows) |
| 3 | Backfill `contact_project_links` legacy slugs → ACT-XX codes | 30 min | 503 contacts become visible on per-project pages | T2 (UPDATE ~500 rows) |
| 4 | Add Contacts panel to `/finance/projects/[code]` | 1 hr | Closes the 4-column matrix | T1 |
| 5 | Migrate `grant_opportunities.aligned_projects[]` legacy slugs → canonical | 30 min | Removes 313 double-tagged rows + 11 legacy codes | T2 (UPDATE ~330 rows) |
| 6 | Travel reallocation (Qantas/Virgin/Uber from ACT-IN to per-trip project) | 1-2 hrs via UI | -$159K from ACT-IN, +$X to per-trip projects | T1/T2 (judgment per row) |
| 7 | Canonical project codes lookup table + validation | 2 hrs | Prevents future drift | T2 (DDL) |

**Tonight if you want momentum: do 1 → 2 → 3 → 4.** That's ~2 hours and gives you a per-project page with all four columns wired up. Travel reallocation (#6) is the long tail — do in the `/finance/transactions` UI when you have an afternoon.

---
title: Tagging gap report — 2026-05-21
status: action required
date: 2026-05-21
audience: Ben
purpose: Inventory of untagged rows discovered during 2026-05-21 finance system review (QW1). Action via /finance/transactions UI; or follow the script suggestions below.
---

# TL;DR

Three distinct gaps:

| # | Gap | Severity | Action |
|---|---|---|---|
| **A** | **NM Personal regression — 545 rows / $1,006,962** still tagged to ACT projects | 🔴 high — undoes 2026-05-18 cleanup | Re-run mass-untag with manual source so guard holds |
| **B** | 110 ACCPAY bills / $36,572 untagged | 🟡 medium | Manual review — most match existing vendor rules |
| **C** | 7 NAB Visa transactions / $487 untagged (CY2026) | 🟢 low | Auto-applicable from vendor rules table |

---

## Gap A — NM Personal regression (CRITICAL)

The 2026-05-18 cleanup untagged 543 NM Personal rows ($997,928.77). Today we find **545 rows / $1,006,962** still tagged. The 2 extra rows / $9K delta is real Xero data drift, not a counting glitch.

### Source breakdown

| Source | Rows | $ |
|---|---:|---:|
| `vendor_rule` (auto-tagger) | 475 | $431,412 |
| `transfer_default` | 43 | $464,703 |
| `xero_tracking` | 18 | $109,968 |
| `keyword_match` | 10 | $896 |
| **`manual%` (kept)** | **0** | **$0** |

**Diagnosis:** none of the 545 rows have `manual%` source. The 2026-05-18 auto-tagger guard (`project_code_source NOT LIKE 'manual%'`) doesn't help here because these rows were never marked `manual`. They were either:

1. Re-tagged after the cleanup by a different code path, or
2. Never untagged in the first place (the 543 row claim was for a slightly different filter), or
3. Have `xero_tracking` set IN XERO ITSELF — pulling sync would always re-add them

### Recommended fix

Run a one-shot script with:
```sql
UPDATE xero_transactions
SET project_code = NULL,
    project_code_source = 'manual-untagged-nm-personal-2026-05-21'
WHERE bank_account = 'NM Personal '
  AND project_code IS NOT NULL
  AND project_code != ''
  AND date < '2026-01-01';  -- only pre-Jan-2026 (post-cutover untags require Ben review)
```

The `manual-` prefix is critical — the three tagger guards all skip `project_code_source LIKE 'manual%'`, so the cleanup will persist. After running, also check Xero source: if tracking categories are set in Xero on these rows, the sync will keep re-importing them unless we strip Xero-side too (Tier 3, dedicated session per `thoughts/shared/plans/2026-05-18-xero-pushback-dedicated-session.md`).

The 1 post-Jan-2026 row (Canva $18 → ACT-IN) is per-row Ben judgment.

---

## Gap B — 110 ACCPAY bills untagged ($36,572)

Top 30 by amount:

| Vendor | Rows | $ | Suggested project (from vendor_project_rules) |
|---|---:|---:|---|
| The Matnic Trust | 2 | $9,269 | **ACT-IN** (rule exists) |
| Oonchiumpa Consultancy and Services | 1 | $5,940 | **ACT-OO** (rule exists, exact match) |
| Bunnings Warehouse | 5 | $5,796 | **ACT-HV** (rule exists) |
| PayPal | 1 | $2,651 | **ACT-IN** (rule exists, but PayPal can route anywhere) |
| TNT Plastering & Maintenance | 1 | $2,000 | **ACT-HV** (rule exists) |
| Hayden Alexander | 1 | $1,506 | **ACT-IN** (rule exists) |
| Department of Housing and Public Works | 1 | $1,500 | _no rule — likely ACT-HV_ |
| AR Equipment | 1 | $1,166 | _no rule — likely ACT-HV_ |
| Clearview Towing Mirrors | 1 | $769 | _no rule — likely ACT-HV_ |
| Izzy Mobile | 1 | $672 | _no rule_ |
| Tess Fashions | 1 | $439 | _no rule_ |
| Lone Dingo | 1 | $424 | _no rule_ |
| Food Connect Foundation | 1 | $240 | _no rule — partner, likely ACT-IN_ |
| Edmonds Landscaping Supplies | 1 | $240 | _likely ACT-HV_ |
| Humanitix | 1 | $240 | _event ticketing — context-dependent_ |
| Super Publishing Co | 1 | $220 | _no rule_ |
| Sunset Snack Bar | 1 | $213 | _no rule_ |
| BP | 2 | $190 | _fuel — likely ACT-CORE_ |
| Hermit Park - Good Morning Coffee | 2 | $186 | _Ben's coffee — ACT-CORE_ |
| Unknown Supplier | 2 | $173 | _needs OCR_ |
| AI Builder Club | 4 | $148 | _software — ACT-CORE or ACT-DO_ |
| Alibaba Cloud (Singapore) Private | 2 | $128 | _infra — ACT-CORE_ |
| Liberty Maleny | 1 | $121 | _fuel/groceries — ACT-CORE_ |
| Klimataria Athens | 1 | $83 | _Europe trip — ACT-CORE travel_ |
| WizBang Technologies | 1 | $82 | _no rule_ |
| SeaLink Queensland | 1 | $78 | _travel_ |
| Soul Origin | 1 | $78 | _food — ACT-CORE_ |
| La Cocina Granada | 1 | $76 | _Europe trip_ |
| Soldier On | 1 | $74 | _partner — context-dependent_ |
| Gondola Gondola | 1 | $71 | _travel/food_ |

**Safe-to-auto-tag candidates** (where vendor name unambiguously matches a single rule):
- The Matnic Trust × 2 → ACT-IN ($9,269)
- Oonchiumpa Consultancy and Services × 1 → ACT-OO ($5,940)
- Bunnings Warehouse × 5 → ACT-HV ($5,796)
- TNT Plastering & Maintenance × 1 → ACT-HV ($2,000)
- Hayden Alexander × 1 → ACT-IN ($1,506)
- Cognition AI × N → ACT-DO
- Orange Sky (single rule) → ACT-IN; (the Australia variant is split between rules — manual)

Total auto-actionable: ~10 vendors / ~$25K. Remaining ~$12K split across 100+ small misc bills.

---

## Gap C — 7 NAB Visa CY2026 transactions untagged ($487)

| Date | Contact | $ | Suggested project |
|---|---|---:|---|
| 2026-05-18 | NAB | 3.23 | ACT-CORE (NAB fee, rule exists) |
| 2026-05-18 | NAB | 2.27 | ACT-CORE (NAB fee, rule exists) |
| 2026-05-18 | NAB | 0.25 | ACT-CORE (NAB fee, rule exists) |
| 2026-05-18 | BCC Resource | 100.67 | _no rule — likely ACT-CORE (council)_ |
| 2026-02-01 | X Global LLC | 62.00 | _no rule — likely ACT-CORE (software)_ |
| 2026-01-27 | Orange Sky Australia | 288.00 | ACT-GD (Orange Sky Australia variant rule) |
| 2026-01-17 | Cognition AI | 30.91 | ACT-DO (rule exists) |

**Safe-to-auto-tag:** 5 of 7 ($424). Remaining 2 ($163) — BCC Resource + X Global LLC — need 30 seconds of Ben judgment.

---

## Next steps

1. **Gap A first** — re-run NM Personal untag with `manual-` source prefix so it persists. See SQL above.
2. **Gap B + C safe-auto** — write a single targeted script that applies the vendor_project_rules to the named untagged rows (no broad sweep — explicit row IDs).
3. **Long tail** — handle via `/finance/transactions` UI filtered to UNTAGGED.

Total time to close gaps B + C completely: ~45 min via UI. Gap A: 5 min (run SQL) + dedicated Xero-side cleanup session (90-180 min, separate plan exists).

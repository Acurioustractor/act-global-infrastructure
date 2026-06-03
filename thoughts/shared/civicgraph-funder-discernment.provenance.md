# Provenance — CivicGraph Funder-Discernment Worklists

**Generated:** 2026-06-03 (PM) · **Script:** `grantscope/scripts/build-funder-discernment.mjs` (read-only)
**Outputs:** `thoughts/shared/civicgraph-halo-wash.csv` · `thoughts/shared/civicgraph-community-backers.csv`

## What this is
Layer 3 of the energy-orbit relational system — CivicGraph as funder-discernment / anti-foundation
instrument. Two screens over the GrantScope DB (separate Supabase, repo `/Users/benknight/Code/grantscope`):
- **Halo-wash:** entities that BOTH made political donations AND hold government contracts (matched by ABN).
- **Genuine community backers:** entities that are Supply Nation certified OR community-controlled
  (ORIC / ACNC-Indigenous / self-identified), with a `donates_to_party` drift flag.

## Sources (Verified — queried directly via `exec_sql` against the GrantScope DB)
| Table | Used for | Scale |
|---|---|---|
| `political_donations` | donor ABN, amount, party (`donation_to`) | 226,190 records · 10,736 distinct donor ABNs · $25.84B |
| `austender_contracts` | supplier ABN, contract_value, supplier_name | 672K+ contracts (indexed on `supplier_abn`) |
| `gs_entities` | canonical_name, sector, state, `is_supply_nation_certified`, `is_community_controlled`, `community_controlled_tier`, `latest_revenue` | 597,296 entities · 347,109 with ABN |

## Headline figures (Verified, this run)
- **Halo-wash: 2,078 entities · $8,741,169,579 donated ↔ $431,509,087,492 in contracts.** (Full set — see caveat below; CSV has all 2,078.)
- **Community backers: 9,167 entities with an ABN** (of 13,302 community-controlled total; 1,290 with known revenue). By tier: oric 4,229 · acnc_indigenous+supply_nation 3,450 · self_identified 1,022 · …
- **Drift: 13 community-rooted entities that ALSO donate to parties** — top: Four Mile Aboriginal Corporation $4.37M, Queensland Council of Unions $1.8M, Buurabalayji Thalanyji Aboriginal Corporation RNTBC $130K.

## CAVEATS — read before citing any figure
1. **`exec_sql` silently caps at 1,000 rows per call.** First runs under-reported (halo-wash showed 1,000 not 2,078; drift showed 6 not 13). The script now paginates (donor aggregates) and batches contract lookups by indexed ABN (500/batch). **Verified untruncated** by CSV row counts (2,078 / 9,167) and the drift count matching a direct `count(*)`.
2. **Some top "donors" are data artifacts, NOT halo-washers.** Australian Electoral Commission ($1.08B), NSW Electoral Commission ($526M), Director of National Parks appear in the donor column — these are regulators/public bodies recorded in the AEC transparency dataset, not corporates buying influence. The genuine corporate signal is the banks (Westpac, CommBank, NAB, ANZ) + Woolworths. **Filter or human-read the top rows before using them in any narrative.**
3. **`donation_to` (party) string is as-ingested** from AEC returns — not normalised; `string_agg(DISTINCT)` may list variant spellings of the same party.
4. **Inferred, never asserted:** CivicGraph has STRUCTURAL signals only — no editorial "ethical" label. "Halo-wash" and "genuine backer" are inferences from donation+contract+certification structure, not claims of fact about any entity's conduct.
5. **ABN match is the join key.** Entities without a clean ABN in one dataset are invisible to the cross-match (e.g. community-controlled entities without ABNs — ~4,135 — are excluded from the backers CSV).
6. **`is_community_controlled` / tiers are themselves derived** (oric register, ACNC Indigenous flag, self-identification) with `cc_confidence` — `self_identified` is the least-verified tier.

## Reproduce
```
cd /Users/benknight/Code/grantscope && node scripts/build-funder-discernment.mjs
```
Read-only; writes only the two CSVs into this repo's `thoughts/shared/`. ~38s (donor pagination + 22 contract batches + 10 enrich batches + backer pagination).

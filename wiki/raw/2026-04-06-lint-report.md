# Wiki Health Report — 2026-04-06

## Summary

| Metric | Count |
|--------|-------|
| Total articles | 39 |
| Full articles (≥ 20 lines) | 14 |
| Stub articles (< 20 lines) | 25 |
| Broken wikilinks | 4 |
| Orphaned articles | 0 |
| Articles missing from index | 0 |

---

## Broken Wikilinks

All 4 broken links originate from `projects/picc.md`. The targets do not exist as `.md` files anywhere in `wiki/`.

| Source | Broken target |
|--------|--------------|
| picc | picc-annual-report |
| picc | picc-centre-precinct |
| picc | picc-elders-hull-river |
| picc | picc-photo-kiosk |

**Action:** Either create stub files for these four PICC sub-pages, or remove the links from `picc.md`.

---

## Stub Articles (25 total)

All stubs are `projects/` files sitting at 18–19 lines. None contain a "Stub" marker in their text — they're just thin.

Full stub list:

```
act-farm, bg-fit, caring-for-those-who-care, contained, dad-lab-25,
designing-for-obsolescence, fishers-oysters, global-laundry-alliance,
gold-phone, goods, goods-on-country, green-harvest-witta, junes-patch,
mounty-yarns, oonchiumpa, place-based-policy-lab, quandamooka-justice-strategy,
regional-arts-fellowship, smart-connect, smart-hcp-gp-uplift,
smart-recovery-gp-kits, the-confessional, the-harvest, tomnet,
uncle-allan-palm-island-art
```

---

## Top 5 Stubs to Enrich First (by inbound link count)

| Rank | Slug | Lines | Inbound links | Linked from |
|------|------|-------|--------------|-------------|
| 1 | uncle-allan-palm-island-art | 19 | 2 | index, picc |
| 2 | goods-on-country | 19 | 1 | index |
| 3 | the-harvest | 19 | 1 | index |
| 4 | act-farm | 19 | 1 | index |
| 5 | global-laundry-alliance | 19 | 1 | index |

Note: 23 of 25 stubs have only 1 inbound link (from index). `uncle-allan-palm-island-art` is the highest-priority as it's also referenced by `picc`.

---

## Orphaned Articles

None. Every article is reachable from at least one other article.

---

## Missing Backlinks

If article A links to article B, B should link back to A. The following pairs are one-directional.

### lcaa-method (most common missing backlink target)

`lcaa-method` is referenced by 21 project articles but links to none of them in return. This is likely intentional (hub-and-spoke pattern) but listed for awareness.

Affected projects that link to `lcaa-method` without reciprocation:
`act-farm`, `bg-fit`, `caring-for-those-who-care`, `contained`, `dad-lab-25`,
`designing-for-obsolescence`, `fishers-oysters`, `global-laundry-alliance`,
`gold-phone`, `goods`, `goods-on-country`, `green-harvest-witta`, `junes-patch`,
`mounty-yarns`, `oonchiumpa`, `place-based-policy-lab`, `quandamooka-justice-strategy`,
`regional-arts-fellowship`, `smart-connect`, `smart-hcp-gp-uplift`,
`smart-recovery-gp-kits`, `the-confessional`, `the-harvest`, `tomnet`,
`uncle-allan-palm-island-art`

### Other missing backlinks

| Article links to | But target doesn't link back |
|-----------------|------------------------------|
| palm-island → local-ai-architecture | local-ai-architecture doesn't mention palm-island |
| palm-island → third-reality | third-reality doesn't mention palm-island |
| palm-island → acco-sector-analysis | acco-sector-analysis doesn't mention palm-island |
| palm-island → indigenous-data-sovereignty | indigenous-data-sovereignty doesn't mention palm-island |
| civic-world-model → acco-sector-analysis | acco-sector-analysis doesn't mention civic-world-model |
| lcaa-method → empathy-ledger | empathy-ledger doesn't link back to lcaa-method |
| lcaa-method → civicgraph | civicgraph doesn't link back to lcaa-method |
| lcaa-method → picc | picc doesn't link back to lcaa-method |
| lcaa-method → third-reality | third-reality doesn't link back to lcaa-method |
| llm-knowledge-base → third-reality | third-reality doesn't link back to llm-knowledge-base |
| empathy-ledger → picc | picc doesn't link back to empathy-ledger |
| justicehub → global-precedents | global-precedents doesn't link back to justicehub |
| picc → uncle-allan-palm-island-art | uncle-allan-palm-island-art doesn't link back to picc |
| picc → third-reality | third-reality doesn't link back to picc |
| acco-sector-analysis → third-reality | third-reality doesn't link back to acco-sector-analysis |
| global-precedents → civicgraph | civicgraph doesn't link back to global-precedents |

---

## Index Completeness

All 38 non-index articles appear in `wiki/index.md`. Index is complete.

---

## Recommended Actions (priority order)

1. **Fix broken links in picc.md** — create or remove 4 missing sub-page stubs
2. **Enrich `uncle-allan-palm-island-art`** — only stub with 2+ inbound links
3. **Add backlinks in `third-reality`** — it's referenced by 5 other articles but links to none
4. **Add backlinks in `lcaa-method`** — consider adding a "Projects using this method" section
5. **Bulk enrich project stubs** — 24 stubs are thin scaffolds; prioritise by active project status

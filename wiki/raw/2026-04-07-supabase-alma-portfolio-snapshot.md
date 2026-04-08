---
source: Supabase ACT shared (tednluwflfhxyucgwigh)
table: alma_interventions
captured_at: 2026-04-07
captured_by: phase-4 ingestion
query: SELECT type, COUNT(*), AVG(portfolio_score) FROM alma_interventions
---

# ALMA Intervention Portfolio — 2026-04-07 Snapshot

## Totals

- **Interventions:** 1,766
- **Operating organizations:** 729
- **Intervention types:** 10
- **Average portfolio score:** 0.46
- **With evidence level set:** 1,487 (84%)

## Distribution by Type

| Type | N | Avg Score |
|------|---|-----------|
| Community-Led | 345 | 0.45 |
| Wraparound Support | 328 | 0.50 |
| Education/Employment | 213 | 0.42 |
| Prevention | 207 | 0.39 |
| Cultural Connection | 206 | 0.48 |
| Diversion | 140 | 0.47 |
| Therapeutic | 126 | 0.46 |
| Justice Reinvestment | 72 | 0.50 |
| Early Intervention | 72 | 0.43 |
| Family Strengthening | 57 | 0.45 |

## Top 15 by Portfolio Score

| Rank | Name | Type | Org | Score | Evidence Level |
|------|------|------|-----|-------|----------------|
| 1 | Deadly Inspiring Youth Doing Good (DIYDG) | Cultural Connection | DIYDG ATSI Corp | 0.855 | Indigenous-led |
| 2 | Central Qld Indigenous Development Ltd | Family Strengthening | CQID | 0.855 | Promising |
| 3 | Rumbalara Aboriginal Co-operative | Community-Led | Rumbalara | 0.803 | Untested |
| 4 | Mulungu Aboriginal Corp Primary Health Care | Cultural Connection | Mulungu | 0.780 | Indigenous-led |
| 5 | Youth Legal Aid Service | Wraparound Support | Legal Aid QLD | 0.780 | Untested |
| 6 | ATSI Wellbeing Services | Cultural Connection | ATSI Wellbeing | 0.780 | Promising |
| 7 | QATSICPP (Youth Justice Peak) | Community-Led | QATSICPP | 0.780 | Untested |
| 8 | Legal Aid Queensland Head Office | Wraparound Support | Legal Aid QLD | 0.780 | Untested |
| 9 | Oochiumpa Youth Services | Wraparound Support | Oochiumpa | 0.772 | **Effective (strong evaluation)** |
| 10 | headspace National Youth Mental Health | Therapeutic | headspace | 0.765 | Promising |
| 11 | ATSI Community Health Service | Cultural Connection | ATSICHS | 0.765 | Promising |
| 12 | Mamu Health Service Limited | Cultural Connection | Mamu | 0.765 | Indigenous-led |
| 13 | WA Youth Services (Mission Australia) | Wraparound Support | Mission Australia | 0.758 | Promising |
| 14 | Foyer Oxford | Wraparound Support | Anglicare WA | 0.758 | Untested |
| 15 | Mission Australia Youth Services NSW | Wraparound Support | Mission Australia | 0.758 | Promising |

## Notable Pattern

8 of the top 15 are Indigenous-led or Aboriginal community-controlled organisations (ACCOs). Only Oochiumpa carries an "Effective (strong evaluation)" evidence level — most high-scoring interventions sit at "Indigenous-led", "Promising", or "Untested", reflecting the gap between community authority and Western evaluation infrastructure.

## Source

`v_alma_current_impact` view shows live impact: 25 stories told, 150 lives touched, 42 art pieces created (period: 2026-01-26).

# Stat Conflicts — CONTAINED

> Numbers we have used inconsistently across the campaign. Reconcile before launch.
> Generated from claim files. Update this whenever a claim is added or refreshed.

**Last reviewed:** 2026-04-09 (initial seed)
**Status:** Unreconciled — pre-launch fix required

---

## 1. Cost per detained child per year

| Figure | Source we cited | Where used |
|---|---|---|
| **$1.1M** | (none specified) | Building Revolution essay (2025-10-24) |
| **$1.3M** | "Productivity Commission's latest ROGS" | Cure Already Exists essay (2026-03-12), oped |
| **$1.55M** | "Productivity Commission ROGS 2024-25" | Campaign bible, launch Day 2 posts, funder emails |
| **$2.6M** (Victoria) | "In Victoria, it is $2.6 million" | Cure Already Exists essay |

**Drift:** $1.1M → $1.3M → $1.55M over 5 months. Each attributed to ROGS. ROGS does publish updated figures, so the drift may be legitimate — but the campaign cites the latest figure without saying *"updated 2024-25 from $1.3M"*, which leaves us open to a "you keep moving the number" challenge.

**Fix:** Pick the most recent ROGS figure, cite the year, and use it everywhere. Add a footnote line in the campaign bible: *"As of ROGS 2024-25 (released [date])."*

---

## 2. Detention recidivism rate

| Figure | Time window | Source | Where used |
|---|---|---|---|
| **15.5% success / 84.5% reoffend** | "within 12 months" | (unattributed) | Building Revolution essay |
| **84% reoffend** | "within two years" | "Queensland Youth Justice Strategy 2023" | Campaign bible |
| **85% return rate** | (no window) | (unattributed) | Cure essay + oped |
| **"above 80"** | (no window) | (unattributed) | Cure essay |

**Drift:** Three different numbers (84%, 84.5%, 85%) and two different time windows (12 months, 2 years) across the campaign.

**Fix:** Pick one number, one window, one source. Recommend: **84% within two years** (campaign bible, sourced to QLD Youth Justice Strategy 2023). Replace all others.

---

## 3. Diagrama (Spain) success rate

| Figure | Source | Where used |
|---|---|---|
| **13.6% reoffending** | "Diagrama Foundation evaluation" | Cure essay + oped |
| **86% success rate** | (math: 100 - 13.6 ≈ 86.4) | Launch Day 3 posts |
| **73% success** | "Diagrama Foundation evaluation" | Campaign bible (Section 3) |
| **78% success rate** | (community programs) | Day 4 posts, also called "Diagrama" elsewhere |

**Drift:** The campaign bible's **73%** is the outlier and is mathematically inconsistent with the 13.6% reoffending figure used in the essay. The 78% figure has been mixed up with community-program numbers.

**Fix:** Diagrama success = **86.4% (= 100 - 13.6% reoffending)**. Update campaign bible Section 3. Source: Diagrama Foundation evaluation + University of Valencia ROI study.

---

## 4. Community alternative cost

| Figure | Unit | Where used |
|---|---|---|
| **$58,000/year** | annual | Building Revolution essay |
| **$75/day** | daily (= $27,375/year annualised) | Campaign bible, launch posts |
| **$31,000/year** | annual | Cure essay (Diagrama figure, not Australian community programs) |
| **97.6% cheaper than detention** | percentage | Cure essay (Oonchiumpa-specific) |

**Drift:** $58K/year and $75/day are not the same number. $75/day annualised is $27K/year — less than half of $58K. Either one of these figures is wrong, or they describe different program types and we have collapsed them.

**Fix:** Decide what we mean by "the community program cost":
- (a) average across all programs in ALMA → produces one number
- (b) Oonchiumpa-specific → produces a different number
- (c) "what a typical Room 3 organisation costs per child per year" → produces a third
Pick one definition. Source it. Use it consistently.

---

## 5. The "16x" multiplier

The campaign claim is *"16 young people for the same cost"*.

Math check: $1,550,000 (one year detention) ÷ $27,375 ($75 × 365 days community) = **56.6x**, not 16x.

If we use the $58,000/year figure instead: $1,550,000 ÷ $58,000 = **26.7x**, not 16x.

There is **no combination** of our published figures that produces 16x.

**Fix:** Either find the original source for "16x" (was it computed from a now-superseded cost figure?) or recompute and replace. **This is the highest-priority pre-launch correction.** We will be challenged on it.

---

## 6. ALMA / JusticeHub program count

| Figure | Where used | Date |
|---|---|---|
| **150+ community programs** | Building Revolution essay | 2025-10-24 |
| **800+ verified interventions** | Cure essay | 2026-03-12 |
| **981 verified interventions** | Funder emails | 2026-03-19 |
| **1,004+ evidence-based community programs** | wiki/projects/contained.md | 2026-04 |
| **527+ orgs on ALMA** | Campaign bible | 2026-03-18 |
| **570 evidence items in ALMA** | wiki/projects/contained.md | 2026-04 |

**Drift:** Six different numbers in seven months. Some are programs, some are interventions, some are evidence items, some are organisations — these are different units.

**Fix:** Define the four units (programs, interventions, evidence items, organisations), publish a count of each as of a specific date, and refresh the date stamp monthly. Stop saying "981" without saying "as of [date]".

---

## 7. Indigenous overrepresentation multiplier

| Figure | Where used |
|---|---|
| **21x more likely** | Cure essay + oped |
| **23x** | Campaign bible Section 3 |

**Drift:** Two slightly different numbers, same claim, no source attribution on either.

**Fix:** Locate primary source (likely AIHW *Youth Justice in Australia* annual report). Pick one number, cite the year, use everywhere.

---

## Recommended pre-launch action

Before the April 20 launch:

1. **Reconcile the math** in `STAT-CONFLICTS.md` items 1, 3, 4, and 5 (these are the ones a hostile journalist will check first)
2. **Create `wiki/narrative/contained/STATS.md`** as the single canonical statistics file
3. **Update every claim file** to point to `STATS.md` instead of restating numbers
4. **Update `JusticeHub/src/content/campaign.ts`** so the website matches
5. **Add a `verified: YYYY-MM-DD` field** to every statistic so drift is visible the next time it happens

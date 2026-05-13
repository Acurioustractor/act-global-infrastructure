---
title: Project-code alignment audit — Xero · Supabase · GHL · Wiki · Newsletter
date: 2026-05-13
status: review-needed
owner: Ben
---

# Project-code alignment audit

> **Goal:** every place that names a project (Xero, Supabase, GHL contacts + opportunities, wiki, newsletter) must use the same canonical code (`ACT-XX`) from `projects.code`. This audit shows where we already are, where we're not, and what one backfill pass can fix.

## TL;DR

| System | Aligned on canonical codes? | Coverage | Status |
|---|---|---|---|
| `xero_transactions` | YES | 97.7% (3,040/3,112) | aligned |
| `xero_invoices` | YES | 95.8% (1,698/1,772) | aligned |
| `ghl_opportunities` | YES | 82.5% (287/348) | aligned |
| `projects` (canonical) | n/a | 76 codes (31 active) | source of truth |
| `ghl_contacts.projects[]` | NO — lowercase slugs | 13.5% | **misaligned** |
| `ghl_contacts.tags` (free text) | PARTIAL — ~50% mappable | n/a | **needs backfill** |
| `wiki/projects/*.md` frontmatter | MOSTLY | 30/39 with code | 5 orphans, 1 collision |
| Newsletter consent | NO project linkage | 118 boolean / 382 tagged | **broken** |

**The financial side is fine. The contact side and wiki need cleanup.**

---

## 1. Xero / Supabase / GHL opportunities

Already aligned on `ACT-XX` codes. One orphan and a few archived/transferred codes still in use:

- `DISPUTED` — 2 transactions. Not a project code; should be moved to a status field or cleared.
- `ACT-OS` (Orange Sky EL, archived) — 3 tx, 0 inv. Historical, ok to keep.
- `ACT-SH` (The Shed, archived) — 15 invoices. Historical, ok.
- `ACT-SX`, `ACT-WE`, `ACT-WJ`, `ACT-BR` — all archived projects with historical financial records. OK to keep, no rename needed.

**Action:** clear `DISPUTED` tag (move to status column or delete).

---

## 2. GHL contacts — the main work

### 2a. `projects[]` array uses slugs, not canonical codes

| Slug | Contacts | Should be |
|---|---|---|
| `justicehub` | 688 | ACT-JH (and/or ACT-JC) |
| `empathy-ledger` | 14 | ACT-EL |
| `goods` | 7 | ACT-GD |
| `the-harvest` | 2 | ACT-HV |

Total: 711 / 5,274 = 13.5% project-tagged. **Only 4 projects represented.**

### 2b. Tag-based project signal is huge

Tags carry the real signal. Mapping via `projects.ghl_tags` plus four prefix rules (`goods-*`, `harvest-*`, `contained-*`, `picc-*`) lifts coverage from **13.5% → 74.3%**.

**Per-project uplift after backfill:**

| Canonical | Project | Current contacts | After backfill |
|---|---|---|---|
| ACT-EL | Empathy Ledger | 14 | **2,913** |
| ACT-GD | Goods | 7 | **855** |
| ACT-JH | JusticeHub | 0 | **692** |
| ACT-JC | JH Centre of Excellence | 0 | 689 (overlap — see ambiguity) |
| ACT-HV | The Harvest | 2 | **120** |
| ACT-CN | Contained | 0 | **29** |
| ACT-CG | CivicGraph | 0 | 1 |

### 2c. Ambiguity: `justicehub` tag → ACT-JH **or** ACT-JC?

`projects.ghl_tags` lists `justicehub` under both ACT-JH (active) and ACT-JC (ideation). 689 contacts have this tag.

**Decision needed.** Recommendation: drop `justicehub` from ACT-JC's `ghl_tags`, keep only on ACT-JH. ACT-JC gets its own tag like `justicehub-coe`.

### 2d. The 2,387 phantom storytellers

2,387 GHL contacts are tagged `storyteller` but `is_storyteller=false` and have no `empathy_ledger_id` link.

**Sample of 15 reveals all are synthetic-email EL stubs:**

```
storyteller-786b1699@empathy-ledger.local
aunty.ivy@storyteller.local
storyteller-1756588245720@empathyledger.temp
```

These were pushed into GHL from EL story records but never properly linked. **They're not contactable** (synthetic emails) and shouldn't be counted as GHL contacts.

**Decision needed.** Options:
- **A.** Match against EL v2 (`yvnuayzslukamizrlhwb`) by `full_name`, backfill `empathy_ledger_id` + `is_storyteller=true`. Real storytellers stay; orphans get deleted.
- **B.** Delete all 2,387 from GHL outright — they live in EL, not GHL.
- **C.** Move to a separate `storyteller_shadows` table in Supabase, outside the GHL contact surface.

Recommendation: **A**. Tanya Turner, Aunty Ivy, Dianne Stokes, Gloria, Iris — these appear to be real Oonchiumpa/PICC storytellers per memory. Worth the reconciliation effort.

### 2e. Field completeness gaps

| Field | Coverage | Note |
|---|---|---|
| Email | 98.4% | OK |
| Phone | 2.3% | Can't be backfilled retroactively; require at intake |
| Company | 4.2% | Same — require at intake |
| `canonical_entity_id` | 33.2% | CivicGraph entity dedup not propagating |
| `last_contact_date` | 6.4% (newest 2026-01-08) | **Field is dead.** Backfill from GHL conversations API or drop. |

---

## 3. Wiki orphan canonical codes

5 wiki frontmatter codes not in `projects` table:

| Wiki code | File | What it is | Recommended fix |
|---|---|---|---|
| `ACT-DLB` | `wiki/projects/deadlylabs.md` | DeadlyLabs (DeadlyScience partner, STEM + youth detention) | **Add to `projects` table** as new code |
| `ACT-GS` | `wiki/projects/grantscope.md` | GrantScope/CivicGraph | **Rename wiki → ACT-CG** (collision with existing) |
| `ACT-PB` | `wiki/projects/place-based-policy-lab.md` | Place-Based Policy Lab | **Add to `projects` table** |
| `ACT-QD` | `wiki/projects/quandamooka-justice-strategy.md` | Quandamooka Justice Strategy (satellite, active) | **Add to `projects` table** |
| `ACT-RS` | `wiki/projects/resoleution.md` | ReSOLEution (shoe program in youth detention) | **Add to `projects` table** |

The ACT-GS/ACT-CG collision is the only real conflict — both refer to the same project (GrantScope = CivicGraph). Wiki should rename to ACT-CG to match the projects table (and Supabase `xero_invoices`/`ghl_opportunities` would auto-align since they already use ACT-CG).

---

## 4. Newsletter consent — broken pipeline

| Signal | Count |
|---|---|
| `newsletter_consent = true` | 118 |
| Tagged `goods-newsletter` | 332 |
| Tagged `harvest-newsletter` | 19 |
| Tagged `newsletter` (generic) | 31 |
| **Total tagged a newsletter** | 382 |
| `newsletter_unsubscribed_at` set | 0 (field never used) |
| **Both consented AND tagged a project newsletter** | **unknown — should be the operative number** |

Two systems running in parallel:
- **Boolean** (`newsletter_consent`) — doesn't say which newsletter
- **Tags** (`*-newsletter`) — doesn't carry consent

**Decision needed.** Recommendation:
1. Newsletter sends must AND both: `newsletter_consent=true` **AND** project-specific tag.
2. For 382 tagged contacts: audit each one for an opt-in event (Mailchimp confirmation, signup form, double opt-in). Set `newsletter_consent=true` only where audit trail exists.
3. Where no audit trail: treat tag as marketing segment only; do not send.
4. Forms going forward must write both flags atomically.

---

## 5. Aligned canonical code map (current state)

The single source of truth: `projects.code`. Every other system maps back.

**Active project codes (31):**

```
Ecosystem:   ACT-CORE  ACT-EL  ACT-FM  ACT-GD  ACT-HV  ACT-IN  ACT-JH
Engine:      ACT-CG    ACT-HQ  ACT-PC
Campaign:    ACT-DG
Satellite:   ACT-BG  ACT-BV  ACT-CB  ACT-CE  ACT-CM  ACT-CN  ACT-CP
             ACT-CS  ACT-CT  ACT-DL  ACT-DO  ACT-FG  ACT-JP
             ACT-MD  ACT-OO  ACT-SM
Studio:      ACT-CA  ACT-CF  ACT-GP  ACT-MC  ACT-MY  ACT-PI  ACT-PS
             ACT-RA  ACT-RT  ACT-UA
Ideation:    ACT-BB  ACT-JC  ACT-TR
Sunsetting:  ACT-DO
Transferred: ACT-FO  ACT-GL
```

Plus 5 to add (after wiki audit): **ACT-DLB · ACT-PB · ACT-QD · ACT-RS** (and rename wiki `ACT-GS` → `ACT-CG`).

---

## 6. Proposed cleanup sequence

### Phase 1 — schema rules (today, ~30 min, no writes)
1. Extend `projects.ghl_tags` to include prefix-based tags. Either:
   - Add column `ghl_tag_prefixes TEXT[]` (e.g. `['goods-']` on ACT-GD), OR
   - Enumerate every variant in existing `ghl_tags`. Recommend prefixes column.
2. Resolve `justicehub` ambiguity: drop from ACT-JC, add `justicehub-coe` to ACT-JC.
3. Add 4 new project codes: ACT-DLB, ACT-PB, ACT-QD, ACT-RS.
4. Rename wiki ACT-GS → ACT-CG (one file).
5. Decide what to do with `DISPUTED` tag (move to status / delete / keep as flag).

### Phase 2 — contact backfill (after Phase 1)
6. Build `scripts/backfill-ghl-contact-projects.mjs`:
   - Scan `ghl_contacts.tags`, map via `projects.ghl_tags` + prefix rules
   - Update `ghl_contacts.projects[]` with canonical codes (drop slugs)
   - Dry-run first — produce diff report. Expected: 711 → ~3,920 tagged (74.3%)
7. **Tier 3 decision:** push project field back to GHL via API. Otherwise next sync overwrites. Needs explicit go-ahead from Ben.

### Phase 3 — storyteller reconciliation
8. Cross-reference 2,387 phantom storytellers against EL v2 by `full_name`.
9. Real matches → backfill `empathy_ledger_id` + `is_storyteller=true`.
10. Orphans → delete from `ghl_contacts` (they're not contactable).

### Phase 4 — newsletter consent rebuild
11. Audit each `*-newsletter` tagged contact for opt-in trail.
12. Set `newsletter_consent=true` only where trail exists.
13. Tag schema: one newsletter per project (e.g. `newsletter-goods`, `newsletter-harvest`).
14. Form intake must write `newsletter_consent` + project-newsletter tag atomically.

### Phase 5 — going-forward enforcement
15. Documented tag→code map in `config/project-codes.json` as single source of truth.
16. `projects.ghl_tags` validated against config on cron.
17. New GHL contact intake requires `projects[]` populated with ACT-XX codes.
18. Drop `last_contact_date` field or wire to GHL conversations API.

---

## 7. Decisions blocking Phase 2

Ben needs to mark these up before any writes happen:

- [ ] `justicehub` tag — strip from ACT-JC, keep only on ACT-JH? **YES / NO**
- [ ] Add ACT-DLB, ACT-PB, ACT-QD, ACT-RS to `projects` table? **YES / NO**
- [ ] Rename wiki ACT-GS → ACT-CG (grantscope.md frontmatter)? **YES / NO**
- [ ] 2,387 phantom storytellers — reconcile against EL v2 (A) / delete (B) / move to shadow table (C)? **A / B / C**
- [ ] `DISPUTED` tag on 2 Xero transactions — move to status / delete / keep? **MOVE / DELETE / KEEP**
- [ ] Push contact-projects backfill back to GHL API after Supabase update? **YES / NO** (Tier 3 — explicit verb required)

---

## 8. Sources

- Supabase: `tednluwflfhxyucgwigh` (shared op DB)
- `projects` table (76 codes)
- `ghl_contacts` (5,274 rows, 1 sync today 2026-05-13)
- `ghl_opportunities` (348 rows)
- `xero_transactions` (3,112 rows)
- `xero_invoices` (1,772 rows)
- `wiki/projects/*.md` (39 files, 30 with canonical_code frontmatter)
- `config/project-codes.json` (v1.8.0, 2026-04-24)

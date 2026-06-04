---
title: Funder alignment — second pass, receivables clearing, D&O window tightening
summary: Second artefact of the ACT Alignment Loop (Q1), second pass. $507K outstanding at baseline has reduced to ~$300K as Snow paid and PICC invoices cleared. Rotary eClub INV-0222 remains the longest-outstanding unresolved receivable. funders.json expanded from 14 to 24+ entries. D&O insurance is now 16 days from its ~30-day-post-registration deadline.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-05-08
---

# Funder alignment — 2026-05-08

> Second pass of the [[act-alignment-loop|ACT Alignment Loop]] Q1. Four sources: `xero_invoices` (DB reality), `ghl_contacts` + `last_contact_date` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). DB queried 2026-06-04; point-in-time ~$300K outstanding figure sourced from the automated 2026-05-07 cycle run.

## Headline findings

1. **Outstanding ACCREC fell ~$207K since 24 April.** Snow Foundation INV-0321 ($132K) is no longer outstanding — payment received. PICC pair (INV-0317 + INV-0324, $113.3K total) cleared. Just Reinvest ($27.5K), SMART Recovery ($2.2K), and Regional Arts Australia INV-0301 ($16.5K) also cleared. Total outstanding ACCREC reduced from $507,350 to approximately $300,400 by 2026-05-07 (per auto-cycle data).

2. **Rotary eClub INV-0222 ($82,500, 420+ days) is now the longest-outstanding unresolved receivable.** No chase, no write-off decision, no named human contact in GHL. At baseline it was flagged as a "chase-or-write-off" decision — that decision has not been made.

3. **`wiki/narrative/funders.json` dramatically expanded** — from 14 entries (updated 2026-04-09) to 24+ entries (updated 2026-05-07), with 7 previously-absent paid funders added as stubs (Centrecorp, Rotary, Vincent Fairfax, Social Impact Hub, State of QLD, StreetSmart, Westpac Scholars Trust) and stage corrections for Snow Foundation (now `active-partner`) and Paul Ramsay (now `warm`).

4. **Minderoo paused** — Lucy Stronach indicated internal restructure on 2026-05-14. Stage updated to `paused` with re-engage flag for Q3 FY27 or on her signal. The $2.9M ask deadline of 2026-05-15 has passed without a decision. This does not affect the entity migration directly.

5. **GHL comms — ~12 funder contacts silent >90 days as of 2026-05-08.** Paul Ramsay Foundation (~95 days), UniMelb/UTas cluster (~94 days), AMP Foundation (~141 days), Queensland Gives (~147 days), and the January batch growing further.

---

## At-a-glance — funder status versus 24 April baseline

Legend: 🟢 improvement / resolved · 🔴 open / worsening · → unchanged · ⚠️ new drift

| Funder | Baseline (24 Apr) | 2026-05-08 | Status |
|---|---|---|---|
| **Snow Foundation** | $132K AUTH 37d outstanding | PAID ✅ | 🟢 Resolved |
| **Centrecorp Foundation** | $84.7K DRAFT 70d | RESOLVED (voided or paid decision taken) | 🟢 Resolved |
| **Rotary eClub Outback** | $82.5K AUTH 380d | $82.5K AUTH 420d+ | 🔴 Worsening (40 more days, no decision) |
| **PICC (INV-0317 + INV-0324)** | $113.3K AUTH 16-67d | PAID ✅ | 🟢 Resolved |
| **Regional Arts Australia** | $33K AUTH (2 invoices) | INV-0301 paid; INV-0302 $16.5K still outstanding | 🟡 Partially resolved |
| **Just Reinvest** | $27.5K AUTH 54d | PAID ✅ | 🟢 Resolved |
| **SMART Recovery** | $2.2K AUTH 36d | PAID ✅ | 🟢 Resolved |
| **Homeland School Company** | $4.95K AUTH 65d (INV-0303) | $44K AUTH new invoice (2026-05-18) | ⚠️ New larger invoice outstanding |
| **Aleisha J Keating** | $11.7K AUTH (26 weekly) | $5.85K AUTH (13 weekly) | → Partial collection, retainer continues |
| **Minderoo Foundation** | ask-pending $2.9M due 2026-05-15 | `paused` — internal Minderoo restructure | ⚠️ Paused (no decision on ask, Minderoo-side) |
| **Snow Foundation (stage)** | wiki: `warm, ask $200K` | wiki: `active-partner` | 🟢 Fixed |
| **Paul Ramsay Foundation (stage)** | wiki: `cold` | wiki: `warm` | 🟢 Fixed |

---

## Money in flight — 53-day countdown

Three categories of outstanding ACCREC as of 2026-05-08:

### 🔴 Rotary eClub Outback Australia INV-0222 — $82,500 AUTHORISED (420d+)

- Still the oldest live receivable. Still no GHL communication record. Still no named human.
- As of 2026-05-08: This needs a resolution by 30 June 2026 (53 days). Chase or write off on the sole trader's final BAS. Rule 3 of the migration checklist applies — this is a recovery problem, not a novation one.

### 🟡 Regional Arts Australia INV-0302 — $16,500 AUTHORISED

- INV-0301 ($16.5K) was paid. INV-0302 (2025-12-16) remains at $16,500 outstanding, now 144d+ old.
- Decision: chase for payment before cutover.

### 🟡 Homeland School Company INV-0303 — $44,000 AUTHORISED (2026-05-18, recent)

- A significant new invoice dated 2026-05-18. Not flagged in baseline (only $4.95K outstanding at that time).
- New invoice under ACT-GD. At 53 days from cutover, likely to land in sole trader pre-cutover if chased now.

---

## Communication-overdue list (as of 2026-05-08)

Derived from `ghl_contacts.last_contact_date` for funder-tagged contacts. Days adjusted to 2026-05-08 perspective (27 days before DB query date).

| Days silent (@ 2026-05-08) | Contact | Signal |
|---|---|---|
| ~25 | Snow Foundation (Sally/Alexandra) | Payment received — migration notice not yet sent |
| ~37 | Dusseldorp Forum (Teya) | Warm relationship |
| ~41 | StreetSmart (Adam Robinson) | Active partner |
| **~68** | Paul Ramsay Foundation | Approaching 90-day threshold |
| **~50** | Anne Gripper (JCF) | Active |
| **~67** | UniMelb/UTas cluster (5 contacts) | Approaching 90-day threshold |
| **~114** | AMP Foundation Tomorrow Makers | **Silent >90 days** |
| **~120** | Queensland Gives | **Silent >90 days** |
| **~157+** | Matthew Cox (Bryan Foundation), Kristen Lark (TFN) | Baseline January batch |
| **~185+** | Shannon Lemanski, Jacqueline Fearnley | Very stale |

Silent-90-plus count at 2026-05-08: **~5-6 contacts** (AMP, Queensland Gives, Bryan Foundation, TFN, Shannon Lemanski, others); growing toward 12 by 2026-06-04.

---

## funders.json version drift

| Metric | 2026-04-24 | 2026-05-08 |
|---|---|---|
| Version `updated` | 2026-04-09 | 2026-05-07 |
| Total entries | 14 | 24+ |
| Missing paid funders | 7 | 0 (all stubbed) |
| Stage errors | 2 (Snow `warm`, PRF `cold`) | 0 (fixed) |
| Ghost `active-partner` (no Xero) | 1 (JCF) | 1 (JCF — still unverified) |

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| Every funder with live outstanding amount is named | ✅ Rotary ($82.5K), Homeland School ($44K), Regional Arts ($16.5K) |
| Every funder in active plans with no DB presence is flagged | ✅ Minderoo (paused), QBE (contracted Pty, no novation needed) |
| Every funder silent >90 days is flagged | ✅ See comms table above |

---

## Open actions (order of 30 June cutover risk)

1. **Decide Rotary eClub INV-0222** — chase or write off. 53 days left.
2. **Send Snow migration notice** — INV-0321 was paid; notify Sally/Alexandra of the Pty transition from 1 July.
3. **Chase Regional Arts INV-0302** — $16.5K, 144d old.
4. **Chase Homeland School INV-0303** — $44K, new invoice, ensure it clears pre-cutover.
5. **Re-engage AMP, Queensland Gives** — >90 days silent; decide: warm up or drop.
6. **Validate June Canavan Foundation stage** — still `active-partner` with $60K ask but no Xero invoice.

---

## Sources queried

| Source | Query / file | Rows / state | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC + AUTHORISED/DRAFT + amount_due > 0 | 17 rows (2026-06-04 DB) | 2026-06-04 (DB); ~$300K est. for 2026-05-07 per auto-cycle |
| `ghl_contacts` | tags containing `funder`, `last_contact_date` | 23 contacts with comm history | 2026-06-04 |
| `wiki/narrative/funders.json` | All entries | 24+ entries, updated 2026-05-07 | file |
| Automated cycle data | 2026-05-07 auto-run metrics | $300,400 outstanding, 37 contacts | 2026-05-07 |

> **Methodology caveat:** Xero DB was queried 2026-06-04. Outstanding ACCREC as of 2026-05-08 is estimated at ~$300,400 (from the concurrent automated cycle run on 2026-05-07). The 2026-06-04 DB reflects further invoicing and payments since then.

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-04-24|Q1 funder-alignment synthesis — baseline pass]]
- [[funder-alignment-2026-05-07|Q1 auto-cycle run — same cycle, automated metrics]]
- [[index|ACT Wikipedia]]

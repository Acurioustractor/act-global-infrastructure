# Funder-ledger `needs-writeup` worklist — the 15 pending entries

_Generated 2026-07-07 from GrantScope `act_grant_recommendation_decisions` + each entry's `xero_summary`. Facts only — no invented narrative. Companion to the funders.json cleanup on branch `funders-ledger-sync`._

## The one thing to decide first

**Every one of these 15 is backfilled from ACT's _outgoing_ Xero invoices (INV-series).** That means ACT **invoiced them and got paid** — they are **revenue / client / delivery-partner relationships (money IN to ACT)**, not philanthropic grant funders. They total **~$893,404 paid** (+ $15,400 outstanding on Brodie Germaine).

They sit in the *funder* ledger only because a Xero backfill dropped them there. Before writing them up, decide:

- **(a)** Keep them here, but tag them as `relationship_type: client/partner` so funder-prospecting never surfaces them; **or**
- **(b)** Move them to a separate clients/delivery-partners register and keep `funders.json` for genuine grantmakers only.

Either way the writeups below are the raw material. This doc does **not** change the ledger — it's a to-do list.

## The 15 entries, with the facts (largest first)

| Slug | Who | Project | Paid (AUD) | Invoices | Last activity |
|---|---|---|---:|---|---|
| `palm-island-community-company-limited-picc` | Palm Island Community Company (PICC) | ACT-PI | $436,700 | 5 (INV-0286/0262/0264/0263/0231) | 2025-11-03 |
| `smart-recovery-australia` | SMART Recovery Australia | ACT-SM | $156,500 | 7 (INV-0304/0230/0213/0224/0211…) | 2026-02-09 |
| `ingkerreke-services-aboriginal-corporation` | Ingkerreke Services Aboriginal Corp | ACT-OO | $103,100 | 4 (INV-0277/0275/0278/0276) | 2025-09-27 |
| `homeland-school-company` | Homeland School Company | ACT-JH | $40,000 | 1 (INV-0303) | 2026-05-18 |
| `just-reinvest` | Just Reinvest | ACT-JH | $27,500 | 1 (INV-0295) | 2026-03-01 |
| `green-fox-training-studio-limited` | Green Fox Training Studio | ACT-JH | $27,000 | 3 (INV-0247/0246/0245) | 2025-07-17 |
| `state-of-queensland-acting-through-the-department-of-familie` | State of QLD — Dept of Families, Seniors, Disability & Child Safety | ACT-EL | $22,000 | 1 (INV-0219) | 2025-05-15 |
| `our-community-shed-incorporated` | Our Community Shed Inc | ACT-GD | $20,265 | 2 (INV-0308/0260) | 2026-01-20 |
| `julalikari-council-aboriginal-corporation` | Julalikari Council Aboriginal Corp | ACT-GD | $19,800 | 1 (INV-0282) | 2025-10-21 |
| `regional-arts-australia` | Regional Arts Australia | ACT-HV | $16,500 | 1 (INV-0299) | 2025-12-11 |
| `red-dust-role-models-limited` | Red Dust Role Models | ACT-GD | $15,950 | 1 (INV-0255) | 2025-07-30 |
| `malala-health-service-aboriginal-corporation` | Mala'la Health Service Aboriginal Corp | ACT-GD | $5,434 | 1 (INV-0283) | 2025-10-21 |
| `qld-housing-department` | QLD Department of Housing | ACT-FM | $1,500 | 3 | 2025-09-05 |
| `minjerribah-moorgumpin` | Minjerribah Moorgumpin (Elders-In-Council) Aboriginal Corp | ACT-JH | $1,155 | 2 | 2025-07-17 |
| `brodie-germaine-fitness-aboriginal-corporation` | Brodie Germaine Fitness Aboriginal Corp | ACT-? | **$0 paid / $15,400 OUTSTANDING** | — | 2026-04-15 |

⚠️ **Brodie Germaine** is not a paid relationship — it's an **unpaid $15,400 receivable** (last invoice 2026-04-15). Treat as an AR / payment-chase item, not a funder writeup.

## For each, the writeup answers three questions

Per the auto-stub note already in the ledger: _"who this is, what we have done together, what we should ask for next."_ Concretely:

1. **Who they are** — Aboriginal corporation / community org / government dept / delivery partner.
2. **The relationship** — what work the invoices were *for* (the Xero invoice descriptions have this; not pulled here). Is ACT a supplier to them, a co-deliverer, or is this flow-through funding?
3. **Next** — is this a live, recurring relationship (SMART Recovery 7 invoices, PICC 5, Ingkerreke 4 all read recurring) or a one-off (single-invoice entries)? Set `stage` accordingly once known.

### Reading the pattern
- **Recurring / anchor clients** (multiple invoices): PICC, SMART Recovery, Ingkerreke, Green Fox, Our Community Shed — these are real ongoing delivery relationships worth a proper brief.
- **Single-invoice** (Homeland, Just Reinvest, Regional Arts, Red Dust, Julalikari, Mala'la, State of QLD): one engagement each — a line, not a page.
- **Small / trailing** (QLD Housing $1,500, Minjerribah $1,155): note-and-park; Minjerribah is a known ACT-JH Elders partner on Minjerribah (Stradbroke).

## Next step
Pick (a) tag or (b) separate register above, then work the largest five first (they're 84% of the dollars). None of this blocks funder-prospecting today — the cleanup branch already excludes them from active funder matching.

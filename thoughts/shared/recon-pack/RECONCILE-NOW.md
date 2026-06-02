# RECONCILE NOW — NAB Visa ACT #8815 cheat-sheet

_Generated 2026-06-02 from the live mirror. Work top-to-bottom in Xero → Bank accounts → NAB Visa ACT #8815 → Reconcile. The API can't click reconcile, so these are your one-by-one calls made trivial._

**Finish line:** Statement Balance **$6,792.20** (correct). Balance in Xero **−$77,152.97**. The gap closes as the 467 lines reconcile — Phase 1 (the repayments) moves the most.

**Two standing rules:** (1) Never bulk "OK"/"Reconcile all" — Xero suggests on *amount, not date*. (2) Set the **Project** tracking on every line ("Project Track" placeholder = not set = won't roll up).

---

## Phase 0 — Void 3 phantom bills (UI, can't be done by API)
*Business → Bills to pay → Awaiting payment → open → Bill Options ▾ → Void.*
- The Sand Yard **$1,968.00** (8 Dec, ref MOUNTY-2c70ebf6)
- The Sand Yard **$1,044.44** (8 Dec, ref MOUNTY-31621d01)
- Edmonds Landscaping **$360.00** (2 Dec, ref MOUNTY-3ef368da)

Their real card charges stay and reconcile in Phase 3. (If Xero blocks on "contact archived", void still usually works from the bill page; last resort restore the contact, void, re-archive — note there's already an *active* "The Sand Yard".)

---

## Phase 1 — Repayments → **Transfer** from "NJ Marchesi T/as ACT Everyday" (~$379.8K, biggest lever)
For each, use the **Transfer** tab → from *ACT Everyday*. No account, no GST, no project. If **Find & Match** offers the matching outgoing payment from Everyday, use that instead (avoids a duplicate transfer).

| Date | Amount | | Date | Amount |
|---|--:|---|---|--:|
| 2025-10-06 | 9,883.63 | | 2025-11-21 | 6,159.00 |
| 2025-10-13 | 1,709.35 | | 2025-11-24 | 30,000.00 |
| 2025-10-13 | 6,000.00 | | 2025-11-26 | 5,163.46 |
| 2025-10-14 | 5,000.00 | | 2025-11-26 | 1,974.50 |
| 2025-10-20 | 5,409.00 | | 2025-11-27 | 20,000.00 |
| 2025-10-21 | 10,000.00 | | 2025-12-01 | 30,000.00 |
| 2025-10-21 | 15,060.00 | | 2025-12-10 | 40,000.00 |
| 2025-10-27 | 10,000.00 | | 2025-12-23 | 15,000.00 |
| 2025-11-03 | 6,015.00 | | 2025-12-29 | 10,000.00 |
| 2025-11-04 | 9,800.00 | | 2025-12-30 | 10,000.00 |
| 2025-11-11 | 1,497.50 | | 2026-01-05 | 10,000.00 |
| 2025-11-11 | 23,875.00 | | 2026-01-06 | 10,000.00 |
| 2025-11-17 | 15,000.00 | | 2026-01-12 | 10,000.00 |
| 2025-11-17 | 6,000.00 | | 2026-01-21 | 20,000.00 |
| 2025-11-19 | 6,000.00 | | 2026-03-09 | 9,000.00 |
| 2025-11-19 | 5,000.00 | | | |
| 2025-11-19 | 10,000.00 | | | |
| 2025-11-19 | 6,295.93 | | | |

---

## Phase 2 — Merchant refunds (~26 credit lines, ~$12.3K) → Match / offset
These are credits *from a merchant* (a refund of a card charge), not repayments. Reconcile each to its credit note, or offset the matching debit. **Charge+refund pairs that cancel out** — reconcile them against each other:
- **Airbnb $2,324.80** refund (28 Nov) ↔ the $2,324.80 Airbnb *charge* in the danger cluster → they net to zero (so the Airbnb charge is **not** a real bill to pay — offset it against this refund).
- **Airbnb $151.11**, **Bunnings $1,494.92**, **Kennards $71.50 / $318 / $570**, **Qantas $1,547.59 / $1,242.84 / $15.10**, **Thrifty $90.70 / $260.18** — check each for a matching debit of the same amount.
- Others (Novotel $239, AAMI $177.77, OpenAI $30.88, Holafly $144.61, Kadmium $771, Bunnings $501.62/$942.96/$228.64/$135.70, B&S Hardware $131.59, Alice Springs Casino $147.25, SP DTF $87.89, Uber $25, Ampol $5, A Curious Tractor $600) → Receive Money coded to the **same account as the original purchase** (a refund reverses the expense).

---

## Phase 3 — Debit spend by vendor (already coded — confirm & reconcile per batch)
Search the vendor in the box, then per line **Find & Match** to its existing spend-money (one click) or **Create** with the code below. `✅` = single project, batch the lot. `⚠️` = project varies, pick per line. `🔧` = needs a decision (see below).

| Vendor | Lines | $ | Account | Tax | Project | |
|---|--:|--:|---|---|---|---|
| Qantas | 36 | 30,764 | 493 Travel-National | GST | (7 projects) | ⚠️ pick project/line |
| RNM Carpentry | 1 | 26,846 | 486 Sub-contractors | GST | ACT-OO | ✅ |
| Defy Manufacturing | 4 | 15,690 | 400 Advertising&Mktg | GST | ACT-GD | 🔧 acct looks wrong |
| 1300 Washer | 1 | 13,980 | 446 Materials&Supplies | GST | ACT-GD | ✅ |
| Carla Furnishers | 1 | 11,180 | 446 Materials&Supplies | GST | ACT-GD | ✅ |
| Sunshine Glamping | 1 | 9,250 | 432 Hire Expenses | GST | ACT-DL | ✅ |
| Virgin Australia | 2 | 9,108 | — none — | — | ACT-IN | 🔧 code 493 Travel |
| Kennedy's | 1 | 8,595 | 446 Materials&Supplies | GST | ACT-HV | ✅ |
| Elders Insurance | 1 | 8,361 | 433 Insurance | Exempt | ACT-FM | ✅ |
| Kennards Hire | 4 | 8,203 | 432 Hire Expenses | GST | ACT-HV | ⚠️ 2 projects |
| Container Options | 1 | 5,803 | 750 Plant&Equipment | CAPEX | ACT-MY | ✅ |
| AAMI | 1 | 5,484 | 433 Insurance | GST | ACT-GD | ✅ |
| Nicholas Marchesi | 2 | 5,075 | 490 Veterinary | Exempt | ACT-FM | 🔧 acct looks wrong |
| Imprint5 | 1 | 3,716 | 446 Materials&Supplies | Exempt | ACT-SM | ✅ |
| Hatch Electrical | 1 | 3,677 | 486 Sub-contractors | GST | ACT-PI | ✅ |
| Thrifty | 5 | 3,400 | 493 Travel-National | GST | ACT-GD | ⚠️ 2 projects |
| Longara | 1 | 3,155 | 493 Travel-National | GST | ACT-HV | ✅ |
| Avis | 6 | 2,884 | 452 Parking/Tolls/Taxis | GST | ACT-GD | ⚠️ 3 projects |
| _(blank vendor)_ | 4 | 2,698 | — none — | — | — | 🔧 identify |
| Carbatec Brisbane | 1 | 2,339 | 446 Materials&Supplies | GST | ACT-HV | ✅ |
| Allclass | 1 | 1,949 | 448 Farm Equip-Fuel | GST | ACT-FM | ✅ |
| Qantas Group Accom | 5 | 1,568 | 493 Travel-National | GST | ACT-GD | ⚠️ 2 projects |
| Bunnings Warehouse | 2 | 1,545 | 446 Materials&Supplies | GST | ACT-IN | ⚠️ 2 projects |
| Uber | 36 | 1,536 | 452 Parking/Tolls/Taxis | GST | (5 projects) | ⚠️ pick project/line |
| NT Government | 1 | 1,459 | 450 MV-Rego&Insurance | GST | ACT-GD | ✅ |
| Carbatec QLD | 1 | 1,319 | 446 Materials&Supplies | GST | ACT-GD | ✅ |
| Tennant Creek Caravan Pk | 1 | 1,275 | — none — | — | ACT-GD | 🔧 code 493 Travel |
| TNT Plastering | 1 | 1,200 | 473 Repairs&Maint | Exempt | ACT-PI | ✅ |
| Fisher's Oysters | 1 | 1,120 | 423 Catering | Exempt | ACT-HV | ✅ |
| Dept Transport (TMR) | 1 | 1,058 | 450 MV-Rego&Insurance | Exempt | ACT-IN | ✅ |
| Rustical Travel Madrid | 1 | 878 | — none — | — | ACT-OO | 🔧 493 Travel, GST-Free (overseas) |
| Maleny Hardware | 11 | 806 | 446 Materials&Supplies | GST | ACT-FM | ⚠️ 3 projects |
| Budget Car (NT) | 1 | 744 | 493 Travel-National | Exempt | ACT-GD | ✅ |
| Woodford Folk Festival | 1 | 726 | 486 Sub-contractors | Exempt | ACT-HV | ✅ |
| Cactus Jacks Bar | 1 | 709 | 421 Light meals | GST | ACT-UA | ✅ |

_(…tail of ~105 smaller vendors below the $700 line — NAB, Coles, Webflow, Supabase, Nest In Witta, etc. — same pattern; lines < $82.50 need no tax invoice. Full list: `worklist-2-DIY-no-bill-batches.md`.)_

---

## Decisions I need from you (then I recode them via API so your reconcile is clean)
The API **can** recode account/tax/project on a spend-money (just not click reconcile). Tell me the calls and I'll batch them:
1. **Defy Manufacturing** (4 lines, $15.7K, ACT-GD) coded **400 Advertising & Marketing** — for Goods manufacturing that looks wrong. Materials (446)? COGS? →
2. **Nicholas Marchesi** (2 lines, $5,075, ACT-FM) coded **490 Veterinary** — reimbursement? what account? →
3. **Nest In Witta** coded **409 Client to Advise** (suspense) — real account + project? (accommodation?) →
4. **Virgin Australia** ($9.1K), **Tennant Creek Caravan Park** ($1,275), **Rustical Travel Madrid** ($878, overseas→GST-Free) — confirm **493 Travel**? →
5. **Blank-vendor** 4 lines ($2,698) — who are these? (I can pull dates+refs to ID them) →
6. **Qantas / Uber / Avis** — projects vary per line. Want me to pull each line (date + amount + receipt hint) so we assign the trip/project, or default them to the dominant project? →

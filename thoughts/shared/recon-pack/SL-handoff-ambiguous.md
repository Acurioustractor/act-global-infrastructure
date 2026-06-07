# Standard Ledger handoff — NAB Visa #8815 ambiguous cluster (void-bill + keep spend-money)

**What these are:** each is ONE purchase recorded twice — an unpaid AUTHORISED bill (an `auto-pushed dext_import` phantom) + an unreconciled card spend-money (real vendor ref). **Resolution: VOID the phantom bill, keep the spend-money** (BAS-neutral — bills unpaid on cash basis; clears phantom AP). Then the card statement line matches the spend-money.

**Totals:** 54 pairs, $110261.37. A(agree)=3 · B(spend-money coding wins)=19 · C(BEN project call)=24 · D(not auto-dext, verify)=8.

## C — BEN must confirm project (both sides specific, conflicting) — 24 ($64090.60)

| $ | date | vendor | sm ref | dates Δ | spend-money code | bill code | action |
|--:|---|---|---|--:|---|---|---|
| 26845.65 | 2025-11-11 | RNM CARPENTRY | INV-0146 | 0d | 486·A Curious Tractor/ACT-OO — Oonchiumpa | 400·A Curious Tractor/ACT-HV — The Harvest Witta | C |
| 9250 | 2025-10-19 | Sunshine Glamping Co | I_SG25_071 | 1d | 432·A Curious Tractor/ACT-DL — DadLab | 493·A Curious Tractor/ACT-FM — The Farm | C |
| 6616 | 2025-12-08 | Kennards Hire | 28207657 | 1d | 432·A Curious Tractor/ACT-MY — Mounty Yarns | 446·A Curious Tractor/ACT-HV — The Harvest Witta | C |
| 5802.5 | 2025-12-05 | Container Options | 00066927 | 1d | 750·A Curious Tractor/ACT-MY — Mounty Yarns | 446·A Curious Tractor/ACT-MY — Mounty Yarns | C |
| 3199.83 | 2025-12-19 | Defy Manufacturing | INV-1558 | 1d | 412·A Curious Tractor/ACT-GD — Goods | 446·A Curious Tractor/ACT-GD — Goods | C |
| 2338.7 | 2026-01-06 | Carbatec Brisbane | 4901124 | 1d | 446·A Curious Tractor/ACT-GD — Goods | 446·A Curious Tractor/ACT-HV — The Harvest Witta | C |
| 2324.8 | 2025-11-26 | Airbnb | RCHXXK2NSN | 1d | 493·A Curious Tractor/ACT-PI — PICC | 493·A Curious Tractor | C |
| 1858.78 | 2025-11-28 | Defy Manufacturing | INV-1518 | 1d | 400·A Curious Tractor/ACT-GD — Goods | 446·A Curious Tractor/ACT-GD — Goods | C |
| 1319 | 2026-01-12 | Carbatec QLD Warehouse | 4902412 | 1d | 446·A Curious Tractor/ACT-GD — Goods | 446·A Curious Tractor/ACT-HV — The Harvest Witta | C |
| 1236.5 | 2025-11-10 | Kennards Hire | 28093941 | 1d | 432·A Curious Tractor/ACT-OO — Oonchiumpa | 446·A Curious Tractor/ACT-HV — The Harvest Witta | C |
| 1200 | 2025-12-03 | TNT Plastering & Maintenance | IV00402 | 1d | 473·A Curious Tractor/ACT-PI — PICC | 400·A Curious Tractor/ACT-HV — The Harvest Witta | C |
| 725.73 | 2025-12-28 | Woodford Folk Festival | WOO-2025-93708592 | 1d | 486·A Curious Tractor/ACT-HV — The Harvest Witta | 415·A Curious Tractor/ACT-HV — The Harvest Witta | C |
| 370 | 2026-01-25 | Tullah Lakeside Lodge | BB26012519913325 | 1d | 494·A Curious Tractor/ACT-IN — ACT Infrastructure | 493·A Curious Tractor/ACT-IN — ACT Infrastructure | C |
| 244 | 2025-10-10 | Kennards Hire | 27976821 | 1d | 432·A Curious Tractor/ACT-GD — Goods | 446·A Curious Tractor/ACT-HV — The Harvest Witta | C |
| 151.31 | 2026-03-27 | Mol Nyrt Altal Kepviselt Afacsoport | 61000 001 0021 00679 | 0d | 493·- | 493·A Curious Tractor/ACT-IN — ACT Infrastructure | C |
| 151.11 | 2025-11-26 | Airbnb | RCW8S3QBZE | 1d | 493·A Curious Tractor/ACT-PI — PICC | 493·A Curious Tractor | C |
| 144 | 2025-12-19 | Super Publishing Co | 75F5FA8B-0029 | 1d | 400·A Curious Tractor/ACT-IN — ACT Infrastructure | 429·- | C |
| 106 | 2025-12-12 | Kennards Hire | 28225267 | 1d | 432·A Curious Tractor/ACT-GD — Goods | 446·A Curious Tractor/ACT-HV — The Harvest Witta | C |
| 65.64 | 2026-01-15 | Maleny Hardware And Rural Supplies | 189333 | 1d | 446·Farm Activities/ACT-FM — The Farm | 446·A Curious Tractor/ACT-HV — The Harvest Witta | C |
| 44.9 | 2025-11-30 | Sunshine Coast Council | 209438 | 1d | 467·A Curious Tractor/ACT-PI — PICC | 467·A Curious Tractor/ACT-FM — The Farm | C |
| 40.19 | 2026-01-16 | Maleny Hardware And Rural Supplies | 189688 | 1d | 446·A Curious Tractor/ACT-GD — Goods | 446·A Curious Tractor/ACT-HV — The Harvest Witta | C |
| 21.71 | 2025-11-28 | Maleny Hardware And Rural Supplies | 180989 | 1d | 446·Farm Activities/ACT-FM — The Farm | 446·A Curious Tractor/ACT-HV — The Harvest Witta | C |
| 19.25 | 2025-11-17 | Maleny Hardware And Rural Supplies | 178733 | 1d | 446·Farm Activities/ACT-FM — The Farm | 446·A Curious Tractor/ACT-HV — The Harvest Witta | C |
| 15 | 2025-12-01 | X Global LLC | HVRABFE0-0001 | 1d | 485·A Curious Tractor/ACT-IN — ACT Infrastructure | 485·A Curious Tractor | C |

## D — NOT auto-dext: verify real-vs-phantom before voiding — 8 ($3553.48)

| $ | date | vendor | sm ref | dates Δ | spend-money code | bill code | action |
|--:|---|---|---|--:|---|---|---|
| 1968 | 2025-12-09 | The Sand Yard | INV-13350 | 1d | 446·A Curious Tractor/ACT-MY — Mounty Yarns | 429·ACT-MY — Mounty Yarns | D |
| 1044.44 | 2025-12-09 | The Sand Yard | INV-13358 | 1d | 446·A Curious Tractor/ACT-MY — Mounty Yarns | 429·ACT-MY — Mounty Yarns | D |
| 360 | 2025-12-03 | Edmonds Landscaping Supplies | 000003 | 1d | 446·A Curious Tractor/ACT-PI — PICC | 429·ACT-MY — Mounty Yarns | D |
| 74 | 2025-10-01 | Qantas | DRTLFP | 0d | 493·A Curious Tractor/ACT-EL — Empathy Ledger | 493·- | D |
| 42.96 | 2026-03-11 | Uber | RB19874820270 | 8d | 452·A Curious Tractor/ACT-GD — Goods | 452·- | D |
| 39.8 | 2026-02-07 | F V Snowdon And J R Rowden | RB19543402030 | 14d | 421·ACT-GD — Goods | 446·Farm Activities | D |
| 17.11 | 2026-02-07 | Bitwarden | MOZLLRUU-0003 | 0d | 485·ACT-DO — Designing for Obsolescence | 485·A Curious Tractor | D |
| 7.17 | 2026-03-23 | Railway Corporation | PADMUZCI-0010 | 0d | 485·ACT-IN — Infrastructure | 493·A Curious Tractor | D |

## B — spend-money coding wins (bill is catch-all) → SL voids bill — 19 ($17439.30)

| $ | date | vendor | sm ref | dates Δ | spend-money code | bill code | action |
|--:|---|---|---|--:|---|---|---|
| 5483.95 | 2025-12-27 | AAMI | RB19199218810 | 1d | 433·A Curious Tractor/ACT-GD — Goods | 433·A Curious Tractor/ACT-IN — ACT Infrastructure | B |
| 3677.34 | 2025-12-11 | Hatch Electrical | 786 | 1d | 486·A Curious Tractor/ACT-PI — PICC | 429·A Curious Tractor/ACT-FM — The Farm | B |
| 1948.9 | 2025-11-26 | Allclass | 416730 | 1d | 448·Farm Activities/ACT-FM — The Farm | 429·A Curious Tractor/ACT-IN — ACT Infrastructure | B |
| 1587.45 | 2025-11-26 | Allclass | 416729 | 1d | 448·Farm Activities/ACT-FM — The Farm | 429·A Curious Tractor/ACT-IN — ACT Infrastructure | B |
| 1494.92 | 2025-11-08 | Bunnings Warehouse | RB18631344310 | 0d | 446·A Curious Tractor/ACT-OO — Oonchiumpa | 446·A Curious Tractor/ACT-IN — ACT Infrastructure | B |
| 1200 | 2025-11-07 | Nicholas Marchesi | 32 | 1d | 490·A Curious Tractor/ACT-OO — Oonchiumpa | 429·A Curious Tractor/ACT-IN — ACT Infrastructure | B |
| 345.51 | 2026-01-30 | Thrifty | 76132176–1 | 1d | 493·A Curious Tractor/ACT-GD — Goods | 493·A Curious Tractor/ACT-IN — ACT Infrastructure | B |
| 317.98 | 2025-11-21 | Budget | 349744231 | 1d | 493·A Curious Tractor/ACT-HV — The Harvest Witta | 493·- | B |
| 238.7 | 2025-11-21 | Sunnymead Hotel | 114179 | 1d | 452·A Curious Tractor/ACT-HV — The Harvest Witta | 493·- | B |
| 218 | 2025-11-14 | Access Auto Electrics & Air Conditioning | 79304 | 1d | 451·Farm Activities/ACT-FM — The Farm | 429·- | B |
| 155.46 | 2025-10-09 | Darwin City Hotel | 28022 | 1d | 494·A Curious Tractor/ACT-GD — Goods | 493·- | B |
| 155 | 2025-11-15 | BAR OLO | RB18703082340 | 1d | 421·A Curious Tractor/ACT-OO — Oonchiumpa | 429·- | B |
| 127.66 | 2025-11-21 | Budget | 349746261 | 1d | 493·A Curious Tractor/ACT-HV — The Harvest Witta | 493·A Curious Tractor/ACT-IN — ACT Infrastructure | B |
| 119 | 2026-01-21 | Adam's Bits | 35230 | 1d | 446·A Curious Tractor/ACT-GD — Goods | 429·A Curious Tractor/ACT-IN — ACT Infrastructure | B |
| 100 | 2025-12-17 | Bunnings Warehouse | 014-21050-8056-2025-12-17 | 1d | 446·A Curious Tractor/ACT-GD — Goods | 446·A Curious Tractor/ACT-IN — ACT Infrastructure | B |
| 81.1 | 2026-03-29 | Pocky Asian Restaurant | RB20570585740 | 0d | 421·A Curious Tractor | 429·- | B |
| 67.98 | 2025-11-30 | Google Australia | 5424016027 | 1d | 485·A Curious Tractor/ACT-HV — The Harvest Witta | 485·A Curious Tractor/ACT-IN — ACT Infrastructure | B |
| 64.35 | 2025-10-11 | Soul Essence On The Bay | 11797 | 1d | 421·A Curious Tractor/ACT-GD — Goods | 429·- | B |
| 56 | 2025-10-28 | Dialpad | 5493330267324416 | 0d | 485·A Curious Tractor | 485·A Curious Tractor/ACT-IN — ACT Infrastructure | B |

## A — coding agrees → SL voids bill — 3 ($25177.99)

| $ | date | vendor | sm ref | dates Δ | spend-money code | bill code | action |
|--:|---|---|---|--:|---|---|---|
| 13980 | 2025-12-16 | 1300 Washer | I0016086 | 1d | 446·A Curious Tractor/ACT-GD — Goods | 446·A Curious Tractor/ACT-GD — Goods | A |
| 11180 | 2025-11-17 | Carla Furnishers | 25-00004816 | 1d | 446·A Curious Tractor/ACT-GD — Goods | 446·A Curious Tractor/ACT-GD — Goods | A |
| 17.99 | 2026-03-25 | Canva | 04831-8542989 | 0d | 485·A Curious Tractor/ACT-IN — ACT Infrastructure | 485·A Curious Tractor/ACT-IN — ACT Infrastructure | A |

---

## D-group VERIFIED (2026-06-02) — re-checked dates/refs/amounts per pair

**4 confirmed phantoms → VOID bill, keep spend-money:**
- The Sand Yard $1968 (bill `MOUNTY-2c70ebf6`, same date/amt/project)
- The Sand Yard $1044.44 (bill `MOUNTY-31621d01`, same date/amt/project)
- Qantas $74 (bill empty ref, same date+exact amount, project 493)
- Bitwarden $17.11 (bill invoice# `MOZLLRUU-0003` = spend-money ref → same charge; keep spend-money ACT-DO)

**1 phantom but BEN project call:**
- Edmonds Landscaping $360 (bill `MOUNTY-` phantom; spend-money=PICC vs bill=Mounty Yarns)

**3 NOT duplicates — DO NOT VOID (coincidental-amount false matches):**
- Uber $42.96 vs bill $43.28, 8 days apart, different Dext refs → two separate rides.
- F V Snowdon & J R Rowden $39.80 vs bill $38.85 (real invoice# 195821), 14 days apart → bill is likely a REAL separate payable; the card charge is its own line. SL: treat the bill as real.
- Railway Corporation $7.17 vs bill $5 (`auto-pushed gmail`), amount mismatch → review individually.

**Revised cluster: 51 genuine void-bill pairs (was 54; 3 false matches removed).**

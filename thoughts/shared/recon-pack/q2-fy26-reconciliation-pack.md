# Q2 FY26 — NAB Visa #8815 Reconciliation Pack

**Generated:** 2026-06-01 · **Period:** 1 Oct – 31 Dec 2025 · **Status:** prepared, READ-ONLY.
Source of truth: the reconcile cockpit (`/finance/reconcile`) + agent verification/coding (workflow run wf_d50f6372). The Xero API cannot set IsReconciled — match/reconcile clicks stay in Xero. Every CREATE coding is a *proposal to confirm*, not applied.

## What you actually have to do (effort, not line count)

| Tier | What | Lines | Value | Your effort |
|---|---|---|---|---|
| 🟢 Mechanical | delete dups · match bills · already-in-Xero · transfers · high-conf creates | 87 | — | execute/confirm, ~no thinking |
| 🟡 Skim-confirm | medium-confidence creates with a clear single project guess | 67 | $80,799 | quick yes/no each |
| 🔴 Decide | low-confidence + personal? + unknown vendor | 92 | $20,517 | real attention |

The 🔴 Decide tier shrinks every quarter as the learning loop fills in vendor→project (this is the point of the weekly system).

## Money map (reconciles to the unreconciled total)

| Bucket | Lines | Value |
|---|---|---|
| ♻️ Duplicates (confirmed → delete card txn) | 22 | $18,162.40 |
| ⚠️ Duplicate candidates REJECTED (do NOT delete) | 2 | $103.64 |
| 🔗 Match to bill/txn | 17 | $25,563.89 |
| ✅ Already in Xero (verify) | 14 | $1,090.67 |
| 🆕 Create (coded) | 186 | $124,792.43 |
| **Total unreconciled** | **241** | **$169,713.03** |

## 1 · 🟢 Delete these duplicates (22) — recover $18,162.40
Match the bank line to the bill, then DELETE the duplicate card txn. Add any surcharge as an Adjustment.

| Date | Vendor | Bank amt | Bill (status) / surcharge |
|---|---|---|---|
| 2025-12-01 | Airbnb | $4,621.18 | Airbnb (PAID) |
| 2025-12-01 | Kennards Hire | $3,745.00 | Kennards Hire (PAID) |
| 2025-12-24 | Defy Design | $3,598.09 | Defy (PAID) |
| 2025-12-22 | Defy Design | $3,260.63 | Defy (PAID) |
| 2025-10-28 | DINKUM DUNNIES CABOOLTURE | $534.19 | Onsite Rentals Dinkum Dunnies (AUTHORISED) · +$9.19→Adj ⚠️medium |
| 2025-11-18 | Budget Rent A Car | $518.18 | Budget (PAID) |
| 2025-10-07 | CENTRE TRAILER SALES CICCONE | $424.91 | Centre Trailer Sales (AUTHORISED) · +$4.91→Adj ⚠️medium |
| 2025-11-12 | AGL | $319.09 | AGL (PAID) |
| 2025-12-17 | Iris Todd Operations | $197.47 | Todd Tavern (PAID) ⚠️medium |
| 2025-12-15 | Budget Rent A Car | $177.36 | Budget Car and Truck Rental (NT) (PAID) |
| 2025-11-26 | Budget Rent A Car | $148.03 | Budget Car and Truck Rental (NT) (PAID) |
| 2025-11-17 | LOTTE TRAVEL RETAIL MELBOURNE AI | $131.69 | Lotte Duty Free (PAID) |
| 2025-12-15 | The Roastery Cafe | $81.97 | The Roastery Cafe (PAID) |
| 2025-12-15 | Duyu Coffee Roasters | $73.67 | DuYu Coffee (PAID) |
| 2025-12-23 | Bank St + Co | $67.70 | BANK ST AND CO (PAID) |
| 2025-12-04 | Liberty | $61.42 | Liberty Idalia (PAID) |
| 2025-12-02 | Good Morning Coffee | $55.96 | Hermit Park - Good Morning Coffee (PAID) ⚠️medium |
| 2025-11-03 | Google GSUITE_theharvestwSydney | $51.54 | Google Australia (PAID) |
| 2025-12-16 | J R Rowden | $37.84 | F V Snowdon And J R Rowden (AUTHORISED) · +$0.34→Adj ⚠️medium |
| 2025-12-17 | Duyu Coffee Roasters | $22.26 | DuYu Coffee (PAID) |
| 2025-12-15 | The Roastery Cafe | $19.23 | The Roastery Cafe (PAID) |
| 2025-12-08 | Apple | $14.99 | Apple Pty Ltd (PAID) |

### ⚠️ DO NOT delete — rejected candidates (2)
- **Good Morning Coffee** $58.74 — _collision_: Same bill contact+amount ($55.96, Hermit Park - Good Morning Coffee) as candidate 71b793dd. Two card lines match one bill; this line's stated amount $58.74 differs from bill $55.96, so the other (exact $55.96) is the true match and this is the collision.
- **Townsville City Council** $44.90 — _different_merchant_: Card vendor Townsville City Council differs from bill contact Sunshine Coast Council — different council entities, not the same merchant despite equal $44.90.

## 2 · 🟢 Match to existing bill/txn (17)

| Date | Vendor | Bank amt | Match → |
|---|---|---|---|
| 2025-12-24 | Telford Smith Engine | $19,800.00 | Telford Smith Engineering (bill PAID) |
| 2025-12-04 | Bunnings | $2,885.90 | Bunnings Warehouse (bill PAID) |
| 2025-12-08 | Cactus Jacks | $717.50 | Cactus Jacks Bar and Grill (card txn) · +$8.65 surcharge |
| 2025-12-03 | Bunnings | $632.52 | Bunnings Warehouse (bill PAID) |
| 2025-12-12 | Bunnings | $548.81 | Bunnings Warehouse (bill PAID) |
| 2025-10-08 | Coles | $296.50 | Coles Supermarkets (bill PAID) · +$1.95 surcharge |
| 2025-12-30 | Piggyback | $160.30 | Piggyback (card txn) · +$1.60 surcharge |
| 2025-12-03 | Good Morning Coffee | $138.20 | Hermit Park - Good Morning Coffee (bill PAID) |
| 2025-12-04 | Bunnings | $131.58 | Bunnings Warehouse (bill PAID) |
| 2025-12-17 | Hanuman Restaurant | $77.72 | Hanuman Alice Springs (card txn) · +$1.22 surcharge |
| 2025-10-31 | SQ *THE MALENY PIE GUY HQmaleny | $45.50 | Maleny Hardware And Rural Supplies (bill AUTHORISED) · +$-0.25 surcharge |
| 2025-12-29 | Apple | $29.99 | Apple Pty Ltd (bill PAID) |
| 2025-10-22 | CAFE MIA EDGECLIFF | $23.58 | Cafe Mia (bill AUTHORISED) · +$0.28 surcharge |
| 2025-12-15 | Kmart | $22.00 | Kmart (bill PAID) |
| 2025-12-15 | Kmart | $21.00 | Kmart (bill PAID) |
| 2025-11-13 | SMP*EzyMart Grey St f3 South Bri | $20.61 | Ezymart Felix (bill AUTHORISED) · +$0.33 surcharge |
| 2025-10-13 | ZLR*Uncle Don West End South Bri | $12.18 | Uncle Don West End (bill PAID) · +$0.18 surcharge |

## 3 · 🟢 Already in Xero — verify, do NOT create (14)

| Date | Vendor | Bank amt | Recommendation [conf] |
|---|---|---|---|
| 2025-11-24 | Descript | $447.62 | likely_stale_duplicate_bankline [high] |
| 2025-10-22 | Virgin Australia | $385.79 | likely_stale_duplicate_bankline [high] |
| 2025-10-06 | LinkedIn | $74.99 | likely_stale_duplicate_bankline [high] |
| 2025-10-13 | Codeguide | $44.84 | likely_stale_duplicate_bankline [high] |
| 2025-10-06 | Belong | $35.00 | likely_stale_duplicate_bankline [high] |
| 2025-10-07 | Squarespace | $23.50 | likely_stale_duplicate_bankline [high] |
| 2025-12-22 | Ezviz | $14.99 | likely_stale_duplicate_bankline [high] |
| 2025-11-20 | Ezviz | $14.99 | likely_stale_duplicate_bankline [high] |
| 2025-10-02 | DocPlay | $9.99 | likely_stale_duplicate_bankline [high] |
| 2025-10-01 | Linktree | $8.20 | likely_stale_duplicate_bankline [high] |
| 2025-12-18 | The Beach Hotel | $8.13 | verify [low] |
| 2025-11-03 | Linktree | $8.05 | likely_stale_duplicate_bankline [high] |
| 2025-10-24 | Railway | $7.72 | likely_stale_duplicate_bankline [high] |
| 2025-10-06 | SQ *GREMLIN GROUNDS Maleny | $6.86 | likely_stale_duplicate_bankline [high] |

## 4 · 🟢 Create — bulk-confirm (high confidence: 24 + 10 transfers)

| Date | Vendor | Amt | → Project · Account |
|---|---|---|---|
| 2025-12-17 | ATO | $13,345.90 | ACT-IN · tax |
| 2025-10-24 | Internet Transfer | $3,500.00 | ACT-IN · transfer/exclude |
| 2025-10-24 | Internet Transfer | $2,000.00 | ACT-IN · transfer/exclude |
| 2025-11-27 | Internet Transfer | $1,166.00 | ACT-IN · transfer/exclude |
| 2025-10-27 | Internet Transfer | $1,100.00 | ACT-IN · transfer/exclude |
| 2025-10-23 | Internet Transfer | $623.70 | ACT-IN · transfer/exclude |
| 2025-10-30 | Internet Transfer | $360.00 | ACT-IN · transfer/exclude |
| 2025-10-06 | Internet Transfer | $260.00 | ACT-IN · transfer/exclude |
| 2025-11-04 | Internet Banking Transfer | $202.16 | ACT-IN · transfer/exclude |
| 2025-11-04 | Internet Banking Transfer | $152.59 | ACT-IN · transfer/exclude |
| 2025-12-22 | Supabase | $119.77 | ACT-IN · Software & Subscriptions |
| 2025-12-15 | Xero | $75.00 | ACT-IN · 485 - Subscriptions |
| 2025-11-13 | Xero | $75.00 | ACT-IN · 485 - Subscriptions |
| 2025-10-13 | Xero | $75.00 | ACT-IN · 485 - Subscriptions |
| 2025-11-24 | Squarespace | $72.90 | ACT-IN · 485 - Subscriptions |
| 2025-10-27 | Cabcharge | $65.16 | ACT-IN · 452 - Taxis |
| 2025-11-04 | Internet Banking Transfer | $45.80 | ACT-IN · transfer/exclude |
| 2025-11-13 | Codeguide | $44.53 | ACT-IN · Software & Subscriptions |
| 2025-12-15 | Codeguide | $43.78 | ACT-IN · Software & Subscriptions |
| 2025-12-01 | OpenAI | $33.75 | ACT-IN · Subscriptions |
| 2025-10-29 | OpenAI | $33.63 | ACT-IN · Subscriptions |
| 2025-12-29 | OpenAI | $32.86 | ACT-IN · Subscriptions |
| 2025-12-29 | Audible | $16.45 | ACT-IN · 880 - Drawings |
| 2025-11-26 | Audible | $16.45 | ACT-IN · 880 - Drawings |
| 2025-10-27 | Audible | $16.45 | ACT-IN · 880 - Drawings |
| 2025-10-30 | NAB Cash Advance Fee | $12.60 | ACT-IN · 404 - Bank Fees |
| 2025-12-22 | Squarespace | $11.80 | ACT-IN · 485 - Subscriptions |
| 2025-11-24 | Squarespace | $11.80 | ACT-IN · 485 - Subscriptions |
| 2025-10-22 | Squarespace | $11.80 | ACT-IN · 485 - Subscriptions |
| 2025-12-16 | Amazon Prime | $9.99 | ACT-IN · 880 - Drawings |
| 2025-12-02 | DocPlay | $9.99 | ACT-IN · 880 - Drawings |
| 2025-11-17 | Amazon Prime | $9.99 | ACT-IN · 880 - Drawings |
| 2025-10-16 | Amazon Prime | $9.99 | ACT-IN · Drawings |
| 2025-11-04 | NAB Interest | $0.84 | ACT-IN · Interest & Bank Charges |

## 5 · 🟡 Create — skim-confirm (medium: 67)
Clear single guess; confirm the project/site is right.

| Date | Vendor | Amt | → Project · Account | Note |
|---|---|---|---|---|
| 2025-11-24 | Hatch Electrical | $27,201.35 | ACT-PI · Building & Site Work | Hatch Electrical $27,201.35 — large electrical works, likely |
| 2025-11-12 | Hatch Electrical | $20,244.64 | ACT-PI · Building & Site Work | Hatch Electrical $20,244.64 — clustered with the other Hatch |
| 2025-12-09 | Container Options | $5,904.05 | ACT-MY · Building & Site Work | Container Options $5,904.05 — site fit-out/container per gui |
| 2025-11-18 | Carla Furnishers | $5,590.00 | ACT-GD · Furniture & Fit-out | Carla Furnishers $5,590 — furnishings/fit-out per guidance,  |
| 2025-12-12 | Hatch Electrical | $3,732.43 | ACT-PI · Building & Site Work | Hatch Electrical $3,732.43 — same vendor cluster, assigned t |
| 2025-12-10 | Kennards Hire | $2,871.00 | ACT-MY · Plant & Equipment Hi | Kennards Hire $2,871 — plant hire per guidance, likely Mount |
| 2025-10-14 | Hatch Electrical | $1,820.69 | ACT-PI · Building & Site Work | Hatch Electrical $1,820.69 — smallest Hatch line, same vendo |
| 2025-10-21 | Loadshift Sydney | $1,243.59 | ACT-MY · Freight & Logistics | Loadshift Sydney $1,243.59 — freight per guidance, likely Mo |
| 2025-11-10 | BRALINDA INVESTMENTS P ALI | $1,213.20 | ACT-UA · Travel & Accommodati | Bralinda Investments / Alice Springs $1,213.20 — NT trip per |
| 2025-10-20 | Avis | $1,032.90 | ACT-IN · 493 - Travel | Avis car hire is travel; project unclear so left at infrastr |
| 2025-11-11 | ALICE SPRINGS CASINO O ALI | $1,012.56 | ACT-UA · 493 - Travel | Alice Springs venue is part of an NT trip — likely Uncle All |
| 2025-12-01 | Bargain Car Rentals | $998.94 | ACT-GD · 493 - Travel | Car rental clusters with the NT/Goods travel; same vendor as |
| 2025-12-29 | AIG Australia | $826.00 | ACT-IN · Insurance | AIG is an insurer — org-level insurance premium belongs to i |
| 2025-12-01 | Bargain Car Rentals | $809.29 | ACT-GD · 493 - Travel | Second Bargain Car Rentals charge same day — same rental/tri |
| 2025-12-15 | NRMA Insurance | $635.05 | ACT-IN · Insurance | NRMA premium — likely vehicle insurance at org level; confir |
| 2025-12-11 | Colyton Hotel | $436.24 | ACT-PI · 493 - Travel | Colyton is in Western Sydney near PICC — hotel/accommodation |
| 2025-12-15 | Kennards Hire | $424.00 | ACT-MY · Plant & Equipment Hi | Kennards Hire is plant/equipment hire for site work — per gu |
| 2025-10-07 | A W M ELECTRICAL WHO ALICE | $395.77 | ACT-UA · Building & Site Work | AWM Electrical in Alice Springs is electrical works on an NT |
| 2025-10-30 | SQ *VALLEY SLICE PTY LTD M | $352.22 | ACT-FM · 421 - Light meals | Valley Slice cafe in Mooloolah Valley (near Maleny/Witta) —  |
| 2025-10-14 | BEARPEP PTY LTD LARRAKEYAH | $323.30 | ACT-GD · 421 - Light meals | Larrakeyah (Darwin NT) is part of the NT trip cluster — like |
| 2025-10-28 | JMC No2 Pty Ltd TS Ken Ken | $314.20 | ACT-FM · 421 - Light meals | Kenilworth is near Maleny/Witta so likely The Farm; confirm  |
| 2025-10-07 | AGL | $275.44 | ACT-FM · 445 - Light, Power,  | AGL is an electricity/gas utility — most likely The Farm sit |
| 2025-10-16 | BARLMARRK SUPERMARKET MANI | $204.62 | ACT-GD · 421 - Light meals | Maningrida is a remote NT Arnhem Land community — fits NT/Go |
| 2025-11-03 | MAPLE STREET MEAT MERC MAL | $203.23 | ACT-FM · 421 - Light meals | Maleny butcher — Maleny is The Farm locality so likely Farm  |
| 2025-10-10 | AHERRENGE COMMUNITY ST AMP | $181.39 | ACT-GD · 421 - Light meals | Ampilatwatja/Aherrenge is a remote NT community store (per g |
| 2025-10-10 | AHERRENGE COMMUNITY ST AMP | $175.67 | ACT-GD · 421 - Light meals | Second Aherrenge/Ampilatwatja NT community-store charge same |
| 2025-11-10 | EG GROUP/WILLS TCE & RAILA | $141.63 | ACT-OO · Travel | Fuel/convenience at Alice Springs — NT trip; Alice Springs i |
| 2025-11-11 | ALICE SPRINGS CASINO O ALI | $135.00 | ACT-OO · Light meals | Alice Springs venue (likely meal/accommodation on NT trip);  |
| 2025-12-04 | Edmonds Landscaping | $120.00 | ACT-HV · Building & Site Work | Landscaping contractor — site works at Harvest/Witta garden  |
| 2025-11-17 | Flyparks | $119.00 | ACT-IN · Travel | Airport/event parking — travel cost; project unknown, defaul |
| 2025-10-08 | SUSHI GOSU PTY LTD Braitli | $112.16 | ACT-OO · Light meals | Braitling is an Alice Springs suburb — meal on NT trip; Alic |
| 2025-11-11 | BP ALICE SPRINGS 1104 ALIC | $110.94 | ACT-OO · Travel | BP fuel in Alice Springs — NT trip; Alice Springs = Oonchium |
| 2025-11-18 | TICKETS*FARM MY SC 0404900 | $103.00 | ACT-MY · Events & Tickets | 'FARM MY' ticketing string suggests a Farm/Mounty Yarns even |
| 2025-12-03 | EG Group | $101.45 | ACT-HV · Travel & Fuel | EG Group is a fuel/convenience servo; fuel cost — confirm wh |
| 2025-10-31 | Liberty | $100.00 | ACT-FM · Travel & Fuel | Liberty is a fuel servo; $100 fuel — confirm vehicle/trip al |
| 2025-10-07 | RICEBOI MOOLOOLABA | $94.00 | ACT-FM · 421 - Light meals | Riceboi Mooloolaba is a Sunshine Coast restaurant — meal on  |
| 2025-10-13 | SQ *DUYU COFFEE ROASTERS C | $88.34 | ACT-GD · 421 - Light meals | Duyu Coffee Roasters in Ciccone (Alice Springs suburb) — NT  |
| 2025-10-06 | SQ *NEST IN WITTA Witta | $86.19 | ACT-HV · 421 - Light meals | Nest in Witta is a Witta cafe — Harvest/Farm location meal;  |
| 2025-11-26 | Mighty Networks | $76.34 | ACT-IN · 485 - Subscriptions | Mighty Networks is a community-platform SaaS subscription —  |
| 2025-12-08 | LinkedIn | $74.99 | ACT-IN · 485 - Subscriptions | LinkedIn Premium/recruiter subscription — business networkin |
| 2025-11-06 | LinkedIn | $74.99 | ACT-IN · 485 - Subscriptions | LinkedIn Premium/recruiter subscription — business networkin |
| 2025-12-29 | Mighty Networks | $73.66 | ACT-IN · 485 - Subscriptions | Mighty Networks community-platform SaaS subscription — confi |
| 2025-11-03 | SQ *ROSEBEDANDFINCH Eudlo | $60.00 | ACT-FM · 421 - Light meals | Square charge at a cafe/florist in Eudlo (Sunshine Coast hin |
| 2025-10-27 | Cabcharge | $57.60 | ACT-IN · 452 - Taxis | Cabcharge taxi with no trip context; defaulting to infrastru |
| 2025-10-27 | Cabcharge | $52.88 | ACT-IN · 452 - Taxis | Cabcharge taxi same date cluster (27 Oct) with two other Cab |
| 2025-12-19 | Alice Springs Casino | $50.75 | ACT-UA · 421 - Light meals | Alice Springs (Mparntwe) NT spend in Dec aligns with an NT t |
| 2025-10-20 | TEITZEL'S IGA/20 MORRIS ST | $49.68 | ACT-HV · 421 - Light meals | IGA in Stully/Witta area (Sunshine Coast hinterland) aligns  |
| 2025-10-27 | Cabcharge | $47.94 | ACT-IN · 452 - Taxis | Cabcharge taxi in the 27 Oct cluster; defaulting to infrastr |
| 2025-11-18 | BP EXP THE TULLA 1684 MELB | $44.23 | ACT-IN · Travel | BP at Melbourne Tullamarine airport indicates fuel/convenien |
| 2025-10-29 | SMP*Gone Bonkers Disc72 Ma | $37.93 | ACT-FM · 421 - Light meals | Gone Bonkers discount store in Maleny (Farm region); likely  |
| 2025-10-27 | Cabcharge | $37.46 | ACT-IN · 452 - Taxis | Cabcharge taxi in the 27 Oct cluster (fourth same-day Cabcha |
| 2025-12-17 | Linkt Avis Budget | $34.22 | ACT-GD · Travel | Linkt/Avis Budget is toll/hire-car travel; grouping with the |
| 2025-11-17 | AIG Australia | $34.00 | ACT-IN · Insurance | AIG is an insurer; $34 likely a travel/business insurance pr |
| 2025-10-13 | BOJANGLES SALOON&DININ ALI | $31.75 | ACT-GD · Light meals | Alice Springs dining on the NT trip — coding to Goods trip ( |
| 2025-11-03 | Maleny Hot Bread Bake Male | $31.43 | ACT-FM · Light meals | Maleny bakery is local to the Farm/Witta area — light meals/ |
| 2025-10-14 | WILD FOOD CAFE BERRIMAH | $25.34 | ACT-GD · Light meals | Berrimah (NT/Darwin) cafe during the NT trip — Goods trip li |
| 2025-11-03 | Maleny Hot Bread Bake Male | $25.05 | ACT-FM · Light meals | Second Maleny bakery charge same day — same Farm-day caterin |
| 2025-12-08 | News Pty Limited | $24.00 | ACT-IN · Subscriptions | News Pty (News Corp) recurring $24 is a news/media subscript |
| 2025-11-10 | News Pty Limited | $24.00 | ACT-IN · Subscriptions | Recurring News Pty media subscription — same coding as the o |
| 2025-10-20 | News Pty Limited | $24.00 | ACT-IN · Subscriptions | Recurring News Pty media subscription — same coding as the o |
| 2025-12-02 | Linktree | $16.23 | ACT-IN · 485 - Subscriptions | Linktree is a link-in-bio SaaS subscription — infrastructure |
| 2025-12-03 | X Corp | $15.00 | ACT-IN · 485 - Subscriptions | X Corp $15 is an X/Twitter premium social subscription — inf |
| 2025-10-31 | The Source Bulk Foods Male | $12.07 | ACT-FM · 421 - Light meals | Maleny vendor points to The Farm; bulk foods could be light  |
| 2025-12-18 | The Beet Bar | $9.28 | ACT-GD · Light meals | The Beet Bar is an Alice Springs cafe — light meal on the NT |
| 2025-12-16 | The Beet Bar | $7.21 | ACT-GD · Light meals | Repeat Alice Springs Beet Bar charge in the same Dec window  |
| 2025-10-08 | SUSHI GOSU PTY LTD Braitli | $7.11 | ACT-GD · Light meals | Sushi Gosu in Braitling (Alice Springs suburb) is a light me |
| 2025-12-18 | The Beet Bar | $6.19 | ACT-GD · Light meals | Third Alice Springs Beet Bar charge in the Dec NT-trip windo |

## 6 · 🔴 Create — DECIDE (92) — your real worklist
Low confidence, possibly personal, or unknown vendor. These need your call.

| Date | Vendor | Amt | Proposed | Why flagged |
|---|---|---|---|---|
| 2025-11-20 | Defy Design | $2,785.66 | ACT-GD / Design & Fit-out | Defy Design $2,785.66 — vendor not in guidance. Guess ACT-GD (clustered with |
| 2025-12-11 | Bunnings | $1,614.88 | ACT-IN / 446 - Materials &  | Bunnings $1,614.88 — materials per guidance, account 446. Project by context |
| 2025-12-01 | JB Hi-Fi | $1,491.90 | ACT-IN / Equipment | JB Hi-Fi $1,491.90 — equipment per guidance. Project unconfirmed, defaulted  |
| 2025-12-08 | Apple | $1,268.37 | ACT-IN / Equipment | Apple $1,268.37 — likely hardware/equipment at this amount (not personal med |
| 2025-12-11 | Bunnings | $1,182.18 | ACT-IN / 446 - Materials &  | Bunnings $1,182.18 — same date (2025-12-11) as the other Bunnings line, clus |
| 2025-12-11 | The Sand Yard | $1,068.00 | ACT-MY / Materials & Suppli | The Sand Yard is a sand/landscaping supplier — likely site materials for a b |
| 2025-12-12 | The Sand Yard | $1,029.00 | ACT-MY / Materials & Suppli | Second Sand Yard charge same week as the others — same supplier likely same  |
| 2025-12-11 | The Sand Yard | $913.50 | ACT-MY / Materials & Suppli | Third Sand Yard charge same period — same supplier, same site materials clus |
| 2025-10-20 | Virgin Australia | $759.45 | ACT-HV / 493 - Travel | Virgin flight is travel; project guess Harvest but flights are easily mis-at |
| 2025-12-01 | P & J Mabasa | $674.00 | ACT-GD / ? - code by hand | Unrecognised payee 'P & J Mabasa' on a Goods-period date — possibly a contra |
| 2025-10-31 | Woolworths | $483.33 | ACT-FM / 421 - Light meals | Woolworths grocery on a Farm-period date — likely catering/light meals for o |
| 2025-12-01 | Woolworths | $425.57 | ACT-HV / 421 - Light meals | Woolworths grocery on a Harvest-period date — likely on-site catering but gr |
| 2025-11-17 | Indonesia Arrival ROTTERDA | $393.72 | ACT-IN / ? - code by hand | Ambiguous foreign descriptor ('Indonesia Arrival ROTTERDAM') — could be visa |
| 2025-11-11 | Airbnb | $383.00 | ACT-GD / 493 - Travel | Airbnb accommodation around the NT/Goods travel window — confirm trip and th |
| 2025-12-03 | Dominos | $330.00 | ACT-HV / 421 - Light meals | Dominos pizza is a light-meals catering spend but the project is a guess; co |
| 2025-12-15 | Alice Springs Casino | $298.92 | ACT-UA / 493 - Travel | Alice Springs is NT-trip but a casino charge is ambiguous (meal/accommodatio |
| 2025-11-17 | Kogan.com 3BUDH9QW Melbour | $291.98 | ACT-IN / 720 - Equipment | Kogan online order is likely electronics/equipment but item unknown — confir |
| 2025-11-11 | EPILOGUE ENTERPRISES ALICE | $249.79 | ACT-UA / 421 - Light meals | Alice Springs NT-trip vendor (Epilogue is a cafe) — likely meals; confirm Un |
| 2025-10-31 | Aldi | $245.28 | ACT-IN / 421 - Light meals | Supermarket grocery spend, likely catering/light meals but project unclear — |
| 2025-10-15 | NOVOTEL SYDNEY WEST HQ ROO | $239.00 | ACT-GD / 493 - Travel | Sydney hotel accommodation — travel expense, project guessed as Goods; confi |
| 2025-10-14 | Booking.com | $239.00 | ACT-IN / 493 - Travel | Booking.com accommodation — travel expense; project unclear, confirm trip an |
| 2025-12-22 | Booking.com | $220.00 | ACT-IN / 493 - Travel | Booking.com accommodation — travel expense; project unclear, confirm which t |
| 2025-11-17 | Indonesia Arrival ROTTERDA | $204.55 | ACT-IN / 493 - Travel | Foreign/overseas charge (arrival/visa-style) — travel expense but trip and p |
| 2025-10-15 | Booking.com | $194.75 | ACT-GD / 493 - Travel | Booking.com accommodation — travel expense; project guessed Goods, confirm w |
| 2025-11-17 | Scopri Olo Bar Carlton | $180.00 | ACT-IN / 421 - Light meals | Carlton (Melbourne) bar/restaurant — meal spend; project and business purpos |
| 2025-10-21 | BIG W/CRN OF GEORGE & PARS | $167.75 | ACT-JH / 455 - Materials &  | Big W Sydney department-store purchase — likely materials/supplies but item  |
| 2025-11-04 | Woolworths | $165.99 | ACT-GD / Light meals | Supermarket spend; project unverified, kept guess ACT-GD but could be any tr |
| 2025-12-24 | Gurcharan Singh | $159.74 | ACT-IN / Materials & Suppli | Individual-name payee with no context; cannot determine purpose — confirm wh |
| 2025-10-14 | DAYUSE Paris | $156.20 | ACT-IN / Travel | Paris day-hotel booking — overseas travel; confirm whether ACT business or p |
| 2025-12-29 | Woodfordia | $151.73 | ACT-FM / Travel | Woodfordia (Woodford site, SE Qld hinterland) ticket/event spend; kept Farm  |
| 2025-11-21 | Admission Badung | $138.56 | ACT-IN / Travel | Admission in Badung (Bali) — overseas; confirm whether ACT business or perso |
| 2025-12-23 | Ampol | $138.07 | ACT-IN / Travel | Fuel purchase with no location; project unknown — confirm which trip/vehicle |
| 2025-11-19 | BRISBANE POWERHOUSE NEW FA | $137.50 | ACT-IN / Travel | Brisbane Powerhouse (venue/event); could be event tickets or meals — confirm |
| 2025-12-16 | BP | $137.33 | ACT-GD / Travel | BP fuel, no location; kept Goods guess but unverified — confirm trip/vehicle |
| 2025-12-23 | Pholklore | $129.78 | ACT-IN / Light meals | Pholklore (Vietnamese restaurant) — likely a meal; project unknown, confirm  |
| 2025-12-05 | Nightowl | $124.79 | ACT-HV / Light meals | Nightowl convenience store; kept Harvest guess (Witta area) but project unve |
| 2025-11-24 | Emme Mac Black | $112.09 | ACT-IN / Materials & Suppli | Unclear vendor (possible apparel/retail); purpose unknown — confirm what was |
| 2025-11-03 | Woolworths | $102.40 | ACT-FM / Light meals | Supermarket spend; kept Farm guess but project unverified — confirm location |
| 2025-10-07 | About Time Bathhouse Torqu | $100.00 | ACT-IN / Drawings · PERSONAL? | About Time Bathhouse Torquay is a wellness/spa venue with no obvious busines |
| 2025-10-21 | WWW.ECOFLO.COM.AU VIRGINIA | $89.69 | ACT-HV / Materials & Suppli | EcoFlo (ecoflo.com.au) supplies composting toilets/wastewater systems — site |
| 2025-12-17 | Epilogue Enterprises | $82.17 | ACT-GD / ? - code by hand | Epilogue Enterprises vendor purpose unclear — code by hand after identifying |
| 2025-10-21 | Woolworths | $73.10 | ACT-HV / 421 - Light meals | Woolworths supermarket — likely groceries/catering on trip; confirm project  |
| 2025-11-04 | Woolworths | $72.00 | ACT-GD / 421 - Light meals | Woolworths supermarket — likely groceries/catering; confirm project and meal |
| 2025-10-14 | BEARPEP PTY LTD LARRAKEYAH | $64.99 | ACT-GD / 421 - Light meals | Bearpep Pty Ltd in Larrakeyah (Darwin NT suburb) — NT trip spend, likely a m |
| 2025-12-10 | Poi Minchinbury | $62.01 | ACT-MY / 421 - Light meals | Poi in Minchinbury (Western Sydney, near Mount Druitt) — likely Mounty Yarns |
| 2025-12-29 | Woolworths | $59.90 | ACT-FM / 421 - Light meals | Generic supermarket spend with no location detail; project guess inherited f |
| 2025-12-16 | Woolworths | $59.68 | ACT-HV / 421 - Light meals | Generic supermarket spend with no location detail; Harvest project guess inh |
| 2025-12-18 | Amazon | $58.99 | ACT-IN / ? - code by hand | Amazon line item with no description - could be supplies, equipment or perso |
| 2025-10-08 | Woolworths | $56.70 | ACT-FM / 421 - Light meals | Generic supermarket spend; Farm guess inherited from sheet, confirm allocati |
| 2025-12-18 | Uber | $52.36 | ACT-GD / 452 - Taxis | Uber ride, Goods guess inherited from sheet; confirm whether part of an NT/G |
| 2025-12-29 | Woolworths | $48.95 | ACT-FM / 421 - Light meals | Generic supermarket spend; Farm guess inherited from sheet, confirm allocati |
| 2025-12-15 | Vezina | $42.83 | ACT-UA / 421 - Light meals | Vezina (likely a cafe/eatery) on 15 Dec near the Alice Springs NT trip clust |
| 2025-12-24 | Mortadeli | $42.35 | ACT-IN / 421 - Light meals | Mortadeli (deli/eatery) on 24 Dec; no location or trip context, defaulting t |
| 2025-12-29 | Chocolate Country | $36.88 | ACT-FM / 421 - Light meals | Chocolate Country (Maleny-area producer) on 29 Dec; Farm guess inherited fro |
| 2025-12-04 | Belong | $35.00 | ACT-IN / Subscriptions | Belong is a telco/internet provider; recurring $35 looks like an internet/mo |
| 2025-11-04 | Belong | $35.00 | ACT-IN / Subscriptions | Second identical Belong $35 charge (recurring telco/internet) — same coding  |
| 2025-10-30 | Garmin | $33.00 | ACT-IN / Subscriptions · PERSONAL? | Garmin recurring charge is most likely a personal device/fitness subscriptio |
| 2025-10-29 | GUZMAN Y GOMEZ SURRY HILLS | $28.10 | ACT-IN / Light meals | Sydney (Surry Hills) meal not tied to an obvious project trip — defaulting t |
| 2025-12-18 | Woolworths | $28.00 | ACT-HV / Light meals | Supermarket spend; guess routes to Harvest but groceries are ambiguous betwe |
| 2025-10-13 | Uber | $25.71 | ACT-GD / Taxis | Uber ride dated mid-Oct alongside the NT/Goods trip — coding to Goods travel |
| 2025-12-30 | Garmin | $25.00 | ACT-IN / Subscriptions · PERSONAL? | Recurring Garmin charge — likely a personal device/fitness subscription; fla |
| 2025-12-01 | Garmin | $25.00 | ACT-IN / Subscriptions · PERSONAL? | Recurring Garmin charge — likely personal device/fitness subscription; flag  |
| 2025-12-19 | Uber | $23.16 | ACT-GD / Taxis | Uber ride dated mid-Dec; coding to Goods travel by default but Uber lines sp |
| 2025-12-18 | Uber | $22.92 | ACT-GD / 452 - Taxis | Small Uber fare on 18 Dec; project guessed Goods but cannot confirm which tr |
| 2025-12-16 | BP | $21.47 | ACT-GD / 449 - Motor Vehicl | Fuel purchase; account is vehicle/fuel but trip/project is a guess — confirm |
| 2025-12-17 | Uber | $19.49 | ACT-GD / 452 - Taxis | Small Uber fare 17 Dec, same window as other rides; project unconfirmed — li |
| 2025-10-10 | CabFare | $19.11 | ACT-GD / 452 - Taxis | Taxi fare in Oct; project guessed Goods but standalone ride with no trip con |
| 2025-12-29 | Audible | $16.45 | ACT-IN / 880 - Drawings · PERSONAL? | Audible recurring $16.45 is a personal media subscription — code to Drawings |
| 2025-11-26 | Audible | $16.45 | ACT-IN / 880 - Drawings · PERSONAL? | Recurring Audible personal media subscription (matches Oct/Dec instances) —  |
| 2025-10-27 | Audible | $16.45 | ACT-IN / 880 - Drawings · PERSONAL? | Recurring Audible personal media subscription — Drawings. |
| 2025-11-25 | La Porchetta | $15.65 | ACT-IN / 421 - Light meals | Restaurant meal $15.65; coded as light meals but project/business-purpose un |
| 2025-11-04 | LS tanakas pty ltd Alice S | $14.00 | ACT-UA / 421 - Light meals | Alice Springs vendor on NT trip; project could be Goods/Oonchiumpa/Uncle All |
| 2025-12-16 | Uber | $11.98 | ACT-GD / 452 - Taxis | Small Uber fare 16 Dec, same window as 17/18 Dec rides — likely same trip cl |
| 2025-12-16 | The Beet Bar | $10.31 | ACT-GD / 421 - Light meals | Cafe purchase 16 Dec, same day as Uber rides — likely meal during the same t |
| 2025-12-16 | Amazon Prime | $9.99 | ACT-IN / 880 - Drawings · PERSONAL? | Amazon Prime $9.99 recurring personal media/membership — code to Drawings. |
| 2025-12-02 | DocPlay | $9.99 | ACT-IN / 880 - Drawings · PERSONAL? | DocPlay is a personal documentary streaming subscription — code to Drawings, |
| 2025-11-17 | Amazon Prime | $9.99 | ACT-IN / 880 - Drawings · PERSONAL? | Recurring Amazon Prime personal membership — Drawings. |
| 2025-11-03 | DocPlay | $9.99 | ACT-IN / Drawings · PERSONAL? | DocPlay is a movie-streaming subscription ($9.99) with no business use evide |
| 2025-10-16 | Amazon Prime | $9.99 | ACT-IN / Drawings · PERSONAL? | Amazon Prime is a personal media/shopping subscription — code to Drawings pe |
| 2025-12-01 | Linkt Avis Budget | $9.84 | ACT-HV / Travel | Linkt toll on an Avis/Budget hire car is travel, but the project (kept as th |
| 2025-12-19 | Alice Springs Casino | $8.78 | ACT-UA / Light meals | Alice Springs Casino (Dec) is on the NT trip — likely a meal/venue; project  |
| 2025-10-27 | BUTCHERS BUFFET CHINAT HAY | $3.96 | ACT-IN / Light meals | Sydney Haymarket buffet ($3.96) is a light meal but with no trip context def |
| 2025-11-24 | GoPayID | $1.57 | ACT-IN / Drawings · PERSONAL? | GoPayID is an Indonesian e-wallet top-up (~$1.57); tiny overseas personal-ra |
| 2025-11-21 | GoPayID | $1.48 | ACT-IN / Drawings · PERSONAL? | GoPayID Indonesian e-wallet micro-charge (~$1.48) in the same Nov cluster —  |
| 2025-11-24 | GoPayID | $1.44 | ACT-IN / Drawings · PERSONAL? | GoPayID Indonesian e-wallet micro-charge (~$1.44) — same Nov cluster, likely |
| 2025-11-24 | GoPayID | $1.39 | ACT-IN / Drawings · PERSONAL? | GoPayID Indonesian e-wallet micro-charge (~$1.39) — same Nov cluster, likely |
| 2025-11-21 | GoPayID | $1.29 | ACT-IN / Drawings · PERSONAL? | GoPayID Indonesian e-wallet micro-charge (~$1.29) — same Nov cluster, likely |
| 2025-11-24 | Gojek | $1.21 | ACT-IN / Drawings · PERSONAL? | Gojek is Indonesian ride-hailing (~$1.21 micro-charge) — overseas personal-r |
| 2025-11-24 | GoPayID | $1.20 | ACT-IN / Drawings · PERSONAL? | GoPayID Indonesian e-wallet micro-charge (~$1.20) — same Nov cluster, likely |
| 2025-11-19 | GoPayID | $1.06 | ACT-IN / Drawings · PERSONAL? | GoPayID Indonesian e-wallet micro-charge (~$1.06) — same Nov cluster, likely |
| 2025-11-20 | Gojek | $0.83 | ACT-IN / Drawings · PERSONAL? | Gojek Indonesian ride-hailing micro-charge (~$0.83) — same overseas personal |
| 2025-11-19 | GoPayID | $0.64 | ACT-IN / Drawings · PERSONAL? | GoPayID Indonesian e-wallet micro-charge (~$0.64) — same Nov cluster, likely |

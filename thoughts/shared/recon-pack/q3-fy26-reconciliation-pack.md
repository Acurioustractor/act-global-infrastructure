# Q3 FY26 — NAB Visa #8815 Reconciliation Pack

**Generated:** 2026-06-01 · **Period:** 1 Jan – 31 Mar 2026 · **Status:** prepared, READ-ONLY. Source: reconcile cockpit + workflow wf_a06aaf51. The reconcile click stays in Xero; CREATE codings are proposals to confirm.

## What you actually have to do

| Tier | What | Lines |
|---|---|---|
| 🟢 Mechanical | delete dups · match · already · transfers · high-conf creates | 107 |
| 🟡 Skim-confirm | medium creates, clear single guess | 50 |
| 🔴 Decide | low-conf + personal + unknown | 62 |

## Money map
| Bucket | Lines | Value |
|---|---|---|
| ♻️ Duplicates (confirmed → delete card txn) | 16 | $6,443.31 |
| ⚠️ Rejected (do NOT delete) | 1 | $17.87 |
| 🔗 Match | 52 | $18,157.88 |
| ✅ Already in Xero | 6 | $235.34 |
| 🆕 Create | 143 | $62,571.75 |
| **Total** | **218** | **$87,426.15** |

## 1 · Delete these duplicates (16) — recover $6,443.31
| Date | Vendor | Bank amt | Bill (status) / surcharge |
|---|---|---|---|
| 2026-03-18 | MALENY LANDSCAPING MALENY | $1,995.00 | MALENY LANDSCAPING SUPPLIES (PAID) |
| 2026-03-19 | MALENY LANDSCAPING MALENY | $1,305.00 | MALENY LANDSCAPING SUPPLIES (PAID) |
| 2026-01-14 | Hatch Electrical | $784.43 | Hatch Electrical (AUTHORISED) · +$11.81→Adj |
| 2026-03-20 | MALENY LANDSCAPING MALENY | $652.50 | MALENY LANDSCAPING SUPPLIES (PAID) |
| 2026-01-27 | EASEL PRO EASEL.COM IL | $312.77 | Easel Software (PAID) |
| 2026-02-10 | REEF RESORT HIDEAWAY BAY | $300.00 | Montes Reef Resort (PAID) ⚠️medium |
| 2026-03-20 | Defy Design | $203.22 | Defy (AUTHORISED) · +$3.79→Adj |
| 2026-02-13 | Qantas | $183.00 | Qantas Group Accommodation (PAID) · +$0.25→Adj |
| 2026-01-21 | Light Years - Noosa Noosa Heads | $140.13 | Light Years Asian Diner (AUTHORISED) · +$2.13→Adj |
| 2026-02-03 | TI TREE RH 9787 TI TREE | $133.02 | Ti Tree Roadhouse (PAID) |
| 2026-03-27 | MALENY HARDWARE AND RURALMALENY | $113.40 | MALENY HARDWARE & RU (AUTHORISED) |
| 2026-02-10 | Notion Labs | $75.39 | Notion Labs (AUTHORISED) · +$0.76→Adj |
| 2026-03-30 | BOLT IN CO MAROOCHYDORE | $70.40 | BOLT FN CO (PAID) ⚠️medium |
| 2026-03-03 | Google Workspace_theharveSydney | $67.98 | Google Australia Pty Limited (PAID) |
| 2026-02-03 | Google Workspace_theharveSydney | $67.98 | Google Australia (PAID) |
| 2026-01-08 | TRANSPORTMAINRDS BRISBANE | $39.09 | Dept of Transport & Main Roads (PAID) |

### ⚠️ DO NOT delete (1)
- **BITWARDEN BITWARDEN.COMCA** $17.87 — _unsure_: Same merchant (Bitwarden) and same date 2026-01-07, but card $17.75 is LESS than bill $17.87 — bank<bill violates the surcharge gate (surcharge requires bank>=bill). Reverse-direction $0.12 (0.67%) gap likely FX/rounding on USD sub, but does not fit the duplicate amount rule. Mark unsure, do not auto-delete.

## 2 · Match to bill/txn (52)
| Date | Vendor | Amt | Match → |
|---|---|---|---|
| 2026-01-22 | Bionic Storage | $4,705.00 | Bionic Group (bill PAID) |
| 2026-03-09 | DIGGERMATE CARRARA | $2,413.17 | Diggermate Franchising (bill PAID) |
| 2026-01-15 | RW PACIFIC TRADERS PTY DARRA | $2,034.00 | RW Pacific Traders (bill PAID) |
| 2026-01-21 | Sunshine Coast Regiona Sunshine  | $1,738.03 | Sunshine Coast Council (bill PAID) |
| 2026-03-09 | MALENY LANDSCAPING MALENY | $895.00 | MALENY LANDSCAPING SUPPLIES (bill PAID) |
| 2026-03-03 | Woolworths | $585.36 | Woolworths (bill PAID) |
| 2026-02-16 | WILD EARTH AUSTRALIA Brisbane Ai | $572.37 | Wild Earth (bill PAID) |
| 2026-01-08 | MALENY HARDWARE AND RURALMALENY | $507.51 | Maleny Hardware And Rural Supplies (bill PAID) |
| 2026-02-06 | AGL | $433.73 | AGL (bill PAID) |
| 2026-01-28 | SEASONS SUPERMARKET 10 MALENY | $366.58 | Liberty Maleny (card txn) · +$-1.11 surcharge |
| 2026-03-12 | AGL | $362.83 | AGL (bill PAID) |
| 2026-03-02 | MAPLETONPUBLI260304NB MAPLETON | $280.00 | Mapleton Public House (bill PAID) |
| 2026-02-23 | TRANSPORTMAINRDS BRISBANE | $273.63 | Candle Supplies Brisbane (bill PAID) · +$13.63 surcharge |
| 2026-02-16 | SQ *CANDLE SUPPLIES BRISB1800595 | $260.00 | Candle Supplies Brisbane (bill PAID) |
| 2026-03-09 | MALENY HARDWARE AND RURALMALENY | $237.70 | Bussell Rural Co Pty Ltd T/AS Maleny Hardware & Rural (bill PAID) |
| 2026-02-13 | Hinterland Aviation Cairns | $201.96 | Hinterland Aviation (bill PAID) |
| 2026-03-23 | STEIGENBERGER KANZLERA BERLIN | $193.43 | STEIGENBERGER HOTEL AM KANZLERAMT (card txn) · +$6.62 surcharge |
| 2026-03-18 | SEASONS SUPERMARKET 10 MALENY | $161.07 | Pestworx Maleny (bill PAID) · +$-3.93 surcharge |
| 2026-02-17 | Grand Hotel and Apartm Fremantle | $160.70 | Grand Hotel & Apartments Townsville (bill AUTHORISED) · +$1.86 surcharge |
| 2026-01-20 | HINTERLAND RESTRNT COORAN | $150.00 | Hinterland Restrt (bill PAID) |
| 2026-03-23 | SP HOLAFLY.COM DUBLIN | $145.05 | Holafly (bill PAID) |
| 2026-03-30 | KIOSK BUDAPEST BUDAPEST | $129.78 | KIOSK (bill PAID) |
| 2026-01-22 | MALTEK PTY. LTD. DERRIMUT | $119.00 | The Trustee For Maltek Trust (bill PAID) |
| 2026-03-23 | DoubleTree Alice Springs Alice S | $117.00 | DoubleTree By Hilton Hobart (card txn) |
| 2026-03-30 | 7 ELEVEN 4223 LITTLE MOUNTA | $103.64 | 7-Eleven (card txn) |
| 2026-03-23 | SP HOLAFLY.COM DUBLIN | $102.15 | Holafly (bill PAID) |
| 2026-03-25 | Restavracija Al Fresco Bled | $99.08 | AL FRESCO (bill PAID) |
| 2026-03-24 | JLL INVESTMENT GROUP FAIRFIELD | $81.87 | iDumplings Fairfield (bill PAID) |
| 2026-03-30 | SQ *POCKY ASIAN RESTAURANMaleny | $81.10 | Pocky Asian Restaurant (card txn) |
| 2026-03-30 | AMPOL CANBERRA 20006F CANBERRA A | $76.23 | Ampol (bill PAID) |
| 2026-02-06 | PAGE 27 CAFE ALICE SPRINGS | $69.93 | Page 27 (bill PAID) |
| 2026-03-24 | GUSTO PIZZERIA Ljubljana | $62.54 | GUSTO PIZZERIA (bill PAID) |
| 2026-02-25 | MALENY HARDWARE AND RURALMALENY | $47.90 | Maleny Food Co Cafe (bill PAID) · +$1.31 surcharge |
| 2026-03-25 | SQ *EAT LEBANESE Caringbah | $40.76 | Eat Lebanese (card txn) · +$0.76 surcharge |
| 2026-02-03 | J R ROWDEN AND F V SNO ALICE SPR | $40.16 | F V Snowdon And J R Rowden (card txn) · +$0.36 surcharge |
| 2026-02-11 | BANH MI HOUSE QLD PL EVERTON PAR | $33.88 | The Banhmi House (card txn) · +$0.38 surcharge |
| 2026-03-20 | MIYABI SUSHI ALICE SPRINGS | $31.97 | Miyabi Sushi Train (card txn) |
| 2026-02-19 | SUPERDESIGN DEV ST LEONARDS | $28.46 | Superdesign (bill AUTHORISED) · +$0.08 surcharge |
| 2026-03-26 | SQ *ON LAKE CAFE McDougalls Hi | $27.50 | On lake cafe (card txn) |
| 2026-03-09 | Shotgun Espresso Maleny | $23.35 | The Source Bulk Foods Maleny (bill PAID) · +$-0.87 surcharge |
| 2026-03-25 | RESTAVRACIJA JASNA KRANJSKA GORA | $22.28 | JASNA CHALET RESORT (bill PAID) |
| 2026-02-03 | J R ROWDEN AND F V SNO ALICE SPR | $20.68 | F V Snowdon And J R Rowden (card txn) · +$0.18 surcharge |
| 2026-03-05 | SQ *NEST IN WITTA Witta | $17.85 | Nest In Witta (bill PAID) |
| 2026-03-09 | BITWARDEN BITWARDEN.COMCA | $17.20 | Bitwarden (bill PAID) · +$0.14 surcharge |
| 2026-03-23 | Coles | $16.98 | Coles Supermarkets (card txn) |
| 2026-01-09 | Apple | $14.99 | Apple Pty Ltd (bill PAID) |
| 2026-01-16 | Apple | $11.99 | Apple Pty Ltd (bill PAID) |
| 2026-02-06 | PAGE 27 CAFE ALICE SPRINGS | $11.06 | Page 27 (bill PAID) |
| 2026-02-16 | Amazon Prime | $9.99 | Amazon (bill PAID) |
| 2026-03-04 | Maleny Hot Bread Bake Maleny | $8.52 | Maleny Bakery (bill AUTHORISED) · +$0.12 surcharge |
| 2026-03-24 | PAGE 27 CAFE ALICE SPRINGS | $6.92 | Page 27 (bill PAID) |
| 2026-03-24 | FAWLTYS FINE FOOD ALICE SPRINGS | $6.00 | Fawltys Fine Food (bill PAID) |

## 3 · Already in Xero — verify (6)
| Date | Vendor | Amt | Recommendation [conf] |
|---|---|---|---|
| 2026-03-24 | Qantas | $150.00 | reconcile_bankline_to_existing [high] |
| 2026-01-27 | BORNGA SYDNEY PTY LTD SYDNEY | $25.38 | reconcile_bankline_to_existing [high] |
| 2026-03-19 | Ezviz | $14.99 | reconcile_bankline_to_existing [high] |
| 2026-03-09 | Apple | $14.99 | reconcile_bankline_to_existing [high] |
| 2026-02-19 | Ezviz | $14.99 | reconcile_bankline_to_existing [high] |
| 2026-01-20 | Ezviz | $14.99 | reconcile_bankline_to_existing [high] |

## 4 · Create — bulk-confirm (29 high + 4 transfers)
| Date | Vendor | Amt | → Project · Account |
|---|---|---|---|
| 2026-01-23 | Internet Transfer | $3,000.00 | ACT-IN · transfer/exclude |
| 2026-01-13 | AGL | $883.07 | ACT-FM · 445 - Light, Power, Heating |
| 2026-03-16 | NRMA Insurance | $635.03 | ACT-FM · Insurance |
| 2026-02-09 | A CURIOUS TRACTOR WITTA | $600.00 | ACT-HV · transfer/exclude |
| 2026-03-19 | DoubleTree Alice Springs Alice S | $588.00 | ACT-GD · Travel |
| 2026-01-30 | AAMI BUSINESS INSUR BRISBANE | $456.99 | ACT-IN · Insurance |
| 2026-01-02 | AAMI BUSINESS INSUR BRISBANE | $456.99 | ACT-IN · Insurance |
| 2026-03-09 | SEASONS SUPERMARKET 10 MALENY | $294.04 | ACT-HV · Light meals |
| 2026-02-03 | ERLDUNDA DESERT OAKS ERLDUNDA | $180.76 | ACT-GD · Travel |
| 2026-03-23 | Supabase | $124.59 | ACT-IN · 485 - Subscriptions |
| 2026-02-23 | Supabase | $124.47 | ACT-IN · 485 - Subscriptions |
| 2026-02-13 | SEASONS SUPERMARKET 10 MALENY | $119.89 | ACT-HV · 421 - Light meals |
| 2026-03-16 | Adobe | $113.49 | ACT-IN · 485 - Subscriptions |
| 2026-02-25 | MALENY HARDWARE AND RURALMALENY | $81.90 | ACT-HV · 446 - Materials & Supplies |
| 2026-03-10 | Notion Labs | $75.93 | ACT-IN · 485 - Subscriptions |
| 2026-01-13 | Xero | $75.00 | ACT-IN · 485 - Subscriptions |
| 2026-01-06 | LinkedIn | $74.99 | ACT-IN · 485 - Subscriptions |
| 2026-03-25 | Mighty Networks | $70.92 | ACT-IN · 485 - Subscriptions |
| 2026-02-25 | Mighty Networks | $69.56 | ACT-IN · 485 - Subscriptions |
| 2026-01-05 | Google Workspace_theharveSydney | $67.98 | ACT-HV · 485 - Subscriptions |
| 2026-01-14 | Codeguide | $43.54 | ACT-IN · 485 - Subscriptions |
| 2026-03-23 | Illustrator Sydney | $35.99 | ACT-IN · 485 - Subscriptions |
| 2026-01-22 | Illustrator Sydney | $35.99 | ACT-IN · 485 - Subscriptions |
| 2026-01-30 | OpenAI | $31.54 | ACT-IN · Subscriptions |
| 2026-01-09 | TWILIO INC TWILIO.COM CA | $29.85 | ACT-IN · Subscriptions |
| 2026-03-18 | Vercel | $28.38 | ACT-IN · Subscriptions |
| 2026-01-02 | Linktree | $16.17 | ACT-IN · 485 - Subscriptions |
| 2026-03-02 | Linktree | $15.21 | ACT-IN · 485 - Subscriptions |
| 2026-01-23 | Squarespace | $11.80 | ACT-IN · 485 - Subscriptions |
| 2026-03-16 | Amazon Prime | $9.99 | ACT-IN · 880 - Drawings |
| 2026-01-16 | Amazon Prime | $9.99 | ACT-IN · 880 - Drawings |
| 2026-03-09 | SQ *A CURIOUS TRACTOR Kingston | $3.50 | ACT-IN · transfer/exclude |
| 2026-03-30 | NYX*MOLNyrt Budapest | $0.87 | ACT-IN · transfer/exclude |

## 5 · Create — skim-confirm (50)
| Date | Vendor | Amt | → Project · Account | Note |
|---|---|---|---|---|
| 2026-03-02 | QATAR AIR 0002134251468DOH | $5,067.99 | ACT-IN · 493 - Travel | International airfare via Doha (Qatar Airways), $5,067.9 |
| 2026-01-29 | Carla Furnishers | $4,816.00 | ACT-GD · Furniture & Fit-out | Carla Furnishers $4,816 — coding-patterns maps to Furnit |
| 2026-01-07 | CARBA TEC PTY LTD TINGALPA | $4,575.65 | ACT-HV · Materials & Supplies | CarbaTec (woodworking tools/supplies, Tingalpa Brisbane) |
| 2026-02-26 | ADGE Hotel OPI Surry Hills | $2,161.19 | ACT-PI · 493 - Travel | ADGE Hotel, Surry Hills (Sydney) $2,161.19 — Travel/acco |
| 2026-01-13 | CARBA TEC PTY LTD TINGALPA | $1,811.70 | ACT-HV · Materials & Supplies | Second CarbaTec (Tingalpa) charge $1,811.70 — same vendo |
| 2026-02-19 | Hatch Electrical | $1,443.03 | ACT-PI · Building & Site Work | Hatch Electrical $1,443.03 → Building & Site Works (acco |
| 2026-02-05 | THRIFTY AS CITY ALICE SPRI | $1,126.60 | ACT-GD · 493 - Travel | Thrifty car rental, Alice Springs $1,126.60 — NT trip cl |
| 2026-02-02 | THRIFTY AS CITY ALICE SPRI | $736.64 | ACT-GD · 493 - Travel | Second Thrifty Alice Springs charge $736.64 — same NT-tr |
| 2026-02-23 | Bunnings | $599.00 | ACT-FM · Materials & Supplies | Bunnings hardware -> Materials & Supplies per coding pat |
| 2026-02-06 | STEELMART CALOUNDRA CALOUN | $538.12 | ACT-HV · Building & Site Work | Steelmart = steel supplier, Caloundra (Sunshine Coast, n |
| 2026-03-31 | Hinterland Aviation Cairns | $426.36 | ACT-GD · Travel | Hinterland Aviation = regional flights ex Cairns -> Trav |
| 2026-02-02 | VTC-ONLINE YULARA | $287.57 | ACT-GD · Travel | Yulara = Uluru/Voyages Travel Centre -> NT trip tours/tr |
| 2026-01-09 | Booking.com | $275.00 | ACT-IN · Travel | Booking.com accommodation -> Travel, ACT-IN per coding p |
| 2026-02-27 | TRANSPORTMAINRDS BRISBANE | $273.63 | ACT-IN · Motor Vehicle Expens | QLD Transport and Main Roads -> vehicle registration / l |
| 2026-02-19 | Liberty | $216.07 | ACT-HV · Fuel | Liberty is an Australian fuel/service-station chain — ac |
| 2026-02-06 | Liberty | $213.00 | ACT-HV · Fuel | Liberty fuel station — same cluster as the other two Lib |
| 2026-03-03 | BP NAMBUCCA TRVL CTR 7795V | $212.21 | ACT-IN · Fuel | BP travel centre at Valla/Nambucca Heads (NSW mid-north  |
| 2026-03-03 | ADGE Hotel OPI Surry Hills | $209.00 | ACT-PI · Travel | ADGE Hotel, Surry Hills (inner Sydney). Account=Travel ( |
| 2026-01-19 | SQ *POCKY ASIAN RESTAURANM | $206.44 | ACT-FM · Light meals | Pocky Asian Restaurant in Maleny (SE-QLD farm cluster).  |
| 2026-02-23 | Booking.com | $202.50 | ACT-IN · Travel | Booking.com = accommodation booking → account=Travel (49 |
| 2026-02-06 | Liberty | $194.00 | ACT-HV · Fuel | Liberty fuel station — third line of the Liberty cluster |
| 2026-03-06 | WITTA RRC BEERWAH | $148.00 | ACT-HV · Light meals | Witta RRC = Witta Recreation/Rural club near Beerwah (SE |
| 2026-02-09 | FOUNDERPASS.COM ESSEX | $143.58 | ACT-IN · Subscriptions | FounderPass (founder-perks/SaaS membership, UK/Essex bil |
| 2026-03-04 | BALLINA TRAVEL CTR 9072 BA | $133.63 | ACT-IN · Fuel | Travel centre (fuel/roadhouse) in Ballina, NSW north coa |
| 2026-01-12 | SQ *POCKY ASIAN RESTAURANM | $119.06 | ACT-FM · 421 - Light meals | Maleny restaurant — SE-QLD farm cluster meal. Cockpit gu |
| 2026-02-03 | Hanuman Restaurant Ali Ali | $118.36 | ACT-GD · 421 - Light meals | Alice Springs restaurant — NT trip cluster. Account (Lig |
| 2026-02-13 | WWW.VEVOR.COM.AU MELBOURNE | $115.99 | ACT-HV · 446 - Materials & Su | VEVOR sells tools/equipment/hardware. $115.99 — likely f |
| 2026-03-04 | Starlink | $108.00 | ACT-IN · 485 - Subscriptions | Starlink — recurring connectivity subscription ($108/mo) |
| 2026-02-04 | DISCOVERY RESORTS-KING PET | $103.59 | ACT-GD · 493 - Travel | Discovery Resorts Kings Canyon (Petermann, NT) — accommo |
| 2026-02-02 | VTC-ONLINETOURING YULARA | $99.89 | ACT-GD · 493 - Travel | Yulara (Uluru) touring/transfer — NT/Uluru trip cluster. |
| 2026-01-14 | 3DEXPERIENCE DASSAULT MELB | $92.40 | ACT-IN · 485 - Subscriptions | Dassault 3DEXPERIENCE — CAD/engineering SaaS. Recurring  |
| 2026-01-23 | LANDINGFOLIO SINGAPORE | $90.84 | ACT-IN · 485 - Subscriptions | Landingfolio — web/landing-page design SaaS. Recurring s |
| 2026-03-09 | SUPER CHEAP AUTO ACACIA RI | $90.45 | ACT-HV · 446 - Materials & Su | Super Cheap Auto (Acacia Ridge, Brisbane) — vehicle/auto |
| 2026-03-20 | Woolworths | $68.10 | ACT-JP · 421 - Light meals | Supermarket → Light meals (high on account). Project ACT |
| 2026-02-02 | Reddy Express 1902 Alice S | $61.72 | ACT-GD · 449 - Fuel | Reddy Express (ex-Coles Express) fuel/convenience, Alice |
| 2026-02-12 | Woolworths | $60.50 | ACT-JP · 421 - Light meals | Supermarket → Light meals (account high). Project ACT-JP |
| 2026-03-18 | CabFare | $55.33 | ACT-IN · 452 - Taxis | CabFare = taxi/rideshare aggregator → 452 Taxis. Project |
| 2026-03-30 | SEASONS SUPERMARKET 10 MAL | $51.01 | ACT-HV · 421 - Light meals | Maleny supermarket = SE-QLD farm cluster → ACT-HV (Harve |
| 2026-03-23 | Coles | $45.56 | ACT-GD · 421 - Light meals | Supermarket → Light meals (account high). Project ACT-GD |
| 2026-03-31 | SEASONS SUPERMARKET 10 MAL | $44.28 | ACT-HV · 421 - Light meals | Second Maleny supermarket line → same coding as above: A |
| 2026-03-30 | COASTAL FASTENERS PTY LTDM | $35.20 | ACT-FM · Materials & Supplies | Fasteners/hardware supplier, Maroochydore (SE-QLD) → bui |
| 2026-03-04 | Belong | $35.00 | ACT-IN · 485 - Subscriptions | Belong telco/internet, recurring flat $35 → Subscription |
| 2026-02-04 | Belong | $35.00 | ACT-IN · 485 - Subscriptions | Belong recurring $35 telco/internet → Subscriptions. ACT |
| 2026-01-05 | Belong | $35.00 | ACT-IN · 485 - Subscriptions | Belong recurring $35 telco/internet → Subscriptions. ACT |
| 2026-03-05 | SEASONS SUPERMARKET 10 MAL | $33.42 | ACT-HV · Light meals | Seasons Supermarket Maleny is in the Witta/Maleny area;  |
| 2026-03-06 | PAPER.DESIGN PAPER.DESIGN  | $29.77 | ACT-IN · Subscriptions | Paper.design is a design SaaS tool; small recurring. Sub |
| 2026-03-09 | SEASONS SUPERMARKET 10 MAL | $26.99 | ACT-HV · Light meals | Same vendor/site as the other Seasons Maleny line — Witt |
| 2026-03-16 | Maleny Hot Bread Bake Male | $18.15 | ACT-HV · Light meals | Maleny Hot Bread Bakery — Maleny/Witta area, same trip c |
| 2026-03-30 | SEASONS SUPERMARKET 10 MAL | $8.95 | ACT-HV · 421 - Light meals | Maleny is the SE-QLD farm cluster (coding-patterns.md §3 |
| 2026-03-09 | SQ *FLIGHT BAR WITTA Witta | $4.00 | ACT-HV · 421 - Light meals | Flight Bar, Witta = Harvest Witta location (coding-patte |

## 6 · Create — DECIDE (62) — your worklist
| Date | Vendor | Amt | Proposed | Why flagged |
|---|---|---|---|---|
| 2026-02-02 | KALLEGA INVESTMENTS PT A | $4,715.00 | ACT-GD / 493 - Travel | Alice Springs = NT trip cluster (ACT-GD/ACT-OO/ACT-UA). 'Kallega Investm |
| 2026-03-02 | SP RETRO OUTDOOR CO BAUL | $4,497.00 | ACT-HV / Furniture & Fit- | 'SP Retro Outdoor Co' (Baulkham Hills, Western Sydney) $4,497 — outdoor  |
| 2026-02-23 | PAYPAL *IMPRWV6N 4029357 | $3,833.09 | ACT-HV / ? - code by hand | Opaque PayPal descriptor ('IMPRWV6N') $3,833.09 — underlying merchant un |
| 2026-02-27 | MYO*THE TRUSTEE FOR TH B | $3,212.04 | ACT-IN / 485 - Subscripti | 'MYO*' prefix suggests a MYOB-billed subscription/software ($3,212.04);  |
| 2026-03-23 | EDITANDPRIN 0414586892 | $931.41 | ACT-IN / Printing & Stati | 'EDITANDPRIN' $931.41 — looks like an editing/printing service. Account= |
| 2026-03-04 | Kadmium Art Supplies 02  | $771.00 | ACT-IN / Materials & Supp | Kadmium Art Supplies (Sydney) $771 — art materials → Materials & Supplie |
| 2026-01-16 | DNA STEEL DIRECT ALICE S | $739.54 | ACT-GD / Materials & Supp | DNA Steel Direct, Alice Springs $739.54 — steel/materials in the NT (bui |
| 2026-03-30 | GREEN MOTION SLOVENIJA B | $687.02 | ACT-IN / 493 - Travel | Green Motion car rental, Brnik Aerodrome (Ljubljana airport, Slovenia) $ |
| 2026-02-09 | BOB BROWN FOUNDATION HOB | $600.00 | ACT-IN / Donations · PERSONAL? | Bob Brown Foundation (environmental NGO) $600 — a donation, not an opera |
| 2026-03-30 | HERTZ, RA, 643314792 SOU | $598.57 | ACT-IN / Travel | Hertz car hire, South Melbourne. Car hire = Travel. No Melbourne trip cl |
| 2026-03-26 | STRELEC LJUBLJANA | $500.10 | ACT-IN / Travel | Strelec is a restaurant/bar in Ljubljana, Slovenia. Overseas spend - lik |
| 2026-01-15 | AIRTASKER* 19323270X HAY | $399.45 | ACT-IN / Contract & Consu | Airtasker = on-demand task labour. Expense account depends on task (like |
| 2026-02-25 | BIG W/OLD HUME HWY & ROS | $388.20 | ACT-IN / Materials & Supp | Big W Mittagong (NSW Southern Highlands) = general retail -> Materials & |
| 2026-02-19 | TULLAH LAKESIDE LODGE TU | $374.07 | ACT-IN / Travel | Tullah Lakeside Lodge is in Tasmania (west coast). Accommodation -> Trav |
| 2026-02-20 | Amazon | $349.48 | ACT-IN / Materials & Supp | Amazon $349.48 one-off (not a small recurring sub) reads as a goods purc |
| 2026-02-09 | LS Esmay Adelaide Hackne | $326.60 | ACT-GD / Light meals | Esmay is a restaurant in Hackney, Adelaide -> Light meals. Script guess  |
| 2026-01-28 | ORANGESKY STAFFORD | $288.00 | ACT-GL / Contract & Consu | Orange Sky (mobile laundry, Stafford Brisbane HQ). Most likely tied to G |
| 2026-03-06 | Mapleton Public House Ma | $235.83 | ACT-HV / Light meals | Mapleton (Sunshine Coast hinterland, adjacent to Maleny/Witta) pub -> Li |
| 2026-02-13 | AUSTRALIAN TOURIST PARK  | $232.96 | ACT-CP / Travel | Tourist/caravan park (Myamba) accommodation -> Travel. Script guess ACT- |
| 2026-03-02 | AMPOL WYONG DIESEL NO WY | $232.55 | ACT-RA / Fuel | Ampol diesel, Wyong (NSW Central Coast) -> Fuel. Script guess ACT-RA (Re |
| 2026-02-09 | ORSO GASTRONOMIA PTY L R | $213.00 | ACT-IN / Light meals | Restaurant (Orso Gastronomia) in Rose Park, Adelaide SA. $213 = meal/hos |
| 2026-02-25 | SPOTLIGHT MITTAGONG MITT | $199.60 | ACT-IN / Materials & Supp | Spotlight (fabric/craft/homewares store) in Mittagong NSW (Southern High |
| 2026-03-10 | SANKALP ANNERLEY | $186.75 | ACT-IN / Light meals | Sankalp (Indian restaurant) in Annerley, Brisbane. $186.75 = meal. Accou |
| 2026-03-13 | ORANGESKY STAFFORD | $160.00 | ACT-GL / Subscriptions | Orange Sky (mobile-laundry charity) location Stafford, Brisbane. $160 li |
| 2026-03-25 | TRIPLE BULL CRONULLA | $153.00 | ACT-PI / Light meals | Triple Bull (cafe/eatery) in Cronulla, southern Sydney. $153 = meal/hosp |
| 2026-03-02 | MALENYVIBESPILATES.COM G | $150.00 | ACT-IN / Drawings · PERSONAL? | Maleny Vibes Pilates (Golden Beach, Sunshine Coast). A pilates studio me |
| 2026-02-23 | STACKS OF WAX PTY LT NEW | $150.00 | ACT-IN / Light meals | 'Stacks of Wax' in Newtown, Sydney — likely a cafe/bar/eatery. $150 = ho |
| 2026-03-30 | MOL 18200 sz. toltoall V | $133.68 | ACT-IN / Fuel | MOL 'toltoallomas' = petrol station in Vecses, Hungary (near Budapest ai |
| 2026-01-19 | MALENY HARDWARE AND RURA | $133.58 | ? / ? | (no coding returned — code by hand) |
| 2026-02-13 | Amazon | $126.50 | ACT-IN / Subscriptions | Amazon, $126.50. Per the judgement-flag pattern, Amazon is a personal-vs |
| 2026-02-23 | BUNDANON ILLAROO | $120.00 | ACT-IN / 493 - Travel | Bundanon (Illaroo NSW) is an arts/residency venue near Nowra. $120 reads |
| 2026-03-09 | Woolworths | $116.82 | ACT-JP / 421 - Light meal | Generic Woolworths groceries — no location signal. Cockpit guessed ACT-J |
| 2026-03-12 | Woolworths | $101.55 | ACT-JP / 421 - Light meal | Generic Woolworths groceries, no location signal. Cockpit guessed ACT-JP |
| 2026-02-17 | Amazon | $93.40 | ACT-IN / 446 - Materials  · PERSONAL? | Generic Amazon $93.40 — no item detail. Per the judgement-flags rule, un |
| 2026-02-16 | HARRIS FARM MARKETS PT W | $89.46 | ACT-GD / 421 - Light meal | Harris Farm Markets West End (Brisbane) — groceries/catering. No clear t |
| 2026-02-02 | PARKS AUSTRALIA CANBERRA | $76.00 | ACT-GD / 493 - Travel | Parks Australia (billed Canberra HQ) runs Uluru-Kata Tjuta NP — $76 read |
| 2026-03-24 | ALICE SPRINGS CASINO O A | $36.54 | ACT-GD / 421 - Light meal | NT trip → ACT-GD; small $36.54 at Alice Springs Casino most likely a res |
| 2026-03-06 | WITTA RRC BEERWAH | $35.00 | ACT-HV / 493 - Venue/faci | Witta RRC = Witta Recreation Reserve / community hall, Beerwah/Witta are |
| 2026-03-27 | ZLR*Pattysmiths Manuka G | $31.24 | ACT-PC / Light meals | Pattysmiths burger in Manuka/Griffith, Canberra (ZLR* = Square). Canberr |
| 2026-01-21 | NANONOBLE PTE. LTD. SING | $30.98 | ACT-IN / Subscriptions | Recurring ~$28-31 charges 3x across Q3 from a Singapore entity — pattern |
| 2026-01-27 | Amazon | $28.99 | ACT-IN / Subscriptions · PERSONAL? | Generic Amazon $28.99 with no item detail — could be a personal media/re |
| 2026-03-23 | NANONOBLE PTE. LTD. SING | $28.56 | ACT-IN / Subscriptions | Second of three recurring Nanonoble Singapore charges — same SaaS micro- |
| 2026-02-18 | NANONOBLE PTE. LTD. SING | $28.46 | ACT-IN / Subscriptions | Third recurring Nanonoble Singapore charge — same SaaS micro-subscriptio |
| 2026-03-30 | Garmin | $25.00 | ACT-IN / Drawings · PERSONAL? | Garmin $25 recurring (Connect+/inReach personal subscription). Personal  |
| 2026-03-02 | Garmin | $25.00 | ACT-IN / Drawings · PERSONAL? | Second Garmin $25 recurring sub — same as above. Personal device subscri |
| 2026-03-30 | News Pty Limited | $24.00 | ACT-IN / Drawings · PERSONAL? | News Pty (News Corp) $24/mo newspaper subscription, recurring 4x. Typica |
| 2026-03-02 | News Pty Limited | $24.00 | ACT-IN / Drawings · PERSONAL? | News Pty $24 recurring (2 of 4). Same as above — personal newspaper sub, |
| 2026-02-02 | News Pty Limited | $24.00 | ACT-IN / Drawings · PERSONAL? | News Pty $24 recurring (3 of 4). Same cluster — personal newspaper sub,  |
| 2026-01-05 | News Pty Limited | $24.00 | ACT-IN / Drawings · PERSONAL? | News Pty $24 recurring (4 of 4). Same cluster — personal newspaper sub,  |
| 2026-03-31 | SQ *GOLOSA Surry Hills | $22.00 | ACT-PI / Light meals | SQ* Golosa cafe in Surry Hills, Sydney. Per coding-patterns, Surry Hills |
| 2026-02-19 | Qantas | $18.14 | ACT-IN / Travel | Qantas $18.14 — small amount, likely a seat/baggage/booking fee or chang |
| 2026-03-12 | Woolworths | $16.90 | ACT-JP / Light meals | Generic Woolworths $16.90 — no location detail. Guess assigned ACT-JP (J |
| 2026-02-09 | Apple | $14.99 | ACT-IN / 880 - Drawings · PERSONAL? | Apple $14.99 monthly = iCloud/Apple One/App Store media subscription — p |
| 2026-03-16 | Amazon Prime | $9.99 | ACT-IN / 880 - Drawings · PERSONAL? | Amazon Prime $9.99 monthly (also Jan) — personal-media subscription, exp |
| 2026-01-16 | Amazon Prime | $9.99 | ACT-IN / 880 - Drawings · PERSONAL? | Second Amazon Prime monthly charge (Jan + Mar). Personal media → Drawing |
| 2026-01-02 | DocPlay | $9.99 | ACT-IN / 880 - Drawings · PERSONAL? | DocPlay is a documentary streaming service ($9.99/mo) — consumer media s |
| 2026-01-14 | OBSIDIAN OAKVILLE ON | $7.51 | ACT-IN / 485 - Subscripti | 'Oakville ON' = Ontario, Canada; three near-identical small charges (~$7 |
| 2026-03-16 | OBSIDIAN OAKVILLE ON | $7.17 | ACT-IN / 485 - Subscripti | Second Obsidian Oakville ON charge (recurring, ~$7). Same cluster as the |
| 2026-02-13 | OBSIDIAN OAKVILLE ON | $7.08 | ACT-IN / 485 - Subscripti | Third Obsidian Oakville ON charge (recurring, ~$7). Foreign (Ontario) re |
| 2026-03-27 | DEPT OF PARLIAMENTARY CA | $7.00 | ACT-IN / 421 - Light meal | 'Dept of Parliamentary, Capital Hill' = Parliament House Canberra (café/ |
| 2026-01-27 | CABUK PTY. LTD HAYMARKET | $5.56 | ACT-PI / 452 - Taxis | Haymarket = inner Sydney; CABUK Pty (cab/rideshare operator) $5.56 → Tax |
| 2026-03-31 | SQ *GOLOSA Surry Hills | $4.50 | ACT-PI / 421 - Light meal | Golosa café, Surry Hills (Sydney), $4.50 coffee. Sydney → PICC travel cl |

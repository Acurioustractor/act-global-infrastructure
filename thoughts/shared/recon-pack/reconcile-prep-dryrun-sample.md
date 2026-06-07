# Reconcile-prep dry-run — NAB Visa #8815  ·  40/493 lines live-verified

## DELETE_PHANTOM — 13
_Live PAID bill already covers this card movement → delete the Dext dup spend-money (API). Safest write._

- 2025-12-29 · Bionic Self Storage · $12375 → bill PAID $12375 (att=true) 420d3522-8505-4e37-9ea0-97c9fc7b3ce6 [high]
- 2026-03-31 · Defy · $8686.98 → bill PAID $8686.98 (att=true) 63533b93-444d-4ed4-a8ea-9bbeef2321df [high]
- 2025-11-26 · RNM CARPENTRY · $6865.65 → bill PAID $6865.65 (att=true) af2a8efa-d84d-4d70-8482-56dadc5409a1 [high]
- 2026-01-30 · Centre Canvas And Upholstery · $4715 → bill PAID $4715 (att=true) 63b55164-ff81-4f9c-961a-820fb94edf98 [high]
- 2026-01-06 · Carbatec Brisbane · $4575.65 → bill PAID $4575.65 (att=true) 4f8826dd-f0e4-49d8-a4ac-4c876f540156 [high]
- 2026-01-06 · RW Pacific Traders · $4200 → bill PAID $4200 (att=true) b0d7936b-a7dc-4535-b3c4-ec4641a8eb56 [high]
- 2025-11-28 · Kennards Hire · $3745 → bill PAID $3745 (att=true) 58da6612-ed5d-45e8-8fbc-071217f4d942 [high]
- 2025-12-23 · Defy · $3598.09 → bill PAID $3598.09 (att=true) 8b96e972-4067-4424-954e-56d06ca1b3ec [high]
- 2025-11-26 · Allclass · $3536.35 → bill PAID $3536.35 (att=true) 3c5e6ea6-0520-4f99-8960-b4a0c1758e23 [high]
- 2025-12-19 · Defy · $3260.63 → bill PAID $3260.63 (att=true) 372be68a-f2f7-4add-ae57-6f2a5e1bf2c6 [high]
- 2026-01-07 · Smartwood · $2710.34 → bill PAID $2710.34 (att=true) e9a046f7-dad5-43ab-ae21-6e8b13e06cd1 [high]
- 2025-11-11 · Airbnb · $2475.91 → bill PAID $2475.91 (att=true) 5419a02c-223a-4407-b60f-260512b51165 [high]
- 2026-01-14 · RW Pacific Traders · $2000 → bill PAID $2034 (att=true) INV-0368 [medium]

## DELETE_DUP — 0
_Two unreconciled spend-money for one movement → delete the worse copy (needs per-pair pick)._


## ATTACH — 0
_Real + clean but no receipt → attach if we have one (e.g. Supabase), else receipt-chase._


## FLAG_AMBIGUOUS — 13
_Live AUTHORISED (unpaid) bill matches → HUMAN/SL decides: pay bill or void. No auto-action._

- 2025-11-11 · RNM CARPENTRY · $26845.65 → bill AUTHORISED $26845.65 (att=true) 63969332-b856-4097-81e7-ce64bdb31b7b
- 2025-12-16 · 1300 Washer · $13980 → bill AUTHORISED $13980 (att=true) c3d5dd2a-98e9-4261-81aa-18e57ec86109
- 2025-11-17 · Carla Furnishers · $11180 → bill AUTHORISED $11180 (att=true) 6a60f4fd-c99d-4bb2-9ad2-51f372958cbc
- 2025-10-19 · Sunshine Glamping Co · $9250 → bill AUTHORISED $9250 (att=true) af478559-7b44-4070-a49a-8f076fb7e401
- 2025-12-08 · Kennards Hire · $6616 → bill AUTHORISED $6616 (att=true) 8b2ea9ae-b082-42ec-b223-640640187740
- 2025-12-05 · Container Options · $5802.5 → bill AUTHORISED $5802.5 (att=true) ec8884b2-5a9f-4e60-a769-f2bb56fcb016
- 2025-12-27 · AAMI · $5483.95 → bill AUTHORISED $5483.95 (att=true) 83f7537d-1b83-43b5-af51-8f489988446a
- 2025-12-11 · Hatch Electrical · $3677.34 → bill AUTHORISED $3677.34 (att=true) e968441b-ddf9-40e3-a441-bc6348b5acb1
- 2025-12-19 · Defy Manufacturing · $3199.83 → bill AUTHORISED $3199.83 (att=true) 2cfca6af-4bf9-4bad-a3be-703b8961ec7e
- 2026-01-06 · Carbatec Brisbane · $2338.7 → bill AUTHORISED $2338.7 (att=true) 310fa568-bf02-4fdf-b6d4-c7e41f0ff4a4
- 2025-11-26 · Airbnb · $2324.8 → bill AUTHORISED $2324.8 (att=true) b0d2a0ed-519a-418e-bc2b-42110970cab3
- 2025-12-09 · The Sand Yard · $1968 → bill AUTHORISED $1968 (att=true) 74d83251-ef5e-4720-88e1-a418057a8ada
- 2025-11-26 · Allclass · $1948.9 → bill AUTHORISED $1948.9 (att=true) c6736638-1efe-4d90-9d93-e2bef698ad68

## MATCH_CLEAN — 13
_Correctly coded + receipted → no API action; Ben just matches the statement line._

- 2026-04-24 · Kennedy's · $8594.91
- 2026-02-09 · Elders Insurance · $8361.21
- 2025-11-13 · Defy Manufacturing · $5500
- 2026-04-15 · Defy Manufacturing · $5130.95
- 2025-10-26 · Qantas · $4647.27
- 2025-11-11 · Nicholas Marchesi · $3875
- 2026-03-13 · Qantas · $3832.02
- 2026-03-20 · Imprint5 · $3715.73
- 2026-02-23 · Longara · $3155
- 2025-11-15 · Qantas · $2398.58
- 2025-10-09 · Stratco · $2240.82
- 2026-05-11 · Qantas · $2228.78
- 2025-11-09 · Qantas · $1913.31

## ALREADY_DONE — 1
_Live Xero shows already reconciled/deleted since the mirror sync._

- 2025-01-29 · Virgin Australia · $8242.04 — live: recon=true status=AUTHORISED

## ▶ Recommended tracer (smallest high-confidence DELETE_PHANTOM)
- 2025-11-11 · Airbnb · $2475.91 → delete spend-money `9e2778dd-9c82-404a-a28b-116088bed001`; PAID bill `5419a02c-223a-4407-b60f-260512b51165` () keeps the receipt.
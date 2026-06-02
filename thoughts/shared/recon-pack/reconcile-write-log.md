# Reconcile write-log — NAB Visa #8815 (Tier-3 Xero writes, audit trail)

Every API write to live Xero from the reconcile-prep engine, in order. Each delete was live-gated (SPEND + recon=false + keeper bill PAID with receipt) and verified attempted-vs-actual.

| timestamp (UTC) | action | txn date | vendor | amount | deleted | keeper bill | result |
|---|---|---|---|---|---|---|---|
| 2026-06-02 (tracer) | DELETE_PHANTOM | 2025-11-14 | Apple Pty Ltd | $11.99 | spend-money `ced64d63-c72a-48b8-848d-508415a0899f` | PAID bill `eb46b04e-0373-49b4-8091-ccae7a6cf861` | OK — deleted, bill+receipt intact |
| 2026-06-02T02:10:40.038Z | DELETE_PHANTOM | 2025-12-23 | Railway Corporation | $5 | spend-money 175a67e6-d501-465d-9cf5-32d5095493f8 | keeper bill 2c9fe9d2-6896-43a5-b4d8-0104e8005c00 | OK |
| 2026-06-02T02:10:45.021Z | DELETE_PHANTOM | 2025-11-06 | Maleny Hardware And Rural Supplies | $14.15 | spend-money 0864d7d9-629f-4c31-bf08-5469ec515874 | keeper bill 28438da1-18a0-4fc0-b0e2-3be06640a1f8 | OK |
| 2026-06-02T02:10:49.993Z | DELETE_PHANTOM | 2025-12-01 | X Global LLC | $15 | spend-money ae23274a-48ee-4528-8e7d-70f41cca6d82 | keeper bill 703f9414-0936-47e7-9e51-7b87141461a1 | OK |
| 2026-06-02T02:10:54.958Z | DELETE_PHANTOM | 2025-12-21 | CONFESSION | $17 | spend-money 291babd1-2918-4894-9e29-040f6b1c3fd6 | keeper bill 5f21011f-9e8f-4e23-8896-f47fd1db59ba | OK |
| 2026-06-02T02:11:00.479Z | DELETE_PHANTOM | 2026-01-07 | Bitwarden | $17.75 | spend-money 4953cb96-00a3-4722-bbed-a41a88a3f273 | keeper bill a304889d-2ea5-43f9-9163-66e721fe9949 | OK |
| 2026-06-02T02:11:05.440Z | DELETE_PHANTOM | 2025-12-12 | The Roastery Cafe | $19.23 | spend-money 8b674591-441e-4a67-9b20-d0986034e8f4 | keeper bill aff821b2-ac65-4b50-9da2-227f5ac6821e | OK |
| 2026-06-02T02:11:10.457Z | DELETE_PHANTOM | 2026-04-02 | The Townsville Store | $20.5 | spend-money 3da4dda5-4440-4077-97ee-f48da493d26f | keeper bill 4848b6ee-0456-4939-ad5b-c244dc042740 | OK |
| 2026-06-02T02:11:15.424Z | DELETE_PHANTOM | 2025-12-19 | The Maleny Pie Guy | $25.4 | spend-money b2ae236d-1e64-428b-850b-0d2b9a156793 | keeper bill a3dd13fd-57f5-4418-883c-2b2b9de6ab4f | OK |
| 2026-06-02T02:11:20.443Z | DELETE_PHANTOM | 2026-03-11 | Dext Software | $28 | spend-money 9dbf33f3-00c0-4091-952d-39868d977b47 | keeper bill a0b3c50e-950b-4af3-a128-665f968068ad | OK |
| 2026-06-02T02:11:25.438Z | DELETE_PHANTOM | 2025-11-12 | SideGuide Technologies | $29.14 | spend-money 44210898-1507-4fbb-b450-060254a7c4ec | keeper bill 685b2102-adea-44e7-b459-0045d950dc05 | OK |
| 2026-06-02T02:11:30.378Z | DELETE_PHANTOM | 2025-11-26 | Apple Pty Ltd | $29.99 | spend-money cc8b87b9-4449-4755-bd61-aeeda222fab6 | keeper bill b9b5440c-1f8f-43fa-b203-bc1bf83bc78e | OK |
| 2026-06-02T02:11:35.380Z | DELETE_PHANTOM | 2026-01-17 | Cognition AI | $30.91 | spend-money bf45a7a5-a628-4a68-b723-4d33f71bf7ec | keeper bill 28e7b652-754a-4006-ba62-3c7be15f291d | OK |
| 2026-06-02T02:11:40.434Z | DELETE_PHANTOM | 2026-01-17 | Cognition AI | $30.91 | spend-money dfa821c7-f284-46ee-937a-e51716b36a72 | keeper bill 3331e956-0fa6-43d5-9bf6-66cb15ba81b5 | OK |
| 2026-06-02T02:11:45.544Z | DELETE_PHANTOM | 2025-10-13 | Uber | $30.97 | spend-money 91c14b8b-5e52-4709-8cdf-a7e38925ada0 | keeper bill dd656d11-0e7b-410e-8664-66f81ca9f63c | OK |
| 2026-06-02T02:11:50.621Z | DELETE_PHANTOM | 2026-04-05 | HighLevel | $36.21 | spend-money b75cbd28-d16b-41bd-bab0-06de7fa918d0 | keeper bill 3511af9a-dfa7-433d-bb3c-5e436787c6b8 | OK |
| 2026-06-02T02:11:55.654Z | DELETE_PHANTOM | 2025-10-01 | Uber | $36.28 | spend-money c438d8f2-d0de-4b31-bf60-7d45acf968b9 | keeper bill 601c20f4-2ba4-418c-9f2c-39b2108a2a4f | OK |
| 2026-06-02T02:12:00.585Z | DELETE_PHANTOM | 2026-01-06 | Dept of Transport & Main Roads | $39.09 | spend-money b9288bea-4c8a-4530-8281-79a90243ed5e | keeper bill ca11be49-dc4a-4933-b171-edd290496582 | OK |
| 2026-06-02T02:12:05.558Z | DELETE_PHANTOM | 2026-03-15 | Woolworths | $42.5 | spend-money f84b1f9f-f1e5-4b6b-993e-7c2929b1cf80 | keeper bill c5c9337d-ea7d-40a0-85c8-1a431b4e84cc | OK |
| 2026-06-02T02:12:10.767Z | DELETE_PHANTOM | 2026-04-09 | Every Media | $42.6 | spend-money a243c2e6-bdfa-4e01-9b62-6f6c7fcabb64 | keeper bill 7ebac46d-e968-4c75-9eaf-4853f81ebd9e | OK |
| 2026-06-02T02:12:16.249Z | DELETE_PHANTOM | 2025-12-11 | Budget Petrol Mascot | $42.83 | spend-money 719d6ba3-a5ad-49fb-b133-44639b1cf5f5 | keeper bill 5dbbb2fe-901d-40df-8fcd-6d658e1aa3d1 | OK |

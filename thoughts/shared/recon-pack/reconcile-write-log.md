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
| 2026-06-02T02:32:47.981Z | DELETE_PHANTOM | 2025-10-24 | Webflow | $44.61 | spend-money 177a386a-8047-4f1c-86d8-85d7b12675ac | keeper bill 620e7fa0-877c-4d09-b533-da0001cbf4bc | OK |
| 2026-06-02T02:32:54.050Z | DELETE_PHANTOM | 2025-12-02 | Sunshine Coast Council | $44.9 | spend-money 25c60707-828f-49e3-8590-0963fbacb849 | keeper bill dc88d544-1123-4c50-9d86-ba61ac0edeaf | OK |
| 2026-06-02T02:33:00.109Z | DELETE_PHANTOM | 2025-11-15 | Tripsim | $44.99 | spend-money 449f855f-37be-4ac5-ab32-e2d58bb90871 | keeper bill c5fccc57-2f55-4338-9632-5ef1f5af2df9 | OK |
| 2026-06-02T02:33:06.163Z | DELETE_PHANTOM | 2025-12-22 | The Roxburgh House | $45.46 | spend-money 5d8722c5-15f7-46ec-b852-9e86d9b8cab6 | keeper bill c2cfe880-ecb0-4315-809d-ed904dbf9679 | OK |
| 2026-06-02T02:33:12.297Z | DELETE_PHANTOM | 2025-12-03 | Edmonds Landscaping Supplies | $48 | spend-money 0aa7fd91-7341-4f91-9fea-57858e3e3b3e | keeper bill eadccf1b-e9ca-41d5-a932-deeba0992b33 | OK |
| 2026-06-02T02:33:18.298Z | DELETE_PHANTOM | 2025-10-03 | Zapier | $50.05 | spend-money 73d16265-f1fe-43ec-8d88-973f619fd397 | keeper bill 59c60145-27cc-4f39-b493-be99e986c90f | OK |
| 2026-06-02T02:33:24.483Z | DELETE_PHANTOM | 2025-11-01 | Zapier | $50.42 | spend-money e66e6d42-9b52-455c-a23d-fd361b31407f | keeper bill 90aa3278-f400-47dd-b105-8285dd501bc7 | OK |
| 2026-06-02T02:33:30.565Z | DELETE_PHANTOM | 2025-12-22 | Permewans Mitre 10 | $54.9 | spend-money b8e400bb-4c64-4bc6-a0c4-55b21295885b | keeper bill 1ae73482-fdd6-4f7d-84fd-2e808022724b | OK |
| 2026-06-02T02:33:36.763Z | DELETE_PHANTOM | 2025-10-24 | Taxi Receipt | $57.6 | spend-money a694ff76-83f9-4f06-afc8-ce0b1e718b91 | keeper bill 01beac17-47b6-4470-add0-39506eb4fb14 | OK |
| 2026-06-02T02:33:42.841Z | DELETE_PHANTOM | 2026-04-14 | Woolworths | $59.3 | spend-money 06440fdc-9bc3-4b7f-8ac2-462fe5266c71 | keeper bill 85950266-da75-489b-95fd-fb098f86dce0 | OK |
| 2026-06-02T02:33:48.935Z | DELETE_PHANTOM | 2025-12-13 | Memories Bistro | $60.96 | spend-money bfa89334-d753-4d69-a669-aa983d48a363 | keeper bill 40f15e89-4219-4ec6-b552-faca021e14c0 | OK |
| 2026-06-02T02:33:55.105Z | DELETE_PHANTOM | 2026-03-31 | Google Australia | $67.98 | spend-money 00961f4b-bec2-4d5a-bea2-f4522d446084 | keeper bill 239d81a9-5f0d-41c2-9815-ef595376baf8 | OK |
| 2026-06-02T02:34:01.216Z | DELETE_PHANTOM | 2025-10-14 | Webflow | $71.3 | spend-money baa4053c-623b-4e5f-887b-41a14bf268fd | keeper bill 3cdff99e-fdfc-4d0f-bd0e-2700d38361d5 | OK |
| 2026-06-02T02:34:07.298Z | DELETE_PHANTOM | 2025-12-13 | Memories Bistro | $77.22 | spend-money 043852c8-eacd-4940-afab-fafb1cd471b8 | keeper bill c1c5719a-ef30-46c3-b2f1-18f20bf38241 | OK |
| 2026-06-02T02:34:13.377Z | DELETE_PHANTOM | 2025-10-14 | Telstra | $80 | spend-money 6eb5e5f0-7281-44b4-8c2f-486a3cee5c10 | keeper bill 3d1c1a32-8c95-4379-bed1-79df723575fe | OK |
| 2026-06-02T02:34:19.927Z | DELETE_PHANTOM | 2026-01-06 | Clark Rubber Capalaba | $86.36 | spend-money 9c6ffec4-e226-40da-910d-256cfd137444 | keeper bill e8ccd851-3b75-45e0-87c7-07f97e65fd3a | OK |
| 2026-06-02T02:34:25.992Z | DELETE_PHANTOM | 2025-12-11 | Repco | $96 | spend-money bae857c8-f60d-4ac3-a838-bf1514fa2d16 | keeper bill 55427dbb-1d8f-45fb-ba04-0cd518ab89de | OK |
| 2026-06-02T02:34:32.156Z | DELETE_PHANTOM | 2026-01-10 | Reddy Express | $99.03 | spend-money 7e418b5a-6e47-46f4-a05e-d6795984f145 | keeper bill dd3a4e4d-13c5-4078-b4a2-e75f6839b7b5 | OK |
| 2026-06-02T02:34:38.309Z | DELETE_PHANTOM | 2026-01-31 | Voyages Indigenous Tourism Australia Pty Ltd | $99.89 | spend-money 725f7cbf-56ef-4983-abd7-ee5f20561d65 | keeper bill 62d56d8c-ed7b-4dff-b06b-a98b19a9c34b | OK |
| 2026-06-02T02:34:44.379Z | DELETE_PHANTOM | 2026-01-18 | Alsahwa Estate | $105.67 | spend-money 1e3f57c1-84dd-413b-8e70-f75121c0099c | keeper bill 25d19210-d0e6-4e82-b34a-a5d439b1b955 | OK |
| 2026-06-02T02:34:50.470Z | DELETE_PHANTOM | 2026-03-27 | Bunnings Warehouse | $111.2 | spend-money 6a87e299-d09f-4e12-bde6-8d2c0a3a3782 | keeper bill ec0b024a-715e-467a-9600-1528e9a1ceb1 | OK |
| 2026-06-02T02:34:56.598Z | DELETE_PHANTOM | 2025-11-24 | Car Park | $119 | spend-money 8689b0bf-9ab3-41ab-ad1c-eeeea426670a | keeper bill f71dd2b6-4563-4cad-b00d-dc3bf38456f6 | OK |
| 2026-06-02T02:35:02.742Z | DELETE_PHANTOM | 2025-12-12 | Reddy Express | $122.71 | spend-money fae92640-df5c-435b-8bf6-e299754c4a1d | keeper bill d91a8fc6-e382-4759-ade0-9af36de05ec4 | OK |
| 2026-06-02T02:35:08.790Z | DELETE_PHANTOM | 2025-12-04 | Nighton Harvey | $124.79 | spend-money 87d6101e-ca59-40f0-8bd2-b2332453b994 | keeper bill 4178b00e-2a09-41b0-8008-3957c1367e4b | OK |
| 2026-06-02T02:35:14.843Z | DELETE_PHANTOM | 2025-10-27 | Qantas Group Accommodation | $131 | spend-money bf296a91-2398-4790-85cd-04182c9e60b5 | keeper bill 10396498-a0f6-4303-849b-6b7dfdc0df82 | OK |
| 2026-06-02T02:35:20.909Z | DELETE_PHANTOM | 2025-11-15 | Lotte Duty Free | $131.69 | spend-money f4e3a4f6-8485-42fc-895c-2c401dcf994b | keeper bill 356afc94-dc1e-4a2c-8bdb-5c22eb08dc80 | OK |
| 2026-06-02T02:35:27.364Z | DELETE_PHANTOM | 2025-12-21 | Millicent Service Station | $138.07 | spend-money db81f062-78fe-427f-828c-c3a317acff34 | keeper bill db1a5164-556c-4c72-8af9-7141b5a0661e | OK |
| 2026-06-02T02:35:33.459Z | DELETE_PHANTOM | 2026-01-12 | Reddy Express | $140.29 | spend-money fd2b0a91-c9c6-4c1c-a189-98cea6bc188b | keeper bill f5db859a-63e1-43fa-929d-a9712093aa42 | OK |
| 2026-06-02T02:35:39.801Z | DELETE_PHANTOM | 2025-10-02 | Cognition AI | $151.09 | spend-money d4812e80-e47e-4d47-aa9c-d1af68a6c1be | keeper bill 4b887363-6a4f-4a4d-a33d-e81559a7e97d | OK |
| 2026-06-02T02:35:45.822Z | DELETE_PHANTOM | 2025-12-22 | Mobil Mobil Hamilton | $159.74 | spend-money 9b6dd774-64b4-42d9-b628-10af4660216e | keeper bill 53fc72cb-ee3b-4e93-9562-2df3d02f737e | OK |
| 2026-06-02T02:35:51.891Z | DELETE_PHANTOM | 2026-03-12 | Orange Sky Australia | $160 | spend-money a77b4cfe-4bb6-42c1-a258-275c28d5386a | keeper bill c1c8a5b0-e376-4efd-a0c5-810c3bcea7e0 | OK |
| 2026-06-02T02:35:57.956Z | DELETE_PHANTOM | 2025-11-23 | HighLevel | $165.48 | spend-money 8412317b-b86c-4dd0-a0c0-6ef6dadfe159 | keeper bill 2826adbe-bcb7-4214-86c4-6bca8a698263 | OK |
| 2026-06-02T02:36:04.141Z | DELETE_PHANTOM | 2025-12-09 | Budget Car and Truck Rental (NT) | $177.36 | spend-money 66511cfb-a375-4652-a9ac-46c60149b4c9 | keeper bill 21e9a2cf-c361-4b87-84f1-c3d849ca64b7 | OK |
| 2026-06-02T02:36:10.156Z | DELETE_PHANTOM | 2026-01-06 | The Bolt King | $182.27 | spend-money c21abed2-6238-4927-8b23-e3ce6db2b88c | keeper bill 20427ef4-8936-4e32-b04b-b7c7713436bf | OK |
| 2026-06-02T02:36:16.205Z | DELETE_PHANTOM | 2026-01-06 | Brisbane Steel Supplies | $185.7 | spend-money 7941df11-05e3-4b5e-9d68-b7eafad5ed0d | keeper bill ce191d6a-0cc8-46ae-8c95-6d8dcdef81e1 | OK |
| 2026-06-02T02:36:22.250Z | DELETE_PHANTOM | 2025-12-16 | Happy Boy | $197.99 | spend-money ca5483f0-cd5e-47ff-81ef-016dfafc72d0 | keeper bill ad894254-44e6-428e-854c-01fc38eeccb5 | OK |
| 2026-06-02T02:36:28.500Z | DELETE_PHANTOM | 2025-12-03 | Edmonds Landscaping Supplies | $264 | spend-money d18e8056-086c-40cf-a686-a29d97ffe0cd | keeper bill 9da53ca3-194b-434e-87e6-bf061fa20160 | OK |
| 2026-06-02T02:36:35.648Z | DELETE_PHANTOM | 2025-12-30 | Liberty Maleny | $277.34 | spend-money 75746834-19fe-42d2-9370-1ce18d153f6b | keeper bill e89e8673-447e-4271-9ef6-80d5a37e2adc | OK |
| 2026-06-02T02:36:41.718Z | DELETE_PHANTOM | 2026-01-27 | Orange Sky Australia | $288 | spend-money bd03bd56-dbee-4e2d-8fad-69129455b2e1 | keeper bill fefb8001-22d1-4135-833c-f4d502852f0a | OK |
| 2026-06-02T02:36:47.747Z | DELETE_PHANTOM | 2025-12-21 | Blair Robertson - Oak & Anchor Hotel | $299.29 | spend-money 6b928272-c5c8-4ea5-bda5-34e5bc069240 | keeper bill 211c092f-9a39-4f24-991e-5a3d5bf2a00e | OK |
| 2026-06-02T02:36:53.829Z | DELETE_PHANTOM | 2026-02-06 | Montes Reef Resort | $300 | spend-money 4818474e-5a95-45c1-96b4-73203b07a1c6 | keeper bill 4af471fe-41c1-4b1a-ad7d-9099b3a38f66 | OK |
| 2026-06-02T02:36:59.875Z | DELETE_PHANTOM | 2026-05-05 | Bunnings Warehouse | $310.32 | spend-money d28c9992-071a-41fa-94c3-7962a96ac1a2 | keeper bill 4e43002a-19fe-42d3-8c10-d41d244a4ef9 | OK |
| 2026-06-02T02:37:11.355Z | DELETE_PHANTOM | 2026-01-27 | Easel Software | $312.71 | spend-money e7018fcc-b993-43e4-b1a5-3c6acb3952ec | keeper bill 1a338c2a-01ef-463d-9291-6e74ba5b68e1 | OK |
| 2026-06-02T02:37:17.420Z | DELETE_PHANTOM | 2025-11-04 | AGL | $319.09 | spend-money b364c190-1efa-4e50-9aa8-b217cc3155e1 | keeper bill 5abfbed4-3492-48df-85ee-bc0cc49d8dba | OK |
| 2026-06-02T02:37:23.618Z | DELETE_PHANTOM | 2025-12-02 | Domino's Pizza Enterprises | $330 | spend-money 43dceb21-df48-4a04-9ee0-0117ae62cefa | keeper bill b82c883e-20cb-4bd1-9af2-7abc3ad7eec4 | OK |
| 2026-06-02T02:37:30.836Z | DELETE_PHANTOM | 2025-12-22 | Airbnb | $369.82 | spend-money d42d0c23-6391-4991-bc7c-88c9f8a2fd8c | keeper bill eb0fd810-4c92-4f4e-be69-146f342b4f3f | OK |
| 2026-06-02T02:37:36.956Z | DELETE_PHANTOM | 2025-12-12 | Tennant Creek Retreat | $370 | spend-money 733551cf-3e04-4ae9-8f23-31b405b04f1c | keeper bill b98dcb89-4cee-4c96-9e8c-1b62e1c32cc3 | OK |
| 2026-06-02T02:37:43.042Z | DELETE_PHANTOM | 2025-12-10 | The Sand Yard | $373.52 | spend-money 42a2d9bf-a241-4533-bbfd-c2500e3eeb2b | keeper bill dbc638e7-83ba-4cde-a530-340d222dece2 | OK |
| 2026-06-02T02:38:16.280Z | DELETE_PHANTOM | 2025-11-30 | POLOLA | $549.05 | spend-money 693eb9e5-f06a-4e82-a50b-38c609117609 | keeper bill 7e7381b3-193e-4fd9-af3e-57fefc0cfc95 | OK |
| 2026-06-02T02:38:22.351Z | DELETE_PHANTOM | 2025-12-14 | Bunnings Warehouse | $596.96 | spend-money ede19faf-6635-44df-9c9c-5ac6dac7f3c8 | keeper bill 328ee314-43db-4ea2-a9e0-e414ebb26306 | OK |
| 2026-06-02T02:38:28.376Z | DELETE_PHANTOM | 2025-10-27 | Qantas | $598.18 | spend-money ddc94c4a-590b-43cf-b0ee-6250fd938be2 | keeper bill be1ba034-7e9f-4fd5-ae3d-c87a0a3abefa | OK |
| 2026-06-02T02:38:34.449Z | DELETE_PHANTOM | 2026-03-23 | BOB BROWN FOUNDATION | $600 | spend-money 0bd21ffa-5092-4231-98a6-c312e228a3ff | keeper bill 8a308a32-3a3c-40f1-810f-5e26631f9964 | OK |
| 2026-06-02T02:38:40.589Z | DELETE_PHANTOM | 2026-01-12 | Bunnings Warehouse | $616.97 | spend-money 19b17b82-6881-4dea-8701-72891dc6f0e3 | keeper bill c8fbe125-b299-4990-a432-ef346cf989d0 | OK |
| 2026-06-02T02:38:46.928Z | DELETE_PHANTOM | 2025-11-27 | Auto Sparky | $674 | spend-money 080f78fb-f170-4282-8565-a1724b141258 | keeper bill c159e6e7-3a85-4413-af84-bfa9bfbe4305 | OK |
| 2026-06-02T02:38:53.513Z | DELETE_PHANTOM | 2025-12-24 | BOE Design | $750 | spend-money 4bfeb7d0-1e2f-4bda-aacc-34eaeccd9198 | keeper bill 3f67406e-c595-43b3-b990-8a150f40a714 | OK |
| 2026-06-02T02:38:59.540Z | DELETE_PHANTOM | 2026-01-12 | Defy | $893.47 | spend-money 08daff7c-44bf-4ea5-ad65-72e2202f6819 | keeper bill 4c915112-4085-41b1-99f8-92863a1aaddf | OK |
| 2026-06-02T02:39:05.647Z | DELETE_PHANTOM | 2025-12-11 | Loadshift Sydney | $1243.59 | spend-money 569038e9-6546-4e9f-82c6-334036158a6c | keeper bill 44537e68-59d9-4683-b273-96e3c3c63d18 | OK |
| 2026-06-02T02:39:11.707Z | DELETE_PHANTOM | 2025-11-09 | Avis | $1247.62 | spend-money b6ca711e-e27e-45f6-bee6-7d471d78e813 | keeper bill 5334a921-5d6b-4076-8e8e-e838c5d0119a | OK |
| 2026-06-02T02:39:19.946Z | DELETE_PHANTOM | 2025-11-08 | Bunnings Warehouse | $1468.28 | spend-money eaae5bfc-77f0-4aed-8b9d-a143937befb7 | keeper bill de612434-acd1-4845-a172-682af9f8720d | OK |
| 2026-06-02T02:39:26.050Z | DELETE_PHANTOM | 2025-12-09 | Kennards Hire | $1714 | spend-money a7d099ee-4aa7-4e45-ab63-945b11070852 | keeper bill 8651221a-2768-49a4-a498-eb6fb8617ffa | OK |
| 2026-06-02T02:39:32.127Z | DELETE_PHANTOM | 2026-01-12 | Carbatec Brisbane | $1811.7 | spend-money 94f474a7-6f6d-47a6-bfe0-2bfc56f76b92 | keeper bill 8e0c1987-71ee-494e-bbfb-a3f716485af1 | OK |
| 2026-06-02T02:39:38.232Z | DELETE_PHANTOM | 2025-11-29 | Defy | $1894.1 | spend-money c496a052-c0f0-4543-b1de-c1d4a90f388b | keeper bill c8d99460-6ba7-4813-86c7-2ba6739a9781 | OK |
| 2026-06-02T02:39:44.299Z | DELETE_PHANTOM | 2026-01-14 | RW Pacific Traders | $2000 | spend-money 4fcee4ef-84aa-40bf-a511-b14763beebbe | keeper bill fdfe3ea2-55e2-4efb-99f6-62ecee5a6998 | OK |
| 2026-06-02T02:39:50.616Z | DELETE_PHANTOM | 2025-11-11 | Airbnb | $2475.91 | spend-money 9e2778dd-9c82-404a-a28b-116088bed001 | keeper bill 5419a02c-223a-4407-b60f-260512b51165 | OK |
| 2026-06-02T02:39:56.939Z | DELETE_PHANTOM | 2026-01-07 | Smartwood | $2710.34 | spend-money 31fca37a-fb3a-4bb6-9eca-3f3779a3c8a1 | keeper bill e9a046f7-dad5-43ab-ae21-6e8b13e06cd1 | OK |
| 2026-06-02T02:40:03.046Z | DELETE_PHANTOM | 2025-12-19 | Defy | $3260.63 | spend-money ebf6cf0a-d8a7-4d37-bc15-11a52b3eb206 | keeper bill 372be68a-f2f7-4add-ae57-6f2a5e1bf2c6 | OK |
| 2026-06-02T02:40:09.114Z | DELETE_PHANTOM | 2025-11-26 | Allclass | $3536.35 | spend-money c5659706-8dc2-49c0-890c-e880974b1d1a | keeper bill 3c5e6ea6-0520-4f99-8960-b4a0c1758e23 | OK |
| 2026-06-02T02:40:15.170Z | DELETE_PHANTOM | 2025-12-23 | Defy | $3598.09 | spend-money 4d5c4843-1ce3-48b7-bf7e-0c3a0a33c28d | keeper bill 8b96e972-4067-4424-954e-56d06ca1b3ec | OK |
| 2026-06-02T02:40:21.470Z | DELETE_PHANTOM | 2025-11-28 | Kennards Hire | $3745 | spend-money 3eb2f80b-4044-49d5-bddf-b1c81dc35ff7 | keeper bill 58da6612-ed5d-45e8-8fbc-071217f4d942 | OK |
| 2026-06-02T02:40:27.506Z | DELETE_PHANTOM | 2026-01-06 | RW Pacific Traders | $4200 | spend-money faa4896c-ed8e-46cf-8ed8-cf41367a3d1d | keeper bill b0d7936b-a7dc-4535-b3c4-ec4641a8eb56 | OK |
| 2026-06-02T02:40:33.629Z | DELETE_PHANTOM | 2026-01-06 | Carbatec Brisbane | $4575.65 | spend-money d8b32ab2-604c-46ff-8ac0-92d5bfd347c9 | keeper bill 4f8826dd-f0e4-49d8-a4ac-4c876f540156 | OK |
| 2026-06-02T02:40:39.755Z | DELETE_PHANTOM | 2026-01-30 | Centre Canvas And Upholstery | $4715 | spend-money 8861a415-c385-4e9a-80ea-77e643ef3e8d | keeper bill 63b55164-ff81-4f9c-961a-820fb94edf98 | OK |
| 2026-06-02T02:40:45.821Z | DELETE_PHANTOM | 2025-11-26 | RNM CARPENTRY | $6865.65 | spend-money 3349b30e-e606-4520-a4fc-f1efabe15d42 | keeper bill af2a8efa-d84d-4d70-8482-56dadc5409a1 | OK |
| 2026-06-02T02:40:51.880Z | DELETE_PHANTOM | 2026-03-31 | Defy | $8686.98 | spend-money fec66998-2225-49f5-a054-5a9b2ea542f8 | keeper bill 63533b93-444d-4ed4-a8ea-9bbeef2321df | OK |
| 2026-06-02T02:40:57.946Z | DELETE_PHANTOM | 2025-12-29 | Bionic Self Storage | $12375 | spend-money 370fbede-ee74-471a-8868-4a6cbd553538 | keeper bill 420d3522-8505-4e37-9ea0-97c9fc7b3ce6 | OK |
| 2026-06-02T02:43:24.149Z | DELETE_PHANTOM | 2025-11-29 | Shorehouse Townsville | $486.19 | spend-money e36e24f4-1dca-42b6-a191-ea5e3168642c | keeper bill e2059fe3-5cf2-4c68-ab38-1b88e44582b1 | OK |
| 2026-06-02T02:43:24.184Z | DELETE_PHANTOM | 2025-11-12 | Kennards Hire | $424 | spend-money a7628c87-0950-4dd1-a5d0-57eccb519d93 | keeper bill 55dddccd-3726-450b-ac66-dfb7bd3f08c9 | OK (deleted; auto-log missed due to transient verify error, confirmed DELETED live) |
| 2026-06-02T02:55:34.178Z | DELETE_DUP | 2026-03-12 | Firecrawl | $13.32 | spend-money 7e6b8545-6039-4ebf-9f1c-ca2b55e99f64 | keeper spend-money 594d7ccb-8a33-45f1-8655-c53a213fdc8b (ref PTJQ79UH-0009) | OK |
| 2026-06-02T02:55:39.617Z | DELETE_DUP | 2026-04-12 | Firecrawl | $13.45 | spend-money 4c04fc14-1cf5-47d7-b7ec-d2212bd8b5d3 | keeper spend-money 2a151bc1-f779-4573-8e25-51e1d4a983f7 (ref PTJQ79UH-0010) | OK |
| 2026-06-02T02:55:45.057Z | DELETE_DUP | 2026-04-29 | Supabase | $13.98 | spend-money 39bedd85-667e-4707-86c3-825bbb586bc7 | keeper spend-money 2399633e-aa66-4a7c-b59f-97add40219ae (ref WSHNYD-00023) | OK |
| 2026-06-02T02:55:50.861Z | DELETE_DUP | 2026-01-17 | Vercel | $20 | spend-money 350a694e-59b6-4624-a08a-8e474db2da23 | keeper spend-money 08d86e6c-62b6-45a8-b735-a742b5efed00 (ref 6FDD0732-0003) | OK |
| 2026-06-02T02:55:56.115Z | DELETE_DUP | 2026-03-21 | Vercel | $21.29 | spend-money e7e59ee1-936d-4104-86c9-2b368cc522d6 | keeper spend-money 41bc76c0-0b24-4a07-b17d-237bf91f5e76 (ref 6FDD0732-0007) | OK |
| 2026-06-02T02:56:01.608Z | DELETE_DUP | 2026-02-05 | HighLevel | $35.85 | spend-money 63a7f649-bb9e-4159-a98e-6829ca6a1f7c | keeper spend-money 182e1b75-4729-465f-8014-3ba59fd7ef42 (ref AGAPY3VP-0006) | OK |
| 2026-06-02T02:56:07.177Z | DELETE_DUP | 2026-03-21 | Supabase | $87.25 | spend-money d0ed8e72-195d-4e66-a9d6-5fdd237fe2a3 | keeper spend-money 6865285f-7203-4fe2-966d-3bd394d21628 (ref WSHNYD-00020) | OK |
| 2026-06-02T02:56:12.625Z | DELETE_DUP | 2026-03-23 | HighLevel | $139.05 | spend-money a3aca097-ad62-4d0d-8022-a0dadd10d149 | keeper spend-money 76803539-e469-40b7-a544-00ddca0b25bf (ref AGAPY3VP-0009) | OK |

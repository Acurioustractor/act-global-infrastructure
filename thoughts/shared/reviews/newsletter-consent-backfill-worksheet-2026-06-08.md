# Newsletter Consent Backfill — Worksheet

> Generated 2026-06-07T20:39:07.876Z · mode: **APPLY**
> Source of truth for `source` = LIVE GHL contact record (the mirror does not carry it).

## 1. Summary

| Metric | Count |
|---|---|
| Newsletter-tagged, no consent recorded (worklist, live-readable ids) | 210 |
| Contacts checked (live GHL read OK) | 183 |
| Live read errors (could not classify) | 27 |
| **OPT-IN (backfillable)** | **108** |
| &nbsp;&nbsp;of which on Harvest list | 62 |
| NOT-OPT-IN (flag, no backfill) | 11 |
| UNKNOWN (Ben to rule) | 64 |
| Skipped (auto_/null mirror ids — not live GHL contacts) | 1 |

Newsletter-tagged rows scanned in mirror (incl. already-consented): 325.

## 2. Source distribution (distinct live `source` → count → classification)

| Live GHL source | Count | Classification |
|---|---|---|
| Website Inquiry | 37 | UNKNOWN |
| Newsletter Signup (footer) | 31 | OPT-IN |
| Harvest \| Member Signup | 28 | OPT-IN |
| Harvest member list | 20 | OPT-IN |
| gathering-footer | 14 | OPT-IN |
| ACT Intelligence | 14 | UNKNOWN |
| Container Request CSV | 8 | NOT-OPT-IN |
| Newsletter Signup (canberra-airport-2026) | 5 | OPT-IN |
| ACT Agent | 5 | UNKNOWN |
| (blank/null) | 3 | NOT-OPT-IN |
| Newsletter Signup (parliament-house-demo) | 3 | OPT-IN |
| Newsletter Signup | 3 | OPT-IN |
| Website Contact Form | 2 | UNKNOWN |
| Newsletter Signup (goods-general-inquiry) | 2 | OPT-IN |
| phase3-question-verify | 1 | UNKNOWN |
| phase3-follow-verify | 1 | UNKNOWN |
| phase3-follow-verify2 | 1 | UNKNOWN |
| Photo Wall — Witta Gathering | 1 | UNKNOWN |
| Newsletter Signup (canberra-airport-2026-smoke) | 1 | OPT-IN |
| Newsletter Signup (naidoc-2026) | 1 | OPT-IN |
| Direct outreach - education collaboration | 1 | UNKNOWN |
| Website - Harvest Shop Interest | 1 | UNKNOWN |

## 3. Per-list breakdown (contacts with no consent)

| List | Total no-consent | Backfillable (OPT-IN) | Not-opt-in | Unknown |
|---|---|---|---|---|
| ACT | 63 | 55 | 0 | 8 |
| Goods | 91 | 46 | 2 | 43 |
| Harvest | 70 | 62 | 0 | 8 |
| JusticeHub | 22 | 0 | 9 | 13 |
| Generic | 60 | 55 | 0 | 5 |

_Note: a contact on more than one newsletter list is counted once per list, so list totals can exceed the worklist count._

## 4. UNKNOWN — Ben rules on these (64 total, showing up to 50)

| ghl_id | Live source (verbatim) | List(s) |
|---|---|---|
| V8n6DFh9apuRqjYHC0zI | phase3-question-verify | Harvest |
| IBCn3GJoYY9yefSSRma9 | phase3-follow-verify | Harvest |
| 5LqgNvZQ2TGXHyJguHkB | Website Inquiry | Goods, ACT |
| 7ZKeS2H6Fyi1xDUTvING | Website Inquiry | Goods, ACT |
| moxP9fCQ7a2pdibcxPDa | Website Inquiry | Goods |
| 1FJKzuyt1IpEFdjbJhjC | Website Inquiry | Goods |
| zeHEzXBZhDtcI0mtMzGz | phase3-follow-verify2 | Harvest |
| wHstWIW6zo1ifWnWsayd | Website Inquiry | Goods |
| o0nVQWqVWIGTqXbg0zuG | Website Inquiry | JusticeHub |
| B7vVWvvVhrUhP3QL3Dnl | Website Inquiry | Goods |
| CjmW3zEgVVEYnrkw8tvq | Website Inquiry | Goods |
| WaTXyJ8P4oFUYeR5sXHT | Website Inquiry | Goods |
| 7WXGBE5zD73ipAJfb5qE | Website Inquiry | Goods, ACT |
| l1v8gPj5zXhURMeS0mCv | Website Inquiry | JusticeHub |
| eyr6Cv6B9cf2VFUzJBQs | Website Inquiry | Goods |
| M6SIDwBoUo4NxKaMXF6G | Website Inquiry | Goods |
| HABAwRKk7dKtPNDRsn3S | Photo Wall — Witta Gathering | Generic, Harvest, ACT |
| JGpJ2UCTsJlHT4GQDNGs | Website Inquiry | Goods |
| GR0z6Lvl2N7gdUEqzMLk | Website Inquiry | Goods |
| 38zTrONPDE7cLUlj0EQI | Website Contact Form | Generic, Harvest, ACT |
| 601lLFL2WpQFwlcLmPBx | Website Inquiry | Goods |
| KZ7RJfJUV7Pd720EYBVv | ACT Intelligence | JusticeHub |
| XzYIATpLL8iVflrf1Hll | Website Inquiry | Goods |
| LfwjeSOvc2Mq3u4f2qm4 | Website Inquiry | Goods |
| YveuSGaoTk1fk105ExPO | Website Inquiry | Goods |
| 7i2onyZFqX12BKlx5uLY | Website Inquiry | Goods |
| ORCR9yml6dCRlrD87rMm | Website Contact Form | Generic, Harvest, ACT |
| 4xqT9yHGyDBJKaUPf2lJ | Website Inquiry | Goods |
| b0ma8b1Gj8MnvCk7zHjS | ACT Agent | Goods |
| mTsZ14zvtIs3XaaTHHhX | Website Inquiry | JusticeHub |
| AIrpQMtxPZJvHG45duw9 | ACT Intelligence | JusticeHub |
| Q4h5Aa8lRj8YDOZ0E8s2 | Website Inquiry | Goods |
| IgobH3bxpJMAMNxhUCVS | Website Inquiry | Goods |
| j7hi3rlHwmIuDKNSIdTs | Website Inquiry | Goods |
| 0w3yMTXm12bl74aKGce0 | Website Inquiry | Goods |
| Qtl5PgkHPMnNS1mjnGRO | Website Inquiry | Goods |
| xIjgrNst0t7q3xDPqOE4 | ACT Intelligence | JusticeHub |
| tiC3ISBpkDdmS54agG6P | Website Inquiry | Goods |
| qmFrCOsGrXQbLsIgjAzX | Website Inquiry | Goods |
| aZICs18JhTlYcCja2awk | Website Inquiry | Goods |
| Fhk0FK9FcN563lUcSKhT | Website Inquiry | Goods |
| nZDW2c7bgNmKT62iOMP4 | Website Inquiry | Goods |
| VbPl2qLoyWZlYL2HmOtY | ACT Intelligence | JusticeHub |
| K9tX5VZ7kLi4bencvHSm | ACT Intelligence | Goods |
| vcpRdRWPqykY2oHXrJ9I | ACT Intelligence | JusticeHub |
| Z7OBTZkhvGwXGrDuTFBE | ACT Agent | Goods |
| RI1TytFSVn0qCj3OpxMQ | Website Inquiry | Goods |
| x4EfbfBlRvMu6ouCOowT | Direct outreach - education collaboration | Generic, Harvest, ACT |
| 9eSq6vFfQEVxCToD8Mru | Website - Harvest Shop Interest | Generic, Harvest, ACT |
| ua7d7GzRAlKkivxPTsrv | ACT Agent | Goods |

_… and 14 more UNKNOWN not shown._

## Appendix — live read errors (27)

| ghl_id | Error |
|---|---|
| MMrEpSBB5rbHzONLDirb | GHL API Error (400): {"message":"Contact not found for id:MMrEpSBB5rbHzONLDirb","error":"Bad Request","statusCode":400} |
| O5zWG2qnHYaeMPlYdK6z | GHL API Error (400): {"message":"Contact not found for id:O5zWG2qnHYaeMPlYdK6z","error":"Bad Request","statusCode":400} |
| VSSE1F4Bmkw6sw5wgTy7 | GHL API Error (400): {"message":"Contact not found for id:VSSE1F4Bmkw6sw5wgTy7","error":"Bad Request","statusCode":400} |
| x9ThLGVPslEOSbyoYbNR | GHL API Error (400): {"message":"Contact not found for id:x9ThLGVPslEOSbyoYbNR","error":"Bad Request","statusCode":400} |
| AdJpwIAPKGtcKw9WLu29 | GHL API Error (400): {"message":"Contact not found for id:AdJpwIAPKGtcKw9WLu29","error":"Bad Request","statusCode":400} |
| 4OqXAzUlCUMLsiHTe3rF | GHL API Error (400): {"message":"Contact not found for id:4OqXAzUlCUMLsiHTe3rF","error":"Bad Request","statusCode":400} |
| EDKmaIE8UPjPtao6SbfS | GHL API Error (400): {"message":"Contact not found for id:EDKmaIE8UPjPtao6SbfS","error":"Bad Request","statusCode":400} |
| tr5gXz8M27R7Y6PyZ3WD | GHL API Error (400): {"message":"Contact not found for id:tr5gXz8M27R7Y6PyZ3WD","error":"Bad Request","statusCode":400} |
| YsWWhmDZVD7uE79CPu47 | GHL API Error (400): {"message":"Contact not found for id:YsWWhmDZVD7uE79CPu47","error":"Bad Request","statusCode":400} |
| WGk3celbZDDUfpnTB6RN | GHL API Error (400): {"message":"Contact not found for id:WGk3celbZDDUfpnTB6RN","error":"Bad Request","statusCode":400} |
| SmUktK2W5UI0zUo6MQIb | GHL API Error (400): {"message":"Contact not found for id:SmUktK2W5UI0zUo6MQIb","error":"Bad Request","statusCode":400} |
| OWhy9GngB951NmAkLvJv | GHL API Error (400): {"message":"Contact not found for id:OWhy9GngB951NmAkLvJv","error":"Bad Request","statusCode":400} |
| 0MFGPZ12sPDC16ekD9cz | GHL API Error (400): {"message":"Contact not found for id:0MFGPZ12sPDC16ekD9cz","error":"Bad Request","statusCode":400} |
| FYz6uKocaowPMWGHjTUT | GHL API Error (400): {"message":"Contact not found for id:FYz6uKocaowPMWGHjTUT","error":"Bad Request","statusCode":400} |
| j6S1E0B1NNfv4MZIp6AI | GHL API Error (400): {"message":"Contact not found for id:j6S1E0B1NNfv4MZIp6AI","error":"Bad Request","statusCode":400} |
| Oe2NBiLSraMozWjQtN7H | GHL API Error (400): {"message":"Contact not found for id:Oe2NBiLSraMozWjQtN7H","error":"Bad Request","statusCode":400} |
| 2yYqSMpfx3dYKc0pEwvC | GHL API Error (400): {"message":"Contact not found for id:2yYqSMpfx3dYKc0pEwvC","error":"Bad Request","statusCode":400} |
| 6xH4kk4pEYuYjjeLDCuO | GHL API Error (400): {"message":"Contact not found for id:6xH4kk4pEYuYjjeLDCuO","error":"Bad Request","statusCode":400} |
| K0fgTViQk5ku9uSpZhQL | GHL API Error (400): {"message":"Contact not found for id:K0fgTViQk5ku9uSpZhQL","error":"Bad Request","statusCode":400} |
| jNEODSZKLyfTawTNUgoy | GHL API Error (400): {"message":"Contact not found for id:jNEODSZKLyfTawTNUgoy","error":"Bad Request","statusCode":400} |
| 59lCqC8pRDkTPwTVqcAT | GHL API Error (400): {"message":"Contact not found for id:59lCqC8pRDkTPwTVqcAT","error":"Bad Request","statusCode":400} |
| khk5s2EIrtT9W5jP6clm | GHL API Error (400): {"message":"Contact not found for id:khk5s2EIrtT9W5jP6clm","error":"Bad Request","statusCode":400} |
| lPYoVrMXGsHlv3xRqaI7 | GHL API Error (400): {"message":"Contact not found for id:lPYoVrMXGsHlv3xRqaI7","error":"Bad Request","statusCode":400} |
| FI2BVUYDX25xYY1kItci | GHL API Error (400): {"message":"Contact not found for id:FI2BVUYDX25xYY1kItci","error":"Bad Request","statusCode":400} |
| miiooAui8SNXwev37e7K | GHL API Error (400): {"message":"Contact not found for id:miiooAui8SNXwev37e7K","error":"Bad Request","statusCode":400} |
| hCRawvTy4LqaVoFcmnle | GHL API Error (400): {"message":"Contact not found for id:hCRawvTy4LqaVoFcmnle","error":"Bad Request","statusCode":400} |
| pRSrM0tnXQjYHfGeASAo | GHL API Error (400): {"message":"Contact not found for id:pRSrM0tnXQjYHfGeASAo","error":"Bad Request","statusCode":400} |

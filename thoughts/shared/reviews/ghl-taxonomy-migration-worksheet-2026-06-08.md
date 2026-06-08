# GHL Taxonomy Migration Worksheet — 2026-06-08

> READ-ONLY dry-run output of `scripts/ghl-taxonomy-migrate.mjs`. Nothing was written to GHL or the DB.
> Source: `ghl_contacts` mirror (shared Supabase `tednluwflfhxyucgwigh`). Specs: `wiki/concepts/ghl-crm-taxonomy.md` (§2/§3) + `wiki/concepts/ghl-audience-comms-automation.md` (Layer 5 gates).
> Generated: 2026-06-07T19:31:18.256Z

## 1. Summary counts

- **Contacts scanned:** 2586
- **Total ADD ops:** 1024
- **Total REMOVE ops:** 4115
- **Orphan tags (distinct):** 237 — see §3
- **Community-line violations:** 33 — see §4
- **Consent violations:** 284 — see §5
- **Cruft tag-uses to delete:** 627 across 2 distinct cruft tags

## 2. Migration table (legacy tag → target, # contacts affected)

| Legacy tag | Target | # contacts |
|---|---|---|
| `act-gd` | `project:act-gd` | 491 |
| `goods` | `project:act-gd` | 288 |
| `storyteller` | `role:storyteller` | 287 |
| `audience-partner` | `role:partner` | 277 |
| `empathy ledger` | `project:act-el` | 267 |
| `goods-newsletter` | `comms:goods-newsletter` | 210 |
| `harvest-website` | `source:website + project:act-hv` | 179 |
| `goods-inquiry` | `role:buyer + project:act-gd` | 126 |
| `audience-brand` | `(drop)` | 119 |
| `goods-supporter` | `role:supporter + project:act-gd` | 113 |
| `act-hv` | `project:act-hv` | 95 |
| `justicehub` | `project:act-jh` | 90 |
| `audience-funder` | `role:funder` | 84 |
| `newsletter` | `comms:act-newsletter` | 84 |
| `goods-nurture` | `comms:goods-newsletter + project:act-gd` | 69 |
| `act-jh` | `project:act-jh` | 55 |
| `goods-state-nt` | `place:nt + project:act-gd` | 53 |
| `eoi-gathering-march-2026` | `source:event:eoi-gathering-2026` | 49 |
| `goods-funder` | `role:funder + project:act-gd` | 49 |
| `interest-membership` | `interest:membership` | 49 |
| `partner` | `role:partner` | 49 |
| `interest-community` | `interest:community` | 46 |
| `goods-warm` | `project:act-gd` | 45 |
| `interest-events` | `interest:events` | 43 |
| `goods-communitycontrolled` | `role:community-controlled + project:act-gd` | 39 |
| `goods-gmail-active` | `project:act-gd` | 39 |
| `funder` | `role:funder` | 36 |
| `interest-markets` | `interest:markets` | 36 |
| `interest-workshops` | `interest:workshops` | 35 |
| `source: footer` | `source:footer` | 1 |

## 3. ORPHAN list (unmapped, un-namespaced, non-cruft tags — Ben must rule on each)

These are NOT migrated by v2 until a mapping decision is recorded here.

| Orphan tag | # contacts |
|---|---|
| `goods-general-inquiry` | 33 |
| `goods-src-footer` | 33 |
| `act-inquiry` | 32 |
| `goods-community` | 32 |
| `project-goods` | 32 |
| `audience-storyteller` | 31 |
| `act-el` | 30 |
| `interest-garden` | 29 |
| `shop-prospect` | 28 |
| `interest-food` | 27 |
| `world-tour` | 27 |
| `civicgraph` | 26 |
| `gone-from-ghl-2026-05-23` | 25 |
| `act-cn` | 23 |
| `goods-gmail-partner` | 22 |
| `interest-volunteer` | 22 |
| `photo-wall` | 22 |
| `goods-role-store` | 21 |
| `interest-sustainability` | 21 |
| `container-request` | 20 |
| `harvest-gathering-photos` | 20 |
| `contained-hot-lead` | 19 |
| `goods-supplier` | 19 |
| `test-submission` | 19 |
| `goods-partner` | 17 |
| `goods-role-council` | 17 |
| `harvest-inbox` | 17 |
| `act-regenerative-studio` | 15 |
| `member-comments` | 15 |
| `empathy-ledger` | 14 |
| `world-tour-partner` | 14 |
| `engagement:lead` | 13 |
| `goods-cooling` | 13 |
| `goods-hot` | 13 |
| `grantscope-source` | 13 |
| `contact-form` | 12 |
| `grant` | 12 |
| `harvest-newsletter` | 12 |
| `goods-cold` | 11 |
| `goods-supplier-active` | 11 |
| `goods-new` | 10 |
| `goods-vendor` | 10 |
| `interest-venue` | 10 |
| `priority-medium` | 10 |
| `community` | 9 |
| `featured storyteller` | 9 |
| `goods-customer` | 9 |
| `goods-signal` | 9 |
| `locals-day-march-2026` | 9 |
| `contained-original-requester` | 8 |
| `goods-gmail-funder` | 8 |
| `goods-washer-interest` | 8 |
| `shop-produce` | 8 |
| `act-in` | 7 |
| `adelaide` | 7 |
| `auto-created-from-xero` | 7 |
| `harvest-member` | 7 |
| `shop-follow-up` | 7 |
| `brisbane` | 6 |
| `flagship-inquiry` | 6 |
| `goods-gmail-media` | 6 |
| `goods-role-health` | 6 |
| `goods-steady` | 6 |
| `harvest-shop-interest` | 6 |
| `linkedin-nic` | 6 |
| `research` | 6 |
| `contact` | 5 |
| `contained-personal-outreach` | 5 |
| `elder` | 5 |
| `goods-role-corp` | 5 |
| `goods-src-alive-beds` | 5 |
| `goods-src-canberra-airport-2026` | 5 |
| `goods-tier-champion` | 5 |
| `member-question` | 5 |
| `supplier-plant` | 5 |
| `supplier-steel` | 5 |
| `vendor-services` | 5 |
| `website-signup` | 5 |
| `action:meeting-held` | 4 |
| `codex-smoke-test` | 4 |
| `harvest-people-hq` | 4 |
| `meeting-held` | 4 |
| `priority:high` | 4 |
| `quiz-completed` | 4 |
| `supplier-product` | 4 |
| `community-idea` | 3 |
| `festivals-target` | 3 |
| `goods-advisory` | 3 |
| `goods-government-grant` | 3 |
| `goods-role-landcouncil` | 3 |
| `goods-src-parliament-house-demo` | 3 |
| `goods-tier-active` | 3 |
| `idea-general` | 3 |
| `indigenous-led` | 3 |
| `justice` | 3 |
| `linkedin-gmail_discovery` | 3 |
| `melbourne` | 3 |
| `priority:medium` | 3 |
| `sydney` | 3 |
| `venue-partner` | 3 |
| `conference-host` | 2 |
| `container request` | 2 |
| `event registrant` | 2 |
| `event-submission` | 2 |
| `goods-bulk-order-inquiry` | 2 |
| `goods-community-kaltukatjara` | 2 |
| `goods-community-mount-liebig` | 2 |
| `goods-community-peppimenarti` | 2 |
| `goods-gmail-community` | 2 |
| `goods-key-partner` | 2 |
| `goods-media` | 2 |
| `goods-priority-high` | 2 |
| `goods-priority-medium` | 2 |
| `goods-role-health_service` | 2 |
| `goods-role-housing` | 2 |
| `goods-state-qld` | 2 |
| `goods-tier-aware` | 2 |
| `legal` | 2 |
| `njp` | 2 |
| `no email` | 2 |
| `perth` | 2 |
| `photo-wall-ready` | 2 |
| `shop-maker` | 2 |
| `supplier-hdpe` | 2 |
| `tasmania` | 2 |
| `vendor-print` | 2 |
| `website-form` | 2 |
| `24-carrot-gardens` | 1 |
| `ai-flagged` | 1 |
| `auto-triage` | 1 |
| `biz-expression-of-interest` | 1 |
| `business-interest` | 1 |
| `business-registration` | 1 |
| `cairns` | 1 |
| `cape-york` | 1 |
| `circle:gsd-alliance` | 1 |
| `collaborator` | 1 |
| `contained` | 1 |
| `contained-needs-followup` | 1 |
| `container - contacted` | 1 |
| `container - scheduled` | 1 |
| `context: ghl-leg-test` | 1 |
| `context: opp-fix-goods` | 1 |
| `context: opp-fix-test` | 1 |
| `context: opp-test` | 1 |
| `context: opp-test-el` | 1 |
| `csa interest` | 1 |
| `detention centre` | 1 |
| `education` | 1 |
| `engagement:active` | 1 |
| `food-and-phonics` | 1 |
| `footer signup` | 1 |
| `form:csa` | 1 |
| `form:newsletter` | 1 |
| `goods-bed-order` | 1 |
| `goods-canberra-airport-—-reconciliation-week` | 1 |
| `goods-community-ampilatwatja` | 1 |
| `goods-community-areyonga` | 1 |
| `goods-community-atitjere` | 1 |
| `goods-community-barunga` | 1 |
| `goods-community-belyuen` | 1 |
| `goods-community-daguragu` | 1 |
| `goods-community-finke` | 1 |
| `goods-community-gapuwiyak` | 1 |
| `goods-community-imanpa` | 1 |
| `goods-community-lajamanu` | 1 |
| `goods-community-laramba` | 1 |
| `goods-community-maningrida` | 1 |
| `goods-community-manyallaluk` | 1 |
| `goods-community-milingimbi` | 1 |
| `goods-community-ngukurr` | 1 |
| `goods-community-nturiya` | 1 |
| `goods-community-numbulwar` | 1 |
| `goods-community-papunya` | 1 |
| `goods-community-titjikala` | 1 |
| `goods-community-wallace-rockhole` | 1 |
| `goods-event` | 1 |
| `goods-gmail-government` | 1 |
| `goods-impact-finance` | 1 |
| `goods-impact-report-needed` | 1 |
| `goods-li-contained-tour` | 1 |
| `goods-linkedin-community` | 1 |
| `goods-linkedin-strategic` | 1 |
| `goods-linkedin-supporter` | 1 |
| `goods-parliament-house-demo` | 1 |
| `goods-partner-lead` | 1 |
| `goods-report-board-pack` | 1 |
| `goods-report-centrecorp-june26` | 1 |
| `goods-role-housing_provider` | 1 |
| `goods-showcase` | 1 |
| `goods-src-naidoc-2026` | 1 |
| `goods-story-consent-needed` | 1 |
| `goods-supplier-pending` | 1 |
| `government` | 1 |
| `harvest` | 1 |
| `harvest-duplicate-review` | 1 |
| `homeschool-programs` | 1 |
| `inbound` | 1 |
| `interest-eat` | 1 |
| `interest-grow` | 1 |
| `international` | 1 |
| `media` | 1 |
| `minderoo-connection` | 1 |
| `needs-attention` | 1 |
| `potential-partner` | 1 |
| `ramsey` | 1 |
| `regional-nsw` | 1 |
| `residency-applicant` | 1 |
| `residency-artist` | 1 |
| `rockhampton` | 1 |
| `route: /` | 1 |
| `source-other` | 1 |
| `source-social` | 1 |
| `speech-pathology` | 1 |
| `steward` | 1 |
| `steward - advocate` | 1 |
| `steward - volunteer` | 1 |
| `story-feature` | 1 |
| `supplier-canvas` | 1 |
| `supplier-fasteners` | 1 |
| `supplier-hdpe-bulk` | 1 |
| `test` | 1 |
| `test-delete-me` | 1 |
| `the harvest` | 1 |
| `the-harvest` | 1 |
| `tour-funding` | 1 |
| `uwa-law` | 1 |
| `vendor-freight` | 1 |
| `vendor-tech` | 1 |
| `venue` | 1 |
| `venue-enquiry` | 1 |
| `webhook-test` | 1 |
| `witta` | 1 |
| `workshop-booking` | 1 |
| `workshop-suggestion` | 1 |
| `yj` | 1 |
| `youth justice` | 1 |

## 4. Community-line violations (the dangerous ones)

Contact would end up with a `comms:*` tag while carrying `lane:community` / `role:storyteller` / `role:community`. v2 MUST strip the comms tags here, never add them.

**Total: 33** (showing up to 50)

| ghl_id | name | offending comms tags |
|---|---|---|
| `z54hf3IrFhNzQeMW6Gzv` | general — impact frontiers | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `j7hi3rlHwmIuDKNSIdTs` | steph pearson | `comms:funder-drip`, `comms:goods-newsletter` |
| `GR0z6Lvl2N7gdUEqzMLk` | tara castle | `comms:goods-newsletter` |
| `avh1foMDU4rpglfjDxp3` | phillip allan | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `yIYUvOBZMemF5tynz5wL` | alice benchoam | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `G9PItuZMWk1c8x6unFvB` | simon robinson | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `X4Md4sr73fZdL33BPmlz` | grant luff | `comms:goods-newsletter`, `comms:supporter-drip` |
| `pRSrM0tnXQjYHfGeASAo` | benjamin test | `comms:act-newsletter` |
| `j6S1E0B1NNfv4MZIp6AI` | rachel atkinson | `comms:goods-newsletter` |
| `Hfckaos5BIXAiDWhkD6v` | matthew carman | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `II1BhBXv0iuzv888Wb7x` | shellee strickland | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `K4ejYaIJ3ILO9yQTFBhm` | eula rohan | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `7ox7Rp2Dr3OZdLNXjHVW` | amy lee | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `8QyHvajKpuyHyDmBfcCY` | tara castle | `comms:goods-newsletter` |
| `8f3onwaS2iK3Lk7ThsiA` | jimmy frank | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `aZICs18JhTlYcCja2awk` | narelle gleeson | `comms:goods-newsletter`, `comms:partner-drip` |
| `1FJKzuyt1IpEFdjbJhjC` | tara castle | `comms:goods-newsletter` |
| `qvnemoBQU7FjnSdfEwPP` | bmdcf applications | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `qd0lpqQ9dZpyDDERIMhE` | brandon gien | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `MCNT6MZyAW4S0Fg0wLol` | peter bent | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `tiC3ISBpkDdmS54agG6P` | todd sidery | `comms:goods-newsletter`, `comms:partner-drip` |
| `qmFrCOsGrXQbLsIgjAzX` | tara castle | `comms:goods-newsletter` |
| `MLDUH7oecmisGwYJ7y8Q` | rowena cann | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `iRmsOTOvF1DgmmJ6QpzT` | erin riddell | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `c2WPF9Kr2cb56KgKPXGZ` | chair | `comms:goods-newsletter`, `comms:supporter-drip` |
| `Z1kOiaNiVGNOuscHED4V` | noeletta mckenzie | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `X4qlBT2huXIB5I5XJ2dK` | keiron lander | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `CINaVh3o4cgFjBuscV0C` | delaicee power | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `auto_d5f091cc` | Nicholas Marchesi | `comms:goods-newsletter` |
| `XzYIATpLL8iVflrf1Hll` | max broadley | `comms:goods-newsletter` |
| `4nTVTPHZJcIaXPnZNpLL` | prebhjot kaur | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter`, `comms:partner-drip` |
| `10phNqWAjEmflMzAzXYT` | the myer foundation & sidney myer fund | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `P5Qw6atbYWZIKKsVhKSQ` | ren fernando | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |

## 5. Consent violations

Contact would end up with a `comms:*newsletter` tag but has no `newsletter_consent=Yes` (custom field `aVnqmajnysMtGYhLD0oA`). v2 MUST NOT enrol these without consent (Spam Act 2003).

**Total: 284** (showing up to 50)

| ghl_id | name | would-be newsletter tags |
|---|---|---|
| `Oe2NBiLSraMozWjQtN7H` | adam robinson | `comms:goods-newsletter` |
| `pZ9kGnooEvG4MG13E6KA` | rohan lulham | `comms:justicehub-newsletter` |
| `ApN5twHwwU4oxdF8OHrg` | sue mcgary | `comms:act-newsletter`, `comms:harvest-newsletter`, `comms:newsletter` |
| `RUUWJWWCrMLVQkMG9OZT` | (no name) | `comms:goods-newsletter` |
| `j7hi3rlHwmIuDKNSIdTs` | steph pearson | `comms:goods-newsletter` |
| `601lLFL2WpQFwlcLmPBx` | dr. simon quilty | `comms:goods-newsletter` |
| `M6SIDwBoUo4NxKaMXF6G` | alexandra lagelee kean | `comms:goods-newsletter` |
| `2wbFPbLwzUiqGpvVpA7Z` | southwell qld | `comms:goods-newsletter` |
| `wHstWIW6zo1ifWnWsayd` | adam robinson | `comms:goods-newsletter` |
| `7WXGBE5zD73ipAJfb5qE` | sam davies | `comms:act-newsletter`, `comms:goods-newsletter`, `comms:newsletter` |
| `qZAN8H2SBfxvmYCA92ud` | irene portelli | `comms:justicehub-newsletter` |
| `4a2HSLxS2mKZApW8ZjGX` | (no name) | `comms:goods-newsletter` |
| `VO6mL3LulO6PqMgvBM9X` | (no name) | `comms:goods-newsletter` |
| `nZDW2c7bgNmKT62iOMP4` | sally grimsley-ballard | `comms:goods-newsletter` |
| `Hv3Sx6HtakytugKLSDYv` | (no name) | `comms:goods-newsletter` |
| `vARf3DDefHHMj8tI35j2` | (no name) | `comms:goods-newsletter` |
| `SmUktK2W5UI0zUo6MQIb` | ben releasetest1778702669934 | `comms:act-newsletter` |
| `3TqWxAoUQx4fLbzvO2sW` | (no name) | `comms:act-newsletter`, `comms:harvest-newsletter`, `comms:newsletter` |
| `GR0z6Lvl2N7gdUEqzMLk` | tara castle | `comms:goods-newsletter` |
| `fws668WgyjSbMxq5HStO` | susan | `comms:harvest-newsletter` |
| `KNXsmVEM8RvPGk2YBe68` | ketakii jewson brown | `comms:act-newsletter`, `comms:harvest-newsletter`, `comms:newsletter` |
| `MMrEpSBB5rbHzONLDirb` | steph pearson | `comms:goods-newsletter` |
| `Qj33ZHADNKUaeC2DoPBB` | richard graveur | `comms:act-newsletter`, `comms:harvest-newsletter`, `comms:newsletter` |
| `ZEE0vVoX5MXfU3T13Euz` | cat harding | `comms:act-newsletter`, `comms:harvest-newsletter`, `comms:newsletter` |
| `7lzNuk9ykZbioseKyuVx` | benjamin knight | `comms:harvest-newsletter` |
| `vRQlEKxQaNv5y1B2BrpC` | karen | `comms:harvest-newsletter` |
| `59lCqC8pRDkTPwTVqcAT` | ben contact final test | `comms:act-newsletter` |
| `lPYoVrMXGsHlv3xRqaI7` | test | `comms:act-newsletter` |
| `wdcusgyz6jnrWYjbfnxB` | cathy | `comms:act-newsletter`, `comms:harvest-newsletter`, `comms:newsletter` |
| `f41gjgDZkXQgd0IOnQX7` | george soady | `comms:act-newsletter`, `comms:harvest-newsletter`, `comms:newsletter` |
| `BTMtHeL4MpDwYX2Uppc9` | nicholas marchesi | `comms:goods-newsletter` |
| `qIuqGLFoVusIOhYSL0Hf` | baressa frazer | `comms:justicehub-newsletter` |
| `HOLIHjbrs7sFvI2c6Tdk` | monita roughsedge | `comms:act-newsletter`, `comms:harvest-newsletter`, `comms:newsletter` |
| `YsWWhmDZVD7uE79CPu47` | (no name) | `comms:act-newsletter` |
| `IHgDqFAMzhYIaj96Kviz` | test user | `comms:goods-newsletter` |
| `BSkTz0lYEJo8MVQJGFtc` | julia payne | `comms:goods-newsletter` |
| `K8TnlbUH6o1AqUQxECAV` | badu community qld | `comms:goods-newsletter` |
| `yJx3Z2aXsmU9UuqeKEN0` | pauline cowham | `comms:act-newsletter`, `comms:harvest-newsletter`, `comms:newsletter` |
| `iZjD7QCXmTntsvhxRQSP` | (no name) | `comms:goods-newsletter` |
| `9xn4Hn689ubEtXdRkR84` | maree meredith | `comms:goods-newsletter` |
| `Hdz88yGNh9cQgxwdIVnH` | (no name) | `comms:goods-newsletter` |
| `LfwjeSOvc2Mq3u4f2qm4` | sam davies | `comms:goods-newsletter` |
| `QGp8hxVEKPwavlPaclfQ` | natalie richy | `comms:harvest-newsletter` |
| `moxP9fCQ7a2pdibcxPDa` | willhemina wahlin | `comms:goods-newsletter` |
| `KZ7RJfJUV7Pd720EYBVv` | anita pahor | `comms:justicehub-newsletter` |
| `rDUI85k0HWkfxvTyiNXK` | nicholas marchesi | `comms:act-newsletter`, `comms:harvest-newsletter`, `comms:newsletter` |
| `tr58drIUZzB7slo70af6` | anne gripper | `comms:goods-newsletter` |
| `QPff8x6D9CvZWu6NksFZ` | marie | `comms:act-newsletter`, `comms:harvest-newsletter`, `comms:newsletter` |
| `rmrG40t5m6Yn8cGcoznb` | alice mahar | `comms:justicehub-newsletter` |
| `ZJ1Unlsh0kXyZAab7DPs` | (no name) | `comms:goods-newsletter` |

---
_End of worksheet. v2 (the writer) runs only after Ben rules on §3 and confirms §4/§5 are handled by stripping, not adding._

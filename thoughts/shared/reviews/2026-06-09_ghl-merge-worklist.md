# GHL contact-merge worklist — 2026-06-09

> **GHL has no merge API** (`POST /contacts/merge` → 403, UI-only). This worklist is
> read-only; do the merges in the GHL UI. For each group: open the **KEEP** contact,
> use Contact → Merge, and merge each **dup** into it. Verify the kept record still
> carries the consent + tags before saving.

**Source:** `ghl_contacts` mirror (2479 live rows w/ email, paginated). Re-run: `node scripts/build-ghl-merge-worklist-2026-06-09.mjs`.

| Bucket | Groups | Dup rows to clear |
|---|---:|---:|
| ✅ MERGE — real people (⭐ 42 important) | 71 | 117 |
| ⚠️ REVIEW (role/shared inbox) | 16 | 20 |
| 🤖 SYSTEM (automation — delete/fix at source) | 1 | 14 |
| 🚫 NOT_PEOPLE (vendor/test/place/spam — skip or delete) | 24 | 26 |
| 🗑️ LOW_VALUE (delete dups, don't merge) | 0 | 0 |
| **Total** | **112** | **177** |

**Merge these 42 first** (an ACT ecosystem relationship, or fragmented across 2+ duplicate records). The rest of MERGE is real but low-stakes — single low-value dups you can skip or batch later.

## ✅ MERGE — safe to merge in UI

Personal addresses with a plausible human keeper. Merge each `merge←` row into the **KEEP** row.

### ⭐ 1. benjamin@act.place  (5 dups)
   **KEEP** `7lzNuk9ykZbioseKyuVx` benjamin knight · EL consent 17t · 2026-06-08
   merge←  `QarRbCphkMj7BFzOPlcT` ben knight · EL 3t · 2026-06-08
   merge←  `5MBKnM7ruUX8J7YT4XJE` benjamin knight · EL 3t · 2026-06-08
   merge←  `pRSrM0tnXQjYHfGeASAo` benjamin test · EL 13t · 2026-03-26
   merge←  `dQmMJj9xcPx51SY04W7B` benjamin knight · EL 6t · 2026-05-31
   merge←  `bkaZQuNkFw5qCcBGME5m` benjamin knight · 2t · 2026-05-26

### ⭐ 2. sam@defydesign.org  (4 dups)
   **KEEP** `Vk0et07jw3qccBZsqBF8` sam davies · consent 14t · 2026-04-15
   merge←  `7WXGBE5zD73ipAJfb5qE` sam davies · 13t · 2026-06-08
   merge←  `LfwjeSOvc2Mq3u4f2qm4` sam davies · 10t · 2026-06-08
   merge←  `B7vVWvvVhrUhP3QL3Dnl` sam davies · 10t · 2026-06-08
   merge←  `dMiQCeVDknPCK9Mhy5fg` sam davies · 17t · 2026-06-08

### ⭐ 3. adam@streetsmartaustralia.org  (4 dups)
   **KEEP** `Oe2NBiLSraMozWjQtN7H` adam robinson · 12t · 2026-05-29
   merge←  `wHstWIW6zo1ifWnWsayd` adam robinson · 8t · 2026-06-08
   merge←  `Fe8nEezHRiBho7G6ev5V` adam robinson · 11t · 2026-06-08
   merge←  `IgobH3bxpJMAMNxhUCVS` adam robinson · 9t · 2026-06-08
   merge←  `Qtl5PgkHPMnNS1mjnGRO` adam robinson · 9t · 2026-03-28

### ⭐ 4. sq@wilyajanta.org  (4 dups)
   **KEEP** `UJPGFZbcjcdslJC8jN6T` wilya janta · consent 12t · 2025-12-10
   merge←  `601lLFL2WpQFwlcLmPBx` dr. simon quilty · 6t · 2026-06-08
   merge←  `4xqT9yHGyDBJKaUPf2lJ` dr. simon quilty · 6t · 2026-06-08
   merge←  `7ZKeS2H6Fyi1xDUTvING` dr. simon quilty · 8t · 2026-06-08
   merge←  `tNmXNxNzKf61yG3HmvNc` dr. simon quilty · 12t · 2026-06-08

### ⭐ 5. kim@philanthropy.org.au  (4 dups)
   **KEEP** `O8F7kwyzHdWEbOjQ0Zob` kim harland · 11t · 2026-06-08
   merge←  `qwvBT8hK74DMvrUPkIbd` kim harland · 5t · 2026-06-08
   merge←  `wgEuHdAaGZnXGHBxKR1Q` kim harland · 4t · 2026-03-24
   merge←  `YHR05hsHaxDiHO2gxo8f` kim harland · 9t · 2026-06-08
   merge←  `KKLU6JUmRSSvACtvyPyT` kim harland · 6t · 2026-06-08

### ⭐ 6. willhemina.wahlin@portable.com.au  (4 dups)
   **KEEP** `FlyntveGZxWzVeDmFwZ5` willhemina wahlin · 9t · 2026-06-08
   merge←  `moxP9fCQ7a2pdibcxPDa` willhemina wahlin · 6t · 2026-06-08
   merge←  `0w3yMTXm12bl74aKGce0` willhemina wahlin · 7t · 2026-01-20
   merge←  `CjmW3zEgVVEYnrkw8tvq` willhemina wahlin · 7t · 2026-06-08
   merge←  `WaTXyJ8P4oFUYeR5sXHT` willhemina wahlin · 7t · 2026-06-08

### ⭐ 7. tara@queenslandgives.org.au  (4 dups)
   **KEEP** `xzRV6dT0WTQhJP5BCsHX` tara castle · 8t · 2026-06-08
   merge←  `GR0z6Lvl2N7gdUEqzMLk` tara castle · 6t · 2026-06-08
   merge←  `8QyHvajKpuyHyDmBfcCY` tara castle · 6t · 2025-12-11
   merge←  `1FJKzuyt1IpEFdjbJhjC` tara castle · 6t · 2026-06-08
   merge←  `qmFrCOsGrXQbLsIgjAzX` tara castle · 6t · 2026-06-08

### ⭐ 8. nicholas@act.place  (3 dups)
   **KEEP** `rDUI85k0HWkfxvTyiNXK` australian medical students association · EL consent 22t · 2026-06-08
   merge←  `yX006WjgWqAAoWEIkdtb` nic · 4t · 2026-06-08
   merge←  `GWbymO5vTuzl0ELUsM0O` nicholas marchesi oam · 4t · 2026-06-08
   merge←  `auto_d5f091cc` Nicholas Marchesi · EL 4t · 2026-04-26

### ⭐ 9. tobyg@kalianahoutdoors.com.au  (3 dups)
   **KEEP** `mTsZ14zvtIs3XaaTHHhX` toby gowland · 12t · 2026-06-08
   merge←  `o0nVQWqVWIGTqXbg0zuG` toby gowland · 11t · 2026-06-08
   merge←  `cnNzFM6zrQjRaMJ69NpE` toby gowland · 12t · 2026-06-08
   merge←  `l1v8gPj5zXhURMeS0mCv` toby gowland · 12t · 2026-06-08

### ⭐ 10. ratkinson@picc.com.au  (3 dups)
   **KEEP** `yZcX8GoQEqBYqcb5Uyjm` palm island community company limited (picc) · EL consent 11t · 2026-01-22
   merge←  `j6S1E0B1NNfv4MZIp6AI` rachel atkinson · EL 10t · 2026-06-08
   merge←  `oVIfdPjlceNMZJB20RsO` rachel atkinson · EL 8t · 2026-06-08
   merge←  `VfEBYrMWswkt7jfYjmd0` rachel atkinson · EL 11t · 2026-06-08

### ⭐ 11. jay@socialimpacthub.org  (3 dups)
   **KEEP** `jWlB8bMHxQxWMNIZLIoD` jay boolkin · 7t · 2026-06-08
   merge←  `d0zn6ZAai0BVwoB8PZnA` jay boolkin · 6t · 2026-06-08
   merge←  `HRLfast9ci2Yq6XPoajQ` jay boolkin · 5t · 2026-06-08
   merge←  `auto_90abca15` Jay Boolkin · 0t · 2026-04-01

### ⭐ 12. jennifer.kitching@anyinginyi.com.au  (3 dups)
   **KEEP** `lXK8sKfCmHJQYLC9Din1` jennifer kitching · 5t · 2026-06-08
   merge←  `B8hHjzzwIuQNf9lOeGze` jennifer kitching · 5t · 2026-06-08
   merge←  `sbIeXVLqNf2kPWdiPle2` jennifer kitching · 5t · 2026-06-08
   merge←  `4tZeGvHPsy6bw0UDubdx` jennifer kitching · 5t · 2026-06-08

### ⭐ 13. jodie@redmovies.com.au  (3 dups)
   **KEEP** `6itSyoLzsKS3R35a8mfs` jodie davis · 5t · 2026-06-08
   merge←  `d1iSnUNRv78E1m43NmFv` jodie davis · 3t · 2026-03-27
   merge←  `3DGTgCZt6R25rAYoODaW` jodie davis · 5t · 2026-06-08
   merge←  `CabhyQwSVhdry4vNGIrt` jodie davis · 5t · 2026-06-08

### ⭐ 14. millie@defydesign.org  (3 dups)
   **KEEP** `RMUL5qNtnclYhvsmvjBP` millie shearer · 5t · 2026-06-08
   merge←  `7K273hja6a0nEfYMsea1` millie shearer · 5t · 2026-06-08
   merge←  `MaE0EVXGdc8cOZpgkCGI` millie shearer · 3t · 2026-03-25
   merge←  `6dVAQFDuKNd4QHqPEO9s` millie shearer · 5t · 2026-06-08

### ⭐ 15. s.grimsley-ballard@snowfoundation.org.au  (2 dups)
   **KEEP** `nZDW2c7bgNmKT62iOMP4` sally grimsley-ballard · 20t · 2026-06-08
   merge←  `tr5gXz8M27R7Y6PyZ3WD` (no name) · 2t · 2026-05-23
   merge←  `NSn2Ywjd0g0RIlWp66Fs` sally grimsley-ballard · 13t · 2026-06-08

### ⭐ 16. s.pearson@frrr.org.au  (2 dups)
   **KEEP** `j7hi3rlHwmIuDKNSIdTs` steph pearson · 18t · 2026-03-31
   merge←  `MMrEpSBB5rbHzONLDirb` steph pearson · 6t · 2026-05-15
   merge←  `jatY7yhZL4h5OtexuCJ1` steph pearson · 11t · 2026-06-08

### ⭐ 17. kristy.bloomfield@oonchiumpa.com.au  (2 dups)
   **KEEP** `0kEs9BJmkmi7ZUc5haEX` kristy bloomfield · EL consent 9t · 2026-03-23
   merge←  `yk4uK8rgDNGA87EUqNbu` kristy bloomfield · EL 9t · 2026-06-08
   merge←  `gCok46nfL0BqYeYEeexd` kristy bloomfield · 7t · 2026-06-08

### ⭐ 18. lstronach@minderoo.org  (1 dup)
   **KEEP** `yCiaPtyAOWYsEs9ITUGj` lucy stronach · consent 24t · 2026-04-29
   merge←  `bkZQ6vDNekvTtUVV1TpI` lucy stronach · 5t · 2026-06-08

### ⭐ 19. scarlettsteven@dusseldorp.org.au  (1 dup)
   **KEEP** `hlGY2sV3G9XUgJcBpM9O` scarlett steven · consent 22t · 2026-03-20
   merge←  `1AuVcj7COcol4udwL2Nw` scarlett steven · 5t · 2026-05-27

### ⭐ 20. wfrazer@paulramsayfoundation.org.au  (1 dup)
   **KEEP** `WZQ7eABQAKf59F3Vyaow` william frazer · consent 15t · 2026-03-24
   merge←  `86IotCHStn0fEHyhFtoF` william frazer · 5t · 2026-06-08

### ⭐ 21. judith@orangesky.org.au  (1 dup)
   **KEEP** `Q4h5Aa8lRj8YDOZ0E8s2` judith meiklejohn · 13t · 2026-03-03
   merge←  `c7ieIClxZbohQeuihgyq` judith meiklejohn · 11t · 2026-06-08

### ⭐ 22. todd@defydesign.org  (1 dup)
   **KEEP** `tiC3ISBpkDdmS54agG6P` todd sidery · 12t · 2026-03-31
   merge←  `Ktm6aDokztnOYsToBWrR` todd sidery · 10t · 2026-06-08

### ⭐ 23. narelle@picc.com.au  (1 dup)
   **KEEP** `pXbha9a8lYxHuD9oAM8S` narelle gleeson · EL 11t · 2026-06-08
   merge←  `aZICs18JhTlYcCja2awk` narelle gleeson · 13t · 2026-04-23

### ⭐ 24. matt.allen@socialimpacthub.org  (1 dup)
   **KEEP** `NVHZfqOTviJyw6Tw1old` matt allen · 7t · 2026-06-08
   merge←  `auto_66af5eed` Matt Allen · 0t · 2026-04-27

### ⭐ 25. will@defydesign.org  (1 dup)
   **KEEP** `TFYAX2ABmlLTPnc91Xt5` will thompson · 7t · 2026-05-27
   merge←  `reconcile_e94191a5` Will Thompson · 3t · 2026-03-26

### ⭐ 26. slovett@picc.com.au  (1 dup)
   **KEEP** `tip2wTi3wWy0nwLFE2Vp` sharon lovett · 7t · 2026-05-27
   merge←  `b52Teph3cCcL1FEWaTgN` sharon lovett · 0t · 2026-02-18

### ⭐ 27. tony.miles@anyinginyi.com.au  (1 dup)
   **KEEP** `bJ0IHYKRVBtlwmyIydaQ` tony miles · 6t · 2026-06-08
   merge←  `auto_35b4e62f` Tony Miles · 0t · 2026-03-13

### ⭐ 28. carollyn@anat.org.au  (1 dup)
   **KEEP** `TF4i9w40DIGne1wPg5uN` carollyn kavanagh · 6t · 2026-04-15
   merge←  `dgQZ3xUzj3E6aZwbGrvG` carollyn kavanagh · 6t · 2026-06-08

### ⭐ 29. bruce@redmovies.com.au  (1 dup)
   **KEEP** `47rRZh5KUga3AvHgxorp` bruce redman · 5t · 2026-03-27
   merge←  `HI1vnNSzvmxk0q6Yhd4u` bruce redman · 5t · 2026-05-15

### ⭐ 30. cosecau@standardledger.co  (1 dup)
   **KEEP** `rirjlbnB0qUPn8xujAAD` vanessa ordonez · 4t · 2026-06-08
   merge←  `auto_f2330b32` cosecAU SL · 0t · 2026-04-27

### ⭐ 31. sarah.bartak@brianmdavis.org.au  (1 dup)
   **KEEP** `QdAmpE07Z361Rrx6ilS2` sarah bartak · 4t · 2026-06-08
   merge←  `auto_e4724ba2` Sarah Bartak · 0t · 2026-04-30

### ⭐ 32. g.byron@snowfoundation.org.au  (1 dup)
   **KEEP** `WKPGDlP6FyYg4hUTmQzd` georgina byron · 4t · 2026-06-08
   merge←  `7S6pSw0fIMpMMwxtSPCz` Georgina Byron · 3t · 2026-04-08

### ⭐ 33. anita.hopkins@brianmdavis.org.au  (1 dup)
   **KEEP** `X9kE3G9rqvR51gUo0Bsx` anita hopkins · 4t · 2026-06-08
   merge←  `auto_9d9c9423` Anita Hopkins · 0t · 2026-05-13

### ⭐ 34. bridgit@reddust.org.au  (1 dup)
   **KEEP** `Q4fquuYzVh0z6NXLqrwU` bridgit mcmullen · 4t · 2026-06-08
   merge←  `auto_f1706418` Bridgit McMullen · 0t · 2026-03-10

### ⭐ 35. alberto.furlan@ianpotter.org.au  (1 dup)
   **KEEP** `PoPY4biO1VsofPFGdpv5` alberto furlan · 4t · 2026-06-08
   merge←  `n9c8Aeyckfw1Qa6nupYD` Alberto Furlan · 3t · 2026-05-29

### ⭐ 36. jessica@socialimpacthub.org  (1 dup)
   **KEEP** `reconcile_6547cf18` Jessica Mendoza-Roth · 1t · 2026-02-28
   merge←  `CxTAADLcBEUIzXLGhp5W` social impact hub foundation · 0t · 2026-06-08

### ⭐ 37. nic.sharah@homelandschoolcompany.org.au  (1 dup)
   **KEEP** `r8oUYf3j3L0HcnoBqVeX` homeland school company · 0t · 2026-06-08
   merge←  `auto_67832921` Nic Sharah · 0t · 2026-05-06

### ⭐ 38. jenn@anat.org.au  (1 dup)
   **KEEP** `FZ9kj33EShcYmQt8BN1X` jenn brazier · 0t · 2026-06-08
   merge←  `manual_95185c8b-d183-444f-b08c-8239cc673c1f` Jenn Brazier · 0t · 2026-03-18

### ⭐ 39. traceynewman008@gmail.com  (4 dups)
   **KEEP** `8Ysd4HscCutj53m0Oqzx` tracey newman · 13t · 2026-05-29
   merge←  `D05Oa0eO8arILsSNjiPQ` tracey newman · 6t · 2026-06-08
   merge←  `5Ef5iz76fJvyK1b5hI1Q` tracey newman · 6t · 2026-06-08
   merge←  `pvZ53c6JlkL5sOPPFiTc` tracey newman · 6t · 2026-06-08
   merge←  `hOn1vWuI9tNNhW0Mn1jl` tracey newman · 6t · 2026-06-08

### ⭐ 40. pene.curtis@bigpond.com  (3 dups)
   **KEEP** `eyr6Cv6B9cf2VFUzJBQs` pene curtis · 20t · 2026-06-08
   merge←  `5EfSDhGNzQmIcgLz5LuH` pene curtis · 13t · 2026-06-08
   merge←  `zByIWtdKk4Z83B7b4uML` pene curtis · 5t · 2026-04-20
   merge←  `PRoijdTUvWTYv2D5B29s` pene curtis · 7t · 2026-05-27

### ⭐ 41. mtaylor@envirobank.com.au  (2 dups)
   **KEEP** `IPzrkrahNKcSWL03d8Jq` marty taylor · 4t · 2026-06-08
   merge←  `auto_1c29c2da` Marty Taylor · 0t · 2026-02-26
   merge←  `ipZjeDDR9uwHMdXR7KV6` marty taylor · 3t · 2026-06-08

### ⭐ 42. knighttss@gmail.com  (2 dups)
   **KEEP** `9uBnZcxMfiGZDLgS22vg` benjamin knight · EL 4t · 2026-05-27
   merge←  `PuuRHAkYciTlzUYl9a8R` benjamin knight · 4t · 2026-05-25
   merge←  `0PrtdUUsyqYv5QklTNte` benjamin knight · 4t · 2026-06-08

### 43. susyn.young@gmail.com  (1 dup)
   **KEEP** `sanAvi38DOOdCFdBlNqO` susyn young · consent 19t · 2026-06-08
   merge←  `auto_c86bbe63` Susyn Young · 0t · 2026-05-04

### 44. amy.elson@nt.gov.au  (1 dup)
   **KEEP** `B1U3yW6G9UoDI5BsAV4c` amy elson · 14t · 2026-04-22
   merge←  `6IijuIN8YUSD200siSc8` amy elson · 12t · 2026-06-08

### 45. grantluff@gmail.com  (1 dup)
   **KEEP** `X4Md4sr73fZdL33BPmlz` grant luff · 12t · 2026-03-26
   merge←  `V8YinCOfEn8BdsujGzW0` grant luff · 10t · 2026-06-08

### 46. lorana.bartels@anu.edu.au  (1 dup)
   **KEEP** `ozylqwJZShaQnAwcOJby` (no name) · consent 7t · 2026-06-08
   merge←  `lDdMkRI18W42NlvS7k05` Lorana Bartels · 0t · 2026-03-25

### 47. c.jones@pgud.org  (1 dup)
   **KEEP** `VO6mL3LulO6PqMgvBM9X` (no name) · consent 6t · 2026-06-08
   merge←  `ejNcw4Ba1tAKeKy7jb2N` kmpugwfgwtxmtlrmpsimjnmp · 4t · 2026-06-08

### 48. srubiamador@sjusd.org  (1 dup)
   **KEEP** `vARf3DDefHHMj8tI35j2` (no name) · consent 6t · 2026-06-08
   merge←  `lS6odMdzaEcGJ4eVIEQT` lxammhzitmziufjzsqxi · 3t · 2026-06-08

### 49. ciscoub@yahoo.com  (1 dup)
   **KEEP** `zVpUoZng3rFI78abJ861` (no name) · consent 6t · 2026-06-08
   merge←  `gGYuKv43Vi2uUkLij3DU` kbbzxlhazvflphckap · 4t · 2026-06-08

### 50. hawk_b51@yahoo.com  (1 dup)
   **KEEP** `DkpXtag9mbaAp6yCuSrA` (no name) · consent 6t · 2026-06-08
   merge←  `M9Tk5QXVTWiwj0tmJrXU` yvjnzgwshqirdfbocw · 4t · 2026-06-08

### 51. sbruzda@allianceppc.com  (1 dup)
   **KEEP** `2Z6qZKDEfTRqATZN1oVk` (no name) · consent 6t · 2026-06-08
   merge←  `wH335AZ8O1hTQY0gRgXr` deuycmrdpsouzrxudbrbfly · 3t · 2026-06-08

### 52. dj.polodavi.s@gmail.com  (1 dup)
   **KEEP** `k51xRq1kMPEslLIjHRPP` (no name) · consent 6t · 2026-06-08
   merge←  `vUF0sWNma75NwkMMr0K4` wtadfcuqyfabvnttrzkpds · 4t · 2026-06-08

### 53. cperry@qt-az.com  (1 dup)
   **KEEP** `OCbQ4FD8QZ6H1J6SHSpR` (no name) · consent 6t · 2026-06-08
   merge←  `dU8c2XwMQtu0UuMs8Onv` ikjvutqbrwdapktj · 3t · 2026-06-08

### 54. l.fclaf.fee@gmail.com  (1 dup)
   **KEEP** `5tsFtKJV3S9QHVVKlXo2` (no name) · consent 6t · 2026-06-08
   merge←  `r5cRnJzfYPzf76K7J4C5` tkjoiieskigthxrpmmxyy · 3t · 2026-06-08

### 55. kathy@klempel.me  (1 dup)
   **KEEP** `qB0Mm6PlNg9zMhYqgzPc` (no name) · consent 6t · 2026-06-08
   merge←  `dERu9XMHEJ866KKclssi` ojszzfnkjvshsbuc · 3t · 2026-06-08

### 56. javi_tess92@outlook.com  (1 dup)
   **KEEP** `z0VG38J9E9VD1CgAMdd1` (no name) · consent 6t · 2026-06-08
   merge←  `gZ3GXY1hv6iIBKLvNIBN` hqcgsykswtixcpflqzmz · 4t · 2026-06-08

### 57. ryazantsova@chameleongroup.co  (1 dup)
   **KEEP** `n0x9Jeq9U7gUcDTIHcKi` (no name) · consent 6t · 2026-06-08
   merge←  `PoULIorUVo7iRlB6Su8w` xwbklalwszjssprelrykawc · 3t · 2026-06-08

### 58. sgbox@wanadoo.fr  (1 dup)
   **KEEP** `qPX3grwbIxKMhi09dnA8` (no name) · consent 6t · 2026-06-08
   merge←  `9iKuhg5ZeUjxkwEvA9jO` qmsnjfvzunkazvkoouae · 3t · 2026-06-08

### 59. 7202034285@tmomail.net  (1 dup)
   **KEEP** `AANmMV55PgMLFCEvML8T` (no name) · consent 6t · 2026-06-08
   merge←  `00CsYRanDFMm9dyuudLY` vmygatmsfubskwdxzdhqeunh · 3t · 2026-06-08

### 60. vr@chameleongroup.co  (1 dup)
   **KEEP** `Skq21DRy4vKLLhj3Xxhf` (no name) · consent 6t · 2026-06-08
   merge←  `qHhpImxgkfJRqQjQAcWw` cruqxdtsahepqhvdiw · 3t · 2026-06-08

### 61. sd.sas.hco@gmail.com  (1 dup)
   **KEEP** `1H8Og5lXJvRRRe0D01GK` (no name) · consent 6t · 2026-06-08
   merge←  `hizlzOUVPL5pIXyPw0D2` mlkytwiwsdfebevw · 3t · 2026-06-08

### 62. ecoury8751@aol.com  (1 dup)
   **KEEP** `aW4jtrU1dyKR0VHmM20z` (no name) · consent 6t · 2026-06-08
   merge←  `c1bLRnL2j6iBtUXDAHk8` wgsvtpdkmfduaycfon · 3t · 2026-06-08

### 63. realinnovationfund@dewr.gov.au  (1 dup)
   **KEEP** `MymJIeUEL8btnnIT7bJB` real innovation fund · 5t · 2026-06-08
   merge←  `auto_ff882964` DEWR - REAL Innovation Fund · 2t · 2026-03-18

### 64. stp@uonbi.ac.ke  (1 dup)
   **KEEP** `rzwKLf3DXKs3C02dBpPH` fablab nairobi · 4t · 2026-05-27
   merge←  `CwcOrXeWjmjWQNryceX1` (no name) · 2t · 2026-06-08

### 65. jeremy@colemanprint.com.au  (1 dup)
   **KEEP** `iqk86FbdDvkyZvYrVkmu` jeremy bigg · 4t · 2026-06-08
   merge←  `auto_e3c10d00` jeremy · 0t · 2026-05-15

### 66. maggiebea@gmail.com  (1 dup)
   **KEEP** `xGUd9CrDEHyTZhjffqVs` maggie beale · 3t · 2026-06-08
   merge←  `auto_acb2a874` maggiebea · 0t · 2026-03-30

### 67. cherring@blackbird.vc  (1 dup)
   **KEEP** `ku4kKGWrrMSsUgBNv8Pe` blackbird · 0t · 2026-06-08
   merge←  `auto_dd7e2e75` Blackbird · 0t · 2026-06-01

### 68. cassie@devpost.com  (1 dup)
   **KEEP** `H4mOTf5X4in943diSVLE` cassie from devpost · 0t · 2026-06-08
   merge←  `FUkMewWYXlKvY4iQsFKB` Cassie from Devpost · 0t · 2026-03-14

### 69. jane.stecyk@m.mightynetworks.com  (1 dup)
   **KEEP** `TFBZR9piKBsEHbR9LAIQ` jane stecyk · 0t · 2026-06-08
   merge←  `320n1jeQmcihesXZUmye` jane stecyk · 0t · 2026-03-31

### 70. learn@send.zapier.com  (1 dup)
   **KEEP** `ZAGln0nOLO1Li5gTbnGU` Zapier · 0t · 2026-06-08
   merge←  `I7Cxyx67diOdRbXnsVyA` zapier · 0t · 2026-03-21

### 71. nicholas@ffproductions.com.au  (1 dup)
   **KEEP** `XDIJiY5M5UpTq731i8Gp` nic marchesi · 0t · 2026-06-08
   merge←  `auto_dbe6e4df` Nicholas Marchesi · 0t · 2026-04-27

## ⚠️ REVIEW — role / shared inbox

Same address, but a shared inbox can be **different people**. Confirm they are the same human before merging; otherwise re-email them and split.

### 1. ceo@deadlyscience.org.au  (5 dups)
   **KEEP** `kMG435sXyNZ3g0ka2hzg` cory tutt · consent 4t · 2026-03-06
   merge←  `5LqgNvZQ2TGXHyJguHkB` corey tutt · 7t · 2026-06-08
   merge←  `O5zWG2qnHYaeMPlYdK6z` corey tutt · 4t · 2026-05-15
   merge←  `wFviTiFi7euS3VyRWwLn` corey tutt · 9t · 2026-06-08
   merge←  `7i2onyZFqX12BKlx5uLY` corey tutt · 5t · 2026-06-08
   merge←  `YveuSGaoTk1fk105ExPO` corey tutt · 5t · 2026-06-08

### 2. contact@cdsuganda.org  (1 dup)
   **KEEP** `H02uVZuut3krrt7J4iV2` ogole oscar · 4t · 2026-05-27
   merge←  `Vse75dT3to1FwGmQeCAi` ogole oscar · 2t · 2026-06-08

### 3. jobs@key-systems.net  (1 dup)
   **KEEP** `Ix0bCx8mbJoEmKePeTer` (no name) · consent 6t · 2026-06-08
   merge←  `TBueqicmPnv5MTfw6fa9` uztvrdwpntxpceienltdfn · 4t · 2026-06-08

### 4. accounts@julalikari.com.au  (1 dup)
   **KEEP** `manual_323669aa-9ad2-46ae-910b-c5e795b64227` Julalikari Accounts · 1t · 2026-01-30
   merge←  `2McL6zmvblS37U0Q5XOm` julalikari council aboriginal corporation · 0t · 2026-06-08

### 5. support.dk@ezviz.com  (1 dup)
   **KEEP** `jvbsIAwJdPpADLphJN4q` ezviz international · 0t · 2026-06-08
   merge←  `Qu9mAYCYeKQ49oneprmv` support dk · 0t · 2026-03-02

### 6. hi@act.place  (1 dup)
   **KEEP** `x9ppRP5MZJnF6v01DgWj` a kind tractor · EL 9t · 2026-01-23
   merge←  `b5iTn4wqP0LsYuknFPnd` act admin · 4t · 2026-05-29

### 7. contact@good360.org.au  (1 dup)
   **KEEP** `jHSaeQO107ZNdPE2663T` good360 australia · 0t · 2026-06-08
   merge←  `FYqz6jN9upIH186oBLKN` Good360 Australia · 0t · 2026-04-24

### 8. info@flyhav.com  (1 dup)
   **KEEP** `g3mCmF64426by14k24uk` hinterland aviation · 3t · 2026-06-08
   merge←  `auto_25d2d21d` info · 0t · 2026-03-31

### 9. orders@eprintonline.com.au  (1 dup)
   **KEEP** `tCqk03o9pwcnf4F2pYi0` eprint online · 4t · 2026-06-08
   merge←  `auto_2c98c781` orders · 0t · 2026-03-23

### 10. support@rubimicrocafe.com  (1 dup)
   **KEEP** `iZjD7QCXmTntsvhxRQSP` (no name) · consent 6t · 2026-06-08
   merge←  `hfwq5NNmXUdw4oN0bpwV` vsxigmlydfvrynioyvudbprj · 3t · 2026-06-08

### 11. info@e.atlassian.com  (1 dup)
   **KEEP** `fO8yjuMpilWMD5JDzJZ6` loom · 0t · 2026-06-08
   merge←  `auto_fec6131c` Loom · 0t · 2026-04-17

### 12. ceo@jvtrust.org.au  (1 dup)
   **KEEP** `Fhk0FK9FcN563lUcSKhT` fiona maxwell · 21t · 2026-04-29
   merge←  `hQdMEJd33LmL3jzONRGh` fiona maxwell · 14t · 2026-06-08

### 13. accounts@act.place  (1 dup)
   **KEEP** `vT1CWtY6zB0kckOlzk8D` accounts act · EL 5t · 2026-06-08
   merge←  `Evf4J6yT8Z7U1AUl7X3T` accounts act · EL 3t · 2026-06-08

### 14. team@mail.miro.com  (1 dup)
   **KEEP** `MUEZf7YBTER80g9iPBB9` the miro team · 0t · 2026-06-08
   merge←  `TQfNIpXv2oBvNs03d6Hz` The Miro Team · 0t · 2025-12-16

### 15. hello@super.so  (1 dup)
   **KEEP** `1cDDSoegD8YYnQA4FbGK` super · 0t · 2026-06-08
   merge←  `auto_89084644` Super · 0t · 2026-05-25

### 16. team@mail.perplexity.ai  (1 dup)
   **KEEP** `tIcBE6bbyxiKmFYPF1Vx` perplexity enterprise · 0t · 2026-06-08
   merge←  `auto_fe7bbe3d` Perplexity · 0t · 2026-04-11

## 🤖 SYSTEM — automation artifacts (delete / fix at source)

A tool created a contact per run (e.g. the GrantScope orchestrator on `grantscope-triage@act.place`). **Do not hand-merge** — delete the extras and fix the source so it stops regrowing.

### 1. grantscope-triage@act.place  (14 dups)
   **KEEP** `BZvB3crwSpby8FfzmB19` grantscope triage · 4t · 2026-05-23
   merge←  `go1AwjMi8D1trk8WsbYj` grantscope triage · 1t · 2026-06-08
   merge←  `8SlnzOgAHhpOyLwywOIW` grantscope triage · 1t · 2026-06-08
   merge←  `kL3sN6xV9WpGXRSqMgKM` grantscope triage · 1t · 2026-06-08
   merge←  `NCBUYk9TQ7fnYIqFCD32` grantscope triage · 1t · 2026-06-08
   merge←  `uAsIUWBHez3DzVex8rtm` grantscope triage · 1t · 2026-06-08
   merge←  `RXTJqT4K3IpMk6XjRaj5` grantscope triage · 2t · 2026-06-08
   merge←  `rxBfwMhOd3vyfOFCkvYD` grantscope triage · 1t · 2026-06-08
   merge←  `5cWKwQGai8jg00jq23MJ` grantscope triage · 1t · 2026-06-08
   merge←  `ls4MMNgOdTI2gEROPeW6` grantscope triage · 1t · 2026-06-08
   merge←  `5kvBkyiJiSIlEC8EG2CO` grantscope triage · 1t · 2026-06-08
   merge←  `OS6cGHu8rn3ySuwj1MOP` grantscope triage · 1t · 2026-06-08
   merge←  `eWuHmHaqJqmO6M0qv5ku` grantscope triage · 1t · 2026-06-08
   merge←  `N066soQXQ4SEPFm8jvDs` grantscope triage · 1t · 2026-06-08
   merge←  `ShJqUOpYkOwoJuZb1NjF` grantscope triage · 2t · 2026-06-08

## 🚫 NOT_PEOPLE — vendor / test / place-record / scraped spam

Not human relationships: example/placeholder domains, automated senders (`news@`, `invoice+…`), `goods.civicgraph.io` place-records, and dotted-gmail spam. **Skip when merging**; safe to bulk-delete.

### 1. stripe@example.com  (3 dups)
   **KEEP** `Uo2GntyRd9gElysyXadb` jenny rosen · 3t · 2026-06-08
   merge←  `quQ1IVDWSP9KI5ixj2pd` jenny rosen · 1t · 2026-06-08
   merge←  `2Arkb6HM8Kde2MtGif5S` jenny rosen · 1t · 2026-06-08
   merge←  `gR2puEwwcN78LNSm1feT` jenny rosen · 1t · 2026-06-08

### 2. m.cnu.rl.in.s@gmail.com  (1 dup)
   **KEEP** `Nnz7iZwHdneXV4Jevi5E` (no name) · consent 6t · 2026-06-08
   merge←  `iMXVDwAhWo1di7wpozUl` uaeinxuxmozivxufmgmnvw · 4t · 2026-06-08

### 3. j.a.j.ab.ell.e8.1@gmail.com  (1 dup)
   **KEEP** `gXTEPv647NO8ZWZxnBrx` (no name) · consent 6t · 2026-06-08
   merge←  `StEignH29EJfadvAaEvs` nrzlqeyovwlydenv · 3t · 2026-06-08

### 4. voicemail@dialpad.com  (1 dup)
   **KEEP** `J9r6ZqJc5UAFGkguBC9w` dialpad · 0t · 2026-06-08
   merge←  `auto_1eb1bdb3` Dialpad · 0t · 2026-03-10

### 5. final-check@example.com  (1 dup)
   **KEEP** `qSAr8aMM9bgCPXzuTL1R` test · 9t · 2026-06-08
   merge←  `RI1TytFSVn0qCj3OpxMQ` test · 7t · 2026-06-08

### 6. welcome@openrouter.ai  (1 dup)
   **KEEP** `xFafMw0kPSHRqudXbxzS` openrouter team · 0t · 2026-06-08
   merge←  `auto_7b5386cb` OpenRouter Team · 0t · 2026-06-03

### 7. news@send.zapier.com  (1 dup)
   **KEEP** `JISEYTvuvj4g0PNcJ2nJ` zapier news · 0t · 2026-06-08
   merge←  `auto_6acba82c` Zapier News · 0t · 2026-03-26

### 8. mi.ke661.8.10@gmail.com  (1 dup)
   **KEEP** `Hdz88yGNh9cQgxwdIVnH` (no name) · consent 6t · 2026-06-08
   merge←  `8BkMmfmUWrmSUTo7WLaE` tzubbsxdthlorakxno · 4t · 2026-06-08

### 9. invoice+statements@supabase.com  (1 dup)
   **KEEP** `msoQkyq035iy0p92ayPu` supabase pte. ltd. · 0t · 2026-06-08
   merge←  `JLIYqnZRZDJ2d4Qf5MQw` supabase pte. ltd. · 0t · 2026-03-21

### 10. jarlmadanka@goods.civicgraph.io  (1 dup)
   **KEEP** `L1kooixF2tOI61OSdbP8` jarlmadanka wa · 2t · 2026-06-08
   merge←  `ac6FQdAwintboayVWUiM` jarlmadanka wa · 2t · 2026-05-15

### 11. warruwi@goods.civicgraph.io  (1 dup)
   **KEEP** `i3odQcXuB5Ek7jjnayH6` warruwi nt · 3t · 2026-06-08
   merge←  `Kfftjz1kr7re0quOvxxn` warruwi nt · 2t · 2026-05-15

### 12. feedback+customerio@warp.dev  (1 dup)
   **KEEP** `NEPhpv06ImtmacDOjfye` eric from warp · 0t · 2026-06-08
   merge←  `auto_55e7da84` Warp Team · 0t · 2026-03-06

### 13. kintore@goods.civicgraph.io  (1 dup)
   **KEEP** `kTimXhFlc71LShGqSwGI` kintore nt · 3t · 2026-06-08
   merge←  `iuVqVB3OrXIEcOEw5riw` kintore nt · 2t · 2026-05-15

### 14. accounting@thriday.com.au  (1 dup)
   **KEEP** `w9sayHZwpD9yy0cmahAb` thriday accounting · 0t · 2026-06-08
   merge←  `auto_5c5ea3f2` Sally Hurst (Thriday Accounting Support) · 0t · 2026-03-26

### 15. maureen.cummings@jcf.placeholder  (1 dup)
   **KEEP** `OKn95bkiAVRAWDKxeh2U` maureen cummings · EL 3t · 2026-06-08
   merge←  `P7hT9BCbMgpmw3MYA1ub` maureen cummings · 4t · 2026-05-29

### 16. a.s.hleyd.uk.es.1.2@gmail.com  (1 dup)
   **KEEP** `1wK7zf7Ja4VRRtyUID47` (no name) · consent 6t · 2026-06-08
   merge←  `egO4mKoiE3UQOdVs3Fra` kkvawnbzzxrsrkqbpglvr · 4t · 2026-06-08

### 17. wecare@thriday.com.au  (1 dup)
   **KEEP** `b1uGSGDl6iBEXJdiRFkV` thriday · 0t · 2026-06-08
   merge←  `auto_7ab4ec28` Thriday · 0t · 2026-03-11

### 18. pete.rh.aup.e.nthal1.4@gmail.com  (1 dup)
   **KEEP** `Eyc5IpyXhUbBU09JhoSd` (no name) · consent 6t · 2026-06-08
   merge←  `xmxXCRJfjp1l2nfJVfVo` oyrdeuhvyjpndvxv · 3t · 2026-06-08

### 19. w.i.n.at.aro23.4@gmail.com  (1 dup)
   **KEEP** `8iuHKXd1fc399wTjBAao` (no name) · consent 6t · 2026-06-08
   merge←  `qojZDdJtW9tjp46Cdjc4` fqxxztkhksrsgcprhdojjem · 3t · 2026-06-08

### 20. umbakumba@goods.civicgraph.io  (1 dup)
   **KEEP** `6bjo08S459GAjsCrJEa0` umbakumba nt · 3t · 2026-06-08
   merge←  `cosG1FgL133xMtL2ewdy` umbakumba nt · 2t · 2026-05-15

### 21. updates@product.exa.ai  (1 dup)
   **KEEP** `UaApxKCDKpy7a1wYtDhT` will bryk · 0t · 2026-06-08
   merge←  `mwZOKNJrRt23YeZSluLD` Exa Product Updates · 0t · 2026-03-05

### 22. ben+washtest1779856038@benjamink.com.au  (1 dup)
   **KEEP** `CWYLiCR10hR8wa3NTmLw` wash test · 5t · 2026-06-08
   merge←  `W8NvPYuxVs8ZA6rR2Fsi` wash test · 5t · 2026-06-08

### 23. milingimbi@goods.civicgraph.io  (1 dup)
   **KEEP** `65oqqmNvJ056JG0Mp3pF` milingimbi nt · 3t · 2026-06-08
   merge←  `pnKIc9CJvb4XmbcK8q74` milingimbi nt · 2t · 2026-05-15

### 24. cole.reply@formspree.io  (1 dup)
   **KEEP** `DQqLmSsP4hxU1iIUF14Y` cole · 0t · 2026-06-08
   merge←  `WUiKS4b8hgp2ePnV7LoC` Cole · 0t · 2026-03-12

## 🗑️ LOW_VALUE — delete the dups (don't merge)

No tags, no consent, garbage/empty names — scrape artifacts. Safe to delete the `merge←` rows in UI rather than merge.

_none_

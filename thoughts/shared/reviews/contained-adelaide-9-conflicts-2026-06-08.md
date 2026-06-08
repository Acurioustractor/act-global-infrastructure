# CONTAINED Adelaide — 9 GHL Duplicate-Conflict Review Brief

**Date:** 2026-06-08
**For:** Ben (manual resolution in the GHL UI)
**Status:** human-only — agents do NOT resolve these

> ## LIVE UPDATE (2026-06-08, read-only GHL lookup)
> All **9/9 conflicts confirmed live** via `mcp__ghl__contacts_get-contact` — every one of the 18 contact IDs returned 200 (no 404s/stale IDs). Each person below now has a **"LIVE (2026-06-08)"** subsection with both records' actual current state + an exact merge action. No GHL writes were made.
>
> **Cross-cutting findings:**
> - **In every pair, the email-lookup ID (`matchedGhlId`) is the OLDER / richer record** (earlier `dateAdded`, has companyName/website/phone/richer custom fields, usually CSV-import origin) → keep it as PRIMARY in all 9 cases.
> - **OCAP survivors that MUST carry `lane:community` and MUST NOT carry any `comms:*` tag:** Kristy Bloomfield (CONFIRMED), Corey Tutt (precautionary — strip 2 live comms tags), Dr Simon Quilty (precautionary — strip 4 live comms tags), Tracey Newman (precautionary — add lane:community), Tara Castle (already `lane:community` in GHL, keep protective).
> - **Comms tags to STRIP on merge (community-line survivors):** Corey Tutt → `comms:goods-newsletter`, `comms:act-newsletter`; Dr Simon Quilty → `comms:goods-newsletter`, `comms:newsletter`, `comms:partner-drip`, `comms:act-newsletter`.
> - **Flat legacy `goods-newsletter` (no `comms:` prefix) to drop on the survivor** for: Adam Robinson, Corey Tutt, Dr Simon Quilty, Sam Davies, Tara Castle, Willhemina Wahlin.
> - **Name fix:** Corey Tutt — record B is spelled "Cory"; set survivor to **"Corey"**.

## What these are

The CONTAINED Adelaide campaign preflight (269 input rows) auto-applied tags to 260 contacts matched cleanly by email. **9 rows were skipped** because the `conflict_guard` rule fired: the contact ID carried on the GHL export row (`sourceGhlId`) and the ID returned by a fresh duplicate-email lookup (`matchedGhlId`) were **different IDs**. That mismatch means the same email/person is likely represented by two distinct GHL contact records — exactly the situation an automated tag-apply must not touch, because it can't tell which record is canonical. So those 9 are `pending` and need a human to merge/resolve in the GHL UI before any tags or campaign enrolment.

**Source of truth for this brief:** the local audit files only —
`output/ghl-contained-adelaide-audit/contained-ghl-preflight-actions.{json,csv}` and `contained-ghl-import.csv` (JusticeHub repo). No GHL/Supabase/Notion API was called. Where a field isn't in the files it is marked "not in audit files — inspect in GHL UI". No IDs, emails, or names were guessed.

**Two-ID columns explained:**
- **Export ID** = `sourceGhlId` in preflight-actions.csv (= the `GHL ID` column in import.csv — the record the campaign export pulled).
- **Email-lookup ID** = `matchedGhlId` — the record a live email lookup returned.
These differ in all 9 cases; that *is* the conflict. The audit files do NOT describe what each candidate record contains (tags already on it, source, stage) — that detail lives only in GHL and must be inspected there. The "Tags To Add" / stream / stage fields below are what the campaign *intended to apply*, not what is currently on either record.

**Conservative default for every row:** open both IDs in GHL, confirm they are the same human (same email = strong signal here, since both were keyed off the one campaign email), keep the record with the richer history / more existing tags / earliest creation as **primary**, merge the thinner one into it. If the two IDs turn out to be *different people* who happen to share or collide on an email, do NOT merge — split/correct instead. All 9 carry `Consent Status: Needs consent check` in the import file, so none should be enrolled into any newsletter/drip until consent is confirmed regardless of the merge outcome.

---

## 1. Adam Robinson

- **Export ID (sourceGhlId):** `wHstWIW6zo1ifWnWsayd`
- **Email-lookup ID (matchedGhlId):** `Qtl5PgkHPMnNS1mjnGRO`
- **Email:** adam@streetsmartaustralia.org
- **Org / role:** Company field blank in files; email domain → StreetSmart Australia. Segment = "VIPs: personal only"; engagement `personal-vip`; priority `A - personal`. Signals: inquiry source, JusticeHub relationship, delivery or partner circle.
- **Campaign intent (not current record state):** pipeline stage "Personal invite"; tags-to-add include `ring:vip`, `engagement:personal-vip`, `project:contained(-adelaide-2026)`, plus newsletter streams youth-justice-brief / media-pack / funder-brief / daily-adelaide-recap. Existing tag count on the export record: 9. Consent: Needs consent check.
- **Recommended action:** Open both IDs. Confirm same person (StreetSmart / Adam Robinson). Keep the record with the fuller history as primary, merge the other in. This is a VIP / personal-relationship contact, NOT a community-line storyteller — campaign enrolment is appropriate, but the row is flagged `Needs consent check`, so confirm consent before adding the 4 newsletter streams.

### LIVE (2026-06-08) — confirmed via GHL get-contact
Both IDs found live, same email `adam@streetsmartaustralia.org`, both `type:lead`, source "Website Inquiry".

| | **A — `wHstWIW6zo1ifWnWsayd`** (sourceGhlId) | **B — `Qtl5PgkHPMnNS1mjnGRO`** (matchedGhlId) |
|---|---|---|
| dateAdded | 2026-06-01 | **2026-04-06 (older)** |
| name | Adam Robinson | Adam Robinson |
| tags | goods-newsletter, source:inquiry, role:funder, project:act-gd, comms:goods-newsletter, project:act-jh, role:partner, role:buyer (8) | goods-newsletter, source:inquiry, role:funder, project:act-gd, comms:goods-newsletter, project:act-jh, role:partner, **comms:funder-drip**, role:buyer (9) |
| customFields | "Goods" (deal type) | rich: Supporter/Strategic/Philanthropy/Goods Bed V3 |

**MERGE ACTION:** Keep **B (`Qtl5PgkHPMnNS1mjnGRO`)** as PRIMARY (older + richer custom fields). Merge A into B. Final survivor tag set (union, deduped, drop flat dupes): `role:funder, role:partner, role:buyer, project:act-gd, project:act-jh, source:inquiry, comms:goods-newsletter, comms:funder-drip`. **Drop the flat legacy `goods-newsletter`** (superseded by `comms:goods-newsletter`). Not community-line — comms tags OK once consent confirmed (consent gate still applies before any new newsletter-stream).

## 2. Corey Tutt

- **Export ID (sourceGhlId):** `5LqgNvZQ2TGXHyJguHkB`
- **Email-lookup ID (matchedGhlId):** `kMG435sXyNZ3g0ka2hzg`
- **Email:** ceo@deadlyscience.org.au
- **Org / role:** Company blank; email domain → DeadlyScience (Corey Tutt is its CEO/founder). Segment "Public/warm list: only after audit"; engagement `hot`; priority `B - hot`. Signal: inquiry source.
- **Campaign intent:** stage "Warm review"; tags-to-add `engagement:hot`, `campaign-stage:warm-review`, `project:contained(-adelaide-2026)`, `source:inquiry`. No newsletter streams assigned. Existing tag count: 4. Consent: Needs consent check.
- **OCAP CAUTION:** Corey Tutt is a prominent Aboriginal (Kamilaroi) STEM leader / founder of DeadlyScience. He reads as a First Nations sector leader rather than a generic campaign supporter. **Verify community-line status before any comms.** Deduping the two records is fine, but the surviving record must NOT be auto-enrolled into any `comms:*`/`newsletter-stream:*` drip — reach him only by his own opt-in or a human 1:1. (No newsletter streams are assigned here, which is consistent with that.)
- **Recommended action:** Open both IDs, confirm same person, keep the richer record as primary and merge. Do not enrol into automation; treat as relationship-led.

### LIVE (2026-06-08) — confirmed via GHL get-contact
Both IDs found live, same email `ceo@deadlyscience.org.au`. **Name spelling differs between records: "Corey" (A) vs "Cory" (B) — fix to "Corey" on the survivor.**

| | **A — `5LqgNvZQ2TGXHyJguHkB`** (sourceGhlId) | **B — `kMG435sXyNZ3g0ka2hzg`** (matchedGhlId) |
|---|---|---|
| dateAdded | 2026-06-01 | **2025-11-25 (older)** |
| name | Corey Tutt | Cory Tutt |
| company/website | — | **Deadly Science / deadlyscience.org.au** |
| tags | goods-newsletter, audience-brand, source:inquiry, **comms:goods-newsletter**, project:act-gd, **comms:act-newsletter**, role:buyer (7) | audience-brand, **comms:goods-newsletter**, project:act-gd, **comms:act-newsletter** (4) |
| customFields | "Goods" | rich: outreach-stage / "Initial outreach" |

**MERGE ACTION:** Keep **B (`kMG435sXyNZ3g0ka2hzg`)** as PRIMARY (older, has company/website, attribution = CSV import — the established record). Merge A into B. Fix first name to **"Corey"**. Final survivor tag set: `audience-brand, project:act-gd, source:inquiry, role:buyer`. **Drop flat legacy `goods-newsletter`.**

**OCAP — PRECAUTIONARY COMMUNITY-LINE: the survivor MUST carry `lane:community` and MUST NOT carry any `comms:*` tag.** Corey Tutt is a Kamilaroi STEM leader (DeadlyScience founder). Both records currently carry `comms:goods-newsletter` + `comms:act-newsletter` — **strip BOTH `comms:*` tags** and **add `lane:community`** to the survivor. Reach only by his own opt-in / human 1:1, never a drip.

## 3. Dr. Simon Quilty

- **Export ID (sourceGhlId):** `7ZKeS2H6Fyi1xDUTvING`
- **Email-lookup ID (matchedGhlId):** `UJPGFZbcjcdslJC8jN6T`
- **Email:** sq@wilyajanta.org
- **Org / role:** Company blank; email domain → Wilya Janta (Dr Simon Quilty is a physician/researcher associated with the Wilya Janta housing collaboration in the NT). Segment "Public/warm list: only after audit"; engagement `hot`; priority `B - hot`. Signal: inquiry source.
- **Campaign intent:** stage "Warm review"; tags-to-add `engagement:hot`, `campaign-stage:warm-review`, `project:contained(-adelaide-2026)`. No newsletter streams. Existing tag count: 10 (the highest of the 9 — the export record looks well-established). Consent: Needs consent check.
- **OCAP CAUTION (precautionary):** Wilya Janta is a First-Nations-led collaboration; Dr Quilty is a non-Indigenous clinician working alongside it, so he is likely a supporter/ally rather than a community-line individual — but the org context touches community work. **Verify community-line status before any comms;** if confirmed an ally/supporter, normal warm-review handling applies. Either way the row is `Needs consent check`, so no drip enrolment until consent confirmed.
- **Recommended action:** Open both IDs, confirm same person, keep the higher-history record (likely the one with the 10 tags) as primary, merge the other in.

### LIVE (2026-06-08) — confirmed via GHL get-contact
Both IDs found live, same email `sq@wilyajanta.org`. Name differs: "Dr. Simon" (A) vs "Simon" (B).

| | **A — `7ZKeS2H6Fyi1xDUTvING`** (sourceGhlId) | **B — `UJPGFZbcjcdslJC8jN6T`** (matchedGhlId) |
|---|---|---|
| dateAdded | 2026-06-01 | **2025-11-25 (older)** |
| name | Dr. Simon Quilty | Simon Quilty |
| phone/company | — | **+61459025798 / Wilyajanta / wilyajanta.org** |
| tags | goods-newsletter, audience-brand, source:inquiry, project:act-gd, role:partner, **comms:goods-newsletter**, **comms:act-newsletter**, role:buyer (8) | goods-newsletter, audience-brand, project:act-gd, role:partner, **comms:goods-newsletter**, source:inquiry, **comms:newsletter**, **comms:partner-drip**, **comms:act-newsletter**, role:buyer (10) |
| customFields | "Goods" | rich: Supporter/Strategic/Partner/Tennant Creek + assignedTo |

**MERGE ACTION:** Keep **B (`UJPGFZbcjcdslJC8jN6T`)** as PRIMARY (older, has phone + company + assignedTo + 10 tags — clearly the established record). Merge A into B. Set name to "Dr. Simon Quilty" (or keep "Simon" — Ben's call). Final survivor tag set: `audience-brand, project:act-gd, role:partner, source:inquiry, role:buyer`. **Drop flat legacy `goods-newsletter`.**

**OCAP — PRECAUTIONARY: the survivor MUST carry `lane:community` and MUST NOT carry any `comms:*` tag.** Wilya Janta is a First-Nations-led NT collaboration; Dr Quilty works alongside it. Treat protectively. The PRIMARY (B) currently carries four comms tags (`comms:goods-newsletter, comms:newsletter, comms:partner-drip, comms:act-newsletter`) — **strip ALL `comms:*`** and **add `lane:community`** to the survivor. (If Ben confirms he is an ally/supporter rather than community-line, downgrade to normal handling — protective default until then.)

## 4. Kristy Bloomfield

- **Export ID (sourceGhlId):** `yk4uK8rgDNGA87EUqNbu`
- **Email-lookup ID (matchedGhlId):** `0kEs9BJmkmi7ZUc5haEX`
- **Email:** kristy.bloomfield@oonchiumpa.com.au
- **Org / role:** Company blank; email domain → Oonchiumpa. Segment "Public/warm list: only after audit"; engagement `hot`; priority `B - hot`. Signals: inquiry source, JusticeHub relationship.
- **Campaign intent:** stage "Warm review"; tags-to-add include `newsletter-stream:youth-justice-brief`, `engagement:hot`, `campaign-stage:warm-review`, `project:contained(-adelaide-2026)`. Existing tag count: 9. Consent: Needs consent check.
- **OCAP CAUTION (CONFIRMED community-line):** Kristy Bloomfield is a known **community storyteller — Oonchiumpa (ACT-OO), Mparntwe** (she co-leads Oonchiumpa with Tanya Turner). She is a community-line / lived-experience person, **NOT a campaign supporter.** Deduping her two records is fine, but the surviving record MUST NOT be enrolled into the `youth-justice-brief` newsletter stream or any other `comms:*` / `campaign automation`. Community-line people are reachable only by their own opt-in or a human 1:1. **Before merging, also drop the `newsletter-stream:youth-justice-brief` intent for this contact** — do not carry it onto the surviving record. (This is the exact community-in-a-funnel pattern flagged previously for Oonchiumpa contacts.)
- **Recommended action:** Open both IDs, confirm same person, merge into the record with the cleaner/community-appropriate state. Strip campaign/newsletter automation tags from the survivor. Keep relationship-led contact only.

### LIVE (2026-06-08) — confirmed via GHL get-contact
Both IDs found live, same email `kristy.bloomfield@oonchiumpa.com.au`. **GOOD NEWS: both records are already community-clean — both carry `lane:community` + `role:storyteller` and NEITHER carries any `comms:*` tag.**

| | **A — `yk4uK8rgDNGA87EUqNbu`** (sourceGhlId) | **B — `0kEs9BJmkmi7ZUc5haEX`** (matchedGhlId) |
|---|---|---|
| dateAdded | 2026-06-01 | **2025-11-25 (older)** |
| company | — | **Oonchiumpa** |
| tags | project:act-hv, project:act-gd, audience-brand, source:inquiry, project:act-jh, role:partner, role:storyteller, **lane:community**, role:buyer (9) | project:act-hv, project:act-gd, audience-brand, project:act-jh, role:partner, role:storyteller, **lane:community**, source:inquiry, role:buyer (9) |
| customFields | "Goods" | CivicGraph entity URL (AU-JH-001) + follower |
| comms:* tags | **NONE** | **NONE** |

**MERGE ACTION:** Keep **B (`0kEs9BJmkmi7ZUc5haEX`)** as PRIMARY (older, has company "Oonchiumpa" + CivicGraph entity link + follower). Merge A into B. Final survivor tag set: `project:act-hv, project:act-gd, project:act-jh, audience-brand, source:inquiry, role:partner, role:storyteller, lane:community, role:buyer`.

**OCAP — CONFIRMED COMMUNITY-LINE: the survivor MUST carry `lane:community` and MUST NOT carry any `comms:*` tag.** Kristy Bloomfield co-leads Oonchiumpa (ACT-OO, Mparntwe) with Tanya Turner — a community storyteller, not a campaign supporter. Both records are already comms-clean, so the only requirement is: **do NOT add `comms:goods-newsletter`, `comms:act-newsletter`, the campaign `youth-justice-brief` stream, or ANY comms/drip during or after the merge.** Reach only by her own opt-in / human 1:1.

## 5. Sam Davies

- **Export ID (sourceGhlId):** `7WXGBE5zD73ipAJfb5qE`
- **Email-lookup ID (matchedGhlId):** `Vk0et07jw3qccBZsqBF8`
- **Email:** sam@defydesign.org
- **Org / role:** Company blank; email domain → Defy Design. Segment "Public/warm list: only after audit"; engagement `hot`; priority `B - hot`. Signals: inquiry source, gmail discovery (so `source:gmail-discovery; source:inquiry`).
- **Campaign intent:** stage "Warm review"; tags-to-add `engagement:hot`, `campaign-stage:warm-review`, `project:contained(-adelaide-2026)`, `source:gmail-discovery`, `source:inquiry`. No newsletter streams. Existing tag count: 14 (highest existing-tag count of the 9). Consent: Needs consent check.
- **Recommended action:** Open both IDs, confirm same person. The export record carries 14 existing tags — likely the more established record; keep it as primary and merge the other in (verify before assuming). Reads as a supporter/ally (design org), not community-line — campaign handling appropriate after consent check.

### LIVE (2026-06-08) — confirmed via GHL get-contact
Both IDs found live, same email `sam@defydesign.org`.

| | **A — `7WXGBE5zD73ipAJfb5qE`** (sourceGhlId) | **B — `Vk0et07jw3qccBZsqBF8`** (matchedGhlId) |
|---|---|---|
| dateAdded | 2026-06-01 | **2026-01-08 (older)** |
| company/website | — | **Defy Design / defydesign.org** |
| source | Website Inquiry | **Goods supplier import** |
| tags (13) | goods-newsletter, audience-brand, supplier-hdpe, source:inquiry, project:act-gd, role:supporter, comms:goods-newsletter, source:gmail-discovery, role:partner, role:supplier, comms:act-newsletter, ring:15, role:buyer | **(14)** audience-brand, supplier-hdpe, project:act-gd, role:supporter, comms:goods-newsletter, source:inquiry, source:gmail-discovery, role:partner, role:supplier, **comms:supporter-drip**, **comms:buyer-drip**, comms:act-newsletter, ring:15, role:buyer |
| customFields | "Goods" | CivicGraph entity URL (AU-JH-001) |

**MERGE ACTION:** Keep **B (`Vk0et07jw3qccBZsqBF8`)** as PRIMARY (older, company/website, "Goods supplier import" source, CivicGraph link, 14 tags). Merge A into B. Final survivor tag set (union, deduped): `audience-brand, supplier-hdpe, project:act-gd, role:supporter, role:partner, role:supplier, role:buyer, source:inquiry, source:gmail-discovery, ring:15, comms:goods-newsletter, comms:act-newsletter, comms:supporter-drip, comms:buyer-drip`. **Drop flat legacy `goods-newsletter`** (carried only on A). Not community-line (HDPE supplier / design org) — comms tags OK; consent gate still applies before adding any NEW newsletter stream.

## 6. Tara Castle

- **Export ID (sourceGhlId):** `1FJKzuyt1IpEFdjbJhjC`
- **Email-lookup ID (matchedGhlId):** `8QyHvajKpuyHyDmBfcCY`
- **Email:** tara@queenslandgives.org.au
- **Org / role:** Company blank; email domain → Queensland Gives (philanthropy / community foundation). Segment "Public/warm list: only after audit"; engagement `hot`; priority `B - hot`. Signal: inquiry source.
- **Campaign intent:** stage "Warm review"; tags-to-add `engagement:hot`, `campaign-stage:warm-review`, `project:contained(-adelaide-2026)`. No newsletter streams. Existing tag count: 6. Consent: Needs consent check.
- **Recommended action:** Open both IDs, confirm same person, keep the richer record as primary, merge. Reads as a funder/philanthropy contact, not community-line — normal warm-review handling after consent check.

### LIVE (2026-06-08) — confirmed via GHL get-contact
Both IDs found live, same email `tara@queenslandgives.org.au`. **NOTE: both records currently carry `lane:community` + `role:community` in GHL (despite reading as a philanthropy contact) — see decision below.**

| | **A — `1FJKzuyt1IpEFdjbJhjC`** (sourceGhlId) | **B — `8QyHvajKpuyHyDmBfcCY`** (matchedGhlId) |
|---|---|---|
| dateAdded | 2026-06-01 | **2026-04-13 (older)** |
| tags (6) | goods-newsletter, source:inquiry, project:act-gd, role:community, **lane:community**, role:buyer | goods-newsletter, source:inquiry, project:act-gd, role:community, **lane:community**, role:buyer |
| customFields | "Goods" | rich: Supporter/Hot/Philanthropy/Stretch Bed/Palm Island |

**MERGE ACTION:** Keep **B (`8QyHvajKpuyHyDmBfcCY`)** as PRIMARY (older + richer custom fields). Merge A into B. Final survivor tag set: `project:act-gd, source:inquiry, role:community, lane:community, role:buyer`. **Drop flat legacy `goods-newsletter`** (neither record carries `comms:goods-newsletter`, so nothing to keep).

**OCAP — survivor currently carries `lane:community` in GHL; the survivor MUST NOT carry any `comms:*` tag while that lane tag is present.** Neither record has any `comms:*` tag today — clean. If Ben judges Tara is actually a philanthropy/funder contact mis-tagged `lane:community`/`role:community` (the custom field "Philanthropy" suggests so), that re-classification is a separate decision — do it deliberately, not as a side-effect of this merge. Until then, hold protective: no drip, no newsletter.

## 7. Tracey Newman

- **Export ID (sourceGhlId):** `pvZ53c6JlkL5sOPPFiTc`
- **Email-lookup ID (matchedGhlId):** `D05Oa0eO8arILsSNjiPQ`
- **Email:** traceynewman008@gmail.com
- **Org / role:** Company blank; personal gmail address. Location: South Australia / SA. Segment "Public/warm list: only after audit"; engagement `hot`; priority `B - hot`. Signals: inquiry source, JusticeHub relationship, Adelaide/SA relevance.
- **Campaign intent:** stage "Warm review"; tags-to-add include `newsletter-stream:contained-adelaide-invite`, `newsletter-stream:youth-justice-brief`, `place:sa`, `engagement:hot`, `campaign-stage:warm-review`, `project:contained(-adelaide-2026)`. Existing tag count: 6. Consent: Needs consent check.
- **OCAP CAUTION (precautionary — verify):** personal gmail + JusticeHub relationship + SA relevance could indicate a lived-experience / community contact rather than an org supporter; the audit files give no org or role to confirm either way. **Verify community-line status before any comms.** If she is a community/lived-experience person, do NOT enrol her into the `contained-adelaide-invite` or `youth-justice-brief` streams — reach her by her own opt-in / human 1:1 only. If she is an ordinary warm supporter, normal handling after the consent check.
- **Recommended action:** Open both IDs, confirm same person, keep the richer record as primary and merge. Hold the two newsletter-stream tags until both consent AND community-line status are confirmed.

### LIVE (2026-06-08) — confirmed via GHL get-contact
Both IDs found live, same email `traceynewman008@gmail.com`. **Both records are comms-clean (no `comms:*` tag) and both carry `place:adelaide` + `role:partner`.**

| | **A — `pvZ53c6JlkL5sOPPFiTc`** (sourceGhlId) | **B — `D05Oa0eO8arILsSNjiPQ`** (matchedGhlId) |
|---|---|---|
| dateAdded | 2026-06-01 | **2026-03-26 (older)** |
| tags (6) | source:inquiry, project:act-jh, role:partner, place:adelaide, project:act-gd, role:buyer | source:inquiry, project:act-jh, role:partner, place:adelaide, project:act-gd, role:buyer |
| customFields | "Goods" | rich: Supporter/Strategic/**Community**/Contained Tour |
| comms:* tags | **NONE** | **NONE** |

**MERGE ACTION:** Keep **B (`D05Oa0eO8arILsSNjiPQ`)** as PRIMARY (older + richer custom fields, incl. "Community" / "Contained Tour"). Merge A into B. Final survivor tag set: `project:act-jh, project:act-gd, role:partner, place:adelaide, source:inquiry, role:buyer`. No flat legacy tags to drop. No newsletter-stream tag exists on either record (the campaign-intent `contained-adelaide-invite` / `youth-justice-brief` were never applied) — **do NOT add them.**

**OCAP — PRECAUTIONARY COMMUNITY-LINE: treat protectively — survivor should carry `lane:community` and MUST NOT carry any `comms:*` tag.** Personal gmail + JusticeHub relationship + Adelaide/SA + the "Community" custom-field value all read as a lived-experience/community contact rather than an org supporter. **Add `lane:community` to the survivor** and do not enrol into any stream/drip. (If Ben confirms she is an ordinary warm supporter, downgrade — protective default until then.)

## 8. Willhemina Wahlin

- **Export ID (sourceGhlId):** `moxP9fCQ7a2pdibcxPDa`
- **Email-lookup ID (matchedGhlId):** `0w3yMTXm12bl74aKGce0`
- **Email:** willhemina.wahlin@portable.com.au
- **Org / role:** Company blank; email domain → Portable (a design/social-impact studio). Segment "Public/warm list: only after audit"; engagement `hot`; priority `B - hot`. Signal: inquiry source.
- **Campaign intent:** stage "Warm review"; tags-to-add `engagement:hot`, `campaign-stage:warm-review`, `project:contained(-adelaide-2026)`. No newsletter streams. Existing tag count: 7. Consent: Needs consent check.
- **Recommended action:** Open both IDs, confirm same person, keep the richer record as primary, merge. Reads as an org/professional supporter (Portable), not community-line — normal warm-review handling after consent check.

### LIVE (2026-06-08) — confirmed via GHL get-contact
Both IDs found live, same email `willhemina.wahlin@portable.com.au`.

| | **A — `moxP9fCQ7a2pdibcxPDa`** (sourceGhlId) | **B — `0w3yMTXm12bl74aKGce0`** (matchedGhlId) |
|---|---|---|
| dateAdded | 2026-06-01 | **2026-04-06 (older)** |
| tags | goods-newsletter, source:inquiry, project:act-gd, role:supporter, **comms:goods-newsletter**, role:buyer (6) | goods-newsletter, source:inquiry, project:act-gd, role:supporter, **comms:goods-newsletter**, **comms:supporter-drip**, role:buyer (7) |
| customFields | "Goods" | rich: Supporter/Warm/Design/Goods Bed Imagine |

**MERGE ACTION:** Keep **B (`0w3yMTXm12bl74aKGce0`)** as PRIMARY (older + richer custom fields, one extra comms tag). Merge A into B. Final survivor tag set: `project:act-gd, source:inquiry, role:supporter, role:buyer, comms:goods-newsletter, comms:supporter-drip`. **Drop flat legacy `goods-newsletter`.** Not community-line (Portable — design/social-impact studio) — comms tags OK; consent gate applies before any new newsletter stream.

## 9. Toby Gowland

- **Export ID (sourceGhlId):** `mTsZ14zvtIs3XaaTHHhX`
- **Email-lookup ID (matchedGhlId):** `cnNzFM6zrQjRaMJ69NpE`
- **Email:** tobyg@kalianahoutdoors.com.au
- **Org / role:** Company blank; email domain → Kalianah Outdoors. Location: Queensland / QLD. Segment "Future tour supporters: post-Adelaide update"; engagement `hot`; priority `B - hot`. Signals: contained hot lead, inquiry source, JusticeHub relationship, Adelaide/SA relevance.
- **Campaign intent:** stage "Warm review"; tags-to-add include `newsletter-stream:contained-adelaide-invite`, `newsletter-stream:youth-justice-brief`, `newsletter-stream:future-tour-update`, `place:qld`, `engagement:hot`, `campaign-stage:warm-review`, `project:contained(-adelaide-2026)`. Existing tag count: 12. Consent: Needs consent check.
- **Recommended action:** Open both IDs, confirm same person, keep the richer record (the export record carries 12 existing tags — likely the established one; verify) as primary and merge. Reads as a supporter / future-tour lead, not community-line — campaign handling appropriate, but hold the 3 newsletter streams until the consent check clears.

### LIVE (2026-06-08) — confirmed via GHL get-contact
Both IDs found live, same email `tobyg@kalianahoutdoors.com.au`. Tags near-identical; A has 12, B has 12 (same set, B has `comms:justicehub-newsletter` reordered).

| | **A — `mTsZ14zvtIs3XaaTHHhX`** (sourceGhlId) | **B — `cnNzFM6zrQjRaMJ69NpE`** (matchedGhlId) |
|---|---|---|
| dateAdded | 2026-06-01 | **2026-04-27 (older)** |
| tags | contained-hot-lead, project:act-ce, **comms:justicehub-newsletter**, project:act-jh, source:inquiry, interest:justice-reform, role:partner, place:brisbane, interest:container, project:act-gd, project:act-cn, role:buyer (12) | contained-hot-lead, project:act-ce, source:inquiry, project:act-jh, interest:justice-reform, role:partner, place:brisbane, interest:container, project:act-gd, project:act-cn, **comms:justicehub-newsletter**, role:buyer (12) |
| customFields | "Goods" | rich: Supporter/Warm/Youth/Goods Bed V3 |

**MERGE ACTION:** Keep **B (`cnNzFM6zrQjRaMJ69NpE`)** as PRIMARY (older + richer custom fields). Merge A into B. Final survivor tag set (identical union): `contained-hot-lead, project:act-ce, project:act-jh, project:act-gd, project:act-cn, source:inquiry, interest:justice-reform, interest:container, role:partner, role:buyer, place:brisbane, comms:justicehub-newsletter`. No flat legacy newsletter tag to drop. Not community-line (Kalianah Outdoors, QLD supporter/future-tour lead) — `comms:justicehub-newsletter` is already present on both; consent gate applies before adding the campaign-intent `contained-adelaide-invite` / `future-tour-update` streams (those were never applied and do NOT exist as live comms tags).

---

## Resolution checklist (per contact, in GHL)

1. Open both IDs side by side; confirm they are the same human (email is the anchor here).
2. If same person → keep the record with the richer history / earliest creation / more existing tags as **primary**; merge the other in. If different people → do NOT merge; correct the mis-keyed record instead.
3. Respect every **OCAP CAUTION** above — community-line survivors get NO drip/newsletter/automation enrolment; strip campaign/newsletter tags from those survivors.
4. Every one of the 9 is `Needs consent check` — confirm consent before adding ANY `newsletter-stream:*` tag, even for clear supporters.
5. The "campaign intent" tags/streams listed are what the import *wanted* to apply; they are not necessarily on either record yet — verify current state in GHL before applying.

## Evidence coverage

All 9 names had **full conflict evidence in the audit files**: both conflicting IDs (export vs email-lookup), email, segment, engagement, priority, pipeline stage, intended tags/streams, existing tag count, and consent status were present for every one. The audit files do NOT contain a per-candidate-record breakdown (what tags/source/stage each of the two IDs currently holds) — that is the one thing that must be inspected directly in the GHL UI for each contact, and the recommendations above are conservative because of it.

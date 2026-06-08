# GHL Comms Switch-On Runbook — newsletters + drips

**Date:** 2026-06-08
**For:** Ben — manual execution in the GoHighLevel UI (location "A Curious Tractor", `agzsSZWgovjwgpcoASWG`)
**Prepared by:** read-only agent pass. **The agent did NOT switch anything on, enrol any contact, or write to GHL.** Every step below is Ben's manual UI work.
**Data source for the guard results:** Supabase `ghl_contacts` mirror (project `tednluwflfhxyucgwigh`), queried read-only 2026-06-08. The mirror can lag live GHL by minutes-to-hours — re-run the guard query (below) immediately before flipping any send.

---

## PRECONDITIONS — all three must hold before ANY send is enabled

### (a) Consent gate
**No contact gets a `comms:*-newsletter` tag without explicit consent.** A live `comms:*-newsletter` tag alone is NOT consent — confirm against `newsletter_consent = true` (the mirrored consent field) or a documented opt-in. Spam Act + OCAP both bite here.

### (b) Community-line guard = 0 violations
A contact carrying `lane:community` must NEVER sit in an automated send. **Current mirror reads 23 violations (NOT clear) — see "Guard results" below. These must be cleaned to 0 before switch-on.**

### (c) Tracer-first
For each stream, send to **one** test contact (yourself / a known-safe address) and confirm rendering + unsubscribe link + from-address BEFORE enabling the stream for the list. One record proves the path before the batch.

---

## GUARD RESULTS (embedded — Supabase mirror, 2026-06-08, read-only)

### Step 1 — Community-line guard: `lane:community` AND a `comms:*` tag

**RESULT: 23 violations — NOT clear to proceed.** Each of these would wrongly receive an automated send. Strip the offending `comms:*` tag (or remove `lane:community` if the person is genuinely not community-line — a deliberate re-classification, not a side-effect) before any switch-on.

| # | Name | Email | Offending comms tag(s) |
|---|------|-------|------------------------|
| 1 | alice benchoam | gm@bawinanga.org.au | comms:goods-newsletter, comms:act-newsletter |
| 2 | amy lee | alee@infoxchange.org | comms:goods-newsletter, comms:act-newsletter |
| 3 | benjamin knight | benjamin@act.place | comms:harvest-newsletter *(this is you — exempt / self-test, not a real violation)* |
| 4 | bmdcf applications | applications@brianmdavis.org.au | comms:goods-newsletter, comms:act-newsletter |
| 5 | brandon gien | gien@good-design.org | comms:goods-newsletter, comms:act-newsletter |
| 6 | delaicee power | delaicee.power@julalikari.com.au | comms:goods-newsletter, comms:act-newsletter |
| 7 | erin riddell | erin@reddust.org.au | comms:goods-newsletter, comms:act-newsletter |
| 8 | eula rohan | eula.rohan@aracy.org.au | comms:goods-newsletter, comms:act-newsletter |
| 9 | general — impact frontiers | info@impactfrontiers.org | comms:goods-newsletter, comms:act-newsletter |
| 10 | jimmy frank | jf@wilyajanta.org | comms:goods-newsletter, comms:act-newsletter |
| 11 | keiron lander | keiron.lander@ygcc.com.au | comms:goods-newsletter, comms:act-newsletter |
| 12 | madelyn hay | madelyn.hay@miwatj.com.au | comms:goods-newsletter, comms:newsletter, comms:act-newsletter |
| 13 | matthew carman | mcarman@reddust.org.au | comms:goods-newsletter, comms:act-newsletter |
| 14 | nicholas marchesi | nicholas@act.place | comms:harvest-newsletter, comms:act-newsletter *(this is Nic — exempt / internal, not a real violation)* |
| 15 | noeletta mckenzie | csm@bawinanga.org.au | comms:goods-newsletter, comms:act-newsletter |
| 16 | peter bent | peter.bent@impactfrontiers.org | comms:goods-newsletter, comms:act-newsletter |
| 17 | phillip allan | phillip.allan@bawinanga.org.au | comms:goods-newsletter, comms:act-newsletter |
| 18 | prebhjot kaur | pkaur@paulramsayfoundation.org.au | comms:goods-newsletter, comms:act-newsletter |
| 19 | ren fernando | ren@relove.org.au | comms:goods-newsletter, comms:act-newsletter |
| 20 | rowena cann | rowena.cann@aracy.org.au | comms:goods-newsletter, comms:act-newsletter |
| 21 | shellee strickland | shellee.strickland@murrup.org.au | comms:goods-newsletter, comms:newsletter, comms:act-newsletter |
| 22 | simon robinson | sr@office.org.au | comms:goods-newsletter, comms:act-newsletter |
| 23 | the myer foundation & sidney myer fund | admin@myerfoundation.org.au | comms:goods-newsletter, comms:act-newsletter |

**Triage note:** rows 3 & 14 are Ben & Nic (internal) — exempt. The remaining **21 are real community-line-in-a-funnel violations** that must be resolved before switch-on. Several are organisational role-addresses at First-Nations-led orgs (Bawinanga, Wilya Janta, Julalikari, Murrup, Miwatj, Red Dust, YGCC) — review each: either (i) strip the `comms:*` tag (keep `lane:community`, reach by 1:1), or (ii) if it's a genuine org/admin address that has opted in and is NOT a community-line individual, deliberately remove `lane:community` (re-classify). **Default to protective (i) when unsure.**

> Caveat: the live CONTAINED 9-conflict review found that **Corey Tutt** and **Dr Simon Quilty** currently carry live `comms:*` tags but do NOT yet carry `lane:community` in GHL — so the mirror guard does NOT list them. Once you add `lane:community` to them per the conflict brief, also strip their comms tags in the same edit (don't create new violations). The guard catches `lane:community + comms:*`; it cannot catch "should-be-community-but-isn't-tagged-yet."

### Step 2 — Newsletter enrolment + consent coverage (mirror, 2026-06-08)

| Stream (comms tag) | Total tagged | newsletter_consent = Yes | consent No/blank |
|---|---|---|---|
| `comms:act-newsletter` | 177 | **168** | 9 |
| `comms:goods-newsletter` | 203 | **157** | 46 |
| `comms:harvest-newsletter` | 78 | **64** | 14 |
| `comms:justicehub-newsletter` | 20 | **1** | 19 |
| `comms:newsletter` (legacy, un-streamed) | 31 | 30 | 1 |

Other live drips (not newsletters, listed for completeness): `comms:supporter-drip` (97), `comms:funder-drip` (70), `comms:buyer-drip` (29), `comms:partner-drip` (14).

**Consent-coverage flags before flipping:**
- **JusticeHub newsletter is NOT ready** — only **1 of 20** tagged contacts has consent. Do not switch on; re-collect consent first (or the tag was applied as intent, not opt-in).
- **Goods newsletter** — 46 of 203 lack consent. Resolve (re-opt-in or untag) before send.
- **Act newsletter** — 9 of 177 lack consent. Clean those 9.
- **Harvest newsletter** — 14 of 78 lack consent. Clean those 14.
- Legacy `comms:newsletter` (31) is un-streamed — fold into the correct stream tag or retire; do not send to it directly.

---

## ORDERED SWITCH-ON STEPS (per stream, in the GHL UI)

Do these **one stream at a time**, lowest-risk first. Do not enable a second stream until the first is verified live and quiet.

1. **Re-run the community-line guard live** (query in Appendix). Confirm it reads **0** real violations (Ben & Nic exempt) for the stream you're about to enable. If not 0, stop and clean.
2. **Pull the stream's audience** in GHL as a Smart List: `comms:<stream>` AND `newsletter_consent = Yes` AND NOT `lane:community`. The "NOT `lane:community`" clause is the belt-and-braces guard at send time.
3. **Eyeball the count** against the table above (consent-Yes column). A wildly different number means a tag/consent drift — investigate before sending.
4. **Tracer send** — enable the stream/workflow for ONE test contact only (yourself). Confirm: correct from-address, content renders, unsubscribe link works, contact lands in the right list.
5. **Enable for the Smart List** built in step 2 (consent + not-community filtered).
6. **Watch the first batch** — check bounces, unsubscribes, and any reply-to misroutes before scaling.

**Recommended order:**
1. `comms:act-newsletter` (highest consent coverage, 168/177 — clean the 9 first).
2. `comms:harvest-newsletter` (clean the 14 first).
3. `comms:goods-newsletter` (clean the 46 first — largest gap).
4. `comms:justicehub-newsletter` — **HOLD.** Only 1/20 consented; do not switch on until consent is re-collected.

**Drips** (`supporter-drip`, `funder-drip`, `buyer-drip`, `partner-drip`): apply the same 3 preconditions. Extra care on `partner-drip` — partner addresses skew toward orgs that may include community-line individuals; run the guard against the drip audience specifically before enabling.

---

## OCAP CARRY-OVER FROM THE CONTAINED 9-CONFLICT MERGE

Before/while switching on, the 9 CONTAINED merges (see `thoughts/shared/reviews/contained-adelaide-9-conflicts-2026-06-08.md`) will add `lane:community` to **Corey Tutt, Dr Simon Quilty, Tracey Newman** and keep it on **Kristy Bloomfield, Tara Castle**. Ensure none of these five end up in any stream Smart List — the "NOT `lane:community`" filter in step 2 handles it automatically, which is exactly why that filter is mandatory.

---

## Appendix — guard query (re-run live before each switch-on)

```sql
-- Community-line guard: any contact with lane:community AND a comms:* tag.
-- Expect 0 real rows (Ben/Nic internal are exempt). Run against ghl_contacts mirror.
SELECT full_name, email, ghl_id,
  ARRAY(SELECT t FROM unnest(tags) t WHERE t LIKE 'comms:%') AS comms_tags,
  newsletter_consent
FROM ghl_contacts
WHERE 'lane:community' = ANY(tags)
  AND EXISTS (SELECT 1 FROM unnest(tags) t WHERE t LIKE 'comms:%')
ORDER BY full_name;

-- Per-stream consent coverage
SELECT t AS comms_tag,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE newsletter_consent IS TRUE) AS consent_yes
FROM ghl_contacts, unnest(tags) t
WHERE t LIKE 'comms:%newsletter%'
GROUP BY t ORDER BY total DESC;
```

**Mirror-lag reminder:** the mirror is pull-only from GHL and may trail live state. For the authoritative pre-send check, also spot-verify a sample of the audience live via `contacts_get-contact` in the GHL UI. Treat the mirror as the screening pass, GHL as the source of truth.

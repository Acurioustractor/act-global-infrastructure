# CONTAINED Adelaide — Network Launch Runbook (2026-06-10)

**Goal:** engage the community — booking calendar live, the existing network migrated to canonical, and the first warm-network invite sent.
**Discipline:** every step here is **Tier 3, day-shift, human-in-loop, DRY-RUN FIRST.** Never AFK. We had live-write incidents before; the order and the gates below exist for that reason.
**Brought forward** from the 16 Jun go/no-go at Ben's request (2026-06-09).

---

## THE ONE NUMBER THAT MATTERS

**Tomorrow's send goes to ~97 people, not 260.** Live-verified consent:

| | count | rule |
|---|---|---|
| REAL consent (Yes + Source + Timestamp) | **97** | the ONLY lawfully emailable list |
| PHANTOM (Yes, no source/timestamp) | **106** | bulk-set 2026-01-08, never opted in — **Spam Act 2003 liability, MUST exclude** |
| NONE | 63 | not consented |

**Hardened sendable gate (non-negotiable, legal):**
> Sendable = `comms:justicehub-newsletter` AND `Newsletter Consent = Yes` AND **`Consent Source is not empty`** AND NOT `lane:community`

The `Consent Source is not empty` clause is what keeps the 106 phantom out. Build it into every smart list.

---

## PRE-FLIGHT (do first, ~10 min — all read-only)

1. **No cross-session races:** `git -C ~/Code/act-global-infrastructure log --since="6 hours ago" --all --oneline` — confirm nothing unexpected.
2. **JH production has GHL creds:** confirm `GHL_API_KEY` + `GHL_LOCATION_ID` are set in JusticeHub Vercel (prod). The existing register flow already syncs to GHL, so they should be — verify, don't assume.
3. **Re-run the 3 dry-runs to confirm numbers haven't drifted** (read-only):
   - `node scripts/contained-ghl-ids-probe.mjs` — snapshot current IDs (pipeline/calendar/fields)
   - `node scripts/contained-260-tag-migration.mjs` — expect **269 import / 260 matched / 9 conflicts / 33 place (14 state + 19 org) / 33 community-line**
   - `node scripts/build-contained-consent-worklist-2026-06-09.mjs` — expect **~97 REAL / 106 PHANTOM** (the 3 ERR rows should resolve on re-run)
4. **GO/NO-GO:** if any number is materially off, STOP and reconcile before any write.

---

## PHASE 1 — GHL structure (GHL UI, ~30 min, Ben drives the UI)

No GHL API exists to create pipelines/calendars — these are UI-only.

### 1a. Calendar: "CONTAINED Adelaide Walkthroughs"
- Type: GHL native booking calendar (RC4 — NOT an embedded form)
- Slot length: **30 min**; venue: Tandanya, Adelaide; set availability for the Adelaide dates
- Booking form: capture `newsletter_consent` (with a real opt-in checkbox → sets Consent Source)
- On booking confirmed automation: set `slot_confirmed` (date) + move the contact's opportunity to **Booked**
- OCAP: never auto-drip a `lane:community` booker; no-show re-offers are human follow-up only
- **Grab the public Permalink** → that's `NEXT_PUBLIC_GHL_CONTAINED_CALENDAR_URL`

### 1b. Pipeline: "CONTAINED Adelaide 2026" (participant journey)
11 stages: Captured → Needs enrichment → Warm-review → Personal invite → Booking link sent → **Booked** → Experienced → Activated → Post-week nurture → Future city → Closed. (Full entry rules: config `pipeline`.)

### 1c. Pipeline: "CONTAINED: Partners & Funders" (deal pipeline, RC6)
7 stages: **New** → Qualified → In Conversation → Offer/Proposal → Committed → Delivered/Active → Declined/Lapsed. (config `deal_pipeline`.)

### 1d. Capture IDs
Re-run `node scripts/contained-ghl-ids-probe.mjs` → it now prints the real pipeline/stage/calendar IDs + the env block. Paste the 2 new field IDs (after Phase 2) + pipeline/stage IDs into `config/campaigns/contained-adelaide-2026.json`.

---

## PHASE 2 — Custom fields (~2 min)

```
node scripts/contained-ghl-custom-fields.mjs            # dry-run, review the POST bodies
node scripts/contained-ghl-custom-fields.mjs --apply    # creates cohort + slot_confirmed
```
Paste the printed IDs into config `custom_fields.existing`.

---

## PHASE 3 — Wire JH Vercel env (un-gates booking + opportunities)

Set in JusticeHub Vercel (prod), then redeploy:
```
NEXT_PUBLIC_GHL_CONTAINED_CALENDAR_URL=<calendar permalink from 1a>
GHL_PARTNER_PIPELINE_ID=<"CONTAINED: Partners & Funders" id>
GHL_PARTNER_STAGE_NEW=<its "New" stage id>
GHL_FUNDER_PIPELINE_ID=<same "Partners & Funders" id>   # RC6: both point here
GHL_FUNDER_STAGE_NEW=<its "New" stage id>
```
**Verify live:** open `justicehub.com.au/contained/register` → step 3 now shows "Book your walk-through time"; submit a test host/connect form → confirm a contact + opportunity appears in GHL. (This test write is fine — it's our own.)

---

## PHASE 4 — Tag migration (the 260 → canonical)

1. **Review the worksheet** `thoughts/shared/reviews/2026-06-09_contained-260-tag-migration-worksheet.md` — especially the **19 `place from org` rows** (confirm the org→state inferences) and the 33 community-line rows.
2. Dry-run again to be sure: `node scripts/contained-260-tag-migration.mjs`
3. Apply (tracer-gated, snapshots, rate-limited, skips the 9 conflicts):
   ```
   node scripts/contained-260-tag-migration.mjs --apply --reviewed
   ```
   It migrates ONE tracer contact first, verifies canonical-in / legacy-out, then the rest. Watch the tracer line.
4. **cohort field:** the migration drops `cohort:<x>` tags; set the cohort *field* value separately (the field exists after Phase 2). (Currently 0 contacts carry a `cohort:` tag, so likely nothing to do — confirm in the worksheet.)

> The 9 dupe-email conflicts are owned by `merge-contained-9-conflicts.mjs` — run/verify that merge BEFORE or alongside, per its own tracer.

---

## PHASE 5 — Suppression guard FIRST, then consent (safety before any send)

1. **Build the suppression-guard workflow** (GHL UI) BEFORE any send: triggers DND / Email Unsubscribed / `consent_status=No consent` / `lane:community` / `comms:do-not-bulk` → strip from all `comms:*`, stop workflows.
2. **Phantom-consent containment:** the 106 phantom must NOT receive bulk mail. Either (a) the hardened gate below excludes them (Consent Source empty), and/or (b) strip `comms:*` from phantom contacts proactively. Do NOT bulk-email them.

---

## PHASE 6 — Adelaide invite segment (smart list)

Build the smart list with the **hardened gate**:
> `comms:justicehub-newsletter` AND `Newsletter Consent = Yes` AND `Consent Source is not empty` AND NOT `lane:community` AND `source:event:contained` AND `place:sa`

- The `place:sa` clause scopes to Adelaide locals (the ~14 state + any SA org-enriched). For a **wider warm-network invite**, drop `place:sa` (still gated to real consent) → the broader ~97-real-consent list. Decide reach with Ben.
- Confirm the count BEFORE sending. If it looks wrong, STOP.

---

## PHASE 7 — The first invite (the actual send)

- **Recipients:** the Phase 6 segment (real-consent only).
- **Content:** the draft below — review, finalize the booking link, send via a GHL email campaign to the smart list.
- **This is the live send.** Send a test to yourself first. Confirm the booking link works. Then send.

---

## GO/NO-GO GATES (stop if any fails)
- Pre-flight numbers drifted → stop, reconcile.
- Migration tracer verify fails → aborts itself; investigate.
- Segment count looks wrong (e.g. > ~97, or includes phantom) → stop; the gate is broken.
- Calendar link not live on the register page → fix env/redeploy before inviting anyone to book.

---

## Order summary
Pre-flight → **1** structure (UI) → **2** fields → **3** env wiring → verify booking live → **4** migration (dry→apply) → **5** suppression guard + phantom containment → **6** segment (hardened gate) → **7** send (test then real).

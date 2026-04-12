---
title: Empathy Ledger v2 — alignment status (international tour)
purpose: Snapshot of what was committed to the EL v2 codebase from the act-global-infrastructure side, what the EL v2 dev server now renders, and what's next to do directly inside the EL v2 repo
created: 2026-04-09 (afternoon)
target_repo: /Users/benknight/Code/empathy-ledger-v2
target_file: src/lib/world-tour/locations.ts
---

# Empathy Ledger v2 — alignment status

> *What was committed to the EL v2 codebase as part of the international tour planning, what the dev server now renders, and what's next when you switch over to working from inside the EL v2 repo directly.*

## What changed in `/Users/benknight/Code/empathy-ledger-v2/src/lib/world-tour/locations.ts`

| Change | Type | Notes |
|---|---|---|
| **Lesotho added** as a new `TourStop` (id `12`, slug `lesotho`, chapter `06A`) | INSERT | Dates locked: 20-25 June 2026. Inserted in the array between Botswana and Kenya so navigation order is geographic. Coordinates: lat -29.6100, lng 28.2336. |
| **Tanzania added** as a new `TourStop` (id `13`, slug `tanzania`, chapter `06B`) | INSERT | Dates: 26 June - 2 July 2026. Coordinates: lat -3.3869, lng 36.6830 (Arusha). |
| **Kenya dates** updated from "Mid-June 2026" to "3 - 7 July 2026" | UPDATE | |
| **Uganda dates** updated from "Late June 2026" to "8 - 14 July 2026" | UPDATE | |
| **Sweden dates** updated to "15 - 16 July 2026 (transit hub)" + new description noting the compression and the deferred fuller Sweden visit | UPDATE | |
| **Netherlands dates** updated to "16 - 22 July 2026 (locked — first Travel Diary cohort visit)" + new long-form description naming Ludmila + Veerle + the cohort moment | UPDATE | |
| **Spain dates** updated to "23 July - 6 August 2026 (Diagrama Murcia + Spain expansion)" + new long-form description naming Jesús Teruel + the seven Spain expansion candidates | UPDATE | |
| **YOPE International** added as the top anchor partner under existing `netherlands` location content | INSERT (partner) | `id: 'p-nl-yope'`, contactName "Ludmila Andrade (Coordinator) + Veerle". The first confirmed Travel Diary inbound/outbound partner. |
| **Lesotho location content** added with Raphael Rowe Foundation (anchor), ConX (partner), and the placeholder Lesotho prison/restorative-practice site (network) | INSERT | Georgia Falzon at georgia@conx.org.au is the contactName on both the Raphael Rowe Foundation and ConX entries. |
| **Tanzania location content** added with The School of St Jude (anchor), Naramatisho Women's Centre (partner), and JCF cross-chapter network (network) | INSERT | All three are JCF beneficiary partnerships. |
| **Spain location content** populated (was empty) with Fundación Diagrama HQ (anchor — Jesús Teruel as contactName), a TBC second Diagrama regional centre, the bertsolari oral poets, and Fundación Tomillo | INSERT | The Spain expansion candidate list lives here as four PartnerOrganization entries pending confirmation during the Stop 7a conversation. |

## TypeScript validation

```bash
cd /Users/benknight/Code/empathy-ledger-v2
npx tsc --noEmit src/lib/world-tour/locations.ts
# (no errors — empty output)
```

The file compiles cleanly. The EL v2 dev server (port 3030 via PM2 per the EL v2 CLAUDE.md) will pick up the changes on next reload.

## What I deliberately did NOT do

Per the EL v2 CLAUDE.md "never fabricate" rule:

- **No `StorytellerData` entries created** for Georgia Falzon, Ludmila Andrade, Veerle, Jesús Teruel, or Carmen. They are real people but I do not have verified records from the EL v2 Supabase to populate full bio / avatar / cultural_background fields. They appear as `contactName` strings on the partner organisations only.
- **No stories, reflections, or gallery images invented** for Lesotho, Tanzania, or YOPE. All those arrays are empty until real material exists.
- **No fabricated quotes or testimonials** in any descriptions.
- **No avatar URLs invented** — every storyteller field that requires media is `null` until a real upload exists.

## What this enables in the EL v2 frontend

Once the EL v2 dev server reloads, these things become possible:

1. **The world tour map page** can plot Lesotho and Tanzania alongside the existing stops. Both have real lat/lng.
2. **The world tour stop pages** for `lesotho`, `tanzania`, and the updated `netherlands`/`spain` will render their new partner organisations.
3. **The date calendar** (if one exists or gets built) can parse the locked date strings — Lesotho 20 June, YOPE 16 July, Spain Diagrama 23 July — and produce a real itinerary view.
4. **The admin world-tour outreach page** at `src/app/admin/world-tour/outreach/page.tsx` should show the new partner organisations as outreach targets.
5. **The contacts directory** (whatever form it takes in the EL v2 UI) will surface Georgia Falzon, Ludmila Andrade, Veerle, and Jesús Teruel as named contacts on the partner records.

## What's next inside the EL v2 codebase (not yet done)

These are the things that should happen directly inside the EL v2 repository, not from the act-global-infrastructure side:

### 1. Link the contacts to the EL v2 `storytellers` table

The user said *"there is also a supabase database with all these people in it we can link to."* I cannot verify what exists in the EL v2 Supabase from the act-global-infrastructure side because the MCP is bound to the shared instance, not `yvnuayzslukamizrlhwb`. From inside the EL v2 codebase you should:

```sql
SELECT id, display_name, location FROM storytellers
WHERE display_name ILIKE '%Falzon%'
   OR display_name ILIKE '%Andrade%'
   OR display_name ILIKE '%Veerle%'
   OR display_name ILIKE '%Teruel%'
   OR display_name ILIKE '%Carmen%'
   OR display_name ILIKE '%Pamudu%'
   OR display_name ILIKE '%Shyaka%'
   OR display_name ILIKE '%Sawhney%'
   OR display_name ILIKE '%Birungi%'
   OR display_name ILIKE '%Paffenholz%'
   OR display_name ILIKE '%Eijk%'
LIMIT 50
```

For any matches that come back, **upgrade the partner organisation entries** to also include a `storyteller_id` foreign key (the schema may need an addition for this — check `database/types/`).

For matches that DO NOT come back, **add them to the `storytellers` table first** with proper consent metadata before they can appear as named storytellers anywhere in the UI.

### 2. Add the `storyteller_id` foreign key to PartnerOrganization (schema change)

Currently `PartnerOrganization` has `contactName: string | null` but no link to a real storyteller. The clean architecture would be:

```ts
export interface PartnerOrganization {
  id: string
  name: string
  description: string
  website: string | null
  contactName: string | null      // legacy / display only
  contactEmail: string | null
  contactStorytellerId: string | null  // NEW — foreign key to storytellers.id
  focus: string[]
  tier: 'anchor' | 'partner' | 'network'
}
```

This is a small schema change and a small data backfill.

### 3. Build the date calendar view if it doesn't already exist

The locations.ts now has real date strings for the entire international tour window (20 June – 6 August 2026). A calendar view that parses these strings and produces a 7-week itinerary timeline would be the highest-leverage new UI page from this update.

### 4. Build the contact directory page if it doesn't already exist

The named contacts across all the international tour stops are now in the partner org entries. A flat contacts directory keyed by stop, with email addresses where they exist, becomes possible from this data alone.

### 5. Wire the consent form translation pipeline

For the international tour to actually capture stories on the ground, the EL v2 consent form needs to work in:

- **Sesotho** (Lesotho)
- **Swahili** (Kenya, Tanzania, Uganda)
- **Dutch** (Netherlands)
- **Spanish** (Spain)
- **Optional: Arabic** (if Lesotho includes refugee-context sites)

This is a 2-3 week translation pipeline build, separate from the locations.ts work.

## File map across both repos

| File | Repo | Status |
|---|---|---|
| `src/lib/world-tour/locations.ts` | empathy-ledger-v2 | ✅ updated 2026-04-09 |
| `wiki/library/locations/international-tour-2026.md` | act-global-infrastructure | ✅ canonical schedule (the source of truth for the tour planning) |
| `wiki/library/locations/yope-amsterdam-july-2026.md` | act-global-infrastructure | ✅ YOPE-specific planning page |
| `wiki/library/locations/australian-tour-2026.md` | act-global-infrastructure | ✅ pre-international leg |
| `wiki/library/studio/empathy-ledger-thematics-principles.md` | act-global-infrastructure | ✅ studio principles for capture-to-EL pipeline |
| `wiki/library/studio/el-v2-alignment-status.md` | act-global-infrastructure | ✅ this file |
| `wiki/decisions/2026-04-09-lesotho-data-needs.md` | act-global-infrastructure | ✅ Gap 1 RESOLVED with Georgia Falzon |
| `wiki/decisions/2026-04-09-empathy-ledger-tour-questions.md` | act-global-infrastructure | ✅ All 5 decisions resolved |
| EL v2 `storytellers` table linkage | empathy-ledger-v2 (Supabase) | ⏳ TBD — query first, then add foreign keys |
| EL v2 calendar view | empathy-ledger-v2 (UI) | ⏳ TBD — data is now ready |
| EL v2 contacts directory | empathy-ledger-v2 (UI) | ⏳ TBD — data is now ready |
| EL v2 consent form translation pipeline | empathy-ledger-v2 (i18n) | ⏳ TBD — 2-3 week build |

## TL;DR

The international tour data is now in the EL v2 codebase as a structured TypeScript record. The dev server picks it up automatically. From here, the next moves are inside the EL v2 repo: link the named contacts to real storyteller records in the EL v2 Supabase (don't fabricate), add a foreign key to PartnerOrganization, and build the calendar + contacts directory UI views that the data is now ready to feed.

The EL v2 dev session can begin from this status doc. Open the file in EL v2 (`src/lib/world-tour/locations.ts`) and you'll see exactly what was added.

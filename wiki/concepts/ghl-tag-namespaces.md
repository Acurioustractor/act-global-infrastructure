# GHL tag namespaces — the canonical registry

> One GHL tenant, many writers: the Harvest build, the energy-orbit/Field work, the
> Empathy Ledger sync, seat scripts, webhooks. This page is the single vocabulary so
> sessions in different repos stop evolving dialects. Edit HERE first (this repo is the
> brain — distribute via `scripts/sync-act-context.mjs`); repo-local tag maps
> (e.g. The Harvest Website `docs/strategy/harvest-ghl-tag-and-automation-map.md`)
> implement it, never fork it.
>
> Created 2026-06-05, from the cross-session alignment of the Harvest
> community-platform decision (`community-platform-decision-2026-06-05.md`, Harvest repo)
> with The Field (`the-field.md`, `energy-orbit.md`).

## The namespaces

| Namespace | Values (examples) | Meaning | Who writes it |
|---|---|---|---|
| `tier:` | `curious` `connected` `member` `active` `steward` | The belonging rung. **Hand-moved only — never by automation.** | Humans in the UI; approved seat scripts on explicit instruction |
| `circle:` | `gsd-alliance` | Hand-curated inner circle (The Field). | Ben, by hand (or gated tracer scripts) |
| `lane:` | `community` | Constellation marker — community individual (storyteller / elder / Traditional Owner). | Gated scripts (community-line sweep); never removed by automation |
| `role:` | `funder` `partner` `storyteller` `elder` `buyer` `supplier` `researcher` `media` `advisory` `council` `health-service` `corporate` `gov` `supporter` | What they are in the world. | Sync scripts + humans |
| `comms:` | `harvest-newsletter` `act-newsletter` `justicehub` `goods` `buyer` `funder-drip` `partner-drip` | What they consented to receive. The ONLY namespace email audiences key on. | Signup paths (consent stamped in code), humans |
| `project:` | `act-hv` … | Project affiliation. | Sync scripts |
| `interest:` | `membership` … | Expressed interest (website forms/footer). | Website → GHL upsert |
| `source:` / `place:` | `empathy-ledger` / `palm-island` | Provenance and place. | Sync scripts |
| `pod:` | *(planned — Harvest WhatsApp crews)* | Crew membership, the belonging surface. | Humans / crew formalisation, per the simple-system build plan |
| `attended:` | *(planned — Humanitix webhook, e.g. `attended:workday-2026-07`)* | Headcount. **Never a rung.** | Humanitix → GHL webhook only |

Flat legacy tags (`harvest-member`, `harvest-newsletter`) are dead — stripped 2026-06;
any smart list still keyed on them matches zero contacts.

## The hard rules

1. **`tier:` moves by hand.** No workflow, webhook, or script promotes or demotes a rung.
   Automation may only say "we got it" and "don't forget" (Harvest email operating system).
2. **The community line.** `lane:community` individuals are never energy-scored, laddered,
   or enrolled in drips (`comms:*-drip`). They are measured by what ACT owes back
   (the owes-ledger), and never web-profiled (OCAP). Orgs and funder staff are NOT
   community individuals — the over-flagging trap is documented in `energy-orbit.md`.
3. **Attendance ≠ rung.** `attended:` tags are headcount and a *contact signal* — they
   should feed The Field's `contact_warmth` / `last_contact` (in-person presence is the
   strongest signal we have, and today the Field only sees Beeper + Gmail). They never
   trigger a tier change.
4. **Tier is priority, contact is truth.** Downstream scoring keeps the split: `warmth`
   (ranking, includes tier) vs `contact_warmth` (real two-way signal only). "Warm enough
   to ask" is always judged on contact (`build-project-needs-match.mjs` → scope board /
   morning read).

## Plumbing invariants (the bits sessions forget)

- **Mirror lag.** The GHL→Supabase mirror lags live tag writes. After ANY bulk tag
  change, re-run the GHL sync **before** regenerating Field surfaces
  (`build-unified-orbit.mjs` and everything downstream), or worklists show stale tiers.
- **The reconciler filter.** `scripts/build-unified-orbit.mjs` keeps only
  `tier:|circle:|role:|comms:|project:|lane:` in `rel_tags`. **When `pod:` or `attended:`
  land, extend this filter** or the orbit worklist silently drops them.
- **Comms affinity lives on `ghl_contacts`,** not the orbit worklist — need-matching
  reads it from the mirror.
- **Verify deletes by direct GET, not search** — the GHL search index lags after writes.

## Spec — attendance as contact signal (designed 2026-06-05, blocked on the Humanitix webhook)

The Field's `contact_warmth` today = Beeper + Gmail two-way. The garden crew shows up in
person and never emails — so the cooling queue cries wolf about people Ben saw on Saturday.
When the Harvest session wires Humanitix → GHL, this closes:

1. **Harvest side delivers:** Humanitix attendee webhook → GHL contact upsert adds
   `attended:<event-slug>` where the slug embeds the date — e.g. `attended:workday-2026-07-12`.
   One tag per event attended. No other writes (no tier, no comms).
2. **Field side consumes** (`build-unified-orbit.mjs`):
   - add `attended:` (and `pod:`) to the rel_tags filter;
   - parse dates out of `attended:` slugs → `last_contact = max(last_contact, latest event date)`;
   - contact warmth: **+10 per attendance in the last 6 months, capped at +30** — in-person
     presence outranks an email thread, but a regular can't swamp the scale. Supporter lane
     only — community individuals may carry `attended:` tags, but the community line means
     they are never warmth-scored regardless.
3. **Never a rung.** No tier move, no workflow enrolment from attendance — headcount feeds
   the human's read, nothing else.

## Pointers

- The Field canon: `wiki/concepts/the-field.md` · `wiki/concepts/energy-orbit.md`
- Harvest implementation: The Harvest Website repo — `harvest-ghl-tag-and-automation-map.md`,
  `simple-system-build-plan-2026-06-05.md`, `community-platform-decision-2026-06-05.md`
- Ecosystem value exchange (community give/get): `wiki/concepts/ecosystem-value-exchange.md`

# ACT GHL CRM — Operating Model

> The one model for how ACT organises its single GoHighLevel account ("A Curious Tractor", location `agzsSZWgovjwgpcoASWG`). Companion to [`ghl-crm-taxonomy.md`](./ghl-crm-taxonomy.md) (the tag vocabulary) and [`ghl-audience-comms-automation.md`](./ghl-audience-comms-automation.md) (the 5-layer comms model). This doc covers the **object layer** — what goes where.
>
> Decided 2026-06-09 (Ben + CRM-advisor review). Supersedes the implicit "everything is a Contact with tags" model.

## The principle: six tools, each one job

GHL gives six structural tools. Overloading tags (making them do the job of objects or relationships) is the root cause of the dedup + mis-tagging mess we cleaned up. Use each for what it's uniquely good at:

| Tool | Use ONLY for | ACT example |
|---|---|---|
| **Contacts** | individual humans | a person |
| **Companies** (API: `/businesses/`) | organisations | funders, partners, the Goods supply-chain orgs |
| **Opportunities** | an *ask/deal in flight* (a pipeline instance) | a grant application, a Goods order, a CONTAINED booking, a residency |
| **Associations** | the *relationship* between the above | "person works at org", "opp is with funder" |
| **Tags** | *state + segmentation only* | `project:` `role:` `comms:` `tier:` `place:` `source:` `lane:community` |
| **Custom Views** (max 5) | a per-operator *lens* on the record | Justice · Goods · Funders · Community-line |

**Smart Lists** = saved tag/field queries = campaign audiences. **Custom Objects** = a recurring entity that is none of the above — *be conservative*; only create one when an entity needs its own GHL-native lifecycle (candidates like Tour Stops / Goods Beds already live in their own DBs, so mirroring them into GHL just buys a sync burden — don't).

## The hard rules

1. **Organisations are Companies, never Contacts.** A person at an org is a Contact *associated* to that Company. (Importing orgs as Contacts is what created the no-email-can't-dedupe twins + the nonsensical `lane:community`-on-a-land-council.)
2. **Tags carry state, not identity or deal-stage.** "Which org" → a Company association. "Which stage" → the Opportunity stage. "In this campaign" → an Opportunity and/or a Smart List, not a tag-as-the-only-record.
3. **`lane:community` is an individual OCAP concept** — it belongs on a Contact (a community/storyteller/lived-experience *person*), never on a Company.
4. **Every sendable Smart List carries the two gates by construction:** `newsletter_consent = Yes` **AND** `NOT lane:community`. No exceptions.
5. **One pipeline per *journey*, not per project.** Distinguish projects with the `project:` tag so money rolls up per project. Audit/merge same-journey pipelines.

## Smart-list template (reusable per project)
- **`{project} · Sendable`** = `project:X` + consent + NOT `lane:community` (+ a relevance filter where consent-scope matters, e.g. `interest:justice-reform` for a CONTAINED send)
- **`{project} · Relationship-led`** = `project:X` + warm/hot/personal stage — **no automation**
- **`{project} · Community-line`** = `project:X` + `lane:community` — **never a send**

## Custom Views (≤5)
Default · **Justice** (role · interest:justice-reform · campaign-stage · CONTAINED tags · consent) · **Goods** (role buyer/supplier/recipient · Company · asset tags · consent) · **Funders** (Company · grant pipeline · ask amount · owner) · **Community-line** (role:storyteller · place:community · consent provenance · *no comms fields*).

## Worked example — the orgs→Companies migration (2026-06-09)
A CivicGraph/Goods import had created ~41 NT Aboriginal community-controlled organisations as **Contacts** (companyName, no/synthetic email, `role:community-controlled`). This was the structural error behind the dedup twins and the `lane:community` over-application. Fix:
- 38 Companies imported (`thoughts/shared/reviews/2026-06-09_orgs-to-companies-import.csv`).
- 5 people associated to their org-Company (`scripts/associate-orgs-people-2026-06-09.mjs`).
- 34 org-as-contact records retired (`scripts/retire-org-contacts-2026-06-09.mjs`, backup `…_retired-org-contacts-backup.json`).
- Map + runbook: `thoughts/shared/reviews/2026-06-09_orgs-to-companies-association-map.md`.

## Dedup prevention (the standing guard)
- GHL **Settings → Business Profile → Contact Duplication Preferences → "Allow Duplicate Contact" = OFF**, match Email→Phone. (Confirmed on.) Covers anything with an email/phone.
- **No-email org rows can't be deduped on email/phone** — they must be Companies (rule 1) or carry a deterministic key. The one-shot blind-create Goods seeds were archived so they can't re-spawn org twins.
- GHL has **no public contact-merge API** (`/contacts/merge` 404s/403s) — dedupe by *prevention* (the setting + Companies), not by cleanup.

## API notes
- Companies live at `/businesses/` (NOT `/companies/`, which 404s). Read works via the PIT; the codebase client (`scripts/lib/ghl-api-service.mjs`) has Contacts/Opps/Tags only — Companies are read/scripted ad-hoc.
- Contact→Company link = `updateContact(id, { businessId })`.
- Tag writes use the codebase client, not the MCP (MCP add/remove-tags is broken). See memory `ghl-api-write-traps`.

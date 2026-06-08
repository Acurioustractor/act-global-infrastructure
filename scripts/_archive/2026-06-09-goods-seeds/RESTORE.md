# Archived: one-shot Goods GHL seed scripts (2026-06-09)

## Why archived
These six scripts were **one-shot seeds** that ran once (mostly 2026-05-27) to populate the GHL CRM with Goods supply-chain orgs/contacts. They **blind-create contacts** (`createContact` without an email lookup), and several create org records by `companyName` with **no email** — which GHL's email/phone dedup can't catch, so **re-running them spawns duplicate org records**. That was a root cause of the dedup mess cleaned up on 2026-06-08/09 (see `wiki/concepts/ghl-crm-operating-model.md` + memory `lane-community-overapplication`).

Per the doc-lifecycle rule (shipped scaffolding → archive), they're moved here so they can't be accidentally re-run. The orgs they created now live correctly as **Companies** (`/businesses/`), not Contacts.

## Files
- `enrich-goods-foundation-contacts-2026-05-27.mjs`
- `push-goods-anchors-to-demand-register-2026-05-27.mjs`
- `seed-goods-alive-beds-prospects-2026-05-27.mjs`
- `seed-goods-foundation-pipeline-2026-05-27.mjs`
- `seed-goods-buyers-2026-05-27.mjs`
- `seed-goods-supporter-journey.mjs`

## NOT archived (deliberately)
`scripts/push-prospects-to-ghl.mjs` — a recent (2026-06-07) active "discovery → GHL pipelines" rail, kept live. It also blind-creates; **harden it to `upsertContact` (lookup-by-email first)** before relying on it for repeat runs.

## To restore
`git mv scripts/_archive/2026-06-09-goods-seeds/<file> scripts/<file>`. Before re-running ANY of them, switch `createContact` → `upsertContact` and give no-email org rows a deterministic key (or, better, create them as Companies, not Contacts).

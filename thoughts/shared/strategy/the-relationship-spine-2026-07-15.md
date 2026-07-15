# The relationship spine

*Written 2026-07-15, sweep #2, companion to `the-everyday-engine-2026-07-15.md`. That doc set the rule: the orbit pays, the constellation is paid. This one maps the plumbing that carries it: every surface from GoHighLevel to Notion to Supabase to CivicGraph, their live state as of today, and the daily way to track relationships. 8 research passes including live read-only probes of Supabase and the Field data files, plus an architect pass. Sources in the provenance sidecar.*

---

## The headline: the doors are open, the diary stopped

The intake layer is alive. The intelligence and tending layers all halted between 7 and 29 June. Verified live today:

| Layer | State | Evidence |
|---|---|---|
| Website form intake (5 sites, one GHL account) | ALIVE | ghl_contacts 4,908 rows, updated 2026-07-14; newsletter_subscriptions trickling (max 2026-07-09) |
| GHL mirror in Supabase | ALIVE | ghl_contacts + ghl_opportunities both touched 2026-07-14 |
| Comms spine (communications_history, 29,124 rows) | HALTED 2026-06-29 | max created_at 2026-06-29, the day of the security incident. relationship_health same. Dead credential suspected (inferred, not confirmed) |
| The Field (morning read, tending, capture) | DORMANT since 16 Jun | `field-surfaces` cron defined in ecosystem.config.cjs but absent from `pm2 ls`; every surface last built 16 Jun 11:01 |
| Field capture ledger | EMPTY | field-captures.jsonl is 0 bytes. Nothing from the trip is recorded |
| Ben's relationship reads | Last 7 Jun | field-decisions.jsonl |
| Person pages (844) | STALE since 6-7 Jun | no rebuild cron exists; sampled frontmatter all `updated: 2026-06-06` |
| Owes ledger (constellation CSV) | STALE since 7 Jun | no cron, and grep confirms it is NOT wired into the morning read |
| Freshness canary | LYING | field-freshness.json says `stale_days: 0` but was written 15 Jun. The smoke alarm's battery died |
| Notion relationship mirrors | 9 databases STALE 44-70 days | Opportunities, Stakeholders, Entity Hub, Grant Pipeline among them |
| Newsletter | 1 draft, status reviewed, sent_at NULL | newsletter_drafts, created 23 May. Still zero sends ever |

The one-line diagnosis: capture what happens on this trip by hand (bridge below), and turn four switches back on when you land.

---

## 1. The map: one relationship, five stations

The rule for the whole stack: **one owner per station. Everything else is a mirror.**

### Station 1: discover
**Owner: CivicGraph** (the grantscope repo). gs_entities 597K, funder discernment (halo-wash 2,078 entities, community-backers 9,167 ABN-matched, 13 drift flags), board interlocks (39,757 connected people in a materialized view with no surface yet). Gmail/Beeper surface uncaptured people as intelligence, not intake.
**Rule:** discovery never auto-creates a GHL contact. Promotion is Ben's verb.
**State:** alive but landlocked. The discernment CSVs land in thoughts/shared and dead-end there.

### Station 2: capture
**Owner: GHL for the orbit** (`agzsSZWgovjwgpcoASWG`, all 5 site codebases write into it, consent stamped in code). **Empathy Ledger v2 for the constellation** (storytellers never pushed to GHL since PR #116).
**Rule:** orgs are Companies, never Contacts. `comms:*` derived only. Quarantine, never delete.
**State:** working for web forms. **No owner exists for in-person moments**: events (Humanitix webhook specced, unbuilt), voice notes, phone calls, paper. These are exactly the moments this trip is made of.

### Station 3: enrich and verify
**Contested ownership, and all three part-owners are down:** CivicGraph soil (orbit-soil.csv), the comms spine (halted 29 Jun), qwen person pages (stale 6 Jun).
**Rule:** `lane:community` is never web-profiled or enriched on any code path. Enrichment writes to files and Supabase; GHL only via gated appliers. Names verify against Ben's read, never against a web search (the four-wrong-Sam-Davieses lesson).

### Station 4: tend
**Owner: the Field ledgers.** field-decisions.jsonl is the only source of rings; the machine never assigns one. Ring tags reach GHL only through the gated applier.
**Rule:** orbit is cadenced by ring (7/14/90/180 days). The constellation is tended by hand against the owes ledger, never dripped, never scored.
**State:** dormant. This is the station the trip is currently falling through.

### Station 5: exchange
**Owner: GHL pipelines for stage, Xero for money truth.** Notion mirrors both for reading.
**Rule:** GHL says who and where; Xero says how much; the constellation's exchange is honoured_pct on the owes ledger, never a pipeline.
**State:** GHL live but noisy (next section). Notion read layer stale enough to silently lie.

---

## 2. GHL: the target state is already decided

The 2026-07-12 ADR (`wiki/decisions/2026-07-12-ghl-target-architecture.md`, decisions D1-D3 locked) is the vision for this surface, and the sweep confirms it:

- **Today:** 3,267 contacts, 66% untagged, 60% without email (mostly Gmail-discovery imports of transactional senders). 13 pipelines, 543 opportunities, ~90% permanently open. Canonical tags describe about a third of the account.
- **D1 quarantine:** ~1,900-2,100 noise contacts get `status:quarantine`, excluded from every list and count, reversible. The real account is ~1,100 people.
- **D2 pipelines 13 to 4:** Grants, Goods, Harvest, CONTAINED. Standing rule: a pipeline must move at least one opportunity to a terminal stage each month or it becomes a tag.
- **D3 per-project intake** plus a weekly gapcheck for unrouted contacts.
- Sweep tooling already exists: `ghl-quarantine-sweep.mjs` (dry-run/tracer/apply), `ghl-taxonomy-migrate.mjs`, `ghl-smartlist-live-gapcheck.mjs`.

Consent posture: every sendable list requires `newsletter_consent=Yes AND NOT lane:community` by construction. The R8 finding (79 bare goods-newsletter tags with no consent provenance) blocks bulk sends until remediated.

---

## 3. CivicGraph: the next vision, and the alignment

Two visions live in the repo. They do not actually fight:

- **OPERATING_PLAN.md (Apr):** philanthropy intelligence and engagement. Modules 1-3 built; module 4 (org-to-foundation fit) and module 5 (engagement strategy) are the named NEXT, with ACT as the operating example. "Who should we engage, for which project, and how should we frame the work."
- **buyer-wedge (Jun, marked ACTIVE):** the commercial product. Free supplier registry, paid evidence and tender tools for government buyers. Explicitly not a grants portal for everyone.

Reconciliation (inferred, consistent with both docs and the code layout): **the engagement layer ships as ACT-internal Field plumbing under `/org/[slug]`; the buyer wedge is the product for outsiders.** One codebase, two audiences, no tension.

The alignment with the relationship stack does not need new pipes. The edges already exist:

- `person_identity_map.ghl_contact_id` links a CivicGraph person to a GHL contact. This is the key. Build on it.
- `build-orbit-soil.mjs` already joins the orbit worklist to boards, entities, and interlocks and writes soil back to the ACT repo. **Cron it alongside field-surfaces** so every person page and morning read carries fresh institutional ground.
- `backfill-ghl-civicgraph-links.mjs` keeps a CivicGraph profile URL on the GHL contact: the human jump-link.
- Funder-discernment flags (halo-wash, community-backers, drift) should land as **advisory columns on the orbit worklist and person pages**. Never as GHL tags, never as scores. The Field reads them; the machine never acts on them.
- OP11 "The Connectors" (39,757 board-interlocked people, no surface yet) becomes a warm-path column in orbit soil: who already sits one boardroom away from a funder we are discerning.

**What must never flow:** anything `lane:community`. No CivicGraph enrichment, profiling, or discernment scoring of community individuals. Empathy Ledger data never enters CivicGraph. The constellation is not soil.

---

## 4. The daily way to track it

### The bridge, usable from the phone today

The full protocol needs wiring (below). Until then, one habit that works right now: **after each yarn, send the Telegram bot one message (voice or text) starting with "field:"** with who, where, what they gave, what you offered, what ACT now owes, next date. The bot's save_writing_draft tool lands it in the repo via GitHub; the next desk session processes the batch into field-captures, person pages, and verified GHL contacts. Ugly, durable, thirty seconds. The trip stops leaking today.

(Verify-names still applies: spellings from the road are drafts until confirmed with the person.)

### The target protocol, once the wiring moves land

- **Morning, 5 minutes, phone.** Telegram pushes the morning read: 7 actions or fewer, orbit cooling and latent, plus an owes block from the constellation ledger (consent-required conversations, unhonoured transcripts). Pick up to 3. Orbit items you reach out; constellation items you honour, never chase.
- **During the day, 0 minutes.** Forms, syncs, and the spine run themselves.
- **After each interaction, 30-60 seconds, phone.** One-line capture to the bot. Orbit: add a ring/energy read if the signal changed (full circle read waits for the laptop). Constellation: log the owe made, and if content was shared, a verbal-consent decision stub.
- **Weekly, Monday, 15 minutes.** The gapcheck report (unrouted contacts), the dupe/quarantine sweep, the owes honoured_pct scan, and the pipeline pass: each of the 4 pipelines moves at least one opportunity to terminal or gets demoted to a tag.

The grammar that keeps the two lanes honest: **orbit = cadence, constellation = debts.** The morning read shows both, but they are never the same list.

---

## 5. Wiring moves, ranked

Builds and repairs, not habits. Effort S/M/L. The first two are repairs of things that silently died; without them the daily protocol reads a stale world.

1. **Re-register `field-surfaces` in PM2 and fix the canary (S).** `pm2 start ecosystem.config.cjs --only field-surfaces && pm2 save`. Check why it dropped before re-registering (pm2 dump/logs). Fix the canary so it banners its own age, not just the spine's. This revives the entire tend station. *PM2 change: needs Ben's go.*
2. **Restore the comms spine (M).** communications_history ingestion halted 2026-06-29, almost certainly a credential casualty of the incident remediation. Rotate the credential, confirm ingest resumes, and relationship_health comes back with it. Day-shift work, ties into the standing security remediation.
3. **Telegram capture tool + morning-read push (M).** The bot currently has read-only relationship tools and no capture. Add a capture tool (writes field-captures.jsonl semantics) and a morning push. This is what makes the whole protocol phone-first; the "field:" draft bridge retires when it lands.
4. **Cron the constellation build and wire owes into the morning read (S).** `build-contributor-constellation.mjs` has no cron and its CSV is not an input to `build-field-surfaces.mjs`. Two small changes and "what we owe whom" is finally a daily surface, including the 127 consent-required transcripts currently invisible.
5. **Humanitix to GHL `attended:` webhook (M).** The only intake channel where literally nothing lands. Headcount and warmth signal, never a ladder rung.

Second tier, when those five are done: person-pages rebuild on a night-shift cron (currently manual-only, 5.5 weeks stale); revive or consciously retire the 9 stale Notion relationship mirrors (a mirror that silently lies is worse than no mirror); execute the GHL D1-D3 ADR with the already-built sweep scripts; cron `build-orbit-soil.mjs` for the CivicGraph edge.

---

## 6. The full surface inventory

| Surface | Holds | Role | Freshness (2026-07-15) |
|---|---|---|---|
| GHL (`agzsSZWgovjwgpcoASWG`) | 3,267 contacts, 543 opps, 13 pipelines (target 4), tags, consent fields | System of record: orbit capture + stage | Live; noisy pending D1-D3 |
| Supabase ghl_contacts / ghl_opportunities | Mirror of GHL, 4,908 / 1,093 rows | Mirror | Live (2026-07-14) |
| Supabase communications_history | 29,124 emails/messages, spine for warmth + person pages | Mirror/intelligence | HALTED 2026-06-29 |
| Supabase relationship_health | 1,650 derived health rows | Intelligence | HALTED 2026-06-29 |
| The Field ledgers (field-decisions/captures.jsonl) | Ben's ring reads and live captures, in git | System of record: tending | Decisions 7 Jun; captures empty |
| Field surfaces (morning read, scope board, orbit viz via /field) | Daily 7 actions, cooling, owed, asks | Broadcast | Dormant since 16 Jun (cron gone) |
| Person pages (844 in thoughts/shared/people) | Layered dossiers: Ben's read, CivicGraph soil, web, spine history, qwen synthesis | Intelligence | Stale 6-7 Jun, no cron |
| Owes ledger (el-contributor-constellation.csv) | Per-storyteller CARE-owes: given vs honoured, consent queue | Intelligence (constellation) | Stale 7 Jun, not in morning read |
| Empathy Ledger v2 (yvnuayzslukamizrlhwb) | Storytellers, transcripts, 5-type revocable consent, audit trail | System of record: constellation | Live |
| CivicGraph / grantscope (same shared DB) | 597K entities, funder discernment, board interlocks, person_identity_map | Intelligence: discovery | Live; outputs landlocked as CSVs |
| Notion (Opportunities, Tranches, Stakeholders, Entity Hub, hubs) | Read layer over GHL + Xero + strategy pages | Mirror/broadcast | 9 relationship DBs stale 44-70d |
| Website forms (5 codebases) | First-touch capture with code-stamped consent | Intake | Live |
| Beeper | Message metadata (never content) for warmth recency | Intelligence | Pull dead with the Field cron |
| Gmail spine (4 mailboxes) | Two-way correspondents into orbit worklist | Intelligence | Ingest halted with spine |
| Telegram bot | Read-only contact lookup, save_writing_draft to repo | Intelligence (no capture tool yet) | Live |
| Xero | Money truth for every exchange | System of record: dollars | Live |

---

## 7. What this sweep could not verify

- Why `field-surfaces` dropped out of PM2 (reload that omitted it vs deliberate pause). Check before re-registering.
- The comms-spine halt cause: the 2026-06-29 date matches the security incident secret rotation, but the dead credential is inferred, not confirmed.
- Whether field-captures.jsonl was never used or truncated on 7 Jun (field-capture.mjs rewrites the ledger on --process; git history not checked).
- Notion: whether the 17 archived money pages and 9 stale DBs are cron-down, token-broken, or deliberately retired. The audit itself deferred checks pending a working Notion token.
- EL v2 tenant-isolation fix progress since the 2026-05-27 audit, and current PR states across the form repos.
- person_identity_map.ghl_contact_id link freshness (not queried).
- Whether OPERATING_PLAN is formally superseded by buyer-wedge; the reconciliation offered is inferred from doc and code structure.

*Provenance: `the-relationship-spine-2026-07-15.provenance.md`. Workflow run wf_771fd23e-5c2, 9 agents, live probes read-only.*

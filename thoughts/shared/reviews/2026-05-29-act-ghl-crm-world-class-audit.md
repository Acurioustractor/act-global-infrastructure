# ACT GHL & CRM — World-Class Audit & Roadmap

> Read-only multi-agent audit, 2026-05-29. Sources and verified-vs-inferred status in the `.provenance.md` sidecar. Live GHL + Supabase + Notion + codebase, surveyed by 9 agents.

## 1. Executive summary

ACT's CRM is built like a world-class system and run like a side project. The schema, the audience taxonomy, the cultural and consent fields, the three-pipeline Goods architecture, and the one-job-per-surface operating model are all genuinely well-designed. Almost none of it is populated, scheduled, or converting. 85% of sampled contacts have zero custom fields. Consent is 0% filled on the most consent-serious organisation in the sector. Social went dark with 0 posts in the last 7 days. The newest real conversation is roughly 3 months stale. Zero opportunities have ever reached a "Converted" stage in any forward pipeline. This is a build-versus-operate gap, not a design gap.

**Maturity on the 5-stage curve: REACTIVE (stage 2 of 5), trending toward ORGANIZED on documentation alone.**

- The *documented operating model* is proactive-to-world-class (stage 4). It is the strongest asset ACT has here.
- The *operated reality* is reactive (stage 2): email is 80% inbound, the funnel is not worked, segments drift because the engine that computes them runs by hand, and the headline pipeline value is fiction.
- The two are far apart. ACT has written the manual for a system it is not yet running.

**The 3 biggest unlocks (in order):**

1. **Turn on the conveyor belt that already exists.** The audience-segmentation engine (`assign-audience-segments.mjs`) computes the actual newsletter and send lists, is idempotent and namespace-scoped, and is on no cron at all. Scheduling one existing script is the highest leverage-per-effort move in the audit. Every nurture journey depends on fresh segments.

2. **Make the money number honest, then work the top opps.** Opportunity `monetary_value` sums to a fictional **A$297,554,932**, of which the auto-ingested WATCH grant-radar alone is **A$237.8M**. Strip radar from pipeline and the headline drops to a defensible ~A$60M. Then assign owners and close dates to the ~A$5.8M of real near-term ask (the A$1.7M WHSAC buyer deal plus A$4.08M in "Ask made" Supporter Journey opps) and run them weekly. Cadence, not structure, is the conversion lever.

3. **Fix consent and reconnect the storytellers.** `consent_status` and `ai_processing_consent` are populated on 0/500 sampled contacts, while an inbound webhook auto-writes `newsletter_consent=true` on any `goods`-tagged contact. For Empathy Ledger's consent-first brand this is the finding most likely to cause real harm. In parallel, only 34 of ~311 Empathy Ledger storytellers exist as reachable GHL contacts; the audience most central to ACT's mission is ~89% off the grid.

---

## 2. Maturity scorecard

Ratings 1 (ad-hoc) to 5 (world-class).

| Surface | Rating | One-line finding |
|---|---|---|
| Contacts | 2 | 1,091 contacts but ~13% are test/system junk and `allowDuplicateContact=true` is letting real-person triplicates form (3x tracey newman, jenny rosen with identical emails). |
| Tags | 2 | Tags carry all the segmentation load yet sprawl badly: 174 distinct tags, 41% used exactly once, the same concept spelled 3-4 ways across 6 naming conventions. |
| Custom Fields | 1 | Schema is excellent, the tank is dry: 426/500 contacts have zero custom fields and ABN/consent/indigenous_status/engagement_score are all 0% filled. |
| Pipelines | 3 | Architecture is genuinely good (three Goods pipelines, staged probabilities) but 0 opps have ever reached "Converted" and 92% of buyer value rests on one unqualified deal. |
| Conversations | 2 | The email-to-CRM pipe works and captures real funder threads, but the newest real message is 2026-03-07 and the surface is 80% inbound. |
| Social | 1 | 7 accounts across 6 platforms fully wired, then idle: 0 posts in 7 days, 0 scheduled, 36% historical failure rate, 7-day reach 34. |
| Calendar | 1 | 0 events booked in the queried 6-month window. The booking surface is unused. |
| Integrations / Automation | 3 | Strong single API client with footguns codified, good dry-run discipline, but the send-list engine is on no cron and two live cron writers have no safety gate. |
| Data Model | 4 | Referential integrity is excellent (0 orphans across every CRM linkage) and sync is fresh, but `monetary_value` sums to nine-figure fiction and audience is free-text tags only. |
| Documented Operating Model | 5 | Crisp single-job-per-surface model, machine-readable audience config, named non-negotiables, honest self-flagging of its own gaps. The standout. |

**Weighted read:** documentation is the ceiling, execution is the floor. The gap between the 5 (documented model) and the 1s (custom fields, social, calendar) is the whole story.

---

## 3. What's working (keep doing)

These are real strengths. Do not break them while fixing the rest.

- **Referential integrity is clean.** 0 orphans in `contact_project_links` (487/487 resolve to both `canonical_entities` and `ghl_contacts`), 0 orphan opportunity-to-contact links (561/561), all 27 opportunity-to-Xero-invoice links resolve, all 1,584 contact `canonical_entity_id` values resolve. The dual-key gap flagged in prior sessions is closed: `contact_project_links` now carries both `entity_id` and `ghl_contact_id` at 100% fill.
- **The custom-field schema is built for the ACT model.** ABN labelled as the org join key, Goods asset rollups marked "do not edit", `supabase_user_id` and CivicGraph Profile as cross-system keys, and consent fields aligned to Empathy Ledger's ethos. First-Nations fields are first-class: `indigenous_status`, `cultural_protocols`, `mukurtu_node_community`. The design is right even though the fields are empty.
- **Cultural protocol is enforced in code, in two layers.** `BLOCKED_FIELDS_TO_GHL` strips 10 OCAP/elder fields both on the inbound webhook and in the batch sync, so sacred-knowledge data structurally cannot leave Supabase. The storyteller GHL push is deliberately disabled in PM2 with the Supabase-only link kept on.
- **The Goods three-pipeline design is a genuine asset.** Supporter Journey for funders, Buyer Pipeline for procurement, Demand Register for raw demand signals, with staged probabilities and a dollar-quantified ~A$9M NT demand TAM most orgs would envy.
- **Dry-run discipline is mostly right.** Most mutation scripts require explicit `--apply`; `pushback-ghl-project-tags` writes a manifest before any write to enable exact `--revert`; the Xero-GHL reconciler is propose-only (writes `agent_proposals`, never mutates GHL directly) which is the pattern that caught the A$84,700 phantom-invoice drift.
- **The API client codifies hard-won traps.** POST not GET on `/contacts/search`, `/locations/{id}/customFields` not `/custom-fields`, dual `startAfter`+`startAfterId` pagination. New code reuses this instead of rediscovering the footguns.
- **The documented operating model is the best thing here.** It states what each surface is NOT, defines four audiences with cadence/shape/privacy/consent gating in both prose and machine-readable config, and honestly flags its own gaps inline rather than overstating completeness.

---

## 4. Cross-cutting problems

Five problems show up on more than one surface. These are the structural ones.

### Tag sprawl and naming chaos (measured)

174 distinct tags in the 500-contact sample, **41% used exactly once**, **48% used twice or fewer**, across 6+ competing naming conventions. The same concept is spelled three or four ways:
- Project: `act-gd` (295) vs `project:act-gd` (176) vs `goods` (114).
- Funder: `audience-funder` (37) vs `goods-funder` (27) vs `funder` (4).
- Newsletter: `newsletter` (62) vs `goods-newsletter` (50) vs `harvest-newsletter` (61).
- Storyteller in the DB: `storyteller` (287) vs `Storyteller` (87) vs `audience-storyteller` (34) are three encodings of one segment.

You cannot reliably address a segment that is spelled three ways. Tags carry the entire segmentation load (there is no `audience_segment` column), which makes the sprawl load-bearing rather than cosmetic.

### Field fill-rate (measured)

426/500 sampled contacts (85%) have zero custom fields. The strategic fields are at 0% in the sample: ABN, `consent_status`, `ai_processing_consent`, `indigenous_status`, Partnership Type, `storyteller_status`, `engagement_score`, Relationship Score. Highest-filled field is `Goods·LinkedIn Tags` at 13%. The DB view is the same shape: only 422 of 2,389 contacts (17.7%) carry a canonical audience tag, and 1,258 (52.7%) carry no tags at all. Personalization, warmth-scoring, and relationship-depth segmentation have no fuel.

### Source-of-truth tension: GHL vs Supabase (measured + inferred)

The documented contract says GHL is canonical for contacts/opportunities/pipelines and Supabase mirrors them, while `project_code`, `audience-*` tags, and OCAP fields live Supabase-only. In practice `ghl_contacts.tags` has at least four writers with no documented precedence: the bidirectional contact sync, the inbound webhook upsert, the audience tagger, and `goods-auto-tagger`. That is the likely cause of the tag-overwrite issues noted in prior sessions. The taxonomy itself disagrees across surfaces: `audience-brand` shows 0 applications in the GHL sample but 114 brand members in the DB via a different encoding. *Inferred:* the multiple-writer pattern is the mechanism behind the drift; this is reasoned from the code paths described, not directly traced in a live run.

### Automation gaps (measured)

- **The send-list engine is on no cron.** `assign-audience-segments.mjs` is absent from `ecosystem.config.cjs`, `dev`, and `package.json`. The one piece that computes who actually gets each send is the one piece not automated.
- **Two cron writers have no safety gate.** `goods-auto-tagger` runs daily 9am with `--days 7` (no `--dry-run`, so live `addTagToContact`), and `grant-seed-weekly` runs Mondays with `--count 5` (no dry-run, so live `createOpportunity`). A data glitch propagates straight into the CRM with no human gate.
- **gmail-auto intake is broken.** 514 `gmail_auto` contacts are stuck `sync_status='pending'` and the `gmail_sync` job failed **3,811 of 3,821** records on its latest run. New email relationships are not becoming addressable contacts.
- **Recurring intake is encoded as dated one-off seeders** (`seed-goods-*-2026-05-27`) that never graduated to cron, so Goods pipeline intake only updates when someone re-runs a seeder by hand.

### Consent integrity (measured)

`consent_status` and `ai_processing_consent` populated on **0/500** sampled contacts; DND on **0/500**. The one consent value that exists, `newsletter_consent`, is auto-written `true` by the inbound webhook on any contact tagged `goods` (ghl-handler.ts lines 206-218). So the brand cadence documented as gating on `newsletter_consent=true` is fed by an automated trigger, not a human opt-in. Compounding this, all three webhook endpoints fail open (missing secret env = unauthenticated processing, console.warn only) and the command-center endpoint uses plain-string equality rather than HMAC. A spoofed payload could write consent. For a consent-first ecosystem this is the single highest-risk finding.

---

## 5. The Audience-Connection engine

### Target state

A living connection machine where segments refresh themselves nightly, consent is a human-set field enforced on every send, all four audiences (funder, partner, storyteller, brand) have working drafters, the publishing heartbeat never stops, and the people most central to ACT's mission (Empathy Ledger storytellers) are on the grid. Tags are a controlled vocabulary validated at the sync layer, not a sprawl that has to be re-cleaned every month.

### Concrete moves

1. **Schedule the segmentation engine.** Add `assign-audience-segments.mjs` to `ecosystem.config.cjs` daily with `--apply`, after `ghl-sync` (e.g. `0 7 * * *`). It is already idempotent and namespace-scoped. Near-zero risk, fixes the stale-send-list root cause immediately. *This is the highest leverage-per-effort move in the whole audit.*

2. **Make consent real and kill the auto-enroll.** Wire Empathy Ledger and website form consent into `consent_status` + `ai_processing_consent` on every contact; gate all outbound on explicit "Full consent." Remove the webhook auto-write of `newsletter_consent=true` on `goods`-tagged contacts. Consent comes from a human, not an inbound trigger.

3. **Reconnect the 277 storytellers.** Run `sync-storytellers-to-ghl.mjs` as a deliberate, OCAP-checked step to lift storyteller reach from 34 toward ~311. Script exists; the work is doing it consent-correctly, not the mechanics.

4. **Restart the publishing heartbeat and fix the 36% failure.** Triage the 18 failed posts (likely one platform re-auth or media-format issue), re-publish salvageable ones, load a 4-week scheduled buffer so "posts next period = 0" cannot recur, and turn on Bluesky and YouTube (both connected, zero posts ever). Add a failed-post alert into the existing Telegram/Notion brain pattern.

5. **Normalize the tag taxonomy and enforce it at the sync layer.** Collapse the triplets (`storyteller`/`Storyteller`/`audience-storyteller`; `act-gd`/`project:act-gd`/`goods`; the three newsletter tags) to one canonical each. Then have every `sync-*-to-ghl` script validate tags against an allowlist before writing, and a weekly job flag any tag used twice or fewer. Kills the 41%-singleton sprawl at the source.

6. **Promote `audience_segment` to a constrained DB column.** A first-class enum (`funder/partner/storyteller/brand/buyer/community`) on `ghl_contacts` with a CHECK constraint, populated by deterministic mapping from canonical tags. Segment fill-rate becomes a tracked metric. `audience-brand` either gets real members or is formally retired.

7. **Backfill the strategic custom fields, starting with ABN.** Backfill ABN from Supabase org records (0% filled today, and it is the documented org join key), then Partnership Type, `storyteller_status`, `indigenous_status`, `engagement_score`. Declare Supabase canonical for org/identity/consent and push to GHL on a schedule. Set per-field fill-rate SLAs so the 85%-empty problem is monitored, not rediscovered.

8. **Build the partner, brand, and storyteller drafters and the unified content calendar.** The funder per-recipient drafter (`draft-funder-newsletter.mjs`, Snow Foundation MVP) proves the pattern. Clone it for partner first (largest live audience at 271), then brand (public archive at act.place/newsletters/, consent-gated) and storyteller (event-triggered own-story-back, OCAP two-tier). Build one Notion content-calendar view across newsletters and social by audience and week so the "loose" social layer inherits the same segmentation as email.

---

## 6. The Money-Flow engine

### The pipelines, mapped (figures as reported in the surveys; GHL counts and DB counts differ where noted)

| Pipeline | Project | Stated value | Real forward value | State |
|---|---|---|---|---|
| Goods Demand Register | Goods on Country | ~A$9.4M (GHL) / A$16.4M (DB, 158 opps) | ~A$9.0M unworked | 82/105 stuck in "Signal", **0 Converted** |
| Goods Buyer Pipeline | Goods on Country | A$1.85M (GHL) / A$2.6M, 11 won (DB) | A$1.7M = one deal | WHSAC alone = 92%, still stage-2 |
| Goods Supporter Journey | Goods on Country | A$5.18M (36 opps) | A$4.08M in "Ask made" (5 opps) | 20/36 at A$0, single 2026-05 batch, no progression |
| A Curious Tractor (legacy) | ACT-wide | A$939,555 won (14 opps) / A$1.1M, 17 won (DB) | A$0 open | Historical ledger, disconnected from live |
| Grants / GrantScope | All | >A$200M "identified" (435 opps) | ~A$0 worked | ~0 advanced past stage-0; a research dump |
| Harvest Inbox / Universal Inquiry | Harvest | A$0 | A$0 | Member comments and test leads misfiled as opps |

Cash itself: `payments_list-transactions` returns **0** in GHL. No money flows through the CRM; it lives in Xero. Only **27 of 619** opportunities (4.4%) link to a Xero invoice and only **75 of 2,389** contacts (3.1%) carry a `xero_contact_id`. The contact-to-revenue trace is essentially manual.

### Target state

A small, honest, worked funnel. Radar lives in GrantScope, not in the opportunity object. Every open opp over A$50k has an owner, a value, and a close date. The three Goods pipelines flow into each other (a matched Signal spawns a Buyer opp; a committed funder funds a specific line). "Won" reconciles against Xero on a schedule. A weekly review off the existing Telegram finance-brain drives the top opps. Grant revenue, historically ACT's largest pile, is a managed dozen deadline-driven applications, not a A$200M noise dump.

### Concrete moves, mapped to projects

1. **Run the top-15 open opps weekly (cadence).** Assign an owner to every open opp over A$50k: the A$1.7M WHSAC (Groote) buyer deal, the 5 "Ask made" Supporter Journey opps (A$4.08M), and Demand Register A$500k+ signals. Set a next-action date on each, drive a 30-minute weekly review from the Telegram finance-brain. Most are `assignedTo: null` today. *Effort: low. Est: A$1-2M of the ~A$5.8M near-term ask this FY.*

2. **Separate grant-radar from pipeline and stand up a small worked grants funnel.** Move WATCH/Grants out of `ghl_opportunities` into `grant_opportunities`/GrantScope. Promote only grants with an active application into stages 1+, gated by GrantScope's existing fit-score. Removes ~A$237.8M of phantom value instantly; re-lights ACT's largest historical revenue line. *Effort: medium. Est: A$200k-500k/yr in newly-won grants.*

3. **Fix the dollar values and add close dates.** Set `monetaryValue` on the ~70 zero/blank real-ask opps (start with the 12 "Identified" Supporter Journey and the 6 zero-value Buyer opps including NPY Women's Council and Miwatj). Populate a close/expected-close custom date on every open opp. Without this, weighted forecasting and aging are impossible and Move 1 has no numbers to work. *Effort: low. Unlocks accurate read on ~A$5.8M.*

4. **Reconcile GHL "won" against Xero on a schedule.** Extend the existing propose-only reconciler to flag "won-but-unpaid" and "paid-but-no-opp", and auto-match won opps and funder contacts to Xero invoices on email+name to lift the 4.4%/3.1% link rates. Stops "won" from being a forecasting lie and protects the A$939k won figure. *Effort: medium.*

5. **De-risk WHSAC concentration.** Qualify and stage-advance the A$1.7M Groote deal (owner + close date now), and in parallel set real values on the 6 zero-value Buyer opps so the buyer funnel is not 92% one deal. Pull qualified Demand Register signals into the Buyer Pipeline to thicken it. *Effort: low. Insures A$1.7M, adds A$200k-500k backup.*

6. **Build the conversion contract between the three Goods pipelines.** Make a matched Demand Register "Signal" auto-create a linked Buyer opp, and a Supporter Journey "Committed" funder fund a specific Buyer/Demand line. Instrument time-in-stage: the Signal→Buyer-Matched hop is ~22% (23/105) and Buyer-Matched→Converted is **0**. That second hop is the precise leak. *Effort: medium. Est: A$300k-1M/yr.*

7. **One canonical funder view.** Use the contact as the spine so "total committed from Centrecorp" is one number, not 5 scattered records (Randle Walker/Centrecorp appears as 4 legacy won deals plus an open Centrebuild buyer opp). Surfaces the unused Renewing/Lapsed stewardship stages. *Effort: medium.*

*All dollar estimates above are inferred projections, not measured pipeline. The only measured money figures are the reported pipeline sums and the A$939,555 legacy won ledger, itself unverified against Xero receipts.*

---

## 7. Prioritized roadmap

Quick wins first. Effort: low / med / high. Most "Now" items are existing scripts that need scheduling or a flag, not new build.

### Now (under 1 week)

| What | Why | Surface / owner | Effort | Expected impact |
|---|---|---|---|---|
| Schedule `assign-audience-segments.mjs` daily `--apply` after ghl-sync | Send-list engine is on no cron; segments drift silently | Scripts / Ben | Low | Every nurture journey runs on fresh segments; highest leverage-per-effort |
| Triage 18 failed posts, load 4-week scheduled buffer, enable Bluesky+YouTube | 0 posts in 7 days, 0 scheduled, 36% failure rate | Social / Ben | Low | Surface stops going dark; recovers ~36% of created content |
| Run `sync-storytellers-to-ghl.mjs` (OCAP-checked) | Only 34 of ~311 storytellers reachable | Scripts + EL / Ben | Low | Re-grids the mission-central audience |
| Set `monetaryValue` on ~70 zero/blank real-ask opps + close dates | Forecasting impossible while values are A$0 and 0 close dates exist | Pipelines / Ben | Low | Unlocks accurate read on ~A$5.8M near-term ask |
| Assign owner + next-action to every open opp over A$50k; weekly review | A$1.7M WHSAC + A$4.08M "Ask made" are unowned | Pipelines / Ben | Low | A$1-2M of near-term ask in play this FY |
| Exclude WATCH/Grants from every monetary roll-up; relabel "grant radar" | Headline value is fictional A$297.5M | Data model / Ben | Low | Headline drops to defensible ~A$60M |
| Quarantine ~13% test/system contacts under a `system` tag; set `allowDuplicateContact=false` | ~65/500 junk + duplicate-tolerant config | Contacts / Ben | Low | Protects deliverability before cadence ramps |

### Next (1-4 weeks)

| What | Why | Surface / owner | Effort | Expected impact |
|---|---|---|---|---|
| Wire consent capture into `consent_status`+`ai_processing_consent`; gate sends; remove webhook auto-enroll | 0% consent fill on a consent-first brand; consent set by trigger not human | Integrations + EL / Ben | Med | Removes the highest reputational/compliance risk |
| HMAC-verify command-center webhook + fail-closed on all 3 endpoints | Fails open today; could spoof a consent write | Integrations / Ben | Med | Closes the spoof path behind consent |
| Normalize tag taxonomy; enforce allowlist at sync layer + weekly singleton flag | 174 tags, 41% used once, concept spelled 3 ways | Tags + Scripts / Ben | Med | Makes segments reliable enough to automate against |
| Promote `audience_segment` to constrained enum column | Audience is free-text tags only; encodings disagree across surfaces | Data model / Ben | Med | Segment fill-rate becomes a tracked metric |
| Backfill ABN from Supabase org records, then Partnership Type / storyteller_status / engagement_score | 85% of fields empty; no personalization fuel | Data model + Scripts / Ben | Med | Enables warmth-scoring and personalization |
| Gate `goods-auto-tagger` + `grant-seed-weekly` behind a daily cap or manifest | Two live cron writers with no safety gate | Scripts / Ben | Low | A data glitch can no longer mass-write to the CRM |
| Diagnose gmail_sync 3,811/3,821 failure; clear 514 pending contacts | New email relationships never become contacts | Scripts / Ben | Med | Re-opens the intake end of the funnel |
| Reconcile GHL "won" vs Xero on a schedule (extend existing reconciler) | "Won" is unverified against cash; 4.4% invoice link | Integrations + Xero / Ben | Med | Funder-to-dollar trace becomes automatic |

### Later (1-3 months)

| What | Why | Surface / owner | Effort | Expected impact |
|---|---|---|---|---|
| Build partner, brand, storyteller drafters | 3 of 4 audience drafters don't exist | Scripts / Ben | Med | Four-audience nurture goes from funder-only to complete |
| Build unified content calendar (newsletters + social by audience by week) | Social is "loose", no segmentation behind it | Notion + Social / Ben | Med | Closes the largest model-vs-execution coherence gap |
| Build the conversion contract between the 3 Goods pipelines | Three parallel lists, 0 converted end-to-end | Pipelines + Scripts / Ben | Med | A$300k-1M/yr by closing the Signal→Buyer→Converted leak |
| Stand up CONTAINED (JusticeHub) engagement pipeline | Documented P0 campaign runs on tags + a daily email queue, no funnel | Pipelines / Ben | Med | Turns 5-a-day outbound into a measurable funnel |
| One canonical funder view de-duplicated across pipelines | Centrecorp appears 5+ times; no per-funder total | Data model / Ben | Med | Surfaces renewal/stewardship revenue |
| Build Harvest recurring-gathering + member-nurture track | First-time attendees have no path to repeat/membership | Pipelines / Ben | Med | Converts events into ongoing relationships |
| Recurring nightly dedup + junk-quarantine job | Config allows dupes by design, so dedup must be active | Scripts / Ben | Med | Keeps the base clean as volume grows |

---

## 8. Anti-patterns to stop immediately

1. **Stop letting an inbound webhook set consent.** `newsletter_consent=true` auto-written on any `goods`-tagged contact is the opposite of consent-first. Consent must be a human opt-in.
2. **Stop summing `monetary_value` for any headline.** It reports A$297.5M of which A$237.8M is grant-radar listings ingested at face value. Every dashboard that sums it is publishing a nine-figure lie.
3. **Stop treating the Grants pipeline as a funnel.** 435 opps frozen in stage-0 is a GrantScope discovery dump. It belongs in `grant_opportunities`, not `ghl_opportunities`.
4. **Stop minting tag variants.** Every new colon-namespaced or hyphen-prefixed variant of an existing concept makes the next segment query less reliable. One canonical tag per concept, validated at the sync layer.
5. **Stop running live cron writers with no dry-run gate.** `goods-auto-tagger` and `grant-seed-weekly` write to the CRM daily/weekly with no human gate and no manifest.
6. **Stop modeling tasks as opportunities.** Harvest Inbox member comments (10) and Universal Inquiry test leads inflate opp counts and break reporting. They are notes/tasks, not deals.
7. **Stop leaving the segmentation engine unscheduled.** Running the send-list computation by hand guarantees stale sends.
8. **Stop letting webhooks fail open.** Missing secret env should reject the request, not process it with a console.warn.

---

## 9. World-class target-state vision (12 months)

In 12 months, ACT runs the system it has already documented.

**One source of truth, enforced in code.** Supabase is canonical for org/identity/consent/project/OCAP fields and pushes them to GHL on a schedule using ABN, `supabase_user_id`, and CivicGraph Profile as join keys. GHL is canonical for contacts/opportunities/pipelines. A small typed module declares which fields are GHL-owned versus Supabase-owned, and the sync, tagger, and webhook all import it, so a Supabase-owned field can never be accidentally overwritten by an inbound event. The four-writer race on `ghl_contacts.tags` is gone.

**Consent is provable on every send.** `consent_status` and `ai_processing_consent` are populated from Empathy Ledger and website capture, set by humans, and every outbound automation gates on explicit consent. The OCAP two-tier gate is enforced by construction on every storyteller path. ACT can prove, for any send, that the recipient consented. For a consent-first ecosystem this is the table-stakes that is currently missing.

**Segments refresh themselves and drive real nurture.** `audience_segment` is a constrained enum column. The segmentation engine runs nightly. All four audiences (funder quarterly, partner monthly, brand fortnightly with a public archive, storyteller event-triggered) have working drafters and a unified content calendar. The publishing heartbeat never goes dark, Bluesky and YouTube are live, and failed posts alert into the Telegram brain. Email is no longer 80% inbound because stage-triggered outbound sequences drive the conversation. The ~311 Empathy Ledger storytellers are on the grid, addressed OCAP-correctly.

**The funnel converts and the money number is honest.** Grant-radar lives in GrantScope; `ghl_opportunities` holds only pursued deals, so `monetary_value` is summable by construction. Every open opp over A$50k has an owner, a value, and a close date. The three Goods pipelines flow into each other, so a matched Demand Register Signal spawns a Buyer opp and a committed funder funds a specific line. WHSAC is qualified and no longer 92% of the buyer forecast. "Won" reconciles against Xero nightly, so the funder-to-dollar trace is automatic. A weekly review off the Telegram finance-brain works the top opps. Grant revenue, ACT's largest historical pile, runs as a managed dozen deadline-driven applications.

**Each project has the right shape.** Goods on Country is the mature exemplar (three flowing pipelines, live-asset impact rollups). JusticeHub/CONTAINED has a real engagement funnel instead of a tag queue. Harvest has a recurring-gathering and member-nurture track built from the Goods template. Empathy Ledger storytellers are reachable and consent-protected. ALMA and Black Cockatoo Valley relationships are captured as canonical entities with clean project attribution. The documented operating model and the operated reality have converged.

The path there is cheap at the start: schedule one script, fix the dollar values, separate radar from pipeline, run the top opps weekly. The build that gives ACT a world-class CRM is mostly turning on the machine that is already built.

*Verification note: every number cited here is taken from the six surface surveys and the two lens analyses. The referential-integrity, fill-rate, tag-count, social, conversation, and pipeline figures are measured (sampled or queried). All dollar conversion estimates in the Money-Flow moves are inferred projections, not measured. The A$939,555 legacy won figure and the GHL "won" statuses are unverified against Xero receipts. GHL-sample counts and Supabase-DB counts differ in several places (noted inline); where they conflict, the DB figure is the more complete population and the 500-contact sample is a ~46% subset of the 1,091 GHL contacts.*

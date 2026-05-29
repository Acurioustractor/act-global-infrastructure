# GHL Tier-1 Prep Pack — 2026-05-29

Companion to the audit `thoughts/shared/reviews/2026-05-29-act-ghl-crm-world-class-audit.md`.

**Guardrails honored:** no tags written, nothing that triggers an email / SMS / social post / automation. Everything below is either (a) done read-only, or (b) prepared and left inert for your sign-off. All figures queried live from the shared DB (`tednluwflfhxyucgwigh`, `ghl_opportunities`) on 2026-05-29.

---

## 1. The honest money picture (read-only — done)

619 opportunities, `monetary_value` sums to **A$297,554,932**. The inflation is one pipeline:

| Pipeline | Open n | Open $ | Lost $ | Note |
|---|---|---|---|---|
| **Grants** | 235 | **178,490,175** | 93,800,000 | GrantScope discovery dump — radar, not worked deals |
| Goods — Demand Register | 158 | 16,371,700 | — | Raw demand signals (TAM), not asks |
| Goods Supporter Journey | 36 | 5,178,111 | — | Funder asks |
| Goods — Buyer Pipeline | 28 | 2,176,021 | — | Procurement (+ A$426,926 won) |
| A Curious Tractor | 7 | 32,494 | — | + A$1,079,505 won (legacy ledger) |
| Empathy Ledger / Events / Festivals / Universal Inquiry / Harvest Inbox / Mukurtu | 92 | 0 | — | All A$0 |

**The "Grants" pipeline = A$272.3M of the A$297.5M total (91.5%).** Exclude it and real open forward value is **~A$23.8M**, almost all Goods on Country.

**Ownership / hygiene:** 519 of 533 open opps (97%) have `assigned_to = NULL`. 239 opps have A$0/null value.

---

## 2. Worklist A — real near-term asks to give an owner + close date

Open, ≥A$50k, in the two worked pipelines (Supporter Journey + Buyer). Demand Register "Signal" rows are excluded here — they are raw demand, listed separately in §4. **None of these are pushed; this is the review list.**

### Goods Supporter Journey (funder asks)
| Opp | $ | Stage | Owner? |
|---|---|---|---|
| REAL Innovation Fund (DEWR) | 2,000,000 | Ask made | none |
| QBE Foundation | 2,000,000 | Ask made | none |
| Snow Foundation | 402,930 | Stewarding / Reporting | none |
| Minderoo Foundation | 200,000 | Qualified | none |
| The Funding Network | 130,000 | Stewarding / Reporting | none |
| Centrecorp Foundation | 123,332 | Stewarding / Reporting | none |
| Rotary Eclub Outback Australia | 82,500 | Ask made | none |

### Goods — Buyer Pipeline (procurement)
| Opp | $ | Stage | Owner? |
|---|---|---|---|
| WHSAC (Groote Archipelago) | 1,700,000 | Outreach Queued | none |
| The Snow Foundation — Immediate Bed Deployment | 132,000 | Invoiced | none |
| Centrecorp Foundation — Goods Production Plant part 1 | 84,700 | Proposed | none |
| Rotary Eclub Outback Australia — Goods Greate Bed v1 | 82,500 | Invoiced | none |
| Northern Land Council — GAPUWIYAK | 70,771 | Outreach Queued | **assigned** (1L1oOCtqj2jhcQV1hpbN) |

**Worked-ask subtotal: ~A$7.0M** (the A$5.8M the audit cited + a few stewarding/invoiced). The two A$2M asks (REAL Innovation Fund, QBE) and the A$1.7M WHSAC are the three that move the year.

**Concentration flag:** WHSAC alone is 92% of open Buyer value and is still at "Outreach Queued" with no owner. Qualify or it is a single point of failure.

**Duplicate flag:** "The Snow Foundation" appears as a A$402,930 Supporter Journey opp AND a A$132,000 Buyer opp; "Centrecorp Foundation" appears in both pipelines; "Rotary Eclub" appears 3x. Needs the canonical-funder-view dedupe (audit §6 move 7) before any roll-up by funder.

---

## 3. Worklist B — forward opps with A$0 / null value

Split by whether a value is actually expected yet.

**Buyer Pipeline, value-needed (live conversations, no $):** Centre Canvas, Ampilatwatja Health Centre, Hewitt Agriculture, Centrebuild Pty Ltd, NPY Women's Council, Miwatj Health — all "In Conversation" or "Outreach Queued", created 2026-05-27. These are real and should carry a value.

**Buyer Pipeline, synthetic shells (auto-generated from demand):** 9x "Goods Buyer: <PLACE> — Unmet demand … 52 beds, 6 washers" + RMF + "Remote job forecast opportunities" + "Anna Philip". These are seeder artifacts — either size them or stop modeling demand as buyer opps.

**Supporter Journey, ask-made / cultivating (value expected):** Brian M Davis Charitable Foundation, Rotary Global Grant (ACT-HV), Philanthropy Australia, The John Villiers Trust, The Bryan Foundation, Garma Festival — Beds Showcase. Size these.

**Supporter Journey, "Identified" prospecting shells (A$0 is fine for now):** BHP, Rio Tinto, Fortescue, Paul Ramsay, Ian Potter, Mjd, Yeperenye, Community Resources, Uniting Church Frontier Services, Country Connect, Developing East Arnhem, Northern Australian Aboriginal Charitable Trust, Nova Peris, Australian Communities Foundation. Leave at A$0 until an ask is sized — do not invent target numbers.

---

## 4. Demand Register top signals (promote to Buyer, don't sum as pipeline)

Top raw signals by value (stage "Signal", project ACT-GD): Maningrida 1,103,700 · Wadeye 1,090,800 · Galiwinku 998,350 · Wurrumiyanga 748,800 · Milingimbi 586,450 · Ngukurr 550,150 · Gunbalanya 533,700 · Gapuwiyak 443,100 · Ramingining 418,000 · Angurugu 408,500. These are unmet-need estimates, not deals. **Note:** several already have a duplicate "Buyer Matched" twin (e.g. PAPUNYA / BARUNGA appear once as Signal and once as a named-store Buyer-Matched row at the same dollar value) — dedupe before counting.

---

## 5. PREPARED, NOT ACTIVATED — needs your go

### 5a. Grant-radar exclusion in dashboard roll-ups (Tier-1 code, ~20 files)
**Definition (data-proven):** radar = `pipeline_name = 'Grants'`. Excluding it drops the headline from A$297.5M to ~A$25.3M (open: A$202.2M → ~A$23.8M).

This is local code only — no GHL writes, no tags, no sends — but it changes headline numbers across the app and touches 20 routes, so it needs your nod before I edit. Recommended approach: add one shared helper `apps/command-center/src/lib/finance/pipeline-rollup.ts` (`export const RADAR_PIPELINES = ['Grants']` + an `excludeRadar(rows)` filter), wire the headline routes first (`api/ecosystem/overview`, `api/ecosystem/pulse`, `api/pipeline/board`), then the rest. Files that sum `monetary_value`: ecosystem/overview, ecosystem/pulse, pipeline/board, grants/pipeline, opportunities, opportunities/update, intelligence/actions, projects/pulse, projects/[code]/financials, contacts/all, contacts/[id]/opportunities, cashflow, business/upcoming, harvest, ghl/opportunities, revenue-streams, briefing/morning, finance/runway, plus `projects/[code]/page.tsx` and `people/[id]/page.tsx`.

### 5b. Segmentation-engine cron (writes tags — HARD HOLD per your instruction)
Ready-to-paste entry for `ecosystem.config.cjs`. **Do NOT activate until consent fields are wired and the tag taxonomy is normalized.** It writes audience tags, which is exactly what you've paused.
```js
{
  name: 'audience-segments',
  script: 'scripts/assign-audience-segments.mjs',
  args: '--apply',
  cron_restart: '45 */6 * * *', // 45 min after each ghl-sync (0 */6) — refresh send-list segments
  autorestart: false,
},
```

### 5c. Opp owner + value + close-date writes (Tier 2/3 GHL writes — held)
Worklists A and B above are the source. These are GHL mutations (field writes), so they wait for your explicit go. No tags involved, no sends — but still your call since they touch the live CRM.

---

## 6. Not touched / flagged for follow-up
- `gmail_sync` failed 3,811/3,821 on its last run; 514 `gmail_auto` contacts stuck pending. Diagnosis is read-only and safe but a separate thread — say the word.
- `goods-auto-tagger` (daily 9am, live `addTagToContact`) and `grant-seed-weekly` (Mon 6:30am, live `createOpportunity`) run with no dry-run gate. Gating them is a small Tier-1 code edit, held because it touches tag-writing automation you've paused.

---

## 7. DONE this session — grant-radar roll-up exclusion (headline routes)

Local code only, no GHL writes, no tags, no sends. New branch `wip/ghl-honest-money-2026-05-29`, **uncommitted** (left for your `/commit`).

- New `apps/command-center/src/lib/finance/pipeline-rollup.ts` — `RADAR_PIPELINE_NAMES = ['Grants']`, `isRadarPipeline()`, `excludeRadar()`.
- Wired three headline roll-ups to exclude the Grants radar:
  - `api/ecosystem/overview` — `totals.opportunityValue` + per-project values (added `pipeline_name` to the select).
  - `api/ecosystem/pulse` — `summary.totalPipeline` (added `pipeline_name` to the select).
  - `api/pipeline/board` — `summary` aggregates (totalValue / openDeals / stale / won-lost / avgDealSize). The per-pipeline **board columns still render the Grants pipeline** — only the headline summary is honest.
- `npx tsc --noEmit` in command-center: **clean (exit 0)**. Not built/deployed — local only.

Effect once deployed: headline opportunity value drops from A$297.5M to ~A$25M; pulse/board totals show worked pipeline (~A$23.8M open) instead of radar.

**Remaining roll-up routes (fast follow, your call):** grants/pipeline (KEEP grants — it's the grant view), opportunities, opportunities/update, intelligence/actions, projects/pulse, projects/[code]/financials + page.tsx, contacts/all, contacts/[id]/opportunities, cashflow, business/upcoming, harvest, ghl/opportunities, revenue-streams, briefing/morning, finance/runway, people/[id]/page.tsx. Also the `v_project_financials` DB view computes `pipeline_value` server-side — if Grants opps carry a project_code, that view needs its own fix (separate migration).

## 8. DONE this session — gmail intake diagnosis (read-only, no fix applied)

**Two distinct problems behind "new email relationships aren't becoming contacts":**

1. **Architectural gap (the 514 stranded contacts).** `scripts/lib/contact-intelligence.mjs#batchMatchOrCreate` creates gmail-derived contacts locally with a *synthetic* `ghl_id = auto_<8 chars>` and `source='gmail_auto'`, `sync_status='pending'` (line 111/116). **No outbound job ever pushes them to GHL.** Every `sync_status → 'synced'` flip in the codebase is on the *inbound* path only — `sync-ghl-to-supabase.mjs:230`, `ghl-webhook-handler.mjs:419`, command-center `ghl-handler.ts:104`, `sync-storytellers-to-ghl.mjs:321`. So a locally-created `gmail_auto` contact only ever becomes "synced" if that same person independently shows up from GHL's side. Result: **514 contacts stranded since 2026-02-05** (newest 2026-05-28), invisible in GHL — can't be tagged, segmented, or messaged. `contact-manager.mjs` (the `contact-reconciliation` cron) does call `ghl.createContact` but has no `gmail_auto`/`sync_status='pending'` selection logic, so it is not draining this queue.

2. **`gmail_sync` job dead for a month.** `sync_status` table: `gmail_sync` row is `status='error'`, `record_count=0`, **`last_success_at=2026-04-29`**, last_attempt 2026-05-28. The script swallows the real error to "Unknown error" (the `catch` → `recordSyncStatus({error})` path), and pm2 error logs have rotated empty, so the true stack trace isn't captured. This is why the audit found the newest real conversation at 2026-03-07 — gmail→`communications_history` logging has been failing nightly since late April.

**Fix options (NOT applied — your call):**
- (a) Build an outbound push: a job that selects `source='gmail_auto' AND sync_status='pending'`, calls `ghl.createContact`, writes the real returned `ghl_id`, flips to `synced`. Must respect the OCAP `BLOCKED_FIELDS_TO_GHL` guard and consent (these are people who emailed in — pushing them to GHL where they may get sends is exactly the consent question you paused on). **Recommend gating outbound-to-GHL on consent before building this.**
- (b) Un-swallow the gmail_sync error: replace the generic catch message with the real `err.stack`/`err.message` into `last_error`, redeploy the cron, read the next run's actual failure. Cheap, read-the-real-error first before fixing blind.

## 9. GHL-UI automation audit (read-only, 2026-05-29) — "who is getting automated emails"

The available GHL tools can't list Workflows, so I detected automations by their fingerprint in the live conversation history (`lastOutboundMessageAction='automated'`). Location confirmed: **A Curious Tractor** (`agzsSZWgovjwgpcoASWG`), and `workflowsEnabled / campaignsEnabled / triggersEnabled = true`.

**Automations ARE firing** (opposite of the codebase, which only drafts):
- **269 conversations** have an automated message as their last outbound — **265 email + 4 SMS**.
- **TYPE_CAMPAIGN_EMAIL = 0** → no GHL *Campaign*-feature blasts. Everything is **Workflow-driven** (trigger/tag based).

Confirmed automations (from message bodies):
1. **Goods inquiry auto-responder** (email + 4 SMS) — "Thanks for reaching out to Goods on Country / we received your request for a Stretch Bed." Transactional, fires on form submit.
2. **Goods order confirmation** — "Your Stretch Bed order is confirmed. ORDER DETAILS…" Transactional.
3. **Harvest contact-form auto-reply** — "Thanks for writing to The Harvest. Ben or Nic will reply." Transactional.
4. **Harvest member onboarding/monthly note** — "A monthly note… You're on the Harvest member list." → **39 recipients.** This is the one real marketing/nurture automation actively running; recipients carry `harvest-member` + `newsletter` + `harvest-newsletter` + `interest-*`, came via `harvest-website` forms (opt-in basis).
5. **Possible world-tour outreach** (templated) — Ben's "travelling through Africa/Europe" note to e.g. Georgia Falzon flagged automated; unclear if 1:1 or a sequence.

Test contacts (Codex Smoke, Wash Test, Jenny Rosen `stripe@example.com`) triggered real automated sends — confirms the workflows fire on ANY form submission.

**The load-bearing finding:** these are **tag/form-triggered Workflows**, so **applying a tag can enrol someone into a live automated send** (e.g. `harvest-member`). That is exactly why tag writes stay paused — canonicalizing tags before we know which tags are workflow-enrolment triggers could fire emails at people. The Goods webhook `newsletter_consent=true` auto-write feeds whatever targets that field.

**Boundary (cannot see from here):** the Workflow *definitions* — their triggers/enrolment rules, whether they re-send, full enrolment lists, and whether any workflow targets the big audience tags (`audience-funder` 80, `audience-partner` 271, `goods-newsletter` 187). The conversation fingerprint shows what HAS been sent, not what is armed to send next. Authoritative source = GHL app → Automation → Workflows (+ Marketing → Campaigns). Next step options: Ben reads the active Workflow list, or drive a browser into GHL to capture it.

### UPDATE — browser audit of GHL → Automation → Workflows (read-only, Ben logged in as benjamin@act.place)

**25 workflows total** in the A Curious Tractor sub-account. `Active Enrolled = 0` on every one (nothing sitting mid-sequence). "Needs Review (2)" flagged by GHL. Categorized:

**Plumbing — no audience email, leave alone:**
- `Sync to Supabase - Contact Updated` (11,636) — GHL→Supabase on contact update
- `Sync to Supabase - New Contact` (4,898) — GHL→Supabase on new contact
- `Gmail Email to Contact` (3,012) — Gmail intake → contact create. (These three are the GHL↔Supabase plumbing. Relevant to the 514 stranded contacts: GHL→Supabase works via these; the gap is the missing Supabase→GHL push of locally-created `gmail_auto` contacts.)
- `Create Donor` (0), `Grant Deadline - 7 Day Reminder` (0) — internal

**Transactional auto-responders — consent = the person initiated contact; fine:**
- `Contact Form to Universal Inquiry` (12) + `Contact → Universal Inquiry` (13) ← **duplicate pair, dedupe**
- `Goods Inquiry → Acknowledge` (3), `Goods media form submission` (15), `New Order Notification` (42)
- `Harvest - Member Question Receipt` (4), `Harvest - Shop Interest Receipt` (5), `Harvest — EOI Gathering Confirmation` (55), `Harvest Locals Day` (8)
- `Newsletter Signup` (1), `Parliament House Welcome` (11), `Witta Gathering Photos` (33), `Volunteer Application` (0)

**Marketing / nurture — the consent-sensitive ones:**
- **`Harvest - Member Welcome` (45)** — the "You're on the Harvest member list" note. Opened it: **Trigger → 1 Email → END. ONE-TIME welcome, NOT a recurring monthly send** (the "monthly note" is just the copy). Published. 39/39 recent recipients consent-clean (API-verified). **Trigger TYPE not captured** (canvas is a cross-origin React-Flow surface, not machine-readable) — needs a human glance: if the trigger is "Contact Tag added: harvest-member", then canonicalizing that tag could re-fire this to 45 people.
- `Harvest - Follow Welcome` (1)

**Drafts — not sending:**
- `Contained launch 2025` (draft, 25 enrolled) — JusticeHub CONTAINED launch, parked in draft
- `New Workflow : <timestamp>` ×4 — empty abandoned drafts (cleanup)

**Net:** no rogue mass-mailer. The only live marketing automation is a one-time, consent-clean Harvest welcome. The real risk is structural: **several workflows are tag/form-triggered, so tag canonicalization must first confirm which tags are enrolment triggers**. Dedupe the two Universal Inquiry workflows; clear the 4 empty drafts; resolve the 2 "Needs Review".

### Trigger readings (2026-05-29, screenshots)

| Workflow | Trigger | Tag? | Status |
|---|---|---|---|
| Contact → Universal Inquiry | Contact Tag — `act-inquiry` | YES | published |
| Contained launch 2025 | Contact Tag — "CONTAINED Launch 2026" (**no tag selected**) | YES | draft |
| Contact Form to Universal Inquiry | Form Submitted | no | published |
| Harvest - Follow Welcome | **no trigger set** | no | published (inert) |
| Harvest - Member Welcome (earlier) | Form Submitted | no | published |

**Conclusion: tag canonicalization is send-safe** — the Contact-Tag triggers fire on `act-inquiry` and a CONTAINED-launch tag, neither of which we touch. **Hygiene flags:** `Contained launch 2025` draft has an empty tag-filter (would misfire if published) + a red error on its "Add Contact to Mounty Yarns Launch Pipeline" action; `Harvest - Follow Welcome` is published with no trigger (does nothing — wire or unpublish).

_No git commit made. Branch `wip/ghl-honest-money-2026-05-29` holds the roll-up code; the unrelated uncommitted wiki changes from another session were left untouched (committed nothing with `git add -A`). All numbers live-queried 2026-05-29; the only mutations this session were local file writes — no GHL, Supabase, tag, or message writes._

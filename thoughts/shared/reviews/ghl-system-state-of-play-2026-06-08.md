# GHL System — State of Play (2026-06-08)

> One-page dashboard for the whole CRM: **websites → forms → tags → lists → comms → workflows → pipelines.** Detail lives in the linked docs; this is the at-a-glance + the roadmap. ONE account: **"A Curious Tractor"** `agzsSZWgovjwgpcoASWG`.
>
> Source docs: plan `thoughts/shared/plans/2026-06-08-whole-system-forms-tag-alignment.md` (forms→tags spec, §A–§E, rulings R1–R11) · canon `wiki/concepts/ghl-crm-taxonomy.md` (namespaces) + `wiki/concepts/ghl-audience-comms-automation.md` (5-layer model, lists, comms, workflows, gates) · `thoughts/shared/reviews/ghl-taxonomy-migration-worksheet-2026-06-08.md` (current-tag dump) · `thoughts/shared/reviews/goods-forms-tag-mapping-2026-06-08.md` (§E evidence).

## 0. Where we are (the phases)

| Phase | What | Status |
|---|---|---|
| **A. Forms → canonical tags AT SOURCE** | every form writes namespaced tags | 🟡 in progress — Goods PR #98 (draft, gated); Harvest done; act.place/JH/EL pending |
| **B. Tag migration (existing contacts)** | 237 orphans + legacy flat → canonical | ⬜ not started — worksheet ready, gated on rulings + Ben's verb |
| **C. Lists (smart-lists)** | 7 saved tag-queries built/verified in GHL | ⬜ defined, not built/verified live |
| **D. Comms streams** | 7 `comms:*` drips wired to consent + gates | ⬜ defined, not wired |
| **E. Workflows (automations)** | Layer-4 triggers | ⬜ designed, not built |
| **F. Pipelines** | 11 live — rationalize + connect to tags | 🟡 exist, need review/cleanup |

**Two live risks carried into every phase:** 33 community-line violations + 284 consent violations in the current contact base (see §3) — these are why forms-at-source + the OCAP agency guard come *before* automations switch on.

## 1. Websites (5 codebases → 1 GHL account)

| Site | Repo | Domain | Deploy | GHL forms | Alignment |
|---|---|---|---|---|---|
| act.place | `act-regenerative-studio` | act.place | ✅ live (Vercel) | 9 formTypes via `/api/forms/submit` | 🟡 newsletter fixed; 5 unaligned (R1) |
| JusticeHub | `JusticeHub` | justicehub.com.au | ✅ live | 7 routes/surfaces, ALL flat vocab | 🔴 entirely unaligned (biggest pollution) |
| Empathy Ledger | `empathy-ledger-v2` | empathyledger.com | ✅ live | 2 World Tour forms | 🟡 in scope (R7 verified); pending |
| The Harvest | `theharvest` | theharvestwitta.com.au | ✅ live | edge fns + GardenLaunch/shop/member | 🟢 largely aligned (PR #26 + Phase-3) — verify only |
| Goods | `goods-asset-tracker` | goodsoncountry.com | ✅ live | 9 GHL-writing paths | 🟡 PR #98 draft (gated on GHL prereqs) |

(the-harvest / goods-on-country = dead repos, NOT live — see [[website-forms-ghl-one-account]].)

## 2. Forms (all, by site) — CURRENT → TARGET

Full per-form CURRENT→TARGET tables: plan §A–§E. Summary:

- **act.place (§A):** `newsletter` ✅(fixed) · `contact` · `csa` · `farm-stay` · `residency` · `payout-wall-contest` · `flagship-inquiry` · `volunteer` · `event`. 5 need R1 (project/role/interest).
- **JusticeHub (§B):** `/api/ghl/newsletter` · `/api/ghl/signup`(steward) · signup role tags · `/api/ghl/register`(event) · `/api/contact` · `/api/contained/nominations` · `GHLForm.tsx`(embedded). All flat → migrate. R2 (steward), R4 (CONTAINED), R5 (nominations), R6 (native form), R3 (lived-experience → `lane:community`).
- **Empathy Ledger (§C):** `EmailCaptureForm` · `ContactForm` (World Tour). R7.
- **Harvest (§D):** edge fns `contact-form`/`newsletter-subscribe`/`community-submit`/`ghl-webhook` + GardenLaunch/GetInvolved/shop-EOI/member-wall. Already canonical (`project:act-hv`, `comms:harvest-newsletter`, `role:supplier`) → verify pass only.
- **Goods (§E):** `contact` · `partnership` · `newsletter` · `sponsor` · `canberra-follow` · `order/stripe` · `support` · `claim`(×2) · `bed-story` · `feedback`. PR #98: `project:act-gd` at chokepoint + R8 consent + R9 `lane:community` + R10 `capital_tier` + R11.

## 3. Tags

**Canonical namespaces (9)** — `wiki/concepts/ghl-crm-taxonomy.md` §3:
`project:` (18 codes) · `role:` (funder/partner/supplier/buyer/supporter/storyteller/advisor/community/community-controlled/elder/gov/council/land-council/researcher/media/health-service/housing-provider) · `comms:` (the 7 streams — §5) · `interest:` · `tier:` (curious→connected→member→active→steward) · `ring:` (5/15/50/150) · `place:` (state/community/city) · `source:` (website/event:*/inbound/…) · `lane:community` (OCAP — agency model).

**Current state (worksheet, 2,586 contacts scanned):**
- 1,024 ADD ops · 4,115 REMOVE ops to reach canonical.
- **237 distinct orphan tags** (unmapped — Ben must rule each).
- **627 cruft tag-uses** (2 cruft tags) to delete.
- **🔴 33 community-line violations** — contacts with `comms:*` while `lane:community`/`role:storyteller`. (7 already remediated 2026-06-07.)
- **🔴 284 consent violations** — `comms:*newsletter` without `newsletter_consent=Yes` (Spam Act).
- Top legacy→canonical: `act-gd`→`project:act-gd` (491) · `goods`→`project:act-gd` (288) · `storyteller`→`role:storyteller` (287) · `audience-partner`→`role:partner` (277) · `empathy ledger`→`project:act-el` (267) · `goods-newsletter`→`comms:goods-newsletter` (210) · `harvest-website`→`source:website+project:act-hv` (179) … full table in worksheet §2.

## 4. Lists — smart-lists (7) — Layer 2

Saved tag-queries (defined; build/verify in GHL = Phase C):
1. Org supporters — `role:supporter` AND `newsletter_consent=Yes` AND NOT `lane:community`
2. Goods supporters — `project:act-gd` AND `role:supporter` AND consent AND NOT community
3. Harvest members — `project:act-hv` AND `tier:member`+
4. Active funders — `role:funder` AND NOT `lane:community` AND in a live opportunity
5. Goods buyers — `role:buyer`
6. Community / storytellers — `lane:community` OR `role:storyteller` → **never an automation segment** (exists to be excluded)
7. Inner circle — `ring:5` / `ring:15` (Ben tends personally)

## 5. Comms streams (7) — Layer 3 (`comms:` namespace)

`comms:act-newsletter` · `comms:goods-newsletter` · `comms:harvest-newsletter` · `comms:justicehub-newsletter` · `comms:funder-drip` · `comms:buyer-drip` · `comms:supporter-drip`. Each = enrolment in one stream; **gate:** newsletter streams require `newsletter_consent=Yes`; community-line never auto-enrolled (agency model). (D2 retired `comms:partner-drip` + `comms:nurture`.)

## 6. Workflows (Layer 4 automations) — designed, not built

Triggers we're getting ready for: newsletter-submit → stamp consent + enrol + welcome · Goods inquiry → route+tag · `role:funder`(+not community) → flag for manual stewardship · behaviour (opened/clicked/donated) → advance `tier:` · `lane:community` added → strip `comms:*` lacking consent evidence (the guard) · Xero invoice paid → buyer/funder. **None live yet** — gated on forms-at-source + tag migration (a wrong trigger = a wrong send).

## 7. Pipelines (11 LIVE in GHL — pulled 2026-06-08)

| Pipeline | Stages | Purpose / note |
|---|---|---|
| A Curious Tractor | Germination→Growth→Harvest→Composting→Graduation→Not Yet | generic org — overlaps Universal Inquiry? |
| Empathy Ledger | Identified→…→Active→Not Yet (7) | partner/storyteller outreach |
| Goods Supporter Journey | Identified→…→Renewing→Lapsed→Declined (10) | Goods donors/supporters |
| Goods — Buyer Pipeline | Outreach Queued→…→Paid (12) | commercial buyers |
| Goods — Demand Register | Signal→Buyer Matched→Converted→Dormant (4) | demand signals |
| Grants | Identified→…→Report Submitted→Declined (7) | grant lifecycle |
| Harvest Inbox | New→In progress→Waiting→Resolved (4) | support/inbound |
| Harvest Membership Journey | Curious→Connected→Member→Active→Steward (5) | **mirrors the `tier:` ladder** |
| Supporters & Donors | First→Second→Legacy→Lapsed (4) | donor ladder — overlaps Goods Supporter Journey? |
| The Shop pipeline | New interest→…→On the shelf→Parked (6) | Harvest shop producers |
| Universal Inquiry | New→Needs Assessment→Routed→Out of Scope (4) | inbound router |

**Observations for the pipeline phase:** likely consolidation — generic "A Curious Tractor" vs "Universal Inquiry" (both routers); "Supporters & Donors" vs "Goods Supporter Journey" (donor overlap). "Harvest Membership Journey" maps 1:1 to the `tier:` ladder — good anchor. None are yet driven by canonical tags.

## 8. Roadmap (the order)

1. **Finish forms-at-source (Phase A)** — Goods PR #98 (after GHL prereqs) · act.place 5 forms (R1) · JusticeHub (R2–R6) · EL (R7) · Harvest verify.
2. **Tag migration (Phase B)** — rule the 237 orphans; tracer → bucketed apply; fix the 33 community-line + 284 consent violations first.
3. **Lists (Phase C)** — build/verify the 7 smart-lists against migrated tags.
4. **Comms (Phase D)** — wire the 7 streams to consent + the agency gate.
5. **Workflows (Phase E)** — build Layer-4 triggers once tags + lists are clean.
6. **Pipelines (Phase F)** — rationalize the 11; connect stage-moves to tags.

**Discipline:** everything that writes to live GHL (B–F + deploys) is day-shift, human-in-loop, tracer-first; identity tags never trigger a send — only `comms:` does, and only with consent.

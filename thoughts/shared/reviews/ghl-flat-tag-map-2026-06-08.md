# GHL flat/legacy tag → canonical map (2026-06-08, live)

> All 256 flat (non-namespaced) tags from the live `ghl_contacts` mirror, bucketed by canonical target. This is the **Phase B migration input**. Counts = contacts. Mechanical buckets are safe; **§ORPHANS + §CAMPAIGN need Ben's ruling**, **§CRUFT just deletes**.
> Canonical namespaces: `wiki/concepts/ghl-crm-taxonomy.md` §3. Pairs with the 2026-06-07 worksheet (`ghl-taxonomy-migration-worksheet-2026-06-08.md`).

## CRUFT — DELETE (no migration)
- `gone-from-ghl` (326) · `gone-from-ghl-2026-05-27` (301) · `gone-from-ghl-2026-05-23` (25) → **652 deletes**
- tests: `test-submission` (19) · `codex-smoke-test` (4) · `quiz-completed` (4) · `auto-triage` (3) · `test` · `test-delete-me` · `webhook-test`

## → `project:` (mechanical)
- `act-gd`(491)/`goods`(287)/`project-goods`(32)/`GOODS`(1) → **project:act-gd**
- `act-hv`(95)/`harvest`/`the harvest`/`the-harvest` → **project:act-hv** · `harvest-website`(179) → **project:act-hv + source:website**
- `act-jh`(55)/`justicehub`(90) → **project:act-jh**
- `act-el`(30)/`empathy ledger`(267)/`empathy-ledger`(14) → **project:act-el** · `world-tour`(27)/`world-tour-partner`(14) → **project:act-el + source:world-tour**
- `act-cn`(23)/`civicgraph`(26) → **project:act-cn** · `act-in`(7) → **project:act-in** · `act-regenerative-studio`(15) → **project:act-core**

## → `role:` (+ `lane:community` where flagged)
- `storyteller`(285)/`Storyteller`(87)/`audience-storyteller`(31)/`featured storyteller`(9)/`story-feature`(1) → **role:storyteller + ⚠️lane:community** (440 uses, ~310 people)
- `audience-partner`(277)/`partner`(49)/`goods-partner`(17)/`goods-key-partner`(2)/`goods-partner-lead`(1)/`potential-partner`(1) → **role:partner**
- `audience-funder`(84)/`funder`(36)/`goods-funder`(49)/`goods-gmail-funder`(8) → **role:funder**
- `goods-supporter`(113) → **role:supporter**
- suppliers/vendors: `goods-supplier`(19)/`goods-supplier-active`(11)/`goods-role-store`(21)/`goods-vendor`(10)/`shop-produce`(8)/`shop-maker`(2)/`supplier-{plant5,steel5,hdpe2,canvas,fasteners,product4,hdpe-bulk}`/`vendor-{services5,print2,freight,tech}`/`goods-supplier-pending` → **role:supplier**
- `goods-customer`(9)/`goods-bed-order` → **role:buyer**
- `goods-communitycontrolled`(39)/`goods-community`(32)/`community`(9)/`indigenous-led`(3) → **role:community-controlled / role:community + ⚠️lane:community**
- `elder`(5) → **role:elder + ⚠️lane:community**
- `goods-role-{council17,health6,corp5,landcouncil3,housing2,health_service2,housing_provider1}`/`goods-advisory`(3) → **role:** respective
- `media`(1)/`goods-media`(2)/`goods-gmail-media`(6) → **role:media** · `research`(6) → **role:researcher**

## → `comms:` (consent-gated; community-line never auto)
- `goods-newsletter`(210) → **comms:goods-newsletter** · `newsletter`(84) → **comms:act-newsletter** · `harvest-newsletter`(12) → **comms:harvest-newsletter**
- `goods-nurture`(69) → **retire** (→ comms:goods-newsletter only if consent, else drop)

## → `interest:` (mostly hyphen→colon)
- `interest-{membership49,community46,events43,markets36,workshops35,garden29,food27,volunteer22,sustainability21,venue10,eat1,grow1}` → **interest:** same
- `container-request`(20)/`container request`(2) → **interest:container** · `goods-washer-interest`(8) → **interest:washer** · `goods-bulk-order-inquiry`(2) → **interest:bulk-order**
- `justice`(3)/`yj`(1)/`youth justice`(1) → **interest:justice-reform**

## → `source:`
- `goods-inquiry`(126)/`goods-general-inquiry`(33)/`act-inquiry`(32) → **source:inquiry** (+role:buyer for goods)
- `contact-form`(12)/`contact`(5)/`website-signup`(5)/`website-form`(2)/`footer signup` → **source:website** · `goods-src-footer`(33)/`source: footer` → **source:footer**
- `eoi-gathering-march-2026`(49) → **source:event:eoi-gathering-2026** · `locals-day-march-2026`(9) → **source:event:locals-day-2026** · `event registrant`/`event-submission`/`goods-event`
- `goods-gmail-{active39,partner22,funder8,media6,community2,government1}` → **source:gmail-discovery** · `grantscope-source`(15) → **source:grantscope** · `linkedin-nic`(6)/`linkedin-gmail_discovery`(3)/`goods-linkedin-*` → **source:linkedin**
- `goods-src-{alive-beds5,canberra-airport-2026 5,parliament-house-demo3,naidoc-2026}`/`goods-parliament-house-demo` → **source:event:** respective · `auto-created-from-xero`(7) → **source:xero** · `source-other`/`source-social`

## → `place:`
- `goods-state-nt`(53) → **place:nt** · `goods-state-qld`(2) → **place:qld**
- cities: `adelaide`(7)/`brisbane`(6)/`melbourne`(3)/`sydney`(3)/`perth`(2)/`cairns`/`rockhampton`/`tasmania`(2)/`international`/`regional-nsw`/`cape-york` → **place:** same
- `goods-community-{papunya,lajamanu,maningrida,…~25 NT communities @1-2}` → **place:community:** respective · `witta` → **place:community:witta**

## → `tier:` / pipeline-stage (not a tag)
- `harvest-member`(7) → **tier:member + project:act-hv** · `steward`/`steward - advocate`/`steward - volunteer` → **tier:steward**
- `goods-tier-{champion5,active3,aware2}` → **tier:** (belonging) · `shop-prospect`(28)/`shop-follow-up`(7) → Shop **pipeline stage**, drop as tag

## DROP → custom field (NOT tags)
- temperature: `goods-{warm45,hot13,cold11,cooling13,steady6,new10,signal9}` → engagement field / pipeline stage
- `priority-medium`(10)/`goods-priority-{high2,medium2}` → priority field · `meeting-held`(4) → last-action field
- operational/internal: `photo-wall`(22)/`harvest-gathering-photos`(20)/`member-comments`(15)/`harvest-inbox`(17)/`member-question`(5)/`harvest-people-hq`(4)/`photo-wall-ready`(2)/`harvest-duplicate-review`/`goods-{impact-report-needed,report-board-pack,report-centrecorp-june26,story-consent-needed,showcase,impact-finance}`

## ⚠️ CAMPAIGN — CONTAINED (lived-experience → community-line)
- `contained-hot-lead`(19)/`contained-original-requester`(8)/`contained-personal-outreach`(5)/`contained-needs-followup`(1)/`contained`(1) → **interest:justice-reform + source:event:contained + ⚠️ lane:community** (R3/R4 — lived-experience youth; OCAP-critical, never a marketing drip)

## ❓ ORPHANS — Ben must rule (the genuine tail)
`grant`(12) · `njp`(2) · `uwa-law` · `legal`(2) · `speech-pathology` · `education` · `homeschool-programs` · `food-and-phonics` · `24-carrot-gardens` · `ramsey` · `minderoo-connection` · `tour-funding` · `conference-host`(2) · `collaborator` · `business-interest` · `business-registration` · `biz-expression-of-interest` · `venue`/`venue-enquiry`/`venue-partner`(3) · `festivals-target`(3) · `community-idea`(3)/`idea-general`(3) · `detention centre` · `government` · `goods-government-grant`(3) · `goods-li-contained-tour` · `goods-canberra-airport-—-reconciliation-week` (em-dash junk) · `workshop-booking`/`workshop-suggestion` · `residency-applicant`/`residency-artist` · `no email`(2) · `needs-attention`/`ai-flagged`

## Counts
256 distinct flat tags · 5,413 uses. Cruft delete ≈ 652+tests. Bulk mechanical ≈ ~180 tags. Orphans/campaign needing rulings ≈ ~40.

## ✅ ORPHAN RULINGS — RESOLVED 2026-06-08 (Ben, evidence-checked against live contacts)

**MAP → canonical:**
- `grant` (12) → **`role:funder`** (all grant-makers: Snow/Minderoo/FRRR/AMP/VFFF/QIC/Centrecorp/Rotary) · ADD **`role:gov`** to government bodies (Real Innovation Fund/`dewr.gov.au` etc.). Grant lifecycle lives in the **Grants pipeline** (soft-separated from funder stewardship + Supporters & Donors) — NO `role:grant` tag, NO extra grant tag; pipeline membership carries grant context. Funder smart-list/drip can include/exclude grant-only contacts via Grants-pipeline membership.
- `goods-government-grant` (3) → **`role:funder` + `role:gov` + `project:act-gd`**
- `government` (1) → **`role:gov`**
- `njp` (2) → **`role:partner` + `interest:justice-reform`** (National Justice Project)
- `legal` (2) → **`interest:justice-reform`**
- `conference-host` (2) → **`role:partner` + `interest:justice-reform`** (Justice Reform Initiative)
- `detention centre` (1) → **`interest:justice-reform`** (NSW Education contact; Ben to confirm if education-only)
- `uwa-law` (1) → **`role:researcher` + `place:perth`**
- `tour-funding` (1) → **`role:funder`** (Dusseldorp; world-tour funder)
- `collaborator` (1) → **`role:advisor`**
- `speech-pathology` · `food-and-phonics` · `education` · `homeschool-programs` → **`interest:education`**
- `24-carrot-gardens` (1) → **`interest:garden`**
- `venue` · `venue-enquiry` → **`interest:venue`**; `venue-partner` (3) → **`role:partner` + `interest:venue`**
- `festivals-target` (3) → **`interest:festivals`**
- `workshop-booking` · `workshop-suggestion` → **`interest:workshops`**
- `goods-li-contained-tour` (1) → **`source:linkedin` + `interest:justice-reform`**
- `goods-canberra-airport-—-reconciliation-week` (1) → **`source:event:canberra-airport-2026`** (em-dash dupe)

**DROP (test cruft / data-quality / notes):**
- Test-only (codex-smoke contacts → delete the contacts too): `community-idea` (3) · `idea-general` (3) · `residency-applicant` · `residency-artist` · `business-interest` · `biz-expression-of-interest`
- Operational/data-quality: `no email` (2) · `needs-attention` · `ai-flagged` · `business-registration` · `ramsey` (unclear single)
- Relationship note (drop tag; person keeps their role): `minderoo-connection` (1)

These rulings + the mechanical buckets above = the complete Phase-B migration input. Remaining open: the 62 non-community no-consent newsletter holders (Spam-Act decision, separate).

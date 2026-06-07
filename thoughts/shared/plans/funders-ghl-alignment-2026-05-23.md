---
title: Funders × GHL alignment — corrections + cleanup plan
date: 2026-05-23
status: Gmail audit corrected; GHL state mapped; tagging conventions documented
plan_slug: act-communication-pipeline-2026-05-23-locked
supersedes_partial: funders-alignment-findings-2026-05-23.md (corrections inline)
---

# GHL state — what's already there

Cross-referenced the Gmail audit against `ghl_contacts` table (Supabase mirror). **Most contacts already exist in GHL.** Several Gmail-audit conclusions need correction.

## Corrections to the Gmail audit

### ✅ Snow Foundation — Alexandra Lagelee Kean DOES exist

Gmail audit suggested "Alexandra Lagelee Kean" was a name error. **Wrong.** GHL has `alexandra lagelee kean <a.lageleekean@snowfoundation.org.au>`. She exists, just hasn't been in any of Ben's recent threads. funders.json was right.

GHL also has:
- Sally Grimsley-Ballard `s.grimsley-ballard@snowfoundation.org.au` (funder, goods-funder, goods-tier-aware)
- Georgina Byron `g.byron@snowfoundation.org.au` (funder, CEO)
- **Ashley Machuca** `a.machuca@snowfoundation.org.au` — note this is *Ashley*, not Alexandra. Different person.
- Carolyn Ludovici `c.ludovici@snowfoundation.org.au` (funder, goods-funder)
- Maree Meredith `m.meredith@snowfoundation.org.au` (goods-supporter)
- Matt Breen `m.breen@snowfoundation.org.au` (untagged — needs tagging)
- Plus `s.grimsley-ballard@snowfoundation.org.au` as a *separate empty-name record* — duplicate to merge.

### ✅ Dusseldorp — Rachel Fyfe DOES exist

Gmail audit suggested Rachel Fyfe was an old contact. **Wrong.** GHL has `rachel fyfe <rachelfyfe@dusseldorp.org.au>` (goods, goods-supporter, goods-newsletter, act-gd). funders.json was right.

Also at Dusseldorp:
- **Jessica Duffy/Wilson** `jessicaduffy@dusseldorp.org.au` — *GHL name "jessica wilson"* but email is duffy@. Name conflict. Verify.
- Margot Beach `margotbeach@dusseldorp.org.au`
- Teya Dusseldorp `teya@dusseldorp.org.au` (funder, tour-funding, meeting-held)
- Scarlett Steven `scarlettsteven@dusseldorp.org.au` — has TWO records, merge.

### ✅ StreetSmart — Isabella + Alan ARE the contacts

Gmail audit said "no Isabella or Alan", current contact = Adam. **Wrong.** GHL has all three:
- **Adam Robinson** `adam@streetsmartaustralia.org` (CEO — current Ben relationship) — TWO records, merge.
- **Isabella Stanley** `isabella@streetsmartaustralia.org` (funder, goods-funder)
- **Alan White** `alan@streetsmartaustralia.org` (funder, goods-funder)
- Plus `ceo@`, `impact@`, `grants@` distribution emails

funders.json `primary_contact: "Isabella / Alan"` was right. They're the funding-decision people; Adam is the operational contact + friend. **All three should be on the newsletter.**

### ✅ Paul Ramsay Foundation — William Frazer DOES exist

Gmail audit downgraded PRF to dormant. **Partially wrong.** GHL has William Frazer `wfrazer@paulramsayfoundation.org.au` tagged as `partner, goods-supporter, goods-newsletter, justicehub, act-gd, act-jh` — so the system thinks he's active. He's just not in Ben's recent inbox.

Also at PRF:
- Jonas Kubitscheck `jonas@paulramsayfoundation.org.au` (partner, act-jh)
- Julia Payne `jpayne@paulramsayfoundation.org.au` (untagged)
- Prebhjot Kaur `pkaur@paulramsayfoundation.org.au` (goods-community)

**Stage stays `warm` per the GHL tagging** — not dormant. Newsletter eligible.

### 🟡 JCF — Anne Gripper has TWO records

GHL has Anne twice:
1. `anne.gripper@jcf.placeholder` — tagged `storyteller, act-el` (placeholder email — broken record from a script)
2. `anne.gripper@outlook.com` — tagged `funder, justicehub, act-jh` (real email)

**Action: delete record #1 (placeholder), keep #2.** Add `goods-funder, goods-newsletter, act-gd` tags to #2 since Goods is her primary funder relationship.

### 🟡 Rotary — Pene Curtis has THREE records, Greg Marlow once

Pene appears at 3 different GHL IDs with very similar tag sets. **Merge to one canonical record.**

### 🟡 QBE / Social Impact Hub — 6 SIH staff, mostly UNTAGGED

GHL has the full Catalysing Impact admin team:
- Jay Boolkin `jay@socialimpacthub.org` (untagged)
- Matt Allen `matt.allen@socialimpacthub.org` (untagged)
- Adam Long `adam@socialimpacthub.org` (untagged)
- Jessica Mendoza-Roth `jessica@socialimpacthub.org` (community)
- Misha Williamson `misha@socialimpacthub.org` (untagged)
- Sarah Gregory `sarah@socialimpacthub.org` (untagged)
- Vera Borsboom `vera@socialimpacthub.org` (community)

**Action: tag all 6 with `funder, qbe-catalysing-impact, goods-newsletter, act-gd` to make them newsletter-eligible.** Primary contact = Jay (admin) + Matt (Goods diagnostic lead).

### 🟢 Centrecorp — clean

Randle Walker `randle@centrecorp.com.au` tagged `goods, goods-supporter, goods-newsletter, act-gd` ✓
Jodie Tilmouth `jodie@centrecorp.com.au` (untagged — add same tags)

### 🟢 Tim Fairfax — clean

Katie Norman `knorman@tfff.org.au` tagged `goods, goods-supporter, goods-newsletter, act-gd` ✓

## ACT's existing GHL tagging convention (mapped)

This is the system you've been building — now I can document it explicitly:

### Project tags (lowercase, single project)
- `act-gd` — Goods on Country
- `act-jh` — JusticeHub
- `act-el` — Empathy Ledger
- `act-cn` — CONTAINED
- `act-oo` — Oonchiumpa
- `act-picc` — PICC
- `act-hv` — Harvest

### Project-aware aliases
- `goods`, `justicehub` — short-form project tags (kept alongside act-* codes)

### Relationship tags (per project, e.g. for Goods)
- `goods-funder` — funds the project
- `goods-supporter` — informal supporter
- `goods-community` — partner / community member
- `goods-storyteller` — Empathy-Ledger storyteller for project
- `goods-newsletter` — opted in for newsletter

### Engagement tier (per project)
- `goods-tier-champion` — actively advocating
- `goods-tier-engaged` — multi-touch warm relationship
- `goods-tier-active` — recent contact
- `goods-tier-aware` — knows about project, low engagement

### Process tags
- `goods-inquiry` — actively inquired
- `meeting-held` — formal meeting
- `tour-funding` — sponsored a tour
- `partner` — formal partner

### Source-tracking tags
- `goods-gmail-active` — found via Gmail sync (active threads)
- `goods-gmail-funder` — Gmail-detected funder
- `goods-gmail-partner` — Gmail-detected partner
- `goods-src-footer` — added from website footer signup

**This is a richer tagging system than `funders.json`'s simple `stage` field.** GHL is the source of truth for relationship state; funders.json is the source of truth for voice/framing.

## Cleanup plan — GHL

In priority order (smallest blast radius first):

### Phase 1 — Merge duplicates (~30 min in GHL UI)
1. Anne Gripper: keep `anne.gripper@outlook.com` (kiIhguZ0qiW3...), delete placeholder
2. Pene Curtis: keep canonical (`PRoijdTUvWTYv2D5B29s` — has act-gd + tier-active), delete two duplicates
3. Adam Robinson: keep one canonical record, delete the other
4. Scarlett Steven: same
5. Snow's empty-name `s.grimsley-ballard` record: delete (Sally's main record is fine)

### Phase 2 — Tag the untagged (~30 min)
- All 6 SIH staff → `funder, qbe-catalysing-impact, goods-newsletter, act-gd`
- Jodie Tilmouth (Centrecorp) → `goods, goods-supporter, goods-newsletter, act-gd`
- Matt Breen (Snow) → `goods-supporter, goods-newsletter, act-gd`
- Julia Payne (PRF) → `partner, justicehub, act-jh`

### Phase 3 — Add missing
- Verify Anne Gripper has `goods-funder, goods-newsletter, act-gd` (currently just `funder, justicehub, act-jh`) — she funds Goods too via TFN

## What goes in `funders.json` updates

Now I have the right emails. Proposed patch to `wiki/narrative/funders.json` (the operational config):

```json
"snow-foundation": {
  ...existing...,
  "primary_email": "s.grimsley-ballard@snowfoundation.org.au, a.lageleekean@snowfoundation.org.au",
  "cc_email": "g.byron@snowfoundation.org.au, a.machuca@snowfoundation.org.au, c.ludovici@snowfoundation.org.au",
  "last_communicated_at": "2026-05-20",
  "projects_funded": ["ACT-GD"]
},
"minderoo": {
  ...existing...,
  "stage": "paused",
  "primary_email": "lstronach@minderoo.org",
  "last_communicated_at": "2026-05-14",
  "projects_funded": ["ACT-CN", "ACT-JH"]
},
"qbe-catalysing-impact": {
  ...existing...,
  "stage": "active-partner",
  "primary_email": "jay@socialimpacthub.org, matt.allen@socialimpacthub.org",
  "cc_email": "malcolm.aikman@socialimpacthub.org",
  "primary_contact": "Jay Boolkin / Matt Allen",
  "last_communicated_at": "2026-05-19",
  "projects_funded": ["ACT-GD"]
},
"dusseldorp-forum": {
  ...existing...,
  "primary_email": "jessicaduffy@dusseldorp.org.au, margotbeach@dusseldorp.org.au",
  "cc_email": "teya@dusseldorp.org.au, rachelfyfe@dusseldorp.org.au",
  "primary_contact": "Jessica Duffy / Margot Beach (Teya CC)",
  "last_communicated_at": "2026-05-19",
  "projects_funded": ["ACT-CN", "ACT-JH"]
},
"jcf": {
  ...existing...,
  "primary_email": "anne.gripper@outlook.com",
  "primary_contact": "Anne Gripper",
  "last_communicated_at": "2026-05-21",
  "projects_funded": ["ACT-EL", "ACT-GD"]
},
"centrecorp": {
  ...existing...,
  "primary_email": "randle@centrecorp.com.au, jodie@centrecorp.com.au",
  "primary_contact": "Randle / Jodie",
  "last_communicated_at": "2026-02-13",
  "projects_funded": ["ACT-GD"]
},
"streetsmart-australia": {
  ...existing...,
  "primary_email": "adam@streetsmartaustralia.org, isabella@streetsmartaustralia.org, alan@streetsmartaustralia.org",
  "primary_contact": "Adam Robinson (CEO) / Isabella Stanley / Alan White",
  "last_communicated_at": "2026-03-28",
  "projects_funded": ["ACT-JH"]
},
"rotary-eclub-outback-australia-9560": {
  ...existing...,
  "primary_email": "pene.curtis@bigpond.com, greg@marlowcanete.com.au",
  "primary_contact": "Pene Curtis / Greg Marlow",
  "last_communicated_at": "2026-04-13",
  "projects_funded": ["ACT-GD"]
},
"paul-ramsay-foundation": {
  ...existing...,
  "stage": "warm",  // unchanged — GHL says active
  "primary_email": "wfrazer@paulramsayfoundation.org.au",
  "cc_email": "jonas@paulramsayfoundation.org.au, pkaur@paulramsayfoundation.org.au",
  "primary_contact": "William Frazer (CC Jonas, Prebhjot)",
  "last_communicated_at": null,  // no direct in last year — newsletter subscription only
  "projects_funded": ["ACT-GD", "ACT-JH"]
},
"tim-fairfax": {
  ...existing...,
  "stage": "warm",
  "primary_email": "knorman@tfff.org.au",
  "primary_contact": "Katie Norman",
  "last_communicated_at": "2026-05-20",
  "projects_funded": ["ACT-EL", "ACT-JH"]
}
```

## Active newsletter recipient roster (post-cleanup)

The 9-funder Q1 FY27 newsletter audience (excluding Minderoo paused):

| Funder | Primary recipient(s) | Project(s) | Notes |
|---|---|---|---|
| snow-foundation | Sally + Alexandra L K + Georgie (CEO) cc | ACT-GD | Recent contact (3d); hottest |
| qbe-catalysing-impact | Jay + Matt (SIH admin) | ACT-GD | Diagnostic just delivered |
| dusseldorp-forum | Jessica + Margot (Teya cc) | ACT-CN, ACT-JH | Mounty Yarns active |
| jcf | Anne Gripper | ACT-EL, ACT-GD | Hands-on partner, warm |
| centrecorp | Randle + Jodie | ACT-GD | Bed V.1 caveat — careful framing |
| streetsmart-australia | Adam + Isabella + Alan | ACT-JH | CONTAINED tour funder |
| rotary-eclub-outback-australia-9560 | Pene + Greg | ACT-GD | Global Grant in process |
| paul-ramsay-foundation | William Frazer cc Jonas+Prebhjot | ACT-GD, ACT-JH | Re-engage with this edition |
| tim-fairfax | Katie Norman | ACT-EL, ACT-JH | Hands-on connector |

**9 funder editions per quarter × ~10 min review = ~1.5h/quarter or ~6h/year of your review time.** Within budget.

## Path forward

**This session's commits cover:**
- 90 candidates flowing to Notion ✓
- Snow draft v3 in Notion drafts DB ✓
- Gmail audit done ✓
- GHL audit done ✓
- Tagging conventions documented ✓

**Next session can:**
1. Patch `wiki/narrative/funders.json` with the email + comm-date + projects_funded fields (10 min — I can auto-patch)
2. Run GHL cleanup (Phase 1 + 2 in GHL UI — ~1h hands-on)
3. Re-run the funder drafter for Snow + maybe a second funder (test the pipeline at small scale)
4. Send the first one via GHL Conversations or Gmail

**Open questions for Ben:**
1. **GHL cleanup order** — start with merge-duplicates (highest leverage, ~30min) or with tag-untagged (more contacts touched, ~30min)?
2. **Stage upgrades:** confirm PRF stays `warm` (not dormant — GHL says active), Tim Fairfax `warm` (not warm-cold)?
3. **Auto-patch funders.json now** with the email + comm-date fields I've found? (Conservative — only fields I'm confident about; framing_notes left untouched for your review later.)

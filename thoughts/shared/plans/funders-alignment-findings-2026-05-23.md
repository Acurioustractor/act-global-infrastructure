---
title: Funders alignment — Gmail audit findings + proposed patches
date: 2026-05-23
status: findings ready, awaiting Ben's review before patching funders.json
plan_slug: act-communication-pipeline-2026-05-23-locked
---

# Findings from 10 priority-funder Gmail audits

For each, I pulled the most recent thread + extracted emails + last-comm-date. Discrepancies vs current `wiki/narrative/funders.json` flagged inline.

## 1. snow-foundation — active partner ✓

**Emails found** (all @snowfoundation.org.au):
- **Sally Grimsley-Ballard** `S.Grimsley-Ballard@snowfoundation.org.au` (Head of Partnerships — primary contact)
- Sally personal: `sallygbee@gmail.com`
- **Georgie Byron AM** `g.byron@snowfoundation.org.au` (CEO — sends grant notifications + newsletter)
- **Alexandra Machuca** `A.Machuca@snowfoundation.org.au` (frequent CC on Sally's threads)
- Maree Meredith `M.Meredith@snowfoundation.org.au`
- Lucy McKee `L.Mckee@snowfoundation.org.au`
- M. Reckord `M.Reckord@snowfoundation.org.au`

**Last contact:** 2026-05-20 (Sally → Ben on Canberra landing page feedback). 3 days ago. **HOT.**

**🟡 DISCREPANCY** in current funders.json: `primary_contact: "Sally Grimsley-Ballard / Alexandra Lagelee Kean"`. No "Alexandra Lagelee Kean" appears in any thread. The Alexandra @ Snow is **Alexandra Machuca**. Either funders.json has the wrong surname, OR Alexandra Lagelee Kean is someone outside ACT's email visibility. **Verify with Sally before next send.**

**Proposed patch:**
```json
"primary_email": "S.Grimsley-Ballard@snowfoundation.org.au, A.Machuca@snowfoundation.org.au",
"cc_email": "g.byron@snowfoundation.org.au",
"primary_contact": "Sally Grimsley-Ballard / Alexandra Machuca",
"last_communicated_at": "2026-05-20",
"projects_funded": ["ACT-GD"]
```

## 2. minderoo — ask-pending → ⚠️ now PAUSED

**Emails found:**
- **Lucy Stronach** `lstronach@minderoo.org` (sole contact)

**Last contact:** 2026-05-14 (Lucy → Ben). Quote: *"I do need to pause on justice conversations for the [...]"* — relationship is **paused**, not declined.

**Status should update from `ask-pending` → `paused`.** Don't include in next newsletter batch.

**Proposed patch:**
```json
"stage": "paused",
"primary_email": "lstronach@minderoo.org",
"last_communicated_at": "2026-05-14",
"framing_notes_addendum": "Paused justice conversations per Lucy 2026-05-14 — internal Minderoo restructure. Re-engage Q3 FY27."
```

## 3. qbe-catalysing-impact — administered by Social Impact Hub

**Emails found (Catalysing Impact admin team @ Social Impact Hub):**
- **Jay** `jay@socialimpacthub.org` (primary admin contact)
- **Matt Allen** `matt.allen@socialimpacthub.org` (Goods diagnostic lead)
- **Malcolm Aikman** `malcolm.aikman@socialimpacthub.org`
- Adam, Sarah at SIH

**Last contact:** 2026-05-19 (Ben → Jay re diagnostic + hackathon). Active.

**Note:** Direct QBE contact (Lauren Hicks `lauren.hicks@qbe.com`) seen in early-March threads but ACT relationship runs through SIH, not QBE direct.

**Proposed patch:**
```json
"primary_email": "jay@socialimpacthub.org",
"cc_email": "matt.allen@socialimpacthub.org, malcolm.aikman@socialimpacthub.org",
"primary_contact": "Jay (SIH admin) / Matt Allen (Goods diagnostic)",
"last_communicated_at": "2026-05-19",
"stage": "active-partner",
"framing_notes_addendum": "ACT enrolled in Catalysing Impact 2026 cohort. Goods diagnostic report received 2026-05-11. Relationship runs through Social Impact Hub, not QBE direct."
```

## 4. dusseldorp-forum — active partner (Mounty Yarns)

**Emails found:**
- **Jessica Duffy** `jessicaduffy@dusseldorp.org.au` (Mounty Yarns lead)
- **Margot Beach** `margotbeach@dusseldorp.org.au` (General Manager)
- **Teya Dusseldorp** `teya@dusseldorp.org.au`
- Scarlett Steven `scarlettsteven@dusseldorp.org.au`

**Last contact:** 2026-05-19 (Jessica accepting CONTAINED catchup). Very active.

**🟡 NOTE:** funders.json `primary_contact: "Rachel Fyfe / Jessica Duffy"`. No "Rachel Fyfe" appears in any thread. May be an old contact who's since left.

**Proposed patch:**
```json
"primary_email": "jessicaduffy@dusseldorp.org.au, margotbeach@dusseldorp.org.au",
"cc_email": "teya@dusseldorp.org.au",
"primary_contact": "Jessica Duffy / Margot Beach",
"last_communicated_at": "2026-05-19",
"projects_funded": ["ACT-MY"]
```
*("MY" = Mounty Yarns — check project code is right)*

## 5. jcf (June Canavan Foundation) — active

**Emails found:**
- **Anne Gripper** `anne.gripper@outlook.com` (primary contact + advisor)

**Last contact:** 2026-05-21 (Anne → Ben re African funding partners for ACT's June 2026 Africa trip). **Very warm — Anne actively connecting ACT to her global network.**

**Proposed patch:**
```json
"primary_email": "anne.gripper@outlook.com",
"primary_contact": "Anne Gripper",
"last_communicated_at": "2026-05-21",
"projects_funded": ["ACT-EL"],
"framing_notes_addendum": "Anne is hands-on partner, not arm's-length funder. She's introducing ACT to JCF's global network (Tanzania visit June 2026). Personal warmth — write as friend, not formal funder."
```

## 6. centrecorp — active partner (Tennant Creek)

**Emails found:**
- **Randle** `randle@centrecorp.com.au` (Board lead)
- **Jodie** `jodie@centrecorp.com.au`

**Last contact:** 2026-02-13 (Nic → Randle re Tennant Creek bed funding). 3 months ago — relationship cooler than others.

**⚠️ Important context from threads:** Centrecorp Board declined V.1 stretch bed funding; concerns about V.1 quality. V.2 might be different. Tread carefully on bed-related framing.

**Proposed patch:**
```json
"primary_email": "randle@centrecorp.com.au, jodie@centrecorp.com.au",
"primary_contact": "Randle / Jodie",
"last_communicated_at": "2026-02-13",
"projects_funded": ["ACT-GD"],
"framing_notes_addendum": "Board cautious — declined V.1 Stretch Bed re-funding. Don't lead with bed numbers; lead with broader Tennant Creek community work + Industrial Washer rollout instead. Stage = active but careful."
```

## 7. streetsmart-australia — active partner

**Emails found:**
- **Adam** `adam@streetsmartaustralia.org` (primary — current Ben relationship)
- CEO @ `ceo@streetsmartaustralia.org`
- impact@, grants@ (distribution lists — don't use for newsletter)

**Last contact:** 2026-03-28 (Adam → Ben re CONTAINED tour). 2 months ago.

**🟡 DISCREPANCY** in current funders.json: `primary_contact: "Isabella / Alan"`. No Isabella or Alan in any thread. Active contact is Adam.

**Proposed patch:**
```json
"primary_email": "adam@streetsmartaustralia.org",
"primary_contact": "Adam (CEO)",
"last_communicated_at": "2026-03-28",
"projects_funded": ["ACT-JH"],
"framing_notes_addendum": "Adam is CEO + personal friend. CONTAINED tour was Adam-funded. Lean warm-funder-friend tone, not formal-foundation."
```

## 8. rotary-eclub-outback-australia-9560 — active

**Emails found:**
- **Pene Curtis** `pene.curtis@bigpond.com` (Rotary contact, also worked on Tennant Creek)
- **Greg Marlow** `greg@marlowcanete.com.au` (Rotary)

**Last contact:** 2026-04-13 (Nic → Pene + Greg checking Global Grant status). Active.

**Proposed patch:**
```json
"primary_email": "pene.curtis@bigpond.com, greg@marlowcanete.com.au",
"primary_contact": "Pene Curtis / Greg Marlow",
"last_communicated_at": "2026-04-13",
"projects_funded": ["ACT-GD"],
"framing_notes_addendum": "Rotary Global Grant in process. Tone: practical + grant-cycle-oriented, less narrative. Speaks to Rotary's project-implementation focus."
```

## 9. rotary-eclub-outback — likely same org as #8

Same as #8. The two entries in funders.json look like duplicates of each other (`rotary-eclub-outback` and `rotary-eclub-outback-australia-9560`). **Recommend dedup.**

## 10. paul-ramsay-foundation — warm (cool in practice)

**Emails found:**
- Only marketing newsletters from `hello@paulramsayfoundation.org.au`
- **No direct contact from William Frazer** (the funders.json primary_contact)

**Last direct contact:** none found in last year. Newsletter subscription only.

**Status should downgrade from `warm` → `dormant`.** Not a newsletter recipient until reactivated.

**Proposed patch:**
```json
"stage": "dormant",
"last_communicated_at": null,
"framing_notes_addendum": "No direct correspondence in last 12 months. William Frazer relationship dormant. Don't include in newsletter; re-engage with intro before next ask."
```

## 11. (bonus) tim-fairfax — currently `warm-cold`, actually **WARM** ✓

**Emails found:**
- **Katie Norman** `knorman@tfff.org.au` (Tim Fairfax Family Foundation)

**Last contact:** 2026-05-20 (Katie locking in June catch-up). Very warm — Katie is connecting ACT into TFFF's QLD networks (Eula Rohan @ ARACY, Aimee @ QFCC).

**Status should upgrade from `warm-cold` → `warm`.** Katie is an active hands-on advisor.

**Proposed patch:**
```json
"stage": "warm",
"primary_email": "knorman@tfff.org.au",
"primary_contact": "Katie Norman",
"last_communicated_at": "2026-05-20",
"projects_funded": ["ACT-EL", "ACT-JH"],
"framing_notes_addendum": "Katie is hands-on connector — introduced ACT to ARACY (Eula Rohan), QFCC, Murrup (Shellee Strickland). Tone: peer/friend, less formal-foundation. Last big touchpoint = JCF/PRF Fellowship intros."
```

## Summary table — what to patch

| Funder | Stage change | Add email | Add last-comm | Notes change |
|---|---|---|---|---|
| snow-foundation | (same) | ✓ | 2026-05-20 | Fix Alexandra surname (Machuca, not Lagelee Kean) |
| minderoo | ask-pending → **paused** | ✓ | 2026-05-14 | Add "paused per Lucy 2026-05-14" |
| qbe-catalysing-impact | term-sheet → **active-partner** | ✓ | 2026-05-19 | Note SIH administration |
| dusseldorp-forum | (same) | ✓ | 2026-05-19 | Fix primary contact (Jessica/Margot, not Rachel Fyfe) |
| jcf | (same) | ✓ | 2026-05-21 | Add Anne's hands-on character |
| centrecorp | (same) | ✓ | 2026-02-13 | Add V.1 caveat |
| streetsmart-australia | (same) | ✓ | 2026-03-28 | Fix primary contact (Adam, not Isabella/Alan) |
| rotary-eclub-outback-australia-9560 | (same) | ✓ | 2026-04-13 | Add Global Grant context |
| rotary-eclub-outback | **dedup with #8** | — | — | Likely duplicate entry |
| paul-ramsay-foundation | warm → **dormant** | (no direct) | null | Add "no direct contact 12mo" |
| tim-fairfax | warm-cold → **warm** | ✓ | 2026-05-20 | Add Katie's hands-on character |

## Outstanding questions for you

1. **Snow's Alexandra surname:** Machuca (what I found) or Lagelee Kean (current funders.json)? Two different people, or typo?
2. **Dusseldorp primary contact:** Rachel Fyfe (still relevant?) or Jessica Duffy / Margot Beach (current threads)?
3. **StreetSmart primary contact:** Isabella / Alan (someone we should know about?) or Adam (current)?
4. **Rotary duplicate:** keep both `rotary-eclub-outback` and `rotary-eclub-outback-australia-9560`, or merge?
5. **PRF re-engage:** any plan to reactivate, or keep dormant?
6. **Minderoo re-engage:** wait for Lucy's signal, or check in earlier?

## After your answers

I'll patch `wiki/narrative/funders.json` in one commit with all the email + last-comm + stage updates + framing_notes_addendum merged into framing_notes.

Then the active newsletter recipient roster is:

**Active (8 entries — newsletter Q1 FY27 audience):**
- snow-foundation
- qbe-catalysing-impact (via SIH)
- dusseldorp-forum
- jcf
- centrecorp
- streetsmart-australia
- rotary-eclub-outback-australia-9560
- tim-fairfax

**Dormant (skip):** minderoo (paused), paul-ramsay-foundation (no contact)

That's 8 funder editions per quarter — within the ~30 hours/year review burden estimated in Q6.

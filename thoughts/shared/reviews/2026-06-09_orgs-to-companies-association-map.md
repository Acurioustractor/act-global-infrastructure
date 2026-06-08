# Orgs → Companies migration — association map + runbook (2026-06-09)

**Goal:** move the NT Aboriginal community-controlled organisations out of the **Contacts** object (where a CivicGraph/Goods import wrongly created them) into the **Companies** object, and associate the real *people* to their org-Company. This fixes the structural root cause of the dedup + `lane:community`-on-orgs mess.

**Source audit:** `thoughts/shared/reviews/2026-06-09_orgs-to-companies-import.csv` (38 companies) + this map.
**Read-only at write time:** nothing here has been written to GHL yet. The Companies import is yours (UI/CSV); the association + retirement is a small script run via `!`.

---

## A. Companies to create — 38
- **33** from existing org-as-contact records (the 34 records, with **Ampilatwatja collapsed 2→1**).
- **5** new (no org-record existed — only the person): Miwatj Health, Northern Land Council, Anyinginyi Health, WHSAC, NPY Women's Council.
- ⚠️ **3 possible-dups to verify** (keep one each): Ampilatwatja (already collapsed) · **Amundurrngu Mt Liebig** vs **Mt Liebig Community Store** · **Kaltukatjara Community Council** vs **Kaltukatjara Nguratjaku Council**.

## B. People who STAY Contacts → associate to their Company (8)
| Person | ghl_id | email | → Company |
|---|---|---|---|
| madelyn hay | `ef3tYp3HPNOmUNeu05gc` | madelyn.hay@miwatj.com.au | Miwatj Health Aboriginal Corporation |
| matthew ryan | `sLrNSpHK0j64lsFLaiV0` | northern-land-council-gapuwiyak@goods.civicgraph.io | Northern Land Council |
| tony miles | `bJ0IHYKRVBtlwmyIydaQ` | tony.miles@anyinginyi.com.au | Anyinginyi Health Aboriginal Corporation |
| simone grimmond | `FVfAK0x3SjtTkBmPBTxI` | (none) | WHSAC (Groote Archipelago) — **verify org** |
| angela lynch | `mmLzQtTJEMJE0KAiDTTO` | (none) | NPY Women's Council |
| **baressa frazer** | `qIuqGLFoVusIOhYSL0Hf` | paiden.4892@gmail.com | **ORG TBC — you confirm** |
| **delilah macgillivray** | `1MIZAZ9Kqj0vQveEZydt` | dmagilla@icloud.com | **ORG TBC — you confirm** |
| **michael haji-ali** | `RmiaAGfDHtChd5HxDECM` | michaelhajiali@hotmail.com | **ORG TBC — you confirm** |

These 8 keep `lane:community` if they're community-line individuals (they already lost the org-noise). They are NOT retired.

## C. Org-as-contact records to RETIRE (34) — only AFTER companies exist + verified
Delete (or archive) these contact records once their Company twin is created and any data carried over. ghl_ids:
`MxDCQuWzhl1l9L0fujj6, YSgKCLjrz8mOzXianscn, Q6JZYRh0i6sJxbaDk5WA, 5SUZbGyG14Q4fSLtGfmK, rehcTEdarUUNx91r06ap, sq8AeMqnXJFhReHCxggr, SczQgdmEOSHYnVcs1LII, dd5rHFESa8DCi5uSJyr6, vQYVHLQZlKDZB5b5Yitk, NDkOyddNl1Pajj1Fr4RO, BGyanKf035L4KIIshJnF, bjixgh1blualVbNIKrPG, T11kOpYh703ud8IUkgOZ, ev3DobfSdh8uqoW4NjMP, cwjSZmZrwbpeoTi98qag, wrRHeRChqJEXAcOp5HAw, 9DIjNWgD0WXnUhB2DAUm, yduVJ4zdFaVn7fKMbPxf, TWi4OBECVJbse2HLtYQt, M1nD1Eg2vQzS5bS7LwtR, jyq6kpllvY6A9h9Vnx9s, 3Ot8tdFR2Xlb8KkOgNWO, lj1HY0GS0vaHQYvXtAiS, HAN2VLPXisHJErXrXkhy, RCmAdzqPUceLaiQwkliv, 1dUSJ8bwFl32u1UrZ0cu, agnn4YZ9Iwixiwco0f83, Ud33HAOZRSOg5kfV4FTy, L0N5scaDjkWALI88SFGR, BjPQ4FwKI6yXf9DqHFEG, 64FUSK218liWpGTi9Z2u, QYFJPrbiYcK0R7wPzCxZ, 6jEeR6lbputXOxp4ZZqf, 8gOgn0mjerwpKYSZvkVH`

⚠️ **Do NOT delete until** the matching Company is confirmed in GHL. Deletion is the only irreversible step — `deleteContact` works via the PIT but there is no un-delete. Consider GHL "archive" if available, or export these 34 records first as a backup.

---

## Runbook (order matters)
1. **Import the Companies** — Settings/Contacts → Companies → Import → upload `2026-06-09_orgs-to-companies-import.csv`. Resolve the 3 possible-dups (skip/merge the duplicate row).
2. **Verify** the ~35 companies exist in GHL.
3. **Associate the 8 people** to their Company (Contact → Company field) — 5 known, 3 TBC. *(I can script this once the GHL Companies/Businesses API is confirmed; otherwise it's 8 manual edits.)*
4. **Carry over** any data you want on the Company (the org tags are in the CSV `suggested_tags`).
5. **Retire the 34** org-as-contact records (script via `!`, after backup) — only once 1–4 are done.

## Open items for you
- Confirm the 3 possible-dups.
- Provide orgs for baressa frazer / delilah macgillivray / michael haji-ali.
- Verify WHSAC's full legal name + type.

---

## Resolutions (2026-06-09 PM — follow-up session)

### The 3 "ORG TBC" people → RESOLVED: no org-Company (the TBC was a mis-classification)
Checked their live mirror tags. None belong to an NT Goods org — they are **CONTAINED
community-line individuals**:
| Person | place | projects | verdict |
|---|---|---|---|
| baressa frazer | `place:cape-york` | act-jh · act-ce · contained-adelaide-2026 | community-line individual — **no org** |
| delilah macgillivray | `place:rockhampton` | act-jh · act-ce · contained-adelaide-2026 | community-line individual — **no org** |
| michael haji-ali | `place:perth`/`wa` | act-jh · act-ce · contained-adelaide-2026 | community-line individual — **no org** |

**Action: none.** They keep `lane:community`, stay standalone Contacts (current state). They were
wrongly swept into the "associate to org-Company" list. *(Minor residue, not fixed here: all three
carry `role:community-controlled` — an org role — left over from the import; strip in a later tag pass
if desired, separate from this migration.)*

### Mt Liebig dup-Company pair → RECOMMENDATION
Both are the **same store** (Amundurrngu Aboriginal Corporation operates the Mt Liebig / Watiyawanu
community store):
- **KEEP** `Amundurrngu Mt Liebig Community Store (Aboriginal Corporation)` (`5SUZbGyG14Q4fSLtGfmK` origin) — the registered AC name.
- **DELETE** `Mt Liebig Community Store Aboriginal Corporation` (`HAN2VLPXisHJErXrXkhy` origin) — the bare duplicate.
- Tier 3 (GHL Company delete) → Ben's call/verb, done in the Companies UI. The codebase GHL client
  has no Company-delete method (Companies are read/scripted ad-hoc per the operating model).

### Kaltukatjara dup-Company pair → KEEP BOTH (confirmed)
`Kaltukatjara Community Council (AC)` and `Kaltukatjara Nguratjaku Council (AC)` are plausibly distinct
legal entities (a community council vs the Nguratjaku Aboriginal Corporation). **No deletion** unless
Ben confirms they're the same body.

### Mirror reconcile of the 34 ghosts → DONE
`scripts/reconcile-org-ghost-mirror-2026-06-09.mjs --apply`: all 34 retired org-as-contact rows live-
confirmed 404 in GHL, marked `gone-from-ghl-2026-06-09` in `ghl_contacts` (soft-delete, not hard —
7 tables FK), 34 FK'd opportunities NULLed. 0 failures.

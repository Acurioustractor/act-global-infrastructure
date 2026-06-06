
## ① Ben Croft — 2026-06-03T08:12:23.698Z
- contact: Mvd6MBqRPUZVZpwrrX4b <ben@croftski.com>
- before name: " " · tags: [act-gd, audience-partner, comms:goods-newsletter, comms:partner-drip, goods-newsletter, project:act-ce, project:act-gd, role:partner]
- ACTION: set name → "Ben Croft"; +tag circle:gsd-alliance
- after name: "Ben Croft" · tags: [act-gd, audience-partner, circle:gsd-alliance, comms:goods-newsletter, comms:partner-drip, goods-newsletter, project:act-ce, project:act-gd, role:partner]
- UNDO: removeTag circle:gsd-alliance (name was blank before)

## ② Kristy Bloomfield — 2026-06-03T08:13:46.829Z
- 4 dupes (community-line fix; tags only, NOT merged)
- yk4uK8rgDNGA87EUqNbu: removed [tier:curious], +lane:community · UNDO: re-add removed, remove lane:community · before=[act-gd act-jh audience-brand audience-funder audience-partner audience-storyteller comms:act-newsletter comms:goods-newsletter comms:newsletter goods-inquiry goods-newsletter justicehub partner project:act-gd project:act-hv project:act-jh role:funder role:partner role:storyteller source:inquiry tier:curious]
- gCok46nfL0BqYeYEeexd: removed [tier:curious, comms:partner-drip], +lane:community · UNDO: re-add removed, remove lane:community · before=[act-gd act-jh audience-partner comms:goods-newsletter comms:partner-drip goods-inquiry goods-newsletter goods-partner justicehub partner project:act-gd project:act-hv project:act-jh role:partner source:inquiry tier:curious]
- c8w8llvao4ZDlu2y4dWu: removed [comms:partner-drip], +lane:community · UNDO: re-add removed, remove lane:community · before=[act-gd act-jh audience-partner audience-storyteller comms:goods-newsletter comms:partner-drip goods-inquiry goods-newsletter justicehub partner project:act-gd project:act-jh role:partner role:storyteller source:inquiry]
- 0kEs9BJmkmi7ZUc5haEX: removed [tier:connected, comms:funder-drip, comms:partner-drip], +lane:community · UNDO: re-add removed, remove lane:community · before=[act-gd act-jh audience-brand audience-funder audience-partner audience-storyteller comms:act-newsletter comms:funder-drip comms:goods-newsletter comms:newsletter comms:partner-drip goods-newsletter justicehub partner project:act-gd project:act-hv project:act-jh role:funder role:partner role:storyteller tier:connected]

## ③ Allan Palm Island — 2026-06-03T08:14:12.151Z
- 1 live GHL matches (expected 0). PAUSED, no write. Needs Ben's decision on what un-ghost means.

## ③ Allan Palm Island — 2026-06-03T08:22:08.942Z
- CREATED TYBrJVC9zc0XPYObMyWI <storyteller-07dbb433@empathy-ledger.local> linked to EL storyteller 07dbb433-e386-49ca-a24a-e4a5a5c12417 (13 transcripts; is_elder=true; Traditional Owner Director)
- tags: [lane:community, place:palm-island, role:elder, role:storyteller, source:empathy-ledger]
- name: "Allan Palm Island" (EL spelling; honorific "Uncle" left for community/Ben to confirm)
- UNDO: deleteContact TYBrJVC9zc0XPYObMyWI

## ② Kristy MERGE — 2026-06-03T08:23:45.838Z
- primary: yk4uK8rgDNGA87EUqNbu · pre-merge tags: [act-gd act-jh audience-brand audience-funder audience-partner audience-storyteller comms:act-newsletter comms:goods-newsletter comms:newsletter goods-inquiry goods-newsletter justicehub lane:community partner project:act-gd project:act-hv project:act-jh role:funder role:partner role:storyteller source:inquiry]
- secondary 0kEs9BJmkmi7ZUc5haEX tags (pre-merge, for UNDO): [act-gd act-jh audience-brand audience-funder audience-partner audience-storyteller comms:act-newsletter comms:goods-newsletter comms:newsletter goods-newsletter justicehub lane:community partner project:act-gd project:act-hv project:act-jh role:funder role:partner role:storyteller]
- secondary c8w8llvao4ZDlu2y4dWu tags (pre-merge, for UNDO): [act-gd act-jh audience-partner audience-storyteller comms:goods-newsletter goods-inquiry goods-newsletter justicehub lane:community partner project:act-gd project:act-jh role:partner role:storyteller source:inquiry]
- secondary gCok46nfL0BqYeYEeexd tags (pre-merge, for UNDO): [act-gd act-jh audience-partner comms:goods-newsletter goods-inquiry goods-newsletter goods-partner justicehub lane:community partner project:act-gd project:act-hv project:act-jh role:partner source:inquiry]
- unioned onto primary: [goods-partner]

## ② Kristy MERGE — outcome
- BLOCKED: GHL `/contacts/merge` → 403 Forbidden (private token has contacts.write — tag add/remove + create all work — but NOT the merge scope).
- Tag union ran first: `goods-partner` added to primary `yk4uK8rgDNGA87EUqNbu` → it now holds the full union of all 4 dupes' tags. NO contacts deleted; all 4 still live; all 4 still clean of tier:/drips, all carry lane:community.
- TO FINISH 4→1: merge in the GHL UI (preserves conversation/opportunity history; keep `yk4uK8rgDNGA87EUqNbu` as primary), OR grant the token the contacts-merge scope and re-run `node scripts/orbit-tracer.mjs merge-kristy`.
- Do NOT substitute deleteContact for merge — it would drop the secondaries' inquiry/conversation history.

## 2026-06-07 — identity-pass promotions (Ben: "promote them")
Two ring-150 supporters created in live GHL (LinkedIn-only, no email/phone — joy woods precedent). Ben's read notes stay in field-decisions.jsonl, never GHL.
- **Michael Houston** → `cAcR3ZitRcq3BGBmjMUM` · tags `ring:150 source:beeper` · read: "documentary maker — latent"
- **Terry Hutchinson** → `72ybX7zZrX2NunOVNyuN` · tags `ring:150 source:beeper` · read: "offered journal help" · GHL name is clean ("Terry Hutchinson"); ledger key stays "Dr Terry Hutchinson" via field-warmth ALIAS
Undo: deleteContact on the two IDs + drop the alias line.

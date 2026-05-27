# Goods on Country — Foundation / Funder Email Mining

**Generated:** 2026-05-27 · read-only mine, no Gmail writes performed.

## Coverage

Source: **Supabase `communications_history` table** (the Gmail sync target — `scripts/sync-gmail-to-supabase.mjs` writes here via service-account domain-wide delegation across all four mailboxes). Querying the synced DB was chosen over live `gmail-deep-search.mjs` runs because that script is purpose-built for receipt-by-vendor-and-date matching, not free-text funder discovery, and the DB already holds the full body of synced mail. All four ACT mailboxes are represented in the data:

| Mailbox | Emails synced (in DB) |
|---|---|
| benjamin@act.place | 8,705 |
| nicholas@act.place | 1,390 |
| hi@act.place | 283 |
| accounts@act.place | 181 |
| (cc-only / metadata-empty) | 3,055 |

- **Total synced email:** 13,614 rows · **date range Jul 2025 → 25 May 2026.**
- **COVERAGE CAVEAT:** the sync is heavily benjamin@-weighted; `accounts@` (181) and `hi@` (283) are thinly represented. Funder threads that lived *only* in accounts@ or hi@ (e.g. acquittal invoices, application-portal confirmations) may be under-counted. Most Goods funder relationships run through nicholas@ and benjamin@, which are well covered, so the funder list below is believed near-complete — but a live `gmail-deep-search`-style sweep of accounts@/hi@ would be the way to close the gap. No auth failures encountered (DB path needed no Gmail auth).
- Sender/recipient humans were read from `metadata->>'from'` / `metadata->>'to'` (the `contact_name`/`contact_email` columns are largely null on these rows). Every name/email/date below is copied from email metadata — none invented.

---

## NEW funders (not in the 13-funder GHL Goods Supporter Journey)

| Org | Named contact(s) | Email / phone | Mailbox(es) | Most recent msg | Thread state (1-line) | Warmth | Funder/Buyer |
|---|---|---|---|---|---|---|---|
| **REAL Innovation Fund (DEWR — federal grant program)** | "DEWR - REAL Innovation Fund" (program inbox) | REALInnovationFund@dewr.gov.au | benjamin@ | 2026-03-27 | EOI + request-for-additional-info exchange for "Goods Project" via Palm Island Community Company / Oonchiumpa; Ben chasing status. No named human — program inbox only. | active conversation | funder (govt grant) |
| **The John Villiers Trust** | Fiona Maxwell (CEO) | ceo@jvtrust.org.au | nicholas@, benjamin@ | 2026-04-29 ("Checking in") | Warm relationship via Philanthropy Australia intro; funding a video project + asking about travel costs. Not (yet) a Goods bed/washer $ ask — adjacent funder, relationship-building. | active conversation | funder |
| **Philanthropy Australia (peak body / convener)** | Kim Harland | kim@philanthropy.org.au | nicholas@, benjamin@ | 2026-05-05 | "Introducing A Curious Tractor and Philanthropy Australia" thread + PA Conference video featuring Goods. Convener/network, not a grant-maker itself, but a live $-adjacent door-opener. | active conversation | funder-adjacent (convener) |
| **Rotary Global Grant (application network)** | Pene Curtis; Tony Miles (Anyinginyi Health); Greg (Marlow Canete); Anne Gripper | pene.curtis@bigpond.com · tony.miles@anyinginyi.com.au · greg@marlowcanete.com.au · anne.gripper@outlook.com | nicholas@, benjamin@ | 2026-04-20 | Active "Rotary Global Grant Application" drafting thread (washing machines / beds angle) — multiple advisors helping ACT structure a Rotary global grant. NB: distinct from the GHL "Rotary Eclub Outback Australia" entry; could not confirm Eclub Outback specifically in mail. | active conversation | funder (grant route) |

---

## KNOWN funders (in the GHL Goods Supporter Journey) — confirmed in email

| Org | Named contact(s) | Email / phone | Mailbox(es) | Most recent msg | Thread state (1-line) | Warmth | Funder/Buyer |
|---|---|---|---|---|---|---|---|
| **Snow Foundation** | Sally Grimsley-Ballard; Georgina Byron; Ashley Machuca | S.Grimsley-Ballard@snowfoundation.org.au · g.byron@snowfoundation.org.au · A.Machuca@snowfoundation.org.au | nicholas@, benjamin@ | 2026-04-13 | "DRAFT Snow Foundation Principles / Goods Draft Proposal" — live proposal drafting; Sally supported a bed at their RHD event; warm, supportive. | active conversation | funder |
| **FRRR (Foundation for Rural & Regional Renewal)** | Steph Pearson | s.pearson@frrr.org.au · application portals: mail@grantapplication.com, noreply@yourcause.com | nicholas@, hi@ | 2026-03-31 | "Backing the Future acquittal — Goods, Palm Island" — acquittal completed & praised; Steph wants to keep finding ways to work together. **Preview reveals VFFF is FRRR's co-funder on this program.** | active conversation | funder |
| **Vincent Fairfax Family Foundation (VFFF)** | (via FRRR — no direct ACT thread found) | — (referenced, not corresponded with directly in synced mail) | nicholas@ (indirect) | 2026-03-29 (mention) | Steph Pearson (FRRR): "I have passed onto VFFF, will share your media with them too when we meet this arv." VFFF is the co-funder behind Backing the Future; warm by proxy, no direct VFFF email in DB. | warm (indirect) | funder |
| **The Funding Network (TFN)** | Madeline Alderuccio | madeline.alderuccio@thefundingnetwork.com.au · info@thefundingnetwork.com.au (newsletter) | nicholas@, benjamin@ | 2026-03-30 | "Healthy People Healthy Planet" TFN-pitched grant — FINAL GRANT DISTRIBUTION done Dec 2025; ongoing 6-month impact-update loop. Cohort includes Farm My School / Corena Fund. | active (post-grant reporting) | funder |
| **Red Dust** | Bridgit McMullen; Fiona Scicluna | bridgit@reddust.org.au · fiona@reddust.org.au | nicholas@ | 2026-03-10 | "Washing Machine" thread (+ Kintore Programs) — active coordination on washing-machine placement. | active conversation | funder/partner |
| **QIC (Queensland Investment Corp — corporate giving)** | Justin Welfare; Cat Vecchio; Cat Sullivan | jwelfare@qic.com · cvecchio@qic.com · C.Sullivan@qic.com | nicholas@, benjamin@ | 2026-02-15 | "NAIDOC Week Bed Project + 2026 opportunities" and "Laundry Gallery / Print Shop / Nina + QIC" — active corporate-giving relationship, exploring 2026 opportunities. | active conversation | funder (corporate) |
| **Centrecorp Foundation** | Randle Walker | randle@centrecorp.com.au | nicholas@ | 2026-04-13 | "Tennant Creek Bed Funding" — Randle confirms May Centrecorp Foundation board meeting (applications close 17/05), Board likely OK with reports+photos as acquittal. ACT delivering Utopia homeland beds w/o 18/05. | active conversation — application window open | funder |
| **AMP Foundation** | (program inbox — no named human) | amp_foundation@amp.com.au | nicholas@ | 2026-02-26 | "AMP Foundation Tomorrow Makers IGNITE – Expression of Interest" — EOI submitted/replied. Generic program address only, no human contact in thread. | awaiting reply / dormant | funder |
| **Our Community Shed** | "chair@ourshed.org"; Lucy McGarry (coordinator) | chair@ourshed.org · coordinator@ourshed.org.au | benjamin@, nicholas@ | 2026-04-25 | "Our Community Shed + Goods Project" — long active thread; collaboration/partner. (Listed as funder in GHL; reads more like a delivery/community partner.) | active conversation | funder/partner |
| **Julalikari Council** | Lachlan Wilkins (CEO) | ceo@julalikari.com.au | benjamin@ | 2026-04-14 | Only an auto-reply captured (re Nyinkka Nyunyu cultural reopening invite). Relationship exists but no live Goods-funding thread in synced mail. | dormant / no active Goods thread | buyer/partner (council) |

### KNOWN funders NOT found in synced email
No Goods-context email found for: **Mala'la Health Service**, **Rotary Eclub Outback Australia** (a separate Rotary-Global-Grant thread exists but not the Eclub specifically), **Homeland School**. Absence here ≠ absence in Gmail — could be in the thinly-synced accounts@/hi@ mailboxes, or pre-Jul-2025 (before sync coverage starts). Flag for a live `gmail-deep-search` sweep if these matter.

---

## Buyers / delivery partners seen (not funders)

| Org | Contact(s) | Email | Role |
|---|---|---|---|
| **Palm Island Community Company (PICC)** | Narelle Gleeson-Henaway; Mislam Sam | Narelle@picc.com.au · mislams@picc.com.au | Delivery partner / buyer — "Goods Stretch Beds PICC", Backing-the-Future delivery site (Palm Island), annual-report + Elders work. Heavy active thread w/ benjamin@. |
| **Oonchiumpa Consultancy** | Kristy Bloomfield; Tanya Turner | Kristy.Bloomfield@oonchiumpa.com.au · Tanya.Turner@oonchiumpa.com.au | Delivery partner — co-applicant on REAL Innovation Fund Goods Project (Utopia / Sandover). Active. |
| **Anyinginyi Health** | Tony Miles | tony.miles@anyinginyi.com.au | Partner on Rotary Global Grant route (Tennant Creek region). |
| **Zinus** | Daniel Pittman | daniel.pittman@zinus.com | Bed supplier (on Goods Advisory Group) — vendor, not funder/buyer. |

*Other names on the "Goods // Advisory Group" email (Orange Sky, DeadlyScience, Defy Design, Nina Fitzgerald, SRAU, CYP, Cape York Partnership contacts) are advisors/ecosystem, not funder conversations.*

---

## Notes for the dedup/GHL pass
- **VFFF** should be tagged "warm via FRRR" not "direct conversation" — there is no direct VFFF↔ACT email in the synced data; the signal is FRRR's Steph Pearson saying she'd pass ACT's Goods media to VFFF.
- **Centrecorp** has a live application deadline (17/05) — the most time-sensitive open funder loop in this set.
- **REAL Innovation Fund** and **Rotary Global Grant** are the two most active *new* grant routes.
- **The John Villiers Trust (Fiona Maxwell)** is the clearest genuinely-new foundation relationship worth adding to the journey — warm, CEO-level, currently funding a video project and "checking in."

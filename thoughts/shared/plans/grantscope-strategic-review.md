# GrantScope Strategic Review for ACT
**Date:** 2026-03-20

## What ACT Has Right Now

### Profile
- **1 org profile** — "ACT (A Curious Tractor)" as Social Enterprise Ecosystem
- 30 domains spanning all 7 projects (from "indigenous data sovereignty" to "food systems" to "regenerative agriculture")
- Geographic focus: Queensland, Palm Island, Sunshine Coast, NT, Witta, Jinibara Country
- Embedding generated and active

### Pipeline (91 saved grants)
| Status | Count |
|--------|-------|
| 3★ Top Priority | 5 |
| 2★ Strong Fit | 5 |
| 1★ Possible | 15 |
| 0★ Unrated | 66 |

| Stage | Count |
|-------|-------|
| Submitted | 1 |
| Pursuing | 3 |
| Researching | 79 |
| Discovered | 6 |
| Expired | 2 |

- **Total potential value:** $42.6M across 56 grants with amounts
- **25 grants have expired deadlines** — need cleanup
- **11 grants urgent** (deadline within 14 days)

### Alerts
3 alert profiles configured:
1. **Indigenous Procurement & Justice** (daily) — 73 matches
2. **Technology & Data Grants** (weekly) — 2 matches
3. **Youth & Community** (weekly) — 156 matches

### Feedback
- 10 votes (1 thumbs up, 9 thumbs down)
- System learning from: "Wrong location" (Canberra≠QLD), "Not relevant" (historical awards), "Wrong sector"

### Features NOT yet used
- **Answer Bank** — 0 entries (reusable grant application responses)
- **Grant Applications** — 0 tracked (only 1 submitted via stage tracking)
- **Foundation Tracker** — not yet explored
- **Knowledge Wiki** — not populated

---

## The 5 Biggest Opportunities Right Now

### 1. 🟢 Food Justice for Kids Prize — $2.1M
- **Funder:** Humanitix + Newman's Own Foundation
- **Fit:** The Harvest farm-to-table + youth engagement + First Nations food sovereignty
- **Status:** Researching (3★)
- **Action:** This is a marquee opportunity. Draft a concept note linking Harvest's regenerative agriculture to food justice outcomes for young people on Jinibara Country.

### 2. 🟢 Sidney Myer Creative Fellowships — $200K unrestricted
- **Funder:** Sidney Myer Fund
- **Fit:** Ben or Nic as cultural leaders. Unrestricted = fund whatever matters most.
- **Status:** Researching (3★)
- **Action:** Fellowship for an individual. Build the case around the "power take-off" vision — transferring institutional resources to community. LCAA methodology as creative practice.

### 3. 🟢 Snow Entrepreneurs Fellowship — $200K + mentoring + Antler
- **Funder:** Snow Foundation
- **Fit:** Perfect for Ben/Nic. Social enterprise, innovation, mentoring built in.
- **Status:** Researching (3★)
- **Action:** This is a founder-level fellowship. Pitch ACT as the vehicle, Harvest+BCV as the proof point. The Antler connection opens venture networks.

### 4. 🟢 Kenneth Myer Innovation Fellowships — $180K
- **Funder:** Sidney Myer Fund
- **Fit:** Breakthrough social/environmental solutions
- **Status:** Researching (3★)
- **Action:** Pitch Empathy Ledger or the broader ACT data sovereignty platform as innovation.

### 5. 🔵 Intrepid Foundation Impact Grants — $50K (DEADLINE MAR 31)
- **Funder:** Intrepid Foundation
- **Fit:** Environment, community development — Harvest+BCV regeneration story
- **Status:** Researching (2★)
- **Action:** ⚡ 11 DAYS. Small but fast. Write application this week.

### Runners-up
- **Great Barrier Reef Foundation** — $6.5M community stewardship (2★, ongoing)
- **QBE Seed Capital → First Australians Capital** — $500K Indigenous enterprise (2★)
- **Indigenous Languages & Arts** — $100K, fits PICC/EL perfectly (2★)
- **Backing the Future QLD** — $50K, deadline Sep 2026 (2★)

---

## How the Platform Helps ACT Succeed

### What's Working
1. **Grant Scout auto-discovery** — found 66 of the 91 pipeline grants automatically (score-based)
2. **Semantic matching** — embedding-based discovery finds grants human keyword search would miss
3. **Pipeline tracking** — stages (discovered → researching → pursuing → submitted) give visibility
4. **Alert system** — 3 configured alerts covering Indigenous, Tech, and Youth angles
5. **Feedback loop** — thumbs up/down trains the system to filter better over time

### What Just Got Fixed (this session)
- Filtered out 20,211 historical awards and 86 service directory pages from matching
- Marked 2,751 expired grants as closed
- Added geographic + focus area boosting to match scores
- Partial index for faster vector search on eligible grants only
- Sidebar for quick grant evaluation without leaving the matches page

### What's Broken / Missing
1. **25 expired grants still in pipeline** — need a cleanup pass
2. **66 grants at 0★** — mostly auto-discovered, never triaged
3. **Answer Bank empty** — no reusable content for applications
4. **No project-level tracking** — can't filter "show me only Harvest grants"
5. **Profile too diffuse** — 30 domains = weak signal. 55-60% match scores instead of 70%+

---

## What Would Make the Biggest Difference

### Priority 1: Triage the Pipeline (30 min effort)
The 91 grants need a brutal pass:
- **Delete the 25 expired ones** — they're noise
- **Star-rate the 66 unrated ones** — even a quick 0/1/2/3 pass makes the pipeline useful
- **Duplicates** — there are at least 2 duplicate entries (Sustainable Agriculture, NAB Foundation)
- After triage you probably have ~40 live opportunities, 10-15 worth pursuing

### Priority 2: Hub + Spoke Profiles
The mega-profile gets 55-60% matches. Project-specific profiles would get 70%+:

| Profile | Best For |
|---------|----------|
| **ACT Ecosystem** (keep) | Cross-cutting: fellowships, social enterprise accelerators |
| **Harvest + BCV** (create) | Regen ag, cultural tourism, community hub, agritourism |
| **PICC** (create) | Indigenous community development, remote service delivery |
| **Empathy Ledger** (create) | Data sovereignty, digital ethics, participatory research |
| **Goods on Country** (create) | Social enterprise, circular economy, community assets |

**Blocker:** `org_profiles` has a unique constraint on `user_id` — only 1 profile per user. Need to either:
- Drop the constraint (quick DB change)
- Or create separate user accounts per project (messier)

### Priority 3: Build the Answer Bank
Every grant application asks the same 10-15 questions. Write once, reuse forever:
- Organisation overview / mission statement
- Track record / past projects
- First Nations engagement approach
- Financial sustainability / revenue model
- Team bios (Ben, Nic, key people)
- Environmental impact methodology
- Community consultation process
- Letters of support inventory

### Priority 4: Foundation Relationship Mapping
GrantScope has **9,874 foundations** with enrichment data. ACT should be systematically identifying:
- Foundations whose giving themes overlap with each project
- Foundations already funding similar orgs in QLD
- Foundations with open programs that match (1,089 open right now)
- Personal connections — do any contacts in GHL connect to foundation boards?

### Priority 5: Partnership Discovery for Goods on Country
For the goods/manufacturing angle specifically, the platform could find:
- **Social enterprises** doing similar work (laundry, community assets, circular economy)
- **Corporate partners** with community grants aligned to goods/services
- **Government procurement** opportunities via the Tender Intelligence module
- **Supply chain mapping** via the Supply Chain module

---

## Recommended Action Plan (Next 2 Weeks)

### This Week (Mar 20-26)
1. **⚡ Write Intrepid Foundation application** — $50K, deadline Mar 31
2. **⚡ Triage pipeline** — delete expired, rate unrated, remove duplicates
3. **Start Answer Bank** — write the ACT mission/track record/team responses
4. **Research Snow + Myer fellowships** — these are the highest-value opportunities

### Next Week (Mar 27-Apr 2)
5. **Drop `org_profiles_user_id_key`** — enable multi-profile strategy
6. **Create Harvest+BCV profile** — test match quality improvement
7. **Draft Food Justice for Kids concept note** — biggest single opportunity ($2.1M)
8. **Submit NSW Environmental Trust** if NSW angle found ($350K, deadline Mar 30)

### Ongoing
9. **Weekly triage** — review new auto-discovered grants every Monday
10. **Rate every match** — thumbs up/down trains the algorithm
11. **Track applications** — move grants through stages as you apply
12. **Build foundation relationships** — use foundation tracker for warm introductions

---

## The Numbers

- **91 grants** in pipeline, potential **$42.6M** total value
- **5 top-tier opportunities** worth **$2.9M** combined
- **11 urgent deadlines** in next 14 days
- **1,089 open foundation programs** in the database to search
- **9,874 foundations** with giving data to explore
- **~6,900 eligible grants** after today's cleanup (was 9,300 with junk)
- **3 alert profiles** scanning daily/weekly for new matches

The platform is doing the discovery work. The gap is in **triage, application, and relationship-building** — turning discovered opportunities into submitted applications and warm introductions.

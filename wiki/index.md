# ACT Wikipedia

> A living knowledge base for A Curious Tractor — maintained through human steering, LLM compilation, and community accountability.
> Raw data is compiled into articles. Good questions compound. The wiki stays alive when the loop stays honest.

**Last compiled:** See `wiki/output/status-latest.json` after the latest lint run
**Article count:** generated from the canonical graph, not hard-coded here
**Domains:** projects, concepts, communities, people, stories, art, finance, technical, decisions, research

---

## How This Works

This wiki follows the [[llm-knowledge-base|Karpathy LLM Knowledge Base pattern]]:
- **Raw sources** go into `raw/` — articles, transcripts, research, scraped data
- **Articles** are primarily compiled by LLM into domain directories — humans can still edit load-bearing pages when the method, structure, or strategy changes
- **Index files** in each directory summarize contents for fast agent navigation
- **Backlinks** connect articles across domains
- **Linting** runs periodically to find gaps, contradictions, and new article candidates

---

## Core Concepts

- [[tractorpedia|Tractorpedia]] — ACT's living knowledge base, this wiki itself
- [[act-identity|ACT Identity]] — what A Curious Tractor is: dual-entity structure, LCAA, Beautiful Obsolescence
- [[act-ecosystem|ACT Ecosystem]] — how the projects fit together: narrative, evidence, place, proof case, art
- [[third-reality|The Third Reality]] — ACT's proprietary methodology for social impact measurement
- [[civic-world-model|Civic World Model]] — CivicGraph as living civic intelligence
- [[indigenous-data-sovereignty|Indigenous Data Sovereignty]] — Mukurtu, CARE principles, TK Labels
- [[ocap-principles|OCAP Principles]] — Ownership, Control, Access, Possession — the four architectural requirements
- [[llm-knowledge-base|LLM Knowledge Base]] — the architecture pattern powering this wiki
- [[lcaa-method|LCAA Method]] — Listen, Curiosity, Action, Art
- [[ai-community-engagement|AI and Community Engagement]] — when AI eats the paperwork, people get their time back
- [[youth-justice-reform|Youth Justice Reform]] — evidence, policy, alternatives
- [[consent-as-infrastructure|Consent as Infrastructure]] — OCAP principles as database architecture
- [[governance-consent|Governance & Consent]] — operational shareability matrix, Elder review, OCAP in practice
- [[funding-transparency|Funding Transparency]] — the $107B gap, civic intelligence, legibility
- [[beautiful-obsolescence|Beautiful Obsolescence]] — the tractor PTO metaphor, designing for handover
- [[ai-ethics|AI Ethics]] — non-negotiables, ALMA as gatekeeper, agent roles
- [[alma|ALMA]] — six-signal evidence framework, Story → Signal → Shift → Scope
- [[ways-of-working|Ways of Working]] — daily practice, meeting rhythms, infrastructure philosophy
- [[living-website-operating-system|Living Website Operating System]] — the workflow linking Tractorpedia, Empathy Ledger, and the public shell
- [[project-identity-and-tagging-system|Project Identity & Tagging System]] — which wiki pages get their own code, which roll up, and how retagging works
- [[wiki-project-and-work-sync-contract|Wiki Project & Work Sync Contract]] — the canonical frontmatter and sync fields the website, EL, and Supabase should trust
- [[act-knowledge-ops-loop|ACT Knowledge Ops Loop]] — the concrete capture -> compile -> lint -> sync -> publish -> learn rhythm for running the whole system
- [[social-soil-canvas|Social Soil Canvas]] — founder-facing field diagnostic linking live reflection to durable wiki knowledge
- [[voice-guide|Voice Guide]] — four voice characteristics, farm metaphor bank
- [[place-land-practice|Place & Land Practice]] — BCV, Harvest, Farm as the Place cluster
- [[visual-system|Visual System]] — diagram vocabulary, palette, photography guidelines
- [[glossary|Glossary]] — core terms, ALMA signals, governance vocabulary
- [[transcript-analysis-method|Transcript Analysis Method]] — EL's four-layer voice-preserving pipeline

## People

People pages are **curated, not exhaustive**. The wider voice population lives in [[empathy-ledger|Empathy Ledger]] and related live story surfaces; `wiki/people/` is reserved for load-bearing, named people whose role materially helps explain the ecosystem.

- [[people/README|People Index]] — the curation rule and current major-project roster for durable people pages

- [[benjamin-knight|Benjamin Knight]] — co-founder of ACT, photographer, technologist
- [[nicholas-marchesi|Nicholas Marchesi OAM]] — co-founder of ACT, Orange Sky co-founder, The Harvest
- [[richard-cassidy|Richard Cassidy]] — Manbarra Operations, Palm Island, "Our Story" philosophy
- [[brodie-germaine|Brodie Germaine]] — BG Fit, CAMPFIRE, BAIL, Mount Isa
- [[allan-palm-island|Allan Palm Island]] — Palm Island Elder and artist, cultural sovereignty through studio and Elders work
- [[dianne-stokes|Dianne Stokes]] — Tennant Creek Elder, language and co-design in Goods on Country
- [[aunty-ethel-robertson|Aunty Ethel Robertson]] — Palm Island Elder in the Elders Hull River work
- [[uncle-frank-daniel-landers|Uncle Frank Daniel Landers]] — Palm Island Elder in the Elders Hull River work
- [[aunty-iris-may-whitey|Aunty Iris May Whitey]] — Palm Island Elder in the Elders Hull River work
- [[barry-rodgerig|Barry Rodgerig]] — Witta memory holder and the archaeology of The Harvest site
- [[cyndel-louise-pryor|Cyndel Louise Pryor]] — Palm Island Elder in the Elders Hull River work
- [[elsa-mortoa|Elsa Mortoa]] — Palm Island Elder in the Elders Hull River work
- [[gurtrude-grace-richardson|Gurtrude Grace Richardson]] — Palm Island Elder in the Elders Hull River work
- [[irene-nleallajar|Irene Nleallajar]] — Bwgcolman public storyteller linked to the Palm Island Elders work
- [[kristy-bloomfield|Kristy Bloomfield]] — Oonchiumpa co-director and cultural authority in Mparntwe
- [[marjoyie-burns|Marjoyie Burns]] — Palm Island Elder in the Elders Hull River work
- [[rachel-atkinson|Rachel Atkinson]] — PICC CEO and executive lead on Palm Island
- [[ruby-sibley|Ruby Sibley]] — Palm Island public storyteller linked to the Elders Hull River work
- [[shaun-fisher|Shaun Fisher]] — Fishers Oysters and the shell-return loop in The Harvest
- [[winifred-obah|Winifred Obah]] — Palm Island Elder in the Elders Hull River work
- [[uncle-george|Uncle George]] — Kalkadoon Elder, Mount Isa schools and re-engagement
- [[vic|Vic]] — addiction to inspiration, transformation narrative

## Projects

- [[three-circles|The Three Circles]] — **canonical Minderoo pitch** ($2.9M / 3 years, 10 anchor communities, Lucy-warm) — Circle One (data spine) + Circle Two (the ten + Staying methodology) + Circle Three (outer ring) → *The Country We're Building* artefact in 4 forms
- [[staying|Staying — Country & Council]] — *methodology layer* inside Three Circles' Circle Two; per-young-person Journal artefact + ledger visual register (superseded as a standalone pitch on 2026-04-08)
- [[grantscope|GrantScope (CivicGraph)]] — **Circle One technical reference** — 100K entities, 199K relationships, 1,155 ALMA interventions, 6 live MCP agent tools, QLD Hansard scraper. The agentic insight + history layer underneath JusticeHub.
- [[civicgraph|CivicGraph]] — 566K entities, 1.5M relationships, civic transparency platform
- [[empathy-ledger|Empathy Ledger]] — sovereign storytelling, the connective tissue
- [[justicehub|JusticeHub]] — evidence-based justice alternatives
- [[picc|Palm Island Community Company]] — 20 years of community control
- [[goods-on-country|Goods on Country]] — place-based design and procurement
- [[the-harvest|The Harvest]] — regenerative agriculture and creative practice
- [[act-public-voice|ACT Public Voice]] — how ACT describes itself to the world (act.place)
- [[projects/empathy-ledger/annual-field-service|EL Annual Field Service]] — bespoke engagement scope, $50K/year per org, Y1 model
- [[projects/justicehub/justicehub-centre-of-excellence|JusticeHub Centre of Excellence]] — JusticeHub CoE (ideation)
- [[projects/justicehub/judges-on-country|Judges on Country]] — 55 judges in Mparntwe, story-led decision deck, Traditional Owner-led experience
- [[projects/smart-recovery/smart-recovery|SMART Recovery]] — addiction peer support, GP integration
- [[projects/act-monthly-dinners|ACT Monthly Dinners]] — regular community gatherings over shared meals
- [[projects/custodian-economy|Custodian Economy]] — economic models grounded in custodianship
- [[projects/marriage-celebrant|Marriage Celebrant]] — Ben's civil marriage celebrant practice

### Cluster Overviews

- [[projects/justicehub/README|JusticeHub Cluster]] — folder-level overview of the platform, methodology, pitch, walkthrough, and art companion
- [[projects/act-farm/README|ACT Farm Cluster]] — program/place overview for ACT Farm and Black Cockatoo Valley
- [[projects/the-harvest/README|The Harvest Cluster]] — program/place overview for The Harvest and Green Harvest Witta
- [[projects/picc/README|PICC Cluster]] — Palm Island cluster overview across company, reports, precinct, elders, and kiosk
- [[projects/smart-recovery/README|SMART Recovery Cluster]] — SMART context and GP kit family in one place
- [[projects/act-studio/README|ACT Studio Cluster]] — studio-side project overview across art, fellowship, and research outputs

### Live Packages

- [[minderoo-pitch-package|Minderoo Pitch Package]] — operational STAY / Three Circles package: budget, contact protocol, MOU outline, covering email

## Communities

- [[palm-island|Palm Island (Bwgcolman)]] — relationship history, projects, sovereignty journey
- [[mount-isa|Mount Isa (Kalkadoon Country)]] — community-led youth justice, BG Fit, NAIDOC
- [[communities/the-buttery|The Buttery]] — drug and alcohol rehabilitation, 50-year history, EL bespoke customer

## Research

- [[acco-sector-analysis|ACCO Sector Analysis]] — community-controlled organizations landscape
- [[indigenous-justice-oped|Indigenous Justice Op-Ed]] — "The Cure Already Exists", advocacy piece
- [[power-dynamics-philanthropy|Power Dynamics in Philanthropy]] — donor-contractor overlaps, funding concentration
- [[global-precedents|Global Precedents]] — Spain, Holland, Sweden, Kenya, Tanzania
- [[civic-transparency-movement|Civic Transparency Movement]] — AI making government legible to citizens, "seeing like a state" reversed
- [[alma-intervention-portfolio|ALMA Intervention Portfolio]] — 1,766 youth justice interventions, top scores, ACCO concentration
- [[justice-funding-landscape|Justice Funding Landscape]] — $31.8B QLD community services, $4.1B QLD youth justice, $1.45B philanthropic
- [[political-donations-power|Political Donations & Power]] — Mineralogy, banks, party vehicles ($617M Palmer alone)
- [[justicehub-evolution-meetings|JusticeHub Evolution: Meeting Record]] — from TYSON Bank workshop (2023) to $500K platform (2026)
- [[harvest-property-arc|Harvest Property Arc]] — NM Brainstorm, Witta lease, Phase 1 milestones
- [[empathy-ledger-relationships|Empathy Ledger Relationships]] — BK/Joe (Confit Pathways), BK/Max (ACT Gov), student team arc
- [[diagrama-spain-context|Diagrama Spain Context]] — Olga meeting (NT context), May 2024 political strategy
- [[smart-recovery-context|SMART Recovery Context]] — Chris Gimpel design interview, Sally/April pilot launch, GP campaign
- [[meeting-intelligence-synthesis|Meeting Intelligence Synthesis]] — 7 cross-cutting patterns across 77 meetings, 2023–2026
- [[research/civicgraph-uk-market-entry|CivicGraph UK Market Entry]] — deep research on UK expansion, decision pending

## Art Projects

The fourth letter of [[lcaa-method|LCAA]] — physical, sensory work that makes ACT's arguments walkable. See [[art-projects|ACT Art Projects]] for the canonical index.

- [[art/README|ACT Art Domain]] — the structure and purpose of the art field inside Tractorpedia
- [[art/philosophy/art-as-infrastructure|Art as Infrastructure]] — why art is a core ACT field, not a side portfolio
- [[art/innovation/studio-innovation-flow|Studio Innovation Flow]] — how the Studio creates strategic movement, not just cultural output
- [[art/business/studio-business-model|Studio Business Model]] — how the Studio earns, sustains itself, and funds the commons
- [[uncle-allan-palm-island-art|Uncle Allan Art]] — Manbarra culture on Palm Island (the elder of the studio line)
- [[contained|CONTAINED]] — youth detention as a room you walk into (touring 2026)
- [[the-confessional|The Confessional]] — institutional space made intimate
- [[gold-phone|Gold.Phone]] — communication infrastructure as art
- [[treacher|Treacher]] — sound installation about displacement and Country (ideation)
- [[redtape|Redtape]] — bureaucratic friction made walkable
- [[regional-arts-fellowship|Regional Arts Fellowship]] — art × tech × agriculture
- [[the-vagina|The Vagina]] — coming soon
- [[the-caravan|The Caravan]] — mobile leadership infrastructure (born at Community Capital)
- [[art/y1-release-program|Y1 Art Release Program]] — eight art projects across 2026/27, Daft Punk release cadence

## Stories

29 vignettes from Empathy Ledger with consent metadata. See [[stories/index|Stories Index]] for the full list grouped by consent scope and project.

### Judges on Country Postcards (Oonchiumpa × JusticeHub)

- [[stories/oonchiumpa-kristy-tanya-founders|Kristy & Tanya — "Our young people are just collateral in a bigger issue"]] — founding story, cultural authority
- [[stories/oonchiumpa-jackquann-nigel-programs|Jackquann & Nigel — "Programs." "Go to school every day."]] — what daily support looks like
- [[stories/oonchiumpa-jackquann-detention|Jackquann, 14 — "Detention. That's not my home."]] — family, lockdown, what matters
- [[stories/oonchiumpa-nigel-court|Nigel, 14 — "When I'm talking to the judge, I feel like I'm panicking."]] — court from a child's eyes
- [[stories/oonchiumpa-laquisha-darwin|Laquisha, 16 — "Court is scary because you don't know whether you're getting out or not."]] — 1,500km from home
- [[stories/oonchiumpa-fred-xavier-trust|Fred on Xavier — "He trusts us. We earned that trust."]] — what happens when services don't give up

### Other stories

- [[stories/origin-curious-tractor|The Origin of A Curious Tractor]] — founding philosophy
- [[stories/building-empathy-ledger|Building Empathy Ledger]] — platform origin (Internal Only)
- [[stories/storytelling-data-sovereignty|Storytelling and Data Sovereignty]] — Palm Island voices
- [[stories/peggy-palm-island|Peggy Palm Island]] — community storyteller
- [[stories/uncle-dale-healing-path|Uncle Dale's Healing Path]] — cultural leadership
- [[stories/jesus-teruel-diagrama|Jesús Teruel — Diagrama]] — Spanish youth justice precedent
- ...and 23 more

## Technical

- [[local-ai-architecture|Local AI Architecture]] — edge computing, Gemma 4, sovereign models
- [[act-architecture|ACT Architecture]] — three Supabase instances, RLS, mono-repo
- [[act-knowledge-ops-loop|ACT Knowledge Ops Loop]] — where Obsidian, wiki compilation, EL sync, Supabase mirroring, and website publishing fit together
- [[wiki-project-and-work-sync-contract|Wiki Project & Work Sync Contract]] — how canonical wiki identity becomes website, EL, and Supabase sync state
- [[transcription-workflow|Transcription Workflow]] — four-layer pipeline, ALMA analysis
- [[vignette-workflows|Vignette Workflows]] — create, consent, cultural review

## Finance

- [[finance/five-year-cashflow-model|Five-Year Cashflow Model]] — revenue projections, R&D tax, founder deposit path
- [[finance/rdti-claim-strategy|R&D Tax Incentive Claim Strategy]] — FY26 founder invoicing, CPA booking, $200K+ refundable offset

## Operations

- [ACT Operational Thesis](operations/act-operational-thesis.md) — how we run money, time, intelligence, and art
- [ACT Ecosystem Map](operations/act-ecosystem-map.md) — how 77 projects, 7 financial buckets, and 6 systems connect

## Synthesis

- [[the-edge-is-where-the-healing-is-justicehub-as-the-world-model-for-community-led|The Edge Is Where the Healing Is]] — JusticeHub as the world model for community-led justice
- [[the-kettle|The Kettle]] — STAY reflection anchored in Oonchiumpa, Diagrama, and the four-layer infrastructure
- [[how-does-the-tractorpedia-second-brain-pattern-compound-knowledge-over-time|How the Tractorpedia second-brain compounds knowledge]] — compounding pattern behind the wiki itself
- [[what-are-the-wiki-output-surfaces-and-how-do-they-differ|Wiki Output Surfaces]] — four downstream surfaces: Regen Studio (329 pages), Tractorpedia (189), Command Center, snapshot
- [[how-does-a-dollar-flow-through-the-act-ecosystem-from-bank-transaction-to-rd-tax|Dollar Flow: Bank → R&D Offset]] — the full path from NAB bank feed to 43.5% ATO refund
- [[what-is-the-narrative-store-and-how-does-it-drive-editorial-output|Narrative Store & Editorial Output]] — claims database that turns editorial from blank-page to assembly
- [[how-do-the-77-project-codes-connect-across-financial-storytelling-knowledge-and-|Project Codes as Universal Key]] — how 77 codes connect financial, storytelling, knowledge, and compliance systems
- [[how-does-the-judges-on-country-experience-feed-back-into-the-act-ecosystem|Judges on Country Feedback Loop]] — how the 30-minute experience feeds stories, signals, claims, and R&D evidence back into every system
- [[how-should-act-engage-judges-after-the-on-country-experience-and-what-systems-ca|Engaging Judges After the Experience]] — three layers of engagement, what each captures, connection to revenue thesis
- [[how-does-justicehub-program-search-connect-postcards-to-real-services-across-aus|Postcards to Programs]] — QR to JusticeHub, 1,775 community models, gap signals, the compounding search engine
- [[what-is-the-third-reality-actually-solving-and-how-do-civicgraph-justicehub-and-|What the Third Reality Is Actually Solving]] — CivicGraph + JusticeHub + Empathy Ledger: how three layers produce what none can alone
- [[how-does-act-grow-without-fanfare-through-word-of-mouth-incredible-experiences-a|Growing Without Fanfare]] — no galas, no content calendars, no parliament visits — word of mouth from experiences so good people can't stop talking
- [[what-is-the-living-organism-the-visual-system-for-the-aesthetics-of-asymmetry|The Living Organism]] — CivicGraph as art: Cosmos.gl at 587K nodes, 6 visual episodes, physical artifacts, the data organism that breathes
- [[how-does-empathy-ledger-v2-integrate-with-civicgraph-and-justicehub-to-add-the-h|The Human Layer]] — EL v2 syndication API (already built): portraits, voices, quotes that break the data open across all 6 episodes
- [[what-are-acts-seven-flagship-experiences-and-how-does-each-one-convert-into-ecos|Seven Flagship Experiences]] — CONTAINED, Judges on Country, Brave Ones, Harvest, Goods, EL stories, Tractorpedia — how each converts into growth
- [[how-does-the-third-reality-become-acts-operating-system-not-just-a-concept-but-t|Third Reality as Operating System]] — not a concept to explain but a daily practice: every hour produces data, evidence, or sovereign narrative
- [[what-are-the-specific-opportunities-to-deploy-the-third-reality-in-the-next-12-m|12-Month Opportunity Map]] — 10 specific opportunities across 3 tiers, from judges nationally to CivicGraph UK pilot

## Narrative (claims store — what we have already said)

A Rowboat-style typed-entity store of every public argument the ecosystem has made — *not* a topic wiki, but a claim registry. One file per claim, with frame, deployment count, channel, audience, sources, audience reactions, and an explicit "what we haven't said yet" gap section. Use this when drafting any new post or op-ed: open `INDEX.md`, scan the under-deployed claims, draft against the gap. See `wiki/narrative/README.md`.

- **CONTAINED** — [`wiki/narrative/contained/INDEX.md`](narrative/contained/INDEX.md) — 18 claims, 6 frames, [stat conflicts](narrative/contained/STAT-CONFLICTS.md) tracker
- **JusticeHub** — [`wiki/narrative/justicehub/INDEX.md`](narrative/justicehub/INDEX.md) — 12 claims spanning the platform + STAY program + Three Circles pitch + Staying methodology + The Brave Ones photographic series. **Constellation:** [[the-full-idea|The Full Idea]] · [[three-circles|Three Circles]] · [[staying|Staying]] · [[the-brave-ones|The Brave Ones]] · [[justicehub|JusticeHub platform]].
- **Empathy Ledger / World Tour** — [`wiki/narrative/empathy-ledger/INDEX.md`](narrative/empathy-ledger/INDEX.md) — 12 claims, the LISTEN→BUILD→MEASURE loop, story-as-OS, the corpus as procurement weapon, $1.75M-not-pre-revenue. **Source:** [strategy synthesis 2026-04-09](raw/2026-04-09-empathy-ledger-strategy-synthesis.md). **Open decisions:** [tour questions 2026-04-09](decisions/2026-04-09-empathy-ledger-tour-questions.md).
- **Goods on Country** — [`wiki/narrative/goods-on-country/INDEX.md`](narrative/goods-on-country/INDEX.md) — 4 claims, cross-linked to CONTAINED + Empathy Ledger via `related_claims`
- *(future seeds: Black Cockatoo Valley, The Harvest)*

**Sources connected** — see [`wiki/narrative/sources.json`](narrative/sources.json):
- ✅ wiki/raw essays · JusticeHub compendium + output + linkedin engagement · Goods on Country output · CONTAINED site content
- ⏳ Supabase articles · Empathy Ledger stories · GHL contact responses · act.place + justicehub.com.au scrapes

**Operations:**
- `node scripts/narrative-refresh.mjs [project]` — regenerate INDEX, sort by recency, flag stale
- `node scripts/narrative-draft.mjs <project> --frame <frame> --channel <channel>` — assemble draft brief
- `node scripts/narrative-log-deployment.mjs <claim-id> <channel> --source ... --variant "..."` — record a deployment
- `node scripts/narrative-ingest.mjs <path> --project <slug>` — extract candidate claims from a folder/file
- `node scripts/narrative-watch.mjs` — run all configured sources, drop digests in the inbox
- `/wiki narrative status` · `/wiki narrative draft` · `/wiki narrative oped` · `/wiki narrative log` · `/wiki narrative ingest` · `/wiki narrative watch` · `/wiki narrative process` (see `.agents/skills/wiki/SKILL.md`)

## Decisions

- [[roadmap-2026|Roadmap 2026]] — quarterly plan, focus areas, named risks
- [[strategic-decisions-log|Strategic Decisions Log]] — load-bearing strategic decisions distilled from 58 records
- [[2026-04-founder-lanes-and-top-two-bets|Founder Lanes and Top Two Bets]] — current founder split, active drive lane, and what moves to field or shed
- [[2026-04-five-year-plan|Five-Year Plan — Voice, Flow, Ground]] — 5-year revenue arc, three commitments (founder invoicing, CivicGraph trading arm, EL bespoke), Daft Punk communication rule, 6-months-ahead rhythm, Witta land deposit path
- [[continuous-pipeline|Continuous Pipeline Architecture]] — how Tractorpedia stays alive: lint, watch-meetings, what's manual vs automated
- `wiki/output/el-people-candidates-latest.md` — curated queue for who should get a durable `wiki/people/` page next
- [[2026-04-09-empathy-ledger-tour-questions|Empathy Ledger World Tour Questions]] — open tour and positioning questions resolved on 2026-04-09
- [[2026-04-09-lesotho-data-needs|Lesotho Data Needs]] — named contacts, timing, and the data gap resolved on 2026-04-09
- [[url-audit-2026-04-07|URL Audit — 2026-04-07]] — live/dead/known-issue URL sweep across the ecosystem
- [[wiki-health-2026-04-07|Wiki Health Report — 2026-04-07]] — earlier canonical health checkpoint for Tractorpedia
- [[2026-04-act-farm-repositioning|ACT Farm Repositioning]] — from obsolescence to regenerative capital engine
- [[2026-04-the-work|The Work]] — art is the destination, everything else is how we get there

---

## Directory Map

```
wiki/
  index.md              ← you are here
  concepts/             ← frameworks, methodologies, theories
  projects/             ← ACT ecosystem projects
  communities/          ← place-based relationship articles
  people/               ← key people and their roles
  stories/              ← vignettes from Empathy Ledger (with consent metadata)
  art/                  ← artworks, installations, exhibitions
  finance/              ← funding, grants, R&D, financial strategy
    five-year-cashflow-model.md  ← revenue projections, R&D tax, founder deposit path
  technical/            ← architecture, infrastructure, builds
  decisions/            ← key decisions and their reasoning
  research/             ← compiled research and analysis
  operations/           ← operational thesis, ecosystem map, how ACT runs
  narrative/            ← claims store — every public argument by project
  raw/                  ← source documents (immutable, never edited)
```

---

## All Projects

- [[act-farm|ACT Farm]] — Regenerative Agriculture, Creative Practice, Therapeutic Landscapes
- [[bg-fit|BG Fit]] — Physical Wellbeing, Social Connection, Active Living
- [[caring-for-those-who-care|Caring for Those Who Care]] — Sector Sustainability, Leadership Support, Community Storytelling
- [[civicgraph|CivicGraph]] — 566K entities, 1.5M relationships, civic transparency platform
- [[contained|CONTAINED]] — Youth Justice, Experiential Design, Community Advocacy
- [[dad-lab-25|Dad.Lab.25]] — Fatherhood, Community Support, Gender Equity
- [[deadlylabs|DeadlyLabs]] — STEM in Youth Detention, Sports Science, Cultural Identity
- [[designing-for-obsolescence|Designing for Obsolescence]] — Circular Economy, Sustainable Design, Product Lifecycle
- [[empathy-ledger|Empathy Ledger]] — Indigenous Data Sovereignty, Community Voice
- [[feel-good-project|Feel Good Project]] — Mobile Beauty Services, Women's Dignity, Community Support
- [[fishers-oysters|Fishers Oysters]] — Environmental Restoration, Community Enterprise
- [[global-laundry-alliance|Global Laundry Alliance]] — Dignity, Community Hubs, Policy Change
- [[gold-phone|Gold.Phone]] — Creative Technology, Community Connection, Storytelling
- [[goods-on-country|Goods on Country]] — Product Design, Cultural Design
- [[barkly-backbone|Barkly Backbone]] — Regional Backbone Infrastructure, Northern Territory (ideation)
- [[cars-and-microcontrollers|Cars and Microcontrollers]] — Art, Technology, Maker Culture
- [[community-capital|Community Capital]] — Social Impact Capital, Community Convening
- [[junes-patch|Junes Patch]] — Therapeutic Landscapes, Social Prescribing, Nature Connection
- [[justicehub|JusticeHub]] — Systems Change, Community Support
- [[mounty-yarns|Mounty Yarns]] — Community Stories, Local Knowledge
- [[oonchiumpa|Oonchiumpa]] — Indigenous Leadership, Youth Support, Cultural Practice
- [[picc|Palm Island Community Company]] — 20 years of community control
- [[place-based-policy-lab|Place-Based Policy Lab]] — Evidence-Based Practice, Community-Led Policy, Participatory Research
- [[quandamooka-justice-strategy|Quandamooka Justice and Healing Strategy]] — Justice Reinvestment, Indigenous Leadership, Community Healing
- [[regional-arts-fellowship|Regional Arts Fellowship]] — Art & Technology, Agriculture, Regional Innovation
- [[smart-connect|SMART Connect]] — Peer Support, Digital Access, Community Connection
- [[smart-hcp-gp-uplift|SMART HCP GP Uplift]] — Healthcare Integration, Addiction Support, Provider Education
- [[smart-recovery-gp-kits|SMART Recovery GP Kits]] — Healthcare Integration, Addiction Support, Primary Care
- [[the-confessional|The Confessional]] — Safe Space, Vulnerability, Community Healing
- [[the-harvest|The Harvest]] — Cultural Preservation, Sustainable Farming, Intergenerational Learning
- [[treacher|Treacher]] — Sound Installation Art, Displacement, Country (ideation)
- [[tomnet|TOMNET]] — Community Network, Elder Support
- [[uncle-allan-palm-island-art|Uncle Allan Palm Island Art]] — Indigenous Art, Cultural Sovereignty, Digital Storytelling
- [[act-studio|ACT Regenerative Studio]] — ecosystem hub at act.place, Compendium, the connective storefront
- [[black-cockatoo-valley|Black Cockatoo Valley]] — 150-acre Jinibara Country property, conservation-first land practice
- [[campfire|CAMPFIRE]] — community gathering, Mount Isa, Brodie Germaine
- [[confit-pathways|Confit Pathways]] — gym, mentorship, post-release reintegration (Joe Kwon)
- [[diagrama|Diagrama]] — Spanish youth justice precedent, Murcia model, the Olga trip
- [[resoleution|ReSOLEution]] — sneaker-restoration as pathway, Studio-tier maker practice
- [[green-harvest-witta|Green Harvest Witta]] — the property that became The Harvest, Barry Rodgerig's shed
- [[picc-annual-report|PICC Annual Report]] — community-controlled accountability practice
- [[picc-centre-precinct|PICC Centre Precinct]] — physical infrastructure on Palm Island
- [[picc-elders-hull-river|PICC Elders & Hull River]] — return-to-country work
- [[picc-photo-kiosk|PICC Photo Kiosk]] — community visual storage, 2,491 photos

## Stories (full list)

External-Lite (consent: with care):
- [[stories/a-guarded-to-self-advocate|A Guarded to Self-Advocate]]
- [[stories/atnarpa-boys-trip|Atnarpa Boys Trip]]
- [[stories/atnarpa-girls-trip|Atnarpa Girls Trip]]
- [[stories/cb-cultural-leadership|CB — Cultural Leadership]]
- [[stories/community-innovation-goods|Community Innovation — Goods]]
- [[stories/community-recognition-referrals|Community Recognition & Referrals]]
- [[stories/educational-transformation|Educational Transformation]]
- [[stories/elders-speak-consulted|Elders Speak Consulted]]
- [[stories/girls-day-out-standley-chasm|Girls Day Out — Standley Chasm]]
- [[stories/operation-luna-success|Operation Luna Success]]
- [[stories/proud-pita-pita-wayaka-man|Proud Pita Pita Wayaka Man]]
- [[stories/returning-home-atnarpa|Returning Home — Atnarpa]]
- [[stories/school-partnership-success|School Partnership Success]]
- [[stories/uncle-alan-palm-island|Uncle Alan — Palm Island]]
- [[stories/young-fellas-standley-chasm|Young Fellas — Standley Chasm]]
- [[stories/young-people-murcia|Young People — Murcia]]
- [[stories/young-person-returns-school|Young Person Returns to School]]

Internal Only (consent: team only):
- [[stories/ellen-friday-fridge|Ellen — Friday Fridge]]
- [[stories/finke-desert-race|Finke Desert Race]]
- [[stories/healing-journey-country|Healing Journey — Country]]
- [[stories/m-homelessness-independent|M — Homelessness to Independent]]
- [[stories/ms-future-entrepreneur|MS — Future Entrepreneur]]

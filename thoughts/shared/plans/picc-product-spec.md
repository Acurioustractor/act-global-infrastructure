# ACT Innovation Studio: Product System

> The value is in specification, not production. ACT helps organisations become intent-literate — clear about what they want, what matters, and why. Technology handles execution.

## The Problem

Community organisations, Indigenous corporations, social enterprises — they have decades of knowledge, relationships, and impact. But they can't show it. Their annual reports are forgettable. Their institutional knowledge lives in people's heads. Their projects are scattered across notebooks and email chains. Their aspirations are spoken in meetings but never captured.

They don't need to become tech companies. They need someone who can **translate their intent into systems** — and make those systems beautiful, simple, and owned by them.

That's ACT's Innovation Studio.

---

## The System: Four Connected Products

These aren't four separate things to sell. They're one system that feeds itself.

```
                     DIRECTION
                  "Where we're going"
                         |
                   sets context for
                         |
                         v
     CAPTURE ----------------------> MEMORY
     "Step by step"                  "Everything we know"
     (records as it happens)         (searchable, accessible)
                \                       /
                 \                     /
                  v                   v
                     STORY
                  "Look what we've done"
                  (beautiful, public, impactful)
```

**The cycle:** Direction defines intent. Capture records the journey. Memory preserves it all. Story tells it beautifully. The story informs the next direction.

---

### 1. STORY — The Annual Report Engine

**The deliverable everyone understands.** A premium annual report that makes the organisation look as good as they actually are.

**What makes it different from every other community org report:**
- Big photography — real faces, real places, not stock images
- Statistics as human stories ("42 Elders shared their knowledge" not "42 program participants")
- Innovation narrative — forward-looking, not just survival
- Community voice throughout — quotes, reflections, multiple perspectives
- Connection threads showing how projects link together

**What ACT builds:**
- Print-ready design (A4 landscape, 24-40 pages)
- Interactive digital version (scroll storytelling web page)
- Reusable templates the org can adapt next year
- Photo library as a companion asset

**Design constraints:**
- 60% photos, 40% text
- No jargon
- Each spread = one complete story
- Data viz a 10-year-old could read

**How it connects:** Pulls content from Memory (knowledge base) and Capture (project records). The story IS the proof that everything else is working.

**Client tech literacy required:** Zero. ACT produces, client reviews and approves.

---

### 2. MEMORY — The Knowledge Keeper

**18 years of knowledge, searchable in 5 seconds.** A simple chatbot that holds everything the organisation knows and answers questions in plain language.

**The problems it solves:**
- Key person leaves → knowledge walks out the door
- New board member → starts from zero
- Funder asks "what have you done in X?" → someone digs through filing cabinets
- Same questions asked every 6 months → no one remembers the last answer

**How it works for the user:**
- Open a web page (or scan a QR code at the office)
- Type or speak: "What programs have we run for young people?" / "When did we start the Rangers program?" / "What was decided at the March board meeting?"
- Get a clear answer with source: "From: 2024 Annual Report, page 12"

**How ACT builds it:**
- Ingest all available documents into vector database (reports, minutes, plans, grant apps)
- RAG chatbot with Claude — grounded in real documents, never makes things up
- Access controls for sensitive content (cultural, commercial, personal)
- Source attribution on every answer

**Phased ingestion:**
1. Public documents — annual reports, strategic plans, published materials
2. Internal documents — meeting minutes, project records, grant applications (with permission mapping)
3. Oral knowledge — recorded conversations, video transcripts, stories (with appropriate protocols)

**Design constraints:**
- Looks like texting, not enterprise software
- Works on a phone
- Simple English (reading age ~12)
- Says "I don't know" when it doesn't know
- Sensitive content has access gates

**Client tech literacy required:** Can type a question on a phone.

---

### 3. CAPTURE — The Project Walker

**Record the journey as it happens.** A simple system where teams walk through project steps and drop in information as it arrives — photos, voice notes, meeting summaries, decisions.

**The problem it solves:**
- Projects happen fast — meetings, decisions, photos, funding applications
- Information scatters across phones, emails, notebooks, memory
- At year end, no one can reconstruct what happened
- The annual report becomes a scramble to remember

**How it works:**
- Each project has a **journey view** — visual path from idea to completion
- Steps defined together with the team (not imposed by ACT)
- At each step, anyone can capture:
  - Voice note (auto-transcribed)
  - Photo with caption
  - Meeting summary (speak it → AI writes it up)
  - Decision record ("We decided X because Y")
  - Document upload
- The journey builds a **project story** that feeds Memory and Story automatically

**Example journey:**
```
1. Community consultation  --> [Voice notes, meeting photos]
2. Planning               --> [Budget notes, sketches, decisions]
3. On-ground delivery     --> [Progress photos, participant feedback]
4. Milestone events       --> [Event photos, speeches, attendance]
5. Reflection             --> [What worked, what to carry forward]
```

**Design constraints:**
- Visual and tactile — tap, photograph, speak
- No typing required (voice-first)
- Works offline (sync when connected — remote communities have patchy internet)
- Anyone can add, not just "the tech person"
- Project record builds automatically

**Client tech literacy required:** Can take a photo and record a voice note.

---

### 4. DIRECTION — The Intent Setter

**Make aspirations visible.** A simple tool where the organisation captures what they're working toward — and sees how today's work connects to tomorrow's vision.

**The problem it solves:**
- Funders ask "what's your 5-year plan?" → answer lives in someone's head
- Community asks "what are we working toward?" → no shared view
- Board asks "are we on track?" → no way to tell
- Good work happens but isn't connected to stated goals

**How it works:**
- Organisation defines 3-5 aspirations in their own words (not grant-speak, not KPIs)
- Each current project links to one or more aspirations
- As Capture and Memory collect information, relevant evidence surfaces automatically
- Simple quarterly check-in: "Are we still heading where we want to go?"

**Example:**
```
Aspiration: "Our Elders' knowledge is preserved and honoured"
  |
  |-- Elders Room project -----> 6 portraits, 12 oral histories
  |-- Cultural mapping ---------> 3 sites documented
  |-- Storytelling program -----> 42 stories captured
  |
  Evidence: auto-populated from Capture and Memory
  Next: "Youth-Elder knowledge sharing program"
```

**Design constraints:**
- Aspirations in community language, not management language
- Visual — a living map, not a spreadsheet
- Auto-populated from other tools (never double-entry)
- Supports both planned goals AND emergent direction ("we didn't plan this, but it matters")

**Client tech literacy required:** Can participate in a facilitated session, then review a visual dashboard.

---

## Delivery Model: Gradual Integration

### The Insight from the Video

The job market split says: **specification is worth more than production.** For ACT's clients, that means:

- They don't need to learn technology
- They need to learn **intent** — being clear about what they want and why
- ACT translates their intent into systems
- AI handles the production

### The Phased Approach

Each phase raises tech literacy gradually, building on what worked before.

| Phase | Product | Client Does | Client Learns | ACT Does |
|-------|---------|-------------|---------------|----------|
| 1 (Month 1-2) | **STORY** | Reviews, approves | "Technology makes our story beautiful" | Photography, design, production |
| 2 (Month 3-4) | **MEMORY** | Asks questions, sets access rules | "Our knowledge is valuable and accessible" | Document ingestion, chatbot setup |
| 3 (Month 5-8) | **CAPTURE** | Photos, voice notes, captures journeys | "We can build our own record" | System setup, training, templates |
| 4 (Month 9-12) | **DIRECTION** | Defines aspirations, reviews progress | "We can see where we've been and choose where we're going" | Facilitation, system connection |

**By month 12:** The organisation has a self-sustaining system. Next year's annual report writes itself from the data Capture and Memory already hold. Direction shows whether they're on track. ACT steps back to maintenance and support.

---

## Why This Is ACT's Core Product

Looking at the decade vision: *"By 2036, ACT should be largely unnecessary."*

This product system is designed for that. Each phase transfers more capability to the client:

- Phase 1: ACT produces (client consumes)
- Phase 2: ACT builds (client queries)
- Phase 3: ACT trains (client captures)
- Phase 4: ACT facilitates (client directs)
- Year 2+: ACT maintains (client owns)

The goal isn't recurring dependency — it's **capacity transfer with a beautiful starting point.**

### Revenue Model

| Component | Year 1 | Year 2+ |
|-----------|--------|---------|
| STORY (Annual Report) | Project fee: design + production + print | Reduced fee (template refresh + new content) |
| MEMORY (Knowledge Keeper) | Setup fee + annual hosting | Annual hosting + content updates |
| CAPTURE (Project Walker) | Setup fee + training | Annual hosting |
| DIRECTION (Intent Setter) | Facilitated sessions + setup | Annual facilitation + hosting |
| **Bundle** | Full system: setup + Year 1 delivery | Maintenance + annual report refresh |

This maps to the Innovation Studio revenue line: $120K target for 2026 with 3-4 consulting engagements. One full system engagement = significant portion of that target.

---

## Connection to the Video: Specification > Production

| Video Concept | ACT System Application |
|--------------|----------------------|
| **Specification > Production** | Clients define intent; AI produces reports, searches knowledge, organises projects |
| **Hold the Abstraction** | DIRECTION helps orgs hold their 20-year vision while managing daily work |
| **System Thinking** | Four connected tools that feed each other — not four documents |
| **Verifiability** | Every answer sourced, every goal tracked, every story attributable |
| **Human Judgment** | Community makes all decisions; technology amplifies, never replaces |
| **Compute Literacy** | The phased approach IS a compute literacy program — gradual, practical, grounded |

**The deeper alignment:** The video says "learn to manage agent fleets." ACT does that FOR communities — orchestrating AI agents (document ingestion, transcription, data viz, search) so the community never has to. ACT is the specification layer between community intent and AI production.

---

## First Client: PICC (Palm Island Community Company)

- 18 years of history, active projects (Elders Room, Storm Stories, Photo Studio, Rangers)
- $130K funding secured (Hull River $60K, Annual Report $70K)
- Low tech literacy, high community knowledge
- Cultural protocols required (Elder approval, sorry business, data sovereignty)
- Primary contact: Narelle Gleeson

PICC is the proof case. If this system works for a remote Indigenous community with patchy internet and low tech literacy, it works for anyone.

---

## Open Questions

1. Pricing: What's the full bundle worth? What's affordable for community orgs vs. funded by grants?
2. Technology: Build on existing ACT infrastructure (Supabase, Vercel, Claude) or standalone deployable instances?
3. Empathy Ledger overlap: Is Memory + Capture essentially Empathy Ledger by another name? Or complementary?
4. Scale: One client at a time (bespoke) or build a platform (repeatable)?
5. Team: Can Ben + Nic deliver this, or does it need a third person for design/photography?
6. Name: "Innovation Studio" is the consultancy, but does the product system need its own name?

---
title: Goods on Country — GHL Operating Model
date: 2026-06-01
status: draft (from goods-ghl-engagement workflow)
---

I have the full taxonomy context. Now I'll write the operating model document, building directly on that taxonomy. This is the deliverable — the full markdown body.

```markdown
---
title: Goods on Country — GHL Operating Model
date: 2026-06-01
status: proposed
owner: Ben
audience: founder + interns + AI agents (non-engineer readable)
builds_on: ghl-tag-taxonomy.md (the tag/pipeline contract — read that first)
related: comms-crm-operating-system, ghl-money-alignment, act-brand-alignment, consent-check (OCAP)
one_line: How the doors, the CRM, the database and the analytics fit together to run the Goods drip-feed — simply, every week, with agents drafting and humans approving.
---

# Goods on Country — GHL Operating Model

> **Read this if:** you are the founder, an intern, or an AI agent who needs to run the Goods communications engine without breaking it. The companion doc `ghl-tag-taxonomy.md` is the *grammar* (what every tag means). **This doc is the *operating manual* — what the machine is, how someone enters it, how messages go out, and what you actually do each week.** It is also the **training guide** the agents and interns are pointed at (see §6).

---

## 0. The whole thing in one breath

A person finds a **door** (a website, a form, an event). The door drops a **stamped contact** into **GoHighLevel (GHL)** — our one CRM. GHL decides *who they are* and *what they want* from the stamp, puts them on a **journey**, and starts a gentle **drip** of emails / texts / social touches. Every contact and every action is **mirrored into Supabase** so the **command-center** can show us **which door and which message actually works** — and we feed that learning back into the next drip.

```
   DOORS                      ENGINE                    MIRROR            BRAIN
 ┌──────────────┐          ┌──────────────┐        ┌────────────┐    ┌──────────────┐
 │ goodsoncountry.com │   │   GoHighLevel │        │  Supabase  │    │ command-center│
 │ harvest site │  forms  │  • contacts   │  sync  │  (mirror   │    │  analytics:   │
 │ JusticeHub   │ ───────▶│  • pipelines  │ ──────▶│   of GHL)  │───▶│  which door / │
 │ events/QR    │ stamp:  │  • drip jrnys │        │            │    │  touch        │
 │ inbound email│ source: │  • outbound   │        │            │    │  converts?    │
 └──────────────┘ project:│  • social     │        └────────────┘    └──────┬───────┘
                  role:   └──────────────┘                                  │
                  UTM            ▲                                          │
                                 └──────────  tune message/medium/market ───┘
```

**One sentence per box:**
- **Doors** = anywhere a human can raise their hand. Their only job is to *capture cleanly and stamp correctly*.
- **GHL** = the single operating surface for contacts, journeys, and everything we send out.
- **Supabase** = a faithful copy of GHL we can query and join to money (Xero) — GHL is the *system of record for people*, Supabase is the *system of record for analysis*.
- **Command-center** = the dashboards that turn the copy into "this door / this message works, that one doesn't."

> **Golden rule:** *People and sends live in GHL. Truth-checking and learning live in the command-center.* Never run a campaign from a spreadsheet — it won't be stamped, mirrored, or learnable.

---

## 1. The hub-and-spoke picture (the architecture)

**GHL is the hub. Everything else is a spoke.** Spokes never talk to each other directly — they all go through the hub.

| Layer | What it is | What it is FOR | Who owns it |
|---|---|---|---|
| **Doors (spokes-in)** | `goodsoncountry.com`, the Harvest site, JusticeHub, event QR codes, inbound Gmail, LinkedIn | Capture a hand-raise and **stamp** it | Interns build/maintain forms; agents write the copy |
| **GHL (the hub)** | Contacts · Pipelines · Workflows (drips) · Social Planner · Conversations | Decide who/what, run the journey, **send everything** | Founder owns strategy; agents draft; interns operate |
| **Supabase (mirror)** | A read copy of GHL contacts/opps/tags, joined to Xero money | Let us **query and learn** without touching the live CRM | Engineering (already wired) |
| **Command-center (brain)** | Next.js dashboards on the mirror | Show **attribution + conversion** so we tune | Founder reads; agents propose changes |

**Why hub-and-spoke matters in plain terms:** if every website had its own mailing list and its own way of saying "newsletter subscriber," we'd have five half-truths. Instead, every door pushes into *one* GHL with *one* tag grammar, so a Goods buyer who first arrived via a NAIDOC event and later signed up on the Harvest site is **one person with one history** — not three rows nobody can join up.

**The non-negotiables of the picture:**
1. **One CRM.** GHL location `agzsSZWgovjwgpcoASWG`. No second list anywhere.
2. **One grammar.** Every tag is `namespace:value` per `ghl-tag-taxonomy.md`. No free-text tags.
3. **One direction of truth.** Doors → GHL → Supabase → command-center. Analytics never writes back to a person; the *founder/agent* does, through GHL.

---

## 2. Capture — every door stamps the same four things

**The single most valuable thing a form does is stamp correctly.** A perfect drip on an unstamped contact is wasted. Every form, QR landing, and inbound automation must set these on creation:

| Stamp | Namespace | Why | Example |
|---|---|---|---|
| **Where they came from** | `source:` | Attribution — which door works | `source:website`, `source:event:naidoc-2026` |
| **Which project** | `project:` | Routes them to the right pipeline | `project:act-gd` (always, for Goods) |
| **What they are to us** | `role:` | Routes pipeline + picks the drip | `role:buyer`, `role:supporter`, `role:community` |
| **Campaign breadcrumbs** | UTM fields | Ties the contact to the *specific* ad/post/link | `utm_source=instagram&utm_campaign=naidoc-launch` |

Plus, conditionally:
- `consent:needed` — **always** on any contact who might become a storyteller (OCAP gate; never send story content without resolving this — see `consent-check`).
- `comms:goods-newsletter` — only if they ticked a real opt-in. **No tick, no `comms:` tag, no marketing email.** This is the law that keeps us deliverable and lawful.

### How a stamp is set (so interns can do it without code)

- **GHL native form/survey:** add hidden fields that write the tags on submit (GHL form settings → "Add Tag on submit"). Interns can do this in the UI.
- **Website embed:** the embed passes UTM params through to GHL automatically; the *form's* tag-on-submit sets `source:`/`project:`/`role:`. One form per door = one clean stamp.
- **Inbound email / event QR:** a small GHL workflow stamps on contact-create. Already patterned in `scripts/ghl-webhook-handler.mjs` (which sets `Partner`, `ACT Farm` today — these get re-pointed to `role:partner`, `project:act-hv` in the MIGRATE phase).

### The `/partner` form fix — cut friction (do this first)

**Problem:** the current `/partner` form asks *"what size container / what scale are you after?"* up front. That's a **stage-2 question** — it asks a stranger to make a commitment decision before we've earned it. People bounce.

**Fix — split the ask into two stages:**
1. **Stage 1 (the door — keep it to 3 fields):** name, email, "tell us what you're hoping for" (free text). Stamp `source:` `project:act-gd` `role:community` (or `role:buyer` if it's clearly a purchaser) `interest:container`. **Submit.** That's the whole hand-raise.
2. **Stage 2 (the drip asks the sizing):** the **second** touch in the Demand drip (a day or two later, after we've said hello and explained how on-Country production works) asks *"roughly what size / how many / when?"* — now it's a conversation, not a gate.

**Why this is the right shape:** the form's job is *capture*, not *qualification*. We qualify inside the journey, where the person already feels met. Fewer fields on the door = more stamped contacts = more to nurture = more learning. **Measure it:** form-completion rate before vs after (command-center, §5).

---

## 3. The drip engine — how messages go out

**The drip is the heart of the machine.** It is a set of **GHL Workflows** that fire automatically off tags, sending **email / SMS / WhatsApp**, plus **Social Planner** for everything we post publicly. Nobody sends manually; humans *write and approve*, the engine *delivers*.

### What triggers a drip

Three tag namespaces drive sends (from the taxonomy):

- **`temp:`** = engagement heat → *which intensity of nurture*. `temp:new` gets the welcome arc; `temp:warm` gets the nudge; `temp:cooling` gets the re-engage; `temp:hot` gets the human-handoff alert ("call this person").
- **`interest:`** = what they want → *which content*. `interest:container` gets the on-Country-production story; `interest:events` gets event invites; `interest:garden`/`food` gets the Harvest path.
- **`comms:`** = what they opted into → *whether we're allowed to send the newsletter at all*. The drip can run; the **newsletter** only goes to `comms:` holders.

### The three Goods journeys (layer onto the existing 26 workflows — do not duplicate)

These mirror the pipelines in `ghl-tag-taxonomy.md`. Each box below is a small GHL Workflow:

**A. Demand → Buyer → Supporter (the core Goods money path)**
- **Demand drip** (`role:community` + `interest:container/washer`, `temp:new`): Touch 1 = welcome + "here's what Goods is." Touch 2 = how on-Country production works **+ the sizing ask** (the §2 stage-2 question). On a match → notify team, spawn a **Buyer** opp.
- **Buyer drip** (Buyer pipeline): *Proposed* → quote follow-up. *Invoiced* → payment reminder (tied to Xero `Invoiced`). *Paid* → thank-you **+ auto-add `role:supporter`** (this opens the Supporter Journey — the cross-pollinate move that's currently done from memory and shouldn't be).
- **Supporter drip** (`role:supporter`): cultivate → ask (tailored by `temp:`) → steward/report (per-tranche acquittal) → **renew nudge 60 days before cycle end.**

**B. JusticeHub CONTAINED** (`interest:justice-reform` → `role:contained-nominee` → welcome → engage → `role:contained-advocate` → invite → post-experience story-capture **gated on `consent:`**). Finishes the *Contained launch 2025* draft workflow.

**C. The Harvest** — one welcome keyed on `project:act-hv` + first `interest:*`, branching by interest (membership → CSA, volunteer → Volunteer Application, events → event nurture). Re-points the four existing receipts onto one maintainable tree.

### Channel choice — which medium, when (keep it humane)

| Medium | Use for | Rule |
|---|---|---|
| **Email** | the body of nurture, stories, newsletters, reports | Default. Always `comms:`-gated for marketing |
| **SMS** | time-sensitive, 1-line nudges (event tomorrow, payment due) | Sparingly; never for storytelling; honour opt-out |
| **WhatsApp** | warm, conversational, community-preferred contacts | Where the relationship is already personal |
| **Social (Social Planner)** | one-to-many: the public face of all three projects | All social scheduled from **one** place (below) |

### Social Planner — all social from one place

**Every public post for Goods, Harvest, and JusticeHub is scheduled inside GHL's Social Planner.** One calendar, one queue, one approval step. No posting straight from a phone. This means: (a) the brand voice gets checked once before it goes out, (b) the post is tied to a `source:`/UTM link so we can attribute the contacts it brings in, and (c) an agent can draft a fortnight of posts and a human approves the batch (§6). The post's link carries a UTM so anyone who arrives gets stamped `source:` automatically — **the social loop closes back into capture.**

> **The whole engine in one line:** *tags trigger workflows, workflows send the right medium to people who opted in, social feeds new stamped people back into the top.*

---

## 4. Segments — how the newsletter and audience lists build themselves

**A segment is a saved filter (a "Smart List") on tag combinations.** You never hand-build a list. You define the rule once; GHL keeps it current as tags change.

`comms:` + `role:` are the two that build audiences:

| Audience (Smart List) | Filter rule | Used for |
|---|---|---|
| **Goods newsletter** | `comms:goods-newsletter` | The monthly Goods send |
| **Harvest newsletter** | `comms:harvest-newsletter` | Harvest CSA + events |
| **Funder updates** | `role:funder` **AND** `comms:newsletter` | Quarterly funder/supporter report |
| **Community partners** | `role:community` OR `role:community-controlled` | On-Country / partnership comms |
| **Warm buyers to re-engage** | `role:buyer` AND `temp:cooling` | A targeted re-engage drip |
| **Story-ready (consented)** | `role:storyteller` AND `consent:full` | The *only* list a story may be drawn from |

**Why this is powerful and simple:** when a buyer hits *Paid* and gets `role:supporter`, they **appear in the Supporter audience automatically** — no one re-types a list. When someone opts out, the `comms:` tag is removed and they **drop out of every newsletter at once.** One fact, one tag, every list correct. (This is exactly the payoff promised in the taxonomy's "Smart Lists become reliable.")

**Intern rule:** to make a new audience, write the **tag rule** first ("who is in this, in tags?"), then save it as a Smart List. If you can't express the audience in `role:`/`comms:`/`temp:`/`interest:` tags, the audience isn't real yet — fix the stamping, don't hand-curate.

---

## 5. Analytics & learning — which door, which touch, which message wins

**This is why we stamp.** Because every contact carries `source:` + UTM, and every send is mirrored to Supabase, the command-center can answer the only questions that matter:

1. **Which door brings people in?** Count contacts by `source:` and UTM. (Did NAIDOC out-perform the website footer? Did the Instagram launch out-pull LinkedIn?)
2. **Which door brings people who *convert*?** Join `source:` to pipeline outcome to Xero `Paid`. A door can be loud (lots of contacts) but lossy (none convert) — we want the door that produces *paid buyers and renewing supporters*, not just signups.
3. **Which *touch* moves people?** Per workflow / per email: open → click → stage-advance. The touch that warms `temp:cold → warm` is the one to write more of.
4. **Did a change help?** The `/partner` form fix (§2): completion-rate before vs after. The new sizing-in-drip ask: reply rate. **Every change ships with a number to watch.**

**The learning loop (message–medium–market fit):**
```
   stamp ──▶ send ──▶ measure (source→convert, touch→advance) ──▶ tune copy/medium/timing ──▶ stamp ...
```
- **Message fit:** the email variant with the higher click → click rate becomes the template; the loser is retired.
- **Medium fit:** if SMS nudges out-convert email for "payment due," move that touch to SMS.
- **Market fit:** if `place:nt` + `role:community` converts far better than metro buyers, *that's* where the next door (event/ad) goes.

**Where it shows up:** command-center on the Supabase mirror. The founder reads it weekly (§7); agents propose the tune; humans approve. **No tuning is done on vibes — every change cites the number it's moving.**

---

## 6. The agent + intern system (this is how it scales without breaking)

The drip needs a *lot* of writing — drip touches, per-audience variations, a fortnight of social, per-community tailoring. That volume is what AI agents are for. The judgement — is this on-brand, is this consented, is this true — is what humans are for. **This document is the contract between them.**

### How it splits

| | **AI agents** | **Human interns** |
|---|---|---|
| **Own** | First drafts at scale: drip touches, social posts, per-audience/per-`place:` variations of one message | A **mini-project** end-to-end (e.g. "the Demand drip," "the Harvest welcome tree," "NAIDOC social fortnight") |
| **Trained on** | This doc + `act-brand-alignment` (`references/writing-voice.md`) + `ghl-tag-taxonomy.md` | The same three docs — read first, before touching GHL |
| **Never do** | Publish, send, change a workflow trigger, or write story content past a `consent:` gate | Invent a tag, hand-build a list, send without a `comms:` opt-in, publish a story without `consent-check` |

### The draft → verify → publish loop (every send goes through this)

```
  1. DRAFT     agent writes the touch/post + 2-3 variations, in ACT voice,
               stamped with the target Smart List + the number it's meant to move
        │
  2. VERIFY    a human (intern or founder) checks 4 things, in order:
               (a) brand voice  — Curtis method; reject AI tells (delve, crucial,
                   pivotal, tapestry, em-dashes, "not just X but Y")
               (b) truth        — every claim/number sourced (verification.md)
               (c) consent      — any storyteller content? run consent-check; no gap = no send
               (d) audience     — does the Smart List filter match who this is for?
        │
  3. PUBLISH   human schedules it in GHL (workflow email / Social Planner).
               The ENGINE delivers. The human never hand-sends 500 emails.
        │
  4. LEARN     command-center reads the result (§5) → the winning variant becomes
               the template → feeds the next DRAFT. (closes back to step 1)
```

**The verify step is the load-bearing one.** Agents draft fast and cheap; the human is the *quality gate*, not the typist. Per the workflow rules, anything that **sends to a real person's inbox is a Tier-3 action** — it needs a human's explicit go. Agents draft into a queue; they never press send.

### Why THIS plan is the training guide

You don't need a separate "agent onboarding" doc. **This is it.** Point a new agent or intern at these four files and they have everything:
- **This doc** — what the machine is, how it runs, what "good" looks like (the loop above).
- **`ghl-tag-taxonomy.md`** — the grammar: every tag, what it means, which are load-bearing (never auto-remove).
- **`act-brand-alignment` / `writing-voice.md`** — the voice: how an ACT sentence sounds, and the AI tells to reject.
- **`consent-check` (OCAP)** — the hard gate before any community/storyteller content goes out.

A brief to an agent is then one line: *"Draft the Demand drip Touch 2 for `role:community` + `interest:container`, three variations, ACT voice, ending on the sizing ask; target Smart List = Goods Demand; the number to move = reply rate. Stop after drafting — queue for verify."* That brief is **complete** because the four files supply budget, voice, grammar, and stop-criteria. (This is the agent contract from the prompting rules: task + stop + fallback + scope, all sourced from these docs.)

**Fallback for any agent:** if a tag, audience, or consent status is unclear — **stop and ask; never guess, never invent a tag or a name.** A wrong tag pollutes a Smart List; a guessed name breaks OCAP.

---

## 7. How it runs each week (the one page that keeps it simple)

> **The whole job is a 45-minute Monday rhythm plus a Thursday send.** If you only ever do this page, the machine runs.

### Monday — 30 min — READ & DECIDE (founder, with agent prep)
1. Open command-center → Goods analytics. Note: **new contacts by `source:`** this week, and **which touch advanced the most people** (§5).
2. Glance at the three pipelines — anyone stuck? Anyone at *Invoiced* needing a nudge? Anyone *Paid* who should now be `role:supporter`?
3. Pick **this week's one tune**: a door to push, a touch to rewrite, or a segment to message. (One. Not ten.)

### Monday — 15 min — BRIEF (founder → agents)
4. Write the one-line brief for the tune (template in §6). Agent drafts touches/posts + variations into the **verify queue**.

### Tuesday/Wednesday — VERIFY & QUEUE (intern owns)
5. Run each draft through the **draft → verify → publish** loop (§6): voice → truth → consent → audience.
6. Schedule approved emails into the GHL workflow; schedule the social batch in **Social Planner**. **Nothing un-verified gets scheduled.**

### Thursday — SEND (the engine, automatically)
7. The drips fire on their tags; the newsletter goes to its Smart List; social posts at their planned times. **No human hand-sends.**

### Friday — 10 min — CHECK THE NUMBER (founder)
8. Did the week's tune move its number (open/click/reply/completion)? **Yes →** make the winning variant the template. **No →** note why; pick a different lever Monday. (This is the LEARN step closing the loop.)

### Always-on guardrails (true every day, no exceptions)
- **No `comms:` tag → no marketing email.** Opt-in is the law.
- **Story/community content → `consent-check` first.** A consent gap blocks the send. Never fabricate a name or date to fill a gap.
- **One CRM, one grammar.** New tags must be `namespace:value`; if it doesn't fit a namespace, it's not ready.
- **Agents draft, humans send.** Anything reaching a real inbox is Tier-3 — explicit human go required.
- **Every change ships with a number to watch.** No tuning on vibes.

---

### Appendix — the parts list (so nothing is mysterious)

| Thing | Where | Plain meaning |
|---|---|---|
| GHL location | `agzsSZWgovjwgpcoASWG` | our one CRM account |
| Tag grammar | `ghl-tag-taxonomy.md` | the 9+2 namespaces; load-bearing tags |
| Doors | `goodsoncountry.com` + Harvest/JusticeHub sites, event QR, inbound Gmail | where hands go up |
| Drips | GHL Workflows (26 live today; +3 Goods journeys layered on) | the automatic sends |
| Social | GHL Social Planner | all public posts, one calendar |
| Mirror | Supabase (the shared instance, GHL tables) | queryable copy of the CRM |
| Brain | command-center `/` analytics on the mirror | which door/touch converts |
| Voice | `act-brand-alignment` / `writing-voice.md` | how an ACT sentence sounds |
| Consent | `consent-check` (OCAP) | the gate before any story goes out |
| Producing scripts | `project-notifications.mjs`, `ghl-webhook-handler.mjs`, `clean-funder-ghl-contacts.mjs`, `seed-goods-opps-from-xero.mjs`, `sync-content-to-ghl.mjs` | code that writes tags — must emit `namespace:value` after MIGRATE |
```

# Substack Setup Playbook — Field Notes / Benjamin Knight relaunch

**Goal:** Take the existing dormant Substack (6 subscribers, last post 26 January) and rebuild it as Field Notes with the four-section structure, paste-ready About page, and the relaunch post queued.

**Time budget:** 60-90 minutes end to end. Work through the steps in order. Each step has exact text where possible.

**Prerequisite:** Log in to Substack as the publication owner. The handle is `@actionfinder`. You should see your existing publication dashboard.

---

## Four decisions to make first

These are the decisions that change downstream work. My recommendations are below; override any you disagree with.

### Decision 1 — Publication name

**Options:**
- **Field Notes** (recommended) — short, durable, names the content type, survives the founders. Reads in email as "Field Notes by Benjamin Knight"
- **Benjamin Knight** (keep current) — eponymous, founder-anchored. Less institutional, more personal.
- **A Curious Tractor** — explicitly institutional. Risks losing the founder-voice freshness.
- **What Communities Already Know** — strong editorial position. Long. Reads heavy in inboxes.

**My recommendation:** **Field Notes**, with author byline Benjamin Knight. Gives you both surfaces.

### Decision 2 — Custom domain

**Options:**
- Use Substack default URL (`actionfinder.substack.com`) — fine, works immediately, no setup
- Custom domain (recommended later, not blocking now) — `fieldnotes.acuriostractor.au` or similar

**My recommendation:** Launch on the default Substack URL. Add custom domain after launch when you have a buffer week. DNS setup takes 30 minutes plus 24-hour propagation. Don't block launch on it.

### Decision 3 — Paid tier

**Options:**
- Free only (recommended) — no paywall, no paid posts
- Free + paid tier — set up a paid tier for premium content

**My recommendation:** **Free only.** The paid product for ACT is commissioned foundation briefs (per the [[../../plans/2026-05-25-fy27-launch-operations-plan|FY27 ops plan]]), not subscription content. Substack stays public-good. Add a paid tier later if it makes sense.

### Decision 4 — Existing posts

**Options:**
- Keep them visible, un-sectioned — they live in the publication, don't trigger new emails, are accessible to old links
- Archive (Substack: set to "Drafts" or "Private") — removes from public view, preserves subscriber links
- Delete — never. Subscribers may have linked to them; 404s travel.

**My recommendation:** **Keep visible, un-sectioned.** New posts go into the four new sections. Old posts sit in the default flow. If any one post is severely off-direction (e.g. a personal post from years ago), individually archive that one.

---

## The setup sequence

### Step 1 — Rename the publication

**Substack path:** Dashboard → Settings → Basics → Publication name
**Enter:** `Field Notes`
**Save**

### Step 2 — Update the tagline

**Substack path:** Settings → Basics → Tagline
**Enter:**
```
Field notes from inside A Curious Tractor. The people, places, and quiet infrastructure that make community-led work hold.
```
**Save**

### Step 3 — Author byline + bio

**Substack path:** Settings → Basics → Author name (and bio field)

**Author name:** `Benjamin Knight`

**Short bio (under 200 chars):**
```
Co-founder, A Curious Tractor. Building civic accountability infrastructure with Nicholas Marchesi. Writing from Witta, Gubbi Gubbi Country.
```

**Save**

### Step 4 — Profile photo + logo

**Substack path:** Settings → Basics

- **Profile photo:** Use the same photo you use professionally. A photo of you (founder voice = founder face). 400x400 minimum.
- **Logo:** Optional. Keep blank or upload a simple wordmark. Substack works fine without one.
- **Cover image:** Skip for now. Add later when you have a designer-built header.

### Step 5 — Replace the About page

**Substack path:** Dashboard → Pages → About (or create one if it doesn't exist)

Paste in the content from `about-page.md` (the version drafted on 2026-05-25). Available at:
```
/Users/benknight/Code/act-global-infrastructure/thoughts/shared/writing/drafts/2026-05-25-substack-relaunch/about-page.md
```

Just the body of the About page (the "About page body" section), not the header metadata.

**Save**

### Step 6 — Create the four sections

**Substack path:** Settings → Sections → Add new section

Create each of the following. Each gets its own opt-in toggle for subscribers.

**Section 1**
- Name: `What Communities Already Know`
- Description (the public blurb subscribers see when choosing whether to opt in):
  ```
  Long-form essays. Monthly. The argument, the synthesis, what the work is teaching us across communities, places, and the infrastructure that holds it all together.
  ```
- Slug: `what-communities-already-know`

**Section 2**
- Name: `Field Notes from Elsewhere`
- Description:
  ```
  Dispatches from communities I'm visiting. Six weeks across Africa and Europe from late June to early August 2026, then occasional after.
  ```
- Slug: `field-notes-from-elsewhere`

**Section 3**
- Name: `State of Civic Money`
- Description:
  ```
  Quarterly data report drawn from CivicGraph. Funding deserts, revolving doors, and the cross-system patterns that get smoothed over in annual reports.
  ```
- Slug: `state-of-civic-money`

**Section 4**
- Name: `Receipts`
- Description:
  ```
  Short observations from across the work — the data, the places, the partners, the practice. Weekly when I'm in country. One chart, one number, one story, one decision worth naming.
  ```
- Slug: `receipts`

**For each section:** ensure "Subscribers can opt out of this section" is enabled. This is the load-bearing setting — it's what makes the four-stream structure work without forcing subscribers to read everything.

### Step 7 — Welcome email for new subscribers

**Substack path:** Settings → Emails → Welcome email

Paste:
```
Thanks for subscribing to Field Notes.

This is where I write about the work — A Curious Tractor, the civic accountability infrastructure we're building, what we're learning, and what we're getting wrong. I'm Benjamin Knight, co-founder, writing from Witta on Gubbi Gubbi Country.

Field Notes runs in four streams: long essays (What Communities Already Know), trip dispatches (Field Notes from Elsewhere), quarterly data drops (State of Civic Money), and weekly short observations (Receipts). You can adjust which streams you receive in your account settings.

The first post under this relaunch is on its way. After that, expect cadence: one or two posts per week, no daily emails, no upsells.

If you want to reach me, just reply to any email. I read everything.

Benjamin
```
**Save**

### Step 8 — Recommendations (free subscriber growth)

**Substack path:** Settings → Recommendations → Manage recommendations

Recommend 5-10 aligned publications. They get a notification, often reciprocate. Free distribution.

**Suggested starter list** (search each on Substack, hit "recommend"):
- Probono News (if they have a Substack)
- The Saturday Paper writers
- Crikey's INQ podcast newsletter (if Substack)
- Indigenous-led publications you respect — IndigenousX, Common Ground, anything similar
- Civic-tech voices — Code for Australia people, ThinkPlace alumni
- Aligned international voices — Centre for Public Impact, Casey Newton (Platformer) for AI-ethics adjacency
- Justice reform — Smart Justice for Young People, Justice Reform Initiative writers
- Philanthropy / sector — Philanthropy Australia News, Generosity Mag, Pro Bono News

Add 5-10 today, more over time. Don't recommend publications you don't actually read — readers spot it.

### Step 9 — Handle existing posts

**Substack path:** Dashboard → Posts → All posts

Scroll through your existing posts. For each:
- If it's still useful and aligned: leave it visible, un-sectioned. Old links keep working.
- If it's severely off-direction (e.g. a personal life post, a post about a different project): hit the three-dot menu → "Move to drafts." Removes from public view. Doesn't delete. Subscribers who had the email keep the email.

Spend 10 minutes max on this. Most posts can just stay.

### Step 10 — Enable Notes + cross-posting

**Substack path:** Settings → Cross-posting and Settings → Notes

- **Notes:** Already on by default. Use it for ultra-short observations (Twitter-like). One per day ideal during launch month.
- **LinkedIn cross-post:** Connect your LinkedIn → auto-share new posts. ON.
- **Twitter/X cross-post:** Connect if you still use X. Optional.
- **RSS feed:** Already on. Note the URL — you'll embed it into `acuriostractor.au` later.

### Step 11 — Subscribe widget for CivicGraph (the conversion engine)

**Substack path:** Settings → Embeds → Subscribe form

Copy the embed code. Then in the next session (or send to whoever handles CivicGraph frontend), add it to the bottom of:
- `apps/web/src/app/atlas/funding-deserts/page.tsx`
- `apps/web/src/app/atlas/funding-deserts/methodology/page.tsx`
- `apps/web/src/app/atlas/revolving-door/page.tsx`
- `apps/web/src/app/atlas/revolving-door/methodology/page.tsx`
- `apps/web/src/app/docs/api/page.tsx`

Tagline above the form: *"Field Notes — Benjamin Knight writes weekly on what CivicGraph reveals. Subscribe to the streams that fit."*

This is the subscriber engine. Every Atlas page view becomes a possible subscribe.

### Step 12 — Schedule the relaunch post

**Substack path:** New post → paste from `post-01-relaunch.md` → set section to "What Communities Already Know" → schedule

**Recommended publish time:** Tuesday morning, 7:00 AM Brisbane time (next week). Tuesday-Wednesday open rates outperform Friday-Sunday for newsletters in your audience profile.

**Before scheduling, double-check:**
- Section assigned: `What Communities Already Know`
- Subject line of email matches the post title: `Most AI is trying to become the CEO. We're building the civic cerebellum.`
- Preview text (first 100 chars of email): `I went quiet for four months. The last post here was 26 January. I'm coming back because the work A Curious Tractor has been doing...`
- "Send to all subscribers" enabled
- "Also publish on web" enabled

---

## Pre-launch checklist

Walk through this list before the relaunch post sends:

- [ ] Publication name reads "Field Notes" in the inbox preview
- [ ] Tagline is correct
- [ ] About page is updated (open it in incognito to confirm public view)
- [ ] Profile photo is a real photo of Benjamin Knight
- [ ] Four sections exist and each has its public description visible
- [ ] Welcome email is updated (test by creating a fake subscriber email — Substack lets you preview)
- [ ] At least 5 recommendations are set
- [ ] Existing posts have been triaged (most kept, any severely off-direction archived)
- [ ] Notes is active (publish one welcome Note — see template below)
- [ ] Subscribe widget code is captured for CivicGraph embed
- [ ] Relaunch post is scheduled for Tuesday 7am AEST next week
- [ ] Section assignment on the post is "What Communities Already Know"
- [ ] Subject line + preview text are correct

When all boxes are ticked, the publication is live.

---

## First Note to publish today (after setup is complete)

**Substack path:** Notes → New Note

Paste:
```
Field Notes is back. I went quiet for four months — the work A Curious Tractor was doing finally has a name and a shape, and it has a publishing rhythm I can hold to.

First long post lands Tuesday. Four streams, subscribe to whichever fit.
```

This is the public signal that the publication is live before the email lands. Old subscribers see it in their Substack feed. Future readers find it when they search.

---

## After-launch sequencing (the next 14 days)

Once the relaunch post sends Tuesday, here's the queue:

| When | What | From |
|---|---|---|
| Tuesday week 1 | Relaunch post lands | `post-01-relaunch.md` |
| Wednesday week 1 | First Receipt — Mount Magnet | `post-03-receipts-mount-magnet.md` |
| Tuesday week 2 | Pre-trip rationale post | `post-02-pre-trip-rationale.md` |
| Wednesday week 2 | Second Receipt — Halls Creek | `post-04-receipts-halls-creek.md` |
| Tuesday week 3 | Third Receipt — Carrathool | `post-05-receipts-carrathool.md` |

After week 3: you fly on 29 June. The Field Notes from Elsewhere section takes over.

By the time you fly, Field Notes has published five posts in three weeks, the four-section structure is established, the cadence is real, and any subscriber who arrives during the trip can see the publication is alive.

---

## What I can do next (after you've worked through this)

Tell me what got stuck, what worked, or what changed. Then we can:

- Iterate on any draft post you want sharper
- Draft additional Receipts as the Atlas data evolves
- Draft the September State of Civic Money launch post (the Philanthropy Australia anchor)
- Add subscribe widgets to JusticeHub Atlas + Empathy Ledger pages too (multiplies conversion surface area)
- Build a Substack-to-civic-OS feedback loop: which posts drive which traffic to which Atlas pages

But first, work through the playbook. The next move is in the Substack UI, not in this conversation.

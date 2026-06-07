---
title: Goods GHL Build — Step-by-Step Walkthrough (UI)
date: 2026-06-01
status: ready to follow (GHL UI)
companion: thoughts/shared/handoffs/2026-06-01-goods-ghl-build-sheet.md
---

# Goods GHL Build — do it in this order

> The code side is done (tags + 439 audience enrolments). This is every remaining **GHL-UI** step, click-by-click. Do them top to bottom. Where a label may differ on your plan, the guide says "look for X — it may be under Y". **External sends are Tier 3 — get your own explicit go before any campaign goes out.**

**Order & why:** Step 0 first (no opt-in = no sends) → Step 1 (fastest conversion win) → Step 2 (the funnels; Supporter first) → Steps 3–4 (lists + social) → Step 5 (re-points, anytime) → Adding people from other lists (ongoing).



---

## Step 0 — Re-opt-in capture (so sends can actually go out)

**Why this is first:** A tag puts someone in a *segment*, but the only signal that legally lets you email them is `newsletter_consent = true`. Right now only ~128 of 439 enrolled contacts have that. Until this step is done, the drip workflows in Step 2 will reach almost no one — buyers worst of all (2 of 48). This step builds the form that captures consent, the email that asks for it, and explains how a "yes" turns into a send-ready contact.

### Part 1 — Build the "stay in the loop" opt-in form

1. In the left sidebar go to **Sites** → **Forms** (on some plans it's **Sites** → **Forms** → **Builder**; look for "Forms" under Sites).
2. Click **+ Add Form** (or **Build Form** / **New Form** — the green/blue create button, top right).
3. Add these fields by dragging them from the right-hand field panel onto the form:
   - **First Name** (standard field)
   - **Email** (standard field — required)
   - A short checkbox or paragraph: *"Yes, keep me in the loop on the Goods story."* (Look for a **Checkbox** or **Terms & Conditions / Consent** field type — it may be under "Custom Fields" or "Quiz/Survey" depending on your plan.)
4. Set the consent custom field. Click the **Email** or checkbox field → in its settings on the right, look for **Custom Field** mapping. You want the submit to set `newsletter_consent` to `true`:
   - If `newsletter_consent` already exists as a custom field, map the checkbox to it (checked = true).
   - If it doesn't exist yet, go to **Settings** → **Custom Fields**, create one named **Newsletter Consent** (type: Checkbox or True/False), then come back and map it. (Look for "Custom Fields" — it may be under **Settings** → **Custom Fields** or **Settings** → **Business Profile** depending on plan.)
5. Stamp the tags + source on submit. With the form open, find **Settings** (gear icon on the form builder, usually top-right) → look for **On Submit**, **Actions**, or **Form Settings** → **Add Tag**. Add these tags to anyone who submits:
   - `comms:goods-newsletter`
   - `project:act-gd`
   - `source:opt-in-form` (this is your `source:` — name it for where the form lives, e.g. `source:reopt-in-2026-06`)
   - If the tag-on-submit option isn't on the form itself, you'll attach tags via a workflow instead (see Part 2, step 6) — that's normal and fine.
6. **Save**, then click **Integrate** / **Share** (top right) to get the form's public link and embed code. Copy the **link** — you'll paste it into the email in Part 2.
7. Confirm `newsletter_consent` is being written: submit the form yourself with a test email, then go **Contacts**, open that test contact, and check that the **Newsletter Consent** field shows true/checked and the three tags are present. If yes, the form works. Delete the test contact after.

### Part 2 — Build the re-permission email workflow

1. Go to **Automation** → **Workflows**.
2. Click **+ Create Workflow** → **Start from Scratch** (skip the recipe templates).
3. Name it **Goods · Re-opt-in campaign** (top-left title field). Save.
4. **Set who gets it.** Click **+ Add New Trigger** → choose **Contact Tag** (look for a trigger named "Contact Tag" / "Tag Added"). But for a one-time re-permission send to an *existing* list, the cleaner path is:
   - Build the audience as a **Smart List** first (next step), then bulk-add those contacts into this workflow. So leave the trigger as a manual one for now — set trigger to **Manual / Bulk Add** if available, or just save the workflow and you'll add contacts to it from the Smart List in step 7.
5. **Build the audience (who is enrolled but not consented), buyers + partners first.** Open a new tab → **Contacts** → **Smart Lists** → **+ New Smart List**. Add filters:
   - Tag **is** `comms:buyer-drip` **OR** tag **is** `comms:partner-drip` (use the OR / "any of" option so you lead with the two biggest opted-out gaps)
   - **AND** Newsletter Consent **is not** true (look for the `newsletter_consent` custom field in the filter list; if "is not true" isn't offered, use **is empty** / **is false**)
   - Save as **Goods · Re-opt-in — buyers+partners**. This is your priority send list. (Repeat later with `comms:funder-drip` / `comms:supporter-drip` for a second wave.)
6. **Write the email step.** Back in the workflow, click the **+** under the trigger → **Send Email**. Keep it short and plain:
   - Subject: *"Want to keep getting the Goods story?"*
   - Body: one paragraph — why you're asking, what they'll get (the real beats from the drip plan), and one button: **"Yes, keep me in the loop"** linking to the opt-in form from Part 1 step 6. (Run the copy through `act-brand-alignment` voice before sending — no "delve/crucial/pivotal", no em dashes.)
   - Add the form link as the button URL. Save the email step.
7. **Send to the priority list.** Open the **Goods · Re-opt-in — buyers+partners** Smart List → select all → look for **Add to Workflow** (bulk action button, top of the list) → choose **Goods · Re-opt-in campaign**. Confirm. The email goes to that segment only.
   - This is a Tier 3 external send — get Ben's explicit go-ahead before hitting send, and send to the buyers+partners list first, check results, then do funders+supporters.

### Part 3 — How a "yes" becomes send-ready

1. When someone clicks the button and submits the opt-in form, the form (Part 1) sets **`newsletter_consent = true`** and stamps `comms:goods-newsletter` + `project:act-gd` + `source:`.
2. That contact now passes the **`newsletter_consent = true`** filter that sits at the front of every drip workflow (Step 2 of the build sheet). From that moment they're send-ready and the funnels reach them automatically — no manual move needed.
3. **If the form can't set the tags directly** (some plans block tag-on-submit), add a tiny helper workflow: **Automation** → **Workflows** → new workflow → Trigger: **Form Submitted** = your opt-in form → Action: **Add Tag** (`comms:goods-newsletter`, `project:act-gd`) and **Add Contact Field** → `newsletter_consent = true`. This guarantees the consent flag is written even if the form mapping doesn't stick.
4. **Watch it climb.** Build one more Smart List — **Goods · Send-ready (all)** = `project:act-gd` **AND** `newsletter_consent = true` — and check its count over the days after the send. When it climbs past 128, the re-opt-in is working and the funnels in Step 2 have a real audience.

**Done when:** the opt-in form writes `newsletter_consent = true` + the three tags (verified with a test submit), the re-permission email has gone to the buyers+partners list, and the **Send-ready (all)** count is rising past 128.


---

## Step 1 — Fix the `/partner` form

**Goal:** Remove the "Roughly what size are you thinking?" question from the first step (it's friction at the worst moment). Move it to a stage-2 follow-up. Make sure every submission stamps the contact with `source:partner-form`, `project:act-gd`, `role:partner`, and the UTM tracking fields.

### First — figure out which kind of form this is

The `/partner` form on `goodsoncountry.com` is one of two things. Find out which before you change anything:

1. Open `goodsoncountry.com/partner` in your browser. Right-click on the form and choose **Inspect** (or just look at the page).
2. **Tell which one it is:**
   - If the page is **built in GHL** (you can find the same page under GHL → **Sites** → **Funnels** or **Sites** → **Websites**), it's a **GHL form**. Do **Path A**.
   - If `goodsoncountry.com` is a **separate website** (Webflow, Squarespace, WordPress, a custom site) and the form just *sends* data into GHL, it's a **site form posting to GHL**. Do **Path B**.
   - Not sure? Search GHL → **Sites** → **Forms** for a form named something like "Partner". If it's there and matches the live page, it's Path A. If nothing matches, it's Path B.

---

### Path A — if the form is a GHL form

1. In GHL, go to **Sites** → **Forms** (on some plans this is **Sites** → **Forms & Surveys**, or under **Marketing** → **Forms** — look for "Forms").
2. Find the partner form and click it to open the **form builder**.

**Remove the size question from step 1:**
3. Click on the **"Roughly what size are you thinking?"** field in the builder.
4. Delete it from this form — look for the trash/bin icon on the field, or drag it out. (Don't delete the underlying *field* from your account, just remove it from this form. If GHL asks "remove from form" vs "delete field," choose **remove from form**.)
5. Keep step 1 to the essentials only: name, email, phone, and a short "tell us about your group/idea" — nothing more.
6. Click **Save**, then **Publish** (or **Update**) so the live page changes.

**Stamp the contact on submit:**
7. Still in the form builder, open the form's **Settings** / **Options** (look for a gear icon or a "Settings" tab inside the builder).
8. Find **"Add Tag(s) on submit"** (may be called "Form Tags" or "Add Tags"). Add these three tags exactly:
   - `source:partner-form`
   - `project:act-gd`
   - `role:partner`
   
   If a tag doesn't exist yet, type it and GHL will offer to create it. You can also pre-create them under **Settings** → **Tags**.
9. **UTMs:** GHL captures UTMs automatically when the form loads on a page that has `?utm_source=...` in the URL — they land on the contact's **Attribution** section, no setup needed. To be safe, confirm there's nothing *stripping* the query string: in the form/funnel page settings, leave "Pass UTM params" / tracking **on** if you see such a toggle.
10. Save and publish.

---

### Path B — if it's a site form posting to GHL

This means the website is hosted elsewhere and the form's data arrives in GHL via an **inbound webhook** or an embedded GHL form. Two cases:

**B1 — the site embeds a GHL form (an iframe / GHL embed code):**
- This is really Path A in disguise. Find the matching form in GHL → **Sites** → **Forms**, and do **all of Path A steps 3–10** there. The website automatically shows whatever you publish.

**B2 — the site has its own native form posting into GHL (webhook/Zapier/Make):**

You can't edit the website's fields from inside GHL — that's done in the website's own editor (Webflow/Squarespace/etc.). So split the work:

1. **Remove the size question on the website** (this is website work, not GHL):
   - Open the site's editor, find the `/partner` page, click the form, and delete the **"Roughly what size are you thinking?"** field. Publish the site.
   - If you don't manage that site, send whoever does this one line: *"On /partner, please remove the 'Roughly what size are you thinking?' field from the form — keep name, email, phone, and the short message field only."*

2. **Stamp the contact in GHL using a workflow** (since the form isn't a GHL form, do the tagging in automation):
   - GHL → **Automation** → **Workflows** → **Create Workflow**.
   - **Trigger:** look for **"Inbound Webhook"** if the site posts to a webhook, **or** **"Form Submitted"** if it's actually a GHL form after all. (The trigger name varies by plan — look for the one that matches how the data arrives.)
   - Add a **Create/Update Contact** step if needed so the person becomes a contact.
   - Add an **Add Contact Tag** action with the three tags:
     - `source:partner-form`
     - `project:act-gd`
     - `role:partner`
   - **Save** and toggle the workflow to **Publish** (top-right).

3. **UTMs (site-form case):** UTMs only reach GHL if the website *passes them through*. In the website form, make sure there are hidden fields for `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` that map to GHL's matching fields, and that the form/webhook sends them. If your site can't do that, at minimum capture the **referring URL** as a fallback. (This is the one part a non-GHL site can quietly drop — worth a specific check.)

---

### Step 2 — make the size question a stage-2 follow-up

The size question doesn't disappear; it just moves to *after* they've committed.

1. In GHL → **Automation** → **Workflows**, open (or create) the workflow that fires when a partner submits — trigger **Contact Tag added = `role:partner`** (or the form-submitted trigger from above).
2. Add a short **Wait** step (e.g. 5–15 minutes, or "wait until next morning" — your call).
3. Add an **Email** (or SMS) step that thanks them and asks the size question, linking to a tiny **stage-2 form** — build that small form in **Sites** → **Forms** with just the one field: "Roughly what size are you thinking?". Stamp it `source:partner-form-stage2` so you can tell stage-1 from stage-2 later.
4. **Save** and **Publish** the workflow.

This way step 1 stays a 3-field, low-friction ask, and you only ask about size once someone's already raised their hand.

---

### Done when

- The live `goodsoncountry.com/partner` form no longer shows the size question on the first step.
- A test submission creates a contact tagged `source:partner-form`, `project:act-gd`, and `role:partner` (check the contact's tags in GHL → **Contacts**).
- A test submission with `?utm_source=test` in the URL shows that source on the contact's **Attribution**.
- The size question now arrives as a stage-2 follow-up, not on first submit.

**Tip:** Do one real test submission yourself before calling it done — open the live page with `?utm_source=test&utm_medium=manual` on the end of the URL, fill it in, then open that new contact in GHL and confirm all three tags plus the attribution landed.


---

## Step 2 — Build the 4 drip workflows (GHL → Automation → Workflows)

You're in the GHL UI now. Build SUPPORTER first (70 send-ready — biggest live audience), then Funder, Partner, Buyer. Build the template once, then copy it and swap the touches for each variant.

### 2.0 — Before you start (read once)

- **Pipeline mapping (the corrected one).** Funders, Supporters, Partners all land in **Goods Supporter Journey**. Only Buyers go to **Goods — Buyer Pipeline**. (The old plan said Demand Register for funders — ignore that; the plan's stage names like "Demand Register · Qualified" should be read as the matching Supporter Journey stage.)
- **Consent is the send signal, not the tag.** A `comms:<audience>-drip` tag means "in this segment". The only thing that lets an email actually go out is `newsletter_consent = true`. That's why every workflow has a consent filter near the top.
- **Content is cleared.** Utopia-trip content is consent-cleared, so every Track-B touch is buildable now. **Keep four people un-named** in any email copy until spellings are verified: the **two Ampilatwatja OAM Elders**, **Frank & Casey Holmes**, **Dianne Stokes**, **Norman Frank**. Mykel, Kristy, Tanya, Cliff Plummer are verified and can be named.

---

### 2.1 — The reusable template (build this once)

1. Go to **Automation → Workflows** in the left sidebar (on some plans it's **Automation** then a **Workflows** tab at the top).
2. Click **Create Workflow** → **Start from Scratch**. Name it `Goods · Supporter Drip` (we're building Supporter first).
3. **Add the trigger.** Click **Add New Trigger** (or the **+** at the top of the canvas).
   - Choose **Contact Tag** (look for it under a "Contact" trigger group — it may be labelled **Contact Tag Updated** or **Tag Added** depending on plan).
   - Set the filter to **Tag added** = `comms:supporter-drip`. Save the trigger.
4. **Add the de-dup guard (do this on every workflow — see 2.2 below).** Click the **+** under the trigger → **If/Else**.
   - Branch condition: **Contact Tag** **is** `comms:drip-active`.
   - **YES branch** (they already have it → they're being emailed by another drip): drop an **End this workflow** action here. This stops a funder+partner contact getting two drips at once.
   - **NO branch**: this is the path everyone flows down. Right after entering it, add an **Add Contact Tag** action = `comms:drip-active` so the next drip they're enrolled in will skip them.
5. **Add the consent gate.** On the NO branch, add another **If/Else**.
   - Condition: **Contact** field `newsletter_consent` **is** `true` (if you can't find the custom field as a branch condition, look for **Email Opt-Out is `false`** / **DND Email is off** — same effect: don't email people who haven't opted in).
   - **NO branch**: **End this workflow** (they stay in the segment; the Step 0 re-opt-in campaign will reach them separately — don't email them here).
   - **YES branch**: this is where the email sequence lives.
6. **Build the email steps** on the consent-YES branch. For each touch in the audience's table:
   - Add a **Send Email** action. Click into it, give it the touch's subject, and paste the body (drafted from that row's "Story beat" + "Usable thing" — you're not writing them here, the agent/intern fills copy from the plan).
   - After each email, add a **Wait** action set to **7 days** (`≈1/week`). The first email can fire immediately or after a 1-day wait — your call.
   - Repeat: Email → Wait → Email → Wait … through all the touches for that audience.
7. **The ask step (stage move).** At the final/ask touch (the row tagged `comms:<audience>-ask`):
   - Add the **Send Email** for the ask.
   - Immediately after it, add an **Update Opportunity** action (look for **Create/Update Opportunity**). Set the pipeline + stage per the variant below, and add the **Add Contact Tag** = `comms:<audience>-ask` so you can see who's been asked.
8. **At the very end of the sequence**, add **Remove Contact Tag** = `comms:drip-active`. This releases them so a *future* campaign can re-enrol them. (Without this they'd be locked out of every drip forever.)
9. **Settings tab (top of the workflow):** set **Re-Entry** to **OFF** (a contact shouldn't restart this drip if the tag is re-added), and set a sensible **sending window** if you have one (e.g. weekdays 9am–5pm) so emails don't fire at 2am.
10. **Save**, then flip the toggle at top-right from **Draft** to **Publish** only when the copy is in. Leave it Draft while you're still pasting emails.

---

### 2.2 — The de-dup rule (why step 2.1.4 exists)

A contact can be in two audiences — e.g. **funder + partner** (229 partners, lots of overlap with funders). Without a guard they'd get **two emails a week from two drips**. The guard in 2.1.4 fixes it:

- First drip a contact enters: no `comms:drip-active` tag yet → they pass the guard, get tagged `comms:drip-active`, and run.
- Any second drip they're enrolled in: they already carry `comms:drip-active` → the If/Else sends them straight to **End this workflow**. They quietly wait.
- When the first drip finishes, step 2.1.8 removes `comms:drip-active`. They're now free to be enrolled in the second drip later (re-add its `comms:<audience>-drip` tag to pull them in).

Build this same guard into **all four** workflows. It's the same three nodes every time.

---

### 2.3 — The four variants (copy the template, swap the touches)

To make a variant: open the Supporter workflow → top-right **⋯ → Clone** (or **Save as** / **Duplicate**), rename it, change the trigger tag, swap the email steps, and set the ask-step pipeline/stage. Everything else (de-dup guard, consent gate, waits, end-tag removal) stays identical.

Don't rewrite the emails here — pull each touch's beat + usable thing from the plan's §B table by row.

**SUPPORTER — build first.** `plans/2026-06-01-goods-drip-feed-content-plan.md` §B3.
- Trigger tag: `comms:supporter-drip` · 70 send-ready · **7 touches** (Wk 1–7).
- Pipeline: **Goods Supporter Journey**. Stage moves track the table's Journey column (Subscribed → Nurtured → Engaged → Engaged → Activated → Activated → **Ask made**).
- Ask step = Wk 7 (`comms:supporter-ask`) → move opp to **Ask made**.
- Note: Wk 5 + Wk 6 are the Mykel beats. Mykel is now consent-cleared (Utopia approval) — buildable. If anything about youth protocol is still open when you build, use the §B3 "safe substitute" rows (`'not charity as handout'` / `'love solutions as fiercely as we hate problems'`) so the funnel never runs empty.

**FUNDER.** §B1.
- Trigger tag: `comms:funder-drip` · 24 send-ready · **8 touches** (Wk 1–8).
- Pipeline: **Goods Supporter Journey** (NOT Demand Register — corrected). Read the table's "Demand Register · X" stages as the Supporter Journey equivalents: Identified → Qualified → Cultivating → **Ask made**.
- Ask step = Wk 8 (`comms:funder-ask`) → move opp to **Ask made**.
- Guard at send: Wk 4 trip numbers and any all-time bed count must be reconciled before the email goes live — use the trip-scoped figure (87 this trip), not an all-time total.

**PARTNER.** §B4.
- Trigger tag: `comms:partner-drip` · 32 send-ready · **6 touches** (Wk 1–6).
- Pipeline: **Goods Supporter Journey** (partner lane). Stage moves: Identified → Engaged → Engaged → Qualified → Qualified → **Co-design talk / Ask made**.
- Ask step = Wk 6 (`comms:partner-ask`) → move opp to the ask stage.
- Note: Wk 6 names Kristy Bloomfield & Oonchiumpa (verified, buildable). The draft board slate / un-verified people stay un-named — if board sign-off isn't done, use the §B4 safe substitute ("Three-engine operating model" + "a bed is not just furniture").

**BUYER — build last.** §B2.
- Trigger tag: `comms:buyer-drip` · **only 2 send-ready ⚠** · **6 touches** (Wk 1–6).
- Pipeline: **Goods — Buyer Pipeline** (the only audience NOT on Supporter Journey). Stage moves: Lead → Engaged → Engaged → Qualified → Quote → **Order**.
- Ask step = Wk 6 (`comms:buyer-ask`) → move opp to **Order**.
- Reality check: with only 2 opted-in, this workflow has almost nobody to send to until Step 0's re-opt-in campaign converts the other 46. Build it now so it's ready, but expect it to sit near-empty until buyers re-permission.

---

### 2.4 — Done when

- [ ] `Goods · Supporter Drip` built, copy pasted, **Published** (live first).
- [ ] Funder / Partner / Buyer cloned from it, trigger tags + email steps + ask-stage swapped, saved as Draft until copy is in.
- [ ] All four carry the `comms:drip-active` de-dup guard (2.1.4 + 2.1.8).
- [ ] All four carry the `newsletter_consent` gate (2.1.5).
- [ ] Funders/Supporters/Partners point at **Goods Supporter Journey**; Buyers at **Goods — Buyer Pipeline**.
- [ ] No un-verified name appears in any email body (the four un-named people stay un-named).


---

## Step 3 — Smart Lists (one saved view per audience)

A Smart List is just a saved filter over your contacts — you build it once, and it always shows the live set of people who match. You'll make four: Funders, Supporters, Buyers, Partners. Each one shows only the people in that audience who are legally OK to email (`newsletter_consent = true`).

1. In the left sidebar, click **Contacts**. At the top you'll see tabs — click **Smart Lists** (on some plans the contact list itself is the Smart Lists area; look for a **"+ Add Smart List"** or **"More Filters"** button near the top right).
2. Click **More Filters** (or **Advanced Filters**) to open the filter panel on the right.
3. Add the first filter — **Tags**:
   - Field: **Tags** → condition **is one of** (or **contains**) → value **`role:funder`**.
4. Click **+ Add Filter** and add the second — **Tags** again:
   - Field: **Tags** → **is one of** → value **`project:act-gd`**.
   - Make sure the join between filters reads **AND**, not OR (look for an AND/OR toggle between the rows — it may say "Match ALL" vs "Match ANY"; pick **Match ALL**).
5. Click **+ Add Filter** for the third — the consent gate:
   - Look for a field named **Newsletter Consent** (it's a custom field, so it may appear under a **Custom Fields** group in the field dropdown rather than the top of the list). Condition **is** → value **`true`** (or the checkbox **checked**).
   - If you can't find a `newsletter_consent` field, use GHL's built-in **Email opt-in / DND Email = Off** filter instead — that's the same legal signal.
6. Click **Apply** (or **Search**). The contact count at the top updates — sanity-check it roughly matches the "send-ready" number for funders (~24).
7. Click **Save as Smart List** (button is usually top-right, near the filter panel). Name it exactly **`Goods · Funders (send-ready)`** and save.
8. Repeat steps 2–7 three more times, changing only the `role:` value and the name:
   - `role:supporter` → name **`Goods · Supporters (send-ready)`** (expect ~70).
   - `role:buyer` → name **`Goods · Buyers (send-ready)`** (expect ~2 — this is the one to grow via the re-opt-in campaign).
   - `role:partner` → name **`Goods · Partners (send-ready)`** (expect ~32).
9. You now have four saved lists. To use one later, open **Contacts → Smart Lists** and click its name — it recomputes live, so as people opt in the lists grow on their own. These four are what you point newsletters and social targeting at.

> Tip: if a count looks wildly off, open the list and spot-check one or two contacts — confirm they actually carry both the `role:` and `project:act-gd` tags. A zero usually means the AND/OR toggle flipped to OR, or the tag value was typed with a wrong colon/spacing.

## Step 4 — Social Planner (schedule all Goods social from one place)

The Social Planner connects your social accounts to GHL so you write, schedule, and queue every Goods post in one calendar instead of jumping between apps. The agent drafts the posts; the intern loads and schedules them here.

1. In the left sidebar, click **Marketing**, then **Social Planner** (on some plans it's a top-level **Social Planner** item, or sits under **Marketing → Social**).
2. First time in, you'll see a **Connect / Add Account** prompt (or a gear/settings icon, top-right → **Connected Accounts**). Click **+ Add Account** (sometimes labelled **Connect a channel** or **Integrations**).
3. Connect each Goods channel one at a time. For each, GHL pops open that platform's login/permission window — log in with the **Goods** account (not your personal one) and click **Allow / Authorize**:
   - **Facebook Page** — you'll pick which Page to link; choose the Goods page.
   - **Instagram** — must be a Business/Creator account and linked to the Facebook Page; if Instagram doesn't appear, connect the Facebook Page first, then come back.
   - **LinkedIn** — choose the Goods company page if you post as the org, not your personal profile.
   - Add any others you use (TikTok, Google Business Profile, X/Twitter) — look for them in the same Add Account list; availability varies by plan.
4. After each connect, the channel shows as a coloured icon in the planner with a green/connected status. If one says **Expired** or **Reconnect** later, that's normal — social platforms drop the link every ~60–90 days; just click **Reconnect**.
5. Schedule a test post to confirm it works end to end:
   - Click **+ Create Post** (or **New Post**), top-right.
   - Tick the channel(s) you want it on, type a short caption, attach an image.
   - Use the **calendar / clock** control to **Schedule** for a future time (don't hit Post Now for the test unless you're happy for it to go live).
   - Save — it appears as a block on the planner calendar. You can drag it to a new time or click to edit.
6. Set your **timezone** once so scheduled times are correct — look in the Social Planner **settings/gear** (it may inherit from the location timezone under **Settings → Business Profile**; check it reads Australian time before scheduling real posts).
7. Day-to-day flow: the agent hands the intern the week's drafts (same story beats as the drip emails, repurposed per channel); the intern opens **Marketing → Social Planner**, creates each post, ticks the right channels, and schedules across the week. Everything lives on the one calendar.

> Note: GHL can post to most channels automatically, but **Instagram personal accounts and some TikTok setups** sometimes require a phone push notification to finish posting — if a post sits as "pending", check whether that channel needs the GHL mobile app to confirm. Business/Creator accounts avoid this.


---

## Step 5 — Re-point the 26 workflows + clean drafts

This is a manual job in the GHL website. The GHL API can't read or change a workflow's trigger, so you do it by hand. Don't worry — nothing breaks while you work: every workflow still has its old tag *and* the new canonical tag side by side, so they all keep firing. You're just switching each one over to the new tag, one at a time, at your own pace.

Full list of all 26 workflows (with the exact old tag and new tag for each row) lives in the checklist file — keep it open beside you:
`/Users/benknight/Code/act-global-infrastructure/thoughts/shared/handoffs/2026-06-01-ghl-workflow-migration-checklist.md`

The work splits into four buckets: **delete 4 empty drafts**, **re-point 14 tag-triggered workflows**, **publish the Contained draft** (it's one of the 14), and leave the other 8 alone (5 form/payment + 3 system). Do them in the order below.

### Before you start: open the Workflows screen

1. Log in to GHL. Make sure you're in the right location/sub-account (the account name should be **ACT** / location `agzsSZWgovjwgpcoASWG`).
2. In the left sidebar go to **Automation** (it may be labelled **Automations** on some plans). Click it, then click **Workflows**. You'll see the full list of all 26 workflows.

### Part A — Delete the 4 empty drafts FIRST

Do these first so the list is shorter and you don't accidentally re-point a junk stub. They're named like `New Workflow : 1767654441340` (a name followed by a long number) — there are 4 of them, all empty.

3. Find a workflow named `New Workflow : <long number>` in the list.
4. On the right end of its row, click the **three-dot menu** (⋯) — look for it at the end of the row; on some versions it may be a small **Actions** button instead.
5. Click **Delete**. Confirm if it asks "Are you sure?".
6. Repeat for all **4** stubs (the exact 4 numbers are in section **D** of the checklist file). When done, those 4 are gone.

### Part B — Re-point the 14 tag-triggered workflows

This is the core of the job. For each of the 14 workflows in section **A** of the checklist, you change which tag sets it off. The pattern is the same 5 clicks every time:

7. **Open** — in the Workflows list, click the workflow's name to open it in the builder.
8. **Trigger** — at the top of the flow you'll see the starting box labelled **Trigger** (it usually says something like "Contact Tag"). Click that box to open its settings on the right.
9. **Change the tag** — find the **Contact Tag** filter inside the trigger. Remove the old tag (click the small **x** on the tag chip) and type/select the new canonical tag from the checklist's "Re-point to" column for that row. Where a row says "(+ ensure `project:...`)", add that second tag too — there's usually an **+ Add** or **Add filter** option to include more than one tag.
10. **Save** — click **Save** (top-right of the trigger panel, sometimes a tick/checkmark).
11. **Publish** — flip the **Publish** toggle (top-right of the builder) to ON / green, or click **Save** then **Publish** if your version shows a separate button. A workflow only fires live once it's **Published** — a saved-but-draft change does nothing.

Then go back to the list and do the next one. Tick the box in the checklist as you go.

**Two cautions for Part B:**

- **Newsletter Signup — verify its real trigger before you touch it.** This is the subscription gate, and it may actually fire from a **form** rather than from a tag. Open it, look at the trigger box: if it says "Form Submitted" (not "Contact Tag"), do **not** change the trigger — instead leave it and make sure the form adds the `comms:newsletter` tag. Only re-point the tag if the trigger genuinely is a Contact Tag. When in doubt, stop and check with someone before changing it.
- A few rows are one-off event workflows (Locals Day, EOI Gathering). The checklist notes they're "fine to leave if one-off" — your call; re-pointing them is harmless but optional.

### Part C — Publish the Contained draft (last of the 14)

The **Contained launch 2025** workflow is currently a *draft* — it's the CONTAINED journey, and it needs finishing, not just re-pointing. Do it last.

12. Open **Contained launch 2025** from the list.
13. Set its trigger to the two tags from the checklist: `project:act-jh` **and** `interest:justice-reform` (same Trigger → Contact Tag → add both → Save flow as above).
14. Skim the rest of the steps in the builder to make sure the journey is complete (it was left unfinished).
15. **Publish** it (toggle to ON / green). Because it's a draft, publishing is what actually turns it on for the first time.

### Leave these alone (no action)

- The **5** form/payment/date workflows in section **B** (Contact Form, Donor, New Order, Grant Deadline, etc.) — their triggers stay as-is. (Making their forms *stamp* the new tags is a separate later step, not Step 5.)
- The **3** system workflows in section **C** (Gmail→Contact, the two Supabase syncs) — never touch these.

### When you're done

You should have: 4 drafts deleted, 14 workflows re-pointed and published (including Contained), 8 left untouched. Tick every box in the checklist file. That's Step 5 complete — the old tags can't be deleted yet (that's the later destructive Phase 3, which needs an explicit go-ahead).

> Tip: in GHL, a tag the workflow points at must already exist before you can select it. The EXPAND step already created all the canonical tags, so they'll show up when you start typing. If a tag doesn't appear, you can see/manage the full tag list under **Settings → Tags**.


---

## Adding People Who Came From Other Lists

Sometimes you'll have contacts that already exist in GHL — imported from an old spreadsheet, brought in from another project's list, or sitting in a Smart List from a previous campaign. You want to add some of them to a Goods audience (and its drip). Here are three ways to do it, from "lots of people at once" to "a precise handful."

> **Read this first — consent is not a tag.** Adding a tag puts someone in a *segment*. It does NOT mean they've agreed to hear from you. Anyone who came from an imported or borrowed list is treated as **not opted-in**. They must pass through the **Step-0 re-opt-in** (the permission-ask) before they receive any real Goods email. A tag is a segment, not consent — never skip Step-0 for imported contacts.

### Method 1 — BULK IMPORT (a whole CSV at once)

Use this when someone hands you a spreadsheet of people to bring in.

1. Tidy your CSV first: one row per person, with clear column headers (at minimum `Email`; ideally `First Name`, `Last Name`, `Phone`).
2. In GHL, go to **Contacts** (left sidebar) → look for the **Import** button (top-right of the Contacts list — it may sit under a **"⋯ / More"** menu depending on your plan).
3. Upload your CSV and **map the columns** — match each spreadsheet column to a GHL field (Email → Email, etc.). Leave anything you don't need unmapped.
4. Find the **"Add Tag" / "Apply tags to imported contacts"** step (usually near the end of the import wizard). Add these three tags so people land in the right place automatically:
   - `project:act-gd` — marks them as Goods
   - `role:<x>` — their role, e.g. `role:supporter`, `role:buyer`, `role:demand-signal`
   - `comms:<audience>-drip` — the audience drip, e.g. `comms:supporter-drip`
5. Finish the import. Anyone with the `comms:<audience>-drip` tag will be **enrolled on arrival**, because the drip workflow is triggered by that tag.
6. **Because they're imported, the drip's Step-0 re-opt-in handles consent for you** — they get the permission-ask first, and only continue if they say yes. Do not bulk-send to them outside the drip.

> Tip: if your list mixes roles (some buyers, some supporters), either split it into separate CSVs per role, or import once with just `project:act-gd` and assign the role/drip tags per group afterwards using Method 2.

### Method 2 — AD-HOC from a Smart List (a chosen few)

Use this when the people already exist in GHL and you want to hand-pick who joins.

1. Go to **Contacts** → **Smart Lists** (the tabs across the top of the Contacts view).
2. Open the list they're in, or use **filters** (look for **"More Filters"** / the filter icon) to narrow to the people you want — e.g. filter by an old tag, a source, or a date added.
3. **Tick the checkboxes** next to each contact you want (or the select-all box at the top to grab the whole filtered view).
4. A **bulk-actions bar** appears (usually along the top). Choose **"Add Tag"** (it may be under a **"⋯ / More actions"** menu).
5. Add the tag `comms:<audience>-drip` (e.g. `comms:supporter-drip`). If they're brand new to Goods, also add `project:act-gd` and the matching `role:<x>`.
6. Confirm. Tagging them fires the drip's enrolment trigger, and **Step-0 re-opt-in runs first** before any real send — so consent is still handled.

> You can manage the master tag list under **Settings → Tags** if you want to check exact tag spelling before applying — tag names must match the drip trigger exactly or enrolment won't fire.

### Method 3 — PROGRAMMATIC (paste a list of emails)

Use this when you have a plain list of email addresses and don't want to hand-tick them in the UI.

- ACT already has a helper script, **`scripts/enroll-goods-audiences.mjs`**, that enrols Goods contacts into an audience **by role** — it finds the matching contacts and applies the right `comms:<audience>-drip` tag for you.
- A **"by email list" mode can be added** to that script: you'd paste (or point it at a file of) email addresses, pick the target audience, and it would tag exactly those people for the drip. Ask an engineer to add this mode when you need it — it's a small addition, not a new system.
- The same consent rule applies end-to-end: the script only **tags** people (puts them in the segment). The drip's **Step-0 re-opt-in** is still what earns permission before any real Goods email goes out.

> **One rule across all three methods:** tagging enrols, the drip asks permission first. No imported contact receives a real Goods send until they've said yes at Step-0. If you're ever unsure whether someone opted in, assume they didn't — let the drip do the asking.

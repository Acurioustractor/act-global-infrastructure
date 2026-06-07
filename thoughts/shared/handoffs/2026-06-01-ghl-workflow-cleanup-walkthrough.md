---
title: GHL Workflow Cleanup — Walkthrough (all 26)
date: 2026-06-01
status: ready to follow (GHL UI)
companion: thoughts/shared/handoffs/2026-06-01-ghl-workflow-migration-checklist.md
---

# Clean up all 26 GHL workflows — in this order

> Order: **delete the 4 empty drafts + publish Contained** → **re-point the 13 tag-triggered** → **forms (no trigger change, add tags)** → **leave the 3 system ones**. The API can't read triggers, so every "current trigger" is INFERRED — open each and confirm before changing. Tags were migrated additively, so re-pointing breaks nothing; old tags retire only after their workflow is re-pointed.


---

I have everything I need. The handoff already has the structure and the inferred triggers. The task asks me to write the **DELETE / PUBLISH DRAFTS** section as a founder-friendly card-based section for the 4 empty drafts (delete) plus "Contained launch 2025" (finish + publish).

## DELETE / PUBLISH DRAFTS

> These 5 are all **drafts** (never published, so none of them are firing). Four are empty stubs to delete; one is a real journey to finish and turn on. The API can't read a workflow's trigger, so where I say "current trigger" below it's a **guess from the name** — ⚠ open it and look before you change anything.
>
> **Where to find them:** left sidebar → **Automation** → **Workflows** → the list shows a **Status** column (Draft / Published). All 5 below say *Draft*.

### Delete the 4 empty stubs

These are auto-created blank workflows GHL leaves behind (the number is just a timestamp). Confirm-then-delete each — same 3 clicks every time:

1. Open the workflow.
2. Look at the canvas: you should see only a greyed **"Add New Trigger"** box and an empty **"+"** below it — **no** trigger set, **no** action steps. That = empty.
3. Back to the Workflows list → click the **⋮** (three dots) on that row → **Delete** → confirm.

> ⚠ If a card has *any* trigger or *any* action step on the canvas, **stop** — it's not a stub. Leave it and flag it to me.

| ✓ | Workflow | Confirm empty, then delete |
|---|---|---|
| ☐ | New Workflow : 1767654441340 | open → canvas blank → ⋮ → Delete |
| ☐ | New Workflow : 1768162771389 | open → canvas blank → ⋮ → Delete |
| ☐ | New Workflow : 1768162803581 | open → canvas blank → ⋮ → Delete |
| ☐ | New Workflow : 1770418806176 | open → canvas blank → ⋮ → Delete |

### Finish + publish — do NOT delete

**Contained launch 2025** — *(inferred current trigger: Contact Tag = `contained`)* → **re-point its trigger, then Publish** → this is the CONTAINED justice-reform journey; it just never got switched on.

- Open **Contained launch 2025**.
- Click the **Trigger** box at the top of the canvas (likely **"Contact Tag"** — may show as **"Contact Tag Added"**). ⚠ Confirm it really is the `contained` tag before touching it.
- Change the tag value from `contained` to **`project:act-jh`**. (Field is usually labelled **"Tags"** or **"Add filters" → "Tag"** — pick the new tag from the dropdown.)
- Add a **second** trigger condition for **`interest:justice-reform`** — click **"+ Add filters"** (or **"+"** under the trigger) and select that tag. Both should be present.
- Click **Save** (top-right).
- Toggle the top-right status from **Draft → Publish** (the switch / **"Publish"** button beside Save). The list Status column should now read **Published**.

> ⚠ Re-pointing is safe: the old `contained` tag is still on every contact (tags were migrated *additively*), so nothing else breaks. The old `contained` tag only becomes a Phase-3 deletion candidate *after* this workflow is published on its new trigger.

File: `/Users/benknight/Code/act-global-infrastructure/thoughts/shared/handoffs/2026-06-01-ghl-workflow-migration-checklist.md` (this section replaces/expands the existing `## D. DRAFTS — delete (4)` block at lines 54-61, which omits the "Contained launch 2025" publish path).


---

Both files are read. The handoff section A lists 14 workflows including CONTAINED (a draft, not in the task's ~13). The task names exactly 13 tag-triggered workflows to write cards for. I'll write a card for each of those 13, flag Newsletter Signup, and note the inferred-trigger caveat.

## RE-POINT (tag-triggered)

> ⚠ **Read first.** GHL's API cannot read a workflow's trigger (`GET /workflows/{id}` returns 404), so every *"current trigger"* below is **inferred from the workflow name + the tag inventory** — not confirmed. **Open each workflow in the builder and confirm the trigger tag matches what's shown here BEFORE you change it.** If it doesn't match, stop and check with whoever set it up.
>
> **Nothing breaks if you go slow.** The new (canonical) tags were added *alongside* the old ones, so every workflow still fires today. An old tag only retires *after* its workflow has been re-pointed. Re-point one at a time, at your pace.
>
> **The 5 clicks, every time:** `Automation` → `Workflows` → open the workflow → click the **Trigger** card at the top → swap the tag → **Save** → **Publish**. (Save alone doesn't go live — you must Publish.)

---

**Goods Inquiry → Acknowledge** — *(inferred current trigger: tag `goods-inquiry`)*
→ **ACTION:** re-point to `source:inquiry`, and make sure the contact also gets `project:act-gd`.
→ Automation → Workflows → open *Goods Inquiry → Acknowledge* → **Trigger** → it should read "Contact Tag = `goods-inquiry`" → change the tag to `source:inquiry` → **Save** → **Publish**.
→ This is the core Goods intake acknowledgement, so test it with one dummy contact afterwards.

---

**Goods media form submission** — *(inferred current trigger: a **form submit**, not a tag — possibly also tag `goods-media`)*
→ **ACTION:** ⚠ **leave the trigger alone.** Instead make the workflow *add* `role:media` and `project:act-gd`.
→ Automation → Workflows → open *Goods media form submission* → confirm the trigger is "Form Submitted" (look for **Form Submitted** — may be labelled **Customer Replied** or **Form/Survey Submitted**) → do **not** change it → in the workflow steps, find or add an **Add Contact Tag** action → set it to add `role:media` and `project:act-gd` → **Save** → **Publish**.

---

**Harvest - Member Welcome** — *(inferred current trigger: tag `harvest-member`)*
→ **ACTION:** re-point to `role:member`, and ensure the contact also gets `project:act-hv`.
→ Automation → Workflows → open *Harvest - Member Welcome* → **Trigger** → should read "Contact Tag = `harvest-member`" → change to `role:member` → **Save** → **Publish**.

---

**Harvest - Member Question Receipt** — *(inferred current trigger: tag `member-question`)*
→ **ACTION:** re-point to `role:member`.
→ Automation → Workflows → open *Harvest - Member Question Receipt* → **Trigger** → should read "Contact Tag = `member-question`" → change to `role:member` → **Save** → **Publish**.

---

**Harvest - Follow Welcome** — *(inferred current trigger: a general Harvest signup tag — unclear which)*
→ **ACTION:** ⚠ re-point to `project:act-hv` — but first **confirm in the builder what tag fires this and how it differs from *Member Welcome*** (they may overlap).
→ Automation → Workflows → open *Harvest - Follow Welcome* → **Trigger** → read the current tag and note it → if it's a Harvest-signup tag, change to `project:act-hv` → **Save** → **Publish**.

---

**Harvest - Shop Interest Receipt** — *(inferred current trigger: tag `harvest-shop-interest`)*
→ **ACTION:** re-point to `interest:shop`.
→ Automation → Workflows → open *Harvest - Shop Interest Receipt* → **Trigger** → should read "Contact Tag = `harvest-shop-interest`" → change to `interest:shop` → **Save** → **Publish**.

---

**Shop prospect → create card** — *(inferred current trigger: tag `shop-prospect`)*
→ **ACTION:** re-point to `interest:shop`. This workflow also creates a card in the Shop pipeline — leave that step untouched.
→ Automation → Workflows → open *Shop prospect → create card* → **Trigger** → should read "Contact Tag = `shop-prospect`" → change to `interest:shop` → leave the "Create Opportunity" step as-is → **Save** → **Publish**.

---

**Harvest Locals Day** — *(inferred current trigger: tag `locals-day-march-2026`)*
→ **ACTION:** re-point to `source:event:locals-day-2026`. (Event-specific and one-off — fine to leave as-is if you'd rather not touch it.)
→ Automation → Workflows → open *Harvest Locals Day* → **Trigger** → should read "Contact Tag = `locals-day-march-2026`" → change to `source:event:locals-day-2026` → **Save** → **Publish**.

---

**Harvest — EOI Gathering Confirmation** — *(inferred current trigger: tag `eoi-gathering-march-2026`)*
→ **ACTION:** re-point to `source:event:eoi-gathering-2026`. (Event-specific.)
→ Automation → Workflows → open *Harvest — EOI Gathering Confirmation* → **Trigger** → should read "Contact Tag = `eoi-gathering-march-2026`" → change to `source:event:eoi-gathering-2026` → **Save** → **Publish**.

---

⚠ **Newsletter Signup** — *(inferred current trigger: tag `newsletter`, or a signup form)* — **REAL EMAIL GOES OUT. Verify the trigger in the builder BEFORE changing anything.**
→ **ACTION:** re-point to `comms:newsletter` — **only after** you've confirmed the live trigger and that no one mid-sequence will be dropped. This is the subscription gate; a wrong move here can stop newsletters or double-send them.
→ Automation → Workflows → open *Newsletter Signup* → **Trigger** → read carefully: is it a tag (`newsletter`) or a **Form Submitted**? → if it's the `newsletter` tag, change to `comms:newsletter`; if it's a form, **leave the trigger** and instead add an **Add Contact Tag → `comms:newsletter`** step → **Save** → **Publish**.
→ After publishing, send yourself a test signup and confirm exactly one welcome email arrives.

---

**Parliament House Welcome** — *(inferred current trigger: tag `goods-src-parliament-house-demo`)*
→ **ACTION:** re-point to `source:event:parliament-demo`.
→ Automation → Workflows → open *Parliament House Welcome* → **Trigger** → should read "Contact Tag = `goods-src-parliament-house-demo`" → change to `source:event:parliament-demo` → **Save** → **Publish**.

---

**Volunteer Application** — *(inferred current trigger: a **form submit**, possibly also tag `interest-volunteer`)*
→ **ACTION:** ⚠ if it's tag-triggered, re-point to `interest:volunteer`. If it's **form**-triggered, leave the trigger and add an **Add Contact Tag → `interest:volunteer`** step instead.
→ Automation → Workflows → open *Volunteer Application* → **Trigger** → check whether it's "Contact Tag = `interest-volunteer`" or "Form Submitted" → tag case: change to `interest:volunteer`; form case: keep the trigger, add the tag in a step → **Save** → **Publish**.

---

**Witta Gathering Photos** — *(inferred current trigger: tag `witta`)*
→ **ACTION:** re-point to `place:witta`, and ensure the contact also gets `project:act-hv`.
→ Automation → Workflows → open *Witta Gathering Photos* → **Trigger** → should read "Contact Tag = `witta`" → change to `place:witta` → **Save** → **Publish**.


---

I have everything I need. Here is the section.

## FORM / PAYMENT — leave the trigger, make the action add canonical tags

> **Why this exists:** these 5 workflows fire on a *form*, a *payment*, or a *date* — not on a tag. So we don't touch the trigger. Instead we make the thing that runs (the form, or the workflow's own action steps) **stamp the canonical tags** (`source:` / `project:` / `role:`) onto every new contact, so they arrive correctly tagged. Add the tags — do **not** delete any existing tag.
>
> **Two ways to add a tag.** (a) On the GHL **form** itself: *Sites → Forms → open form → Settings (gear) → "On Submit" / "Actions" → Add Tag* — look for **Add Tag**, may be under "Advanced Settings" or "After Submit". (b) Inside the **workflow**: *Automation → Workflows → open → click the **+** under the trigger → search action **"Add Contact Tag"** → type the tag → Save → **Publish*** (top-right). Method (b) is more reliable because every workflow already catches the contact — use it unless told otherwise. ⚠ A workflow **must be Published**, not just Saved, or new tags won't apply.

---

**Contact Form to Universal Inquiry** — *(form submit)*
→ **ADD `source:contact-form`, then branch by interest to set `role:`**
- Open: *Automation → Workflows → open "Contact Form to Universal Inquiry"*.
- Click **+** under the trigger → **Add Contact Tag** → type `source:contact-form` → Save.
- For the role split, add an **If/Else** step (look for **"If/Else"** — may be labelled "Condition"). Branch on the form's interest/dropdown field:
  - donor/support interest → **Add Contact Tag** `role:supporter`
  - partner/funder interest → **Add Contact Tag** `role:funder`
  - buyer/shop interest → **Add Contact Tag** `role:buyer`
  - anything else / unknown → leave role unset (don't guess).
- **Save → Publish.**
- ⚠ Open the form once in *Sites → Forms* and tell me the **exact field name + the dropdown options** before building the branches — I've inferred them and the values must match exactly or the branch never fires.

---

**Contact → Universal Inquiry** — *(form / inbound)*
→ **ADD `source:contact-form`** (no role branch — this one is the plain inbound catch-all)
- Open: *Automation → Workflows → open "Contact → Universal Inquiry"*.
- Click **+** under the trigger → **Add Contact Tag** → type `source:contact-form` → Save.
- **Save → Publish.**
- ⚠ This looks like a near-duplicate of the one above. Confirm in the UI which form each is wired to — if they're the same form, we may only need one. Tell me before publishing both.

---

**Create Donor** — *(payment / donor created)*
→ **ADD `role:supporter`** (use `role:funder` instead only for grant/foundation money, not individual gifts)
- Open: *Automation → Workflows → open "Create Donor"*.
- Click **+** at the point right after the contact is created/updated → **Add Contact Tag** → type `role:supporter` → Save.
- **Save → Publish.**
- ⚠ Confirm this fires on a **payment/order** event and not on something else. If the workflow handles both one-off gifts and grant income, tell me — we'd add an If/Else so grants get `role:funder` and individuals get `role:supporter`.

---

**New Order Notification** — *(order placed)*
→ **ADD `role:buyer`** (and `project:act-gd` if all orders are Goods)
- Open: *Automation → Workflows → open "New Order Notification"*.
- Click **+** after the trigger → **Add Contact Tag** → type `role:buyer` → Save.
- If every order in this store is Goods, add a second **Add Contact Tag** → `project:act-gd`.
- **Save → Publish.**
- ⚠ Confirm the store only sells Goods before adding `project:act-gd` — if it sells more than one project's products, leave the project tag off and we'll branch by product later.

---

**Grant Deadline - 7 Day Reminder** — *(opportunity deadline / date trigger)*
→ **NO TAG — leave entirely as-is**
- This is an internal reminder about a grant due date. It doesn't bring in a new contact, so there's nothing to tag.
- **Do not open or edit it.** Just tick it off the list.


---

## C. SYSTEM — leave alone (3)

These three keep ACT's plumbing running: the Gmail-to-contact link and the live mirror between GHL and our database. **Do not delete or edit them. Do not re-point them.** They are not part of the tag clean-up. If you remove one, contacts stop syncing and your email-to-contact matching breaks — silently.

⚠ Quick sanity-check before touching anything else: open each one, confirm its **trigger** matches what's described below, then **close without saving**. If a trigger looks different, tell Ben before doing anything.

---

**Gmail Email to Contact** — *(inferred trigger: inbound Gmail email → match/create contact)*
→ **LEAVE ALONE. Do not delete.** This is what links emails to the right contact record; deleting it breaks Gmail sync.
- GHL clicks: **Automation → Workflows →** open it → **Trigger** tab → eyeball the trigger (look for an **Email / inbound-email** trigger — may be labelled "Customer Replied" or a Gmail/email-connection trigger) → **close without Save**.

---

**Sync to Supabase - Contact Updated** — *(inferred trigger: Contact Changed / "Contact Updated")*
→ **LEAVE ALONE. Do not delete.** This pushes contact edits into our database mirror; deleting it freezes the mirror so our records drift out of date.
- GHL clicks: **Automation → Workflows →** open it → **Trigger** tab → confirm a **"Contact Changed" / "Contact Updated"** trigger (look for **Contact Changed** — may be under "Contact" trigger types) → **close without Save**.

---

**Sync to Supabase - New Contact** — *(inferred trigger: Contact Created / "New Contact")*
→ **LEAVE ALONE. Do not delete.** This pushes brand-new contacts into the database mirror; deleting it means new people never reach our records.
- GHL clicks: **Automation → Workflows →** open it → **Trigger** tab → confirm a **"Contact Created" / "New Contact"** trigger (look for **Contact Created** — may be under "Contact" trigger types) → **close without Save**.

---

⚠ **One rule for all three:** these are SYSTEM workflows. Never add them to the Phase-3 "delete old tag" pass and never put them in the Section D delete list. Together they keep the **GHL ↔ database mirror** and **Gmail-to-contact sync** working.

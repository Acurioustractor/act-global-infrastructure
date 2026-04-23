# Goods HQ — overdue action triage

> Drafted: 2026-04-23
> Source: Notion Goods HQ `177ebcf981cf805fb111f407079f9794` + Project Intelligence auto-callout (2026-03-27)
> Actions data source: `collection://84bfbf62-1f77-4d4f-9050-ee4b2ed7163d`
> Project Intelligence says: *QUIET. last activity 8d ago. 11 actions (11 overdue). last meeting 2026-03-18.*

## Triage rule

Each action gets one of three marks. Clear all 11 this week.

- **Close** — the work is done, or the moment has passed, or the intent was absorbed elsewhere. Mark Done in Notion with a one-line note.
- **Delegate** — the work is real but not CEO work. Reassign in Notion to the right owner with a new due date.
- **Kill** — the work no longer matters. Delete or archive with a one-line reason.

Don't reschedule. Rescheduling is how backlogs compound. Every action resolves this week.

## The 11 (as identified from March Project Intelligence callout + Notion preview)

| # | Action | Last signal | Proposed mark | Why |
|---|---|---|---|---|
| 1 | Video timeline | 16 Mar (overdue 38 days) | Delegate → Nic or videographer | Content work, not CEO. Set 15 May due date. |
| 2 | Interviewees (list) | 16 Mar | Close | Either the shoot happened and the list was used, or the shoot shifted. Mark Done with note. |
| 3 | Eloise grant sources | 9 Mar | Kill | Eloise grant moment has passed; if relevant, fold into GrantScope foundation scan agent (A5). |
| 4 | Shredder (spec/purchase) | 16 Dec (overdue ~4 months) | Close or Kill | If shredder was bought, mark Done. If not, kill — the containerised facility will include shredding as an integrated line, not a standalone purchase. |
| 5 | Maroon frames | 16 Dec | Close or Kill | Same logic. Either shipped or no longer the path. |
| 6 | AMP Tomorrow Makers submission (Final) | Older | Close | Grant was submitted or missed. Binary. Mark Done. |
| 7 | Tennent reflections Day 1 | Older | Close | Reflection. Either written or moot. |
| 8 | Central Corridor — Snow Foundation Support | Older | Delegate → Ben, 14 May due | This is live. Reassign to active Snow R4 track. |
| 9 | Snowie's note | Older | Delegate → Ben, 30 April due | Snow Foundation thank-you or update note. Write this Friday. |
| 10 | Meeting 20th May — Snow | Older | Convert to Calendar event + Delegate prep → Ben, 15 May | Not an action, a meeting. Move to Google Calendar. |
| 11 | Empathy Ledger // Tennant Creek | Older | Delegate → Ben, 14 May | Storyteller consent / Tennant Creek EL coordination. Real and active given the $36K receivable letter above. |

## After the triage

Once the 11 are cleared:

1. **Add OKR block at top of Goods HQ page.** Three objectives for Q2 FY27 (Jul–Sep), one KR each. See the plan at `thoughts/shared/plans/goods-ceo-6-month-plan.md` §Layer 4.
2. **Turn on auto-escalation.** Any new action not resolved within 21 days auto-tags `CEO-review` and shows in Monday cockpit. Build as a Notion automation or a cron that writes to Notion via API.
3. **Weekly CEO review page.** Every Monday 8am: paste cockpit snapshot, this week's 3 commits, 2 calls, 1 story. Close the page Friday with what moved.

## What I need from you to execute in Notion

I don't have Notion write permission scoped for this workspace via the MCP I'm using. To actually close these in Notion, either:

- You do the 11 closes in Notion directly (15 min, Monday morning), using this doc as the checklist, or
- Authorise Notion write (or give me the API token scoped for the Goods. HQ workspace) and I'll close them by bash script.

The triage above is the thinking. The clicks are yours until you say otherwise.

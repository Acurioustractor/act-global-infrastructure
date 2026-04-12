# Lesotho — open data needs

> **Created:** 2026-04-09
> **Updated:** 2026-04-09 (afternoon) — Gap 1 resolved with Georgia Falzon
> **Status:** REAL stop, **dates locked** (Tue 20 June 2026 onwards), one data gap remaining
> **Decided at:** [`2026-04-09-empathy-ledger-tour-questions.md`](2026-04-09-empathy-ledger-tour-questions.md) Decision 1

Lesotho is a confirmed Empathy Ledger world tour stop. As of 2026-04-09 afternoon, the **prison contact is named** (Georgia Falzon — see Gap 1 below) and the **dates are locked** (starting Tuesday 20 June 2026). The JCF Lesotho program detail (Gap 2) remains pending.

## ✅ Gap 1 — RESOLVED 2026-04-09

**Contact named: Georgia Falzon**

- **Name:** Georgia Falzon
- **Email:** georgia@conx.org.au
- **Primary role:** ConX (Australian community-connection organisation, see [`../projects/justicehub/the-full-idea.md`](../projects/justicehub/the-full-idea.md) §6 — Georgia was in the original CONTAINED personal emails list at ~70 score)
- **Second role:** Raphael Rowe Foundation — https://www.raphaelrowefoundation.org/
- **Lesotho connection:** through the Raphael Rowe Foundation work on international prison reform. Raphael Rowe is a wrongly-convicted UK journalist (the Netflix series *Inside the World's Toughest Prisons* is his work) whose foundation works on prison conditions and rehabilitation internationally. Georgia's role at the foundation is the bridge into the Lesotho prison context.

**Additional contacts to ask Georgia about:**

- The **specific Lesotho prison/detention centres** to visit. The Raphael Rowe Foundation likely has named relationships at one or more sites — this is where the *"What does justice look like in a country that cannot afford to lock people up?"* chapter question gets grounded.
- Whether there are **community-based / restorative-practice** sites in Lesotho that the foundation has worked with (not just the centres themselves)
- The **logistical practicalities** — visa requirements, travel-from-South-Africa routing, in-country movement, language (Sesotho + English), guides on the ground

**Note about ConX:** Georgia was already in the CONTAINED personal-outreach list (`JusticeHub/output/contained-personal-emails.md` — ConX entry, "Community connector, 41 days cold"). The original ConX framing was about Australian community connections; the Lesotho / Raphael Rowe Foundation role is a second hat that we did not previously know was on the table.

## Gap 2 — The JCF Lesotho program

**What we need:**
- Which JCF program operates in Lesotho?
- Is it a beneficiary partner (like St Jude in Tanzania, Kula in Rwanda) or something else (a fellowship, a research grant, a one-off)?
- Named contact at the JCF Lesotho program (program director, on-the-ground lead)
- Why it isn't in the connected DB — is it filed under a different name, in EL v2 only, or never logged?

**Why it matters:** the JCF African leg is the philanthropic spine of the international tour per `claim-stories-from-inside`. If JCF has a Lesotho program, it makes the Tanzania → Rwanda → Lesotho arc continuous. If JCF does not have a Lesotho program, then the Lesotho stop is a Stories from Inside pure-research stop, not a JCF beneficiary stop. **The narrative changes meaningfully based on which it is.**

**Where it plugs in once known:**
- `funders.json` `jcf` entry (extend the framing notes)
- `tour_stops` (link to JCF as cross-chapter network per Decision 2)
- The JCF Final-5 pitch brief (changes the story arc)

## What to do now that Gap 1 is closed

- **Reach out to Georgia Falzon** at georgia@conx.org.au with:
  - The proposed dates (starting Tuesday 20 June 2026, ~6 days)
  - The chapter question we want to answer (*"What does justice look like in a country that cannot afford to lock people up?"*)
  - The ask: which Lesotho prison or restorative-practice site is the right anchor, and whether the Raphael Rowe Foundation can introduce
  - The follow-up question about Gap 2 — does the Raphael Rowe Foundation know of a JCF program in Lesotho, or is the JCF connection separate and still pending?
- **Do NOT publish the Lesotho chapter publicly** until the centre is named and the consent infrastructure is wired
- **DO add Lesotho to EL v2 `locations.ts`** as `status: upcoming` with Georgia as the named contact (the international-tour file at [`../library/locations/international-tour-2026-jun-aug.md`](../library/locations/international-tour-2026-jun-aug.md) flags this as a high-priority alignment task)
- **Update [`claim-stories-from-inside.md`](../narrative/justicehub/claim-stories-from-inside.md)** to log Georgia / Raphael Rowe Foundation as the new audience reaction on the cross-jurisdictional youth-justice claim

## Chapter question — locked

**The chapter question for Lesotho is:** *"What does justice look like in a country that cannot afford to lock people up?"*

This is the second of the two synthesis options. It is more pointed than the alternative ("Who does a mountain kingdom listen to?") and now that we have a Raphael Rowe Foundation context, the prison angle is no longer hypothetical. The chapter is grounded.

## How to fill the gaps

| Source | What it might give us |
|---|---|
| Switch Supabase MCP to EL v2 (`yvnuayzslukamizrlhwb`) and re-query | Direct DB hit if JCF or EL records have Lesotho |
| Wire the `el-stories` adapter with `EMPATHY_LEDGER_SUPABASE_*` env vars and run | Same as above, automated |
| Search Notion via `mcp__notion__API-post-search` for "Lesotho" | If it lives in Notion grant records |
| Search Gmail for `lesotho` across the four ACT mailboxes | If a contact email exists |
| Ask Ben directly in the next conversation | The fastest path |

**Recommended next step:** ask Ben directly in the next conversation. Five minutes of his memory is worth an hour of database archaeology.

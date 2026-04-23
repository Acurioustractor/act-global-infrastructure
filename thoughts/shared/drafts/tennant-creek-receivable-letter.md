# Tennant Creek receivable — RESOLVED, no letter required

> Drafted: 2026-04-23
> Updated same day after live Xero query via Supabase MCP
> Status: closed — do not send a demand letter; this is archived as working notes only

## Correction

The original draft of this file was written off a wiki claim that ~$36K remained outstanding on the 200 v1 beds delivered to Tennant Creek early 2025. Live query against `xero_invoices` (Supabase project `tednluwflfhxyucgwigh`) on 2026-04-23 shows:

| Invoice | Contact | Date | Total | Paid | Status |
|---|---|---|---|---|---|
| INV-0259 | Centrecorp Foundation | 2025-08-11 | $37,620 | $37,620 | PAID |
| INV-0260 | Our Community Shed Incorporated | 2025-08-11 | $13,500 | $13,500 | PAID |
| INV-0282 | Julalikari Council Aboriginal Corporation | 2025-10-21 | $19,800 | $19,800 | PAID |

**Total settled: $70,920 across three invoices.** The v1 bed delivery was paid in full, split between the lead funder (Centrecorp), the auspicing organisation (Our Community Shed), and the downstream community partner (Julalikari).

The wiki line at `wiki/projects/goods.md:92` has been corrected.

No demand letter is required. No conversation is owed. This was a ghost blocker.

## What was previously drafted (kept for reference only)

The original letter structured a three-option ask (pay / payment plan / writedown) as an opening for a delicate 15-month-old conversation. That framing is no longer applicable.

## What this changes in the 6-month plan

One of the immediate-fix items (Tennant Creek $36K receivable conversation) is now closed. That removes a cashflow anxiety from the front of the plan and clears one narrative line before publishing the May CEO letter — which, given this correction, can now open from a different register: *the beds were paid for, the communities stood with us, and the question now is what we build next on that relationship.* Less apologetic, more invitational.

## Forensics note — worth following up separately

Five Centrecorp invoices from Feb 2026 are VOIDED in Xero (totalling ~$357,300) and one related INV-0314 for $84,700 sits as DRAFT (amount_due $84,700). This pattern — five voided invoices in one batch and one DRAFT remaining — suggests a rebilling exercise against the Centrecorp 107-bed Utopia Homelands approval. Worth a 10-minute reconciliation with Nic or the bookkeeper to confirm:

1. Was INV-0314 the intended final version of those voided attempts?
2. Is $84,700 the expected amount for Utopia Homelands 107 beds?
3. Why is INV-0314 still DRAFT rather than AUTHORISED + sent?

Not urgent for the 6-month plan. Worth a line on the Monday cockpit when that panel exists.

## Lesson for the plan and for next sessions

The wiki was internally consistent and felt authoritative, but it was lagging Xero reality by 8 months on a specific number. The Curtis-voice rule *every dollar figure needs a source* applies here too — the next version of the Goods HQ page should pull live invoice state from Xero via Supabase rather than hand-carrying numbers in prose. Provenance on every figure.

The **Capital Stack Agent (A5)** in Layer 5 of the plan is the right long-term fix for this — weekly reconciliation of claimed receivables against Xero truth. Adding now to the agent brief.

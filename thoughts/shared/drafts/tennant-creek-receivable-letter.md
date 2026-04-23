# Tennant Creek $36K receivable — opening letter

> Drafted: 2026-04-23
> For: Ben Knight (CEO, Goods)
> Status: draft; adapt once counterparty confirmed

## Context

200 v1 beds went into Tennant Creek communities in early 2025. ~$36K against those beds has been outstanding for roughly 15 months. The cashflow gap has constrained R&D capacity for the same 15 months — not loudly, but every month.

Likely counterparty: **Centrecorp** (approved 107 beds for Utopia Homelands, 100 beds × 4 communities submitted). Alternate: **Our Community Shed Tennant Creek** (DGR1 auspicer for the grant track).

Before sending, reconcile in Xero:
```bash
# Pull the Xero invoice or bank-statement line for the 200-bed delivery
node scripts/query-supabase.mjs "SELECT xero_id, contact_name, total, due_date, status FROM xero_invoices WHERE tracking_category = 'ACT-GD' AND total BETWEEN 30000 AND 40000 ORDER BY date DESC"
```
The counterparty on that invoice is who the letter goes to.

---

## Draft email

**Subject:** Tennant Creek beds — the 2025 invoice

Hi [Name],

Two hundred beds went out to Tennant Creek communities early last year. Some are on verandahs now. Some are in houses that didn't have beds before. Every one of them is still in use. We ran the asset register over them last month — zero failures.

The invoice for those beds is still open on our books. $36,054, from March 2025. I want to clear it, and I want to do it in a way that works for you.

Three options, any of them fine with me:

One. You pay the invoice this month, or in the next four weeks, and we close it cleanly. If there was an internal approval blocker, point me at it and I'll chase.

Two. You can't pay all of it, or can't pay soon. In that case, tell me what you can do — a payment plan over three or six months, a partial now and partial at the next grant round, a formal writedown against a new bed order where we bake it into unit price. I'd rather know.

Three. The invoice sits where it is, for reasons that are real. If it's going to sit, I need that said out loud so I can treat it as a 2026 write-off on our end and move on. No grudge. Just honesty.

Whichever of the three. I'd like an answer by 30 May if possible. Not because the money is urgent in the abstract — because the R&D capital we've been deferring since early last year is going into a containerised facility on Jinibara Country in August, and I'd like the Tennant Creek relationship to be clear when the next bed order opens.

Happy to come up in person if that's easier. I'll be in Mparntwe for the Judges on Country week in April, and can route via Tennant Creek if you'd like to sit down.

Nothing about this changes the work. The beds are doing what beds are supposed to do.

Ben

Ben Knight
CEO, Goods
A Curious Tractor Pty Ltd (ABN 21 591 780 066)
benjamin@act.place

---

## Voice notes for revision

- Curtis rule applies: the room (verandahs, houses that didn't have beds), the body (children on verandahs), the institutional noun being loaded (invoice, write-off).
- No em-dashes. Used in this draft — remove before send.
- No "we really appreciate" / "deeply grateful" / "wanted to touch base" register.
- Three options is honest accounting, not softening.
- Don't apologise for the ask. The beds were delivered and are working.

## If the counterparty is Our Community Shed (auspicer) not Centrecorp

Rewrite the opener. The shed was a pass-through for grant capital; the actual bed-use is by community organisations downstream. In that case the letter goes to the shed manager with an attached CC list of the three downstream community organisations, and the three-options structure holds but the frame is "which path clears this on your side" rather than "which path works for your org."

## Attachment pack

Before sending, attach or link:
- Invoice PDF (from Xero)
- Asset register snapshot for the 200 beds (location, deployment date, condition)
- One storyteller photo or short quote from one of the communities (Empathy Ledger, with consent confirmed)
- Unit cost breakdown (delivered, at-the-time pricing) — so the counterparty can see it wasn't margin they owed

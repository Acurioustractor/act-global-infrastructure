# GHL Pipeline Setup — Manual Step

> For: Ben Knight
> Time: ~10 minutes in the GHL UI
> When: Before running the seed + migration scripts

## Why this is manual

The GoHighLevel v2 API supports creating and updating **opportunities** (the individual deal cards) but does NOT expose creating or editing **pipeline structures** (the stages themselves) — pipeline configuration is an admin-only UI task. So the stages need to be set up by hand once, after which scripts take over for everything else.

## What to do

### 1. Rename + expand the existing "Goods" pipeline (12 stages)

Navigate: **GHL → Opportunities → Pipelines → "Goods" → Edit**

Rename the pipeline: `Goods — Buyer Pipeline`

Replace the 4 existing stages with these 12 (set Win Probability as shown):

| # | Stage name | Win % |
|---|---|---|
| 0 | Outreach Queued | 5 |
| 1 | First Contact | 15 |
| 2 | In Conversation | 30 |
| 3 | Qualified | 45 |
| 4 | Scoped | 55 |
| 5 | Proposed | 65 |
| 6 | Negotiating | 75 |
| 7 | Committed | 90 |
| 8 | In Delivery | 95 |
| 9 | Delivered | 98 |
| 10 | Invoiced | 99 |
| 11 | Paid | 100 |

**Important:** Keep the existing 4 stages visible in the UI while you add the new 8 — rename them in place so existing opp assignments don't break:

- Existing "New Lead" → rename to **Outreach Queued**
- Existing "Contacted" → rename to **First Contact**
- Existing "Proposal Sent" → rename to **Proposed**
- Existing "Closed" → rename to **Paid**

Then ADD the 8 new stages in between at the correct positions (In Conversation, Qualified, Scoped, Negotiating, Committed, In Delivery, Delivered, Invoiced).

No opps break during this rename. Once saved, all 103 current opps will sit at **Outreach Queued** (formerly "New Lead").

### 2. Create a new pipeline: "Goods — Demand Register"

Navigate: **GHL → Opportunities → Pipelines → + New Pipeline**

Name: `Goods — Demand Register`

Four stages:

| # | Stage name | Win % |
|---|---|---|
| 0 | Signal | 10 |
| 1 | Buyer Matched | 25 |
| 2 | Converted | 50 |
| 3 | Dormant | 0 |

This pipeline holds the 103 CivicGraph-generated community demand signals. They're not procurement leads — they're data products showing "this community needs N beds at $K value." Separating them keeps the Buyer Pipeline usable as a CEO work surface.

### 3. Tell me once you're done

Reply with:
- "pipeline done" — and I'll run the migration script that moves the 103 demand signals from Buyer Pipeline to Demand Register
- Or "pipeline done, skip migration" — if you want me to run a dry-run first

Everything after this is scripted and reversible.

## What the scripts will do once stages exist

- **Migrate** 103 community demand opps from Buyer Pipeline → Demand Register (stays at Signal stage)
- **Seed** retroactive PAID opps from Xero: Centrecorp $85,712 Nov-25, Centrecorp $37,620 Aug-25, Julalikari $19,800 Oct-25, Our Community Shed $13,500 + $6,765 — all land at **Paid** stage with xero_invoice_id linked
- **Seed** anchor buyer opps at recommended stages (Centrecorp Negotiating, PICC Qualified, Oonchiumpa Committed, Miwatj First Contact, Anyinginyi Scoped)
- **Seed** INV-0314 $84,700 Production Plant as a real opp at **Proposed** stage (currently invisible because Xero invoice is DRAFT) — pending your confirmation this deal is actually live

## Rollback

If anything feels wrong, the stage renames are reversible in GHL UI. The scripts I'm writing all have `--dry-run` mode. Each script logs every change it would make to `ghl_sync_log` for audit.

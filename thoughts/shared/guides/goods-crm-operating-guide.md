# Goods on Country: the funding and demand system

A guide to the three pipelines in the CRM, how to run them, and the strategy underneath. Written to be pasted into Notion.

## What this is

Goods on Country builds quality beds and washing machines for remote Indigenous communities, and moves the making On Country toward community-owned production. The CRM holds three pipelines. They look separate. They are one system.

A community needs beds and washing machines. Someone pays for them: a buyer who places an order, or a funder who gives the money. The goods get built and delivered. The three pipelines track those three jobs, in that order.

- **Demand Register** holds the need.
- **Buyer Pipeline** holds the people who pay.
- **Supporter Journey** holds the people who give.

One need. Two ways to pay for it. One delivery. Every bed that lands in a community came through this shape.

## The shape

```
            NEED  (Demand Register)
                     |
          who pays for it?
        ┌────────────┴────────────┐
   buyer pays                 funder gives
   (Buyer Pipeline)        (Supporter Journey)
        └────────────┬────────────┘
                     |
              DELIVERY  (beds and washing machines, On Country)
```

The Demand Register is the floor everything stands on. It is the count of what communities have asked for. The other two pipelines are the two roads to meeting it.

## The three pipelines

### 1. Demand Register: the need

This is the watchlist of communities and the organisations that serve them (councils, health services, stores, land councils) who have unmet need for beds and washing machines.

Stages:

| Stage | Means |
|---|---|
| Signal | A community or organisation with identified need. Most rows sit here. |
| Buyer Matched | You have found who could buy it or fund it. Open a Buyer or Supporter record. |
| Converted | That need is now an active deal in Buyer or Supporter. Work it there, not here. |
| Dormant | Parked for now. |

You do not sell from the Demand Register. It is the record of who is waiting. When a signal gets traction, it becomes a Buyer or Supporter deal.

Rule: one row per community. A community is a need, not five.

### 2. Buyer Pipeline: who pays

Commercial buyers who place a purchase order. Councils, health services, housing authorities, corporates. A purchase order is the strongest outcome Goods can have, because it repeats.

Delivery partners and grant-funded community organisations do not belong here. This pipeline is for money that comes back through a sale.

Stages: Outreach Queued, First Contact, In Conversation, Qualified, Scoped, Proposed, Negotiating, Committed, In Delivery, Delivered, Invoiced, Paid.

When a deal moves, set two things on the record:

- the number of beds and washing machines they are ordering, once it is scoped
- the order value in dollars

That is what the cockpit reads as ordered.

### 3. Supporter Journey: who gives

Foundations, philanthropists, corporate funders. Money that pays for beds in communities that cannot buy them outright.

Stages: Identified, Qualified, Cultivating, Ask made, Committed, Delivering, Stewarding and Reporting, Renewing. Dead ends: Lapsed, Declined or Parked.

When a deal moves, set:

- the ask or the committed grant in dollars
- where you can, the number of beds and washing machines that money funds, so philanthropic delivery counts too

## The one habit that makes it work

Every record in all three pipelines can carry the same three numbers: beds, washing machines, dollars. The meaning shifts by pipeline: needed in the Demand Register, ordered in the Buyer Pipeline, funded in the Supporter Journey.

The habit is simple. When a deal gets concrete, put the bed count, the washing-machine count, and the dollar value on the record. Everything else rolls up from that. Skip it and the cockpit goes blank. Do it and the whole system stays honest.

## The cockpit

Live page: `command.act.place` Goods workspace, or direct at `/org/act/goods/funnel` (linked from the Goods operating-system page).

It shows one table:

| Line | What it counts |
|---|---|
| Need | Beds and washing machines the priority communities have asked for |
| Ordered | Beds, washing machines and dollars in the Buyer Pipeline |
| Funded | Dollars committed or in play in the Supporter Journey |
| Delivered | Beds and washing machines delivered to date |
| Gap | Need minus delivered. The number to close. |

Current reading (sources in brackets, refreshes as records change):

- Need, priority communities: 12,504 beds, 1,563 washing machines, across 64 communities (from the community demand data, priority active and lead).
- Addressable, all communities: 72,134 beds, 8,430 washing machines, across 1,542 communities (same source).
- Ordered: about 1.84 million dollars across the Buyer Pipeline (largest single deal is Groote Archipelago housing).
- Funded: about 1.38 million dollars across the Supporter Journey (Snow Foundation, Minderoo, QBE Foundation and others).
- Delivered to date: 520 beds, 41 washing machines (from the live asset register).
- Gap: about 11,984 beds and 1,522 washing machines.

The gap is the job. Every committed order and every funded grant closes part of it.

## The weekly rhythm

1. Open the cockpit. Read need against delivered, and the dollars in each pipeline.
2. Demand Register. Is any Signal ready to chase? Match it to a buyer or a funder, open that record, move the signal to Buyer Matched.
3. Buyer Pipeline and Supporter Journey. Move live deals one stage where it is real. Set beds, washing machines and dollars as deals get scoped.
4. Watch the gap close.

## The rules that keep it clean

- One row per community in the Demand Register.
- Buyers who pay go in the Buyer Pipeline. Funders who give go in the Supporter Journey. Communities and the orgs that serve them go in the Demand Register. A delivery partner is none of these.
- An organisation can sit in two pipelines when it plays two roles. A health service can be both a community in need and the buyer that places the order. That is the system working, not a duplicate.
- Set beds, washing machines and dollars when a deal gets real. This is the one habit.
- On Country is always capitalised. It is a proper noun.
- No invented numbers. Every figure traces to the asset register, the community demand data, or a signed letter. If it is not sourced, it does not go on the record.

## Strategy: where the money actually is

Goods needs four kinds of money, and the easiest one to chase is the weakest one.

**Procurement is the prize.** A purchase order from a council or a housing authority is worth more than a grant, because it repeats. The same buyer orders again next year. The demand data shows where this lives: government agencies that already buy beds, whitegoods and furniture for remote and community housing. The warmest are housing and community bodies, led by the Northern Territory housing agencies, the New South Wales Department of Communities and Justice, the National Indigenous Australians Agency, and the ACT Community Services Directorate. Supply Nation certification opens the door to corporate and government buyers who have to spend with Indigenous suppliers. The national remote-housing program is the largest demand of all.

**Capital buys the plant, not a project.** The production plant is most of the way built and moving toward community ownership. The money that buys machinery and stock is not a grant: it is loan finance with a grant component (Indigenous Business Australia start-up finance, Many Rivers, the Northern Australia Infrastructure Facility). Treat these as their own watch.

**Capability builds the muscle.** Grants like the Social Enterprise Development Initiative fund the enterprise itself. Use these to harden operations.

**Grants fund delivery into communities.** Place-based and First Nations grants pay for beds where there is no buyer. Use them for community delivery, not as the core revenue.

The order matters. A purchase order repeats. A grant runs out. The strategy is to win procurement, fund the plant with capital, and use grants and philanthropy to reach the communities that cannot pay. Every road ends in the same place: a bed and a washing machine in a home, and the making moving On Country.

## What sits behind this

- Operating model and decisions: `thoughts/shared/plans/2026-05-28-goods-three-pipeline-operating-model.md`
- Roll-up that produces the cockpit numbers: `goods-pipeline-rollup.mjs` (grantscope)
- Repeat-buyer research, the warm procurement targets: `thoughts/shared/reports/goods-repeat-buyers-2026-05-28.md` (grantscope)
- The CRM lives in GoHighLevel under the Goods location. The cockpit lives in the command centre.

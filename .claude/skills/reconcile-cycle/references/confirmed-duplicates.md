# Confirmed duplicates — the learning loop

> **What this is:** duplicates the cockpit has flagged + the human verdict after checking Xero. Append
> after each pass. Next pass reads this so settled lines stop re-surfacing and we don't re-investigate
> the same pair. A "duplicate" = the SAME purchase recorded twice — once as a Dext-published ACCPAY bill,
> once as a bank-feed spend line. Resolution = match the bill, **delete the duplicate card txn**.
>
> **Honesty rule:** a row is only `RESOLVED` once the duplicate has actually been killed in Xero. Until
> then it's `FLAGGED` (cockpit thinks so) or `CONFIRMED` (human eyeballed both, agrees, not yet deleted).
> Never mark RESOLVED on the cockpit's say-so alone.

## Verdict log

| Date flagged | Vendor | Amount | Bill | Card txn | Status | Notes |
|---|---|---|---|---|---|---|
| 2026-06-01 | Airbnb | $4,621.18 | PAID, "Airbnb", 27 Nov 2025 | "Airbnb", 27 Nov, unreconciled | CONFIRMED | Live cockpit example; bill+txn same week, same amount. Delete the card txn. |
| 2026-06-01 | Kennards Hire | $3,745 | PAID, 27 Nov 2025 | 28 Nov, unreconciled | FLAGGED | Verify in Xero before deleting. |
| 2026-06-01 | Defy Design | $3,598 | — | — | FLAGGED | From cockpit duplicate list; eyeball receipt. |

## Known prior duplicates (from session memory — verify against current Xero before acting)

- **Telford Smith ~$19.8K double-pay** — flagged in the Q2/Q3 recode work (memory `xero-q2q3-recon-recode`).
  Treat as CONFIRMED-historical; check whether already resolved before re-flagging.
- **Oct–Dec 2025 cluster** — ~105 duplicate pairs, ~$67.7K total; **RNM $26,845** the single biggest.
  This is the bulk SL backlog (`scripts/build-sl-reconcile-sheet.mjs` is their worklist).

## Aggregate (2026-06-01, FY26 NAB Visa)

Cockpit counts 41 duplicate lines = **$24,727 double-counted** in the *unreconciled* set. (The Oct–Dec
$67.7K figure above includes already-reconciled pairs — different scope. Don't add the two.)

## When you resolve one

1. In Xero: match the bank line to the bill, delete the duplicate spend txn.
2. Move its row here to `RESOLVED` with the date + who did it.
3. If the bank descriptor was messy, also add the mapping to `vendor-aliases.md`.


## Q2 FY26 batch (added 2026-06-01, from q2-fy26-reconciliation-pack)

Cockpit flagged 24 duplicate candidates; agent verification CONFIRMED 22, REJECTED 2. Status CONFIRMED (eyeballed, not yet deleted in Xero).

| Vendor | Amount | Bill contact | Status |
|---|---|---|---|
| Airbnb | $4,621.18 | Airbnb | CONFIRMED |
| Kennards Hire | $3,745.00 | Kennards Hire | CONFIRMED |
| Defy Design | $3,598.09 | Defy | CONFIRMED |
| Defy Design | $3,260.63 | Defy | CONFIRMED |
| DINKUM DUNNIES CABOOLTURE | $534.19 | Onsite Rentals Dinkum Dunnies | CONFIRMED |
| Budget Rent A Car | $518.18 | Budget | CONFIRMED |
| CENTRE TRAILER SALES CICCONE | $424.91 | Centre Trailer Sales | CONFIRMED |
| AGL | $319.09 | AGL | CONFIRMED |
| Iris Todd Operations | $197.47 | Todd Tavern | CONFIRMED |
| Budget Rent A Car | $177.36 | Budget Car and Truck Rental (NT) | CONFIRMED |
| Budget Rent A Car | $148.03 | Budget Car and Truck Rental (NT) | CONFIRMED |
| LOTTE TRAVEL RETAIL MELBOURNE  | $131.69 | Lotte Duty Free | CONFIRMED |
| The Roastery Cafe | $81.97 | The Roastery Cafe | CONFIRMED |
| Duyu Coffee Roasters | $73.67 | DuYu Coffee | CONFIRMED |
| Bank St + Co | $67.70 | BANK ST AND CO | CONFIRMED |
| Liberty | $61.42 | Liberty Idalia | CONFIRMED |
| Good Morning Coffee | $55.96 | Hermit Park - Good Morning Coffee | CONFIRMED |
| Google GSUITE_theharvestwSydne | $51.54 | Google Australia | CONFIRMED |
| J R Rowden | $37.84 | F V Snowdon And J R Rowden | CONFIRMED |
| Duyu Coffee Roasters | $22.26 | DuYu Coffee | CONFIRMED |
| The Roastery Cafe | $19.23 | The Roastery Cafe | CONFIRMED |
| Apple | $14.99 | Apple Pty Ltd | CONFIRMED |

**REJECTED (do NOT treat as duplicates):**
- Good Morning Coffee $58.74 — collision: Same bill contact+amount ($55.96, Hermit Park - Good Morning Coffee) as candidate 71b793dd. Two card lines match one bill; this line's stated amount $58.74 differs from bill $55.96, so the other (exact $55.96) is the true match and this is the collision.
- Townsville City Council $44.90 — different_merchant: Card vendor Townsville City Council differs from bill contact Sunshine Coast Council — different council entities, not the same merchant despite equal $44.90.

**New stopword candidate:** "COUNCIL" — caused the Townsville vs Sunshine Coast false match. Generic entity-type words (council, services, rentals) should not carry a vendor match alone.

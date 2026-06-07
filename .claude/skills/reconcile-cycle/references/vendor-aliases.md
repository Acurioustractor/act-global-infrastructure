# Vendor aliases — the learning loop for matching

> **What this is:** bank-statement descriptors → the real vendor name, so the matching engine connects
> a messy card line to the right Xero bill / receipt. The engine matches on shared *tokens* after
> normalisation, so most names work without help — this file is for the ones that DON'T (heavy
> abbreviation, no shared token, a processor name instead of the merchant).
>
> Append a row whenever you hit a line the cockpit mis-matched or failed to match because the descriptor
> was unrecognisable. Over time this is what makes the card match itself.

## Alias table

| Bank descriptor (as shown) | Real vendor | Why it needs an alias |
|---|---|---|
| `BARGAINCARRENTALS HOBART` | Bargain Car Rentals | Squashed words; location suffix. |
| `EPILOGUE ENTERPRISES ALICE SPRINGS` | Epilogue Enterprises | Location suffix; fine but logged as a pattern. |
| `CENTRE TRAILER SALES CICCONE` | Centre Trailer Sales | "CENTRE"/"SALES" are stopwords → only "TRAILER"/"CICCONE" carry the match. |
| `SQ *NEST IN WITTA` | Nest In (Witta) | `SQ*` = Square processor prefix, stripped by normaliser. |
| `ALICE SILVER PASSENGER CICCONE` | Alice Silver Passenger Service | Taxi; "PASSENGER" carries it. |

## Heuristic hints already built into the engine (for CREATE lines)

These are guesses the engine makes for vendors never seen in the receipt pipeline — confirm, don't trust:

- Account by keyword: `UBER/CAB/TAXI`→Taxis · `HOTEL/NOVOTEL/BOOKING/QANTAS/VIRGIN/AVIS`→Travel ·
  `XERO/SQUARESPACE/OPENAI/ADOBE`→Subscriptions · `AMZNPRIME/AUDIBLE`→**Drawings (personal?)** ·
  `BUNNINGS/STRATCO/ECOFLO`→Materials · supermarkets/cafes→Light meals.
- Project by location: `ALICE/LARRAKEYAH/AHERRENGE/TENNANT`→NT trip (ACT-GD/OO?) ·
  `MALENY/WITTA/CALOUNDRA`→Farm (ACT-FM?) · `SYDNEY/SURRY/EDGECLIFF`→Sydney.

## When to add an alias vs fix the engine

- **One-off weird descriptor** → add a row here.
- **A whole class** (e.g. all Square `SQ*` lines, all `PAYPAL *` lines) → consider a normaliser rule in
  `reconcile.ts` instead, and note it here so the next person knows it's handled in code.


## Q2 FY26 aliases (added 2026-06-01 — bank descriptor → Xero bill contact)

| Bank descriptor | Xero contact |
|---|---|
| Defy Design | Defy |
| DINKUM DUNNIES CABOOLTURE | Onsite Rentals Dinkum Dunnies |
| Budget Rent A Car | Budget |
| CENTRE TRAILER SALES CICCONE | Centre Trailer Sales |
| Iris Todd Operations | Todd Tavern |
| Budget Rent A Car | Budget Car and Truck Rental (NT) |
| LOTTE TRAVEL RETAIL MELBOURNE AIR | Lotte Duty Free |
| Duyu Coffee Roasters | DuYu Coffee |
| Bank St + Co | BANK ST AND CO |
| Liberty | Liberty Idalia |
| Good Morning Coffee | Hermit Park - Good Morning Coffee |
| Google GSUITE_theharvestwSydney | Google Australia |
| J R Rowden | F V Snowdon And J R Rowden |
| Apple | Apple Pty Ltd |

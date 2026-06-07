# Coding patterns — the learning loop for CREATE lines

> Vendor / keyword → project + account patterns, distilled from confirmed reconciliation passes. Feed
> these to the coding agents (and, when a pattern is stable, into the `guessAccount`/`guessProjectHint`
> heuristics in `reconcile.ts`). The goal: every quarter, more CREATE lines auto-code at high confidence
> so the human's 🔴 Decide tier shrinks. Append confirmed patterns after each pass.

## Account patterns (vendor/keyword → account)

| Signal | Account | Confidence |
|---|---|---|
| Internet Transfer | **transfer/exclude** — NOT a project expense | high |
| ATO | tax | high |
| Hatch Electrical / AWM Electrical | Building & Site Works | high (account) |
| Container Options | Building & Site Works / container | medium |
| Kennards Hire | Plant & Equipment Hire | high |
| Loadshift | Freight / cartage | medium |
| Carla Furnishers | Furniture & Fit-out | medium |
| Bunnings / Sand Yard / hardware | Materials & Supplies | high |
| JB Hi-Fi / Apple (hardware) / Kogan | Equipment (720) | medium |
| AIG / NRMA | Insurance | high |
| AGL | Light, Power, Heating (445) | high |
| Avis / Budget / Bargain Car Rentals / Virgin / Airbnb / hotels | Travel (493) | high (account) |
| Cafés / Woolworths / Coles / Dominos / supermarkets | Light meals (421) | high (account) |

## Project patterns (location/vendor → project) — confirm, don't trust blind

| Signal | Likely project | Note |
|---|---|---|
| Alice Springs / Larrakeyah / Aherrenge / Bralinda / NT towns | ACT-GD (Goods) · ACT-OO (Oonchiumpa) · ACT-UA (Uncle Allan) | NT trip cluster — confirm which |
| Maleny / Witta / Caloundra / Mooloolah / Kenilworth | ACT-FM (The Farm) · ACT-HV (Harvest Witta) | SE-QLD farm cluster |
| Colyton / Western Sydney | ACT-PI (PICC) | PICC is Western Sydney |
| Hatch Electrical (large) | ACT-PI / ACT-FM / ACT-HV | a build site — **confirm which site for the whole Hatch cluster at once** |
| Container / Kennards / Loadshift / fit-out | ACT-MY (Mounty Yarns) · ACT-GD | site fit-out cluster |

## Judgement flags (always send to the human)
- **Personal vs business:** AMZNPRIME, Audible, personal Apple media, casino, some groceries/Airbnb → `isPersonal` candidate. Personal → Drawings, not a project (the founder-drawings R&D-basis trap).
- **Unknown payee** (e.g. "P & J Mabasa", foreign descriptors like "Indonesia Arrival ROTTERDAM") → needs human ID before any account.
- **Big-dollar site attribution** (Hatch, Container) → medium confidence by design; the project is the guess, the account is solid.

## How this improves the system
1. Stable account patterns above → bake into `guessAccount()` in `reconcile.ts` (raises the cockpit's own confidence, fewer agent calls needed next time).
2. Confirmed vendor→project (once Ben confirms a coding) → write back so the same vendor auto-codes high next quarter.
3. Each pass, move newly-stable rows up to "high confidence" and shrink the Decide tier.

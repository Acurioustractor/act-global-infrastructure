# Dext Routing Pack

Generated: 2026-05-15T08:25:00.009Z
Config: config/dext-routing-sections.json
Dext export: Dext/nicholas-marchesi-2026-05-15.csv

## Operating Rule

Dext is the evidence/OCR intake. Xero is the accounting source of truth. Supabase/workbench is the review queue. For historical cleanup, do not bulk publish from Dext unless a bank line and Xero action are known.

## Global Settings

- Legacy cleanup auto-publish default: false
- Legacy paid card destination: Bank Accounts / Spend Money
- New ACT Pty auto-publish default: false
- Auto-publish sample requirement: At least three clean same-vendor same-destination publishes with no phantom bills.

## Dext Fields To Add

| Field | Value | Use | Destination / Publish |
|---|---|---|---|
| Payment Method | NAB Visa ACT #8815 | ACT card spend already paid by business card | Bank Accounts / Spend Money / manual_review |
| Payment Method | Personal paid - Ben | Ben paid personally and needs reimbursement/expense claim review | Expense Claim / reimbursement review / hold |
| Payment Method | Personal paid - Nic | Nic paid personally and needs reimbursement/expense claim review | Expense Claim / reimbursement review / hold |
| Payment Method | Bank transfer / invoice | Supplier invoices that are not card-paid | Purchases / Bills only if genuinely unpaid or bill workflow is intended / manual_review |
| Project Tracking | ACT-IN · ACT Infrastructure | core software, internet, AI tools, systems, general infrastructure |  |
| Project Tracking | ACT-HV · The Harvest Witta | Harvest site, Witta/Maleny property improvements, farm build materials |  |
| Project Tracking | ACT-FM · The Farm | farm operations, animal welfare, local farm supplies and fuel where not Harvest capital works |  |
| Project Tracking | ACT-GD · Goods | Goods build, manufacturing, containers, marketplace, product/asset work |  |
| Project Tracking | ACT-JH · JusticeHub | justice travel, research, civic/youth justice work |  |
| Project Tracking | ACT-CORE · ACT Regenerative Studio | studio operations, accounting, admin, general ACT work that is not infrastructure SaaS |  |
| Project Tracking | ACT-EL · Empathy Ledger | storytelling, media capture, empathy ledger platform and content work |  |
| Project Tracking | ACT-PS · PICC On Country Photo Studio | photo studio, camera/print/creative equipment for PICC work |  |
| Project Tracking | ACT-MY · Mounty Yarns | Mounty Yarns related materials, events, travel, production |  |
| Project Tracking | ACT-OO · Oonchiumpa | Oonchiumpa consultancy/service costs |  |
| Project Tracking | ASK_USER · Ask Ben/Nic | travel, meals, hotels, large purchases, ambiguous locations, shared trips |  |
| Project Tracking | SL_REVIEW · Standard Ledger Review | BAS/tax treatment, insurance, donations, write-offs, duplicate bills, capitalisation |  |
| Business Division | ACT Pty | future clean entity flow |  |
| Business Division | Legacy ACT/Nic Dext cleanup | current export and historical Dext cleanup only |  |
| Business Division | Personal/Reimbursement | items paid personally or not clearly company card spend |  |

## Category Defaults

| Dext Category | Project | Tax | R&D | Publish | Notes |
|---|---|---|---|---|---|
| 485 - Subscriptions | ACT-IN | GST on Expenses unless overseas/zero-GST invoice | R&D supporting | auto_publish_after_vendor_proven | Good auto-publish candidates after test publishes: OpenAI, Anthropic/Claude, Supabase, Webflow, Vercel, Bitwarden, Railway, HighLevel, Dext, Notion. |
| 489 - Telephone & Internet | ACT-IN | GST on Expenses if Australian supplier | R&D supporting | manual_review | Belong/Starlink may be ACT-IN, ACT-HV, ACT-FM, or A Curious Tractor depending site/use. |
| 446 - Materials & Supplies | ASK_USER | GST on Expenses | review | manual_review | Usually ACT-HV, ACT-FM, ACT-GD, ACT-PS, or ACT-MY based on supplier/location/job. |
| 750 - Plant & Equipment | ASK_USER | GST on Expenses | review | manual_review | Likely asset/capital treatment. Do not auto-publish without Standard Ledger review for high-value items. |
| 432 - Hire Expenses | ASK_USER | GST on Expenses | review | manual_review | Kennards/hire usually project-specific and must match job/trip. |
| 486 - Sub-contractors | ASK_USER | Check invoice GST registration | review | manual_review | Never auto-publish; project, GST, and payable/payment state need review. |
| 493 - Travel - National | ASK_USER | GST on Expenses when domestic taxable | review | manual_review | Use calendar/trip context. Qantas/Virgin/Uber/Avis/Budget/Airbnb/Booking stay manual. |
| 494 - Travel - International (0%) | ASK_USER | No GST / BAS excluded as advised | review | manual_review | Foreign currency and overseas travel need project/business-purpose review. |
| 421 - Light meals & refreshments | ASK_USER | GST on Expenses if Australian taxable receipt | review | manual_review | Keep receipt evidence even under threshold; classify by trip/event/business purpose. |
| 449 - MV - Fuel & Oil | ASK_USER | GST on Expenses | review | manual_review | Project depends on vehicle/trip/location; Maleny/Witta often ACT-HV or ACT-FM. |
| 450 - MV - Registration & Insurance | SL_REVIEW | Check GST treatment | not R&D unless directly justified | manual_review | Can be large and entity/vehicle-specific. |
| 467 - Rates & Water (0%) | ACT-HV | No GST / BAS excluded as advised | not R&D unless directly justified | manual_review | Likely Harvest/property costs; confirm property and entity. |
| 433 - Insurance | SL_REVIEW | Check stamp duty/GST split | not R&D unless directly justified | manual_review | Insurance often has mixed GST/stamp duty treatment. |

## Supplier Groups

### 485 - Subscriptions

- Suppliers: OpenAI, Anthropic, Claude.AI, Supabase, Webflow, Vercel, Railway Corporation, Bitwarden, HighLevel, Dext Software, Notion Labs, Firecrawl, Cognition AI, X Global LLC, Google Australia, RealtimeBoard, Shipstation
- Project: ACT-IN
- Payment method: NAB Visa ACT #8815
- Publish destination: Bank Accounts / Spend Money
- Auto-publish: after three clean test publishes
- R&D: R&D supporting

### 493 - Travel - National / 494 - Travel - International

- Suppliers: Qantas, Qantas Group Accommodation, Virgin Australia, Uber, Avis, Budget, Budget Car and Truck Rental (NT), Thrifty, Airbnb, Booking.com, Greyhound Australia, Taxi Receipt, GoGet, Holafly
- Project: ASK_USER
- Payment method: NAB Visa ACT #8815
- Publish destination: Bank Accounts / Spend Money only after matching bank line
- Auto-publish: false
- R&D: review

### 446 - Materials & Supplies / 432 - Hire / 750 - Plant & Equipment

- Suppliers: Bunnings Warehouse, Maleny Hardware And Rural Supplies, MALENY LANDSCAPING SUPPLIES, Kennards Hire, Liberty Maleny, BP, Reddy Express, The Bolt King, Carbatec Brisbane, Kennedy's, Edmonds Landscaping Supplies, Allclass, Container Options, Telford Smith Engineering, Bionic Self Storage, Hatch Electrical
- Project: ASK_USER, often ACT-HV/ACT-FM/ACT-GD
- Payment method: NAB Visa ACT #8815 or supplier invoice
- Publish destination: Manual review
- Auto-publish: false
- R&D: review

### Project Materials / Printing & Stationery / Plant & Equipment

- Suppliers: Defy Manufacturing, Defy, BOE Design, DNP Australia, Centre Canvas And Upholstery
- Project: ACT-GD or ACT-PS depending item
- Payment method: review
- Publish destination: Manual review
- Auto-publish: false
- R&D: review

### 486 - Sub-contractors

- Suppliers: Sophie Deirdre Hickey, Joseph Kirmos, Oonchiumpa Consultancy and Services, The Matnic Trust, Manbarra Operations
- Project: ASK_USER
- Payment method: review
- Publish destination: Purchases/Bills only if genuinely unpaid; otherwise match paid bank line
- Auto-publish: false
- R&D: review

## Never Auto-Publish

- unknown supplier
- blank supplier
- zero total
- refund-only or negative amount
- foreign currency unless exact matched
- personal/reimbursement
- duplicate image or duplicate Dext receipt ID
- already reconciled in Xero
- large asset or capital item
- insurance or rates needing GST split
- anything over $500 unless recurring SaaS

## Latest Dext Export Summary

- Parsed export rows: 449
- Supplier rows in CSV: 166
- Category rows in CSV: 29

### Top Supplier Routing

| Supplier | Count | Amount | Project | Category | Auto-publish |
|---|---:|---:|---|---|---|
| Uber | 59 | $2439.25 | ASK_USER | 493 - Travel - National / 494 - Travel - International | false |
| Qantas | 27 | $18752.22 | ASK_USER | 493 - Travel - National / 494 - Travel - International | false |
| Maleny Hardware And Rural Supplies | 21 | $3537.51 | ASK_USER, often ACT-HV/ACT-FM/ACT-GD | 446 - Materials & Supplies / 432 - Hire / 750 - Plant & Equipment | false |
| Bunnings Warehouse | 15 | $10664.42 | ASK_USER, often ACT-HV/ACT-FM/ACT-GD | 446 - Materials & Supplies / 432 - Hire / 750 - Plant & Equipment | false |
| BP | 11 | $1118.25 | ASK_USER, often ACT-HV/ACT-FM/ACT-GD | 446 - Materials & Supplies / 432 - Hire / 750 - Plant & Equipment | false |
| Defy Manufacturing | 8 | $44213.55 | ACT-GD or ACT-PS depending item | Project Materials / Printing & Stationery / Plant & Equipment | false |
| Qantas Group Accommodation | 8 | $2108.88 | ASK_USER | 493 - Travel - National / 494 - Travel - International | false |
| Kennards Hire | 7 | $14085.50 | ASK_USER, often ACT-HV/ACT-FM/ACT-GD | 446 - Materials & Supplies / 432 - Hire / 750 - Plant & Equipment | false |
| MALENY LANDSCAPING SUPPLIES | 7 | $7691.10 | ASK_USER, often ACT-HV/ACT-FM/ACT-GD | 446 - Materials & Supplies / 432 - Hire / 750 - Plant & Equipment | false |
| Supabase | 7 | $466.17 | ACT-IN | 485 - Subscriptions | after three clean test publishes |
| Google Australia | 6 | $391.44 | ACT-IN | 485 - Subscriptions | after three clean test publishes |
| Defy | 5 | $18333.27 | ACT-GD or ACT-PS depending item | Project Materials / Printing & Stationery / Plant & Equipment | false |
| Allclass | 5 | $10609.05 | ASK_USER, often ACT-HV/ACT-FM/ACT-GD | 446 - Materials & Supplies / 432 - Hire / 750 - Plant & Equipment | false |
| Airbnb | 5 | $9942.82 | ASK_USER | 493 - Travel - National / 494 - Travel - International | false |
| Avis | 5 | $3487.78 | ASK_USER | 493 - Travel - National / 494 - Travel - International | false |
| Greyhound Australia | 5 | $1370.67 | ASK_USER | 493 - Travel - National / 494 - Travel - International | false |
| Webflow | 5 | $222.28 | ACT-IN | 485 - Subscriptions | after three clean test publishes |
| – | 4 | $20628.88 | ASK_USER | Manual review | false |
| Joseph Kirmos | 4 | $16237.50 | ASK_USER | 486 - Sub-contractors | false |
| Sophie Deirdre Hickey | 4 | $6472.00 | ASK_USER | 486 - Sub-contractors | false |
| AGL | 4 | $1317.38 | ASK_USER | Manual review | false |
| Budget | 4 | $1141.18 | ASK_USER | 493 - Travel - National / 494 - Travel - International | false |
| Edmonds Landscaping Supplies | 4 | $912.00 | ASK_USER, often ACT-HV/ACT-FM/ACT-GD | 446 - Materials & Supplies / 432 - Hire / 750 - Plant & Equipment | false |
| Liberty Maleny | 4 | $770.61 | ASK_USER, often ACT-HV/ACT-FM/ACT-GD | 446 - Materials & Supplies / 432 - Hire / 750 - Plant & Equipment | false |
| Taxi Receipt | 4 | $223.58 | ASK_USER | 493 - Travel - National / 494 - Travel - International | false |
| Apple Pty Ltd | 4 | $116.96 | ASK_USER | Manual review | false |
| Firecrawl | 4 | $53.54 | ACT-IN | 485 - Subscriptions | after three clean test publishes |
| Railway Corporation | 4 | $23.07 | ACT-IN | 485 - Subscriptions | after three clean test publishes |
| Hatch Electrical | 3 | $24397.09 | ASK_USER, often ACT-HV/ACT-FM/ACT-GD | 446 - Materials & Supplies / 432 - Hire / 750 - Plant & Equipment | false |
| Kennedy's | 3 | $21151.41 | ASK_USER, often ACT-HV/ACT-FM/ACT-GD | 446 - Materials & Supplies / 432 - Hire / 750 - Plant & Equipment | false |
| Bionic Self Storage | 3 | $18115.00 | ASK_USER, often ACT-HV/ACT-FM/ACT-GD | 446 - Materials & Supplies / 432 - Hire / 750 - Plant & Equipment | false |
| The Matnic Trust | 3 | $9859.94 | ASK_USER | 486 - Sub-contractors | false |
| Carbatec Brisbane | 3 | $8726.05 | ASK_USER, often ACT-HV/ACT-FM/ACT-GD | 446 - Materials & Supplies / 432 - Hire / 750 - Plant & Equipment | false |
| Nicholas Marchesi | 3 | $7049.50 | ASK_USER | Manual review | false |
| Container Options | 3 | $6005.60 | ASK_USER, often ACT-HV/ACT-FM/ACT-GD | 446 - Materials & Supplies / 432 - Hire / 750 - Plant & Equipment | false |
| The Sand Yard | 3 | $3385.96 | ASK_USER | Manual review | false |
| Sunshine Coast Council | 3 | $1827.83 | ASK_USER | Manual review | false |
| Thrifty | 3 | $1609.91 | ASK_USER | 493 - Travel - National / 494 - Travel - International | false |
| Unknown Supplier | 3 | $1247.09 | ASK_USER | Manual review | false |
| Budget Car and Truck Rental (NT) | 3 | $1069.38 | ASK_USER | 493 - Travel - National / 494 - Travel - International | false |

## Output Files

- thoughts/shared/reports/dext-routing-pack-2026-05-15/dext-fields-to-add.csv
- thoughts/shared/reports/dext-routing-pack-2026-05-15/dext-category-routing.csv
- thoughts/shared/reports/dext-routing-pack-2026-05-15/dext-supplier-routing.csv

## Verification Status

verified: Generated from config/dext-routing-sections.json and the latest Dext CSV export when present.
inferred: Suggested project/category/routing is based on configured ACT bookkeeping rules and vendor names, not Dext UI state.
unverified: No live Dext settings were changed or checked by this script.

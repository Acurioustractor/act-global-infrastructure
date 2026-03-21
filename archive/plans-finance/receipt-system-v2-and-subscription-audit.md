# Receipt System v2 + Subscription Audit

**Created:** 2026-03-17
**Goal:** Fix receipt capture filtering, centralise to accounts@act.place, audit subscriptions, replace dumb/old SaaS

---

## Part 1: How the Current System Performed

### Last Run (90-day scan, 4 mailboxes)
```
Scanned:  453 emails
Captured:  14 (3.1%)
No attach:  8 (1.8%) — THESE ARE LOST RECEIPTS
Marketing: 242 (53.4%) — correctly filtered
Skipped:  189 (41.7%) — already captured in earlier runs
```

### What's Wrong

**Problem 1: "NO ATTACH" receipts are being lost**

These 8 emails ARE receipts but have no PDF attachment — the receipt is inline HTML or a link:
- Uber trip receipts (3) — Uber sends HTML receipts, not PDF
- Apple tax invoices (2) — Apple sends inline HTML invoices
- Obsidian receipt — Stripe receipt with link, no PDF
- Telstra statement — link to download PDF
- HighLevel — false positive (marketing), but caught as "NO ATTACH" not "SKIP"

**Fix:** For known vendors that send HTML receipts (Uber, Apple, Telstra):
1. Parse the email HTML body to extract receipt data (amount, date, description)
2. Generate a PDF from the HTML using puppeteer/playwright
3. Or: follow the "View receipt" link, screenshot it, save as PDF

**Problem 2: Marketing filter is keyword-based — fragile**

The `marketingSignals` array has 20 patterns but Qantas alone sends dozens of marketing variants. We're catching them, but it's a whack-a-mole game. Better approach:

**Fix:** Invert the logic. Instead of "is this marketing? skip" → use "is this a receipt? keep":
- Has attachment AND attachment is PDF/image → KEEP (current logic, works)
- Subject contains receipt/invoice/payment/confirmation → KEEP
- From address matches billing pattern (noreply@, receipts@, billing@) → KEEP
- **Everything else → SKIP** (don't even fetch the full message)

Currently the script fetches the FULL message (slow, API-heavy) before deciding. Fetch metadata first (subject + from), decide, THEN fetch body only if it's a receipt.

**Problem 3: Gmail search query is too broad**

The query `(from:qantas.com OR from:uber.com ...) (receipt OR invoice OR payment OR billing...)` returns ALL emails from these domains that mention "payment" anywhere — including marketing emails like "earn points on payments."

**Fix:** Tighter query per vendor:
- Qantas: `from:qantas.com subject:(receipt OR "e-ticket" OR "tax invoice")`
- Uber: `from:uber.com subject:("your trip" OR receipt)`
- Generic: Keep broad for small vendors, tight for high-volume ones

**Problem 4: Amount extraction misses most receipts**

Only extracted amounts from 2 of 14 captured receipts. The regex patterns only check subject + snippet, but most receipts have amounts inside the PDF, not the subject line.

**Fix:** For captured PDFs, run OCR/text extraction:
- `pdf-parse` npm package for text PDFs
- For image receipts: Google Vision API or Tesseract
- Extract: amount, date, ABN, vendor name
- This is what Dext did — we need to replicate it

### What's Working Well

- Vendor pattern matching (102 vendors) — comprehensive
- Deduplication via gmail_message_id — no double-processing
- Attachment download + Supabase Storage upload — reliable
- 4-mailbox scanning — covers all act.place accounts
- Rate limiting (300ms between API calls) — respects Gmail limits

---

## Part 2: Centralise Receipts to accounts@act.place

### Why
- benjamin@ gets 273 billing emails mixed with 1000s of other emails
- nicholas@ gets 89 — same problem
- hi@ gets marketing + some billing
- **accounts@** should be THE receipt inbox — clean, focused, auditable

### How

**Step 1: Gmail routing rules (in Google Admin)**

In Google Workspace Admin → Gmail → Routing:
- Rule: If `from:` matches any vendor domain AND subject matches receipt keywords → **also deliver to accounts@act.place**
- This is a COPY, not a redirect — original still arrives in the person's inbox

**Step 2: Vendor billing email changes**

For each SaaS subscription, update the billing contact email:
- Xero → accounts@act.place
- Webflow → accounts@act.place
- Supabase → accounts@act.place
- HighLevel → accounts@act.place
- Vercel, OpenAI, Anthropic, etc.

**Priority list** (change these first — highest spend):
1. Webflow ($2,833/6mo)
2. Claude.AI ($1,048/6mo)
3. OpenAI ($593/6mo)
4. Supabase ($539/6mo)
5. HighLevel ($513/6mo)
6. Notion ($474/6mo)
7. Xero ($375/6mo)
8. LinkedIn ($375/6mo)
9. Dialpad ($280/6mo)
10. All others

**Step 3: Update capture script to prioritise accounts@**

```javascript
// Scan accounts@ first (should have all receipts)
// Then scan other mailboxes for any that slipped through
const users = ['accounts@act.place', 'benjamin@act.place', 'nicholas@act.place', 'hi@act.place'];
```

**Step 4: Auto-forward rule for Xero-connected vendors**

Qantas, Uber, Virgin, Booking.com auto-create bills in Xero already. For these:
- Don't need email capture at all — receipt is on the ACCPAY bill
- Just need the phantom payable fix (un-reconcile & match)

---

## Part 3: Receipt Capture v2 Architecture

### Current Flow (v1)
```
Gmail (4 mailboxes) → capture-receipts.mjs → receipt_emails table
                                            → Supabase Storage (PDFs)
                                            ↓
                       match-receipts-to-xero.mjs → links to xero_transaction_id
                                            ↓
                       upload-receipts-to-xero.mjs → Xero Attachments API
```

### Proposed Flow (v2)
```
Gmail (accounts@ primary)
  → Light scan (metadata only, no full message fetch)
  → Receipt classifier (is this a receipt? confidence score)
  → If receipt:
    → Fetch full message + attachments
    → Extract data from PDF/HTML (amount, date, vendor, ABN)
    → Store in receipt_emails + Supabase Storage
    → Auto-match to Xero transaction (vendor + amount + date)
    → Auto-upload to Xero if match confidence > 90%
  → If not receipt:
    → Skip (don't even fetch full message)

Xero-connected vendors (Qantas, Uber, Virgin, Booking.com):
  → Already have receipts on ACCPAY bills
  → Separate process: match bills to bank transactions
  → No email scanning needed

SaaS vendors with no email receipt:
  → API-based receipt fetch (Stripe API, etc.)
  → Or: scheduled browser automation to download from portals
```

### Key Improvements

1. **Metadata-first scanning** — fetch only Subject + From + Date first. Only fetch full message if classified as receipt. Saves 80%+ of API calls.

2. **HTML receipt rendering** — For Uber, Apple, Telstra that send HTML receipts:
   ```javascript
   // Use playwright to render HTML email → PDF
   const browser = await chromium.launch();
   const page = await browser.newPage();
   await page.setContent(emailHtmlBody);
   const pdf = await page.pdf({ format: 'A4' });
   ```

3. **PDF text extraction** — For captured PDFs, extract structured data:
   ```javascript
   import pdfParse from 'pdf-parse';
   const { text } = await pdfParse(pdfBuffer);
   // Extract: amount, date, ABN, vendor, line items
   ```

4. **Smarter matching** — Current matcher uses exact vendor name. Add:
   - Fuzzy vendor name matching (Levenshtein distance)
   - Amount ± 5% tolerance (for FX conversion)
   - Date ± 3 day window
   - Fall back to ACCPAY bill matching if no bank transaction match

5. **Confidence-based auto-upload** — If vendor + amount + date all match with >90% confidence, upload to Xero automatically. Below 90%, flag for review.

---

## Part 4: Subscription Audit — What to Keep, Cut, Replace

### Current SaaS Spend (~$28,600/year estimated)

| Subscription | $/mo (est) | $/yr | Verdict | Notes |
|---|---|---|---|---|
| **Webflow** | $54 × multiple sites | ~$3,200 | REVIEW | 2 sites (ACT + JusticeHub). Is $54/site justified? |
| **Mighty Networks** | $141 | ~$1,700 | CUT or REPLACE | Community platform. Low usage? Consider Discord (free) or self-hosted |
| **Claude.AI** | $210 | ~$2,500 | KEEP | Core to operations (but check: is this personal + business overlap?) |
| **OpenAI** | $54 | ~$650 | REDUCE | API usage. Check if Anthropic API covers all use cases |
| **Supabase** | $90 | ~$1,080 | KEEP | Core infrastructure, no alternative |
| **HighLevel** | $57 | ~$680 | REVIEW | CRM. Are we using it enough to justify? Consider HubSpot free tier |
| **Notion** | $158 | ~$1,900 | KEEP | Core workspace. Workers integration built |
| **Xero** | $75 | ~$900 | KEEP | Core accounting. Non-negotiable |
| **LinkedIn** | $75 | ~$900 | REVIEW | Premium/Sales Navigator. Is it generating leads? |
| **Telstra** | $100 | ~$1,200 | KEEP | Mobile/internet. Shop around annually |
| **Dialpad** | $56 | ~$670 | REVIEW | VoIP. Do we need this? Mobile works for most calls |
| **Codeguide** | $43 | ~$516 | CUT | SCAM / unauthorised. Cancel immediately |
| **Zapier** | $50 | ~$600 | REPLACE | Self-host with n8n (open source) or use Supabase Edge Functions |
| **Updoc** | $40 | ~$480 | REVIEW | What is this? Investigate |
| **Vercel** | $24 | ~$288 | KEEP | Hosting. Good value |
| **Squarespace** | $29 | ~$348 | REVIEW | Which site? Can it move to Webflow or self-hosted? |
| **Cursor AI** | $25 | ~$300 | CUT | Have Claude Code now. Redundant |
| **Firecrawl** | $16 | ~$192 | KEEP | Web scraping for GrantScope. Good value |
| **Anthropic API** | $17 | ~$200 | KEEP | Bot + agents. Core |
| **Apple** | $18 | ~$216 | KEEP | iCloud/services |
| **Audible** | $16 | ~$200 | PERSONAL? | Is this business or personal? |
| **Garmin** | $28 | ~$336 | PERSONAL? | Fitness subscription. Personal? |
| **DocPlay** | $10 | ~$120 | PERSONAL? | Documentary streaming. Personal? |
| **Descript** | $447 (one-off?) | — | CHECK | 2 charges in Nov. Still active? |
| **Belong** | $35 | ~$420 | KEEP | Internet. Check if still needed |

### Immediate Cuts (save ~$1,500/year)
1. **Codeguide** — $516/yr — Unauthorised/scam. Cancel via NAB dispute.
2. **Cursor AI** — $300/yr — Redundant with Claude Code.
3. **Zapier** — $600/yr — Replace with n8n or Supabase Edge Functions.
4. **Mighty Networks** — Review usage. If <10 active users, cut ($1,700/yr).

### Open Source Replacements

| Current | Cost | Open Source Alternative | Savings |
|---|---|---|---|
| **Zapier** ($600/yr) | n8n (self-hosted on Vercel/Railway) | $600/yr |
| **Mighty Networks** ($1,700/yr) | Discord (free) or Discourse (self-hosted) | $1,700/yr |
| **Dialpad** ($670/yr) | Matrix/Element (self-hosted VoIP) or just use mobile | $670/yr |
| **HighLevel** ($680/yr) | Twenty CRM (open source, self-hosted) or HubSpot free | $680/yr |
| **Squarespace** ($348/yr) | Move to existing Webflow or self-hosted Next.js | $348/yr |

**Potential savings: $4,000–$5,000/year**

### Personal vs Business

These subscriptions need classification — if personal, they shouldn't be on the business card:
- Audible ($200/yr)
- Garmin ($336/yr)
- DocPlay ($120/yr)
- ChatGPT ($125 — already cancelled?)

If personal: remove from business card, not tax-deductible, not R&D eligible.

---

## Part 5: Implementation Priority

### Week 1: Quick Wins
- [ ] Cancel Codeguide (NAB dispute + block merchant)
- [ ] Cancel Cursor AI subscription
- [ ] Classify Audible/Garmin/DocPlay as personal or business
- [ ] Update billing emails to accounts@act.place for top 10 SaaS vendors
- [ ] Set up Gmail routing rule in Google Admin

### Week 2: Receipt System v2
- [ ] Refactor capture-receipts.mjs: metadata-first scanning
- [ ] Add HTML receipt rendering (Uber, Apple, Telstra)
- [ ] Add PDF text extraction for amount/date
- [ ] Improve matcher: fuzzy vendor names, amount tolerance, date window
- [ ] Test on accounts@ mailbox

### Week 3: Subscription Optimisation
- [ ] Review Mighty Networks usage — cut if low
- [ ] Set up n8n to replace Zapier
- [ ] Review HighLevel — are pipelines being used?
- [ ] Review Dialpad — needed?
- [ ] Review LinkedIn Premium ROI

### Ongoing: Build the Subscription Tracker
- [ ] Auto-detect recurring charges from Xero data
- [ ] Dashboard in Command Center showing all active subs
- [ ] Alert on new unknown recurring charges (catch future Codeguides)
- [ ] Monthly subscription spend report
- [ ] Renewal date tracking + cancellation reminders

---

## Part 6: The Unknown Charge Alert System

The Codeguide situation could have been caught months ago. Build this:

```
Daily job (tag-xero-transactions.mjs enhancement):
  1. Scan new SPEND transactions
  2. If vendor NOT in vendor_project_rules → flag as unknown
  3. If unknown vendor appears 2+ times → alert via Telegram
  4. Message: "Unknown recurring charge: CODEGUIDE.DEV $40.78 (2nd occurrence).
              Authorised? Reply YES to whitelist or NO to investigate."
  5. If NO → auto-add to dispute tracking list
```

This turns the receipt system from passive (scan and capture) to active (detect anomalies and alert).

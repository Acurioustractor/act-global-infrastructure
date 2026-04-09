# Vendor Patterns — Per-Vendor Receipt Playbook

How each vendor flows into Xero and where their receipts actually live. Update when you discover a new pattern.

Format: each vendor has a **flow**, **receipt location**, **quirks**, and **action** section.

---

## Qantas (and Qantas Group Accommodation)

**Flow:**
- Qantas Business Rewards connector → ACCPAY bill in Xero with PDF receipt attached
- Bank feed creates a separate SPEND transaction on NAB Visa 1-3 days later
- Bill and SPEND are NOT auto-reconciled — require manual "Find & Match" in Xero UI OR our `sync-bill-attachments-to-txns.mjs` script

**Receipt lives on:** bill side (`xero_invoices`), NOT bank txn side

**Quirks:**
- ~97% of Qantas bills have receipts via the connector
- Many Qantas bank txns show as "unreceipted" even though the receipt exists on a matching bill
- Amounts between bill and bank txn often match exactly but can differ by a few dollars (FX rounding, change fees)
- 40+ unreceipted Qantas SPEND txns in Q2+Q3 FY26 are waiting for manual Find & Match — the bills have receipts, the bank txns don't

**Action:**
- Run `sync-bill-attachments-to-txns.mjs Q2 Q3 --apply` to auto-copy exact matches
- For the rest, Nic or accountant needs to run Find & Match in Xero UI
- Do NOT attempt Qantas portal downloads — the receipts are already in Xero, just in the wrong place

---

## Uber (Uber Business)

**Flow:**
- Uber Business → email receipts to benjamin@act.place and nicholas@act.place
- Dext captures via inbox rules → ACCPAY bill in Xero with PDF
- Bank feed creates SPEND txn on NAB Visa

**Receipt lives on:** bill side (mostly — Dext captures it)

**Quirks:**
- Personal Uber rides bypass the Business account and only appear on NAB Visa statement. No receipt anywhere.
- Amounts under $5-10 often don't make it to Dext (unclear filter rule)
- 147 unreceipted Uber SPEND in Q2+Q3 FY26 — most are <$50

**Action:**
- Encourage using Uber Business for ALL rides (even personal — they're tagged and filtered)
- Copy from bill via sync script where possible
- For truly unreceipted small ones: journal entry or accept as small cash/no-GST expense

---

## Webflow

**Flow:**
- Auto-email receipts to benjamin@
- Dext → ACCPAY bill
- Bank feed creates SPEND on NAB Visa

**Receipt lives on:** bill side

**Action:** `sync-bill-attachments-to-txns.mjs` picks these up cleanly. 8 pairs caught in Q2+Q3.

---

## Apple / Apple Pty Ltd

**Flow:**
- Apple sends receipt emails for subscriptions
- Dext may or may not capture (mix of formats)
- Bank feed creates SPEND

**Quirks:**
- Contact name varies: "Apple", "Apple Pty Ltd", "Apple Australia", "Apple Inc"
- Subscription receipts arrive up to 2-4 weeks AFTER the bank charge
- Some subscriptions are personal (Apple Music) vs business (iCloud+) — needs classification

**Action:**
- Vendor aliases in matcher: "apple", "apple pty ltd", "apple australia", "apple inc"
- Use the exact-match promotion (vendor >=0.9 + amount exact + any date within 60d)

---

## Anthropic / OpenAI / Claude.AI / Cursor AI / Firecrawl / Vercel / Notion Labs / Bitwarden / Figma / Dialpad / HighLevel / Stripe / PayPal

**Flow:** SaaS subscriptions. Each one sends a receipt email, Dext captures most, ACCPAY bill gets created.

**Receipt lives on:** bill side

**Action:** These all work via `sync-bill-attachments-to-txns.mjs`. Named vendor aliases exist for each.

---

## NAB / NAB Fee / NAB International Fee

**Flow:** Bank fees — no receipt, ever.

**Action:** `NO_RECEIPT_NEEDED` classification. Auto-mark in completeness report.

---

## Bank transfers (SPEND-TRANSFER type)

**Flow:** Money moved between ACT bank accounts. Not a business expense.

**Action:** `NO_RECEIPT_NEEDED`. These need manual "Transfer money" reconciliation in Xero UI, not receipts.

---

## Nicholas Marchesi / NM Personal (BASEXCLUDED owner drawings)

**Flow:** Owner drawings from the business account to Nic's personal account.

**Receipt lives on:** N/A — owner drawings don't have receipts

**Action:** Already tagged as `BASEXCLUDED` in Xero — filter excludes from BAS reports. Should not appear as "missing receipts".

---

## Maleny Hardware / Liberty Maleny / IGA Maleny / small local vendors

**Flow:** In-person purchases on NAB Visa or cash. Usually no auto-email receipt. Nic photos the receipt via Xero ME mobile app → lands in `receipt_emails` with `source='xero_me'`.

**Quirks:**
- Only works if Nic remembers to use Xero ME at the counter
- Missing receipts here are genuinely missing (paper receipt lost)

**Action:**
- For missing: accept loss, journal entry if material
- Ensure Xero ME is Nic's habit

---

## Contractors (Samuel Hafer, Chris Witta, Joseph Kirmos, Defy Manufacturing, etc.)

**Flow:** Contractor invoices → ACCPAY bill with PDF → bank transfer (SPEND) when paid.

**Receipt lives on:** bill side (100% of the time if invoice was entered)

**Quirks:**
- Large single amounts (Samuel Hafer $19,500 in Q1, Joseph Kirmos $4,500 in Q3)
- Need ABN on file for > $75
- "Receipt" here = the contractor's invoice itself, PDF attached to the bill

**Action:** Confirm every contractor has an AUTHORISED or PAID bill with PDF. Chase missing invoices from the contractor directly.

---

## Unknown / new vendors

When a new vendor shows up that's not documented here:
1. Run `bas-completeness.mjs {quarter}` and grep for the vendor name
2. Check if they fit a known pattern (SaaS / hardware / contractor / fee)
3. Add a section here with the pattern you discovered
4. Run `node scripts/bas-retrospective.mjs` to recompile learnings

---

*This file is the institutional memory for vendor handling. Every new quirk discovered belongs here. Keep it up to date — future-Ben/Nic will thank you.*

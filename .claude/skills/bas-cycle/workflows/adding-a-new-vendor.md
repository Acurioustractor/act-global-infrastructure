# Adding a New Vendor to the Receipt Pipeline

When a new vendor shows up in the BAS gap reports or the `bas-completeness` MISSING list, you might need to teach the pipeline how to find that vendor's receipts in Gmail. This is a 2-file change that takes ~5 minutes.

## When to add a new vendor

Add a new vendor when **all** of these are true:
- The vendor appears in the gap reports with ≥ 3 transactions OR ≥ $100 total
- The vendor emails receipts (not vendor-portal-only like Anthropic or Apple private subs)
- The vendor isn't already in `scripts/lib/gmail-vendor-queries.mjs`

Don't add a new vendor for:
- One-off transactions you won't see again
- Vendor-portal-only receipts (the pipeline can't fetch those)
- Cash/wallet purchases (no digital trail to search)

## The 2-file change

### File 1: `scripts/lib/gmail-vendor-queries.mjs`

Add an entry to `VENDOR_QUERY_MAP` keyed by the normalised vendor name (the way it appears in Xero's `contact_name`, lowercased and trimmed).

The query format is a Gmail search string. Common patterns:

```javascript
// Simple: from: a specific domain
'example vendor': 'from:example.com (receipt OR invoice)',

// Multiple from: addresses (vendor has alias)
'example vendor': '(from:example.com OR from:billing.example.com) (receipt OR invoice)',

// Vendor billed via Stripe — search both the vendor domain AND Stripe
'example vendor': '(from:example.com OR from:stripe.com) example (receipt OR invoice)',

// Vendor with a unique product name in the subject
'example vendor': 'from:example.com ("product-name" OR receipt OR invoice)',

// Bank fees / accounts where no receipt exists — use empty string to skip
'example bank fee': '',
```

**Tips for writing good queries:**

- Use `from:domain.com` rather than `from:"Full Vendor Name"` — vendors often send from multiple human-readable names
- Include `(receipt OR invoice)` or `(receipt OR invoice OR tax)` to filter noise
- Date window is added automatically by `buildGmailQuery()` — don't include `after:` or `before:` in your base query
- Test queries in Gmail's search box first. If you can find the receipt manually, the query is right.
- Keep keys lowercase and matched to the Xero contact_name exactly

### File 2: `.claude/skills/bas-cycle/references/vendor-patterns.md`

Add a section under "## Vendor" sorted alphabetically. Document:

```markdown
## ExampleVendor

**Flow:**
- How receipts arrive (e.g., emailed to benjamin@act.place after every charge)
- Whether Dext captures it (probably yes) → ACCPAY bill in Xero with PDF
- Whether bank feed creates a separate SPEND on NAB Visa (usually yes)

**Receipt lives on:** bill side (via Dext) or SPEND side (via Xero ME) or BOTH

**Quirks:**
- Any vendor-specific weirdness (amounts differ between email and bank charge because of FX, fees, etc.)
- Any contact_name variations you've seen ("Example", "Example Ltd", "example.com")
- Whether there's a vendor portal fallback if Gmail doesn't catch it

**Action:**
- Which script handles this vendor by default
- When a human needs to intervene
```

Keep it under 150 words. If the vendor has serious quirks, create a dedicated file and link to it.

## Worked example: adding "FictionalCorp"

Say "FictionalCorp" shows up in Q2 FY26 gap report with 12 unreceipted transactions. You Google the vendor, find they email receipts from `billing@fictionalcorp.io`.

**Step 1:** Add to `scripts/lib/gmail-vendor-queries.mjs`:

```javascript
'fictionalcorp': 'from:fictionalcorp.io (receipt OR invoice)',
'fictional corp': 'from:fictionalcorp.io (receipt OR invoice)',  // alias if Xero contact_name differs
```

**Step 2:** Add to `vendor-patterns.md`:

```markdown
## FictionalCorp

**Flow:**
- Monthly subscription, receipt emailed to benjamin@ from billing@fictionalcorp.io
- Dext was NOT catching these (not in its rule set)
- Bank feed creates SPEND on NAB Visa 1-2 days after charge

**Receipt lives on:** bank SPEND side (after Gmail pipeline runs)

**Quirks:**
- None identified yet. Monthly $12.

**Action:**
- Handled by `gmail-to-xero-pipeline.mjs` automatically via the query above
- No human intervention needed unless the vendor changes billing systems
```

**Step 3:** Test the query by running the pipeline with a vendor filter:

```bash
node scripts/gmail-to-xero-pipeline.mjs Q2 --vendors fictionalcorp
```

If it finds candidates, commit both files. If not, iterate on the query until it does.

**Step 4:** Run the pipeline in apply mode to backfill:

```bash
node scripts/gmail-to-xero-pipeline.mjs Q2 Q3 --apply --vendors fictionalcorp
```

**Step 5:** Re-run completeness to confirm the gap closed:

```bash
node scripts/bas-completeness.mjs Q2 Q3
```

## Adding a vendor that bills via Stripe

Many SaaS vendors don't send receipts themselves — they use Stripe. If the vendor's own domain doesn't return results, try querying Stripe with the vendor name in the subject:

```javascript
'example vendor': '(from:example.com OR from:stripe.com) example (receipt OR invoice)',
```

This catches both cases: receipts the vendor sends directly and receipts Stripe sends on their behalf.

## When a vendor is unfindable

If Gmail deep search returns nothing for a vendor even after query tuning, the receipt probably lives somewhere the pipeline can't reach:

- **Vendor portal only** (Anthropic, some Apple subs) — document this as a known limitation, not a pipeline failure. These need manual export from the vendor's billing dashboard.
- **Personal email** — check if the vendor account was started with a personal email before the business inbox existed. Forward old receipts to the business inbox.
- **Physical receipt only** — cash/in-store. Use Xero ME mobile app going forward; accept historical loss.

Log these as `NO_RECEIPT_NEEDED` with a documented reason, or accept them as part of the ~5% residual gap.

## When the vendor query map gets big

At 50+ entries, consider splitting `gmail-vendor-queries.mjs` into categories (dev-tools, travel, SaaS, utilities) to stay readable. Not needed yet.

---

## The deeper point

Every vendor added here is institutional knowledge being codified. After 6-12 months of BAS cycles, the vendor map should know virtually every recurring ACT vendor by heart, and new vendor additions become rare. The first quarter you run this skill, you'll add 5-10 vendors. The fourth quarter, maybe one. That's the learning loop working.

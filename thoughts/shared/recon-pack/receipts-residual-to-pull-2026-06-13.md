# Receipts — the residual only you can pull (2026-06-13)

**Read this first.** Receipts are **~99% already done.** The reconcile-sidecar already stages a receipt link on every line it can (Gmail + Dext, inline, one click). This sheet is the short residual the pipeline *cannot* fetch — portal logins, physical slips, and a couple of "decide, don't chase" items. Work this list once and the receipt side is closed.

**The reframe that saves you hours:** the BAS is gated by **finishing the reconcile (the matching)**, not by receipts. Of everything below, only **Bunnings + Virgin carry GST** (~$87 combined). The SaaS items (Supabase, Anthropic, Descript) are **international → GST-free**, so their receipts **do not change the BAS by a cent** — they're for clean books + R&D evidence only. Total GST genuinely at risk across the whole chase ≈ **$347**. So: if the goal is "BAS ready," finish the reconcile and don't let receipts block you; if the goal is "clean books for Standard Ledger + R&D substantiation," pull the list below.

---

## A. Found — just attach (from the right mailbox)

These three Supabase invoices exist in Gmail, but in mailboxes the pipeline flagged separately (invoice-relay address). Open each in **that** mailbox, download the PDF, attach to the Xero bill. *(This Cowork session is signed into benjamin@ only, so I can't pull them for you — they're in the other three.)*

| Vendor / inv | $ | Date | Qtr | Mailbox | Open | GST |
|---|--:|---|---|---|---|---|
| Supabase #WSHNYD-00017 | 119.77 | 22 Dec 2025 | Q2 | **nicholas@** | `mail.google.com/mail/u/0/#all/19b40af6d6c467ed` | GST-free |
| Supabase #WSHNYD-00019 | 124.47 | 23 Feb 2026 | Q3 | **accounts@** | `mail.google.com/mail/u/0/#all/19c7f9ba9c1677ec` | GST-free |
| Supabase #WSHNYD-00020 | 124.59 | 23 Mar 2026 | Q3 | **hi@** | `mail.google.com/mail/u/0/#all/19d1047eec9b68f1` | GST-free |

*(Open the link while logged into the matching mailbox — the `u/0` may need to be the right account, or just search the inbox for "Supabase invoice".)*

## B. Portal / physical — only you can pull (login required)

No email exists for these (verified across all four mailboxes on 2 Jun). You have to log into the vendor and download.

| Vendor | $ | Date | Qtr | Where | GST impact |
|---|--:|---|---|---|---|
| Anthropic / Claude | 287.07 | 6 Feb 2026 | Q3 | console.anthropic.com → Billing → Invoices | GST-free (intl) — **nil BAS impact** |
| Anthropic / Claude | 286.45 | 6 Mar 2026 | Q3 | console.anthropic.com → Billing → Invoices | GST-free (intl) — **nil BAS impact** |
| Descript | 447.62 | 24 Nov 2025 | Q2 | web.descript.com → account → Billing | GST-free (intl) — **nil BAS impact** |
| Bunnings | 571.10 | 26 Feb 2026 | Q3 | PowerPass portal / physical receipt | **GST ~$51.92** — claimable |
| Virgin Australia | 385.79 | 22 Oct 2025 | Q2 | Velocity / Virgin "manage booking" itinerary, or match to an existing bill | **GST ~$35.07** — claimable |

**If you only do two, do Bunnings + Virgin** — they're the only ones that move the GST.

## C. Identify / decide — not a receipt chase

| Item | $ | Date | What it needs |
|---|--:|---|---|
| Mounty Container Supplier | 11,000 | 4 Nov 2025 | **Unpaid bill, no invoice number, no document.** On cash-basis GST it isn't in the BAS anyway (unpaid). Confirm with Nic whether it's a real purchase — if not, **void it**, don't chase a receipt. Flag to SL. |
| Chris Witta | 591.00 | 20 Oct 2025 | Identify what the line actually is before chasing (the only Gmail hit was unrelated). |
| Flight Bar Witta | 88.95 | 5 Feb 2026 | Café/EFTPOS — card slip only, no tax invoice. Record the statement line; immaterial. |
| Qantas (several) | various | Q2/Q3 | **Match, don't hunt** — the tax invoices are already on bills in Xero; the card lines need matching in the reconcile, not a new receipt. |

---

## How this plugs into your Xero pass

1. **Regenerate the sidecar first** (on your machine — it's from 10 Jun, pre-sprint, so it still lists already-done lines):
   - `npm run recon:check` — syncs the mirror from Xero + recomputes status
   - `npm run recon:sidecar` — rebuilds `reconcile-sidecar-q2q3-*.html` with **only the remaining Q2+Q3 lines**, each with its receipt link inline
   - *(I can't run these from Cowork — no network route to the mirror, the thing that blanked the status file last time.)*
2. **Open the fresh sidecar beside Xero → Bank accounts → Reconcile.** Work top-to-bottom; for each line the sidecar hands you the receipt link, the bill twin, and the coding. The reconcile click stays in Xero.
3. **The only lines the sidecar can't hand you a link for are the ones above** — so keep this sheet open alongside it. Attach A + B as you pass those vendors; handle C as decisions.
4. When `npm run recon:check` reads **Q2 = 0 and Q3 = 0**, re-run `node scripts/prepare-bas.mjs Q2 --save && Q3 --save` for the final figures — *then* the Standard Ledger email goes (held for those numbers per your call).

*Sources: `receipt-chase-results-2026-06-02.md`, `05-receipt-chase.md`, `reconcile-sidecar-q2q3-2026-06-11.html`, `recon-status-latest.md` (13 Jun cron). All GST figures are 1/11 of the GST-inclusive amount; confirm against the actual tax invoice when it's in hand.*

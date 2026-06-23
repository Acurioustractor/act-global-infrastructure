# SL clean-up — handoff / resume point

_Last worked: 2026-06-23. Folder: `thoughts/shared/handoffs/sl-cleanup/`. A `/sl-cleanup` skill now exists (`.claude/skills/sl-cleanup/`)._

## What this is
Standard Ledger sent a clean-up CSV: 66 unreconciled transactions on the two ACT business
accounts (NJ Marchesi T/as ACT Everyday + NAB Visa #8815, sole trader ABN 21 591 780 066),
1 Oct 2025 – 31 May 2026, each with an SL question + an empty "Your Comments" column.
We answered all 66, hunted receipts, and produced the answered CSV in identical format.

Totals (tie out): **spent $131,485.48 · received $179,613.03**.

## Deliverables (done)
- **Answered CSV (identical format):** `~/Downloads/ACT_Nicholas Marchesi - Unreconciled Transactions - ANSWERED.csv` (+ repo copy in this folder).
- **Google Sheet (answered), in hi@act.place Drive:** https://docs.google.com/spreadsheets/d/1fi7-uPldTC2STQ5nd-ckltmUmAuZFKTXvKk4_tNZLyc/edit
- `SUMMARY.md` (grouped), `verdicts.json` (per-line answers), `grounded.json` / `digest.json` / `idx.json`, `dext-recovered.json`, the `.provenance.md` sidecar, `your-comments-column.txt` (paste-ready column).

## Current receipt status (after Dext re-match + 2026-06-24 Gmail deep-hunt)
- ON_FILE_CONFIRMED **11** · GMAIL_FOUND **5** · GMAIL_LEAD **1** · GMAIL_CANDIDATE **6** · NO_RECEIPT_EXPECTED **15** (transfers/private/insurance) · RECEIPT_VENDOR_MISMATCH **2** · **GAP (missing) 26**.
- **2026-06-24 deep-hunt recovered 6 receipts** (GAP 30→26): #47 Carla $4,816 (invoice 26-00000151.pdf — **GST now claimable**), #64 Colemans $240.05, #44 Colyton $436.24, #39+#45 Audible $16.45×2, #53 Tullah lead. ADGE/JMC/Kogan candidates rejected (receipt-trap). Scripts: `sl-cleanup-gmail-deephunt.mjs` → `sl-cleanup-confirm-receipt.mjs` → `sl-cleanup-apply-receipts.mjs`. Detail in the `.provenance.md`.
- **26 lines flagged NEEDS YOUR CALL** — now written up as a one-pass decision sheet: **`DECISIONS.md`** in this folder (each line has the facts + my recommended call + the one question Ben answers).

## Key findings / decisions (don't re-derive)
- **Income answers locked:** TFN Distribution $89,361 + $55,197 → Grants Received (GST-free); Catalysing Impact $10k → Grants Received; Humanitix $1,150 → Other Revenue/ticket income (confirm net-vs-gross + GST registration); Marchesi +$20k → Owner Funds Introduced (not income); Bionic +$2,420 → refund, offset original expense; AGA +$668 → insurance payout, offset travel.
- **Carla Furnishers RESOLVED:** the two same-day $5,590 card charges are ONE $11,180 purchase (single Dext receipt 2025-11-17 covers both) — NOT a duplicate. (Was flagged duplicate-risk; corrected.)
- **Coincidental-amount false receipts** rejected (Christopher Dods $2k, Shane Bloomfield "Bunnings"→Woolworths, Marcus Travers, Audible→Amazon). Don't trust amount-only matches.
- **Nic super -$20k → Drawings** (sole trader's own super isn't a business expense); Mall Medical → Drawings + GST-free (medical).
- **Dext has NO API** — our Dext copy is a single CSV snapshot loaded 14 May 2026; April (49) & May (16) receipts are under-captured vs ~300–500/mo earlier. That's why late-period lines don't match.

## Two open blockers
1. **Fresh Dext export** (to recover the 30 missing): Ben exports from Dext UI (Costs/Documents → 1 Oct 2025–31 May 2026 → CSV + images folder). Then `node scripts/import-dext-export-evidence.mjs <csv> --files-dir <folder> --apply` → re-run `node scripts/sl-cleanup-dext-rematch.mjs`.
2. **Direct write to the linked SL sheet** (`docs.google.com/.../1zpv4Qg8KGEaWJ7rzmiTDQnPlV0_0HUWHtVEpFb_bFA`) is blocked on a Google Workspace Admin change: add scope `https://www.googleapis.com/auth/spreadsheets` to service-account domain-wide delegation (client ID `111404731300512547492`, `act-410@act-living-wiki.iam.gserviceaccount.com`) + share the sheet with benjamin@act.place. Then `node scripts/sl-cleanup-sheet-sync.mjs --probe` → dry-run → `--apply` (writes col G, matched by date+amount). Until then: copy-paste column G from the answered Google Sheet.

## Pipeline scripts (the /sl-cleanup skill)
`scripts/sl-cleanup-reconcile.mjs` (parse+ground) → `sl-cleanup-gmail-hunt.mjs` (ACT-mailbox receipt hunt) → `sl-cleanup-digest.mjs` → workflow `.claude/skills/sl-cleanup/workflows/classify-workflow.mjs` (classify+verify) → `sl-cleanup-build-csv.mjs` (answered CSV) → `sl-cleanup-dext-rematch.mjs` (relaxed receipt recovery) → `sl-cleanup-sheet-sync.mjs` (write to sheet, scope-gated).

## MAIN TASK for next session — "finalise the SL clean-up"
1. **Ben answers the 26 NEEDS-YOUR-CALL lines → see `DECISIONS.md` (one-pass sheet, 2026-06-24).** Big ones: Circularity $32,780 nature; Ross Built $20k project + real invoice; SP Retro $4,497; little beach shacks; the Beau Joseph/Tarik/James William transfers; Audible/Mall Medical/Prague personal-vs-business.
2. Re-import a fresh Dext export → re-match → close as many of the **26** GAPs as possible (mostly small travel/meals). **BLOCKER 1, Ben.**
3. ~~Deep-hunt Gmail high-value~~ **DONE 2026-06-24** — recovered 6 (Carla/Colemans/Colyton/Audible×2/Tullah). The rest of the GAP is small paper/card receipts → needs the Dext export, not more Gmail.
4. Unblock + run the sheet-sync (or paste) so the linked SL sheet's "Your Comments" is fully populated. **BLOCKER 2, Ben** (Sheets scope + share).
5. After Ben's calls: fold answers into `verdicts.json` → regenerate the answered CSV + Google Sheet → finalise → hand back to Standard Ledger.

> Nothing here was written to Xero. All read-only drafts for Ben to review + send.

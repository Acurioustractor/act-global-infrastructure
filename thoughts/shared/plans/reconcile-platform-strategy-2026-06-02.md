I have everything I need in the inputs (no further research required). This is a strategy memo — writing it directly. The research findings, retro, and inventory are all provided in the JSON.

Here is the memo.

---

# STRATEGY MEMO — Is the new-Xero/new-Dext stand-up a massive unlock?
**Audience:** Ben + Nic · **Decision:** whether/how to productise ACT's reconciliation + coding stack for the orgs ACT supports (Oonchiumpa, PICC, Goods/Butterfly, etc.) · **Date:** 2026-06-02

> **One-line verdict:** Yes — but the unlock is **coding-intelligence + a reconcile *cockpit*, not "reconcile-via-API"**. The reconcile click is permanently UabI-only (Xero declined it as policy, 6 May 2026). So the product is "hand the bookkeeper a clean 1:1 tab", not "auto-reconcile". That's still a real, defensible, sovereignty-differentiated product — for *partner orgs you already steward*, not as a generic Dext competitor.

---

## 1. UNLOCK VERDICT

**Is the cheat-sheet / coded-mirror approach a genuine unlock? — Yes, with a hard ceiling.**

What the 2026-06-02 NAB Visa #8815 run actually proved (106 dup deletes + 48 phantom voids + 9 recodes, all live-gated, full audit trail) is that **the expensive part of bookkeeping was never the reconcile click — it was knowing what each line *is* before you click.** Three things genuinely got unlocked:

**(a) "Already-coded → reconcile is match-not-code."** Phase 3 of the run found most debit spend was *already* coded; the task collapsed from "code 370 lines from scratch" to "confirm-and-reconcile". That reframe is the whole product thesis: if a per-org coded mirror knows the line, the human's job drops from a coding decision to a *one-click confirmation*. The coded mirror turns reconciliation from cognition into verification.

**(b) The worklist buckets are the IP.** The 3-bucket split (DANGER cluster / no-bill / safe-delete) and the five-shape classifier (DELETE_PHANTOM · DELETE_DUP · VOID_BILL · MATCH · RECODE) are the actual reusable asset. The hardest-won learning — *same amount+date+vendor is NOT a duplicate; only a shared non-empty bank Reference proves one charge recorded twice* — is exactly the kind of rule no off-the-shelf tool encodes and that prevents the catastrophic error (deleting a real separate charge, falsely un-paying an AUTHORISED bill). **MATCH-THEN-DEDUPE, never dedupe-everything.**

**(c) The API can recode but cannot reconcile — and that's fine.** Verified against the OpenAPI spec and the MCP toolset: the API *can* create/update bank transactions, recode account/tax/**project tracking** (`updateBankTransactionTracking`, preserves Business Division), void bills, attach receipts. It *cannot* set `IsReconciled` on a feed-connected line. So the product prepares everything and hands over a clean tab. **This is a feature, not a defect:** the human reconcile click is the OCAP-compatible control point and the audit boundary.

**Honest limits (the ceiling):**
- **Reconcile is UI-only, permanently.** Xero's `Reconcile via the API` request: status **DECLINED**, admin response 6 May 2026 — *"we will not be adding the ability to reconcile bank statement lines via the API or to expose unreconciled bank statement data via the public API."* This is policy, not a bug or a roadmap gap. Plan around it forever. (The only RPA route — Booke AI logging into the UI like a human — carries ToS/login-automation risk and is **out of scope** for anything touching partner/Indigenous org books.)
- **The mirror lies on `is_reconciled`.** Belong read mirror=false/live=true; RNM mirror=AUTHORISED/live=VOIDED. The batch `BankTransactions?IDs=` endpoint does **not** reliably return `IsReconciled`. **Only a per-line `GET BankTransactions/{id}` is truth** — and it's rate-limited (~1100ms). This is load-bearing: the mirror *generates* candidates; it must **never authorise** a write.
- **Archived contacts hard-block voids** via the API — a known dead-end that belongs on a manual UI list, not in an automated batch.
- **Two writes silently lost their auto-log** (transient verify error, a 429) even though the live write succeeded. The live re-read is the source of truth; the log must be reconciled against live afterward. At multi-org scale this becomes a real reliability-engineering line item.
- **The "lines to clean" headline overstated the work** once already-done lines were excluded. Be honest with partner orgs about what's actually left vs. what's already coded.

**Verdict:** genuine unlock on **coding intelligence + safe-classification + a reconcile cockpit**. Not an unlock on reconcile automation (that wall is permanent and platform-policy). The product is a **co-pilot that hands a clean tab to a human**, not an autopilot.

---

## 2. WHAT THE MARKET DOES — and the gap ACT can own

Everyone hits the same wall ACT hit. The market splits into four moves, and **none of them own ACT's gap.**

| Player | What they do | Where they land vs. the wall |
|---|---|---|
| **Dext (ex-Receipt Bank)** | Receipt/bill capture + AI line-extraction + per-supplier rules + auto-publish into Xero | Pre-codes the *document* so the bank match is trivial — but **never touches the reconcile screen**. This is ACT's *input* side. |
| **Dext Precision (ex-Xavier)** | Duplicate-bill / data-health QC: dup bills grouped by Contact+Value, mis-coded invoices, health score | **Off-the-shelf equivalent of ACT's `classify-duplicate-gst.mjs` / phantom-bill work.** A feature checklist, not a reconciler. |
| **Lightyear / ApprovalMax** | Best-in-class rules-based AP auto-coding (account+tax+tracking, 3-way PO match) / pre-payment approval | Code **bills**, not bank lines. Reconcile stays in Xero. |
| **bankreconciler.app (CodeIQ/ReconcileIQ)** | **Closest direct competitor** — AI auto-code + statement matching, posts via BankTransactions/Transfers/Payments | Documents the *identical* wall verbatim: posted items appear as green "suggested matches" needing **one-click manual confirm**. This is the reference architecture for ACT's cockpit. |
| **Booke AI** | RPA bot logs into the Xero UI like a human, clicks reconcile end-to-end | The **only** true end-to-end automation — by browser automation, with ToS/login risk. The upper bound, off-limits for partner books. |
| **Truewind / Puzzle.io / Integra / SortBooks** | AI-native GL rebuilt from scratch, "continuous reconciliation" | They **avoid the wall by owning their own ledger** — not buildable-on for ACT (committed to Xero as system-of-record), but proof the wall is real enough that funded startups route *around* it. |
| **Xero itself** | AI Toolkit (official MCP server, agent-toolkit, bank rules + in-product AI) | Signals Xero's direction: **in-product AI, not an open reconcile API.** Confirms the wall is permanent. |

**Live ecosystem events worth noting:**
- **Hubdoc shut down 8 May 2026.** Replacement "Xero Files" does **no extraction** — a real downgrade pushing users to Dext/AutoEntry/Datamolino. Anyone in ACT's orbit still on Hubdoc must migrate. (A wedge: ACT's OCR pipeline already replaces what Hubdoc did.)
- **There is NO Bank Rules API** (verified against the 913KB OpenAPI spec — zero "rule" resources; uservoice open since 2018, unshipped Sep 2025). Multi-entity rule replication is hand-work in the UI. **ACT's per-org learned `vendor→account+project` coding map IS the bank-rules layer Xero refuses to expose** — that's a moat, not a gap.
- **Xero API went paid (2 Mar 2026).** Journals + Practice Manager + **Bulk Connections** require the **Advanced tier (~US$895/mo ≈ US$10.7k/yr floor)** + metered egress (~A$2.40/GB). *(Pricing from a single third-party source — confirm on developer.xero.com before quoting a board/funder.)* Single-org/low-volume stays free (Starter, 5 connections). **Decisive economic fact:** "thin layer for a handful of orgs" = cheap; "productised multi-org Dext competitor" = a real licence line.

**The gap ACT can own (no incumbent offers all three):**
1. **Indigenous / community data sovereignty (OCAP "Possession" + CARE).** No incumbent — Xero, Dext, Intuit — offers community-controlled possession of financial data. This is ACT's genuine, uncopyable differentiator.
2. **Grant-acquittal / fund-accounting baked in** (per-grant cost-centre + acquittal exports, gift-fund separation for DGR) — ACT already runs this internally (Grant Tranches ledger, project_code tracking).
3. **The learned reconcile-safety intelligence** (the five-shape classifier + Reference-based dedup + receipt-on-the-unreconciled-copy rule) as a *per-org* asset.

ACT's differentiator is **not** cheaper bookkeeping labour (a crowded offshore market) and **not** auto-reconcile (impossible). It's **sovereignty + acquittal + safe-classification, for orgs ACT already stewards.**

---

## 3. THE ACT PLATFORM DESIGN

A multi-tenant **"reconcile + auto-code co-pilot"** sitting *on top of* each org's own Xero. Xero stays system-of-record; ACT owns the intelligence + cockpit layer.

### 3.1 Architecture (per-org, tenant-isolated)

```
 ┌─────────────────────────────────────────────────────────────┐
 │  Per-org Xero (system of record) — org owns the subscription │
 │  Dext (or ACT OCR) → publishes bills/receipts INTO Xero       │
 └───────────────┬─────────────────────────────────────────────┘
                 │  read: incremental sync (If-Modified-Since)
                 │  write: gated, live-verified (recode/void/delete/attach)
                 ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  SUPABASE MIRROR — one logical tenant per org (org_id scoped) │
 │  • xero_transactions / xero_invoices / xero_tokens per org    │
 │  • NEVER trusted for go/no-go — generates candidates only      │
 │  • PostgREST 1000-cap: paginate + reconcile fetched-vs-COUNT  │
 └───────────────┬─────────────────────────────────────────────┘
                 ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  CODING INTELLIGENCE (per-org learned)                        │
 │  • vendor → account + project/tracking map, learned per org    │
 │  • five-shape classifier (PHANTOM/DUP/VOID_BILL/MATCH/RECODE)  │
 │  • Reference-based dedup (shared non-empty ref = true dup)     │
 │  • surcharge tolerance, receipt-on-unreconciled-copy rule      │
 │  • GST-bearing vs GST-free split (BAS-impact ranking)         │
 └───────────────┬─────────────────────────────────────────────┘
                 ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  RECONCILE COCKPIT (UI)  — human-in-loop                      │
 │  • 3 buckets: DANGER / no-bill / safe-action                  │
 │  • every Tier-3 write LIVE-GATED (single-GET truth) + abort   │
 │  • attempted-vs-actual re-read after every write              │
 │  • append-only audit log per org                              │
 │  • hands a clean 1:1 tab → human clicks reconcile IN XERO     │
 └─────────────────────────────────────────────────────────────┘
```

**Non-negotiable invariants (carried straight from the 2026-06-02 run):**
- **Mirror generates, live authorises.** Every Tier-3 delete/void/recode is gated against a fresh `GET BankTransactions/{id}`. The batch `IDs=` endpoint and the mirror both lie on `IsReconciled`.
- **Hard abort gates, no gate = no write:** SPEND in the right account · live unreconciled · keeper bill PAID + HasAttachments + amount-within-surcharge · keeper's *payment itself reconciled*.
- **Reference-based dedup only.** Same amount+date+vendor ≠ duplicate.
- **Receipt-on-the-unreconciled-copy.** Never blind-delete the card txn — it holds the substantiation.
- **Attempted-vs-actual on every write.** Re-read live; confirm the write stuck AND the keeper survived; reconcile the log against live afterward (auto-log can silently drop on a 429).
- **`type` not sign; `type` not `invoice_type`; exclude DELETED on txns, DELETED+VOIDED on invoices; `xero_invoices.has_attachments` accurate, `xero_transactions.has_attachments` drifts.**

### 3.2 Where humans stay in the loop (by design, not by limitation)
- **The reconcile click** — UI-only, permanently. The human confirmation is the audit boundary and the OCAP control point.
- **Any DANGER-cluster line** (matches an unpaid AUTHORISED bill) — quarantined, never auto-actioned.
- **Archived-contact voids** — manual UI list.
- **GST-free big-dollar duplicates** — highest receipt risk, zero BAS upside → deliberate hygiene pass, never rush-deleted.
- **First-time vendor codes** — proposed, human-confirmed once, then learned.

### 3.3 OCAP / data sovereignty for Indigenous orgs (the differentiator, designed in)
- **Possession:** under OCAP, a community org's financials sitting in Xero's offshore cloud is the *weaker* posture. ACT's mirror + cockpit should be **self-hostable / community-exitable** — the org can take its mirror and walk. Extend ACT's existing wiki OCAP consent-gate ethic to financial data.
- **Tenant isolation is a sovereignty requirement, not just a SaaS nicety.** `org_id` scoping is load-bearing (the Civic World Model cross-org leak required a full rebuild — do not repeat). Per-org mirror, per-org token, per-org coding map, per-org audit log.
- **CARE (Collective Benefit, Authority to Control, Responsibility, Ethics)** layered on top: the partner org controls its coding map and its reconcile decisions; ACT provides the engine, not the authority.
- **No third-party data routing** for partner books — rules out hosted MCP (Composio/Merge/CData) for Indigenous-org tenants. Self-host the integration glue.

### 3.4 Xero multi-org / partner model (the commercial substrate)
- **Become a Xero partner; use Xero HQ + partner-only Ledger (A$6.50/mo) / Cashbook (A$15/mo)** subscribed on each org's behalf. Registered NFPs get 25% off business plans. This is the **cheapest, lowest-risk path that exists today** for "books for the orgs we support."
- **But partner plans are stripped** (no GST cashbook sold since 1 Jul 2024) — fine for dormant/simple orgs (A Kind Tractor), not for **GST-registered trading charities (Butterfly/Goods)**.
- **Multi-tenant auth:** one OAuth connection, many orgs via `Xero-Tenant-Id`; **Bulk Connections** is the accountant on-ramp — **but it gates behind the paid Advanced tier.** So: stay on free Starter (≤5 connections) as long as the partner-org count is small; budget the ~US$10.7k/yr line *only* when you cross into Bulk Connections / Journals at scale.

### 3.5 Build sequence

**MVP (already ~80% built — productise the #8815 run):**
1. Generalise the existing scripts from one account to **one org** parameterised by `org_id` + `Xero-Tenant-Id`. The classifier, gates, dedup, void/recode/delete, audit log all already exist.
2. **Tracer-bullet a second org end-to-end** — pick the simplest partner org (a dormant/low-volume one), run the full classify→gate→prepare→hand-clean-tab path on a single transaction before any batch. *One record proves the full path* — same discipline as Apple $11.99.
3. **Per-org coding map** seeded from that org's Dext archive CSV (vendor→account+project) — the bank-rules layer Xero won't give.
4. Reconcile cockpit = the existing `/finance/reconcile` cockpit, re-skinned to switch tenants. **Read-only on reconcile; the click stays in Xero.**

**v2 (productisation for partner orgs):**
5. **Grant-acquittal / fund-accounting module** — per-grant cost-centre + acquittal export + DGR gift-fund separation (Subdiv 30-B, "In Australia" test). ACT already runs the Grant Tranches ledger — generalise it.
6. **ACNC-tier-aware reporting** — cash vs accrual switch by org size (small <$500k = AIS only; medium $500k–$3M = reviewed; large >$3M = audited). **BAS/GST per ABN.**
7. **Self-host the integration glue** for Indigenous-org tenants (no third-party data routing); add the community-exit export.
8. **Per-org data-health score** (the Dext Precision equivalent ACT already has in `classify-duplicate-gst.mjs` / `dup-worksheet.mjs`).

### 3.6 Buy-vs-build call vs. Dext
**Build the intelligence + cockpit. Buy the input capture. Adopt the partner substrate.**

- **Buy/keep Dext (or ACT's own Gemini OCR — ~10× cheaper than Haiku)** for receipt/bill capture. Don't rebuild OCR — Dext has no API/MCP anyway; you operate on the data *after* it lands in Xero. (Hubdoc's death makes ACT's OCR pipeline a quiet asset.)
- **Don't buy bankreconciler.app / Lightyear / Dext Precision** — they hit the same wall and **don't carry the sovereignty + acquittal layer.** They're feature-checklists to benchmark against, not platforms to adopt.
- **Don't rebuild the ledger** (Truewind/Puzzle route) — ACT is committed to Xero as system-of-record; rebuilding the GL throws away the partner-org's existing books and the Xero partner economics.
- **Adopt the Xero partner model** as the commercial substrate (Xero HQ + Ledger/Cashbook plans).
- **Engines on the shelf** (not v1): TigerBeetle (correctness backbone *if* you ever outgrow the relational mirror — overkill at ACT's scale) · Medici (clean per-`book` tenancy model but MongoDB-only, friction vs Supabase) · ERPNext (strongest "adopt" open-source platform with native multi-company + non-profit module + self-host sovereignty, *if* you ever want off Xero — but its multi-company is corporate-group, not unrelated-tenant isolation; site-per-tenant is heavier). **None of these is v1. v1 is the mirror+cockpit you already have, parameterised by org.**

**Build-vs-build call in one line:** ACT already built the hard part (the safe-classification engine). The product is **generalise-to-multi-tenant + add acquittal + add sovereignty**, riding free Xero Starter until partner-org count forces the paid tier.

---

## 4. RISKS + THE 5 HARDEST PROBLEMS

**Risks:**
- **Scope creep into "a Dext competitor."** The defensible product is *for orgs ACT stewards* (sovereignty + acquittal). A generic multi-org reconciler is a crowded market against funded incumbents and lands you in the ~US$10.7k/yr Advanced-tier API cost with no moat. **Stay narrow.**
- **Liability of touching another org's books.** ACT writing voids/deletes/recodes into a partner's Xero is a Tier-3 external-system write *on someone else's system of record*. Needs explicit per-org authorisation, the human reconcile click as the control boundary, and the append-only audit trail per org. **This is day-shift, human-in-loop, standard mode — never AFK/looped** (per ACT's own AFK boundary: never queue an external system-of-record write into a backlog).
- **Entity-structure mismatch.** ACT Pty (R&D claimant, commercial arm) building tooling for **Butterfly/Goods (DGR charity)** and **partner orgs (Oonchiumpa/PICC)** raises: who owns the IP, who bears liability, is this an ACT-Pty commercial service or a charity-delivered capability? The R&D angle: building the *novel multi-tenant safe-classification engine* may itself be R&D-eligible for ACT Pty (genuine technical uncertainty — the live-gating + Reference-dedup logic was not knowable in advance) — **offer `rd-capture`** if you proceed. Partner orgs and the KP partnership **cannot** claim R&D; only ACT Pty.
- **Pricing/cost figures are single-sourced.** The Xero Advanced-tier ~US$10.7k/yr and per-GB egress come from one third-party (apideck). **Confirm on developer.xero.com before any board/funder quote.**

**The 5 hardest problems to solve (ranked):**

1. **Live-truth at multi-org scale within rate limits.** The only trustworthy `IsReconciled` is a per-line `GET` at ~1100ms, 5,000 calls/day/org, 60/min. Across many orgs this is the binding engineering constraint — pacing, incremental sync, and never trusting the mirror or the batch `IDs=` endpoint for a go/no-go. The whole safety model depends on this and it does not parallelise cheaply.

2. **Mirror-staleness → reliable write-gating, per org, forever.** The mirror is stale on status (Belong, RNM). The auto-log silently dropped on a 429 twice in *one* run. At N orgs you need attempted-vs-actual reconciliation and log-vs-live repair as a *standing reliability system*, not a manual hand-fix. A silent wrong write into a partner's books is the expensive, reputation-ending failure.

3. **True tenant isolation as a sovereignty guarantee.** `org_id` scoping that *cannot* leak (Civic World Model already required a full rebuild from one leak). For Indigenous orgs this is not a SaaS nicety — it's an OCAP-Possession promise. Self-hostable + community-exitable raises the operational bar well above a single-tenant Supabase mirror.

4. **The Australian compliance surface — the moat AND the build cost.** Per-grant acquittal + DGR gift-fund separation (Subdiv 30-B, "In Australia" test) + ACNC-tier-aware reporting (cash/accrual switch by size) + GST/BAS per ABN. This is exactly what generic open-source engines *don't* give you and what makes the product defensible — but it's also the bulk of the v2 build, per org, with real correctness stakes (BAS lodgement, funder verification).

5. **Bank-feed / data-acquisition for AU (the unresearched critical-path dependency).** Every org's reconcile depends on bank-feed data landing in Xero. ACT relies on Xero's own feeds + Dext push today; for a productised multi-org offering, feed coverage (CDR/open-banking, Basiq, per-bank feeds) is often the hardest, most-licensed piece — and it was **not researched** in the inputs. **Flag: this is an open unknown that could gate the whole offering** and needs its own scoping pass before any funder commitment.

---

**Assumptions flagged (per fallback):**
- "Partner orgs ACT supports" = Oonchiumpa, PICC, Goods/Butterfly, A Kind Tractor — inferred from ACT's entity map; confirm the actual target list and which are GST-registered/trading vs dormant (drives Cashbook-vs-Ledger and free-vs-Advanced-tier).
- Xero API pricing (Advanced ~US$10.7k/yr, egress ~A$2.40/GB) is single-sourced (apideck) — **confirm on developer.xero.com.**
- Bank-feed acquisition for a multi-org offering is **un-researched** — treated as an open critical-path dependency (Problem 5), not a solved input.
- Whether this is an ACT-Pty commercial service or a charity-delivered capability is a **structure/IP/liability decision for Ben + Nic** — flagged, not assumed.
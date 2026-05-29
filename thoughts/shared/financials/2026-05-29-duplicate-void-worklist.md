# Duplicate void worklist — AUTHORISED bills shadowing a PAID bill

**Generated:** 2026-05-29 · **Source:** 1880 ACCPAY bills (app DB) · tool: `scripts/detect-finance-anomalies.mjs --worklist`

---

## ✅ OUTCOME — 2026-05-29 PM (Ben approved "void all 26")

Worked the list live (read-only verify → walked the 🟡 eyeball-8 against live line-items/refs → voided). Tools: `scripts/verify-void-worklist.mjs`, `scripts/compare-void-twins.mjs`, `scripts/void-duplicate-bills-2026-05-29.mjs --apply`. Revert log (full before-state of every bill, for re-creation): `scripts/output/void-dups-revert-1780048855209.json`.

- **✅ VOIDED: 20 bills · $67,970.72** — all confirmed VOIDED in live Xero. (The 18 high-confidence 🔴+🟠 + 2 of the 🟡: Maleny $285.20 + Apple $99.99, both dated after the lock date.)
- **🔒 BLOCKED by Xero period lock (30-Sep-2025): 6 bills · $3,221.03** — Bunnings $1,199.80, Palm Island $514, Maleny $497.48, Maleny $423.75, Repco $384, Virgin $202. All dated on/before 30-Sep-2025 (FY26-Q1, **BAS lodged**). Xero correctly refuses to edit locked-period documents. These were confirmed dups on inspection but **must go to Standard Ledger as a prior-period adjustment / credit note** — do NOT lift the lock to void them (changes a lodged BAS).
- **⏸ HELD — not dups (4 bills, $4,867.98):** Kirmos **INV-004 $4,500** (genuinely owed — only unpaid numbered invoice in a recurring $4,500 series; pay don't void) · **Google $67.98** + **Dialpad $56** (consecutive-month SaaS subs, 32-day gap — detector's 60-day window false-positived) · **Kennards $244** (separate equipment hire, 48-day gap).

**Net phantom AP cleared: $67,970.72. Remaining to resolve via SL: $3,221.03 (locked-period dups).**

---

Each row is an **AUTHORISED** bill that matches a **PAID** bill (same vendor + amount, within 60 days) — i.e. a likely duplicate sitting as phantom AP. **Void the AUTHORISED one in Xero** (keep the PAID). 🔴/🟠 are high-confidence; 🟡 need a human to confirm it isn't a genuinely separate same-amount invoice. **Voiding is a Tier-3 Xero write — review first.**

- 🔴 near-certain: 2 · $226.27
- 🟠 likely: 19 · $67,727.24
- 🟡 review: 9 · $8,106.22
- **Total phantom AP if all confirmed: $76,059.73**

| Confidence | Date | Amount | Vendor (→ Xero AUTH bill) | AUTHORISED | PAID twin | Why |
|---|---|---:|---|---|---|---|
| 🔴 near-certain | 2026-02-23 | $137.27 | [HighLevel](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=c108669b-f8ed-4b9b-a410-c2a0d71bff2f) | AGAPY3VP-0007 | AGAPY3VP-0007 · 2026-02-23 | same invoice # on both |
| 🔴 near-certain | 2025-12-22 | $89.00 | [Booking.com](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=c41d3789-e0d4-4dee-b9be-ed0f3ae45192) | 5538807858 | 5538807858 · 2025-12-21 | same invoice # on both |
| 🟠 likely | 2025-12-22 | $19,800.00 | [Telford Smith Engineering](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=f47c47b4-8df4-4b04-8dea-5476f913ab67) | (no #) | (no #) · 2025-12-22 | no-# shadow |
| 🟠 likely | 2026-03-31 | $10,285.00 | [Centre Canvas And Upholstery](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=993dd389-f8ca-4ba0-9109-12eb5da17d0e) | (no #) | ADG 6524337 · 2026-03-31 | no-# shadow |
| 🟠 likely | 2025-12-14 | $6,441.74 | [The Matnic Trust](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=a2a542fe-c6dc-4c47-ab9d-9b7f13fae33f) | (no #) | 00036179 · 2025-12-15 | no-# shadow |
| 🟠 likely | 2025-12-15 | $5,940.00 | [Oonchiumpa Consultancy and Ser](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=aac157a9-5517-4053-b074-6084ca63b3fe) | (no #) | INV-0027 · 2025-12-16 | no-# shadow |
| 🟠 likely | 2026-03-20 | $4,950.00 | [Sophie Deirdre Hickey](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=bb3da03e-6534-477f-bffb-3b46431fe405) | (no #) | 000112 · 2026-03-20 | no-# shadow |
| 🟠 likely | 2025-11-26 | $4,621.18 | [Airbnb](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=07b3769d-b355-426c-b02d-7ae3f954ebd9) | (no #) | (no #) · 2025-11-27 | no-# shadow |
| 🟠 likely | 2026-03-29 | $4,500.00 | [Joseph Kirmos](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=99e9f3dd-7f76-4aaf-b546-847fcc20924f) | (no #) | INV-007 · 2026-05-06 | no-# shadow |
| 🟠 likely | 2026-01-09 | $2,826.92 | [The Matnic Trust](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=0338c916-297b-479c-a83a-381848c49fc9) | (no #) | 00036199 · 2026-01-10 | no-# shadow |
| 🟠 likely | 2025-11-29 | $2,000.00 | [TNT Plastering & Maintenance](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=18534bcf-f6ae-4a3c-aafe-7f55ccfb917d) | (no #) | IV00401 · 2025-11-30 | no-# shadow |
| 🟠 likely | 2025-12-26 | $1,597.00 | [Bunnings Warehouse](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=6db66932-ff38-476f-8c4e-e28b182f9017) | (no #) | 094-37374-8180-2025-12-27 · 2025-12-27 | no-# shadow |
| 🟠 likely | 2026-01-19 | $1,505.62 | [Hayden Alexander](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=0b998d79-907f-49bf-a7de-72092aa36451) | (no #) | INV-2603 · 2026-01-20 | no-# shadow |
| 🟠 likely | 2026-03-17 | $1,140.00 | [Sophie Deirdre Hickey](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=0f55cedb-b565-46b3-8fe2-b8686d8492c4) | (no #) | 000111 · 2026-03-17 | no-# shadow |
| 🟠 likely | 2026-01-05 | $768.83 | [Clearview Towing Mirrors](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=6bdfea19-e181-4b84-a719-3cbfb6e16676) | (no #) | SO-297222 · 2026-01-06 | no-# shadow |
| 🟠 likely | 2025-12-18 | $671.90 | [Izzy Mobile](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=a0df1ad7-d4e6-4fb6-994d-2e395c77aeaf) | (no #) | 21233 · 2025-12-19 | no-# shadow |
| 🟠 likely | 2025-10-09 | $244.00 | [Kennards Hire](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=19e1724b-31b7-4609-99e3-7e71d2ec0970) | (no #) | 27797211 · 2025-08-22 | no-# shadow |
| 🟠 likely | 2026-03-10 | $228.90 | [Salin Appliance Spares](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=74698641-4592-4afa-9c34-9662754e34a3) | (no #) | (no #) · 2026-03-11 | no-# shadow |
| 🟠 likely | 2025-12-13 | $82.17 | [WizBang Technologies](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=bf39c61b-aff3-4390-a8ae-93ffaab79100) | (no #) | 1511719 · 2025-12-14 | no-# shadow |
| 🟠 likely | 2025-11-29 | $67.98 | [Google Australia](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=eb54ffb7-219c-4797-a79b-562282d69b0b) | (no #) | 5453193755 · 2025-12-31 | no-# shadow |
| 🟠 likely | 2025-10-28 | $56.00 | [Dialpad](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=e0662ad5-6443-43eb-b676-942333fcb2e2) | (no #) | 6283248701284352 · 2025-11-29 | no-# shadow |
| 🟡 review | 2026-02-16 | $4,500.00 | [Joseph Kirmos](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=af1435ea-0b97-4887-bfb2-10f4acebf3a6) | INV-004 | INV-006 · 2026-03-29 | different #s — confirm not a separate invoice |
| 🟡 review | 2025-07-08 | $1,199.80 | [Bunnings Warehouse](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=f17812a9-4e07-4492-b587-7e9ad11bdd99) | W266674593 | 8161/99809868 · 2025-07-09 | different #s — confirm not a separate invoice |
| 🟡 review | 2025-09-02 | $514.00 | [Palm Island Motel](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=503b4d00-d757-4fec-a858-f66fb8c07d0e) | 6D1D49DE4A/RC | 6D1D49DE4A · 2025-07-13 | different #s — confirm not a separate invoice |
| 🟡 review | 2025-09-30 | $497.48 | [Maleny Hardware And Rural Supp](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=adc8c86f-9baf-4a53-a597-3c11df96a66b) | RB18256538250 | 170210 · 2025-10-04 | different #s — confirm not a separate invoice |
| 🟡 review | 2025-07-31 | $423.75 | [Maleny Hardware And Rural Supp](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=db9b2797-54a8-4511-8ef5-3f69c3a88622) | RB17644337340 | 157327 · 2025-08-01 | different #s — confirm not a separate invoice |
| 🟡 review | 2025-09-13 | $384.00 | [Repco](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=4912fa8d-2030-4153-a80c-db48ce4b30b1) | 4120364586 | 412364586 · 2025-09-13 | different #s — confirm not a separate invoice |
| 🟡 review | 2025-10-31 | $285.20 | [Maleny Hardware And Rural Supp](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=0d240fbf-89c4-43a0-8aff-00704b615815) | RB18555475390 | 176297 · 2025-11-04 | different #s — confirm not a separate invoice |
| 🟡 review | 2025-05-12 | $202.00 | [Virgin Australia](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=27c08325-0ec5-4d53-87f0-71095969fa63) | 7952110113630 | GTNPUV · 2025-05-12 | different #s — confirm not a separate invoice |
| 🟡 review | 2025-10-11 | $99.99 | [Apple Pty Ltd](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=0df8f163-b479-433f-92bc-c242110e1c51) | 786034717731 | RB18338539280 · 2025-10-11 | different #s — confirm not a separate invoice |

> Notes: 🔴 HighLevel + Booking.com have the **exact same invoice #** on both copies (one invoice entered twice). Several 🟡 rows have **near-identical** refs (Repco 4120364586/412364586, Palm Island 6D1D49DE4A) — likely dups, worth a glance. **Kirmos INV-004 has a *different* # (INV-006) → may be genuinely owed, NOT a dup** (Ben checking with Joey). Telford $19,800 matches the recon's known double-pay.

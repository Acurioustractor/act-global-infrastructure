# Phantom-dup worklist — q2q3 (staged 2026-06-10)

> READ-ONLY staging for issue #170 prep. Source: reconcile-sidecar q2q3 --verify (269/269 live-checked).
> APPLY RULE (Ben, day-shift): every delete re-verifies via single-GET at write time AND confirms the keeper carries the receipt. Log every write to reconcile-write-log.md.
> Keeper receipt status here is from xero_invoices.has_attachments (accurate, unlike the txn flag).

## DELETE-CANDIDATE — 18 lines · $17,204.64

- [ ] 2025-10-09 · **Stratco** · $2,240.82 · Visa · txn `b67a08ea-7aa3-4317-b0ca-ac6a10564247`
      twin: 9235e76e · Stratco · 2025-10-09 · DRAFT · keeper_receipt=true
- [ ] 2025-10-13 · **Qantas** · $144.21 · Visa · txn `c6e69522-ee77-4faf-ac18-76972f6b567c`
      twin: 8cdc52d8 · Qantas · 2025-10-12 · DRAFT · keeper_receipt=true
- [ ] 2025-10-27 · **Qantas** · $1,644.67 · Visa · txn `33b302b4-d8c3-4c9d-9c22-4ce8bb944c22`
      twin: f6a6d6fc · Qantas · 2025-10-26 · DRAFT · keeper_receipt=true
- [ ] 2025-11-30 · **Sunshine Coast Council** · $44.90 · Visa · txn `1ddf1a0c-4bd0-4b61-9867-acbd3ebd657b`
      twin: dc88d544 · Sunshine Coast Council · 2025-12-01 · PAID · keeper_receipt=true
- [ ] 2025-12-01 · **X Global LLC** · $15.00 · Visa · txn `ef6cd9a2-567f-41cb-990b-40677c02c684`
      twin: 703f9414 · X Global LLC · 2025-11-30 · PAID · keeper_receipt=true
- [ ] 2025-12-04 · **AGL** · $290.11 · Everyday · txn `17437785-4352-4e1f-9ecd-0e8c79fd2de6`
      twin: 2ec55f8f · AGL · 2025-12-03 · PAID · keeper_receipt=true
- [ ] 2025-12-08 · **Celebrants Australia Incorporated** · $100.00 · Everyday · txn `279f3616-4518-4cd4-8c9a-b26c3f3aadce`
      twin: d83209c3 · Celebrants Australia Incorporated · 2025-12-07 · PAID · keeper_receipt=true
- [ ] 2025-12-30 · **Bionic Self Storage** · $2,420.00 · Everyday · txn `9a3cf5ce-df14-4bf2-9d61-52f515eeced5`
      twin: 6a1e01fb · Bionic Self Storage · 2025-12-29 · PAID · keeper_receipt=true
- [ ] 2026-01-05 · **Total Tools East Brisbane** · $4,546.55 · Everyday · txn `632f9aa0-9d75-407e-a38b-a62c4ae028a8`
      twin: b892a854 · Total Tools East Brisbane · 2026-01-04 · PAID · keeper_receipt=true
- [ ] 2026-01-06 · **AGL** · $345.35 · Everyday · txn `798cc7a1-4797-49c9-9c4b-9ef0b4815567`
      twin: 27519836 · AGL · 2026-01-05 · PAID · keeper_receipt=true
- [ ] 2026-01-07 · **Maleny Hardware And Rural Supplies** · $507.51 · Everyday · txn `633229f1-2d7a-4351-9cb0-1e2763370588`
      twin: 397c3354 · Maleny Hardware And Rural Supplies · 2026-01-06 · PAID · keeper_receipt=true
- [ ] 2026-01-12 · **Hydraulink Brisbane North** · $883.07 · Everyday · txn `8644dc41-5031-491f-9c17-0b47bee92805`
      twin: ce2eecd8 · Hydraulink Brisbane North · 2026-01-11 · PAID · keeper_receipt=true
- [ ] 2026-01-16 · **Liberty Maleny** · $367.69 · Visa · txn `04dee660-6998-45ef-86bb-5b654f932ea7`
      twin: ff7f6b14 · Liberty Maleny · 2026-01-15 · PAID · keeper_receipt=true
- [ ] 2026-01-17 · **Vercel** · $20.00 · Visa · txn `08d86e6c-62b6-45a8-b735-a742b5efed00`
      twin: 23c192ec · Vercel · 2026-01-16 · DRAFT · keeper_receipt=true
- [ ] 2026-01-20 · **Sunshine Coast Council** · $1,738.03 · Everyday · txn `1c76f694-a600-4c77-a746-2e5a227f8c5e`
      twin: 12917849 · Sunshine Coast Council · 2026-01-19 · PAID · keeper_receipt=true
- [ ] 2026-03-04 · **AGL** · $362.83 · Everyday · txn `1925fe01-3eca-4e62-8dee-8dfe84e5f0e3`
      twin: f6b0bc34 · AGL · 2026-03-04 · PAID · keeper_receipt=true
- [ ] 2026-03-11 · **Salin Appliance Spares** · $228.90 · Everyday · txn `db83dde9-2370-4f39-a1ec-bb2fd97bf988`
      twin: 315ab54d · Salin Appliance Spares · 2026-03-11 · PAID · keeper_receipt=true
- [ ] 2026-03-17 · **MALENY LANDSCAPING SUPPLIES** · $1,305.00 · Everyday · txn `0d7678ac-8077-401c-aac9-e324016eed68`
      twin: d6427706 · MALENY LANDSCAPING SUPPLIES · 2026-03-17 · PAID · keeper_receipt=true

## HOLD-SHARED-TWIN — 4 lines · $39,838.00

- [ ] 2025-12-23 · **Telford Smith Engineering** · $19,800.00 · Everyday · txn `87a05588-6b66-4533-b3a4-aeb5a7f69ff8`
      twin: 843767e6 · Telford Smith Engineering · 2025-12-22 · PAID · keeper_receipt=true  ⚠ SHARED TWIN — both lines may be real (double-payment pattern)
- [ ] 2025-12-23 · **Telford Smith Engineering** · $19,800.00 · Everyday · txn `578961df-2eb7-473b-99f2-81c8cae89145`
      twin: 843767e6 · Telford Smith Engineering · 2025-12-22 · PAID · keeper_receipt=true  ⚠ SHARED TWIN — both lines may be real (double-payment pattern)
- [ ] 2026-01-21 · **The Trustee For Maltek Trust** · $119.00 · Everyday · txn `04677401-604d-4130-8684-7db184f49ed9`
      twin: 241ca677 · The Trustee For Maltek Trust · 2026-01-20 · PAID · keeper_receipt=true  ⚠ SHARED TWIN — both lines may be real (double-payment pattern)
- [ ] 2026-01-21 · **Adam's Bits** · $119.00 · Visa · txn `b5d6bbf7-0a74-4b74-96e4-fdd081c023e2`
      twin: 241ca677 · The Trustee For Maltek Trust · 2026-01-20 · PAID · keeper_receipt=true  ⚠ SHARED TWIN — both lines may be real (double-payment pattern)

## HOLD-REVIEW — 15 lines · $2,530.76

- [ ] 2025-10-03 · **Warp** · $18.00 · Visa · txn `c2ed385c-521f-41ae-9e33-9a98531e363f`
      twin: 0830/0602/00602 · Car Park · 2025-10-10 · PAID · keeper_receipt=true
- [ ] 2025-10-19 · **Uber** · $64.37 · Visa · txn `b0eb1d9d-ffd4-40a0-b05f-16bf04805bfc`
      twin: WSHNYD-00015 · Supabase · 2025-10-21 · PAID · keeper_receipt=true
- [ ] 2025-11-15 · **BP** · $44.23 · Visa · txn `f8a27bd7-a080-4f73-b4e9-6e441e0e2dc8`
      twin: 923a1b3d · BP · 2025-11-14 · PAID · keeper_receipt=true
- [ ] 2025-11-17 · **Maleny Hardware And Rural Supplies** · $19.25 · Visa · txn `2a3d66db-ad5a-4726-94d9-fe9dae57287d`
      twin: RB18856389050 · SSP Australia Catering · 2025-12-01 · PAID · keeper_receipt=true
- [ ] 2025-12-12 · **BP** · $21.47 · Visa · txn `df9672c8-9afa-4dc7-ae61-3ca5ec2b198e`
      twin: 551a78eb · BP · 2025-12-11 · PAID · keeper_receipt=true
- [ ] 2025-12-12 · **BP** · $137.33 · Visa · txn `543d7910-76e9-495f-bf8c-4b5a58ed40e5`
      twin: d3f69b47 · BP · 2025-12-11 · PAID · keeper_receipt=true
- [ ] 2025-12-15 · **BP** · $95.65 · Visa · txn `1f614fa4-637b-4e27-80b7-dd683794c404`
      twin: 9d0acd39 · BP · 2025-12-14 · PAID · keeper_receipt=true
- [ ] 2025-12-17 · **Bunnings Warehouse** · $100.00 · Visa · txn `41e53d33-1a82-425c-89e0-53cf1d426615`
      twin: 57b1e8bf · Celebrants Australia · 2025-12-08 · DRAFT · keeper_receipt=true
- [ ] 2025-12-23 · **BP** · $131.18 · Visa · txn `799a85b0-7cf1-415d-a65b-84bc5f7fef84`
      twin: e4397e27 · BP · 2025-12-22 · PAID · keeper_receipt=true
- [ ] 2025-12-26 · **BP** · $96.17 · Visa · txn `45243a0f-b5f8-4165-ab88-0db81c86ff42`
      twin: c93986db · BP · 2025-12-25 · PAID · keeper_receipt=true
- [ ] 2026-02-04 · **BP** · $161.90 · Visa · txn `ba6ffbdd-8832-4c38-a3e2-c53f57832b54`
      twin: 1d436ecf · BP · 2026-02-03 · DRAFT · keeper_receipt=true
- [ ] 2026-02-07 · **F V Snowdon And J R Rowden** · $39.80 · Visa · txn `f0e66c57-3347-491d-8800-329f5f900fd5`
      twin: RB19543401990 · Square AU · 2026-02-07 · PAID · keeper_receipt=true
- [ ] 2026-03-11 · **OpenAI** · $10.00 · Visa · txn `16c3afd3-05fb-47ca-8e59-aac770705fb1`
      twin: e7812509 · GitHub Copilot · 2026-03-10 · AUTHORISED · keeper_receipt=true
- [ ] 2026-03-12 · **Heaps Good** · $660.00 · Visa · txn `5db5e97b-7711-4c8e-8075-e8e69d330b60`
      twin: 03f5bb7a · HEAPSGOOD · 2026-03-12 · PAID · keeper_receipt=true
- [ ] 2026-03-20 · **TJ’s Imaging Centre** · $931.41 · Visa · txn `f156b611-ff79-4a5d-a256-2c7e0724d8f7`
      twin: 2884dfaa · ePrint · 2026-03-20 · PAID · keeper_receipt=true

---
Verdict meanings: HOLD-SHARED-TWIN = 2+ bank lines share one twin bill — double-PAYMENT pattern (e.g. Telford Smith $19.8K, unrecovered): both lines are real money, route to recovery/SL, NEVER delete. DELETE-CANDIDATE = PAID twin bill holds the receipt, classic Dext phantom. COPY-RECEIPT-FIRST = real phantom but keeper lacks the receipt — copy it over before deleting. HOLD-MATCH-INSTEAD = twin bill is AUTHORISED/unpaid, the spend-money may BE the payment — match in UI, never delete. HOLD-PAIRED-REPEATS = n real charges with n bills (per-seat SaaS) — both legs real. HOLD-REVIEW = no name-overlapping twin — coincidental amount, leave alone.

# SL clean-up — FINAL answers (evidence + adversarial verify, 2026-06-25)

_26 needs-Ben lines: answered from our records, then an adversarial skeptic pass (agents queried the live Xero mirror). 16 survived clean, 5 minor, 5 MAJOR corrections applied below. READ-ONLY drafts for Ben to confirm._

## Cross-cutting finding — ACT IS GST-registered
The skeptic confirmed it: ACT expense bills are INPUT-coded **with GST credits actually claimed** ($104.55 on the Humanitix bill, etc.). So the sole trader **was GST-registered** this period. Consequence: **event/ticket income carries GST on income (1/11th)** — NOT GST-free. Affects #3 Humanitix, and #4/#7 if they resolve to revenue. Grants (#13 TFN) stay GST-free (a grant is not a taxable supply).

## Source-document verifications (2026-06-25) — overrides the skeptic on #12 + #47
The skeptic's two MAJOR GST refutations were checked against the actual PDF tax invoices fetched from Gmail. Both GST credits are **valid**; the skeptic was misled by mis-entered / voided Xero mirror rows.

- **#12 Circularity / The Plasticians $32,780 — GST $2,980 CONFIRMED claimable.** Tax invoice **INV-0054** (Circularity Group Pty Ltd t/a The Plasticians, **ABN 83 672 497 497**, 17/12/2025, in nicholas@): _Machinery (CNC, Hot + Cold Presses, Sheet Storage, Prep Table)_ — **Subtotal $29,800 ex-GST + GST $2,980 = $32,780 total**, ties to the bank payment exactly. Code **ACT-GD, acct 446 (capital machinery), GST on Expenses, claim $2,980**. ⚠ **Xero-fix for the bookkeeper:** the AUTHORISED Plasticians bill is mis-entered as $29,800 GST-*inclusive* (tax $2,709.09, a Dext auto-import "NEEDS CODING") — correct it to **$32,780 total / $2,980 GST**. The "$2,980 gap" the skeptic flagged was exactly this under-entered GST.
- **#47 Carla Furnishers $4,816 — GST $437.82 CONFIRMED claimable.** Tax invoice **26-00000151** (Carla Furnishers Pty Ltd, **ABN 86 009 599 526**, paid 28/01/2026, in nicholas@): 4× Speed Queen washing machines net of a 4-unit return (the voided $11,180 Xero bills = the swapped-out original order). **Grand Total $4,816.00 inc GST $437.82.** Code **ACT-GD, acct 446 (capital equipment), GST on Expenses, claim $437.82.**

### #12  -$32780  Circularity Group PtA5648662938 Thanks  — MAJOR correction
- **Answer:** ACT-GD | 446 | GST on Expenses
- **CORRECTED (major):** Amount does NOT tie out and GST is overstated. Bank line = $32,780. The only matching valid tax invoice (AUTHORISED ACCPAY, The Plasticians, xero_id f6528324, acct 446, INPUT, attachment present, ACT-GD) totals $29,800 GST-INCLUSIVE (subtotal $27,090.91 + tax $2,709.09). The proposed "29,800 ex-GST x1.1 = 32,780" is false: the $29,800 is the GST-inclusive total, not ex-GST. Correct GST credit on the evidenced invoice = $2,709.09, NOT $2,980. There is an unresolved $2,980 gap between the $32,780 bank payment and the $29,800 bill — no bill/txn for $32,780 or $2,980 exists in the mirror. resolved=false: either the bank line is mis-stated, the bill is partial, or a second invoice is missing. Keep project=ACT-GD, account=446, gst=GST on Expenses but cap the claimed credit at $2,709.09 against the $29,800 invoice; do NOT claim GST on the unsupported $2,980 difference.

### #47  -$4816  CARLA FURNISHERS P/L CICCONE  — MAJOR correction
- **Answer:** ACT-GD | 446 | GST on Expenses (INPUT) — $437.82
- **CORRECTED (major):** gst=GST Free (claim $0, NOT $437.82) until a valid authorised/paid INPUT-coded tax invoice that reconciles to the $4,816 bank line is on file. The $437.82 is merely $4,816/11 computed off the bank amount, with no reconciling tax invoice behind it. Invoice "26-00000151" does NOT exist anywhere in xero_invoices; a bare gmail receipt PDF is not a valid tax invoice. The only Carla Furnishers documents in the mirror are two VOIDED $11,180 ACCPAY bills (tax $1,016.36) + one DELETED $11,180 SPEND — a VOIDED bill cannot support an input credit, and none of these tie to $4,816 (nor $4,816*1.1=$5,297.60). Keep project=ACT-GD, account=446 (defensible), but resolved=false: this line is NOT resolved — request the real $4,816 Carla tax invoice and verify INPUT coding before any GST credit. (Caution: Defy Manufacturing INV-1637 $4,812.50/tax $437.50 is a coincidental near-amount match for a DIFFERENT vendor — do not substitute it.)

### #15  +$2420  BIONIC GROUP PTY LTDRefund  — survived
- **Answer:** ACT-IN | 452 (offset the original Bionic Self Storage bill) | GST on Expenses (reverses the input credit claimed on the matching PAID bill)

### #13  +$55197  TFN Distribution The Funding Netw A Curious Tracto  — survived
- **Answer:** confirm | Grants Received | GST Free Income
- ASK: Which project does this $55,197 TFN grant fund — Goods (ACT-GD, per the funder contact tag) or Custodian First Economy (ACT-CE, per the existing TFN invoices)?

### #3  +$1150  HPJCFBWSB5 Humanitix Ltd A CURIOUS TRACTO  — MAJOR correction
- **Answer:** ACT-CP | Other Revenue / Event Income | GST-Free on income (sole trader not GST-registered this period; net-vs-gross caveat)
- **CORRECTED (major):** GST is wrong: the cited $1150 and $46.63 bills are coded tax_type=INPUT with GST credits claimed ($104.55 and $4.09), which proves ACT IS GST-registered this period. So event/ticket income carries GST on income (1/11th) — NOT "GST-Free, not GST-registered". If line #3 is ticket revenue: subtotal ~$1045.45 + GST on income ~$104.55. Also the amount match is coincidental/invalid: the only $1150 record is an ACCPAY *bill* (a Humanitix platform fee ACT PAYS, an outflow) — it does not evidence a $1150 ticket settlement RECEIVED (an inflow). No ACCREC/sales invoice for Humanitix or $1150 exists, so the inflow amount is unsourced. Account=Event/Ticket Income (Other Revenue), project=ACT-CP both plausible, but gst must be GST-on-income and resolved should be false until the actual settlement is sourced. Net-vs-gross also unconfirmed.

### #9  -$781.9  Tarik Dallinger-DimiA9838522047  — survived
- **Answer:** ACT-CN | Contractor / artist fee | GST-free (no tax invoice on file)

### #10  -$20000  Nicholas Marchesi SuE0397656597  — MAJOR correction
- **Answer:** ACT-IN | 880 Drawings - Nicholas Marchesi | No GST
- **CORRECTED (major):** Direction/nature wrong and amount does not tie. The cited evidence is four MAY RECEIVE txns into "NJ Marchesi T/as ACT Everyday" ($1,821.50 + $5,723.42 + $4,000.00 + $11,000.00 = $22,544.92) — money IN from Nic, i.e. owner CAPITAL CONTRIBUTED / Funds Introduced (Equity), NOT 880 Drawings (which is money OUT). None of these equals the SL line's -$20,000, so the match is invalid (a separate -$20,000 SPEND row exists but was not the cited evidence). The "Nic's own super" rationale is unverified/fabricated: no invoice, null line-item descriptions, and a self-super payment would be money OUT to a fund, not RECEIVE money IN. If the -$20,000 line is truly an outflow, classify as 880 Drawings - Nicholas Marchesi (No GST) but cite the matching SPEND row, not the RECEIVE set; if it is the RECEIVE inflow, it is Funds Introduced/Capital (Equity), No GST — do NOT call it super. Account per evidence is 881, not 880. resolved=false pending which direction the actual line is.

### #2  -$200  Shane Bloomfield H8299013120 Bunnings thanks  — minor correction
- **Answer:** ACT-BG | 430 | GST Free Expenses
- **CORRECTED (minor):** project=ACT-IN (not ACT-BG). The GST treatment (GST Free Expenses, account 430) and the no-invoice / no-credit call are correct and should stand. But ACT-BG is unevidenced: Shane Bloomfield in GHL is tagged storyteller / empathy-ledger / gone-from-ghl — never project:act-bg. The only project:act-bg contact is Chelsea Baker. The Bloomfield with project tags (Kristy) is act-hv/act-gd/act-jh, not act-bg. Narration "Bunnings thanks" gives no project signal. Default to ACT-IN general until a receipt names the project. Also: the comment's promised "$18.18 credit once Shane provides the Bunnings tax invoice" is wrong even as a caveat — a consumer receipt in Shane's name does not support a sole-trader input credit; the GST-Free booking is correct and final.

### #11  -$3000  Thriday G3468033865  — survived
- **Answer:** ACT-IN | Accounting / software | GST-free (no tax invoice on file) — switch to GST on Expenses if Thriday tax invoice obtained
- ASK: Did Thriday issue a tax invoice for this $3,000 (so we can claim the ~$272.73 GST credit), and is this the same payment that also shows on the NAB Visa #8815 (possible duplicate)?

### #5  -$20000  Ross Built ConstructP7797582049 ACT  — survived
- **Answer:** confirm | Building / Construction (capital WIP) | GST-free (no tax invoice on file — reverse to claim input credit once invoice received)
- ASK: This $20,000 to Ross Built Construct — which site was the build for (Farm / ACT-FM or Harvest Witta / ACT-HV), and can you dig out the tax invoice so we can claim the GST credit?

### #0  -$2000  CHRISTOPHER DODS J7040396334 Confessional Thanks  — survived
- **Answer:** ACT-CF | Subcontractors / Honorarium | GST Free Expenses
- ASK: Is the $2,000 to Christopher Dods a business contribution/honorarium for The Confessional (code GST-free, no invoice on file), or something personal that should sit in Drawings?

### #22  -$665  MR BEAU JOSEPH ANDE H9114176985 Thanks  — minor correction
- **Answer:** ACT-IN | 880 Drawings | No GST (N/A — bare bank transfer, no tax invoice)
- **CORRECTED (minor):** Keep account=880 Drawings, gst=No GST, resolved=false. Two corrections to the reasoning/fields: (1) The cited $300 precedent does NOT amount-tie to $665 (not exact, not x1.1) and sits in NM Personal — an account EXCLUDED from ACT under the two-account rule, dated 29 Jun 2025 (outside the 1 Oct 2025-31 May 2026 period). It is a same-name precedent only, not a reconciling invoice, and not an ACT transaction. (2) Project should not default to ACT-IN: the only Anderson-surname ACT context in the mirror is SUZANNE ANDERSON house-rental income coded ACT-FM (Farm). If Beau Anderson is connected to the Farm property, ACT-FM is at least as likely as ACT-IN. Leave project unresolved pending Nic's confirmation rather than asserting ACT-IN.
- ASK: Was this $665 to Beau Joseph Anderson a personal transfer (code to 880 Drawings) or payment for ACT work / a contractor honorarium (code to Contractors)? Last time we paid him it went to Drawings.

### #21  -$291  MR BEAU JOSEPH ANDE Y4434637310  — survived
- **Answer:** confirm | 880 Drawings | GST-free (no tax invoice on file)
- ASK: Was the $291 to Beau Joseph Anderson a work payment (contractor/labour - if so, which project?), or a personal drawing? Prior $300 payment to him was parked in 880 Drawings.

### #63  -$201.28  MALL MEDICAL CENTRE Alice Springs  — minor correction
- **Answer:** confirm | 880 Drawings (default, private medical) — or a travel/staff-medical expense under ACT-OO if Nic confirms work-required | GST-free (medical, Subdiv 38-B) — no GST credit either way
- **CORRECTED (minor):** account=880 Drawings (private medical) — drop the "or ACT-OO travel-medical" alternative. GST treatment is correct (GST-free). The ACT-OO option is inferred purely from the Alice Springs/Mparntwe location with zero supporting evidence (no Gmail, receipt, or GHL link to an Oonchiumpa trip) — that's a guess-off-location, so it should not be presented as a co-equal coding. A sole trader's medical spend defaults to private Drawings absent specific work-requirement evidence; only reclassify to ACT-OO if travel evidence surfaces. Keep resolved=false pending Nic's confirmation of whether this was a work trip.
- ASK: Was the $201.28 Mall Medical Centre (Alice Springs) charge on 21 May a private medical for Nic (code 880 Drawings, GST-free) or a work-required medical tied to the Oonchiumpa/ACT-OO trip (code travel-medical under ACT-OO, GST-free)?

### #56  -$4497  SP RETRO OUTDOOR CO BAULKHAM HILL  — survived
- **Answer:** confirm | Plant & Equipment | GST-free / no credit until valid tax invoice on file (then INPUT, capital so CAPEXINPUT if treated as asset)
- ASK: What was the $4,497 to SP Retro Outdoor Co (an outdoor-furniture retailer) for, and which project - is this Harvest Witta (ACT-HV) furniture or general (ACT-IN)? And is there a tax invoice we can get for the GST credit?

### #16  -$4000  little beach shacks F8216106008 Thanks  — survived
- **Answer:** ACT-IN | Travel & accommodation (GST-free) if business; else 880 Drawings | GST-free (no tax invoice on file) — NOT GST on Expenses
- ASK: Was this $4,000 "little beach shacks" booking a business trip (code Travel & accommodation, ACT-IN) or Nic's personal holiday (code 880 Drawings)?

### #61  -$1495.2  Hannah St Melbourne Melbourne  — survived
- **Answer:** ACT-IN | To confirm | GST-free (no tax invoice on file)
- ASK: What is the "Hannah St Melbourne" business and what did this $1,495.20 buy (so I can set account + project)?

### #14  -$1439.6  INTERNET TRANSFER Thanks  — survived
- **Answer:** confirm | ACT-IN General/admin (or 880 Drawings if private) — GST-free pending invoice | GST-free (no valid tax invoice on file — no input credit)
- ASK: Who did this $1,439.60 "Thanks" transfer on 9 Jan go to, and what was it for — a business cost (which project?) or a personal/private payment?

### #7  +$616.66  SUZANNE MARGARET ANDSecurity minus Car d  — survived
- **Answer:** ACT-IN | BAS Excluded suspense — likely security/bond refund (offset original deposit) OR Owner Funds Introduced (881); not Other Revenue | BAS Excluded (no GST — no tax invoice; deposit refund / owner funds is not taxable supply)
- ASK: This $616.66 came in from "Suzanne Margaret AND..." with reference "Security minus Card" — is it (a) the return of a security deposit/bond ACT paid out earlier (so I offset the original deposit, net of a card fee), or (b) a personal repayment to Nic (Owner Funds 881), or (c) genuine ACT income?

### #1  -$360  James William V0471764749  — minor correction
- **Answer:** ACT-IN | Subcontractors (453) — or 880 Drawings if personal | BAS Excluded (no tax invoice on a bank transfer — no GST credit)
- **CORRECTED (minor):** GST code is inconsistent with the offered account paths. "BAS Excluded" is only correct IF the line resolves to 880 Drawings. If it resolves to the answer's PRIMARY suggestion — Subcontractors (453) — the correct no-invoice code is GST Free Expenses (G11), not BAS Excluded (which wrongly drops it off the BAS). So: account=Subcontractors(453) -> gst=GST Free Expenses; account=880 Drawings -> gst=BAS Excluded. Keep resolved=false. Everything else stands.
- ASK: Who is "James William" and what was this $360 transfer on 29 Oct for — a contractor/work payment (Subcontractors, ACT-IN) or a personal payment (880 Drawings)?

### #60  -$345.37  Restaurace Alma Praha 1  — survived
- **Answer:** ACT-IN | Travel - Overseas (Meals) | GST Free Expenses
- ASK: Was this $345.37 meal at Restaurace Alma in Prague a business overseas-travel meal (keep as ACT-IN travel meals), or a private/personal meal (recode to 880 Drawings)?

### #4  +$200  MR MARCUS TRAVERS COMarcus C thanks  — MAJOR correction
- **Answer:** ACT-IN | Other Revenue (placeholder — confirm vs expense-offset vs 881 Owner Funds Introduced) | GST-Free / BAS Excluded
- **CORRECTED (major):** gst should be "Unresolved — contingent on nature, NOT assert GST-Free". Given the GST-registration signal (ACT's bills coded INPUT → sole trader is registered), the answer cannot call this GST-Free while still listing "Other Revenue" as a live classification: if booked as income/revenue, a registered entity carries GST on income at 1/11th ($18.18), not GST-free. Only the 881 Owner Funds (capital introduced by Nic) branch is genuinely GST-Free/BAS-Excluded; the expense-offset branch inherits the original expense's GST. So the gst field is internally inconsistent with the open revenue option. Keep project=ACT-IN and resolved=false (correct — truly indeterminate), but change gst to "depends on nature; GST-free ONLY if 881 Owner Funds; if Other Revenue then GST 1/11th applies". Confirm nature with Nic before coding.
- ASK: What was the $200 "thanks" transfer from Marcus Travers for — reimbursement of an ACT expense, a contribution to our work, or Nic personal (repayment)?

### #31  -$202.16  INTERNET BANKING TRANSFERMELBOURNE  — minor correction
- **Answer:** confirm | 880 Drawings | BAS Excluded
- **CORRECTED (minor):** account: leave as suspense / "confirm with Nic" rather than hard-defaulting to 880 Drawings. GST (BAS Excluded) and the no-input-credit call are correct; keep resolved=false. The only fix is not asserting a specific deductibility-relevant account (Drawings) on zero evidence for an unidentified outbound transfer that could equally be an inter-account transfer, supplier payment, or reimbursement.
- ASK: Who did this $202.16 internet-banking transfer on 4 Nov go to and what was it for — a business cost (which project/supplier?) or personal/Drawings?

### #62  -$174.65  INTERNET BANKING TRANSFERMELBOURNE  — survived
- **Answer:** ACT-IN | 880 Drawings (default until identified) | BAS Excluded (no GST — bare bank transfer, no tax invoice)
- ASK: Who did this $174.65 internet banking transfer on 8 May go to, and was it business or personal? If business, name the supplier/purpose so I can code it; otherwise I'll book it to 880 Drawings.

### #30  -$45.8  INTERNET BANKING TRANSFERMELBOURNE  — survived
- **Answer:** ACT-IN | 880 Drawings (default — recode to the relevant expense account if a business cost is confirmed) | BAS Excluded
- ASK: What was this $45.80 internet-banking transfer on 4 Nov 2025 for — a business cost (and which project) or a personal/owner transfer (code to 880 Drawings)?

### #39  -$16.45  Audible Limited AU MELBOURNE  — survived
- **Answer:** ACT-IN | 880 Drawings | No GST
- ASK: Office expense or Drawings?


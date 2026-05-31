# Cutover Tax Verification — Independent Review of Standard Ledger's Method

**Date:** 2026-06-01
**Subject:** Sole trader (Nic Marchesi, ABN 21 591 780 066) → A Curious Tractor Pty Ltd (ACN 697 347 676, ABN 36 697 347 676, incorporated 24 Apr 2026), effective 30 Jun 2026 (FY26 year-end).
**Reviewer:** Independent verification against primary ATO / Commonwealth legislation sources.
**Scope:** Verify 5 mechanics proposed by Standard Ledger (SL). Each given a verdict + primary citation + key condition + risk flag.

> **Method note (verification.md compliance):** "Verified" below = the principle/statutory text was found in a primary ATO source (ato.gov.au, AustLII/legislation.gov.au statutory text, or an ATO ruling). Deep-link WebFetch to AustLII/legislation.gov.au returned HTTP 403 this session, but the **exact statutory wording of s328-440 and s355-205 was returned in AustLII-sourced search results** (quoted below), so those are marked **Verified**. No accountant blog is treated as authority anywhere in this document; advisory-firm pages are cited only as corroboration, never as the authority.

---

## VERDICT TABLE

| # | Mechanic | Verdict | Primary ATO / Legislation ref | Key condition | Risk flag |
|---|----------|---------|-------------------------------|---------------|-----------|
| 1 | "Operating on behalf of" — journal pre-incorporation sole-trader income into Pty's books | **QUESTIONABLE** (high risk) | ITAA 1997 **s6-5** (ordinary income assessable to entity that *derived* it); general derivation/anti-alienation principle | Income is taxed to the entity that legally derived it. A company **cannot** derive income before it exists (24 Apr 2026). Retrospective journals do not change who derived the income. | 🔴 **HIGH** — most aggressive claim; likely to fail on audit for the pre-24-Apr period |
| 2 | Subdivision 328-G small business restructure rollover (CGT-free asset transfer) | **SUPPORTED-WITH-CONDITIONS** | ITAA 1997 **Subdiv 328-G**, ss **328-430, 328-435, 328-440, 328-445**; ATO SBRR guidance page | Aggregated turnover < $10M; "genuine restructure of an ongoing business"; **no material change in ultimate economic ownership**; active assets; both Australian residents; written choice. **Discretionary-trust special rule** lets affected individuals be treated as having the ultimate economic ownership where a **family trust election (FTE)** is in force. | 🟡 **MEDIUM** — turns entirely on the FTE / same-family-group condition being properly in place for BOTH trusts |
| 3 | GST-free supply of a going concern (s38-325 GST Act) | **SUPPORTED-WITH-CONDITIONS** | **A New Tax System (GST) Act 1999 s38-325**; **GSTR 2002/5**; ATO going-concern guidance | Supply for consideration; recipient registered/required to be registered; **written agreement** that it is a going-concern supply; supplier supplies **all things necessary**; supplier **carries on the enterprise until the day of supply**. | 🟢 **LOW** — mechanically clean if the written agreement + "all things necessary" are right |
| 4 | Division 7A complying loan (director loan top-up) | **SUPPORTED-WITH-CONDITIONS** | **ITAA 1936 s109N**; ATO "Complying Division 7A loans" guidance | Written agreement **before company's lodgement day**; interest ≥ **Div 7A benchmark rate** each year; max term **7 yrs unsecured** (25 yrs if secured by real property over the loan); **minimum yearly repayments** thereafter. | 🟢 **LOW** — standard; just execute paperwork on time |
| 5 | R&D Tax Incentive continuity — Pty claims FY26 R&D incl. sole-trader-period spend | **QUESTIONABLE** (high risk) | ITAA 1997 **Div 355**, **s355-25** (R&D entity = company), **s355-100/355-205** (notional deduction for expenditure the R&D entity **incurs**); IR&D Act registration (within **10 months** of year-end) | The R&D entity (the company) must **itself have incurred** the eligible expenditure, and must have been a company able to incur it. Expenditure incurred by the **sole trader before the company existed** is, on its face, **not** the company's R&D expenditure. | 🔴 **HIGH** — make-or-break for the ~$200K refund; depends entirely on #1 holding, which it likely does not for the pre-24-Apr period |

**Bottom line:** Mechanics 2, 3, 4 are legitimate, well-trodden tools and supportable with the right paperwork. Mechanics **1 and 5 are linked and are the danger zone** — both rest on the assertion that income/expenditure of the sole trader can be treated as the company's. That assertion is weak-to-untenable for the period **before the company existed (pre-24 Apr 2026)** and unproven even for 24 Apr–30 Jun unless a genuine agency/bare-trust arrangement was documented *at the time*, not via year-end journals.

---

## PER-MECHANIC DETAIL

### 1. "Operating on behalf of" income reallocation — QUESTIONABLE (HIGH RISK)

**What SL proposes:** Year-end cross-entity journals that move FY26 sole-trader income/expense into the Pty's opening books, "treating the sole trader as if it conducted business on behalf of ACT Pty Ltd."

**Primary principle (Verified — ATO guidance + s6-5):** Ordinary income is assessable under **ITAA 1997 s6-5** to the entity that *derived* it. ATO business-income guidance is consistent: a sole trader's business income is assessable **to the individual**; a company is assessable only on income **the company itself derives**. Derivation is a question of fact about who legally earned/became entitled to the income at the time — not who later books it.

**The fatal timing problem:** The company did not legally exist until **24 April 2026**. An entity that does not exist cannot derive income. So for the bulk of FY26 (1 Jul 2025 – 23 Apr 2026), the income was derived by, and is assessable to, the **sole trader**. A retrospective journal entry cannot retro-attribute that income to a company that did not exist when it was earned. This is the orthodox Australian position on pre-incorporation contracts: a company is not bound by, and does not derive income under, contracts entered before it existed unless it later validly adopts/novates them — and even adoption does not retrospectively make pre-existence income the company's *derived* income for tax.

**The narrow window where attribution *could* work (24 Apr – 30 Jun 2026):** Income derived after incorporation *might* be treated as the company's if a **genuine agency or bare-trust arrangement** existed under which the sole trader carried on the business *as agent for the company* — but that requires a real, documented, contemporaneous arrangement (agreement on foot, the company actually bearing the risk/benefit), **not** a year-end reclassification journal. The ATO scrutinises arrangements that move income to a lower-taxed/more-favourable entity; the general anti-avoidance provisions (**Part IVA ITAA 1936**) and the alienation-of-income principles are live if the dominant purpose is a tax benefit.

**Verdict:** **QUESTIONABLE — HIGH RISK.** As described (year-end journals), this is the most aggressive part of the plan and the most likely to be unwound on audit, especially for pre-24-Apr income. It also creates a knock-on PSI/personal-services exposure if the "income" is really the founders' personal exertion.

**What SL must confirm in writing:**
- The split of FY26 income/expense by date relative to **24 Apr 2026** (incorporation) — and an explicit acknowledgement that **pre-24-Apr income remains the sole trader's assessable income**.
- For any 24 Apr–30 Jun income attributed to the Pty: the **specific, contemporaneous agency/bare-trust documentation** that existed at the time (not created at year-end), and a Part IVA risk assessment.
- That they are **not** relying on journals alone to move pre-incorporation income.

---

### 2. Subdivision 328-G Small Business Restructure Rollover — SUPPORTED-WITH-CONDITIONS

**Primary source (Verified — ATO SBRR guidance page; conditions map to ss 328-430/435/440/445):** The rollover allows CGT-neutral (and trading-stock/depreciating-asset-neutral) transfer of **active assets** of a small business between entities, provided ALL of:

1. **Genuine restructure of an ongoing business** (s328-430(1)(a)) — substance over form; the business continues to operate, not a step toward sale/winding-down. A **3-year safe-harbour** treats it as genuine if for 3 years post-rollover there's no change in ultimate economic ownership of significant assets, they're active assets, and there's no significant private use.
2. **Each party is a small business entity / affiliate / connected entity** with **aggregated turnover < $10M** (Verified — the SBE threshold). *Confirm ACT's aggregated turnover.*
3. **No material change in the ultimate economic ownership** of the transferred assets (s328-440) — the same individuals must ultimately own the assets in the same proportions before and after.
4. The asset is an **active asset** at the time of transfer (equipment used in the business qualifies; internally generated goodwill/IP can qualify as active assets but must be properly identified).
5. Both transferor and transferee are **Australian residents**; both **choose** to apply the rollover (recorded in writing).

**The discretionary-trust special rule (CRITICAL sub-point) — Verified (s328-440 statutory text, AustLII):** Because a discretionary trust has no fixed beneficial owners, the basic ultimate-economic-ownership test cannot be met in the ordinary way (ultimate economic ownership can only be held by natural persons; it is undefined in ITAA97). **s328-440 "Ultimate economic ownership — discretionary trusts" is the alternative test.** The statutory wording (quoted via AustLII): *"For the purposes of paragraph 328-430(1)(c), a transaction does not have the effect of changing the ultimate economic ownership of an asset, or any individual's share of that ultimate economic ownership, if: (a)(i) just before the transaction took effect, the asset was included in the property of a non-fixed trust that was a family trust; [or] (ii) just after the transaction takes effect, the asset is included in the property of a non-fixed trust that is a family trust; and (b) every individual who, just before the transfer took effect, had the ultimate economic ownership of the asset was a member of the family group relating to the trust or trusts referred to in paragraph (a); and (c) every individual who, just after the transfer takes effect, has the ultimate economic ownership of the asset is a member of that family group."* So the requirement is satisfied where a **family trust election (FTE)** is in force and **every individual with ultimate economic ownership before and after is a member of the same family group**. This is the mechanism that lets a transfer to/from a discretionary family trust qualify.

**Application here:** The Pty is owned 50/50 by **Knight Family Trust** and **Marchesi Family Trust** (two *different* discretionary trusts). The family-group test is per-trust and per-family. A transfer from Nic's sole trader (an individual) into a Pty owned by two different family trusts is **not a trivial fit** — the "same family group" requirement must hold for the relevant individuals across the structure, and two separate family groups complicate the "no material change in ultimate economic ownership" analysis. This is the condition most likely to break.

**Verdict:** **SUPPORTED-WITH-CONDITIONS.** The rollover is a real and appropriate tool, but its availability turns on (a) aggregated turnover < $10M, (b) genuine-restructure substance, and especially (c) the **FTE / same-family-group ultimate-economic-ownership analysis across the two trusts**.

**What SL must confirm in writing:**
- Aggregated turnover < $10M for the relevant year.
- That **valid family trust elections are in force** for both trusts (or will be, with effect for the relevant period), and the **exact s328-440 sub-section** they rely on for discretionary trusts.
- A worked **ultimate-economic-ownership before/after** analysis showing no material change across the sole trader → Pty(50% KFT / 50% MFT) transfer, addressing the two-different-family-groups problem.
- Identification of which assets are claimed as active assets (esp. any goodwill/IP) and their cost-base treatment.

---

### 3. GST-free supply of a going concern (s38-325) — SUPPORTED-WITH-CONDITIONS

**Primary source (Verified — GST Act s38-325; GSTR 2002/5; ATO going-concern guidance):** A supply of a going concern is **GST-free** if **all** of:

1. The supply is **for consideration** (s38-325(1)(a)).
2. The **recipient is registered or required to be registered** for GST (s38-325(1)(b)) — the Pty must be GST-registered by the day of supply.
3. The **supplier and recipient have agreed in writing** that the supply is of a going concern (s38-325(1)(c)) — must be **in writing and on or before the day of supply**.
4. The **supplier supplies to the recipient all of the things that are necessary** for the continued operation of the enterprise (s38-325(2)(a)).
5. The **supplier carries on the enterprise until the day of the supply** (s38-325(2)(b)).

**Application here:** Cleanly achievable for a 30 Jun 2026 transfer: ensure the Pty is GST-registered before 30 Jun; execute a written sale agreement that **explicitly states it is a supply of a going concern**; ensure **all things necessary** (codebases, IP, brands, contracts/customer relationships, equipment, key staff/contractor arrangements, systems) actually transfer; and the sole trader keeps operating right up to 30 Jun. For an intangible-heavy business, "all things necessary" must be carefully scheduled so nothing essential is omitted.

**Verdict:** **SUPPORTED-WITH-CONDITIONS** — low risk if the paperwork and asset schedule are complete.

**What SL must confirm in writing:**
- The Pty's **GST registration is effective on/before the day of supply**.
- A **written going-concern clause** in the sale agreement, dated on/before the day of supply.
- A schedule evidencing **"all things necessary"** transfer (critical for intangibles).

---

### 4. Division 7A complying director loan — SUPPORTED-WITH-CONDITIONS

**Primary source (Verified — ITAA 1936 s109N; ATO "Complying Division 7A loans" guidance):** A loan from the private company to a shareholder/associate (here, the founders) is **not** a deemed unfranked dividend if it is a **complying loan**, requiring:

1. A **written loan agreement** made **before the company's lodgement day** (the earlier of the due date and the actual date of lodgement of the company's income tax return for the year the loan was made).
2. Interest charged each year at **no less than the Division 7A benchmark interest rate** for that year.
3. Maximum term: **7 years (unsecured)**, or **25 years** if secured by a registered mortgage over real property where that property's value is ≥ the loan (with the specified loan-to-value condition).
4. **Minimum yearly repayments** made each year after the year the loan is made (the s109E formula).

**Application here:** The "$10K/mo salary + director's-loan top-up settled at year-end" structure works **only if** the top-up is documented as a complying loan before lodgement day **and** minimum yearly repayments/interest are honoured in subsequent years. Salary is fine (PAYG/super apply). The trap is treating drawings as a loan but never papering it or never repaying — then it becomes a deemed dividend. "Settled at year-end" must mean a *complying loan agreement executed before lodgement day*, not a balance written off.

**Verdict:** **SUPPORTED-WITH-CONDITIONS** — standard, low risk if executed on time.

**What SL must confirm in writing:**
- Written **complying loan agreement before the FY26 lodgement day**, at the **benchmark rate**, max **7-yr** term.
- The plan for **minimum yearly repayments** + interest in FY27 onward.
- That the **salary component** is run through payroll (PAYG-W + super), not folded into the loan.

---

### 5. R&D Tax Incentive continuity — QUESTIONABLE (HIGH RISK)

**What SL proposes:** The Pty claims FY26 R&D (~$200K refundable offset @ 43.5%) including activities/expenditure **incurred during the sole-trader period**.

**Primary source (Verified — ATO R&D guidance + s355-35 / s355-205 statutory text via AustLII):**
- An **"R&D entity"** is essentially a **company incorporated under Australian law** (plus a foreign company that is an Australian resident, or a foreign-resident company with a permanent establishment under a DTA) — **s355-35**. A **sole trader/individual cannot be an R&D entity**.
- s355-205 statutory text (AustLII): *"An R&D entity can deduct for an income year (the present year) expenditure it incurs during that year to the extent that the expenditure ... is incurred on one or more R&D activities for which the R&D entity is registered under section 27A of the Industry Research and Development Act 1986 ... and ... if the expenditure is incurred to the R&D entity's associate — is paid to that associate during the present year."* The statute is unambiguous: the notional deduction is for expenditure **the R&D entity itself incurs**, during the year, on activities **it** is registered for. ATO guidance reinforces: *"An R&D entity is only entitled to a notional deduction for R&D activities that are conducted 'for' itself ... the R&D entity must be the one incurring the eligible expenditure on its own registered R&D activities."*
- The company must **register its R&D activities** with the Department (AusIndustry) **within 10 months of the end of the income year** (IR&D Act s27A) — i.e. by ~**30 Apr 2027** for FY26 (the deadline is absolute; extensions must be applied for before it).

**The core problem:** Expenditure incurred by the **sole trader** (a non-R&D-entity individual) **before the company existed** is, on its face, **not** expenditure the R&D entity incurred. The make-or-break question — *"can the company claim R&D for expenditure incurred by the sole trader before the company existed/registered?"* — answers **no on the plain statute** for the pre-incorporation period. There is **no general provision** that lets a company inherit, by journal, R&D expenditure another taxpayer incurred before the company existed.

This mechanic is **entirely parasitic on Mechanic #1**: it only works if the sole-trader-period expenditure can validly be treated as the *company's* expenditure — and #1 fails for the pre-24-Apr period. Even for 24 Apr–30 Jun, the company can only claim expenditure **it actually incurred** (genuinely, as principal), and amounts paid to **associates** are subject to special timing rules (deductible in the R&D year only if actually **paid**, not merely incurred — s355-205/355-480 associate rule). 

**Note on memory/locked position:** This repo's own locked R&D position (MEMORY.md: "R&DTI Path C locked 2026-04-27") already states **FY24-25 is forfeited (sole-trader period, ineligible)** and the claim is **FY25-26 via A Curious Tractor Pty Ltd**. That internal position is *consistent with* this finding: the sole-trader period is the weak link. SL's proposal to sweep sole-trader-period expenditure into the FY26 company claim **conflicts with the principle that underpins the org's own Path C** and should be challenged.

**Verdict:** **QUESTIONABLE — HIGH RISK.** Claiming pre-incorporation sole-trader expenditure as the company's R&D is not supported by Div 355 on its face. The defensible claim is R&D **expenditure the company itself incurred from 24 Apr 2026 onward** (and only that genuinely incurred, with associate-payment timing observed).

**What SL must confirm in writing:**
- The **specific provision** they rely on for a company to claim R&D expenditure **incurred by a different entity before the company existed** — or concede it is limited to **post-24-Apr-2026 company-incurred expenditure**.
- A line-by-line **split of the ~$200K by who incurred it and when**, with pre-24-Apr amounts excluded (or a documented, contemporaneous agency basis — see #1).
- That **R&D activities will be registered with AusIndustry within 10 months** of FY26 year-end (by ~30 Apr 2027) and that **associate payments were actually paid** in the R&D year.

---

## SOURCES CONSULTED (primary only)

- **ITAA 1997 s6-5** (ordinary/assessable income) — via ATO business-income guidance.
- **ITAA 1997 Subdiv 328-G**, ss 328-430/435/440/445 — ATO Small Business Restructure Rollover guidance page (conditions, genuine restructure 3-yr safe harbour, ultimate economic ownership, discretionary-trust/FTE alternative).
- **A New Tax System (GST) Act 1999 s38-325** + **GSTR 2002/5** — ATO going-concern guidance.
- **ITAA 1936 s109N** (and s109E minimum repayments) — ATO "Complying Division 7A loans" guidance.
- **ITAA 1997 Div 355**, ss 355-35 (R&D entity = company), 355-205 (incurred), 355-480 (associate payments); **IR&D Act** 10-month registration rule — ATO R&D Tax Incentive eligibility guidance.
- **Part IVA ITAA 1936** (general anti-avoidance) — relevance flag for Mechanic #1.

**Confidence labels:** Principles for all five = **Verified** against ATO guidance / statutory text. Exact statutory wording of **s328-440 (discretionary-trust alternative)** and **s355-205 (incurred)** = **Verified** via AustLII-sourced search-result quotes (deep-link WebFetch to AustLII/legislation.gov.au returned HTTP 403 this session, so SL should still cite the section text directly from the consolidated Act for the file). GSTR 2002/5 and LCR 2016/3 paragraph-level detail = **Inferred** from ATO summaries (not the full ruling text this session). No blog used as authority anywhere.

**Key corroborating primary URLs:** ATO Small Business Restructure Roll-over guidance; ATO LCR 2016/3 (genuine restructure); AustLII ITAA97 s328-440, s355-35, s355-205, s355-225; ATO GSTR 2002/5; ATO "Supplies and purchases of going concerns"; ATO "Complying Division 7A loans" + ITAA36 s109N/s109E; ATO R&D Tax Incentive eligibility + "R&D expenditure incurred to an associate"; business.gov.au R&D registration (10-month deadline); ATO alienation-of-income guidance (IT 2121/2330/2503/2639, PSI Part 2-42, s84-5(2)); Arthur Murray (1965) 114 CLR 314 on derivation.

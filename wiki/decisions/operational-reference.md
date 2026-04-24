---
title: ACT Operational Reference — entity numbers, accounts, providers, credentials index
summary: All the operational data CEO + accountant + lawyer + insurance broker need to refer to. Entity registration numbers, banking, insurance, providers, subscriptions, domains. NO passwords or API keys live here — they live in the password manager. This file POINTS to where each credential is stored, not what each credential is.
tags: [decisions, brain, operational, reference, ceo]
status: live
date: 2026-04-25
---

# ACT Operational Reference

> **Security boundary** — this file contains **identifiers and locations**, not secrets. Account numbers (ABN, ACN) are public via ABR/ASIC lookup. API keys, passwords, 2FA backup codes, banking creds: NOT in this file. NOT in any committed file. They live in the password manager.
>
> Pattern: each row says **what** the account is + **where the credential lives** (e.g., "Bitwarden vault: ACT Pty"). To USE the credential, open the password manager. To CHANGE the credential, change it in the password manager AND update the access notes here if the location moves.
>
> **Password manager:** Bitwarden (confirmed 2026-04-25). Both vault entries (passwords) AND secrets (API keys, tokens) live in Bitwarden. See §13 for Bitwarden CLI / API / Secrets Manager integration patterns.

> **Audit trail:** any time a credential is rotated (key revoked, password changed, 2FA reset), note the date in the per-account "Last rotated" column. Quarterly review.

---

## 1. Entities (legal registers)

| Entity | Type | Number | Issuer | Issued | Status |
|--------|------|--------|--------|--------|--------|
| **A Curious Tractor Pty Ltd** | Pty Ltd | **ACN 697 347 676** | ASIC | 2026-04-24 | Active. Trading from 1 July 2026. |
| A Curious Tractor Pty Ltd | ABN | **PENDING** (Standard Ledger filing) | ABR | TBD | In progress; target Week 1-2 |
| A Curious Tractor Pty Ltd | GST | (issues with ABN) | ABR | TBD | In progress |
| A Curious Tractor Pty Ltd | TFN | TBD | ATO | TBD | Issues post-ABN; **STORE TFN IN PASSWORD MANAGER ONLY** |
| **Nicholas Marchesi sole trader** | Sole trader | ABN 21 591 780 066 | ABR | 2007 | Active until 30 June 2026. Cancel after final BAS. |
| Nicholas Marchesi sole trader | GST | Same ABN | ABR | 2022 | Cancel with ABN |
| Nicholas Marchesi sole trader | TFN | Nic's personal TFN | ATO | (personal) | Personal — not for documentation |
| **A Kind Tractor Ltd** | CLG (Public Co Limited by Guarantee) | **ACN 669 029 341, ABN 73 669 029 341** | ASIC + ABR | 2023 | Active, dormant, ACNC-registered |
| A Kind Tractor Ltd | ACNC registration | ACNC ID TBD | ACNC | 2023-12-11 | Active. GST Concession + Income Tax Exemption. **NOT DGR-endorsed** (application parked). |
| A Kind Tractor Ltd | TFN | TBD | ATO | (charity) | **STORE IN PASSWORD MANAGER ONLY** |
| Knight Family Trust | Trust | TBN (Trust Beneficial Number) TBD | ATO | TBD | 50% shareholder of Pty |
| Marchesi Family Trust | Trust | TBN TBD | ATO | TBD | 50% shareholder of Pty |
| **Harvest entity** | TBD | TBD | TBD | Pending Standard Ledger advice | Designing |
| **Farm entity** | TBD | TBD | TBD | Pending Standard Ledger advice | Designing |

**Director IDs** — required for both Ben + Nic. **TBD: confirm both registered (ABRS).** Recovery: ABRS portal, login via myGovID.

**Public lookup verification:**
- ABN/ACN status: https://abr.business.gov.au + https://asic.gov.au
- Charity status: https://acnc.gov.au

---

## 2. Banking + payment rails

| Account | Holder | Number / ID | Bank | Purpose | Credentials live in |
|---------|--------|------------|------|---------|---------------------|
| Sole trader business account | Nic Marchesi | TBD (full account no.) | NAB | Currently active; receives all sole-trader revenue | Bitwarden — Nic's personal vault |
| Sole trader business Visa | Nic Marchesi | NAB Visa **#8815** (last 4) | NAB | Spending card; tracked in `bank_statement_lines` | Bitwarden — Nic's personal vault |
| **Pty business account** | A Curious Tractor Pty Ltd | TBD (application in flight) | NAB | Will receive all Pty revenue from 1 July | **TBD vault: ACT Pty** |
| Pty business cards | TBD (Ben + Nic) | TBD | NAB | Founder cards under Pty | TBD vault: ACT Pty |
| **Stripe (sole trader)** | Nic Marchesi | TBD account ID | Stripe | Currently receives card payments | Bitwarden — Nic's personal vault |
| **Stripe (Pty)** | A Curious Tractor Pty Ltd | NEW account TBD | Stripe | Opens with new ABN; Stripe doesn't transfer between ABNs | TBD vault: ACT Pty |
| PayID / Osko | Pty NAB account | TBD | NAB | B2B payment standard | Setup with NAB account |
| **Charity bank** | A Kind Tractor Ltd | TBD | TBD bank | Status: dormant; account may not be active | TBD |

**Migration rule (Rule 1 from CEO review):** pre-cutover invoices stay with sole trader. Sole trader bank account stays open through FY27 Q1 minimum for run-off receipts.

**Bank notification cycle for cutover:** notify NAB of Pty as a related-party account (anti-money-laundering box check) when both accounts are open.

---

## 3. Tax + regulatory

| Item | Period | Reference | Held by | Filed via | Due |
|------|--------|-----------|---------|-----------|-----|
| **R&D Tax Incentive** (FY26) | 1 Jul 2025 – 30 Jun 2026 | AusIndustry registration TBD | Sole trader | Standard Ledger + dedicated R&D consultant (per CEO-review action) | With sole trader's personal tax return |
| **R&D Tax Incentive** (FY27) | 1 Jul 2026 – 30 Jun 2027 | RE-REGISTER under Pty | Pty | Standard Ledger | Lodged with Pty's first tax return |
| **BAS** Q4 FY26 (sole trader, final) | Apr-Jun 2026 | Sole trader ABN | Sole trader | Standard Ledger | **28 July 2026** (quarterly cycle) |
| **BAS** Q1 FY27 (Pty, first) | Jul-Sep 2026 | Pty ABN | Pty | Standard Ledger | 28 Oct 2026 |
| **Sole trader tax return FY26** | 2025-26 | Nic's personal | Personal | Standard Ledger as registered tax agent | 31 Oct 2026 (if no agent); 15 May 2027 (with agent) |
| **Pty tax return FY27** | 2026-27 | Pty | Pty | Standard Ledger | 31 Oct 2027 (estimate) |
| **PAYG Instalments (Pty)** | TBD | Pty ABN | Pty | ATO sets up after first return | Voluntary pre-payment Year 1 |
| **PAYG Withholding (Pty)** | If staff hired | Pty ABN | Pty | Register via ATO | When first staff hired |
| **Single Touch Payroll** | If staff hired | Pty ABN | Pty | Required from first pay | When first staff hired |
| **WorkCover Queensland** | If staff hired | Pty ABN | Pty | QLD WorkCover registration | When first staff hired |
| **Superannuation** | If staff hired | Pty ABN | Pty | Clearing house setup | 11.5% FY26, 12% FY27 |
| **ASIC annual review (Pty)** | Annual | ACN 697 347 676 | Pty | ASIC sends reminder | First review ~24 April 2027 |
| **ACNC annual information statement** | Annual | A Kind Tractor ACN | Charity | ACNC portal | Per ACNC schedule |

**TFNs are personal/sensitive — STORE IN PASSWORD MANAGER ONLY.** Never in a repo, never in an email.

---

## 4. Insurance

> **Status as of 2026-04-25:** No Pty policies bound yet. Insurance broker selection IS a Week 1 CEO action.

| Type | Cover | Required by | Provider | Policy # | Premium | Renewal | Broker contact |
|------|-------|------------|----------|----------|---------|---------|----------------|
| **Public Liability** | $20M minimum | Before Harvest lease signing (Sonas Properties; lease starts 2026-07-01) | TBD | TBD | TBD | TBD | TBD |
| **Directors & Officers (D&O)** | TBD | **Within 30 days of Pty registration → DUE 2026-05-24** | TBD | TBD | TBD | TBD | TBD |
| **Professional Indemnity** | TBD | First Pty consulting contract → 1 July 2026 | TBD | TBD | TBD | TBD | TBD |
| **Workers Compensation** | TBD | Day first employee starts | QLD WorkCover | TBD | TBD | TBD | (statutory) |
| **Product Liability** | TBD | First Goods product sale | TBD | TBD | TBD | TBD | TBD |
| **Cyber** | TBD | Recommend Year 1 | TBD | TBD | TBD | TBD | TBD |
| **Contents / equipment** | TBD | Before stocking Harvest or Farm | TBD | TBD | TBD | TBD | TBD |
| **Sole trader policies (any)** | (audit if any) | Run off at 30 June; no renewal | TBD | TBD | TBD | TBD | TBD |

**This-week CEO action:** select 3 brokers, get quotes for D&O + PL $20M, decide by end of Week 1.

**Recovery:** all policy documents in `.../shared-drive/insurance/` (TBD specific drive). Broker keeps master.

---

## 5. Service providers + advisors

| Service | Provider | Contact | Notes | Engaged from |
|---------|----------|---------|-------|--------------|
| **Accountant** | Standard Ledger | TBD primary contact | Handles ABN/GST filing, BAS, tax returns, lawyer referral for Shareholders Agreement, R&D coordination | Active |
| **Lawyer (Pty corporate)** | Standard Ledger's referred lawyer | TBD | Drafts Shareholders Agreement, IP assignment deed, novation deeds if needed | Pending engagement (Week 1-2) |
| **R&D consultant** | TBD | TBD | Dedicated R&D specialist for FY26 records review (per CEO-review action) | Pending engagement (by end May) |
| **Insurance broker** | TBD | TBD | PL $20M + D&O quotes | Pending selection (Week 1) |
| **Bank** | NAB | TBD relationship banker (Standard Ledger may have contact) | Pty account onboarding | In flight |

---

## 6. Service accounts + subscriptions (the audit list from migration plan)

> **Migration rule:** business subscriptions transfer billing to Pty from 1 July; personal subscriptions (ChatGPT personal, GitHub Copilot personal) stay personal, reimbursed via expense claim.

| Service | Currently billed to | Account holder | Login email | Plan | Billing cycle | Move to Pty? | Credentials in |
|---------|---------------------|----------------|-------------|------|--------------|--------------|----------------|
| **Xero** | Sole trader | Nic | TBD | TBD | Monthly | Create new Pty file Week 3; sole trader file → read-only after final BAS | Bitwarden |
| **GoHighLevel (GHL) CRM** | Sole trader | TBD | TBD | TBD | TBD | Migrate billing 1 July | Bitwarden |
| **Supabase (3 projects)** | TBD | Ben | ben@... | Free / Pro TBD | TBD | Migrate billing 1 July | `.env.local` (NEVER in git); Bitwarden |
| **Vercel** | TBD | Ben | TBD | TBD | TBD | Migrate billing 1 July | Bitwarden |
| **Google Workspace** (4 mailboxes: benjamin/nicholas/hi/accounts @act.place) | TBD | TBD | TBD | TBD | Monthly | Migrate billing 1 July | Bitwarden |
| **Stripe** | Sole trader | Nic | TBD | TBD | Per-transaction + monthly | NEW Pty account (Stripe doesn't transfer ABNs); 30+ day customer notice for re-auth | Bitwarden |
| **Anthropic API** | Sole trader | TBD | TBD | Pay-as-you-go | TBD | Move billing 1 July; rotate API keys at the same time | `.env.local`; Bitwarden |
| **OpenAI API** | Sole trader | TBD | TBD | TBD | TBD | Move billing 1 July; rotate keys | `.env.local`; Bitwarden |
| **Google Gemini API** | Sole trader | TBD | TBD | TBD | TBD | Move billing 1 July; rotate keys | `.env.local`; Bitwarden |
| **GitHub organisation** (Acurioustractor) | Sole trader | Nic + Ben as admins | benjaminknight (TBD primary admin) | Org plan TBD | Annual | Transfer org ownership to Pty's identity post-cutover | GitHub auth + Bitwarden |
| **Notion workspace** | Sole trader | TBD | TBD | TBD | Monthly | Migrate billing 1 July | Bitwarden |
| **Cloudflare / DNS** | TBD | TBD | TBD | TBD | TBD | Migrate billing 1 July | Bitwarden |
| **Domain registrars** | (per-domain — see §7) | varies | varies | varies | Annual | Migrate per-domain | Bitwarden |
| **Telegram Bot hosting** (Vercel) | TBD | TBD | TBD | TBD | TBD | Migrate billing 1 July | `.env.local`; Bitwarden |
| **PM2 / deployment infra** | TBD | TBD | TBD | TBD | TBD | Server bill — migrate 1 July | Bitwarden |
| **Figma / design tools** | TBD | TBD | TBD | TBD | TBD | Migrate or keep personal | Bitwarden |
| **BAS tools beyond Xero** | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| **Slack / comms tools** | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| **Adobe / creative** | TBD | TBD | TBD | TBD | TBD | Migrate or keep personal | TBD |

**Phase 5 of the cutover (Week 7-8):** subscription audit + customer novations + Stripe Pty account.

**Recovery (lost laptop scenario):** every subscription's login is recoverable via password manager + email-based reset. Critical: 2FA backup codes for each MUST be in Bitwarden (not just on the device).

---

## 7. Domain registry

| Domain | Registrar | Holder | Renewal | DNS host | Site | Project code |
|--------|-----------|--------|---------|----------|------|--------------|
| **act.place** | TBD | TBD (sole trader → Pty) | TBD | Cloudflare | act-regenerative-studio (Vercel) | ACT-CORE |
| **justicehub.com.au** | TBD | TBD | TBD | TBD | JusticeHub | ACT-JH |
| **goodsoncountry.com** | TBD | TBD | TBD | TBD | Goods | ACT-GD |
| **empathyledger.com** | TBD | TBD | TBD | TBD | Empathy Ledger | ACT-EL |
| **theharvestwitta.com.au** | TBD | TBD | TBD | TBD | The Harvest | ACT-HV |
| **civicgraph.app** | TBD | TBD | TBD | TBD | CivicGraph (Vercel) | ACT-CS |
| **picc.studio** | TBD | TBD | TBD | TBD | PICC | ACT-PI |
| **act-farm.vercel.app** | (Vercel subdomain) | Vercel team | n/a | Vercel | act-farm | ACT-FM |
| **oonchiumpa-app.vercel.app** | (Vercel subdomain) | Vercel team | n/a | Vercel | Oonchiumpa | ACT-OO |
| **campfire-website-amber.vercel.app** | (Vercel subdomain) | Vercel team | n/a | Vercel | CAMPFIRE / BG Fit | ACT-CM / ACT-BG |

**Domain transfer at cutover:** if domains are registered to Nic personally, transfer to Pty via registrar's transfer process. Likely 5-7 day window per domain. Plan for Week 9-10.

---

## 8. Where each kind of credential lives

> The pattern: **never in git, never in an email, never in a Notion page.** Three legitimate locations:

| Credential type | Lives in | Why |
|----------------|----------|-----|
| Anything API key | `.env.local` (gitignored) + Bitwarden backup | Apps need them at runtime; password manager has the recovery copy |
| Anything OAuth token (Xero, Google, etc.) | `.xero-tokens.json` (gitignored) for Xero; OS keychain for Google service account; Bitwarden backup of refresh tokens | OAuth refreshes in place; manual recovery via re-auth |
| Bank login | NEVER in any file | Bank requires 2FA every session; Bitwarden vault entry has username only |
| 2FA backup codes | Bitwarden (each entry has a "2FA backup" field) | Recovery if device lost |
| Password manager master password | Memorised + sealed paper backup in safe | Single point of failure — paper backup is the recovery |
| TFN | Bitwarden ONLY | Tax-sensitive |
| Service-role keys (Supabase) | `.env.local` + Bitwarden backup | Highest-privilege; rotate annually |
| GitHub PAT / fine-grained tokens | Bitwarden; `.env.local` only if a script needs it | Rotate every 90 days minimum |
| Anthropic + OpenAI + Gemini API keys | `.env.local` + Bitwarden | Rotate when leaving an environment (laptop change, contractor offboard, etc.) |
| Stripe live keys | `.env.local` (production env vars in Vercel) + Bitwarden | Live keys are highest-blast-radius — rotate immediately on any suspicion of leak |
| NAB business banking | NEVER in any file; 2FA via NAB token | Bank requires per-session 2FA; nothing to store |
| Standard Ledger client portal | Bitwarden | Tax-data sensitive |

**.gitignore enforces** (already in place): `.env`, `.env.local`, `.env*.local`, `.envrc`, `.mcp.json`, `.xero-tokens.json`. Re-verify periodically.

**Pre-cutover credential rotation (per CEO-review TODO #5 — Week 3-4):**
- All Anthropic / OpenAI / Gemini / Supabase / Stripe / NAB / GitHub keys CREATED for the Pty
- Sole trader keys remain valid through 30 June
- 1 July: sole trader keys revoked

---

## 9. Recovery + continuity

> "What if Ben's laptop is lost tomorrow?" / "What if Nic gets hit by a bus?"

### Single-founder recovery (Ben's laptop lost)
1. New device → install Bitwarden client → log in with master password + 2FA (TOTP backup codes in safe)
2. From Bitwarden: re-auth Google Workspace, GitHub, Vercel, Supabase, Anthropic, OpenAI, Stripe, NAB
3. From GitHub: clone repos
4. From Standard Ledger: recover any docs they hold
5. Estimated time: 4-6 hours to fully operational

### Two-founder continuity (Nic incapacitated)
- **Pty governance:** SHA (Week 1-2 priority) MUST cover director-removal + share-transfer-on-incapacity. Standard Ledger's lawyer to draft these clauses explicitly.
- **Banking signing authority:** both directors + (optionally) trusted third party
- **Bitwarden Emergency Access:** Bitwarden Premium feature — designate emergency contacts who can request access (with configurable wait time). Ben designates Nic; Nic designates Ben. Wait time: 0 days (instant) for true emergency, 7 days for soft-incapacitation. Configure in Bitwarden Settings → Emergency Access.
- **TOTP backup codes for both founders' Bitwarden accounts:** in respective home safes; updated annually.
- **Charity continuity:** A Kind Tractor Ltd has CLG director-replacement provisions per Corporations Act (charity stays even if both directors change)
- **R&D claim continuity:** R&D consultant should hold a backup of activity records (per CEO-review action — schedule the records review for May)

### Disaster recovery — repos
- All ACT codebases on GitHub (Acurioustractor org)
- Wiki content versioned in act-global-infrastructure repo
- Backups: GitHub IS the backup; Vercel deployments hold built copies; Supabase has its own daily backups (Pro tier — confirm tier per project)

### Records retention (statutory)
- Tax records: ATO requires 5 years from filing
- Company records (minute book, share register): kept for life of company + 7 years after deregistration
- ACNC records: 7 years
- BAS supporting docs: 5 years
- Employee records (when Pty has staff): 7 years from end of employment

---

## 10. The CEO daily-checkpoint touch points (where this file gets used)

| When | What you do here |
|------|-----------------|
| Daily cockpit shows a number that needs an external system | Look up the system in §6 (Service accounts) — go to that system; do the thing |
| Insurance broker calls | Pull §4 + §5 — give them the entity + entities-needed-cover lines |
| Standard Ledger needs a number | §1 (entities), §3 (tax), §4 (insurance), §6 (subscriptions) — copy/paste straight from here |
| Funder asks "who's your accountant / banker / insurer?" | §5 |
| New Claude session in any ACT repo asks "what's the entity?" | The synced ACT Context block in CLAUDE.md has the headline; this file is the deep reference |
| Annual D&O renewal lands | §4 — update policy # + premium + renewal date |
| Quarterly: rotate API keys | §8 — work through the credential-rotation list, update "Last rotated" notes |
| Quarterly: subscription audit | §6 — confirm each row is accurate; flag any drift to Pty-billing |

---

## 11. What this file deliberately does NOT contain

- Actual passwords, API keys, or 2FA codes (Bitwarden / `.env.local`)
- Personal TFNs (Nic's, Ben's, the Pty's, the charity's — all in Bitwarden)
- Bank account full numbers (last 4 only here, full in Bitwarden if needed)
- Funder email addresses for anyone other than primary contacts (GHL holds these)
- Per-employee details (no employees yet; if hired, separate `wiki/decisions/people-register.md`)
- Day-to-day project status (that's the Alignment Loop syntheses + cockpit)

---

## 12. TBDs to fill in this week (assigned)

1. **Ben:** confirm primary password manager (Bitwarden assumed) — search-and-replace this file if different
2. **Ben:** Director ID confirmed for Ben (ABRS portal)
3. **Nic:** Director ID confirmed for Nic (ABRS portal)
4. **Standard Ledger:** ABN issue date + GST registration date (will fill §1 entities)
5. **Standard Ledger:** lawyer name + contact for SHA / IP deed (§5)
6. **Ben:** insurance broker selection — 3 candidates → 1 by end of week (§4)
7. **Ben + Nic:** Trust beneficial numbers for Knight Family Trust + Marchesi Family Trust (§1)
8. **Ben + Nic:** confirm domain registrar + holder for each domain in §7 (likely a 30-min audit)
9. **Standard Ledger / Bank:** NAB Pty account number once active (§2)

Update each row as facts land. Then run `node scripts/sync-act-context.mjs --apply` to propagate any cross-cutting changes.

---

---

## 13. Bitwarden integration — yes, Bitwarden has APIs

Bitwarden has TWO products. Both have CLIs + APIs. Pick the right one for the job.

### Bitwarden Password Manager (vault)
- **CLI:** `bw` — `npm install -g @bitwarden/cli` or download standalone
- **What it does:** read/write vault entries (login items, secure notes, identities)
- **Auth:** API key (`BW_CLIENTID` + `BW_CLIENTSECRET`) → unlock with master password → returns session token
- **Use for:** retrieving login passwords for ad-hoc scripts, audits, list-what's-in-there queries
- **Cost:** free tier OK for individuals; Premium $10/yr for Emergency Access + TOTP storage; Teams / Enterprise for multi-user with shared vaults

### Bitwarden Secrets Manager (separate product)
- **CLI:** `bws` — `npm install -g @bitwarden/sdk-cli` or `cargo install bws`
- **SDK:** Rust, Python, Node, C#, Go, PHP, Ruby
- **What it does:** purpose-built for application secrets — API keys, tokens, environment variables. Per-secret access tokens; per-machine access tokens; project-scoped collections.
- **Auth:** access token per machine / per CI runner
- **Use for:** runtime secret fetching by scripts, CI/CD, replacing `.env.local`
- **Cost:** included in Teams/Enterprise; standalone $5/user/month (as of 2026)

### Recommended pattern for ACT (small team, current scale)

| Use case | Tool | Pattern |
|----------|------|---------|
| Daily login (you, the human) | Bitwarden vault — desktop / browser / mobile clients | Standard password manager UX |
| Audit "what credentials exist for ACT?" | Bitwarden vault via `bw list items` | Read-only; outputs JSON; pipe to script for inventory |
| Script needs an API key (e.g., `synthesize-project-truth-state.mjs` needs SUPABASE_KEY) | `.env.local` (gitignored) — current pattern | Don't change yet. Runtime fetch via `bw` works but adds 200-500ms per call. |
| Secret rotation across team | Bitwarden vault → share to "ACT Core" collection | Rotate once; team members see update on next vault sync |
| CI/CD runtime secrets (e.g., GitHub Actions, Vercel) | Bitwarden Secrets Manager `bws` OR Vercel/GitHub native env vars | `bws` is more centralised; native env vars are simpler if not many secrets |

### Concrete next steps if you want to wire it

1. **Now (5 min):** install `bw` locally, log in, run `bw sync` — confirms vault access
2. **This week (15 min):** create a "ACT Core" organisation in Bitwarden + a "ACT Pty Credentials" collection. Move all ACT-related entries into it. Share with Nic.
3. **This week (10 min):** build `scripts/bitwarden-audit.mjs` — list-only helper that reports what's in the ACT collection (names + folders, NOT values). Useful for "do we have a credential for X?" queries without revealing values.
4. **Next month (1 hr):** evaluate Bitwarden Secrets Manager. If you find yourself manually copying API keys between `.env.local` files across 8 repos, the Secrets Manager solves that. If `.env.local` per repo works fine, defer.
5. **Cutover (Week 3-4 per CEO-review TODO #5):** rotate ALL ACT credentials → Bitwarden under the new Pty entries. Sole-trader credentials archived (not deleted) in a "ACT Sole Trader Archive" collection.

### What Bitwarden does NOT replace

- `.env.local` for development (still the standard pattern)
- 2FA hardware tokens (YubiKey etc) for highest-stakes accounts (NAB, ASIC, GitHub admin)
- The discipline of NOT pasting secrets into chat / email / Notion

### Bitwarden CLI cheat-sheet (paste into a Bitwarden secure note for reference)

```bash
# One-time setup
npm install -g @bitwarden/cli
bw config server https://vault.bitwarden.com   # or self-hosted URL
bw login your@email.com                         # interactive
export BW_SESSION="$(bw unlock --raw)"          # session token, sets env var

# Read items
bw list items --search "Stripe"                  # find by name
bw get item "Stripe Pty Live"                   # get one
bw get password "Stripe Pty Live"               # just the password
bw get item "Stripe Pty Live" | jq -r .login.totp  # get current TOTP code

# Sync (after edits in another client)
bw sync

# For scripts
bw get item ID --raw | jq .login.password
```

---

## Backlinks

- [[README|Brain README — read first]]
- [[ceo-operating-model|CEO Operating Model — daily/weekly rituals]]
- [[act-core-facts|Entity layer source-of-truth (entity headlines)]]
- [[act-brand-alignment-map|Brand alignment map]]
- [[../../thoughts/shared/plans/act-entity-migration-checklist-2026-06-30|Cutover plan]]
- [[../cockpit/today|Today's cockpit]]

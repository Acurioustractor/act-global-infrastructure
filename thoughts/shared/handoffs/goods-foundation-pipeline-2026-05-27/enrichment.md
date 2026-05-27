# Goods on Country — Foundation Shell Enrichment + Nic's Recent Goods People

**Generated:** 2026-05-27 · read-only research, NO writes to GHL/Gmail/Notion/Xero. Only local file.

> ## ✅ EXECUTED 2026-05-27 — `scripts/enrich-goods-foundation-contacts-2026-05-27.mjs --apply`
> Supporter Journey **32 → 35**. 0 errors.
> - **2 shells promoted to real humans** (updateContact, tags VERIFIED preserved): Minderoo → Lucy Stronach; Paul Ramsay → William Frazer.
> - **3 NEW foundation opps + contacts**: The Bryan Foundation (Matthew Cox, Cultivating), The Ian Potter Foundation (Alberto Furlan, Cultivating), Brian M Davis Charitable Foundation (Sarah Bartak, Ask made).
> - **7 new + 2 re-tagged secondary/route contacts**: Anita Hopkins (BMDCF), Jonas Kubitscheck (PRF), Jay Boolkin + Matt Allen (Social Impact Hub = QBE route), Marty Taylor + Narelle Anderson (Envirobank).
> - **QBE shell left as company-record** — route is via Social Impact Hub (Jay Boolkin), now captured as contacts.
> - **11 shells still have no real contact** (Rio Tinto, BHP, Fortescue, Frontier Services, Community Resources, Yeperenye, Nova Peris, ACF, NAACT, Country Connect, Mjd) — no published decision-maker email; need warm intro or program-inbox/web-form approach, NOT a fabricated contact.

## Method & sources

- **Primary:** Supabase `communications_history` (Gmail sync, project `tednluwflfhxyucgwigh` — verified). Mailbox identified by `metadata->>'from'`/`->>'to'` containing `nicholas@act.place`; counterparty humans read from those same headers. No `mailbox` column exists; `metadata->>'handle'` is phone numbers (iMessage rows), not mail. 13,614 synced emails, Jul 2025 → 25 May 2026. nicholas@-involved Goods-ish mail since 2025-11-01: **238 messages**.
- **Live `scripts/gmail-deep-search.mjs`:** NOT run. It is a receipt-by-vendor-and-date matcher (Xero-attachment workflow), not a free-text funder/person discovery tool, and the synced DB already holds full from/to/subject for all four mailboxes. Recency is covered to 25 May 2026 in the sync. **Coverage gap unchanged from the prior mine:** accounts@ (181) and hi@ (283) are thinly synced; a funder thread living only there could be missed. Not a blocker for nicholas@, which is well covered (1,752 rows).
- **Web research:** used for the shells with zero email presence. Foundation aggregator sites (ZoomInfo/RocketReach) name people but **redact the actual email and conflict on current role-holders** — those are recorded as "name only / web — verify", never as a usable address.
- **GHL / Notion:** not separately queried for shell contacts — the email DB resolved the high-value shells (QBE, Minderoo, Paul Ramsay) with real verified humans, and the rest have no individual published email regardless of source. Flag if a GHL/Notion pass is wanted for the unresolved 10.

**No name, email, or phone below was invented. "NONE FOUND" means no real published contact was located in any source consulted.**

---

## 1. Shell enrichment (the 15 GHL company-shell foundations)

| Shell org | Real contact found (name / email) | Source | Confidence |
|---|---|---|---|
| **QBE Foundation** | Route is via **Social Impact Hub**, which administers QBE's "Catalysing Impact" program ACT was *selected into*: **Jay Boolkin** `jay@socialimpacthub.org`, **Matt Allen** `matt.allen@socialimpacthub.org` (also Malcolm Aikman `malcolm.aikman@socialimpacthub.org`). QBE's own foundation has no individual ACT contact — only comms staff (Alyssia El Gawly `alyssia.elgawly@qbe.com`, Sophia Elliott `sophia.elliott@qbe.com`, web-listed, low value). | mail (SIH) + web (QBE comms) | **verified** (SIH humans, live threads) / web-verify (QBE comms) |
| **Minderoo Foundation** | **Lucy Stronach** `lstronach@minderoo.org` (primary, ~25 threads incl. "Goods. and thank you" 2026-04-08); **Roy McNamara-Smith** `rsmith@minderoo.org` (cc'd on JusticeHub overview). Bulk of relationship is JusticeHub/CONTAINED, but Goods is explicitly on the table with Lucy. | mail | **verified** |
| **Paul Ramsay Foundation** | **William Frazer** `wfrazer@paulramsayfoundation.org.au` and **Jonas Kubitscheck** `jonas@paulramsayfoundation.org.au` — ACT (Nic + Ben) + Oonchiumpa met with them ("Lunch at PRF" Oct 2025 → "Thank you for meeting with us" through Mar 2026). PRF also runs a **First Nations Targeted Grant Round** (up to $500K, remote NT/Qld/SA) under Chief First Nations Officer **Michelle Steele** (web; no published email). | mail (Frazer/Kubitscheck) + web (Steele) | **verified** (Frazer/Kubitscheck) / web-verify (Steele) |
| **Developing East Arnhem Limited (DEAL)** | DEAL the org: **NONE FOUND** direct. Web names the CEO inconsistently (**Luke Walker** per ZoomInfo vs **Paul Dobing** per RocketReach) — unverifiable, no email. NB: ACT's *East Arnhem Goods threads* are with the **region's delivery bodies**, not DEAL: **Madelyn Hay** (Miwatj Health) `madelyn.hay@miwatj.com.au`; **Amy Elson** (NT Govt) `amy.elson@nt.gov.au` — "beds and washing machines east arnhem communities", to Nov 2025. | web (DEAL name) / mail (region delivery) | web-verify only (DEAL); verified (region contacts) |
| **Mjd Foundation Limited** | **NONE FOUND** (no published email). Web names a CEO — sources conflict (**Jacquie Hatt** current per one listing; co-founder **Nadia Lindop OAM** departed early 2024). Org email format published as `first.last@mjd.org.au`; general line +61 1300 584 122. No live ACT thread. | web | web-verify (name only, no email) |
| **Northern Australian Aboriginal Charitable Trust (NAACT)** | **NONE FOUND.** = charitable arm of **Aboriginal Investment Group (AIG)**; runs the **Remote Laundries Project** (`remotelaundries.org.au`) — Goods' exact domain, a peer/partner as much as a funder. A "Brittany Ciupka, Project Officer" is referenced online but no email. No ACT email thread. | web | none found (no individual email) |
| **Fortescue Foundation** | **NONE FOUND.** Community Grants run through `fmgl.com.au/communitygrants`; no individual philanthropy-manager email published. Parent of Minderoo (Forrest family). No ACT email thread. | web | none found |
| **Rio Tinto Foundation** | **NONE FOUND.** No individual contact published; no ACT email thread. | — | none found |
| **BHP Foundation** | **NONE FOUND.** No individual contact published; no ACT email thread. | — | none found |
| **Country Connect Foundation Limited** | **NONE FOUND** (no decision-maker email). First Nations-led NT remote-services org; founders **Troy Barrett** & **Louise Lethbridge** (2020, web); only `recruitment@countryconnect.org.au` published. No ACT email thread. | web | web-verify (founder names only, no usable email) |
| **Uniting Church Australia Frontier Services** | **NONE FOUND.** No individual contact located; no ACT email thread. | — | none found |
| **Community Resources Limited** | **NONE FOUND.** No individual contact located; no ACT email thread. | — | none found |
| **The Trustee For Yeperenye Charitable Trust** | **NONE FOUND.** Central Australian (Alice Springs) Indigenous community trust; no individual email; no ACT email thread. | — | none found |
| **Nova Peris Foundation** | **NONE FOUND.** Founder **Nova Peris OAM** (LinkedIn); foundation contact page exists (`novaperisfoundation.org.au/contact-us`) but no individual email surfaced. No ACT email thread. | web | web-verify (founder name only, no email) |
| **Australian Communities Foundation** | **NONE FOUND** (individual). ACF has a First Nations giving focus area + grant rounds; Philanthropy Team line 03 9412 0412, individual emails redacted on web. No ACT email thread. | web | none found (no individual email) |

**Scoreboard:** 3 shells fully resolved with verified humans (QBE-via-SIH, Minderoo, Paul Ramsay). 1 partial (DEAL — region delivery contacts found, the foundation itself not). 11 = no real individual contact found (web names where they exist are aggregator-sourced and unverifiable / no email).

---

## 2. Nic's recent Goods people (NEW — not in GHL Goods Supporter Journey or the prior gmail mine)

Swept nicholas@act.place Goods-ish mail since Nov 2025. Excludes everyone already in the dedup list and everyone already captured in `gmail-funders.md` (Snow, Centrecorp, QIC, FRRR, VFFF, TFN, Red Dust, John Villiers, Philanthropy Australia, Rotary, AMP, Julalikari, Our Community Shed, PICC, Oonchiumpa, Anyinginyi, Zinus, REAL Innovation Fund).

| Person | Email | Org / family | Last contact | Context (1-line) | Why philanthropist / funder |
|---|---|---|---|---|---|
| **Matthew Cox** | `mcox@thebryanfoundation.org.au` | **The Bryan Foundation** (Brisbane; Bryan Family Group — `mtaylor@bryanfamilygroup.com.au` also on thread) | 2025-11-06 | "BFF + Goods" — direct Goods funder thread. | **Family foundation, direct Goods ask.** Standout NEW funder. |
| **William Frazer** | `wfrazer@paulramsayfoundation.org.au` | **Paul Ramsay Foundation** | 2026-03-24 | "Lunch at PRF" → "Thank you for meeting with us" (with Oonchiumpa). | Major foundation; in-person meetings, warm. Also resolves the PRF shell. |
| **Jonas Kubitscheck** | `jonas@paulramsayfoundation.org.au` | **Paul Ramsay Foundation** | 2026-03-24 | On the same PRF meeting thread. | Major foundation contact. |
| **Sarah Bartak** | `sarah.bartak@brianmdavis.org.au` | **Brian M Davis Charitable Foundation** (BMDCF) | 2026-04-30 | "Good Design Feedback" — a Goods design/application review (apps inbox `applications@brianmdavis.org.au`). | **Charitable foundation reviewing a Goods application.** NEW funder. |
| **Anita Hopkins** | `anita.hopkins@brianmdavis.org.au` | **Brian M Davis Charitable Foundation** | 2026-04-30 | Same BMDCF "Good Design Feedback" thread. | Foundation staff on a live Goods app. |
| **Alberto Furlan** | `alberto.furlan@ianpotter.org.au` | **The Ian Potter Foundation** | 2026-04-26 | "Goods Check in and Hi" (Nic → Alberto). | **Major national foundation, direct Goods check-in.** Standout NEW funder. |
| **Teya Dusseldorp** | `teya@dusseldorp.org.au` | **Dusseldorp Forum** (family foundation; CEO, Dusseldorp family) | 2026-04-01 | "CONTAINED Tour // Reconnection" + "DF, Mounty, ACT catch up" (with Margot Beach `margotbeach@`, Jessica Duffy `jessicaduffy@`, Scarlett Steven `scarlettsteven@`). | **Family-foundation CEO, warm active relationship.** Thread is CONTAINED/Mounty Yarns (JusticeHub-side) more than Goods — funder relationship, Goods-adjacent. |
| **Marty Taylor** | `mtaylor@envirobank.com.au` | **Envirobank** (Narelle Anderson `nanderson@envirobank.com.au` also) | 2026-02-26 | "Envirobank + Goods" — sustained back-and-forth (13 msgs). | Corporate partner/funder exploring a Goods tie-up. NEW. |
| **Jay Boolkin** | `jay@socialimpacthub.org` | **Social Impact Hub** (admins QBE "Catalysing Impact") | 2026-04-13 | "Catalysing Impact" selection + "QBE Program Induction" + "Investment Readiness Diagnostic". | **Door to QBE Foundation funding** + investment-readiness support. Standout — resolves the QBE shell. |
| **Matt Allen** | `matt.allen@socialimpacthub.org` | **Social Impact Hub** | 2026-04-28 | "ACT Diagnostic Session" — investment-readiness diagnostic for ACT. | Capacity/funder-readiness partner; QBE program route. |

### Seen but NOT classified as new funders (logged for completeness)
- **Simon Quilty** `sq@wilyajanta.org` (Wilya Janta) — housing/health researcher & advocate, Tennant Creek; **partner/advisor**, not a funder.
- **Alice Benchoam** `gm@bawinanga.org.au` / **Shannon Inder** `shannon.inder@bawinanga.org.au` (Bawinanga Aboriginal Corp) — **delivery partner** (BAC laundromat launch/monitoring), not a funder.
- **Mark @ Speed Queen** `mark@speedqueenlaundry.com.au` — laundry-equipment **vendor**, not funder.
- **Sam/Millie/Todd/Will @ Defy Design** `*@defydesign.org` — Goods design/build **collaborators**, not funders.
- Dusseldorp's `daniel@justreinvest.org.au` / `nicole@justreinvest.org.au` (Just Reinvest) sit on the CONTAINED/JusticeHub thread — **JusticeHub-side**, not Goods funders.

---

## Notes for the GHL/pipeline pass
- **3 standout NEW philanthropic foundations to add to the Goods journey:** **The Bryan Foundation** (Matthew Cox — direct "BFF + Goods"), **The Ian Potter Foundation** (Alberto Furlan — "Goods Check in"), **Brian M Davis Charitable Foundation** (Sarah Bartak / Anita Hopkins — live "Good Design Feedback" application). All three are genuinely new, named-human, Goods-specific.
- **Two of the 15 shells are really resolved through intermediaries, not the foundation directly:** QBE → Social Impact Hub (Jay Boolkin), and DEAL → the East Arnhem region's Miwatj/NT-Govt contacts. Tag accordingly so outreach goes to the live human, not a dead foundation inbox.
- **Paul Ramsay shell** has two warm, email-verified humans (Frazer, Kubitscheck) — promote from shell to active.
- **10 shells have no individual contact in any source** (Rio Tinto, BHP, Fortescue, Frontier Services, Community Resources, Yeperenye, Nova Peris, Australian Communities Foundation, NAACT, Country Connect). These need either a direct web-form/program-inbox approach or a warm intro — no decision-maker email is published. Do NOT fabricate one.

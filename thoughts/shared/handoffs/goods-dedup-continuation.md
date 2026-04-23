# HANDOFF — Goods contact dedupe continuation

> Session: 2026-04-23 evening (PR #46 merged)
> Next session start: **read this first**
> Context: `rename-goods-slug` merged to `main`. Pipeline + CRM + agents live.

## Start here (first 3 tool calls next session)

```sql
-- 1. Verify current state (should show 25 company groups remaining)
SELECT LOWER(TRIM(company_name)) AS company_key, COUNT(*) AS cnt
FROM ghl_contacts
WHERE 'goods' = ANY(tags) AND company_name IS NOT NULL AND company_name != ''
GROUP BY company_key HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- 2. Stub contacts (empty/whitespace full_name) — fastest cleanup wins
SELECT ghl_id, full_name, email, company_name FROM ghl_contacts
WHERE 'goods' = ANY(tags)
  AND (full_name IS NULL OR TRIM(full_name) = '' OR full_name ILIKE 'accounts %');

-- 3. Role-stub contacts (no person name, just role) — candidates to either
--    rename with real person or merge into an identified individual
SELECT ghl_id, full_name, email, company_name FROM ghl_contacts
WHERE 'goods' = ANY(tags)
  AND (full_name ILIKE 'chief executive%' OR full_name ILIKE 'coordinator%'
    OR full_name ILIKE '%secretary%' OR full_name ILIKE 'deputy ceo%'
    OR full_name ILIKE 'reception%' OR full_name ILIKE 'gm %'
    OR full_name = LOWER(company_name));
```

## What shipped in the previous session

- PR #46 merged — 18 commits, slug rename + CEO plan + agent architecture + agent runtime + 5 agents + llm_usage table + CRM rebuild (12-stage Buyer Pipeline + Demand Register, $767K seeded from Xero, opp drawer, kanban UI) + merge endpoint FK fix + auto-merge script + PM2 activation
- Post-merge dedup done: 35 duplicate contacts consolidated into 7 keepers via Tier 2 email-match (Sally Grimsley-Ballard, Sam Davies, Scarlett Steven, Simon Quilty, Rachel Atkinson, Steph Pearson, Susan Clear)
- PICC orphan also merged into Rachel Atkinson

## What remains — the 25 company groups

**Headline:** these are mostly legitimate different-people-at-same-org. NOT duplicates in the strict sense. But the user explicitly wants to work through them because some groups have stub or role-only contacts that should be cleaned up, and some orgs have too many contacts that duplicate relationship context.

### Groups — 5 members

**dusseldorp forum (5)** — Teya, Rachel Fyfe, Margot Beach, Jessica Wilson, Scarlett Steven. All real people at Dusseldorp. KEEP ALL — just a well-staffed funder.

### Groups — 4 members

**our community shed (4)** — coordinator@, chair@, treasurer@, secretary@. Role-based emails. Two are name-less (`" "`, `"our community shed"`). Recommend: rename the two name-less stubs to "Treasurer — OCS" / "Chair — OCS" style, OR consolidate into a single `accounts@ourshed.org` contact if OCS prefers one point of contact. **Ask user.**

**snow foundation (4)** — Sally Grimsley-Ballard (lead), Carolyn Ludovici, Ashley Machuca, Alexandra Lagelee Kean. All real. KEEP ALL — Snow is the #1 funder relationship, more people = more surface area.

### Groups — 3 members

**bawinanga aboriginal corporation (3)** — Alice Benchoam (GM), Phillip Allan, Noeletta McKenzie. Real people. KEEP.

**ingkerreke commercial (3)** — Jim Rebbechi, Kathy McConnell, Matt Davies. Real. KEEP.

**julalikari council aboriginal corporation (3)** — "chief executive officer" (ceo@ stub), Delaicee Power, "gm corporate" (gmcorporate@ stub). TWO role-stubs. Recommend: find the current CEO's name and rename, or merge stubs into Delaicee Power if she's the primary relationship.

**murrup barak (3)** — Shellee Strickland, Rhianna King, Max Broadley. Real. KEEP.

**paul ramsay foundation (3)** — "paul ramsay foundation" (hello@ stub), Prebhjot Kaur, William Frazer. The hello@ stub could be renamed "Ramsay Foundation Hello" or kept as general contact. William Frazer is the primary per memory. KEEP ALL but maybe rename stub.

**picc (3)** — Rachel Atkinson (primary, already absorbed PICC orphan), Max Archibald, Narelle Gleeson. Real. KEEP — three real PICC relationships.

**red dust (3)** — Erin Riddell, Matthew Carman, Fiona Scicluna. Real. KEEP.

**relove (3)** — Ren Fernando, Ben Stammer, `" "` with nicky@relove.com.au. One stub (no name). Recommend: rename to "Nicky — Relove" or ask user if nicky is a specific person.

**streetsmart australia (3)** — Alan White, Isabella Stanley, Adam Robinson. Real. KEEP.

**wilyajanta (3)** — Simon Quilty (primary), Lucy McGarry, Jimmy Frank. Real. KEEP — memory confirms Simon + Lucy. Jimmy Frank is newer, verify role.

### Groups — 2 members

**aracy** — Eula Rohan, Rowena Cann. Real. KEEP.

**centre for public impact** — Alli Edwards, Anika Baset. Real. KEEP.

**defy design** — Sam Davies (primary, absorbed 7 dups), Todd Sidery. Real. KEEP.

**impact frontiers** — Peter Bent, "impact frontiers" (info@ stub). Rename stub or merge into Peter.

**miwatj health** — Madelyn Hay, Annabelle Macansh. Real. KEEP — anchor buyer relationship building.

**portable** — Simon Goodrich, Willhemina Wahlin. Real. KEEP.

**qic** — Cat Sullivan, Justin Welfare. Real. KEEP.

**queensland gives** — Seana Osbourne, Tara Castle. Real. KEEP.

**sefa** — Joel Bird, "sefa " (info@ stub). Rename stub or merge into Joel.

**small giants** — Danny Almagor, Tamsin Jones. Real. KEEP.

**the funding network** — Maddi Alderuccio, Kristen Lark. Real. KEEP.

**urapuntja aboriginal corporation** — "reception - urapuntja" (reception@ stub), "deputy ceo" (deputyceo@ stub). Both stubs, no named person. Recommend: consolidate into one accounts@ contact OR ask user for current named contact.

### Summary recommendations

| Action | Count | Notes |
|---|---|---|
| **KEEP ALL as-is** (real people at same org) | 17 groups | No action needed |
| **Rename 1-2 stubs** to identify actual person | 5 groups | Julalikari, Paul Ramsay (hello@), Relove (nicky@), Impact Frontiers, SEFA |
| **Consolidate role-stubs** into accounts contact | 3 groups | Our Community Shed, Urapuntja, possibly Julalikari |
| **Ask user for primary person** | 0 groups | All have at least one named person already |

**Biggest leverage:** the 4 "Accounts <Org>" orphans I created earlier (Homeland School, Mala'la Health, Rotary Eclub, and originally PICC) — PICC already merged. The other three remain because those orgs don't yet have a named individual contact. These are fine as-is (org-level billing contacts) OR rename from "Accounts Homeland School Company" to something more useful.

## Tools available in next session

1. **Merge API (FIXED):** `POST http://localhost:3010/api/goods/merge` with `{keepId, mergeIds}` — handles all 7 FK constraints correctly
2. **Auto-merge script:** `scripts/auto-merge-obvious-goods-duplicates.mjs` — has Tier 1-3 rules, all current Tier 1-3 matches already merged. Could extend with Tier 4 (rename stubs to reflect real person where email domain implies it) or Tier 5 (consolidate role-only contacts at same org)
3. **UI:** `localhost:3010/goods` → Contacts tab → click duplicates banner → manual merge per group with the merge API call underneath
4. **Direct SQL update** for simple rename-only operations (no merge, just update full_name/first_name/last_name)

## Approach options for next session

### Option A — Knock out the stubs (30 min, mechanical)
Just rename the ~8 stub contacts across 5-6 groups. No merges. Clean list, no relationship loss. Most conservative.

### Option B — Consolidate role-only contacts (1 hour, some judgment)
For Our Community Shed, Urapuntja, and Julalikari — decide if multiple role emails should consolidate into one accounts@ master. User-judgment-heavy.

### Option C — Extend auto-merge with Tier 4+ rules (2 hours, more work)
Write rules that:
- **Tier 4:** if `full_name` is whitespace/empty OR equals `company_name`, merge into any named contact at same org with an individual email
- **Tier 5:** if two contacts at same org have generic role emails (info@, reception@, accounts@) and no other distinguishing data, consolidate

### Option D — Just walk through the /goods dedup UI
User clicks through each group manually. Merge API is fixed so no more 500s. Slower but gives the user full control.

**Recommendation to open with:** Option A first (quick wins), then Option B if user wants more cleanup, then push back on Option C/D unless there's actual harm being caused by the current state.

## Known hazards

- **Some stubs carry tags** (goods-linkedin-supporter, goods-tier-engaged, goods-newsletter, etc.) — merging them loses those tags unless reassigned to keeper. The merge endpoint DOES union tags automatically, so this is fine — but worth noting.
- **`last_contact_date` nulls** — can't use for keeper selection. Fall back to `updated_at` (as the auto-merge script already does).
- **The 4 "Accounts <Org>" orphans** I created from seed script — tagged `auto-created-from-xero`. DO NOT merge them with arbitrary named individuals at same org — those opp associations have meaning (accounts contact for invoicing specifically). Keep as-is OR rename to "Invoicing — <Org>".

## Active PM2 agents (running in background)

- `agent-xero-ghl-reconciler` daily 05:00 AEST
- `agent-funder-cadence` daily 06:00 AEST
- `agent-procurement-analyst` Monday 08:00 AEST
- `agent-invoice-drift-detector` Monday 08:30 AEST

Check `pm2 list` for status. If agents emit new drafts overnight, user might want to review before dedup work.

## Environment notes

- Command-center runs on port **3010** (3002 is taken by Oonchiumpa's Vite dev server)
- Branch is clean on `main` after PR #46 merge
- 13 commits were in the branch; all checks green pre-merge
- `llm_usage` table tracks agent costs; query for spending patterns

## Questions the CEO may want answered

1. Our Community Shed: should all 4 role emails collapse into one accounts contact, or stay distributed?
2. Urapuntja: no named person — worth reaching out to establish a named relationship before cleaning up GHL?
3. Julalikari: who's the current CEO? Want to rename the `chief executive officer` stub.
4. Impact Frontiers / SEFA: keep info@ stubs or rename to known primary?
5. Relove: is nicky@relove.com.au a specific person worth named-contact?

Good luck next session.

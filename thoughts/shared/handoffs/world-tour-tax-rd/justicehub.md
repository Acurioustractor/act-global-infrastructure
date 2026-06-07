# JusticeHub — World Tour Tax / R&D Scout Report
Generated: 2026-05-31

---

## 1. WHAT IT IS

JusticeHub is a digital platform for Aboriginal Community Controlled Organisations (ACCOs) supporting young people in contact with the Australian justice system. It is a Next.js 14 / Supabase web app (port 3004) that serves three audiences simultaneously: ACCO workers managing case-level evidence and story records; funders and judges reviewing proof of impact; and young people and families whose stories are held inside the system. The platform spans a public campaign site ("The Contained" — a branded advocacy campaign), a funder intelligence surface, a community services map, an evidence catalogue (ALMA — Australian Living Map of Alternatives), a justice data matrix, and a funding discovery / application workspace. Auth is Auth0. Stripe handles payments. Empathy Ledger v2 is integrated as a story syndication source with consent-gated embed tokens. The shared Supabase instance (`tednluwflfhxyucgwigh`) is the same DB used by GrantScope, giving JusticeHub access to the CivicGraph org graph, justice funding records, and ACNC/ORIC data alongside its own tables.

---

## 2. TECHNICALLY NOVEL / UNCERTAIN PARTS

- **Consent-gated vector search in SQL (pgvector + RLS)** — ALMA evidence embeddings are stored with a `consent_level` column; a custom Postgres RPC (`justice_matrix_search_evidence`) enforces redaction rules at the database layer so Community Controlled findings are stripped before leaving the server. Whether this consent-in-SQL pattern would hold under adversarial API misuse or edge-case RLS interactions was not knowable in advance.

- **Cross-platform story syndication with embed tokens** — Stories authored and consented in Empathy Ledger v2 are surfaced in JusticeHub via a separate syndication API using per-story embed tokens (`embedToken` + `contentUrl`). The correct design for a consent-carrying, cross-domain story feed — where revocation in the source must propagate to consumers — was genuinely experimental; the API contract (`EMPATHY_LEDGER_SYNDICATION_KEY`) had no prior art in the codebase.

- **Multi-source document ingestion pipeline for ALMA** — The ingestion service chains Firecrawl (web crawl), Jina AI Reader (PDF-to-markdown), and Claude extraction into a structured `alma_evidence` / `alma_interventions` schema, with Zod validation before any DB write. Whether Claude could reliably extract intervention-level structured data from heterogeneous government program pages (AIHW, state justice departments, NATSILS) at usable fidelity was not determinable without running it.

- **The Contained — campaign-embedded evidence rendering** — A locked brand system ("The Contained") is embedded as a subroute within the platform with its own strict visual contract (Space Grotesk / IBM Plex Mono, strict hex palette, no AI-generated photorealistic images). Building a campaign surface that shares routing and auth with a case-management tool without visual or data bleed was a non-obvious design problem.

- **Justice Matrix + human-review provenance** — Recent migrations (20260529–20260530) add a `matrix_human_review_provenance` layer on top of the AI-extracted evidence, plus a `justice_matrix_issues` surface. The correct schema for tracking which AI-generated rows have been reviewed by whom, and surfacing only verified rows to public search, involved iterative decisions about provenance columns that could not have been settled by reasoning alone.

---

## 3. FIELD-RESEARCH QUESTIONS

An overseas visit to justice / youth / community organisations would directly inform these open technical design questions:

- **Consent workflow at the point of story collection** — Does verbal or video consent (as the OCAP gate currently accepts) need a witness counter-signature in the room? Would an offline-capable consent form (PWA / paper-digital hybrid) be used by workers who collect stories in remote communities with poor connectivity?

- **Frontline worker UX for evidence submission** — What does an ACCO case worker actually have access to (phone, laptop, shared device)? This determines whether the ALMA ingestion pipeline needs a mobile-first input path, and whether rich-text (TipTap editor, currently in the stack) is the right submission surface at all.

- **Cross-jurisdiction data sovereignty expectations** — Do First Nations organisations in Canada (OCAP), New Zealand (Māori Data Sovereignty), and Scotland (children's hearings model) have technically distinct data-residency requirements that would require separate Supabase instances, or is per-row `consent_level` gating sufficient? The current single-instance model assumes the latter.

- **Evidence trust hierarchies** — How do international comparators (Diagrama Foundation Spain, Scottish Children's Hearings, NZ Oranga Tamariki — all noted as target ALMA sources) signal authority on their own evidence? This affects whether the `cultural_authority` boolean column is sufficient or needs a multi-level taxonomy.

- **Funder evidence consumption patterns** — Do funders engaging with the Justice Matrix want a semantic search interface (current design) or a structured filtering / comparison view? Field observation of a funder reading a STAY journal vs. the digital platform would resolve a key UX fork that is currently unresolved in the routing structure.


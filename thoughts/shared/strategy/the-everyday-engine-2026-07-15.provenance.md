# Provenance: the-everyday-engine-2026-07-15.md

**Generated:** 2026-07-15, Claude Code session, from Ben's voice note while traveling.
**Method:** 8 parallel research agents + 1 adversarial completeness critic (workflow run `wf_28143988-bb0`, 9/9 agents completed, 95 tool calls). Per-agent raw returns: session journal `subagents/workflows/wf_28143988-bb0/journal.jsonl`. Synthesis by the main session against the returned briefs; no figure invented outside a cited source.

## Sources by figure

| Figure | Source | Confidence |
|---|---|---|
| FY26 income $1.39M / expense $1.57M / net −$178K; PICC +$323K; Harvest +$92K ($187K in); Goods +$14K; JH grants +$120K; ACT-IN −$271K; ACT-CORE −$266K | `wiki/concepts/act-business-architecture.md` (Xero mirror, cash basis) | Verified (doc read directly; underlying Xero mirror not re-queried) |
| Founder pay $120K each / $268,800 combined from Jul 2026 | memory `act-whole-picture-founders-os.md`; `wiki/concepts/the-whole-picture-diagrams.md:87` | Verified (docs) |
| Cash ~$130K / runway ~1.2 months | memory, dated 2026-05-27 | Stale (49 days); flagged as such in doc |
| Four-lanes snapshot $0 across lanes, 2 blocked sources | `scripts/money-status.mjs` run 2026-07-14 → `wiki/cockpit/money-status-2026-07-14.md` | Verified (ran live this session); interpreted as pipe failure, not zero flow |
| Receivables $242,580; grants in flight $230,000; weighted pipeline $2,975,132 | `thoughts/shared/cockpit/monday-card/latest.md`, inputs as-of 2026-06-15 | Stale (30 days) |
| Secured Goods match $758,670 (Snow $402,930 + TFN $144,558 + Centrecorp $123,332 + VFFF $50,000 + AMP $21,900 + Red Dust $15,950) | memory `ghl-money-alignment.md`, verified vs Xero 2026-06-01 | Verified as of 2026-06-01 |
| INV-0314 $84,700 DRAFT | memory `act-whole-picture-founders-os.md`, MEMORY.md open CEO action | Verified (docs) |
| QBE up to $400K, apply Sept / outcome Nov 2026, ≥$400K binding match gate | memory `qbe-catalysing-impact-2026.md` | Verified (docs) |
| Minderoo $900K/3yr framing, ask formally unset, stalled on 3 structural questions | memory `project_goods_minderoo_pitch.md` (81 days old) + MEMORY.md | Inferred (staleness flagged) |
| R&D $180-220K realistic / ~$55,532 as-recorded basis / ~$24K downside / s355-480 wage condition / lodge by 30 Apr 2027 | memory `act-whole-picture-founders-os.md`; `wiki/concepts/the-whole-picture-diagrams.md:90`; memory `command-center-finance-truth.md` | Verified (docs); payment-by-30-Jun status UNVERIFIED |
| EL field service: 4 Y1 customers ~$50K each, ~$200K ARR; Y5 $1.05M | `wiki/projects/empathy-ledger/annual-field-service.md`; `wiki/finance/five-year-cashflow-model.md` | Verified (docs); all figures draft ranges, nothing signed |
| EL RLS not enforcing isolation; 247 tables open; multi-week fix; self-serve consent/delete missing | `empathy-ledger-v2/thoughts/shared/handoffs/2026-05-27-tenant-security-systemic-audit.md`; 2026-06-09 code verification notes | Verified as of audit date; current state unverified |
| JusticeHub: no earned-revenue model; $500K platform ask; Three Circles $2.9M/3yr; Staying tiers $1.8M/$3.43M/$6M; 7×$50K/yr untied anchor fees; CONTAINED stops $25-75K | JusticeHub repo + `wiki/projects/justicehub/{justicehub,three-circles,staying}.md` | Verified (docs); absence-of-model claim = Glob+grep sweep by agent, not exhaustive |
| CivicGraph: $0 MRR; Stripe tiers $79/$249/$499/$1,999; tender packs $49-499; lighthouse-buyer wedge; 100,036 entities, 672,474 contracts etc. | `grantscope/{MISSION.md,README.md,COMPENDIUM.md,docs/strategy/buyer-wedge.md}` | Verified (docs); billing live-in-prod unverified |
| Goods pipeline: NEED 12,504 beds; ordered $1.84M (WHSAC $1.7M, ALIVE $60K); funded $1.38M; delivered 520 beds/41 washers; per-bed $523.70 direct / $801 benchmark; ACT-GD spend $424,620 | memory `goods-foundation-pipeline.md`, GHL snapshot 2026-05-28 | Stale (48 days) |
| Harvest spend $124,077.68 + ~$82K planned; staffing plan ~$45-50K opex | memory `harvest-spend-tagging.md` (2026-06-26); `harvest-june-20-launch.md` | Verified as of dates shown |
| Newsletter: 4 lists; zero editions sent; audiences 80/271/34/114 | `wiki/concepts/ghl-audience-comms-automation.md` + memory `comms-crm-operating-system.md` (as of ~2026-06-03) | Stale (42 days); send-state today unverified |
| FY27 target $2.6M (Voice $200K / Flow $1.45M / Ground $150K / Grants $800K) | `wiki/finance/five-year-cashflow-model.md:72` | Verified (doc); known $800K-vs-$1M grants inconsistency vs framework table |
| People: Brenz Saunders (Tandanya, bare contact); Maree Meredith (Snow thread, Palm Island); Jeremy Donovan (no record); APY indirect only | `thoughts/shared/unified-orbit-worklist.csv`; `thoughts/shared/people/maree-meredith.md`; agent grep sweep | Verified for what exists; absences are file-search only, live GHL not queried |

## Known gaps

- No live Xero/bank read performed (cockpit pipes broken; MCP Xero read not attempted per stale-token trap in memory). Every cash/pipeline figure carries its as-of date in the doc.
- Voice-note claims (trip legs, book, council) are deliberately unverified and gated in the doc's section 5.
- Monday-card inputs, Goods pipeline, newsletter state, and EL audit findings are 30-48 days old; the doc flags each.

## Reproducibility

Re-run: `Workflow({scriptPath: ".../everyday-engine-synthesis-wf_28143988-bb0.js"})` (script persisted in session dir) or re-read the cited files directly. The critique text is embedded in the workflow journal.

# The Whole Picture — the six diagrams

> Canonical source for every diagram on "A Curious Tractor — The Whole Picture" (page source: `thoughts/shared/plans/2026-06-10-act-whole-picture-founders-os.md`).
> Spec: `thoughts/shared/plans/2026-06-10-whole-picture-visualization-recommendation.md` §2.
> Created 2026-06-11.

Three rules govern the set:

- **Doctrine vs data.** A diagram may carry decided constants (the $10K/mo wage, SG 12%, the gate conditions, handover dates) because those change only by joint decision at the session that already edits the page. It may never carry live figures (cash, run-rate, gate status). Live figures live on the surface (`/api/field/surface?name=whole`) and the Monday card.
- **One canonical source, two renders.** All six blocks live here. GitHub renders them; each is pasted into the matching Notion section as a code block with language set to Mermaid. Repo edited first, Notion re-pasted second, only at the monthly session.
- **Conservative Mermaid only.** Notion pins an older mermaid.js. Flowchart, sequence, gantt, class, ER are safe; timeline is unverified there. Every block is flowchart except the horizon arc, which ships a timeline for GitHub plus a guaranteed flowchart fallback for Notion. No classDef styling (Notion dark mode mangles it), `<br/>` for line breaks, quoted labels.

When a prose block of the page promotes to a wiki file, its diagram moves alongside it (this file keeps a stub link), so the canon spreads without ever holding two divergent copies.

---

## 1. The system map

Solid edges hold today; dashed edges are the handover doctrine. The 12th table row ("Org frame FY26") is an accounting frame, not an entity: it stays a table row and a surface banner, never a box.

```mermaid
flowchart LR
  subgraph SUNSET["Sunsetting"]
    ST["Sole trader (Nic)<br/>carries FY26 books - dies 30 Jun"]
  end
  subgraph CORE["ACT Pty Ltd - the centre (Ben + Nic, 50/50 via family trusts)"]
    PTY["ACT Pty Ltd<br/>payroll - sole R&D claimant - till from 20 Jun"]
    FIELD["THE FIELD / CRM / command-center<br/>both read - Ben maintains"]
    EL["Empathy Ledger<br/>Ben product - Nic storytellers"]
    JH["JusticeHub / CONTAINED<br/>Ben"]
    CG["CivicGraph<br/>Ben - ACT Pty IP - not for sale (ADR 2026-05-25)"]
    HV["The Harvest (ACT-HV)<br/>Nic room - Ben systems - Denis ops from 27 Jun"]
    GD["Goods on Country<br/>Nic field - Ben systems"]
  end
  subgraph FORM["Forming"]
    HVP["The Harvest Pty<br/>incorporation call 28 Aug"]
  end
  subgraph EDGE["Community-held edge (ACT supports, never owns)"]
    BFLY["The Butterfly Movement Ltd<br/>DGR+PBI - Indigenous-led board"]
    PICC["PICC - the handover precedent"]
    OO["Oonchiumpa"]
    CFE["Custodian First Economy"]
    MI["Mount Isa"]
    BEYOND["Future nodes + licensees<br/>not ACT's to control"]
  end
  ST -->|"cutover 30 Jun (mechanism TBC)"| PTY
  PTY --- EL
  PTY --- JH
  PTY --- CG
  PTY --- FIELD
  PTY --- HV
  PTY --- GD
  GD -.->|"stewardship handover 26 Jun"| BFLY
  HV -.->|"lease + till move when formed"| HVP
  EL -.->|"forks + licences ACT does not control (~20yr)"| BEYOND
  JH -.->|"self-funding nodes (~10yr, structure = open joint decision)"| BEYOND
  CG -.->|"deferred spinout - only when a raise justifies it"| BEYOND
```

Solid = holds today · dashed = handover direction · partnerships sit on the edge with no ownership edge by design.

Wired to: the page §2 table · `wiki/decisions/act-core-facts.md` · live per-node money states on the whole-picture surface · `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`.
Notion: page §2 · Miro session frame 1.
Refresh: static doctrine; redrawn only when an entity forms, dies, or hands over.

## 2. The money engine

A gate diamond, not a sankey: the gate IS a conditional and a sankey cannot draw one. Structure is decided (D11.2, Standard Ledger 5 May); the session ratifies, it does not redesign.

```mermaid
flowchart LR
  subgraph E1["Engine 1 - philanthropic partnership"]
    GR["Grants + tranches<br/>(Grant Tranches DB)"]
    PH["Philanthropy in flight<br/>Minderoo - QBE"]
  end
  subgraph E2["Engine 2 - own commercial revenue"]
    V["Voice"]
    F["Flow"]
    G["Ground"]
  end
  PTY["ACT Pty operating account<br/>(live cash: see Monday card, never this diagram)"]
  GR --> PTY
  PH -.->|"not bankable until signed"| PTY
  V --> PTY
  F --> PTY
  G --> PTY
  PTY --> BASE["BASE - the floor, never the staging valve<br/>$10K/mo gross EACH from first Jul 2026 run<br/>+ $1,200/mo super each at SG 12%, payday super<br/>combined line $268,800/yr"]
  PTY --> OPEX["Opex + staffing<br/>(10-week plan adds ~$45-50K incl on-costs)"]
  PTY --> RD["R&D-tagged spend + payroll time splits"]
  RD --> REF["R&D refund 43.5%<br/>FY26 expected $180-220K Sep-Dec, conditional on SL sign-off"]
  REF -->|"landing opens the gate"| GATE
  PTY --> GATE{"TOP-UP GATE - all three:<br/>25% tax reserve funded<br/>3-month float (~$395K)<br/>green 13-week forecast"}
  GATE -->|"met"| LOAN["Director-loan draws<br/>annual ceiling said out loud (D2)"]
  GATE -->|"not met"| HOLD["Hold - base only<br/>defer top-ups, never the base"]
  LOAN --> SETTLE["Settled each 30 Jun:<br/>bonus (R&D-eligible) / franked dividend (gated) / ABN invoice"]
  SETTLE --> DIV["Dividends FY27 or later - profits first<br/>franking + Div 7A + trust-deed gates all met"]
  DRAW["Account-880 drawings"] -.->|"HARD STOP 30 Jun (D2)"| BASE
```

Wired to: live gate status + cash on the surface and the Monday card · `/finance/money-alignment` and `/company` (both on `apps/command-center/src/lib/finance/ledger.ts`) · `thoughts/shared/handoffs/money-state-of-play/current.md` · `thoughts/shared/data/money-command-snapshots/`.
Notion: page §4 · NOT taken to Miro.
Refresh: static for structure and decided constants. The diagram says where the gate status lives, not what it is.

## 3. The roles split

Two founder columns feeding one joint-gate diamond. The owns / decides-alone / never stack per founder, with "brings to the session" as the labelled edge.

```mermaid
flowchart TB
  subgraph BEN["Ben - the system founder (builds the tractor)"]
    BO["OWNS<br/>product + architecture (4 platforms)<br/>money engine: ledger, reconciliation, R&D evidence, payroll<br/>digital surfaces - consent-gated sends<br/>positioning + paid pilots - event ops"]
    BD["DECIDES ALONE<br/>what gets built, automated, retired<br/>tagging mechanics - list hygiene<br/>pilot pricing drafts"]
    BX["NEVER HIS<br/>the room: community relationships, Jinibara protocols<br/>founder-rescue ops on Harvest/Farm/Goods day-to-day<br/>the landlord seat - art direction of place"]
  end
  subgraph NIC["Nic - the place-and-people founder (drives it onto Country)"]
    NO["OWNS<br/>field relationships + community pull<br/>place activation: Witta, the Harvest room, Black Cockatoo Valley<br/>art + experiential - the landlord/Jinibara seat<br/>founder-level relationship stewardship"]
    ND["DECIDES ALONE<br/>how a room runs<br/>community engagement pace (never automated, by design)<br/>aesthetic of place - which relationships get tended this week"]
    NX["NEVER HIS<br/>direct writes to money systems - comms sends<br/>R&D evidence authorship - production deploys"]
  end
  JOINT{"JOINT ONLY (documented 2026-04-10)<br/>portfolio cuts - capital allocation<br/>new major partnerships - handover decisions<br/>public claims that reshape ACT's centre of gravity<br/>+ COI rules: Nic-as-landlord terms and any Knight Photography<br/>invoice are joint + papered at arm's length"}
  BEN -->|"brings: the 5 joint items - any public dollar figure - lane drift - R&D narrative"| JOINT
  NIC -->|"brings: the 5 joint items - money/legal before signature - community signals"| JOINT
  JOINT -->|"lands in wiki/decisions/ within 24h (D12)"| LOG["Decision log"]
```

Wired to: `wiki/decisions/2026-04-founder-lanes-and-top-two-bets.md` · the Harvest hub decision gates (`thoughts/shared/drafts/harvest-operating-hub-notion-2026-06-10.md`) · the decision-log convention (page D12).
Notion: page §3 · Miro session frame 2 (the diagram Nic most needs to push back on).
Refresh: static; redrawn only when the founder-lanes decision is updated, which per the promotion rule means a new entry in `wiki/decisions/`.

## 4. The horizon arc

Two blocks: timeline canonical for GitHub, flowchart fallback guaranteed in Notion. The paste test (one paste of the timeline into Notion) settles which one the page carries.

Primary (repo; test once in Notion):

```mermaid
timeline
  title The horizon arc - 5yr + 30yr sentence LOCKED, 10/20 proposed and corrected quarterly
  2026 : Cutover 30 Jun : Goods to Butterfly 26 Jun : First founder pay run Jul
  2031 ~5yr LOCKED : Engines pay for themselves (FY27 $2.6M toward FY31 $5.5M+) : SMART = first Empathy Ledger licence, ~15 customers in the model : First JusticeHub node self-funding : FOUNDERS STOP - rescue ops, unpaid bespoke support, funder reports they do not believe
  2036 ~10yr proposed : Network runs on its own revenue : Empathy Ledger = default consent infrastructure in Australia, open source : Goods = community-owned facility network run by Butterfly : FOUNDERS STOP - running platform delivery
  2046 ~20yr proposed : The model is no longer ours - replicated by people who never asked permission : Empathy Ledger world scale via forks ACT does not control : ACT small again - a studio, not a holding company : FOUNDERS STOP - holding decision rights
  2056 ~30yr LOCKED : ACT? We don't need them anymore - simply true everywhere : What remains - the records, the stories with consent trails intact : Art test holds at 10%+ of spend without forcing : FOUNDERS STOP - everything except listen, stay curious, make, hand it over
```

Fallback (guaranteed in Notion):

```mermaid
flowchart LR
  Y26["2026<br/>cutover - handover - first pay run"] --> Y31
  Y31["~5yr 2031 - LOCKED<br/>engines pay for themselves<br/>SMART licence real - first JH node self-funding<br/>STOP: rescue ops, unpaid bespoke support"] --> Y36
  Y36["~10yr 2036 - proposed<br/>network runs on its own revenue<br/>EL = default consent infrastructure in Australia<br/>STOP: running platform delivery"] --> Y46
  Y46["~20yr 2046 - proposed<br/>the model is no longer ours - ACT a studio again<br/>STOP: holding decision rights"] --> Y56
  Y56["~30yr 2056 - LOCKED<br/>ACT? We don't need them anymore<br/>records + consent trails remain<br/>STOP: all but listen, stay curious, make, hand it over"]
```

Wired to: page §6 · the quarterly check (one horizon paragraph corrected per quarter) · weekly moves tagged to a named horizon line on the Monday card · the art-test drift light fed by the LCAA ratio `scripts/weekly-reconciliation.mjs` already emits.
Notion: page §6 (whichever block survives the paste test) · Miro session frame 3.
Refresh: re-cut at most quarterly; promotion target `wiki/decisions/2026-horizon-arc.md` (proposed).

## 5. The two-lane community model

Schematic for the DOCTRINE, hard-linked to the live surfaces for the DATA. Real people are never drawn in Mermaid: `thoughts/shared/orbit-viz.html` is the real thing, refreshed daily at 6:50am.

```mermaid
flowchart TB
  subgraph ORBIT["Lane 1 - the supporter ORBIT (laddered)"]
    R150["150 - known"]
    R50["50 - active"]
    R15["15 - close"]
    R5["Inner 5 - hand-picked core (circle:gsd-alliance)"]
    R150 -->|"ladder earned through REALISED gives, never time-served"| R50
    R50 --> R15
    R15 --> R5
  end
  subgraph CONST["Lane 2 - the community CONSTELLATION (sovereign)"]
    C1["Sovereign contributors + storytellers"]
    C2["Measured by what ACT OWES BACK - never by warmth"]
    C3["Never laddered - never dripped - worked by hand"]
    C4["Elder authority is a veto, not a preference"]
    C1 --- C2
    C1 --- C3
    C1 --- C4
  end
  WALL["THE WALL - never one funnel<br/>no contact crosses lanes by automation<br/>a lane move is a human decision, logged"]
  ORBIT --- WALL
  WALL --- CONST
```

The drawing is the rule; the people are live on the orbit tending board (daily 6:50am build). Community-line violations (a storyteller in a drip) are a defect class tracked there, not here.

Wired to: `thoughts/shared/orbit-viz.html` + `thoughts/shared/the-field-morning.html` via `/api/field/surface` · builders `scripts/build-orbit-viz.mjs` / `scripts/build-morning-read.mjs` · `scripts/lib/field-warmth.mjs` · `thoughts/shared/plans/2026-06-03-act-network-circle-action-stages.md`.
Notion: page §5, with two links directly under it: the live orbit at `/api/field/surface?name=orbit` and the morning read at `?name=morning`.
Refresh: doctrine static; data refreshes daily via the existing `field-surfaces` PM2 cron.

## 6. The weekly drumbeat loop

This diagram doubles as the automation spec: every dashed edge must correspond to a real cron in `ecosystem.config.cjs`, or the drumbeat is willpower.

```mermaid
flowchart TB
  DAILY["DAILY - the Field morning read<br/>7 or fewer actions + honest founders' tank check"]
  MON["MONDAY - ONE card, not three rituals<br/>four lanes - LCAA ratio - soul check<br/>folded with cross-codebase feed, pipelines report, Harvest line<br/>ordered by the system map - first card Mon 15 Jun 2026"]
  MOVES["ONE MOVE PER LANE<br/>To Us / To Down / To Grow / To Others<br/>each move tagged to a named horizon line<br/>each founder works their own lane"]
  SESSION["MONTHLY founders' session - first Tuesday from 7 Jul 2026, 90 min<br/>OWNS this page - the session edits the prose, nobody else<br/>six questions - lane drift - joint decisions - promote-or-keep"]
  QTR["QUARTERLY - one sitting<br/>R&D grade (already on cron) - correct ONE horizon paragraph<br/>handover test on exactly ONE project - pile-mix dial"]
  DAILY --> MON
  MON --> MOVES
  MOVES -->|"the week turns"| DAILY
  MOVES -->|"joint items QUEUE here, never decided midweek"| SESSION
  SESSION -->|"prose edits + promotions: 2 unchanged sessions = canon to wiki"| DAILY
  SESSION --> QTR
  QTR -->|"corrected horizon line re-tags the weekly moves"| MOVES
  F1["field-surfaces cron 6:50am<br/>build-field-surfaces.mjs"] -.-> DAILY
  F2["weekly-reconciliation.mjs Mon 8am<br/>+ cross-codebase feed + pipelines report"] -.-> MON
  F3["founders-session kit cron, Sat before first Tue<br/>pack to Telegram - works while Ben is remote"] -.-> SESSION
  F4["R&D grade cron + pile-mix"] -.-> QTR
```

Wired to: `scripts/weekly-reconciliation.mjs` (Mon 8am; lanes + LCAA + soul check already emitted) · `scripts/build-field-surfaces.mjs` (daily) · `thoughts/shared/cross-codebase-feed/latest.md` · `thoughts/shared/reports/project-pipelines-latest.md` · `wiki/cockpit/four-lanes-today.md`.
Notion: page §7.
Refresh: static; the dashed feeds are verified against `pm2 jlist` whenever the diagram is re-cut.

---

## Where each diagram lives

| Visual | Canonical source (git) | Notion page | Miro session | Live data companion |
|---|---|---|---|---|
| System map | this file | §2 code block | YES, frame 1 | the-whole-picture.html node board |
| Money engine | this file | §4 code block | no (decided, SL-gated) | Monday card · `/finance/money-alignment` · `/company` |
| Roles split | this file | §3 code block | YES, frame 2 | none needed (doctrine only) |
| Horizon arc | this file (timeline + fallback) | §6, fallback unless timeline passes the paste test | YES, frame 3 | quarterly rider flags the paragraph due |
| Two-lane community | this file | §5 code block + 2 links | no (orbit-viz is the workshop surface) | orbit-viz.html + the-field-morning.html, daily |
| Drumbeat loop | this file | §7 code block | no | `pm2 jlist` is the audit; Monday card is the heartbeat |

Rules: repo edited first, Notion re-pasted second, only at the monthly session. The Miro board is disposable scaffolding; after the session its corrections flow back into this file and the board is archived. Never let Miro become a third copy of the truth.

# ACT Ecosystem Map

*How 77 projects, 7 financial buckets, and 6 systems connect.*

---

## The Big Picture

Every project feeds into shared systems. The project code is the thread that connects money, stories, knowledge, and compliance into one legible ecosystem.

```mermaid
graph TB
    classDef hub fill:#1a1a2e,stroke:#e94560,color:#fff,stroke-width:3px
    classDef platform fill:#16213e,stroke:#0f3460,color:#fff,stroke-width:2px
    classDef program fill:#1a3c34,stroke:#2d6a4f,color:#fff,stroke-width:2px
    classDef community fill:#3d2c2c,stroke:#b5651d,color:#fff,stroke-width:1px
    classDef system fill:#2c2c3d,stroke:#7b68ee,color:#fff,stroke-width:2px
    classDef money fill:#3d3d2c,stroke:#daa520,color:#fff,stroke-width:2px

    %% Hub
    CORE["ACT-CORE<br/>Regenerative Studio<br/>act.place"]:::hub

    %% Platforms
    EL["ACT-EL<br/>Empathy Ledger<br/>226 storytellers · 5K media"]:::platform
    JH["ACT-JH<br/>JusticeHub<br/>52K records · legal mapping"]:::platform
    CS["ACT-CS<br/>CivicGraph<br/>100K civic entities"]:::platform
    IN["ACT-IN<br/>Infrastructure<br/>ALMA · AI · Bot · Wiki<br/>$194K spend"]:::platform

    %% Programs
    HV["ACT-HV<br/>The Harvest<br/>Townsville · Palm Island<br/>$97K spend"]:::program
    GD["ACT-GD<br/>Goods on Country<br/>Alice Springs · Tennant Creek<br/>$55K spend"]:::program
    FM["ACT-FM<br/>The Farm / BCV<br/>Maleny · Sunshine Coast<br/>$55K spend"]:::program
    MY["ACT-MY<br/>Mounty Yarns<br/>Mt Druitt · Western Sydney<br/>$26K spend"]:::program
    PI["ACT-PI<br/>PICC Centre<br/>Townsville · winding down<br/>$66K spend"]:::program

    %% Hub connections
    CORE --> EL
    CORE --> JH
    CORE --> CS
    CORE --> IN
    CORE --> HV
    CORE --> GD
    CORE --> FM
    CORE --> MY
    CORE --> PI
```

## How Projects Feed the Platforms

```mermaid
graph LR
    classDef el fill:#16213e,stroke:#0f3460,color:#fff,stroke-width:2px
    classDef jh fill:#1e3a5f,stroke:#4a90d9,color:#fff,stroke-width:2px
    classDef gd fill:#1a3c34,stroke:#2d6a4f,color:#fff,stroke-width:2px
    classDef community fill:#3d2c2c,stroke:#b5651d,color:#fff,stroke-width:1px
    classDef partner fill:#2c3d2c,stroke:#6b8e23,color:#fff,stroke-width:1px

    %% Empathy Ledger Hub
    EL["Empathy Ledger<br/>ACT-EL"]:::el

    %% Stories flow into EL
    UA["Uncle Allan<br/>Palm Island Art"]:::community --> EL
    MY["Mounty Yarns"]:::community --> EL
    SS["Storm Stories"]:::community --> EL
    CF["The Confessional"]:::community --> EL
    CN["Contained"]:::community --> EL
    FG["Feel Good"]:::community --> EL
    AS["Art for<br/>Social Change"]:::community --> EL
    TW["Travelling<br/>Women's Car"]:::community --> EL
    YC["YAC Story<br/>& Action"]:::community --> EL
    FN["First Nations<br/>Youth Advocacy"]:::community --> EL
    SM["SMART<br/>Recovery"]:::community --> EL
    TN["TOMNET"]:::community --> EL

    %% Partner EL deployments
    OS["Orange Sky EL"]:::partner --> EL
    QF["QFCC EL"]:::partner --> EL
    AI["AIME"]:::partner --> EL

    %% PICC sub-projects
    PS["PICC Photo<br/>Studio"]:::community --> EL
    ER["PICC Elders<br/>Room"]:::community --> EL
```

```mermaid
graph LR
    classDef jh fill:#1e3a5f,stroke:#4a90d9,color:#fff,stroke-width:2px
    classDef research fill:#2c2c3d,stroke:#7b68ee,color:#fff,stroke-width:1px
    classDef partner fill:#2c3d2c,stroke:#6b8e23,color:#fff,stroke-width:1px

    %% JusticeHub Hub
    JH["JusticeHub<br/>ACT-JH"]:::jh

    %% Research feeds JH
    RT["Redtape"]:::research --> JH
    DD["Double<br/>Disadvantage"]:::research --> JH
    RP["RPPP<br/>Stream Two"]:::research --> JH
    JC["JH Centre of<br/>Excellence"]:::research --> JH
    MM["MMEIC<br/>Justice"]:::research --> JH
    EFI["Economic Freedom<br/>Initiative"]:::research --> JH
    BM["Bimberi"]:::research --> JH
    DG["Diagrama"]:::partner --> JH
    FN2["First Nations<br/>Youth Advocacy"]:::research --> JH
```

```mermaid
graph LR
    classDef gd fill:#1a3c34,stroke:#2d6a4f,color:#fff,stroke-width:2px
    classDef enterprise fill:#3d3d2c,stroke:#daa520,color:#fff,stroke-width:1px
    classDef community fill:#3d2c2c,stroke:#b5651d,color:#fff,stroke-width:1px

    %% Goods on Country Hub
    GD["Goods on Country<br/>ACT-GD"]:::gd

    %% Supply chain and community
    MN["Maningrida"]:::community --> GD
    OO["Oonchiumpa"]:::community --> GD
    BB["Barkly<br/>Backbone"]:::community --> GD
    WJ["Wilya Janta"]:::community --> GD
    MR["MingaMinga<br/>Rangers"]:::community --> GD
    CE["Custodian<br/>Economy"]:::enterprise --> GD
    FO["Fishers<br/>Oysters"]:::enterprise --> GD
    OE["Olive Express"]:::enterprise --> GD
    MC["Cars &<br/>Microcontrollers"]:::enterprise --> GD
```

## The Cross-Cutting Systems

Every project code flows through six shared systems. This is how a single project code like ACT-UA (Uncle Allan Palm Island Art) touches everything:

```mermaid
graph TB
    classDef project fill:#3d2c2c,stroke:#b5651d,color:#fff,stroke-width:2px
    classDef system fill:#2c2c3d,stroke:#7b68ee,color:#fff,stroke-width:1px
    classDef money fill:#3d3d2c,stroke:#daa520,color:#fff,stroke-width:1px

    CODE["Project Code<br/>e.g. ACT-UA"]:::project

    BANK["Bank Transactions<br/>Tagged spend in Xero<br/>via location + vendor rules"]:::money
    RECEIPT["Receipt System<br/>Auto-matched via Dext,<br/>Gmail, Xero bills"]:::money
    RD["R&D Tax Offset<br/>43.5% refund on<br/>eligible project spend"]:::money

    STORY["Empathy Ledger<br/>Storytellers, photos,<br/>videos, consent"]:::system
    WIKI["Tractorpedia<br/>183 wiki articles,<br/>3 viewer surfaces"]:::system
    CIVIC["CivicGraph<br/>Entity resolution,<br/>funding landscape"]:::system
    GRANT["Grant Applications<br/>Evidence from all<br/>other systems"]:::system

    CODE --> BANK
    CODE --> RECEIPT
    CODE --> STORY
    CODE --> WIKI
    CODE --> CIVIC

    BANK --> RD
    RECEIPT --> RD
    STORY --> GRANT
    WIKI --> GRANT
    CIVIC --> GRANT
    RD --> |"$109K back"| GRANT
```

## The Money Flow

How dollars move through the ecosystem and come back:

```mermaid
graph LR
    classDef income fill:#1a3c34,stroke:#2d6a4f,color:#fff,stroke-width:2px
    classDef process fill:#2c2c3d,stroke:#7b68ee,color:#fff,stroke-width:1px
    classDef output fill:#3d3d2c,stroke:#daa520,color:#fff,stroke-width:2px

    %% Revenue in
    RD["R&D Offset<br/>~$109K/yr"]:::income
    GR["Grants &<br/>Philanthropy"]:::income
    HV["Harvest<br/>Produce & CSA"]:::income
    GD["Goods on Country<br/>Product Sales"]:::income
    LIC["Platform<br/>Licensing (future)"]:::income

    %% Process
    OPS["Operations<br/>$494K FY26 spend<br/>tagged to 7 buckets"]:::process

    %% The cycle
    RD --> OPS
    GR --> OPS
    HV --> OPS
    GD --> OPS
    LIC --> OPS

    OPS --> |"Build platforms"| TECH["EL + JH + CivicGraph<br/>+ ALMA"]:::process
    OPS --> |"Community work"| COMM["Harvest + Goods +<br/>Mounty + PICC"]:::process
    OPS --> |"Create art"| ART["Stories + Photos +<br/>Video + Writing"]:::process

    TECH --> |"R&D evidence"| RD
    TECH --> |"Grant deliverables"| GR
    COMM --> |"Produce & products"| HV
    COMM --> |"Supply chain"| GD
    COMM --> |"Stories"| ART
    ART --> |"EL content"| TECH
    ART --> |"Grant evidence"| GR
```

## Geographic Map

Where the project codes live on Country:

```mermaid
graph TB
    classDef qld fill:#1a3c34,stroke:#2d6a4f,color:#fff,stroke-width:2px
    classDef nt fill:#3d2c2c,stroke:#b5651d,color:#fff,stroke-width:2px
    classDef nsw fill:#16213e,stroke:#0f3460,color:#fff,stroke-width:2px
    classDef vic fill:#2c2c3d,stroke:#7b68ee,color:#fff,stroke-width:2px
    classDef nat fill:#1a1a2e,stroke:#e94560,color:#fff,stroke-width:2px

    subgraph "Queensland"
        TSV["Townsville / Gurambilbarra<br/>ACT-HV · ACT-PI · ACT-ER · ACT-PS"]:::qld
        PI["Palm Island / Bwgcolman<br/>ACT-UA · ACT-HV"]:::qld
        MAL["Maleny / Sunshine Coast<br/>ACT-FM · ACT-BV · ACT-SH"]:::qld
        BNE["Brisbane / Meanjin<br/>ACT-CORE · ACT-FA"]:::qld
    end

    subgraph "Northern Territory"
        ASP["Mparntwe / Alice Springs<br/>ACT-GD · ACT-OO · ACT-BB"]:::nt
        TC["Tennant Creek<br/>ACT-GD · ACT-BB"]:::nt
        MNG["Maningrida<br/>ACT-MN · ACT-MR"]:::nt
        TE["Top End<br/>ACT-GD"]:::nt
    end

    subgraph "New South Wales"
        MTD["Mt Druitt / Darug Country<br/>ACT-MY · ACT-CN · ACT-FP"]:::nsw
        SYD["Sydney / Gadigal<br/>ACT-IN · ACT-JH · ACT-JC"]:::nsw
    end

    subgraph "Victoria + South Australia"
        MEL["Melbourne / Naarm<br/>ACT-IN · ACT-MU"]:::vic
        REG["Regional VIC/SA<br/>ACT-CC · (candidates open)"]:::vic
    end

    subgraph "National + International"
        DIG["Digital / Everywhere<br/>ACT-EL · ACT-JH · ACT-CS · ACT-IN"]:::nat
        INT["International<br/>ACT-GL · ACT-DG · ACT-GCC · ACT-BR"]:::nat
    end
```

## The Karpathy Knowledge Loop

How raw material becomes durable knowledge and compounds over time:

```mermaid
graph TB
    classDef raw fill:#3d2c2c,stroke:#b5651d,color:#fff,stroke-width:1px
    classDef compile fill:#16213e,stroke:#0f3460,color:#fff,stroke-width:2px
    classDef synth fill:#1a3c34,stroke:#2d6a4f,color:#fff,stroke-width:2px
    classDef publish fill:#2c2c3d,stroke:#7b68ee,color:#fff,stroke-width:1px
    classDef question fill:#3d3d2c,stroke:#daa520,color:#fff,stroke-width:2px

    subgraph "1. CAPTURE"
        RAW["wiki/raw/<br/>Transcripts, articles,<br/>data exports, scraped content"]:::raw
        SRC["wiki/sources/<br/>One summary per raw file<br/>— the bridge layer"]:::raw
    end

    subgraph "2. COMPILE"
        PROJ["wiki/projects/<br/>77 project articles"]:::compile
        CONC["wiki/concepts/<br/>Frameworks, methods"]:::compile
        COMM["wiki/communities/<br/>Place relationships"]:::compile
        PEOP["wiki/people/<br/>Key people"]:::compile
        ART["wiki/art/<br/>Artworks, exhibitions"]:::compile
        NARR["wiki/narrative/<br/>Claims store"]:::compile
    end

    subgraph "3. SYNTHESIZE"
        SYNTH["wiki/synthesis/<br/>Compounding answers<br/>— curiosity leaves artifacts"]:::synth
        Q["Your question<br/>/wiki query or<br/>/wiki synthesize"]:::question
    end

    subgraph "4. PUBLISH"
        T1["Tractorpedia<br/>HTML viewer"]:::publish
        T2["Command Center<br/>/wiki"]:::publish
        T3["Regen Studio<br/>/wiki"]:::publish
        T4["act.place<br/>project pages"]:::publish
    end

    RAW --> SRC
    SRC --> PROJ
    SRC --> CONC
    SRC --> COMM
    SRC --> PEOP
    SRC --> ART

    PROJ --> SYNTH
    CONC --> SYNTH
    COMM --> SYNTH
    Q --> SYNTH

    SYNTH --> |"answers become<br/>new articles"| CONC
    SYNTH --> |"gaps found<br/>→ new capture"| RAW

    PROJ --> T1
    PROJ --> T2
    PROJ --> T3
    PROJ --> T4
    CONC --> T1
    CONC --> T2
    CONC --> T3

    PROJ --> NARR
    NARR --> |"editorial<br/>content"| T4
```

## The Editorial Flywheel

How community work becomes stories becomes content becomes connections becomes more community work:

```mermaid
graph LR
    classDef work fill:#1a3c34,stroke:#2d6a4f,color:#fff,stroke-width:2px
    classDef story fill:#16213e,stroke:#0f3460,color:#fff,stroke-width:2px
    classDef content fill:#3d3d2c,stroke:#daa520,color:#fff,stroke-width:2px
    classDef connect fill:#2c2c3d,stroke:#7b68ee,color:#fff,stroke-width:2px

    WORK["Community Work<br/>Harvest meals, Goods deliveries,<br/>Mounty builds, PICC sessions"]:::work
    
    STORY["Stories<br/>EL portraits, videos,<br/>transcripts, consent-gated"]:::story
    
    WIKI["Wiki Knowledge<br/>Articles, synthesis,<br/>narrative claims"]:::content
    
    CONTENT["Editorial Output<br/>LinkedIn, grants, pitches,<br/>op-eds, social media"]:::content
    
    CONNECT["New Connections<br/>Funders, partners,<br/>communities, volunteers"]:::connect

    WORK --> |"people share<br/>their experience"| STORY
    STORY --> |"compiled into<br/>durable knowledge"| WIKI
    WIKI --> |"narrative layer<br/>assembles drafts"| CONTENT
    CONTENT --> |"people discover ACT,<br/>want to participate"| CONNECT
    CONNECT --> |"new relationships<br/>new places"| WORK
```

---

*This map is the visual companion to the [[act-operational-thesis|ACT Operational Thesis]]. Project codes are the universal key across all systems. The Karpathy loop is how the wiki stays alive.*

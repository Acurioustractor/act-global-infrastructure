# ACT Infrastructure — Impact Pathways

Infrastructure doesn't have its own story vignettes — it enables the stories of other projects. This page maps how infrastructure connects to community impact.

## How Infrastructure Enables Impact

### Empathy Ledger → Storyteller Data
Infrastructure provides the shared Supabase connection to Empathy Ledger's storyteller database. The Command Center's storyteller pages, project-storyteller API, and wiki vignettes all draw from this connection. Without it, stories stay siloed in individual projects.

### JusticeHub → Evidence Pipeline
The knowledge pipeline (`scripts/knowledge-pipeline.mjs`) processes evidence that feeds into JusticeHub's research capabilities. Communication intelligence captures cross-project signals that strengthen justice advocacy.

### Goods → Asset Tracking Dashboard
The Command Center surfaces Goods' 389 QR-tracked assets across 8 communities. Health monitoring alerts when asset check-ins are overdue.

### The Harvest → Content Syndication
Infrastructure manages the connection between Empathy Ledger's Content Hub and The Harvest's blog. Content flows from storytellers through the consent pipeline to public-facing pages.

### Finance → All Projects
Xero integration tracks revenue and expenses across all project codes (EL-CORE, JH-CORE, GOODS-BEDS, HARVEST-CSA, etc.). This ensures enterprise revenue flows correctly to community value — not extraction.

### Monitoring → System Health
Data freshness monitoring checks 9 data sources every 6 hours. When communications go stale or GHL sync breaks, the system alerts before community impact is affected.

## The PTO Metaphor

Infrastructure IS the power take-off. Each project is equipment doing transformative work. Infrastructure provides power that can be connected, used, and unhitched. The goal is that projects can eventually run without this central coordination layer — beautiful obsolescence applied to operations.

# Harvest connected platform

## Decision

The Harvest Website is the public product and Harvest-specific working memory.
ACT infrastructure is the private control plane and cross-ecosystem source of truth.
Both applications use the same ACT Supabase project.

```text
Harvest docs and Notion -> GHL publishing -> social networks
                                      |
                                      v
ACT social_posts ledger -> Command Center analysis
               |
               v
Harvest public-safe views -> Harvest Website
```

## Ownership

| Concern | Owner |
| --- | --- |
| Public pages, events, participation and membership | The Harvest Website |
| Harvest voice, philosophy and local strategy | The Harvest Website |
| Editorial review | Harvest Notion workspace and Harvest repo |
| Social publishing | GHL, operated from The Harvest Website |
| Actual post ledger and performance history | ACT Supabase and ACT infrastructure |
| Public published-post feed | `v_harvest_public_social_posts` |
| Cross-project facts, entities, finance and integrations | ACT infrastructure |
| Private operational analysis | ACT Command Center |

## Data boundary

The public website can read only reviewed public views. It cannot read drafts,
failed social attempts, engagement metrics, contacts, private stories or finance.
Command Center uses authenticated organisation-scoped access. Background ingestion
uses the Supabase service role.

## Social loop

```text
Notion thinks
GHL publishes
Supabase records
Command Center analyses
Harvest Website shows the public result
```

Run a dry sync from ACT infrastructure:

```bash
npm run sync:social-ledger
```

Apply the sync:

```bash
npm run sync:social-ledger:apply
```

## Knowledge rule

Harvest-specific working knowledge stays in The Harvest repo. A Harvest decision
that changes an ACT entity, project code, money rule, shared brand rule or another
project is promoted to the relevant ACT `wiki/decisions/` source. The existing ACT
context sync then carries settled shared facts back into the Harvest repo.

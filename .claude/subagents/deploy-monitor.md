# Deploy Monitor Subagent

## Purpose
Continuous deployment health monitoring across all 8 ACT ecosystem codebases.

## When to Invoke
- After any deployment
- Daily at 5 PM UTC (automated)
- User asks "are sites healthy?"
- After seeing deployment errors

## Capabilities
- HTTP health checks (all 8 sites)
- Database connectivity tests
- API endpoint validation
- Deployment age tracking
- Performance monitoring (response times)
- Error detection and alerting

## Tools Available
- Bash (curl for HTTP checks)
- Postgres MCP (database health)
- GitHub MCP (deployment metadata)
- WebFetch (check live sites)

## Monitoring Targets

### Production Sites (8 total)
1. ACT Global Infrastructure (act-global-infrastructure) - CI/CD only
2. ACT Farm (Hub) - https://act.place
3. Empathy Ledger - https://empathy-ledger.vercel.app
4. JusticeHub - https://justicehub.vercel.app
5. The Harvest - https://theharvest.vercel.app
6. Goods - https://goods.vercel.app
7. BCV/ACT Farm - https://actfarm.org.au
8. ACT Placemat - https://act-placemat.vercel.app

## Health Check Matrix

For each site check:
- ✅ **HTTP Status**: 200 OK (or appropriate redirect)
- ✅ **Response Time**: <2s (warn if >5s)
- ✅ **Deployment Age**: <24h (warn if >72h)
- ✅ **Database**: Connection successful
- ✅ **API Health**: /api/health returns 200

## Output Format

```
🏥 Deployment Health Check - All ACT Sites

┌─────────────────────┬────────────┬──────┬──────────┬──────────┐
│ Site                │ Deployment │ HTTP │ Response │ Database │
├─────────────────────┼────────────┼──────┼──────────┼──────────┤
│ Empathy Ledger      │ ⚠️  18h    │ ✅   │ 450ms    │ ✅       │
│ JusticeHub          │ ✅ 2h      │ ✅   │ 320ms    │ ✅       │
│ The Harvest         │ ✅ 4h      │ ✅   │ 280ms    │ ✅       │
│ ACT Farm (Hub)      │ ❌ 72h     │ ⚠️   │ 6200ms   │ ✅       │
│ Goods               │ ✅ 6h      │ ✅   │ 410ms    │ ✅       │
│ BCV/ACT Farm        │ ✅ 1h      │ ✅   │ 520ms    │ ✅       │
│ ACT Placemat        │ ✅ 3h      │ ✅   │ 890ms    │ ✅       │
└─────────────────────┴────────────┴──────┴──────────┴──────────┘

⚠️  Issues Detected:
  • ACT Farm (Hub): Stale deployment (72h) + slow response (6.2s)
  • Empathy Ledger: Deployment aging (18h)

🎯 Recommendations:
  1. ACT Farm (Hub): Investigate slow response + trigger deployment
  2. Empathy Ledger: Monitor, may need deployment soon

🏆 Overall Health: 6/7 sites healthy (86%)

Next check: Today at 5 PM UTC
```

## Alert Thresholds

**Critical** (immediate notification):
- HTTP status 5xx or unreachable
- Response time >10s
- Database connection failed
- Deployment age >7 days

**Warning** (include in daily report):
- HTTP status 4xx
- Response time >5s
- Deployment age >3 days
- Response time degradation >50%

**Info**:
- Deployment age >24h
- Response time >2s

## Integration with Scripts

Uses existing:
- `scripts/deployment-intelligence.mjs` (DORA metrics)
- Stores results in Supabase `deployment_metrics` table

## MCP Usage

```typescript
// Check via HTTP
const response = await fetch('https://empathy-ledger.vercel.app/api/health');

// Check database via Postgres MCP
const dbHealth = await postgres.query('SELECT 1');

// Get deployment age via GitHub MCP
const deployments = await github.getDeployments({
  repo: 'empathy-ledger-v2',
  environment: 'production',
  limit: 1
});
```

## Automation

Runs automatically via GitHub Action:
```yaml
schedule:
  - cron: '0 17 * * *' # 5 PM UTC daily
```

## Autonomy Level
**Fully autonomous**: Monitors and reports, alerts on critical issues

# GoHighLevel Integration - Quick Implementation Guide

**For**: ACT Global Infrastructure
**Date**: 2026-01-01

This is a practical, step-by-step guide to enhance your existing GoHighLevel integration with best practices and new capabilities.

---

## Current State

**What You Have**:
- Working GHL API service (`/Users/benknight/act-global-infrastructure/scripts/lib/ghl-api-service.mjs`)
- Scheduled sync script (`/Users/benknight/act-global-infrastructure/scripts/sync-ghl-to-notion.mjs`)
- GitHub Actions automation (runs every 6 hours)
- Basic rate limiting and error tracking

**What Works Well**:
- Deduplication via GHL ID matching
- Scheduled sync keeps Notion updated
- Single source of truth maintained in GHL

**What Could Be Better**:
- No retry logic for transient failures
- Limited error recovery
- No activity logging for team visibility
- No real-time updates for critical events

---

## Phase 1: Quick Wins (1-2 hours)

### 1.1 Add Retry Logic with Exponential Backoff

**File**: `/Users/benknight/act-global-infrastructure/scripts/lib/ghl-api-service.mjs`

Add this helper function at the top of the file:

```javascript
/**
 * Retry failed requests with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = error.status === 429 || error.status >= 500;
      const isLastAttempt = attempt === maxRetries - 1;

      if (isRetryable && !isLastAttempt) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        const jitter = delay * 0.2 * Math.random();
        const totalDelay = Math.round(delay + jitter);

        console.log(`⏳ Retrying in ${totalDelay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      } else {
        throw error;
      }
    }
  }
}
```

Then wrap your `request()` method:

```javascript
async request(endpoint, options = {}) {
  return retryWithBackoff(async () => {
    // ... existing rate limiting code ...

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.text();
      const apiError = new Error(`GHL API Error (${response.status}): ${error}`);
      apiError.status = response.status;
      throw apiError;
    }

    return await response.json();
  }, 3);
}
```

**Benefit**: Automatically recovers from transient API failures

### 1.2 Add Rate Limit Monitoring

Add this method to your `GHLService` class:

```javascript
/**
 * Check rate limit headers and warn if approaching limits
 */
checkRateLimits(headers) {
  const dailyRemaining = parseInt(headers.get('x-ratelimit-daily-remaining') || '200000');
  const burstRemaining = parseInt(headers.get('x-ratelimit-remaining') || '100');

  if (dailyRemaining < 1000) {
    console.warn(`⚠️  WARNING: Only ${dailyRemaining} API calls remaining today`);
  }

  if (burstRemaining < 10) {
    console.warn(`⚠️  WARNING: Only ${burstRemaining} burst requests remaining`);
  }
}
```

Call it in your `request()` method after fetching:

```javascript
const response = await fetch(url, { ...options, headers });
this.checkRateLimits(response.headers);
```

**Benefit**: Early warning when approaching rate limits

### 1.3 Add Structured Logging

Create a simple logger at the top of your sync script:

```javascript
/**
 * Structured logger for better debugging
 */
const logger = {
  info: (msg, meta = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message: msg,
      ...meta
    }));
  },

  error: (msg, error, meta = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message: msg,
      error: error.message,
      stack: error.stack,
      ...meta
    }));
  },

  warn: (msg, meta = {}) => {
    console.warn(JSON.stringify({
      level: 'warn',
      timestamp: new Date().toISOString(),
      message: msg,
      ...meta
    }));
  }
};
```

Use it throughout your sync script:

```javascript
// Replace console.log with logger.info
logger.info('Syncing partners', { count: ghlPartners.length });

// Replace console.error with logger.error
logger.error('Partner sync failed', error, { partnerId: partner.id });
```

**Benefit**: Better debugging in GitHub Actions logs

---

## Phase 2: Activity Logging (2-3 hours)

### 2.1 Create Activity Log Database in Notion

**Manual Steps**:
1. Go to your Notion workspace
2. Create a new database called "GHL Activity Log"
3. Add these properties:

| Property Name | Type | Options |
|--------------|------|---------|
| Entity Name | Title | - |
| Event Type | Select | Contact Created, Contact Updated, Deal Won, Pipeline Changed, Sync Complete |
| GHL Entity | Select | contact, opportunity, task, appointment, system |
| GHL Record ID | Text | - |
| Action | Text | - |
| Timestamp | Date | Include time |
| GHL Link | URL | - |
| Details | Text | - |

4. Copy the database ID from the URL
5. Add to `/Users/benknight/act-global-infrastructure/config/notion-database-ids.json`:

```json
{
  "githubIssues": "...",
  "partners": "...",
  "grantOpportunities": "...",
  "activityLog": "YOUR_NEW_DATABASE_ID_HERE"
}
```

### 2.2 Create Activity Logger Service

Create a new file: `/Users/benknight/act-global-infrastructure/scripts/lib/activity-logger.mjs`

```javascript
import { Client } from '@notionhq/client';

export class ActivityLogger {
  constructor(notionToken, activityDbId) {
    this.notion = new Client({ auth: notionToken });
    this.activityDbId = activityDbId;
  }

  /**
   * Log an activity to Notion
   */
  async logEvent(event) {
    try {
      await this.notion.pages.create({
        parent: { database_id: this.activityDbId },
        properties: {
          'Entity Name': {
            title: [{ text: { content: event.name || 'Unknown' } }]
          },
          'Event Type': {
            select: { name: event.type }
          },
          'GHL Entity': {
            select: { name: event.entityType }
          },
          'GHL Record ID': {
            rich_text: [{ text: { content: event.ghlId } }]
          },
          'Action': {
            rich_text: [{ text: { content: event.action } }]
          },
          'Timestamp': {
            date: { start: new Date().toISOString() }
          },
          'GHL Link': {
            url: this.buildGHLLink(event.entityType, event.ghlId)
          },
          'Details': {
            rich_text: [{ text: { content: JSON.stringify(event.details || {}, null, 2).slice(0, 2000) } }]
          }
        }
      });
    } catch (error) {
      // Don't throw - logging failures shouldn't break sync
      console.error(`Failed to log activity: ${error.message}`);
    }
  }

  /**
   * Build GHL deep link
   */
  buildGHLLink(entityType, id) {
    const baseUrl = 'https://app.gohighlevel.com';
    const paths = {
      'contact': `contacts/${id}`,
      'opportunity': `opportunities/${id}`,
      'task': `tasks/${id}`,
      'appointment': `calendar/${id}`,
      'system': ''
    };
    return `${baseUrl}/${paths[entityType] || ''}`;
  }

  /**
   * Log sync completion summary
   */
  async logSyncResults(stats, duration) {
    const totalCreated = stats.partners.created + stats.grants.created;
    const totalUpdated = stats.partners.updated + stats.grants.updated;
    const totalErrors = stats.partners.errors + stats.grants.errors;

    const summary = `Created ${totalCreated}, Updated ${totalUpdated}` +
                   (totalErrors > 0 ? `, Errors ${totalErrors}` : '') +
                   ` (${duration}s)`;

    await this.logEvent({
      type: 'Sync Complete',
      name: 'GHL → Notion Sync',
      entityType: 'system',
      ghlId: 'sync',
      action: summary,
      details: {
        partners: stats.partners,
        grants: stats.grants,
        duration: `${duration}s`,
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * Factory function
 */
export function createActivityLogger() {
  const notionToken = process.env.NOTION_TOKEN;
  const configPath = join(__dirname, '../config/notion-database-ids.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));

  if (!config.activityLog) {
    console.warn('⚠️  Activity log database not configured, skipping activity logging');
    return null;
  }

  return new ActivityLogger(notionToken, config.activityLog);
}
```

### 2.3 Integrate Activity Logging into Sync Script

In `/Users/benknight/act-global-infrastructure/scripts/sync-ghl-to-notion.mjs`:

Add import at the top:

```javascript
import { createActivityLogger } from './lib/activity-logger.mjs';
```

Initialize after other services:

```javascript
const activityLogger = createActivityLogger();
```

Log significant events:

```javascript
// After creating a new partner
if (!existingPageId) {
  await createNotionPartner(ghlPartner);
  stats.partners.created++;

  // Log activity
  if (activityLogger) {
    await activityLogger.logEvent({
      type: 'Contact Created',
      name: contactData.name,
      entityType: 'contact',
      ghlId: ghlPartner.id,
      action: `New partner synced from GHL: ${contactData.email || contactData.phone}`,
      details: { tags: contactData.tags, organization: ghlPartner.company }
    });
  }

  process.stdout.write('+');
}
```

Log sync completion at the end of `main()`:

```javascript
// After displaying summary
const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);

if (activityLogger) {
  await activityLogger.logSyncResults(stats, duration);
}
```

**Benefit**: Team visibility into GHL activities without duplicating all data

---

## Phase 3: Webhook Support (4-6 hours)

### 3.1 Choose Deployment Method

**Option A: Vercel Serverless (Recommended)**
- Free tier sufficient for webhooks
- Zero infrastructure management
- Automatic HTTPS
- Easy deployment

**Option B: Self-hosted Express Server**
- More control
- Requires server/hosting
- Need to manage SSL certificates

**Recommended**: Use Vercel for simplicity

### 3.2 Set Up Vercel Project

```bash
cd /Users/benknight/act-global-infrastructure

# Install Vercel CLI
npm install -g vercel

# Initialize Vercel project
vercel init

# Create API directory
mkdir -p api
```

### 3.3 Create Webhook Handler

Create `/Users/benknight/act-global-infrastructure/scripts/lib/webhook-handler.mjs`:

```javascript
import crypto from 'crypto';
import { createGHLService } from './ghl-api-service.mjs';
import { createActivityLogger } from './activity-logger.mjs';

export class GHLWebhookHandler {
  constructor(webhookSecret) {
    this.webhookSecret = webhookSecret;
    this.ghl = createGHLService();
    this.activityLogger = createActivityLogger();
  }

  /**
   * Verify webhook signature (if GHL provides one)
   */
  verifySignature(payload, signature) {
    if (!this.webhookSecret || !signature) {
      return true; // Skip verification if not configured
    }

    const hash = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(hash)
    );
  }

  /**
   * Main webhook handler
   */
  async handleWebhook(payload, signature = null) {
    if (!this.verifySignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const { type, data } = payload;

    console.log(`Received webhook: ${type}`);

    switch (type) {
      case 'contact.created':
      case 'ContactCreate':
        await this.handleContactCreated(data);
        break;

      case 'contact.updated':
      case 'ContactUpdate':
        await this.handleContactUpdated(data);
        break;

      case 'opportunity.created':
      case 'OpportunityCreate':
        await this.handleOpportunityCreated(data);
        break;

      case 'opportunity.stage_changed':
      case 'OpportunityStageUpdate':
        await this.handleOpportunityStageChanged(data);
        break;

      case 'opportunity.won':
      case 'OpportunityWon':
        await this.handleOpportunityWon(data);
        break;

      default:
        console.log(`Unhandled webhook type: ${type}`);
    }
  }

  async handleContactCreated(data) {
    if (!this.activityLogger) return;

    await this.activityLogger.logEvent({
      type: 'Contact Created',
      name: data.name || `${data.first_name} ${data.last_name}`,
      entityType: 'contact',
      ghlId: data.id,
      action: 'New contact added to GHL',
      details: {
        email: data.email,
        phone: data.phone,
        tags: data.tags,
        source: data.contact_source
      }
    });
  }

  async handleContactUpdated(data) {
    if (!this.activityLogger) return;

    await this.activityLogger.logEvent({
      type: 'Contact Updated',
      name: data.name || `${data.first_name} ${data.last_name}`,
      entityType: 'contact',
      ghlId: data.id,
      action: 'Contact information updated in GHL'
    });
  }

  async handleOpportunityCreated(data) {
    if (!this.activityLogger) return;

    await this.activityLogger.logEvent({
      type: 'Deal Created',
      name: data.opportunity_name || data.name,
      entityType: 'opportunity',
      ghlId: data.opportunity_id || data.id,
      action: `New opportunity created: $${data.monetary_value || 0}`,
      details: {
        pipeline: data.pipeline_name,
        stage: data.pipeline_stage_name,
        value: data.monetary_value
      }
    });
  }

  async handleOpportunityStageChanged(data) {
    if (!this.activityLogger) return;

    await this.activityLogger.logEvent({
      type: 'Pipeline Changed',
      name: data.opportunity_name || data.name,
      entityType: 'opportunity',
      ghlId: data.opportunity_id || data.id,
      action: `Moved to ${data.pipeline_stage_name || data.stage_name}`,
      details: {
        pipeline: data.pipeline_name,
        previousStage: data.previous_stage_name,
        currentStage: data.pipeline_stage_name
      }
    });
  }

  async handleOpportunityWon(data) {
    if (!this.activityLogger) return;

    await this.activityLogger.logEvent({
      type: 'Deal Won',
      name: data.opportunity_name || data.name,
      entityType: 'opportunity',
      ghlId: data.opportunity_id || data.id,
      action: `Won opportunity worth $${data.monetary_value || 0}`,
      details: {
        value: data.monetary_value,
        pipeline: data.pipeline_name
      }
    });
  }
}

export function createWebhookHandler() {
  return new GHLWebhookHandler(process.env.WEBHOOK_SECRET);
}
```

### 3.4 Create Vercel Serverless Function

Create `/Users/benknight/act-global-infrastructure/api/webhook.js`:

```javascript
import { createWebhookHandler } from '../scripts/lib/webhook-handler.mjs';

const handler = createWebhookHandler();

export default async function(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-ghl-signature'] || req.headers['x-webhook-signature'];
    const payload = req.body;

    await handler.handleWebhook(payload, signature);

    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

### 3.5 Deploy to Vercel

```bash
cd /Users/benknight/act-global-infrastructure

# Add environment variables
vercel env add NOTION_TOKEN
vercel env add GHL_API_KEY
vercel env add GHL_LOCATION_ID
vercel env add WEBHOOK_SECRET

# Deploy
vercel --prod
```

You'll get a URL like: `https://act-global-infrastructure.vercel.app/api/webhook`

### 3.6 Configure Webhooks in GoHighLevel

1. Log into GoHighLevel
2. Go to Settings → Workflows
3. Create a new workflow for each event you want to track:
   - Contact Created
   - Opportunity Created
   - Opportunity Stage Changed
   - Opportunity Won

4. Add "Custom Webhook" action:
   - URL: `https://your-vercel-url.vercel.app/api/webhook`
   - Method: POST
   - Headers: (if using webhook secret)
     ```
     x-webhook-signature: YOUR_WEBHOOK_SECRET
     ```
   - Body:
     ```json
     {
       "type": "contact.created",
       "data": {
         "id": "{{contact.id}}",
         "name": "{{contact.full_name}}",
         "first_name": "{{contact.first_name}}",
         "last_name": "{{contact.last_name}}",
         "email": "{{contact.email}}",
         "phone": "{{contact.phone}}",
         "tags": ["{{contact.tags}}"],
         "contact_source": "{{contact.contact_source}}"
       }
     }
     ```

**Benefit**: Real-time activity logging for critical events

---

## Phase 4: MCP Server (Optional, Future)

### When to Consider
- Building AI features that need GHL data access
- Want to query GHL via natural language
- Creating Claude/GPT integrations

### Quick Start with Official MCP Server

1. Install official GHL MCP server (when available)
2. Configure in Claude Desktop or similar tool
3. Query GHL data via natural language

**Example queries**:
- "Show me all partners added this week"
- "What grant opportunities are closing soon?"
- "Who are the top 5 contacts by engagement?"

---

## Testing Checklist

### Phase 1 Testing
- [ ] Run sync script locally
- [ ] Verify retry logic works (disconnect network mid-sync)
- [ ] Check rate limit warnings appear
- [ ] Confirm structured logs in output

### Phase 2 Testing
- [ ] Activity log database created in Notion
- [ ] Database ID added to config
- [ ] Activity logged on partner creation
- [ ] Sync summary appears in activity log

### Phase 3 Testing
- [ ] Webhook endpoint deployed to Vercel
- [ ] Test webhook with curl:
  ```bash
  curl -X POST https://your-url.vercel.app/api/webhook \
    -H "Content-Type: application/json" \
    -d '{"type":"contact.created","data":{"id":"test123","name":"Test Contact"}}'
  ```
- [ ] GHL workflows configured
- [ ] Real event triggers activity log entry

---

## Rollback Plan

If something breaks:

1. **Phase 1**: Changes are backward compatible, just remove retry wrapper
2. **Phase 2**: Activity logging failures don't break sync, safe to deploy
3. **Phase 3**: Disable GHL workflows, scheduled sync continues working

---

## Monitoring

### What to Watch

**In GitHub Actions Logs**:
- Sync success/failure
- Number of records created/updated
- API call count
- Retry attempts

**In Notion Activity Log**:
- Recent sync completions
- Event frequency
- Error patterns

**In GHL**:
- Webhook delivery success rate
- Workflow trigger counts

### Alerts to Set Up

Create a GitHub Actions workflow to notify on failures:

```yaml
# .github/workflows/sync-ghl.yml
# Add to existing file:
- name: Notify on Failure
  if: failure()
  run: |
    # Send notification (Slack, email, etc.)
    echo "Sync failed! Check logs."
```

---

## Estimated Time Investment

| Phase | Time | Value | Priority |
|-------|------|-------|----------|
| Phase 1: Quick Wins | 1-2h | High | Do Now |
| Phase 2: Activity Log | 2-3h | High | Do This Week |
| Phase 3: Webhooks | 4-6h | Medium | Do This Month |
| Phase 4: MCP Server | 8-12h | Low | Future |

---

## Support Resources

**Documentation**:
- Full guide: `/Users/benknight/act-global-infrastructure/docs/GHL_INTEGRATION_COMPREHENSIVE_GUIDE.md`
- Setup guide: `/Users/benknight/act-global-infrastructure/GHL_INTEGRATION_README.md`

**API References**:
- GHL API Docs: https://marketplace.gohighlevel.com/docs/
- Notion API Docs: https://developers.notion.com/

**Community**:
- GHL Developers: https://developers.gohighlevel.com/
- MCP GitHub: https://github.com/modelcontextprotocol

---

**Next Steps**: Start with Phase 1 (1-2 hours) to add immediate resilience to your sync process.

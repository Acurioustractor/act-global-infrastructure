# GoHighLevel Integration - Comprehensive Research & Implementation Guide

**Date**: 2026-01-01
**Status**: Research Complete

This document provides comprehensive research on GoHighLevel (GHL) API integration, MCP servers, Notion sync patterns, and best practices for maintaining single source of truth while providing team visibility.

---

## Table of Contents

1. [GoHighLevel Official API](#1-gohighlevel-official-api)
2. [Available MCP Servers for GoHighLevel](#2-available-mcp-servers-for-gohighlevel)
3. [Alternative Integration Methods](#3-alternative-integration-methods)
4. [Notion API Integration](#4-notion-api-integration)
5. [Best Practices](#5-best-practices)
6. [Implementation Guidance](#6-implementation-guidance)
7. [Code Examples](#7-code-examples)

---

## 1. GoHighLevel Official API

### 1.1 Official Documentation

- **Main API Documentation**: https://marketplace.gohighlevel.com/docs/
- **Developer Portal**: https://developers.gohighlevel.com/
- **GitHub Repository**: https://github.com/GoHighLevel/highlevel-api-docs
- **OAuth Helper Tool**: https://www.ghlapiv2.com/

### 1.2 Authentication Methods

#### OAuth 2.0 (Recommended for Apps)

OAuth 2.0 is the standard protocol for authorizing client applications to access specific resources on behalf of users without sharing passwords.

**Token Details**:
- Access Tokens expire after ~24 hours
- Refresh Tokens are valid for 1 year or until used
- Use Refresh Token to obtain new Access Token without reinstallation

**Base URL**: `https://services.leadconnectorhq.com/`

**Authentication Header**:
```http
Authorization: Bearer <your-token>
```

#### Private Integration Tokens (Recommended for Internal Use)

Private Integrations function as static/fixed OAuth2 Access Tokens, providing a more powerful yet secure alternative to API Keys.

**Benefits**:
- No token refresh required
- Simpler implementation for internal tools
- Full API access with proper scoping

### 1.3 API Rate Limits

GoHighLevel implements strict rate limiting for API v2 with OAuth:

**Burst Limit**:
- Maximum of **100 API requests per 10 seconds** per Marketplace app per resource (Location or Company)

**Daily Limit**:
- **200,000 API requests per day** per Marketplace app per resource

**Rate Limit Headers**:
```http
X-RateLimit-Limit-Daily: Your daily limit
X-RateLimit-Daily-Remaining: Remaining requests for the day
X-RateLimit-Interval-Milliseconds: Time interval for burst requests
X-RateLimit-Max: Maximum request limit in the specified time interval
X-RateLimit-Remaining: Remaining requests in current time interval
```

### 1.4 Best Practices for API Usage

**Rate Limiting Strategy**:
- Implement client-side throttling with 1000ms (1 second) intervals between requests
- Use batching when possible
- Implement request queuing for high-volume operations
- Use exponential backoff for 429/5xx responses

**Retry Strategy**:
- On transient 5xx or 429 errors, retry up to 3 times
- Use exponential backoff: 500ms → 1000ms → 2000ms
- Add ±20% jitter to prevent thundering herd

**Security**:
- Store API tokens securely in environment variables
- Rotate tokens periodically
- Monitor API usage to avoid hitting rate limits
- Use idempotent operations where possible

**Pagination**:
- Use cursor-based pagination for large datasets
- Default limit is 100 records per request
- Always handle `nextStartAfterId` for complete data retrieval

### 1.5 Key API Endpoints

**Contacts**:
- `GET /contacts/` - List contacts with filters
- `GET /contacts/{contactId}` - Get single contact
- `GET /contacts/search/` - Search contacts
- `POST /contacts/{contactId}/tags` - Add tags
- `DELETE /contacts/{contactId}/tags` - Remove tags

**Opportunities**:
- `GET /opportunities/search` - Search opportunities
- `GET /opportunities/{opportunityId}` - Get single opportunity
- `GET /opportunities/pipelines` - List all pipelines

**Custom Fields**:
- `GET /custom-fields` - Get custom field definitions

**API Access Tiers**:
- **Basic API**: Included with Starter and Unlimited plans (Location API Keys only)
- **Advanced API**: Agency Pro plan (Agency API Keys + Location API Keys)

---

## 2. Available MCP Servers for GoHighLevel

### 2.1 Official GoHighLevel MCP Server

GoHighLevel has launched an official MCP (Model Context Protocol) server that enables AI assistants to connect directly to GoHighLevel accounts.

**Server URL**: https://services.leadconnectorhq.com/mcp/

**Features**:
- Standardized way to connect AI models to GHL data
- Works with HTTP-based MCP clients (Cursor, Windsurf, OpenAI Playground)
- Abstracts away internal API complexity

**Official Documentation**: https://marketplace.gohighlevel.com/docs/other/mcp/index.html

### 2.2 Community MCP Implementations

#### mastanley13/GoHighLevel-MCP
- **Repository**: https://github.com/mastanley13/GoHighLevel-MCP
- **Features**: 269+ powerful tools across 19+ categories
- **Description**: Transforms Claude Desktop into a complete GoHighLevel CRM powerhouse
- **Status**: Active community project

#### drausal/gohighlevel-mcp
- **Repository**: https://github.com/drausal/gohighlevel-mcp
- **Features**: Complete access to contacts, opportunities, calendars, workflows
- **Description**: Generated from GoHighLevel's public API specification
- **Status**: Active development

#### basicmachines-co/open-ghl-mcp
- **Repository**: https://github.com/basicmachines-co/open-ghl-mcp
- **Features**: Comprehensive contact management with OAuth support
- **Description**: Open source MCP server for GHL API v2
- **Status**: Production-ready with OAuth 2.0

#### troylar/gohighlevel-mcp-server
- **Repository**: https://github.com/troylar/gohighlevel-mcp-server
- **Features**: Basic MCP server integration
- **Status**: Community maintained

### 2.3 Official npm Package

**Package**: `@gohighlevel/api-client`
**Registry**: https://www.npmjs.com/package/@gohighlevel/api-client

This is the official GoHighLevel API client for Node.js applications.

### 2.4 MCP Authentication Best Practices

**For STDIO Transport Servers** (Local MCP Servers):
- SHOULD NOT follow OAuth specification
- Retrieve credentials from environment variables
- Store client credentials as environment variables or secrets

**Security Requirements**:
- Follow OAuth 2.1 security best practices (RFC 8414)
- Use PKCE to protect authorization code exchanges
- Implement proper token expiration and refresh
- Never hardcode credentials or tokens
- Validate issuer and audience
- Log security events
- Use minimum required scopes

**Resource Server Pattern**:
- Treat MCP server as an OAuth resource server
- Leverage existing identity provider/authorization server
- Keep MCP server stateless for auth concerns

---

## 3. Alternative Integration Methods

### 3.1 Native Notion Integration

GoHighLevel offers a native Notion integration that eliminates the need for Zapier or webhooks.

**Key Features**:
- Bi-directional sync between HighLevel and Notion
- Create, update, and sync pages or database items directly from workflows
- Push onboarding forms, appointment results, or pipeline changes to Notion databases

**Sync Mechanism**:
- **Polling-based triggers**: Every 5 minutes, HighLevel checks Notion for changes
- When changes detected, triggers workflow automatically
- Supports database items and page updates

**Common Use Cases**:
- Update contact in GHL when Notion database item updated
- Create lead in GHL when new page added to Notion database
- Auto-generate project wikis/proposals when deals advance
- Sync appointment results to structured Notion databases

**Coexistence with Webhooks**:
- Native integration and webhooks can run side-by-side
- Safe to migrate from webhooks without breaking existing automation

### 3.2 Webhook Integration

#### Outbound Webhooks (GHL → External Systems)

Custom Webhook is an outbound workflow action that makes HTTP requests to external URLs when workflow events occur.

**Configuration**:
- HTTP method (GET, POST, PUT, DELETE)
- Target URL
- Headers (including authentication)
- Query parameters
- JSON payload with dynamic values

**Available Data**:
- Contact data (always available)
- Location object information
- Opportunity data (only with Opportunity triggers)
- Context-dependent payload based on trigger type

#### Webhook Event Types

**Contact Events**:
- Contact created
- Contact updated
- Contact deleted
- Tag added
- Tag removed

**Opportunity Events**:
- Opportunity created
- Pipeline stage changed
- Opportunity won/lost
- Monetary value updated

**Task Events**:
- Task created
- Task completed
- Task deleted

**Appointment Events**:
- Appointment scheduled
- Appointment updated
- Appointment cancelled

**Invoice Events**:
- Invoice created
- Invoice sent
- Invoice paid

#### Webhook Payload Structure

**Contact Webhook Example**:
```json
{
  "first_name": "{{contact.first_name}}",
  "last_name": "{{contact.last_name}}",
  "full_name": "{{contact.full_name}}",
  "email": "{{contact.email}}",
  "phone": "{{contact.phone}}",
  "tags": ["{{contact.tags}}"],
  "address1": "{{contact.address1}}",
  "city": "{{contact.city}}",
  "state": "{{contact.state}}",
  "country": "{{contact.country}}",
  "postal_code": "{{contact.postal_code}}",
  "company_name": "{{contact.company_name}}",
  "website": "{{contact.website}}",
  "date_created": "{{contact.date_created}}",
  "contact_source": "{{contact.contact_source}}",
  "contact_type": "{{contact.contact_type}}"
}
```

**Opportunity Webhook Example**:
```json
{
  "opportunity_id": "{{opportunity.id}}",
  "opportunity_name": "{{opportunity.name}}",
  "pipeline_id": "{{opportunity.pipeline_id}}",
  "pipeline_stage_id": "{{opportunity.pipeline_stage_id}}",
  "status": "{{opportunity.status}}",
  "monetary_value": "{{opportunity.monetary_value}}",
  "contact_id": "{{opportunity.contact_id}}",
  "assigned_to": "{{opportunity.assigned_to}}"
}
```

**Important Notes**:
- Email or Phone number is mandatory in payload
- Opportunity data only available with Opportunity triggers
- Generic triggers (like "Tag Added") only include contact-level data

### 3.3 Third-Party Integration Platforms

**Zapier**:
- Official GHL integration available
- Pre-built triggers and actions
- Easy setup, no coding required
- Limited to Zapier's execution limits

**Make (formerly Integromat)**:
- Advanced workflow builder
- Lower cost than Zapier for high volume
- More flexible data mapping

**Integrately**:
- 1-click integrations
- Pre-built automation templates
- Cost-effective for standard workflows

**n8n** (Open Source):
- Self-hosted option
- Full control over workflows
- No execution limits
- Requires technical setup

---

## 4. Notion API Integration

### 4.1 Activity Logging to Notion

**Goal**: Create visibility in Notion without duplicating CRM data

**Recommended Approach**: Activity Log Database

Instead of syncing all CRM data, maintain a lightweight activity log that references GHL records:

**Activity Log Schema**:
```javascript
{
  "Event Type": "select",        // Contact Updated, Deal Won, Task Completed
  "GHL Entity": "select",        // Contact, Opportunity, Task, Appointment
  "GHL Record ID": "text",       // Link to GHL record
  "Entity Name": "title",        // Display name
  "Action": "text",              // Description of what happened
  "Actor": "person",             // Who performed the action
  "Timestamp": "date",           // When it happened
  "Related Project": "relation", // Link to ACT Projects
  "Details": "text",             // Additional context
  "GHL Link": "url"             // Direct link to GHL record
}
```

**Benefits**:
- Single source of truth remains in GHL
- Team visibility without data duplication
- Easy to query recent activity
- Links back to authoritative GHL records
- Lightweight and fast to sync

### 4.2 Notion Webhook Integration

Notion provides integration webhooks for real-time notifications when changes occur in shared pages or databases.

**Capabilities**:
- Instant notifications to webhook endpoints
- Triggers automated tasks
- Supports page and database changes

**Limitations**:
- Does NOT support user changes notifications
- Does NOT support workspace membership changes
- Does NOT support teamspace settings changes
- Use audit log for these event types

### 4.3 Notion Audit Logs

**Available on**: Enterprise plans

**Features**:
- Reverse chronological event log
- Page edits (content changes)
- Page property edits (titles, database properties)
- Workspace ID, actor information, event types
- Timestamps for all events

**SIEM Integration**:
For production-grade log management:
- Splunk integration
- SumoLogic integration
- Panther integration
- Datadog integration

Benefits: Centralized monitoring, avoid duplication, real-time alerts, configurable dashboards

### 4.4 Avoiding Duplication

**Strategy 1: Reference Pattern**
- Store only GHL Record ID in Notion
- Display name for human readability
- Link to GHL for full details
- Update only when reference changes

**Strategy 2: Summary Pattern**
- Sync only critical fields needed for visibility
- Mark as "synced from GHL" to prevent editing
- Use "Last Synced" timestamp to show freshness
- Provide deep link to GHL for full access

**Strategy 3: Event Stream Pattern**
- Log activities as immutable events
- Never update, only append
- Shows history of what happened
- No risk of drift between systems

**Implementation in Current Codebase**:

The existing sync script (`/Users/benknight/act-global-infrastructure/scripts/sync-ghl-to-notion.mjs`) implements the **Reference Pattern**:

```javascript
// Stores GHL Contact ID as unique reference
'GHL Contact ID': {
  rich_text: [{ text: { content: contactData.ghlId } }]
}

// Updates existing records by matching GHL ID
const notionPartnersMap = new Map(
  existingPartners.map(p => [
    p.properties['GHL Contact ID']?.rich_text[0]?.plain_text,
    p.id
  ])
);
```

This ensures:
- No duplicate records (matched by GHL ID)
- Single source of truth (GHL)
- Notion shows current state
- "Last Synced" timestamp shows freshness

---

## 5. Best Practices

### 5.1 Data Sync Patterns

#### Pull Sync (Polling)
**When to Use**:
- Scheduled batch updates
- Lower real-time requirements
- Simpler implementation

**Implementation**:
- Run on schedule (e.g., every 6 hours)
- Fetch all records from GHL
- Compare with Notion records
- Create/update as needed

**Pros**:
- No webhook endpoint required
- Easy to implement
- Works with GitHub Actions

**Cons**:
- Not real-time
- May hit rate limits with large datasets
- Wastes resources checking unchanged data

#### Push Sync (Webhooks)
**When to Use**:
- Real-time requirements
- Event-driven workflows
- High-frequency updates

**Implementation**:
- Set up webhook endpoint
- Receive GHL events
- Process and update Notion immediately

**Pros**:
- Real-time updates
- Efficient (only processes changes)
- Lower API usage

**Cons**:
- Requires webhook endpoint
- More complex infrastructure
- Need to handle webhook security

#### Hybrid Approach (Recommended)
- Use webhooks for critical real-time events
- Use scheduled sync for bulk reconciliation
- Ensures consistency even if webhooks fail

### 5.2 Rate Limiting Strategy

**Client-Side Throttling**:
```javascript
class RateLimiter {
  constructor(requestsPerSecond = 10) {
    this.minInterval = 1000 / requestsPerSecond; // 100ms for 10 req/sec
    this.lastRequestTime = 0;
  }

  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }
}
```

**Exponential Backoff**:
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 || error.status >= 500) {
        if (attempt === maxRetries - 1) throw error;

        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        const jitter = delay * 0.2 * Math.random();

        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      } else {
        throw error;
      }
    }
  }
}
```

**Monitor Rate Limit Headers**:
```javascript
async function makeRequest(endpoint) {
  const response = await fetch(endpoint, { headers });

  // Check rate limit status
  const dailyRemaining = response.headers.get('X-RateLimit-Daily-Remaining');
  const burstRemaining = response.headers.get('X-RateLimit-Remaining');

  if (parseInt(dailyRemaining) < 1000) {
    console.warn('Approaching daily rate limit:', dailyRemaining);
  }

  if (parseInt(burstRemaining) < 10) {
    console.warn('Approaching burst rate limit:', burstRemaining);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return response.json();
}
```

### 5.3 Logging Strategies

#### Structured Logging
```javascript
const logger = {
  info: (msg, meta = {}) => console.log(JSON.stringify({
    level: 'info',
    timestamp: new Date().toISOString(),
    message: msg,
    ...meta
  })),

  error: (msg, error, meta = {}) => console.error(JSON.stringify({
    level: 'error',
    timestamp: new Date().toISOString(),
    message: msg,
    error: error.message,
    stack: error.stack,
    ...meta
  }))
};

// Usage
logger.info('Syncing partners', { count: partners.length });
logger.error('Sync failed', error, { contactId: contact.id });
```

#### Activity Log to Notion
```javascript
async function logActivityToNotion(activity) {
  await notion.pages.create({
    parent: { database_id: activityLogDbId },
    properties: {
      'Event Type': { select: { name: activity.eventType } },
      'Entity Name': { title: [{ text: { content: activity.name } }] },
      'GHL Entity': { select: { name: activity.entityType } },
      'GHL Record ID': { rich_text: [{ text: { content: activity.ghlId } }] },
      'Action': { rich_text: [{ text: { content: activity.action } }] },
      'Timestamp': { date: { start: new Date().toISOString() } },
      'GHL Link': { url: `https://app.gohighlevel.com/${activity.entityType}/${activity.ghlId}` }
    }
  });
}

// Usage
await logActivityToNotion({
  eventType: 'Contact Updated',
  entityType: 'contact',
  name: 'John Doe',
  ghlId: 'abc123',
  action: 'Updated email and phone number'
});
```

### 5.4 Error Handling

**Graceful Degradation**:
```javascript
async function syncWithErrorHandling(items) {
  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  for (const item of items) {
    try {
      await syncItem(item);
      results.success.push(item.id);
    } catch (error) {
      if (error.status === 404) {
        results.skipped.push(item.id);
      } else {
        results.failed.push({ id: item.id, error: error.message });
        logger.error('Sync failed', error, { itemId: item.id });
      }
    }
  }

  return results;
}
```

**Circuit Breaker Pattern**:
```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

### 5.5 Data Validation

**Schema Validation**:
```javascript
function validateContact(contact) {
  const errors = [];

  if (!contact.id) {
    errors.push('Contact ID is required');
  }

  if (!contact.email && !contact.phone) {
    errors.push('Either email or phone is required');
  }

  if (contact.email && !isValidEmail(contact.email)) {
    errors.push('Invalid email format');
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }

  return true;
}
```

**Data Sanitization**:
```javascript
function sanitizeForNotion(data) {
  return {
    ...data,
    // Notion text fields have 2000 char limit
    name: data.name?.slice(0, 2000) || 'Unnamed',
    // Handle null/undefined
    email: data.email || null,
    // Ensure proper date format
    dateAdded: data.dateAdded ? new Date(data.dateAdded).toISOString() : null
  };
}
```

---

## 6. Implementation Guidance

### 6.1 Current Implementation Status

**Existing Code**:
- `/Users/benknight/act-global-infrastructure/scripts/lib/ghl-api-service.mjs` - GHL API wrapper
- `/Users/benknight/act-global-infrastructure/scripts/sync-ghl-to-notion.mjs` - Sync script
- `/Users/benknight/act-global-infrastructure/.github/workflows/sync-ghl.yml` - Automation

**What Works**:
- Scheduled pull sync every 6 hours
- Deduplication via GHL ID matching
- Rate limiting (10 req/sec)
- Error tracking and reporting

**What's Missing**:
1. Real-time webhook support
2. Activity logging
3. More robust error handling
4. Retry logic with exponential backoff
5. Circuit breaker for API failures
6. Comprehensive monitoring

### 6.2 Recommended Enhancements

#### Phase 1: Improve Existing Sync (Low Effort, High Value)

**Add Retry Logic**:
```javascript
// In ghl-api-service.mjs
async request(endpoint, options = {}) {
  return retryWithBackoff(async () => {
    // Existing rate limiting
    await this.throttle();

    const response = await fetch(url, { ...options, headers });

    // Check rate limits
    this.checkRateLimits(response.headers);

    if (!response.ok) {
      const error = await response.text();
      const apiError = new Error(`GHL API Error (${response.status}): ${error}`);
      apiError.status = response.status;
      throw apiError;
    }

    return await response.json();
  });
}
```

**Add Activity Logging**:
```javascript
// New function in sync-ghl-to-notion.mjs
async function logSyncActivity(stats) {
  const activities = [];

  // Log partner syncs
  if (stats.partners.created > 0) {
    activities.push({
      eventType: 'Sync Complete',
      entityType: 'Partners',
      action: `Created ${stats.partners.created} new partners`,
      timestamp: new Date().toISOString()
    });
  }

  // Log to Notion Activity Database
  for (const activity of activities) {
    await logActivityToNotion(activity);
  }
}
```

**Add Better Monitoring**:
```javascript
// Track sync metrics
const metrics = {
  duration: Date.now() - startTime,
  totalRecords: partners.length + grants.length,
  apiCalls: ghl.requestCount,
  errors: stats.partners.errors + stats.grants.errors,
  successRate: ((stats.partners.created + stats.partners.updated) / partners.length) * 100
};

logger.info('Sync metrics', metrics);
```

#### Phase 2: Add Webhook Support (Medium Effort, High Value)

**Option A: Serverless Function** (Recommended for GitHub-hosted)
- Deploy webhook endpoint to Vercel/Netlify
- Trigger on GHL events
- Update Notion in real-time
- Lightweight and scalable

**Option B: Express Server** (If self-hosting)
- Run Node.js server with webhook endpoint
- Validate webhook signatures
- Process events and update Notion
- More control, requires infrastructure

**Webhook Handler Example**:
```javascript
// webhook-handler.mjs
import { createGHLService } from './lib/ghl-api-service.mjs';
import { Client } from '@notionhq/client';

export async function handleGHLWebhook(event) {
  const { type, contactId, opportunityId, data } = event;

  switch (type) {
    case 'contact.updated':
      await handleContactUpdate(contactId, data);
      break;
    case 'opportunity.stage_changed':
      await handleOpportunityUpdate(opportunityId, data);
      break;
    // Add more event types
  }

  // Log activity to Notion
  await logActivityToNotion({
    eventType: type,
    entityId: contactId || opportunityId,
    timestamp: new Date().toISOString()
  });
}
```

#### Phase 3: Add MCP Server (Advanced, Future Enhancement)

**When to Consider**:
- Need AI assistant access to GHL data
- Want to query GHL via natural language
- Building custom Claude/GPT integrations

**Implementation Options**:
1. Use official GHL MCP server (simplest)
2. Deploy community MCP server (more features)
3. Build custom MCP server (full control)

**Example Configuration** (for Claude Desktop):
```json
{
  "mcpServers": {
    "gohighlevel": {
      "command": "npx",
      "args": ["-y", "@gohighlevel/mcp-server"],
      "env": {
        "GHL_API_KEY": "your-api-key",
        "GHL_LOCATION_ID": "your-location-id"
      }
    }
  }
}
```

### 6.3 Architecture Decision Matrix

| Pattern | Real-time | Complexity | Cost | Reliability | Recommended For |
|---------|-----------|------------|------|-------------|-----------------|
| Scheduled Pull | Low | Low | Low | High | Current implementation |
| Webhooks Only | High | Medium | Low | Medium | Real-time requirements |
| Hybrid (Pull + Webhooks) | High | Medium | Low | Very High | Production systems |
| MCP Server | N/A | High | Medium | High | AI integrations |
| Native Notion Integration | Medium | Low | Low | High | Simple use cases |

**Recommendation for ACT**:
- **Short-term**: Enhance existing pull sync (Phase 1)
- **Medium-term**: Add webhook support for critical events (Phase 2)
- **Long-term**: Consider MCP server if building AI features (Phase 3)

### 6.4 Environment Variables

**Required Variables**:
```bash
# GoHighLevel
GHL_API_KEY=          # Private integration token or OAuth access token
GHL_LOCATION_ID=      # Your GHL location ID

# Notion
NOTION_TOKEN=         # Notion integration token

# Optional for Webhooks
WEBHOOK_SECRET=       # For validating webhook signatures
WEBHOOK_URL=          # Where GHL should send webhooks
```

**Secure Storage**:
- GitHub Secrets for automation
- `.env` file for local development (never commit!)
- Secrets manager for production (AWS Secrets Manager, etc.)

---

## 7. Code Examples

### 7.1 Enhanced GHL API Service

```javascript
// scripts/lib/ghl-api-service-v2.mjs
import fetch from 'node-fetch';

export class GHLService {
  constructor(apiKey, locationId) {
    this.apiKey = apiKey;
    this.locationId = locationId;
    this.baseURL = 'https://services.leadconnectorhq.com';
    this.requestCount = 0;

    // Rate limiting
    this.rateLimiter = new RateLimiter(10); // 10 req/sec

    // Circuit breaker
    this.circuitBreaker = new CircuitBreaker(5, 60000);
  }

  async request(endpoint, options = {}) {
    this.requestCount++;

    return this.circuitBreaker.execute(async () => {
      return retryWithBackoff(async () => {
        await this.rateLimiter.throttle();

        const url = `${this.baseURL}${endpoint}`;
        const headers = {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
          ...options.headers
        };

        const response = await fetch(url, { ...options, headers });

        // Monitor rate limits
        this.checkRateLimits(response.headers);

        if (!response.ok) {
          const error = await response.text();
          const apiError = new Error(`GHL API Error (${response.status}): ${error}`);
          apiError.status = response.status;
          throw apiError;
        }

        return await response.json();
      }, 3); // Max 3 retries
    });
  }

  checkRateLimits(headers) {
    const dailyRemaining = parseInt(headers.get('x-ratelimit-daily-remaining') || '999999');
    const burstRemaining = parseInt(headers.get('x-ratelimit-remaining') || '999');

    if (dailyRemaining < 1000) {
      console.warn(`⚠️  Approaching daily rate limit: ${dailyRemaining} requests remaining`);
    }

    if (burstRemaining < 10) {
      console.warn(`⚠️  Approaching burst rate limit: ${burstRemaining} requests remaining`);
    }
  }

  // ... existing methods (getContacts, getOpportunities, etc.)
}

class RateLimiter {
  constructor(requestsPerSecond = 10) {
    this.minInterval = 1000 / requestsPerSecond;
    this.lastRequestTime = 0;
  }

  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }
}

async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if ((error.status === 429 || error.status >= 500) && attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        const jitter = delay * 0.2 * Math.random();

        console.log(`Retrying in ${Math.round(delay + jitter)}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      } else {
        throw error;
      }
    }
  }
}

class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - too many failures');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.error(`⚠️  Circuit breaker opened after ${this.failureCount} failures`);
    }
  }
}
```

### 7.2 Activity Logging Service

```javascript
// scripts/lib/activity-logger.mjs
import { Client } from '@notionhq/client';

export class ActivityLogger {
  constructor(notionToken, activityDbId) {
    this.notion = new Client({ auth: notionToken });
    this.activityDbId = activityDbId;
  }

  async logEvent(event) {
    try {
      await this.notion.pages.create({
        parent: { database_id: this.activityDbId },
        properties: {
          'Event Type': {
            select: { name: event.type }
          },
          'Entity Name': {
            title: [{ text: { content: event.name || 'Unknown' } }]
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
            rich_text: [{ text: { content: JSON.stringify(event.details || {}) } }]
          }
        }
      });
    } catch (error) {
      console.error('Failed to log activity to Notion:', error.message);
      // Don't throw - logging failures shouldn't break sync
    }
  }

  buildGHLLink(entityType, id) {
    const baseUrl = 'https://app.gohighlevel.com';
    const paths = {
      'contact': `contacts/${id}`,
      'opportunity': `opportunities/${id}`,
      'task': `tasks/${id}`,
      'appointment': `calendar/${id}`
    };
    return `${baseUrl}/${paths[entityType] || ''}`;
  }

  async logSyncResults(stats, duration) {
    const summary = `Synced ${stats.partners.created + stats.partners.updated} partners, ` +
                   `${stats.grants.created + stats.grants.updated} grants in ${duration}s`;

    await this.logEvent({
      type: 'Sync Complete',
      name: 'GHL to Notion Sync',
      entityType: 'system',
      ghlId: 'sync',
      action: summary,
      details: stats
    });
  }
}
```

### 7.3 Webhook Handler

```javascript
// scripts/lib/webhook-handler.mjs
import crypto from 'crypto';
import { createGHLService } from './ghl-api-service.mjs';
import { ActivityLogger } from './activity-logger.mjs';

export class GHLWebhookHandler {
  constructor(webhookSecret) {
    this.webhookSecret = webhookSecret;
    this.ghl = createGHLService();
    this.logger = new ActivityLogger(
      process.env.NOTION_TOKEN,
      process.env.ACTIVITY_LOG_DB_ID
    );
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload, signature) {
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
   * Handle incoming webhook
   */
  async handleWebhook(payload, signature) {
    // Verify signature
    if (!this.verifySignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const { type, data } = payload;

    switch (type) {
      case 'contact.created':
        await this.handleContactCreated(data);
        break;
      case 'contact.updated':
        await this.handleContactUpdated(data);
        break;
      case 'contact.deleted':
        await this.handleContactDeleted(data);
        break;
      case 'opportunity.created':
        await this.handleOpportunityCreated(data);
        break;
      case 'opportunity.stage_changed':
        await this.handleOpportunityStageChanged(data);
        break;
      case 'opportunity.won':
        await this.handleOpportunityWon(data);
        break;
      default:
        console.log(`Unhandled webhook type: ${type}`);
    }
  }

  async handleContactCreated(data) {
    console.log('New contact created:', data.id);

    // Log activity
    await this.logger.logEvent({
      type: 'Contact Created',
      name: data.name || `${data.first_name} ${data.last_name}`,
      entityType: 'contact',
      ghlId: data.id,
      action: 'New contact added to GHL',
      details: { tags: data.tags, source: data.contact_source }
    });

    // Sync to Notion if needed
    // await syncContactToNotion(data);
  }

  async handleContactUpdated(data) {
    console.log('Contact updated:', data.id);

    await this.logger.logEvent({
      type: 'Contact Updated',
      name: data.name || `${data.first_name} ${data.last_name}`,
      entityType: 'contact',
      ghlId: data.id,
      action: 'Contact information updated'
    });
  }

  async handleOpportunityStageChanged(data) {
    console.log('Opportunity stage changed:', data.id);

    await this.logger.logEvent({
      type: 'Pipeline Stage Changed',
      name: data.opportunity_name,
      entityType: 'opportunity',
      ghlId: data.opportunity_id,
      action: `Moved to ${data.pipeline_stage_name}`,
      details: {
        pipeline: data.pipeline_name,
        previousStage: data.previous_stage_name,
        currentStage: data.pipeline_stage_name
      }
    });
  }

  async handleOpportunityWon(data) {
    console.log('Opportunity won:', data.id);

    await this.logger.logEvent({
      type: 'Deal Won',
      name: data.opportunity_name,
      entityType: 'opportunity',
      ghlId: data.opportunity_id,
      action: `Won opportunity worth $${data.monetary_value}`,
      details: { value: data.monetary_value }
    });
  }
}
```

### 7.4 Serverless Webhook Endpoint (Vercel)

```javascript
// api/webhook.js (Vercel serverless function)
import { GHLWebhookHandler } from '../scripts/lib/webhook-handler.mjs';

const handler = new GHLWebhookHandler(process.env.WEBHOOK_SECRET);

export default async function(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-ghl-signature'];
    const payload = req.body;

    await handler.handleWebhook(payload, signature);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### 7.5 Notion Activity Database Setup Script

```javascript
// scripts/create-activity-log-database.mjs
import { Client } from '@notionhq/client';
import { readFileSync, writeFileSync } from 'fs';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function createActivityLogDatabase() {
  // Get parent page ID from config or environment
  const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

  const database = await notion.databases.create({
    parent: { page_id: parentPageId },
    title: [{ text: { content: 'GHL Activity Log' } }],
    properties: {
      'Entity Name': { title: {} },
      'Event Type': {
        select: {
          options: [
            { name: 'Contact Created', color: 'blue' },
            { name: 'Contact Updated', color: 'green' },
            { name: 'Contact Deleted', color: 'red' },
            { name: 'Deal Won', color: 'green' },
            { name: 'Pipeline Stage Changed', color: 'yellow' },
            { name: 'Sync Complete', color: 'gray' }
          ]
        }
      },
      'GHL Entity': {
        select: {
          options: [
            { name: 'contact', color: 'blue' },
            { name: 'opportunity', color: 'green' },
            { name: 'task', color: 'orange' },
            { name: 'appointment', color: 'purple' },
            { name: 'system', color: 'gray' }
          ]
        }
      },
      'GHL Record ID': { rich_text: {} },
      'Action': { rich_text: {} },
      'Timestamp': { date: {} },
      'GHL Link': { url: {} },
      'Details': { rich_text: {} }
    }
  });

  console.log('Created Activity Log database:', database.id);

  // Save to config
  const configPath = './config/notion-database-ids.json';
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.activityLog = database.id;
  writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log('Updated config file with activity log database ID');
}

createActivityLogDatabase().catch(console.error);
```

---

## Summary & Recommendations

### Immediate Actions
1. Continue using existing scheduled sync (works well)
2. Implement Phase 1 enhancements (retry logic, better logging)
3. Create Activity Log database in Notion
4. Add activity logging to sync script

### Short-term (Next 2-4 weeks)
1. Set up webhook endpoint (Vercel serverless function)
2. Configure critical GHL webhooks (deal won, contact created)
3. Implement hybrid sync (webhooks + scheduled reconciliation)
4. Add monitoring dashboard in Notion

### Long-term (3-6 months)
1. Evaluate MCP server for AI integrations
2. Consider native Notion integration for simpler workflows
3. Build custom analytics on activity log data
4. Integrate with ACT Intelligence Hub

### Architecture Recommendation

**Hybrid Approach**:
- **Scheduled Sync** (every 6 hours): Full reconciliation, ensures consistency
- **Webhooks** (real-time): Critical events only (deal won, high-value contact updates)
- **Activity Log** (Notion): Lightweight visibility without duplication
- **Single Source of Truth**: GHL for operational data, Notion for visibility

This approach balances:
- Real-time updates for critical events
- Consistency through scheduled reconciliation
- Team visibility without data duplication
- Scalability and maintainability

---

## Sources

### GoHighLevel API
- [HighLevel API Documentation](https://marketplace.gohighlevel.com/docs/)
- [HighLevel API Support Portal](https://help.gohighlevel.com/support/solutions/articles/48001060529-highlevel-api)
- [GitHub - GoHighLevel API Docs](https://github.com/GoHighLevel/highlevel-api-docs)
- [HighLevel OAuth Documentation](https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0/index.html)
- [GHL API npm Package](https://www.npmjs.com/package/@gohighlevel/api-client)

### MCP Servers
- [Official GHL MCP Documentation](https://marketplace.gohighlevel.com/docs/other/mcp/index.html)
- [GitHub - mastanley13/GoHighLevel-MCP](https://github.com/mastanley13/GoHighLevel-MCP)
- [GitHub - drausal/gohighlevel-mcp](https://github.com/drausal/gohighlevel-mcp)
- [GitHub - basicmachines-co/open-ghl-mcp](https://github.com/basicmachines-co/open-ghl-mcp)
- [GitHub - troylar/gohighlevel-mcp-server](https://github.com/troylar/gohighlevel-mcp-server)

### Integration Methods
- [Notion Integration with HighLevel](https://help.gohighlevel.com/support/solutions/articles/155000005812-notion-integration-with-highlevel)
- [Webhook Integration Guide](https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide/index.html)
- [HighLevel Custom Webhook Setup](https://help.gohighlevel.com/support/solutions/articles/155000003305-workflow-action-custom-webhook)
- [Workflow Action - Webhook (Outbound)](https://help.gohighlevel.com/support/solutions/articles/155000003299-workflow-action-webhook-outbound-)

### Notion API
- [Notion Audit Log](https://www.notion.com/help/audit-log)
- [GitHub - Notion-Logs](https://github.com/Mathieu2301/Notion-Logs)
- [Start building with the Notion API](https://developers.notion.com/)

### MCP Authentication
- [Authorization - Model Context Protocol](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [OAuth for MCP - Stytch](https://stytch.com/blog/oauth-for-mcp-explained-with-a-real-world-example/)
- [Introduction to MCP and Authorization - Auth0](https://auth0.com/blog/an-introduction-to-mcp-and-authorization/)
- [MCP Authorization - WorkOS](https://workos.com/blog/mcp-authorization-in-5-easy-oauth-specs)
- [Securing MCP Servers - InfraCloud](https://www.infracloud.io/blogs/securing-mcp-servers/)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-01
**Maintained By**: ACT Infrastructure Team

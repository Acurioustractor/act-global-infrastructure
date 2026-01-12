# GHL Workflow Webhook Setup Guide

> Let GHL do what GHL does best. Only sync what matters.

## Overview

This guide walks you through setting up GHL Workflows to automatically sync contact and opportunity changes to Supabase in real-time.

**Webhook URL**: `https://tednluwflfhxyucgwigh.supabase.co/functions/v1/ghl-webhook`

---

## Quick Setup (2-4 Workflows)

**Essential (2 workflows):**

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| Sync New Contacts | Contact Created | Capture new contacts |
| Sync Contact Updates | Contact Changed | Keep data fresh (includes tags!) |

**Optional - Only if using pipelines (2 more):**

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| Sync New Opportunities | Opportunity Created | Track pipeline |
| Sync Opportunity Changes | Pipeline Stage Changed | Track progress |

> **Note**: "Contact Changed" fires for ALL contact modifications including tag changes, so you don't need a separate Tag workflow.

---

## Step-by-Step Instructions

### Workflow 1: Sync New Contacts

1. **Go to**: Automation → Workflows
2. **Click**: "+ Create Workflow"
3. **Name it**: `Sync to Supabase - New Contact`
4. **Add Trigger**:
   - Click "Add New Trigger"
   - Select: **Contact Created**
   - Save trigger

5. **Add Action**:
   - Click the "+" below the trigger
   - Search for: **Webhook**
   - Select: **Webhook** (standard, not Custom Webhook)

6. **Configure Webhook**:

   | Field | Value |
   |-------|-------|
   | **Method** | POST |
   | **URL** | `https://tednluwflfhxyucgwigh.supabase.co/functions/v1/ghl-webhook` |

7. **Custom Data** (optional):

   | Key | Value |
   |-----|-------|
   | `type` | `ContactCreate` |

   *Note: Our webhook auto-detects contact data, so this is optional but helps with logging.*

8. **Headers**:

   | Key | Value |
   |-----|-------|
   | `Content-Type` | `application/json` |

9. **Save & Publish** the workflow

**Important**: The standard Webhook action automatically sends all contact fields - no custom body needed!

---

### Workflow 2: Sync Contact Updates

Same setup as Workflow 1, but:
- **Name**: `Sync to Supabase - Contact Updated`
- **Trigger**: **Contact Changed**
- **Custom Data** (optional): `type` = `ContactUpdate`

---

### Workflow 3: Sync New Opportunities (Optional)

Same setup as Workflow 1, but:
- **Name**: `Sync to Supabase - New Opportunity`
- **Trigger**: **Opportunity Created**
- **Custom Data** (optional): `type` = `OpportunityCreate`

---

### Workflow 4: Sync Opportunity Status Changes (Optional)

Same setup as Workflow 1, but:
- **Name**: `Sync to Supabase - Opportunity Changed`
- **Trigger**: **Pipeline Stage Changed** or **Opportunity Status Changed**
- **Custom Data** (optional): `type` = `OpportunityStatusUpdate`

---

## GHL Variable Reference

Use these variables in your webhook body:

### Contact Variables
| Variable | Description |
|----------|-------------|
| `{{contact.id}}` | GHL Contact ID |
| `{{contact.first_name}}` | First name |
| `{{contact.last_name}}` | Last name |
| `{{contact.full_name}}` | Full name |
| `{{contact.email}}` | Email address |
| `{{contact.phone}}` | Phone number |
| `{{contact.company_name}}` | Company |
| `{{contact.tags}}` | Array of tags |
| `{{contact.date_created}}` | Created timestamp |
| `{{contact.date_updated}}` | Updated timestamp |

### Opportunity Variables
| Variable | Description |
|----------|-------------|
| `{{opportunity.id}}` | Opportunity ID |
| `{{opportunity.name}}` | Opportunity name |
| `{{opportunity.contact_id}}` | Linked contact ID |
| `{{opportunity.pipeline_id}}` | Pipeline ID |
| `{{opportunity.pipeline_name}}` | Pipeline name |
| `{{opportunity.stage_id}}` | Current stage ID |
| `{{opportunity.stage_name}}` | Current stage name |
| `{{opportunity.status}}` | Status (open/won/lost) |
| `{{opportunity.monetary_value}}` | Dollar value |
| `{{opportunity.date_added}}` | Created timestamp |

---

## Testing Your Workflows

### 1. Test via GHL
1. Create a test contact in GHL
2. Check Supabase for the synced record

### 2. Verify in Terminal
```bash
cd /Users/benknight/act-personal-ai
npm run ghl:stats
```

### 3. Check Sync Logs
The `ghl_sync_log` table records every webhook event:
- `triggered_by: 'webhook'` = Real-time from GHL
- `triggered_by: 'scheduled'` = 6-hour batch sync

---

## What GHL Handles Natively (Don't Sync)

Let GHL manage these internally - no need to sync:

| GHL Native Feature | Why Keep in GHL |
|--------------------|-----------------|
| Workflows & Automations | GHL's core strength |
| Email/SMS Campaigns | Built-in deliverability |
| Appointment Scheduling | Native reminders work best |
| Pipeline Stages | Real-time in GHL UI |
| Conversations | Two-way messaging |
| Forms & Landing Pages | Native lead capture |
| AI Features | Voice AI, Chat AI, Reviews AI |

**Only sync the outcomes** (contacts, opportunities) not the process (emails sent, appointments booked).

---

## Fallback: Scheduled Sync

Even if webhooks fail, the scheduled sync runs every 6 hours via GitHub Actions:

```yaml
# .github/workflows/sync-ghl.yml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
```

This ensures Supabase always has fresh data.

---

## Troubleshooting

### Webhook Not Firing
1. Check workflow is **Published** (not Draft)
2. Verify trigger conditions match
3. Check GHL workflow execution history

### Data Not Appearing in Supabase
1. Check webhook URL is correct
2. Verify JSON body syntax
3. Check Supabase Edge Function logs:
   ```bash
   supabase functions logs ghl-webhook --project-ref tednluwflfhxyucgwigh
   ```

### Duplicate Records
- The handler uses `upsert` with `onConflict: 'ghl_id'`
- Duplicates are impossible if `ghl_id` is correct

---

## Next Steps

After setting up webhooks:

1. **Build Pipelines** - Create the 15 ACT pipelines in GHL
2. **Create Automations** - Welcome sequences, reminders, nurture flows
3. **Build Dashboard** - Query Supabase for unified view
4. **AI Integration** - Claude Code queries CRM data

---

*Last updated: 2026-01-05*

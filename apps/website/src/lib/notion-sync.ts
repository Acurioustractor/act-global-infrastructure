/**
 * Notion Sync Service
 * Syncs GHL form submissions to Notion databases
 *
 * Supports:
 * - Partnerships database (contact forms)
 * - Bookings database (farm stay bookings)
 * - CSA Members database (Harvest signups)
 * - Residency Applications database (art residencies)
 * - Newsletter database (newsletter signups)
 */

import { Client } from '@notionhq/client';
import type { GHLWebhookPayload } from './ghl/types';

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY,
});

// Database IDs from environment
const DATABASES = {
  partnerships: process.env.NOTION_PARTNERSHIPS_DATABASE_ID || '',
  bookings: process.env.NOTION_BOOKINGS_DATABASE_ID || '',
  csaMembers: process.env.NOTION_CSA_DATABASE_ID || '',
  residencyApplications: process.env.NOTION_RESIDENCY_DATABASE_ID || '',
  newsletter: process.env.NOTION_NEWSLETTER_DATABASE_ID || '',
} as const;

export type FormType = 'contact' | 'farm_stay' | 'csa' | 'art_residency' | 'newsletter' | 'unknown';

/**
 * Main sync function - routes to appropriate database based on form type
 */
export async function syncToNotion(
  payload: GHLWebhookPayload,
  formType: FormType
): Promise<{ success: boolean; pageId?: string; error?: string }> {
  try {
    console.log(`[Notion Sync] Starting sync for form type: ${formType}`);

    let result;
    switch (formType) {
      case 'contact':
        result = await syncToPartnerships(payload);
        break;
      case 'farm_stay':
        result = await syncToBookings(payload);
        break;
      case 'csa':
        result = await syncToCSAMembers(payload);
        break;
      case 'art_residency':
        result = await syncToResidencyApplications(payload);
        break;
      case 'newsletter':
        result = await syncToNewsletter(payload);
        break;
      default:
        console.warn(`[Notion Sync] Unknown form type: ${formType}`);
        return { success: false, error: 'Unknown form type' };
    }

    console.log(`[Notion Sync] ✅ Successfully synced to Notion:`, result.pageId);
    return result;
  } catch (error) {
    console.error('[Notion Sync] ❌ Error syncing to Notion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync contact form to Partnerships database
 * Resolves issue #12
 */
async function syncToPartnerships(payload: GHLWebhookPayload) {
  if (!DATABASES.partnerships) {
    throw new Error('NOTION_PARTNERSHIPS_DATABASE_ID not configured');
  }

  const page = await notion.pages.create({
    parent: { database_id: DATABASES.partnerships },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: payload.contact.name || payload.contact.email || 'Unknown',
            },
          },
        ],
      },
      Email: {
        email: payload.contact.email || null,
      },
      Phone: {
        phone_number: payload.contact.phone || null,
      },
      Company: {
        rich_text: [
          {
            text: {
              content: payload.contact.companyName || payload.customFields?.company || '',
            },
          },
        ],
      },
      Message: {
        rich_text: [
          {
            text: {
              content: payload.customFields?.message || payload.customFields?.notes || '',
            },
          },
        ],
      },
      Source: {
        select: {
          name: 'GHL Website Form',
        },
      },
      Status: {
        select: {
          name: 'New',
        },
      },
      'Submission Date': {
        date: {
          start: new Date().toISOString(),
        },
      },
    },
  });

  return { success: true, pageId: page.id };
}

/**
 * Sync farm stay booking to Bookings database
 * Resolves issue #14
 */
async function syncToBookings(payload: GHLWebhookPayload) {
  if (!DATABASES.bookings) {
    throw new Error('NOTION_BOOKINGS_DATABASE_ID not configured');
  }

  const page = await notion.pages.create({
    parent: { database_id: DATABASES.bookings },
    properties: {
      'Guest Name': {
        title: [
          {
            text: {
              content: payload.contact.name || 'Unknown',
            },
          },
        ],
      },
      Email: {
        email: payload.contact.email || null,
      },
      Phone: {
        phone_number: payload.contact.phone || null,
      },
      'Requested Dates': {
        rich_text: [
          {
            text: {
              content: payload.customFields?.dates || 'TBD',
            },
          },
        ],
      },
      'Number of Guests': {
        number: parseInt(payload.customFields?.guests || '1', 10),
      },
      Notes: {
        rich_text: [
          {
            text: {
              content: payload.customFields?.notes || payload.customFields?.message || '',
            },
          },
        ],
      },
      Source: {
        select: {
          name: 'Website',
        },
      },
      Status: {
        select: {
          name: 'Pending',
        },
      },
      'Booking Date': {
        date: {
          start: new Date().toISOString(),
        },
      },
    },
  });

  return { success: true, pageId: page.id };
}

/**
 * Sync CSA interest to CSA Members database
 * Resolves issue #17
 */
async function syncToCSAMembers(payload: GHLWebhookPayload) {
  if (!DATABASES.csaMembers) {
    throw new Error('NOTION_CSA_DATABASE_ID not configured');
  }

  const page = await notion.pages.create({
    parent: { database_id: DATABASES.csaMembers },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: payload.contact.name || 'Unknown',
            },
          },
        ],
      },
      Email: {
        email: payload.contact.email || null,
      },
      Phone: {
        phone_number: payload.contact.phone || null,
      },
      'Dietary Preferences': {
        rich_text: [
          {
            text: {
              content: payload.customFields?.dietary || '',
            },
          },
        ],
      },
      'Pickup Location': {
        select: {
          name: payload.customFields?.pickupLocation || 'TBD',
        },
      },
      'Membership Type': {
        select: {
          name: payload.customFields?.membershipType || 'Standard',
        },
      },
      Status: {
        select: {
          name: 'Pending',
        },
      },
      'Sign-up Date': {
        date: {
          start: new Date().toISOString(),
        },
      },
    },
  });

  return { success: true, pageId: page.id };
}

/**
 * Sync art residency application to Residency Applications database
 * Resolves issue #20
 */
async function syncToResidencyApplications(payload: GHLWebhookPayload) {
  if (!DATABASES.residencyApplications) {
    throw new Error('NOTION_RESIDENCY_DATABASE_ID not configured');
  }

  const page = await notion.pages.create({
    parent: { database_id: DATABASES.residencyApplications },
    properties: {
      'Artist Name': {
        title: [
          {
            text: {
              content: payload.contact.name || 'Unknown',
            },
          },
        ],
      },
      Email: {
        email: payload.contact.email || null,
      },
      Phone: {
        phone_number: payload.contact.phone || null,
      },
      'Art Practice': {
        rich_text: [
          {
            text: {
              content: payload.customFields?.practice || payload.customFields?.medium || '',
            },
          },
        ],
      },
      'Proposed Dates': {
        rich_text: [
          {
            text: {
              content: payload.customFields?.dates || 'TBD',
            },
          },
        ],
      },
      'Project Description': {
        rich_text: [
          {
            text: {
              content: payload.customFields?.project || payload.customFields?.description || '',
            },
          },
        ],
      },
      Website: {
        url: payload.customFields?.website || payload.contact.website || null,
      },
      Status: {
        select: {
          name: 'New Application',
        },
      },
      'Application Date': {
        date: {
          start: new Date().toISOString(),
        },
      },
    },
  });

  return { success: true, pageId: page.id };
}

/**
 * Sync newsletter signup to Newsletter database
 */
async function syncToNewsletter(payload: GHLWebhookPayload) {
  if (!DATABASES.newsletter) {
    throw new Error('NOTION_NEWSLETTER_DATABASE_ID not configured');
  }

  const page = await notion.pages.create({
    parent: { database_id: DATABASES.newsletter },
    properties: {
      Email: {
        title: [
          {
            text: {
              content: payload.contact.email || 'Unknown',
            },
          },
        ],
      },
      Name: {
        rich_text: [
          {
            text: {
              content: payload.contact.name || '',
            },
          },
        ],
      },
      Source: {
        select: {
          name: 'Website Form',
        },
      },
      Status: {
        select: {
          name: 'Active',
        },
      },
      'Subscribe Date': {
        date: {
          start: new Date().toISOString(),
        },
      },
    },
  });

  return { success: true, pageId: page.id };
}

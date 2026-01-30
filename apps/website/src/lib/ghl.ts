/**
 * GoHighLevel API Client
 * Handles contact management and automation
 */

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_KEY = process.env.GOHIGHLEVEL_API_KEY;
const GHL_LOCATION_ID = process.env.GOHIGHLEVEL_LOCATION_ID;

interface GHLContact {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  tags?: string[];
}

/**
 * Add tags to an existing contact in GHL
 * This is called after a form submission to categorize the contact
 *
 * @param contactId - The GHL contact ID (from webhook payload)
 * @param tags - Array of tag names to add (e.g., ["Newsletter", "Harvest CSA"])
 */
export async function addTagsToContact(
  contactId: string,
  tags: string[]
): Promise<boolean> {
  if (!GHL_API_KEY) {
    console.warn('⚠️ GOHIGHLEVEL_API_KEY not set - skipping tag addition');
    return false;
  }

  if (!contactId || !tags || tags.length === 0) {
    console.warn('⚠️ Missing contactId or tags - skipping tag addition');
    return false;
  }

  try {
    const response = await fetch(
      `${GHL_API_BASE}/contacts/${contactId}/tags`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28', // GHL API version
        },
        body: JSON.stringify({
          tags,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ GHL API error (${response.status}):`, errorText);
      return false;
    }

    console.log(`✅ Added tags to contact ${contactId}:`, tags);
    return true;
  } catch (error) {
    console.error('❌ Failed to add tags to GHL contact:', error);
    return false;
  }
}

/**
 * Update contact custom fields in GHL
 * Used to store additional metadata about the contact
 *
 * @param contactId - The GHL contact ID
 * @param customFields - Object with custom field key-value pairs
 */
export async function updateContactCustomFields(
  contactId: string,
  customFields: Record<string, any>
): Promise<boolean> {
  if (!GHL_API_KEY) {
    console.warn('⚠️ GOHIGHLEVEL_API_KEY not set - skipping custom field update');
    return false;
  }

  try {
    const response = await fetch(
      `${GHL_API_BASE}/contacts/${contactId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify({
          customFields,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ GHL API error (${response.status}):`, errorText);
      return false;
    }

    console.log(`✅ Updated custom fields for contact ${contactId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to update GHL contact custom fields:', error);
    return false;
  }
}

/**
 * Add contact to a workflow in GHL
 * Workflows automate follow-up sequences, tasks, and nurture campaigns
 *
 * @param contactId - The GHL contact ID
 * @param workflowId - The GHL workflow ID to add them to
 */
export async function addContactToWorkflow(
  contactId: string,
  workflowId: string
): Promise<boolean> {
  if (!GHL_API_KEY) {
    console.warn('⚠️ GOHIGHLEVEL_API_KEY not set - skipping workflow addition');
    return false;
  }

  try {
    const response = await fetch(
      `${GHL_API_BASE}/contacts/${contactId}/workflow/${workflowId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ GHL API error (${response.status}):`, errorText);
      return false;
    }

    console.log(`✅ Added contact ${contactId} to workflow ${workflowId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to add contact to GHL workflow:', error);
    return false;
  }
}

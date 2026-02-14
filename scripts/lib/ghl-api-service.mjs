/**
 * GoHighLevel API Service for ACT
 *
 * Wraps the GHL v2 API for:
 * - Contact management (partners, funders)
 * - Opportunity tracking (grants, partnerships)
 * - Pipeline management
 * - Tags and custom fields
 *
 * API Docs: https://highlevel.stoplight.io/docs/integrations/
 */

export class GHLService {
  constructor(apiKey, locationId) {
    if (!apiKey) {
      throw new Error('GHL_API_KEY is required');
    }
    if (!locationId) {
      throw new Error('GHL_LOCATION_ID is required');
    }

    this.apiKey = apiKey;
    this.locationId = locationId;
    this.baseURL = 'https://services.leadconnectorhq.com';

    // Rate limiting
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // 100ms between requests (10 req/sec)
  }

  /**
   * Make authenticated API request with rate limiting
   */
  async request(endpoint, options = {}) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28', // GHL API version
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GHL API Error (${response.status}): ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`GHL API Request Failed: ${endpoint}`, error);
      throw error;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CONTACTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Get contacts with optional filters
   *
   * @param {Object} params - Query parameters
   * @param {string[]} params.tags - Filter by tags (e.g., ['Partner', 'Grant Funder'])
   * @param {number} params.limit - Max results per page (default: 100)
   * @param {string} params.startAfter - Pagination cursor timestamp
   * @param {string} params.startAfterId - Pagination cursor ID
   * @returns {Promise<{contacts: Array, total: number, startAfter: string, startAfterId: string, hasMore: boolean}>}
   */
  async getContacts(params = {}) {
    const queryParams = new URLSearchParams({
      locationId: this.locationId,
      limit: params.limit || 100
    });

    // v2 API requires both startAfter (timestamp) and startAfterId for pagination
    if (params.startAfter) {
      queryParams.set('startAfter', params.startAfter);
    }
    if (params.startAfterId) {
      queryParams.set('startAfterId', params.startAfterId);
    }

    // Add tag filters if provided
    if (params.tags && params.tags.length > 0) {
      params.tags.forEach(tag => {
        queryParams.append('tags', tag);
      });
    }

    const data = await this.request(`/contacts/?${queryParams}`);

    return {
      contacts: data.contacts || [],
      total: data.meta?.total || 0,
      // v2 API returns both startAfter (timestamp) and startAfterId for next page
      startAfter: data.meta?.startAfter,
      startAfterId: data.meta?.startAfterId,
      hasMore: !!data.meta?.nextPage
    };
  }

  /**
   * Get a single contact by ID
   *
   * @param {string} contactId - GHL contact ID
   * @returns {Promise<Object>} Contact object with all details
   */
  async getContactById(contactId) {
    const data = await this.request(`/contacts/${contactId}`);
    return data.contact;
  }

  /**
   * Get all contacts with a specific tag (handles pagination)
   *
   * @param {string} tag - Tag to filter by
   * @returns {Promise<Array>} All contacts with this tag
   */
  async getAllContactsByTag(tag) {
    const allContacts = [];
    let startAfter;
    let startAfterId;
    let hasMore = true;

    do {
      const result = await this.getContacts({
        tags: [tag],
        startAfter,
        startAfterId,
        limit: 100
      });

      allContacts.push(...result.contacts);
      hasMore = result.hasMore;
      startAfter = result.startAfter;
      startAfterId = result.startAfterId;
    } while (hasMore);

    return allContacts;
  }

  /**
   * Create a new contact
   *
   * @param {Object} contactData - Contact data
   * @param {string} contactData.email - Email address (required)
   * @param {string} [contactData.firstName] - First name
   * @param {string} [contactData.lastName] - Last name
   * @param {string} [contactData.phone] - Phone number
   * @param {string} [contactData.companyName] - Company name
   * @param {string[]} [contactData.tags] - Tags to apply
   * @returns {Promise<Object>} Created contact
   */
  async createContact(contactData) {
    const payload = {
      locationId: this.locationId,
      email: contactData.email,
      ...(contactData.firstName && { firstName: contactData.firstName }),
      ...(contactData.lastName && { lastName: contactData.lastName }),
      ...(contactData.phone && { phone: contactData.phone }),
      ...(contactData.companyName && { companyName: contactData.companyName }),
      ...(contactData.tags && { tags: contactData.tags }),
      source: 'ACT Agent'
    };

    const data = await this.request('/contacts/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return data.contact;
  }

  /**
   * Update an existing contact
   *
   * @param {string} contactId - GHL contact ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated contact
   */
  async updateContact(contactId, updates) {
    const data = await this.request(`/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    return data.contact;
  }

  /**
   * Lookup contact by email
   *
   * @param {string} email - Email to lookup
   * @returns {Promise<Object|null>} Contact if found
   */
  async lookupContactByEmail(email) {
    try {
      const data = await this.request(
        `/contacts/lookup?locationId=${this.locationId}&email=${encodeURIComponent(email)}`
      );
      return data.contacts?.[0] || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Create or update contact (upsert)
   *
   * @param {Object} contactData - Contact data with email as key
   * @returns {Promise<{contact: Object, created: boolean}>}
   */
  async upsertContact(contactData) {
    const existing = await this.lookupContactByEmail(contactData.email);

    if (existing) {
      const updated = await this.updateContact(existing.id, contactData);
      return { contact: updated, created: false };
    } else {
      const created = await this.createContact(contactData);
      return { contact: created, created: true };
    }
  }

  /**
   * Search contacts by name, email, or phone
   *
   * @param {string} query - Search query
   * @returns {Promise<Array>} Matching contacts
   */
  async searchContacts(query) {
    const queryParams = new URLSearchParams({
      locationId: this.locationId,
      query: query
    });

    const data = await this.request(`/contacts/search/?${queryParams}`);
    return data.contacts || [];
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OPPORTUNITIES (Grants, Partnerships)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Get opportunities from a specific pipeline
   *
   * @param {string} pipelineId - GHL pipeline ID (e.g., grants pipeline)
   * @param {Object} params - Optional filters
   * @returns {Promise<Array>} Opportunities in this pipeline
   */
  async getOpportunities(pipelineId, params = {}) {
    const queryParams = new URLSearchParams({
      location_id: this.locationId,
      pipeline_id: pipelineId,  // v2 API uses snake_case
      limit: params.limit || 100,
      ...(params.cursor && { startAfter: params.cursor })
    });

    const data = await this.request(`/opportunities/search?${queryParams}`);
    return data.opportunities || [];
  }

  /**
   * Get a single opportunity by ID
   *
   * @param {string} opportunityId - GHL opportunity ID
   * @returns {Promise<Object>} Opportunity details
   */
  async getOpportunityById(opportunityId) {
    const data = await this.request(`/opportunities/${opportunityId}`);
    return data.opportunity;
  }

  /**
   * Update an opportunity in GHL
   *
   * @param {string} opportunityId - GHL opportunity ID
   * @param {Object} updates - Fields to update (name, stageId, monetaryValue, status, etc.)
   * @returns {Promise<Object>} Updated opportunity
   */
  async updateOpportunity(opportunityId, updates) {
    const data = await this.request(`/opportunities/${opportunityId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return data.opportunity || data;
  }

  /**
   * Get all opportunities across all pipelines
   *
   * @returns {Promise<Array>} All opportunities
   */
  async getAllOpportunities() {
    const pipelines = await this.getPipelines();
    const allOpportunities = [];

    for (const pipeline of pipelines) {
      const opportunities = await this.getOpportunities(pipeline.id);
      allOpportunities.push(...opportunities);
    }

    return allOpportunities;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PIPELINES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Get all pipelines in the location
   *
   * @returns {Promise<Array>} All pipelines
   */
  async getPipelines() {
    const data = await this.request(`/opportunities/pipelines?locationId=${this.locationId}`);
    return data.pipelines || [];
  }

  /**
   * Find pipeline by name
   *
   * @param {string} name - Pipeline name (e.g., 'Grants', 'Partnerships')
   * @returns {Promise<Object|null>} Pipeline object or null if not found
   */
  async getPipelineByName(name) {
    const pipelines = await this.getPipelines();
    return pipelines.find(p =>
      p.name.toLowerCase().includes(name.toLowerCase())
    ) || null;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TAGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Get all tags in the location
   *
   * @returns {Promise<Array>} All tags
   */
  async getContactTags() {
    const data = await this.request(`/contacts/tags?locationId=${this.locationId}`);
    return data.tags || [];
  }

  /**
   * Add tag to a contact
   *
   * @param {string} contactId - GHL contact ID
   * @param {string} tag - Tag to add
   */
  async addTagToContact(contactId, tag) {
    await this.request(`/contacts/${contactId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tags: [tag] })
    });
  }

  /**
   * Remove tag from a contact
   *
   * @param {string} contactId - GHL contact ID
   * @param {string} tag - Tag to remove
   */
  async removeTagFromContact(contactId, tag) {
    await this.request(`/contacts/${contactId}/tags`, {
      method: 'DELETE',
      body: JSON.stringify({ tags: [tag] })
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CUSTOM FIELDS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Get all custom fields for contacts
   *
   * @returns {Promise<Array>} Custom field definitions
   */
  async getCustomFields() {
    const data = await this.request(`/custom-fields?locationId=${this.locationId}`);
    return data.customFields || [];
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // UTILITY METHODS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Extract relevant fields from GHL contact for Notion sync
   *
   * @param {Object} contact - Raw GHL contact object
   * @returns {Object} Cleaned contact data for Notion
   */
  extractContactData(contact) {
    return {
      ghlId: contact.id,
      name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      tags: contact.tags || [],
      customFields: contact.customFields || {},
      dateAdded: contact.dateAdded ? new Date(contact.dateAdded) : null,
      lastUpdated: new Date()
    };
  }

  /**
   * Extract relevant fields from GHL opportunity for Notion sync
   *
   * @param {Object} opportunity - Raw GHL opportunity object
   * @returns {Object} Cleaned opportunity data for Notion
   */
  extractOpportunityData(opportunity) {
    return {
      ghlId: opportunity.id,
      name: opportunity.name,
      pipelineId: opportunity.pipelineId,
      pipelineStageId: opportunity.pipelineStageId,
      status: opportunity.status,
      monetaryValue: opportunity.monetaryValue,
      contactId: opportunity.contactId,
      assignedTo: opportunity.assignedTo,
      customFields: opportunity.customFields || {},
      dateAdded: opportunity.dateAdded ? new Date(opportunity.dateAdded) : null,
      lastUpdated: new Date()
    };
  }

  /**
   * Health check - verify API connection
   *
   * @returns {Promise<{healthy: boolean, error?: string}>}
   */
  async healthCheck() {
    try {
      // Use location endpoint for health check (v2 compatible)
      await this.request(`/locations/${this.locationId}`);
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SOCIAL MEDIA (convenience methods - full implementation in ghl-social-service.mjs)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Get connected social media accounts
   *
   * @returns {Promise<Array>} Connected social accounts
   */
  async getSocialAccounts() {
    const data = await this.request(
      `/social-media-posting/${this.locationId}/accounts`
    );
    return data.accounts || [];
  }

  /**
   * Create a social media post
   *
   * @param {Object} postData - Post data
   * @param {string[]} postData.accountIds - Account IDs to post to
   * @param {string} postData.summary - Post content
   * @param {string[]} [postData.mediaUrls] - Media URLs
   * @param {string} [postData.scheduledAt] - ISO8601 schedule time
   * @returns {Promise<Object>} Created post
   */
  async createSocialPost(postData) {
    const data = await this.request(
      `/social-media-posting/${this.locationId}/posts`,
      {
        method: 'POST',
        body: JSON.stringify(postData)
      }
    );
    return data;
  }

  /**
   * Get social posts with filters
   *
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Posts and total count
   */
  async getSocialPosts(filters = {}) {
    const data = await this.request(
      `/social-media-posting/${this.locationId}/posts/list`,
      {
        method: 'POST',
        body: JSON.stringify(filters)
      }
    );
    return {
      posts: data.posts || [],
      total: data.total || 0
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FACTORY FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Create GHL service instance from environment variables
 *
 * @returns {GHLService}
 */
export function createGHLService() {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    throw new Error(
      'Missing GHL credentials. Set GHL_API_KEY and GHL_LOCATION_ID environment variables.'
    );
  }

  return new GHLService(apiKey, locationId);
}

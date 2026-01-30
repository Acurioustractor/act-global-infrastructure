/**
 * GoHighLevel API Client
 *
 * Unified client for all ACT projects to interact with GHL API
 * Uses Private Integration Tokens for authentication
 *
 * Based on GHL API v2 (2021-07-28)
 * Docs: https://marketplace.gohighlevel.com/
 */

export interface GHLClientConfig {
  apiKey: string;
  locationId: string;
  apiVersion?: string;
}

export interface GHLContact {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  source?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  dateOfBirth?: string;
  companyName?: string;
  website?: string;
}

export interface GHLAppointment {
  id?: string;
  calendarId: string;
  contactId: string;
  startTime: string; // ISO 8601 format
  endTime?: string;
  title?: string;
  appointmentStatus?: 'confirmed' | 'cancelled' | 'showed' | 'noshow' | 'rescheduled';
  assignedUserId?: string;
  notes?: string;
}

export interface GHLOpportunity {
  id?: string;
  pipelineId: string;
  pipelineStageId: string;
  name: string;
  contactId: string;
  monetaryValue?: number;
  status?: 'open' | 'won' | 'lost' | 'abandoned';
  source?: string;
  customFields?: Record<string, any>;
}

export class GHLClient {
  private baseUrl = 'https://services.leadconnectorhq.com';
  private config: Required<GHLClientConfig>;

  constructor(config: GHLClientConfig) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || '2021-07-28',
    };

    if (!this.config.apiKey) {
      throw new Error('GHL API key is required');
    }
    if (!this.config.locationId) {
      throw new Error('GHL Location ID is required');
    }
  }

  /**
   * Make authenticated request to GHL API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Version': this.config.apiVersion,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GHL API Error (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Contacts API
   */
  contacts = {
    /**
     * Create or update a contact (upsert by email)
     */
    upsert: async (contact: GHLContact): Promise<GHLContact> => {
      return this.request<GHLContact>('/contacts/upsert', {
        method: 'POST',
        body: JSON.stringify({
          ...contact,
          locationId: this.config.locationId,
        }),
      });
    },

    /**
     * Get contact by ID
     */
    get: async (contactId: string): Promise<GHLContact> => {
      return this.request<GHLContact>(`/contacts/${contactId}`);
    },

    /**
     * Search contacts by email
     */
    searchByEmail: async (email: string): Promise<GHLContact[]> => {
      const params = new URLSearchParams({
        locationId: this.config.locationId,
        query: email,
      });
      return this.request<GHLContact[]>(`/contacts/search?${params}`);
    },

    /**
     * Add tags to a contact
     */
    addTags: async (contactId: string, tags: string[]): Promise<void> => {
      await this.request(`/contacts/${contactId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tags }),
      });
    },

    /**
     * Update custom fields for a contact
     */
    updateCustomFields: async (
      contactId: string,
      customFields: Record<string, any>
    ): Promise<void> => {
      await this.request(`/contacts/${contactId}`, {
        method: 'PUT',
        body: JSON.stringify({ customFields }),
      });
    },
  };

  /**
   * Calendar/Appointments API
   */
  calendars = {
    /**
     * Create an appointment
     */
    createAppointment: async (
      appointment: GHLAppointment
    ): Promise<GHLAppointment> => {
      return this.request<GHLAppointment>('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          ...appointment,
          locationId: this.config.locationId,
        }),
      });
    },

    /**
     * Get available time slots for a calendar
     */
    getAvailableSlots: async (
      calendarId: string,
      startDate: string,
      endDate: string
    ): Promise<{ slots: { startTime: string; endTime: string }[] }> => {
      const params = new URLSearchParams({
        calendarId,
        startDate,
        endDate,
      });
      return this.request(`/calendars/slots?${params}`);
    },

    /**
     * Update appointment status
     */
    updateAppointmentStatus: async (
      appointmentId: string,
      status: GHLAppointment['appointmentStatus']
    ): Promise<void> => {
      await this.request(`/appointments/${appointmentId}`, {
        method: 'PUT',
        body: JSON.stringify({ appointmentStatus: status }),
      });
    },
  };

  /**
   * Opportunities (Pipeline) API
   */
  opportunities = {
    /**
     * Create an opportunity
     */
    create: async (opportunity: GHLOpportunity): Promise<GHLOpportunity> => {
      return this.request<GHLOpportunity>('/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          ...opportunity,
          locationId: this.config.locationId,
        }),
      });
    },

    /**
     * Update opportunity stage
     */
    updateStage: async (
      opportunityId: string,
      pipelineStageId: string
    ): Promise<void> => {
      await this.request(`/opportunities/${opportunityId}`, {
        method: 'PUT',
        body: JSON.stringify({ pipelineStageId }),
      });
    },

    /**
     * Update opportunity status
     */
    updateStatus: async (
      opportunityId: string,
      status: GHLOpportunity['status']
    ): Promise<void> => {
      await this.request(`/opportunities/${opportunityId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
  };

  /**
   * Workflows API
   */
  workflows = {
    /**
     * Trigger a workflow for a contact
     */
    trigger: async (workflowId: string, contactId: string): Promise<void> => {
      await this.request('/workflows/trigger', {
        method: 'POST',
        body: JSON.stringify({
          workflowId,
          contactId,
        }),
      });
    },
  };
}

/**
 * Factory function to create GHL client from environment variables
 */
export function createGHLClient(config?: Partial<GHLClientConfig>): GHLClient {
  return new GHLClient({
    apiKey: config?.apiKey || process.env.GHL_API_KEY || '',
    locationId: config?.locationId || process.env.GHL_LOCATION_ID || '',
    apiVersion: config?.apiVersion || process.env.GHL_API_VERSION,
  });
}

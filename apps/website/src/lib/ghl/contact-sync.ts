/**
 * GoHighLevel Contact Sync Service
 *
 * Syncs contacts across all 6 ACT project sub-accounts using Supabase as master database.
 * Triggered by GHL webhooks when contacts are created/updated in any sub-account.
 *
 * Architecture:
 * 1. Webhook receives contact create/update event from GHL sub-account
 * 2. Service checks if contact exists in Supabase master database (by email)
 * 3. If new: Create master record + project mapping + sync to ACT Hub GHL
 * 4. If exists: Update master record + add new project mapping if needed
 * 5. Update ACT Hub GHL contact with unified data
 *
 * Benefits:
 * - $0/month (vs $5-10/month for GHL workflow executions)
 * - Bidirectional sync (updates in any project sync to all projects)
 * - Full control over sync logic and error handling
 * - Persistent audit trail in Supabase
 * - Queryable master contact database for dashboards
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GHLClient } from './client';
import {
  ACTProject,
  PROJECT_NAMES,
  ContactSyncEvent,
  ACTContactMaster,
  ACTHubCustomFields,
  ContactSyncError,
  GHLContact,
  GHLProjectConfig,
} from './types';

/**
 * Database types (from Supabase migration)
 */

export interface GHLContactMasterRow {
  id: string;
  master_contact_id: string;
  email: string;
  phone: string | null;
  name: string;
  first_name: string | null;
  last_name: string | null;
  active_projects: string[]; // act_project[] in Postgres
  primary_project: string; // act_project in Postgres
  total_interactions: number;
  last_interaction_date: string;
  last_interaction_project: string;
  created_at: string;
  updated_at: string;
  address_city: string | null;
  address_state: string | null;
  address_country: string | null;
  address_postal_code: string | null;
  company_name: string | null;
  tags: string[];
  location_id: string;
}

export interface GHLContactProjectMappingRow {
  id: string;
  master_contact_id: string;
  project: string;
  project_contact_id: string;
  project_location_id: string;
  first_seen_at: string;
  last_seen_at: string;
  interaction_count: number;
  project_tags: string[];
}

export interface GHLContactSyncEventRow {
  id: string;
  event_type: string;
  source_project: string;
  source_location_id: string;
  source_contact_id: string;
  master_contact_id: string | null;
  event_payload: any;
  processed: boolean;
  processing_error: string | null;
  retry_count: number;
  event_timestamp: string;
  received_at: string;
  processed_at: string | null;
  webhook_id: string | null;
  webhook_signature: string | null;
}

export interface GHLProjectConfigRow {
  id: string;
  project: string;
  location_id: string;
  api_key: string;
  project_name: string;
  project_domain: string;
  sync_enabled: boolean;
  webhook_url: string | null;
  webhook_secret: string | null;
  total_contacts: number;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Contact Sync Service Configuration
 */
export interface ContactSyncConfig {
  supabaseUrl: string;
  supabaseServiceKey: string; // Use service role key for RLS bypass
  actHubLocationId: string; // ACT Hub GHL location ID (master sub-account)
  actHubApiKey: string; // ACT Hub GHL API key
}

/**
 * Contact Sync Service
 */
export class ContactSyncService {
  private supabase: SupabaseClient;
  private actHubClient: GHLClient;
  private config: ContactSyncConfig;

  constructor(config: ContactSyncConfig) {
    this.config = config;

    // Supabase client with service role (bypasses RLS)
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // GHL client for ACT Hub (master sub-account)
    this.actHubClient = new GHLClient({
      apiKey: config.actHubApiKey,
      locationId: config.actHubLocationId,
    });
  }

  /**
   * Main entry point: Process contact sync event from webhook
   */
  async processContactEvent(event: ContactSyncEvent): Promise<void> {
    console.log(`[ContactSync] Processing event: ${event.eventType} from ${event.sourceProject}`);

    // Log event to Supabase
    const eventLog = await this.logEvent(event);

    try {
      if (event.eventType === 'create' || event.eventType === 'update') {
        await this.syncContact(event);
      } else if (event.eventType === 'delete') {
        await this.deleteContact(event);
      }

      // Mark event as processed
      await this.markEventProcessed(eventLog.id, true);

      console.log(`[ContactSync] Event ${eventLog.id} processed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ContactSync] Error processing event:`, error);

      // Log error and increment retry count
      await this.markEventProcessed(eventLog.id, false, errorMessage);

      // Re-throw for webhook retry logic
      throw new ContactSyncError(
        `Failed to sync contact: ${errorMessage}`,
        event.sourceProject,
        event.sourceContactId,
        error
      );
    }
  }

  /**
   * Sync contact (create or update)
   */
  private async syncContact(event: ContactSyncEvent): Promise<void> {
    const { contact, sourceProject } = event;

    if (!contact.email) {
      throw new Error('Contact email is required for syncing');
    }

    // Check if contact exists in master database
    const existing = await this.findMasterContact(contact.email);

    if (existing) {
      // Update existing master contact
      await this.updateMasterContact(existing, contact, event);
    } else {
      // Create new master contact
      await this.createMasterContact(contact, event);
    }
  }

  /**
   * Find master contact by email
   */
  private async findMasterContact(email: string): Promise<GHLContactMasterRow | null> {
    const { data, error } = await this.supabase
      .from('ghl_contacts_master')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected for new contacts)
      throw new Error(`Failed to query master contact: ${error.message}`);
    }

    return data;
  }

  /**
   * Create new master contact
   */
  private async createMasterContact(
    contact: GHLContact,
    event: ContactSyncEvent
  ): Promise<void> {
    console.log(`[ContactSync] Creating new master contact: ${contact.email}`);

    const { sourceProject, sourceLocationId, sourceContactId } = event;

    // 1. Create contact in ACT Hub GHL
    const actHubContact = await this.actHubClient.contacts.upsert({
      email: contact.email,
      phone: contact.phone,
      name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      firstName: contact.firstName,
      lastName: contact.lastName,
      address1: contact.address1,
      city: contact.city,
      state: contact.state,
      postalCode: contact.postalCode,
      country: contact.country,
      companyName: contact.companyName,
      tags: [
        ...(contact.tags || []),
        PROJECT_NAMES[sourceProject], // Add source project tag
      ],
      customFields: this.buildACTHubCustomFields({
        activeProjects: [sourceProject],
        primaryProject: sourceProject,
        totalInteractions: 1,
        lastInteractionDate: new Date().toISOString(),
        lastInteractionProject: sourceProject,
        projectContactIds: {
          [sourceProject]: sourceContactId,
        },
      }),
    });

    if (!actHubContact.id) {
      throw new Error('Failed to create ACT Hub contact - no ID returned');
    }

    // 2. Create master record in Supabase
    const { data: masterContact, error: masterError } = await this.supabase
      .from('ghl_contacts_master')
      .insert({
        master_contact_id: actHubContact.id,
        email: contact.email!.toLowerCase(),
        phone: contact.phone || null,
        name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        first_name: contact.firstName || null,
        last_name: contact.lastName || null,
        active_projects: [sourceProject],
        primary_project: sourceProject,
        total_interactions: 1,
        last_interaction_date: new Date().toISOString(),
        last_interaction_project: sourceProject,
        address_city: contact.city || null,
        address_state: contact.state || null,
        address_country: contact.country || null,
        address_postal_code: contact.postalCode || null,
        company_name: contact.companyName || null,
        tags: contact.tags || [],
        location_id: this.config.actHubLocationId,
      })
      .select()
      .single();

    if (masterError) {
      throw new Error(`Failed to create master contact: ${masterError.message}`);
    }

    // 3. Create project mapping
    await this.createProjectMapping(
      masterContact.id,
      sourceProject,
      sourceContactId,
      sourceLocationId,
      contact.tags || []
    );

    console.log(`[ContactSync] Master contact created: ${masterContact.id}`);
  }

  /**
   * Update existing master contact
   */
  private async updateMasterContact(
    existing: GHLContactMasterRow,
    contact: GHLContact,
    event: ContactSyncEvent
  ): Promise<void> {
    console.log(`[ContactSync] Updating master contact: ${existing.email}`);

    const { sourceProject, sourceLocationId, sourceContactId } = event;

    // Check if this project is already in active_projects
    const activeProjects = new Set(existing.active_projects);
    const isNewProject = !activeProjects.has(sourceProject);

    if (isNewProject) {
      activeProjects.add(sourceProject);
    }

    // Increment interaction count
    const totalInteractions = existing.total_interactions + 1;

    // Build updated project contact IDs
    const projectContactIds = await this.getProjectContactIds(existing.id);
    projectContactIds[sourceProject] = sourceContactId;

    // 1. Update ACT Hub GHL contact
    const actHubCustomFields = this.buildACTHubCustomFields({
      activeProjects: Array.from(activeProjects) as ACTProject[],
      primaryProject: existing.primary_project as ACTProject,
      totalInteractions,
      lastInteractionDate: new Date().toISOString(),
      lastInteractionProject: sourceProject,
      projectContactIds,
    });

    await this.actHubClient.contacts.updateCustomFields(
      existing.master_contact_id,
      actHubCustomFields
    );

    // Also update basic contact info if changed
    if (contact.name || contact.phone || contact.tags) {
      // Get existing ACT Hub contact to merge data
      const actHubContact = await this.actHubClient.contacts.get(existing.master_contact_id);

      await this.actHubClient.contacts.upsert({
        id: existing.master_contact_id,
        email: contact.email,
        phone: contact.phone || actHubContact.phone,
        name: contact.name || actHubContact.name,
        firstName: contact.firstName || actHubContact.firstName,
        lastName: contact.lastName || actHubContact.lastName,
        tags: Array.from(
          new Set([...(actHubContact.tags || []), ...(contact.tags || []), PROJECT_NAMES[sourceProject]])
        ),
      });
    }

    // 2. Update master record in Supabase
    const { error: updateError } = await this.supabase
      .from('ghl_contacts_master')
      .update({
        phone: contact.phone || existing.phone,
        name: contact.name || existing.name,
        first_name: contact.firstName || existing.first_name,
        last_name: contact.lastName || existing.last_name,
        active_projects: Array.from(activeProjects),
        total_interactions: totalInteractions,
        last_interaction_date: new Date().toISOString(),
        last_interaction_project: sourceProject,
        address_city: contact.city || existing.address_city,
        address_state: contact.state || existing.address_state,
        address_country: contact.country || existing.address_country,
        address_postal_code: contact.postalCode || existing.address_postal_code,
        company_name: contact.companyName || existing.company_name,
        tags: Array.from(new Set([...existing.tags, ...(contact.tags || [])])),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(`Failed to update master contact: ${updateError.message}`);
    }

    // 3. Create or update project mapping
    if (isNewProject) {
      await this.createProjectMapping(
        existing.id,
        sourceProject,
        sourceContactId,
        sourceLocationId,
        contact.tags || []
      );
    } else {
      await this.updateProjectMapping(existing.id, sourceProject, contact.tags || []);
    }

    console.log(`[ContactSync] Master contact updated: ${existing.id}`);
  }

  /**
   * Delete contact (soft delete - keep master record but remove from active_projects)
   */
  private async deleteContact(event: ContactSyncEvent): Promise<void> {
    console.log(`[ContactSync] Deleting contact: ${event.sourceContactId}`);

    const { sourceProject } = event;

    // Find project mapping to get master contact
    const { data: mapping } = await this.supabase
      .from('ghl_contact_project_mappings')
      .select('master_contact_id')
      .eq('project', sourceProject)
      .eq('project_contact_id', event.sourceContactId)
      .single();

    if (!mapping) {
      console.warn(`[ContactSync] No mapping found for deleted contact`);
      return;
    }

    // Remove project from active_projects
    const { data: master } = await this.supabase
      .from('ghl_contacts_master')
      .select('active_projects')
      .eq('id', mapping.master_contact_id)
      .single();

    if (master) {
      const activeProjects = master.active_projects.filter((p: string) => p !== sourceProject);

      await this.supabase
        .from('ghl_contacts_master')
        .update({
          active_projects: activeProjects,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mapping.master_contact_id);
    }

    // Delete project mapping
    await this.supabase
      .from('ghl_contact_project_mappings')
      .delete()
      .eq('master_contact_id', mapping.master_contact_id)
      .eq('project', sourceProject);

    console.log(`[ContactSync] Contact deleted from project: ${sourceProject}`);
  }

  /**
   * Create project mapping
   */
  private async createProjectMapping(
    masterContactId: string,
    project: ACTProject,
    projectContactId: string,
    projectLocationId: string,
    projectTags: string[]
  ): Promise<void> {
    const { error } = await this.supabase.from('ghl_contact_project_mappings').insert({
      master_contact_id: masterContactId,
      project,
      project_contact_id: projectContactId,
      project_location_id: projectLocationId,
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      interaction_count: 1,
      project_tags: projectTags,
    });

    if (error) {
      throw new Error(`Failed to create project mapping: ${error.message}`);
    }
  }

  /**
   * Update project mapping
   */
  private async updateProjectMapping(
    masterContactId: string,
    project: ACTProject,
    projectTags: string[]
  ): Promise<void> {
    const { error } = await this.supabase
      .from('ghl_contact_project_mappings')
      .update({
        last_seen_at: new Date().toISOString(),
        interaction_count: this.supabase.rpc('increment', { row_id: masterContactId }),
        project_tags: projectTags,
      })
      .eq('master_contact_id', masterContactId)
      .eq('project', project);

    if (error) {
      // Ignore increment errors - just update last_seen_at
      await this.supabase
        .from('ghl_contact_project_mappings')
        .update({
          last_seen_at: new Date().toISOString(),
          project_tags: projectTags,
        })
        .eq('master_contact_id', masterContactId)
        .eq('project', project);
    }
  }

  /**
   * Get project contact IDs for a master contact
   */
  private async getProjectContactIds(
    masterContactId: string
  ): Promise<Partial<Record<ACTProject, string>>> {
    const { data: mappings } = await this.supabase
      .from('ghl_contact_project_mappings')
      .select('project, project_contact_id')
      .eq('master_contact_id', masterContactId);

    if (!mappings) return {};

    const result: Partial<Record<ACTProject, string>> = {};
    for (const mapping of mappings) {
      result[mapping.project as ACTProject] = mapping.project_contact_id;
    }
    return result;
  }

  /**
   * Build ACT Hub custom fields from master contact data
   */
  private buildACTHubCustomFields(data: {
    activeProjects: ACTProject[];
    primaryProject: ACTProject;
    totalInteractions: number;
    lastInteractionDate: string;
    lastInteractionProject: ACTProject;
    projectContactIds: Partial<Record<ACTProject, string>>;
  }): Record<string, string> {
    return {
      active_projects: JSON.stringify(data.activeProjects),
      primary_project: data.primaryProject,
      total_interactions: data.totalInteractions.toString(),
      last_interaction_date: data.lastInteractionDate,
      last_interaction_project: data.lastInteractionProject,
      // Project-specific contact IDs (for reverse lookup)
      harvest_contact_id: data.projectContactIds[ACTProject.THE_HARVEST] || '',
      farm_contact_id: data.projectContactIds[ACTProject.ACT_FARM] || '',
      ledger_contact_id: data.projectContactIds[ACTProject.EMPATHY_LEDGER] || '',
      justicehub_contact_id: data.projectContactIds[ACTProject.JUSTICE_HUB] || '',
      goods_contact_id: data.projectContactIds[ACTProject.GOODS_ON_COUNTRY] || '',
    };
  }

  /**
   * Log event to Supabase
   */
  private async logEvent(event: ContactSyncEvent): Promise<GHLContactSyncEventRow> {
    const { data, error } = await this.supabase
      .from('ghl_contact_sync_events')
      .insert({
        event_type: `contact_${event.eventType}`,
        source_project: event.sourceProject,
        source_location_id: event.sourceLocationId,
        source_contact_id: event.sourceContactId,
        event_payload: event.contact,
        event_timestamp: event.timestamp,
        received_at: new Date().toISOString(),
        processed: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log event: ${error.message}`);
    }

    return data;
  }

  /**
   * Mark event as processed (success or failure)
   */
  private async markEventProcessed(
    eventId: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    await this.supabase
      .from('ghl_contact_sync_events')
      .update({
        processed: success,
        processing_error: error || null,
        processed_at: new Date().toISOString(),
        retry_count: this.supabase.rpc('increment', { row_id: eventId }),
      })
      .eq('id', eventId);
  }

  /**
   * Utility: Map GHL location ID to ACT project
   */
  static getProjectFromLocationId(locationId: string, configs: GHLProjectConfigRow[]): ACTProject | null {
    const config = configs.find((c) => c.location_id === locationId);
    return config ? (config.project as ACTProject) : null;
  }

  /**
   * Utility: Get all project configs from Supabase
   */
  async getProjectConfigs(): Promise<GHLProjectConfigRow[]> {
    const { data, error } = await this.supabase
      .from('ghl_project_configs')
      .select('*')
      .eq('sync_enabled', true);

    if (error) {
      throw new Error(`Failed to get project configs: ${error.message}`);
    }

    return data || [];
  }
}

/**
 * Factory function to create contact sync service from environment variables
 */
export function createContactSyncService(): ContactSyncService {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const actHubLocationId = process.env.GHL_ACT_HUB_LOCATION_ID;
  const actHubApiKey = process.env.GHL_ACT_HUB_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  if (!actHubLocationId || !actHubApiKey) {
    throw new Error('Missing ACT Hub GHL configuration');
  }

  return new ContactSyncService({
    supabaseUrl,
    supabaseServiceKey,
    actHubLocationId,
    actHubApiKey,
  });
}

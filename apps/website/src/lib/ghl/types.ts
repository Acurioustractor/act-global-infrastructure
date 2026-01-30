/**
 * GoHighLevel TypeScript Type Definitions
 *
 * Comprehensive types for GHL API v2
 */

// Core GHL entity types
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

export interface GHLLocation {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  website: string;
  timezone: string;
  settings: Record<string, any>;
}

export interface GHLUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  extension: string;
  permissions: {
    campaignsEnabled: boolean;
    campaignsReadOnly: boolean;
    contactsEnabled: boolean;
    workflowsEnabled: boolean;
    workflowsReadOnly: boolean;
    triggersEnabled: boolean;
    funnelsEnabled: boolean;
    websitesEnabled: boolean;
    opportunitiesEnabled: boolean;
    dashboardStatsEnabled: boolean;
    bulkRequestsEnabled: boolean;
    appointmentsEnabled: boolean;
    reviewsEnabled: boolean;
    onlineListingsEnabled: boolean;
    phoneCallEnabled: boolean;
    conversationsEnabled: boolean;
    assignedDataOnly: boolean;
    adwordsReportingEnabled: boolean;
    membershipEnabled: boolean;
    facebookAdsReportingEnabled: boolean;
    attributionsReportingEnabled: boolean;
    settingsEnabled: boolean;
    tagsEnabled: boolean;
    leadValueEnabled: boolean;
    marketingEnabled: boolean;
    agentReportingEnabled: boolean;
    botService: boolean;
    socialPlanner: boolean;
    bloggingEnabled: boolean;
    invoiceEnabled: boolean;
    affiliateManagerEnabled: boolean;
    contentAiEnabled: boolean;
    refundsEnabled: boolean;
    recordPaymentEnabled: boolean;
    cancelSubscriptionEnabled: boolean;
    paymentsEnabled: boolean;
    communitiesEnabled: boolean;
    exportPaymentsEnabled: boolean;
  };
  roles: {
    type: string;
    role: string;
    locationIds: string[];
  }[];
}

export interface GHLCustomField {
  id: string;
  name: string;
  fieldKey: string;
  dataType: 'TEXT' | 'LARGE_TEXT' | 'NUMERICAL' | 'PHONE' | 'MONETORY' | 'CHECKBOX' | 'SINGLE_OPTIONS' | 'MULTIPLE_OPTIONS' | 'DATE' | 'FILE_UPLOAD';
  position: number;
  options?: string[];
  placeholder?: string;
  model: 'contact' | 'opportunity';
}

export interface GHLTag {
  id: string;
  name: string;
  color: string;
  locationId: string;
}

export interface GHLPipeline {
  id: string;
  name: string;
  stages: GHLPipelineStage[];
  locationId: string;
}

export interface GHLPipelineStage {
  id: string;
  name: string;
  position: number;
  pipelineId: string;
}

export interface GHLCalendar {
  id: string;
  name: string;
  description: string;
  slug: string;
  widgetSlug: string;
  calendarType: 'round_robin_booking' | 'event' | 'class_booking' | 'collective_booking' | 'service_booking';
  eventTitle: string;
  eventColor: string;
  locationId: string;
  meetingLocation: string;
  slotDuration: number;
  slotInterval: number;
  slotBuffer: number;
  appoinmentPerSlot: number;
  appoinmentPerDay: number;
  openHours: {
    daysOfTheWeek: number[];
    hours: {
      openHour: number;
      openMinute: number;
      closeHour: number;
      closeMinute: number;
    }[];
  }[];
  enableRecurring: boolean;
  notifications: {
    type: 'email' | 'sms';
    shouldSendToContact: boolean;
    shouldSendToGuest: boolean;
    shouldSendToUser: boolean;
    shouldSendToSelectedUsers: boolean;
    selectedUsers: string[];
  }[];
  confirmationPage: {
    enabled: boolean;
    url: string;
    shouldRedirect: boolean;
  };
  pixelId: string;
  formId: string;
  stickyContact: boolean;
  isLivePaymentMode: boolean;
}

export interface GHLNote {
  id: string;
  body: string;
  contactId: string;
  userId: string;
  dateAdded: string;
}

export interface GHLTask {
  id: string;
  title: string;
  body: string;
  contactId: string;
  assignedTo: string;
  dueDate: string;
  completed: boolean;
  completedDate?: string;
}

export interface GHLConversation {
  id: string;
  contactId: string;
  locationId: string;
  type: 'SMS' | 'Email' | 'WhatsApp' | 'GMB' | 'IG' | 'FB' | 'Custom' | 'Live_Chat' | 'Call';
  status: 'unread' | 'read';
  lastMessageDate: string;
  lastMessageBody: string;
  unreadCount: number;
}

export interface GHLMessage {
  id: string;
  conversationId: string;
  type: 'SMS' | 'Email' | 'WhatsApp' | 'GMB' | 'IG' | 'FB' | 'Custom' | 'Live_Chat';
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed' | 'opened';
  body: string;
  from: string;
  to: string;
  dateAdded: string;
  attachments?: {
    type: string;
    url: string;
  }[];
}

export interface GHLWebhookEvent {
  type: 'ContactCreate' | 'ContactUpdate' | 'ContactDelete' |
        'AppointmentCreate' | 'AppointmentUpdate' | 'AppointmentDelete' |
        'OpportunityCreate' | 'OpportunityUpdate' | 'OpportunityStatusUpdate' | 'OpportunityStageUpdate' | 'OpportunityMonetaryValueUpdate' | 'OpportunityDelete' |
        'InboundMessage' | 'OutboundMessage' |
        'TaskCreate' | 'TaskUpdate' | 'TaskDelete' | 'TaskCompleted' |
        'NoteCreate' |
        'WorkflowCompleted';
  locationId: string;
  id: string;
  contact?: GHLContact;
  appointment?: GHLAppointment;
  opportunity?: GHLOpportunity;
  message?: GHLMessage;
  task?: GHLTask;
  note?: GHLNote;
}

export interface GHLFormSubmission {
  id: string;
  formId: string;
  contactId: string;
  locationId: string;
  submittedAt: string;
  data: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  page: {
    url: string;
    title: string;
  };
}

/**
 * ACT Ecosystem Contact Sync Types
 */

export enum ACTProject {
  ACT_HUB = 'act-hub',
  THE_HARVEST = 'the-harvest',
  ACT_FARM = 'act-farm',
  EMPATHY_LEDGER = 'empathy-ledger',
  JUSTICE_HUB = 'justice-hub',
  GOODS_ON_COUNTRY = 'goods-on-country',
}

export const PROJECT_NAMES: Record<ACTProject, string> = {
  [ACTProject.ACT_HUB]: 'ACT Hub',
  [ACTProject.THE_HARVEST]: 'The Harvest',
  [ACTProject.ACT_FARM]: 'ACT Farm',
  [ACTProject.EMPATHY_LEDGER]: 'Empathy Ledger',
  [ACTProject.JUSTICE_HUB]: 'JusticeHub',
  [ACTProject.GOODS_ON_COUNTRY]: 'Goods on Country',
};

export const PROJECT_DOMAINS: Record<ACTProject, string> = {
  [ACTProject.ACT_HUB]: 'act.place',
  [ACTProject.THE_HARVEST]: 'theharvest.org.au',
  [ACTProject.ACT_FARM]: 'actfarm.org.au',
  [ACTProject.EMPATHY_LEDGER]: 'empathyledger.com',
  [ACTProject.JUSTICE_HUB]: 'justicehub.org.au',
  [ACTProject.GOODS_ON_COUNTRY]: 'goodsoncountry.com',
};

/**
 * Master contact record stored in ACT Hub + Redis cache
 */
export interface ACTContactMaster {
  masterContactId: string; // Contact ID in ACT Hub sub-account
  email: string;
  phone?: string;
  name: string;
  activeProjects: ACTProject[]; // Which projects this contact is active in
  primaryProject: ACTProject; // First project they engaged with
  totalInteractions: number; // Count of activities across all projects
  lastInteractionDate: string;
  lastInteractionProject: ACTProject;
  projectContactIds: Partial<Record<ACTProject, string>>; // Map of project → contact ID
  createdAt: string;
  updatedAt: string;
}

/**
 * Contact sync event from webhook
 */
export interface ContactSyncEvent {
  sourceProject: ACTProject;
  sourceLocationId: string;
  sourceContactId: string;
  contact: GHLContact;
  eventType: 'create' | 'update' | 'delete';
  timestamp: string;
}

/**
 * Custom fields for ACT Hub master contact
 */
export interface ACTHubCustomFields {
  active_projects: string; // JSON array: ["the-harvest", "act-farm"]
  primary_project: string; // First project: "the-harvest"
  total_interactions: string; // Number as string: "3"
  last_interaction_date: string; // ISO date: "2025-12-24T10:30:00Z"
  last_interaction_project: string; // "empathy-ledger"
  // Project-specific contact IDs (for reverse lookup)
  harvest_contact_id?: string;
  farm_contact_id?: string;
  ledger_contact_id?: string;
  justicehub_contact_id?: string;
  goods_contact_id?: string;
}

/**
 * Project configuration
 */
export interface GHLProjectConfig {
  project: ACTProject;
  locationId: string;
  apiKey: string;
  domain: string;
  name: string;
}

/**
 * Contact sync error
 */
export class ContactSyncError extends Error {
  constructor(
    message: string,
    public sourceProject: ACTProject,
    public contactId: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ContactSyncError';
  }
}

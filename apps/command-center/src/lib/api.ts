const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`)
  }

  return response.json()
}

// Health check
export async function getHealth() {
  return fetchApi<{ status: string; timestamp: string }>('/api/health')
}

// Data Freshness
export interface DataFreshnessSource {
  table: string
  label: string
  status: 'ok' | 'warn' | 'critical'
  age_hours: number | null
  row_count: number | null
  note: string
}

export interface DataFreshnessResponse {
  generated_at: string
  summary: { healthy: number; warning: number; critical: number; total: number }
  sources: DataFreshnessSource[]
}

export async function getDataFreshness() {
  return fetchApi<DataFreshnessResponse>('/api/health/data-freshness')
}

// Agents & Proposals
export interface Proposal {
  id: string
  agent_name: string
  action_type: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'approved' | 'rejected' | 'executed'
  context: Record<string, unknown>
  created_at: string
  reviewed_at?: string
  executed_at?: string
}

export async function getProposals(status?: string) {
  const params = status ? `?status=${status}` : ''
  return fetchApi<{ proposals: Proposal[] }>(`/api/agent/proposals${params}`)
}

export async function approveProposal(id: string) {
  return fetchApi<{ success: boolean }>(`/api/proposals/${id}/approve`, {
    method: 'POST',
  })
}

export async function rejectProposal(id: string) {
  return fetchApi<{ success: boolean }>(`/api/proposals/${id}/reject`, {
    method: 'POST',
  })
}

export async function executeProposal(id: string) {
  return fetchApi<{ success: boolean }>(`/api/proposals/${id}/execute`, {
    method: 'POST',
  })
}

// Relationships
export interface Contact {
  id: string
  ghl_contact_id?: string
  // API returns contact_name, not name
  name?: string
  contact_name?: string
  email?: string
  contact_email?: string
  phone?: string
  company?: string
  // Temperature is now a number 0-100
  temperature: number | 'hot' | 'warm' | 'cool'
  temperature_trend?: string | null
  lcaa_stage?: string
  total_touchpoints?: number
  inbound_count?: number
  outbound_count?: number
  last_contact_date?: string
  last_contact_at?: string
  days_since_contact?: number
  tags?: string[]
  source?: string
  suggested_actions?: string | null
}

// Helper to get contact name from API response
export function getContactName(contact: Contact): string {
  return contact.contact_name || contact.name || 'Unknown'
}

// Helper to get temperature category from numeric value
export function getTemperatureCategory(temp: number | string): 'hot' | 'warm' | 'cool' {
  if (typeof temp === 'string') return temp as 'hot' | 'warm' | 'cool'
  if (temp >= 70) return 'hot'
  if (temp >= 40) return 'warm'
  return 'cool'
}

export interface RelationshipHealth {
  hot: number
  warm: number
  cool: number
  total: number
  needsAttention?: number
  overdue?: number
  byStage?: {
    listen: number
    connect: number
    act: number
    amplify: number
  }
}

export async function getRelationshipHealth() {
  return fetchApi<RelationshipHealth>('/api/relationships/health')
}

export async function getRelationships(params?: {
  limit?: number
  temperature?: string
  search?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.temperature) searchParams.set('filter', params.temperature)
  if (params?.search) searchParams.set('search', params.search)

  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return fetchApi<{ relationships: Contact[] }>(`/api/relationships/list${query}`)
}

export async function getOverdueFollowups() {
  return fetchApi<{ contacts: Contact[] }>('/api/relationships/overdue')
}

export async function getAttentionNeeded() {
  return fetchApi<{ contacts: Contact[] }>('/api/relationships/attention')
}

export async function getOverdueContacts() {
  return fetchApi<{ overdue: Contact[]; total: number }>('/api/relationships/overdue')
}

// Extended contact with project info
export interface ContactWithProjects extends Contact {
  projects?: string[]
  ghl_tags?: string[]
}

export async function getContactsWithProjects(limit = 50) {
  return fetchApi<{ relationships: ContactWithProjects[] }>(`/api/relationships/list?limit=${limit}`)
}

// Contact Detail types
export interface ContactDetail extends Contact {
  ghl_contact_id?: string
  contact_created_at?: string
  created_at?: string
  updated_at?: string
}

export interface Interaction {
  id: string
  subject: string
  channel: string
  direction: string
  contact_name?: string
  snippet: string
  occurred_at: string
  sentiment?: string
  project_code?: string
}

export interface Meeting {
  id: string
  title: string
  start_time: string
  end_time?: string
  location?: string
  description?: string
  status?: string
  ghl_contact_ids?: string[]
}

export interface Opportunity {
  id: string
  name: string
  pipeline_name: string
  stage_name: string
  monetary_value?: number
  status: string
  created_at: string
  updated_at: string
}

export async function getContactDetail(id: string) {
  return fetchApi<{ contact: ContactDetail }>(`/api/contacts/${id}`)
}

export async function updateContactTag(id: string, action: 'add' | 'remove', tag: string) {
  return fetchApi<{ ok: boolean }>(`/api/contacts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(action === 'add' ? { addTag: tag } : { removeTag: tag }),
  })
}

export async function getContactInteractions(id: string, params?: { limit?: number; offset?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))
  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return fetchApi<{ interactions: Interaction[]; total: number }>(`/api/contacts/${id}/interactions${query}`)
}

export async function getContactMeetings(id: string) {
  return fetchApi<{ meetings: Meeting[]; upcoming: Meeting[]; past: Meeting[] }>(`/api/contacts/${id}/meetings`)
}

export async function getContactOpportunities(id: string) {
  return fetchApi<{ opportunities: Opportunity[] }>(`/api/contacts/${id}/opportunities`)
}

// Projects
export interface Project {
  id?: string
  code: string
  name: string
  description?: string
  status?: string
  lcaa_stage?: 'listen' | 'curiosity' | 'action' | 'art'
  health_score?: number
  healthScore?: number  // API returns camelCase
  last_activity?: string
  contacts?: number
  opportunities?: Array<{
    type: string
    priority: string
    title: string
    description: string
    action: string
  }>
}

export async function getProjects() {
  return fetchApi<{ projects: Project[] }>('/api/projects/enriched')
}

export async function getNotionProjects() {
  return fetchApi<{ projects: Project[] }>('/api/projects/notion')
}

// Notion project with full data
export interface NotionProject {
  id: string
  notion_id: string
  name: string
  status: string
  type: string
  budget: number | null
  progress: number | null
  tags: string[]
  data: {
    id: string
    name: string
    lead: string
    status: string
    budget: number
    themes: string[]
    endDate: string | null
    startDate: string | null
    notionUrl: string
    description: string
    coverImage: string | null
    projectLead: {
      id: string
      name: string
      type: string
      avatarUrl: string | null
    } | null
    projectType: string
    totalFunding: number
    revenueActual: number
    revenuePotential: number
    nextMilestoneDate: string | null
    relatedActions: string[]
    relatedOpportunities: string[]
    relatedOrganisations: string[]
  }
  last_synced: string
  updated_at: string
}

export async function getNotionProjectsRaw() {
  return fetchApi<{ projects: NotionProject[] }>('/api/projects/notion')
}

export async function getProjectByCode(code: string) {
  // Get enriched project data
  const enriched = await fetchApi<{ projects: Array<{
    code: string
    name: string
    healthScore: number
    contacts: number
    opportunities: Array<{
      type: string
      priority: string
      title: string
      description: string
      action: string
    }>
    relationships: Record<string, unknown>
    recentActivity: unknown[]
  }> }>('/api/projects/enriched')

  const project = enriched.projects.find(p =>
    p.code?.toLowerCase() === code.toLowerCase() ||
    p.name?.toLowerCase().replace(/\s+/g, '-') === code.toLowerCase()
  )

  return project || null
}

export async function getProjectContacts(projectCode: string, limit = 20) {
  // Get contacts tagged with the project
  return fetchApi<{ relationships: Contact[] }>(`/api/relationships/list?limit=${limit}&project=${projectCode}`)
}

// Calendar
export interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time?: string
  location?: string
  description?: string
  project_code?: string
  is_all_day?: boolean
  status?: string
  link?: string
  attendees?: Array<{ email: string; name?: string; response_status?: string }>
}

export async function getCalendarEvents(date?: string) {
  if (date) {
    // Send start/end for the specific day
    const start = `${date}T00:00:00`
    const end = `${date}T23:59:59`
    return fetchApi<{ events: CalendarEvent[] }>(`/api/calendar/events?start=${start}&end=${end}`)
  }
  return fetchApi<{ events: CalendarEvent[] }>(`/api/calendar/events`)
}

// Infrastructure
export interface InfrastructureHealth {
  overall_score: number
  connectors: Array<{
    name: string
    status: 'connected' | 'error' | 'unknown'
    last_sync?: string
  }>
  agents: Array<{
    name: string
    status: 'active' | 'idle' | 'error'
    last_heartbeat?: string
  }>
}

export async function getInfrastructureHealth() {
  return fetchApi<InfrastructureHealth>('/api/infrastructure/health')
}

export async function getConnectors() {
  const data = await fetchApi<Array<{ name: string; type: string; status: string; required: string[]; missingVars: string[] }>>('/api/connectors')
  return { connectors: data }
}

export async function getAgents() {
  return fetchApi<{ agents: Array<{ id: string; name: string; type: string; status: string }> }>('/api/agents')
}

// Search
export async function search(query: string) {
  return fetchApi<{ results: Array<{ type: string; id: string; name: string; score: number }> }>(`/api/search?q=${encodeURIComponent(query)}`)
}

// Proposal stats
export async function getProposalStats() {
  return fetchApi<{
    pending: number
    approved: number
    rejected: number
    executed: number
  }>('/api/proposals/stats')
}

// Bookkeeping/Finance
export interface BookkeepingProgress {
  summary: {
    totalIncome: number
    totalExpenses: number
    netPosition: number
    receivables: { total: number; count: number }
    payables: { total: number; count: number }
    monthlyIncome: number
    monthlyExpenses: number
  }
  monthlyTrend: Array<{ month: string; income: number; expenses: number }>
  topIncomeContacts: Array<{ name: string; total: number }>
  topExpenseContacts: Array<{ name: string; total: number }>
  overdueInvoices: {
    count: number
    total: number
    invoices: Array<{
      invoice_number: string
      contact_name: string
      amount_due: number
      due_date: string
    }>
  }
  outstandingReceivables: Array<{
    invoice_number: string
    contact_name: string
    amount_due: number
    due_date: string
    overdue: boolean
  }>
}

export async function getBookkeepingProgress() {
  return fetchApi<BookkeepingProgress>('/api/bookkeeping/progress')
}

export async function getXeroInvoices() {
  return fetchApi<{ invoices: Array<{
    id: string
    invoice_number: string
    type: string
    contact_name: string
    total: number
    amount_due: number
    status: string
    due_date: string
  }> }>('/api/xero/invoices')
}

export async function getXeroTransactions(limit = 20) {
  return fetchApi<{ transactions: Array<{
    id: string
    date: string
    description: string
    amount: number
    type: string
    account_name: string
  }> }>(`/api/xero/transactions?limit=${limit}`)
}

// GHL Pipelines and Opportunities
export interface GHLPipeline {
  id: string
  ghl_id: string
  name: string
  stages: Array<{ id: string; name: string }>
}

export interface GHLOpportunity {
  id: string
  name: string
  contact_name?: string
  pipeline_name: string
  stage_name: string
  monetary_value?: number
  status: string
}

export async function getGHLPipelines() {
  return fetchApi<{ pipelines: GHLPipeline[] }>('/api/ghl/pipelines')
}

export async function getGHLOpportunities(pipelineId?: string) {
  const params = pipelineId ? `?pipeline=${pipelineId}` : ''
  return fetchApi<{ opportunities: GHLOpportunity[] }>(`/api/ghl/opportunities${params}`)
}

// Agent Insights (Sprint 3)
export interface AgentInsight {
  id: string
  agent_name: string
  insight_type: 'discovery' | 'alert' | 'suggestion' | 'pattern'
  title: string
  description: string
  data?: Record<string, unknown>
  created_at: string
}

export async function getAgentInsights(limit = 10) {
  // Try to get from proposals with executed status as "insights"
  // or from a dedicated insights endpoint if available
  try {
    return await fetchApi<{ insights: AgentInsight[] }>(`/api/agent/insights?limit=${limit}`)
  } catch {
    // Fallback: derive insights from recent proposals
    const proposals = await getProposals()
    const insights: AgentInsight[] = proposals.proposals.slice(0, limit).map(p => ({
      id: p.id,
      agent_name: p.agent_name,
      insight_type: p.action_type === 'alert' ? 'alert' : 'suggestion',
      title: p.title,
      description: p.description,
      data: p.context,
      created_at: p.created_at,
    }))
    return { insights }
  }
}

// Contact Actions (Sprint 3)
export async function markContactedToday(contactId: string) {
  return fetchApi<{ success: boolean }>(`/api/relationships/${contactId}/contacted`, {
    method: 'POST',
    body: JSON.stringify({ date: new Date().toISOString() }),
  })
}

export async function snoozeContact(contactId: string, days: number) {
  return fetchApi<{ success: boolean }>(`/api/relationships/${contactId}/snooze`, {
    method: 'POST',
    body: JSON.stringify({ days }),
  })
}

export async function addContactNote(contactId: string, note: string) {
  return fetchApi<{ success: boolean }>(`/api/relationships/${contactId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })
}

// Email
export interface Email {
  id: string
  subject: string
  from: string
  snippet: string
  date: string
  direction: string
  isReply: boolean
  requiresResponse: boolean
  read: boolean
}

export async function getRecentEmails(limit = 10) {
  return fetchApi<{ success: boolean; emails: Email[] }>(`/api/emails/recent?limit=${limit}`)
}

export async function getEmailStats() {
  return fetchApi<{ success: boolean; unread: number; requiresResponse: number; todayCount: number }>('/api/emails/stats')
}

// ─── Project Summaries ───────────────────────────────────────────

export interface ProjectSummary {
  projectCode: string
  text: string
  dataSources: string[]
  stats: Record<string, number>
  generatedAt: string
}

export async function getProjectSummary(code: string) {
  return fetchApi<{ summary: ProjectSummary | null }>(`/api/projects/${encodeURIComponent(code)}/summary`)
}

// ─── Relationship Nudges ─────────────────────────────────────────

export interface RelationshipNudge {
  id: string
  ghlId: string
  name: string
  email?: string
  company?: string
  engagementStatus: string
  lastContactDate: string
  daysSinceContact: number | null
  projects: string[]
  tags: string[]
  lastContext?: {
    subject: string
    summary: string
    channel: string
    direction: string
    date: string
  } | null
  suggestedAction: string
}

export async function getRelationshipNudges(limit = 5) {
  return fetchApi<{ nudges: RelationshipNudge[]; total: number }>(`/api/relationships/nudges?limit=${limit}`)
}

// ─── Calendar Notes ──────────────────────────────────────────────

export async function saveCalendarNote(data: {
  eventId: string
  eventTitle: string
  note: string
  attendees?: string[]
}) {
  return fetchApi<{ success: boolean; id: string }>('/api/calendar/note', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ─── Weekly Briefing ─────────────────────────────────────────────

export interface WeeklyDigest {
  text: string
  stats: Record<string, number>
  generatedAt: string
  dataSources: string[]
}

export interface ProgramSummary {
  area: string
  text: string
  projectCodes: string[]
  stats: Record<string, unknown>
  generatedAt: string
}

export async function getWeeklyBriefing() {
  return fetchApi<{
    success: boolean
    digest: WeeklyDigest | null
    programSummaries: ProgramSummary[]
  }>('/api/briefing/weekly')
}

// Wiki / Compendium
export interface WikiSection {
  id: string
  title: string
  pages: Array<{
    name: string
    path: string
    title: string
  }>
}

export interface WikiPage {
  path: string
  title: string
  frontmatter: Record<string, string>
  content: string
}

export interface WikiSearchResult {
  path: string
  title: string
  snippet: string
  section: string
}

export async function getWikiStructure() {
  return fetchApi<{ sections: WikiSection[] }>('/api/wiki/structure')
}

export async function getWikiPage(path: string) {
  return fetchApi<WikiPage>(`/api/wiki/page?path=${encodeURIComponent(path)}`)
}

export async function searchWiki(query: string) {
  return fetchApi<{ results: WikiSearchResult[] }>(`/api/wiki/search?q=${encodeURIComponent(query)}`)
}

// Ecosystem - Sites and Platform Health
export interface EcosystemSite {
  id: string
  name: string
  slug: string
  url: string
  description: string
  category: string
  status: 'healthy' | 'degraded' | 'critical'
  health_score: number
  health_trend: string
  response_time_ms: number
  last_check_at: string
  ssl_expires_at?: string
  github_repo?: string
  vercel_project_name?: string
}

export interface EcosystemData {
  categories: Record<string, { name: string; sites: EcosystemSite[] }>
  sites: EcosystemSite[]
  health: { healthy: number; total: number; percentage: number }
}

export async function getEcosystem() {
  return fetchApi<EcosystemData>('/api/ecosystem')
}

// Ecosystem site details
export interface EcosystemSiteDetails extends EcosystemSite {
  tech_stack?: Record<string, unknown>
  supabase_project?: string
  display_order?: number
  created_at?: string
  updated_at?: string
}

export interface HealthCheckRecord {
  id: string
  site_id: string
  checked_at: string
  health_score: number
  health_status: string
  http_status: number
  http_response_time_ms: number
  ssl_valid: boolean
  ssl_expires_at?: string
  vercel_deployment_status?: string
  github_last_commit_at?: string
  github_open_prs?: number
  github_security_alerts?: number
}

export interface DeploymentRecord {
  id: string
  site_id: string
  deployment_id: string
  status: string
  created_at: string
  url?: string
  source?: string
  commit_sha?: string
  commit_message?: string
}

export async function getEcosystemSiteDetails(slug: string) {
  return fetchApi<{ site: EcosystemSiteDetails; latestCheck?: HealthCheckRecord }>(`/api/ecosystem/${slug}/details`)
}

export async function getEcosystemHealthHistory(slug: string, limit = 30) {
  return fetchApi<{ history: HealthCheckRecord[] }>(`/api/ecosystem/${slug}/health-history?limit=${limit}`)
}

export async function getEcosystemDeployments(slug: string, limit = 10) {
  return fetchApi<{ deployments: DeploymentRecord[] }>(`/api/ecosystem/${slug}/deployments?limit=${limit}`)
}

export async function triggerHealthCheck(slug: string) {
  return fetchApi<{ success: boolean; check?: HealthCheckRecord }>(`/api/ecosystem/${slug}/check`, { method: 'POST' })
}

export async function triggerFullHealthCheck() {
  return fetchApi<{ success: boolean; results?: Array<{ site: string; score: number }> }>('/api/ecosystem/check-all', { method: 'POST' })
}

// Agents list (direct array)
export interface Agent {
  id: string
  name: string
  domain: string
  autonomy_level: number
  enabled: boolean
  status: string
  last_heartbeat: string
  current_task_id?: string
  current_task_title?: string
  completed_today: number
  pending_review: number
}

export async function getAgentsList() {
  return fetchApi<Agent[]>('/api/agents')
}

// ==========================================
// Finance - Subscriptions
// ==========================================

export interface Subscription {
  id: string
  name: string
  provider: string
  category: string
  billing_cycle: 'monthly' | 'annual' | 'quarterly' | 'one-time' | 'usage'
  cost_per_cycle: number
  currency: string
  renewal_date?: string
  status: 'active' | 'cancelled' | 'paused' | 'trial' | 'expired' | 'pending_migration'
  project_codes?: string[]
  notes?: string
  value_rating?: number
  users_count?: number
  login_url?: string
  account_email?: string
  payment_method?: string
  is_essential?: boolean
  created_at: string
  updated_at: string
}

export interface SubscriptionsSummary {
  total_monthly_aud: number
  total_monthly_usd: number
  total_yearly_aud: number
  total_yearly_usd: number
  count: number
  unassigned: number
  dueSoon: number
  byCategory: Record<string, number>
  topSubscriptions: Array<{
    id: string
    name: string
    provider: string
    amount: number
    billing_cycle: string
    project_codes?: string[]
  }>
}

export async function getSubscriptions(params?: { status?: string; category?: string }) {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.category) searchParams.set('category', params.category)
  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return fetchApi<{
    subscriptions: Subscription[]
    monthlyTotal: { AUD: number; USD: number }
    yearlyProjection: { AUD: number; USD: number }
    count: number
  }>(`/api/subscriptions${query}`)
}

export async function getSubscriptionsSummary() {
  return fetchApi<SubscriptionsSummary>('/api/subscriptions/summary')
}

export async function createSubscription(data: Partial<Subscription>) {
  return fetchApi<{ subscription: Subscription }>('/api/subscriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateSubscription(id: string, data: Partial<Subscription>) {
  return fetchApi<{ subscription: Subscription }>(`/api/subscriptions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// ==========================================
// Finance - Subscription Discovery
// ==========================================

export interface PendingSubscription {
  id: string
  vendor_name: string
  vendor_aliases: string[]
  detected_amount: number
  detected_currency: string
  detected_cycle: string
  discovery_source: string
  discovery_confidence: number
  first_seen_at: string
  last_seen_at: string
  payment_count: number
  avg_interval_days: number
  amount_variance_pct: number
  evidence: Array<{
    date: string
    type: string
    amount: number
    xero_id?: string
  }>
  status: 'pending' | 'confirmed' | 'rejected'
  resolved_subscription_id?: string
  resolved_at?: string
  resolved_by?: string
  created_at: string
  updated_at: string
}

export interface SubscriptionAlert {
  id: string
  vendor_name?: string
  name?: string
  provider?: string
  alert_status: 'possibly_cancelled' | 'price_change' | 'overdue_renewal'
  alert_priority: 'low' | 'medium' | 'high'
  last_payment_date?: string
  days_since_payment?: number
  missed_payments?: number
  expected_amount?: number
  actual_amount?: number
  variance_pct?: number
}

export async function getPendingSubscriptions() {
  return fetchApi<{
    pending: PendingSubscription[]
    count: number
  }>('/api/subscriptions/pending')
}

export async function getSubscriptionAlerts() {
  return fetchApi<{
    alerts: SubscriptionAlert[]
    count: number
  }>('/api/subscriptions/alerts')
}

export async function confirmPendingSubscription(id: string, overrides?: Partial<Subscription>) {
  return fetchApi<{ subscription: Subscription; pending: PendingSubscription }>(
    `/api/subscriptions/pending/${id}/confirm`,
    {
      method: 'POST',
      body: JSON.stringify(overrides || {}),
    }
  )
}

export async function rejectPendingSubscription(id: string, reason?: string) {
  return fetchApi<{ pending: PendingSubscription }>(
    `/api/subscriptions/pending/${id}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }
  )
}

export async function runSubscriptionDiscovery(params?: {
  sources?: string[]
  daysBack?: number
  autoUpdate?: boolean
}) {
  return fetchApi<{
    success: boolean
    discovered: number
    matched: number
    new_subscriptions: PendingSubscription[]
    price_changes: Array<{
      subscription: Subscription
      previous_amount: number
      new_amount: number
      variance_pct: number
    }>
    possibly_cancelled: Array<{
      subscription: Subscription
      last_payment_date: string
      days_since_payment: number
      missed_payments: number
    }>
  }>('/api/subscriptions/discover', {
    method: 'POST',
    body: JSON.stringify(params || {}),
  })
}

// ==========================================
// Finance - Receipts
// ==========================================

export interface Receipt {
  id: string
  vendor_name: string
  amount: number
  transaction_date: string
  status: 'pending' | 'email_suggested' | 'resolved' | 'deferred' | 'no_receipt_needed'
  category?: string
  source_type?: string
  source_id?: string
  match_confidence?: number
  suggested_email_subject?: string
  suggested_email_id?: string
  resolved_at?: string
  resolved_by?: string
  deferred_count?: number
}

export interface ReceiptScore {
  score: number
  pending: number
  resolvedThisWeek: number
  streak: number
  totalPoints: number
  achievements: string[]
}

export async function getUnmatchedReceipts(params?: { limit?: number; category?: string }) {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.category) searchParams.set('category', params.category)
  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return fetchApi<{ receipts: Receipt[]; count: number }>(`/api/receipts/unmatched${query}`)
}

export async function getReceiptScore() {
  return fetchApi<ReceiptScore>('/api/receipts/score')
}

export async function getReceiptSuggestions(txId: string) {
  return fetchApi<{
    receipt: Receipt
    suggestions: Array<{
      type: string
      subject: string
      confidence: number
      email_id?: string
    }>
  }>(`/api/receipts/suggestions/${txId}`)
}

export async function matchReceipt(receiptId: string, matchType?: string) {
  return fetchApi<{ receipt: Receipt }>('/api/receipts/match', {
    method: 'POST',
    body: JSON.stringify({ receiptId, matchType }),
  })
}

export async function skipReceipt(receiptId: string, reason?: string) {
  return fetchApi<{ receipt: Receipt }>('/api/receipts/skip', {
    method: 'POST',
    body: JSON.stringify({ receiptId, reason }),
  })
}

export async function getReceiptAchievements() {
  return fetchApi<{
    achievements: string[]
    totalPoints: number
    currentStreak: number
    bestStreak: number
  }>('/api/receipts/achievements')
}

export async function scanForReceipts(params?: { daysBack?: number; skipAI?: boolean }) {
  return fetchApi<{
    success: boolean
    detected: number
    saved: number
    skipped: number
    matched: number
    summary: {
      totalAmount: number
      byCategory: Record<string, { count: number; amount: number }>
    }
  }>('/api/receipts/scan', {
    method: 'POST',
    body: JSON.stringify(params || {}),
  })
}

export interface UnifiedSearchResult {
  source: 'xero' | 'gmail' | 'calendar'
  type: string
  id: string
  vendor?: string
  amount?: number
  date: string
  subject?: string
  title?: string
  from?: string
  has_attachment?: boolean
  relevance_score: number
}

export interface SuggestedMatch {
  transaction_id: string
  transaction_vendor: string
  transaction_amount: number
  email_id: string
  email_subject: string
  confidence: number
  reasons: string[]
}

export async function searchReceipts(params: {
  query: string
  sources?: string[]
  dateRange?: { from?: string; to?: string }
  amount?: { min?: number; max?: number }
}) {
  return fetchApi<{
    success: boolean
    results: UnifiedSearchResult[]
    suggested_matches: SuggestedMatch[]
    total_results: number
    sources_searched: string[]
  }>('/api/receipts/search', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function getReceiptCalendarContext(txDate: string, days = 7) {
  return fetchApi<{
    success: boolean
    events: Array<{
      id: string
      title: string
      start_time: string
      end_time?: string
      location?: string
    }>
    count: number
  }>(`/api/receipts/calendar-context/${txDate}?days=${days}`)
}

// ==========================================
// Finance - Project Spending & Codes
// ==========================================

export interface ProjectCode {
  code: string
  name: string
  category: string
  status: string
  priority?: string
}

export async function getProjectCodes() {
  return fetchApi<{
    codes: ProjectCode[]
    categories: Record<string, { icon: string; color: string }>
  }>('/api/project-codes')
}

// ─── Ecosystem Project Codes (from JSON config) ─────────────────

export interface EcosystemProjectCode {
  code: string
  name: string
  category: string
  ghlTag: string
  status: string
  priority: string
}

export async function getEcosystemProjectCodes() {
  return fetchApi<{ projects: EcosystemProjectCode[] }>('/api/ecosystem/project-codes')
}

// ─── All Contacts (cross-project) ───────────────────────────────

export interface AllContact {
  id: string
  ghl_id: string
  full_name: string
  email: string | null
  company_name: string | null
  tags: string[]
  projects: string[]
  days_since_contact: number | null
  last_email_subject: string | null
  last_email_date: string | null
  pipeline_value?: number
  opportunity_count?: number
}

export async function getAllContacts(params?: {
  search?: string
  project?: string
  untagged?: boolean
  company?: string
  engagement?: string
  noEmail?: boolean
  sort?: string
  limit?: number
  offset?: number
}) {
  const q = new URLSearchParams()
  if (params?.search) q.set('search', params.search)
  if (params?.project) q.set('project', params.project)
  if (params?.untagged) q.set('untagged', 'true')
  if (params?.company) q.set('company', params.company)
  if (params?.engagement) q.set('engagement', params.engagement)
  if (params?.noEmail) q.set('noEmail', 'true')
  if (params?.sort) q.set('sort', params.sort)
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.offset) q.set('offset', String(params.offset))
  return fetchApi<{ contacts: AllContact[]; total: number; companies: string[]; limit: number; offset: number }>(`/api/contacts/all?${q}`)
}

export async function bulkDeleteContacts(ids: string[]) {
  return fetchApi<{ ok: boolean; deleted: number }>('/api/contacts/all', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  })
}

export async function bulkUpdateContacts(ids: string[], updates: { companyName?: string }) {
  return fetchApi<{ ok: boolean; updated: number }>('/api/contacts/all', {
    method: 'PATCH',
    body: JSON.stringify({ ids, ...updates }),
  })
}

export interface DuplicateContact {
  ghl_id: string
  full_name: string
  email: string | null
  company_name: string | null
  tags: string[]
  created_at: string | null
  last_contact_date: string | null
  is_placeholder_email: boolean
}

export interface DuplicateSet {
  key: string
  match_type: 'email' | 'name'
  contacts: DuplicateContact[]
}

export async function getContactDuplicates() {
  return fetchApi<{
    duplicate_sets: DuplicateSet[]
    total_sets: number
    total_duplicates: number
    blank_contacts: DuplicateContact[]
    total_contacts: number
  }>('/api/contacts/duplicates')
}

export async function mergeContacts(keepId: string, mergeIds: string[]) {
  return fetchApi<{ ok: boolean; kept: string; merged: number; tags: string[] }>('/api/contacts/merge', {
    method: 'POST',
    body: JSON.stringify({ keepId, mergeIds }),
  })
}

export async function getSpendingByProject(months?: number) {
  const query = months ? `?months=${months}` : ''
  return fetchApi<{
    projects: Array<{ name: string; total: number; count: number }>
    total: number
    period: string
  }>(`/api/xero/spending-by-project${query}`)
}

// ==========================================
// Business Structure
// ==========================================

export interface BusinessData {
  entities: {
    pty: {
      name: string
      abn: string
      acn: string
      status: string
      registeredDate: string
      asicReviewDate: string
    }
  }
  trusts: Array<{
    name: string
    trustee: string
    shareholding: string
    status: string
    beneficiaries: string[]
    role: string
  }>
  moneyFlow: {
    founderTarget: number
    founderTargetLabel: string
    allocations: Array<{
      name: string
      type: string
      notes: string
    }>
    openQuestions: string[]
  }
  setupRoadmap: Array<{
    step: string
    status: string
    notes: string
  }>
  farmAsset: {
    ownership: string
    leaseStatus: string
    rdSiteUsage: boolean
    notes: string
  }
  rdTaxCredit: {
    status: string
    refundRate: string
    minSpend: number
    ausIndustryRegistered: boolean
    eligibleActivities: string[]
    trackingPlatform: string
    liveSpend?: {
      total: number
      byProject: Record<string, number>
      refundPotential: number
      aboveThreshold: boolean
    }
  }
  transactionCoverage?: {
    total: number
    tagged: number
    pct: number
  }
  missingReceipts?: Array<{
    id: string
    total: number
    date: string
    contact: string
  }>
  quarterReviewActions?: {
    receiptChase: { title: string; steps: Array<{ step: string; done: boolean }> }
    payrollSetup: { title: string; steps: Array<{ step: string; done: boolean }> }
    trustSetup: { title: string; steps: Array<{ step: string; done: boolean }> }
    rdRegistration: { title: string; steps: Array<{ step: string; done: boolean }> }
  }
  compliance: Array<{
    name: string
    dueDate: string
    status: string
    owner: string
  }>
}

export async function getBusinessOverview() {
  return fetchApi<BusinessData>('/api/business/overview')
}

// ==========================================
// Business Planning Tools
// ==========================================

export interface BalanceSheetCategory {
  items: Array<{ name: string; code: string; balance: number }>
  total: number
}

export interface BalanceSheetData {
  assets: BalanceSheetCategory
  liabilities: BalanceSheetCategory
  equity: BalanceSheetCategory
  revenue: BalanceSheetCategory
  expenses: BalanceSheetCategory
  cashPosition: number
  cashAccounts: Array<{ name: string; balance: number }>
  netAssets: number
}

export interface RevenueModelData {
  config: {
    founderTarget: number
    founders: number
    estimatedOperating: number
    estimatedProjectBudgets: number
    estimatedReinvestment: number
    notes: string
  }
  breakdown: {
    founderDistributions: number
    operating: number
    projectBudgets: number
    reinvestment: number
    requiredRevenue: number
  }
  current: {
    annualRevenue: number
    monthlyRevenue: number
    source: string
  }
  gap: number
  gapPercentage: number
}

export interface AdvisorResponse {
  question: string
  answer: string
  context: {
    dataSourcesUsed: string[]
    model: string
  }
}

export async function getBalanceSheet() {
  return fetchApi<BalanceSheetData>('/api/business/balance-sheet')
}

export async function getRevenueModel() {
  return fetchApi<RevenueModelData>('/api/business/revenue-model')
}

export async function askBusinessAdvisor(question: string) {
  return fetchApi<AdvisorResponse>('/api/business/advisor', {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
}

// ==========================================
// Phase 3: Pipeline, Project Financials, Reports
// ==========================================

// --- Project Financials ---

export interface ProjectFinancials {
  projectCode: string
  revenue: number
  expenses: number
  net: number
  receivable: number
  budget: number | null
  budgetUsed: number
  subscriptions: {
    count: number
    monthlyTotal: number
    items: Array<{ name: string; provider: string; monthlyCost: number }>
  }
  recentTransactions: Array<{
    id: string
    date: string
    description: string
    amount: number
    contactName?: string
  }>
  invoices: Array<{
    id: string
    number: string
    contact: string
    total: number
    due: number
    type: string
    status: string
  }>
  grants: Array<{
    name: string
    status: string
    amountRequested: number
    outcomeAmount: number | null
    provider: string | null
  }>
  monthlyTrend: Array<{
    month: string
    income: number
    expenses: number
  }>
  ecosystemActivity: {
    emailCount: number
    crmTouches: number
    contentCount: number
  }
  keyStakeholders: Array<{
    name: string
    company: string | null
    role: string | null
  }>
  fundraising: Array<{
    name: string
    amount: number
    status: string
  }>
  opportunities: Array<{
    id: string
    name: string
    pipeline: string
    stage: string
    value: number
    status: string
  }>
  healthScore: number | null
  dataCompleteness: {
    score: number
    sources: Record<string, boolean>
  }
}

export async function getProjectFinancials(code: string) {
  return fetchApi<ProjectFinancials>(`/api/projects/${encodeURIComponent(code)}/financials`)
}

// --- Pipeline Board ---

export interface PipelineOpportunity {
  id: string
  ghlId: string
  name: string
  contactName: string
  contactId: string
  value: number
  status: string
  createdAt: string
  updatedAt: string
  daysInStage: number
  projectCode?: string
  contactEmail?: string
}

export interface PipelineStage {
  id: string
  name: string
  opportunities: PipelineOpportunity[]
}

export interface PipelineBoard {
  id: string
  ghlId: string
  ghlLocationId: string
  name: string
  stages: PipelineStage[]
  totalValue: number
  openCount: number
}

export interface PipelineSummary {
  totalValue: number
  openDeals: number
  staleDeals: number
  staleDealsList: Array<{
    name: string
    contact: string
    value: number
    daysSinceUpdate: number
  }>
  wonThisMonth: number
  wonThisQuarter: number
  wonAllTime: number
  wonValueThisQuarter: number
  wonValueAllTime: number
  lostThisQuarter: number
  lostValueThisQuarter: number
  winRate: number
  avgDealSize: number
}

export interface PipelineBoardData {
  pipelines: PipelineBoard[]
  summary: PipelineSummary
}

export async function getPipelineBoard() {
  return fetchApi<PipelineBoardData>('/api/pipeline/board')
}

// --- Weekly Report ---

export interface WeeklyReport {
  reportDate: string
  weekStart: string
  sections: {
    financial: {
      cashPosition: { net?: number; receivable?: number; payable?: number }
      monthlySummary: { revenue?: number; expenses?: number }
      overdueInvoices: { count: number; total: number }
      bankBalance: number
    }
    pipeline: {
      totalValue: number
      openDeals: number
      staleDeals: number
      wonThisMonth: number
      avgDealSize: number
    }
    relationships: {
      total?: number
      hot?: number
      warm?: number
      cool?: number
      overdue?: number
    }
    compliance: Array<{
      name: string
      dueDate: string
      owner: string
      overdue: boolean
    }>
  }
}

export async function getWeeklyReport() {
  return fetchApi<WeeklyReport>('/api/reports/weekly')
}

// P&L Report
export interface PLAccountLine {
  name: string
  code: string
  balance: number
}

export interface ProfitLossReport {
  period: string
  revenue: { items: PLAccountLine[]; total: number }
  costOfSales: { items: PLAccountLine[]; total: number }
  grossProfit: number
  expenses: { items: PLAccountLine[]; total: number }
  netProfit: number
  grossMargin: number
  netMargin: number
}

export async function getProfitLoss() {
  return fetchApi<ProfitLossReport>('/api/reports/profit-loss')
}

// Cash Flow Forecast
export interface CashFlowMonth {
  month: string
  label: string
  inflow: number
  outflow: number
  net: number
  balance: number
}

export interface CashFlowForecast {
  currentBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  monthlySubscriptions: number
  monthlyNet: number
  receivable: number
  payable: number
  runway: number | null
  forecast: CashFlowMonth[]
}

export async function getCashFlowForecast() {
  return fetchApi<CashFlowForecast>('/api/reports/cash-flow-forecast')
}

// ─── Knowledge ────────────────────────────────────────────────────

export interface KnowledgeMeeting {
  id: string
  title: string
  summary?: string
  content?: string
  project_code?: string
  project_name?: string
  recorded_at?: string
  participants?: string[]
  topics?: string[]
  sentiment?: string
  action_required?: boolean
  importance?: string
  source_url?: string
  created_at?: string
}

export interface KnowledgeAction {
  id: string
  title: string
  content?: string
  project_code?: string
  project_name?: string
  recorded_at?: string
  participants?: string[]
  action_required?: boolean
  action_items?: string[]
  follow_up_date?: string
  importance?: string
  source_ref?: string
  created_at?: string
}

export interface KnowledgeDecision {
  id: string
  title: string
  content?: string
  project_code?: string
  project_name?: string
  recorded_at?: string
  participants?: string[]
  decision_status?: string
  decision_rationale?: string
  source_ref?: string
  created_at?: string
}

export interface KnowledgeSearchHit {
  id: string
  title: string
  content?: string
  knowledge_type?: string
  importance?: string
  similarity?: number
  vector_score?: number
  decay_score?: number
  graph_score?: number
  source_table?: string
  summary?: string
  project_code?: string
  project_name?: string
  recorded_at?: string
  participants?: string[]
  topics?: string[]
}

export interface KnowledgeSearchResult {
  success: boolean
  results: KnowledgeSearchHit[]
  count: number
  query: string
  mode: 'hybrid' | 'text' | 'none'
}

export interface KnowledgeMeetingsResponse {
  success: boolean
  meetings: KnowledgeMeeting[]
  count: number
  totalMeetings: number
  byProject: Record<string, number>
}

export interface KnowledgeActionsResponse {
  success: boolean
  actions: KnowledgeAction[]
  count: number
  totalActions: number
  overdueCount: number
  byProject: Record<string, number>
}

export interface KnowledgeDecisionsResponse {
  success: boolean
  decisions: KnowledgeDecision[]
  count: number
  totalDecisions: number
  byProject: Record<string, number>
  byStatus: Record<string, number>
}

export interface KnowledgeBriefingResponse {
  success: boolean
  period: { days: number; since: string }
  totals: { meetings: number; actions: number; decisions: number }
  recent: {
    meetings: KnowledgeMeeting[]
    meetingCount: number
    actions: KnowledgeAction[]
    actionCount: number
    decisions: KnowledgeDecision[]
    decisionCount: number
  }
  alerts: {
    overdue: KnowledgeAction[]
    overdueCount: number
    upcoming: KnowledgeAction[]
    upcomingCount: number
  }
  projectActivity: Record<string, { meetings: number; actions: number; decisions: number }>
  topTopics: Array<{ topic: string; count: number }>
}

export interface KnowledgeAskResponse {
  success: boolean
  answer: string
  sources: Array<{
    id: string
    title: string
    type: string
    project: string
    projectName: string
    date: string
    relevance: number
  }>
  question: string
  resultsSearched: number
}

export async function getKnowledgeBriefing(days = 7) {
  return fetchApi<KnowledgeBriefingResponse>(`/api/knowledge/briefing?days=${days}`)
}

export async function getKnowledgeMeetings(params?: { project?: string; days?: number; limit?: number }) {
  const q = new URLSearchParams()
  if (params?.project) q.set('project', params.project)
  if (params?.days) q.set('days', String(params.days))
  if (params?.limit) q.set('limit', String(params.limit))
  return fetchApi<KnowledgeMeetingsResponse>(`/api/knowledge/meetings?${q}`)
}

export async function getKnowledgeActions(params?: { project?: string; overdue?: boolean; limit?: number }) {
  const q = new URLSearchParams()
  if (params?.project) q.set('project', params.project)
  if (params?.overdue) q.set('overdue', 'true')
  if (params?.limit) q.set('limit', String(params.limit))
  return fetchApi<KnowledgeActionsResponse>(`/api/knowledge/actions?${q}`)
}

export async function getKnowledgeDecisions(params?: { project?: string; limit?: number }) {
  const q = new URLSearchParams()
  if (params?.project) q.set('project', params.project)
  if (params?.limit) q.set('limit', String(params.limit))
  return fetchApi<KnowledgeDecisionsResponse>(`/api/knowledge/decisions?${q}`)
}

export async function searchKnowledge(q: string, params?: { type?: string; project?: string }) {
  const query = new URLSearchParams({ q })
  if (params?.type) query.set('type', params.type)
  if (params?.project) query.set('project', params.project)
  return fetchApi<KnowledgeSearchResult>(`/api/knowledge/search?${query}`)
}

export async function askKnowledge(question: string, project?: string) {
  return fetchApi<KnowledgeAskResponse>('/api/knowledge/ask', {
    method: 'POST',
    body: JSON.stringify({ question, project }),
  })
}

// ─── Knowledge Graph ─────────────────────────────────────────────

export interface KnowledgeGraphNeighbor {
  edgeId: string
  edgeType: string
  neighborType: string
  neighborId: string
  direction: 'incoming' | 'outgoing'
  strength: number
  confidence: number
  reasoning: string
}

export interface KnowledgeGraphResponse {
  success: boolean
  center: { id: string; type: string }
  neighbors: KnowledgeGraphNeighbor[]
  count: number
  depth: number
}

export async function getKnowledgeGraph(nodeType: string, nodeId: string) {
  return fetchApi<KnowledgeGraphResponse>(
    `/api/knowledge/graph?nodeType=${nodeType}&nodeId=${nodeId}`
  )
}

// ─── Knowledge Stats ─────────────────────────────────────────────

export interface KnowledgeStatsResponse {
  success: boolean
  stats: {
    chunks: {
      total: number
      withEmbedding: number
      withoutEmbedding: number
      coveragePercent: number
    }
    knowledge: { total: number }
    graph: {
      totalEdges: number
      byType: Array<{ edge_type: string; count: number }>
    }
    memory: {
      episodes: number
      procedures: number
      activeWorkingSessions: number
      consolidationEvents: number
    }
    agents: {
      proposals: number
      learnings: number
    }
    communications: { embedded: number }
    decay: {
      chunks_avg_decay: number
      chunks_stale: number
      chunks_fresh: number
      knowledge_avg_decay: number
      knowledge_stale: number
      knowledge_fresh: number
      last_decay_run: string | null
    } | null
  }
}

export async function getKnowledgeStats() {
  return fetchApi<KnowledgeStatsResponse>('/api/knowledge/stats')
}

export interface KnowledgeGraphOverviewNode {
  id: string
  nodeId: string
  type: string
  label: string
  knowledgeType: string | null
  projectCode: string | null
}

export interface KnowledgeGraphOverviewEdge {
  id: string
  source: string
  target: string
  edgeType: string
  strength: number
  confidence: number
  reasoning: string
}

export interface KnowledgeGraphOverviewResponse {
  success: boolean
  nodes: KnowledgeGraphOverviewNode[]
  edges: KnowledgeGraphOverviewEdge[]
  stats: {
    nodeCount: number
    edgeCount: number
    edgeTypes: Record<string, number>
    nodeTypes: Record<string, number>
  }
}

export async function getKnowledgeGraphOverview(edgeType?: string) {
  const params = new URLSearchParams()
  if (edgeType) params.set('edgeType', edgeType)
  return fetchApi<KnowledgeGraphOverviewResponse>(`/api/knowledge/graph/overview?${params}`)
}

// ─── Knowledge Episodes ──────────────────────────────────────────

export interface KnowledgeEpisode {
  id: string
  title: string
  summary: string
  episode_type: 'project_phase' | 'decision_sequence'
  project_code: string
  started_at: string
  ended_at: string
  key_events: Array<{
    id: string
    type: string
    title: string
    date: string
  }>
  outcome?: string
  lessons_learned?: string[]
  topics: string[]
  status: 'active' | 'completed' | 'abandoned'
  decay_score?: number
  access_count?: number
}

export interface KnowledgeEpisodesResponse {
  success: boolean
  episodes: KnowledgeEpisode[]
  count: number
  stats: {
    active: number
    completed: number
    total: number
  }
  projectCodes: string[]
}

export async function getKnowledgeEpisodes(params?: {
  projectCode?: string
  status?: string
  limit?: number
}) {
  const q = new URLSearchParams()
  if (params?.projectCode) q.set('projectCode', params.projectCode)
  if (params?.status) q.set('status', params.status)
  if (params?.limit) q.set('limit', String(params.limit))
  return fetchApi<KnowledgeEpisodesResponse>(`/api/knowledge/episodes?${q}`)
}

// ─── Agent Intelligence ──────────────────────────────────────────

export interface AgentProposal {
  id: string
  agent_id: string
  action_name: string
  title: string
  description: string
  reasoning: string
  proposed_action: unknown
  expected_outcome: string
  impact_assessment: unknown
  priority: string
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  execution_result: unknown
  execution_error: string | null
  coordination_status: string | null
  created_at: string
  updated_at: string
}

export interface AgentProposalsResponse {
  proposals: AgentProposal[]
  stats: { pending: number; approved: number; rejected: number; executed: number; total: number }
}

export async function getAgentProposals(status?: string) {
  const params = status ? `?status=${status}` : ''
  return fetchApi<AgentProposalsResponse>(`/api/agent/proposals${params}`)
}

export async function reviewProposal(id: string, action: 'approve' | 'reject', review_notes?: string) {
  return fetchApi<{ success: boolean }>('/api/agent/proposals', {
    method: 'POST',
    body: JSON.stringify({ id, action, review_notes }),
  })
}

export interface AgentLearning {
  id: string
  agent_id: string
  learning_type: string
  content: string
  context: string
  confidence: number
  applied_count: number
  created_at: string
}

export interface AgentMistakePattern {
  id: string
  agent_id: string
  action_name: string
  pattern_description: string
  mistake_category: string
  occurrence_count: number
  status: string
  resolution_notes: string | null
}

export interface AgentCalibration {
  id: string
  agent_id: string
  action_name: string
  total_actions: number
  mean_confidence: number
  mean_success_rate: number
  calibration_error: number
  calculated_at: string
}

export interface AgentLearningResponse {
  learnings: AgentLearning[]
  mistakes: AgentMistakePattern[]
  calibration: AgentCalibration[]
  stats: {
    totalLearnings: number
    totalMistakes: number
    activeMistakes: number
    resolvedMistakes: number
    calibrationEntries: number
    avgCalibrationError: number | null
  }
}

export async function getAgentLearning() {
  return fetchApi<AgentLearningResponse>('/api/agent/learning')
}

export interface AgentProcedure {
  id: string
  procedure_name: string
  description: string
  agent_id: string
  steps: unknown[]
  execution_count: number
  success_rate: number
  status: string
  version: number
  created_at: string
}

export interface AgentProceduresResponse {
  procedures: AgentProcedure[]
  stats: { total: number; active: number; totalExecutions: number; avgSuccessRate: number | null }
}

export async function getAgentProcedures() {
  return fetchApi<AgentProceduresResponse>('/api/agent/procedures')
}

export interface AgentAutonomyTransition {
  id: string
  action_name: string
  agent_id: string
  previous_level: number
  new_level: number
  reason: string
  status: string
  created_at: string
}

export interface AgentAutonomyResponse {
  transitions: AgentAutonomyTransition[]
  currentLevels: Array<{ action: string; level: number; agent_id: string; last_change: string }>
  stats: { totalTransitions: number; pendingApproval: number; uniqueActions: number }
}

export async function getAgentAutonomy() {
  return fetchApi<AgentAutonomyResponse>('/api/agent/autonomy')
}

// ─── Intelligence Feed ───────────────────────────────────────────

export interface IntelligenceInsight {
  id: string
  insight_type: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'dismissed' | 'acted'
  data: Record<string, unknown>
  source_type: string
  source_id?: string
  dedup_key?: string
  acted_at?: string
  dismissed_at?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export async function getIntelligenceFeed(params?: {
  limit?: number
  status?: string
  type?: string
}) {
  const q = new URLSearchParams()
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.status) q.set('status', params.status)
  if (params?.type) q.set('type', params.type)
  return fetchApi<{ insights: IntelligenceInsight[]; count: number }>(`/api/intelligence/feed?${q}`)
}

export async function updateInsight(id: string, action: 'dismiss' | 'act') {
  return fetchApi<{ insight: IntelligenceInsight }>(`/api/intelligence/feed/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  })
}

export async function getContactSuggestions(limit = 10) {
  return fetchApi<{ suggestions: IntelligenceInsight[]; count: number }>(`/api/intelligence/suggestions?limit=${limit}`)
}

// ─── Dashboard: Ecosystem Overview ──────────────────────────────

export interface EcosystemProject {
  code: string
  name: string
  color: string
  status: string
  contacts: number
  recentComms: number
  opportunities: number
  opportunityValue: number
  summary?: string | null
  summaryGeneratedAt?: string | null
}

export interface EcosystemOverviewResponse {
  projects: EcosystemProject[]
  totals: {
    contacts: number
    recentComms: number
    opportunities: number
    opportunityValue: number
  }
}

export async function getEcosystemOverview() {
  return fetchApi<EcosystemOverviewResponse>('/api/ecosystem/overview')
}

// ─── Dashboard: Action Feed ─────────────────────────────────────

export interface ActionItem {
  id: string
  type: 'email_reply' | 'follow_up' | 'overdue_contact' | 'insight' | 'task'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  title: string
  description: string
  project_code?: string
  project_codes?: string[]
  tags?: string[]
  company?: string
  entity?: string
  entity_id?: string
  time_ago?: string
  action_url?: string
  channel?: string
  created_at: string
}

export interface ActionFeedResponse {
  actions: ActionItem[]
  total: number
  counts: Record<string, number>
}

export async function getActionFeed(params?: { limit?: number; project?: string }) {
  const q = new URLSearchParams()
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.project) q.set('project', params.project)
  return fetchApi<ActionFeedResponse>(`/api/intelligence/actions?${q}`)
}

// ─── Storyteller Intelligence ────────────────────────────────────

export interface StorytellerOverviewStats {
  totalStorytellers: number
  totalAnalyzed: number
  totalProjects: number
  totalThemes: number
}

export interface StorytellerSummary {
  id: string
  displayName: string
  bio: string | null
  culturalBackground: string[]
  expertise: string[]
  isFeatured: boolean
  isElder: boolean
  projects: Array<{ id: string; name: string }>
  themes: string[]
  quoteCount: number
  createdAt: string
}

export interface StorytellerOverviewResponse {
  success: boolean
  stats: StorytellerOverviewStats
  storytellers: StorytellerSummary[]
}

export async function getStorytellerOverview() {
  return fetchApi<StorytellerOverviewResponse>('/api/storytellers/overview')
}

export interface ThemeChartEntry {
  theme: string
  [project: string]: string | number
}

export interface StorytellerThemesResponse {
  success: boolean
  chartData: ThemeChartEntry[]
  projectNames: string[]
  topThemes: Array<{ theme: string; label: string; count: number }>
  totalThemes: number
}

export async function getStorytellerThemes() {
  return fetchApi<StorytellerThemesResponse>('/api/storytellers/themes')
}

export interface StorytellerQuote {
  text: string
  storyteller: string
  storytellerId: string
  project: string | null
  context: string | null
  theme: string | null
  impactScore: number
}

export interface StorytellerQuotesResponse {
  success: boolean
  quotes: StorytellerQuote[]
  total: number
}

export async function getStorytellerQuotes() {
  return fetchApi<StorytellerQuotesResponse>('/api/storytellers/quotes')
}

export interface ImpactRadarEntry {
  project: string
  healing: number
  identity: number
  empowerment: number
  capability: number
  connection: number
  sovereignty: number
  landConnection: number
  sustainability: number
  storytellerCount: number
}

export interface StorytellerImpactResponse {
  success: boolean
  radarData: ImpactRadarEntry[]
  projectSummaries: Array<{
    projectId: string
    projectName: string
    storytellerCount: number
    aggregatedImpact: unknown
  }>
  dimensions: string[]
}

export async function getStorytellerImpact() {
  return fetchApi<StorytellerImpactResponse>('/api/storytellers/impact')
}

export interface ActivityTimelineItem {
  id: string
  type: 'new_storyteller' | 'analysis_complete'
  name: string
  date: string
  detail?: string
}

export interface StorytellerActivityResponse {
  success: boolean
  timeline: ActivityTimelineItem[]
}

export async function getStorytellerActivity() {
  return fetchApi<StorytellerActivityResponse>('/api/storytellers/activity')
}

// Storyteller Filters
export interface StorytellerFilterProject {
  id: string
  name: string
  count: number
}

export interface StorytellerFilterTheme {
  theme: string
  count: number
}

export interface StorytellerFilterBackground {
  background: string
  count: number
}

export interface StorytellerFilterOrganisation {
  id: string
  name: string
  projectIds: string[]
  projectNames: string[]
}

export interface StorytellerFilterOptions {
  success: boolean
  projects: StorytellerFilterProject[]
  themes: StorytellerFilterTheme[]
  culturalBackgrounds: StorytellerFilterBackground[]
  organisations: StorytellerFilterOrganisation[]
}

export async function getStorytellerFilters() {
  return fetchApi<StorytellerFilterOptions>('/api/storytellers/filters')
}

// ─── Dashboard: Pending Communications ──────────────────────────

export interface PendingCommunication {
  id: string
  contactName: string
  contactEmail?: string
  subject: string
  channel: string
  sentiment?: string
  projectCode: string
  daysWaiting: number
  occurredAt: string
}

export interface FollowUpSuggestion {
  id: string
  title: string
  description: string
  status: string
  createdAt: string
}

export interface PendingCommunicationsResponse {
  pending: PendingCommunication[]
  byProject: Record<string, PendingCommunication[]>
  total: number
  followUps: FollowUpSuggestion[]
}

export async function getPendingCommunications() {
  return fetchApi<PendingCommunicationsResponse>('/api/communications/pending')
}

// ─── Dashboard: Upcoming Deadlines ──────────────────────────────

export interface UpcomingDeadline {
  id: string
  title: string
  date: string
  type: 'grant' | 'compliance' | 'insurance' | 'tax' | 'opportunity'
  source: string
  amount?: number
  status?: string
  urgency: 'overdue' | 'this_week' | 'this_month' | 'upcoming'
}

export interface UpcomingDeadlinesResponse {
  deadlines: UpcomingDeadline[]
  total: number
  counts: {
    overdue: number
    thisWeek: number
    thisMonth: number
    upcoming: number
  }
}

export async function getUpcomingDeadlines() {
  return fetchApi<UpcomingDeadlinesResponse>('/api/business/upcoming')
}

// ─── Dashboard: Grant Pipeline ──────────────────────────────────

export async function getGrantPipeline() {
  // Reuses existing GHL pipeline data, filtered client-side
  return getGHLOpportunities()
}

// ─── Morning Briefing ────────────────────────────────────────────

export interface MorningBriefingCalendarEvent {
  title: string
  time: string
  endTime: string
  type: string
  location?: string
}

export interface MorningBriefingAction {
  id: string
  project: string
  title: string
  content?: string
  followUpDate: string
  importance: string
  daysOverdue?: number
}

export interface MorningBriefingCommunication {
  id: string
  from: string
  subject: string
  channel: string
  receivedAt: string
  summary?: string
}

export interface MorningBriefingRelationship {
  id: string
  name: string
  email?: string
  company?: string
  engagementStatus: string
  lastContactDate: string
  daysSinceContact: number | null
  projects: string[]
}

export interface MorningBriefingResponse {
  success: boolean
  generated: string
  date: string
  moonPhase: { phase: string; energy: string }
  thought: string
  calendar: {
    events: MorningBriefingCalendarEvent[]
    meetingCount: number
  }
  actions: {
    overdue: MorningBriefingAction[]
    upcoming: MorningBriefingAction[]
    overdueCount: number
    upcomingCount: number
  }
  communications: {
    stats: { today: number; yesterday: number; trend: string }
    needToRespond: MorningBriefingCommunication[]
    needToRespondCount: number
  }
  relationships: {
    alerts: MorningBriefingRelationship[]
    alertCount: number
  }
  financial: {
    totalPipeline: number
    openValue: number
    wonValue: number
    lostValue: number
    opportunityCount: number
    byStage: Record<string, { value: number; count: number }>
  }
  projects: {
    activity: Array<{ code: string; meetings: number; actions: number; decisions: number; total: number }>
    activeCount: number
  }
  storytellers: {
    recentAnalyses: Array<{ storyteller: string; themes: string[]; date: string }>
    totalQuotes: number
    topThemes: string[]
  }
  summary: {
    urgentItems: number
    meetingsToday: number
    pipelineValue: number
    staleRelationships: number
  }
}

export async function getMorningBriefing() {
  return fetchApi<MorningBriefingResponse>('/api/briefing/morning')
}

// ─── Development Overview ────────────────────────────────────────

export interface DevelopmentOverviewResponse {
  coreSites: Array<{
    name: string
    slug: string
    url: string | null
    liveUrl: string | null
    screenshot: string | null
    githubUrl: string
    githubRepo: string
    projectCode: string
    localPath: string | null
    language: string | null
    lastPushed: string | null
    description: string | null
    healthStatus: string | null
    healthScore: number | null
  }>
  satelliteSites: Array<{
    name: string
    url: string
    slug: string
    screenshot: string | null
    category: string
    healthStatus: string | null
    healthScore: number | null
    githubRepo: string | null
    vercelProject: string | null
  }>
  repos: Array<{
    name: string
    fullName: string
    description: string | null
    url: string
    homepage: string | null
    screenshot: string | null
    language: string | null
    lastPushed: string
    isPrivate: boolean
    stars: number
    topics: string[]
    projectCode: string | null
    projectLinks: Array<{ project_code: string; project_name: string | null; notes: string | null }>
    taggedContacts: Array<{ contact_id: string; contact_name: string | null; role: string | null }>
    localPath: string | null
    hasWebsite: boolean
    hasLocalCodebase: boolean
  }>
  localCodebases: Array<{
    repoName: string
    path: string
    githubUrl: string
    projectCode: string | null
  }>
  stats: {
    totalRepos: number
    totalDeployments: number
    totalLocalCodebases: number
    linkedRepos: number
    linkedPercent: number
    languages: string[]
  }
}

export async function getDevelopmentOverview() {
  return fetchApi<DevelopmentOverviewResponse>('/api/development/overview')
}

// Repo-project link management
export async function addRepoProjectLink(repoName: string, projectCode: string, projectName?: string, notes?: string) {
  return fetchApi<{ link: { repo_name: string; project_code: string; project_name: string | null; notes: string | null } }>(
    '/api/development/links',
    { method: 'POST', body: JSON.stringify({ repoName, projectCode, projectName, notes }) }
  )
}

export async function removeRepoProjectLink(repoName: string, projectCode: string) {
  return fetchApi<{ success: boolean }>(
    '/api/development/links',
    { method: 'DELETE', body: JSON.stringify({ repoName, projectCode }) }
  )
}

// Repo-contact tag management
export interface RepoContact {
  contact_id: string
  contact_name: string | null
  role: string | null
}

export async function getRepoContacts(repoName: string) {
  return fetchApi<{ contacts: RepoContact[] }>(`/api/development/contacts?repo=${encodeURIComponent(repoName)}`)
}

export async function addRepoContact(repoName: string, contactId: string, contactName: string, role?: string) {
  return fetchApi<{ contact: RepoContact }>(
    '/api/development/contacts',
    { method: 'POST', body: JSON.stringify({ repoName, contactId, contactName, role }) }
  )
}

export async function removeRepoContact(repoName: string, contactId: string) {
  return fetchApi<{ success: boolean }>(
    '/api/development/contacts',
    { method: 'DELETE', body: JSON.stringify({ repoName, contactId }) }
  )
}

// ─── Goods Intelligence ─────────────────────────────────────────

export interface GoodsContact {
  id: string
  ghl_id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  email: string | null
  company_name: string | null
  website: string | null
  tags: string[]
  last_contact_date: string | null
  newsletter_consent: boolean
  segment: 'funder' | 'partner' | 'community' | 'supporter' | 'storyteller'
  days_since_contact: number | null
  last_email_subject: string | null
  last_email_date: string | null
  last_email_direction: string | null
}

export interface GoodsContent {
  id: string
  el_id: string | null
  content_type: string
  title: string
  excerpt: string | null
  storyteller_name: string | null
  url: string | null
  image_url: string | null
  topics: string[] | null
  impact_themes: string[] | null
  audience_fit: string[] | null
  key_message: string | null
  suggested_use: string | null
  emotional_tone: string | null
  times_used_newsletter: number
  last_used_newsletter_at: string | null
  published_at: string | null
}

export interface GoodsOutreach {
  id: string
  name: string
  email: string | null
  reason: string
  priority: 'high' | 'medium' | 'low'
  days_since_contact: number | null
  ghl_id: string
  segment: string
}

export interface GoodsDashboard {
  segments: {
    total: number
    newsletter: number
    funders: number
    partners: number
    community: number
    supporters: number
    storytellers: number
    needingAttention: number
  }
  contacts: GoodsContact[]
  content: GoodsContent[]
  outreach: GoodsOutreach[]
}

export async function getGoodsDashboard() {
  return fetchApi<GoodsDashboard>('/api/goods/dashboard')
}

// ─── Goods Deduplication ──────────────────────────────────────────

export interface DuplicateGroup {
  email: string
  contacts: Array<{ ghl_id: string; full_name: string; tags: string[]; company_name: string | null; created_at: string }>
}

export async function getGoodsDuplicates() {
  return fetchApi<{ duplicates: DuplicateGroup[]; count: number }>('/api/goods/duplicates')
}

export interface SearchContact {
  id: string
  ghl_id: string
  full_name: string
  email: string | null
  company_name: string | null
  tags: string[]
  already_goods: boolean
}

export async function searchAllContacts(q: string, excludeTag?: string) {
  const params = new URLSearchParams({ q })
  if (excludeTag) params.set('excludeTag', excludeTag)
  return fetchApi<{ contacts: SearchContact[]; total: number }>(`/api/contacts/search?${params}`)
}

export async function mergeGoodsContacts(keepId: string, mergeIds: string[]) {
  return fetchApi<{ ok: boolean; mergedCount: number }>('/api/goods/merge', {
    method: 'POST',
    body: JSON.stringify({ keepId, mergeIds }),
  })
}

export async function updateContactNewsletter(contactId: string, subscribe: boolean) {
  return updateContactTag(contactId, subscribe ? 'add' : 'remove', 'goods-newsletter')
}

export async function createGoodsContact(data: {
  email: string
  firstName?: string
  lastName?: string
  companyName?: string
  website?: string
  tags?: string[]
}) {
  return fetchApi<{ contact: GoodsContact }>('/api/contacts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateGoodsContact(id: string, updates: {
  firstName?: string
  lastName?: string
  companyName?: string
  website?: string
  email?: string
}) {
  return fetchApi<{ ok: boolean }>(`/api/contacts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

// ==========================================
// Strategic Systems (Feb 2026)
// ==========================================

// Cash Flow
export async function getCashFlow() {
  return fetchApi<{
    history: Array<{ month: string; income: number; expenses: number; net: number; closing_balance: number }>
    projections: Array<{ month: string; income: number; expenses: number; net: number; balance: number; confidence: number }>
    scenarios: Array<{ id: string; name: string; description: string; adjustments: unknown[] }>
    metrics: { burnRate: number; runway: number; trend: string }
  }>('/api/cashflow')
}

// Revenue Streams
export async function getRevenueStreams() {
  return fetchApi<{
    streams: Array<{ id: string; name: string; code: string; category: string; color: string; icon: string; target_monthly: number; status: string }>
    entries: Array<{ stream_id: string; month: string; amount: number }>
    pipeline: Array<{ id: string; name: string; funder: string; type: string; amount: number; status: string; probability: number; expected_date: string }>
    metrics: { totalMonthly: number; fastestGrowing: string; onTarget: number; pipelineValue: number }
  }>('/api/revenue-streams')
}

// Assets
export async function getAssets() {
  return fetchApi<{
    assets: Array<{ id: string; name: string; asset_type: string; location_zone: string; condition: string; current_value: number; status: string }>
    maintenance: Array<{ id: string; asset_id: string; title: string; maintenance_type: string; next_due: string; status: string; estimated_cost: number }>
    properties: Array<{ id: string; name: string; address: string; total_area_hectares: number; current_valuation: number }>
    lodgings: Array<{ id: string; name: string; lodging_type: string; capacity: number; status: string; current_occupant: string }>
    metrics: { totalValue: number; needsAttention: number; upcomingMaintenance: number; lodgingCapacity: number }
  }>('/api/assets')
}

// Debt
export async function getDebt() {
  return fetchApi<{
    debts: Array<{ id: string; name: string; debt_type: string; original_amount: number; current_balance: number; interest_rate: number; regular_payment: number; offset_balance: number }>
    payments: Array<{ id: string; payment_date: string; amount: number; principal: number; interest: number; balance_after: number }>
    scenarios: Array<{ id: string; name: string; extra_monthly: number; projected_payoff_date: string; total_interest_saved: number; months_saved: number }>
    metrics: { totalBalance: number; equityPct: number; monthlyPayment: number; projectedPayoff: string }
  }>('/api/debt')
}

// Team
export async function getTeam() {
  return fetchApi<{
    members: Array<{ id: string; name: string; role: string; employment_type: string; available_hours_per_week: number; hourly_rate: number; skills: string[]; primary_zone: string; allocations: Array<{ project_code: string; hours_per_week: number }> }>
    seasonalDemand: Array<{ project_code: string; month: number; demand_hours: number; demand_level: string }>
    metrics: { activeTeam: number; totalWeeklyHours: number; utilisationPct: number; availableCapacity: number }
  }>('/api/team')
}

// Compliance
export async function getCompliance() {
  return fetchApi<{
    items: Array<{ id: string; title: string; category: string; next_due: string; status: string; responsible: string; frequency: string }>
    documents: Array<{ id: string; name: string; document_type: string; expiry_date: string; status: string }>
    metrics: { dueThisMonth: number; overdueCount: number; trackedDocs: number; nextDeadline: string }
  }>('/api/compliance')
}

// Business Development
export async function getBusinessDev() {
  return fetchApi<{
    initiatives: Array<{ id: string; title: string; initiative_type: string; status: string; progress: number; expected_monthly_revenue: number; owner: string; hypothesis: string; success_criteria: string; learnings: string }>
    metrics: { activeInitiatives: number; rdInvestment: number; revenueImpact: number; experimentsRunning: number }
  }>('/api/business-dev')
}

// Wiki: Project Storytellers
export interface ProjectStorytellersResponse {
  project: string
  projectId: string
  storytellerCount: number
  storytellers: Array<{
    id: string
    displayName: string
    bio: string | null
    culturalBackground: string | null
    isFeatured: boolean
    isElder: boolean
  }>
  topThemes: Array<{ theme: string; count: number }>
  topQuotes: Array<{ quote: string; storytellerId: string; storytellerName: string }>
}

export async function getProjectStorytellers(project: string) {
  return fetchApi<ProjectStorytellersResponse>(`/api/wiki/project-storytellers?project=${encodeURIComponent(project)}`)
}

// --- Runway Dashboard ---

export interface RunwayData {
  runwayMonths: number
  burnRate: number
  currentBalance: number
  diversificationIndex: number
  restrictedFunds: number
  unrestrictedFunds: number
  burnTrend: Array<{ month: string; burn: number; income: number }>
  grantCliffs: Array<{
    name: string
    projectCode: string
    amount: number
    expiresAt: string
    daysRemaining: number
  }>
  revenueSources: Array<{ source: string; amount: number; percentage: number }>
  scenarios: Array<{ name: string; runwayMonths: number; adjustments: Record<string, number> }>
  fundraisingPipeline: Array<{ name: string; amount: number; status: string; projectCode: string }>
  lastUpdated: string
}

export async function getRunwayData() {
  return fetchApi<RunwayData>('/api/finance/runway')
}

// --- Grants Pipeline ---

export interface GrantPipelineCard {
  id: string
  name: string
  status: string
  amount: number
  outcomeAmount: number | null
  projectCode: string | null
  leadContact: string | null
  submittedAt: string | null
  provider: string | null
  deadline: string | null
  fitScore: number | null
  url: string | null
  ghlStage: string | null
  ghlValue: number | null
  milestones: any[]
  notes: string | null
}

export interface GrantPipelineData {
  stages: string[]
  grouped: Record<string, GrantPipelineCard[]>
}

export async function getGrantsPipeline() {
  return fetchApi<GrantPipelineData>('/api/grants/pipeline')
}

export interface GrantMetrics {
  pipelineValue: number
  activeCount: number
  winRate: number
  totalAwarded: number
  nextDeadline: string | null
  nextDeadlineName: string | null
  upcomingDeadlines: Array<{
    name: string
    closesAt: string
    fitScore: number
    daysRemaining: number
  }>
}

export async function getGrantMetrics() {
  return fetchApi<GrantMetrics>('/api/grants/metrics')
}

export async function updateGrantStatus(id: string, status: string) {
  return fetchApi<any>(`/api/grants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

// --- Tax / BAS ---

export interface TaxData {
  quarter: string
  basLabels: Record<string, { label: string; amount: number; description: string }>
  gstSummary: { collected: number; paid: number; net: number }
  acncRevenue: Array<{ category: string; amount: number; percentage: number }>
  acncExpenses: Array<{ category: string; amount: number; percentage: number }>
  entitySelector: string[]
  lastUpdated: string
}

export async function getTaxData(quarter?: string) {
  const params = quarter ? `?quarter=${quarter}` : ''
  return fetchApi<TaxData>(`/api/finance/tax${params}`)
}

// ==========================================
// Transaction Tagger
// ==========================================

export interface UntaggedGroup {
  contactName: string
  type: string
  count: number
  total: number
  sampleDates: string[]
  suggestedCode: string | null
  rdEligible: boolean
}

export interface ProjectCodeOption {
  code: string
  name: string
  category: string
}

export interface RdSummary {
  totalSpend: number
  byProject: Record<string, number>
  threshold: number
  eligibleProjects: string[]
  refundRate: number
}

export interface UntaggedTransactionsResponse {
  groups: UntaggedGroup[]
  totalUntagged: number
  totalTransactions: number
  projectCodes: ProjectCodeOption[]
  rd: RdSummary
}

export async function getUntaggedTransactions() {
  return fetchApi<UntaggedTransactionsResponse>('/api/transactions/untagged')
}

export async function tagTransactions(params: {
  contactName?: string
  type?: string
  ids?: string[]
  projectCode: string
}) {
  return fetchApi<{ success: boolean; updated: number }>('/api/transactions/tag', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

// ── Cross-Domain Intelligence ─────────────────────────────────────────

export interface ActivityStreamItem {
  activity_type: 'transaction' | 'email' | 'opportunity' | 'meeting'
  source_id: string
  project_code: string | null
  activity_date: string
  title: string
  description: string | null
  amount: number | null
}

export interface ActivityStreamResponse {
  activities: ActivityStreamItem[]
}

export async function getActivityStream(params?: { project?: string; limit?: number }) {
  const qs = new URLSearchParams()
  if (params?.project) qs.set('project', params.project)
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return fetchApi<ActivityStreamResponse>(`/api/activity${query}`)
}

export interface ProjectSummaryRow {
  project_code: string
  project_name: string | null
  health_score: number | null
  health_status: string | null
  momentum_score: number | null
  engagement_score: number | null
  financial_score: number | null
  timeline_score: number | null
  health_calculated_at: string | null
  total_income: number
  total_expenses: number
  net: number
  transaction_count: number
  invoice_count: number
  outstanding_amount: number
  opportunity_count: number
  pipeline_value: number
  open_opportunities: number
  email_count: number
  last_email_date: string | null
  grant_count: number
  grants_won: number
  grants_pending: number
  subscription_monthly_cost: number
}

export interface ProjectSummaryResponse {
  projects: ProjectSummaryRow[]
}

export async function getProjectsSummary(project?: string) {
  const qs = project ? `?project=${encodeURIComponent(project)}` : ''
  return fetchApi<ProjectSummaryResponse>(`/api/projects/summary${qs}`)
}

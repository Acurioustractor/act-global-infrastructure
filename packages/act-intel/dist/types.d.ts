/**
 * Shared result types for @act/intel query functions.
 * Consumers (Telegram bot, Notion Workers, API routes) format these for their interface.
 */
/**
 * Minimal structural interface for Supabase client.
 * Using a structural type instead of the concrete SupabaseClient class avoids
 * dual-package resolution issues between "bundler" and "nodenext" moduleResolution.
 * Any real SupabaseClient instance satisfies this interface.
 */
export interface SupabaseQueryClient {
    from(table: string): {
        select(columns?: string, options?: Record<string, unknown>): any;
        insert(values: any): any;
        update(values: any): any;
        upsert(values: any): any;
        delete(): any;
    };
}
export interface OverdueAction {
    title: string;
    status: string;
    due_date: string;
    assigned_to: string | null;
    project_code?: string;
}
export interface UpcomingFollowup {
    title: string;
    status: string;
    due_date: string;
    assigned_to: string | null;
    project_code?: string;
}
export interface RecentMeeting {
    title: string;
    meeting_date: string | null;
    updated_at: string;
    ai_summary: string | null;
    task_status: string | null;
    assigned_to: string | null;
}
export interface StaleRelationship {
    full_name: string | null;
    email: string | null;
    company_name: string | null;
    engagement_status: string;
    last_contact_date: string;
}
export interface RecentDecision {
    title: string;
    status: string | null;
    decision_date: string | null;
    rationale: string | null;
}
export interface UpcomingGrantDeadline {
    title: string;
    funder: string | null;
    amount: number | null;
    stage: string | null;
    deadline: string | null;
    project_code: string | null;
}
export interface UpcomingCalendarEvent {
    title: string;
    event_date: string;
    event_type: string | null;
    status: string | null;
}
export interface RelationshipAlert {
    contact_name: string;
    email: string | null;
    company: string | null;
    temperature: number;
    temperature_trend: string;
}
export interface DailyBriefingResult {
    generated_at: string;
    lookback_days: number;
    overdue_actions: OverdueAction[];
    upcoming_followups: UpcomingFollowup[];
    recent_meetings: RecentMeeting[];
    recent_decisions: RecentDecision[];
    stale_relationships: StaleRelationship[];
    relationship_alerts: RelationshipAlert[];
    active_projects: Array<{
        code: string;
        status: string;
        activity_count: number;
    }>;
    upcoming_calendar: UpcomingCalendarEvent[];
    grant_deadlines: UpcomingGrantDeadline[];
}
export type HealthStatus = 'active' | 'steady' | 'stale' | 'dormant' | 'unknown';
export interface ProjectHealthEntry {
    code: string;
    name: string;
    category: string;
    priority: string;
    last_activity: string | null;
    days_since_activity: number | null;
    knowledge_entries: number;
    comms_last_30_days: number;
    open_actions: number;
    knowledge_breakdown: {
        meetings: number;
        decisions: number;
        actions: number;
    };
    grants: {
        active_count: number;
        pipeline_value: number;
    };
    financials: {
        total_receivables: number;
        total_payables: number;
        outstanding_receivables: number;
        net_position: number;
    } | null;
    health: HealthStatus;
}
export interface ProjectHealthResult {
    total_projects: number;
    summary: Record<HealthStatus, number>;
    projects: ProjectHealthEntry[];
}
export interface ProjectConfig {
    code: string;
    name: string;
    category: string;
    status: string;
    priority: string;
    [key: string]: unknown;
}
export interface FinancialSummaryResult {
    period_days: number;
    pipeline: {
        total_opportunities: number;
        open_value: number;
        won_value: number;
        lost_value: number;
        total_value: number;
    };
    api_costs: {
        total_usd: number;
        by_model: Record<string, number>;
        call_count: number;
    };
    subscriptions: {
        active_count: number;
        monthly_total_aud: number;
        items: Array<{
            vendor: string;
            amount_aud: number;
            billing_cycle: string;
            category: string;
            status: string;
        }>;
    };
    spend_by_project: Array<{
        project_code: string;
        spend: number;
        income: number;
        count: number;
    }>;
    untagged: {
        count: number;
        amount: number;
    };
    grant_pipeline_total: number;
}
export interface CashflowMonth {
    month: string;
    income: number;
    expenses: number;
    net: number;
    closing_balance: number;
    is_projection: boolean;
    confidence: number | null;
}
export interface CashflowResult {
    current_month: {
        period: string;
        income: number;
        expenses: number;
        net: number;
    };
    outstanding: {
        receivables: number;
        payables: number;
        net: number;
    };
    metrics: {
        avg_monthly_income: number;
        avg_monthly_expenses: number;
        burn_rate: number;
        estimated_balance: number;
        runway_months: number | null;
    };
    projections: Array<{
        month: string;
        income: number;
        expenses: number;
        balance: number;
        confidence: number;
    }>;
    history: CashflowMonth[];
    scenarios: Array<{
        name: string;
        description: string;
        adjustments: unknown;
    }>;
}
export interface RevenueScoreboardResult {
    timestamp: string;
    streams: {
        items: Array<{
            name: string;
            code: string;
            category: string;
            monthlyTarget: number;
        }>;
        totalMonthlyTarget: number;
        totalAnnualTarget: number;
    };
    pipeline: {
        byStatus: Record<string, {
            count: number;
            totalValue: number;
            weightedValue: number;
        }>;
        totalValue: number;
        weightedValue: number;
        topOpportunities: Array<{
            name: string;
            funder: string;
            amount: number;
            probability: number;
            weighted: number;
            status: string;
            expectedDate: string;
            projects: string[];
        }>;
        count: number;
    };
    receivables: {
        total: number;
        items: Array<{
            name: string;
            funder: string;
            amount: number;
            notes: string;
        }>;
    };
    scenarios: Array<{
        name: string;
        description: string;
        targets: Record<string, number>;
    }>;
    projects: {
        active: number;
        total: number;
    };
}
export interface ProjectFinancialsEntry {
    code: string;
    name: string;
    tier: string;
    fy_income: number;
    fy_expenses: number;
    net_position: number;
    receivable: number;
    pipeline_value: number;
    grant_funding: number;
    monthly_subscriptions: number;
    transaction_count: number;
}
export interface ProjectFinancialsResult {
    projects: ProjectFinancialsEntry[];
    count: number;
}
export interface ReceiptPipelineStage {
    stage: string;
    count: number;
    amount: number;
    stuck_count: number;
}
export interface ReceiptPipelineResult {
    total_items: number;
    reconciliation_rate: number;
    stages: ReceiptPipelineStage[];
    stuck_items: Array<{
        vendor: string;
        amount: number;
        date: string;
        stage: string;
        days_stuck: number;
    }>;
    alerts: string[];
}
//# sourceMappingURL=types.d.ts.map
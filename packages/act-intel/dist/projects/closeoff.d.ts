/**
 * Project close-off checklist — comprehensive wrap-up data for a project.
 *
 * Extracted from Notion Workers Tool 32 (get_project_closeoff).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface ProjectCloseoffOptions {
    project_code: string;
}
export interface CloseoffInvoice {
    invoice_number: string | null;
    contact_name: string | null;
    amount_due: number;
    due_date: string | null;
    type: 'ACCREC' | 'ACCPAY' | string;
}
export interface CloseoffAction {
    title: string;
    age_days: number;
    importance: string | null;
}
export interface CloseoffContact {
    full_name: string;
    temperature_trend: string | null;
    last_contacted_at: string | null;
}
export interface CloseoffDecision {
    title: string;
    decision_status: string | null;
    recorded_at: string;
}
export interface CloseoffGrant {
    application_name: string;
    status: string;
    amount_requested: number | null;
    openMilestones: Array<{
        name: string;
        due: string | null;
    }>;
}
export interface ProjectCloseoffResult {
    project_code: string;
    financial: {
        receivables: CloseoffInvoice[];
        payables: CloseoffInvoice[];
    };
    actions: CloseoffAction[];
    contacts: CloseoffContact[];
    decisions: CloseoffDecision[];
    knowledge: Record<string, number>;
    grants: CloseoffGrant[];
    totalItems: number;
}
export declare function fetchProjectCloseoff(supabase: SupabaseQueryClient, opts: ProjectCloseoffOptions): Promise<ProjectCloseoffResult>;
//# sourceMappingURL=closeoff.d.ts.map
/**
 * Grant requirements — eligibility, criteria, documents, readiness.
 *
 * Extracted from Notion Workers Tool 27 (get_grant_requirements).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface GrantRequirementsOptions {
    grant_name: string;
}
export interface GrantRequirement {
    requirement_type: string;
    description: string;
    is_met: boolean;
}
export interface GrantRequirementsEntry {
    name: string;
    provider: string | null;
    status: string | null;
    deadline: string | null;
    amount: number | null;
    url: string | null;
    aligned_projects: string[];
    eligibility: GrantRequirement[];
    assessment: GrantRequirement[];
    documents: GrantRequirement[];
    readiness_pct: number;
    act_readiness: {
        score: number | null;
        gaps: string[];
    } | null;
}
export interface GrantRequirementsResult {
    grants: GrantRequirementsEntry[];
}
export declare function fetchGrantRequirements(supabase: SupabaseQueryClient, opts: GrantRequirementsOptions): Promise<GrantRequirementsResult>;
//# sourceMappingURL=requirements.d.ts.map
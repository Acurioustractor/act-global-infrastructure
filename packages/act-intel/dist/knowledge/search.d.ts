/**
 * Knowledge search — text search across project_knowledge with optional
 * knowledge_links graph enrichment.
 *
 * Merges agent-tools (executeSearchKnowledge) and
 * Notion Workers (search_knowledge_graph).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface KnowledgeSearchOptions {
    query: string;
    project_code?: string;
    limit?: number;
    includeLinks?: boolean;
}
export interface KnowledgeSearchEntry {
    id: string;
    project_code: string;
    type: string;
    title: string;
    summary: string | null;
    key_points: string | null;
    content_preview: string | null;
    participants: string[] | null;
    action_required: boolean | null;
    follow_up_date: string | null;
    importance: string | null;
    recorded_at: string;
    topics: string[] | null;
    links: Array<{
        link_type: string;
        reason: string | null;
    }> | null;
}
export interface KnowledgeSearchResult {
    query: string;
    project_code: string;
    count: number;
    items: KnowledgeSearchEntry[];
}
export declare function searchKnowledge(supabase: SupabaseQueryClient, opts: KnowledgeSearchOptions): Promise<KnowledgeSearchResult>;
//# sourceMappingURL=search.d.ts.map
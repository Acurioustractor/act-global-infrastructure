/**
 * Daily briefing — unified query logic for morning digest.
 *
 * Now powered by synced Notion tables (actions, meetings, decisions, calendar, grants)
 * plus GHL contacts for relationship tracking and Notion projects for project health.
 *
 * Returns typed data. Consumers (Telegram bot, Notion Workers, API routes) format for their interface.
 */
import type { SupabaseQueryClient } from '../types.js';
import type { DailyBriefingResult } from '../types.js';
export interface DailyBriefingOptions {
    lookbackDays?: number;
    projectCode?: string;
}
export declare function fetchDailyBriefing(supabase: SupabaseQueryClient, opts?: DailyBriefingOptions): Promise<DailyBriefingResult>;
//# sourceMappingURL=daily-briefing.d.ts.map
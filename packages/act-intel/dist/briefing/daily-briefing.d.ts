/**
 * Daily briefing — unified query logic for morning digest.
 *
 * Returns typed data. Consumers (Telegram bot, Notion Workers) format for their interface.
 */
import type { SupabaseQueryClient } from '../types.js';
import type { DailyBriefingResult } from '../types.js';
export interface DailyBriefingOptions {
    lookbackDays?: number;
    projectCode?: string;
}
export declare function fetchDailyBriefing(supabase: SupabaseQueryClient, opts?: DailyBriefingOptions): Promise<DailyBriefingResult>;
//# sourceMappingURL=daily-briefing.d.ts.map
/**
 * Revenue forecast — 10-year revenue scenarios.
 *
 * Extracted from Notion Workers Tool 18 (get_revenue_forecast).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface RevenueForecastOptions {
    scenario?: string;
}
export interface RevenueScenario {
    name: string;
    description: string | null;
    annual_targets: Record<string, number>;
    assumptions: Record<string, unknown>;
}
export interface RevenueForecastResult {
    scenarios: RevenueScenario[];
}
export declare function fetchRevenueForecast(supabase: SupabaseQueryClient, opts?: RevenueForecastOptions): Promise<RevenueForecastResult>;
//# sourceMappingURL=revenue-forecast.d.ts.map
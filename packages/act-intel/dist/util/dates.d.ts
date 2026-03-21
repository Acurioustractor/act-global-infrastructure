/**
 * Date utilities for Brisbane timezone (AEST/UTC+10).
 * All ACT operations use Brisbane time as the canonical timezone.
 */
/** Get current date string (YYYY-MM-DD) in Brisbane timezone */
export declare function getBrisbaneDate(): string;
/** Get a Date object representing "now" in Brisbane (offset-aware for date math) */
export declare function getBrisbaneNow(): Date;
/** Get ISO string for a Brisbane-relative date offset (e.g. -7 days, +30 days) */
export declare function getBrisbaneDateOffset(days: number): string;
/** Get ISO timestamp for N days ago (UTC-based, for query filters) */
export declare function daysAgoISO(n: number): string;
/** Get YYYY-MM-DD for N days from now */
export declare function daysFromNowDate(n: number): string;
//# sourceMappingURL=dates.d.ts.map
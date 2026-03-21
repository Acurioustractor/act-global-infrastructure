/**
 * Date utilities for Brisbane timezone (AEST/UTC+10).
 * All ACT operations use Brisbane time as the canonical timezone.
 */
const TZ = 'Australia/Brisbane';
/** Get current date string (YYYY-MM-DD) in Brisbane timezone */
export function getBrisbaneDate() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: TZ })).toISOString().split('T')[0];
}
/** Get a Date object representing "now" in Brisbane (offset-aware for date math) */
export function getBrisbaneNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}
/** Get ISO string for a Brisbane-relative date offset (e.g. -7 days, +30 days) */
export function getBrisbaneDateOffset(days) {
    const now = getBrisbaneNow();
    now.setDate(now.getDate() + days);
    return now.toISOString().split('T')[0];
}
/** Get ISO timestamp for N days ago (UTC-based, for query filters) */
export function daysAgoISO(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
}
/** Get YYYY-MM-DD for N days from now */
export function daysFromNowDate(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
}
//# sourceMappingURL=dates.js.map
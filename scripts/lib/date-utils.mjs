/**
 * Date Utilities
 *
 * Centralised date parsing and formatting for all scripts.
 * Handles Xero's .NET date format, ISO strings, relative dates, and Brisbane timezone.
 *
 * Usage:
 *   import { parseXeroDate, toBrisbane, formatRelative, toISODate } from './lib/date-utils.mjs';
 *
 *   parseXeroDate('/Date(1709251200000+0000)/');  // → Date
 *   toBrisbane(new Date());                        // → '2026-03-15 10:30 AEST'
 *   formatRelative(new Date('2026-03-10'));        // → '5 days ago'
 *   toISODate(new Date());                         // → '2026-03-15'
 */

const BRISBANE_TZ = 'Australia/Brisbane';

/**
 * Parse Xero's .NET JSON date format: /Date(1709251200000+0000)/
 *
 * @param {string} xeroDate - Xero date string
 * @returns {Date|null} Parsed date or null if invalid
 */
export function parseXeroDate(xeroDate) {
  if (!xeroDate) return null;
  const match = xeroDate.match(/\/Date\((\d+)([+-]\d+)?\)\//);
  if (!match) return null;
  return new Date(parseInt(match[1], 10));
}

/**
 * Format a date in Brisbane timezone (AEST/AEDT).
 *
 * @param {Date|string} date - Date to format
 * @param {object} [options]
 * @param {string} [options.format] - 'short' | 'long' | 'date' | 'time' | 'datetime' (default: 'datetime')
 * @returns {string}
 */
export function toBrisbane(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';

  const format = options.format || 'datetime';

  const formatOptions = {
    timeZone: BRISBANE_TZ,
    ...(format === 'date' && { year: 'numeric', month: '2-digit', day: '2-digit' }),
    ...(format === 'time' && { hour: '2-digit', minute: '2-digit', hour12: false }),
    ...(format === 'short' && { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }),
    ...(format === 'long' && { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false }),
    ...(format === 'datetime' && { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
  };

  return d.toLocaleString('en-AU', formatOptions);
}

/**
 * Format a date as a human-readable relative string.
 *
 * @param {Date|string} date - Date to format
 * @returns {string} e.g. '5 minutes ago', 'in 3 days', 'just now'
 */
export function formatRelative(date) {
  const d = date instanceof Date ? date : new Date(date);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const absDiff = Math.abs(diffMs);
  const isFuture = diffMs < 0;

  const MINUTE = 60_000;
  const HOUR = 3_600_000;
  const DAY = 86_400_000;
  const WEEK = 604_800_000;

  let text;
  if (absDiff < MINUTE) {
    return 'just now';
  } else if (absDiff < HOUR) {
    const mins = Math.floor(absDiff / MINUTE);
    text = `${mins} minute${mins !== 1 ? 's' : ''}`;
  } else if (absDiff < DAY) {
    const hrs = Math.floor(absDiff / HOUR);
    text = `${hrs} hour${hrs !== 1 ? 's' : ''}`;
  } else if (absDiff < WEEK) {
    const days = Math.floor(absDiff / DAY);
    text = `${days} day${days !== 1 ? 's' : ''}`;
  } else {
    const weeks = Math.floor(absDiff / WEEK);
    text = `${weeks} week${weeks !== 1 ? 's' : ''}`;
  }

  return isFuture ? `in ${text}` : `${text} ago`;
}

/**
 * Convert a date to ISO date string (YYYY-MM-DD).
 *
 * @param {Date|string} date
 * @returns {string}
 */
export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Get the start of day in Brisbane timezone.
 *
 * @param {Date} [date] - Defaults to now
 * @returns {Date}
 */
export function startOfDayBrisbane(date) {
  const d = date || new Date();
  const brisbaneStr = d.toLocaleString('en-US', { timeZone: BRISBANE_TZ });
  const brisbaneDate = new Date(brisbaneStr);
  brisbaneDate.setHours(0, 0, 0, 0);
  return brisbaneDate;
}

/**
 * Parse a Notion date string (ISO 8601 with optional time).
 *
 * @param {string|object} notionDate - ISO string or Notion date object { start, end }
 * @returns {{ start: Date, end: Date|null }}
 */
export function parseNotionDate(notionDate) {
  if (!notionDate) return { start: null, end: null };
  if (typeof notionDate === 'string') {
    return { start: new Date(notionDate), end: null };
  }
  return {
    start: notionDate.start ? new Date(notionDate.start) : null,
    end: notionDate.end ? new Date(notionDate.end) : null,
  };
}

/**
 * Get the number of days between two dates (ignoring time).
 *
 * @param {Date|string} dateA
 * @param {Date|string} dateB
 * @returns {number} Positive if dateB is after dateA
 */
export function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86_400_000);
}

/**
 * Check if a date is within the last N hours.
 *
 * @param {Date|string} date
 * @param {number} hours
 * @returns {boolean}
 */
export function isWithinHours(date, hours) {
  const d = date instanceof Date ? date : new Date(date);
  return (Date.now() - d.getTime()) < hours * 3_600_000;
}

export default {
  parseXeroDate, toBrisbane, formatRelative, toISODate,
  startOfDayBrisbane, parseNotionDate, daysBetween, isWithinHours,
};

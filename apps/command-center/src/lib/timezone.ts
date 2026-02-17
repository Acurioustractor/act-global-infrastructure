const TZ = 'Australia/Brisbane'

/** Get current date string (YYYY-MM-DD) in Brisbane timezone */
export function getBrisbaneDate(): string {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: TZ })
  ).toISOString().split('T')[0]
}

/** Get a Date object representing "now" in Brisbane (offset-aware for date math) */
export function getBrisbaneNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
}

/** Get ISO string for a Brisbane-relative date offset (e.g. -7 days, -30 days) */
export function getBrisbaneDateOffset(days: number): string {
  const now = getBrisbaneNow()
  now.setDate(now.getDate() + days)
  return now.toISOString().split('T')[0]
}

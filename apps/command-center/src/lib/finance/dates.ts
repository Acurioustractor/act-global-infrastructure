/**
 * Australian Financial Year date utilities.
 * FY runs July 1 – June 30. FY26 = 1 Jul 2025 – 30 Jun 2026.
 */

export interface FYDates {
  /** First day of current FY (e.g. '2025-07-01') */
  fyStart: string
  /** Last day of current FY (e.g. '2026-06-30') */
  fyEnd: string
  /** First day of previous FY */
  prevFyStart: string
  /** Months elapsed in current FY (1-12) */
  monthsElapsed: number
  /** Months remaining in current FY (0-11) */
  monthsRemaining: number
}

export function getFYDates(now: Date = new Date()): FYDates {
  const inSecondHalf = now.getMonth() >= 6 // Jul=6 onwards

  const fyStart = inSecondHalf
    ? `${now.getFullYear()}-07-01`
    : `${now.getFullYear() - 1}-07-01`

  const fyEnd = inSecondHalf
    ? `${now.getFullYear() + 1}-06-30`
    : `${now.getFullYear()}-06-30`

  const prevFyStart = inSecondHalf
    ? `${now.getFullYear() - 1}-07-01`
    : `${now.getFullYear() - 2}-07-01`

  const fyEndDate = new Date(fyEnd)
  const monthsRemaining = Math.max(
    0,
    (fyEndDate.getFullYear() - now.getFullYear()) * 12 +
      fyEndDate.getMonth() - now.getMonth()
  )
  const monthsElapsed = Math.max(1, 12 - monthsRemaining)

  return { fyStart, fyEnd, prevFyStart, monthsElapsed, monthsRemaining }
}

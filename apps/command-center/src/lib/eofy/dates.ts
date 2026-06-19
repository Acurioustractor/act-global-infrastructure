export const MS_PER_DAY = 1000 * 60 * 60 * 24

const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000
const BRISBANE_OFFSET = '+10:00'

export function brisbaneDayKey(ms: number): string {
  return new Date(ms + BRISBANE_OFFSET_MS).toISOString().slice(0, 10)
}

export function brisbaneStartMs(date: string): number {
  return new Date(`${date}T00:00:00${BRISBANE_OFFSET}`).getTime()
}

export function calendarDaysUntil(date: string | null, nowMs: number): number | null {
  if (!date) return null
  const todayStart = brisbaneStartMs(brisbaneDayKey(nowMs))
  return Math.round((brisbaneStartMs(date) - todayStart) / MS_PER_DAY)
}

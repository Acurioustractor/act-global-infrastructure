/**
 * Shared money formatting utilities for all finance pages.
 */

/** Format as $X.XM or $X,XXX — always shows absolute value with $ prefix */
export function formatMoney(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1000) return `$${Math.round(abs).toLocaleString()}`
  return `$${abs.toFixed(0)}`
}

/** Compact format: $X.XM or $XK — for tight table cells */
export function formatMoneyCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1000) return `$${(abs / 1000).toFixed(0)}K`
  return `$${abs.toFixed(0)}`
}

/** Format as signed: +$X or -$X */
export function formatMoneySigned(n: number): string {
  const prefix = n >= 0 ? '+' : '-'
  return `${prefix}${formatMoney(n)}`
}

/** Format percentage with sign */
export function formatPctChange(current: number, previous: number): string | null {
  if (previous === 0) return null
  const pct = ((current - previous) / Math.abs(previous)) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

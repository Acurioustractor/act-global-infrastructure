/**
 * ACT entity registry — the three legal entities money can belong to.
 *
 * Today 100% of financial data is ACT-ST (Nic Marchesi sole trader) under one Xero tenant; the Pty
 * and the charity have no money in the books yet. Multi-entity reporting is therefore a CUTOVER to
 * prepare for (trading migrates to A Curious Tractor Pty Ltd by 30 Jun 2026), not a backfill. This
 * registry + the `entityCode` param on the ledger (getOrgLedger) make that migration a data event,
 * not another rebuild. Source of truth: wiki/decisions/act-core-facts.md.
 */

export type EntityStatus = 'trading' | 'registered-dormant' | 'dormant'

export interface ActEntity {
  code: string
  legalName: string
  shortName: string
  /** ABN or ACN. */
  identifier: string
  role: string
  status: EntityStatus
  /** Does this entity carry ACT's trading money today? */
  tradingNow: boolean
  notes: string
}

export const ACT_ENTITIES: ActEntity[] = [
  {
    code: 'ACT-ST',
    legalName: 'NJ Marchesi, sole trader (trading as A Curious Tractor)',
    shortName: 'Sole trader',
    identifier: 'ABN 21 591 780 066',
    role: 'Current trading vehicle',
    status: 'trading',
    tradingNow: true,
    notes: 'All money in the books today is ACT-ST. Ceases trading at the Pty cutover (by 30 Jun 2026).',
  },
  {
    code: 'ACT-PL',
    legalName: 'A Curious Tractor Pty Ltd',
    shortName: 'A Curious Tractor Pty Ltd',
    identifier: 'ACN 697 347 676',
    role: 'Future trading company — Knight + Marchesi family trusts 50/50',
    status: 'registered-dormant',
    tradingNow: false,
    notes: 'Registered 2026-04-24. Trading migrates here by 30 Jun 2026. The FY25-26 R&D claim lodges via this entity.',
  },
  {
    code: 'ACT-CH',
    legalName: 'A Kind Tractor Ltd',
    shortName: 'A Kind Tractor (charity)',
    identifier: 'ACN 669 029 341',
    role: 'Charity — dormant, not DGR',
    status: 'dormant',
    tradingNow: false,
    notes: 'No money in the books. Activation / DGR endorsement is a future strategic decision.',
  },
]

/** Trading migrates off the sole trader to A Curious Tractor Pty Ltd by this date. */
export const PTY_CUTOVER_DATE = '2026-06-30'

export interface CutoverStatus {
  cutoverDate: string
  daysUntil: number
  fromEntity: string
  toEntity: string
  passed: boolean
  message: string
}

export function getCutoverStatus(now: Date = new Date()): CutoverStatus {
  const daysUntil = Math.ceil((new Date(PTY_CUTOVER_DATE).getTime() - now.getTime()) / 86400000)
  const passed = daysUntil < 0
  return {
    cutoverDate: PTY_CUTOVER_DATE,
    daysUntil,
    fromEntity: 'ACT-ST',
    toEntity: 'ACT-PL',
    passed,
    message: passed
      ? 'Pty cutover date has passed — confirm trading has migrated to A Curious Tractor Pty Ltd (ACT-PL) and the books are split.'
      : `Trading on the sole trader (ACT-ST). Migrate to A Curious Tractor Pty Ltd by 30 Jun 2026 — ${daysUntil} days.`,
  }
}

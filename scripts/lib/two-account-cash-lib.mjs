// Two-account cash pipeline — pure functions, no env, no network.
//
// ACT cash on hand is ONLY the two operating accounts (the two-account rule):
//   NAB Visa ACT #8815 (credit card; negative = owing, nets cash DOWN) + NJ Marchesi T/as ACT Everyday.
// EXCLUDE everything else — NM Personal (Nic's pre-cutover, -$388,937), the Maximiser savings,
// and any ARCHIVED account. Source of truth for the names is ACCOUNTS.both in reconcile-sidecar-lib.
//
// This is the trustworthy replacement for the money snapshot's `.cash` field, which sums ALL
// non-archived xero_bank_accounts (the bug that renders -$152K/-$375K). See
// scripts/build-whole-picture.mjs header and thoughts/shared/plans/2026-06-16-whole-picture-v1.5.md.
import { ACCOUNTS } from './reconcile-sidecar-lib.mjs';

export const OPERATING_ACCOUNTS = ACCOUNTS.both.map((s) => s.trim());

export const CARD_CAVEAT =
  '#8815 (NAB Visa) carries unreconciled statement lines — its mirror balance is provisional; ' +
  'verify against the card statement before treating cash as final.';

/**
 * Compute ACT two-account cash from xero_bank_accounts rows.
 * @param {Array<{name,status,current_balance,balance_updated_at}>} accounts
 * @param {{nowMs?:number, staleHours?:number, operating?:string[]}} opts
 * @returns {{cash:number|null, asOfMs:number|null, ageH:number|null, stale:boolean,
 *            complete:boolean, displayable:boolean, included:Array, excluded:Array,
 *            cardCaveat:string, note:string}}
 *
 * `displayable` = complete AND fresh. The N3 "one money truth" canon gate is ORTHOGONAL and is
 * applied by the consumer (the surface), NOT here — until N3 is declared the surface keeps the
 * number withheld even when this returns displayable:true.
 */
export function computeTwoAccountCash(accounts, { nowMs = Date.now(), staleHours = 26, operating = OPERATING_ACCOUNTS } = {}) {
  const opSet = new Set(operating.map((s) => String(s).trim()));
  const included = [];
  const excluded = [];

  for (const a of accounts || []) {
    const name = String(a?.name ?? '').trim();
    const active = String(a?.status ?? '').toUpperCase() === 'ACTIVE';
    if (opSet.has(name) && active) {
      included.push({ name, balance: a.current_balance, balance_updated_at: a.balance_updated_at });
    } else {
      excluded.push({
        name,
        balance: a?.current_balance ?? null,
        reason: !active ? `status ${a?.status}` : 'not an ACT operating account (two-account rule)',
      });
    }
  }

  // Complete only when every operating account is present AND has a numeric balance.
  // A missing or null operating balance must NOT ship as a whole cash figure.
  const foundNames = new Set(included.map((a) => a.name));
  const allPresent = [...opSet].every((n) => foundNames.has(n));
  const allNumeric = included.every((a) => typeof a.balance === 'number' && Number.isFinite(a.balance));
  const complete = allPresent && allNumeric;

  const cash = complete
    ? Number(included.reduce((s, a) => s + a.balance, 0).toFixed(2))
    : null;

  // Freshness from the OLDEST operating-account sync (most conservative).
  const stamps = included.map((a) => Date.parse(a.balance_updated_at)).filter((t) => !Number.isNaN(t));
  const asOfMs = stamps.length ? Math.min(...stamps) : null;
  const ageH = asOfMs == null ? null : (nowMs - asOfMs) / 3.6e6;
  const stale = ageH == null ? true : ageH > staleHours;

  const displayable = complete && !stale;

  return {
    cash, asOfMs, ageH, stale, complete, displayable,
    included, excluded,
    cardCaveat: CARD_CAVEAT,
    note: !complete
      ? 'Two-account cash INCOMPLETE — an operating account balance is missing; do not display.'
      : stale
        ? 'Two-account cash computed but STALE — withhold until a fresh sync.'
        : 'Two-account mirror cash (fresh). Provisional on #8815 reconciliation; canon gate (N3) applied by the surface.',
  };
}

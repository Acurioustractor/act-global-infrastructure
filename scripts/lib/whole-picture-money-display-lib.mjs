// Whole-picture money-display gating — pure functions, no env, no network, no I/O.
//
// The MATH lives in two-account-cash-lib.mjs + rd-basis-lib.mjs (both TDD-pinned). The GATING
// decision — does a surface SHOW the figure or keep it withheld — is computed inside the sidecars
// (`gated` for cash, `bankable` for R&D). This lib adds the ONE thing a sidecar cannot decide about
// itself: a guard on its OWN freshness. A `gated:true`/`bankable:true` flag is frozen at the moment
// the sidecar was built; if the producing cron stalls, the flag stays true while the data rots. So a
// sidecar older than SIDE_FRESH_H is withheld regardless of its gate — the honest "pipeline stopped"
// state. This is the safety the whole-picture surface is built on: never present a stale figure as
// current, and un-withhold the instant the gates flip (a fresh sidecar with gate=true shows live).
//
// Both fns take the ALREADY-PARSED sidecar object (or null if the file is absent / unparseable) so
// they stay pure and fully testable without the filesystem. Each consumer does its own fail-soft
// read (build-whole-picture's `safe`, build-founders-session-kit's `isolate`) and passes the result.
//
// Return shape (a neutral decision the md/html/telegram renderers each format their own way):
//   { show:boolean, value:string|null, reason:string|null, asOf:string|null }
//     show=false  => WITHHELD. `reason` is the live, self-upgrading withhold reason.
//     show=true   => `value` is the formatted figure; `reason` carries the standing caveat (if any).

export const SIDE_FRESH_H = 36; // a daily sidecar older than 36h has missed a run — treat as withheld

const money0 = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-AU');
const fmtH = (h) => (h == null ? 'undated' : h < 48 ? Math.round(h) + 'h old' : Math.round(h / 24) + 'd old');

function sideAgeH(sidecar, nowMs) {
  const t = Date.parse(sidecar?.generated_at);
  return Number.isNaN(t) ? null : (nowMs - t) / 3.6e6;
}

const withhold = (reason) => ({ show: false, value: null, reason, asOf: null });

// Two shared front-gates every sidecar must clear before its own gate is even consulted:
// (1) present at all, (2) fresh enough that its frozen gate flag can be trusted.
function frontGate(sidecar, nowMs, freshH, label, builder) {
  if (!sidecar) return withhold(`no pipeline yet - run ${builder}`);
  const age = sideAgeH(sidecar, nowMs);
  if (age == null || age > freshH) {
    return withhold(`pipeline stalled - ${label} sidecar ${fmtH(age)} (rule ${freshH}h), rerun ${builder}`);
  }
  return null; // cleared — caller consults the sidecar's own gate
}

/**
 * Cash on hand display decision from a two-account-cash sidecar.
 * Withheld unless the sidecar is present, fresh, AND its own `gated` flag is true
 * (gated = displayable [fresh+complete bank data] AND N3 canon declared).
 */
export function cashDisplay(sidecar, { nowMs = Date.now(), freshH = SIDE_FRESH_H } = {}) {
  const blocked = frontGate(sidecar, nowMs, freshH, 'cash', 'build-two-account-cash.mjs');
  if (blocked) return blocked;
  if (!sidecar.gated) return withhold(sidecar.withhold_reason || 'gated off');
  return { show: true, value: money0(sidecar.cash), reason: sidecar.card_caveat || null, asOf: sidecar.asOf || null };
}

/**
 * R&D-basis display decision from an rd-basis sidecar.
 * Withheld unless present, fresh, AND `bankable` (records cured). When not bankable, the withhold
 * reason carries the honest at-risk read from the sidecar (gross flag, founder-drawings %, the
 * documented collapse-to-~$55K risk) — an upgrade over the old static "no pipeline" line.
 */
export function rdDisplay(sidecar, { nowMs = Date.now(), freshH = SIDE_FRESH_H } = {}) {
  const blocked = frontGate(sidecar, nowMs, freshH, 'R&D', 'build-rd-basis.mjs');
  if (blocked) return blocked;
  if (!sidecar.bankable) {
    const pct = sidecar.founder_pct != null ? `${Math.round(sidecar.founder_pct)}% founder drawings` : 'founder drawings unstripped';
    return withhold(`at risk - ${money0(sidecar.gross_flagged)} flagged but ${pct}; nothing on paper (collapse-to-~$55K risk)`);
  }
  return {
    show: true,
    value: money0(sidecar.defensible_basis_ceiling),
    reason: `defensible ceiling - 43.5% offset ~${money0(sidecar.offset_435_on_ceiling)} (records cured; SL-confirm final)`,
    asOf: sidecar.generated_at || null,
  };
}

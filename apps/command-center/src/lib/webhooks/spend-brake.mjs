/**
 * Vercel spend brake. A team budget alert (Settings > Billing > Spend Management,
 * webhook) arrives as { budgetAmount, currentSpend, teamId, thresholdPercent }.
 * It names no project, so we read the last two days of billing charges, find the
 * project burning money, and put a strict per-IP rate limit on that one project.
 * The budget's own pause would take every site offline; this brakes only the culprit.
 *
 * Pure parts (parse, rank, decide, rule, message) are tested in
 * scripts/tests/spend-brake.test.mjs. applyBrake does the network calls.
 */

export const BRAKE_RULE_NAME = 'Spend brake';
/** A normal day for the whole team is $3-13. One project above this is abnormal. */
export const DAILY_LIMIT_USD = 20;
/** Alert-only: braking these breaks Ben's own work or partner API consumers. */
export const EXEMPT_PROJECTS = ['act-command-center', 'empathy-ledger-v2'];

export function parseBudgetAlert(payload) {
  const p = payload || {};
  const ok = ['budgetAmount', 'currentSpend', 'thresholdPercent'].every((k) => typeof p[k] === 'number') && typeof p.teamId === 'string';
  return ok ? { budgetAmount: p.budgetAmount, currentSpend: p.currentSpend, thresholdPercent: p.thresholdPercent, teamId: p.teamId } : null;
}

/** Billing charges are JSONL (FOCUS). Sum BilledCost per project, highest first. */
export function rankProjects(jsonl) {
  const byProject = new Map();
  for (const line of String(jsonl).split('\n')) {
    if (!line.trim()) continue;
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    const name = r.Tags?.ProjectName;
    if (!name) continue;
    const cur = byProject.get(name) || { name, id: r.Tags.ProjectId, cost: 0 };
    cur.cost += Number(r.BilledCost) || 0;
    byProject.set(name, cur);
  }
  return [...byProject.values()].sort((a, b) => b.cost - a.cost);
}

/**
 * Which project to brake, if any. `days` is how many days the ranking covers.
 * Brake only from the 75% alert up, only a project over the daily limit, never an exempt one.
 */
export function decideBrake({ alert, ranked, days = 2, dailyLimit = DAILY_LIMIT_USD, exempt = EXEMPT_PROJECTS }) {
  const top = ranked[0];
  if (!top) return { brake: null, top: null, reason: 'no per-project charges found' };
  const perDay = top.cost / days;
  if (alert.thresholdPercent < 75) return { brake: null, top, reason: 'below 75%: alert only' };
  if (perDay < dailyLimit) return { brake: null, top, reason: `top project ${top.name} at $${perDay.toFixed(2)}/day, under the $${dailyLimit} limit` };
  if (exempt.includes(top.name)) return { brake: null, top, reason: `${top.name} is exempt: brake it by hand` };
  return { brake: top, top, reason: `${top.name} at $${perDay.toFixed(2)}/day` };
}

/** 60 requests a minute per IP on every path except /api, so webhooks and server calls keep working. */
export function brakeRule(now = new Date()) {
  return {
    name: BRAKE_RULE_NAME,
    description: `Added by the spend brake ${now.toISOString().slice(0, 10)}. Remove once the cause is fixed.`,
    active: true,
    conditionGroup: [{ conditions: [{ type: 'path', op: 'pre', value: '/api', neg: true }] }],
    action: {
      mitigate: {
        action: 'rate_limit',
        rateLimit: { algo: 'fixed_window', window: 60, limit: 60, keys: ['ip'], action: 'rate_limit' },
        actionDuration: null,
      },
    },
  };
}

export function brakeMessage({ alert, decision, applied }) {
  const lines = [
    `Vercel spend at ${alert.thresholdPercent}% of budget: $${alert.currentSpend.toFixed(2)} of $${alert.budgetAmount.toFixed(2)}.`,
  ];
  if (decision.top) lines.push(`Top project, last 2 days: ${decision.top.name}, $${decision.top.cost.toFixed(2)}.`);
  if (applied === 'added') lines.push(`Brake ON: ${decision.brake.name} now limited to 60 requests/min per IP (/api excluded). Remove the "${BRAKE_RULE_NAME}" rule in its Firewall once fixed.`);
  else if (applied === 'exists') lines.push(`Brake already on for ${decision.brake.name}.`);
  else if (applied && applied.startsWith('failed')) lines.push(`Brake FAILED for ${decision.brake.name}: ${applied}. Add a rate limit by hand.`);
  else lines.push(`No brake: ${decision.reason}.`);
  return lines.join('\n');
}

const API = 'https://api.vercel.com';

export async function fetchCharges({ token, teamId, days = 2, now = new Date(), fetchImpl = fetch }) {
  const to = new Date(now);
  const from = new Date(now.getTime() - days * 86400_000);
  const q = new URLSearchParams({ teamId, from: from.toISOString(), to: to.toISOString() });
  const res = await fetchImpl(`${API}/v1/billing/charges?${q}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`billing charges ${res.status}`);
  return res.text();
}

/**
 * Stage the rule as a firewall draft and publish it, the same two calls the Vercel CLI
 * makes. Returns 'added', 'exists', or 'failed: <why>'. Never throws.
 */
export async function applyBrake({ token, teamId, projectId, fetchImpl = fetch }) {
  const q = new URLSearchParams({ projectId, teamId });
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  try {
    const cur = await fetchImpl(`${API}/v1/security/firewall/config/active?${q}`, { headers });
    if (cur.ok) {
      const cfg = await cur.json();
      const rules = cfg.active?.rules || cfg.rules || [];
      if (rules.some((r) => r.name === BRAKE_RULE_NAME && r.active)) return 'exists';
    }
    const draft = await fetchImpl(`${API}/v1/security/firewall/config/draft?${q}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ action: 'rules.insert', id: null, value: brakeRule() }),
    });
    if (!draft.ok) return `failed: draft ${draft.status}`;
    const pub = await fetchImpl(`${API}/v1/security/firewall/config/draft/activate?${q}`, { method: 'POST', headers, body: '{}' });
    return pub.ok ? 'added' : `failed: publish ${pub.status}`;
  } catch (err) {
    return `failed: ${err.message}`;
  }
}

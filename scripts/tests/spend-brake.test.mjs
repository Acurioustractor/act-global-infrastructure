import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBudgetAlert,
  rankProjects,
  decideBrake,
  brakeRule,
  brakeMessage,
  applyBrake,
  BRAKE_RULE_NAME,
} from '../../apps/command-center/src/lib/webhooks/spend-brake.mjs';

const alert = { budgetAmount: 60, currentSpend: 45, teamId: 'team_x', thresholdPercent: 75 };
const line = (name, cost) => JSON.stringify({ BilledCost: cost, Tags: name ? { ProjectName: name, ProjectId: `prj_${name}` } : {} });

test('parse: accepts the documented payload, rejects anything else', () => {
  assert.deepEqual(parseBudgetAlert(alert), alert);
  assert.equal(parseBudgetAlert({ ...alert, currentSpend: '45' }), null);
  assert.equal(parseBudgetAlert(null), null);
});

test('rank: sums per project, skips untagged and junk lines, highest first', () => {
  const jsonl = [line('justicehub', 30), line('grantscope', 2), line('justicehub', 7), line(null, 15), 'not json', ''].join('\n');
  const ranked = rankProjects(jsonl);
  assert.deepEqual(ranked.map((p) => [p.name, p.cost]), [['justicehub', 37], ['grantscope', 2]]);
  assert.equal(ranked[0].id, 'prj_justicehub');
});

test('decide: brakes the top project over $20/day from the 75% alert', () => {
  const d = decideBrake({ alert, ranked: [{ name: 'justicehub', id: 'p', cost: 74 }] });
  assert.equal(d.brake.name, 'justicehub');
});

test('decide: alert only at 50%, under the limit, or for an exempt project', () => {
  const ranked = [{ name: 'justicehub', id: 'p', cost: 74 }];
  assert.equal(decideBrake({ alert: { ...alert, thresholdPercent: 50 }, ranked }).brake, null);
  assert.equal(decideBrake({ alert, ranked: [{ name: 'justicehub', id: 'p', cost: 30 }] }).brake, null);
  assert.equal(decideBrake({ alert, ranked: [{ name: 'act-command-center', id: 'p', cost: 90 }] }).brake, null);
  assert.equal(decideBrake({ alert, ranked: [] }).brake, null);
});

test('rule: rate limits every path except /api', () => {
  const r = brakeRule(new Date('2026-09-26T00:00:00Z'));
  assert.equal(r.name, BRAKE_RULE_NAME);
  assert.deepEqual(r.conditionGroup[0].conditions[0], { type: 'path', op: 'pre', value: '/api', neg: true });
  assert.equal(r.action.mitigate.rateLimit.limit, 60);
});

test('message: says what happened in each case', () => {
  const decision = decideBrake({ alert, ranked: [{ name: 'justicehub', id: 'p', cost: 74 }] });
  assert.match(brakeMessage({ alert, decision, applied: 'added' }), /Brake ON: justicehub/);
  assert.match(brakeMessage({ alert, decision, applied: 'failed: draft 403' }), /Brake FAILED/);
  const none = decideBrake({ alert: { ...alert, thresholdPercent: 50 }, ranked: [] });
  assert.match(brakeMessage({ alert, decision: none }), /No brake/);
});

function fakeFetch(responses) {
  const calls = [];
  const impl = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body });
    const r = responses.shift();
    return { ok: r.status < 300, status: r.status, json: async () => r.json, text: async () => '' };
  };
  return { impl, calls };
}

test('apply: stages the rule then publishes it', async () => {
  const { impl, calls } = fakeFetch([{ status: 404 }, { status: 200 }, { status: 200 }]);
  assert.equal(await applyBrake({ token: 't', teamId: 'team_x', projectId: 'prj_1', fetchImpl: impl }), 'added');
  assert.equal(calls[1].method, 'PATCH');
  assert.match(calls[1].url, /config\/draft\?/);
  assert.equal(JSON.parse(calls[1].body).action, 'rules.insert');
  assert.match(calls[2].url, /config\/draft\/activate\?/);
});

test('apply: does nothing when the brake is already on, and reports failures', async () => {
  const on = fakeFetch([{ status: 200, json: { active: { rules: [{ name: BRAKE_RULE_NAME, active: true }] } } }]);
  assert.equal(await applyBrake({ token: 't', teamId: 'x', projectId: 'p', fetchImpl: on.impl }), 'exists');
  assert.equal(on.calls.length, 1);
  const bad = fakeFetch([{ status: 404 }, { status: 403 }]);
  assert.equal(await applyBrake({ token: 't', teamId: 'x', projectId: 'p', fetchImpl: bad.impl }), 'failed: draft 403');
});

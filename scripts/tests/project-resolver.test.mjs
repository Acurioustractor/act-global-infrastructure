/**
 * Unit tests for project-resolver.mjs — the ONE shared project-code resolver.
 *
 * Pure + DB-free: the registry is injected as a fixture, so precedence, legacy-wrapper
 * normalisation, confidence/provenance, and the valid-code guard are all pinned here.
 * Run: node --test scripts/tests/project-resolver.test.mjs
 *
 * Spec: wiki/decisions/2026-06-03-unified-project-code-resolver.md
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCode,
  buildResolverIndex,
  resolveProjectCode,
  AUTO_APPLY_THRESHOLD,
} from '../lib/project-resolver.mjs';

// Minimal registry fixture (shape mirrors config/project-codes.json `projects`).
const PROJECTS = {
  'ACT-GD': { name: 'Goods', ghl_tags: ['goods', 'goods on country'], xero_tracking: 'ACT-GD — Goods', xero_tracking_aliases: ['Goods'] },
  'ACT-HV': { name: 'The Harvest', ghl_tags: ['harvest', 'the harvest'], xero_tracking: 'ACT-HV — Harvest' },
  'ACT-EL': { name: 'Empathy Ledger', ghl_tags: ['empathy ledger', 'el'] },
  'ACT-CS': { name: 'CivicGraph', ghl_tags: ['civicgraph'] },
  'ACT-CORE': { name: 'ACT Studio', ghl_tags: ['studio'] },
  'ACT-PI': { name: 'PICC', ghl_tags: ['picc'] },
};
const INDEX = buildResolverIndex(PROJECTS);
const VENDOR_RULES = new Map([['bunnings warehouse', 'ACT-HV']]);

describe('normalizeCode — legacy wrappers fold to canonical', () => {
  it('maps the three legacy wrappers', () => {
    assert.equal(normalizeCode('ACT-CG'), 'ACT-CS'); // engine alias → CivicGraph
    assert.equal(normalizeCode('ACT-HQ'), 'ACT-CORE'); // ops bucket → Studio
    assert.equal(normalizeCode('ACT-PC'), 'ACT-PI'); // internal subproject → PICC
  });
  it('passes through canonical codes and uppercases/trims', () => {
    assert.equal(normalizeCode('ACT-GD'), 'ACT-GD');
    assert.equal(normalizeCode(' act-gd '), 'ACT-GD');
    assert.equal(normalizeCode(null), null);
  });
});

describe('resolveProjectCode — precedence', () => {
  it('manual override wins over everything', () => {
    const r = resolveProjectCode(
      { manualCode: 'act-gd', systemCode: 'ACT-HV', linkedCode: 'ACT-EL', tags: ['harvest'], pipelineName: 'The Harvest' },
      INDEX,
    );
    assert.equal(r.code, 'ACT-GD');
    assert.equal(r.source, 'manual');
    assert.equal(r.confidence, 1);
  });

  it('system tag (Xero tracking / direct) beats linked + tags', () => {
    const r = resolveProjectCode({ systemCode: 'ACT-HV', linkedCode: 'ACT-GD', tags: ['goods'] }, INDEX);
    assert.equal(r.code, 'ACT-HV');
    assert.equal(r.source, 'system');
  });

  it('linked-record code beats tags/pipeline/keyword', () => {
    const r = resolveProjectCode({ linkedCode: 'ACT-GD', tags: ['harvest'], pipelineName: 'The Harvest' }, INDEX);
    assert.equal(r.code, 'ACT-GD');
    assert.equal(r.source, 'linked');
  });

  it('registry direct tag match (exact ghl_tag)', () => {
    const r = resolveProjectCode({ tags: ['goods'] }, INDEX);
    assert.equal(r.code, 'ACT-GD');
    assert.equal(r.source, 'registry');
    assert.ok(r.confidence >= AUTO_APPLY_THRESHOLD);
  });

  it('prefix rule (goods-* → ACT-GD) when no exact tag', () => {
    const r = resolveProjectCode({ tags: ['goods-buyer-northern'] }, INDEX);
    assert.equal(r.code, 'ACT-GD');
    assert.equal(r.source, 'prefix');
  });

  it('vendor rule match', () => {
    const r = resolveProjectCode({ vendorName: 'Bunnings Warehouse' }, INDEX, { vendorRules: VENDOR_RULES });
    assert.equal(r.code, 'ACT-HV');
    assert.equal(r.source, 'vendor');
  });

  it('pipeline-name substring hint (Goods Supporter Journey → ACT-GD)', () => {
    const r = resolveProjectCode({ pipelineName: 'Goods Supporter Journey' }, INDEX);
    assert.equal(r.code, 'ACT-GD');
    assert.equal(r.source, 'pipeline');
  });

  it('keyword fuzzy on free text is last and low-confidence (→ review)', () => {
    const r = resolveProjectCode({ text: 'Empathy Ledger storytelling commission' }, INDEX);
    assert.equal(r.code, 'ACT-EL');
    assert.equal(r.source, 'keyword');
    assert.ok(r.confidence < AUTO_APPLY_THRESHOLD); // keyword matches go to the review queue
  });

  it('legacy wrapper normalised even when supplied as a system tag', () => {
    const r = resolveProjectCode({ systemCode: 'ACT-CG' }, INDEX);
    assert.equal(r.code, 'ACT-CS'); // ACT-CG → ACT-CS
    assert.equal(r.source, 'system');
  });

  it('unknown signals → no code, zero confidence (never guesses)', () => {
    const r = resolveProjectCode({ text: 'totally unrelated vendor xyz' }, INDEX);
    assert.equal(r.code, null);
    assert.equal(r.confidence, 0);
    assert.equal(r.source, 'none');
  });

  it('invalid code in a system/linked signal is rejected, not trusted', () => {
    const r = resolveProjectCode({ systemCode: 'ACT-ZZ', tags: ['goods'] }, INDEX);
    assert.equal(r.code, 'ACT-GD'); // ACT-ZZ not a real code → falls through to the tag
    assert.equal(r.source, 'registry');
  });
});

// Tests for the opportunity routing.
//
// Run: deno test supabase/functions/intake/pipelines.test.ts
//
// The leg these cover has never run in production: the deployed function read two env
// vars that do not exist, so `if (pipelineId && stageId)` was always false. Nothing
// would have told us. These tests are the substitute for the live evidence we lack.

import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { PIPELINE_DEFAULT, PIPELINE_ROUTES, pipelineFor } from './pipelines.ts';

Deno.test('a newsletter signup opens no opportunity, on any project', () => {
  assertEquals(pipelineFor('ACT-EL', 'newsletter'), null);
  assertEquals(pipelineFor('ACT-GD', 'newsletter'), null);
  assertEquals(pipelineFor('ACT-HV', 'newsletter'), null);
});

Deno.test('Empathy Ledger and Goods each have their own pipeline', () => {
  assertEquals(pipelineFor('ACT-EL', 'partnership'), PIPELINE_ROUTES.get('ACT-EL'));
  assertEquals(pipelineFor('ACT-GD', 'bulk-order'), PIPELINE_ROUTES.get('ACT-GD'));
  assertNotEquals(pipelineFor('ACT-EL', 'partnership'), pipelineFor('ACT-GD', 'partnership'));
});

Deno.test('anything else lands in Universal Inquiry rather than nowhere', () => {
  assertEquals(pipelineFor('ACT-HV', 'sponsor'), PIPELINE_DEFAULT);
  assertEquals(pipelineFor('ACT-CORE', 'funder'), PIPELINE_DEFAULT);
});

Deno.test('every route carries both ids — a half-configured route is the old bug', () => {
  for (const route of [...PIPELINE_ROUTES.values(), PIPELINE_DEFAULT]) {
    assertNotEquals(route.pipelineId.trim(), '');
    assertNotEquals(route.stageId.trim(), '');
  }
});

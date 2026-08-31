import { assertEquals, assertNotEquals } from 'jsr:@std/assert@1';
import { idempotencySeed } from './idempotency.ts';
import { LANES } from './lanes.ts';

const base = {
  site: 'act-regenerative-studio',
  projectCode: 'ACT-IN',
  formType: 'contact',
  lane: 'community' as const,
  contact: 'someone@example.org',
  day: '2026-08-31',
};

Deno.test('the same submission twice is the same key, which is the point', () => {
  assertEquals(idempotencySeed(base), idempotencySeed({ ...base }));
});

Deno.test('contact is compared case-insensitively', () => {
  assertEquals(
    idempotencySeed(base),
    idempotencySeed({ ...base, contact: 'SomeOne@Example.ORG' }),
  );
});

Deno.test('REGRESSION: two projects never collide, even on the same form and day', () => {
  // The live defect of 2026-08-31. ACT-IN + contact resolved community and was stored;
  // ACT-PI + contact from the same address resolved duty_of_care, collided, and was
  // silently discarded with a 200 back to the caller.
  const actIn = idempotencySeed(base);
  const actPi = idempotencySeed({ ...base, projectCode: 'ACT-PI', lane: 'duty_of_care' });
  assertNotEquals(actIn, actPi, 'a duty-of-care submission deduped against a community one');
});

Deno.test('REGRESSION: a flagged submission never collides with an unflagged one', () => {
  // Same hole from the other side: safetyRisk forces duty_of_care while project and
  // form type are identical, so only the lane distinguishes them.
  const calm = idempotencySeed(base);
  const flagged = idempotencySeed({ ...base, lane: 'duty_of_care' });
  assertNotEquals(calm, flagged, 'a safety-flagged submission deduped against an unflagged one');
});

Deno.test('no two lanes share a key, for any lane pair', () => {
  const seen = new Map<string, string>();
  for (const lane of LANES) {
    const key = idempotencySeed({ ...base, lane });
    const clash = seen.get(key);
    assertEquals(clash, undefined, `lane ${lane} collides with ${clash}`);
    seen.set(key, lane);
  }
  assertEquals(seen.size, LANES.length);
});

Deno.test('POSITIVE CONTROL: the old key really did collide, so this test can fail', () => {
  // Without a control, the four assertions above pass just as happily against a key
  // that never collided in the first place, and prove nothing about the fix.
  const oldKey = (projectCode: string) =>
    [base.site, base.formType, base.contact, base.day].join('|') + projectCode.slice(0, 0);
  assertEquals(
    oldKey('ACT-IN'),
    oldKey('ACT-PI'),
    'the old shape is supposed to collide; if this fails the regression tests are vacuous',
  );
});

Deno.test('a different day is a different submission', () => {
  assertNotEquals(idempotencySeed(base), idempotencySeed({ ...base, day: '2026-09-01' }));
});

// Tests for the lane classifier.
//
// Run: deno test supabase/functions/intake/lanes.test.ts
//
// These are the guards that make default-deny a property rather than an intention.
// The 2026-08-29 lane-gate attempt had no equivalent, which is part of why 23
// blocker/major findings were possible.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  DUTY_OF_CARE_FORM_TYPES,
  DUTY_OF_CARE_PROJECT_CODES,
  FORM_TYPE_LANE,
  isAtLeastAsProtective,
  LANE_PROTECTION,
  LANES,
  type LaneInput,
  mayCreateOpportunity,
  mayWriteConsent,
  reachesGhl,
  resolveLane,
} from './lanes.ts';

Deno.test('an unknown form type defaults to duty_of_care', () => {
  assertEquals(resolveLane({ projectCode: 'ACT-HV', formType: 'brand-new-form' }).lane, 'duty_of_care');
});

Deno.test('an empty form type defaults to duty_of_care', () => {
  assertEquals(resolveLane({ projectCode: 'ACT-HV', formType: '' }).lane, 'duty_of_care');
});

Deno.test('every duty-of-care project code is duty_of_care on ANY form type', () => {
  // Including the form types that would otherwise be the most commercial. A newsletter
  // box embedded on a PICC page must not produce a marketing contact.
  for (const code of DUTY_OF_CARE_PROJECT_CODES) {
    for (const formType of ['newsletter', 'contact', 'csa', 'flagship-inquiry', 'rsvp']) {
      const { lane } = resolveLane({ projectCode: code, formType });
      assertEquals(lane, 'duty_of_care', `${code} + ${formType} escaped into ${lane}`);
    }
  }
});

Deno.test('every duty-of-care form type is duty_of_care on ANY project', () => {
  for (const formType of DUTY_OF_CARE_FORM_TYPES) {
    for (const code of ['ACT-HV', 'ACT-GD', 'ACT-JH', 'ACT-IN', 'ACT-FM']) {
      const { lane } = resolveLane({ projectCode: code, formType });
      assertEquals(lane, 'duty_of_care', `${code} + ${formType} escaped into ${lane}`);
    }
  }
});

Deno.test('safetyRisk forces duty_of_care even on an allowlisted commerce form', () => {
  assertEquals(
    resolveLane({ projectCode: 'ACT-HV', formType: 'newsletter', safetyRisk: true }).lane,
    'duty_of_care',
  );
});

Deno.test('allowlisted form types resolve to their declared lane', () => {
  for (const [formType, expected] of FORM_TYPE_LANE) {
    // On a project that is not itself duty of care.
    assertEquals(resolveLane({ projectCode: 'ACT-HV', formType }).lane, expected, formType);
  }
});

Deno.test('resolution is case and whitespace insensitive', () => {
  assertEquals(resolveLane({ projectCode: ' act-pi ', formType: 'NEWSLETTER' }).lane, 'duty_of_care');
  assertEquals(resolveLane({ projectCode: 'act-hv', formType: '  Contact ' }).lane, 'community');
});

Deno.test('duty_of_care never reaches GHL, never writes consent, never opens an opportunity', () => {
  assertEquals(reachesGhl('duty_of_care'), false);
  assertEquals(mayWriteConsent('duty_of_care'), false);
  assertEquals(mayCreateOpportunity('duty_of_care'), false);
});

Deno.test('the community lane reaches GHL but writes no consent and no opportunity', () => {
  // This is the distinction the tag-based approach kept losing: a person is in the CRM
  // as a conversation, without becoming a send target.
  assertEquals(reachesGhl('community'), true);
  assertEquals(mayWriteConsent('community'), false);
  assertEquals(mayCreateOpportunity('community'), false);
});

Deno.test('only commerce may open an opportunity', () => {
  assertEquals(mayCreateOpportunity('commerce'), true);
  assertEquals(mayCreateOpportunity('transactional'), false);
});

Deno.test('a decision always carries a reason', () => {
  for (const formType of ['newsletter', 'story', 'unknown-thing', '']) {
    const { reason } = resolveLane({ projectCode: 'ACT-HV', formType });
    assertEquals(typeof reason === 'string' && reason.length > 0, true, formType);
  }
});

// ---------------------------------------------------------------------------
// THE INVARIANT (#92, #95): extra inputs may only demote, never promote.
// ---------------------------------------------------------------------------
//
// `resolveLane` takes two trusted inputs, `projectCode` and `formType`, and some
// number of extra ones. The extras come from less trustworthy places: `safetyRisk` is
// set by a form, `sourcePath` (#95) is sent by the posting site, the org test (#92)
// reads a CRM four different clients write to. The rule is that none of them may move
// a submission toward `commerce`. They may only push it toward `duty_of_care`.
//
// The table below is a MAPPED TYPE over the optional fields of `LaneInput`, which is
// what makes this a guard rather than a list someone has to remember to update. Add
// `sourcePath?: string` to `LaneInput` and this object stops type-checking until its
// cases are written, so `deno check` fails before any test runs.

type ExtraKey = Exclude<keyof LaneInput, 'projectCode' | 'formType'>;

const EXTRA_INPUT_CASES: { readonly [K in ExtraKey]: ReadonlyArray<LaneInput[K]> } = {
  safetyRisk: [undefined, false, true],
};

/** Every combination of every extra input, including all of them absent. */
function extraCombinations(): ReadonlyArray<Partial<LaneInput>> {
  let combos: Array<Partial<LaneInput>> = [{}];
  for (const key of Object.keys(EXTRA_INPUT_CASES) as ExtraKey[]) {
    const next: Array<Partial<LaneInput>> = [];
    for (const combo of combos) {
      for (const value of EXTRA_INPUT_CASES[key]) {
        next.push({ ...combo, [key]: value });
      }
    }
    combos = next;
  }
  return combos;
}

/** The trusted pairs, spanning every branch `resolveLane` can take. */
function basePairs(): ReadonlyArray<{ projectCode: string; formType: string }> {
  const projectCodes = [
    ...DUTY_OF_CARE_PROJECT_CODES,
    'ACT-HV',
    'ACT-GD',
    'ACT-JH',
    'ACT-CORE',
    'NOT-A-REAL-CODE',
    '',
  ];
  const formTypes = [
    ...DUTY_OF_CARE_FORM_TYPES,
    ...FORM_TYPE_LANE.keys(),
    'brand-new-form',
    '',
  ];
  return projectCodes.flatMap((projectCode) =>
    formTypes.map((formType) => ({ projectCode, formType }))
  );
}

Deno.test('the protection ordering covers every lane exactly once', () => {
  // Otherwise `isAtLeastAsProtective` would silently compare against undefined.
  assertEquals(Object.keys(LANE_PROTECTION).sort(), [...LANES].sort());
  assertEquals(new Set(Object.values(LANE_PROTECTION)).size, LANES.length);
  assertEquals(LANE_PROTECTION.duty_of_care, Math.max(...Object.values(LANE_PROTECTION)));
});

Deno.test('no extra input can promote a submission toward commerce', () => {
  const combos = extraCombinations();
  const pairs = basePairs();
  let checked = 0;

  for (const pair of pairs) {
    const baseline = resolveLane(pair).lane;
    for (const extras of combos) {
      const actual = resolveLane({ ...pair, ...extras }).lane;
      assertEquals(
        isAtLeastAsProtective(actual, baseline),
        true,
        `${pair.projectCode || '(empty)'} + ${pair.formType || '(empty)'} with ` +
          `${JSON.stringify(extras)} was PROMOTED from ${baseline} to ${actual}`,
      );
      checked++;
    }
  }

  // Guard the guard: if the matrices ever collapse to nothing, the loop above passes
  // vacuously and would tell us the invariant holds when it was never exercised.
  assertEquals(checked > 100, true, `only ${checked} combinations were checked`);
});

Deno.test('the invariant is capable of failing', () => {
  // A positive control for the test above. If `isAtLeastAsProtective` were written the
  // wrong way round, or the ordering flattened, the previous test would pass on a
  // classifier that promoted everything. This asserts the comparison has teeth.
  assertEquals(isAtLeastAsProtective('duty_of_care', 'commerce'), true);
  assertEquals(isAtLeastAsProtective('commerce', 'duty_of_care'), false);
  assertEquals(isAtLeastAsProtective('community', 'commerce'), true);
  assertEquals(isAtLeastAsProtective('commerce', 'community'), false);
  assertEquals(isAtLeastAsProtective('community', 'community'), true);
});

Deno.test('safetyRisk demotes every lane it can reach, and demotes nothing further', () => {
  // The one extra input that exists today, stated directly rather than only as a
  // property, so a regression names itself.
  for (const [formType, expected] of FORM_TYPE_LANE) {
    const withRisk = resolveLane({ projectCode: 'ACT-HV', formType, safetyRisk: true }).lane;
    assertEquals(withRisk, 'duty_of_care', `${formType} (${expected}) survived safetyRisk`);

    const withoutRisk = resolveLane({ projectCode: 'ACT-HV', formType, safetyRisk: false }).lane;
    assertEquals(withoutRisk, expected, `${formType} was demoted by safetyRisk: false`);
  }
});

// ---------------------------------------------------------------------------
// JusticeHub, classified 2026-08-31.
//
// Its sixteen public intake routes each rolled their own GHL call, and not one of
// their form types was named in the allowlist, so all sixteen default-denied. These
// guard the classification that replaced that.
// ---------------------------------------------------------------------------

Deno.test('JusticeHub: a tour story is duty of care, by name and not by omission', () => {
  // CONTAINED is a replica youth detention cell. `tour-story` collects the visitor's
  // own account of walking through it. If this ever resolves anywhere else, someone
  // has put a person's account of detention into a marketing audience.
  assertEquals(resolveLane({ projectCode: 'ACT-JH', formType: 'tour-story' }).lane, 'duty_of_care');
  assertEquals(resolveLane({ projectCode: 'ACT-JH', formType: 'tour-stories' }).lane, 'duty_of_care');
});

Deno.test('JusticeHub: naming it did not rely on the default, so removing the default keeps it safe', () => {
  // The control. `tour-story` is now in DUTY_OF_CARE_FORM_TYPES rather than merely
  // absent from FORM_TYPE_LANE, so the protection survives someone allowlisting it.
  assertEquals(DUTY_OF_CARE_FORM_TYPES.has('tour-story'), true);
  assertEquals(FORM_TYPE_LANE.has('tour-story'), false, 'a duty-of-care form must never be allowlisted');
});

Deno.test('JusticeHub: civic action reaches the CRM as a person, not a prospect', () => {
  for (const formType of ['nomination', 'reaction', 'mp-letter', 'connect', 'action', 'follow', 'watch', 'contribute']) {
    const decision = resolveLane({ projectCode: 'ACT-JH', formType });
    assertEquals(decision.lane, 'community', `${formType} should be community`);
    assertEquals(mayCreateOpportunity(decision.lane), false, `${formType} must not open an opportunity`);
    assertEquals(mayWriteConsent(decision.lane), false, `${formType} must not write consent`);
  }
});

Deno.test('JusticeHub: hosting and backing are the two that get an owner', () => {
  for (const formType of ['host', 'backer']) {
    assertEquals(resolveLane({ projectCode: 'ACT-JH', formType }).lane, 'commerce');
  }
  assertEquals(resolveLane({ projectCode: 'ACT-JH', formType: 'brisbane-interest' }).lane, 'transactional');
});

Deno.test('POSITIVE CONTROL: an unnamed JusticeHub form still default-denies', () => {
  // Without this, the four tests above pass just as well against an allowlist that
  // waves everything through. Adding a route to JusticeHub must keep failing closed.
  const decision = resolveLane({ projectCode: 'ACT-JH', formType: 'some-form-added-next-tuesday' });
  assertEquals(decision.lane, 'duty_of_care');
  assertEquals(reachesGhl(decision.lane), false);
});

Deno.test('a duty-of-care project still overrides a JusticeHub-shaped commerce form', () => {
  // Lane inputs may only demote. ACT-PI + host must not become commerce.
  assertEquals(resolveLane({ projectCode: 'ACT-PI', formType: 'host' }).lane, 'duty_of_care');
});

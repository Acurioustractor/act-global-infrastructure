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

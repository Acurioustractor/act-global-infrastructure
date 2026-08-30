// Tests for notification and acknowledgement routing.
//
// Run: deno test supabase/functions/intake/notify.test.ts
//
// The load-bearing one is "a duty-of-care notification never carries the message body".
// It has a positive control immediately after it, because a test that greps for absent
// text passes just as happily when the text is never included for anybody, and would
// then be guarding nothing.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LANES } from './lanes.ts';
import {
  ackChannelFor,
  audienceTagsOn,
  DESK_ADDRESS,
  DESK_TAGS,
  buildAcknowledgement,
  buildNotification,
  NOTIFY_INBOX,
  type SubmissionSummary,
} from './notify.ts';

const SECRET_BODY = 'PRIVATE-BODY-THAT-MUST-NOT-LEAK-8f3a2c';

const SUBMISSION: SubmissionSummary = {
  id: 'row-123',
  site: 'goodsoncountry.com',
  projectCode: 'ACT-GD',
  formType: 'partnership',
  submitterName: 'Dy Kelaart',
  submitterEmail: 'dy@example.org',
  body: SECRET_BODY,
  laneReason: 'form type partnership is allowlisted as commerce',
};

Deno.test('the notify inbox is the one address proven to receive', () => {
  // hi@act.place has working Google Workspace MX. The other four published estate
  // addresses have no MX at all, so naming any of them here would be a silent drop.
  assertEquals(NOTIFY_INBOX, 'hi@act.place');
});

Deno.test('duty of care never acknowledges through GHL; every other lane does', () => {
  for (const lane of LANES) {
    const channel = ackChannelFor(lane);
    if (lane === 'duty_of_care') {
      assertEquals(channel, 'direct', 'duty of care would have created a GHL contact');
    } else {
      assertEquals(channel, 'ghl', `${lane} should thread its reply back into GHL`);
    }
  }
});

Deno.test('a duty-of-care notification never carries the message body', () => {
  const { subject, text } = buildNotification('duty_of_care', SUBMISSION);
  assertEquals(text.includes(SECRET_BODY), false, 'the body leaked into the notification');
  assertEquals(subject.includes(SECRET_BODY), false, 'the body leaked into the subject');
});

Deno.test('POSITIVE CONTROL: every other lane does carry the body', () => {
  // Without this, the test above would pass on a buildNotification that never included
  // a body at all, and the guard would be measuring nothing.
  for (const lane of LANES.filter((l) => l !== 'duty_of_care')) {
    const { text } = buildNotification(lane, SUBMISSION);
    assertEquals(text.includes(SECRET_BODY), true, `${lane} lost the message body`);
  }
});

Deno.test('a duty-of-care notification still says who, where and which door', () => {
  // Withholding the body is not withholding the route. #90: the alert carries identity
  // and route so a human can act, and never the contents.
  const { text } = buildNotification('duty_of_care', SUBMISSION);
  for (const needle of ['Dy Kelaart', 'goodsoncountry.com', 'ACT-GD', 'partnership', 'row-123']) {
    assertEquals(text.includes(needle), true, `notification lost ${needle}`);
  }
  assertEquals(text.includes('must not be added'), true, 'no warning against CRM entry');
});

Deno.test('a notification survives a submission with almost nothing on it', () => {
  const bare: SubmissionSummary = { site: 's', projectCode: 'ACT-CORE', formType: 'contact' };
  for (const lane of LANES) {
    const { subject, text } = buildNotification(lane, bare);
    assertEquals(subject.length > 0, true, `${lane} produced an empty subject`);
    assertEquals(text.includes('someone unnamed'), true, `${lane} lost the unnamed fallback`);
  }
});

Deno.test('every lane produces a non-empty acknowledgement', () => {
  for (const lane of LANES) {
    const { subject, text } = buildAcknowledgement(lane, SUBMISSION);
    assertEquals(subject.trim().length > 0, true, `${lane} subject`);
    assertEquals(text.trim().length > 0, true, `${lane} text`);
    assertEquals(text.startsWith('Dy,'), true, `${lane} did not greet by first name`);
  }
});

Deno.test('an acknowledgement never quotes the message back', () => {
  // A duty-of-care ack can be read over someone's shoulder, and a commerce ack gets
  // forwarded. Neither needs the original text in it.
  for (const lane of LANES) {
    const { text } = buildAcknowledgement(lane, SUBMISSION);
    assertEquals(text.includes(SECRET_BODY), false, `${lane} quoted the body back`);
  }
});

Deno.test('an acknowledgement greets politely when there is no name', () => {
  const anon: SubmissionSummary = { site: 's', projectCode: 'ACT-CORE', formType: 'contact' };
  for (const lane of LANES) {
    assertEquals(buildAcknowledgement(lane, anon).text.startsWith('Hello,'), true, lane);
  }
});

// ---------------------------------------------------------------------------
// The desk contact.
// ---------------------------------------------------------------------------

/**
 * The real tag set on hi@act.place (GHL contact x9ppRP5MZJnF6v01DgWj), read from the
 * live location on 2026-08-30. Kept verbatim as a fixture because it is the actual
 * shape of the problem: none of these were chosen for that contact, they arrived
 * through a Gmail import and the LGANT delivery checks.
 */
const POLLUTED_HI_ACT_PLACE_TAGS = [
  'photo-wall',
  'harvest-gathering-photos',
  'project:act-hv',
  'source:website',
  'source:event:eoi-gathering-2026',
  'source:event:gathering',
  'tier:curious',
  'lane:community',
  'role:storyteller',
  'project:act-gd',
  'goods-partner-lead',
  'role:partner',
  'goods-segment-plastic-supply',
  'act-inquiry',
  'project-goods',
];

Deno.test('the desk does not reuse the polluted hi@act.place contact', () => {
  // Compared as widened strings on purpose. Both constants are string LITERAL types,
  // so `DESK_ADDRESS === NOTIFY_INBOX` is rejected by tsc outright as a comparison with
  // no overlap: the invariant is already proven at compile time. This asserts it at run
  // time as well, so that annotating either constant as `string` later cannot quietly
  // collapse the desk back onto the polluted contact without a test saying so.
  assertEquals((DESK_ADDRESS as string) === (NOTIFY_INBOX as string), false);
  assertEquals(DESK_ADDRESS.endsWith('@act.place'), true, 'the desk left the working domain');
});

Deno.test('the desk contact carries no tag that could put it in a send', () => {
  assertEquals(audienceTagsOn(DESK_TAGS), []);
});

Deno.test('POSITIVE CONTROL: the guard catches the real pollution it was written for', () => {
  // Without this, the test above passes on an audienceTagsOn that returns [] for
  // everything, and the desk guard would be measuring nothing.
  const caught = audienceTagsOn(POLLUTED_HI_ACT_PLACE_TAGS);
  assertEquals(caught.includes('lane:community'), true);
  assertEquals(caught.includes('tier:curious'), true);
  assertEquals(caught.includes('role:storyteller'), true);
  assertEquals(caught.includes('goods-segment-plastic-supply'), true);
  assertEquals(caught.includes('goods-partner-lead'), true);
  assertEquals(caught.length >= 5, true, `only caught ${caught.length}: ${caught.join(', ')}`);
});

Deno.test('the guard does not fire on tags that only describe where a contact came from', () => {
  // project: and source: say which door someone used. They do not select an audience,
  // and flagging them would train the operator to ignore the warning.
  assertEquals(audienceTagsOn(['project:act-gd', 'source:website', 'act-inquiry']), []);
});

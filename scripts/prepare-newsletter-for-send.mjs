#!/usr/bin/env node
/**
 * Prepare a send-ready newsletter draft for manual paste into Gmail/GHL.
 *
 * MVP-stage: skips GHL/Gmail API integration (deferred to Day 4-5). Instead
 * writes a clipboard-ready text file at /tmp/newsletter-<edition_slug>.txt
 * with recipient + subject + body in a paste-friendly layout. Ben opens
 * Gmail (or GHL), pastes, hits send, then runs `--mark-sent` to update
 * Supabase state.
 *
 * This matches the existing scripts/prepare-goods-newsletter.mjs pattern
 * (AI prepares; human assembles delivery).
 *
 * Usage:
 *   # Prepare a draft for manual send
 *   node scripts/prepare-newsletter-for-send.mjs <edition-slug>
 *
 *   # After you've sent in Gmail/GHL, mark it sent
 *   node scripts/prepare-newsletter-for-send.mjs <edition-slug> --mark-sent
 *
 * Plan: act-communication-pipeline-2026-05-23-locked (Day 3)
 * Defer: Day 4-5 builds Gmail draft (per-recipient audiences) +
 *        GHL campaign (brand audience) automation.
 */

import 'dotenv/config';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const editionSlug = args.find(a => !a.startsWith('--'));
const markSent = args.includes('--mark-sent');

if (!editionSlug) {
  console.error('Usage: node scripts/prepare-newsletter-for-send.mjs <edition-slug> [--mark-sent]');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const FUNDERS_PATH = '/Users/benknight/Code/act-global-infrastructure/wiki/narrative/funders.json';

async function main() {
  const { data: draft, error } = await supabase
    .from('newsletter_drafts')
    .select('*')
    .eq('edition_slug', editionSlug)
    .single();

  if (error || !draft) {
    console.error(`Draft not found: ${editionSlug}`);
    process.exit(1);
  }

  if (markSent) {
    if (draft.status === 'sent') {
      console.log(`Already marked sent at ${draft.sent_at}`);
      return;
    }
    const { error: e } = await supabase
      .from('newsletter_drafts')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        status_changed_at: new Date().toISOString(),
      })
      .eq('id', draft.id);
    if (e) { console.error('Mark-sent failed:', e.message); process.exit(1); }
    console.log(`✓ ${editionSlug} marked sent at ${new Date().toISOString()}`);
    return;
  }

  // Soft-warn double-confirm gate (locked Q10)
  if (draft.consent_warnings && Object.keys(draft.consent_warnings).length && !draft.double_confirmed) {
    console.error('⚠️  This draft has consent warnings AND has not been double-confirmed:');
    for (const [sid, ws] of Object.entries(draft.consent_warnings)) {
      console.error(`     ${sid}: ${ws.join(', ')}`);
    }
    console.error('\nBefore preparing for send, check with the storyteller and set:');
    console.error(`     UPDATE newsletter_drafts SET double_confirmed=TRUE WHERE id='${draft.id}';`);
    process.exit(1);
  }

  // Resolve recipient email from funders.json if funder audience
  let recipientEmail = '(unset — set in funders.json:primary_email or via GHL)';
  let recipientName = '';
  if (draft.audience === 'funder' && draft.recipient_slug && existsSync(FUNDERS_PATH)) {
    const funders = JSON.parse(readFileSync(FUNDERS_PATH, 'utf8'));
    const f = funders.funders[draft.recipient_slug];
    if (f) {
      recipientName = f.primary_contact || '';
      recipientEmail = f.primary_email || `(${f.primary_contact || 'TBD'} — add primary_email field to funders.json[${draft.recipient_slug}])`;
    }
  }

  const subject = draft.selected_subject || (draft.subject_candidates || [])[0] || '(no subject)';

  const output = [
    `# Newsletter ready to send — ${editionSlug}`,
    '',
    `Status:        ${draft.status}`,
    `Audience:      ${draft.audience}`,
    `Recipient:     ${recipientName} (${draft.recipient_slug || 'mass list'})`,
    `Email:         ${recipientEmail}`,
    `Voice grade:   ${draft.voice_grade_score}/100`,
    `Edition:       ${draft.edition_period}`,
    `Generated:     ${draft.created_at}`,
    '',
    '─────────────────────────────────────────────',
    'SUBJECT:',
    '',
    subject,
    '',
    '─────────────────────────────────────────────',
    'SUBJECT CANDIDATES (in case you want a different one):',
    '',
    ...(draft.subject_candidates || []).map((s, i) => `  ${i + 1}. ${s}${s === subject ? '   ← selected' : ''}`),
    '',
    '─────────────────────────────────────────────',
    'BODY:',
    '',
    draft.body_md,
    '',
    '─────────────────────────────────────────────',
    'NEXT STEPS:',
    '',
    `  1. Review the body above. Tweak as needed (edit in Notion if convenient,`,
    `     then re-run this prepare script).`,
    `  2. Open Gmail (for funder/partner/storyteller — personal letter)`,
    `     OR GHL (for brand — mass list send).`,
    `  3. Paste subject + body. Send.`,
    `  4. Mark this edition sent:`,
    `        node scripts/prepare-newsletter-for-send.mjs ${editionSlug} --mark-sent`,
    '',
  ];

  const outputPath = `/tmp/newsletter-${editionSlug}.txt`;
  writeFileSync(outputPath, output.join('\n'));

  console.log(`\n✓ Ready to send. Open + copy from:`);
  console.log(`     ${outputPath}`);
  console.log('');
  console.log(`Or read inline:`);
  console.log(`     cat ${outputPath}`);
  console.log('');
  console.log(`After sending, mark it sent:`);
  console.log(`     node scripts/prepare-newsletter-for-send.mjs ${editionSlug} --mark-sent`);
}

main().catch((e) => {
  console.error('Prepare failed:', e);
  process.exit(1);
});

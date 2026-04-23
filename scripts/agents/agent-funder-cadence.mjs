#!/usr/bin/env node
/**
 * A2 — Funder Cadence
 *
 * Daily 06:00 AEST.
 *
 * Silence rule: no funder goes silent for more than 21 days.
 *
 * Given: named funders list (Snow, QBE, Minderoo, PRF, ACF, FRRR, Vincent
 * Fairfax, AMP Spark, Centrecorp, Nova Peris), their last-touch dates, latest
 * community deployment data, most recent storyteller moment.
 *
 * Task: for any funder silent >18 days, draft a 120-word progress note matching
 * that funder's engagement style. For any funder >21 days silent, escalate.
 *
 * Cost: Sonnet tier. Typical run ≤ $0.03 per silent funder.
 * Autonomy: L2 — agent drafts; Ben sends Friday during writing block.
 *
 * STUB: first production deployment May Week 1 per 6-month plan.
 */

import { createClient } from '@supabase/supabase-js';
import { runAgent, todayISO } from '../lib/goods-agent-runtime.mjs';
import '../../lib/load-env.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Funder identity is defined by multiple signals: email domain (most reliable),
 * company_name patterns, and known people. The matcher tries all three and
 * picks the contact with most recent activity.
 */
const NAMED_FUNDERS = [
  { name: 'Snow Foundation', emailDomains: ['snowfoundation.org.au'], companyPatterns: ['snow foundation'], knownPeople: ['sally grimsley-ballard', 'georgina byron'] },
  { name: 'QBE Foundation', emailDomains: ['qbe.com', 'qbefoundation.com'], companyPatterns: ['qbe foundation', 'qbe'], knownPeople: [] },
  { name: 'Minderoo Foundation', emailDomains: ['minderoo.org', 'minderoo.com.au'], companyPatterns: ['minderoo'], knownPeople: [] },
  { name: 'Paul Ramsay Foundation', emailDomains: ['paulramsayfoundation.org.au', 'paulramsay.org.au'], companyPatterns: ['paul ramsay', 'ramsay foundation'], knownPeople: [] },
  { name: 'Australian Communities Foundation', emailDomains: ['communityfoundation.org.au', 'australiancommunities.org.au'], companyPatterns: ['australian communities foundation', 'acf'], knownPeople: [] },
  { name: 'FRRR', emailDomains: ['frrr.org.au'], companyPatterns: ['frrr', 'foundation for rural'], knownPeople: ['steph pearson', 'katie norman'] },
  { name: 'Vincent Fairfax Family Foundation', emailDomains: ['vfff.org.au'], companyPatterns: ['vincent fairfax', 'vfff'], knownPeople: [] },
  { name: 'AMP Foundation', emailDomains: ['ampfoundation.com.au', 'amp.com.au'], companyPatterns: ['amp foundation', 'amp tomorrow'], knownPeople: [] },
  { name: 'Centrecorp Foundation', emailDomains: ['centrecorp.com.au'], companyPatterns: ['centrecorp'], knownPeople: [] },
  { name: 'Nova Peris Foundation', emailDomains: ['novaperis.org.au', 'novaperisfoundation.org.au'], companyPatterns: ['nova peris'], knownPeople: [] },
  { name: 'The Funding Network', emailDomains: ['thefundingnetwork.com.au', 'tfn.org.au'], companyPatterns: ['funding network', 'tfn'], knownPeople: [] },
];

const SILENCE_WARN_DAYS = 18;
const SILENCE_ESCALATE_DAYS = 21;

async function gatherContext() {
  const today = new Date();

  // Load all Goods-universe contacts once, then match in memory against all funder signals.
  // Better than N separate queries with narrow ilike patterns.
  const { data: allContacts } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, full_name, first_name, last_name, email, company_name, tags, last_contact_date, updated_at');

  const lastTouches = NAMED_FUNDERS.map(f => {
    const matches = (allContacts ?? []).filter(c => {
      const emailMatch = c.email && f.emailDomains.some(d =>
        c.email.toLowerCase().endsWith('@' + d) || c.email.toLowerCase().endsWith('.' + d)
      );
      const companyMatch = c.company_name && f.companyPatterns.some(p =>
        c.company_name.toLowerCase().includes(p.toLowerCase())
      );
      const nameMatch = c.full_name && f.knownPeople.some(p =>
        c.full_name.toLowerCase().includes(p.toLowerCase())
      );
      return emailMatch || companyMatch || nameMatch;
    });

    // Pick the contact with most recent last_contact_date; fall back to updated_at.
    matches.sort((a, b) => {
      const ta = new Date(a.last_contact_date || a.updated_at || 0).getTime();
      const tb = new Date(b.last_contact_date || b.updated_at || 0).getTime();
      return tb - ta;
    });
    const latest = matches[0];
    const lastTouchDate = latest?.last_contact_date || latest?.updated_at;
    const daysSince = lastTouchDate
      ? Math.floor((today - new Date(lastTouchDate)) / (24 * 60 * 60 * 1000))
      : null;

    return {
      funder: f.name,
      matchedContact: latest ? `${latest.full_name} <${latest.email ?? '-'}>` : null,
      contactId: latest?.ghl_id,
      email: latest?.email,
      lastTouch: lastTouchDate,
      daysSince,
      matchCount: matches.length,
    };
  });

  const silent = lastTouches.filter(f =>
    f.daysSince === null || f.daysSince > SILENCE_WARN_DAYS
  );

  // Latest deployment metrics for progress-note body
  const { data: deploymentMetrics } = await supabase
    .from('bank_statement_lines')
    .select('amount')
    .eq('project_code', 'ACT-GD')
    .limit(100);

  return {
    silent,
    allTouches: lastTouches,
    deploymentCount: deploymentMetrics?.length ?? 0,
  };
}

function composePrompt({ silent, allTouches, deploymentCount }) {
  if (silent.length === 0) {
    return `
FUNDER STATE (${todayISO()}):
All ${allTouches.length} named funders have been touched within the last ${SILENCE_WARN_DAYS} days.

TASK: Return exactly this text: "All funders current — no cadence drafts required this run."
`.trim();
  }

  const silentList = silent.map(s =>
    `- ${s.funder}: ${s.daysSince === null ? 'no touch on record' : `${s.daysSince} days silent`} (last: ${s.lastTouch?.slice(0, 10) || 'never'})`
  ).join('\n');

  return `
FUNDER STATE (${todayISO()}):

SILENT FUNDERS (>${SILENCE_WARN_DAYS} days):
${silentList}

DEPLOYMENT SIGNAL (ACT-GD last 100 bank lines): ${deploymentCount} transactions.

---

TASK:
For each silent funder above, draft a 120-word progress note appropriate to that funder's relationship style.

Style guide per funder (apply if relationship context suggests it):
- Snow Foundation — warm, Sally-to-Ben personal tone; lead with a specific community moment; close with a line on what's next
- QBE Foundation — formal-but-warm; lead with a factual progress marker; Catalysing Impact cohort context
- Minderoo — systems-framing; lead with a pattern-level observation, not a single community anecdote
- Paul Ramsay Foundation — systems-change procurement frame; lead with structural language
- Australian Communities Foundation — donor-collaborative tone; lead with invitation
- FRRR — long-history tone; lead with acknowledgment of prior support + specific deployment detail
- Vincent Fairfax Family Foundation — long-history warmth; lead with thank-you + update
- AMP Foundation — corporate cadence; lead with numbers + one anecdote
- Centrecorp — business-partnership tone; lead with order state + community impact
- Nova Peris — Indigenous-leadership-respectful; lead with community-named voice, not CEO voice

ZERO-FABRICATION RULE (load-bearing — do not violate):

You have NO ground-truth access to this month's deployment numbers, community
names beyond what the CEO briefing above confirms, specific item counts,
government procurement percentages, or storyteller moments. DO NOT invent
them. They will be read by real funders who will notice.

For EVERY factual claim in a draft note, use a placeholder marker the CEO
fills in before send:

  [# beds deployed this month — verify via asset register]
  [community name — verify current permissioned storyteller]
  [invoice amount — verify via Xero]
  [date — verify]

Write around the placeholders in Curtis voice. Example of the correct pattern:

  Ben here. This month [# beds] went out. Most landed in [community — verify],
  where [named relationship owner — verify] walked the install. One moment
  worth naming: [specific detail — ADD ONLY IF VERIFIED, else omit this sentence].

This makes the draft immediately useful to the CEO — they replace 3-5 brackets
with real numbers in 60 seconds. Without brackets, the whole draft becomes
unreviewable because fabrications look identical to facts.

OTHER RULES:
- 120 words maximum per draft, placeholders included
- No AI tells (no "delve," "crucial," "tapestry," "underscore," em-dashes,
  "not just X but Y," rule-of-three padding)
- No "wanted to touch base" / "hope this finds you well" openers
- No fabricated quotes from community members — ever
- If a funder has NO contact record in the context, output ONLY:
  "Status: no contact record in GHL — create a contact first"
  and nothing else for that funder

OUTPUT FORMAT:

## <Funder Name> (<days> days silent)
**Subject:** <draft subject line>
**Draft body:**
> <120 words in Curtis voice>

<repeat for each silent funder>

## Escalation flags
Any funder >${SILENCE_ESCALATE_DAYS} days silent is escalated here with "ACTION: phone before email."
`.trim();
}

async function main() {
  const context = await gatherContext();
  const userPrompt = composePrompt(context);

  if (context.silent.length === 0) {
    console.log(`[funder-cadence] all funders current — no drafts needed`);
    return;
  }

  const result = await runAgent({
    name: 'funder-cadence',
    task: 'draft',

    budget: {
      maxTokens: 4000,
      maxToolCalls: 0,
    },

    stopCriteria:
      'stop when a 120-word draft note has been written for every silent funder listed in the context, plus the escalation flag section',

    fallback:
      'if a funder has no contact record (null lastTouch), draft a single-line note stating "no contact record in GHL — create a contact first" rather than fabricating a plausible draft',

    scopedFiles: [
      'ghl_contacts (supabase, filtered to named funders)',
      'bank_statement_lines (supabase, ACT-GD)',
    ],

    systemPrompt: `
You are the Funder Cadence agent for Goods on Country.

Your single task: every day at 06:00, check named funder last-touch dates. For any funder silent more than 18 days, draft a progress note appropriate to their relationship style.

You do NOT send. You draft. Ben reviews and sends in the Friday writing block.

You are strict with voice: 120 words, Curtis method where load-bearing (named room, named body, loaded noun), no AI tells, no padding, no fake intimacy.

You are strict with fact: no dollar figures unless verified, no quotes unless explicitly consented, no "we're on track" without a concrete marker.
`.trim(),

    userPrompt,

    outputPath: `thoughts/shared/drafts/funder-notes/${todayISO()}.md`,

    autonomyLevel: 2,
    knowledgeType: 'action_item',
    telegramSummary: context.silent.length >= 3,

    dryRun: DRY_RUN,
  });

  if (VERBOSE) {
    console.log('\n=== funder cadence output ===');
    console.log(result.output);
  }

  console.log(`[funder-cadence] drafted ${context.silent.length} funder notes`);
}

main().catch(err => {
  console.error(`[funder-cadence] FAILED: ${err.message}`);
  process.exit(1);
});

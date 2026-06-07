#!/usr/bin/env node
/**
 * One-shot patch to wiki/narrative/funders.json with the verified
 * emails + last_communicated_at + projects_funded[] from the Gmail
 * and GHL audits performed 2026-05-23.
 *
 * Conservative — only adds fields where data is high-confidence.
 * Doesn't touch tone, framing_notes, claims_to_lead_with (left for
 * Ben's manual review).
 *
 * Usage:
 *   node scripts/patch-funders-json.mjs           # dry run (show diff)
 *   node scripts/patch-funders-json.mjs --apply
 *
 * Plan: act-communication-pipeline-2026-05-23-locked
 */

import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';

const apply = process.argv.includes('--apply');
const FUNDERS_PATH = '/Users/benknight/Code/act-global-infrastructure/wiki/narrative/funders.json';

// Verified updates per funder (from Gmail + GHL audits)
const PATCHES = {
  'snow-foundation': {
    primary_email: 's.grimsley-ballard@snowfoundation.org.au, a.lageleekean@snowfoundation.org.au',
    cc_email: 'g.byron@snowfoundation.org.au, a.machuca@snowfoundation.org.au, c.ludovici@snowfoundation.org.au',
    last_communicated_at: '2026-05-20',
    projects_funded: ['ACT-GD'],
  },
  'minderoo': {
    stage: 'paused',
    primary_email: 'lstronach@minderoo.org',
    last_communicated_at: '2026-05-14',
    projects_funded: ['ACT-CN', 'ACT-JH'],
    pause_note: 'Lucy paused justice conversations 2026-05-14 — Minderoo internal restructure. Re-engage Q3 FY27 or on her signal.',
  },
  'qbe-catalysing-impact': {
    stage: 'active-partner',
    primary_email: 'jay@socialimpacthub.org, matt.allen@socialimpacthub.org',
    cc_email: 'malcolm.aikman@socialimpacthub.org',
    primary_contact: 'Jay Boolkin (SIH admin) / Matt Allen (Goods diagnostic)',
    last_communicated_at: '2026-05-19',
    projects_funded: ['ACT-GD'],
    administration_note: 'Relationship runs through Social Impact Hub admin team, not QBE direct. Catalysing Impact 2026 cohort.',
  },
  'dusseldorp-forum': {
    primary_email: 'jessicaduffy@dusseldorp.org.au, margotbeach@dusseldorp.org.au',
    cc_email: 'teya@dusseldorp.org.au, rachelfyfe@dusseldorp.org.au',
    primary_contact: 'Jessica Duffy / Margot Beach (Teya + Rachel CC)',
    last_communicated_at: '2026-05-19',
    projects_funded: ['ACT-CN', 'ACT-JH'],
  },
  'jcf': {
    primary_email: 'anne.gripper@outlook.com',
    primary_contact: 'Anne Gripper',
    last_communicated_at: '2026-05-21',
    projects_funded: ['ACT-EL', 'ACT-GD'],
  },
  'centrecorp': {
    primary_email: 'randle@centrecorp.com.au, jodie@centrecorp.com.au',
    primary_contact: 'Randle Walker / Jodie Tilmouth',
    last_communicated_at: '2026-02-13',
    projects_funded: ['ACT-GD'],
  },
  'streetsmart-australia': {
    primary_email: 'adam@streetsmartaustralia.org, isabella@streetsmartaustralia.org, alan@streetsmartaustralia.org',
    primary_contact: 'Adam Robinson (CEO) / Isabella Stanley / Alan White',
    last_communicated_at: '2026-03-28',
    projects_funded: ['ACT-JH'],
  },
  'rotary-eclub-outback-australia-9560': {
    primary_email: 'pene.curtis@bigpond.com, greg@marlowcanete.com.au',
    primary_contact: 'Pene Curtis / Greg Marlow',
    last_communicated_at: '2026-04-13',
    projects_funded: ['ACT-GD'],
  },
  'paul-ramsay-foundation': {
    primary_email: 'wfrazer@paulramsayfoundation.org.au',
    cc_email: 'jonas@paulramsayfoundation.org.au, pkaur@paulramsayfoundation.org.au, jpayne@paulramsayfoundation.org.au',
    primary_contact: 'William Frazer (Jonas + Prebhjot + Julia CC)',
    last_communicated_at: null, // newsletter subscription only, no direct
    projects_funded: ['ACT-GD', 'ACT-JH'],
  },
  'tim-fairfax': {
    stage: 'warm',
    primary_email: 'knorman@tfff.org.au',
    primary_contact: 'Katie Norman',
    last_communicated_at: '2026-05-20',
    projects_funded: ['ACT-EL', 'ACT-JH'],
  },
};

function diff(before, after) {
  const lines = [];
  for (const k of Object.keys(after)) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      const oldVal = before[k] === undefined ? '(unset)' : JSON.stringify(before[k]);
      const newVal = JSON.stringify(after[k]);
      lines.push(`    ${k}: ${oldVal} → ${newVal}`);
    }
  }
  return lines;
}

function main() {
  const data = JSON.parse(readFileSync(FUNDERS_PATH, 'utf8'));
  let changeCount = 0;
  let funderCount = 0;

  for (const [slug, patch] of Object.entries(PATCHES)) {
    if (!data.funders[slug]) {
      console.log(`  ⚠ skip ${slug} — not in funders.json`);
      continue;
    }
    const before = { ...data.funders[slug] };
    const after = { ...before, ...patch };
    const diffLines = diff(before, after);
    if (diffLines.length === 0) {
      console.log(`  · ${slug} (no changes)`);
      continue;
    }
    funderCount++;
    changeCount += diffLines.length;
    console.log(`  ✏ ${slug}`);
    for (const line of diffLines) console.log(line);
    data.funders[slug] = after;
  }

  // Bump metadata
  data.updated = new Date().toISOString().slice(0, 10);

  console.log(`\n${apply ? '🔥 APPLY' : '🔍 DRY RUN'} — ${changeCount} field changes across ${funderCount} funders`);

  if (apply) {
    writeFileSync(FUNDERS_PATH, JSON.stringify(data, null, 2) + '\n');
    console.log(`✓ wrote ${FUNDERS_PATH}`);
  } else {
    console.log(`  Re-run with --apply to write.`);
  }
}

main();

#!/usr/bin/env node
// Usage: node packages/act-projects/bin/check.mjs [--strict] [--json]
//   default  exit 1 on schema or guard errors; print gaps, exit 0
//   --strict exit 1 on gaps too (turn on once step 2 of the plan has filled the record)
import { loadProjects } from '../src/index.mjs';

const strict = process.argv.includes('--strict');
const json = process.argv.includes('--json');

let result;
try {
  result = loadProjects();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const { projects, gaps } = result;
if (json) {
  console.log(JSON.stringify({ projects: Object.keys(projects).length, gaps }, null, 2));
} else {
  console.log(`${Object.keys(projects).length} projects parsed, schema and guards clean.`);
  if (gaps.length) {
    console.log(`\n${gaps.length} gaps (fields a live project needs but does not have):\n`);
    const byField = {};
    for (const g of gaps) (byField[g.field] ||= []).push(g);
    for (const [field, list] of Object.entries(byField)) {
      console.log(`  ${field} (${list.length})`);
      for (const g of list) console.log(`    ${g.code.padEnd(9)} ${g.tier.padEnd(10)} ${g.why}`);
    }
  }
}
process.exit(strict && gaps.length ? 1 : 0);

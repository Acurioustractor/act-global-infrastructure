#!/usr/bin/env node
import '../lib/load-env.mjs';
import { Client } from '@notionhq/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const dbIds = JSON.parse(readFileSync(join(__dirname, '../config/notion-database-ids.json'), 'utf8'));
const dsIds = JSON.parse(readFileSync(join(__dirname, '../config/notion-datasource-ids.json'), 'utf8'));

function getText(prop) {
  if (!prop) return null;
  if (prop.type === 'title') return prop.title?.[0]?.plain_text || '';
  if (prop.type === 'rich_text') return prop.rich_text?.[0]?.plain_text?.slice(0, 60) || '';
  if (prop.type === 'select') return prop.select?.name || '';
  if (prop.type === 'multi_select') return prop.multi_select?.map(s => s.name).join(', ') || '';
  if (prop.type === 'status') return prop.status?.name || '';
  if (prop.type === 'date') return prop.date?.start || '';
  if (prop.type === 'people') return prop.people?.map(p => p.name).join(', ') || '';
  if (prop.type === 'relation') return `${prop.relation?.length || 0} rels`;
  if (prop.type === 'checkbox') return String(prop.checkbox);
  if (prop.type === 'number') return String(prop.number ?? '');
  if (prop.type === 'url') return prop.url || '';
  if (prop.type === 'rollup') return '(rollup)';
  if (prop.type === 'formula') return '(formula)';
  if (prop.type === 'files') return `${prop.files?.length || 0} files`;
  return `(${prop.type})`;
}

async function sample(name, dsId) {
  try {
    const res = await notion.dataSources.query({ data_source_id: dsId, page_size: 2 });
    const total = res.has_more ? '100+' : res.results.length;
    console.log(`\n=== ${name} (${total} records) ===`);
    if (res.results[0]) {
      for (const [k, v] of Object.entries(res.results[0].properties)) {
        console.log(`  ${k}: ${v.type} = ${getText(v)}`);
      }
    }
  } catch (e) {
    console.error(`${name}: ERROR — ${e.message.slice(0, 100)}`);
  }
}

// Sample all databases from the config
const toSample = [
  ['Meetings', dsIds.meetings],
  ['Actions', dsIds.actions],
  ['Planning Calendar', dsIds.planningCalendar],
  ['Content Hub', dsIds.contentHub],
  ['Mission Control', dsIds.missionControl],
  ['Operations Hub', dsIds.operationsHub],
  ['Finance Overview', dsIds.financeOverview],
  ['Grant Pipeline', dsIds.grantPipeline],
];

for (const [name, id] of toSample) {
  await sample(name, id);
}

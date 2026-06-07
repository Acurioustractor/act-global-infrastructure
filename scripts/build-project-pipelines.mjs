#!/usr/bin/env node
/**
 * Rolls up GHL opportunities into project_pipelines (project_code × pipeline_name).
 *
 * Reads:  ghl_opportunities
 * Writes: project_pipelines (Supabase) + thoughts/shared/reports/project-pipelines-latest.json + .md
 *
 * Cron:   daily 06:10 AEST (after supporters-intelligence at 06:00)
 *
 * Plan: act-communication-pipeline-2026-05-23-locked § GHL pipelines integration
 */

import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const REPORT_JSON = '/Users/benknight/Code/act-global-infrastructure/thoughts/shared/reports/project-pipelines-latest.json';
const REPORT_MD   = '/Users/benknight/Code/act-global-infrastructure/thoughts/shared/reports/project-pipelines-latest.md';

async function main() {
  console.log('🔍 Building per-project pipeline rollup...\n');

  // Pull all opportunities
  const { data: opps, error } = await supabase
    .from('ghl_opportunities')
    .select('project_code, pipeline_name, stage_name, status, monetary_value, ghl_contact_id, ghl_updated_at, ghl_created_at')
    .range(0, 9999);
  if (error) throw error;
  console.log(`✓ Loaded ${opps.length} opportunities`);

  // Group by (project_code || 'untagged') × pipeline_name
  const agg = new Map();
  function key(pc, pn) { return `${pc || 'untagged'}::${pn}`; }
  function ensure(k, project_code, pipeline_name) {
    if (!agg.has(k)) {
      agg.set(k, {
        project_code: project_code || 'untagged',
        pipeline_name,
        open_count: 0, won_count: 0, lost_count: 0,
        open_value_aud: 0, won_value_aud: 0,
        earliest_open_at: null,
        latest_activity_at: null,
        stages_present: new Set(),
        contacts: new Set(),
      });
    }
    return agg.get(k);
  }

  for (const o of opps) {
    const a = ensure(key(o.project_code, o.pipeline_name), o.project_code, o.pipeline_name);
    if (o.status === 'open') {
      a.open_count++;
      a.open_value_aud += Number(o.monetary_value || 0);
      if (o.ghl_created_at && (!a.earliest_open_at || o.ghl_created_at < a.earliest_open_at)) {
        a.earliest_open_at = o.ghl_created_at;
      }
    }
    if (o.status === 'won')  { a.won_count++;  a.won_value_aud += Number(o.monetary_value || 0); }
    if (o.status === 'lost') { a.lost_count++; }
    if (o.stage_name) a.stages_present.add(o.stage_name);
    if (o.ghl_contact_id) a.contacts.add(o.ghl_contact_id);
    if (o.ghl_updated_at && (!a.latest_activity_at || o.ghl_updated_at > a.latest_activity_at)) {
      a.latest_activity_at = o.ghl_updated_at;
    }
  }

  const rows = [...agg.values()].map(a => ({
    project_code: a.project_code,
    pipeline_name: a.pipeline_name,
    open_count: a.open_count,
    won_count: a.won_count,
    lost_count: a.lost_count,
    open_value_aud: Math.round(a.open_value_aud * 100) / 100,
    won_value_aud: Math.round(a.won_value_aud * 100) / 100,
    earliest_open_at: a.earliest_open_at,
    latest_activity_at: a.latest_activity_at,
    stages_present: [...a.stages_present],
    contacts_count: a.contacts.size,
    computed_at: new Date().toISOString(),
  }));

  // Wipe + bulk insert (simpler than upsert; small table)
  await supabase.from('project_pipelines').delete().neq('project_code', '___never_match');
  const { error: insErr } = await supabase.from('project_pipelines').insert(rows);
  if (insErr) {
    console.error('Insert failed:', insErr.message);
    process.exit(1);
  }
  console.log(`✓ Wrote ${rows.length} project×pipeline rows to project_pipelines`);

  // Build report
  const byProject = new Map();
  for (const r of rows) {
    if (!byProject.has(r.project_code)) {
      byProject.set(r.project_code, {
        project_code: r.project_code,
        pipelines: [],
        total_open: 0, total_won: 0,
        open_value: 0, won_value: 0,
      });
    }
    const p = byProject.get(r.project_code);
    p.pipelines.push(r);
    p.total_open += r.open_count;
    p.total_won  += r.won_count;
    p.open_value += r.open_value_aud;
    p.won_value  += r.won_value_aud;
  }
  const projects = [...byProject.values()].sort((a, b) => b.open_value - a.open_value);
  writeFileSync(REPORT_JSON, JSON.stringify({ generated_at: new Date().toISOString(), projects }, null, 2));

  // Markdown table
  const lines = [];
  lines.push('# Per-project pipeline rollup');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString().slice(0, 16)}Z`);
  lines.push(`Source: \`ghl_opportunities\` × \`project_code\``);
  lines.push('');
  lines.push('## Top projects by open pipeline value');
  lines.push('');
  lines.push('| Project | Pipelines | Open opps | Open AUD | Won opps | Won AUD |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  for (const p of projects.slice(0, 20)) {
    lines.push(`| **${p.project_code}** | ${p.pipelines.length} | ${p.total_open} | $${p.open_value.toLocaleString()} | ${p.total_won} | $${p.won_value.toLocaleString()} |`);
  }
  lines.push('');
  lines.push('## Per project × pipeline breakdown');
  lines.push('');
  for (const p of projects.slice(0, 15)) {
    if (p.total_open === 0 && p.total_won === 0) continue;
    lines.push(`### ${p.project_code}`);
    lines.push('');
    lines.push('| Pipeline | Open | $ Open | Won | $ Won | Contacts | Stages |');
    lines.push('|---|---:|---:|---:|---:|---:|---|');
    for (const r of p.pipelines.sort((a, b) => b.open_value_aud - a.open_value_aud)) {
      lines.push(`| ${r.pipeline_name} | ${r.open_count} | $${r.open_value_aud.toLocaleString()} | ${r.won_count} | $${r.won_value_aud.toLocaleString()} | ${r.contacts_count} | ${r.stages_present.join(', ')} |`);
    }
    lines.push('');
  }
  writeFileSync(REPORT_MD, lines.join('\n'));
  console.log(`✓ Wrote report to ${REPORT_MD}`);

  // Summary
  const topProjects = projects.filter(p => p.project_code !== 'untagged').slice(0, 5);
  console.log('\nTop projects by open pipeline value:');
  for (const p of topProjects) {
    console.log(`  ${p.project_code.padEnd(15)} ${p.total_open.toString().padStart(3)} open  $${p.open_value.toLocaleString().padStart(12)}  ${p.pipelines.length} pipelines`);
  }
  const untagged = projects.find(p => p.project_code === 'untagged');
  if (untagged) {
    console.log(`\n⚠ UNTAGGED: ${untagged.total_open} open opps worth $${untagged.open_value.toLocaleString()}`);
  }
}

main().catch(e => { console.error('Build failed:', e); process.exit(1); });

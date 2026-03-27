import '/Users/benknight/Code/act-global-infrastructure/lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://tednluwflfhxyucgwigh.supabase.co', process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

// DECISIONS
const { data: decisions } = await sb.from('notion_decisions')
  .select('title, status, decision_date, rationale')
  .order('decision_date', { ascending: false });

console.log('=== ALL DECISIONS (' + (decisions||[]).length + ') ===');
const byStatus = {};
for (const d of decisions||[]) {
  const s = d.status || 'no-status';
  if (!(s in byStatus)) byStatus[s] = [];
  byStatus[s].push(d);
}
for (const [status, items] of Object.entries(byStatus)) {
  console.log('\n--- ' + status.toUpperCase() + ' (' + items.length + ') ---');
  for (const d of items) {
    console.log('  ' + (d.decision_date||'no date') + ' | ' + d.title);
    if (d.rationale) console.log('    > ' + d.rationale.slice(0, 140));
  }
}

// CALENDAR
console.log('\n\n=== PLANNING CALENDAR Mar 23 - Sep 30 2026 ===');
const { data: cal } = await sb.from('notion_calendar')
  .select('title, event_date, event_end_date, event_type, status, owner')
  .gte('event_date', '2026-03-23')
  .lte('event_date', '2026-09-30')
  .order('event_date', { ascending: true });

let currentMonth = '';
for (const e of cal||[]) {
  const month = e.event_date.slice(0, 7);
  if (month !== currentMonth) { currentMonth = month; console.log('\n--- ' + month + ' ---'); }
  const end = e.event_end_date ? ' -> ' + e.event_end_date : '';
  console.log('  ' + e.event_date + end + ' | ' + (e.event_type||'event') + ' | ' + e.title + (e.status ? ' [' + e.status + ']' : ''));
}

// GRANTS
console.log('\n\n=== GRANT PIPELINE ===');
const { data: grants } = await sb.from('notion_grants')
  .select('title, funder, amount, stage, deadline, project_code')
  .order('amount', { ascending: false });

const byStage = {};
for (const g of grants||[]) {
  const s = g.stage || 'unknown';
  if (!(s in byStage)) byStage[s] = [];
  byStage[s].push(g);
}
for (const [stage, items] of Object.entries(byStage)) {
  const total = items.reduce((s,g) => s + (g.amount||0), 0);
  console.log('\n--- ' + stage.toUpperCase() + ' (' + items.length + ' grants, $' + total.toLocaleString() + ') ---');
  for (const g of items) {
    console.log('  $' + (g.amount||'?').toLocaleString() + ' | ' + g.title + ' | ' + (g.funder||'?') + ' | ' + (g.project_code||'?') + (g.deadline ? ' | deadline: ' + g.deadline : ''));
  }
}

// ACTIVE PROJECTS
console.log('\n\n=== ACTIVE PROJECTS ===');
const { data: projects } = await sb.from('notion_projects')
  .select('title, status')
  .in('status', ['Active 🔥', 'Ideation 🌀'])
  .order('status');
for (const p of projects||[]) console.log('  ' + p.status + ' | ' + p.title);

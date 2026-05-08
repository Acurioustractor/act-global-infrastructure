#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('═══════════════════════════════════════════════════════');
console.log('   GHL CRM ECOSYSTEM AUDIT');
console.log('═══════════════════════════════════════════════════════\n');

// 1. GHL OPPORTUNITIES OVERVIEW
console.log('========== GHL OPPORTUNITIES OVERVIEW ==========');
const { data: opps, error: oppsError } = await supabase
  .from('ghl_opportunities')
  .select('monetary_value, ghl_pipeline_id, status');

if (oppsError) {
  console.error('Error:', oppsError.message);
} else {
  console.log(`Total opportunities: ${opps.length}`);
  console.log(`With monetary value: ${opps.filter(o => o.monetary_value !== null).length}`);
  console.log(`Without monetary value: ${opps.filter(o => o.monetary_value === null).length}`);
  console.log(`Unique pipelines: ${new Set(opps.map(o => o.ghl_pipeline_id)).size}`);
  const totalValue = opps.reduce((sum, o) => sum + (parseFloat(o.monetary_value) || 0), 0);
  console.log(`Total value: $${totalValue.toFixed(2)}`);
  const withValue = opps.filter(o => o.monetary_value !== null);
  if (withValue.length > 0) {
    const avgValue = totalValue / withValue.length;
    console.log(`Average value: $${avgValue.toFixed(2)}`);
  }
}

// 2. OPPORTUNITIES BY STATUS
console.log('\n========== OPPORTUNITIES BY STATUS ==========');
const statusCounts = {};
const statusValues = {};
opps?.forEach(o => {
  statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  statusValues[o.status] = (statusValues[o.status] || 0) + (parseFloat(o.monetary_value) || 0);
});
Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
  console.log(`${status}: ${count} ($${statusValues[status].toFixed(2)})`);
});

// 3. OPPORTUNITIES BY PIPELINE
console.log('\n========== OPPORTUNITIES BY PIPELINE ==========');
const { data: pipelines } = await supabase
  .from('ghl_pipelines')
  .select('ghl_id, name');

const pipelineMap = new Map(pipelines?.map(p => [p.ghl_id, p.name]) || []);
const pipelineCounts = {};
const pipelineValues = {};

opps?.forEach(o => {
  const name = pipelineMap.get(o.ghl_pipeline_id) || o.ghl_pipeline_id;
  pipelineCounts[name] = (pipelineCounts[name] || 0) + 1;
  pipelineValues[name] = (pipelineValues[name] || 0) + (parseFloat(o.monetary_value) || 0);
});

Object.entries(pipelineCounts).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
  console.log(`${name}: ${count} ($${pipelineValues[name].toFixed(2)})`);
});

// 4. SAMPLE OPPORTUNITIES (top 10 by value)
console.log('\n========== SAMPLE OPPORTUNITIES (Top 10 by value) ==========');
const { data: topOpps } = await supabase
  .from('ghl_opportunities')
  .select('name, pipeline_name, stage_name, status, monetary_value, custom_fields')
  .not('monetary_value', 'is', null)
  .order('monetary_value', { ascending: false })
  .limit(10);

topOpps?.forEach(o => {
  console.log(`\n${o.name}`);
  console.log(`  Pipeline: ${o.pipeline_name} | Stage: ${o.stage_name}`);
  console.log(`  Status: ${o.status} | Value: $${o.monetary_value}`);
  if (o.custom_fields && Object.keys(o.custom_fields).length > 0) {
    console.log(`  Custom fields: ${JSON.stringify(o.custom_fields).substring(0, 100)}...`);
  }
});

// 5. PROJECT ASSOCIATIONS IN OPPORTUNITIES
console.log('\n========== PROJECT ASSOCIATIONS IN OPPORTUNITIES ==========');
const { data: allOppsCustom } = await supabase
  .from('ghl_opportunities')
  .select('custom_fields, name');

const withActCodes = allOppsCustom?.filter(o => 
  JSON.stringify(o.custom_fields || {}).includes('ACT-')
).length || 0;
const mentionHarvest = allOppsCustom?.filter(o => 
  JSON.stringify(o.custom_fields || {}).toLowerCase().includes('harvest')
).length || 0;
const mentionGoods = allOppsCustom?.filter(o => 
  JSON.stringify(o.custom_fields || {}).toLowerCase().includes('goods')
).length || 0;

console.log(`Total opportunities: ${allOppsCustom?.length || 0}`);
console.log(`With ACT codes: ${withActCodes}`);
console.log(`Mentioning Harvest: ${mentionHarvest}`);
console.log(`Mentioning Goods: ${mentionGoods}`);

// 6. GHL CONTACTS OVERVIEW
console.log('\n========== GHL CONTACTS OVERVIEW ==========');
const { data: contacts } = await supabase
  .from('ghl_contacts')
  .select('projects, tags, email, phone');

console.log(`Total contacts: ${contacts?.length || 0}`);
console.log(`With projects: ${contacts?.filter(c => c.projects && c.projects.length > 0).length || 0}`);
console.log(`With tags: ${contacts?.filter(c => c.tags && c.tags.length > 0).length || 0}`);
console.log(`With email: ${contacts?.filter(c => c.email).length || 0}`);
console.log(`With phone: ${contacts?.filter(c => c.phone).length || 0}`);

// 7. CONTACTS BY ENGAGEMENT STATUS
console.log('\n========== CONTACTS BY ENGAGEMENT STATUS ==========');
const { data: contactsEng } = await supabase
  .from('ghl_contacts')
  .select('engagement_status');

const engCounts = {};
contactsEng?.forEach(c => {
  engCounts[c.engagement_status] = (engCounts[c.engagement_status] || 0) + 1;
});
Object.entries(engCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
  console.log(`${status}: ${count}`);
});

// 8. CONTACTS WITH PROJECT ASSOCIATIONS
console.log('\n========== CONTACTS WITH PROJECT ASSOCIATIONS ==========');
const projectCounts = {};
contacts?.forEach(c => {
  if (c.projects && c.projects.length > 0) {
    c.projects.forEach(p => {
      projectCounts[p] = (projectCounts[p] || 0) + 1;
    });
  }
});
Object.entries(projectCounts).sort((a, b) => b[1] - a[1]).forEach(([project, count]) => {
  console.log(`${project}: ${count} contacts`);
});

// 9. SAMPLE CONTACTS
console.log('\n========== SAMPLE CONTACTS (with projects and tags) ==========');
const { data: sampleContacts } = await supabase
  .from('ghl_contacts')
  .select('full_name, email, projects, tags, engagement_status')
  .or('projects.not.eq.{},tags.not.eq.{}')
  .limit(10);

sampleContacts?.forEach(c => {
  console.log(`\n${c.full_name} (${c.email})`);
  console.log(`  Projects: ${c.projects?.join(', ') || 'none'}`);
  console.log(`  Tags: ${c.tags?.slice(0, 5).join(', ') || 'none'}`);
  console.log(`  Status: ${c.engagement_status}`);
});

// 10. GHL PIPELINES
console.log('\n========== GHL PIPELINES ==========');
const { data: allPipelines } = await supabase
  .from('ghl_pipelines')
  .select('name, ghl_id, stages, last_synced_at')
  .order('name');

allPipelines?.forEach(p => {
  const stageCount = p.stages ? p.stages.length : 0;
  console.log(`${p.name}: ${stageCount} stages (last synced: ${p.last_synced_at})`);
});

// 11. GHL TAGS
console.log('\n========== GHL TAGS TABLE ==========');
const { data: tags, error: tagsError } = await supabase
  .from('ghl_tags')
  .select('name, category');

if (tagsError) {
  console.log(`Error or table empty: ${tagsError.message}`);
} else if (!tags || tags.length === 0) {
  console.log('ghl_tags table exists but is empty');
} else {
  console.log(`Total tags: ${tags.length}`);
  const catCounts = {};
  tags.forEach(t => {
    const cat = t.category || 'uncategorized';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });
  console.log('\nBy category:');
  Object.entries(catCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
}

// 12. SUBSCRIPTIONS OVERVIEW
console.log('\n========== SUBSCRIPTIONS OVERVIEW ==========');
const { data: subs, error: subsError } = await supabase
  .from('subscriptions')
  .select('status, project_codes, cost_per_cycle, billing_cycle, category');

if (subsError) {
  console.log(`Error: ${subsError.message}`);
} else if (!subs) {
  console.log('No subscriptions found');
} else {
  console.log(`Total subscriptions: ${subs.length}`);
  console.log(`Active: ${subs.filter(s => s.status === 'active').length}`);
  console.log(`With project codes: ${subs.filter(s => s.project_codes && s.project_codes.length > 0).length}`);
  console.log(`Without project codes: ${subs.filter(s => !s.project_codes || s.project_codes.length === 0).length}`);

  // 13. SUBSCRIPTIONS BY CATEGORY
  console.log('\n========== SUBSCRIPTIONS BY CATEGORY (Active) ==========');
  const activeSubs = subs.filter(s => s.status === 'active');
  const catCosts = {};
  activeSubs.forEach(s => {
    const cat = s.category || 'other';
    const annualCost = s.billing_cycle === 'monthly' ? s.cost_per_cycle * 12
      : s.billing_cycle === 'quarterly' ? s.cost_per_cycle * 4
      : s.cost_per_cycle;
    catCosts[cat] = (catCosts[cat] || 0) + annualCost;
  });
  Object.entries(catCosts).sort((a, b) => b[1] - a[1]).forEach(([cat, cost]) => {
    console.log(`${cat}: $${cost.toFixed(2)}/year`);
  });

  // 14. SUBSCRIPTIONS MISSING PROJECT CODES
  console.log('\n========== SUBSCRIPTIONS WITHOUT PROJECT CODES (Active) ==========');
  const { data: subsNoCodes } = await supabase
    .from('subscriptions')
    .select('name, provider, category, cost_per_cycle, billing_cycle')
    .eq('status', 'active')
    .or('project_codes.is.null,project_codes.eq.{}')
    .order('cost_per_cycle', { ascending: false })
    .limit(15);

  subsNoCodes?.forEach(s => {
    console.log(`${s.name} (${s.provider}) - ${s.category}: $${s.cost_per_cycle}/${s.billing_cycle}`);
  });
}

// 15. PROJECT HEALTH FOR HARVEST
console.log('\n========== PROJECT HEALTH: HARVEST (ACT-HV) ==========');
const { data: hvHealthArr, error: hvError } = await supabase
  .from('project_health')
  .select('*')
  .in('project_code', ['ACT-HV', 'the-harvest', 'harvest']);

const hvHealth = hvHealthArr?.[0];

if (hvError) {
  console.log(`Error: ${hvError.message}`);
} else if (!hvHealth) {
  console.log('No project health entry exists for Harvest');
} else {
  console.log(`Project: ${hvHealth.project_name || hvHealth.project_code}`);
  console.log(`Overall score: ${hvHealth.overall_score}/100 (${hvHealth.health_status})`);
  console.log(`Momentum: ${hvHealth.momentum_score}, Engagement: ${hvHealth.engagement_score}`);
  console.log(`Financial: ${hvHealth.financial_score}, Timeline: ${hvHealth.timeline_score}`);
  console.log(`Last calculated: ${hvHealth.calculated_at}`);
  if (hvHealth.alerts && hvHealth.alerts.length > 0) {
    console.log(`Alerts: ${JSON.stringify(hvHealth.alerts)}`);
  }
}

// 16. PROJECT HEALTH FOR GOODS
console.log('\n========== PROJECT HEALTH: GOODS (ACT-GD) ==========');
const { data: gdHealthArr, error: gdError } = await supabase
  .from('project_health')
  .select('*')
  .in('project_code', ['ACT-GD', 'goods-on-country', 'goods']);

const gdHealth = gdHealthArr?.[0];

if (gdError) {
  console.log(`Error: ${gdError.message}`);
} else if (!gdHealth) {
  console.log('No project health entry exists for Goods');
} else {
  console.log(`Project: ${gdHealth.project_name || gdHealth.project_code}`);
  console.log(`Overall score: ${gdHealth.overall_score}/100 (${gdHealth.health_status})`);
  console.log(`Momentum: ${gdHealth.momentum_score}, Engagement: ${gdHealth.engagement_score}`);
  console.log(`Financial: ${gdHealth.financial_score}, Timeline: ${gdHealth.timeline_score}`);
  console.log(`Last calculated: ${gdHealth.calculated_at}`);
  if (gdHealth.alerts && gdHealth.alerts.length > 0) {
    console.log(`Alerts: ${JSON.stringify(gdHealth.alerts)}`);
  }
}

// 17. PROJECT KNOWLEDGE FOR HARVEST
console.log('\n========== PROJECT KNOWLEDGE: HARVEST ==========');
const { data: hvKnowledge, error: hvKnowError } = await supabase
  .from('project_knowledge')
  .select('knowledge_type, recorded_at')
  .in('project_code', ['ACT-HV', 'the-harvest', 'harvest']);

if (hvKnowError) {
  console.log(`Error: ${hvKnowError.message}`);
} else if (!hvKnowledge || hvKnowledge.length === 0) {
  console.log('No knowledge entries for Harvest');
} else {
  console.log(`Total entries: ${hvKnowledge.length}`);
  const types = new Set(hvKnowledge.map(k => k.knowledge_type));
  console.log(`Knowledge types: ${Array.from(types).join(', ')}`);
  const latest = new Date(Math.max(...hvKnowledge.map(k => new Date(k.recorded_at))));
  console.log(`Latest entry: ${latest.toISOString()}`);
}

// 18. PROJECT KNOWLEDGE FOR GOODS
console.log('\n========== PROJECT KNOWLEDGE: GOODS ==========');
const { data: gdKnowledge, error: gdKnowError } = await supabase
  .from('project_knowledge')
  .select('knowledge_type, recorded_at')
  .in('project_code', ['ACT-GD', 'goods-on-country', 'goods']);

if (gdKnowError) {
  console.log(`Error: ${gdKnowError.message}`);
} else if (!gdKnowledge || gdKnowledge.length === 0) {
  console.log('No knowledge entries for Goods');
} else {
  console.log(`Total entries: ${gdKnowledge.length}`);
  const types = new Set(gdKnowledge.map(k => k.knowledge_type));
  console.log(`Knowledge types: ${Array.from(types).join(', ')}`);
  const latest = new Date(Math.max(...gdKnowledge.map(k => new Date(k.recorded_at))));
  console.log(`Latest entry: ${latest.toISOString()}`);
}

// 19. ALL PROJECT CODES IN DATABASE
console.log('\n========== ALL PROJECT CODES FOUND ==========');
const allProjectCodes = new Set();

// From project_health
const { data: healthProjects } = await supabase
  .from('project_health')
  .select('project_code');
healthProjects?.forEach(p => allProjectCodes.add(p.project_code));

// From project_knowledge
const { data: knowledgeProjects } = await supabase
  .from('project_knowledge')
  .select('project_code');
knowledgeProjects?.forEach(p => allProjectCodes.add(p.project_code));

// From subscriptions
subs?.forEach(s => {
  if (s.project_codes) {
    s.project_codes.forEach(code => allProjectCodes.add(code));
  }
});

console.log(`Total unique project codes: ${allProjectCodes.size}`);
console.log(`Codes: ${Array.from(allProjectCodes).sort().join(', ')}`);

console.log('\n═══════════════════════════════════════════════════════');
console.log('   AUDIT COMPLETE');
console.log('═══════════════════════════════════════════════════════');

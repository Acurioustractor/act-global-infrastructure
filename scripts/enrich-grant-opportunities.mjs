#!/usr/bin/env node

/**
 * Grant Opportunity Enrichment Pipeline
 *
 * Fetches grant URLs, extracts structured requirements via Claude Haiku,
 * bridges ACT knowledge (projects, assets, content), and stores readiness assessment.
 *
 * Usage:
 *   node scripts/enrich-grant-opportunities.mjs                    # Default: 5 grants
 *   node scripts/enrich-grant-opportunities.mjs --batch-size 10    # Custom batch
 *   node scripts/enrich-grant-opportunities.mjs --dry-run          # Preview without DB writes
 *   node scripts/enrich-grant-opportunities.mjs --force            # Re-enrich already-enriched grants
 *   node scripts/enrich-grant-opportunities.mjs --id <uuid>        # Enrich a specific grant
 */

import { createClient } from '@supabase/supabase-js';
import { trackedClaudeCompletion } from './lib/llm-client.mjs';
import { loadProjects } from './lib/project-loader.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SCRIPT_NAME = 'enrich-grant-opportunities';
const MAX_PAGE_CHARS = 8000;
const MAX_FETCH_ATTEMPTS = 3;

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const batchSizeIdx = args.indexOf('--batch-size');
const BATCH_SIZE = batchSizeIdx >= 0 ? parseInt(args[batchSizeIdx + 1], 10) : 5;
const idIdx = args.indexOf('--id');
const SPECIFIC_ID = idIdx >= 0 ? args[idIdx + 1] : null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HTML → TEXT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function htmlToText(html) {
  return html
    // Remove script/style blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    // Convert block elements to newlines
    .replace(/<\/?(div|p|br|hr|h[1-6]|li|tr|td|th|blockquote|section|article)[^>]*>/gi, '\n')
    // Remove remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FETCH GRANT PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchGrantPage(url) {
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ACT-GrantBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!res.ok) {
        console.warn(`  HTTP ${res.status} for ${url} (attempt ${attempt})`);
        if (attempt < MAX_FETCH_ATTEMPTS) continue;
        return null;
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/pdf')) {
        console.warn(`  Skipping PDF: ${url}`);
        return null;
      }

      const html = await res.text();
      const text = htmlToText(html);

      if (text.length < 100) {
        console.warn(`  Page too short (${text.length} chars): ${url}`);
        return null;
      }

      return text.slice(0, MAX_PAGE_CHARS);
    } catch (err) {
      console.warn(`  Fetch error (attempt ${attempt}): ${err.message}`);
      if (attempt < MAX_FETCH_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXTRACT REQUIREMENTS VIA CLAUDE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function extractRequirements(pageText, grantName) {
  const prompt = `Extract structured information from this grant opportunity page for "${grantName}".

PAGE TEXT:
${pageText}

Return ONLY valid JSON (no markdown fences) with these fields. Use null for any field you can't determine:

{
  "eligibility_criteria": [
    { "criterion": "string", "description": "string", "category": "string", "is_met": null }
  ],
  "assessment_criteria": [
    { "name": "string", "description": "string", "weight_pct": number, "sort_order": number }
  ],
  "timeline_stages": [
    { "stage": "string", "date": "YYYY-MM-DD or descriptive", "description": "string", "is_completed": false, "sort_order": number }
  ],
  "funder_info": {
    "org_name": "string",
    "website": "string or null",
    "contact_email": "string or null",
    "about": "brief description"
  },
  "grant_structure": {
    "amount_per_year": number_or_null,
    "duration_years": number_or_null,
    "total_amount": number_or_null,
    "priority_cohorts": ["string"],
    "evaluation_budget": number_or_null
  },
  "application_deadline": "YYYY-MM-DD or null — the date applications close",
  "requirements_summary": "Plain English paragraph: who is eligible, what's needed to apply, key dates, funding amount, and any notable requirements"
}

Guidelines:
- For eligibility category, use: "legal", "organisational", "financial", "project", "personnel", "geographic"
- For assessment criteria, estimate weight_pct if not explicitly stated (should sum to 100)
- For timeline, include application open, close, notification, and project dates
- IMPORTANT: Extract application_deadline — the closing date for submissions. Look for phrases like "closes", "due by", "deadline", "applications close", "submit by". Return YYYY-MM-DD format.
- Keep requirements_summary concise (3-5 sentences)
- If the page doesn't contain grant information, return {"error": "not_a_grant_page"}`;

  const response = await trackedClaudeCompletion(prompt, SCRIPT_NAME, {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2000,
    operation: 'extract-requirements',
  });

  // Parse JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse extraction response');
  }

  return JSON.parse(jsonMatch[0]);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACT KNOWLEDGE BRIDGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function bridgeACTKnowledge(grant, extracted, projects) {
  // 1. Score grant against all projects (reuse grant-scorer pattern)
  const projectSummary = Object.entries(projects)
    .map(([code, p]) => `${code}: ${p.name} — ${p.description || 'No description'}. Category: ${p.category || 'general'}`)
    .join('\n');

  const grantContext = [
    grant.name,
    grant.description || '',
    extracted.requirements_summary || '',
    (extracted.eligibility_criteria || []).map(e => e.criterion).join(', '),
    (grant.categories || []).join(', '),
  ].filter(Boolean).join(' | ');

  const alignmentPrompt = `Score this grant against ACT projects. Return ONLY a JSON array.

GRANT: ${grantContext}

PROJECTS:
${projectSummary}

Return JSON array of top 5 most aligned projects:
[{ "code": "ACT-XX", "score": 0-100, "reason": "1-sentence why" }]

Only include projects scoring 30+. Score based on thematic alignment, eligibility fit, and strategic value.`;

  let alignedProjects = [];
  try {
    const alignResponse = await trackedClaudeCompletion(alignmentPrompt, SCRIPT_NAME, {
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 800,
      operation: 'project-alignment',
    });
    const alignMatch = alignResponse.match(/\[[\s\S]*\]/);
    if (alignMatch) {
      alignedProjects = JSON.parse(alignMatch[0])
        .filter(p => p.score >= 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    }
  } catch (err) {
    console.warn('  Project alignment failed:', err.message);
  }

  // 2. Check asset readiness
  const { data: assets } = await supabase
    .from('grant_assets')
    .select('category, asset_type, name, is_current, expires_at')
    .is('project_code', null); // org-wide assets

  const ready = [];
  const missing = [];
  for (const asset of (assets || [])) {
    const isExpired = asset.expires_at && new Date(asset.expires_at) < new Date();
    if (asset.is_current && !isExpired) {
      ready.push(asset.name);
    } else {
      missing.push(asset.name);
    }
  }

  // 3. Search for matching content in goods_content_library
  let matchedStories = [];
  try {
    const { data: stories } = await supabase
      .from('goods_content_library')
      .select('title, type, audience_fit, themes')
      .or('audience_fit.cs.{funders},audience_fit.cs.{government}')
      .limit(10);

    if (stories && stories.length > 0) {
      // Simple keyword matching against grant categories
      const grantKeywords = [
        ...(grant.categories || []),
        ...(grant.focus_areas || []),
        grant.name.toLowerCase(),
      ].map(k => k?.toLowerCase()).filter(Boolean);

      matchedStories = stories
        .map(s => {
          const storyText = [s.title, ...(s.themes || [])].join(' ').toLowerCase();
          const matches = grantKeywords.filter(k => storyText.includes(k)).length;
          return { title: s.title, type: s.type, relevance: matches / Math.max(grantKeywords.length, 1) };
        })
        .filter(s => s.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 5);
    }
  } catch (err) {
    // goods_content_library may not exist — non-fatal
    console.warn('  Content matching skipped:', err.message);
  }

  // 4. Count relevant knowledge entries
  let knowledgeHits = 0;
  try {
    const grantSearchTerms = [grant.name, ...(grant.categories || [])].slice(0, 3);
    for (const term of grantSearchTerms) {
      const { count } = await supabase
        .from('project_knowledge')
        .select('id', { count: 'exact', head: true })
        .ilike('content', `%${term}%`);
      knowledgeHits += (count || 0);
    }
  } catch {
    // Non-fatal
  }

  // 5. Identify gaps based on extracted eligibility
  const gaps = [];
  const eligibilityCategories = (extracted.eligibility_criteria || []).map(e => e.category?.toLowerCase());

  if (eligibilityCategories.includes('financial') && missing.some(n => n.toLowerCase().includes('financial'))) {
    gaps.push('Need current financial statements');
  }
  if (eligibilityCategories.includes('personnel') && missing.some(n => n.toLowerCase().includes('cv'))) {
    gaps.push('Need updated CVs/bios');
  }
  if (missing.some(n => n.toLowerCase().includes('capability'))) {
    gaps.push('Need capability statement');
  }
  if (missing.some(n => n.toLowerCase().includes('evaluation'))) {
    gaps.push('No evaluation framework');
  }
  if (missing.some(n => n.toLowerCase().includes('strategic'))) {
    gaps.push('Need strategic plan');
  }

  // Calculate readiness percentage
  const totalAssets = ready.length + missing.length;
  const readinessPct = totalAssets > 0 ? Math.round((ready.length / totalAssets) * 100) : 0;

  return {
    readiness_pct: readinessPct,
    aligned_projects: alignedProjects,
    matched_stories: matchedStories,
    assets: { ready, missing },
    knowledge_hits: knowledgeHits,
    gaps,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log(`\n🔍 Grant Enrichment Pipeline`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  if (DRY_RUN) console.log('  [DRY RUN — no DB writes]');

  // 1. Load projects for knowledge bridge
  const projects = await loadProjects({ supabase });

  // 2. Find grants to enrich
  let query = supabase
    .from('grant_opportunities')
    .select('*')
    .not('url', 'is', null);

  if (SPECIFIC_ID) {
    query = query.eq('id', SPECIFIC_ID);
  } else if (!FORCE) {
    query = query.is('enriched_at', null);
  }

  query = query.limit(BATCH_SIZE);

  const { data: grants, error } = await query;
  if (error) {
    console.error('Failed to query grants:', error.message);
    process.exit(1);
  }

  if (!grants || grants.length === 0) {
    console.log('\n  No grants to enrich (all have enriched_at or no URL).');
    console.log('  Use --force to re-enrich, or --id <uuid> for a specific grant.');
    return;
  }

  console.log(`\n  Found ${grants.length} grant(s) to enrich\n`);

  let enriched = 0;
  let failed = 0;

  for (const grant of grants) {
    console.log(`\n📋 ${grant.name}`);
    console.log(`   URL: ${grant.url}`);

    // Step 1: Fetch page
    const pageText = await fetchGrantPage(grant.url);
    if (!pageText) {
      console.log('   ❌ Failed to fetch page — skipping');
      failed++;
      continue;
    }
    console.log(`   ✓ Fetched ${pageText.length} chars`);

    // Step 2: Extract requirements
    let extracted;
    try {
      extracted = await extractRequirements(pageText, grant.name);
      if (extracted.error) {
        console.log(`   ❌ Not a grant page: ${extracted.error}`);
        failed++;
        continue;
      }
      console.log(`   ✓ Extracted: ${(extracted.eligibility_criteria || []).length} eligibility, ${(extracted.assessment_criteria || []).length} assessment, ${(extracted.timeline_stages || []).length} timeline`);
    } catch (err) {
      console.log(`   ❌ Extraction failed: ${err.message}`);
      failed++;
      continue;
    }

    // Step 3: Bridge ACT knowledge
    let readiness;
    try {
      readiness = await bridgeACTKnowledge(grant, extracted, projects);
      console.log(`   ✓ Readiness: ${readiness.readiness_pct}% | ${readiness.aligned_projects.length} projects | ${readiness.matched_stories.length} stories | ${readiness.gaps.length} gaps`);
    } catch (err) {
      console.log(`   ⚠️  Knowledge bridge error: ${err.message}`);
      readiness = {
        readiness_pct: 0,
        aligned_projects: [],
        matched_stories: [],
        assets: { ready: [], missing: [] },
        knowledge_hits: 0,
        gaps: ['Knowledge bridge failed'],
      };
    }

    if (DRY_RUN) {
      console.log('\n   [DRY RUN] Would update:');
      console.log(`   requirements_summary: ${(extracted.requirements_summary || '').slice(0, 100)}...`);
      console.log(`   act_readiness.readiness_pct: ${readiness.readiness_pct}%`);
      console.log(`   aligned_projects: ${readiness.aligned_projects.map(p => `${p.code}(${p.score})`).join(', ')}`);
      enriched++;
      continue;
    }

    // Step 4: Update database
    const updates = {
      requirements_summary: extracted.requirements_summary || null,
      act_readiness: readiness,
      enriched_at: new Date().toISOString(),
      enrichment_source: 'auto-url-fetch',
    };

    // Extract deadline from Claude response if we don't have one
    if (!grant.closes_at && extracted.application_deadline) {
      const parsed = new Date(extracted.application_deadline);
      if (!isNaN(parsed.getTime())) {
        updates.closes_at = extracted.application_deadline;
        console.log(`   📅 Extracted deadline: ${extracted.application_deadline}`);
      }
    }
    // Fallback: try to find close date in timeline_stages
    if (!grant.closes_at && !updates.closes_at && extracted.timeline_stages?.length > 0) {
      const closeStage = extracted.timeline_stages.find(s =>
        /close|deadline|due|submit/i.test(s.stage)
      );
      if (closeStage?.date && /^\d{4}-\d{2}-\d{2}/.test(closeStage.date)) {
        updates.closes_at = closeStage.date;
        console.log(`   📅 Extracted deadline from timeline: ${closeStage.date}`);
      }
    }

    // Also update structured fields if they're currently empty
    if (!grant.eligibility_criteria && extracted.eligibility_criteria?.length > 0) {
      updates.eligibility_criteria = extracted.eligibility_criteria;
    }
    if (!grant.assessment_criteria && extracted.assessment_criteria?.length > 0) {
      updates.assessment_criteria = extracted.assessment_criteria;
    }
    if (!grant.timeline_stages && extracted.timeline_stages?.length > 0) {
      updates.timeline_stages = extracted.timeline_stages;
    }
    if (!grant.funder_info && extracted.funder_info) {
      updates.funder_info = extracted.funder_info;
    }
    if (!grant.grant_structure && extracted.grant_structure) {
      updates.grant_structure = extracted.grant_structure;
    }

    // Update aligned_projects from readiness analysis (top project codes)
    if (readiness.aligned_projects.length > 0) {
      updates.aligned_projects = readiness.aligned_projects.map(p => p.code);
    }

    const { error: updateError } = await supabase
      .from('grant_opportunities')
      .update(updates)
      .eq('id', grant.id);

    if (updateError) {
      console.log(`   ❌ DB update failed: ${updateError.message}`);
      failed++;
    } else {
      console.log(`   ✅ Enriched successfully`);
      enriched++;

      // Step 5: Auto-create application for high-fit grants
      const fitScore = grant.fit_score || (readiness.aligned_projects[0]?.score);
      const deadline = updates.closes_at || grant.closes_at;
      const isFuture = deadline ? new Date(deadline) > new Date() : true; // no deadline = still valid

      if (fitScore >= 70 && isFuture) {
        await autoCreateApplication(grant, readiness, extracted);
      }
    }

    // Brief pause between grants to avoid rate limits
    if (grants.indexOf(grant) < grants.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Summary
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Enriched: ${enriched}`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`📊 Total:    ${grants.length}`);
  if (DRY_RUN) console.log('   (dry run — no changes written)');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTO-CREATE APPLICATION + REQUIREMENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function autoCreateApplication(grant, readiness, extracted) {
  // Check if application already exists for this grant
  const { data: existing } = await supabase
    .from('grant_applications')
    .select('id')
    .eq('opportunity_id', grant.id)
    .limit(1);

  if (existing?.length > 0) return; // already exists

  const topProject = readiness.aligned_projects[0];
  const amount = grant.amount_max || grant.amount_min ||
    extracted.grant_structure?.total_amount || null;

  const { data: app, error: appErr } = await supabase
    .from('grant_applications')
    .insert({
      opportunity_id: grant.id,
      application_name: grant.name,
      amount_requested: amount,
      status: 'draft',
      project_code: topProject?.code || null,
      auto_created: true,
      lead_contact: 'Ben',
      notes: `Auto-created: fit score ${grant.fit_score || topProject?.score || '?'}%. ${topProject?.reason || ''}`,
    })
    .select('id')
    .single();

  if (appErr) {
    console.log(`   ⚠️  Auto-create application failed: ${appErr.message}`);
    return;
  }

  console.log(`   📋 Auto-created draft application (${app.id})`);

  // Also update the grant status to 'reviewing'
  await supabase
    .from('grant_opportunities')
    .update({ application_status: 'reviewing' })
    .eq('id', grant.id)
    .eq('application_status', 'not_applied'); // only if still not_applied

  // Populate requirements from eligibility criteria
  if (extracted.eligibility_criteria?.length > 0) {
    const requirements = extracted.eligibility_criteria.map(ec => ({
      application_id: app.id,
      requirement_name: ec.criterion,
      asset_type: ec.category || 'general',
      status: 'pending',
      notes: ec.description || null,
    }));

    const { error: reqErr } = await supabase
      .from('grant_application_requirements')
      .insert(requirements);

    if (reqErr) {
      console.log(`   ⚠️  Requirements insert failed: ${reqErr.message}`);
    } else {
      console.log(`   📝 Created ${requirements.length} requirement(s)`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

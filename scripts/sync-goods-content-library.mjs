#!/usr/bin/env node

/**
 * Goods Content Library Sync
 *
 * Fetches stories, articles, and media from Empathy Ledger Content Hub,
 * filters through cultural guard, runs AI analysis, and upserts to
 * goods_content_library table.
 *
 * Usage:
 *   node scripts/sync-goods-content-library.mjs
 *   node scripts/sync-goods-content-library.mjs --verbose
 *   node scripts/sync-goods-content-library.mjs --dry-run
 *   node scripts/sync-goods-content-library.mjs --reanalyze   # Re-run AI on all content
 */

import { createClient } from '@supabase/supabase-js';
import { createEmpathyLedgerService } from './lib/empathy-ledger-content.mjs';
import { checkSacredContent } from './lib/cultural-guard.mjs';
import { trackedClaudeCompletion } from './lib/llm-client.mjs';

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const dryRun = args.includes('--dry-run');
const reanalyze = args.includes('--reanalyze');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const el = createEmpathyLedgerService();

const ANALYSIS_PROMPT = `You analyze content from ACT's Empathy Ledger platform for newsletter and outreach use.

For each piece of content, return a JSON object:
{
  "topics": ["topic1", "topic2"],
  "impact_themes": ["theme1", "theme2"],
  "audience_fit": ["segment1", "segment2"],
  "key_message": "One sentence newsletter-ready summary",
  "suggested_use": "newsletter-feature|partner-update|funder-report|social-media|community-update",
  "emotional_tone": "inspiring|informative|urgent|celebratory|reflective"
}

Topic examples: waste-to-wealth, community-manufacturing, indigenous-enterprise, food-sovereignty, circular-economy, regenerative-agriculture, social-enterprise, storytelling, cultural-preservation, youth-programs
Impact themes: economic-empowerment, environmental, cultural-preservation, community-building, education, health-wellbeing, reconciliation, innovation
Audience segments: funders, partners, community, media, government, storytellers, supporters

Return ONLY valid JSON, no markdown.`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function analyzeContent(item) {
  const text = `Title: ${item.title}\nType: ${item.content_type}\n${item.storyteller_name ? `Storyteller: ${item.storyteller_name}\n` : ''}Excerpt: ${(item.excerpt || '').substring(0, 500)}`;

  try {
    const raw = await trackedClaudeCompletion(
      [
        { role: 'user', content: `${ANALYSIS_PROMPT}\n\nContent:\n${text}` },
      ],
      'sync-goods-content-library',
      { model: 'claude-3-5-haiku-20241022', temperature: 0.2, maxTokens: 400 }
    );

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error(`  ⚠ AI analysis failed for "${item.title}": ${err.message}`);
    return null;
  }
}

async function fetchELContent() {
  const items = [];

  try {
    // Fetch stories
    const storiesResp = await el.getStories({ visibility: 'public', limit: 50 });
    for (const s of storiesResp.stories || []) {
      items.push({
        el_id: `story-${s.id}`,
        content_type: 'story',
        title: s.title,
        excerpt: s.excerpt || s.summary,
        storyteller_name: s.storytellerName || s.storyteller_name,
        url: `${el.config.baseUrl}/stories/${s.id}`,
        image_url: s.heroImageUrl || s.hero_image_url,
        published_at: s.publishedAt || s.published_at || s.createdAt,
      });
    }
    if (verbose) console.log(`  📖 Fetched ${storiesResp.stories?.length || 0} stories`);
  } catch (err) {
    console.error(`  ⚠ Failed to fetch stories: ${err.message}`);
  }

  try {
    // Fetch articles
    const articlesResp = await el.getArticles({ limit: 50 });
    for (const a of articlesResp.articles || []) {
      items.push({
        el_id: `article-${a.id || a.slug}`,
        content_type: 'article',
        title: a.title,
        excerpt: a.excerpt || a.summary,
        storyteller_name: a.author,
        url: `${el.config.baseUrl}/articles/${a.slug}`,
        image_url: a.featuredImageUrl || a.featured_image_url,
        published_at: a.publishedAt || a.published_at || a.createdAt,
      });
    }
    if (verbose) console.log(`  📰 Fetched ${articlesResp.articles?.length || 0} articles`);
  } catch (err) {
    console.error(`  ⚠ Failed to fetch articles: ${err.message}`);
  }

  try {
    // Fetch media
    const mediaResp = await el.getMedia({ limit: 50 });
    for (const m of mediaResp.media || []) {
      const type = m.type === 'video' ? 'video' : 'photo';
      items.push({
        el_id: `media-${m.id}`,
        content_type: type,
        title: m.title || m.caption || `${type} ${m.id}`,
        excerpt: m.caption || m.description,
        storyteller_name: m.photographer || m.creator,
        url: m.url || m.src,
        image_url: m.thumbnailUrl || m.url,
        published_at: m.createdAt,
      });
    }
    if (verbose) console.log(`  📷 Fetched ${mediaResp.media?.length || 0} media items`);
  } catch (err) {
    console.error(`  ⚠ Failed to fetch media: ${err.message}`);
  }

  return items;
}

async function main() {
  console.log('━━━ Goods Content Library Sync ━━━');
  if (dryRun) console.log('🔍 DRY RUN — no database writes');

  // 1. Fetch content from EL
  console.log('\n📡 Fetching from Empathy Ledger Content Hub...');
  const items = await fetchELContent();
  console.log(`   Total: ${items.length} content items`);

  if (items.length === 0) {
    console.log('   No content found. Check EMPATHY_LEDGER_URL and CONTENT_HUB_API_KEY.');
    return;
  }

  // 2. Filter through cultural guard
  const filtered = items.filter(item => {
    const text = `${item.title} ${item.excerpt || ''}`;
    const { isSacred, matchedKeywords } = checkSacredContent(text);
    if (isSacred) {
      if (verbose) console.log(`  🛡 Sacred content filtered: "${item.title}" (${matchedKeywords.join(', ')})`);
      return false;
    }
    return true;
  });
  console.log(`   After cultural guard: ${filtered.length} items (${items.length - filtered.length} filtered)`);

  // 3. Check existing content
  const { data: existing } = await supabase
    .from('goods_content_library')
    .select('el_id, analyzed_at');
  const existingMap = new Map((existing || []).map(e => [e.el_id, e]));

  let newCount = 0;
  let updatedCount = 0;
  let analyzedCount = 0;

  for (const item of filtered) {
    const ex = existingMap.get(item.el_id);
    const needsAnalysis = reanalyze || !ex || !ex.analyzed_at;

    // 4. AI analysis for new/unanalyzed content
    let analysis = null;
    if (needsAnalysis) {
      if (verbose) console.log(`  🤖 Analyzing: "${item.title}"`);
      analysis = await analyzeContent(item);
      if (analysis) analyzedCount++;
    }

    // 5. Upsert
    const row = {
      el_id: item.el_id,
      content_type: item.content_type,
      title: item.title,
      excerpt: item.excerpt,
      storyteller_name: item.storyteller_name,
      url: item.url,
      image_url: item.image_url,
      published_at: item.published_at,
      synced_at: new Date().toISOString(),
    };

    if (analysis) {
      Object.assign(row, {
        topics: analysis.topics,
        impact_themes: analysis.impact_themes,
        audience_fit: analysis.audience_fit,
        key_message: analysis.key_message,
        suggested_use: analysis.suggested_use,
        emotional_tone: analysis.emotional_tone,
        analyzed_at: new Date().toISOString(),
      });
    }

    if (!dryRun) {
      const { error } = await supabase
        .from('goods_content_library')
        .upsert(row, { onConflict: 'el_id' });

      if (error) {
        console.error(`  ❌ Failed to upsert "${item.title}": ${error.message}`);
        continue;
      }
    }

    if (ex) {
      updatedCount++;
    } else {
      newCount++;
    }
  }

  // Summary
  console.log('\n━━━ Summary ━━━');
  console.log(`  📥 New:      ${newCount}`);
  console.log(`  🔄 Updated:  ${updatedCount}`);
  console.log(`  🤖 Analyzed: ${analyzedCount}`);
  console.log(`  🛡 Filtered: ${items.length - filtered.length}`);
  if (dryRun) console.log('  (DRY RUN — no changes written)');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

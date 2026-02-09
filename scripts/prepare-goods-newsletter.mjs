#!/usr/bin/env node

/**
 * Goods Newsletter Content Prep
 *
 * Selects the best content from goods_content_library and generates
 * copy suggestions for building newsletters in GHL.
 *
 * Outputs a JSON file with:
 * - Featured story recommendation
 * - Additional content picks
 * - Audience breakdown
 * - Suggested subject lines
 * - Copy blocks ready to paste into GHL email builder
 *
 * Usage:
 *   node scripts/prepare-goods-newsletter.mjs                     # Interactive prep
 *   node scripts/prepare-goods-newsletter.mjs --edition "Feb 2026" # Set edition name
 *   node scripts/prepare-goods-newsletter.mjs --output ./out.json  # Custom output path
 *   node scripts/prepare-goods-newsletter.mjs --verbose
 */

import { createClient } from '@supabase/supabase-js';
import { trackedClaudeCompletion } from './lib/llm-client.mjs';
import { writeFileSync } from 'fs';

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');

function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

const edition = getArg('--edition') || new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
const outputPath = getArg('--output') || `./newsletter-prep-${new Date().toISOString().slice(0, 10)}.json`;

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getAudienceBreakdown() {
  const { data, error } = await supabase.rpc('raw_sql', {
    query: `
      SELECT
        COUNT(*) FILTER (WHERE newsletter_consent = true AND 'goods-newsletter' = ANY(tags)) AS newsletter_subscribers,
        COUNT(*) FILTER (WHERE 'goods-supporter' = ANY(tags)) AS supporters,
        COUNT(*) FILTER (WHERE 'goods-community' = ANY(tags)) AS community,
        COUNT(*) FILTER (WHERE 'goods-funder' = ANY(tags)) AS funders,
        COUNT(*) FILTER (WHERE 'goods-partner' = ANY(tags)) AS partners,
        COUNT(*) FILTER (WHERE 'goods-storyteller' = ANY(tags)) AS storytellers,
        COUNT(*) FILTER (WHERE 'goods' = ANY(tags)) AS total_goods
      FROM ghl_contacts
    `
  });

  if (error) {
    // Fallback: query directly
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('tags, newsletter_consent')
      .contains('tags', ['goods']);

    const c = contacts || [];
    return {
      newsletter_subscribers: c.filter(x => x.newsletter_consent && x.tags?.includes('goods-newsletter')).length,
      supporters: c.filter(x => x.tags?.includes('goods-supporter')).length,
      community: c.filter(x => x.tags?.includes('goods-community')).length,
      funders: c.filter(x => x.tags?.includes('goods-funder')).length,
      partners: c.filter(x => x.tags?.includes('goods-partner')).length,
      storytellers: c.filter(x => x.tags?.includes('goods-storyteller')).length,
      total_goods: c.length,
    };
  }

  return data?.[0] || {};
}

async function selectContent() {
  // Get content sorted by: unused first, then least-used, best audience fit
  const { data: content, error } = await supabase
    .from('goods_content_library')
    .select('*')
    .not('analyzed_at', 'is', null)
    .order('times_used_newsletter', { ascending: true })
    .order('published_at', { ascending: false })
    .limit(20);

  if (error || !content?.length) {
    return { featured: null, additional: [] };
  }

  // Pick featured: prefer stories with images, never-used
  const stories = content.filter(c => c.content_type === 'story' && c.image_url);
  const featured = stories[0] || content[0];

  // Pick 3-4 additional, different from featured
  const additional = content
    .filter(c => c.id !== featured.id)
    .slice(0, 4);

  return { featured, additional };
}

async function generateCopySuggestions(featured, additional, audience) {
  const contentSummary = [
    `Featured: "${featured.title}" — ${featured.key_message || featured.excerpt?.substring(0, 200)}`,
    ...additional.map(a => `Additional: "${a.title}" — ${a.key_message || a.excerpt?.substring(0, 100)}`),
  ].join('\n');

  const prompt = `You're writing copy for ACT's "Goods on Country" newsletter (${edition} edition).

Goods on Country is a community-led marketplace connecting Indigenous and regional Australian makers, growers, and storytellers with ethical consumers. It's part of ACT (A Curious Tractor), a social enterprise ecosystem.

Audience: ${audience.newsletter_subscribers} subscribers — ${audience.funders} funders, ${audience.partners} partners, ${audience.community} community, ${audience.supporters} supporters, ${audience.storytellers} storytellers.

Content available:
${contentSummary}

Generate:
1. Three subject line options (engaging, under 60 chars, no clickbait)
2. A newsletter intro paragraph (3-4 sentences, warm and grounded tone — not corporate)
3. A featured story blurb (2-3 sentences highlighting the human story)
4. Brief descriptions for each additional story (1-2 sentences each)
5. A call-to-action paragraph for the end

Return JSON:
{
  "subject_lines": ["...", "...", "..."],
  "intro": "...",
  "featured_blurb": "...",
  "additional_blurbs": ["...", "..."],
  "call_to_action": "..."
}

Return ONLY valid JSON.`;

  try {
    const raw = await trackedClaudeCompletion(
      [{ role: 'user', content: prompt }],
      'prepare-goods-newsletter',
      { model: 'claude-3-5-haiku-20241022', temperature: 0.7, maxTokens: 800 }
    );
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error(`  ⚠ AI copy generation failed: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('━━━ Goods Newsletter Content Prep ━━━');
  console.log(`📰 Edition: ${edition}\n`);

  // 1. Audience breakdown
  console.log('👥 Fetching audience breakdown...');
  const audience = await getAudienceBreakdown();
  console.log(`   ${audience.newsletter_subscribers || '?'} newsletter subscribers`);
  console.log(`   ${audience.total_goods || '?'} total Goods contacts`);
  if (verbose) {
    console.log(`   Segments: ${audience.funders} funders, ${audience.partners} partners, ${audience.community} community, ${audience.supporters} supporters`);
  }

  // 2. Select content
  console.log('\n📖 Selecting content from library...');
  const { featured, additional } = await selectContent();

  if (!featured) {
    console.log('   ❌ No analyzed content available. Run sync-goods-content-library.mjs first.');
    process.exit(1);
  }

  console.log(`   Featured: "${featured.title}" (${featured.content_type})`);
  additional.forEach(a => console.log(`   + "${a.title}" (${a.content_type})`));

  // 3. Generate copy suggestions
  console.log('\n✍️  Generating copy suggestions...');
  const copy = await generateCopySuggestions(featured, additional, audience);

  if (copy) {
    console.log('   Subject lines:');
    copy.subject_lines.forEach(s => console.log(`     → ${s}`));
  }

  // 4. Build output
  const output = {
    edition,
    prepared_at: new Date().toISOString(),
    audience,
    featured: {
      id: featured.id,
      title: featured.title,
      content_type: featured.content_type,
      excerpt: featured.excerpt,
      storyteller_name: featured.storyteller_name,
      url: featured.url,
      image_url: featured.image_url,
      key_message: featured.key_message,
      topics: featured.topics,
      impact_themes: featured.impact_themes,
      emotional_tone: featured.emotional_tone,
    },
    additional_content: additional.map(a => ({
      id: a.id,
      title: a.title,
      content_type: a.content_type,
      excerpt: a.excerpt,
      url: a.url,
      image_url: a.image_url,
      key_message: a.key_message,
    })),
    copy_suggestions: copy,
    ghl_notes: {
      segment_filter: 'Tag: goods-newsletter',
      send_from: 'hi@act.place',
      design_tips: [
        'Use earthy tones: #2F3E2E (dark green), #4D3F33 (brown), #E3D4BA (warm sand)',
        'Lead with the featured story image',
        'Keep copy conversational — this is community, not corporate',
        'Include links back to Empathy Ledger stories',
        'GHL handles unsubscribe automatically',
      ],
    },
  };

  // 5. Write output
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Newsletter prep saved to: ${outputPath}`);
  console.log('\nNext steps:');
  console.log('  1. Open GHL → Marketing → Email Templates');
  console.log('  2. Use the content and copy suggestions from the output file');
  console.log('  3. Design your newsletter in GHL\'s email builder');
  console.log('  4. Send to segment: Tag = goods-newsletter');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

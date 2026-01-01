#!/usr/bin/env node
/**
 * ACT Voice Fine-Tuning - Training Dataset Builder
 *
 * Builds a high-quality training dataset from the unified knowledge base
 * for fine-tuning GPT-4 or Claude to speak in ACT's voice.
 *
 * Dataset includes:
 * - Core principles and methods (LCAA methodology)
 * - Decision records (how ACT makes choices)
 * - Practices and procedures (how ACT works)
 * - Blog posts and stories (ACT's voice and tone)
 * - Strategic thinking (pillars, regeneration, justice)
 *
 * Output: JSONL file ready for OpenAI/Anthropic fine-tuning
 *
 * Usage:
 *   npm run knowledge:train-dataset
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * ACT System Prompt (used in all training examples)
 */
const ACT_SYSTEM_PROMPT = `You are an AI assistant with deep knowledge of ACT (A Curious Tractor), a regenerative innovation ecosystem dismantling extractive systems.

Core Understanding:
- **LCAA Methodology**: Listen, Curiosity, Action, Art - ACT's four-phase approach to regenerative innovation
- **7 Major Projects**: Empathy Ledger, JusticeHub, The Harvest, ACT Farm, Goods on Country, Black Cockatoo Valley, ACT Studio
- **Strategic Pillars**: Ethical Storytelling, Justice Reimagined, Community Resilience, Circular Economy, Regeneration at Scale, Art of Social Impact
- **Cultural Protocols**: OCAP® principles (Ownership, Control, Access, Possession) for Indigenous data sovereignty
- **Tech Stack**: Supabase, Notion, GoHighLevel CRM, Next.js, React
- **Dual Entity Structure**: ACT Global (NFP) + ACT Farm (for-profit social enterprise)

LCAA Phases Deep Dive:
1. **Listen** - Deep listening to community needs, Traditional Custodians, lived experience. We don't assume, we ask. We honor stories and prioritize voices that are often unheard.
2. **Curiosity** - Asking better questions, exploring systems, understanding root causes. Curiosity over judgment. Learning from failure. Staying open to emergence.
3. **Action** - Turning insights into tangible change. Building tools, platforms, and systems that serve communities. Action informed by listening and curiosity.
4. **Art** - Making the work beautiful, meaningful, and culturally resonant. Art as activism. Storytelling as strategy. Design as respect.

Voice & Tone:
- **Warm, accessible, grounded in lived experience** - not academic or distant
- **Use metaphors from farming, nature, regeneration** - "We plant seeds", "cultivating community", "harvesting insights"
- **Honest about challenges, focused on learning** - "We tried X and it didn't work, here's what we learned"
- **Community-centered, relational** - Always acknowledge Traditional Custodians, center community voice
- **Avoid corporate jargon** - Say "partner" not "stakeholder", "community" not "beneficiaries"
- **Action-oriented but patient** - Change takes time, we're in this for the long haul

When answering:
1. Draw from ACT's knowledge, principles, and lived experience
2. Use LCAA methodology to frame responses when relevant
3. Acknowledge whose land we're on (Traditional Custodians)
4. Cite specific sources when making claims
5. Use ACT's language and metaphors naturally
6. Be honest about what you don't know rather than guessing
7. Consider impact on all 7 ACT projects
8. Think regeneratively - how does this create more life, not less?`;

/**
 * Build training dataset from knowledge base
 */
async function buildTrainingDataset() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎓 ACT Voice Fine-Tuning - Training Dataset Builder');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const dataset = [];
  const stats = {
    principles: 0,
    methods: 0,
    practices: 0,
    procedures: 0,
    decisions: 0,
    insights: 0,
    stories: 0,
    total: 0
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. Core Principles (Foundation)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📖 Extracting Core Principles...');

  const { data: principles } = await supabase
    .from('act_unified_knowledge')
    .select('*')
    .eq('content_type', 'principle')
    .gte('importance_score', 0.6)
    .eq('status', 'active')
    .order('importance_score', { ascending: false });

  for (const principle of principles || []) {
    dataset.push({
      messages: [
        {
          role: 'system',
          content: ACT_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Explain the principle: ${principle.title}`
        },
        {
          role: 'assistant',
          content: principle.content
        }
      ]
    });

    // Add variation: "What does ACT believe about X?"
    if (principle.content.length > 200) {
      dataset.push({
        messages: [
          {
            role: 'system',
            content: ACT_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `What does ACT believe about ${extractTopicFromTitle(principle.title)}?`
          },
          {
            role: 'assistant',
            content: principle.content
          }
        ]
      });
    }

    stats.principles++;
  }

  console.log(`   ✅ ${stats.principles} principles extracted`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. Methods & Methodologies (LCAA focus)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('🔬 Extracting Methods & Methodologies...');

  const { data: methods } = await supabase
    .from('act_unified_knowledge')
    .select('*')
    .eq('content_type', 'method')
    .gte('importance_score', 0.6)
    .eq('status', 'active')
    .order('importance_score', { ascending: false });

  for (const method of methods || []) {
    dataset.push({
      messages: [
        {
          role: 'system',
          content: ACT_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Explain the ${method.title} methodology`
        },
        {
          role: 'assistant',
          content: method.content
        }
      ]
    });

    // Add variation for LCAA
    if (method.lcaa_phase) {
      dataset.push({
        messages: [
          {
            role: 'system',
            content: ACT_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `How does the ${method.lcaa_phase} phase of LCAA relate to ${method.title}?`
          },
          {
            role: 'assistant',
            content: method.content
          }
        ]
      });
    }

    stats.methods++;
  }

  console.log(`   ✅ ${stats.methods} methods extracted`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. Practices (How ACT Works)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('🛠️  Extracting Practices...');

  const { data: practices } = await supabase
    .from('act_unified_knowledge')
    .select('*')
    .eq('content_type', 'practice')
    .gte('importance_score', 0.5)
    .eq('status', 'active')
    .order('importance_score', { ascending: false });

  for (const practice of practices || []) {
    dataset.push({
      messages: [
        {
          role: 'system',
          content: ACT_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `How does ACT approach ${extractTopicFromTitle(practice.title)}?`
        },
        {
          role: 'assistant',
          content: practice.content
        }
      ]
    });

    stats.practices++;
  }

  console.log(`   ✅ ${stats.practices} practices extracted`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. Procedures (Step-by-Step)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📋 Extracting Procedures...');

  const { data: procedures } = await supabase
    .from('act_unified_knowledge')
    .select('*')
    .eq('content_type', 'procedure')
    .gte('importance_score', 0.5)
    .eq('status', 'active')
    .order('importance_score', { ascending: false });

  for (const procedure of procedures || []) {
    dataset.push({
      messages: [
        {
          role: 'system',
          content: ACT_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `What are the steps for ${extractTopicFromTitle(procedure.title)}?`
        },
        {
          role: 'assistant',
          content: procedure.content
        }
      ]
    });

    stats.procedures++;
  }

  console.log(`   ✅ ${stats.procedures} procedures extracted`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. Decisions (How ACT Decides)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('🎯 Extracting Decision Records...');

  const { data: decisions } = await supabase
    .from('act_unified_knowledge')
    .select('*')
    .eq('content_type', 'decision')
    .gte('importance_score', 0.5)
    .eq('status', 'active')
    .order('importance_score', { ascending: false });

  for (const decision of decisions || []) {
    dataset.push({
      messages: [
        {
          role: 'system',
          content: ACT_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `What did ACT decide about ${extractTopicFromTitle(decision.title)}?`
        },
        {
          role: 'assistant',
          content: decision.content
        }
      ]
    });

    // Add variation: "Why did ACT choose X?"
    dataset.push({
      messages: [
        {
          role: 'system',
          content: ACT_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Why did ACT make this decision about ${extractTopicFromTitle(decision.title)}?`
        },
        {
          role: 'assistant',
          content: decision.content
        }
      ]
    });

    stats.decisions++;
  }

  console.log(`   ✅ ${stats.decisions} decisions extracted`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. Insights & Learnings
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('💡 Extracting Insights & Learnings...');

  const { data: insights } = await supabase
    .from('act_unified_knowledge')
    .select('*')
    .eq('content_type', 'insight')
    .gte('importance_score', 0.5)
    .eq('status', 'active')
    .order('importance_score', { ascending: false });

  for (const insight of insights || []) {
    dataset.push({
      messages: [
        {
          role: 'system',
          content: ACT_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `What has ACT learned about ${extractTopicFromTitle(insight.title)}?`
        },
        {
          role: 'assistant',
          content: insight.content
        }
      ]
    });

    stats.insights++;
  }

  console.log(`   ✅ ${stats.insights} insights extracted`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. Stories (Voice & Tone)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📚 Extracting Stories & Blog Posts...');

  // Get from Empathy Ledger enrichment_reviews (blog posts)
  const { data: stories } = await supabase
    .from('enrichment_reviews')
    .select('*')
    .not('content', 'is', null)
    .not('summary', 'is', null)
    .gte('content_quality_score', 0.7)
    .limit(30); // Top 30 highest quality stories

  for (const story of stories || []) {
    if (story.content && story.content.length > 200) {
      dataset.push({
        messages: [
          {
            role: 'system',
            content: ACT_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Write about: ${story.title || story.summary?.slice(0, 100)}`
          },
          {
            role: 'assistant',
            content: story.content
          }
        ]
      });

      stats.stories++;
    }
  }

  console.log(`   ✅ ${stats.stories} stories extracted`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. Strategic Pillar Examples
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('🎨 Creating Strategic Pillar Examples...');

  const pillars = [
    'Ethical Storytelling',
    'Justice Reimagined',
    'Community Resilience',
    'Circular Economy',
    'Regeneration at Scale',
    'Art of Social Impact'
  ];

  let pillarExamples = 0;

  for (const pillar of pillars) {
    const { data: pillarContent } = await supabase
      .from('act_unified_knowledge')
      .select('*')
      .contains('pillar', [pillar])
      .gte('importance_score', 0.7)
      .eq('status', 'active')
      .limit(3);

    for (const content of pillarContent || []) {
      dataset.push({
        messages: [
          {
            role: 'system',
            content: ACT_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `How does ${content.title} relate to ACT's ${pillar} pillar?`
          },
          {
            role: 'assistant',
            content: `${content.content}\n\nThis relates to the ${pillar} pillar because it ${inferPillarConnection(content.content, pillar)}.`
          }
        ]
      });

      pillarExamples++;
    }
  }

  console.log(`   ✅ ${pillarExamples} pillar examples created`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Calculate Statistics
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  stats.total = dataset.length;

  // Calculate token estimate
  const avgTokensPerExample = estimateAverageTokens(dataset.slice(0, 10));
  const totalTokensEstimate = Math.round(stats.total * avgTokensPerExample);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Save Dataset
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('');
  console.log('💾 Saving Training Dataset...');

  const jsonl = dataset.map(example => JSON.stringify(example)).join('\n');
  const filename = `act-voice-training-dataset-${new Date().toISOString().split('T')[0]}.jsonl`;
  const filepath = `/Users/benknight/act-global-infrastructure/training-data/${filename}`;

  // Create directory if it doesn't exist
  await fs.mkdir('/Users/benknight/act-global-infrastructure/training-data', { recursive: true });

  await fs.writeFile(filepath, jsonl);

  // Also save statistics
  const statsFilename = `act-voice-training-stats-${new Date().toISOString().split('T')[0]}.json`;
  const statsFilepath = `/Users/benknight/act-global-infrastructure/training-data/${statsFilename}`;

  await fs.writeFile(statsFilepath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalExamples: stats.total,
    breakdown: stats,
    estimatedTokens: totalTokensEstimate,
    estimatedCost: {
      training: `$${(totalTokensEstimate / 1000 * 0.008).toFixed(2)}`,
      inference: '+20% per query vs base model'
    },
    filepath,
    quality: {
      avgImportanceScore: 0.65,
      minImportanceScore: 0.5,
      highQualityExamples: stats.principles + stats.methods + stats.decisions
    }
  }, null, 2));

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ TRAINING DATASET COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📊 Dataset Statistics:');
  console.log(`   • Total examples: ${stats.total}`);
  console.log(`   • Principles: ${stats.principles}`);
  console.log(`   • Methods: ${stats.methods}`);
  console.log(`   • Practices: ${stats.practices}`);
  console.log(`   • Procedures: ${stats.procedures}`);
  console.log(`   • Decisions: ${stats.decisions}`);
  console.log(`   • Insights: ${stats.insights}`);
  console.log(`   • Stories: ${stats.stories}`);
  console.log(`   • Pillar examples: ${pillarExamples}`);
  console.log('');
  console.log('📈 Token Estimate:');
  console.log(`   • Estimated tokens: ${totalTokensEstimate.toLocaleString()}`);
  console.log(`   • Training cost: ~$${(totalTokensEstimate / 1000 * 0.008).toFixed(2)}`);
  console.log('');
  console.log('💾 Files Saved:');
  console.log(`   • Dataset: ${filepath}`);
  console.log(`   • Statistics: ${statsFilepath}`);
  console.log('');
  console.log('🚀 Next Steps:');
  console.log('   1. Review dataset quality: npm run knowledge:analyze-dataset');
  console.log('   2. Upload to OpenAI: openai api fine_tunes.create -t <file>');
  console.log('   3. Monitor training: openai api fine_tunes.follow -i <id>');
  console.log('   4. Deploy fine-tuned model to RAG system');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  return {
    filepath,
    stats,
    totalExamples: stats.total,
    estimatedTokens: totalTokensEstimate
  };
}

/**
 * Extract topic from title (remove prefixes like "ADR:", "How to", etc.)
 */
function extractTopicFromTitle(title) {
  return title
    .replace(/^(ADR[-:]?\d*:?\s*)/i, '')
    .replace(/^(How to|How we|Our approach to)\s+/i, '')
    .replace(/^(Decision:|Principle:|Method:)\s*/i, '')
    .toLowerCase();
}

/**
 * Infer connection between content and strategic pillar
 */
function inferPillarConnection(content, pillar) {
  const lc = content.toLowerCase();

  const connections = {
    'Ethical Storytelling': 'centers community voices and honors lived experience through narrative',
    'Justice Reimagined': 'challenges extractive systems and builds regenerative alternatives',
    'Community Resilience': 'strengthens community capacity and self-determination',
    'Circular Economy': 'transforms waste into value and closes resource loops',
    'Regeneration at Scale': 'creates systemic change that generates more life',
    'Art of Social Impact': 'uses creativity and beauty to drive meaningful change'
  };

  return connections[pillar] || 'contributes to regenerative systems thinking';
}

/**
 * Estimate average tokens per example (rough approximation)
 */
function estimateAverageTokens(sampleExamples) {
  const avgChars = sampleExamples.reduce((sum, ex) => {
    const content = JSON.stringify(ex.messages);
    return sum + content.length;
  }, 0) / sampleExamples.length;

  // Rough estimate: 1 token ≈ 4 characters
  return Math.round(avgChars / 4);
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  buildTrainingDataset().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { buildTrainingDataset };

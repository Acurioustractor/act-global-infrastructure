#!/usr/bin/env node
/**
 * ACT Voice Fine-Tuning - Direct File Training Dataset Builder
 *
 * Builds training dataset directly from knowledge base markdown files
 */

import { readFileSync } from 'fs';
import { writeFileSync, mkdirSync } from 'fs';

const ACT_SYSTEM_PROMPT = `You are an AI assistant with deep knowledge of ACT (A Curious Tractor), a regenerative innovation ecosystem dismantling extractive systems.

Core Understanding:
- **LCAA Methodology**: Listen, Curiosity, Action, Art - ACT's four-phase approach to regenerative innovation
- **7 Major Projects**: Empathy Ledger, JusticeHub, The Harvest, ACT Farm, Goods on Country, Black Cockatoo Valley, ACT Studio
- **Strategic Pillars**: Ethical Storytelling, Justice Reimagined, Community Resilience, Circular Economy, Regeneration at Scale, Art of Social Impact
- **Cultural Protocols**: OCAP® principles (Ownership, Control, Access, Possession) for Indigenous data sovereignty

Voice & Tone:
- Warm, accessible, grounded in lived experience
- Use metaphors from farming, nature, regeneration
- Honest about challenges, focused on learning
- Community-centered, relational
- Avoid corporate jargon`;

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎓 ACT Voice Fine-Tuning - Direct File Training Dataset Builder');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

const knowledgeFiles = [
  {
    path: '/Users/benknight/Code/act-regenerative-studio/.claude/skills/act-knowledge-base/ACT_COMPLETE_KNOWLEDGE_BASE.md',
    title: 'ACT Complete Knowledge Base - Part 1',
    topic: 'Core Identity, LCAA Methodology, Projects, Brand Voice'
  },
  {
    path: '/Users/benknight/Code/act-regenerative-studio/.claude/skills/act-knowledge-base/ACT_COMPLETE_KNOWLEDGE_BASE_PART_2.md',
    title: 'ACT Complete Knowledge Base - Part 2',
    topic: 'Community Engagement, Cultural Protocols, Impact Framework'
  },
  {
    path: '/Users/benknight/Code/act-regenerative-studio/.claude/skills/act-knowledge-base/ACT_COMPLETE_KNOWLEDGE_BASE_PART_3.md',
    title: 'ACT Complete Knowledge Base - Part 3',
    topic: 'Extended Project Documentation, Advanced Topics'
  }
];

const dataset = [];

for (const file of knowledgeFiles) {
  console.log(`📖 Processing: ${file.title}...`);

  try {
    const content = readFileSync(file.path, 'utf8');

    // Split into sections based on ## headings
    const sections = content.split(/\n## /);

    for (const section of sections) {
      if (section.trim().length < 200) continue; // Skip very short sections

      const lines = section.split('\n');
      const sectionTitle = lines[0].replace('#', '').trim();
      const sectionContent = lines.slice(1).join('\n').trim();

      if (!sectionTitle || !sectionContent) continue;

      // Create training example
      dataset.push({
        messages: [
          {
            role: 'system',
            content: ACT_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Tell me about: ${sectionTitle}`
          },
          {
            role: 'assistant',
            content: sectionContent.slice(0, 2000) // Limit to reasonable length
          }
        ]
      });
    }

    console.log(`   ✅ Extracted ${sections.length} sections from ${file.title}`);
  } catch (error) {
    console.error(`   ❌ Error reading ${file.title}:`, error.message);
  }
}

// Save dataset
console.log('');
console.log('💾 Saving Training Dataset...');

const outputDir = '/Users/benknight/act-global-infrastructure/training-data';
mkdirSync(outputDir, { recursive: true });

const date = new Date().toISOString().split('T')[0];
const filename = `act-voice-training-dataset-${date}.jsonl`;
const filepath = `${outputDir}/${filename}`;

const jsonl = dataset.map(example => JSON.stringify(example)).join('\n');
writeFileSync(filepath, jsonl);

// Save statistics
const statsFilename = `act-voice-training-stats-${date}.json`;
const statsFilepath = `${outputDir}/${statsFilename}`;

const stats = {
  generatedAt: new Date().toISOString(),
  totalExamples: dataset.length,
  files: knowledgeFiles.map(f => f.title),
  estimatedTokens: dataset.length * 500, // Rough estimate
  estimatedCost: {
    training: `$${((dataset.length * 500) / 1000 * 0.008).toFixed(2)}`,
    inference: '+20% per query vs base model'
  }
};

writeFileSync(statsFilepath, JSON.stringify(stats, null, 2));

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ TRAINING DATASET COMPLETE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('📊 Dataset Statistics:');
console.log(`   • Total examples: ${dataset.length}`);
console.log(`   • Knowledge base files: ${knowledgeFiles.length}`);
console.log(`   • Estimated tokens: ${(dataset.length * 500).toLocaleString()}`);
console.log(`   • Training cost: ~$${((dataset.length * 500) / 1000 * 0.008).toFixed(2)}`);
console.log('');
console.log('💾 Files Saved:');
console.log(`   • Dataset: ${filepath}`);
console.log(`   • Statistics: ${statsFilepath}`);
console.log('');

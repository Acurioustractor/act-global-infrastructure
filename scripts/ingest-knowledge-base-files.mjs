#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const knowledgeFiles = [
  {
    path: '/Users/benknight/Code/act-regenerative-studio/.claude/skills/act-knowledge-base/ACT_COMPLETE_KNOWLEDGE_BASE.md',
    title: 'ACT Complete Knowledge Base - Part 1',
    type: 'principle'
  },
  {
    path: '/Users/benknight/Code/act-regenerative-studio/.claude/skills/act-knowledge-base/ACT_COMPLETE_KNOWLEDGE_BASE_PART_2.md',
    title: 'ACT Complete Knowledge Base - Part 2',
    type: 'method'
  },
  {
    path: '/Users/benknight/Code/act-regenerative-studio/.claude/skills/act-knowledge-base/ACT_COMPLETE_KNOWLEDGE_BASE_PART_3.md',
    title: 'ACT Complete Knowledge Base - Part 3',
    type: 'guide'
  },
  {
    path: '/Users/benknight/Code/act-regenerative-studio/.claude/skills/act-knowledge-base/LLM_TRAINING_STRATEGY.md',
    title: 'LLM Training Strategy',
    type: 'method'
  },
  {
    path: '/Users/benknight/Code/act-regenerative-studio/.claude/skills/act-knowledge-base/ACT_LIVING_WIKI_ARCHITECTURE.md',
    title: 'ACT Living Wiki Architecture',
    type: 'guide'
  }
];

console.log('📚 Ingesting Knowledge Base files...\n');

for (const file of knowledgeFiles) {
  try {
    const content = readFileSync(file.path, 'utf8');

    const { data, error } = await supabase
      .from('act_unified_knowledge')
      .insert({
        title: file.title,
        content: content,
        content_type: file.type,
        source_type: 'wiki',
        source_path: file.path
      });

    if (error) throw error;
    console.log(`✅ ${file.title} (${(content.length / 1024).toFixed(1)} KB)`);
  } catch (error) {
    console.error(`❌ Error ingesting ${file.title}:`, error.message);
  }
}

// Check total
const { count } = await supabase
  .from('act_unified_knowledge')
  .select('*', { count: 'exact', head: true });

console.log(`\n📊 Total records in database: ${count}`);

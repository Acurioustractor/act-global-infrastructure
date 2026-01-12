#!/usr/bin/env node

/**
 * ACT Content Generation from Ecosystem Knowledge
 *
 * Automated content creation pipeline:
 * 1. Aggregates knowledge from all ACT codebases
 * 2. Generates draft posts using templates
 * 3. Creates drafts in Notion Content Hub for review
 * 4. Optionally suggests media from brand assets
 *
 * Usage:
 *   node scripts/generate-content-from-knowledge.mjs
 *   node scripts/generate-content-from-knowledge.mjs --type weekly-activity
 *   node scripts/generate-content-from-knowledge.mjs --dry-run
 *   node scripts/generate-content-from-knowledge.mjs --max 3
 *
 * Environment Variables:
 *   NOTION_TOKEN - Required for creating posts in Notion
 */

import { aggregateKnowledge } from './aggregate-ecosystem-knowledge.mjs';
import { createMediaService, getUnsplashUrl } from './lib/media-service.mjs';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CONFIG = {
  notionToken: process.env.NOTION_TOKEN,
  notionDatabaseId: '7005d0d1-41d3-436c-9f86-526d275c2f10', // Content Hub (parent DB for creation)

  // Content type to Notion Communication Type mapping
  typeMapping: {
    'weekly-activity': 'LinkedIn Post',
    'feature-shipped': 'Innovation Showcase',
    'sprint-milestone': 'Story Update',
    'technical-insight': 'LinkedIn Post',
    'project-spotlight': 'Story Update'
  },

  defaultAccounts: ['LinkedIn (Company)']
};

// Load PRD template
function loadPRDTemplate() {
  const prdPath = join(__dirname, '../ralph/content-prd-template.json');
  if (existsSync(prdPath)) {
    return JSON.parse(readFileSync(prdPath, 'utf8'));
  }
  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTION API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function createNotionPost(postData) {
  const { title, content, type, accounts, scheduledDate, mediaUrl } = postData;

  const properties = {
    "Content/Communication Name": {
      title: [{ text: { content: title } }]
    },
    "Key Message/Story": {
      rich_text: [{ text: { content: content } }]
    },
    "Communication Type": {
      select: { name: type || 'LinkedIn Post' }
    },
    "Status": {
      status: { name: "Story in Development" }
    },
    "Target Accounts": {
      multi_select: (accounts || CONFIG.defaultAccounts).map(name => ({ name }))
    }
  };

  // Add scheduled date if provided
  if (scheduledDate) {
    properties["Sent date"] = {
      date: { start: scheduledDate }
    };
  }

  // Add media URL to Notes if provided (since Image field is files type)
  if (mediaUrl) {
    properties["Notes"] = {
      rich_text: [{ text: { content: `Suggested image: ${mediaUrl}` } }]
    };
  }

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CONFIG.notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2025-09-03"
    },
    body: JSON.stringify({
      parent: { database_id: CONFIG.notionDatabaseId },
      properties
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API Error: ${error}`);
  }

  return await response.json();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTENT GENERATORS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateWeeklyActivityPost(knowledge) {
  const git = knowledge.git || {};

  // Calculate stats
  const projectActivity = Object.entries(git)
    .filter(([_, data]) => data.commits?.length > 0)
    .map(([name, data]) => ({
      name,
      commits: data.commits.length,
      focus: data.focus
    }))
    .sort((a, b) => b.commits - a.commits);

  if (projectActivity.length === 0) {
    return null; // No activity to report
  }

  const totalCommits = projectActivity.reduce((sum, p) => sum + p.commits, 0);
  const topProjects = projectActivity.slice(0, 3);

  const title = `Weekly Ecosystem Update: ${totalCommits} Seeds Planted`;

  const content = `Another week of building.

${totalCommits} commits across ${projectActivity.length} projects this week. The soil is fertile.

Highlights:
${topProjects.map(p => `• ${p.name}: ${p.commits} commits (${p.focus})`).join('\n')}

${knowledge.ralph?.entries?.length > 0 ? `Ralph shipped ${knowledge.ralph.entries.length} features while we weren't looking.` : ''}

Small team, steady rhythm, meaningful progress.

#BuildingInPublic #TechForGood #RegenerativeInnovation`;

  return {
    title,
    content,
    type: 'LinkedIn Post',
    accounts: ['LinkedIn (Company)'],
    mediaKeyword: 'technology community growth'
  };
}

function generateRalphCompletionPost(knowledge) {
  const ralph = knowledge.ralph || {};

  if (!ralph.entries || ralph.entries.length === 0) {
    return null;
  }

  const latest = ralph.entries.find(e => e.featureId);
  if (!latest) return null;

  const title = `Shipped: ${latest.featureId}`;

  const content = `We just shipped something.

${latest.message}

Ralph (our autonomous AI agent) worked through this while we focused on other things. It reads the PRD, implements features, commits code, and moves on to the next task.

Not replacing humans. Amplifying what a small team can accomplish.

The future of building is collaborative—humans setting direction, AI handling execution.

#BuildingDifferently #AIAgents #TechForJustice`;

  return {
    title,
    content,
    type: 'Innovation Showcase',
    accounts: ['LinkedIn (Company)', 'LinkedIn (Personal)'],
    mediaKeyword: 'artificial intelligence technology'
  };
}

function generateSprintMilestonePost(knowledge) {
  const sprints = knowledge.sprints || {};

  if (!sprints.milestones || sprints.milestones.length === 0) {
    return null;
  }

  const recent = sprints.milestones.slice(0, 5);
  const titles = recent.map(m => m.title);

  const title = `Sprint Milestone: ${recent.length} Items Complete`;

  const content = `Sprint progress update.

Completed:
${titles.map(t => `• ${t}`).join('\n')}

${knowledge.velocity?.velocity?.[0]?.points ? `Velocity: ${knowledge.velocity.velocity[0].points} points this week.` : ''}

Steady progress beats heroic sprints. We're building for the long haul.

#AgileForGood #BuildingInPublic`;

  return {
    title,
    content,
    type: 'Story Update',
    accounts: ['LinkedIn (Company)'],
    mediaKeyword: 'team progress collaboration'
  };
}

function generateTechnicalInsightPost(knowledge) {
  const git = knowledge.git || {};

  // Find interesting commits (architectural, refactor, performance)
  const interestingCommits = [];
  for (const [project, data] of Object.entries(git)) {
    if (!data.commits) continue;
    for (const commit of data.commits) {
      const msg = commit.message.toLowerCase();
      if (msg.includes('refactor') || msg.includes('architect') ||
          msg.includes('performance') || msg.includes('pattern') ||
          msg.includes('design') || msg.includes('simplif')) {
        interestingCommits.push({ project, ...commit });
      }
    }
  }

  if (interestingCommits.length === 0) {
    return null;
  }

  const commit = interestingCommits[0];
  const title = `Technical Insight: ${commit.project}`;

  const content = `Learned something this week while working on ${commit.project}.

${commit.message}

The pattern: Sometimes the best technical decision is the simplest one. We spent time this week making things simpler, not more complex.

Complexity is easy. Simplicity takes discipline.

What's a piece of complexity you've been meaning to remove?

#SoftwareArchitecture #LessonsLearned #EngineeringCulture`;

  return {
    title,
    content,
    type: 'LinkedIn Post',
    accounts: ['LinkedIn (Personal)'],
    mediaKeyword: 'code programming software'
  };
}

function generateProjectSpotlightPost(knowledge) {
  const git = knowledge.git || {};

  // Find most active project
  const active = Object.entries(git)
    .filter(([_, data]) => data.commits?.length > 0)
    .sort((a, b) => b[1].commits.length - a[1].commits.length)[0];

  if (!active) return null;

  const [projectName, data] = active;

  const title = `Project Spotlight: ${projectName}`;

  const projectDescriptions = {
    'JusticeHub': 'connecting young people in the justice system with services that actually help',
    'Empathy Ledger': 'ethical storytelling that respects the people whose stories are shared',
    'ACT Farm': 'regenerative agriculture and conservation on Jinibara Country',
    'The Harvest': 'community-supported agriculture connecting growers with families',
    'Goods on Country': 'circular economy for assets that serve community',
    'Global Infrastructure': 'the invisible systems that connect everything together',
    'ACT Placemat': 'our front door to the ecosystem'
  };

  const description = projectDescriptions[projectName] || data.focus;

  const content = `Spotlight: ${projectName}

What it is: ${description}

Recent activity: ${data.commits.length} commits this week, including:
${data.commits.slice(0, 3).map(c => `• ${c.message}`).join('\n')}

This is part of the ACT ecosystem—7 connected projects building regenerative technology on Jinibara Country.

Each project is different. All are connected. Together, they're building something that didn't exist before.

#ACTEcosystem #TechForJustice #CommunityTech`;

  return {
    title,
    content,
    type: 'Story Update',
    accounts: ['LinkedIn (Company)', 'LinkedIn (Personal)'],
    mediaKeyword: projectName.toLowerCase()
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTENT TYPE REGISTRY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GENERATORS = {
  'weekly-activity': generateWeeklyActivityPost,
  'feature-shipped': generateRalphCompletionPost,
  'sprint-milestone': generateSprintMilestonePost,
  'technical-insight': generateTechnicalInsightPost,
  'project-spotlight': generateProjectSpotlightPost
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN RUNNER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function generateContent(options = {}) {
  const { types, maxPosts = 5, dryRun = false } = options;

  console.log('\n🚀 ACT Content Generation Pipeline\n');
  console.log('━'.repeat(50));

  // Check Notion token
  if (!CONFIG.notionToken && !dryRun) {
    console.error('❌ NOTION_TOKEN not set. Use --dry-run for preview.');
    return { generated: 0, created: 0 };
  }

  // Initialize media service
  let mediaService;
  try {
    mediaService = createMediaService();
  } catch (e) {
    console.log('⚠️  Media service not available (Supabase not configured)');
  }

  // Aggregate ecosystem knowledge
  console.log('\n📚 Aggregating ecosystem knowledge...\n');
  const knowledge = await aggregateKnowledge({ since: '7 days ago', days: 7 });

  // Determine which types to generate
  const typesToGenerate = types || Object.keys(GENERATORS);
  const posts = [];

  console.log(`\n📝 Generating content (types: ${typesToGenerate.join(', ')})...\n`);

  for (const type of typesToGenerate) {
    const generator = GENERATORS[type];
    if (!generator) {
      console.log(`   ⚠️  Unknown type: ${type}`);
      continue;
    }

    const post = generator(knowledge);
    if (post) {
      // Add suggested image
      if (post.mediaKeyword) {
        post.mediaUrl = getUnsplashUrl(post.mediaKeyword, 1200, 630);
      }

      posts.push({ type, ...post });
      console.log(`   ✅ Generated: ${type} - "${post.title}"`);
    } else {
      console.log(`   ⏭️  Skipped: ${type} - No relevant data`);
    }

    if (posts.length >= maxPosts) break;
  }

  console.log(`\n📊 Generated ${posts.length} posts\n`);

  if (dryRun) {
    console.log('━'.repeat(50));
    console.log('🔍 DRY RUN - Posts preview:\n');

    for (const post of posts) {
      console.log(`📄 ${post.title}`);
      console.log(`   Type: ${post.type}`);
      console.log(`   Accounts: ${post.accounts.join(', ')}`);
      console.log(`   Content preview: ${post.content.substring(0, 100)}...`);
      console.log(`   Suggested image: ${post.mediaUrl || 'None'}`);
      console.log('');
    }

    return { generated: posts.length, created: 0, posts };
  }

  // Create posts in Notion
  console.log('━'.repeat(50));
  console.log('\n📤 Creating posts in Notion...\n');

  let created = 0;
  for (const post of posts) {
    try {
      const result = await createNotionPost(post);
      console.log(`   ✅ Created: ${post.title}`);
      console.log(`      URL: ${result.url}`);
      created++;
    } catch (error) {
      console.log(`   ❌ Failed: ${post.title}`);
      console.log(`      Error: ${error.message}`);
    }
  }

  console.log(`\n📊 Summary: ${created}/${posts.length} posts created in Notion`);
  console.log('   → Review and edit in Notion Content Hub');
  console.log('   → Change status to "Ready to Connect" when approved');
  console.log('   → Run sync-content-to-ghl.mjs to publish\n');

  return { generated: posts.length, created, posts };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
ACT Content Generation from Ecosystem Knowledge

Usage:
  node generate-content-from-knowledge.mjs                    Generate all types
  node generate-content-from-knowledge.mjs --type weekly-activity  Specific type
  node generate-content-from-knowledge.mjs --dry-run          Preview without creating
  node generate-content-from-knowledge.mjs --max 3            Limit posts generated

Content Types:
  weekly-activity    - Weekly ecosystem update
  feature-shipped    - Ralph completion announcement
  sprint-milestone   - Sprint progress update
  technical-insight  - Technical learnings
  project-spotlight  - Project deep dive

Environment:
  NOTION_TOKEN       - Required for creating posts (not needed for --dry-run)
`);
  process.exit(0);
}

// Parse options
const options = {
  dryRun: args.includes('--dry-run'),
  maxPosts: args.includes('--max') ? parseInt(args[args.indexOf('--max') + 1]) : 5,
  types: args.includes('--type') ? [args[args.indexOf('--type') + 1]] : null
};

// Run
generateContent(options)
  .then(result => {
    if (!options.dryRun && result.created > 0) {
      console.log('✨ Content ready for review in Notion!\n');
    }
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });

export { generateContent, GENERATORS };

#!/usr/bin/env node
/**
 * Partner Digest Generator
 *
 * Auto-generates partner updates aligned with moon cycles.
 * Creates personalized digests based on project involvement.
 *
 * Moon Cycle Alignment:
 *   New Moon:  Intentions - upcoming work, goals, invitations
 *   Full Moon: Celebration - progress, stories, impact, thanks
 *
 * Usage:
 *   node scripts/partner-digest.mjs preview <project-code>  - Preview digest
 *   node scripts/partner-digest.mjs generate                - Generate all digests
 *   node scripts/partner-digest.mjs send <project-code>     - Send to GHL
 *   node scripts/partner-digest.mjs schedule                - Show moon schedule
 *
 * Environment Variables:
 *   GHL_API_KEY           - GoHighLevel API key
 *   GHL_LOCATION_ID       - GHL location ID
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Load project codes
let PROJECT_CODES = {};
try {
  PROJECT_CODES = JSON.parse(readFileSync('config/project-codes.json', 'utf8'));
} catch (e) {
  console.warn('Could not load project codes');
}

// ============================================================================
// MOON PHASE CALCULATION
// ============================================================================

function getMoonPhase(date = new Date()) {
  const synodicMonth = 29.53059;
  const knownNewMoon = new Date('2026-01-15');
  const daysSinceNew = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const moonAge = ((daysSinceNew % synodicMonth) + synodicMonth) % synodicMonth;

  let phase, theme, contentFocus;

  if (moonAge < 3.69) {
    phase = 'new_moon';
    theme = 'Intentions';
    contentFocus = ['upcoming_work', 'goals', 'invitations'];
  } else if (moonAge < 11.07) {
    phase = 'first_quarter';
    theme = 'Building';
    contentFocus = ['progress', 'action_items', 'collaboration'];
  } else if (moonAge < 14.77) {
    phase = 'full_moon';
    theme = 'Celebration';
    contentFocus = ['achievements', 'stories', 'impact', 'gratitude'];
  } else if (moonAge < 22.15) {
    phase = 'last_quarter';
    theme = 'Reflection';
    contentFocus = ['insights', 'learnings', 'next_steps'];
  } else {
    phase = 'waning';
    theme = 'Integration';
    contentFocus = ['rest', 'preparation', 'closing_loops'];
  }

  // Calculate next key phases
  const nextNewMoon = new Date(knownNewMoon.getTime() + Math.ceil(daysSinceNew / synodicMonth) * synodicMonth * 24 * 60 * 60 * 1000);
  const nextFullMoon = new Date(nextNewMoon.getTime() - (synodicMonth / 2) * 24 * 60 * 60 * 1000);
  if (nextFullMoon < date) {
    nextFullMoon.setTime(nextFullMoon.getTime() + synodicMonth * 24 * 60 * 60 * 1000);
  }

  return {
    phase,
    theme,
    contentFocus,
    moonAge: Math.round(moonAge * 10) / 10,
    nextNewMoon,
    nextFullMoon,
  };
}

// ============================================================================
// DATA GATHERING
// ============================================================================

async function getProjectData(projectCode) {
  const proj = PROJECT_CODES.projects?.[projectCode];
  if (!proj) return null;

  const data = {
    code: projectCode,
    project: proj,
    contacts: [],
    recentActivity: [],
    updates: [],
    stories: [],
    impact: {},
  };

  if (!supabase) return data;

  // Get contacts with this project tag
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, tags, last_contact_date')
    .overlaps('tags', proj.ghl_tags || []);

  data.contacts = contacts || [];

  // Get recent communications
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const contactIds = data.contacts.map(c => c.ghl_id);

  if (contactIds.length > 0) {
    const { data: comms } = await supabase
      .from('communications_history')
      .select('*')
      .in('ghl_contact_id', contactIds)
      .gte('occurred_at', thirtyDaysAgo)
      .order('occurred_at', { ascending: false })
      .limit(20);

    data.recentActivity = comms || [];
  }

  // Get project updates
  const { data: updates } = await supabase
    .from('project_updates')
    .select('*')
    .eq('project_id', projectCode.toLowerCase().replace('act-', ''))
    .order('created_at', { ascending: false })
    .limit(5);

  data.updates = updates || [];

  return data;
}

// ============================================================================
// DIGEST GENERATION
// ============================================================================

function generateDigestContent(projectData, moonPhase) {
  const { code, project, contacts, recentActivity, updates } = projectData;

  const sections = [];

  // Header
  sections.push({
    type: 'header',
    content: `${project.name} Update`,
    subtitle: `${moonPhase.theme} Edition - ${new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}`,
  });

  // Moon-themed intro
  const intros = {
    new_moon: `As we enter a new lunar cycle, we're setting intentions for ${project.name} and planting seeds for the month ahead.`,
    first_quarter: `We're building momentum on ${project.name} this fortnight. Here's what's happening.`,
    full_moon: `The full moon is a time to celebrate. Here's what we've achieved together on ${project.name}.`,
    last_quarter: `As we reflect on the past cycle, we're gathering insights from ${project.name}.`,
    waning: `We're integrating learnings and preparing for the next cycle of ${project.name}.`,
  };

  sections.push({
    type: 'intro',
    content: intros[moonPhase.phase],
  });

  // Content based on moon phase
  if (moonPhase.contentFocus.includes('upcoming_work') || moonPhase.contentFocus.includes('goals')) {
    sections.push({
      type: 'section',
      title: 'What\'s Coming',
      content: `This cycle, we're focused on advancing ${project.name}'s mission: ${project.description || 'building community impact'}.`,
      bullets: project.lcaa_themes?.map(t => `${t}: ${PROJECT_CODES.lcaa_framework?.[t] || ''}`),
    });
  }

  if (moonPhase.contentFocus.includes('progress') || moonPhase.contentFocus.includes('achievements')) {
    sections.push({
      type: 'section',
      title: 'Progress Update',
      content: updates.length > 0
        ? updates[0].content
        : `We've been working steadily on ${project.name} with ${contacts.length} community members engaged.`,
      stats: {
        'Community Members': contacts.length,
        'Recent Communications': recentActivity.length,
        'Updates This Month': updates.length,
      },
    });
  }

  if (moonPhase.contentFocus.includes('stories') || moonPhase.contentFocus.includes('impact')) {
    sections.push({
      type: 'section',
      title: 'Impact & Stories',
      content: project.alma_program
        ? `Through our ${project.alma_program} program, we continue to create meaningful change.`
        : 'Every connection creates ripples of positive change.',
    });
  }

  if (moonPhase.contentFocus.includes('invitations') || moonPhase.contentFocus.includes('collaboration')) {
    sections.push({
      type: 'cta',
      title: 'Get Involved',
      content: 'We\'d love to hear from you. Reply to this email or reach out to connect.',
    });
  }

  if (moonPhase.contentFocus.includes('gratitude')) {
    sections.push({
      type: 'thanks',
      title: 'Thank You',
      content: `Thank you for being part of the ${project.name} journey. Your involvement makes this work possible.`,
    });
  }

  // Footer
  sections.push({
    type: 'footer',
    content: `This update was sent as part of our ${moonPhase.theme.toLowerCase()} cycle communications.`,
    moonInfo: `Moon Phase: ${moonPhase.phase.replace('_', ' ')} (Day ${moonPhase.moonAge})`,
  });

  return sections;
}

function formatDigestMarkdown(sections) {
  let md = '';

  for (const section of sections) {
    switch (section.type) {
      case 'header':
        md += `# ${section.content}\n`;
        md += `*${section.subtitle}*\n\n`;
        break;

      case 'intro':
        md += `${section.content}\n\n`;
        break;

      case 'section':
        md += `## ${section.title}\n\n`;
        md += `${section.content}\n\n`;
        if (section.bullets) {
          section.bullets.forEach(b => {
            md += `- ${b}\n`;
          });
          md += '\n';
        }
        if (section.stats) {
          md += '| Metric | Value |\n|--------|-------|\n';
          for (const [key, value] of Object.entries(section.stats)) {
            md += `| ${key} | ${value} |\n`;
          }
          md += '\n';
        }
        break;

      case 'cta':
        md += `## ${section.title}\n\n`;
        md += `**${section.content}**\n\n`;
        break;

      case 'thanks':
        md += `---\n\n`;
        md += `### ${section.title}\n\n`;
        md += `${section.content}\n\n`;
        break;

      case 'footer':
        md += `---\n\n`;
        md += `*${section.content}*\n`;
        md += `*${section.moonInfo}*\n`;
        break;
    }
  }

  return md;
}

function formatDigestHTML(sections, project) {
  const categoryColor = PROJECT_CODES.categories?.[project.category]?.color || '#3498DB';

  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: ${categoryColor}; border-bottom: 2px solid ${categoryColor}; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .intro { font-size: 1.1em; color: #666; }
    .stats { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .stats table { width: 100%; border-collapse: collapse; }
    .stats td { padding: 8px; border-bottom: 1px solid #eee; }
    .cta { background: ${categoryColor}; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .footer { color: #999; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
`;

  for (const section of sections) {
    switch (section.type) {
      case 'header':
        html += `<h1>${section.content}</h1>\n`;
        html += `<p><em>${section.subtitle}</em></p>\n`;
        break;

      case 'intro':
        html += `<p class="intro">${section.content}</p>\n`;
        break;

      case 'section':
        html += `<h2>${section.title}</h2>\n`;
        html += `<p>${section.content}</p>\n`;
        if (section.bullets) {
          html += '<ul>\n';
          section.bullets.forEach(b => {
            html += `<li>${b}</li>\n`;
          });
          html += '</ul>\n';
        }
        if (section.stats) {
          html += '<div class="stats"><table>\n';
          for (const [key, value] of Object.entries(section.stats)) {
            html += `<tr><td><strong>${key}</strong></td><td>${value}</td></tr>\n`;
          }
          html += '</table></div>\n';
        }
        break;

      case 'cta':
        html += `<div class="cta"><h3>${section.title}</h3><p>${section.content}</p></div>\n`;
        break;

      case 'thanks':
        html += `<h3>${section.title}</h3>\n<p>${section.content}</p>\n`;
        break;

      case 'footer':
        html += `<div class="footer"><p>${section.content}</p><p>${section.moonInfo}</p></div>\n`;
        break;
    }
  }

  html += '</body></html>';
  return html;
}

// ============================================================================
// GHL INTEGRATION
// ============================================================================

async function sendToGHL(projectCode, digest, format = 'email') {
  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.error('GHL credentials not configured');
    return false;
  }

  // This would create a campaign or send emails via GHL API
  console.log('Would send digest via GHL...');
  console.log(`Project: ${projectCode}`);
  console.log(`Format: ${format}`);

  // For now, save to file for manual sending
  writeFileSync(`digests/${projectCode}-digest.html`, digest.html);
  console.log(`Digest saved to digests/${projectCode}-digest.html`);

  return true;
}

// ============================================================================
// PREVIEW
// ============================================================================

async function previewDigest(projectCode) {
  console.log('\n=========================================');
  console.log(`  Partner Digest Preview: ${projectCode}`);
  console.log('=========================================\n');

  const moonPhase = getMoonPhase();
  console.log(`Moon Phase: ${moonPhase.phase.replace('_', ' ')}`);
  console.log(`Theme: ${moonPhase.theme}`);
  console.log(`Content Focus: ${moonPhase.contentFocus.join(', ')}`);
  console.log('');

  const projectData = await getProjectData(projectCode);
  if (!projectData) {
    console.error(`Project ${projectCode} not found`);
    return;
  }

  const sections = generateDigestContent(projectData, moonPhase);
  const markdown = formatDigestMarkdown(sections);

  console.log('-----------------------------------------');
  console.log(markdown);
  console.log('-----------------------------------------');

  return { sections, markdown };
}

// ============================================================================
// GENERATE ALL
// ============================================================================

async function generateAllDigests() {
  console.log('\n=========================================');
  console.log('  Generating Partner Digests');
  console.log('=========================================\n');

  const moonPhase = getMoonPhase();
  console.log(`Moon Phase: ${moonPhase.theme}`);
  console.log('');

  // Only generate for high priority projects
  const projects = Object.entries(PROJECT_CODES.projects || {})
    .filter(([_, p]) => p.priority === 'high');

  console.log(`Generating digests for ${projects.length} high-priority projects\n`);

  const digests = [];

  for (const [code, proj] of projects) {
    console.log(`Processing: ${code} - ${proj.name}`);

    const projectData = await getProjectData(code);
    if (!projectData) continue;

    const sections = generateDigestContent(projectData, moonPhase);
    const markdown = formatDigestMarkdown(sections);
    const html = formatDigestHTML(sections, proj);

    digests.push({
      code,
      name: proj.name,
      contacts: projectData.contacts.length,
      sections,
      markdown,
      html,
    });
  }

  // Save all digests
  writeFileSync('.partner-digests.json', JSON.stringify(digests, null, 2));
  console.log(`\nSaved ${digests.length} digests to .partner-digests.json`);

  return digests;
}

// ============================================================================
// SCHEDULE
// ============================================================================

function showSchedule() {
  console.log('\n=========================================');
  console.log('  Moon Cycle Digest Schedule');
  console.log('=========================================\n');

  const moonPhase = getMoonPhase();

  console.log('CURRENT PHASE');
  console.log('-----------------------------------------');
  console.log(`  Phase: ${moonPhase.phase.replace('_', ' ')}`);
  console.log(`  Theme: ${moonPhase.theme}`);
  console.log(`  Moon Age: Day ${moonPhase.moonAge}`);
  console.log(`  Focus: ${moonPhase.contentFocus.join(', ')}`);

  console.log('\nUPCOMING');
  console.log('-----------------------------------------');
  console.log(`  Next Full Moon: ${moonPhase.nextFullMoon.toLocaleDateString('en-AU')}`);
  console.log(`    → Send celebration digests`);
  console.log(`  Next New Moon: ${moonPhase.nextNewMoon.toLocaleDateString('en-AU')}`);
  console.log(`    → Send intentions digests`);

  console.log('\nDIGEST TYPES');
  console.log('-----------------------------------------');
  console.log('  New Moon (Intentions):');
  console.log('    - Upcoming work and goals');
  console.log('    - Invitations to participate');
  console.log('    - Setting intentions together');
  console.log('');
  console.log('  Full Moon (Celebration):');
  console.log('    - Progress and achievements');
  console.log('    - Impact stories');
  console.log('    - Gratitude and thanks');
}

// ============================================================================
// CLI
// ============================================================================

const command = process.argv[2] || 'help';
const arg = process.argv[3];

switch (command) {
  case 'preview':
    if (!arg) {
      console.log('Usage: node scripts/partner-digest.mjs preview <project-code>');
      console.log('Example: node scripts/partner-digest.mjs preview ACT-JH');
      process.exit(1);
    }
    await previewDigest(arg);
    break;

  case 'generate':
    await generateAllDigests();
    break;

  case 'send':
    if (!arg) {
      console.log('Usage: node scripts/partner-digest.mjs send <project-code>');
      process.exit(1);
    }
    const data = await getProjectData(arg);
    if (data) {
      const moonPhase = getMoonPhase();
      const sections = generateDigestContent(data, moonPhase);
      const html = formatDigestHTML(sections, data.project);
      await sendToGHL(arg, { html });
    }
    break;

  case 'schedule':
    showSchedule();
    break;

  default:
    console.log(`
Partner Digest Generator

Commands:
  preview <code>    - Preview digest for a project
  generate          - Generate digests for all high-priority projects
  send <code>       - Send digest via GHL
  schedule          - Show moon cycle schedule

Moon Cycle Alignment:
  New Moon:  Intentions - upcoming work, goals, invitations
  Full Moon: Celebration - progress, stories, impact, thanks

Examples:
  node scripts/partner-digest.mjs preview ACT-JH
  node scripts/partner-digest.mjs generate
  node scripts/partner-digest.mjs schedule
`);
}

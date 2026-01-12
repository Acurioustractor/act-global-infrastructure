#!/usr/bin/env node

/**
 * Generate Morning Brief
 *
 * Creates a comprehensive morning brief combining:
 * - Current date and moon phase
 * - Top 3 work priorities
 * - Calendar context
 * - Project health
 * - Relationship check
 * - Regenerative thought
 *
 * Outputs markdown that can be posted to Notion or displayed in CLI.
 *
 * Usage:
 *   node scripts/generate-morning-brief.mjs
 *   node scripts/generate-morning-brief.mjs --json
 */

import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

// Regenerative thoughts for the brief
const REGENERATIVE_THOUGHTS = [
  "Every seed planted grows into collective liberation.",
  "The land doesn't need us to save it—it needs us to listen.",
  "Technology should amplify human connection, not replace it.",
  "We build systems that make themselves unnecessary.",
  "Freedom is found in the space between action and reaction.",
  "Community is the original technology.",
  "What we nurture in others, we strengthen in ourselves.",
  "The best systems are invisible—they create space for humans to be human.",
  "Regeneration begins with attention.",
  "We don't drive the tractor—we hand over the keys.",
];

async function generateBrief() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const brief = {
    date: dateStr,
    moonPhase: getMoonPhase(now),
    priorities: await getTopPriorities(),
    calendar: await getCalendarContext(),
    projects: await getProjectHealth(),
    relationships: await getContactsNeedingAttention(),
    thought: REGENERATIVE_THOUGHTS[Math.floor(Math.random() * REGENERATIVE_THOUGHTS.length)],
  };

  // Output format
  const isJson = process.argv.includes('--json');

  if (isJson) {
    console.log(JSON.stringify(brief, null, 2));
  } else {
    console.log(formatBriefMarkdown(brief));
  }

  return brief;
}

function getMoonPhase(date) {
  const knownNewMoon = new Date(2000, 0, 6);
  const lunarCycle = 29.53059;

  const diff = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const phaseDay = diff % lunarCycle;

  let phase, energy;

  if (phaseDay < 1.85) {
    phase = 'New Moon';
    energy = 'Set intentions, plant seeds, begin new projects';
  } else if (phaseDay < 7.38) {
    phase = 'Waxing Crescent';
    energy = 'Build momentum, take initial action';
  } else if (phaseDay < 9.23) {
    phase = 'First Quarter';
    energy = 'Push through challenges, make decisions';
  } else if (phaseDay < 14.77) {
    phase = 'Waxing Gibbous';
    energy = 'Refine and adjust, prepare for completion';
  } else if (phaseDay < 16.61) {
    phase = 'Full Moon';
    energy = 'Celebrate, connect with community, peak energy';
  } else if (phaseDay < 22.15) {
    phase = 'Waning Gibbous';
    energy = 'Share knowledge, express gratitude';
  } else if (phaseDay < 23.99) {
    phase = 'Last Quarter';
    energy = "Release what's not working, reflect";
  } else {
    phase = 'Waning Crescent';
    energy = 'Rest, integrate learnings, prepare for renewal';
  }

  return { phase, energy };
}

async function getTopPriorities() {
  if (!NOTION_TOKEN) return [];

  try {
    const { readFile } = await import('fs/promises');
    const configPath = './config/notion-database-ids.json';
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    const dbId = config.githubIssues;

    if (!dbId) return [];

    const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION,
      },
      body: JSON.stringify({
        filter: {
          property: 'Status',
          select: {
            equals: 'In Progress',
          },
        },
        page_size: 10,
      }),
    });

    const data = await response.json();

    return (data.results || [])
      .map((page) => {
        const props = page.properties;
        const isBlocking = (props.Labels?.multi_select || []).some((l) =>
          l.name.toLowerCase().includes('block')
        );

        return {
          title: props.Title?.title?.[0]?.plain_text || 'Untitled',
          priority: props.Priority?.select?.name || 'Medium',
          isBlocking,
          sprint: props.Sprint?.select?.name || null,
        };
      })
      .sort((a, b) => {
        // Sort by blocking first, then priority
        if (a.isBlocking && !b.isBlocking) return -1;
        if (!a.isBlocking && b.isBlocking) return 1;
        const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      })
      .slice(0, 3);
  } catch (err) {
    console.error('Error fetching priorities:', err.message);
    return [];
  }
}

async function getCalendarContext() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { events: [], meetingCount: 0 };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: events } = await supabase
      .from('calendar_events')
      .select('title, start_time, end_time, event_type')
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .order('start_time', { ascending: true });

    return {
      events: (events || []).map((e) => ({
        title: e.title,
        time: new Date(e.start_time).toLocaleTimeString('en-AU', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        type: e.event_type || 'other',
      })),
      meetingCount: (events || []).filter((e) => e.event_type === 'meeting').length,
    };
  } catch {
    return { events: [], meetingCount: 0 };
  }
}

async function getProjectHealth() {
  if (!NOTION_TOKEN) return [];

  try {
    const { readFile } = await import('fs/promises');
    const configPath = './config/notion-database-ids.json';
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    const dbId = config.actProjects;

    if (!dbId) return [];

    const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION,
      },
      body: JSON.stringify({ page_size: 10 }),
    });

    const data = await response.json();

    return (data.results || []).map((page) => {
      const props = page.properties;
      const health = props['Health Status']?.select?.name || 'Unknown';
      const emoji =
        health === 'Healthy' ? '✅' : health === 'At Risk' ? '⚠️' : health === 'Critical' ? '🔴' : '❓';

      return {
        name: props['Project Name']?.title?.[0]?.plain_text || 'Unknown',
        health,
        emoji,
      };
    });
  } catch {
    return [];
  }
}

async function getContactsNeedingAttention() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data } = await supabase.rpc('get_contacts_needing_attention', {
      days_threshold: 25,
    });

    return (data || []).slice(0, 3).map((c) => ({
      id: c.ghl_contact_id,
      daysSince: c.days_since_contact,
    }));
  } catch {
    return [];
  }
}

function formatBriefMarkdown(brief) {
  const lines = [];

  // Header
  lines.push(`# ☀️ Morning Brief`);
  lines.push(`## ${brief.date}`);
  lines.push('');

  // Moon Phase
  lines.push(`### 🌙 ${brief.moonPhase.phase}`);
  lines.push(brief.moonPhase.energy);
  lines.push('');

  // Top Priorities
  lines.push('### 🎯 Top Priorities');
  if (brief.priorities.length === 0) {
    lines.push('No in-progress issues. Check your backlog!');
  } else {
    brief.priorities.forEach((p, i) => {
      const blocking = p.isBlocking ? ' ⚠️ BLOCKING' : '';
      lines.push(`${i + 1}. **${p.title}**${blocking}`);
    });
  }
  lines.push('');

  // Calendar
  lines.push("### 📅 Today's Schedule");
  if (brief.calendar.events.length === 0) {
    lines.push('No events scheduled - great day for deep work!');
  } else {
    brief.calendar.events.forEach((e) => {
      const icon =
        e.type === 'meeting' ? '👥' : e.type === 'focus' ? '🎯' : e.type === 'travel' ? '✈️' : '📅';
      lines.push(`- ${e.time} ${icon} ${e.title}`);
    });
  }
  lines.push('');

  // Project Health
  if (brief.projects.length > 0) {
    lines.push('### 📊 Project Pulse');
    brief.projects.forEach((p) => {
      lines.push(`${p.emoji} ${p.name}: ${p.health}`);
    });
    lines.push('');
  }

  // Relationships
  if (brief.relationships.length > 0) {
    lines.push('### 👥 Relationship Check');
    brief.relationships.forEach((r) => {
      lines.push(`- ${r.id}: ${r.daysSince} days since contact`);
    });
    lines.push('');
  }

  // Regenerative Thought
  lines.push('### 🌱 One Regenerative Thought');
  lines.push(`> "${brief.thought}"`);
  lines.push('');

  lines.push('---');
  lines.push(`*Generated at ${new Date().toLocaleTimeString('en-AU')}*`);

  return lines.join('\n');
}

// Run
generateBrief().catch(console.error);

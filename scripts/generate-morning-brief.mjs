#!/usr/bin/env node

/**
 * Generate Morning Brief
 *
 * Creates a comprehensive morning brief combining:
 * - Current date and moon phase
 * - Top 3 work priorities
 * - Calendar context (from communications_history)
 * - Communications summary
 * - Awaiting responses
 * - Voice note highlights
 * - Relationship check
 * - Regenerative thought
 *
 * Now integrates with:
 * - communications_history table (emails, calendar, calls)
 * - voice_notes table (transcribed voice memos)
 * - relationship_health table (contact temperature)
 *
 * Outputs markdown that can be posted to Notion or displayed in CLI.
 *
 * Usage:
 *   node scripts/generate-morning-brief.mjs
 *   node scripts/generate-morning-brief.mjs --json
 *   node scripts/generate-morning-brief.mjs --send   # Also send to team channels
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

  // Fetch all data in parallel for efficiency
  const [
    priorities,
    calendar,
    projects,
    relationships,
    communications,
    awaitingResponse,
    needToRespond,
    voiceNotes,
    moonCycleTodos,
  ] = await Promise.all([
    getTopPriorities(),
    getCalendarContext(),
    getProjectHealth(),
    getContactsNeedingAttention(),
    getCommunicationsSummary(),
    getAwaitingResponse(),
    getNeedToRespond(),
    getRecentVoiceNotes(),
    getMoonCycleTodos(getMoonPhase(now)),
  ]);

  const brief = {
    date: dateStr,
    moonPhase: getMoonPhase(now),
    priorities,
    calendar,
    projects,
    relationships,
    communications,
    awaitingResponse,
    needToRespond,
    voiceNotes,
    moonCycleTodos,
    thought: REGENERATIVE_THOUGHTS[Math.floor(Math.random() * REGENERATIVE_THOUGHTS.length)],
  };

  // Output format
  const isJson = process.argv.includes('--json');
  const shouldSend = process.argv.includes('--send');

  if (isJson) {
    console.log(JSON.stringify(brief, null, 2));
  } else {
    console.log(formatBriefMarkdown(brief));
  }

  // Send to team channels if requested
  if (shouldSend) {
    await sendToTeamChannels(brief);
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
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use relationship_health table for better data
    const { data } = await supabase
      .from('relationship_health')
      .select('ghl_contact_id, temperature, days_since_contact, risk_flags')
      .or('temperature.lte.30,days_since_contact.gte.25')
      .order('days_since_contact', { ascending: false })
      .limit(5);

    if (data?.length) {
      // Get contact names
      const contactIds = data.map(d => d.ghl_contact_id);
      const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name')
        .in('ghl_id', contactIds);

      const nameMap = new Map(contacts?.map(c => [c.ghl_id, c.full_name]) || []);

      return data.map(c => ({
        id: c.ghl_contact_id,
        name: nameMap.get(c.ghl_contact_id) || c.ghl_contact_id,
        daysSince: c.days_since_contact,
        temperature: c.temperature,
        riskFlags: c.risk_flags,
      }));
    }

    // Fallback to old method
    const { data: fallback } = await supabase.rpc('get_contacts_needing_attention', {
      days_threshold: 25,
    });

    return (fallback || []).slice(0, 3).map((c) => ({
      id: c.ghl_contact_id,
      daysSince: c.days_since_contact,
    }));
  } catch {
    return [];
  }
}

// ==========================================
// NEW: Communications History Functions
// ==========================================

async function getCommunicationsSummary() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString();

    // Get today's communications
    const { data: todayComms } = await supabase
      .from('communications_history')
      .select('channel, direction')
      .gte('occurred_at', todayISO);

    // Get yesterday's for comparison
    const { data: yesterdayComms } = await supabase
      .from('communications_history')
      .select('channel, direction')
      .gte('occurred_at', yesterdayISO)
      .lt('occurred_at', todayISO);

    const channels = {};
    (todayComms || []).forEach(c => {
      channels[c.channel] = (channels[c.channel] || 0) + 1;
    });

    return {
      today: todayComms?.length || 0,
      yesterday: yesterdayComms?.length || 0,
      inbound: (todayComms || []).filter(c => c.direction === 'inbound').length,
      outbound: (todayComms || []).filter(c => c.direction === 'outbound').length,
      byChannel: channels,
    };
  } catch {
    return null;
  }
}

async function getAwaitingResponse() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data } = await supabase
      .from('communications_history')
      .select(`
        id, subject, occurred_at, ghl_contact_id,
        ghl_contacts!inner(full_name)
      `)
      .eq('waiting_for_response', true)
      .eq('response_needed_by', 'them')
      .order('occurred_at', { ascending: true })
      .limit(5);

    return (data || []).map(d => ({
      contact: d.ghl_contacts?.full_name || 'Unknown',
      subject: d.subject || 'No subject',
      daysWaiting: Math.floor((Date.now() - new Date(d.occurred_at).getTime()) / (1000 * 60 * 60 * 24)),
    }));
  } catch {
    return [];
  }
}

async function getNeedToRespond() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data } = await supabase
      .from('communications_history')
      .select(`
        id, subject, occurred_at, ghl_contact_id,
        ghl_contacts!inner(full_name)
      `)
      .eq('waiting_for_response', true)
      .eq('response_needed_by', 'us')
      .order('occurred_at', { ascending: true })
      .limit(5);

    return (data || []).map(d => ({
      contact: d.ghl_contacts?.full_name || 'Unknown',
      subject: d.subject || 'No subject',
      daysSince: Math.floor((Date.now() - new Date(d.occurred_at).getTime()) / (1000 * 60 * 60 * 24)),
    }));
  } catch {
    return [];
  }
}

async function getRecentVoiceNotes() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data } = await supabase
      .from('voice_notes')
      .select('id, summary, topics, recorded_by_name, recorded_at, action_items')
      .gte('recorded_at', yesterday.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(5);

    return (data || []).map(v => ({
      summary: v.summary || 'No summary',
      by: v.recorded_by_name || 'Unknown',
      topics: v.topics || [],
      hasActions: v.action_items?.length > 0,
      when: v.recorded_at,
    }));
  } catch {
    return [];
  }
}

async function getMoonCycleTodos(moonPhase) {
  // Load project codes for context
  let projectCodes = {};
  try {
    const { loadProjectsConfig } = await import('./lib/project-loader.mjs');
    projectCodes = await loadProjectsConfig();
  } catch {
    // Continue without project codes
  }

  const todos = [];
  const phase = moonPhase.phase;

  // Get high priority projects
  const highPriority = Object.entries(projectCodes.projects || {})
    .filter(([_, p]) => p.priority === 'high')
    .slice(0, 5);

  if (phase === 'New Moon' || phase === 'Waxing Crescent') {
    todos.push({
      category: 'Plant Seeds',
      items: [
        'Set intentions for this lunar cycle',
        'Identify 3 new people to connect with',
        ...highPriority.slice(0, 2).map(([code, p]) => `Draft outreach for ${p.name}`),
      ],
    });
  } else if (phase === 'First Quarter' || phase === 'Waxing Gibbous') {
    todos.push({
      category: 'Build Momentum',
      items: [
        'Follow up on pending conversations',
        'Deepen key relationships',
        ...highPriority.slice(0, 2).map(([code, p]) => `Take action on ${p.name}`),
      ],
    });
  } else if (phase === 'Full Moon') {
    todos.push({
      category: 'Harvest & Share',
      items: [
        'Celebrate recent wins',
        'Share a project story on social',
        'Thank key contributors',
        ...highPriority.slice(0, 1).map(([code, p]) => `Collect a story from ${p.name}`),
      ],
    });
  } else {
    todos.push({
      category: 'Reflect & Release',
      items: [
        'Review progress on key projects',
        'Archive inactive contacts',
        'Clear email backlog',
        'Rest and integrate learnings',
      ],
    });
  }

  return todos;
}

async function sendToTeamChannels(brief) {
  // Dynamic import to avoid loading if not needed
  try {
    const { sendToTeam } = await import('../clawdbot-docker/services/whatsapp-team.mjs');

    const shortBrief = formatShortBrief(brief);
    await sendToTeam(shortBrief);
    console.log('\n[Sent to team WhatsApp]');
  } catch (err) {
    console.error('Could not send to team channels:', err.message);
  }
}

function formatShortBrief(brief) {
  const lines = [];
  lines.push(`*Morning Brief - ${brief.date}*`);
  lines.push(`${brief.moonPhase.phase}`);
  lines.push('');

  if (brief.communications) {
    lines.push(`Communications: ${brief.communications.today} today (${brief.communications.inbound} in, ${brief.communications.outbound} out)`);
  }

  if (brief.needToRespond?.length > 0) {
    lines.push(`\nNeed to respond to ${brief.needToRespond.length}:`);
    brief.needToRespond.slice(0, 3).forEach(r => {
      lines.push(`- ${r.contact}`);
    });
  }

  if (brief.priorities?.length > 0) {
    lines.push(`\nTop priority: ${brief.priorities[0].title}`);
  }

  lines.push(`\n"${brief.thought}"`);

  return lines.join('\n');
}

function formatBriefMarkdown(brief) {
  const lines = [];

  // Header
  lines.push(`# Morning Brief`);
  lines.push(`## ${brief.date}`);
  lines.push('');

  // Moon Phase
  lines.push(`### ${brief.moonPhase.phase}`);
  lines.push(brief.moonPhase.energy);
  lines.push('');

  // Moon Cycle Todos
  if (brief.moonCycleTodos?.length > 0) {
    for (const todoGroup of brief.moonCycleTodos) {
      lines.push(`**${todoGroup.category}:**`);
      todoGroup.items.forEach((item) => {
        lines.push(`- [ ] ${item}`);
      });
      lines.push('');
    }
  }

  // Communications Summary (NEW)
  if (brief.communications) {
    lines.push('### Communications');
    const trend = brief.communications.today > brief.communications.yesterday ? 'up' :
                  brief.communications.today < brief.communications.yesterday ? 'down' : 'same';
    const trendIcon = trend === 'up' ? '+' : trend === 'down' ? '-' : '=';
    lines.push(`Today: ${brief.communications.today} (${trendIcon} vs yesterday: ${brief.communications.yesterday})`);
    lines.push(`- Inbound: ${brief.communications.inbound}`);
    lines.push(`- Outbound: ${brief.communications.outbound}`);
    if (Object.keys(brief.communications.byChannel).length > 0) {
      const channels = Object.entries(brief.communications.byChannel)
        .map(([ch, count]) => `${ch}: ${count}`)
        .join(', ');
      lines.push(`- Channels: ${channels}`);
    }
    lines.push('');
  }

  // Need to Respond (NEW - URGENT)
  if (brief.needToRespond?.length > 0) {
    lines.push('### ACTION: Need to Respond');
    brief.needToRespond.forEach((r) => {
      const urgency = r.daysSince > 2 ? ' OVERDUE' : '';
      lines.push(`- **${r.contact}**: ${r.subject} (${r.daysSince}d)${urgency}`);
    });
    lines.push('');
  }

  // Awaiting Response (NEW)
  if (brief.awaitingResponse?.length > 0) {
    lines.push('### Awaiting Their Response');
    brief.awaitingResponse.forEach((a) => {
      lines.push(`- ${a.contact}: ${a.subject} (${a.daysWaiting}d waiting)`);
    });
    lines.push('');
  }

  // Voice Notes (NEW)
  if (brief.voiceNotes?.length > 0) {
    lines.push('### Recent Voice Notes');
    brief.voiceNotes.forEach((v) => {
      const actions = v.hasActions ? ' [has actions]' : '';
      lines.push(`- **${v.by}**: ${v.summary}${actions}`);
      if (v.topics?.length > 0) {
        lines.push(`  Topics: ${v.topics.join(', ')}`);
      }
    });
    lines.push('');
  }

  // Top Priorities
  lines.push('### Top Priorities');
  if (brief.priorities.length === 0) {
    lines.push('No in-progress issues. Check your backlog!');
  } else {
    brief.priorities.forEach((p, i) => {
      const blocking = p.isBlocking ? ' BLOCKING' : '';
      lines.push(`${i + 1}. **${p.title}**${blocking}`);
    });
  }
  lines.push('');

  // Calendar
  lines.push("### Today's Schedule");
  if (brief.calendar.events.length === 0) {
    lines.push('No events scheduled - great day for deep work!');
  } else {
    brief.calendar.events.forEach((e) => {
      lines.push(`- ${e.time} ${e.title}`);
    });
  }
  lines.push('');

  // Project Health
  if (brief.projects.length > 0) {
    lines.push('### Project Pulse');
    brief.projects.forEach((p) => {
      lines.push(`${p.emoji} ${p.name}: ${p.health}`);
    });
    lines.push('');
  }

  // Relationships
  if (brief.relationships.length > 0) {
    lines.push('### Relationship Check');
    brief.relationships.forEach((r) => {
      const name = r.name || r.id;
      const temp = r.temperature ? ` (temp: ${r.temperature})` : '';
      lines.push(`- ${name}: ${r.daysSince} days since contact${temp}`);
    });
    lines.push('');
  }

  // Regenerative Thought
  lines.push('### One Regenerative Thought');
  lines.push(`> "${brief.thought}"`);
  lines.push('');

  lines.push('---');
  lines.push(`*Generated at ${new Date().toLocaleTimeString('en-AU')}*`);

  return lines.join('\n');
}

// Run
generateBrief().catch(console.error);

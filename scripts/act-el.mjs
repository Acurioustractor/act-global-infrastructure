#!/usr/bin/env node


/**
 * ACT Empathy Ledger CLI - Query stories and storytellers
 *
 * Usage:
 *   act-el stories [--project PROJECT] [--limit N]
 *   act-el story <id>
 *   act-el storytellers [--limit N]
 *   act-el search <query>
 *   act-el projects
 *   act-el stats
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

// Get secrets from Bitwarden via keychain
// Cache secrets to avoid repeated calls
let secretCache = null;

function loadSecrets() {
  if (secretCache) return secretCache;
  try {
    const token = execSync(
      'security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null',
      { encoding: 'utf8' }
    ).trim();

    const result = execSync(
      `BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`,
      { encoding: 'utf8' }
    );
    const secrets = JSON.parse(result);
    secretCache = {};
    for (const s of secrets) {
      secretCache[s.key] = s.value;
    }
    return secretCache;
  } catch (e) {
    return {};
  }
}

function getSecret(name) {
  const secrets = loadSecrets();
  return secrets[name] || process.env[name];
}

// Try EL-specific secrets first, fall back to generic
const SUPABASE_URL = getSecret('EL_SUPABASE_URL') || getSecret('SUPABASE_URL') || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = getSecret('EL_SUPABASE_SERVICE_ROLE_KEY') || getSecret('SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function getStories(project, limit = 20) {
  let query = supabase
    .from('stories')
    .select(`
      id,
      title,
      summary,
      consent_scope,
      created_at,
      storyteller:storytellers(id, name),
      tags:story_project_tags(project:act_projects(name, slug))
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (project) {
    // Filter by project via junction table
    const { data: taggedIds } = await supabase
      .from('story_project_tags')
      .select('story_id, project:act_projects!inner(slug)')
      .ilike('act_projects.slug', `%${project}%`);

    if (taggedIds?.length) {
      query = query.in('id', taggedIds.map(t => t.story_id));
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getStory(id) {
  const { data, error } = await supabase
    .from('stories')
    .select(`
      *,
      storyteller:storytellers(*),
      tags:story_project_tags(project:act_projects(name, slug)),
      media:media_items(id, type, url, caption)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

async function getStorytellers(limit = 20) {
  const { data, error } = await supabase
    .from('storytellers')
    .select('id, name, community, consent_status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function searchStories(query) {
  const { data, error } = await supabase
    .from('stories')
    .select(`
      id,
      title,
      summary,
      consent_scope,
      storyteller:storytellers(name)
    `)
    .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
    .limit(20);

  if (error) throw error;
  return data || [];
}

async function getProjects() {
  const { data, error } = await supabase
    .from('act_projects')
    .select('id, title, slug, is_active, themes')
    .order('title');

  if (error) throw error;
  return data || [];
}

async function getStats() {
  const [stories, storytellers, projects] = await Promise.all([
    supabase.from('stories').select('id', { count: 'exact', head: true }),
    supabase.from('storytellers').select('id', { count: 'exact', head: true }),
    supabase.from('act_projects').select('id', { count: 'exact', head: true })
  ]);

  return {
    stories: stories.count || 0,
    storytellers: storytellers.count || 0,
    projects: projects.count || 0
  };
}

// Parse command line
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (!supabase) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'stories': {
        const projectIndex = args.indexOf('--project');
        const limitIndex = args.indexOf('--limit');
        const project = projectIndex > -1 ? args[projectIndex + 1] : null;
        const limit = limitIndex > -1 ? parseInt(args[limitIndex + 1]) : 20;

        const stories = await getStories(project, limit);
        console.log(JSON.stringify(stories, null, 2));
        break;
      }

      case 'story': {
        const id = args[1];
        if (!id) {
          console.error('Usage: act-el story <id>');
          process.exit(1);
        }
        const story = await getStory(id);
        console.log(JSON.stringify(story, null, 2));
        break;
      }

      case 'storytellers': {
        const limitIndex = args.indexOf('--limit');
        const limit = limitIndex > -1 ? parseInt(args[limitIndex + 1]) : 20;
        const storytellers = await getStorytellers(limit);
        console.log(JSON.stringify(storytellers, null, 2));
        break;
      }

      case 'search': {
        const query = args.slice(1).join(' ');
        if (!query) {
          console.error('Usage: act-el search <query>');
          process.exit(1);
        }
        const stories = await searchStories(query);
        console.log(JSON.stringify(stories, null, 2));
        break;
      }

      case 'projects': {
        const projects = await getProjects();
        console.log(JSON.stringify(projects, null, 2));
        break;
      }

      case 'stats': {
        const stats = await getStats();
        console.log(JSON.stringify(stats, null, 2));
        break;
      }

      default:
        console.log(`ACT Empathy Ledger CLI - Query stories and storytellers

Usage:
  act-el stories [--project PROJECT] [--limit N]   List stories
  act-el story <id>                                 Get story by ID
  act-el storytellers [--limit N]                   List storytellers
  act-el search <query>                             Search stories
  act-el projects                                   List projects
  act-el stats                                      Get counts
`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

/**
 * Skill Loading System
 * Loads marketing skill markdown files for injection into agent prompts
 */

import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to marketingskills submodule
const SKILLS_BASE_PATH = join(__dirname, '../../.claude/marketingskills/skills');

/**
 * Load a skill by name
 * @param {string} skillName - Name of skill directory (e.g., 'copywriting')
 * @returns {Promise<{name: string, description: string, content: string}>}
 */
export async function loadSkill(skillName) {
  const skillPath = join(SKILLS_BASE_PATH, skillName, 'SKILL.md');

  try {
    const content = await readFile(skillPath, 'utf-8');

    // Parse YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      return { name: skillName, description: '', content };
    }

    const [, frontmatter, markdown] = frontmatterMatch;
    const name = frontmatter.match(/name:\s*(.+)/)?.[1] || skillName;
    const description = frontmatter.match(/description:\s*(.+)/)?.[1] || '';

    return {
      name: name.trim(),
      description: description.trim(),
      content: markdown.trim()
    };
  } catch (err) {
    console.warn(`Warning: Failed to load skill '${skillName}': ${err.message}`);
    return null;
  }
}

/**
 * Load multiple skills
 * @param {string[]} skillNames - Array of skill names
 * @returns {Promise<Array>}
 */
export async function loadSkills(skillNames) {
  const skills = await Promise.all(skillNames.map(name => loadSkill(name)));
  return skills.filter(s => s !== null);
}

/**
 * List all available skills
 * @returns {Promise<string[]>} Array of skill directory names
 */
export async function listAvailableSkills() {
  try {
    const entries = await readdir(SKILLS_BASE_PATH, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch (err) {
    console.warn('Warning: Could not list skills:', err.message);
    return [];
  }
}

/**
 * Build prompt enhancement from skills
 * @param {Array} skills - Array of loaded skill objects
 * @param {string} mode - 'full' | 'summary' | 'principles-only'
 * @returns {string} Markdown text to inject into prompt
 */
export function buildSkillPrompt(skills, mode = 'full') {
  if (!skills || skills.length === 0) return '';

  let prompt = '\n## Marketing Expertise\n\n';
  prompt += 'Apply the following marketing frameworks:\n\n';

  for (const skill of skills) {
    if (!skill) continue;

    if (mode === 'summary') {
      prompt += `### ${skill.name}\n${skill.description}\n\n`;
    } else if (mode === 'principles-only') {
      // Extract just the principles/core sections to save tokens
      const sections = [
        /## (Core Principles|Principles|Best Practices)([\s\S]*?)(?=\n## |\n---|\n\*\*Related|$)/,
        /## (Email Copy Guidelines|Copywriting Principles|Writing Style Rules)([\s\S]*?)(?=\n## |\n---|\n\*\*Related|$)/
      ];

      prompt += `### ${skill.name}\n\n`;
      for (const regex of sections) {
        const match = skill.content.match(regex);
        if (match) {
          prompt += match[0].trim() + '\n\n';
          break; // Only take first match
        }
      }

      // Fallback: take first 1500 chars if no section matched
      if (prompt.endsWith(`### ${skill.name}\n\n`)) {
        prompt += skill.content.slice(0, 1500) + '...\n\n';
      }
    } else {
      // Full mode - include everything (use sparingly due to token cost)
      prompt += `### ${skill.name}\n\n${skill.content}\n\n---\n\n`;
    }
  }

  return prompt;
}

// Skill recommendation mapping by agent
export const AGENT_SKILL_MAP = {
  cultivator: ['email-sequence', 'copywriting'],
  scribe: ['copywriting', 'email-sequence', 'social-content'],
  herald: ['email-sequence', 'social-content', 'copywriting'],
  'draft-generator': ['email-sequence', 'copywriting']
};

/**
 * Get recommended skills for an agent
 * @param {string} agentId - Agent identifier
 * @returns {string[]} Array of recommended skill names
 */
export function getRecommendedSkills(agentId) {
  return AGENT_SKILL_MAP[agentId] || [];
}

/**
 * Load skills for a specific agent
 * @param {string} agentId - Agent identifier
 * @param {string} mode - Loading mode
 * @returns {Promise<string>} Skill prompt ready for injection
 */
export async function loadSkillsForAgent(agentId, mode = 'principles-only') {
  const skillNames = getRecommendedSkills(agentId);
  if (skillNames.length === 0) return '';

  const skills = await loadSkills(skillNames);
  return buildSkillPrompt(skills, mode);
}

export default {
  loadSkill,
  loadSkills,
  listAvailableSkills,
  buildSkillPrompt,
  getRecommendedSkills,
  loadSkillsForAgent,
  AGENT_SKILL_MAP
};

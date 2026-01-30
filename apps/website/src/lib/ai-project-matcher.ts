/**
 * AI-Powered Project Matcher
 * Uses Claude/OpenAI to intelligently match stories and storytellers to projects
 * based on thematic alignment, cultural context, and LCAA method principles
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Project } from '@/data/projects';
import type { Storyteller, Story } from './empathy-ledger-integration';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface ProjectMatchResult {
  storyteller: Storyteller;
  relevanceScore: number;
  reasoning: string;
  suggestedThemes: string[];
  culturalAlignment?: string;
}

export interface StoryMatchResult {
  story: Story;
  relevanceScore: number;
  reasoning: string;
  quotableExcerpts?: string[];
}

/**
 * Use Claude to determine if a storyteller's work aligns with a project
 */
export async function matchStorytellerToProject(
  storyteller: Storyteller,
  project: Project,
  storytellerStories?: Story[]
): Promise<ProjectMatchResult | null> {
  try {
    const prompt = `You are an expert in community-led projects and Indigenous storytelling.

Analyze whether this storyteller's work aligns with the following project:

PROJECT: ${project.title}
Tagline: ${project.tagline}
Description: ${project.description}
Focus Areas: ${project.focus.join(', ')}
Theme: ${project.theme}

${project.listen ? `\nListen (LCAA): ${project.listen}` : ''}
${project.curiosity ? `\nCuriosity (LCAA): ${project.curiosity}` : ''}
${project.action ? `\nAction (LCAA): ${project.action}` : ''}

STORYTELLER: ${storyteller.full_name}
Bio: ${storyteller.bio || 'No bio available'}
Cultural Background: ${storyteller.cultural_background || 'Not specified'}
Organization: ${storyteller.organization_id || 'Independent'}

${storytellerStories && storytellerStories.length > 0 ? `\nRecent Stories:\n${storytellerStories.slice(0, 3).map(s => `- ${s.title}: ${s.excerpt || 'No excerpt'}`).join('\n')}` : ''}

Respond in JSON format with:
{
  "isMatch": boolean,
  "relevanceScore": number (0-100),
  "reasoning": "explanation of why this is or isn't a good match",
  "suggestedThemes": ["theme1", "theme2"],
  "culturalAlignment": "notes on cultural protocols and respect"
}

Consider:
1. Thematic alignment with project focus areas
2. Cultural protocols and sovereignty
3. LCAA method alignment (Listen, Curiosity, Action, Art)
4. Community voice and lived experience
5. Whether featuring this storyteller would strengthen the project narrative`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') return null;

    const result = JSON.parse(content.text);

    if (!result.isMatch) return null;

    return {
      storyteller,
      relevanceScore: result.relevanceScore,
      reasoning: result.reasoning,
      suggestedThemes: result.suggestedThemes || [],
      culturalAlignment: result.culturalAlignment,
    };
  } catch (error) {
    console.error('Error matching storyteller to project:', error);
    return null;
  }
}

/**
 * Batch match multiple storytellers to a project
 */
export async function batchMatchStorytellersToProject(
  storytellers: Storyteller[],
  project: Project,
  options: {
    minRelevanceScore?: number;
    maxMatches?: number;
  } = {}
): Promise<ProjectMatchResult[]> {
  const minScore = options.minRelevanceScore ?? 60;
  const maxMatches = options.maxMatches ?? 5;

  const matches: ProjectMatchResult[] = [];

  // Process in batches to avoid rate limits
  for (const storyteller of storytellers) {
    const match = await matchStorytellerToProject(storyteller, project);

    if (match && match.relevanceScore >= minScore) {
      matches.push(match);
    }

    // Stop if we have enough matches
    if (matches.length >= maxMatches) break;

    // Rate limiting - wait 500ms between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Sort by relevance score
  return matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Find the best stories to feature on a project page
 */
export async function findBestStoriesForProject(
  stories: Story[],
  project: Project,
  options: {
    maxStories?: number;
  } = {}
): Promise<StoryMatchResult[]> {
  const maxStories = options.maxStories ?? 3;

  try {
    const prompt = `You are selecting the most powerful stories to feature on a project page.

PROJECT: ${project.title}
Description: ${project.description}
Focus: ${project.focus.join(', ')}

AVAILABLE STORIES:
${stories.map((s, i) => `${i + 1}. "${s.title}"\n   ${s.excerpt || 'No excerpt'}\n   Themes: ${s.themes?.join(', ') || 'none'}`).join('\n\n')}

Select the ${maxStories} most impactful stories that:
1. Align with the project's mission and focus
2. Amplify community voice and lived experience
3. Honor cultural protocols
4. Tell powerful, authentic narratives
5. Would resonate with visitors learning about this project

Respond in JSON format:
{
  "selectedStories": [
    {
      "storyIndex": number (1-based index from list above),
      "relevanceScore": number (0-100),
      "reasoning": "why this story is powerful for this project",
      "quotableExcerpts": ["notable quote 1", "notable quote 2"]
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') return [];

    const result = JSON.parse(content.text);

    return result.selectedStories.map((selected: any) => ({
      story: stories[selected.storyIndex - 1],
      relevanceScore: selected.relevanceScore,
      reasoning: selected.reasoning,
      quotableExcerpts: selected.quotableExcerpts,
    }));
  } catch (error) {
    console.error('Error finding best stories:', error);
    return [];
  }
}

/**
 * Generate enriched LCAA content using AI analysis of stories
 */
export async function generateLCAAContentFromStories(
  project: Project,
  stories: Story[]
): Promise<{
  listen?: string;
  curiosity?: string;
  action?: string;
  art?: string;
}> {
  try {
    const prompt = `You are writing LCAA method content for a community project, based on real stories from community members.

PROJECT: ${project.title}
Current Description: ${project.description}

COMMUNITY STORIES:
${stories.slice(0, 5).map((s, i) => `Story ${i + 1}: ${s.title}\n${s.excerpt || 'No excerpt available'}`).join('\n\n')}

Using these authentic community voices, generate LCAA method content:

LISTEN: What did we hear from community? What needs emerged from conversation?
CURIOSITY: What questions did we ask? What did we want to understand?
ACTION: What tangible work did we do? What changed?
ART: How did we make the work visible, beautiful, and shareable?

Each section should be 2-3 sentences, grounded in the real stories above.
Write in first person plural ("we"). Honor community voice.

Respond in JSON:
{
  "listen": "...",
  "curiosity": "...",
  "action": "...",
  "art": "..."
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') return {};

    return JSON.parse(content.text);
  } catch (error) {
    console.error('Error generating LCAA content:', error);
    return {};
  }
}

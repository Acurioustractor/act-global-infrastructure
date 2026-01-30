/**
 * Notion API Client for ACT Project Metadata
 *
 * This client connects to the ACT Projects Notion database to extract:
 * - Project metadata (name, description, status)
 * - Focus areas and themes
 * - Timeline information
 * - Partner organizations
 * - Outcomes and metrics
 * - Connection points to other projects
 */

import { Client } from '@notionhq/client';

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY,
});

// ACT Database IDs (from environment)
const PROJECTS_DATABASE_ID = process.env.NOTION_PROJECTS_DATABASE_ID || '';
const ACTIONS_DATABASE_ID = process.env.NOTION_ACTIONS_DATABASE_ID || '';
const PEOPLE_DATABASE_ID = process.env.NOTION_PEOPLE_DATABASE_ID || '';
const ORGANIZATIONS_DATABASE_ID = process.env.NOTION_ORGANIZATIONS_DATABASE_ID || '';

export interface NotionProjectMetadata {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: 'active' | 'planning' | 'completed' | 'paused';
  priority: number;
  focusAreas: string[];
  themes: string[];
  partners: string[];
  organizationName: string;
  startDate: string | null;
  endDate: string | null;
  outcomes: string;
  metrics: Record<string, any>;
  timelineEntries: Array<{
    date: string;
    description: string;
    type: string;
  }>;
  connections: string[]; // Related project IDs
  notes: string;
  coverImage?: string;
  lastUpdated: string;
}

/**
 * Fetch a single project from Notion by slug
 */
export async function getNotionProject(slug: string): Promise<NotionProjectMetadata | null> {
  try {
    const response = await notion.dataSources.query({
      data_source_id: PROJECTS_DATABASE_ID,
      filter: {
        property: 'Slug',
        rich_text: {
          equals: slug,
        },
      },
      page_size: 1,
    });

    if (response.results.length === 0) {
      console.log(`No Notion project found for slug: ${slug}`);
      return null;
    }

    const page: any = response.results[0];
    return parseNotionPage(page);
  } catch (error) {
    console.error(`Error fetching Notion project for slug ${slug}:`, error);
    throw error;
  }
}

/**
 * Fetch all active projects from Notion
 */
export async function getAllNotionProjects(): Promise<NotionProjectMetadata[]> {
  try {
    const response = await notion.dataSources.query({
      data_source_id: PROJECTS_DATABASE_ID,
      filter: {
        property: 'Status',
        status: {
          does_not_equal: 'Archived',
        },
      },
    });

    return response.results.map((page: any) => parseNotionPage(page));
  } catch (error) {
    console.error('Error fetching all Notion projects:', error);
    throw error;
  }
}

/**
 * Parse a Notion page into our project metadata structure
 */
function parseNotionPage(page: any): NotionProjectMetadata {
  const props = page.properties;

  return {
    id: page.id,
    slug: getTextProperty(props.Slug),
    title: getTitleProperty(props.Name || props.Title),
    description: getTextProperty(props.Description),
    status: getSelectProperty(props.Status) as any || 'active',
    priority: getNumberProperty(props.Priority) || 0,
    focusAreas: getMultiSelectProperty(props['Focus Areas']),
    themes: getMultiSelectProperty(props.Themes),
    partners: getMultiSelectProperty(props.Partners),
    organizationName: getTextProperty(props.Organization),
    startDate: getDateProperty(props['Start Date']),
    endDate: getDateProperty(props['End Date']),
    outcomes: getTextProperty(props.Outcomes),
    metrics: parseMetrics(getTextProperty(props.Metrics)),
    timelineEntries: parseTimeline(getTextProperty(props.Timeline)),
    connections: getRelationProperty(props.Connections),
    notes: getTextProperty(props.Notes),
    coverImage: page.cover?.external?.url || page.cover?.file?.url,
    lastUpdated: page.last_edited_time,
  };
}

/**
 * Helper functions to extract typed data from Notion properties
 */
function getTitleProperty(prop: any): string {
  if (!prop || !prop.title) return '';
  return prop.title.map((t: any) => t.plain_text).join('');
}

function getTextProperty(prop: any): string {
  if (!prop) return '';
  if (prop.rich_text) {
    return prop.rich_text.map((t: any) => t.plain_text).join('');
  }
  return '';
}

function getSelectProperty(prop: any): string {
  if (!prop || !prop.select) return '';
  return prop.select.name || '';
}

function getMultiSelectProperty(prop: any): string[] {
  if (!prop || !prop.multi_select) return [];
  return prop.multi_select.map((s: any) => s.name);
}

function getNumberProperty(prop: any): number | null {
  if (!prop || prop.number === null) return null;
  return prop.number;
}

function getDateProperty(prop: any): string | null {
  if (!prop || !prop.date) return null;
  return prop.date.start;
}

function getRelationProperty(prop: any): string[] {
  if (!prop || !prop.relation) return [];
  return prop.relation.map((r: any) => r.id);
}

/**
 * Parse metrics JSON string from Notion
 */
function parseMetrics(metricsText: string): Record<string, any> {
  if (!metricsText) return {};
  try {
    return JSON.parse(metricsText);
  } catch {
    // If not valid JSON, return as single text metric
    return { notes: metricsText };
  }
}

/**
 * Parse timeline entries from structured text
 */
function parseTimeline(timelineText: string): Array<{
  date: string;
  description: string;
  type: string;
}> {
  if (!timelineText) return [];

  try {
    // Try parsing as JSON first
    return JSON.parse(timelineText);
  } catch {
    // Fall back to line-by-line parsing
    const lines = timelineText.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const match = line.match(/^(\d{4}-\d{2}-\d{2})\s*-?\s*(.+)$/);
      if (match) {
        return {
          date: match[1],
          description: match[2],
          type: 'milestone',
        };
      }
      return {
        date: new Date().toISOString().split('T')[0],
        description: line,
        type: 'note',
      };
    });
  }
}

/**
 * Fetch page content (blocks) from Notion
 */
export async function getNotionPageContent(pageId: string): Promise<string> {
  try {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
    });

    // Convert blocks to plain text
    return response.results
      .map((block: any) => {
        if (block.type === 'paragraph' && block.paragraph?.rich_text) {
          return block.paragraph.rich_text.map((t: any) => t.plain_text).join('');
        }
        if (block.type === 'heading_1' && block.heading_1?.rich_text) {
          return block.heading_1.rich_text.map((t: any) => t.plain_text).join('');
        }
        if (block.type === 'heading_2' && block.heading_2?.rich_text) {
          return block.heading_2.rich_text.map((t: any) => t.plain_text).join('');
        }
        if (block.type === 'bulleted_list_item' && block.bulleted_list_item?.rich_text) {
          return '• ' + block.bulleted_list_item.rich_text.map((t: any) => t.plain_text).join('');
        }
        return '';
      })
      .filter(text => text.length > 0)
      .join('\n');
  } catch (error) {
    console.error(`Error fetching Notion page content for ${pageId}:`, error);
    return '';
  }
}

export { notion };

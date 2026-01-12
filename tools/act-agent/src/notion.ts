import { Client } from '@notionhq/client';
import { NOTION_TOKEN, DATABASE_ID } from './config.js';

export const notion = new Client({ auth: NOTION_TOKEN });
export const databaseId = DATABASE_ID;

// Extract page ID from Notion URL
export function extractPageId(urlOrId: string): string {
  // If it's already a UUID format, return it
  if (/^[a-f0-9-]{32,36}$/i.test(urlOrId)) {
    return urlOrId;
  }

  // Extract from URL like https://www.notion.so/workspace/Title-abc123def456
  const match = urlOrId.match(/([a-f0-9]{32})/i);
  if (match) {
    // Format as UUID
    const id = match[1];
    return `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`;
  }

  throw new Error(`Could not extract page ID from: ${urlOrId}`);
}

// Get task by URL or ID
export async function getTask(urlOrId: string) {
  const pageId = extractPageId(urlOrId);
  return notion.pages.retrieve({ page_id: pageId });
}

// Update task properties
export async function updateTask(urlOrId: string, properties: Record<string, any>) {
  const pageId = extractPageId(urlOrId);
  return notion.pages.update({
    page_id: pageId,
    properties
  });
}

// Get comments on a task
export async function getComments(urlOrId: string) {
  const pageId = extractPageId(urlOrId);
  return notion.comments.list({ block_id: pageId });
}

// Add a comment to a task
export async function addComment(urlOrId: string, text: string) {
  const pageId = extractPageId(urlOrId);
  return notion.comments.create({
    parent: { page_id: pageId },
    rich_text: [{ type: 'text', text: { content: text } }]
  });
}

// Create a new task
export async function createTask(options: {
  name: string;
  project?: string;
  priority?: string;
  currentStatus?: string;
}) {
  const properties: Record<string, any> = {
    Name: { title: [{ text: { content: options.name } }] },
    Status: { select: { name: 'In Progress' } },
    Blocked: { checkbox: false },
    Started: { date: { start: new Date().toISOString().split('T')[0] } }
  };

  if (options.project) {
    properties.Project = { select: { name: options.project } };
  }
  if (options.priority) {
    properties.Priority = { select: { name: options.priority } };
  }
  if (options.currentStatus) {
    properties['Current Status'] = { rich_text: [{ text: { content: options.currentStatus } }] };
  }

  return notion.pages.create({
    parent: { database_id: databaseId },
    properties
  });
}

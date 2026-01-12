#!/usr/bin/env node

/**
 * Post Morning Brief to Notion
 *
 * Posts the generated morning brief to the Command Center's
 * "Today's Brief" toggle section.
 *
 * Usage:
 *   node scripts/post-brief-to-notion.mjs
 */

import './lib/load-env.mjs';
import { readFile } from 'fs/promises';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

// Command Center toggle block ID
const TOGGLE_BLOCK_ID = '2deebcf9-81cf-8141-95e7-d621e16afc64';

async function postBriefToNotion() {
  if (!NOTION_TOKEN) {
    console.error('Missing NOTION_TOKEN');
    process.exit(1);
  }

  // Read the generated brief
  let briefContent;
  try {
    briefContent = await readFile('brief.md', 'utf8');
  } catch {
    console.error('No brief.md found. Run generate-morning-brief.mjs first.');
    process.exit(1);
  }

  console.log('📝 Posting brief to Notion Command Center...');

  // Clear existing content in toggle
  await clearToggleContent(TOGGLE_BLOCK_ID);

  // Parse brief into Notion blocks
  const blocks = parseMarkdownToBlocks(briefContent);

  // Append new content
  await appendBlocks(TOGGLE_BLOCK_ID, blocks);

  console.log('✅ Brief posted to Notion');
}

async function clearToggleContent(blockId) {
  // Get existing children
  const response = await fetch(
    `https://api.notion.com/v1/blocks/${blockId}/children?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_VERSION,
      },
    }
  );

  const data = await response.json();

  // Delete each child block
  for (const block of data.results || []) {
    await fetch(`https://api.notion.com/v1/blocks/${block.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_VERSION,
      },
    });
  }
}

async function appendBlocks(blockId, blocks) {
  // Notion API limits to 100 blocks per request
  const batchSize = 100;

  for (let i = 0; i < blocks.length; i += batchSize) {
    const batch = blocks.slice(i, i + batchSize);

    await fetch(`https://api.notion.com/v1/blocks/${blockId}/children`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION,
      },
      body: JSON.stringify({ children: batch }),
    });
  }
}

function parseMarkdownToBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Heading 1: # Title
    if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ text: { content: line.slice(2) } }],
        },
      });
      i++;
      continue;
    }

    // Heading 2: ## Title
    if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: line.slice(3) } }],
        },
      });
      i++;
      continue;
    }

    // Heading 3: ### Title
    if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ text: { content: line.slice(4) } }],
        },
      });
      i++;
      continue;
    }

    // Quote: > text
    if (line.startsWith('> ')) {
      blocks.push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: [{ text: { content: line.slice(2) } }],
        },
      });
      i++;
      continue;
    }

    // Numbered list: 1. item
    if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s/, '');
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: parseRichText(content),
        },
      });
      i++;
      continue;
    }

    // Bulleted list: - item
    if (line.startsWith('- ')) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: parseRichText(line.slice(2)),
        },
      });
      i++;
      continue;
    }

    // Divider: ---
    if (line.trim() === '---') {
      blocks.push({
        object: 'block',
        type: 'divider',
        divider: {},
      });
      i++;
      continue;
    }

    // Italic text (generated timestamp)
    if (line.startsWith('*') && line.endsWith('*')) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              text: { content: line.slice(1, -1) },
              annotations: { italic: true, color: 'gray' },
            },
          ],
        },
      });
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: parseRichText(line),
      },
    });
    i++;
  }

  return blocks;
}

function parseRichText(text) {
  const parts = [];
  let remaining = text;

  // Parse bold: **text**
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        text: { content: text.slice(lastIndex, match.index) },
      });
    }

    // Add bold text
    parts.push({
      text: { content: match[1] },
      annotations: { bold: true },
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      text: { content: text.slice(lastIndex) },
    });
  }

  // If no parts were created, return the original text
  if (parts.length === 0) {
    return [{ text: { content: text } }];
  }

  return parts;
}

// Run
postBriefToNotion().catch(console.error);

#!/usr/bin/env node

import { Client } from '@notionhq/client';
import fs from 'fs';

const NOTION_TOKEN = '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';
const notion = new Client({ auth: NOTION_TOKEN });

const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));

async function main() {
  const db = await notion.databases.retrieve({ database_id: dbIds.sprintTracking });
  console.log(JSON.stringify(db, null, 2));
}

main().catch(console.error);

import { config } from 'dotenv';
import { resolve } from 'path';
// Load .env from the tool directory
config({ path: resolve(import.meta.dirname, '../.env') });
export const NOTION_TOKEN = process.env.NOTION_TOKEN || '';
export const DATABASE_ID = process.env.NOTION_DATABASE_ID || '2e1ebcf9-81cf-8033-81ce-000bf6433073';
if (!NOTION_TOKEN) {
    console.error('Error: NOTION_TOKEN not set. Create a .env file with your token.');
    process.exit(1);
}

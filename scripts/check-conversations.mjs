import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env.local'), override: true });
dotenv.config({ path: path.join(rootDir, '.env'), override: true });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

try {
  console.log('=== CHECKING PROJECTS DATABASE FOR CONVERSATIONS RELATION ===\n');
  
  const projectsDb = await notion.databases.retrieve({ 
    database_id: '177ebcf9-81cf-80dd-9514-f1ec32f3314c' 
  });
  
  // Check if Conversations property exists
  const conversationsProp = projectsDb.properties['Conversations'];
  
  if (conversationsProp) {
    console.log('✓ FOUND Conversations property');
    console.log(`Type: ${conversationsProp.type}`);
    if (conversationsProp.type === 'relation') {
      console.log(`Points to database: ${conversationsProp.relation.database_id}`);
      
      // Get details about that database
      const relatedDb = await notion.databases.retrieve({ 
        database_id: conversationsProp.relation.database_id 
      });
      console.log(`\nDatabase name: ${relatedDb.title?.[0]?.plain_text || 'Untitled'}`);
      console.log(`\nProperties:`);
      for (const [propName, propDef] of Object.entries(relatedDb.properties)) {
        console.log(`  - ${propName}: ${propDef.type}`);
        if (propDef.type === 'relation') {
          console.log(`    -> Points to database: ${propDef.relation.database_id}`);
        }
      }
      
      // Get sample items
      console.log(`\nSample items (first 5):`);
      const items = await notion.databases.query({ 
        database_id: conversationsProp.relation.database_id,
        page_size: 5
      });
      
      for (const item of items.results) {
        const title = item.properties.Name?.title?.[0]?.plain_text || 
                     item.properties.Title?.title?.[0]?.plain_text ||
                     'Untitled';
        console.log(`  - ${title}`);
      }
    }
  } else {
    console.log('✗ NO Conversations property found');
    console.log('\nAll relation properties in Projects database:');
    for (const [propName, propDef] of Object.entries(projectsDb.properties)) {
      if (propDef.type === 'relation') {
        console.log(`  - ${propName} -> ${propDef.relation.database_id}`);
      }
    }
  }
  
} catch (error) {
  console.error('Error:', error.message);
  if (error.body) console.error('Details:', JSON.stringify(error.body, null, 2));
}

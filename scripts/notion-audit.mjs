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
  console.log('=== SEARCHING FOR MEETING-RELATED DATABASES ===\n');
  
  // Search for databases
  const searchTerms = ['meeting', 'notes', 'conversations'];
  const foundDatabases = new Map();
  
  for (const term of searchTerms) {
    console.log(`Searching for: ${term}`);
    const response = await notion.search({
      query: term,
      filter: { property: 'object', value: 'database' }
    });
    
    for (const db of response.results) {
      if (!foundDatabases.has(db.id)) {
        foundDatabases.set(db.id, db);
        console.log(`  Found: ${db.title?.[0]?.plain_text || 'Untitled'} (ID: ${db.id})`);
      }
    }
  }
  
  console.log(`\nTotal unique databases found: ${foundDatabases.size}\n`);
  
  // Get details for each database
  console.log('=== DATABASE DETAILS ===\n');
  
  for (const [id, db] of foundDatabases) {
    const title = db.title?.[0]?.plain_text || 'Untitled';
    console.log(`\n--- ${title} ---`);
    console.log(`ID: ${id}`);
    
    // Get full database details
    const fullDb = await notion.databases.retrieve({ database_id: id });
    
    console.log(`Properties:`);
    for (const [propName, propDef] of Object.entries(fullDb.properties)) {
      console.log(`  - ${propName}: ${propDef.type}`);
      if (propDef.type === 'relation') {
        console.log(`    -> Points to database: ${propDef.relation.database_id}`);
      }
    }
    
    // Get item count
    const query = await notion.databases.query({ 
      database_id: id,
      page_size: 1
    });
    
    console.log(`Estimated items: Using has_more=${query.has_more} as indicator`);
  }
  
  // Check the Projects database specifically
  console.log('\n\n=== PROJECTS DATABASE (177ebcf9-81cf-80dd-9514-f1ec32f3314c) ===\n');
  
  const projectsDb = await notion.databases.retrieve({ 
    database_id: '177ebcf9-81cf-80dd-9514-f1ec32f3314c' 
  });
  
  console.log('Properties:');
  for (const [propName, propDef] of Object.entries(projectsDb.properties)) {
    console.log(`  - ${propName}: ${propDef.type}`);
    if (propDef.type === 'relation') {
      console.log(`    -> Points to database: ${propDef.relation.database_id}`);
      
      // If this is the Conversations relation, get details about that database
      if (propName === 'Conversations') {
        const relatedDb = await notion.databases.retrieve({ 
          database_id: propDef.relation.database_id 
        });
        console.log(`    -> Database name: ${relatedDb.title?.[0]?.plain_text || 'Untitled'}`);
        console.log(`    -> Properties in that database:`);
        for (const [relPropName, relPropDef] of Object.entries(relatedDb.properties)) {
          console.log(`       - ${relPropName}: ${relPropDef.type}`);
        }
      }
    }
  }
  
} catch (error) {
  console.error('Error:', error.message);
  if (error.body) console.error('Details:', JSON.stringify(error.body, null, 2));
}

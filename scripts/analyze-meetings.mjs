import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env.local'), override: true });
dotenv.config({ path: path.join(rootDir, '.env'), override: true });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Most promising meeting databases based on schema
const candidateDatabases = [
  { id: '305ebcf9-81cf-81d2-80e6-fc6ad3617daa', name: 'Meetings' }, // Has Supabase ID, Project, Attendees, Date, Status, Type
  { id: '191ebcf9-81cf-816e-8a96-c875f56d25d6', name: 'Smart Meetings' }, // Has Status, Notes, Attendees, Follow-up, Location, Date
  { id: '5c1589c6-f7d2-4b40-be50-2a9dc7c2660a', name: 'Meetings' }, // Has Tasks relation, Transcript, Summary, Date, Files
];

try {
  console.log('=== ANALYZING CANDIDATE MEETING DATABASES ===\n');
  
  for (const db of candidateDatabases) {
    console.log(`\n--- ${db.name} (${db.id}) ---`);
    
    // Get full database details
    const fullDb = await notion.databases.retrieve({ database_id: db.id });
    
    console.log(`Properties (${Object.keys(fullDb.properties).length}):`);
    for (const [propName, propDef] of Object.entries(fullDb.properties)) {
      console.log(`  - ${propName}: ${propDef.type}`);
      if (propDef.type === 'relation') {
        console.log(`    -> Points to database: ${propDef.relation.database_id}`);
      }
    }
    
    // Get actual item count
    let count = 0;
    let hasMore = true;
    let cursor = undefined;
    
    while (hasMore && count < 100) {
      const query = await notion.databases.query({ 
        database_id: db.id,
        page_size: 100,
        start_cursor: cursor
      });
      count += query.results.length;
      hasMore = query.has_more;
      cursor = query.next_cursor;
    }
    
    console.log(`\nItem count: ${count}${hasMore ? '+' : ''}`);
    
    // Get sample items with actual data
    const items = await notion.databases.query({ 
      database_id: db.id,
      page_size: 3,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }]
    });
    
    console.log(`\nRecent entries:`);
    for (const item of items.results) {
      const title = item.properties.Name?.title?.[0]?.plain_text || 
                   item.properties['Meeting Title']?.title?.[0]?.plain_text ||
                   item.properties.Title?.title?.[0]?.plain_text ||
                   'Untitled';
      
      const date = item.properties.Date?.date?.start || 
                  item.properties['Meeting Date']?.date?.start || 
                  'No date';
      
      console.log(`  - ${title} (${date})`);
      
      // Show which properties have actual data
      const populatedProps = [];
      for (const [propName, propValue] of Object.entries(item.properties)) {
        const hasValue = 
          (propValue.rich_text?.length > 0) ||
          (propValue.title?.length > 0) ||
          (propValue.select) ||
          (propValue.multi_select?.length > 0) ||
          (propValue.date) ||
          (propValue.checkbox !== undefined) ||
          (propValue.people?.length > 0) ||
          (propValue.relation?.length > 0) ||
          (propValue.files?.length > 0);
        
        if (hasValue && propValue.type !== 'title') {
          populatedProps.push(propName);
        }
      }
      if (populatedProps.length > 0) {
        console.log(`    Fields populated: ${populatedProps.join(', ')}`);
      }
    }
  }
  
} catch (error) {
  console.error('Error:', error.message);
  if (error.body) console.error('Details:', JSON.stringify(error.body, null, 2));
}

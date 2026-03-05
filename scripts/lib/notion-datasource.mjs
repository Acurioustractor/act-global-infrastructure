/**
 * Notion SDK v5 Migration Helper
 *
 * SDK v5 replaced `databases.query()` with `dataSources.query()`.
 * Data source IDs differ from database IDs. This helper resolves
 * database IDs → data source IDs using a pre-generated mapping file,
 * falling back to a live API call if needed.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAPPING_PATH = join(__dirname, '../../config/notion-datasource-ids.json');

// Load pre-generated mapping (database key → data_source_id)
let staticMapping = {};
try {
  staticMapping = JSON.parse(readFileSync(MAPPING_PATH, 'utf8'));
} catch {
  // No mapping file — will resolve via API
}

// Reverse map: database_id → data_source_id (from the two config files)
const reverseMap = new Map();
try {
  const dbIds = JSON.parse(readFileSync(join(__dirname, '../../config/notion-database-ids.json'), 'utf8'));
  for (const [key, dbId] of Object.entries(dbIds)) {
    if (staticMapping[key] && staticMapping[key] !== dbId) {
      reverseMap.set(dbId, staticMapping[key]);
    }
  }
} catch {
  // No config file
}

const cache = new Map();

/**
 * Resolve a database ID to its data_source_id for use with dataSources.query().
 * Checks: in-memory cache → static mapping → live API call.
 */
export async function resolveDataSourceId(notion, databaseId) {
  if (cache.has(databaseId)) return cache.get(databaseId);

  // Check pre-generated reverse map (database_id → data_source_id)
  if (reverseMap.has(databaseId)) {
    const dsId = reverseMap.get(databaseId);
    cache.set(databaseId, dsId);
    return dsId;
  }

  // If the ID is already a data_source_id (e.g. from search results), use it directly
  if (Object.values(staticMapping).includes(databaseId)) {
    cache.set(databaseId, databaseId);
    return databaseId;
  }

  // Live lookup via API
  try {
    const db = await notion.databases.retrieve({ database_id: databaseId });
    const dsId = db.data_sources?.[0]?.id;
    if (dsId) {
      cache.set(databaseId, dsId);
      return dsId;
    }
  } catch (e) {
    console.warn(`Could not resolve data_source_id for ${databaseId}: ${e.message}`);
  }

  // Fallback to database ID (may fail at query time but better than crashing here)
  cache.set(databaseId, databaseId);
  return databaseId;
}

/**
 * Query a Notion database using SDK v5 dataSources.query().
 * Accepts a database_id and auto-resolves to data_source_id.
 */
export async function queryDatabase(notion, databaseId, params = {}) {
  const dataSourceId = await resolveDataSourceId(notion, databaseId);
  return notion.dataSources.query({
    data_source_id: dataSourceId,
    ...params,
  });
}

/**
 * Retrieve database metadata (properties, data_sources list).
 * Still uses databases.retrieve() which accepts database_id.
 */
export async function retrieveDatabase(notion, databaseId) {
  return notion.databases.retrieve({ database_id: databaseId });
}

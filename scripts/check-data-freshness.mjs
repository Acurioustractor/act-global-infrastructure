import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0NjIyOSwiZXhwIjoyMDY3OTIyMjI5fQ.wyizbOWRxMULUp6WBojJPfey1ta8-Al1OlZqDDIPIHo'
);

const now = new Date();

function getStatus(lastSync) {
  if (!lastSync || lastSync === 'N/A') return 'UNKNOWN';
  const syncDate = new Date(lastSync);
  const hoursSince = (now - syncDate) / (1000 * 60 * 60);
  if (hoursSince < 24) return 'FRESH';
  if (hoursSince < 48) return 'STALE';
  return 'CRITICAL';
}

async function checkTable(tableName, syncColumn = 'synced_at') {
  try {
    // Get count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return { total: 0, last_sync: 'N/A', error: countError.message };
    }

    // Get max sync date
    const { data, error } = await supabase
      .from(tableName)
      .select(syncColumn)
      .order(syncColumn, { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { total: count || 0, last_sync: 'N/A' };
    }

    return { total: count || 0, last_sync: data[syncColumn] };
  } catch (err) {
    return { total: 0, last_sync: 'N/A', error: err.message };
  }
}

async function main() {
  console.log('Checking data freshness across ACT infrastructure...\n');

  const checks = [
    { name: 'Gmail/Email', table: 'communications_history', column: 'synced_at' },
    { name: 'Calendar', table: 'calendar_events', column: 'synced_at' },
    { name: 'GHL Contacts', table: 'ghl_contacts', column: 'synced_at' },
    { name: 'GHL Opportunities', table: 'ghl_opportunities', column: 'synced_at' },
    { name: 'Notion Pages', table: 'notion_pages', column: 'synced_at' },
    { name: 'Xero Transactions', table: 'xero_transactions', column: 'synced_at' },
    { name: 'Knowledge/Meetings', table: 'project_knowledge', column: 'recorded_at' },
    { name: 'iMessages', table: 'imessages', column: 'synced_at' },
  ];

  const results = [];

  for (const { name, table, column } of checks) {
    const result = await checkTable(table, column);
    results.push({
      system: name,
      ...result,
      status: getStatus(result.last_sync)
    });
  }

  // Check projects count
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });
  
  results.push({
    system: 'Projects',
    total: projectCount || 0,
    last_sync: 'N/A',
    status: 'N/A'
  });

  // Check data_freshness table if it exists
  console.log('=== DATA FRESHNESS TRACKING TABLE ===\n');
  const { data: freshnessData, error: freshnessError } = await supabase
    .from('data_freshness')
    .select('*')
    .order('last_sync', { ascending: false });

  if (!freshnessError && freshnessData && freshnessData.length > 0) {
    console.table(freshnessData);
  } else {
    console.log('No data_freshness table found or empty\n');
  }

  console.log('\n=== INDIVIDUAL TABLE DATA FRESHNESS ===\n');
  console.table(results.map(r => ({
    System: r.system,
    'Last Sync': r.last_sync === 'N/A' ? 'N/A' : new Date(r.last_sync).toLocaleString(),
    'Records': r.total.toLocaleString(),
    Status: r.status,
    Error: r.error || ''
  })));

  // Summary by status
  console.log('\n=== SUMMARY ===\n');
  const fresh = results.filter(r => r.status === 'FRESH').length;
  const stale = results.filter(r => r.status === 'STALE').length;
  const critical = results.filter(r => r.status === 'CRITICAL').length;
  const unknown = results.filter(r => r.status === 'UNKNOWN' || r.status === 'N/A').length;

  console.log(`Fresh (<24h):     ${fresh}`);
  console.log(`Stale (24-48h):   ${stale}`);
  console.log(`Critical (>48h):  ${critical}`);
  console.log(`Unknown/N/A:      ${unknown}`);
}

main().catch(console.error);

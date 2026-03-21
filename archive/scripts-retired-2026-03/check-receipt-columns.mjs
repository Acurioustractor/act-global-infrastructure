#!/usr/bin/env node
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Check for receipt-related tables
const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', { 
  query: `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
      AND table_name LIKE '%receipt%'
    ORDER BY table_name
  ` 
});

console.log('Receipt-related tables:');
tables?.forEach(t => console.log(`  ${t.table_name}`));

// Sample a transaction to see line_items structure
const { data: sample } = await supabase.rpc('exec_sql', { 
  query: `
    SELECT line_items, total, has_attachments
    FROM xero_transactions
    WHERE type = 'SPEND'
      AND date >= '2025-10-01'
    LIMIT 1
  ` 
});

console.log('\nSample transaction:');
console.log(JSON.stringify(sample?.[0], null, 2));

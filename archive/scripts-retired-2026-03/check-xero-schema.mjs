#!/usr/bin/env node
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase.rpc('exec_sql', { 
  query: `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'xero_transactions'
    ORDER BY ordinal_position
  ` 
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('xero_transactions columns:');
  data.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));
}

// Also check xero_invoices
const { data: invCols, error: invError } = await supabase.rpc('exec_sql', { 
  query: `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'xero_invoices'
    ORDER BY ordinal_position
  ` 
});

if (!invError && invCols) {
  console.log('\nxero_invoices columns:');
  invCols.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));
}

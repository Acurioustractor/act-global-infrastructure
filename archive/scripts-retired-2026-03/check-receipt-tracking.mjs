#!/usr/bin/env node
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Check receipt_matches structure
const { data: matchCols } = await supabase.rpc('exec_sql', { 
  query: `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'receipt_matches'
    ORDER BY ordinal_position
  ` 
});

console.log('receipt_matches columns:');
matchCols?.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));

// Check receipt_emails structure
const { data: emailCols } = await supabase.rpc('exec_sql', { 
  query: `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'receipt_emails'
    ORDER BY ordinal_position
  ` 
});

console.log('\nreceipt_emails columns:');
emailCols?.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));

// Check how many receipts we have matched
const { data: stats } = await supabase.rpc('exec_sql', { 
  query: `
    SELECT 
      COUNT(DISTINCT xero_transaction_id) as matched_transaction_count
    FROM receipt_matches
    WHERE xero_transaction_id IS NOT NULL
  ` 
});

console.log('\nReceipt match stats:');
console.log(`  Matched transactions: ${stats?.[0]?.matched_transaction_count}`);

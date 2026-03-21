#!/usr/bin/env node
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Check what tax_types are actually in use
const { data } = await supabase.rpc('exec_sql', { 
  query: `
    SELECT 
      li->>'tax_type' as tax_type,
      COUNT(*) as occurrence_count,
      SUM((li->>'line_amount')::numeric) as total_amount
    FROM xero_transactions,
         jsonb_array_elements(line_items) li
    WHERE date >= '2025-10-01'
    GROUP BY li->>'tax_type'
    ORDER BY occurrence_count DESC
  ` 
});

console.log('Tax types in use (Q2+ FY26):');
data?.forEach(row => {
  console.log(`  ${row.tax_type}: ${row.occurrence_count} line items, total $${row.total_amount}`);
});

// Sample a few transactions with different tax types
const { data: samples } = await supabase.rpc('exec_sql', { 
  query: `
    SELECT 
      date,
      contact_name,
      total,
      line_items
    FROM xero_transactions
    WHERE date >= '2025-10-01'
      AND type = 'SPEND'
    LIMIT 5
  ` 
});

console.log('\nSample transactions:');
samples?.forEach((s, i) => {
  console.log(`\n${i+1}. ${s.date} - ${s.contact_name}: $${s.total}`);
  console.log(`   Line items: ${JSON.stringify(s.line_items, null, 2)}`);
});

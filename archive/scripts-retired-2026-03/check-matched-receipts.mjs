#!/usr/bin/env node
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co',
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await sb.rpc('exec_sql', { query: `
  SELECT re.id, re.vendor_name, re.amount_detected,
    re.xero_bank_transaction_id, re.xero_invoice_id,
    re.attachment_url, re.match_method,
    (SELECT COUNT(*) FROM xero_transactions xt WHERE xt.xero_transaction_id = re.xero_bank_transaction_id) as tx_exists,
    (SELECT COUNT(*) FROM xero_invoices xi WHERE xi.xero_id = re.xero_invoice_id) as inv_exists
  FROM receipt_emails re
  WHERE re.status = 'matched'
    AND (re.xero_bank_transaction_id IS NOT NULL OR re.xero_invoice_id IS NOT NULL)
    AND re.attachment_url IS NOT NULL
  LIMIT 10
` });

if (error) { console.log('ERROR:', error.message); process.exit(1); }

for (const row of data || []) {
  console.log(`${row.vendor_name} $${row.amount_detected}`);
  console.log(`  bank_tx: ${row.xero_bank_transaction_id?.slice(0,20)} (exists: ${row.tx_exists})`);
  console.log(`  invoice: ${row.xero_invoice_id?.slice(0,20)} (exists: ${row.inv_exists})`);
  console.log(`  method: ${row.match_method} | attachment: ${row.attachment_url?.slice(0,50)}`);
  console.log();
}

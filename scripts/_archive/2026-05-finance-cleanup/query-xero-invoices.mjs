#!/usr/bin/env node
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Query 1: Outstanding invoices
console.log('\n=== OUTSTANDING ACCREC INVOICES ===\n');
const { data: outstanding, error: err1 } = await supabase
  .from('xero_invoices')
  .select('contact_name, invoice_number, type, status, total, amount_due, amount_paid, due_date, date, reference, line_items')
  .eq('type', 'ACCREC')
  .in('status', ['AUTHORISED', 'SENT'])
  .order('due_date', { ascending: true });

if (err1) {
  console.error('Error:', err1);
} else {
  console.log(`Found ${outstanding.length} outstanding invoices\n`);
  outstanding.forEach(inv => {
    console.log(`${inv.due_date} | ${inv.contact_name} | $${inv.amount_due} due | Invoice ${inv.invoice_number} | ${inv.status}`);
    if (inv.reference) console.log(`  Ref: ${inv.reference}`);
  });
}

// Query 2: Paid invoices this FY
console.log('\n\n=== PAID ACCREC INVOICES (FY2025-26) ===\n');
const { data: paid, error: err2 } = await supabase
  .from('xero_invoices')
  .select('contact_name, total, status, date, due_date, reference')
  .eq('type', 'ACCREC')
  .eq('status', 'PAID')
  .gte('date', '2025-07-01')
  .order('date', { ascending: false });

if (err2) {
  console.error('Error:', err2);
} else {
  console.log(`Found ${paid.length} paid invoices\n`);
  let totalRevenue = 0;
  paid.forEach(inv => {
    totalRevenue += inv.total;
    console.log(`${inv.date} | ${inv.contact_name} | $${inv.total} | ${inv.reference || 'No ref'}`);
  });
  console.log(`\nTotal FY2025-26 revenue: $${totalRevenue.toFixed(2)}`);
}

// Query 3: Drafts and quotes
console.log('\n\n=== DRAFT/SUBMITTED ACCREC INVOICES ===\n');
const { data: drafts, error: err3 } = await supabase
  .from('xero_invoices')
  .select('contact_name, total, status, date, reference')
  .eq('type', 'ACCREC')
  .in('status', ['DRAFT', 'SUBMITTED'])
  .order('date', { ascending: false });

if (err3) {
  console.error('Error:', err3);
} else {
  console.log(`Found ${drafts.length} draft/submitted invoices\n`);
  drafts.forEach(inv => {
    console.log(`${inv.date} | ${inv.contact_name} | $${inv.total} | ${inv.status} | ${inv.reference || 'No ref'}`);
  });
}

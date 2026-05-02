#!/usr/bin/env node
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const output = [];

// Query 1: Outstanding invoices with full details
const { data: outstanding } = await supabase
  .from('xero_invoices')
  .select('*')
  .eq('type', 'ACCREC')
  .in('status', ['AUTHORISED', 'SENT'])
  .order('due_date', { ascending: true });

output.push('# ACT Xero Receivables Report');
output.push(`Generated: ${new Date().toISOString()}\n`);

output.push('## Outstanding Invoices (ACCREC)\n');
output.push(`Total outstanding: ${outstanding.length} invoices\n`);

// Group by contact and calculate totals
const byContact = {};
let totalOutstanding = 0;
let totalOverdue = 0;
const today = new Date().toISOString().split('T')[0];

outstanding.forEach(inv => {
  if (!byContact[inv.contact_name]) {
    byContact[inv.contact_name] = { invoices: [], total: 0, overdue: 0 };
  }
  byContact[inv.contact_name].invoices.push(inv);
  byContact[inv.contact_name].total += inv.amount_due;
  totalOutstanding += inv.amount_due;
  
  if (inv.due_date < today) {
    byContact[inv.contact_name].overdue += inv.amount_due;
    totalOverdue += inv.amount_due;
  }
});

output.push(`**Total outstanding: $${totalOutstanding.toFixed(2)}**`);
output.push(`**Total overdue: $${totalOverdue.toFixed(2)}**\n`);

output.push('### By Contact\n');
Object.entries(byContact)
  .sort((a, b) => b[1].total - a[1].total)
  .forEach(([contact, data]) => {
    output.push(`#### ${contact}`);
    output.push(`Total: $${data.total.toFixed(2)} (${data.invoices.length} invoices)`);
    if (data.overdue > 0) {
      output.push(`**Overdue: $${data.overdue.toFixed(2)}**`);
    }
    output.push('');
    
    data.invoices.forEach(inv => {
      const overdueFlag = inv.due_date < today ? ' 🔴 OVERDUE' : '';
      output.push(`- **${inv.invoice_number}** | Due: ${inv.due_date}${overdueFlag} | Amount: $${inv.amount_due.toFixed(2)} | Status: ${inv.status}`);
      if (inv.reference) output.push(`  - Ref: ${inv.reference}`);
      if (inv.line_items && inv.line_items.length > 0) {
        inv.line_items.forEach(item => {
          output.push(`  - ${item.description || item.item_code}: $${item.line_amount}`);
        });
      }
    });
    output.push('');
  });

// Query 2: Paid invoices this FY
const { data: paid } = await supabase
  .from('xero_invoices')
  .select('*')
  .eq('type', 'ACCREC')
  .eq('status', 'PAID')
  .gte('date', '2025-07-01')
  .order('date', { ascending: false });

output.push('\n## Paid Invoices (FY2025-26)\n');
const paidByMonth = {};
let totalRevenue = 0;

paid.forEach(inv => {
  const month = inv.date.substring(0, 7); // YYYY-MM
  if (!paidByMonth[month]) paidByMonth[month] = { invoices: [], total: 0 };
  paidByMonth[month].invoices.push(inv);
  paidByMonth[month].total += inv.total;
  totalRevenue += inv.total;
});

output.push(`**Total FY2025-26 revenue: $${totalRevenue.toFixed(2)}** (${paid.length} invoices)\n`);

output.push('### By Month\n');
Object.entries(paidByMonth)
  .sort((a, b) => b[0].localeCompare(a[0]))
  .forEach(([month, data]) => {
    output.push(`#### ${month}`);
    output.push(`Monthly revenue: $${data.total.toFixed(2)} (${data.invoices.length} invoices)\n`);
    
    data.invoices.forEach(inv => {
      output.push(`- ${inv.date} | **${inv.contact_name}** | $${inv.total.toFixed(2)} | ${inv.reference || 'No reference'}`);
    });
    output.push('');
  });

// Query 3: Drafts
const { data: drafts } = await supabase
  .from('xero_invoices')
  .select('*')
  .eq('type', 'ACCREC')
  .in('status', ['DRAFT', 'SUBMITTED'])
  .order('date', { ascending: false });

output.push('\n## Draft & Submitted Invoices\n');
let draftTotal = 0;
drafts.forEach(inv => {
  draftTotal += inv.total;
  output.push(`- **${inv.invoice_number || 'No number'}** | ${inv.date} | ${inv.contact_name} | $${inv.total.toFixed(2)} | ${inv.status}`);
  if (inv.reference) output.push(`  - Ref: ${inv.reference}`);
});
output.push(`\n**Total in drafts: $${draftTotal.toFixed(2)}**\n`);

// Write to file
const reportPath = '/Users/benknight/Code/act-global-infrastructure/thoughts/shared/reports/xero-receivables-' + new Date().toISOString().split('T')[0] + '.md';
writeFileSync(reportPath, output.join('\n'));
console.log(`\n✅ Report written to: ${reportPath}`);
console.log(`\n📊 Summary:`);
console.log(`   Outstanding: $${totalOutstanding.toFixed(2)} (${outstanding.length} invoices)`);
console.log(`   Overdue: $${totalOverdue.toFixed(2)}`);
console.log(`   FY2025-26 Revenue: $${totalRevenue.toFixed(2)} (${paid.length} invoices)`);
console.log(`   Drafts: $${draftTotal.toFixed(2)} (${drafts.length} invoices)`);

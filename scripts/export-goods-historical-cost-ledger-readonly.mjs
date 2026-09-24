#!/usr/bin/env node
/** Read-only export for the Goods historical-cost review workbook. */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing Supabase configuration');
if (!url.includes('tednluwflfhxyucgwigh')) throw new Error(`Unexpected Supabase project: ${url}`);
const sb = createClient(url, key);
const outDir = path.resolve('outputs/goods-capex-review-workbook-2026-07-22');
mkdirSync(outDir, { recursive: true });

async function sql(query) {
  const { data, error } = await sb.rpc('exec_sql', { query });
  if (error) throw new Error(error.message);
  return data || [];
}

const candidatePattern = '(cnc|router|multicam|machine|machinery|equipment|tool|carbatec|shredder|granulator|press|mould|mold|extrud|plastic|recycl|circularity|container|forklift|compressor|conveyor|dust|workbench|bandsaw|drill|lathe|mill|laser|welder|generator|washer|washing|trailer|tiny house|super rack|loadshift|crane|freight)';
const billFilter = `type='ACCPAY' AND status IN ('PAID','AUTHORISED','DRAFT') AND (project_code='ACT-GD' OR lower(coalesce(contact_name,'') || ' ' || coalesce(reference,'') || ' ' || coalesce(line_items::text,'')) ~ '${candidatePattern}')`;
const txnFilter = `type='SPEND' AND status NOT IN ('DELETED','VOIDED') AND (project_code='ACT-GD' OR lower(coalesce(contact_name,'') || ' ' || coalesce(line_items::text,'')) ~ '${candidatePattern}' OR (date IN ('2025-01-30','2025-02-21') AND total IN (18000,17500)))`;

const schemas = {};
for (const table of ['xero_invoices','xero_transactions','bank_statement_lines','finance_receipt_documents','xero_payments']) {
  schemas[table] = await sql(`SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' ORDER BY ordinal_position`);
}

const bills = await sql(`SELECT xero_id,invoice_number,status,contact_name,date,due_date,total,subtotal,total_tax,amount_due,amount_paid,currency_code,line_items,has_attachments,reference,url,project_code,project_code_source,entity_code,xero_tenant_id FROM xero_invoices WHERE ${billFilter} ORDER BY date,xero_id`);
const transactions = await sql(`SELECT xero_transaction_id,type,contact_name,bank_account,project_code,total,status,date,line_items,has_attachments,project_code_source,is_reconciled,entity_code,xero_tenant_id FROM xero_transactions WHERE ${txnFilter} ORDER BY date,xero_transaction_id`);
const bankLines = await sql(`SELECT id,date,type,payee,particulars,reference,analysis_code,amount,direction,source,status,bank_account,matched_xero_transaction_id,project_code,notes,receipt_match_score,receipt_match_status,xero_transaction_id,project_source,xero_tenant_id FROM bank_statement_lines WHERE project_code='ACT-GD' OR lower(coalesce(payee,'') || ' ' || coalesce(particulars,'') || ' ' || coalesce(reference,'') || ' ' || coalesce(notes,'')) ~ '${candidatePattern}' ORDER BY date,id`);
const receipts = await sql(`SELECT id,source,source_record_id,mailbox,gmail_message_id,subject,received_at,vendor_name,document_number,document_date,amount_total,tax_amount,currency_code,attachment_url,attachment_storage_path,attachment_filename,file_sha256,xero_transaction_id,xero_bank_transaction_id,xero_invoice_id,xero_tenant_id,project_code,entity_code,status FROM finance_receipt_documents WHERE project_code='ACT-GD' OR lower(coalesce(vendor_name,'') || ' ' || coalesce(subject,'') || ' ' || coalesce(attachment_filename,'')) ~ '${candidatePattern}' ORDER BY document_date,id`);
const payments = await sql(`SELECT p.xero_payment_id,p.payment_type,p.status,p.invoice_xero_id,p.invoice_number,p.account_name,p.bank_account_name,p.date,p.amount,p.currency_code,p.reference,p.is_reconciled,p.bank_amount FROM xero_payments p JOIN xero_invoices i ON i.xero_id=p.invoice_xero_id WHERE ${billFilter.replaceAll('type=', 'i.type=').replaceAll('status ', 'i.status ').replaceAll('project_code=', 'i.project_code=').replaceAll('contact_name', 'i.contact_name').replaceAll('reference', 'i.reference').replaceAll('line_items', 'i.line_items')} ORDER BY p.date,p.xero_payment_id`);

const summary = await sql(`SELECT status,count(*)::int AS count,round(sum(total),2) AS total FROM xero_invoices WHERE type='ACCPAY' AND project_code='ACT-GD' GROUP BY status ORDER BY status`);
const payload = { generated_at: new Date().toISOString(), project_url: url, method: 'Supabase read-only exec_sql', filters: { billFilter, txnFilter }, summary, schemas, bills, transactions, bankLines, receipts, payments };
const output = path.join(outDir, 'goods-historical-cost-ledger-source.json');
writeFileSync(output, JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ output, counts: { bills: bills.length, transactions: transactions.length, bankLines: bankLines.length, receipts: receipts.length, payments: payments.length }, summary }, null, 2));

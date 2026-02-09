#!/usr/bin/env node
/**
 * Check Xero bank transactions attachment status directly from API
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getXeroToken() {
  const { data, error } = await supabase
    .from('xero_tokens')
    .select('refresh_token, access_token, expires_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error('Failed to get Xero tokens:', error?.message);
    return null;
  }
  return data;
}

async function refreshToken(tokens) {
  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: process.env.XERO_CLIENT_ID,
      client_secret: process.env.XERO_CLIENT_SECRET,
    }),
  });
  return response.json();
}

async function xeroRequest(endpoint, token, tenantId) {
  const response = await fetch(`https://api.xero.com/api.xro/2.0/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Xero-Tenant-Id': tenantId,
      Accept: 'application/json',
    },
  });
  return response.json();
}

async function main() {
  const tokens = await getXeroToken();
  if (!tokens) {
    console.error('No Xero tokens found. Run sync-xero-to-supabase.mjs first.');
    return;
  }

  const newTokens = await refreshToken(tokens);

  // Save refreshed token
  await supabase.from('xero_tokens').upsert({
    id: 1,
    refresh_token: newTokens.refresh_token,
    access_token: newTokens.access_token,
    expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString()
  });

  // Get tenant ID
  const connectionsRes = await fetch('https://api.xero.com/connections', {
    headers: { Authorization: `Bearer ${newTokens.access_token}` },
  });
  const connections = await connectionsRes.json();
  const tenantId = connections[0]?.tenantId;

  console.log('=== Querying Xero Directly ===');
  console.log('Tenant:', connections[0]?.tenantName);

  // Get bank transactions from last 365 days
  const since = new Date();
  since.setDate(since.getDate() - 365);
  const whereClause = `Type=="SPEND" AND Date>=DateTime(${since.getFullYear()},${since.getMonth()+1},${since.getDate()})`;

  const data = await xeroRequest(
    `BankTransactions?where=${encodeURIComponent(whereClause)}&order=Date DESC`,
    newTokens.access_token,
    tenantId
  );

  const txns = data.BankTransactions || [];
  const withAttach = txns.filter(t => t.HasAttachments).length;
  const withoutAttach = txns.filter(t => !t.HasAttachments).length;

  console.log('');
  console.log('Total SPEND transactions (365 days):', txns.length);
  console.log('WITH attachments:', withAttach);
  console.log('WITHOUT attachments:', withoutAttach);
  console.log('Reconciliation rate:', ((withAttach / txns.length) * 100).toFixed(1) + '%');

  // Show recent samples
  console.log('\n=== Recent WITHOUT attachments (sample) ===');
  txns
    .filter(t => !t.HasAttachments)
    .slice(0, 10)
    .forEach(t => {
      const date = t.Date.match(/\/Date\((\d+)/);
      const dateStr = date ? new Date(parseInt(date[1])).toISOString().split('T')[0] : 'unknown';
      console.log(`  ${dateStr} | ${t.Contact?.Name?.substring(0, 30) || 'Unknown'} | $${Math.abs(t.Total).toFixed(2)}`);
    });

  console.log('\n=== Recent WITH attachments (sample) ===');
  txns
    .filter(t => t.HasAttachments)
    .slice(0, 10)
    .forEach(t => {
      const date = t.Date.match(/\/Date\((\d+)/);
      const dateStr = date ? new Date(parseInt(date[1])).toISOString().split('T')[0] : 'unknown';
      console.log(`  ${dateStr} | ${t.Contact?.Name?.substring(0, 30) || 'Unknown'} | $${Math.abs(t.Total).toFixed(2)}`);
    });
}

// Also check invoices (where Dext attaches receipts)
async function checkInvoices() {
  console.log('\n=== INVOICES/BILLS (Where Dext Attaches Receipts) ===');

  const { data: invoices } = await supabase
    .from('xero_invoices')
    .select('xero_invoice_id, contact_name, total, date, has_attachments, status')
    .eq('type', 'ACCPAY')
    .order('date', { ascending: false });

  const withReceipts = (invoices || []).filter(i => i.has_attachments);
  const withoutReceipts = (invoices || []).filter(i => i.has_attachments === false && i.status !== 'VOIDED');

  console.log('Total bills:', invoices?.length || 0);
  console.log('WITH receipts:', withReceipts.length);
  console.log('WITHOUT receipts:', withoutReceipts.length);
  console.log('Invoice reconciliation rate:', ((withReceipts.length / (invoices?.length || 1)) * 100).toFixed(1) + '%');

  if (withoutReceipts.length > 0) {
    console.log('\nBills needing receipts:');
    withoutReceipts.slice(0, 10).forEach(i => {
      console.log('  ', i.date, '|', (i.contact_name || 'Unknown').substring(0, 30), '| $' + Math.abs(i.total).toFixed(2));
    });
  }
}

main().then(() => checkInvoices()).catch(console.error);

#!/usr/bin/env node
/**
 * Read-only Goods on Country capex audit against Xero source records.
 *
 * Uses GET requests only. It never creates, edits, approves, voids, or deletes
 * Xero records. Output is an evidence packet for manual review and reporting.
 */
import '../scripts/lib/load-env.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const token = JSON.parse(readFileSync('.xero-tokens.json', 'utf8')).access_token;
const outDir = path.resolve('outputs/goods-capex-xero-2026-07-22');
const attachmentDir = path.join(outDir, 'attachments');
mkdirSync(attachmentDir, { recursive: true });

const keywords = /\b(asset|capital|capex|cnc|router|multicam|machine|machinery|equipment|tool|tooling|carbatec|shredder|granulator|press|mould|mold|extrud|plastics?|recycl|circularity|container|rapid container|container options|forklift|compressor|conveyor|dust collector|workbench|saw|drill|lathe|mill|laser|welder|fabricat|production plant)\b/i;
const knownSuppliers = /Circularity Group|Rapid Container Solutions|Container Options|Carbatec|Multicam Systems/i;
let lastRequestAt = 0;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 3;

async function xeroGet(tenantId, endpoint, accept = 'application/json', attempt = 0) {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < 1100) await delay(1100 - elapsed);
  const base = endpoint.startsWith('https://') ? '' : 'https://api.xero.com/api.xro/2.0/';
  const response = await fetch(base + endpoint, {
    headers: { Authorization: `Bearer ${token}`, 'xero-tenant-id': tenantId, Accept: accept },
  });
  lastRequestAt = Date.now();
  if (response.status === 401) {
    throw new Error(`${endpoint}: 401, access token expired. Run node scripts/sync-xero-tokens.mjs and retry.`);
  }
  if (response.status === 429) {
    if (attempt >= MAX_RETRIES) throw new Error(`${endpoint}: still rate-limited after ${MAX_RETRIES} retries`);
    const retryAfter = Math.max(5, Number(response.headers.get('retry-after')) || 60) * 2 ** attempt;
    await delay(retryAfter * 1000);
    return xeroGet(tenantId, endpoint, accept, attempt + 1);
  }
  if (!response.ok) throw new Error(`${endpoint}: ${response.status} ${await response.text()}`);
  return accept === 'application/json' ? response.json() : Buffer.from(await response.arrayBuffer());
}

async function allPages(tenantId, resource, extra = '') {
  const rows = [];
  for (let page = 1; ; page++) {
    const join = extra ? `&${extra}` : '';
    const data = await xeroGet(tenantId, `${resource}?page=${page}${join}`);
    const batch = data[resource] || [];
    rows.push(...batch);
    if (batch.length < 100) break;
  }
  return rows;
}

function lineText(record) {
  return (record.LineItems || []).map(line => [line.Description, line.AccountCode, ...(line.Tracking || []).map(t => `${t.Name}:${t.Option}`)].filter(Boolean).join(' ')).join(' | ');
}

function candidate(record, assetCodes) {
  const text = [record.Contact?.Name, record.Reference, record.InvoiceNumber, record.PurchaseOrderNumber, lineText(record)].filter(Boolean).join(' ');
  return knownSuppliers.test(record.Contact?.Name || '') || keywords.test(text) || (record.LineItems || []).some(line => assetCodes.has(line.AccountCode));
}

function safeName(value) {
  return String(value || 'attachment').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 160);
}

async function downloadAttachments(tenantId, kind, id) {
  const list = await xeroGet(tenantId, `${kind}/${id}/Attachments`).catch(error => ({ _error: error.message, Attachments: [] }));
  const saved = [];
  for (const attachment of list.Attachments || []) {
    const filename = safeName(attachment.FileName);
    const bytes = await xeroGet(tenantId, `${kind}/${id}/Attachments/${encodeURIComponent(attachment.FileName)}`, '*/*');
    const local = path.join(attachmentDir, `${kind}-${id}-${filename}`);
    writeFileSync(local, bytes);
    saved.push({ ...attachment, local_path: local });
  }
  return { error: list._error || null, attachments: saved };
}

const connectionResponse = await fetch('https://api.xero.com/connections', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
if (!connectionResponse.ok) throw new Error(`Connections: ${connectionResponse.status} ${await connectionResponse.text()}`);
const connections = await connectionResponse.json();
const packet = { generated_at: new Date().toISOString(), method: 'Xero GET requests only', connections: [], errors: [] };

for (const connection of connections) {
  const tenantId = connection.tenantId;
  const organisation = (await xeroGet(tenantId, 'Organisation')).Organisations?.[0] || null;
  const accounts = (await xeroGet(tenantId, 'Accounts')).Accounts || [];
  const assetAccounts = accounts.filter(a => a.Type === 'FIXED' || keywords.test(`${a.Name || ''} ${a.Description || ''}`));
  const assetCodes = new Set(assetAccounts.map(a => a.Code).filter(Boolean));

  const invoiceList = await allPages(tenantId, 'Invoices', 'order=Date%20DESC');
  const bankList = await allPages(tenantId, 'BankTransactions', 'order=Date%20DESC');
  const purchaseOrderList = await allPages(tenantId, 'PurchaseOrders', 'order=Date%20DESC').catch(error => { packet.errors.push(error.message); return []; });

  const invoiceCandidates = invoiceList.filter(r => r.Type === 'ACCPAY' && candidate(r, assetCodes));
  const bankCandidates = bankList.filter(r => r.Type === 'SPEND' && candidate(r, assetCodes));
  const purchaseOrderCandidates = purchaseOrderList.filter(r => candidate(r, assetCodes));

  const invoices = [];
  for (const summary of invoiceCandidates) {
    const detail = (await xeroGet(tenantId, `Invoices/${summary.InvoiceID}`)).Invoices?.[0] || summary;
    const attachments = detail.HasAttachments ? await downloadAttachments(tenantId, 'Invoices', detail.InvoiceID) : { error: null, attachments: [] };
    invoices.push({ ...detail, _source_attachments: attachments });
  }
  const bankTransactions = [];
  for (const summary of bankCandidates) {
    const detail = (await xeroGet(tenantId, `BankTransactions/${summary.BankTransactionID}`)).BankTransactions?.[0] || summary;
    const attachments = detail.HasAttachments ? await downloadAttachments(tenantId, 'BankTransactions', detail.BankTransactionID) : { error: null, attachments: [] };
    bankTransactions.push({ ...detail, _source_attachments: attachments });
  }
  const purchaseOrders = [];
  for (const summary of purchaseOrderCandidates) {
    const detail = (await xeroGet(tenantId, `PurchaseOrders/${summary.PurchaseOrderID}`)).PurchaseOrders?.[0] || summary;
    purchaseOrders.push(detail);
  }

  let fixedAssets = null;
  try {
    const statuses = ['Draft', 'Registered', 'Disposed'];
    fixedAssets = [];
    for (const status of statuses) {
      for (let page = 1; ; page++) {
        const data = await xeroGet(tenantId, `https://api.xero.com/assets.xro/1.0/Assets?status=${status}&page=${page}&pageSize=100`);
        const items = data.items || [];
        fixedAssets.push(...items.map(item => ({ ...item, _status: status })));
        if (items.length < 100) break;
      }
    }
  } catch (error) {
    packet.errors.push(`Fixed Assets ${connection.tenantName}: ${error.message}`);
  }

  packet.connections.push({ connection, organisation, asset_accounts: assetAccounts, counts: { all_invoices: invoiceList.length, all_bank_transactions: bankList.length, all_purchase_orders: purchaseOrderList.length }, invoices, bank_transactions: bankTransactions, purchase_orders: purchaseOrders, fixed_assets: fixedAssets });
}

writeFileSync(path.join(outDir, 'evidence.json'), JSON.stringify(packet, null, 2));
console.log(JSON.stringify({ output: path.join(outDir, 'evidence.json'), tenants: packet.connections.map(c => c.connection.tenantName), counts: packet.connections.map(c => ({ tenant: c.connection.tenantName, ...c.counts, invoice_candidates: c.invoices.length, bank_candidates: c.bank_transactions.length, purchase_order_candidates: c.purchase_orders.length, fixed_assets: c.fixed_assets?.length ?? null })), errors: packet.errors }, null, 2));

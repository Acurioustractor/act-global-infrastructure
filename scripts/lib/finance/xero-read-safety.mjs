/** Fail closed: an absent collection is a failed fetch, never an empty page. */
export async function fetchXeroPages(request, endpoint, collection, options = {}) {
  const rows = [];
  const seen = new Set();
  const { maxPages = 200, headers = {}, idField } = options;
  for (let page = 1; page <= maxPages; page++) {
    const data = await request(`${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}&pageSize=100`, { headers });
    if (!data || !Array.isArray(data[collection])) {
      throw new Error(`Xero ${collection} page ${page}: missing collection or failed fetch`);
    }
    for (const row of data[collection]) {
      if (idField && !row[idField]) throw new Error(`Xero ${collection}: missing immutable ID`);
      const id = idField && row[idField];
      if (id && seen.has(id)) throw new Error(`Xero ${collection}: duplicate ID across pages`);
      if (id) seen.add(id);
      rows.push(row);
    }
    if (data[collection].length < 100) return rows;
  }
  throw new Error(`Xero ${collection}: pagination limit reached; result incomplete`);
}

export function syncFailed(results) {
  return Object.values(results).some(r => r?.errors > 0 || r?.needsMigration || r?.failed);
}

export function receiptMatchesTransaction(receipt, transaction) {
  // The receipt FK points at the mirror UUID; the explicit bank ID points at Xero.
  return (!!receipt.xero_transaction_id && receipt.xero_transaction_id === transaction.id)
    || (!!receipt.xero_bank_transaction_id && receipt.xero_bank_transaction_id === transaction.xero_transaction_id);
}

export function verifyOrganisation(organisations, expectedLegalName) {
  if (!expectedLegalName?.trim()) throw new Error('Explicit expected legal organisation name required');
  if (!Array.isArray(organisations) || organisations.length !== 1) throw new Error('Expected exactly one organisation for configured tenant');
  const org = organisations[0];
  if ((org.LegalName || org.Name) !== expectedLegalName) throw new Error('Configured Xero tenant does not match expected legal organisation');
  return org;
}

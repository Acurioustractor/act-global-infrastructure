#!/usr/bin/env node
/**
 * READ-ONLY probe: confirm the GHL Companies/Businesses API + that the import landed.
 * No writes. Tries the two likely v2 endpoints and prints count + a sample.
 */
import 'dotenv/config';
import { createGHLService } from './lib/ghl-api-service.mjs';

const svc = createGHLService();
const loc = process.env.GHL_LOCATION_ID;

const paths = [
  `/businesses/?locationId=${loc}`,
  `/companies/?locationId=${loc}`,
  `/businesses/?locationId=${loc}&limit=5`,
];

for (const p of paths) {
  try {
    const data = await svc.request(p);
    const arr = data.businesses || data.companies || data.data || [];
    console.log(`\n${p}\n  → OK  count=${Array.isArray(arr) ? arr.length : '?'}  keys=${Object.keys(data).join(',')}`);
    console.log('  sample:', JSON.stringify((Array.isArray(arr) ? arr.slice(0, 3) : data), null, 0).slice(0, 600));
  } catch (e) {
    console.log(`\n${p}\n  → ERR ${e.message}`);
  }
}

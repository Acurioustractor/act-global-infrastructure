#!/usr/bin/env node
/**
 * Reconcile the clean ACT-HV rollup against the existing Notion "Spend by
 * supplier" DB rows (Xero-derived slots only — manual Planned rows preserved).
 * Emits a plan: UPDATE (match by normalised name) / CREATE / ZERO.
 *   node scripts/harvest-notion-reconcile.mjs
 */
import { readFileSync } from 'fs';

const rollup = JSON.parse(readFileSync('thoughts/shared/reports/harvest-notion-rollup-2026-06-26.json', 'utf8')).rows;

// existing Xero-derived DB slots: [pageId, supplierName]
const SLOTS = [
  ['36cebcf981cf818aadf1fb6843aec04f', 'Thais Pupio Design'],
  ['36cebcf981cf81858aedd00049ed0fbc', "Kennedy's"],
  ['36cebcf981cf81acaaf1ce55fba1bb45', 'Sophie Deirdre Hickey'],
  ['36cebcf981cf81d380e7dc3e8206262b', 'Longara'],
  ['36cebcf981cf81499348e7ef96664201', 'Maleny Landscaping Supplies'],
  ['36cebcf981cf8179b13be99c973cb370', 'Joseph Kirmos (Joey)'],
  ['36cebcf981cf81af996eeafd98adafea', 'Savage Landscape Supplies'],
  ['36cebcf981cf8193ba2df83ed6fcf137', 'Bunnings Warehouse'],
  ['36cebcf981cf816e8a33e2afa0edd306', 'Smartwood'],
  ['36cebcf981cf81d5957afa82577f55e4', 'Total Tools East Brisbane'],
  ['36cebcf981cf81fa9dbef733d42931c8', 'Diggermate Franchising'],
  ['36cebcf981cf812799b6f170fd07a530', 'Maleny Hardware And Rural Supplies'],
  ['36cebcf981cf8151b6fbe6aa0b1f8525', 'Mapleton Public House'],
  ['36cebcf981cf81fd8dfbe4cb8ad44d30', "Fisher's Oysters"],
  ['36cebcf981cf81ee95d0d825b917ca62', 'Liberty Maleny'],
  ['36cebcf981cf81ff8d96e9dd7b9b4dd9', 'Hydraulink Brisbane North'],
  ['36cebcf981cf81768d0cf3ec58eb654e', 'Maleny Hardware'],
  ['36cebcf981cf8158a1a1c2b3712388a6', 'IGA'],
  ['36cebcf981cf8188bbc3c2a820fd1bde', 'Woolworths'],
  ['36cebcf981cf81c38af1c7189e21f896', 'Savage Transport Trust'],
  ['36cebcf981cf81458a03c6a7ca141bad', 'Sukhothai Authentic Thai Restaurant'],
  ['36cebcf981cf811b9558d7658b510d52', 'Nest In Witta'],
  ['36cebcf981cf8185baadf7600b350613', 'Bussell Rural Co (Maleny Hardware & Rural)'],
  ['36cebcf981cf81d69369dbecadc7256d', 'Salin Appliance Spares'],
  ['36cebcf981cf8186909cc1472792e556', 'Light Years Asian Diner'],
  ['36cebcf981cf8117b44ae6cc0f444c30', '7-Eleven'],
  ['36cebcf981cf812ba7dcc317956ab0e5', 'Art Museum'],
  ['36cebcf981cf8136810ef5fa03b0b8cb', 'Maleny Hotel'],
  ['36cebcf981cf814699b6fff6c8b5b5e5', 'Alsahwa Estate'],
  ['36cebcf981cf81c8af3fec8560623efc', 'Brisbane City Council'],
  ['36cebcf981cf8153aba9e74f1fd9bc00', 'BCF'],
  ['36cebcf981cf81e08485d204036fa08f', 'Frank Food & Wine'],
  ['36cebcf981cf81288cc5d75c840787ed', "CJ's Pastries"],
  ['36cebcf981cf81c19253eab77522fc4e', 'Supercheap Auto'],
  ['36cebcf981cf813b8145e73bc92f5c83', 'Maleny Bakery'],
  ['36cebcf981cf81e3b4dcf4105f989693', 'Avis'],
  ['36cebcf981cf81c887fffaa9d49ba860', 'Maleny Hardware & Ru (removed — duplicate)'],
  ['36cebcf981cf8198beb4e40b1ef1703d', 'Auscot Rural Co (removed — duplicate)'],
];

const norm = (s) => (s || '').toLowerCase()
  .replace(/\(.*?\)/g, ' ')           // strip parentheticals
  .replace(/removed.*duplicate/g, ' ')
  .replace(/\bsupplies\b|\bsupply\b|\bpty\b|\bltd\b|\bt\/as\b|\bco\b|\bwarehouse\b|\bfranchising\b|\bbrisbane\b|\bnorth\b|\beast\b/g, ' ')
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// canonical key (collapse maleny-hardware variants, kennedy, joey)
const key = (s) => {
  let n = norm(s);
  if (n.includes('maleny hardware') || n.includes('bussell rural') || n.includes('auscot rural')) return 'maleny hardware rural';
  if (n.includes('maleny landscaping')) return 'maleny landscaping';
  if (n.startsWith('kennedy')) return 'kennedy';
  if (n.includes('joseph kirmos')) return 'joseph kirmos';
  return n;
};

const slotByKey = new Map();
for (const [id, name] of SLOTS) { const k = key(name); if (!slotByKey.has(k)) slotByKey.set(k, { id, name }); }

const updates = [], creates = [];
const usedSlots = new Set();
for (const r of rollup) {
  const k = key(r.supplier);
  const slot = slotByKey.get(k);
  if (slot && !usedSlots.has(slot.id)) { usedSlots.add(slot.id); updates.push({ id: slot.id, ...r }); }
  else creates.push(r);
}
const zeros = SLOTS.filter(([id]) => !usedSlots.has(id)).map(([id, name]) => ({ id, name }));

const esc = (s) => JSON.stringify(s);
console.log(`PLAN: ${updates.length} updates, ${creates.length} creates, ${zeros.length} zeros\n`);
console.log('--- UPDATES (pageId | supplier | amount | lines | category | garden) ---');
for (const u of updates) console.log(`${u.id} | ${u.supplier} | ${u.amount} | ${u.lines} | ${u.category} | ${u.garden ? 'YES' : 'NO'}`);
console.log('\n--- CREATES (supplier | amount | lines | category | garden) ---');
for (const c of creates) console.log(`${c.supplier} | ${c.amount} | ${c.lines} | ${c.category} | ${c.garden ? 'YES' : 'NO'}`);
console.log('\n--- ZEROS (pageId | was) ---');
for (const z of zeros) console.log(`${z.id} | ${z.name}`);
console.log(`\nCheck: updates+creates total = $${[...updates, ...creates].reduce((a, r) => a + r.amount, 0).toFixed(2)}`);

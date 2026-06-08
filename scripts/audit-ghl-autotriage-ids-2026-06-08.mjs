#!/usr/bin/env node
/** READ-ONLY. Lists every GHL tag definition whose name normalizes to "auto-triage", with id. */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); dotenv.config({ path: '.env' });
const KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
const LOC = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
const H = { Authorization: `Bearer ${KEY}`, Version: '2021-07-28', Accept: 'application/json' };
const r = await fetch(`https://services.leadconnectorhq.com/locations/${LOC}/tags`, { headers: H });
const tags = (await r.json()).tags || [];
const at = tags.filter((t) => t.name.trim().toLowerCase() === 'auto-triage');
console.log(`Total tags: ${tags.length} · auto-triage entries: ${at.length}`);
at.forEach((t) => console.log(`  id=${t.id}  name="${t.name}"`));

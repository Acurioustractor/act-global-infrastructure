#!/usr/bin/env node

/**
 * GHL Pipeline Cleanup Script
 *
 * Phase 1: Delete 31 duplicate grant_opportunities (bare copies without metadata)
 * Phase 2: Delete corresponding GHL opportunities
 * Phase 3: Mark expired grants as declined
 * Phase 4: Delete the explicit "IAS Grants (Duplicate)" record
 * Phase 5: Clean Entrepreneurs Programme duplicate
 *
 * Usage:
 *   node scripts/cleanup-ghl-duplicates.mjs --dry-run
 *   node scripts/cleanup-ghl-duplicates.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { GHLService } from './lib/ghl-api-service.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ghl = new GHLService(process.env.GHL_API_KEY, process.env.GHL_LOCATION_ID);
const DRY_RUN = process.argv.includes('--dry-run');

// 31 duplicate Supabase IDs to delete (bare copies without metadata)
const DUPLICATE_SUPABASE_IDS = [
  'dd5c3155-2c9c-426c-bf0e-2428a5896250', // Aboriginal and Torres Strait Islander Arts Development Fund
  '3f81fb27-a775-41e3-ab34-86caa55c66cb', // Arts and Culture Innovation Grant
  'c9c27fd8-ef85-425a-b248-421edaa3fdf4', // Arts and Social Impact Grant
  'ea688020-018f-49a9-84ae-08c25b2de96b', // Building Community Resilience Grant
  '3f69a1c7-74a2-4e28-af29-262be07597a0', // Closing the Gap Outcomes and Evidence Fund
  '3defca02-534f-4cd0-b963-cb92fa365772', // Community Development Grants Program
  'f8dc62a8-4f93-4c83-9ca6-c02db21a0d7c', // Community Services Innovation Fund
  'fbea807b-3435-4351-8793-687c16db9ef9', // Community Sustainability Action Grants
  'b8b50bcc-96f1-4c88-b756-c776226bbb43', // Dusseldorf Forum - Contained
  '2d52a20a-f547-4d49-ad51-b78f203ce8fd', // Grant Build/Production Funding
  '594699b1-d64a-49c6-bd22-c8a01620549f', // Ian Potter Foundation - Environment
  '90182aaf-c24a-4723-aa0b-33456f8f23fa', // IAS Grants (Duplicate)
  '0cebd2e7-a343-41a2-b761-3e899cc9319b', // IBA Social Enterprise Grant
  'cca1bc65-a7e8-43b8-a496-2e3f42be5703', // ILSC Our Country Our Future - Small Projects
  'bd7a38e5-34a9-431b-81a4-e38b04b3cd05', // Indigenous Advancement Strategy (IAS)
  '99474042-7844-4988-950a-3d345e77bc9a', // Indigenous Capacity Building Fund
  'd460fe80-9a3e-47e2-bdaf-650337c80b91', // Indigenous Cultural Preservation Grant
  '033f3af6-2872-4961-9106-23c607e92d16', // Minderoo Foundation - JusticeHub
  '60da3e0e-ea6a-477c-95f6-37c0fc03a9dd', // NAB Foundation Community Grants Round 1
  '59915fdf-9cd5-435d-8559-800afebe39cd', // Paul Ramsay Foundation - Just Futures
  '9fabd63a-5a1d-44f1-95a5-c07d2defa322', // QBE Foundation - Catalysing Impact
  'd7c5c70e-fee6-460c-83eb-19ca4577540d', // Queensland Arts Project Fund
  '1e15e264-2f2e-4318-a18b-170d55d22b84', // R&D Tax Incentive
  'b629eb3d-a557-424d-9c4b-c577da2a0b38', // Regional Arts Australia Fellowship
  '74e0c441-790d-4615-9e54-1bcd12a2d924', // Regional Arts Fund Project Grants
  'cb030b76-0ae8-45a8-a464-bc6de441a74e', // Regional Community Grants Program
  'd4dec0e7-6f95-4b65-9f15-f044505b8c82', // SEDI Capability Building Grant
  '435b731e-0d99-4e20-9124-5ddcf8e1a036', // Snow Foundation Building Grant
  '7569955c-8cec-42a5-a35f-7eb5a76434d4', // Social Enterprise Development Grants
  '85225eeb-c369-4e81-841c-553b9b8771a4', // Social Enterprise Innovation Grant
  'b19db03d-4443-4b6e-a662-a3d33e257beb', // Youth Justice Intervention Grants
];

// Corresponding GHL opportunity IDs for the duplicates
const DUPLICATE_GHL_IDS = [
  'd99f06ce-f773-4d80-89e3-134d3b6066ee',
  '7375e624-2906-4c75-aacf-064aebf3f545',
  'e6bf806c-aed3-43f2-9daa-a774e6fcecd7',
  '0d5756fd-a1c2-4470-b3b3-8e11db577992',
  '7a2c233d-a58b-494e-ba19-2144bf32a726',
  '87104ce8-bedf-49ae-bf34-d2f1f40bdb12',
  'd23e8ce2-a8e2-4ae1-984d-4642d534745c',
  'd11a600d-a731-4129-bb42-e46412a3b9d7',
  '57192131-7b3a-471e-a50c-6bb0c32b1d50',
  'c0587eb4-d00f-4983-ac7f-6de636ad308a',
  '0d295330-5677-4251-bbd5-c9b2d4764094',
  '828550e9-19e1-48b1-a955-d89c838391b3',
  '246cb4cc-7383-47ed-b736-40784cd321ec',
  '41ae8e81-6611-471b-a055-58a338157627',
  'dbb1d323-e19e-4fe7-8ab0-bfe035212c95',
  '58d54967-d479-42ca-a2cc-8b0975208b86',
  '11fafbc2-33db-4992-a9e6-afc51630fb8a',
  'eb4e7cc4-df6f-4b7c-ba96-9b0b50cb45d1',
  '0a2501ce-2713-4741-9cc2-33ab53e090bf',
  '1e849aa1-a8d4-4d50-babd-f18c56b98c26',
  '04944350-b702-4a62-ac08-fa94af7e0024',
  'cb3f3958-f058-4362-9ce8-684f8be860c7',
  '56d9ae6c-a244-4fc4-9200-a4be7baec114',
  'a7a10430-edfb-4428-9bcd-b5cc3395a32c',
  'e0297e91-7660-4346-941e-6169aa03b0f8',
  '9bbbce2c-dd60-4fac-9c6f-63fe7df55c12',
  'dd37588e-7418-40da-b346-faa74f7611fb',
  'e2be8b1a-ab98-4b56-a7e1-fe523a8e7c03',
  '4425bcf0-fd28-4c8a-b5d5-072e16f37365',
  '277cf0d8-8bcd-47da-92b6-8f823470dcee',
  '74f17a3d-3de2-47ff-830c-4f0b9469075d',
];

// Additional cleanup: explicit duplicate + Entrepreneurs Programme bare copy
const EXTRA_DELETE_SUPABASE = [
  'fc90885d-a10f-4dab-8696-195b3901874d', // "IAS Grants (Duplicate — see Indigenous Advancement Strategy)" — the enriched one is ITSELF a duplicate
  'c280f950-156e-4383-b575-51d68705a058', // Entrepreneurs Programme (bare, no provider/score)
];
const EXTRA_DELETE_GHL = [
  'YNYU5Dhy3fCN02w8x2Mr', // IAS Grants (Duplicate)
  'ca705bae-5277-4581-a255-1596b416a69a', // Entrepreneurs Programme (bare)
];

// Expired grants to mark as declined in GHL (closes_at in the past)
const EXPIRED_GRANTS = [
  { id: '89bb9749-bddb-4ff7-b7f4-124dfaa88c9c', ghl: 'NYHUFc8wew3itvjiZXx4', name: 'Paul Ramsay Foundation - Just Futures', closed: '2023-05-26' },
  { id: '0060ab68-f412-42c4-92d3-2b70ddb46037', ghl: '79e5b4b6-05d5-492f-9c0b-884c48cdbb35', name: 'Qld Gives - Dec 25', closed: '2025-12-10' },
  { id: '04bf52d3-f365-4e1f-a906-065528102926', ghl: 'loU9lMW32d6lOV5tJEp6', name: 'QBE Foundation - Catalysing Impact', closed: '2026-01-31' },
  { id: '465c82b5-9d17-43d5-a8ba-5598bd24f276', ghl: '9c3ea92a-eee8-4c5e-925b-929fda5b343b', name: 'Arts Business: First Nations Dev Fund', closed: '2026-02-03' },
  { id: '86ac165e-29e8-4a9f-9a79-a247cefbe594', ghl: 'f3e0fc6f-1b80-4cbd-a7f2-eee56bd1f560', name: 'Various Indigenous Grants', closed: '2026-02-13' },
  { id: '490e8d8e-efe5-4dcf-afab-f85db59d34f1', ghl: '64064663-7b72-4c3a-874f-89840bc87a70', name: 'Agricultural Traceability Grants', closed: '2026-02-17' },
  { id: 'a7d6f97b-805d-401c-bb70-d7071d3096ce', ghl: '7e444660-85bf-4983-9928-5be58a9b2881', name: 'NAIDOC 2026 Local Grants', closed: '2026-02-19' },
  { id: 'ea2c4a8d-61f9-49c7-a200-3f67626c3084', ghl: 'a2b545e8-286b-4cc5-bd2b-8d5dd17ad323', name: 'NATSI Flexible Aged Care IT Grant', closed: '2026-02-27' },
];

// Grant Declined stage ID in Grants pipeline
const GRANT_DECLINED_STAGE = '6c81a3e7-6382-4dcd-af63-03279045ef97';

async function main() {
  console.log(`🧹 GHL Pipeline Cleanup${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  let ghlDeleted = 0;
  let ghlErrors = 0;
  let supaDeleted = 0;

  // Phase 1: Delete duplicate GHL opportunities
  console.log('=== Phase 1: Delete duplicate GHL opportunities ===');
  const allGhlIds = [...DUPLICATE_GHL_IDS, ...EXTRA_DELETE_GHL];

  for (const ghlId of allGhlIds) {
    try {
      if (DRY_RUN) {
        console.log(`  [DRY] Would delete GHL opportunity: ${ghlId}`);
      } else {
        await ghl.deleteOpportunity(ghlId);
        console.log(`  ✓ Deleted GHL: ${ghlId}`);
      }
      ghlDeleted++;
    } catch (err) {
      // 404 = already gone, that's fine
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        console.log(`  ⊘ Already gone: ${ghlId}`);
      } else {
        console.error(`  ✗ Error deleting ${ghlId}:`, err.message);
        ghlErrors++;
      }
    }
  }

  console.log(`\n  GHL: ${ghlDeleted} deleted, ${ghlErrors} errors\n`);

  // Phase 2: Delete duplicate Supabase records
  console.log('=== Phase 2: Delete duplicate Supabase records ===');
  const allSupaIds = [...DUPLICATE_SUPABASE_IDS, ...EXTRA_DELETE_SUPABASE];

  if (DRY_RUN) {
    console.log(`  [DRY] Would delete ${allSupaIds.length} Supabase records`);
  } else {
    const { error, count } = await supabase
      .from('grant_opportunities')
      .delete()
      .in('id', allSupaIds);

    if (error) {
      console.error('  ✗ Supabase delete error:', error.message);
    } else {
      supaDeleted = allSupaIds.length;
      console.log(`  ✓ Deleted ${supaDeleted} duplicate records from Supabase`);
    }
  }

  // Phase 3: Mark expired grants as declined
  console.log('\n=== Phase 3: Mark expired grants as declined ===');

  for (const grant of EXPIRED_GRANTS) {
    try {
      if (DRY_RUN) {
        console.log(`  [DRY] Would decline: ${grant.name} (closed ${grant.closed})`);
      } else {
        // Move to Declined stage in GHL
        await ghl.updateOpportunity(grant.ghl, {
          pipelineStageId: GRANT_DECLINED_STAGE,
          status: 'lost',
        });

        // Update Supabase status
        await supabase
          .from('grant_opportunities')
          .update({ application_status: 'expired' })
          .eq('id', grant.id);

        console.log(`  ✓ Declined: ${grant.name} (closed ${grant.closed})`);
      }
    } catch (err) {
      console.error(`  ✗ Error declining ${grant.name}:`, err.message);
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`  GHL opportunities deleted: ${ghlDeleted}`);
  console.log(`  Supabase records deleted: ${supaDeleted}`);
  console.log(`  Expired grants declined: ${EXPIRED_GRANTS.length}`);

  // Count remaining
  const { count: remaining } = await supabase
    .from('grant_opportunities')
    .select('*', { count: 'exact', head: true });

  console.log(`  Remaining grant_opportunities: ${remaining}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

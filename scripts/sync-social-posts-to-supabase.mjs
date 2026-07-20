#!/usr/bin/env node

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createGHLSocialService } from './lib/ghl-social-service.mjs';

const APPLY = process.argv.includes('--apply');
const PAGE_SIZE = 100;
const ACT_ORGANIZATION_ID = '88f84b66-f0fd-4fcf-9ec9-3cfc682303c5';
const HARVEST_PROJECT_ID = '343f91c0-d48c-4ac8-ace3-f0d3b11da1bd';
const HARVEST_PROJECT_CODE = 'ACT-HV';

function required(name, ...fallbacks) {
  const value = [process.env[name], ...fallbacks.map(key => process.env[key])].find(Boolean);
  if (!value) throw new Error(`Missing required environment variable: ${[name, ...fallbacks].join(' or ')}`);
  return value.trim();
}

function normalizedPlatform(value) {
  const platform = String(value || 'other').toLowerCase();
  return ['facebook', 'instagram', 'linkedin', 'google', 'youtube', 'bluesky', 'threads', 'tiktok', 'pinterest'].includes(platform)
    ? platform
    : 'other';
}

function isHarvestAccount(account) {
  const name = String(account?.name || account?.accountName || account?.username || '').toLowerCase();
  return name.includes('harvest witta') || name.includes('theharvestwitta');
}

function accountIdsOf(post) {
  return [...new Set([post.accountId, ...(post.accountIds || [])].filter(Boolean).map(String))];
}

function normalizePost(post, accounts) {
  const platform = normalizedPlatform(post.platform || accounts[0]?.platform);
  const matchingAccount = accounts.find(account => normalizedPlatform(account.platform) === platform) || accounts[0] || null;
  // Harvest is currently ACT's only connected Facebook/Instagram property.
  // This also safely scopes records tied to the retired Harvest Instagram account.
  const harvest = accounts.some(isHarvestAccount) || platform === 'facebook' || platform === 'instagram';
  const fallbackName = platform === 'instagram' ? 'theharvestwitta' : platform === 'facebook' ? 'The Harvest Witta' : null;
  return {
    organization_id: ACT_ORGANIZATION_ID,
    project_id: harvest ? HARVEST_PROJECT_ID : null,
    project_code: harvest ? HARVEST_PROJECT_CODE : null,
    platform,
    source: 'ghl',
    source_account_id: matchingAccount?._id || matchingAccount?.id || accountIdsOf(post)[0] || null,
    source_post_id: String(post._id || post.id),
    account_name: matchingAccount?.name || matchingAccount?.accountName || matchingAccount?.username || fallbackName,
    status: post.status || null,
    post_type: post.type || null,
    message: post.summary || null,
    permalink: post.previewLink || null,
    published_at: post.publishedAt || post.displayDate || null,
    source_created_at: post.createdAt || null,
    source_updated_at: post.updatedAt || null,
    media: Array.isArray(post.media) ? post.media : [],
    metrics: post.insights && typeof post.insights === 'object' ? post.insights : {},
    source_metadata: {
      provider_post_id: post.postId || null,
      tags: post.tags || null,
      error: post.error || null,
      published_message_status: post.publishedMessageStatus || null
    },
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function getAllPosts(service) {
  const all = [];
  let skip = 0;
  let expected = Infinity;
  while (all.length < expected) {
    const page = await service.getPosts({ limit: PAGE_SIZE, skip });
    expected = page.total || page.posts.length;
    all.push(...page.posts);
    if (page.posts.length < PAGE_SIZE) break;
    skip += page.posts.length;
  }
  return all;
}

async function main() {
  const locationId = required('GHL_LOCATION_ID', 'GHL__LOCATION_ID');
  const apiKey = required('GHL_PRIVATE_TOKEN', 'GHL_API_KEY');
  const service = createGHLSocialService(apiKey, locationId);
  const [accounts, posts] = await Promise.all([service.getAccounts(), getAllPosts(service)]);
  const accountMap = new Map(accounts.map(account => [String(account._id || account.id), account]));

  const rows = posts
    .filter(post => post._id || post.id)
    .map(post => normalizePost(
      post,
      accountIdsOf(post).map(id => accountMap.get(id)).filter(Boolean)
    ));

  const counts = rows.reduce((result, row) => {
    const scope = row.project_code || 'ACT organisation';
    result[scope] = (result[scope] || 0) + 1;
    return result;
  }, {});
  console.log(`Read ${accounts.length} connected accounts and ${rows.length} posts from GHL.`);
  console.log('Scope:', counts);

  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to upsert the ledger.');
    return;
  }

  const url = required('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
  const key = required('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  let actual = 0;
  for (let offset = 0; offset < rows.length; offset += PAGE_SIZE) {
    const batch = rows.slice(offset, offset + PAGE_SIZE);
    const { data, error } = await supabase
      .from('social_posts')
      .upsert(batch, { onConflict: 'source,source_post_id' })
      .select('id');
    if (error) throw error;
    actual += data?.length || 0;
  }
  if (actual !== rows.length) {
    throw new Error(`Upsert discrepancy: attempted ${rows.length}, returned ${actual}`);
  }
  console.log(`Upserted ${actual} social posts into public.social_posts.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

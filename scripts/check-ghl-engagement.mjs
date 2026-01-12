#!/usr/bin/env node
/**
 * Check GHL engagement statistics for published posts
 *
 * Usage: node scripts/check-ghl-engagement.mjs
 */

import { GHLSocialService } from './lib/ghl-social-service.mjs';

const API_KEY = process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_LOCATION_ID;

async function checkEngagement() {
  if (!API_KEY || !LOCATION_ID) {
    console.log('Missing GHL_API_KEY or GHL_LOCATION_ID');
    console.log('Run with: GHL_API_KEY=xxx GHL_LOCATION_ID=xxx node scripts/check-ghl-engagement.mjs');
    return;
  }

  const social = new GHLSocialService(API_KEY, LOCATION_ID);

  console.log('\n=== GHL Social Media Engagement Report ===\n');

  // 1. Get overall statistics
  console.log('1. Overall Statistics:');
  console.log('─'.repeat(40));
  try {
    const stats = await social.getStatistics();
    console.log(JSON.stringify(stats, null, 2));
  } catch (err) {
    console.log('   Stats endpoint error:', err.message);
  }

  // 2. Get all posts (no status filter - API doesn't support it)
  console.log('\n2. Recent Posts:');
  console.log('─'.repeat(40));
  try {
    const { posts, total } = await social.getPosts({});
    console.log(`   Total posts: ${total}`);

    if (posts.length > 0) {
      console.log('\n   Recent posts:');
      for (const post of posts) {
        console.log(`\n   • "${post.summary?.substring(0, 50)}..."`);
        console.log(`     ID: ${post.id}`);
        console.log(`     Published: ${post.publishedAt || post.createdAt}`);
        console.log(`     Accounts: ${post.accountIds?.join(', ')}`);

        // Check for engagement data on the post
        if (post.analytics || post.engagement || post.stats) {
          console.log(`     Engagement:`, post.analytics || post.engagement || post.stats);
        }
        if (post.likes !== undefined) console.log(`     Likes: ${post.likes}`);
        if (post.comments !== undefined) console.log(`     Comments: ${post.comments}`);
        if (post.shares !== undefined) console.log(`     Shares: ${post.shares}`);
        if (post.impressions !== undefined) console.log(`     Impressions: ${post.impressions}`);
      }
    }
  } catch (err) {
    console.log('   Posts error:', err.message);
  }

  // 3. Raw API call to get posts (bypass getPosts wrapper)
  console.log('\n3. Raw Posts Fetch:');
  console.log('─'.repeat(40));
  try {
    const response = await fetch(`https://services.leadconnectorhq.com/social-media-posting/${LOCATION_ID}/posts/list`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({})
    });
    const data = await response.json();
    console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 3000));

    // Show full first post if available
    if (data.results?.posts?.length > 0) {
      console.log('\n   First post full details:');
      console.log(JSON.stringify(data.results.posts[0], null, 2));
    }
  } catch (err) {
    console.log('   Raw fetch error:', err.message);
  }

  // 4. Get connected accounts
  console.log('\n4. Connected Accounts:');
  console.log('─'.repeat(40));
  try {
    const accounts = await social.getAccounts();
    for (const acc of accounts) {
      console.log(`   • ${acc.name || acc.id} (${acc.platform})`);
    }
  } catch (err) {
    console.log('   Accounts error:', err.message);
  }

  console.log('\n');
}

checkEngagement().catch(console.error);

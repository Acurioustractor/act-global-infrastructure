#!/usr/bin/env node

/**
 * Sync Content from Multiple Sources to GHL
 *
 * This script syncs content from:
 * 1. Notion Content Hub - "Approved" content
 * 2. Empathy Ledger Content Hub - Published articles and stories
 *
 * Content flow:
 * - Queries each source for ready-to-publish content
 * - Transforms content to GHL post format
 * - Creates/schedules posts in GHL Social Planner
 * - Updates source with GHL post ID and status
 *
 * Usage:
 *   node scripts/sync-content-to-ghl.mjs                    # Sync all sources
 *   node scripts/sync-content-to-ghl.mjs --notion-only      # Sync Notion only
 *   node scripts/sync-content-to-ghl.mjs --empathy-only     # Sync Empathy Ledger only
 *   node scripts/sync-content-to-ghl.mjs --dry-run          # Preview without posting
 *   node scripts/sync-content-to-ghl.mjs --status           # Check sync status
 *
 * Required environment variables:
 *   GHL_API_KEY - GoHighLevel API key
 *   GHL_LOCATION_ID - GoHighLevel location ID
 *   NOTION_TOKEN - Notion integration token
 *   EMPATHY_LEDGER_URL - Empathy Ledger API URL (optional, defaults to localhost)
 *   CONTENT_HUB_API_KEY - Empathy Ledger Content Hub API key (optional)
 */

import dotenv from 'dotenv';
import { createGHLSocialService, ralphToGHLPost } from './lib/ghl-social-service.mjs';
import { createEmpathyLedgerService } from './lib/empathy-ledger-content.mjs';
import databaseIds from '../config/notion-database-ids.json' with { type: 'json' };

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CONFIG = {
  notionDatabaseId: databaseIds.contentHub,
  notionToken: process.env.NOTION_TOKEN,

  // Map account names (as they appear in Notion) to GHL account IDs
  accountMap: {
    // LinkedIn
    'LinkedIn (Company)': process.env.GHL_LINKEDIN_ACCOUNT_ID || null,
    'LinkedIn (Personal)': process.env.GHL_LINKEDIN_PERSONAL_ID || null,
    // Other platforms
    'YouTube': process.env.GHL_YOUTUBE_ACCOUNT_ID || null,
    'Google Business': process.env.GHL_GBP_ACCOUNT_ID || null,
    'Bluesky': process.env.GHL_BLUESKY_ACCOUNT_ID || null,
    'Facebook': process.env.GHL_FACEBOOK_ACCOUNT_ID || null,
    'Instagram': process.env.GHL_INSTAGRAM_ACCOUNT_ID || null,
    'Twitter': process.env.GHL_TWITTER_ACCOUNT_ID || null
  },

  // Legacy platform map (fallback from Communication Type)
  platformAccountMap: {
    linkedin: process.env.GHL_LINKEDIN_ACCOUNT_ID || null,
    facebook: process.env.GHL_FACEBOOK_ACCOUNT_ID || null,
    instagram: process.env.GHL_INSTAGRAM_ACCOUNT_ID || null,
    twitter: process.env.GHL_TWITTER_ACCOUNT_ID || null
  },

  // Content statuses (maps to Notion status property)
  statuses: {
    ready: 'Ready to Connect',           // Ready to sync to GHL
    scheduled: 'Conversation Scheduled', // Synced to GHL, awaiting publish
    published: 'Connected & Delighted',  // Successfully published
    inProgress: 'Story in Development'   // Content being developed
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTION API HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function notionRequest(endpoint, options = {}) {
  const url = `https://api.notion.com/v1${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${CONFIG.notionToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2025-09-03',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API Error (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Query Notion for approved content
 */
async function getApprovedContent() {
  // Use data_sources endpoint for Notion API 2025-09-03
  const data = await notionRequest(`/data_sources/${CONFIG.notionDatabaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: {
        property: 'Status',
        status: {
          equals: CONFIG.statuses.ready
        }
      },
      sorts: [
        {
          property: 'Sent date',
          direction: 'ascending'
        }
      ]
    })
  });

  return data.results || [];
}

/**
 * Update Notion page status and GHL reference
 */
async function updateNotionStatus(pageId, status, ghlPostId = null, errorMessage = null) {
  const properties = {
    Status: {
      status: { name: status }
    }
  };

  // Add GHL Post ID or error to Notes field (which exists in Content Hub)
  if (ghlPostId) {
    properties['Notes'] = {
      rich_text: [{ text: { content: `GHL Post ID: ${ghlPostId}` } }]
    };
  } else if (errorMessage) {
    properties['Notes'] = {
      rich_text: [{ text: { content: `Sync error: ${errorMessage}` } }]
    };
  }

  await notionRequest(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties })
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTENT TRANSFORMATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Extract content from Notion page properties
 */
function extractNotionContent(page) {
  const props = page.properties;

  // Get title from "Content/Communication Name"
  const title = props['Content/Communication Name']?.title?.[0]?.plain_text ||
                props.Name?.title?.[0]?.plain_text ||
                'Untitled';

  // Get content from "Key Message/Story"
  const content = props['Key Message/Story']?.rich_text?.[0]?.plain_text ||
                  props.Notes?.rich_text?.[0]?.plain_text ||
                  '';

  // Get target accounts from "Target Accounts" multi-select (NEW)
  // Options: LinkedIn (Company), LinkedIn (Personal), YouTube, Google Business, Bluesky, Facebook, Instagram, Twitter
  const targetAccounts = props['Target Accounts']?.multi_select?.map(s => s.name) || [];

  // Fallback: Get platform from "Communication Type" select if no target accounts specified
  const commType = props['Communication Type']?.select?.name?.toLowerCase() || '';
  let platforms = ['linkedin']; // default
  if (targetAccounts.length > 0) {
    // Use explicit target accounts
    platforms = targetAccounts;
  } else if (commType.includes('linkedin')) {
    platforms = ['linkedin'];
  } else if (commType.includes('newsletter')) {
    platforms = ['email'];
  } else if (commType.includes('story')) {
    platforms = ['linkedin', 'facebook'];
  }

  // Get scheduled date from "Sent date"
  const scheduledDate = props['Sent date']?.date?.start ||
                        props['Next Contact Due']?.date?.start ||
                        null;

  // Get media URLs from "Image" and "Video link"
  const mediaUrls = [];
  if (props['Video link']?.url) {
    mediaUrls.push(props['Video link'].url);
  }
  if (props['Image']?.files?.length > 0) {
    props['Image'].files.forEach(f => {
      if (f.external?.url) mediaUrls.push(f.external.url);
      if (f.file?.url) mediaUrls.push(f.file.url);
    });
  }

  // Get communication type as content type
  const contentType = props['Communication Type']?.select?.name || 'social';

  // Get fun element for hashtags/creativity
  const funElement = props['Fun Element']?.rich_text?.[0]?.plain_text || '';

  return {
    id: page.id,
    title,
    content,
    platforms,
    targetAccounts, // explicit account selection
    scheduledDate,
    mediaUrls,
    hashtags: [], // No hashtags property in this schema
    contentType,
    funElement
  };
}

/**
 * Transform Notion content to GHL post format
 */
function notionToGHLPost(notionContent) {
  const { content, title, platforms, targetAccounts, scheduledDate, mediaUrls, hashtags } = notionContent;

  // Build post summary
  let summary = content || title;

  // Add hashtags if present
  if (hashtags.length > 0) {
    const hashtagString = hashtags.map(h => `#${h.replace('#', '')}`).join(' ');
    summary = `${summary}\n\n${hashtagString}`;
  }

  // Get account IDs - prefer explicit targetAccounts, fall back to platforms
  let accountIds = [];

  if (targetAccounts && targetAccounts.length > 0) {
    // Use explicit account selection from "Target Accounts" multi-select
    accountIds = targetAccounts
      .map(account => CONFIG.accountMap[account])
      .filter(Boolean);
  } else {
    // Fall back to legacy platform mapping
    accountIds = platforms
      .map(p => CONFIG.platformAccountMap[p])
      .filter(Boolean);
  }

  return {
    accountIds,
    summary,
    mediaUrls,
    scheduledAt: scheduledDate,
    platforms: targetAccounts.length > 0 ? targetAccounts : platforms // Keep track for logging
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMPATHY LEDGER SYNC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Sync content from Empathy Ledger Content Hub to GHL
 */
async function syncEmpathyLedgerContent(ghlService, dryRun = false) {
  console.log('\n📚 Syncing content from Empathy Ledger Content Hub...\n');

  const results = { synced: 0, failed: 0, skipped: 0 };

  // Initialize Empathy Ledger service
  let elService;
  try {
    elService = createEmpathyLedgerService();

    // Check health
    const health = await elService.healthCheck();
    if (!health.healthy) {
      console.log(`   ⚠️  Empathy Ledger not available: ${health.error}`);
      console.log('   Skipping Empathy Ledger sync.\n');
      return results;
    }
    console.log(`✅ Empathy Ledger connected at ${health.baseUrl}`);
    console.log(`   📝 Articles available: ${health.articlesAvailable}\n`);
  } catch (error) {
    console.log(`   ⚠️  Could not connect to Empathy Ledger: ${error.message}`);
    console.log('   Skipping Empathy Ledger sync.\n');
    return results;
  }

  // Get content ready for syndication
  const content = await elService.getContentForGHLSync({ limit: 20 });
  console.log(`📋 Found ${content.total} items ready for GHL sync`);
  console.log(`   - Articles: ${content.articles.length}`);
  console.log(`   - Stories: ${content.stories.length}\n`);

  if (content.total === 0) {
    console.log('✨ No Empathy Ledger content to sync.\n');
    return results;
  }

  // Get default account IDs (LinkedIn for articles/stories)
  const defaultAccountIds = [
    CONFIG.accountMap['LinkedIn (Company)'],
    CONFIG.accountMap['LinkedIn (Personal)']
  ].filter(Boolean);

  if (defaultAccountIds.length === 0) {
    console.log('   ⚠️  No LinkedIn accounts configured. Skipping Empathy Ledger sync.');
    return results;
  }

  // Process articles
  for (const article of content.articles) {
    console.log(`📝 Article: "${article.title}"`);
    console.log(`   Type: ${article.articleType || 'article'}`);

    const ghlPost = elService.articleToGHLPost(article, {
      accountIds: defaultAccountIds
    });

    if (dryRun) {
      console.log(`   🔍 [DRY RUN] Would create post with:`);
      console.log(`      - ${ghlPost.accountIds.length} accounts`);
      console.log(`      - ${ghlPost.summary.length} chars content`);
      console.log(`      - ${ghlPost.mediaUrls.length} media items`);
      results.synced++;
      continue;
    }

    try {
      const result = await ghlService.createPost({
        accountIds: ghlPost.accountIds,
        summary: ghlPost.summary,
        mediaUrls: ghlPost.mediaUrls,
        scheduledAt: ghlPost.scheduledAt
      });

      const ghlPostId = result.id || result.postId || 'created';

      // Register syndication in Empathy Ledger
      try {
        await elService.registerSyndication({
          contentType: 'article',
          contentId: article.id,
          destinationType: 'ghl_social',
          ghlPostId,
          status: 'published'
        });
      } catch (e) {
        console.log(`   ⚠️  Could not register syndication record`);
      }

      console.log(`   ✅ Synced (GHL ID: ${ghlPostId})`);
      results.synced++;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.failed++;
    }
    console.log('');
  }

  // Process stories
  for (const story of content.stories) {
    console.log(`📖 Story: "${story.title}"`);
    console.log(`   By: ${story.storytellerName || 'Anonymous'}`);

    const ghlPost = elService.storyToGHLPost(story, {
      accountIds: defaultAccountIds
    });

    if (dryRun) {
      console.log(`   🔍 [DRY RUN] Would create post with:`);
      console.log(`      - ${ghlPost.accountIds.length} accounts`);
      console.log(`      - ${ghlPost.summary.length} chars content`);
      results.synced++;
      continue;
    }

    try {
      const result = await ghlService.createPost({
        accountIds: ghlPost.accountIds,
        summary: ghlPost.summary,
        mediaUrls: ghlPost.mediaUrls,
        scheduledAt: ghlPost.scheduledAt
      });

      const ghlPostId = result.id || result.postId || 'created';

      // Register syndication in Empathy Ledger
      try {
        await elService.registerSyndication({
          contentType: 'story',
          contentId: story.id,
          destinationType: 'ghl_social',
          ghlPostId,
          status: 'published'
        });
      } catch (e) {
        console.log(`   ⚠️  Could not register syndication record`);
      }

      console.log(`   ✅ Synced (GHL ID: ${ghlPostId})`);
      results.synced++;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.failed++;
    }
    console.log('');
  }

  return results;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTION SYNC LOGIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function syncNotionContent(ghlService, dryRun = false) {
  console.log('\n📤 Syncing approved content from Notion to GHL...\n');

  const results = { synced: 0, failed: 0, skipped: 0 };

  // Get approved content from Notion
  let approvedContent;
  try {
    approvedContent = await getApprovedContent();
  } catch (error) {
    console.error('❌ Failed to query Notion:', error.message);
    return results;
  }

  console.log(`📋 Found ${approvedContent.length} approved items in Notion.\n`);

  if (approvedContent.length === 0) {
    console.log('✨ No Notion content to sync.\n');
    return results;
  }

  for (const page of approvedContent) {
    const notionContent = extractNotionContent(page);
    const ghlPost = notionToGHLPost(notionContent);

    console.log(`📝 Processing: "${notionContent.title}"`);
    console.log(`   Platforms: ${notionContent.platforms.join(', ')}`);
    console.log(`   Scheduled: ${notionContent.scheduledDate || 'Immediate'}`);

    // Check if we have account IDs for the platforms
    if (ghlPost.accountIds.length === 0) {
      console.log(`   ⚠️  Skipped: No GHL accounts configured for platforms: ${notionContent.platforms.join(', ')}`);
      results.skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`   🔍 [DRY RUN] Would create post with:`);
      console.log(`      - ${ghlPost.accountIds.length} accounts`);
      console.log(`      - ${ghlPost.summary.length} chars content`);
      console.log(`      - ${ghlPost.mediaUrls.length} media items`);
      results.synced++;
      continue;
    }

    // Create post in GHL
    try {
      const result = await ghlService.createPost({
        accountIds: ghlPost.accountIds,
        summary: ghlPost.summary,
        mediaUrls: ghlPost.mediaUrls,
        scheduledAt: ghlPost.scheduledAt
      });

      const ghlPostId = result.id || result.postId || 'created';

      // Update Notion status
      await updateNotionStatus(
        notionContent.id,
        ghlPost.scheduledAt ? CONFIG.statuses.scheduled : CONFIG.statuses.published,
        ghlPostId
      );

      console.log(`   ✅ Synced successfully (GHL ID: ${ghlPostId})`);
      results.synced++;

    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);

      // Update Notion with error
      try {
        await updateNotionStatus(notionContent.id, CONFIG.statuses.inProgress, null, error.message);
      } catch (e) {
        console.log(`   ⚠️  Could not update Notion status`);
      }

      results.failed++;
    }

    console.log('');
  }

  return results;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN SYNC ORCHESTRATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Main sync function - orchestrates syncing from all sources
 */
async function syncContent(options = {}) {
  const { dryRun = false, notionOnly = false, empathyOnly = false } = options;

  console.log('\n' + '═'.repeat(60));
  console.log('  ACT Ecosystem Content Sync → GHL Social Planner');
  console.log('═'.repeat(60));

  // Initialize GHL service
  let ghlService;
  try {
    ghlService = createGHLSocialService();
  } catch (error) {
    console.error('❌ Failed to initialize GHL service:', error.message);
    console.log('   Make sure GHL_API_KEY and GHL_LOCATION_ID are set.');
    return { notion: { synced: 0, failed: 0, skipped: 0 }, empathyLedger: { synced: 0, failed: 0, skipped: 0 } };
  }

  // Check GHL connection
  const health = await ghlService.healthCheck();
  if (!health.healthy) {
    console.error('❌ GHL service unhealthy:', health.error);
    return { notion: { synced: 0, failed: 0, skipped: 0 }, empathyLedger: { synced: 0, failed: 0, skipped: 0 } };
  }
  console.log(`\n✅ GHL connected. ${health.connectedAccounts} social accounts found.`);
  console.log(`   Platforms: ${health.platforms.join(', ')}`);

  const results = {
    notion: { synced: 0, failed: 0, skipped: 0 },
    empathyLedger: { synced: 0, failed: 0, skipped: 0 }
  };

  // Sync from Notion (unless empathy-only)
  if (!empathyOnly) {
    results.notion = await syncNotionContent(ghlService, dryRun);
  }

  // Sync from Empathy Ledger (unless notion-only)
  if (!notionOnly) {
    results.empathyLedger = await syncEmpathyLedgerContent(ghlService, dryRun);
  }

  // Combined Summary
  const totalSynced = results.notion.synced + results.empathyLedger.synced;
  const totalFailed = results.notion.failed + results.empathyLedger.failed;
  const totalSkipped = results.notion.skipped + results.empathyLedger.skipped;

  console.log('═'.repeat(60));
  console.log(`\n📊 Combined Sync Summary:`);
  console.log(`   ✅ Synced: ${totalSynced} (Notion: ${results.notion.synced}, EL: ${results.empathyLedger.synced})`);
  console.log(`   ❌ Failed: ${totalFailed} (Notion: ${results.notion.failed}, EL: ${results.empathyLedger.failed})`);
  console.log(`   ⏭️  Skipped: ${totalSkipped} (Notion: ${results.notion.skipped}, EL: ${results.empathyLedger.skipped})`);
  console.log('');

  return results;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATUS CHECK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function checkStatus() {
  console.log('\n📊 Content Sync Status Check\n');

  // Check GHL
  try {
    const ghlService = createGHLSocialService();
    const health = await ghlService.healthCheck();

    console.log('🔗 GHL Connection:');
    if (health.healthy) {
      console.log(`   ✅ Connected`);
      console.log(`   📱 Accounts: ${health.connectedAccounts}`);
      console.log(`   🌐 Platforms: ${health.platforms.join(', ')}`);
    } else {
      console.log(`   ❌ Unhealthy: ${health.error}`);
    }
  } catch (error) {
    console.log('🔗 GHL Connection:');
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('');

  // Check Notion
  try {
    const approvedContent = await getApprovedContent();
    console.log('📋 Notion Content Hub:');
    console.log(`   ✅ Connected`);
    console.log(`   📝 Approved items pending sync: ${approvedContent.length}`);

    if (approvedContent.length > 0) {
      console.log('\n   Next items to sync:');
      approvedContent.slice(0, 5).forEach(page => {
        const content = extractNotionContent(page);
        console.log(`   - "${content.title}" → ${content.platforms.join(', ')}`);
      });
      if (approvedContent.length > 5) {
        console.log(`   ... and ${approvedContent.length - 5} more`);
      }
    }
  } catch (error) {
    console.log('📋 Notion Content Hub:');
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('');

  // Check Empathy Ledger
  try {
    const elService = createEmpathyLedgerService();
    const health = await elService.healthCheck();

    console.log('📚 Empathy Ledger Content Hub:');
    if (health.healthy) {
      console.log(`   ✅ Connected at ${health.baseUrl}`);
      console.log(`   📝 Articles available: ${health.articlesAvailable}`);

      // Get content ready for sync
      const content = await elService.getContentForGHLSync({ limit: 10 });
      console.log(`   📤 Ready for GHL sync: ${content.total} items`);

      if (content.articles.length > 0) {
        console.log('\n   Recent articles:');
        content.articles.slice(0, 3).forEach(article => {
          console.log(`   - "${article.title}" (${article.articleType || 'article'})`);
        });
      }
      if (content.stories.length > 0) {
        console.log('\n   Recent stories:');
        content.stories.slice(0, 3).forEach(story => {
          console.log(`   - "${story.title}" by ${story.storytellerName || 'Anonymous'}`);
        });
      }
    } else {
      console.log(`   ⚠️  Not available: ${health.error}`);
      console.log(`   Base URL: ${health.baseUrl}`);
    }
  } catch (error) {
    console.log('📚 Empathy Ledger Content Hub:');
    console.log(`   ⚠️  Error: ${error.message}`);
  }

  console.log('');

  // Check account configuration
  console.log('⚙️  Platform Account Configuration:');
  for (const [account, accountId] of Object.entries(CONFIG.accountMap)) {
    const status = accountId ? `✅ ${accountId.substring(0, 20)}...` : '❌ Not configured';
    console.log(`   ${account}: ${status}`);
  }

  console.log('\n💡 To configure accounts:');
  console.log('   1. Connect social accounts in GHL dashboard');
  console.log('   2. Set GHL_<PLATFORM>_ACCOUNT_ID environment variables');
  console.log('');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
ACT Ecosystem Content Sync → GHL Social Planner

Syncs content from multiple sources to GoHighLevel:
  • Notion Content Hub - Approved content items
  • Empathy Ledger - Published articles and stories

Usage:
  node sync-content-to-ghl.mjs                    Sync all sources
  node sync-content-to-ghl.mjs --notion-only      Sync only Notion content
  node sync-content-to-ghl.mjs --empathy-only     Sync only Empathy Ledger content
  node sync-content-to-ghl.mjs --dry-run          Preview without posting
  node sync-content-to-ghl.mjs --status           Check sync status

Environment Variables (Required):
  GHL_API_KEY              GoHighLevel API key
  GHL_LOCATION_ID          GoHighLevel location ID
  NOTION_TOKEN             Notion integration token

Environment Variables (Empathy Ledger):
  EMPATHY_LEDGER_URL       Empathy Ledger URL (default: http://localhost:3000)
  CONTENT_HUB_API_KEY      Empathy Ledger Content Hub API key

Environment Variables (Social Accounts):
  GHL_LINKEDIN_ACCOUNT_ID  LinkedIn company page ID
  GHL_LINKEDIN_PERSONAL_ID LinkedIn personal profile ID
  GHL_FACEBOOK_ACCOUNT_ID  Facebook page ID
  GHL_INSTAGRAM_ACCOUNT_ID Instagram account ID
  GHL_TWITTER_ACCOUNT_ID   Twitter account ID
  GHL_YOUTUBE_ACCOUNT_ID   YouTube channel ID
  GHL_GBP_ACCOUNT_ID       Google Business Profile ID
  GHL_BLUESKY_ACCOUNT_ID   Bluesky account ID
`);
  process.exit(0);
}

if (args.includes('--status')) {
  checkStatus().catch(console.error);
} else {
  const options = {
    dryRun: args.includes('--dry-run'),
    notionOnly: args.includes('--notion-only'),
    empathyOnly: args.includes('--empathy-only')
  };
  syncContent(options).catch(console.error);
}

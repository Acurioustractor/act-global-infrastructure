#!/usr/bin/env node

/**
 * Auto-Status Update from Git Activity
 *
 * Automatically updates GitHub Project status based on git activity:
 * - Push to branch → "In Progress"
 * - PR opened/ready for review → "In Review"
 * - PR merged → "Done"
 * - PR converted to draft → "In Progress"
 */

import '../lib/load-env.mjs';
import { graphql } from '@octokit/graphql';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PROJECT_ID = process.env.GITHUB_PROJECT_ID;

// Field and option IDs from GitHub Project
const STATUS_FIELD_ID = 'PVTSSF_lAHOCOopjs4BLVikzg68Ovo';
const STATUS_OPTIONS = {
  'Todo': 'f75ad846',
  'In Progress': '47699e8f',
  'In Review': '3dc00925',
  'Done': '98236657'
};

const graphqlWithAuth = graphql.defaults({
  headers: { authorization: `bearer ${GITHUB_TOKEN}` }
});

/**
 * Extract issue number from branch name
 * Supports patterns: feat/123, fix/456-description, issue-789, 123-feature
 */
function extractIssueNumber(branchName) {
  // Try common patterns
  const patterns = [
    /(?:feat|fix|docs|refactor|test|chore)\/(\d+)/i,  // feat/123
    /(?:feat|fix|docs|refactor|test|chore)\/issue-(\d+)/i,  // feat/issue-123
    /issue-(\d+)/i,  // issue-123
    /^(\d+)-/,  // 123-feature
    /#(\d+)/  // #123
  ];

  for (const pattern of patterns) {
    const match = branchName.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }

  return null;
}

/**
 * Find project item ID for an issue
 */
async function findProjectItem(issueNumber) {
  const result = await graphqlWithAuth(`
    query {
      node(id: "${PROJECT_ID}") {
        ... on ProjectV2 {
          items(first: 100) {
            nodes {
              id
              content {
                ... on Issue {
                  number
                }
              }
            }
          }
        }
      }
    }
  `);

  const item = result.node.items.nodes.find(
    node => node.content?.number === issueNumber
  );

  return item?.id;
}

/**
 * Update project item status
 */
async function updateStatus(itemId, statusName) {
  const statusOptionId = STATUS_OPTIONS[statusName];

  if (!statusOptionId) {
    console.error(`❌ Unknown status: ${statusName}`);
    return false;
  }

  try {
    await graphqlWithAuth(`
      mutation {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: "${PROJECT_ID}"
            itemId: "${itemId}"
            fieldId: "${STATUS_FIELD_ID}"
            value: {
              singleSelectOptionId: "${statusOptionId}"
            }
          }
        ) {
          projectV2Item {
            id
          }
        }
      }
    `);

    return true;
  } catch (error) {
    console.error(`❌ Failed to update status:`, error.message);
    return false;
  }
}

/**
 * Trigger instant Notion sync
 */
async function triggerNotionSync(issueNumber) {
  try {
    const { execSync } = await import('child_process');

    console.log(`\n⚡ Triggering instant Notion sync for issue #${issueNumber}...`);

    // Sync just this issue's sprint for speed
    execSync(`npm run sync:issues -- --sprint="Sprint 2"`, {
      encoding: 'utf8',
      stdio: 'inherit'
    });

    console.log(`✅ Notion sync complete`);
  } catch (error) {
    console.error(`⚠️  Notion sync failed (non-critical):`, error.message);
  }
}

/**
 * Main logic
 */
async function main() {
  console.log('🤖 Auto-Status Update from Git Activity\n');

  // Get event details from environment
  const eventName = process.env.EVENT_NAME;
  const branchName = process.env.BRANCH_NAME;
  const prState = process.env.PR_STATE;
  const prDraft = process.env.PR_DRAFT === 'true';
  const prMerged = process.env.PR_MERGED === 'true';
  const prAction = process.env.PR_ACTION;

  console.log(`📋 Event: ${eventName}`);
  console.log(`🌿 Branch: ${branchName}`);

  // Determine new status based on event
  let newStatus = null;
  let issueNumber = null;

  if (eventName === 'push') {
    // Push to branch → In Progress
    issueNumber = extractIssueNumber(branchName);
    if (issueNumber) {
      newStatus = 'In Progress';
      console.log(`📝 Detected issue #${issueNumber} from branch name`);
    }
  } else if (eventName === 'pull_request') {
    // PR events
    console.log(`   PR Action: ${prAction}`);
    console.log(`   PR Merged: ${prMerged}`);
    console.log(`   PR Draft: ${prDraft}`);

    issueNumber = extractIssueNumber(branchName);

    if (prMerged) {
      newStatus = 'Done';
    } else if (prAction === 'converted_to_draft') {
      newStatus = 'In Progress';
    } else if (prAction === 'ready_for_review' || (prAction === 'opened' && !prDraft)) {
      newStatus = 'In Review';
    }
  }

  if (!issueNumber) {
    console.log(`\n⚠️  Could not extract issue number from branch: ${branchName}`);
    console.log(`   Branch name should match patterns like: feat/123, fix/456-description, issue-789`);
    return;
  }

  if (!newStatus) {
    console.log(`\n⚠️  No status update needed for this event`);
    return;
  }

  console.log(`\n🎯 Auto-updating issue #${issueNumber} → ${newStatus}`);

  // Find project item
  const itemId = await findProjectItem(issueNumber);

  if (!itemId) {
    console.log(`\n❌ Issue #${issueNumber} not found in GitHub Project`);
    console.log(`   Make sure the issue is added to the project first`);
    return;
  }

  // Update status
  const success = await updateStatus(itemId, newStatus);

  if (success) {
    console.log(`\n✅ Status updated: Issue #${issueNumber} → ${newStatus}`);

    // Trigger instant Notion sync
    await triggerNotionSync(issueNumber);

    console.log(`\n🎉 Auto-status update complete!`);
    console.log(`   Zero manual updates needed - you stayed in flow! 🚀`);
  } else {
    console.log(`\n❌ Failed to update status`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

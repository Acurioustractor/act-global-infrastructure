#!/usr/bin/env node

/**
 * Assign Issues to Sprint
 *
 * This script assigns specified issues to a sprint in the GitHub Project.
 *
 * Usage: node assign-sprint.mjs <sprint-name> <issue-numbers>
 * Example: node assign-sprint.mjs "Sprint 1" 6,7,8,9,10,27,28,99,119,123
 */

import '../lib/load-env.mjs';
import { graphql } from '@octokit/graphql';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_PROJECT_TOKEN;
const GITHUB_PROJECT_ID = process.env.GITHUB_PROJECT_ID || 'PVT_kwHOCOopjs4BLVik';
const SPRINT_FIELD_ID = 'PVTF_lAHOCOopjs4BLVikzg68Os4';

// Get arguments
const sprintName = process.argv[2] || 'Sprint 1';
const issueNumbers = process.argv[3]?.split(',').map(n => parseInt(n.trim())) || [6, 7, 8, 9, 10, 27, 28, 99, 119, 123];

if (!GITHUB_TOKEN) {
  console.error('❌ Error: GITHUB_TOKEN or GH_PROJECT_TOKEN not found in environment');
  console.error('   Make sure .env.local exists with your GitHub token');
  process.exit(1);
}

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `bearer ${GITHUB_TOKEN}`,
  },
});

console.log(`🚀 Assigning ${issueNumbers.length} issues to "${sprintName}"...\n`);

async function assignIssues() {
  try {
    // Step 1: Fetch all project items to get their IDs
    console.log('📥 Fetching project items...');

    const itemsQuery = `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 100) {
              nodes {
                id
                content {
                  ... on Issue {
                    number
                    title
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await graphqlWithAuth({
      query: itemsQuery,
      projectId: GITHUB_PROJECT_ID,
    });

    const items = response.node?.items?.nodes || [];
    console.log(`✅ Found ${items.length} project items\n`);

    // Map issue numbers to project item IDs
    const issueMap = {};
    items.forEach(item => {
      if (item.content?.number) {
        issueMap[item.content.number] = {
          itemId: item.id,
          title: item.content.title
        };
      }
    });

    // Step 2: Update each issue's Sprint field
    let successCount = 0;
    let notFoundCount = 0;

    for (const issueNum of issueNumbers) {
      const issue = issueMap[issueNum];

      if (!issue) {
        console.log(`⚠️  Issue #${issueNum} not found in project`);
        notFoundCount++;
        continue;
      }

      try {
        const updateMutation = `
          mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
            updateProjectV2ItemFieldValue(input: {
              projectId: $projectId
              itemId: $itemId
              fieldId: $fieldId
              value: { text: $value }
            }) {
              projectV2Item {
                id
              }
            }
          }
        `;

        await graphqlWithAuth({
          query: updateMutation,
          projectId: GITHUB_PROJECT_ID,
          itemId: issue.itemId,
          fieldId: SPRINT_FIELD_ID,
          value: sprintName
        });

        console.log(`✅ #${issueNum} - ${issue.title}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to update #${issueNum}:`, error.message);
      }
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ SPRINT ASSIGNMENT COMPLETE`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 Results:`);
    console.log(`   - Successfully assigned: ${successCount}/${issueNumbers.length} issues`);
    if (notFoundCount > 0) {
      console.log(`   - Not found: ${notFoundCount} issues`);
    }
    console.log(`   - Sprint: "${sprintName}"`);
    console.log('\n📋 View in GitHub: https://github.com/users/Acurioustractor/projects/1');
    console.log('\n📋 Next Step: Run sprint sync to update Notion');
    console.log('   Command: node scripts/sync-sprint-to-notion.mjs\n');

    process.exit(successCount > 0 ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

assignIssues();

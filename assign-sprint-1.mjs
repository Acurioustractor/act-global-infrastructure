#!/usr/bin/env node
import { graphql } from '@octokit/graphql';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PROJECT_ID = 'PVT_kwHOCOopjs4BLVik';

// Sprint field ID (from earlier query)
const SPRINT_FIELD_ID = 'PVTF_lAHOCOopjs4BLVikzg68Os4';

// Issues to assign to Sprint 1
const sprintIssues = [
  { num: 6, title: 'Re-enable auth check (Security)' },
  { num: 7, title: 'Implement GHL signature verification' },
  { num: 8, title: 'Store GHL submissions in Supabase' },
  { num: 9, title: 'Sync GHL to Notion' },
  { num: 10, title: 'Update with actual GHL form IDs' },
  { num: 27, title: 'Fetch deployment status from Vercel' },
  { num: 28, title: 'Health check with HEAD requests' },
  { num: 119, title: 'Add organizations table' },
  { num: 99, title: 'Add title column to transcripts' },
  { num: 123, title: 'Extract user from JWT properly' }
];

const graphqlWithAuth = graphql.defaults({
  headers: { authorization: `bearer ${GITHUB_TOKEN}` }
});

console.log('🚀 Assigning 10 issues to Sprint 1...\n');

// First, fetch all items to get their project item IDs
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
              }
            }
          }
        }
      }
    }
  }
`;

const itemsResponse = await graphqlWithAuth({ query: itemsQuery, projectId: PROJECT_ID });
const items = itemsResponse.node.items.nodes;

// Map issue numbers to item IDs
const issueMap = {};
items.forEach(item => {
  if (item.content?.number) {
    issueMap[item.content.number] = item.id;
  }
});

console.log(`✅ Found ${items.length} project items\n`);

// Update each issue's Sprint field
let successCount = 0;
for (const issue of sprintIssues) {
  const itemId = issueMap[issue.num];
  
  if (!itemId) {
    console.log(`⚠️  Issue #${issue.num} not found in project, skipping`);
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
      projectId: PROJECT_ID,
      itemId: itemId,
      fieldId: SPRINT_FIELD_ID,
      value: 'Sprint 1'
    });

    console.log(`✅ #${issue.num} - ${issue.title}`);
    successCount++;
  } catch (error) {
    console.error(`❌ Failed to update #${issue.num}:`, error.message);
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ SPRINT 1 SETUP COMPLETE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`\n📊 Sprint 1 Summary:`);
console.log(`   - ${successCount}/10 issues assigned`);
console.log('   - ~11 hours estimated effort');
console.log('   - Duration: 30 days (Dec 29 - Jan 28)');
console.log('   - Projects: JusticeHub, ACT Main, Empathy Ledger');
console.log('\n📋 View in GitHub: https://github.com/users/Acurioustractor/projects/1');
console.log('📋 View in Notion: https://www.notion.so/Sprint-1-2d8ebcf981cf8104bed9e6c0972e9b63');


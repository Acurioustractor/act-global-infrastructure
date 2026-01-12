import './lib/load-env.mjs';
import { graphql } from '@octokit/graphql';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PROJECT_ID = 'PVT_kwHOCOopjs4BLVik';

const graphqlWithAuth = graphql.defaults({
  headers: { authorization: `bearer ${GITHUB_TOKEN}` }
});

const result = await graphqlWithAuth(`
  query {
    node(id: "${PROJECT_ID}") {
      ... on ProjectV2 {
        title
        items(first: 10) {
          totalCount
          nodes {
            id
            content {
              ... on Issue {
                number
                title
              }
            }
            fieldValues(first: 5) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field {
                    ... on ProjectV2SingleSelectField {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`);

console.log('Project:', result.node.title);
console.log('Total items:', result.node.items.totalCount);
console.log('\nFirst 10 items:');
result.node.items.nodes.forEach((item, i) => {
  console.log(`\n${i + 1}. ${item.content ? `#${item.content.number}: ${item.content.title}` : 'No content'}`);
  const sprint = item.fieldValues.nodes.find(f => f.field?.name === 'Sprint');
  const status = item.fieldValues.nodes.find(f => f.field?.name === 'Status');
  if (sprint) console.log(`   Sprint: ${sprint.name}`);
  if (status) console.log(`   Status: ${status.name}`);
});

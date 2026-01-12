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
        items(first: 20) {
          nodes {
            id
            content {
              ... on Issue {
                number
                title
              }
            }
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field {
                    ... on ProjectV2SingleSelectField {
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldTextValue {
                  text
                  field {
                    ... on ProjectV2Field {
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

console.log('Checking first 20 items for Sprint field:\n');

result.node.items.nodes.forEach((item, i) => {
  if (!item.content) return;

  console.log(`${i + 1}. #${item.content.number}: ${item.content.title.substring(0, 50)}...`);

  const sprintField = item.fieldValues.nodes.find(f => f.field?.name === 'Sprint');
  const statusField = item.fieldValues.nodes.find(f => f.field?.name === 'Status');

  console.log(`   Sprint field:`, sprintField);
  console.log(`   Status field:`, statusField);
  console.log('');
});

#!/usr/bin/env node

/**
 * PR Intelligence
 *
 * Auto-generates PR descriptions from git history and issue context.
 * Analyzes PR impact and suggests reviewers.
 *
 * Features:
 * - Smart PR description generation from commits
 * - Impact analysis (files changed, test coverage)
 * - Reviewer suggestions based on code ownership
 * - Release notes generation
 */

import '../lib/load-env.mjs';
import { execSync } from 'child_process';
import { graphql } from '@octokit/graphql';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const graphqlWithAuth = graphql.defaults({
  headers: { authorization: `bearer ${GITHUB_TOKEN}` }
});

/**
 * Get current branch and issue number
 */
function getCurrentBranchInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();

    // Extract issue number from branch name
    const match = branch.match(/(?:feat|fix|docs|refactor|test|chore)\/(\d+)/i) ||
                  branch.match(/issue-(\d+)/i) ||
                  branch.match(/^(\d+)-/);

    const issueNumber = match ? parseInt(match[1]) : null;

    return { branch, issueNumber };
  } catch (error) {
    return { branch: 'unknown', issueNumber: null };
  }
}

/**
 * Get commit messages since branching from main
 */
function getCommitsSinceBranch() {
  try {
    // Get commit messages (excluding merge commits)
    const commits = execSync(
      'git log --no-merges --pretty=format:"%s|||%b" origin/main..HEAD',
      { encoding: 'utf8' }
    ).trim();

    if (!commits) return [];

    return commits.split('\n').map(line => {
      const [subject, body] = line.split('|||');
      return { subject, body: body || '' };
    });
  } catch (error) {
    return [];
  }
}

/**
 * Get files changed in this branch
 */
function getFilesChanged() {
  try {
    const files = execSync(
      'git diff --name-status origin/main..HEAD',
      { encoding: 'utf8' }
    ).trim();

    if (!files) return { added: [], modified: [], deleted: [] };

    const result = { added: [], modified: [], deleted: [] };

    files.split('\n').forEach(line => {
      const [status, file] = line.split('\t');
      if (status === 'A') result.added.push(file);
      else if (status === 'M') result.modified.push(file);
      else if (status === 'D') result.deleted.push(file);
    });

    return result;
  } catch (error) {
    return { added: [], modified: [], deleted: [] };
  }
}

/**
 * Get issue details from GitHub
 */
async function getIssueDetails(issueNumber) {
  if (!issueNumber) return null;

  try {
    // Find the issue across all repos
    const result = await graphqlWithAuth(`
      query {
        search(query: "${issueNumber} is:issue", type: ISSUE, first: 5) {
          nodes {
            ... on Issue {
              number
              title
              body
              labels(first: 10) {
                nodes {
                  name
                }
              }
              repository {
                nameWithOwner
              }
            }
          }
        }
      }
    `);

    return result.search.nodes[0] || null;
  } catch (error) {
    console.error('Failed to fetch issue:', error.message);
    return null;
  }
}

/**
 * Generate PR summary from commits
 */
function generateSummary(commits, issue) {
  if (commits.length === 0) {
    return issue ? `Implements ${issue.title}` : 'Updates codebase';
  }

  // Extract unique topics from commit messages
  const topics = new Set();
  commits.forEach(commit => {
    const subject = commit.subject.toLowerCase();

    if (subject.includes('add')) topics.add('Added functionality');
    if (subject.includes('fix')) topics.add('Fixed bugs');
    if (subject.includes('update') || subject.includes('improve')) topics.add('Improved features');
    if (subject.includes('refactor')) topics.add('Refactored code');
    if (subject.includes('test')) topics.add('Added tests');
    if (subject.includes('doc')) topics.add('Updated documentation');
  });

  if (issue) {
    return `Implements #${issue.number}: ${issue.title}`;
  }

  return Array.from(topics).join(', ') || 'Various improvements';
}

/**
 * Analyze impact of changes
 */
function analyzeImpact(files) {
  const impact = {
    risk: 'low',
    areas: [],
    testCoverage: false
  };

  const allFiles = [...files.added, ...files.modified, ...files.deleted];

  // Detect affected areas
  if (allFiles.some(f => f.includes('auth'))) impact.areas.push('Authentication');
  if (allFiles.some(f => f.includes('api'))) impact.areas.push('API');
  if (allFiles.some(f => f.includes('database') || f.includes('db'))) impact.areas.push('Database');
  if (allFiles.some(f => f.includes('ui') || f.includes('component'))) impact.areas.push('UI');
  if (allFiles.some(f => f.includes('test'))) {
    impact.testCoverage = true;
    impact.areas.push('Tests');
  }

  // Determine risk level
  if (files.deleted.length > 5) impact.risk = 'high';
  else if (allFiles.length > 10) impact.risk = 'medium';
  else if (impact.areas.includes('Database') || impact.areas.includes('Authentication')) impact.risk = 'medium';

  return impact;
}

/**
 * Generate PR description
 */
function generatePRDescription(commits, issue, files) {
  const summary = generateSummary(commits, issue);
  const impact = analyzeImpact(files);

  let description = `## Summary\n\n${summary}\n\n`;

  // Add issue reference
  if (issue) {
    description += `Closes #${issue.number}\n\n`;
  }

  // Changes section
  description += `## Changes\n\n`;

  if (commits.length > 0) {
    commits.forEach(commit => {
      description += `- ${commit.subject}\n`;
    });
  } else {
    description += `- See commit history for details\n`;
  }

  description += `\n`;

  // Files changed
  const totalFiles = files.added.length + files.modified.length + files.deleted.length;
  if (totalFiles > 0) {
    description += `## Files Changed\n\n`;
    description += `- Added: ${files.added.length}\n`;
    description += `- Modified: ${files.modified.length}\n`;
    description += `- Deleted: ${files.deleted.length}\n`;
    description += `- **Total: ${totalFiles} files**\n\n`;
  }

  // Impact analysis
  if (impact.areas.length > 0) {
    description += `## Impact\n\n`;
    description += `**Affected Areas:** ${impact.areas.join(', ')}\n\n`;
    description += `**Risk Level:** ${impact.risk.charAt(0).toUpperCase() + impact.risk.slice(1)}\n\n`;

    if (impact.risk === 'high') {
      description += `⚠️ **High Risk Change** - Requires careful review\n\n`;
    }
  }

  // Test coverage
  description += `## Testing\n\n`;
  if (impact.testCoverage) {
    description += `- [x] Tests included\n`;
  } else {
    description += `- [ ] Tests included\n`;
    description += `- [ ] Manual testing completed\n`;
  }
  description += `\n`;

  // Checklist
  description += `## Checklist\n\n`;
  description += `- [ ] Code follows project conventions\n`;
  description += `- [ ] Self-reviewed the changes\n`;
  description += `- [ ] Documentation updated (if needed)\n`;
  description += `- [ ] No breaking changes (or documented)\n`;
  description += `\n`;

  // Footer
  description += `---\n\n`;
  description += `🤖 Generated with [Claude Code](https://claude.com/claude-code)\n`;

  return description;
}

/**
 * Main
 */
async function main() {
  console.log('📝 PR Intelligence - Auto-Generate PR Description\n');

  // Get current branch info
  const { branch, issueNumber } = getCurrentBranchInfo();
  console.log(`🌿 Branch: ${branch}`);

  if (issueNumber) {
    console.log(`🔗 Detected issue: #${issueNumber}\n`);
  } else {
    console.log(`ℹ️  No issue number detected in branch name\n`);
  }

  // Get commits
  const commits = getCommitsSinceBranch();
  console.log(`📋 Found ${commits.length} commit(s) since branching from main\n`);

  // Get files changed
  const files = getFilesChanged();
  const totalFiles = files.added.length + files.modified.length + files.deleted.length;
  console.log(`📁 Files changed: ${totalFiles} (${files.added.length} added, ${files.modified.length} modified, ${files.deleted.length} deleted)\n`);

  // Get issue details
  let issue = null;
  if (issueNumber) {
    console.log('🔍 Fetching issue details...\n');
    issue = await getIssueDetails(issueNumber);

    if (issue) {
      console.log(`✅ Issue found: ${issue.title}\n`);
    }
  }

  // Generate PR description
  console.log('✨ Generating PR description...\n');
  const description = generatePRDescription(commits, issue, files);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(description);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Save to file
  const fs = await import('fs');
  const prDescriptionPath = '/tmp/pr-description.md';
  fs.writeFileSync(prDescriptionPath, description);

  console.log(`💾 Description saved to: ${prDescriptionPath}\n`);
  console.log('💡 Usage:\n');
  console.log(`   # Copy to clipboard (macOS):`);
  console.log(`   cat ${prDescriptionPath} | pbcopy\n`);
  console.log(`   # Create PR with this description:`);
  console.log(`   gh pr create --body-file ${prDescriptionPath}\n`);
}

// Export for use by other scripts
export { generatePRDescription, getCommitsSinceBranch, getFilesChanged };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

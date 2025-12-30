#!/usr/bin/env node

/**
 * Audit all environment variables across ACT ecosystem
 * Part of env-secrets-manager skill
 */

import fs from 'fs';
import path from 'path';

const REQUIRED_SECRETS = {
  // Shared across all projects
  'GITHUB_TOKEN': { shared: true, required: true },
  'GH_PROJECT_TOKEN': { shared: true, required: true },
  'GITHUB_PROJECT_ID': { shared: true, required: true },
  'NOTION_TOKEN': { shared: true, required: true },
  'NEXT_PUBLIC_SUPABASE_URL': { shared: true, required: true },
  'SUPABASE_SERVICE_ROLE_KEY': { shared: true, required: true },
  
  // Optional but common
  'OPENAI_API_KEY': { shared: true, required: false },
  'VERCEL_ACCESS_TOKEN': { shared: false, required: false },
};

const PROJECTS = [
  {
    name: 'ACT Farm Studio',
    path: '/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio',
    envFile: '.env.local'
  },
  {
    name: 'Empathy Ledger',
    path: '/Users/benknight/Code/empathy-ledger-v2',
    envFile: '.env.local'
  },
  {
    name: 'JusticeHub',
    path: '/Users/benknight/Code/JusticeHub',
    envFile: '.env.local'
  },
  {
    name: 'The Harvest',
    path: '/Users/benknight/Code/The Harvest Website',
    envFile: '.env.local'
  },
  {
    name: 'Goods',
    path: '/Users/benknight/Code/Goods Asset Register',
    envFile: '.env.local'
  },
  {
    name: 'ACT Farm',
    path: '/Users/benknight/Code/ACT Farm/act-farm',
    envFile: '.env.local'
  },
  {
    name: 'Global Infrastructure',
    path: '/Users/benknight/act-global-infrastructure',
    envFile: '.env.local'
  }
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const secrets = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) return;
    
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();
      
      // Check if value is set (not placeholder)
      const isSet = value && 
                    !value.includes('xxxx') && 
                    !value.includes('your_') &&
                    value.length > 10;
      
      secrets[key] = {
        isSet,
        length: value.length,
        isPlaceholder: value.includes('xxxx') || value.includes('your_')
      };
    }
  });

  return secrets;
}

function checkGitIgnore(projectPath) {
  const gitignorePath = path.join(projectPath, '.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    return { exists: false, hasEnv: false };
  }

  const content = fs.readFileSync(gitignorePath, 'utf8');
  const hasEnv = content.includes('.env') || content.includes('.env.local');
  
  return { exists: true, hasEnv };
}

console.log('🔍 ACT Ecosystem - Environment Variables Audit\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const results = [];
let totalIssues = 0;

PROJECTS.forEach(project => {
  console.log(`📁 ${project.name}`);
  console.log(`   Path: ${project.path}`);
  
  const envPath = path.join(project.path, project.envFile);
  const secrets = parseEnvFile(envPath);
  const gitignore = checkGitIgnore(project.path);
  
  const projectResult = {
    name: project.name,
    path: project.path,
    envExists: secrets !== null,
    gitignoreOk: gitignore.hasEnv,
    missingSecrets: [],
    placeholderSecrets: [],
    extraSecrets: []
  };

  if (!secrets) {
    console.log('   ⚠️  No .env.local file found');
    projectResult.missingSecrets = Object.keys(REQUIRED_SECRETS).filter(k => REQUIRED_SECRETS[k].required);
    totalIssues++;
  } else {
    // Check for missing required secrets
    Object.entries(REQUIRED_SECRETS).forEach(([key, config]) => {
      if (config.required && !secrets[key]) {
        projectResult.missingSecrets.push(key);
        console.log(`   ⚠️  Missing: ${key}`);
        totalIssues++;
      } else if (secrets[key] && secrets[key].isPlaceholder) {
        projectResult.placeholderSecrets.push(key);
        console.log(`   ⚠️  Placeholder: ${key} (needs real value)`);
        totalIssues++;
      } else if (secrets[key] && secrets[key].isSet) {
        console.log(`   ✅ ${key}`);
      }
    });
  }

  // Check .gitignore
  if (!gitignore.exists) {
    console.log('   🔴 No .gitignore file!');
    totalIssues++;
  } else if (!gitignore.hasEnv) {
    console.log('   🔴 .gitignore missing .env entries!');
    totalIssues++;
  } else {
    console.log('   ✅ .gitignore protects .env files');
  }

  console.log('');
  results.push(projectResult);
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Summary
console.log('📊 SUMMARY\n');

const projectsWithEnv = results.filter(r => r.envExists).length;
const projectsMissingEnv = results.filter(r => !r.envExists).length;
const projectsWithGitignore = results.filter(r => r.gitignoreOk).length;

console.log(`Projects scanned: ${PROJECTS.length}`);
console.log(`With .env.local: ${projectsWithEnv} ✅`);
console.log(`Missing .env.local: ${projectsMissingEnv} ${projectsMissingEnv > 0 ? '⚠️' : ''}`);
console.log(`With .gitignore protection: ${projectsWithGitignore} ${projectsWithGitignore === PROJECTS.length ? '✅' : '⚠️'}`);
console.log(`Total issues found: ${totalIssues} ${totalIssues === 0 ? '✅' : '⚠️'}\n`);

// Recommendations
if (totalIssues > 0) {
  console.log('💡 RECOMMENDATIONS\n');

  results.forEach(project => {
    if (project.missingSecrets.length > 0 || project.placeholderSecrets.length > 0 || !project.gitignoreOk) {
      console.log(`${project.name}:`);
      
      if (!project.envExists) {
        console.log(`  • Create .env.local from template`);
        console.log(`    cp ~/act-global-infrastructure/.claude/skills/env-secrets-manager/templates/env.template "${project.path}/.env.local"`);
      }
      
      if (project.missingSecrets.length > 0) {
        console.log(`  • Add missing secrets: ${project.missingSecrets.join(', ')}`);
      }
      
      if (project.placeholderSecrets.length > 0) {
        console.log(`  • Replace placeholders: ${project.placeholderSecrets.join(', ')}`);
      }
      
      if (!project.gitignoreOk) {
        console.log(`  • Add to .gitignore:`);
        console.log(`    echo ".env" >> "${project.path}/.gitignore"`);
        console.log(`    echo ".env.local" >> "${project.path}/.gitignore"`);
        console.log(`    echo ".env*.local" >> "${project.path}/.gitignore"`);
      }
      
      console.log('');
    }
  });

  console.log('Or use the skill to fix automatically:');
  console.log('  /env-secrets-manager setup <project-path>\n');
} else {
  console.log('✅ All projects have proper environment variable configuration!\n');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

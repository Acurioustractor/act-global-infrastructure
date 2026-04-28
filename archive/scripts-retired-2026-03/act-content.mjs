#!/usr/bin/env node

/**
 * ACT Content Drafting - Generate content in ACT voice
 *
 * Commands:
 *   draft --type <type> --topic "..."   Draft content (blog, social, email)
 *   social --platform <platform>        Draft social media post
 *   email --to <recipient>              Draft email
 *   variants --input "..."              Generate A/B test variants
 *   templates                           List available templates
 *
 * Usage:
 *   act-content draft --type blog --topic "JusticeHub co-design"
 *   act-content social --platform linkedin --topic "The Harvest update"
 *   act-content email --to partner --topic "collaboration proposal"
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Load secrets from Bitwarden
let secretCache = null;

function loadSecrets() {
  if (secretCache) return secretCache;
  try {
    const token = execSync(
      'security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null',
      { encoding: 'utf8' }
    ).trim();

    const result = execSync(
      `BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`,
      { encoding: 'utf8' }
    );
    const secrets = JSON.parse(result);
    secretCache = {};
    for (const s of secrets) {
      secretCache[s.key] = s.value;
    }
    return secretCache;
  } catch (e) {
    return {};
  }
}

function getSecret(name) {
  const secrets = loadSecrets();
  return secrets[name] || process.env[name];
}

// ACT Voice guidelines
const ACT_VOICE = {
  tone: 'Warm, grounded, curious, hopeful',
  avoid: ['jargon', 'corporate speak', 'savior narrative', 'deficit framing'],
  principles: [
    'Community-led, not organization-led',
    'Stories belong to storytellers',
    'Regenerative, not extractive',
    'Curiosity over certainty',
  ],
  metaphors: {
    farm: 'Seeds, cultivation, harvest, composting, seasons',
    land: 'Country, caring for country, walking together',
    community: 'Circles, gathering, yarning, sharing',
  },
};

// Content templates
const TEMPLATES = {
  blog: {
    name: 'Blog Post',
    structure: `
# [Title that captures curiosity]

*[Opening hook - a question, observation, or story moment]*

## The Context

[Set the scene - what's happening, where, with whom]

## What We're Learning

[Share insights without claiming expertise]

## Voices from Community

> "[Quote from community member]"
> — [Name, role/relationship]

## Looking Forward

[What's next, invitation to engage]

---

*[Call to action - gentle, not pushy]*
`,
  },
  linkedin: {
    name: 'LinkedIn Post',
    structure: `
[Hook line - curiosity or insight]

[2-3 sentences of context]

[Key learning or reflection]

[Question or invitation to comment]

#RegenerativeDesign #CommunityLed #SocialEnterprise
`,
  },
  twitter: {
    name: 'Twitter/X Post',
    structure: `[Insight or observation in 280 chars]

🌱 [Key point]

[Link or call to action]`,
  },
  email_partner: {
    name: 'Partner Email',
    structure: `
Subject: [Topic] - Exploring possibilities together

Hi [Name],

[Personal connection or recent interaction reference]

[What we're working on / exploring]

[Specific ask or invitation - clear but not pushy]

[Offer of value - what we can share]

Looking forward to continuing the conversation.

Warm regards,
[Your name]
ACT - A Curious Tractor
`,
  },
  email_update: {
    name: 'Stakeholder Update',
    structure: `
Subject: [Project/Program] Update - [Month Year]

Hi [Name/Team],

Hope this finds you well. Here's what's been growing at ACT:

**Highlights**
• [Achievement 1]
• [Achievement 2]
• [Achievement 3]

**Community Voices**
[Brief quote or story]

**Coming Up**
[What's next]

**How You Can Help**
[Specific, actionable ask]

Thanks for being part of this journey.

[Your name]
`,
  },
  newsletter: {
    name: 'Newsletter Section',
    structure: `
## [Section Title]

[2-3 sentence intro]

**What's Growing:**
- [Update 1]
- [Update 2]
- [Update 3]

[Quote or reflection]

[Link to learn more]
`,
  },
};

// Generate content using Claude API (or fallback to template)
async function generateContent(type, topic, options = {}) {
  const template = TEMPLATES[type];
  if (!template) {
    console.log(`Unknown content type: ${type}`);
    console.log('Available types:', Object.keys(TEMPLATES).join(', '));
    return null;
  }

  const anthropicKey = getSecret('ANTHROPIC_API_KEY');

  // Build the prompt
  const systemPrompt = `You are a content writer for A Curious Tractor (ACT), an Australian regenerative design studio.

ACT Voice Guidelines:
- Tone: ${ACT_VOICE.tone}
- Avoid: ${ACT_VOICE.avoid.join(', ')}
- Key principles: ${ACT_VOICE.principles.join('; ')}
- Use farm/land metaphors: ${Object.values(ACT_VOICE.metaphors).join('; ')}

Write in first person plural ("we") when representing ACT.
Be specific, grounded, and human. Show don't tell.
Avoid jargon and corporate speak.
Center community voices over organizational achievements.`;

  const userPrompt = `Write a ${template.name} about: ${topic}

${options.context ? `Additional context: ${options.context}` : ''}

Use this structure as a guide:
${template.structure}

Keep the ACT voice authentic and warm.`;

  // Try to use Claude API
  if (anthropicKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: options.model || 'claude-3-haiku-20240307',
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.content[0].text;
      }
    } catch (e) {
      console.error('API error, using template:', e.message);
    }
  }

  // Fallback to template with placeholders
  console.log('\n📝 CONTENT TEMPLATE\n');
  console.log(`Type: ${template.name}`);
  console.log(`Topic: ${topic}`);
  console.log('\nStructure:');
  console.log(template.structure);
  console.log('\n---');
  console.log('Note: Add ANTHROPIC_API_KEY to generate AI-written content');
  return template.structure;
}

// Generate variants for A/B testing
async function generateVariants(input, count = 3) {
  const anthropicKey = getSecret('ANTHROPIC_API_KEY');

  console.log(`\n🔄 GENERATING ${count} VARIANTS\n`);
  console.log(`Original: ${input}\n`);

  if (!anthropicKey) {
    console.log('Note: Add ANTHROPIC_API_KEY for AI-generated variants');
    console.log('\nManual variant ideas:');
    console.log('  1. Lead with a question');
    console.log('  2. Lead with a statistic or fact');
    console.log('  3. Lead with a story or anecdote');
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Generate ${count} different versions of this content for A/B testing. Each should have a different hook/approach while maintaining the same core message:

Original: "${input}"

Keep the ACT voice: warm, curious, community-centered, avoiding jargon.

Format:
Version 1: [content]
Version 2: [content]
Version 3: [content]`
        }],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(data.content[0].text);
    }
  } catch (e) {
    console.error('Error generating variants:', e.message);
  }
}

// List templates
function listTemplates() {
  console.log('\n📋 CONTENT TEMPLATES\n');
  for (const [key, template] of Object.entries(TEMPLATES)) {
    console.log(`  ${key.padEnd(15)} ${template.name}`);
  }
  console.log('\nUsage: act-content draft --type <template> --topic "Your topic"');
  console.log();
}

// Draft social media post
async function draftSocial(platform, topic, options = {}) {
  const platformMap = {
    linkedin: 'linkedin',
    twitter: 'twitter',
    x: 'twitter',
    facebook: 'linkedin', // Use similar format
    instagram: 'twitter', // Short format
  };

  const templateType = platformMap[platform.toLowerCase()] || 'linkedin';
  const content = await generateContent(templateType, topic, options);

  console.log(`\n📱 ${platform.toUpperCase()} POST\n`);
  console.log(content);
  console.log();
}

// Draft email
async function draftEmail(recipient, topic, options = {}) {
  const emailType = recipient.toLowerCase().includes('partner') ? 'email_partner' : 'email_update';
  const content = await generateContent(emailType, topic, {
    ...options,
    context: `Recipient type: ${recipient}`,
  });

  console.log(`\n✉️  EMAIL DRAFT\n`);
  console.log(content);
  console.log();
}

// Parse CLI arguments
function parseArgs(args) {
  const options = {};
  let i = 0;
  while (i < args.length) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      options[key] = value;
      i += value === true ? 1 : 2;
    } else {
      i++;
    }
  }
  return options;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = parseArgs(args.slice(1));

  try {
    switch (command) {
      case 'draft': {
        if (!options.type || !options.topic) {
          console.log('Usage: act-content draft --type <type> --topic "Your topic"');
          console.log('\nTypes:', Object.keys(TEMPLATES).join(', '));
          process.exit(1);
        }
        const content = await generateContent(options.type, options.topic, options);
        if (content && !content.includes('[Title')) {
          console.log(`\n📝 ${TEMPLATES[options.type]?.name || options.type.toUpperCase()}\n`);
          console.log(content);
          console.log();
        }
        break;
      }

      case 'social': {
        if (!options.platform || !options.topic) {
          console.log('Usage: act-content social --platform <platform> --topic "Your topic"');
          console.log('\nPlatforms: linkedin, twitter, facebook, instagram');
          process.exit(1);
        }
        await draftSocial(options.platform, options.topic, options);
        break;
      }

      case 'email': {
        if (!options.to || !options.topic) {
          console.log('Usage: act-content email --to <recipient> --topic "Your topic"');
          console.log('\nRecipient types: partner, stakeholder, funder, community');
          process.exit(1);
        }
        await draftEmail(options.to, options.topic, options);
        break;
      }

      case 'variants': {
        const input = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
        if (!input) {
          console.log('Usage: act-content variants "Your content" [--count N]');
          process.exit(1);
        }
        await generateVariants(input, parseInt(options.count) || 3);
        break;
      }

      case 'templates': {
        listTemplates();
        break;
      }

      default:
        console.log(`
✍️  ACT Content Drafting

Generate content in authentic ACT voice.

Usage:
  act-content draft --type TYPE --topic "..."    Draft content
  act-content social --platform X --topic "..."  Draft social post
  act-content email --to TYPE --topic "..."      Draft email
  act-content variants "content" [--count N]     Generate A/B variants
  act-content templates                          List templates

Content Types:
${Object.entries(TEMPLATES).map(([k, v]) => `  ${k.padEnd(15)} ${v.name}`).join('\n')}

Platforms: linkedin, twitter, facebook, instagram

Email Recipients: partner, stakeholder, funder, community

Examples:
  act-content draft --type blog --topic "JusticeHub co-design process"
  act-content social --platform linkedin --topic "The Harvest update"
  act-content email --to partner --topic "collaboration on youth program"
  act-content variants "Join us at The Harvest this weekend" --count 3

ACT Voice:
  Tone: Warm, grounded, curious, hopeful
  Avoid: Jargon, corporate speak, savior narrative
  Center: Community voices, curiosity, regenerative thinking
`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();

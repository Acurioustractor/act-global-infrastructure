#!/usr/bin/env node

/**
 * Quick demo of @act/voice package
 * Run: node demo-act-voice.mjs
 */

import { ACTVoice } from './packages/act-voice/src/index.js';

const apiKey = process.env.OPENAI_API_KEY || 'OPENAI_KEY_REMOVED';

console.log('🌱 ACT Voice Demo\n');
console.log('Using v1.0 (120 examples, 96/100 quality)\n');
console.log('='.repeat(70));

const act = new ACTVoice(apiKey, { version: 'v1.0' });

// Demo 1: Simple question
console.log('\n📋 Demo 1: Ask about LCAA methodology\n');
const answer1 = await act.ask('What does Listen mean in LCAA methodology?');
console.log(answer1);

// Demo 2: Generate blog post
console.log('\n' + '='.repeat(70));
console.log('\n📋 Demo 2: Generate blog post about regenerative tech\n');
const blog = await act.generateContent('blog', {
  topic: 'How technology can be regenerative',
  audience: 'tech entrepreneurs',
  additionalContext: 'Use Empathy Ledger as example'
});
console.log(blog.substring(0, 500) + '...\n[Blog continues]\n');

// Demo 3: Content moderation
console.log('='.repeat(70));
console.log('\n📋 Demo 3: Check content alignment\n');

const goodContent = 'Community-centered regenerative systems change';
const badContent = 'Leverage stakeholder synergies to optimize ROI';

const check1 = await act.moderateContent(goodContent);
const check2 = await act.moderateContent(badContent);

console.log('Content 1:', goodContent);
console.log('Aligned:', check1.aligned ? '✅ YES' : '❌ NO');
console.log('\nContent 2:', badContent);
console.log('Aligned:', check2.aligned ? '✅ YES' : '❌ NO');

// Demo 4: Compare v0.1 vs v1.0
console.log('\n' + '='.repeat(70));
console.log('\n📋 Demo 4: Compare v0.1 vs v1.0\n');

const question = 'How does art connect to systems change?';

console.log('Question:', question, '\n');

act.useVersion('v0.1');
const v01Answer = await act.ask(question);
console.log('v0.1 Response (90 examples):');
console.log(v01Answer.substring(0, 300) + '...\n');

act.useVersion('v1.0');
const v10Answer = await act.ask(question);
console.log('v1.0 Response (120 examples, enhanced Art phase):');
console.log(v10Answer.substring(0, 300) + '...\n');

console.log('='.repeat(70));
console.log('\n🎉 Demo Complete!\n');
console.log('Package Location: packages/act-voice/');
console.log('Documentation: packages/act-voice/README.md');
console.log('\n🚀 Ready for Week 2: ACT Farm site integration\n');

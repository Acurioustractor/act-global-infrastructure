#!/usr/bin/env node

import { ACTVoice, askACT } from '../src/index.js';

console.log('🧪 Testing @act/voice package\n');

const apiKey = process.env.OPENAI_API_KEY;

// Test 1: Quick helper
console.log('Test 1: Quick helper (askACT)...');
const quickAnswer = await askACT('What is LCAA methodology?', apiKey, 'v1.0');
console.log('✅ Quick helper works');
console.log('Response length:', quickAnswer.length, 'chars\n');

// Test 2: ACTVoice class
console.log('Test 2: ACTVoice class...');
const act = new ACTVoice(apiKey, { version: 'v1.0' });
const classAnswer = await act.ask('What does Listen mean in LCAA?');
console.log('✅ ACTVoice class works');
console.log('Response length:', classAnswer.length, 'chars\n');

// Test 3: Content generation
console.log('Test 3: Content generation...');
const blog = await act.generateContent('blog', {
  topic: 'Community ownership',
  audience: 'social innovators'
});
console.log('✅ Blog generation works');
console.log('Response length:', blog.length, 'chars\n');

// Test 4: Content moderation
console.log('Test 4: Content moderation...');
const goodContent = await act.moderateContent('Community-centered regenerative systems change');
const badContent = await act.moderateContent('Leverage stakeholder synergies for ROI optimization');
console.log('✅ Good content aligned:', goodContent.aligned);
console.log('✅ Bad content aligned:', badContent.aligned);
console.log('');

// Test 5: Version switching
console.log('Test 5: Version switching...');
act.useVersion('v0.1');
const v01Answer = await act.ask('What is ACT?');
console.log('✅ Switched to v0.1');
console.log('Model info:', act.getModelInfo());
console.log('');

console.log('🎉 All tests passed!\n');
console.log('Ready for Week 2: ACT Farm site integration');

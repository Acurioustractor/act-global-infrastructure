#!/usr/bin/env node

/**
 * Review Empathy Ledger wiki messaging balance
 * Use ACT Voice v1.0 to analyze and suggest rewrites
 */

import { ACTVoice } from '../packages/act-voice/src/index.js';
import fs from 'fs';

const apiKey = process.env.OPENAI_API_KEY || 'OPENAI_KEY_REMOVED';

console.log('🔍 Empathy Ledger Wiki Review\n');
console.log('Using ACT Voice v1.0 to analyze messaging balance...\n');
console.log('='.repeat(70));

const act = new ACTVoice(apiKey, { version: 'v1.0', maxTokens: 2000 });

// Read the wiki file
const wikiPath = '/Users/benknight/Code/empathy-ledger-v2/EMPATHY_LEDGER_WIKI.md';
const wikiContent = fs.readFileSync(wikiPath, 'utf-8');

// Extract key sections for focused review
const coreMission = wikiContent.match(/## 🎯 Core Mission([\s\S]*?)---/)[1];
const tagline = wikiContent.match(/\*\*Tagline:\*\* "(.*?)"/)[1];
const pillar1 = wikiContent.match(/### 1\. Indigenous Leadership[\s\S]*?---/)[0];

console.log('\n📋 Part 1: Overall Tone Analysis\n');

const analysisPrompt = `Review this Empathy Ledger mission document for messaging balance.

**Current Situation:**
The platform is described as "Indigenous-led" at the top level, making it seem like an exclusively Indigenous platform.

**Desired Balance:**
The platform should be "stories for everyone by everyone" BUT with dedicated, authentic, prominent focus on Indigenous and marginalized communities' lived experiences. We need to balance universal access with authentic dedication to Indigenous voices.

**Key Sections to Review:**

CORE MISSION:
${coreMission}

TAGLINE:
"${tagline}"

STRATEGIC PILLAR 1:
${pillar1.substring(0, 800)}

**Please analyze:**
1. Where does the current framing feel EXCLUSIVE (Indigenous-only) vs. DEDICATED (Indigenous-centered within universal platform)?
2. What specific language creates the impression of exclusivity?
3. How can we maintain cultural safety, protocols, and Indigenous leadership while opening the framing to be universal?
4. What would "stories for everyone by everyone" with authentic Indigenous dedication look like?

Be specific and direct. Focus on the balance issue.`;

const analysis = await act.ask(analysisPrompt);
console.log(analysis);

console.log('\n\n' + '='.repeat(70));
console.log('\n📋 Part 2: Specific Rewrites\n');

const rewritePrompt = `Now provide SPECIFIC REWRITES for these three elements to achieve the right balance:

CURRENT CORE MISSION OPENING:
"Empathy Ledger empowers Indigenous communities and storytellers to:"

CURRENT TAGLINE:
"Indigenous-led storytelling platform with complete data sovereignty and cultural sensitivity protocols"

CURRENT PILLAR 1 NAME:
"Indigenous Leadership & Cultural Safety (PRIORITY 1)"

For each one:
1. Provide the REWRITTEN version that opens to universal framing while maintaining authentic Indigenous focus
2. Explain WHY this rewrite achieves better balance
3. Ensure cultural safety and Indigenous leadership remain clear and authentic

Be concrete. Give me the actual text I should use.`;

const rewrites = await act.ask(rewritePrompt);
console.log(rewrites);

console.log('\n\n' + '='.repeat(70));
console.log('\n📋 Part 3: Implementation Guidance\n');

const guidancePrompt = `How should we apply this balanced framing throughout the rest of the document?

**Specific Questions:**
1. Should "Indigenous Leadership & Cultural Safety" remain PRIORITY 1, or should it be integrated differently?
2. How do we talk about OCAP principles (Ownership, Control, Access, Possession) in a universal context?
3. Should Elder authority be framed as "available for all communities" or "specifically for Indigenous communities using the platform"?
4. How do we describe the multi-tenant isolation - is it "for Indigenous communities" or "for all communities, with special protocols for Indigenous"?

Give practical guidance for maintaining this balance across all 8 strategic pillars.`;

const guidance = await act.ask(guidancePrompt);
console.log(guidance);

console.log('\n\n' + '='.repeat(70));
console.log('\n✅ Review Complete\n');
console.log('📄 Summary saved to: EMPATHY_LEDGER_MESSAGING_REVIEW.md\n');

// Generate markdown report
const report = `# Empathy Ledger Messaging Review

**Date:** ${new Date().toISOString()}
**Reviewed by:** ACT Voice v1.0 (96/100 quality)
**Purpose:** Balance universal framing with authentic Indigenous dedication

---

## 🎯 The Challenge

**Current State:** Messaging leads with "Indigenous-led" and "Indigenous communities" at top level, creating impression of Indigenous-only platform.

**Desired State:** "Stories for everyone by everyone" with dedicated, authentic, prominent focus on Indigenous and marginalized communities' lived experiences.

---

## 📊 Part 1: Overall Tone Analysis

${analysis}

---

## ✏️ Part 2: Specific Rewrites

${rewrites}

---

## 🛠️ Part 3: Implementation Guidance

${guidance}

---

## 🚀 Next Steps

1. Review these suggestions with team
2. Update EMPATHY_LEDGER_WIKI.md with balanced framing
3. Apply consistent messaging across:
   - Marketing copy
   - Platform UI text
   - Documentation
   - Pitch decks
   - Website content

4. Test messaging with both:
   - Indigenous community partners (does it honor commitment?)
   - General audience (is it welcoming to all?)

---

**Generated by ACT Voice v1.0** - Regenerative language for systems change 🌱
`;

fs.writeFileSync('./EMPATHY_LEDGER_MESSAGING_REVIEW.md', report);
console.log('Review complete. See EMPATHY_LEDGER_MESSAGING_REVIEW.md for full report.\n');

# @act/voice

ACT's fine-tuned AI voice package - consistent regenerative language and LCAA methodology across all projects.

## Installation

```bash
npm install @act/voice
```

## Quick Start

```javascript
import { ACTVoice } from '@act/voice';

const act = new ACTVoice(process.env.OPENAI_API_KEY);

// Ask a question
const answer = await act.ask('What does Listen mean in LCAA methodology?');
console.log(answer);

// Generate blog post
const blog = await act.generateContent('blog', {
  topic: 'Community ownership',
  audience: 'social innovators'
});

// Check content alignment
const check = await act.moderateContent('Your content here...');
if (check.aligned) {
  console.log('Content aligns with ACT values!');
}
```

## Features

### Two Fine-tuned Models

**v0.1** (88/100 quality, 90 examples)
- Strong Listen, Curiosity, Action phases
- Good for testing and baseline comparison
- Art phase under-represented

**v1.0** (96/100 quality, 120 examples)
- Balanced LCAA coverage
- 100% strategic pillar coverage
- Enhanced regenerative metaphors (45.8%)
- **Recommended for production**

### Content Generation

Generate ACT-voice content for various purposes:

```javascript
// Blog post
await act.generateContent('blog', {
  topic: 'Circular economy in practice',
  audience: 'community organizers',
  additionalContext: 'Focus on Goods on Country project'
});

// Campaign copy
await act.generateContent('campaign', {
  project: 'JusticeHub',
  audience: 'youth advocates',
  callToAction: 'Join our next co-design session'
});

// Email response
await act.generateContent('email', {
  inquiry: 'Tell me about artist residencies at BCV',
  includeResources: true
});

// Project proposal
await act.generateContent('proposal', {
  idea: 'Regenerative manufacturing in regional communities',
  funder: 'Impact investors',
  budget: '$500k over 2 years'
});

// Social media
await act.generateContent('social', {
  topic: 'Community co-creation',
  platform: 'Twitter',
  maxLength: 280
});
```

### Content Moderation

Check if content aligns with ACT values:

```javascript
const result = await act.moderateContent(`
  Our stakeholder engagement strategy leverages
  best-in-class solutions to optimize ROI...
`);

console.log(result.aligned); // false
console.log(result.feedback); // "Too much corporate jargon..."
```

### Data Enrichment

Auto-generate ACT-voice descriptions:

```javascript
// For Notion projects
const description = await act.enrichDescription(
  'Empathy Ledger Platform',
  'project'
);

// For team bios
const bio = await act.enrichDescription(
  'Jane Smith - Community Organizer',
  'person'
);
```

### Switch Versions

```javascript
// Use v0.1 for testing
act.useVersion('v0.1');

// Back to v1.0 for production
act.useVersion('v1.0');

// Check current model
console.log(act.getModelInfo());
```

## Configuration Options

```javascript
const act = new ACTVoice(apiKey, {
  version: 'v1.0',        // 'v0.1' or 'v1.0'
  temperature: 0.7,       // 0-1 (creativity)
  maxTokens: 1000        // Response length limit
});
```

## Use Cases

### Frontend Sites
```javascript
// components/ACTAssistant.tsx
import { ACTVoice } from '@act/voice';

const act = new ACTVoice(process.env.OPENAI_API_KEY);

export async function handleUserQuestion(question) {
  return await act.ask(question);
}
```

### Backend APIs
```javascript
// Email auto-responder
import { ACTVoice } from '@act/voice';

const act = new ACTVoice(process.env.OPENAI_API_KEY);

export async function respondToInquiry(email) {
  const response = await act.generateContent('email', {
    inquiry: email.body
  });

  return sendEmail({
    to: email.from,
    subject: `Re: ${email.subject}`,
    body: response
  });
}
```

### Notion Integration
```javascript
// Enrich project pages
import { ACTVoice } from '@act/voice';
import { Client } from '@notionhq/client';

const act = new ACTVoice(process.env.OPENAI_API_KEY);
const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function enrichProject(pageId) {
  const page = await notion.pages.retrieve({ page_id: pageId });
  const title = page.properties.Name.title[0].plain_text;

  const description = await act.enrichDescription(title, 'project');

  await notion.pages.update({
    page_id: pageId,
    properties: {
      'AI Description': {
        rich_text: [{ text: { content: description } }]
      }
    }
  });
}
```

### CLI Tools
```javascript
#!/usr/bin/env node
import { ACTVoice } from '@act/voice';

const act = new ACTVoice(process.env.OPENAI_API_KEY);

const answer = await act.ask(process.argv[2]);
console.log(answer);
```

```bash
# Usage
act-ask "How does LCAA methodology work?"
```

## Model Details

### v0.1
- **Examples:** 90
- **Quality:** 88/100
- **Model ID:** `ft:gpt-4o-mini-2024-07-18:a-curious-tractor:act-voice-v0-1:Ct3vFGcn`
- **LCAA Coverage:** Listen 35.6% | Curiosity 26.7% | Action 53.3% | Art 15.6%
- **Pillars:** 83.3% (5 of 6)
- **Regenerative Metaphors:** 27.8%

### v1.0
- **Examples:** 120
- **Quality:** 96/100
- **Model ID:** Coming soon (currently training)
- **LCAA Coverage:** Listen 27.5% | Curiosity 20.8% | Action 59.2% | Art 33.3%
- **Pillars:** 100% (all 6)
- **Regenerative Metaphors:** 45.8%

## Cost Estimates

OpenAI GPT-4o-mini fine-tuned pricing:
- Input: ~$0.30 / 1M tokens
- Output: ~$1.20 / 1M tokens

**Monthly estimates:**
- Light (1,000 queries): $5-10
- Medium (10,000 queries): $50-100
- Heavy (100,000 queries): $500-1,000

Much more cost-effective than hiring writers while maintaining perfect voice consistency!

## Environment Variables

```bash
# .env
OPENAI_API_KEY=sk-proj-...
```

## License

MIT

## Support

For issues or questions:
- GitHub: https://github.com/act/act-global-infrastructure
- Email: team@acurioustractor.com

---

🌱 Seeds planted. Forest growing. Regenerative voice across all touchpoints. 🌳

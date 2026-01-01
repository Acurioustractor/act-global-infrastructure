/**
 * @act/voice - ACT's Fine-tuned AI Voice Package
 *
 * Provides consistent regenerative language and LCAA methodology
 * across all ACT projects and platforms.
 */

import OpenAI from 'openai';

/**
 * ACT Voice client for interacting with fine-tuned models
 */
export class ACTVoice {
  /**
   * Create new ACT Voice instance
   * @param {string} apiKey - OpenAI API key
   * @param {object} options - Configuration options
   * @param {string} options.version - Model version ('v0.1' or 'v1.0', default: 'v1.0')
   * @param {number} options.temperature - Response creativity (0-1, default: 0.7)
   * @param {number} options.maxTokens - Maximum response length (default: 1000)
   */
  constructor(apiKey, options = {}) {
    this.client = new OpenAI({ apiKey });
    this.version = options.version || 'v1.0';
    this.temperature = options.temperature || 0.7;
    this.maxTokens = options.maxTokens || 1000;

    // Model identifiers
    this.models = {
      'v0.1': 'ft:gpt-4o-mini-2024-07-18:a-curious-tractor:act-voice-v0-1:Ct3vFGcn',
      'v1.0': 'ft:gpt-4o-mini-2024-07-18:a-curious-tractor:act-voice-v1-0:Ct4C4QW7'
    };

    this.currentModel = this.models[this.version];
    if (!this.currentModel) {
      throw new Error(`Model version ${this.version} not available yet`);
    }
  }

  /**
   * Ask ACT Voice a question
   * @param {string} question - Question or prompt
   * @param {object} options - Override default options
   * @returns {Promise<string>} - ACT Voice response
   */
  async ask(question, options = {}) {
    const response = await this.client.chat.completions.create({
      model: this.currentModel,
      messages: [{ role: 'user', content: question }],
      temperature: options.temperature || this.temperature,
      max_tokens: options.maxTokens || this.maxTokens,
      ...options
    });

    return response.choices[0].message.content;
  }

  /**
   * Generate content using predefined templates
   * @param {string} type - Content type ('blog', 'campaign', 'email', 'docs', etc.)
   * @param {object} data - Data for template
   * @returns {Promise<string>} - Generated content
   */
  async generateContent(type, data) {
    const prompts = {
      blog: this._blogPrompt(data),
      campaign: this._campaignPrompt(data),
      email: this._emailPrompt(data),
      docs: this._docsPrompt(data),
      proposal: this._proposalPrompt(data),
      social: this._socialPrompt(data)
    };

    const prompt = prompts[type] || data.customPrompt;
    if (!prompt) {
      throw new Error(`Unknown content type: ${type}. Use customPrompt instead.`);
    }

    return this.ask(prompt);
  }

  /**
   * Check if content aligns with ACT values
   * @param {string} content - Content to moderate
   * @returns {Promise<object>} - { aligned: boolean, feedback: string }
   */
  async moderateContent(content) {
    const prompt = `Does this content align with ACT's community-centered, regenerative values?
Is it free from extractive language, jargon, and corporate speak?

Content to review:
${content}

Respond with:
1. ALIGNED or NOT_ALIGNED
2. Brief feedback explaining why`;

    const response = await this.ask(prompt);

    return {
      aligned: response.toUpperCase().includes('ALIGNED') && !response.toUpperCase().includes('NOT_ALIGNED'),
      feedback: response
    };
  }

  /**
   * Enrich data with ACT-voice descriptions
   * @param {string} title - Item title
   * @param {string} type - Type of item (project, person, organization, action)
   * @returns {Promise<string>} - ACT-voice description
   */
  async enrichDescription(title, type = 'project') {
    const prompts = {
      project: `Write a 2-paragraph description for this ACT project: "${title}". Explain how it embodies LCAA methodology and creates regenerative impact.`,
      person: `Write a warm, community-centered bio for this ACT team member or partner: "${title}". Focus on their contribution to regenerative work.`,
      organization: `Describe this partner organization: "${title}". Explain how they align with ACT's regenerative values and community-centered approach.`,
      action: `Describe this action item: "${title}". Connect it to LCAA methodology and explain its role in systems change.`
    };

    return this.ask(prompts[type] || prompts.project);
  }

  // Template methods
  _blogPrompt(data) {
    return `Write a blog post about ${data.topic} for ${data.audience || 'general readers'}.

Use ACT's regenerative voice:
- Warm, grounded, humble, visionary tone
- Regenerative metaphors (seeds, soil, cultivation, harvest)
- Community-centered framing
- LCAA methodology where relevant
- Avoid jargon and corporate speak

${data.additionalContext ? `Context: ${data.additionalContext}` : ''}`;
  }

  _campaignPrompt(data) {
    return `Create campaign copy for ${data.project} aimed at ${data.audience || 'community members'}.

The campaign should:
- Invite participation (not demand support)
- Use regenerative metaphors
- Feel like coming home to community
- Provoke imagination before asking for action
- Be concise (2-3 paragraphs max)

${data.callToAction ? `Call to action: ${data.callToAction}` : ''}`;
  }

  _emailPrompt(data) {
    return `Draft a warm, community-centered email response to this inquiry:

${data.inquiry}

Use ACT's voice:
- Welcoming and accessible
- Explain relevant projects/methodology
- Offer next steps
- Sign off warmly

${data.includeResources ? 'Include relevant resources or links where appropriate.' : ''}`;
  }

  _docsPrompt(data) {
    return `Generate documentation for ${data.feature || 'this feature'}.

Structure:
- What it does (user-friendly explanation)
- How it embodies ACT values
- How to use it (clear steps)
- Connection to LCAA methodology (if relevant)

Tone: Accessible, warm, avoid technical jargon unless necessary.`;
  }

  _proposalPrompt(data) {
    return `Write a project proposal for ${data.funder || 'potential funders'} about: ${data.idea}

Structure using LCAA methodology:
- Listen: What community needs/wisdom informed this?
- Curiosity: What questions are we exploring?
- Action: What will we build/do?
- Art: How will we make transformation visible?

Emphasize:
- Community ownership and benefit
- Regenerative outcomes
- Power transfer, not extraction
- Systems change approach

${data.budget ? `Budget context: ${data.budget}` : ''}`;
  }

  _socialPrompt(data) {
    return `Write a social media post about ${data.topic} for ${data.platform || 'general social media'}.

Voice:
- Warm, inviting, not promotional
- One key regenerative metaphor
- Question or invitation to engage
- Keep to ${data.maxLength || '280'} characters if possible

${data.hashtags ? `Include these hashtags: ${data.hashtags}` : ''}`;
  }

  /**
   * Switch model version
   * @param {string} version - 'v0.1' or 'v1.0'
   */
  useVersion(version) {
    if (!this.models[version]) {
      throw new Error(`Model version ${version} not available`);
    }
    this.version = version;
    this.currentModel = this.models[version];
  }

  /**
   * Get current model info
   * @returns {object} - Model version and identifier
   */
  getModelInfo() {
    return {
      version: this.version,
      model: this.currentModel,
      temperature: this.temperature,
      maxTokens: this.maxTokens
    };
  }
}

/**
 * Quick helper for one-off questions
 * @param {string} question - Question to ask
 * @param {string} apiKey - OpenAI API key
 * @param {string} version - Model version (default: 'v1.0')
 * @returns {Promise<string>} - Response
 */
export async function askACT(question, apiKey, version = 'v1.0') {
  const act = new ACTVoice(apiKey, { version });
  return act.ask(question);
}

export default ACTVoice;

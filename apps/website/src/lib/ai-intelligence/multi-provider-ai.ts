/**
 * ACT Multi-Provider AI Orchestrator
 *
 * Ported from ACT Placemat's proven multi-provider system
 * Provides automatic fallback chains, health checking, and cost optimization
 *
 * Providers:
 * 1. Claude Sonnet 4.5 (primary - ACT voice, LCAA understanding)
 * 2. GPT-4 (backup - reliability)
 * 3. Perplexity Llama 3.1 Sonar (web research)
 * 4. Ollama (local - privacy-sensitive content)
 *
 * Features:
 * - Health-checked fallback chains
 * - 5-minute cached provider health
 * - Cost tracking per query
 * - Analysis tiers (Quick $0.01 → Expert $2.00)
 * - Privacy modes (high/medium/standard)
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ProviderType = 'claude' | 'openai' | 'perplexity' | 'ollama';
export type AnalysisTier = 'quick' | 'deep' | 'strategic' | 'expert';
export type PrivacyMode = 'high' | 'medium' | 'standard';

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  tier?: AnalysisTier;
  privacyMode?: PrivacyMode;
  preferredProvider?: ProviderType;
}

export interface AIResponse {
  text: string;
  provider: ProviderType;
  model: string;
  cost: number;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  latencyMs: number;
  cached?: boolean;
}

interface ProviderHealth {
  healthy: boolean;
  timestamp: number;
  latencyMs?: number;
  error?: string;
}

interface ProviderConfig {
  model: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  maxTokens: number;
  description: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const HEALTH_CHECK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;

// Provider configurations
const PROVIDER_CONFIGS: Record<ProviderType, Record<string, ProviderConfig>> = {
  claude: {
    'haiku': {
      model: 'claude-3-5-haiku-20241022',
      costPer1kInput: 0.001,
      costPer1kOutput: 0.005,
      maxTokens: 8192,
      description: 'Fast, cheap for quick analysis'
    },
    'sonnet': {
      model: 'claude-sonnet-4-5-20250929',
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
      maxTokens: 8192,
      description: 'Best for ACT voice and LCAA understanding'
    },
    'opus': {
      model: 'claude-opus-4-5-20251101',
      costPer1kInput: 0.015,
      costPer1kOutput: 0.075,
      maxTokens: 8192,
      description: 'Highest quality, strategic decisions'
    }
  },
  openai: {
    'gpt-4o': {
      model: 'gpt-4o',
      costPer1kInput: 0.0025,
      costPer1kOutput: 0.01,
      maxTokens: 16384,
      description: 'Reliable backup, good quality'
    },
    'gpt-4o-mini': {
      model: 'gpt-4o-mini',
      costPer1kInput: 0.00015,
      costPer1kOutput: 0.0006,
      maxTokens: 16384,
      description: 'Fast and cheap'
    }
  },
  perplexity: {
    'sonar': {
      model: 'llama-3.1-sonar-large-128k-online',
      costPer1kInput: 0.001,
      costPer1kOutput: 0.001,
      maxTokens: 127072,
      description: 'Web research with citations'
    }
  },
  ollama: {
    'llama': {
      model: 'llama3.1:8b',
      costPer1kInput: 0,
      costPer1kOutput: 0,
      maxTokens: 8192,
      description: 'Local, private, free'
    },
    'qwen': {
      model: 'qwen2.5:32b',
      costPer1kInput: 0,
      costPer1kOutput: 0,
      maxTokens: 32768,
      description: 'Local, higher quality'
    }
  }
};

// Analysis tier configurations
const ANALYSIS_TIERS: Record<AnalysisTier, {
  provider: ProviderType;
  modelKey: string;
  expectedCost: number;
  description: string;
}> = {
  quick: {
    provider: 'claude',
    modelKey: 'haiku',
    expectedCost: 0.01,
    description: 'Fast answers, good for simple queries'
  },
  deep: {
    provider: 'claude',
    modelKey: 'sonnet',
    expectedCost: 0.10,
    description: 'ACT voice, LCAA understanding, default choice'
  },
  strategic: {
    provider: 'claude',
    modelKey: 'opus',
    expectedCost: 0.50,
    description: 'Highest quality for important decisions'
  },
  expert: {
    provider: 'claude',
    modelKey: 'opus',
    expectedCost: 2.00,
    description: 'Multi-AI consensus with research'
  }
};

// Privacy mode configurations
const PRIVACY_MODES: Record<PrivacyMode, {
  allowedProviders: ProviderType[];
  preferredProvider: ProviderType;
  description: string;
}> = {
  high: {
    allowedProviders: ['ollama'],
    preferredProvider: 'ollama',
    description: 'Local only - no external API calls (OCAP® compliant)'
  },
  medium: {
    allowedProviders: ['ollama', 'claude'],
    preferredProvider: 'ollama',
    description: 'Prefer local, fallback to Claude if needed'
  },
  standard: {
    allowedProviders: ['claude', 'openai', 'perplexity', 'ollama'],
    preferredProvider: 'claude',
    description: 'Best available (may use external APIs)'
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLIENT INITIALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;

if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HEALTH CHECK CACHE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const healthCache = new Map<ProviderType, ProviderHealth>();

/**
 * Check if provider is healthy (with 5-minute caching)
 */
async function checkProviderHealth(provider: ProviderType): Promise<boolean> {
  const cached = healthCache.get(provider);

  // Return cached result if still valid
  if (cached && Date.now() - cached.timestamp < HEALTH_CHECK_CACHE_TTL) {
    return cached.healthy;
  }

  const startTime = Date.now();
  let healthy = false;
  let error: string | undefined;

  try {
    switch (provider) {
      case 'claude':
        if (!anthropic) throw new Error('Claude not configured');
        await anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        });
        healthy = true;
        break;

      case 'openai':
        if (!openai) throw new Error('OpenAI not configured');
        await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        });
        healthy = true;
        break;

      case 'perplexity':
        if (!process.env.PERPLEXITY_API_KEY) throw new Error('Perplexity not configured');
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10
          })
        });
        healthy = response.ok;
        break;

      case 'ollama':
        const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3.1:8b',
            prompt: 'test',
            stream: false
          })
        });
        healthy = ollamaResponse.ok;
        break;
    }
  } catch (err) {
    healthy = false;
    error = err instanceof Error ? err.message : 'Unknown error';
  }

  const latencyMs = Date.now() - startTime;

  // Cache result
  healthCache.set(provider, {
    healthy,
    timestamp: Date.now(),
    latencyMs,
    error
  });

  return healthy;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROVIDER IMPLEMENTATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function callClaude(
  config: ProviderConfig,
  prompt: string,
  systemPrompt?: string,
  maxTokens?: number
): Promise<AIResponse> {
  if (!anthropic) throw new Error('Claude not configured');

  const startTime = Date.now();

  const response = await anthropic.messages.create({
    model: config.model,
    max_tokens: maxTokens || config.maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }]
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const cost = (inputTokens / 1000 * config.costPer1kInput) + (outputTokens / 1000 * config.costPer1kOutput);

  return {
    text: content.text,
    provider: 'claude',
    model: config.model,
    cost,
    tokensUsed: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens
    },
    latencyMs: Date.now() - startTime
  };
}

async function callOpenAI(
  config: ProviderConfig,
  prompt: string,
  systemPrompt?: string,
  maxTokens?: number
): Promise<AIResponse> {
  if (!openai) throw new Error('OpenAI not configured');

  const startTime = Date.now();

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const response = await openai.chat.completions.create({
    model: config.model,
    max_tokens: maxTokens || config.maxTokens,
    messages
  });

  const text = response.choices[0]?.message?.content || '';
  const inputTokens = response.usage?.prompt_tokens || 0;
  const outputTokens = response.usage?.completion_tokens || 0;
  const cost = (inputTokens / 1000 * config.costPer1kInput) + (outputTokens / 1000 * config.costPer1kOutput);

  return {
    text,
    provider: 'openai',
    model: config.model,
    cost,
    tokensUsed: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens
    },
    latencyMs: Date.now() - startTime
  };
}

async function callPerplexity(
  config: ProviderConfig,
  prompt: string,
  systemPrompt?: string,
  maxTokens?: number
): Promise<AIResponse> {
  if (!process.env.PERPLEXITY_API_KEY) throw new Error('Perplexity not configured');

  const startTime = Date.now();

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: maxTokens || config.maxTokens
    })
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices[0]?.message?.content || '';
  const inputTokens = data.usage?.prompt_tokens || 0;
  const outputTokens = data.usage?.completion_tokens || 0;
  const cost = (inputTokens / 1000 * config.costPer1kInput) + (outputTokens / 1000 * config.costPer1kOutput);

  return {
    text,
    provider: 'perplexity',
    model: config.model,
    cost,
    tokensUsed: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens
    },
    latencyMs: Date.now() - startTime
  };
}

async function callOllama(
  config: ProviderConfig,
  prompt: string,
  systemPrompt?: string
): Promise<AIResponse> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const startTime = Date.now();

  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_ctx: 4096
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    text: data.response || '',
    provider: 'ollama',
    model: config.model,
    cost: 0, // Local = free
    tokensUsed: {
      input: 0, // Ollama doesn't report tokens
      output: 0,
      total: 0
    },
    latencyMs: Date.now() - startTime
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN ORCHESTRATOR CLASS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class MultiProviderAI {
  /**
   * Generate AI response with automatic fallback
   *
   * Fallback chain (based on privacy mode):
   * - High: Ollama only
   * - Medium: Ollama → Claude
   * - Standard: Claude → OpenAI → Perplexity → Ollama
   */
  async generate(request: AIRequest): Promise<AIResponse> {
    const tier = request.tier || 'deep';
    const privacyMode = request.privacyMode || 'standard';

    // Get privacy mode config
    const privacyConfig = PRIVACY_MODES[privacyMode];

    // Determine provider order based on privacy mode and tier
    let providerOrder: ProviderType[];

    if (request.preferredProvider) {
      // Use preferred provider first if allowed
      if (privacyConfig.allowedProviders.includes(request.preferredProvider)) {
        providerOrder = [
          request.preferredProvider,
          ...privacyConfig.allowedProviders.filter(p => p !== request.preferredProvider)
        ];
      } else {
        console.warn(`Preferred provider ${request.preferredProvider} not allowed in ${privacyMode} mode`);
        providerOrder = privacyConfig.allowedProviders;
      }
    } else {
      // Use tier config
      const tierConfig = ANALYSIS_TIERS[tier];
      if (privacyConfig.allowedProviders.includes(tierConfig.provider)) {
        providerOrder = [
          tierConfig.provider,
          ...privacyConfig.allowedProviders.filter(p => p !== tierConfig.provider)
        ];
      } else {
        providerOrder = privacyConfig.allowedProviders;
      }
    }

    console.log(`🤖 Attempting providers in order: ${providerOrder.join(' → ')}`);

    // Try each provider with retries
    for (const provider of providerOrder) {
      // Check health first
      const healthy = await checkProviderHealth(provider);
      if (!healthy) {
        console.log(`   ⚠️  ${provider} unhealthy, skipping`);
        continue;
      }

      // Retry logic
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`   🔄 ${provider} attempt ${attempt}/${MAX_RETRIES}`);

          const response = await this.callProvider(provider, request);

          console.log(`   ✅ ${provider} success (${response.cost.toFixed(4)} USD, ${response.latencyMs}ms)`);
          return response;

        } catch (error) {
          console.error(`   ❌ ${provider} attempt ${attempt} failed:`, error instanceof Error ? error.message : error);

          if (attempt === MAX_RETRIES) {
            console.log(`   ⏭️  ${provider} exhausted retries, trying next provider`);
          }
        }
      }
    }

    throw new Error(`All providers failed after retries. Privacy mode: ${privacyMode}, Tier: ${tier}`);
  }

  /**
   * Call specific provider
   */
  private async callProvider(provider: ProviderType, request: AIRequest): Promise<AIResponse> {
    const tier = request.tier || 'deep';
    const tierConfig = ANALYSIS_TIERS[tier];

    // Get model config (use tier's model or default for provider)
    let modelKey = tierConfig.modelKey;
    if (tierConfig.provider !== provider) {
      // Using different provider than tier suggests, use default model
      modelKey = Object.keys(PROVIDER_CONFIGS[provider])[0];
    }

    const config = PROVIDER_CONFIGS[provider][modelKey];
    if (!config) {
      throw new Error(`No config found for ${provider}:${modelKey}`);
    }

    // Build full prompt with context
    const fullPrompt = request.context
      ? `Context:\n${request.context}\n\nQuery: ${request.prompt}`
      : request.prompt;

    switch (provider) {
      case 'claude':
        return await callClaude(config, fullPrompt, request.systemPrompt, request.maxTokens);
      case 'openai':
        return await callOpenAI(config, fullPrompt, request.systemPrompt, request.maxTokens);
      case 'perplexity':
        return await callPerplexity(config, fullPrompt, request.systemPrompt, request.maxTokens);
      case 'ollama':
        return await callOllama(config, fullPrompt, request.systemPrompt);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Get health status for all providers
   */
  async getHealthStatus(): Promise<Record<ProviderType, ProviderHealth>> {
    const providers: ProviderType[] = ['claude', 'openai', 'perplexity', 'ollama'];

    const results: Record<string, ProviderHealth> = {};

    for (const provider of providers) {
      const healthy = await checkProviderHealth(provider);
      const cached = healthCache.get(provider)!;
      results[provider] = cached;
    }

    return results as Record<ProviderType, ProviderHealth>;
  }

  /**
   * Clear health cache (force re-check)
   */
  clearHealthCache() {
    healthCache.clear();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const multiProviderAI = new MultiProviderAI();

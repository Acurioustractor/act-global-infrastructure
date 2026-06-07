/**
 * LLM provider adapter for command-center.
 *
 * Drop-in shim around @anthropic-ai/sdk that routes calls to MiniMax,
 * Gemini, or back to Anthropic based on env vars. Existing call sites
 * work unchanged — they import `LLMClient` instead of `Anthropic`, and
 * the .messages.create() API + response shape stay identical.
 *
 * Provider selection:
 *   LLM_PROVIDER          — default backend for all tiers (anthropic | minimax | gemini)
 *   LLM_CHEAP_PROVIDER    — override for cheap tier (Haiku-mapped models). Defaults to LLM_PROVIDER.
 *
 * The cheap-tier override exists because Gemini Flash Lite is far cheaper than
 * MiniMax for high-volume Haiku-route work (1,500 req/day free, then $0.10/$0.40
 * per M tok vs MiniMax $0.30/$1.20). Typical setup:
 *   LLM_PROVIDER=minimax           # Sonnet/Opus routes
 *   LLM_CHEAP_PROVIDER=gemini      # Haiku routes
 *
 * Why this exists:
 *   - Anthropic SDK calls /v1/messages with their own request/response shape.
 *   - MiniMax M2.7 exposes /v1/chat/completions (OpenAI-compatible) but
 *     accepts Anthropic-style tools input. Response is OpenAI-shaped —
 *     we convert it back.
 *   - Gemini uses a different shape entirely (Content.parts, functionCall).
 *     We convert both directions.
 *   - Lets us flip provider/tier with env vars, including instant rollback.
 *
 * Usage:
 *   import { LLMClient } from '@/lib/llm-adapter';
 *   const client = new LLMClient({ apiKey: '...' }); // apiKey only used for Anthropic passthrough
 *   const response = await client.messages.create({ model, max_tokens, system, tools, messages });
 *   // response.content[i].type === 'tool_use' | 'text', etc — same as Anthropic SDK
 */

import Anthropic from '@anthropic-ai/sdk';

type MessageCreateParams = Anthropic.Messages.MessageCreateParamsNonStreaming;
type Message = Anthropic.Messages.Message;

const PROVIDER = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();
const CHEAP_PROVIDER = (process.env.LLM_CHEAP_PROVIDER || PROVIDER).toLowerCase();
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1';

// Maps Anthropic Haiku model strings → Gemini Flash Lite (cheap tier),
// Sonnet → Flash, Opus → Pro.
const GEMINI_MODEL_MAP: Record<string, string> = {
  'claude-haiku-4-5': 'gemini-2.5-flash-lite',
  'claude-haiku-4-5-20251001': 'gemini-2.5-flash-lite',
  'claude-3-5-haiku-20241022': 'gemini-2.5-flash-lite',
  'claude-3-haiku-20240307': 'gemini-2.5-flash-lite',
  'claude-sonnet-4-6': 'gemini-2.5-flash',
  'claude-sonnet-4-5-20250929': 'gemini-2.5-flash',
  'claude-sonnet-4-20250514': 'gemini-2.5-flash',
  'claude-opus-4-7': 'gemini-2.5-pro',
  'claude-opus-4-6': 'gemini-2.5-pro',
  'claude-opus-4-5-20251101': 'gemini-2.5-pro',
};

function isCheapTier(model: string): boolean {
  return /haiku/i.test(model);
}

function selectProvider(model: string): string {
  return isCheapTier(model) ? CHEAP_PROVIDER : PROVIDER;
}

// Haiku-tier routes to MiniMax-M2.7 (regular), NOT highspeed.
// Highspeed is a separate $40/mo "Plus-Highspeed" subscription tier that we
// don't have — Token Plan Plus ($20/mo) only covers MiniMax-M2.7 regular.
// Discovered 2026-05-23: every probe to MiniMax-M2.7-highspeed returns
// `429 (0/0 used)` because the cap is structurally zero on Plan Plus.
// To upgrade: see https://platform.minimax.io/docs/token-plan/intro
const MINIMAX_MODEL_MAP: Record<string, string> = {
  'claude-haiku-4-5': 'MiniMax-M2.7',
  'claude-haiku-4-5-20251001': 'MiniMax-M2.7',
  'claude-3-5-haiku-20241022': 'MiniMax-M2.7',
  'claude-3-haiku-20240307': 'MiniMax-M2.7',
  'claude-sonnet-4-6': 'MiniMax-M2.7',
  'claude-sonnet-4-5-20250929': 'MiniMax-M2.7',
  'claude-sonnet-4-20250514': 'MiniMax-M2.7',
  'claude-opus-4-7': 'MiniMax-M2.7',
  'claude-opus-4-6': 'MiniMax-M2.7',
  'claude-opus-4-5-20251101': 'MiniMax-M2.7',
};

export class LLMClient {
  private anthropic: Anthropic;

  constructor(opts: { apiKey?: string } = {}) {
    this.anthropic = new Anthropic({ apiKey: opts.apiKey || process.env.ANTHROPIC_API_KEY });
  }

  readonly messages = {
    create: async (params: MessageCreateParams): Promise<Message> => {
      const provider = selectProvider(params.model);
      if (provider === 'minimax') return this.createViaMinimax(params);
      if (provider === 'gemini') return this.createViaGemini(params);
      return (await this.anthropic.messages.create(params)) as Message;
    },
  };

  private async createViaGemini(params: MessageCreateParams): Promise<Message> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured (LLM_CHEAP_PROVIDER=gemini requires it)');
    }
    const geminiModel = GEMINI_MODEL_MAP[params.model] || 'gemini-2.5-flash-lite';

    // Lazy-load SDK so the adapter doesn't pay the import cost when Gemini isn't used.
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const { contents, systemInstruction } = anthropicParamsToGemini(params);
    const tools = anthropicToolsToGemini(params.tools);

    const config: Record<string, unknown> = {
      maxOutputTokens: params.max_tokens,
    };
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (params.temperature != null) config.temperature = params.temperature;
    if (tools) config.tools = [tools];

    const result = await ai.models.generateContent({
      model: geminiModel,
      contents,
      config,
    });

    return geminiResponseToAnthropic(result, geminiModel);
  }

  private async createViaMinimax(params: MessageCreateParams): Promise<Message> {
    if (!process.env.MINIMAX_API_KEY) {
      throw new Error('MINIMAX_API_KEY not configured (LLM_PROVIDER=minimax requires it)');
    }

    const minimaxModel = MINIMAX_MODEL_MAP[params.model] || 'MiniMax-M2.7';
    const openaiMessages = anthropicParamsToOpenAIMessages(params);
    const openaiTools = anthropicToolsToOpenAITools(params.tools);

    const body: Record<string, unknown> = {
      model: minimaxModel,
      messages: openaiMessages,
      max_tokens: params.max_tokens,
      reasoning_split: true, // <think> blocks go to reasoning_content, not content
    };
    if (openaiTools.length) body.tools = openaiTools;
    if (params.temperature != null) body.temperature = params.temperature;

    const res = await fetch(`${MINIMAX_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MiniMax ${res.status}: ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    return openAIResponseToAnthropic(data, minimaxModel);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REQUEST CONVERSION — Anthropic message shape → OpenAI message shape
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

function anthropicParamsToOpenAIMessages(params: MessageCreateParams): OpenAIMessage[] {
  const out: OpenAIMessage[] = [];

  // Anthropic system param can be string OR array of TextBlock objects (incl. cache_control)
  if (params.system) {
    const systemText = typeof params.system === 'string'
      ? params.system
      : params.system.map(b => b.text).join('\n');
    out.push({ role: 'system', content: systemText });
  }

  for (const msg of params.messages) {
    if (typeof msg.content === 'string') {
      out.push({ role: msg.role, content: msg.content });
      continue;
    }

    // msg.content is an array of content blocks
    if (msg.role === 'user') {
      const textParts: string[] = [];
      const toolResults: Array<{ id: string; content: string }> = [];
      for (const block of msg.content) {
        if (block.type === 'text') textParts.push(block.text);
        else if (block.type === 'tool_result') {
          const contentStr = typeof block.content === 'string'
            ? block.content
            : Array.isArray(block.content)
              ? block.content.map((b: any) => b.type === 'text' ? b.text : JSON.stringify(b)).join('\n')
              : JSON.stringify(block.content);
          toolResults.push({ id: block.tool_use_id, content: contentStr });
        }
      }
      // OpenAI: each tool_result is a separate 'tool' message; comes BEFORE any user text
      for (const tr of toolResults) {
        out.push({ role: 'tool', tool_call_id: tr.id, content: tr.content });
      }
      if (textParts.length) out.push({ role: 'user', content: textParts.join('\n') });
    } else {
      // assistant message — may have text + tool_use blocks
      const textParts: string[] = [];
      const toolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> = [];
      for (const block of msg.content) {
        if (block.type === 'text') textParts.push(block.text);
        else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: { name: block.name, arguments: JSON.stringify(block.input) },
          });
        }
      }
      const oai: OpenAIMessage = { role: 'assistant' };
      if (textParts.length) oai.content = textParts.join('\n');
      if (toolCalls.length) oai.tool_calls = toolCalls;
      out.push(oai);
    }
  }
  return out;
}

function anthropicToolsToOpenAITools(tools: MessageCreateParams['tools']): Array<{
  type: 'function';
  function: { name: string; description?: string; parameters: unknown };
}> {
  if (!tools || tools.length === 0) return [];
  return tools.map((t: any) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESPONSE CONVERSION — OpenAI completion shape → Anthropic Message shape
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function openAIResponseToAnthropic(data: any, model: string): Message {
  const choice = data.choices?.[0];
  const message = choice?.message || {};
  const content: any[] = [];

  if (message.content) {
    content.push({ type: 'text', text: String(message.content), citations: null });
  }

  if (Array.isArray(message.tool_calls)) {
    for (const tc of message.tool_calls) {
      let input: any = {};
      try {
        input = JSON.parse(tc.function?.arguments || '{}');
      } catch {
        input = { _raw_args: tc.function?.arguments || '' };
      }
      content.push({
        type: 'tool_use',
        id: tc.id || `toolu_${Math.random().toString(36).slice(2, 12)}`,
        name: tc.function?.name || '',
        input,
      });
    }
  }

  // Anthropic responses always have at least one content block
  if (content.length === 0) content.push({ type: 'text', text: '', citations: null });

  // Map OpenAI finish_reason → Anthropic stop_reason
  const fr = choice?.finish_reason;
  const stop_reason = fr === 'tool_calls' ? 'tool_use'
    : fr === 'stop' ? 'end_turn'
    : fr === 'length' ? 'max_tokens'
    : fr || 'end_turn';

  return {
    id: data.id || `msg_${Math.random().toString(36).slice(2, 12)}`,
    type: 'message',
    role: 'assistant',
    content,
    model,
    stop_reason: stop_reason as any,
    stop_sequence: null,
    usage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    } as any,
  } as Message;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GEMINI CONVERSION — Anthropic message shape ↔ Gemini Content/parts shape
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}
interface GeminiContent {
  role: 'user' | 'model' | 'function';
  parts: GeminiPart[];
}

function anthropicParamsToGemini(params: MessageCreateParams): {
  contents: GeminiContent[];
  systemInstruction: string | undefined;
} {
  // System instruction goes in config, not contents.
  let systemInstruction: string | undefined;
  if (params.system) {
    systemInstruction = typeof params.system === 'string'
      ? params.system
      : params.system.map(b => b.text).join('\n');
  }

  // Track tool_use_id → name so we can match tool_result back to its call,
  // since Gemini's functionResponse only references the tool by name.
  const toolUseIdToName = new Map<string, string>();
  for (const msg of params.messages) {
    if (typeof msg.content === 'string' || msg.role !== 'assistant') continue;
    for (const block of msg.content) {
      if (block.type === 'tool_use') toolUseIdToName.set(block.id, block.name);
    }
  }

  const contents: GeminiContent[] = [];
  for (const msg of params.messages) {
    if (typeof msg.content === 'string') {
      contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
      continue;
    }

    if (msg.role === 'user') {
      const textParts: string[] = [];
      const functionResponses: GeminiPart[] = [];
      for (const block of msg.content) {
        if (block.type === 'text') {
          textParts.push(block.text);
        } else if (block.type === 'tool_result') {
          const name = toolUseIdToName.get(block.tool_use_id) || 'unknown_tool';
          const contentStr = typeof block.content === 'string'
            ? block.content
            : Array.isArray(block.content)
              ? block.content.map((b: any) => b.type === 'text' ? b.text : JSON.stringify(b)).join('\n')
              : JSON.stringify(block.content);
          functionResponses.push({ functionResponse: { name, response: { result: contentStr } } });
        }
      }
      if (functionResponses.length) {
        contents.push({ role: 'function', parts: functionResponses });
      }
      if (textParts.length) {
        contents.push({ role: 'user', parts: [{ text: textParts.join('\n') }] });
      }
    } else {
      // assistant — convert to Gemini 'model' role with text + functionCall parts
      const parts: GeminiPart[] = [];
      for (const block of msg.content) {
        if (block.type === 'text') {
          parts.push({ text: block.text });
        } else if (block.type === 'tool_use') {
          parts.push({ functionCall: { name: block.name, args: (block.input as Record<string, unknown>) || {} } });
        }
      }
      if (parts.length) contents.push({ role: 'model', parts });
    }
  }

  return { contents, systemInstruction };
}

function anthropicToolsToGemini(tools: MessageCreateParams['tools']): {
  functionDeclarations: Array<{ name: string; description?: string; parameters: unknown }>;
} | null {
  if (!tools || tools.length === 0) return null;
  return {
    functionDeclarations: tools.map((t: any) => ({
      name: t.name,
      description: t.description,
      parameters: stripUnsupportedJsonSchemaFields(t.input_schema),
    })),
  };
}

// Gemini doesn't accept some JSON Schema fields that Anthropic does (e.g. additionalProperties,
// $schema, default). Strip them recursively so calls don't 400.
function stripUnsupportedJsonSchemaFields(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(stripUnsupportedJsonSchemaFields);
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'additionalProperties' || k === '$schema' || k === 'default') continue;
    out[k] = stripUnsupportedJsonSchemaFields(v);
  }
  return out;
}

function geminiResponseToAnthropic(result: any, model: string): Message {
  const candidate = result.candidates?.[0];
  const parts: any[] = candidate?.content?.parts || [];
  const content: any[] = [];

  for (const part of parts) {
    if (typeof part.text === 'string' && part.text.length > 0) {
      content.push({ type: 'text', text: part.text, citations: null });
    } else if (part.functionCall) {
      content.push({
        type: 'tool_use',
        id: `toolu_${Math.random().toString(36).slice(2, 14)}`,
        name: part.functionCall.name,
        input: part.functionCall.args || {},
      });
    }
  }

  if (content.length === 0) content.push({ type: 'text', text: '', citations: null });

  // Gemini finishReason: STOP | MAX_TOKENS | SAFETY | FUNCTION_CALL | RECITATION
  const fr = candidate?.finishReason;
  const hasToolUse = content.some(b => b.type === 'tool_use');
  const stop_reason = hasToolUse ? 'tool_use'
    : fr === 'MAX_TOKENS' ? 'max_tokens'
    : fr === 'STOP' ? 'end_turn'
    : 'end_turn';

  const usage = result.usageMetadata || {};
  return {
    id: `msg_${Math.random().toString(36).slice(2, 14)}`,
    type: 'message',
    role: 'assistant',
    content,
    model,
    stop_reason: stop_reason as any,
    stop_sequence: null,
    usage: {
      input_tokens: usage.promptTokenCount || 0,
      output_tokens: usage.candidatesTokenCount || 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    } as any,
  } as Message;
}

// Re-export Anthropic types so existing code can keep using them
export type { Message };
export { Anthropic };

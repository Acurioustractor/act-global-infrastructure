/**
 * LLM provider adapter for command-center.
 *
 * Drop-in shim around @anthropic-ai/sdk that routes to MiniMax when
 * LLM_PROVIDER=minimax. Existing call sites work unchanged — they import
 * `LLMClient` instead of `Anthropic`, but the .messages.create() API and
 * response shape (content blocks, stop_reason, usage) are identical.
 *
 * Why this exists:
 *   - Anthropic SDK calls /v1/messages with their own request/response shape.
 *   - MiniMax M2.7 exposes /v1/chat/completions with OpenAI-compatible shape
 *     but accepts Anthropic-style tool definitions input. Response is always
 *     OpenAI-shaped — we convert it back to Anthropic shape so downstream
 *     code (agent-loop, tool dispatchers) doesn't need to change.
 *   - Lets us flip provider with one env var, including instant rollback.
 *
 * Usage:
 *   import { LLMClient } from '@/lib/llm-adapter';
 *   const client = new LLMClient({ apiKey: '...' }); // apiKey ignored when LLM_PROVIDER=minimax
 *   const response = await client.messages.create({ model, max_tokens, system, tools, messages });
 *   // response.content[i].type === 'tool_use' | 'text', etc — same as Anthropic SDK
 */

import Anthropic from '@anthropic-ai/sdk';

type MessageCreateParams = Anthropic.Messages.MessageCreateParamsNonStreaming;
type Message = Anthropic.Messages.Message;

const PROVIDER = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1';

const MINIMAX_MODEL_MAP: Record<string, string> = {
  'claude-haiku-4-5': 'MiniMax-M2.7-highspeed',
  'claude-haiku-4-5-20251001': 'MiniMax-M2.7-highspeed',
  'claude-3-5-haiku-20241022': 'MiniMax-M2.7-highspeed',
  'claude-3-haiku-20240307': 'MiniMax-M2.7-highspeed',
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
      if (PROVIDER === 'minimax') {
        return this.createViaMinimax(params);
      }
      return (await this.anthropic.messages.create(params)) as Message;
    },
  };

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

// Re-export Anthropic types so existing code can keep using them
export type { Message };
export { Anthropic };

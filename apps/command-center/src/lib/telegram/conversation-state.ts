import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

const MAX_MESSAGE_ELEMENTS = 40 // ~10 tool-heavy exchanges
const MAX_TOOL_RESULT_LENGTH = 5000

/**
 * Truncate tool_result content blocks that exceed the size limit.
 * Mutates nothing — returns a new array.
 */
function truncateMessages(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  return messages.map((msg) => {
    if (!Array.isArray(msg.content)) return msg
    const content = (msg.content as Anthropic.ContentBlockParam[]).map((block) => {
      if (
        block.type === 'tool_result' &&
        typeof (block as Anthropic.ToolResultBlockParam).content === 'string' &&
        ((block as Anthropic.ToolResultBlockParam).content as string).length > MAX_TOOL_RESULT_LENGTH
      ) {
        return {
          ...block,
          content: ((block as Anthropic.ToolResultBlockParam).content as string).slice(0, MAX_TOOL_RESULT_LENGTH) + '\n…[truncated]',
        }
      }
      return block
    })
    return { ...msg, content }
  })
}

export async function loadConversation(chatId: number): Promise<Anthropic.MessageParam[]> {
  try {
    const { data, error } = await supabase
      .from('telegram_conversations')
      .select('messages')
      .eq('chat_id', chatId)
      .maybeSingle()

    if (error || !data?.messages) return []
    return data.messages as Anthropic.MessageParam[]
  } catch {
    return []
  }
}

export async function saveConversation(chatId: number, messages: Anthropic.MessageParam[]): Promise<void> {
  // Trim to rolling window
  let trimmed = messages
  while (trimmed.length > MAX_MESSAGE_ELEMENTS) {
    trimmed = trimmed.slice(1)
    // Ensure we don't start with an assistant message (Anthropic requires user-first)
    while (trimmed.length > 0 && trimmed[0].role === 'assistant') {
      trimmed = trimmed.slice(1)
    }
  }

  const truncated = truncateMessages(trimmed)

  try {
    await supabase.from('telegram_conversations').upsert(
      {
        chat_id: chatId,
        messages: truncated as unknown as Record<string, unknown>[],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'chat_id' }
    )
  } catch (err) {
    console.error('Failed to save conversation:', (err as Error).message)
  }
}

export async function clearConversation(chatId: number): Promise<void> {
  try {
    await supabase.from('telegram_conversations').delete().eq('chat_id', chatId)
  } catch (err) {
    console.error('Failed to clear conversation:', (err as Error).message)
  }
}

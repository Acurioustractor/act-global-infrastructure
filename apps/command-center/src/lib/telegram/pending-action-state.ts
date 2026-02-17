import { supabase } from '@/lib/supabase'

export interface SerializablePendingAction {
  type: 'draft_email' | 'create_calendar_event'
  params: Record<string, unknown>
}

export async function loadPendingAction(
  chatId: number
): Promise<{ description: string; action: SerializablePendingAction } | null> {
  try {
    const { data, error } = await supabase
      .from('telegram_pending_actions')
      .select('action_type, description, parameters, expires_at')
      .eq('chat_id', chatId)
      .maybeSingle()

    if (error || !data) return null

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      await clearPendingAction(chatId)
      return null
    }

    return {
      description: data.description,
      action: {
        type: data.action_type as SerializablePendingAction['type'],
        params: data.parameters as Record<string, unknown>,
      },
    }
  } catch {
    return null
  }
}

export async function savePendingAction(
  chatId: number,
  description: string,
  action: SerializablePendingAction
): Promise<void> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min TTL

  try {
    await supabase.from('telegram_pending_actions').upsert(
      {
        chat_id: chatId,
        action_type: action.type,
        description,
        parameters: action.params,
        expires_at: expiresAt,
      },
      { onConflict: 'chat_id' }
    )
  } catch (err) {
    console.error('Failed to save pending action:', (err as Error).message)
  }
}

export async function clearPendingAction(chatId: number): Promise<void> {
  try {
    await supabase.from('telegram_pending_actions').delete().eq('chat_id', chatId)
  } catch (err) {
    console.error('Failed to clear pending action:', (err as Error).message)
  }
}

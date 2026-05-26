// telegram_pending_actions table removed from DB — pending-action store is a
// no-op until a backend exists: save/clear do nothing, load returns null.

export interface SerializablePendingAction {
  type: 'draft_email' | 'create_calendar_event' | 'draft_grant_response'
  params: Record<string, unknown>
}

export async function loadPendingAction(
  _chatId: number
): Promise<{ description: string; action: SerializablePendingAction } | null> {
  return null
}

export async function savePendingAction(
  _chatId: number,
  _description: string,
  _action: SerializablePendingAction
): Promise<void> {
  // intentionally empty — no persistence layer available
}

export async function clearPendingAction(_chatId: number): Promise<void> {
  // intentionally empty — no persistence layer available
}

/**
 * Memory System
 *
 * Unified episodic, procedural, and working memory for the ACT agent.
 * Consolidates the separate memory modules from scripts/lib/.
 */

export class MemorySystem {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   */
  constructor(supabase) {
    this.supabase = supabase
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Episodic Memory (events, meetings, interactions)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Record an episode (event that happened).
   *
   * @param {object} episode
   * @param {string} episode.type - 'meeting' | 'decision' | 'interaction' | 'observation'
   * @param {string} episode.sourceId - ID of the source knowledge item
   * @param {string} episode.summary - Brief description
   * @param {string} [episode.projectCode] - Associated project
   * @param {object} [episode.metadata] - Additional context
   */
  async recordEpisode(episode) {
    const { error } = await this.supabase
      .from('episodic_memory')
      .insert({
        episode_type: episode.type,
        source_id: episode.sourceId,
        summary: episode.summary,
        project_code: episode.projectCode,
        metadata: episode.metadata || {},
        recorded_at: new Date().toISOString(),
      })

    if (error) {
      console.error('[MemorySystem] Failed to record episode:', error.message)
    }
  }

  /**
   * Get recent episodes for context.
   *
   * @param {object} [options]
   * @param {number} [options.hours] - Lookback window (default: 24)
   * @param {string} [options.projectCode] - Filter by project
   * @param {string} [options.type] - Filter by type
   * @param {number} [options.limit] - Max results (default: 20)
   * @returns {Promise<Array>}
   */
  async getRecentEpisodes(options = {}) {
    const { hours = 24, projectCode, type, limit = 20 } = options
    const cutoff = new Date(Date.now() - hours * 3_600_000).toISOString()

    let query = this.supabase
      .from('episodic_memory')
      .select('*')
      .gte('recorded_at', cutoff)
      .order('recorded_at', { ascending: false })
      .limit(limit)

    if (projectCode) query = query.eq('project_code', projectCode)
    if (type) query = query.eq('episode_type', type)

    const { data, error } = await query
    if (error) {
      console.error('[MemorySystem] Failed to get episodes:', error.message)
      return []
    }
    return data || []
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Procedural Memory (learned patterns, skills)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Store a learned procedure or pattern.
   *
   * @param {object} procedure
   * @param {string} procedure.name - Procedure name
   * @param {string} procedure.description - What was learned
   * @param {string} procedure.trigger - When to apply this
   * @param {string} procedure.action - What to do
   * @param {number} [procedure.confidence] - 0-1 confidence score
   */
  async learnProcedure(procedure) {
    const { error } = await this.supabase
      .from('procedural_memory')
      .upsert({
        name: procedure.name,
        description: procedure.description,
        trigger_pattern: procedure.trigger,
        action_template: procedure.action,
        confidence: procedure.confidence || 0.5,
        use_count: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'name' })

    if (error) {
      console.error('[MemorySystem] Failed to learn procedure:', error.message)
    }
  }

  /**
   * Find relevant procedures for a given context.
   *
   * @param {string} context - Context description to match against
   * @param {number} [limit] - Max results (default: 5)
   * @returns {Promise<Array>}
   */
  async findProcedures(context, limit = 5) {
    const { data, error } = await this.supabase
      .from('procedural_memory')
      .select('*')
      .order('confidence', { ascending: false })
      .limit(limit)

    if (error) return []

    // Simple keyword matching for now
    const contextWords = context.toLowerCase().split(/\s+/)
    return (data || []).filter(proc => {
      const triggerWords = (proc.trigger_pattern || '').toLowerCase().split(/\s+/)
      return triggerWords.some(w => contextWords.includes(w))
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Working Memory (active context, short-term)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Set a working memory item (expires after TTL).
   *
   * @param {string} key - Memory key
   * @param {any} value - Memory value
   * @param {number} [ttlMinutes] - Time to live (default: 60)
   */
  async setWorkingMemory(key, value, ttlMinutes = 60) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString()

    const { error } = await this.supabase
      .from('working_memory')
      .upsert({
        key,
        value: JSON.stringify(value),
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })

    if (error) {
      console.error('[MemorySystem] Failed to set working memory:', error.message)
    }
  }

  /**
   * Get a working memory item (returns null if expired).
   *
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async getWorkingMemory(key) {
    const { data, error } = await this.supabase
      .from('working_memory')
      .select('value, expires_at')
      .eq('key', key)
      .single()

    if (error || !data) return null
    if (new Date(data.expires_at) < new Date()) return null

    try {
      return JSON.parse(data.value)
    } catch {
      return data.value
    }
  }
}

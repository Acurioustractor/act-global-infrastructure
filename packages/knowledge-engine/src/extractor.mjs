/**
 * Knowledge Extractor
 *
 * Extracts structured knowledge (entities, relations, key phrases)
 * from unstructured text content.
 */

export class KnowledgeExtractor {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   * @param {object} [llm] - LLM client for AI-powered extraction
   */
  constructor(supabase, llm) {
    this.supabase = supabase
    this.llm = llm
  }

  /**
   * Extract structured knowledge from text.
   *
   * @param {string} content - Raw text content
   * @param {object} [options]
   * @param {string} [options.type] - Content type hint
   * @param {string} [options.projectCode] - Associated project
   * @returns {Promise<{ title: string, summary: string, entities: Array, relations: Array, keyPhrases: string[] }>}
   */
  async extract(content, options = {}) {
    // If LLM available, use AI extraction
    if (this.llm) {
      return this._extractWithLLM(content, options)
    }

    // Fallback: rule-based extraction
    return this._extractRuleBased(content, options)
  }

  /**
   * AI-powered extraction using LLM.
   * @private
   */
  async _extractWithLLM(content, options) {
    try {
      const response = await this.llm.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Extract structured knowledge from this ${options.type || 'text'}. Return JSON with: title, summary (1-2 sentences), entities (array of {name, type}), relations (array of {from, to, type}), keyPhrases (array of strings).

Content:
${content.slice(0, 4000)}`
        }],
      })

      const text = response.content[0]?.text || '{}'
      // Try to parse JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (err) {
      console.warn('[KnowledgeExtractor] LLM extraction failed, using rule-based:', err.message)
    }

    return this._extractRuleBased(content, options)
  }

  /**
   * Rule-based extraction (no LLM needed).
   * @private
   */
  _extractRuleBased(content, options) {
    const lines = content.split('\n').filter(l => l.trim())
    const title = lines[0]?.slice(0, 100) || 'Untitled'

    // Extract entities: capitalised phrases, email addresses, project codes
    const entities = []
    const seen = new Set()

    // Project codes (ACT-XX)
    const projectCodes = content.match(/ACT-[A-Z]{2}/g) || []
    for (const code of projectCodes) {
      if (!seen.has(code)) {
        entities.push({ name: code, type: 'project' })
        seen.add(code)
      }
    }

    // Email addresses
    const emails = content.match(/[\w.-]+@[\w.-]+\.\w+/g) || []
    for (const email of emails) {
      if (!seen.has(email)) {
        entities.push({ name: email, type: 'person' })
        seen.add(email)
      }
    }

    // Capitalised multi-word phrases (likely proper nouns)
    const properNouns = content.match(/(?:[A-Z][a-z]+\s){1,3}[A-Z][a-z]+/g) || []
    for (const noun of properNouns.slice(0, 10)) {
      const trimmed = noun.trim()
      if (!seen.has(trimmed) && trimmed.length > 3) {
        entities.push({ name: trimmed, type: 'entity' })
        seen.add(trimmed)
      }
    }

    // Extract key phrases: lines with action verbs or key indicators
    const keyPhrases = lines
      .filter(l => /\b(decided|agreed|action|deadline|important|critical|todo|next step)/i.test(l))
      .slice(0, 5)
      .map(l => l.trim().slice(0, 200))

    // Summary: first non-empty line or first 200 chars
    const summary = lines.slice(0, 2).join(' ').slice(0, 200)

    return {
      title,
      summary,
      entities,
      relations: [], // Rule-based doesn't extract relations
      keyPhrases,
    }
  }
}

/**
 * @act/knowledge-engine
 *
 * Unified knowledge management for the ACT ecosystem.
 * Consolidates knowledge-graph, knowledge-extractor, knowledge-aligner,
 * and memory systems (episodic, procedural, working) into a typed package.
 *
 * Usage:
 *   import { KnowledgeEngine } from '@act/knowledge-engine'
 *
 *   const engine = new KnowledgeEngine(supabase)
 *   await engine.ingest({ type: 'meeting', content: '...', projectCode: 'ACT-JH' })
 *   const results = await engine.search('justice reform funding')
 *   const graph = await engine.getGraph('ACT-JH')
 */

export { KnowledgeEngine } from './engine.mjs'
export { KnowledgeGraph } from './graph.mjs'
export { KnowledgeExtractor } from './extractor.mjs'
export { MemorySystem } from './memory.mjs'
export { KnowledgeSearch } from './search.mjs'

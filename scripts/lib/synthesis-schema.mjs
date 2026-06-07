/**
 * Output schema for ACT Alignment Loop synthesis documents.
 *
 * Each `synthesize-*` Phase-1 script emits a markdown file with YAML
 * frontmatter that includes `schema_version` and a flat `summary_metrics`
 * dict. The differ (Phase-2 task: diff-against-last-week) reads
 * `summary_metrics` to compute week-on-week movement on each headline
 * number without parsing markdown tables.
 *
 * Bump SCHEMA_VERSION when:
 *   - removing or renaming a metric key (existing diff state needs migration)
 *   - changing the semantics of a metric (e.g. switching dollar units)
 *
 * Adding a new optional metric is a non-breaking change — the differ should
 * tolerate keys appearing or disappearing as long as the version is the same.
 *
 * Plan: thoughts/shared/plans/act-alignment-loop.md (Phase-1 task ledger)
 */

export const SCHEMA_VERSION = 1

/**
 * Serialise a flat metrics dict into YAML frontmatter lines for a synthesis
 * document. Returns an array of strings (caller .joins with '\n').
 *
 * Only flat keys are emitted: numbers, strings, booleans. null/undefined are
 * skipped. Nested objects are intentionally rejected so the diff machinery
 * stays simple — push complexity into the per-item sidecar (v2) instead.
 */
export function serializeMetrics(metrics) {
  const lines = ['summary_metrics:']
  const keys = Object.keys(metrics).sort()
  for (const k of keys) {
    const v = metrics[k]
    if (v === null || v === undefined) continue
    if (typeof v === 'number') {
      lines.push(`  ${k}: ${v}`)
    } else if (typeof v === 'string') {
      lines.push(`  ${k}: ${JSON.stringify(v)}`)
    } else if (typeof v === 'boolean') {
      lines.push(`  ${k}: ${v}`)
    } else {
      throw new Error(`synthesis-schema: metric '${k}' has unsupported type ${typeof v}; only number/string/boolean allowed in v${SCHEMA_VERSION}`)
    }
  }
  return lines
}

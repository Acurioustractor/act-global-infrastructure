// Grant-radar exclusion for honest monetary roll-ups.
//
// The "Grants" pipeline in GHL is a GrantScope discovery dump (radar), not a
// set of worked deals. As of 2026-05-29 it held A$272.3M of the A$297.5M total
// opportunity value (235 open @ A$178.5M + 33 lost @ A$93.8M) — 91.5% of the
// headline. Summing it makes every aggregate money number a ~10x overstatement.
//
// Rule: exclude radar pipelines from any AGGREGATE roll-up (totals, headlines,
// forecasts). Grant-specific views (e.g. /grants/pipeline, the per-pipeline
// board columns) should still show grants — radar belongs in GrantScope, not in
// a "total pipeline value" number.
//
// See thoughts/shared/reviews/2026-05-29-act-ghl-crm-world-class-audit.md §6.

export const RADAR_PIPELINE_NAMES = ['Grants'] as const

export function isRadarPipeline(pipelineName?: string | null): boolean {
  if (!pipelineName) return false
  return (RADAR_PIPELINE_NAMES as readonly string[]).includes(pipelineName)
}

// Drop grant-radar opportunities for honest aggregate roll-ups.
// Rows must carry a `pipeline_name` field (select it in the query).
export function excludeRadar<T extends { pipeline_name?: string | null }>(rows: T[]): T[] {
  return rows.filter((r) => !isRadarPipeline(r.pipeline_name))
}

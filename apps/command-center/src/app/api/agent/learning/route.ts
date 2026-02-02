import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch learnings, mistakes, and calibration in parallel
    const [learningsRes, mistakesRes, calibrationRes] = await Promise.all([
      supabase
        .from('agent_learnings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('agent_mistake_patterns')
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(50),
      supabase
        .from('agent_confidence_calibration')
        .select('*')
        .order('calculated_at', { ascending: false })
        .limit(50),
    ])

    const learnings = (learningsRes.data || []).map(l => ({
      id: l.id,
      agent_id: l.agent_id,
      task_id: l.task_id,
      learning_type: l.learning_type,
      content: l.content,
      context: l.context,
      confidence: l.confidence,
      applied_count: l.applied_count,
      last_applied: l.last_applied,
      created_at: l.created_at,
    }))

    const mistakes = (mistakesRes.data || []).map(m => ({
      id: m.id,
      agent_id: m.agent_id,
      action_name: m.action_name,
      pattern_description: m.pattern_description,
      mistake_category: m.mistake_category,
      occurrence_count: m.occurrence_count,
      first_seen_at: m.first_seen_at,
      last_seen_at: m.last_seen_at,
      trigger_conditions: m.trigger_conditions,
      status: m.status,
      autonomy_adjustment: m.autonomy_adjustment,
      resolution_notes: m.resolution_notes,
      resolved_at: m.resolved_at,
    }))

    const calibration = (calibrationRes.data || []).map(c => ({
      id: c.id,
      agent_id: c.agent_id,
      action_name: c.action_name,
      calibration_window_days: c.calibration_window_days,
      total_actions: c.total_actions,
      mean_confidence: c.mean_confidence,
      mean_success_rate: c.mean_success_rate,
      calibration_error: c.calibration_error,
      overconfidence_rate: c.overconfidence_rate,
      underconfidence_rate: c.underconfidence_rate,
      confidence_adjustment: c.confidence_adjustment,
      calculated_at: c.calculated_at,
    }))

    return NextResponse.json({
      learnings,
      mistakes,
      calibration,
      stats: {
        totalLearnings: learnings.length,
        totalMistakes: mistakes.length,
        activeMistakes: mistakes.filter(m => m.status === 'active' || m.status === 'monitoring').length,
        resolvedMistakes: mistakes.filter(m => m.status === 'resolved').length,
        calibrationEntries: calibration.length,
        avgCalibrationError: calibration.length > 0
          ? Math.round(calibration.reduce((s, c) => s + (Number(c.calibration_error) || 0), 0) / calibration.length * 100) / 100
          : null,
      },
    })
  } catch (e) {
    console.error('Agent learning error:', e)
    return NextResponse.json({
      learnings: [],
      mistakes: [],
      calibration: [],
      stats: { totalLearnings: 0, totalMistakes: 0, activeMistakes: 0, resolvedMistakes: 0, calibrationEntries: 0, avgCalibrationError: null },
    })
  }
}

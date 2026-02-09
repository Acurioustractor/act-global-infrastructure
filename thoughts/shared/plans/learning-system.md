# Feature Plan: Agent Learning System

Created: 2026-01-30
Author: architect-agent

## Overview

A closed-loop learning system that records the outcomes of every agent action, feeds human corrections back into agent behavior, detects repeated mistake patterns, and dynamically adjusts autonomy levels based on each agent's track record. The system builds on the existing `AgentLearning` class, `agent_learnings` table, and memory subsystems (episodic, procedural, working) to create a genuine feedback loop where corrections today produce better decisions tomorrow.

## Requirements

- [ ] Every agent action (proposals, autonomous executions) gets an outcome recorded
- [ ] Human corrections (rejections, review_outcome=incorrect, modified proposals) create feedback records
- [ ] Repeated mistakes on the same action/context trigger automatic pattern alerts
- [ ] Agent confidence thresholds auto-calibrate based on approval/rejection history
- [ ] Autonomy levels adjust dynamically: good track record promotes, poor track record demotes
- [ ] Corrections feed into procedural memory so agents avoid repeating mistakes
- [ ] Integration with episodic memory to record "learning episodes"
- [ ] All learning is auditable and reversible

## Design

### Architecture

```
Human Correction / Outcome
        |
        v
+-------------------+
| Outcome Tracker   |  <-- Records success/failure/correction for every action
+-------------------+
        |
        v
+-------------------+
| Feedback Ingestor |  <-- Normalizes corrections into feedback_records
+-------------------+
        |
   +----+----+
   |         |
   v         v
+--------+ +--------------------+
| Pattern| | Confidence         |
| Detector | Calibrator         |
+--------+ +--------------------+
   |         |
   v         v
+-------------------+
| Autonomy Adjuster |  <-- Promotes/demotes autonomy_level on agent_actions
+-------------------+
        |
        v
+-------------------+       +---------------------+
| Procedural Memory | <---> | Episodic Memory     |
| (correction rules)|       | (learning episodes) |
+-------------------+       +---------------------+
```

### Data Flow

1. Agent executes action (proposal or autonomous)
2. **Outcome Tracker** records final state: `completed`, `failed`, `rejected`, `corrected`
3. If human corrected or rejected, **Feedback Ingestor** creates a `feedback_record`
4. **Pattern Detector** runs periodically, looking for 3+ similar feedback records on same action/context
5. **Confidence Calibrator** compares agent's stated confidence vs actual outcomes to detect over/under-confidence
6. **Autonomy Adjuster** checks per-action track records against thresholds and promotes or demotes
7. Corrections are stored as procedural memory rules that agents consult before acting
8. Each learning cycle is recorded as an episodic memory "learning journey"

### Key Interfaces

```javascript
// New: OutcomeTracker - added to AgenticWorkflow
class AgenticWorkflow {
  // EXISTING methods enhanced:
  async executeApproved(proposalId, executeFn) {
    // ... existing code ...
    // NEW: after execution, record outcome
    await this.recordOutcome(proposalId, { success, result, error: errorMsg, duration });
  }

  async executeAutonomous(task) {
    // ... existing code ...
    // NEW: after execution, record outcome
    await this.recordOutcome(null, { executionId: data?.id, success, result, error: errorMsg });
  }

  // NEW methods:
  async recordOutcome(proposalId, outcome) { /* ... */ }
  async recordCorrection(actionRef, correction) { /* ... */ }
  async consultLearnings(action, params) { /* ... */ }
  async runLearningCycle() { /* delegates to AgentLearning */ }
}

// Enhanced: AgentLearning
class AgentLearning {
  // EXISTING methods kept as-is

  // NEW methods:
  async detectRepeatedMistakes(windowDays) { /* ... */ }
  async calibrateConfidence() { /* ... */ }
  async adjustAutonomy() { /* ... */ }
  async getCorrections(actionName, limit) { /* ... */ }
  async createCorrectionRule(feedbackRecordId) { /* ... */ }
}
```

## Database Schema Additions

### Table: `agent_feedback_records`

The core new table. Each record represents one piece of human feedback about an agent action.

```sql
CREATE TABLE IF NOT EXISTS agent_feedback_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was corrected?
  agent_id TEXT NOT NULL,
  action_name TEXT NOT NULL,
  
  -- Reference to the original action
  proposal_id UUID REFERENCES agent_proposals(id),
  execution_id UUID REFERENCES autonomous_executions(id),
  
  -- What kind of feedback?
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'rejection',          -- Proposal was rejected
    'correction',         -- Human modified the proposed action
    'review_incorrect',   -- Autonomous execution reviewed as incorrect
    'review_correct',     -- Autonomous execution reviewed as correct (positive signal)
    'outcome_failure',    -- Execution completed but produced wrong result
    'manual_override'     -- Human manually did something different
  )),
  
  -- The feedback itself
  original_action JSONB,        -- What the agent proposed/did
  corrected_action JSONB,       -- What the human did instead (if applicable)
  correction_delta JSONB,       -- Diff between original and corrected
  human_explanation TEXT,        -- Why the correction was made (from review_notes)
  
  -- Context at time of action
  agent_confidence DECIMAL(3,2),  -- Agent's stated confidence
  action_context JSONB,           -- Trigger, params, reasoning
  
  -- Categorization (filled by pattern detector)
  mistake_category TEXT,          -- e.g., 'wrong_target', 'bad_timing', 'exceeded_scope'
  pattern_id UUID,                -- Links to detected pattern if part of one
  
  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  correction_rule_id UUID,        -- If a procedural rule was created from this
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_agent_action ON agent_feedback_records(agent_id, action_name);
CREATE INDEX idx_feedback_type ON agent_feedback_records(feedback_type);
CREATE INDEX idx_feedback_unprocessed ON agent_feedback_records(processed) WHERE processed = FALSE;
CREATE INDEX idx_feedback_created ON agent_feedback_records(created_at DESC);
```

### Table: `agent_mistake_patterns`

Detected patterns of repeated mistakes.

```sql
CREATE TABLE IF NOT EXISTS agent_mistake_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  agent_id TEXT NOT NULL,
  action_name TEXT NOT NULL,
  
  -- Pattern description
  pattern_description TEXT NOT NULL,
  mistake_category TEXT NOT NULL,
  
  -- Evidence
  feedback_record_ids UUID[] NOT NULL,   -- References to the feedback records
  occurrence_count INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  
  -- What context triggers this mistake?
  trigger_conditions JSONB,  -- e.g., {"trigger": "scheduled", "time_of_day": "morning"}
  
  -- Resolution
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active',      -- Still happening
    'mitigated',   -- Correction rule in place
    'resolved',    -- No longer occurring
    'dismissed'    -- Human decided it's acceptable
  )),
  
  -- What was done about it?
  correction_rule_id UUID,    -- Procedural memory rule created to prevent this
  autonomy_adjustment JSONB,  -- If autonomy level was changed
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_agent_action ON agent_mistake_patterns(agent_id, action_name);
CREATE INDEX idx_patterns_active ON agent_mistake_patterns(status) WHERE status = 'active';
```

### Table: `agent_confidence_calibration`

Tracks how well each agent's confidence predicts actual outcomes.

```sql
CREATE TABLE IF NOT EXISTS agent_confidence_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  agent_id TEXT NOT NULL,
  action_name TEXT,              -- NULL = overall calibration
  
  -- Calibration metrics
  calibration_window_days INTEGER NOT NULL DEFAULT 30,
  total_actions INTEGER NOT NULL,
  
  -- Confidence buckets (how many actions in each confidence range, and their actual success rate)
  -- e.g., {"0.9-1.0": {"count": 20, "success_rate": 0.95}, "0.7-0.9": {"count": 15, "success_rate": 0.80}}
  calibration_buckets JSONB NOT NULL,
  
  -- Summary metrics
  mean_confidence DECIMAL(3,2),
  mean_success_rate DECIMAL(3,2),
  calibration_error DECIMAL(4,3),     -- ECE (Expected Calibration Error)
  overconfidence_rate DECIMAL(3,2),   -- % of actions where confidence > actual success
  underconfidence_rate DECIMAL(3,2),  -- % of actions where confidence < actual success
  
  -- Recommendation
  confidence_adjustment DECIMAL(4,3), -- Suggested offset: negative = lower confidence, positive = raise
  
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calibration_agent ON agent_confidence_calibration(agent_id, calculated_at DESC);
```

### Table: `agent_autonomy_transitions`

Audit log of autonomy level changes.

```sql
CREATE TABLE IF NOT EXISTS agent_autonomy_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  action_name TEXT NOT NULL,
  agent_id TEXT NOT NULL,       -- Which agent triggered the evaluation
  
  -- What changed?
  previous_level INTEGER NOT NULL,
  new_level INTEGER NOT NULL,
  
  -- Why?
  reason TEXT NOT NULL,
  evidence JSONB NOT NULL,      -- Metrics that justified the change
  -- e.g., {"success_rate": 0.97, "sample_size": 50, "consecutive_successes": 20}
  
  -- Who approved? (autonomy changes always need human approval)
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected', 'applied')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_autonomy_transitions_action ON agent_autonomy_transitions(action_name, created_at DESC);
```

### New SQL Functions

```sql
-- Record feedback from a rejection
CREATE OR REPLACE FUNCTION record_rejection_feedback()
RETURNS TRIGGER AS $$
BEGIN
  -- When a proposal transitions to 'rejected', auto-create feedback record
  IF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    INSERT INTO agent_feedback_records (
      agent_id, action_name, proposal_id, feedback_type,
      original_action, human_explanation, agent_confidence, action_context
    ) VALUES (
      NEW.agent_id,
      NEW.action_name,
      NEW.id,
      'rejection',
      NEW.proposed_action,
      NEW.review_notes,
      (NEW.reasoning->>'confidence')::DECIMAL,
      NEW.reasoning
    );
  END IF;
  
  -- When a proposal is modified, record the correction
  IF OLD.status = 'pending' AND NEW.status = 'modified' AND NEW.modified_action IS NOT NULL THEN
    INSERT INTO agent_feedback_records (
      agent_id, action_name, proposal_id, feedback_type,
      original_action, corrected_action, human_explanation,
      agent_confidence, action_context
    ) VALUES (
      NEW.agent_id,
      NEW.action_name,
      NEW.id,
      'correction',
      NEW.proposed_action,
      NEW.modified_action,
      NEW.review_notes,
      (NEW.reasoning->>'confidence')::DECIMAL,
      NEW.reasoning
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_record_proposal_feedback
  AFTER UPDATE ON agent_proposals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION record_rejection_feedback();

-- Record feedback from autonomous execution review
CREATE OR REPLACE FUNCTION record_execution_review_feedback()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.review_outcome IS NOT NULL AND OLD.review_outcome IS NULL THEN
    INSERT INTO agent_feedback_records (
      agent_id, action_name, execution_id, feedback_type,
      original_action, agent_confidence, action_context
    ) VALUES (
      NEW.agent_id,
      NEW.action_name,
      NEW.id,
      CASE NEW.review_outcome
        WHEN 'correct' THEN 'review_correct'
        WHEN 'incorrect' THEN 'review_incorrect'
        ELSE 'review_incorrect'
      END,
      NEW.action_params,
      NEW.confidence,
      NEW.reasoning
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_record_execution_feedback
  AFTER UPDATE ON autonomous_executions
  FOR EACH ROW
  WHEN (OLD.review_outcome IS DISTINCT FROM NEW.review_outcome)
  EXECUTE FUNCTION record_execution_review_feedback();

-- Detect repeated mistakes for an agent
CREATE OR REPLACE FUNCTION detect_repeated_mistakes(
  p_agent_id TEXT,
  p_min_occurrences INTEGER DEFAULT 3,
  p_window_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  action_name TEXT,
  mistake_category TEXT,
  occurrence_count BIGINT,
  avg_confidence DECIMAL,
  feedback_ids UUID[],
  common_explanation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.action_name,
    COALESCE(f.mistake_category, f.feedback_type) as mistake_category,
    COUNT(*) as occurrence_count,
    AVG(f.agent_confidence)::DECIMAL as avg_confidence,
    array_agg(f.id) as feedback_ids,
    MODE() WITHIN GROUP (ORDER BY f.human_explanation) as common_explanation
  FROM agent_feedback_records f
  WHERE f.agent_id = p_agent_id
    AND f.feedback_type IN ('rejection', 'correction', 'review_incorrect', 'outcome_failure')
    AND f.created_at > NOW() - (p_window_days || ' days')::INTERVAL
  GROUP BY f.action_name, COALESCE(f.mistake_category, f.feedback_type)
  HAVING COUNT(*) >= p_min_occurrences
  ORDER BY occurrence_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Calculate calibration error for an agent
CREATE OR REPLACE FUNCTION calculate_calibration(
  p_agent_id TEXT,
  p_window_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  bucket TEXT,
  action_count BIGINT,
  avg_confidence DECIMAL,
  actual_success_rate DECIMAL,
  calibration_gap DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH actions AS (
    -- Combine proposals and autonomous executions
    SELECT
      (p.reasoning->>'confidence')::DECIMAL as confidence,
      CASE WHEN p.status = 'completed' THEN TRUE
           WHEN p.status IN ('rejected', 'failed') THEN FALSE
           ELSE NULL END as success
    FROM agent_proposals p
    WHERE p.agent_id = p_agent_id
      AND p.status IN ('completed', 'rejected', 'failed')
      AND p.created_at > NOW() - (p_window_days || ' days')::INTERVAL
    
    UNION ALL
    
    SELECT
      e.confidence,
      CASE WHEN e.review_outcome = 'correct' THEN TRUE
           WHEN e.review_outcome = 'incorrect' THEN FALSE
           WHEN e.success = TRUE AND e.review_outcome IS NULL THEN TRUE
           ELSE FALSE END as success
    FROM autonomous_executions e
    WHERE e.agent_id = p_agent_id
      AND e.created_at > NOW() - (p_window_days || ' days')::INTERVAL
  ),
  bucketed AS (
    SELECT
      CASE
        WHEN confidence >= 0.9 THEN '0.9-1.0'
        WHEN confidence >= 0.7 THEN '0.7-0.9'
        WHEN confidence >= 0.5 THEN '0.5-0.7'
        ELSE '0.0-0.5'
      END as bucket,
      confidence,
      success
    FROM actions
    WHERE success IS NOT NULL AND confidence IS NOT NULL
  )
  SELECT
    b.bucket,
    COUNT(*) as action_count,
    AVG(b.confidence)::DECIMAL as avg_confidence,
    (COUNT(*) FILTER (WHERE b.success = TRUE))::DECIMAL / NULLIF(COUNT(*), 0) as actual_success_rate,
    (AVG(b.confidence) - (COUNT(*) FILTER (WHERE b.success = TRUE))::DECIMAL / NULLIF(COUNT(*), 0))::DECIMAL as calibration_gap
  FROM bucketed b
  GROUP BY b.bucket
  ORDER BY b.bucket DESC;
END;
$$ LANGUAGE plpgsql;

-- Evaluate whether an action's autonomy level should change
CREATE OR REPLACE FUNCTION evaluate_autonomy_change(
  p_action_name TEXT,
  p_window_days INTEGER DEFAULT 60
)
RETURNS TABLE (
  current_level INTEGER,
  recommended_level INTEGER,
  success_rate DECIMAL,
  sample_size BIGINT,
  rejection_rate DECIMAL,
  reason TEXT
) AS $$
DECLARE
  v_current_level INTEGER;
  v_success DECIMAL;
  v_rejection DECIMAL;
  v_sample BIGINT;
  v_recommend INTEGER;
  v_reason TEXT;
BEGIN
  SELECT autonomy_level INTO v_current_level
  FROM agent_actions WHERE action_name = p_action_name;

  -- Calculate combined success metrics
  SELECT
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') /
      NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0), 2),
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'rejected') /
      NULLIF(COUNT(*) FILTER (WHERE status IN ('approved', 'rejected', 'completed')), 0), 2),
    COUNT(*)
  INTO v_success, v_rejection, v_sample
  FROM agent_proposals
  WHERE action_name = p_action_name
    AND created_at > NOW() - (p_window_days || ' days')::INTERVAL;

  -- Default: no change
  v_recommend := v_current_level;
  v_reason := 'No change recommended';

  -- Promotion criteria: >95% success, <5% rejection, >20 samples
  IF v_success > 95 AND COALESCE(v_rejection, 0) < 5 AND v_sample > 20 THEN
    IF v_current_level < 3 THEN
      v_recommend := v_current_level + 1;
      v_reason := format('Excellent track record: %s%% success, %s%% rejection over %s actions',
        v_success, v_rejection, v_sample);
    END IF;
  -- Demotion criteria: <80% success OR >20% rejection
  ELSIF (v_success IS NOT NULL AND v_success < 80) OR (v_rejection IS NOT NULL AND v_rejection > 20) THEN
    IF v_current_level > 1 THEN
      v_recommend := v_current_level - 1;
      v_reason := format('Poor track record: %s%% success, %s%% rejection over %s actions',
        v_success, v_rejection, v_sample);
    END IF;
  END IF;

  RETURN QUERY SELECT v_current_level, v_recommend, v_success, v_sample, v_rejection, v_reason;
END;
$$ LANGUAGE plpgsql;
```

## Implementation Phases

### Phase 1: Foundation -- Outcome Recording & Feedback Capture

**Files to create:**
- `supabase/migrations/20260201000000_learning_system.sql` -- New tables, triggers, functions

**Files to modify:**
- `scripts/lib/agentic-workflow.mjs` -- Add `recordOutcome()` method, enhance `executeApproved()` and `executeAutonomous()` to call it

**What this does:**
The database triggers on `agent_proposals` and `autonomous_executions` automatically create `agent_feedback_records` whenever a rejection, correction, or review happens. This is passive -- no code changes needed beyond the triggers. The `recordOutcome()` method on `AgenticWorkflow` is a convenience wrapper for explicit outcome recording.

**Acceptance:**
- [ ] Rejecting a proposal auto-creates a feedback_record
- [ ] Modifying a proposal auto-creates a feedback_record with correction delta
- [ ] Reviewing an autonomous execution as "incorrect" auto-creates a feedback_record
- [ ] Reviewing as "correct" creates a positive feedback_record

**Estimated effort:** Small (1-2 hours)

### Phase 2: Pattern Detection

**Files to modify:**
- `scripts/lib/agent-learning.mjs` -- Add `detectRepeatedMistakes()` and `createMistakePattern()` methods

**What this does:**
The `detectRepeatedMistakes()` method queries `agent_feedback_records` to find clusters of negative feedback on the same (agent, action, context) triple. When 3+ similar mistakes are found, it creates an `agent_mistake_patterns` record and stores a learning. This runs as part of `runLearningCycle()`.

**Implementation detail:**

```javascript
// In AgentLearning class
async detectRepeatedMistakes(windowDays = null) {
  const days = windowDays || this.options.timeWindowDays;
  
  const { data, error } = await this.supabase.rpc('detect_repeated_mistakes', {
    p_agent_id: this.agentId,
    p_min_occurrences: 3,
    p_window_days: days
  });

  if (error || !data) return [];

  const patterns = [];
  for (const row of data) {
    // Check if pattern already exists
    const { data: existing } = await this.supabase
      .from('agent_mistake_patterns')
      .select('id, occurrence_count')
      .eq('agent_id', this.agentId)
      .eq('action_name', row.action_name)
      .eq('mistake_category', row.mistake_category)
      .eq('status', 'active')
      .single();

    if (existing) {
      // Update existing pattern
      await this.supabase
        .from('agent_mistake_patterns')
        .update({
          occurrence_count: row.occurrence_count,
          last_seen_at: new Date().toISOString(),
          feedback_record_ids: row.feedback_ids
        })
        .eq('id', existing.id);
      patterns.push({ ...existing, updated: true });
    } else {
      // Create new pattern
      const { data: pattern } = await this.supabase
        .from('agent_mistake_patterns')
        .insert({
          agent_id: this.agentId,
          action_name: row.action_name,
          pattern_description: `Repeated ${row.mistake_category} on ${row.action_name}: ${row.common_explanation || 'no explanation'}`,
          mistake_category: row.mistake_category,
          feedback_record_ids: row.feedback_ids,
          occurrence_count: row.occurrence_count,
          first_seen_at: new Date(Date.now() - days * 86400000).toISOString(),
          last_seen_at: new Date().toISOString()
        })
        .select()
        .single();
      patterns.push(pattern);
    }
  }

  return patterns;
}
```

**Dependencies:** Phase 1

**Acceptance:**
- [ ] 3+ rejections on same action creates a mistake pattern
- [ ] Pattern links back to all contributing feedback records
- [ ] Existing patterns get updated (not duplicated) on subsequent runs

**Estimated effort:** Medium (2-3 hours)

### Phase 3: Confidence Calibration

**Files to modify:**
- `scripts/lib/agent-learning.mjs` -- Add `calibrateConfidence()` method

**What this does:**
Compares agent's stated confidence against actual outcomes to compute Expected Calibration Error (ECE). If an agent consistently says "90% confident" but only succeeds 70% of the time, the system detects overconfidence and suggests an adjustment. Results stored in `agent_confidence_calibration`.

**Implementation detail:**

```javascript
async calibrateConfidence() {
  const { data, error } = await this.supabase.rpc('calculate_calibration', {
    p_agent_id: this.agentId,
    p_window_days: this.options.timeWindowDays
  });

  if (error || !data || data.length === 0) return null;

  // Calculate overall ECE
  const totalActions = data.reduce((s, b) => s + parseInt(b.action_count), 0);
  const ece = data.reduce((s, b) => {
    const weight = parseInt(b.action_count) / totalActions;
    return s + weight * Math.abs(parseFloat(b.calibration_gap) || 0);
  }, 0);

  const buckets = {};
  data.forEach(b => {
    buckets[b.bucket] = {
      count: parseInt(b.action_count),
      avg_confidence: parseFloat(b.avg_confidence),
      actual_success_rate: parseFloat(b.actual_success_rate),
      gap: parseFloat(b.calibration_gap)
    };
  });

  // Determine adjustment direction
  const overconfident = data.filter(b => parseFloat(b.calibration_gap) > 0.1);
  const underconfident = data.filter(b => parseFloat(b.calibration_gap) < -0.1);
  const adjustment = ece > 0.1
    ? (overconfident.length > underconfident.length ? -ece : ece)
    : 0;

  // Store calibration record
  await this.supabase.from('agent_confidence_calibration').insert({
    agent_id: this.agentId,
    calibration_window_days: this.options.timeWindowDays,
    total_actions: totalActions,
    calibration_buckets: buckets,
    mean_confidence: data.reduce((s, b) => s + parseFloat(b.avg_confidence) * parseInt(b.action_count), 0) / totalActions,
    mean_success_rate: data.reduce((s, b) => s + parseFloat(b.actual_success_rate || 0) * parseInt(b.action_count), 0) / totalActions,
    calibration_error: ece,
    overconfidence_rate: overconfident.length / data.length,
    underconfidence_rate: underconfident.length / data.length,
    confidence_adjustment: adjustment
  });

  return { ece, adjustment, buckets, totalActions };
}
```

**Dependencies:** Phase 1

**Acceptance:**
- [ ] Calibration runs and produces ECE score
- [ ] Overconfidence detected when stated confidence >> actual success
- [ ] Calibration records stored for historical tracking

**Estimated effort:** Medium (2-3 hours)

### Phase 4: Autonomy Adjustment

**Files to modify:**
- `scripts/lib/agent-learning.mjs` -- Add `evaluateAutonomyAdjustments()` method
- `scripts/lib/agentic-workflow.mjs` -- Add `consultLearnings()` called in `execute()` before routing

**What this does:**
Evaluates each action's track record and proposes autonomy level changes. Changes are NEVER applied automatically -- they create `agent_autonomy_transitions` records that require human approval. The `consultLearnings()` method in `AgenticWorkflow` checks for active mistake patterns and calibration adjustments before executing, potentially modifying confidence or requiring additional approval.

**Implementation detail for consultLearnings:**

```javascript
// In AgenticWorkflow class, called in execute() before routing
async consultLearnings(action, params, confidence) {
  const adjustments = { confidence, warnings: [], blocked: false };

  try {
    // 1. Check for active mistake patterns on this action
    const { data: patterns } = await supabase
      .from('agent_mistake_patterns')
      .select('*')
      .eq('agent_id', this.agentId)
      .eq('action_name', action)
      .eq('status', 'active');

    if (patterns && patterns.length > 0) {
      adjustments.warnings.push(
        `Active mistake pattern: "${patterns[0].pattern_description}" (${patterns[0].occurrence_count} occurrences)`
      );
      // Reduce confidence for actions with known mistake patterns
      adjustments.confidence = Math.max(0.3, confidence - 0.15);
    }

    // 2. Check latest calibration adjustment
    const { data: calibration } = await supabase
      .from('agent_confidence_calibration')
      .select('confidence_adjustment, calibration_error')
      .eq('agent_id', this.agentId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (calibration && Math.abs(calibration.confidence_adjustment) > 0.05) {
      adjustments.confidence = Math.max(0.1, Math.min(1.0,
        adjustments.confidence + calibration.confidence_adjustment
      ));
      adjustments.warnings.push(
        `Calibration adjustment: ${calibration.confidence_adjustment > 0 ? '+' : ''}${calibration.confidence_adjustment.toFixed(2)} (ECE: ${calibration.calibration_error.toFixed(3)})`
      );
    }

    // 3. Check for relevant correction rules in procedural memory
    const pm = new ProceduralMemory({ verbose: this.verbose });
    const procedures = await pm.findApplicableProcedures({
      trigger: `correction_rule_${action}`,
      agentId: this.agentId
    });
    if (procedures.length > 0) {
      adjustments.warnings.push(
        `Correction rule active: "${procedures[0].procedure_name}"`
      );
    }
  } catch (err) {
    // Non-critical: proceed without learning consultation
  }

  return adjustments;
}
```

**Modified execute() flow:**

```javascript
async execute(task) {
  const actionDetails = await this.getAction(task.action);
  // ... existing working memory init ...

  // NEW: Consult learnings before acting
  const learnings = await this.consultLearnings(
    task.action,
    task.params,
    task.reasoning?.confidence || 0.8
  );

  // Log warnings
  if (learnings.warnings.length > 0 && this.verbose) {
    console.log(`Learning warnings for ${task.action}:`);
    learnings.warnings.forEach(w => console.log(`  - ${w}`));
  }

  // Override confidence with calibrated value
  if (task.reasoning) {
    task.reasoning.original_confidence = task.reasoning.confidence;
    task.reasoning.confidence = learnings.confidence;
    task.reasoning.learning_warnings = learnings.warnings;
  }

  // ... rest of existing execute() logic (bounds check, routing) ...
}
```

**Dependencies:** Phase 2, Phase 3

**Acceptance:**
- [ ] Actions with active mistake patterns get confidence reduced
- [ ] Calibration adjustments modify effective confidence
- [ ] Autonomy promotion requires >95% success over >20 samples
- [ ] Autonomy demotion triggers at <80% success or >20% rejection
- [ ] All autonomy changes require human approval

**Estimated effort:** Medium (3-4 hours)

### Phase 5: Memory Integration & Correction Rules

**Files to modify:**
- `scripts/lib/agent-learning.mjs` -- Add `createCorrectionRule()` that stores rules in procedural memory
- `scripts/lib/procedural-memory.mjs` -- No changes needed (existing API sufficient)
- `scripts/lib/episodic-memory.mjs` -- No changes needed (existing API sufficient)

**What this does:**
When a mistake pattern is detected, the system creates a procedural memory "correction rule" -- a procedure that agents consult before executing an action where mistakes have occurred. Learning cycles are wrapped in episodic memory episodes to track the learning journey over time.

**Implementation detail:**

```javascript
// In AgentLearning class
async createCorrectionRule(patternId) {
  const { data: pattern } = await this.supabase
    .from('agent_mistake_patterns')
    .select('*')
    .eq('id', patternId)
    .single();

  if (!pattern) throw new Error(`Pattern not found: ${patternId}`);

  // Get the feedback records to understand what went wrong
  const { data: feedbacks } = await this.supabase
    .from('agent_feedback_records')
    .select('*')
    .in('id', pattern.feedback_record_ids);

  // Extract common correction pattern
  const corrections = (feedbacks || []).filter(f => f.corrected_action);
  const explanations = (feedbacks || []).filter(f => f.human_explanation).map(f => f.human_explanation);

  const pm = new ProceduralMemory({ verbose: this.options.verbose });
  const rule = await pm.createProcedure(
    `correction_rule_${pattern.action_name}_${pattern.mistake_category}`,
    this.agentId,
    {
      description: `Correction rule for: ${pattern.pattern_description}`,
      steps: [
        {
          step: 1,
          action: 'check_precondition',
          description: `Before executing ${pattern.action_name}, verify: ${explanations[0] || 'check past mistakes'}`,
          params_template: { check: pattern.trigger_conditions }
        },
        {
          step: 2,
          action: 'apply_correction',
          description: corrections.length > 0
            ? `Apply known correction: use corrected parameters instead of original`
            : `Flag for human review due to repeated mistakes`,
          params_template: corrections[0]?.corrected_action || { require_review: true }
        }
      ],
      preconditions: {
        trigger: `correction_rule_${pattern.action_name}`,
        agent_id: this.agentId,
        action: pattern.action_name
      },
      status: 'active'
    }
  );

  // Update the pattern with the correction rule reference
  await this.supabase
    .from('agent_mistake_patterns')
    .update({
      correction_rule_id: rule.id,
      status: 'mitigated'
    })
    .eq('id', patternId);

  return rule;
}
```

**Episodic memory integration in runLearningCycle:**

```javascript
async runLearningCycle() {
  const em = new EpisodicMemory({ verbose: this.options.verbose });

  // Create a learning episode
  const episode = await em.createEpisode(
    `Learning cycle: ${this.agentId} @ ${new Date().toISOString()}`,
    'learning_journey',
    { summary: `Periodic learning analysis for agent ${this.agentId}` }
  );

  // ... existing learning cycle steps ...

  // NEW: Detect repeated mistakes
  const mistakes = await this.detectRepeatedMistakes();
  for (const pattern of mistakes) {
    await em.addEventToEpisode(episode.id, {
      event_type: 'mistake_pattern_detected',
      description: `Pattern: ${pattern.pattern_description || pattern.action_name} (${pattern.occurrence_count} times)`
    });

    // Auto-create correction rules for new patterns
    if (!pattern.updated && !pattern.correction_rule_id) {
      const rule = await this.createCorrectionRule(pattern.id);
      await em.addEventToEpisode(episode.id, {
        event_type: 'correction_rule_created',
        description: `Created correction rule: ${rule.procedure_name}`
      });
    }
  }

  // NEW: Run calibration
  const calibration = await this.calibrateConfidence();
  if (calibration) {
    await em.addEventToEpisode(episode.id, {
      event_type: 'calibration_complete',
      description: `ECE: ${calibration.ece.toFixed(3)}, Adjustment: ${calibration.adjustment.toFixed(3)}`
    });
  }

  // NEW: Evaluate autonomy adjustments
  const autonomyChanges = await this.evaluateAutonomyAdjustments();
  for (const change of autonomyChanges) {
    await em.addEventToEpisode(episode.id, {
      event_type: 'autonomy_evaluation',
      description: `${change.action_name}: Level ${change.current_level} -> ${change.recommended_level} (${change.reason})`
    });
  }

  // Close the episode
  const outcomeText = `Generated ${results.learnings.length} learnings, detected ${mistakes.length} patterns`;
  await em.closeEpisode(episode.id, outcomeText, [
    `${mistakes.length} mistake patterns detected`,
    calibration ? `Calibration error: ${calibration.ece.toFixed(3)}` : 'No calibration data',
    `${autonomyChanges.length} autonomy adjustments proposed`
  ]);

  return results;
}
```

**Dependencies:** Phase 2, Phase 3, Phase 4

**Acceptance:**
- [ ] Mistake patterns auto-generate procedural memory correction rules
- [ ] Learning cycles create episodic memory episodes
- [ ] Correction rules are consulted before agent execution (via consultLearnings)
- [ ] Full audit trail from feedback -> pattern -> rule -> behavioral change

**Estimated effort:** Medium (3-4 hours)

### Phase 6: CLI & Dashboard Integration

**Files to modify:**
- `scripts/lib/agentic-workflow.mjs` -- Add CLI commands for learning system
- `scripts/lib/agent-learning.mjs` -- Add CLI commands for calibration and patterns

**New CLI commands:**

```
node scripts/lib/agent-learning.mjs feedback <agent-id>     -- Show recent feedback records
node scripts/lib/agent-learning.mjs mistakes <agent-id>     -- Show active mistake patterns
node scripts/lib/agent-learning.mjs calibrate <agent-id>    -- Run calibration
node scripts/lib/agent-learning.mjs autonomy <action-name>  -- Evaluate autonomy change
node scripts/lib/agent-learning.mjs full-cycle <agent-id>   -- Run complete learning cycle
```

**Dependencies:** Phase 5

**Acceptance:**
- [ ] All learning system features accessible via CLI
- [ ] Full learning cycle can run for any agent or all agents
- [ ] Human can review and approve/dismiss patterns and autonomy changes

**Estimated effort:** Small (1-2 hours)

## Dependencies

| Dependency | Type | Reason |
|---|---|---|
| `agent_proposals` table | Internal (existing) | Source of rejection/correction feedback |
| `autonomous_executions` table | Internal (existing) | Source of review feedback |
| `agent_learnings` table | Internal (existing) | Stores generated learnings |
| `procedural_memory` table | Internal (existing) | Stores correction rules |
| `memory_episodes` table | Internal (existing) | Records learning episodes |
| `AgentLearning` class | Internal (existing) | Extended with new methods |
| `AgenticWorkflow` class | Internal (existing) | Enhanced with consultLearnings() |
| `ProceduralMemory` class | Internal (existing) | Used to create correction rules |
| `EpisodicMemory` class | Internal (existing) | Used to record learning journeys |

No external dependencies required.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Over-aggressive autonomy demotion | High -- agents become useless | Require human approval for all autonomy changes; minimum sample size of 20 |
| Confidence adjustment feedback loop | Medium -- confidence oscillates | Cap adjustment magnitude at 0.15 per cycle; smooth with exponential moving average |
| Stale correction rules | Medium -- rules block valid actions | Correction rules inherit procedural memory's version/supersede mechanism; auto-expire after 90 days |
| Pattern false positives | Low -- spurious patterns detected | Minimum 3 occurrences threshold; human can dismiss patterns |
| Database trigger overhead | Low -- slight latency on updates | Triggers are lightweight inserts; async processing for heavy analysis |
| Memory bloat from feedback records | Low -- table grows large | Add retention policy: archive feedback_records older than 180 days |

## Open Questions

- [ ] Should autonomy promotion be automatic (with notification) or always require human approval? Current design requires approval. The founder may prefer automatic promotion with a notification for Level 2->3 transitions.
- [ ] What is the right minimum sample size before calibration adjustments take effect? Currently set to 10 actions minimum per bucket.
- [ ] Should correction rules created from mistake patterns require human review before activation, or can they be active immediately? Current design activates immediately but the procedural memory system supports draft/active statuses.
- [ ] How should the system handle conflicting learnings (e.g., one pattern says "do X" and another says "avoid X")? Proposed: latest learning wins, but flag the conflict.

## Success Criteria

1. After a human rejects a proposal, a feedback record is automatically created within 1 second
2. After 3 similar rejections on the same action, a mistake pattern is detected in the next learning cycle
3. An agent that is consistently overconfident (confidence > success rate by >10%) has its effective confidence reduced
4. An action with >95% success over 20+ samples gets an autonomy promotion proposal
5. An action with <80% success triggers an autonomy demotion proposal
6. Correction rules created from mistake patterns are consulted before the agent acts on the same action
7. The full learning cycle completes in <30 seconds per agent
8. All changes to autonomy levels have a human-approved audit trail

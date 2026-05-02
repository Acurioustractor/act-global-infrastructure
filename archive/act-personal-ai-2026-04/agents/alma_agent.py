"""ALMA Agent - Signal tracking, pattern recognition, and ethical intelligence.

ALMA (Adaptive Learning for Meaningful Accountability) is a method for
collective sense-making in complex social systems.

ALMA = Memory + Pattern Recognition + Translation

This agent implements ALMA's philosophy:
- Observes systems, not individuals
- Surfaces patterns humans miss
- Translates between lived experience and institutional language
- Enforces ethical boundaries (no ranking, no optimization, no extraction)
- Supports sovereignty and community control

Philosophy:
    "Here is what we are seeing. Humans must decide."

Sacred Boundaries (ALMA NEVER):
    - Decides for humans
    - Optimizes people
    - Allocates capital directly
    - Predicts individuals
    - Replaces lived experience
    - Ranks communities
    - Scores organizations (uses signals, not scores)
    - Extracts knowledge without consent
    - Centralizes authority

Usage:
    agent = ALMAAgent(ghl_tool)

    # Track signals for a project
    signals = await agent.track_signals('justicehub')

    # Detect patterns across projects
    patterns = await agent.detect_patterns()

    # Translate community knowledge to funder language
    translation = await agent.translate('community', 'funder', story_data)

    # Check ethical constraints before action
    check = await agent.check_ethics('intervention_proposal')
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from typing import Dict, List, Optional, Tuple
from tools.ghl_tool import GHLTool


class ALMAAgent:
    """
    ALMA Agent - Ethical intelligence for complex social systems.

    ALMA observes systems through 5 signal families:
    1. Evidence Strength (0.0-1.0) - Quality of research backing
    2. Community Authority (0.0-1.0) - Degree of community control [HIGHEST WEIGHT: 30%]
    3. Harm Risk (0.0-1.0) - Potential for unintended harm [inverted]
    4. Implementation Capability (0.0-1.0) - Organizational sustainability
    5. Option Value (0.0-1.0) - Learning potential and adaptability

    These are SIGNALS, not scores. They indicate direction, not achievement.
    """

    def __init__(self, ghl_tool: Optional[GHLTool] = None):
        self.ghl = ghl_tool or GHLTool()

        # Define signal families for each ACT project
        self.signal_families = self._define_signal_families()

        # Define pattern recognition rules
        self.pattern_rules = self._define_pattern_rules()

        # Define translation mappings (community language ↔ institutional language)
        self.translation_maps = self._define_translation_maps()

        # Sacred boundaries (ethical constraints)
        self.sacred_boundaries = self._define_sacred_boundaries()

    def _define_signal_families(self) -> Dict:
        """
        Define signal families for each ACT project.

        Returns:
            Dict mapping projects to signal tracking frameworks
        """
        return {
            'justicehub': {
                'system_pressure': [
                    'remand_rates',
                    'detention_length_avg',
                    'staff_turnover',
                    'incident_reporting_spikes',
                    'media_rhetoric_escalation'
                ],
                'community_capability': [
                    'indigenous_governance_presence',
                    'workforce_stability',
                    'cultural_continuity',
                    'youth_participation_in_decisions',
                    'local_economic_circulation'
                ],
                'intervention_health': [
                    'program_continuity_beyond_grants',
                    'staff_burnout_indicators',
                    'administrative_burden',
                    'adaptation_speed',
                    'trust_retention'
                ],
                'trajectory': [
                    'reentry_patterns',
                    'school_reconnection',
                    'justice_contact_spacing',
                    'family_reunification_durability'
                ]
            },

            'empathy-ledger': {
                'cultural_authority': [
                    'elder_leadership',
                    'community_consent_patterns',
                    'ocap_compliance',
                    'cultural_protocol_adherence',
                    'indigenous_data_sovereignty'
                ],
                'story_health': [
                    'storyteller_agency',
                    'consent_revocation_rate',
                    'story_use_tracking',
                    'revenue_sharing_transparency',
                    'cultural_safety_incidents'
                ],
                'knowledge_flow': [
                    'story_collection_rate',
                    'story_amplification',
                    'policy_influence_citations',
                    'community_learning',
                    'knowledge_extraction_attempts'  # WARNING signal
                ]
            },

            'the-harvest': {
                'community_wellbeing': [
                    'volunteer_retention',
                    'mental_health_indicators',
                    'social_connection_density',
                    'burnout_prevention_effectiveness',
                    'healthcare_worker_engagement'
                ],
                'regenerative_capacity': [
                    'soil_health_trajectory',
                    'biodiversity_indicators',
                    'water_quality',
                    'food_security_improvement',
                    'local_food_circulation'
                ],
                'economic_resilience': [
                    'csa_subscriber_retention',
                    'income_diversification',
                    'volunteer_to_paid_conversion',
                    'community_investment',
                    'financial_sustainability'
                ]
            },

            'act-farm': {
                'ecological_health': [
                    'biodiversity_trajectory',
                    'habitat_restoration_progress',
                    'threatened_species_presence',
                    'ecosystem_function_indicators',
                    'climate_resilience'
                ],
                'knowledge_creation': [
                    'research_outputs',
                    'resident_learning_outcomes',
                    'innovation_replication',
                    'traditional_knowledge_integration',
                    'practice_documentation'
                ],
                'residency_impact': [
                    'resident_trajectory_post_residency',
                    'network_effects',
                    'practice_change_adoption',
                    'community_connection_durability',
                    'career_impact'
                ]
            },

            'goods': {
                'circular_economy': [
                    'waste_diversion_rate',
                    'material_reuse_percentage',
                    'supply_chain_locality',
                    'environmental_impact_reduction',
                    'product_lifecycle_extension'
                ],
                'indigenous_economic_sovereignty': [
                    'indigenous_employment',
                    'indigenous_business_partnerships',
                    'revenue_to_indigenous_communities',
                    'cultural_authority_in_design',
                    'procurement_sovereignty'
                ],
                'market_viability': [
                    'product_market_fit',
                    'revenue_growth',
                    'customer_retention',
                    'ethical_premium_willingness',
                    'scaling_sustainability'
                ]
            }
        }

    def _define_pattern_rules(self) -> List[Dict]:
        """
        Define pattern recognition rules.

        ALMA detects:
        - Slow drift (gradual shifts that compound)
        - Familiar failure modes (patterns seen before)
        - Early inflection points (before crisis)
        - Cross-domain connections (synergies)
        - Rhetoric vs reality mismatches

        Returns:
            List of pattern detection rules
        """
        return [
            {
                'pattern_name': 'Familiar Failure Mode: Reform → Backlash',
                'description': 'Progressive reform language appears, then punitive backlash follows within 18-24 months',
                'signals': [
                    'media_rhetoric_escalation',
                    'policy_language_shift_toward_punitive',
                    'community_warnings_ignored'
                ],
                'warning_threshold': 2,  # If 2+ signals detected
                'project': 'justicehub'
            },

            {
                'pattern_name': 'Slow Drift: Indigenous Authority Erosion',
                'description': 'Gradual shift from Indigenous-led to Indigenous-consulted to Indigenous-excluded',
                'signals': [
                    'indigenous_governance_presence_declining',
                    'cultural_protocol_adherence_slipping',
                    'community_consent_patterns_weakening'
                ],
                'warning_threshold': 1,  # Any signal is concerning
                'project': 'empathy-ledger'
            },

            {
                'pattern_name': 'Cross-Domain Opportunity: Justice + Storytelling',
                'description': 'Justice-involved youth benefit from storytelling/cultural connection',
                'signals': [
                    'cultural_continuity_strong',
                    'story_collection_rate_increasing',
                    'youth_participation_in_decisions_growing'
                ],
                'opportunity_threshold': 2,  # If 2+ signals positive
                'projects': ['justicehub', 'empathy-ledger']
            },

            {
                'pattern_name': 'Early Inflection: Volunteer Burnout Cascade',
                'description': 'Volunteer burnout leads to program deterioration before crisis visible',
                'signals': [
                    'volunteer_retention_declining',
                    'staff_burnout_indicators_rising',
                    'administrative_burden_increasing'
                ],
                'warning_threshold': 2,
                'project': 'the-harvest'
            },

            {
                'pattern_name': 'Rhetoric vs Reality: Funding ≠ Sovereignty',
                'description': 'Funding increases but community control decreases',
                'signals': [
                    'revenue_growth_positive',
                    'indigenous_governance_presence_declining',
                    'community_consent_patterns_weakening'
                ],
                'warning_threshold': 3,  # All 3 signals = mismatch
                'project': 'goods'
            },

            {
                'pattern_name': 'Knowledge Extraction Attempt',
                'description': 'External actors trying to extract community knowledge without proper consent',
                'signals': [
                    'knowledge_extraction_attempts_increasing',
                    'consent_revocation_rate_rising',
                    'cultural_safety_incidents_detected'
                ],
                'warning_threshold': 1,  # IMMEDIATE alert
                'project': 'empathy-ledger',
                'severity': 'CRITICAL'
            }
        ]

    def _define_translation_maps(self) -> Dict:
        """
        Define translation mappings between community language and institutional language.

        ALMA's translation layer prevents:
        - Knowledge being flattened
        - Communities being misunderstood
        - Funders acting too late
        - Power imbalances going unnoticed

        Returns:
            Dict mapping language pairs to translation rules
        """
        return {
            'community_to_funder': {
                # Translate community outcomes to funder language
                'cultural_healing': 'Trauma-informed intervention reducing recidivism',
                'yarning_circles': 'Evidence-based restorative justice practice',
                'elder_mentorship': 'Culturally-grounded youth development program',
                'story_sharing': 'Community-led knowledge creation and preservation',
                'unpaid_cross_system_coordination': 'Multi-agency case management and systems navigation',
                'community_garden': 'Mental health intervention and food security program',
                'regenerative_practice': 'Climate resilience and biodiversity conservation',
            },

            'funder_to_community': {
                # Translate funder requirements to community-appropriate language
                'impact_measurement': 'Understanding what worked and sharing learnings',
                'key_performance_indicators': 'Signals that show we\'re on the right path',
                'theory_of_change': 'Our understanding of how change happens here',
                'scalable_intervention': 'Something that could work in other communities (with their permission)',
                'evidence_base': 'What we\'ve learned and can share with others',
                'stakeholder_engagement': 'Listening to community and working together',
            },

            'community_to_policy': {
                # Translate community knowledge to policy language
                'cultural_protocols': 'Indigenous data sovereignty frameworks (OCAP principles)',
                'elder_authority': 'Community governance and cultural authority structures',
                'story_sovereignty': 'Intellectual property rights and consent mechanisms',
                'collective_wellbeing': 'Population-level health and social outcomes',
                'relationship_to_country': 'Environmental stewardship and land management',
            },

            'short_term_to_long_term': {
                # Translate short-term funding to long-term reality
                '12_month_grant': 'Relationship-building phase (outcomes visible Year 2-3)',
                '3_year_program': 'Minimum viable timeframe for culture change',
                'quarterly_reporting': 'Regular learning and adaptation cycles',
                'annual_review': 'Trajectory assessment (not achievement snapshot)',
            }
        }

    def _define_sacred_boundaries(self) -> Dict:
        """
        Define sacred boundaries - what ALMA never does.

        These are hard constraints, not guidelines.

        Returns:
            Dict of ethical boundaries and enforcement rules
        """
        return {
            'no_individual_profiling': {
                'rule': 'ALMA watches systems, not individuals',
                'enforcement': 'Block any query that targets specific people',
                'example_violation': 'Predict which youth will reoffend',
                'example_allowed': 'Track system-level recidivism patterns'
            },

            'no_community_ranking': {
                'rule': 'ALMA uses signals, not scores. No leaderboards.',
                'enforcement': 'Block any comparative ranking of communities',
                'example_violation': 'Rank organizations by effectiveness',
                'example_allowed': 'Show signal strength for self-assessment'
            },

            'no_decision_making': {
                'rule': 'ALMA surfaces patterns. Humans decide.',
                'enforcement': 'Block any automated resource allocation',
                'example_violation': 'Auto-approve funding based on signals',
                'example_allowed': 'Surface patterns for human decision-makers'
            },

            'no_extraction': {
                'rule': 'Knowledge shared with consent, never extracted',
                'enforcement': 'Block access to Community Controlled data without explicit permission',
                'example_violation': 'Scrape community workshop outputs',
                'example_allowed': 'Ingest public government reports'
            },

            'no_optimization': {
                'rule': 'People are not objects to be optimized',
                'enforcement': 'Block any language suggesting people can be "optimized"',
                'example_violation': 'Optimize youth outcomes',
                'example_allowed': 'Support youth agency and decision-making'
            },

            'community_sovereignty': {
                'rule': 'Indigenous communities own their data and knowledge',
                'enforcement': 'Enforce OCAP principles at system level',
                'example_violation': 'Store Elder consent data in external system',
                'example_allowed': 'Track that consent exists (not the details)'
            },

            'transparency': {
                'rule': 'All pattern detection is explainable',
                'enforcement': 'Block any black box AI decisions',
                'example_violation': 'Use unexplainable ML model for predictions',
                'example_allowed': 'Use rule-based pattern detection with clear logic'
            }
        }

    async def track_signals(
        self,
        project: str,
        timeframe: str = '90_days'
    ) -> Dict:
        """
        Track signal families for a project.

        Signals are DIRECTIONAL, not absolute. They indicate momentum, not achievement.

        Args:
            project: Project name (e.g., 'justicehub', 'empathy-ledger')
            timeframe: Time period to track ('30_days', '90_days', '1_year')

        Returns:
            Signal tracking data with trends
        """
        if project not in self.signal_families:
            return {
                'error': f'Unknown project: {project}',
                'available_projects': list(self.signal_families.keys())
            }

        # Get signal families for this project
        families = self.signal_families[project]

        # Mock signal tracking (real would query GHL + Supabase + external data)
        signal_data = {}

        for family_name, signals in families.items():
            signal_data[family_name] = {
                'signals': [],
                'trend': 'stable',  # 'improving', 'declining', 'stable'
                'attention_needed': False
            }

            for signal in signals:
                # Mock signal value (0.0-1.0)
                # Real implementation would calculate from actual data
                mock_value = 0.65
                mock_trend = 'stable'

                # Check for warning signals
                is_warning = 'warning' in signal.lower() or 'risk' in signal.lower()

                signal_data[family_name]['signals'].append({
                    'name': signal,
                    'value': mock_value,
                    'trend': mock_trend,
                    'warning': is_warning
                })

                # Flag attention needed if any signal is warning
                if is_warning and mock_value > 0.5:
                    signal_data[family_name]['attention_needed'] = True

        return {
            'project': project,
            'timeframe': timeframe,
            'signal_families': signal_data,
            'note': 'Mock data - real implementation would query actual systems'
        }

    async def detect_patterns(
        self,
        project: Optional[str] = None,
        include_opportunities: bool = True
    ) -> List[Dict]:
        """
        Detect patterns across projects using ALMA's pattern recognition rules.

        ALMA detects:
        - Slow drift
        - Familiar failure modes
        - Early inflection points
        - Cross-domain connections
        - Rhetoric vs reality mismatches

        Args:
            project: Specific project (None = all projects)
            include_opportunities: Include positive patterns (not just warnings)

        Returns:
            List of detected patterns with severity and recommendations
        """
        detected_patterns = []

        for rule in self.pattern_rules:
            # Filter by project if specified
            if project:
                rule_projects = rule.get('projects', [rule.get('project')])
                if project not in rule_projects:
                    continue

            # Skip opportunities if not requested
            if 'opportunity' in rule.get('pattern_name', '').lower() and not include_opportunities:
                continue

            # Mock pattern detection (real would check actual signal values)
            # For demo, detect every 3rd pattern
            import random
            if random.random() > 0.7:
                pattern = {
                    'pattern_name': rule['pattern_name'],
                    'description': rule['description'],
                    'signals_detected': rule.get('signals', [])[:2],  # Mock: show first 2
                    'severity': rule.get('severity', 'MEDIUM'),
                    'project': rule.get('project', 'cross-project'),
                    'recommendation': self._generate_pattern_recommendation(rule)
                }

                detected_patterns.append(pattern)

        return detected_patterns

    def _generate_pattern_recommendation(self, rule: Dict) -> str:
        """Generate human-readable recommendation for a detected pattern"""
        pattern_name = rule['pattern_name']

        if 'Failure Mode' in pattern_name:
            return "⚠️ Warning: Familiar failure mode detected. Review community warnings and consider early intervention."
        elif 'Slow Drift' in pattern_name:
            return "📉 Attention: Gradual erosion detected. Strengthen governance before crisis."
        elif 'Opportunity' in pattern_name:
            return "✨ Opportunity: Positive synergy detected. Consider cross-project collaboration."
        elif 'Inflection' in pattern_name:
            return "🔔 Alert: Early warning sign. Act now before visible crisis."
        elif 'Rhetoric vs Reality' in pattern_name:
            return "🚨 Mismatch: Funding and control are misaligned. Revisit governance."
        elif 'Extraction' in pattern_name:
            return "🔒 CRITICAL: Knowledge extraction attempt detected. Protect community sovereignty immediately."
        else:
            return "ℹ️ Pattern detected. Review signals and consult with community."

    async def translate(
        self,
        from_language: str,
        to_language: str,
        content: str
    ) -> Dict:
        """
        Translate between community language and institutional language.

        ALMA's translation layer prevents:
        - Knowledge being flattened
        - Communities being misunderstood
        - Funders acting too late

        Args:
            from_language: Source language ('community', 'funder', 'policy')
            to_language: Target language ('community', 'funder', 'policy')
            content: Content to translate

        Returns:
            Translation with context and notes
        """
        # Build translation key
        translation_key = f'{from_language}_to_{to_language}'

        if translation_key not in self.translation_maps:
            return {
                'error': f'No translation map for {translation_key}',
                'available_maps': list(self.translation_maps.keys())
            }

        # Get translation map
        translation_map = self.translation_maps[translation_key]

        # Translate content (simple keyword matching for now)
        translated = content
        translations_applied = []

        for source_term, target_term in translation_map.items():
            if source_term.replace('_', ' ') in content.lower():
                translated = translated.replace(
                    source_term.replace('_', ' '),
                    target_term
                )
                translations_applied.append({
                    'from': source_term.replace('_', ' '),
                    'to': target_term
                })

        return {
            'original': content,
            'translated': translated,
            'translations_applied': translations_applied,
            'from_language': from_language,
            'to_language': to_language,
            'note': 'Translation preserves meaning while adapting to audience'
        }

    async def check_ethics(
        self,
        proposed_action: str
    ) -> Dict:
        """
        Check if a proposed action violates ALMA's sacred boundaries.

        Sacred Boundaries (ALMA NEVER):
        - Decides for humans
        - Optimizes people
        - Ranks communities
        - Extracts knowledge without consent
        - Profiles individuals

        Args:
            proposed_action: Description of proposed action

        Returns:
            Ethics check result with violations and recommendations
        """
        violations = []
        warnings = []

        action_lower = proposed_action.lower()

        for boundary_name, boundary in self.sacred_boundaries.items():
            # Check for boundary violations (keyword matching)
            violation_keywords = {
                'no_individual_profiling': ['predict', 'individual', 'person', 'youth will'],
                'no_community_ranking': ['rank', 'score', 'best', 'worst', 'leaderboard', 'top'],
                'no_decision_making': ['auto-approve', 'automatically allocate', 'decide'],
                'no_extraction': ['scrape', 'extract', 'harvest data'],
                'no_optimization': ['optimize people', 'optimize youth', 'optimize individuals'],
                'community_sovereignty': ['store elder', 'external system'],
                'transparency': ['black box', 'unexplainable', 'proprietary model']
            }

            keywords = violation_keywords.get(boundary_name, [])
            for keyword in keywords:
                if keyword in action_lower:
                    violations.append({
                        'boundary': boundary_name,
                        'rule': boundary['rule'],
                        'violation': boundary['example_violation'],
                        'alternative': boundary['example_allowed']
                    })

        # Determine if action is allowed
        is_allowed = len(violations) == 0

        return {
            'proposed_action': proposed_action,
            'is_allowed': is_allowed,
            'violations': violations,
            'warnings': warnings,
            'recommendation': (
                '✅ Action aligns with ALMA ethics' if is_allowed
                else '❌ Action violates sacred boundaries. Review alternatives.'
            )
        }

    async def calculate_portfolio_signals(
        self,
        intervention_data: Dict
    ) -> Dict:
        """
        Calculate ALMA's 5-signal portfolio framework.

        These are SIGNALS, not scores. They indicate direction, not achievement.

        5 Signals:
        1. Evidence Strength (0.0-1.0) - 25% weight
        2. Community Authority (0.0-1.0) - 30% weight [HIGHEST]
        3. Harm Risk (0.0-1.0, inverted) - 20% weight
        4. Implementation Capability (0.0-1.0) - 15% weight
        5. Option Value (0.0-1.0) - 10% weight

        Args:
            intervention_data: Data about an intervention

        Returns:
            Portfolio signals with weighted average
        """
        # Mock signal calculation (real would analyze actual intervention data)
        evidence_strength = 0.7  # Has some evidence backing
        community_authority = 0.9  # Indigenous-led
        harm_risk = 0.2  # Low risk (inverted: 0.8)
        implementation_capability = 0.8  # Strong organization
        option_value = 0.6  # Moderate adaptability

        # Calculate weighted portfolio signal
        portfolio_signal = (
            (evidence_strength * 0.25) +
            (community_authority * 0.30) +  # HIGHEST weight
            ((1 - harm_risk) * 0.20) +
            (implementation_capability * 0.15) +
            (option_value * 0.10)
        )

        return {
            'intervention': intervention_data.get('name', 'Unknown'),
            'signals': {
                'evidence_strength': {
                    'value': evidence_strength,
                    'weight': 0.25,
                    'interpretation': self._interpret_signal(evidence_strength)
                },
                'community_authority': {
                    'value': community_authority,
                    'weight': 0.30,  # HIGHEST
                    'interpretation': self._interpret_signal(community_authority)
                },
                'harm_risk': {
                    'value': harm_risk,
                    'weight': 0.20,
                    'inverted': True,
                    'interpretation': self._interpret_signal(1 - harm_risk)
                },
                'implementation_capability': {
                    'value': implementation_capability,
                    'weight': 0.15,
                    'interpretation': self._interpret_signal(implementation_capability)
                },
                'option_value': {
                    'value': option_value,
                    'weight': 0.10,
                    'interpretation': self._interpret_signal(option_value)
                }
            },
            'portfolio_signal': portfolio_signal,
            'interpretation': self._interpret_portfolio_signal(portfolio_signal),
            'note': 'These are signals, not scores. They indicate direction, not achievement.'
        }

    def _interpret_signal(self, value: float) -> str:
        """Interpret a signal value (0.0-1.0)"""
        if value >= 0.8:
            return 'Strong'
        elif value >= 0.6:
            return 'Good'
        elif value >= 0.4:
            return 'Moderate'
        elif value >= 0.2:
            return 'Weak'
        else:
            return 'Very Weak'

    def _interpret_portfolio_signal(self, signal: float) -> str:
        """Interpret overall portfolio signal"""
        if signal >= 0.8:
            return 'Excellent - Strong across multiple signals'
        elif signal >= 0.6:
            return 'Good - Solid foundation, some areas for growth'
        elif signal >= 0.4:
            return 'Moderate - Mixed signals, attention needed'
        else:
            return 'Concerning - Multiple weak signals detected'

    async def run(self, task: str) -> str:
        """
        Execute an ALMA task based on natural language description.

        Supported tasks:
        - "track signals for [project]"
        - "detect patterns"
        - "detect patterns for [project]"
        - "translate [content] from [source] to [target]"
        - "check ethics: [proposed action]"
        - "calculate portfolio signals for [intervention]"
        - "show sacred boundaries"

        Args:
            task: Natural language task description

        Returns:
            Human-readable result
        """
        task_lower = task.lower()

        # Track signals
        if 'track signals' in task_lower or 'signal' in task_lower:
            # Extract project name
            project = 'justicehub'  # Default
            for proj in ['justicehub', 'empathy-ledger', 'the-harvest', 'act-farm', 'goods']:
                if proj in task_lower:
                    project = proj

            result = await self.track_signals(project)

            if 'error' in result:
                return result['error']

            # Format output
            families_text = []
            for family_name, family_data in result['signal_families'].items():
                attention = '⚠️ ATTENTION NEEDED' if family_data['attention_needed'] else ''
                families_text.append(
                    f"  {family_name.replace('_', ' ').title()} {attention}:\n" +
                    f"    Trend: {family_data['trend']}\n" +
                    f"    Signals: {len(family_data['signals'])} tracked"
                )

            return (
                f"ALMA Signal Tracking: {result['project']}\n"
                f"Timeframe: {result['timeframe']}\n\n" +
                "\n\n".join(families_text) +
                f"\n\n{result['note']}"
            )

        # Detect patterns
        elif 'detect pattern' in task_lower or 'patterns' in task_lower:
            # Extract project if specified
            project = None
            for proj in ['justicehub', 'empathy-ledger', 'the-harvest', 'act-farm', 'goods']:
                if proj in task_lower:
                    project = proj

            patterns = await self.detect_patterns(project)

            if not patterns:
                return f"No patterns detected for {project or 'all projects'} at this time."

            patterns_text = []
            for pattern in patterns:
                patterns_text.append(
                    f"  • {pattern['pattern_name']}\n" +
                    f"    {pattern['description']}\n" +
                    f"    Severity: {pattern['severity']}\n" +
                    f"    Project: {pattern['project']}\n" +
                    f"    {pattern['recommendation']}"
                )

            return (
                f"ALMA Pattern Detection ({len(patterns)} patterns found):\n\n" +
                "\n\n".join(patterns_text)
            )

        # Translate
        elif 'translate' in task_lower:
            # Simple parsing (real would use NLP)
            # Example: "translate 'yarning circles' from community to funder"
            from_lang = 'community'
            to_lang = 'funder'
            content = 'yarning circles'  # Default example

            if 'from community to funder' in task_lower:
                from_lang, to_lang = 'community', 'funder'
            elif 'from funder to community' in task_lower:
                from_lang, to_lang = 'funder', 'community'

            result = await self.translate(from_lang, to_lang, content)

            if 'error' in result:
                return result['error']

            trans_list = "\n".join([
                f"    '{t['from']}' → '{t['to']}'"
                for t in result['translations_applied']
            ])

            return (
                f"ALMA Translation:\n\n" +
                f"Original ({result['from_language']}):\n  {result['original']}\n\n" +
                f"Translated ({result['to_language']}):\n  {result['translated']}\n\n" +
                f"Translations Applied:\n{trans_list}\n\n" +
                f"{result['note']}"
            )

        # Check ethics
        elif 'check ethics' in task_lower or 'ethics' in task_lower:
            # Extract action (everything after "check ethics:")
            if 'check ethics:' in task_lower:
                action = task.split('check ethics:', 1)[1].strip()
            else:
                action = task  # Use whole task as action

            result = await self.check_ethics(action)

            if result['is_allowed']:
                return (
                    f"✅ Ethics Check PASSED\n\n" +
                    f"Proposed Action: {result['proposed_action']}\n\n" +
                    f"{result['recommendation']}"
                )
            else:
                violations_text = "\n".join([
                    f"  • {v['boundary']}: {v['rule']}\n" +
                    f"    Violation: {v['violation']}\n" +
                    f"    Alternative: {v['alternative']}"
                    for v in result['violations']
                ])

                return (
                    f"❌ Ethics Check FAILED\n\n" +
                    f"Proposed Action: {result['proposed_action']}\n\n" +
                    f"Violations:\n{violations_text}\n\n" +
                    f"{result['recommendation']}"
                )

        # Show sacred boundaries
        elif 'sacred boundaries' in task_lower or 'boundaries' in task_lower:
            boundaries_text = []
            for name, boundary in self.sacred_boundaries.items():
                boundaries_text.append(
                    f"  • {name.replace('_', ' ').title()}\n" +
                    f"    Rule: {boundary['rule']}\n" +
                    f"    Example violation: {boundary['example_violation']}\n" +
                    f"    Example allowed: {boundary['example_allowed']}"
                )

            return (
                "ALMA Sacred Boundaries\n\n" +
                "What ALMA NEVER does:\n\n" +
                "\n\n".join(boundaries_text)
            )

        # Calculate portfolio signals
        elif 'portfolio' in task_lower or 'calculate' in task_lower:
            # Mock intervention data
            intervention = {'name': 'Example Youth Justice Program'}

            result = await self.calculate_portfolio_signals(intervention)

            signals_text = []
            for signal_name, signal_data in result['signals'].items():
                inverted = ' (inverted)' if signal_data.get('inverted') else ''
                signals_text.append(
                    f"  • {signal_name.replace('_', ' ').title()}{inverted}: " +
                    f"{signal_data['value']:.2f} ({signal_data['interpretation']}) " +
                    f"[weight: {signal_data['weight']:.0%}]"
                )

            return (
                f"ALMA Portfolio Signals: {result['intervention']}\n\n" +
                "Signal Breakdown:\n" +
                "\n".join(signals_text) +
                f"\n\nOverall Portfolio Signal: {result['portfolio_signal']:.2f}\n" +
                f"Interpretation: {result['interpretation']}\n\n" +
                f"{result['note']}"
            )

        else:
            return (
                "Unknown ALMA task. Supported commands:\n"
                "  • track signals for [project]\n"
                "  • detect patterns [for project]\n"
                "  • translate [content] from [source] to [target]\n"
                "  • check ethics: [proposed action]\n"
                "  • calculate portfolio signals\n"
                "  • show sacred boundaries"
            )


# Async main for testing
async def main():
    """Test the ALMA agent"""
    agent = ALMAAgent()

    # Test 1: Track signals
    print("\n=== Test 1: Track Signals for JusticeHub ===")
    result = await agent.run("track signals for justicehub")
    print(result)

    # Test 2: Detect patterns
    print("\n=== Test 2: Detect Patterns ===")
    result = await agent.run("detect patterns")
    print(result)

    # Test 3: Translation
    print("\n=== Test 3: Translation (Community to Funder) ===")
    result = await agent.run("translate 'yarning circles' from community to funder")
    print(result)

    # Test 4: Ethics check (PASS)
    print("\n=== Test 4: Ethics Check (Should PASS) ===")
    result = await agent.run("check ethics: Track system-level recidivism patterns")
    print(result)

    # Test 5: Ethics check (FAIL)
    print("\n=== Test 5: Ethics Check (Should FAIL) ===")
    result = await agent.run("check ethics: Predict which individual youth will reoffend")
    print(result)

    # Test 6: Sacred boundaries
    print("\n=== Test 6: Sacred Boundaries ===")
    result = await agent.run("show sacred boundaries")
    print(result)

    # Test 7: Portfolio signals
    print("\n=== Test 7: Calculate Portfolio Signals ===")
    result = await agent.run("calculate portfolio signals")
    print(result)


if __name__ == '__main__':
    import asyncio
    asyncio.run(main())

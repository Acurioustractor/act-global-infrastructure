"""Story Analysis Agent - Deep analysis of storytelling data and narrative patterns.

This agent analyzes stories from Empathy Ledger to surface:
- Narrative arcs and story structures
- Thematic evolution over time
- Storyteller voice and tone patterns
- Cross-narrative connections
- Cultural protocol adherence
- Impact evidence extraction

Built specifically for Indigenous storytelling platforms with cultural sensitivity.

Usage:
    agent = StoryAnalysisAgent()

    # Analyze narrative arc
    arc = await agent.analyze_narrative_arc(transcript_id)

    # Detect thematic evolution
    evolution = await agent.analyze_thematic_evolution(storyteller_id)

    # Find cross-narrative connections
    connections = await agent.find_story_connections(transcript_ids)

    # Extract impact evidence
    evidence = await agent.extract_impact_evidence(transcript_id)
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from typing import Dict, List, Optional, Tuple
import anthropic
import json


class StoryAnalysisAgent:
    """
    Story Analysis Agent - Specialized narrative intelligence for Indigenous storytelling.

    Capabilities:
    1. Narrative Arc Analysis - Story structure, tension, resolution
    2. Thematic Evolution - How storyteller themes change over time
    3. Voice & Tone Patterns - Linguistic fingerprinting
    4. Cross-Narrative Connections - Stories that resonate together
    5. Cultural Protocol Check - Ensures cultural safety
    6. Impact Evidence Extraction - Pull powerful quotes for funders

    Sacred Boundaries (NEVER):
    - Rank storytellers by "quality"
    - Extract sacred knowledge without consent
    - Homogenize diverse voices
    - Impose Western narrative structures
    - Compare storytellers competitively
    """

    def __init__(self):
        self.claude = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )

        # Define narrative arc patterns
        self.arc_patterns = self._define_arc_patterns()

        # Define cultural protocol checks
        self.cultural_protocols = self._define_cultural_protocols()

        # Define impact evidence categories
        self.evidence_categories = self._define_evidence_categories()

    def _define_arc_patterns(self) -> Dict:
        """
        Define narrative arc patterns for story structure analysis.

        Indigenous storytelling often follows different patterns than
        Western 3-act structure. This respects multiple traditions.
        """
        return {
            'linear_journey': {
                'description': 'Traditional journey narrative (departure, trials, return)',
                'markers': ['beginning', 'challenge', 'transformation', 'resolution'],
                'cultural_context': 'Common in migration/displacement stories'
            },
            'circular_return': {
                'description': 'Cyclical narrative returning to origin',
                'markers': ['grounding', 'disruption', 'wandering', 'return', 'renewal'],
                'cultural_context': 'Common in Indigenous storytelling traditions'
            },
            'braided_stories': {
                'description': 'Multiple intertwined narratives',
                'markers': ['parallel_threads', 'convergence', 'shared_meaning'],
                'cultural_context': 'Common in family/community stories'
            },
            'witnessing': {
                'description': 'Observational testimony without resolution',
                'markers': ['presence', 'observation', 'bearing_witness'],
                'cultural_context': 'Common in trauma/justice stories'
            },
            'teaching_story': {
                'description': 'Story as knowledge transmission',
                'markers': ['context', 'lesson', 'application', 'wisdom'],
                'cultural_context': 'Common in Elder teachings'
            }
        }

    def _define_cultural_protocols(self) -> Dict:
        """
        Define cultural protocol checks for story analysis.

        Ensures analysis respects Indigenous data sovereignty (OCAP).
        """
        return {
            'sacred_knowledge': {
                'markers': ['ceremonial', 'sacred', 'restricted', 'men-only', 'women-only'],
                'action': 'HALT - Requires Elder review',
                'severity': 'critical'
            },
            'traumatic_content': {
                'markers': ['violence', 'abuse', 'death', 'removal', 'stolen'],
                'action': 'Trigger warning required',
                'severity': 'high'
            },
            'sensitive_cultural': {
                'markers': ['language', 'ceremony', 'country', 'ancestors'],
                'action': 'Cultural sensitivity review recommended',
                'severity': 'medium'
            },
            'consent_required': {
                'markers': ['names', 'locations', 'family', 'community'],
                'action': 'Verify consent for identifiable information',
                'severity': 'high'
            }
        }

    def _define_evidence_categories(self) -> Dict:
        """
        Define impact evidence categories for funder reporting.

        Maps story elements to social impact metrics.
        """
        return {
            'transformation': {
                'description': 'Personal or community transformation',
                'value_proxy': 12000,  # Healing/wellbeing value
                'keywords': ['changed', 'healed', 'grew', 'transformed', 'overcame']
            },
            'cultural_preservation': {
                'description': 'Cultural knowledge preserved/transmitted',
                'value_proxy': 8000,  # Cultural preservation value
                'keywords': ['language', 'tradition', 'ceremony', 'elders', 'ancestors']
            },
            'systems_change': {
                'description': 'Policy/systemic impact',
                'value_proxy': 50000,  # Policy influence value
                'keywords': ['policy', 'law', 'government', 'system', 'change']
            },
            'community_connection': {
                'description': 'Social capital and belonging',
                'value_proxy': 3000,  # Community connection value
                'keywords': ['connected', 'belonging', 'community', 'together', 'supported']
            },
            'resilience': {
                'description': 'Individual/community resilience',
                'value_proxy': 10000,  # Resilience value
                'keywords': ['strength', 'resilient', 'survived', 'persevered', 'endured']
            }
        }

    async def analyze_narrative_arc(self, transcript_text: str, metadata: Optional[Dict] = None) -> Dict:
        """
        Analyze the narrative arc of a story.

        Args:
            transcript_text: Full transcript text
            metadata: Optional storyteller/cultural context

        Returns:
            Dict containing:
            - arc_pattern: Detected narrative structure
            - key_moments: Critical turning points
            - emotional_trajectory: Tone evolution
            - cultural_markers: Indigenous storytelling elements
        """

        prompt = f"""Analyze this Indigenous storytelling transcript for narrative structure.

TRANSCRIPT:
{transcript_text}

CONTEXT:
{json.dumps(metadata, indent=2) if metadata else 'No additional context'}

Please analyze:

1. **Narrative Arc Pattern**: Which pattern best fits?
   - Linear Journey (departure → trials → return)
   - Circular Return (disruption → wandering → renewal)
   - Braided Stories (multiple intertwined narratives)
   - Witnessing (observational testimony)
   - Teaching Story (knowledge transmission)

2. **Key Moments**: Identify 3-5 critical turning points

3. **Emotional Trajectory**: How does tone/emotion evolve?

4. **Cultural Markers**: Indigenous storytelling elements
   - Use of silence/pauses
   - Relational language (we/us vs I/me)
   - Connection to Country/land
   - Elder wisdom/teaching
   - Circular time references

5. **Strengths**: What makes this story powerful?

Return as JSON with this structure:
{{
  "arc_pattern": "circular_return",
  "key_moments": [
    {{"moment": "description", "timestamp": "approximate location", "significance": "why it matters"}},
    ...
  ],
  "emotional_trajectory": "description of emotional arc",
  "cultural_markers": ["marker1", "marker2"],
  "strengths": ["strength1", "strength2"],
  "analysis_notes": "overall narrative assessment"
}}
"""

        response = self.claude.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=2000,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}]
        )

        result_text = response.content[0].text

        # Extract JSON from response
        try:
            # Try to parse as JSON
            result = json.loads(result_text)
        except json.JSONDecodeError:
            # If not valid JSON, extract from markdown code block
            if "```json" in result_text:
                json_str = result_text.split("```json")[1].split("```")[0].strip()
                result = json.loads(json_str)
            else:
                # Fallback: return text as analysis_notes
                result = {
                    "arc_pattern": "unknown",
                    "analysis_notes": result_text
                }

        return result

    async def analyze_thematic_evolution(self, transcripts: List[Dict]) -> Dict:
        """
        Analyze how storyteller's themes evolve over time.

        Args:
            transcripts: List of transcripts from same storyteller (chronological)

        Returns:
            Dict containing:
            - theme_trajectory: How themes change
            - emerging_themes: New themes appearing
            - persistent_themes: Consistent themes
            - narrative_growth: Evolution of storytelling voice
        """

        # Build timeline
        timeline = []
        for i, t in enumerate(transcripts):
            timeline.append({
                'sequence': i + 1,
                'date': t.get('created_at', 'unknown'),
                'themes': t.get('themes', []),
                'summary': t.get('ai_summary', '')[:200]  # First 200 chars
            })

        prompt = f"""Analyze thematic evolution across this storyteller's journey.

STORY TIMELINE:
{json.dumps(timeline, indent=2)}

Please analyze:

1. **Theme Trajectory**: How do themes evolve?
   - Which themes appear early?
   - Which themes emerge later?
   - Which themes fade?

2. **Persistent Themes**: What remains constant?

3. **Narrative Growth**: How does storytelling voice evolve?
   - Confidence/clarity
   - Complexity/depth
   - Cultural grounding

4. **Patterns**: Any cyclical or seasonal patterns?

Return as JSON:
{{
  "theme_trajectory": "description of how themes change",
  "emerging_themes": ["theme1", "theme2"],
  "persistent_themes": ["theme1", "theme2"],
  "fading_themes": ["theme1", "theme2"],
  "narrative_growth": "description of voice evolution",
  "patterns": "any patterns observed",
  "storyteller_journey": "overall arc of storyteller development"
}}
"""

        response = self.claude.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=2000,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}]
        )

        result_text = response.content[0].text

        try:
            if "```json" in result_text:
                json_str = result_text.split("```json")[1].split("```")[0].strip()
                result = json.loads(json_str)
            else:
                result = json.loads(result_text)
        except:
            result = {"analysis_notes": result_text}

        return result

    async def find_story_connections(self, stories: List[Dict]) -> List[Dict]:
        """
        Find thematic and narrative connections between stories.

        Args:
            stories: List of story objects with themes, summaries

        Returns:
            List of connections with:
            - story_a_id, story_b_id
            - connection_type (thematic, experiential, cultural)
            - strength (0.0-1.0)
            - description
        """

        connections = []

        # Simple thematic overlap detection
        for i, story_a in enumerate(stories):
            themes_a = set(story_a.get('themes', []))

            for story_b in stories[i+1:]:
                themes_b = set(story_b.get('themes', []))

                # Calculate overlap
                overlap = themes_a & themes_b
                overlap_ratio = len(overlap) / max(len(themes_a | themes_b), 1)

                if overlap_ratio > 0.3:  # 30% theme overlap
                    connections.append({
                        'story_a_id': story_a.get('id'),
                        'story_b_id': story_b.get('id'),
                        'connection_type': 'thematic',
                        'strength': overlap_ratio,
                        'shared_themes': list(overlap),
                        'description': f"Stories share {len(overlap)} themes: {', '.join(list(overlap)[:3])}"
                    })

        return connections

    async def extract_impact_evidence(self, transcript_text: str, themes: List[str]) -> Dict:
        """
        Extract powerful quotes and evidence for impact reporting.

        Args:
            transcript_text: Full transcript
            themes: Identified themes

        Returns:
            Dict containing:
            - transformation_quotes: Personal change evidence
            - systems_impact_quotes: Policy/systemic change
            - cultural_preservation_quotes: Cultural knowledge
            - community_connection_quotes: Social capital
        """

        prompt = f"""Extract powerful impact evidence from this transcript.

TRANSCRIPT:
{transcript_text}

THEMES IDENTIFIED:
{', '.join(themes)}

Extract 1-3 powerful quotes for each impact category:

1. **Transformation**: Personal or community change
2. **Systems Impact**: Policy/institutional change
3. **Cultural Preservation**: Knowledge transmission
4. **Community Connection**: Belonging and social capital
5. **Resilience**: Strength and perseverance

For each quote:
- Keep it short (under 50 words)
- Capture the most powerful language
- Note which impact category it demonstrates

Return as JSON:
{{
  "transformation_quotes": [
    {{"quote": "text", "context": "why powerful", "value_signal": "high/medium/low"}},
    ...
  ],
  "systems_impact_quotes": [...],
  "cultural_preservation_quotes": [...],
  "community_connection_quotes": [...],
  "resilience_quotes": [...]
}}
"""

        response = self.claude.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=2000,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}]
        )

        result_text = response.content[0].text

        try:
            if "```json" in result_text:
                json_str = result_text.split("```json")[1].split("```")[0].strip()
                result = json.loads(json_str)
            else:
                result = json.loads(result_text)
        except:
            result = {"analysis_notes": result_text}

        return result

    async def check_cultural_protocols(self, transcript_text: str) -> Dict:
        """
        Check for cultural protocol concerns.

        Args:
            transcript_text: Full transcript

        Returns:
            Dict containing:
            - flags: List of protocol concerns
            - severity: critical/high/medium/low
            - recommended_action: What to do
        """

        flags = []
        max_severity = 'low'

        text_lower = transcript_text.lower()

        # Check each protocol
        for protocol_name, protocol in self.cultural_protocols.items():
            markers_found = []
            for marker in protocol['markers']:
                if marker in text_lower:
                    markers_found.append(marker)

            if markers_found:
                flags.append({
                    'protocol': protocol_name,
                    'markers_detected': markers_found,
                    'action': protocol['action'],
                    'severity': protocol['severity']
                })

                # Update max severity
                severity_order = ['low', 'medium', 'high', 'critical']
                if severity_order.index(protocol['severity']) > severity_order.index(max_severity):
                    max_severity = protocol['severity']

        return {
            'flags': flags,
            'overall_severity': max_severity,
            'requires_elder_review': max_severity == 'critical',
            'recommended_action': flags[0]['action'] if flags else 'No protocol concerns detected'
        }

    async def run(self, command: str) -> Dict:
        """
        Natural language interface to story analysis.

        Usage:
            await agent.run("analyze narrative arc for transcript abc123")
            await agent.run("find story connections")
            await agent.run("extract impact evidence from transcript xyz789")
        """

        command_lower = command.lower()

        if 'narrative arc' in command_lower:
            return {'message': 'Use analyze_narrative_arc() method with transcript text'}

        elif 'thematic evolution' in command_lower:
            return {'message': 'Use analyze_thematic_evolution() method with transcript list'}

        elif 'story connections' in command_lower or 'find connections' in command_lower:
            return {'message': 'Use find_story_connections() method with story list'}

        elif 'impact evidence' in command_lower:
            return {'message': 'Use extract_impact_evidence() method with transcript text'}

        elif 'cultural protocol' in command_lower or 'protocol check' in command_lower:
            return {'message': 'Use check_cultural_protocols() method with transcript text'}

        elif 'help' in command_lower:
            return {
                'commands': [
                    'analyze narrative arc',
                    'analyze thematic evolution',
                    'find story connections',
                    'extract impact evidence',
                    'check cultural protocols'
                ],
                'note': 'Use specific methods with actual data for full analysis'
            }

        else:
            return {'error': 'Unknown command. Try "help" for available commands.'}


if __name__ == '__main__':
    # Example usage
    import asyncio

    async def test():
        agent = StoryAnalysisAgent()

        # Test cultural protocol check
        sample_text = """
        This is a story about my grandmother's teachings about Country.
        She taught me the sacred ceremonies and the language of our ancestors.
        """

        result = await agent.check_cultural_protocols(sample_text)
        print("Cultural Protocol Check:")
        print(json.dumps(result, indent=2))

    asyncio.run(test())

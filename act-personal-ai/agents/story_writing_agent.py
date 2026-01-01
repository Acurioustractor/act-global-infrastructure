"""Story Writing Agent - Assist with crafting stories in Empathy Ledger's tone.

This agent helps storytellers, facilitators, and content creators craft
stories that align with Empathy Ledger's values:

- Culturally sensitive and trauma-informed
- Community voice-centered (not extractive)
- Strength-based (not deficit-focused)
- Relational language (we/us, not just I/me)
- Connection to place/Country
- Intergenerational wisdom

Sacred Boundaries (NEVER):
- Write stories FOR storytellers (only assist/suggest)
- Impose Western narrative structures
- Extract without consent
- Homogenize diverse voices
- Use savior language ("we help them")
- Focus on deficit/trauma without strength/resilience

Usage:
    agent = StoryWritingAgent()

    # Refine a story draft
    refined = await agent.refine_story_draft(draft_text)

    # Suggest title options
    titles = await agent.suggest_titles(story_text)

    # Check tone alignment
    check = await agent.check_tone_alignment(story_text)

    # Generate discussion questions
    questions = await agent.generate_discussion_questions(story_text)
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from typing import Dict, List, Optional
import anthropic
import json


class StoryWritingAgent:
    """
    Story Writing Agent - Editorial support for Indigenous storytelling.

    Capabilities:
    1. Story Draft Refinement - Suggest improvements (never rewrite)
    2. Title Suggestions - Generate culturally appropriate titles
    3. Tone Alignment - Check against Empathy Ledger values
    4. Discussion Questions - Create reflection prompts
    5. Summary Generation - Craft compelling summaries
    6. Cultural Sensitivity Check - Flag problematic language

    Philosophy:
    "We support storytellers' voices. We never speak for them."
    """

    def __init__(self):
        self.claude = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )

        # Define Empathy Ledger tone guidelines
        self.tone_guidelines = self._define_tone_guidelines()

        # Define problematic language patterns
        self.language_flags = self._define_language_flags()

    def _define_tone_guidelines(self) -> Dict:
        """
        Define Empathy Ledger's editorial tone and style.

        Based on messaging review: avoid savior complex, center community authority.
        """
        return {
            'voice_centering': {
                'good': [
                    'Storytellers own their narratives',
                    'Communities control their data',
                    'Indigenous-led storytelling platform',
                    'Stories remain yours',
                    'Your voice, your truth, your platform'
                ],
                'avoid': [
                    'We empower storytellers',  # Savior complex
                    'We give voice to',  # They already have voices
                    'We help Indigenous communities',  # Patronizing
                    'Our storytellers',  # Possession language
                    'We enable',  # Implies dependency
                ]
            },
            'strength_based': {
                'good': [
                    'Community resilience',
                    'Cultural knowledge preservation',
                    'Intergenerational strength',
                    'Collective healing',
                    'Wisdom traditions'
                ],
                'avoid': [
                    'Disadvantaged communities',
                    'At-risk populations',
                    'Marginalized groups',
                    'Vulnerable people',
                    'Broken systems' (focus on what's being built instead)
                ]
            },
            'relational_language': {
                'good': [
                    'We/us/our (collective)',
                    'Together',
                    'Connection',
                    'Relationship to Country',
                    'Intergenerational'
                ],
                'avoid': [
                    'Excessive I/me (overly individual)',
                    'Them/those (othering)',
                    'Recipients',
                    'Beneficiaries',
                    'Clients'
                ]
            },
            'cultural_grounding': {
                'good': [
                    'Connection to Country',
                    'Elder wisdom',
                    'Cultural protocols',
                    'Language preservation',
                    'Traditional knowledge',
                    'Ceremony and practice'
                ],
                'avoid': [
                    'Exotic/mystical language',
                    'Romanticization',
                    'Appropriation of terminology',
                    'Pan-Indigenous generalizations'
                ]
            },
            'data_sovereignty': {
                'good': [
                    'OCAP principles (Ownership, Control, Access, Possession)',
                    'Community consent',
                    'Data sovereignty',
                    'Indigenous-controlled',
                    'Cultural safety'
                ],
                'avoid': [
                    'Data extraction',
                    'Passive subjects',
                    'Research on (vs. research with)',
                    'Top-down approaches'
                ]
            }
        }

    def _define_language_flags(self) -> Dict:
        """
        Define problematic language patterns to flag.
        """
        return {
            'savior_complex': {
                'patterns': ['we empower', 'we give', 'we help', 'we enable', 'we provide voice'],
                'severity': 'high',
                'suggestion': 'Use "we support" or better yet, center the storyteller as the actor'
            },
            'deficit_framing': {
                'patterns': ['disadvantaged', 'marginalized', 'at-risk', 'vulnerable', 'broken'],
                'severity': 'medium',
                'suggestion': 'Use strength-based language focusing on resilience and agency'
            },
            'othering_language': {
                'patterns': ['them', 'those people', 'recipients', 'beneficiaries', 'clients'],
                'severity': 'medium',
                'suggestion': 'Use relational language (we/us) or specific role names (storytellers, Elders)'
            },
            'extraction_language': {
                'patterns': ['collect data', 'gather stories', 'harvest knowledge', 'extract insights'],
                'severity': 'high',
                'suggestion': 'Use "preserve", "honor", "steward", or "safeguard" instead'
            },
            'romanticization': {
                'patterns': ['ancient wisdom', 'mystical', 'exotic', 'spiritual journey'],
                'severity': 'medium',
                'suggestion': 'Be specific and grounded, avoid generalizations'
            }
        }

    async def refine_story_draft(self, draft_text: str, context: Optional[Dict] = None) -> Dict:
        """
        Suggest refinements to a story draft (never rewrite completely).

        Args:
            draft_text: The draft story text
            context: Optional context (storyteller background, purpose)

        Returns:
            Dict containing:
            - suggestions: List of specific improvements
            - strengths: What's already working well
            - tone_check: Alignment with Empathy Ledger values
        """

        prompt = f"""You are an editorial assistant for Empathy Ledger, an Indigenous-led storytelling platform.

DRAFT STORY:
{draft_text}

CONTEXT:
{json.dumps(context, indent=2) if context else 'No additional context'}

Your role is to SUGGEST improvements, NOT rewrite the story. Storytellers own their voice.

Please provide:

1. **Strengths**: What's already powerful about this draft (3-5 points)

2. **Suggestions**: Specific, actionable improvements (3-5 suggestions)
   - Focus on clarity, cultural grounding, strength-based framing
   - NEVER suggest removing the storyteller's unique voice
   - Flag any savior language, deficit framing, or othering

3. **Tone Alignment**: Does it align with Empathy Ledger values?
   ✅ Community voice-centered (not extractive)
   ✅ Strength-based (not deficit-focused)
   ✅ Relational language (we/us, connection)
   ✅ Cultural grounding (Country, Elders, protocols)
   ✅ Data sovereignty (OCAP principles)

4. **Cultural Sensitivity**: Any concerns about:
   - Sacred knowledge that needs Elder review?
   - Trauma content needing trigger warnings?
   - Consent/privacy considerations?

Return as JSON:
{{
  "strengths": ["strength1", "strength2", ...],
  "suggestions": [
    {{"area": "clarity/tone/cultural", "suggestion": "specific improvement", "example": "optional example"}},
    ...
  ],
  "tone_alignment": {{
    "voice_centered": true/false,
    "strength_based": true/false,
    "relational": true/false,
    "culturally_grounded": true/false,
    "data_sovereign": true/false
  }},
  "cultural_sensitivity": {{
    "elder_review_needed": true/false,
    "trigger_warning_needed": true/false,
    "consent_considerations": "any concerns"
  }},
  "overall_assessment": "brief summary"
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
            result = {"analysis": result_text}

        return result

    async def suggest_titles(self, story_text: str, count: int = 5) -> List[Dict]:
        """
        Suggest culturally appropriate titles.

        Args:
            story_text: The full story
            count: Number of title options to generate

        Returns:
            List of title suggestions with rationales
        """

        prompt = f"""Suggest {count} titles for this Indigenous storytelling piece.

STORY:
{story_text[:1000]}...  (excerpt)

Title Guidelines:
- Respectful and culturally grounded
- Avoid sensationalism or trauma-focused titles
- Use strength-based language
- Consider poetic/metaphorical options
- Avoid clichés or romanticization

Return as JSON:
{{
  "titles": [
    {{"title": "Title Option", "style": "poetic/direct/metaphorical", "rationale": "why this works"}},
    ...
  ]
}}
"""

        response = self.claude.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            temperature=0.5,  # Slightly higher for creativity
            messages=[{"role": "user", "content": prompt}]
        )

        result_text = response.content[0].text

        try:
            if "```json" in result_text:
                json_str = result_text.split("```json")[1].split("```")[0].strip()
                result = json.loads(json_str)
            else:
                result = json.loads(result_text)

            return result.get('titles', [])
        except:
            return [{"title": "Error parsing response", "rationale": result_text}]

    async def check_tone_alignment(self, text: str) -> Dict:
        """
        Check if text aligns with Empathy Ledger tone guidelines.

        Args:
            text: Story or content text

        Returns:
            Dict with alignment scores and flagged issues
        """

        flags = []

        text_lower = text.lower()

        # Check each language flag category
        for flag_name, flag_data in self.language_flags.items():
            patterns_found = []

            for pattern in flag_data['patterns']:
                if pattern in text_lower:
                    patterns_found.append(pattern)

            if patterns_found:
                flags.append({
                    'category': flag_name,
                    'patterns_found': patterns_found,
                    'severity': flag_data['severity'],
                    'suggestion': flag_data['suggestion']
                })

        # Calculate overall alignment
        high_severity_count = sum(1 for f in flags if f['severity'] == 'high')
        medium_severity_count = sum(1 for f in flags if f['severity'] == 'medium')

        if high_severity_count > 0:
            alignment_score = 'needs_work'
        elif medium_severity_count > 2:
            alignment_score = 'fair'
        elif medium_severity_count > 0:
            alignment_score = 'good'
        else:
            alignment_score = 'excellent'

        return {
            'alignment_score': alignment_score,
            'flags': flags,
            'flag_count': len(flags),
            'high_severity_count': high_severity_count,
            'medium_severity_count': medium_severity_count,
            'passed': high_severity_count == 0
        }

    async def generate_discussion_questions(self, story_text: str, audience: str = 'community') -> List[str]:
        """
        Generate discussion questions for storytelling circles.

        Args:
            story_text: The story
            audience: 'community', 'funder', 'research', 'education'

        Returns:
            List of discussion questions
        """

        audience_context = {
            'community': 'Questions should invite reflection, connection, and shared experience. Focus on meaning-making and collective wisdom.',
            'funder': 'Questions should highlight impact, outcomes, and social value. Connect to funding priorities.',
            'research': 'Questions should explore patterns, insights, and learnings. Academic but accessible.',
            'education': 'Questions should support learning, critical thinking, and empathy development.'
        }

        prompt = f"""Generate 5 discussion questions for this story.

STORY:
{story_text[:1000]}...  (excerpt)

AUDIENCE: {audience}
{audience_context.get(audience, '')}

Questions should:
- Be open-ended (not yes/no)
- Invite personal connection
- Respect cultural sensitivity
- Avoid extractive framing
- Support collective meaning-making

Return as JSON:
{{
  "questions": [
    "Question 1?",
    "Question 2?",
    ...
  ]
}}
"""

        response = self.claude.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            temperature=0.4,
            messages=[{"role": "user", "content": prompt}]
        )

        result_text = response.content[0].text

        try:
            if "```json" in result_text:
                json_str = result_text.split("```json")[1].split("```")[0].strip()
                result = json.loads(json_str)
            else:
                result = json.loads(result_text)

            return result.get('questions', [])
        except:
            return ["Error generating questions"]

    async def generate_summary(self, story_text: str, length: str = 'medium') -> str:
        """
        Generate a compelling summary (not extractive).

        Args:
            story_text: Full story
            length: 'short' (50 words), 'medium' (150 words), 'long' (300 words)

        Returns:
            Summary text
        """

        word_limits = {
            'short': 50,
            'medium': 150,
            'long': 300
        }

        word_limit = word_limits.get(length, 150)

        prompt = f"""Write a compelling {length} summary of this story (max {word_limit} words).

STORY:
{story_text}

Summary Guidelines:
- Capture the heart of the story (not just plot)
- Use strength-based language
- Respect cultural sensitivity
- Avoid spoiling key moments
- Invite readers to engage with the full story

Return just the summary text (no JSON).
"""

        response = self.claude.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=word_limit * 2,  # Token buffer
            temperature=0.4,
            messages=[{"role": "user", "content": prompt}]
        )

        summary = response.content[0].text.strip()

        # Remove quotes if Claude wrapped it
        if summary.startswith('"') and summary.endswith('"'):
            summary = summary[1:-1]

        return summary

    async def run(self, command: str) -> Dict:
        """
        Natural language interface to story writing support.

        Usage:
            await agent.run("refine this draft: [text]")
            await agent.run("suggest titles for: [text]")
            await agent.run("check tone alignment: [text]")
        """

        command_lower = command.lower()

        if 'refine' in command_lower or 'improve' in command_lower:
            return {'message': 'Use refine_story_draft() method with draft text'}

        elif 'title' in command_lower:
            return {'message': 'Use suggest_titles() method with story text'}

        elif 'tone' in command_lower or 'alignment' in command_lower:
            return {'message': 'Use check_tone_alignment() method with text'}

        elif 'discussion' in command_lower or 'questions' in command_lower:
            return {'message': 'Use generate_discussion_questions() method with story text'}

        elif 'summary' in command_lower:
            return {'message': 'Use generate_summary() method with story text'}

        elif 'help' in command_lower:
            return {
                'commands': [
                    'refine story draft',
                    'suggest titles',
                    'check tone alignment',
                    'generate discussion questions',
                    'generate summary'
                ],
                'note': 'Use specific methods with actual story text'
            }

        else:
            return {'error': 'Unknown command. Try "help" for available commands.'}


if __name__ == '__main__':
    # Example usage
    import asyncio

    async def test():
        agent = StoryWritingAgent()

        # Test tone alignment check
        sample_text = """
        We empower Indigenous communities to share their stories.
        Our platform helps marginalized voices be heard.
        """

        result = await agent.check_tone_alignment(sample_text)
        print("Tone Alignment Check:")
        print(json.dumps(result, indent=2))

    asyncio.run(test())

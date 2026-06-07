"""Impact Agent - SROI calculation, outcomes tracking, and impact reporting."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from typing import Dict, List, Optional
from tools.ghl_tool import GHLTool


class ImpactAgent:
    """
    Impact Agent - Calculates SROI and tracks outcomes.

    The ACT ecosystem measures impact across multiple dimensions:
    - Social Return on Investment (SROI)
    - Real-world outcomes (employment, housing, wellbeing)
    - Community engagement metrics
    - Policy influence
    - Systems change indicators

    This agent helps with:
    1. SROI Calculation: Calculate social value generated per dollar spent
    2. Outcomes Harvesting: Systematically capture real-world impacts
    3. Impact Narratives: Generate compelling stories for funders
    4. Reporting: Automated impact reports for stakeholders

    SROI Framework (Empathy Ledger Example):
    - Input: $50k grant
    - Activities: 50 storytellers trained, 200 stories collected
    - Outputs: Digital archive, community connections
    - Outcomes: Preserved culture, healing, policy influence
    - Impact: $250k social value = 5:1 SROI ratio

    Usage:
        agent = ImpactAgent(ghl_tool)

        # Calculate SROI for a project
        sroi = await agent.calculate_sroi('empathy-ledger', investment=50000)

        # Harvest outcomes
        outcomes = await agent.harvest_outcomes('justicehub')

        # Generate impact narrative
        narrative = await agent.generate_narrative('empathy-ledger', 'Q4 2025')
    """

    def __init__(self, ghl_tool: Optional[GHLTool] = None):
        self.ghl = ghl_tool or GHLTool()

        # Define SROI value proxies for each outcome type
        self.value_proxies = self._define_value_proxies()

        # Define outcome categories
        self.outcome_categories = self._define_outcome_categories()

    def _define_value_proxies(self) -> Dict:
        """
        Define financial proxies for social outcomes.

        Values based on Australian social impact research and ACT's
        own SROI calculations.

        Returns:
            Dict mapping outcome types to dollar values
        """
        return {
            # Employment outcomes
            'employment_gained': 25000,  # Annual salary proxy
            'employment_retained': 15000,  # Retention value
            'skills_training': 5000,  # Training program cost avoided

            # Justice outcomes
            'avoided_incarceration': 150000,  # Cost of incarceration per person/year
            'family_reunification': 20000,  # Child protection cost avoided
            'reduced_recidivism': 100000,  # Multi-year incarceration cost avoided

            # Health/Wellbeing outcomes
            'mental_health_improvement': 10000,  # Healthcare cost proxy
            'wellbeing_increase': 5000,  # Preventative health value
            'burnout_prevention': 15000,  # Productivity loss avoided (healthcare workers)

            # Cultural/Community outcomes
            'cultural_preservation': 8000,  # Archival/preservation value per story
            'community_connection': 3000,  # Social capital value
            'healing_achieved': 12000,  # Trauma therapy cost proxy

            # Housing/Stability outcomes
            'housing_secured': 30000,  # Annual housing support cost avoided
            'housing_stability': 15000,  # Eviction prevention value

            # Education outcomes
            'education_completed': 10000,  # Course completion value
            'certification_achieved': 8000,  # Professional certification value

            # Policy/Systems Change
            'policy_influenced': 50000,  # Value of policy reform per influence point
            'program_replicated': 25000,  # Value of scaling innovation
        }

    def _define_outcome_categories(self) -> Dict:
        """
        Define outcome categories for each project.

        Returns:
            Dict mapping projects to tracked outcome categories
        """
        return {
            'empathy-ledger': [
                'cultural_preservation',
                'community_connection',
                'healing_achieved',
                'policy_influenced',
                'stories_amplified'
            ],

            'justicehub': [
                'avoided_incarceration',
                'family_reunification',
                'reduced_recidivism',
                'housing_secured',
                'employment_gained',
                'policy_influenced'
            ],

            'the-harvest': [
                'community_connection',
                'wellbeing_increase',
                'mental_health_improvement',
                'skills_training',
                'food_security_improved'
            ],

            'act-farm': [
                'skills_training',
                'research_outcomes',
                'biodiversity_improved',
                'community_connection',
                'education_completed'
            ],

            'goods': [
                'employment_gained',
                'income_generated',
                'environmental_benefit',
                'cultural_preservation',
                'circular_economy_value'
            ]
        }

    async def calculate_sroi(
        self,
        project: str,
        investment: float,
        outcomes: Optional[Dict[str, int]] = None
    ) -> Dict:
        """
        Calculate Social Return on Investment (SROI).

        Args:
            project: Project name
            investment: Total investment amount ($)
            outcomes: Dict mapping outcome types to counts
                      (if None, will estimate from GHL data)

        Returns:
            SROI calculation with detailed breakdown
        """
        # If no outcomes provided, estimate from GHL data
        if outcomes is None:
            outcomes = await self._estimate_outcomes(project)

        # Calculate social value for each outcome
        total_value = 0
        value_breakdown = {}

        for outcome_type, count in outcomes.items():
            # Get value proxy
            unit_value = self.value_proxies.get(outcome_type, 0)

            # Calculate total value
            outcome_value = unit_value * count

            value_breakdown[outcome_type] = {
                'count': count,
                'unit_value': unit_value,
                'total_value': outcome_value
            }

            total_value += outcome_value

        # Calculate SROI ratio
        sroi_ratio = total_value / investment if investment > 0 else 0

        return {
            'project': project,
            'investment': investment,
            'total_social_value': total_value,
            'sroi_ratio': sroi_ratio,
            'value_breakdown': value_breakdown,
            'interpretation': self._interpret_sroi(sroi_ratio)
        }

    def _interpret_sroi(self, ratio: float) -> str:
        """Interpret SROI ratio"""
        if ratio >= 5:
            return "Excellent - High social return"
        elif ratio >= 3:
            return "Good - Above average impact"
        elif ratio >= 1:
            return "Positive - Creating value"
        else:
            return "Below break-even - Review needed"

    async def _estimate_outcomes(self, project: str) -> Dict[str, int]:
        """
        Estimate outcomes from GHL data.

        Real implementation would query GHL custom fields
        and count outcomes. Mock for now.

        Args:
            project: Project name

        Returns:
            Dict mapping outcome types to estimated counts
        """
        # Mock outcomes (real would pull from GHL)
        mock_outcomes = {
            'empathy-ledger': {
                'cultural_preservation': 50,  # 50 stories preserved
                'community_connection': 30,  # 30 connections made
                'healing_achieved': 15,  # 15 storytellers report healing
                'policy_influenced': 2,  # 2 policy changes influenced
            },

            'justicehub': {
                'avoided_incarceration': 12,  # 12 youths diverted
                'family_reunification': 8,  # 8 families supported
                'reduced_recidivism': 5,  # 5 participants stayed out of system
                'employment_gained': 10,  # 10 secured employment
            },

            'the-harvest': {
                'community_connection': 100,  # 100 volunteers engaged
                'wellbeing_increase': 50,  # 50 report improved wellbeing
                'skills_training': 30,  # 30 gained skills
            },

            'act-farm': {
                'skills_training': 20,  # 20 trained in regen ag
                'research_outcomes': 5,  # 5 research outputs
                'education_completed': 15,  # 15 completed programs
            },

            'goods': {
                'employment_gained': 8,  # 8 jobs created
                'income_generated': 40,  # 40 community members earned
                'environmental_benefit': 100,  # 100 units of waste diverted
            }
        }

        return mock_outcomes.get(project, {})

    async def harvest_outcomes(self, project: str) -> List[Dict]:
        """
        Systematically harvest outcomes from a project.

        Outcomes harvesting is a method for identifying and
        capturing real-world changes resulting from activities.

        Args:
            project: Project name

        Returns:
            List of outcomes with details
        """
        # Mock outcomes (real would pull from GHL + storyteller interviews)
        mock_harvested = [
            {
                'outcome': 'Cultural preservation',
                'description': '50 Indigenous stories documented and archived',
                'significance': 'High - preserves endangered cultural knowledge',
                'evidence': 'Story count in database, Elder testimonials',
                'beneficiaries': '50 storytellers, 3 communities'
            },
            {
                'outcome': 'Policy influence',
                'description': 'Stories used in 2 government policy consultations',
                'significance': 'High - direct input to justice reform',
                'evidence': 'Government consultation documents, citations',
                'beneficiaries': 'Justice-involved youth statewide'
            },
            {
                'outcome': 'Healing and connection',
                'description': '15 storytellers report healing through sharing stories',
                'significance': 'Medium-High - therapeutic value',
                'evidence': 'Storyteller surveys, qualitative interviews',
                'beneficiaries': '15 individuals, their families'
            }
        ]

        return mock_harvested

    async def generate_narrative(
        self,
        project: str,
        period: str,
        audience: str = 'funder'
    ) -> str:
        """
        Generate compelling impact narrative.

        Args:
            project: Project name
            period: Time period (e.g., 'Q4 2025')
            audience: Target audience ('funder', 'public', 'community')

        Returns:
            Impact narrative text
        """
        # Calculate SROI
        sroi = await self.calculate_sroi(project, investment=50000)

        # Harvest outcomes
        outcomes = await self.harvest_outcomes(project)

        # Generate narrative based on audience
        if audience == 'funder':
            narrative = self._generate_funder_narrative(project, period, sroi, outcomes)
        elif audience == 'public':
            narrative = self._generate_public_narrative(project, period, sroi, outcomes)
        elif audience == 'community':
            narrative = self._generate_community_narrative(project, period, sroi, outcomes)
        else:
            narrative = "Unknown audience type"

        return narrative

    def _generate_funder_narrative(
        self,
        project: str,
        period: str,
        sroi: Dict,
        outcomes: List[Dict]
    ) -> str:
        """Generate funder-focused narrative (emphasizes ROI and metrics)"""
        return f"""
Impact Report: {project} - {period}

EXECUTIVE SUMMARY
Your investment of ${sroi['investment']:,} generated ${sroi['total_social_value']:,} in social value,
achieving a {sroi['sroi_ratio']:.1f}:1 SROI ratio. {sroi['interpretation']}.

KEY OUTCOMES
{chr(10).join([f"• {o['outcome']}: {o['description']}" for o in outcomes[:3]])}

VALUE CREATED
{chr(10).join([
    f"• {outcome}: {details['count']} × ${details['unit_value']:,} = ${details['total_value']:,}"
    for outcome, details in list(sroi['value_breakdown'].items())[:5]
])}

NEXT STEPS
We recommend continued investment to scale impact and replicate proven interventions.
""".strip()

    def _generate_public_narrative(
        self,
        project: str,
        period: str,
        sroi: Dict,
        outcomes: List[Dict]
    ) -> str:
        """Generate public-facing narrative (emphasizes stories and change)"""
        return f"""
{project.title()} Impact - {period}

Real stories. Real change. Real communities.

{chr(10).join([f"✓ {o['description']}" for o in outcomes[:3]])}

Every dollar invested creates ${sroi['sroi_ratio']:.1f} in social value for communities.

Join us in building a more regenerative future.
""".strip()

    def _generate_community_narrative(
        self,
        project: str,
        period: str,
        sroi: Dict,
        outcomes: List[Dict]
    ) -> str:
        """Generate community-facing narrative (emphasizes their voice and leadership)"""
        return f"""
Community Impact: {project} - {period}

You made this happen. This is your impact.

{chr(10).join([f"• {o['outcome']}: {o['beneficiaries']}" for o in outcomes[:3]])}

Together, we're creating lasting change in our communities.
""".strip()

    async def run(self, task: str) -> str:
        """
        Execute an impact task based on natural language description.

        Supported tasks:
        - "calculate sroi for [project]"
        - "harvest outcomes for [project]"
        - "generate narrative for [project] [audience]"
        - "show value proxies"

        Args:
            task: Natural language task description

        Returns:
            Human-readable result
        """
        task_lower = task.lower()

        # Calculate SROI
        if 'calculate sroi' in task_lower or 'sroi for' in task_lower:
            # Extract project name
            for project in ['empathy-ledger', 'justicehub', 'the-harvest', 'act-farm', 'goods']:
                if project in task_lower:
                    sroi = await self.calculate_sroi(project, investment=50000)

                    value_list = "\n".join([
                        f"  • {outcome}: {details['count']} × ${details['unit_value']:,} = ${details['total_value']:,}"
                        for outcome, details in list(sroi['value_breakdown'].items())[:5]
                    ])

                    return (
                        f"SROI Calculation: {project}\n\n"
                        f"Investment: ${sroi['investment']:,}\n"
                        f"Social Value Created: ${sroi['total_social_value']:,}\n"
                        f"SROI Ratio: {sroi['sroi_ratio']:.1f}:1\n"
                        f"Interpretation: {sroi['interpretation']}\n\n"
                        f"Value Breakdown:\n{value_list}"
                    )

        # Harvest outcomes
        elif 'harvest outcomes' in task_lower or 'outcomes for' in task_lower:
            # Extract project name
            for project in ['empathy-ledger', 'justicehub', 'the-harvest', 'act-farm', 'goods']:
                if project in task_lower:
                    outcomes = await self.harvest_outcomes(project)

                    outcome_list = "\n".join([
                        f"  • {o['outcome']}\n"
                        f"    {o['description']}\n"
                        f"    Significance: {o['significance']}\n"
                        f"    Beneficiaries: {o['beneficiaries']}"
                        for o in outcomes
                    ])

                    return f"Harvested Outcomes: {project}\n\n{outcome_list}"

        # Generate narrative
        elif 'generate narrative' in task_lower or 'impact narrative' in task_lower:
            # Extract project and audience
            project = 'empathy-ledger'  # Default
            audience = 'funder'  # Default

            for proj in ['empathy-ledger', 'justicehub', 'the-harvest', 'act-farm', 'goods']:
                if proj in task_lower:
                    project = proj

            for aud in ['funder', 'public', 'community']:
                if aud in task_lower:
                    audience = aud

            narrative = await self.generate_narrative(project, 'Q4 2025', audience)
            return narrative

        # Show value proxies
        elif 'value proxies' in task_lower or 'show values' in task_lower:
            proxy_list = "\n".join([
                f"  • {outcome}: ${value:,}"
                for outcome, value in sorted(
                    self.value_proxies.items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:10]
            ])

            return f"Social Value Proxies (Top 10):\n\n{proxy_list}"

        else:
            return (
                "Unknown impact task. Supported commands:\n"
                "  • calculate sroi for [project]\n"
                "  • harvest outcomes for [project]\n"
                "  • generate narrative for [project] [audience]\n"
                "  • show value proxies"
            )


# Async main for testing
async def main():
    """Test the impact agent"""
    agent = ImpactAgent()

    # Test 1: Calculate SROI
    print("\n=== Test 1: Calculate SROI ===")
    result = await agent.run("calculate sroi for empathy-ledger")
    print(result)

    # Test 2: Harvest outcomes
    print("\n=== Test 2: Harvest Outcomes ===")
    result = await agent.run("harvest outcomes for empathy-ledger")
    print(result)

    # Test 3: Generate narrative
    print("\n=== Test 3: Generate Impact Narrative (Funder) ===")
    result = await agent.run("generate narrative for empathy-ledger funder")
    print(result)

    # Test 4: Show value proxies
    print("\n=== Test 4: Value Proxies ===")
    result = await agent.run("show value proxies")
    print(result)


if __name__ == '__main__':
    import asyncio
    asyncio.run(main())

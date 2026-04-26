"""Grant Agent - Grant research, matching, and automated reporting."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from typing import Dict, List, Optional
from tools.web_search_tool import WebSearchTool
from tools.ghl_tool import GHLTool


class GrantAgent:
    """
    Grant Agent - Finds grants, matches to projects, generates reports.

    The ACT ecosystem pursues $300k-$1M in grants annually across:
    - Federal government (GrantConnect)
    - State government (QLD Gov)
    - Philanthropies (Philanthropy Australia, community foundations)
    - Corporate partnerships

    This agent helps with:
    1. Grant Discovery: Web scrape grant portals for opportunities
    2. Grant Matching: Match grants to ACT projects using keywords
    3. Application Assembly: Auto-generate draft applications
    4. Reporting: Automated grant reports for funders

    Grant Matching by Project:
    - Empathy Ledger: storytelling, digital archive, Indigenous, cultural protocols
    - JusticeHub: youth justice, family support, recidivism, reentry
    - The Harvest: community, regenerative, food security, volunteering
    - ACT Farm: regenerative agriculture, conservation, biodiversity
    - Goods: circular economy, Indigenous business, ethical supply chain

    Usage:
        agent = GrantAgent(web_tool, ghl_tool)

        # Find grants for a project
        grants = await agent.find_grants('empathy-ledger')

        # Generate grant report
        report = await agent.generate_report('funder_name', 'Q4 2025')

        # Check grant deadlines
        deadlines = await agent.check_deadlines()
    """

    def __init__(self, web_tool: Optional[WebSearchTool] = None, ghl_tool: Optional[GHLTool] = None):
        self.web = web_tool or WebSearchTool()
        self.ghl = ghl_tool or GHLTool()

        # Define grant keywords for each project
        self.project_keywords = self._define_project_keywords()

        # Define grant portals to monitor
        self.grant_portals = self._define_grant_portals()

    def _define_project_keywords(self) -> Dict:
        """
        Define grant keywords for each ACT project.

        Returns:
            Dict mapping project names to keyword lists
        """
        return {
            'empathy-ledger': [
                # Primary keywords
                'storytelling', 'digital archive', 'Indigenous', 'cultural protocols',
                'oral history', 'narrative', 'OCAP', 'data sovereignty',

                # Secondary keywords
                'community memory', 'story sharing', 'First Nations',
                'cultural safety', 'ethical technology', 'consent',

                # Technology keywords
                'digital platform', 'SaaS', 'technology innovation',
                'AI ethics', 'cultural database'
            ],

            'justicehub': [
                # Primary keywords
                'youth justice', 'family support', 'incarceration', 'reentry',
                'recidivism', 'justice reform', 'CONTAINED',

                # Secondary keywords
                'restorative justice', 'community corrections', 'diversion',
                'youth services', 'family strengthening', 'wraparound support',

                # Innovation keywords
                'justice innovation', 'evidence-based', 'trauma-informed',
                'systems change', 'policy reform'
            ],

            'the-harvest': [
                # Primary keywords
                'community', 'regenerative', 'food security', 'volunteering',
                'CSA', 'community garden', 'wellbeing',

                # Secondary keywords
                'mental health', 'social enterprise', 'local food',
                'community hub', 'seasonal gatherings', 'food access',

                # Health keywords
                'healthcare worker', 'burnout prevention', 'therapeutic gardens'
            ],

            'act-farm': [
                # Primary keywords
                'regenerative agriculture', 'conservation', 'biodiversity',
                'Indigenous land management', 'research', 'residencies',

                # Secondary keywords
                'agroforestry', 'habitat restoration', 'threatened species',
                'sustainable tourism', 'land stewardship', 'monitoring',

                # Innovation keywords
                'living lab', 'R&D', 'conservation research', 'ecological restoration'
            ],

            'goods': [
                # Primary keywords
                'circular economy', 'Indigenous business', 'ethical supply chain',
                'waste to wealth', 'native ingredients', 'co-design',

                # Secondary keywords
                'social procurement', 'Indigenous employment', 'remote communities',
                'product innovation', 'manufacturing', 'sustainability'
            ],

            # Cross-project keywords (apply to multiple)
            'cross-project': [
                'regenerative innovation', 'community-led', 'First Nations partnerships',
                'systems change', 'capacity building', 'impact measurement',
                'SROI', 'evidence-based', 'scalable', 'replicable'
            ]
        }

    def _define_grant_portals(self) -> List[Dict]:
        """
        Define grant portals to monitor.

        Returns:
            List of portal configurations
        """
        return [
            {
                'name': 'GrantConnect (Federal)',
                'url': 'https://www.grants.gov.au/',
                'frequency': 'weekly',
                'coverage': 'Federal government grants'
            },
            {
                'name': 'Queensland Government',
                'url': 'https://www.qld.gov.au/jobs/business-jobs-industry/support-for-business/grants',
                'frequency': 'weekly',
                'coverage': 'State grants and programs'
            },
            {
                'name': 'Philanthropy Australia',
                'url': 'https://www.philanthropy.org.au/',
                'frequency': 'monthly',
                'coverage': 'Philanthropic opportunities'
            },
            {
                'name': 'NRMA Community Grants',
                'url': 'https://www.mynrma.com.au/community/grants',
                'frequency': 'quarterly',
                'coverage': 'Community and environmental grants'
            },
            {
                'name': 'Gambling Community Benefit Fund',
                'url': 'https://www.justice.qld.gov.au/initiatives/community-grants/gambling-community-benefit-fund',
                'frequency': 'quarterly',
                'coverage': 'QLD community benefit grants'
            }
        ]

    async def find_grants(self, project_name: str) -> List[Dict]:
        """
        Find grants matching a specific ACT project.

        Args:
            project_name: Project name (e.g., 'empathy-ledger', 'justicehub')

        Returns:
            List of matching grant opportunities
        """
        # Get keywords for this project
        keywords = self.project_keywords.get(project_name, [])
        if not keywords:
            raise ValueError(f"Unknown project: {project_name}")

        # Add cross-project keywords
        keywords.extend(self.project_keywords.get('cross-project', []))

        # Search grant portals
        all_grants = []

        # Use web tool to search for grants
        for portal in self.grant_portals:
            try:
                # Search each portal
                grants = await self.web.monitor_grant_portal(portal['url'], keywords)

                # Add portal metadata
                for grant in grants:
                    grant['portal'] = portal['name']
                    grant['project'] = project_name

                all_grants.extend(grants)

            except Exception as e:
                print(f"⚠️ Error searching {portal['name']}: {e}")
                continue

        # Calculate relevance score
        for grant in all_grants:
            grant['relevance_score'] = len(grant.get('matched_keywords', []))

        # Sort by relevance
        all_grants.sort(key=lambda g: g.get('relevance_score', 0), reverse=True)

        return all_grants

    async def find_all_grants(self) -> Dict[str, List[Dict]]:
        """
        Find grants for all ACT projects.

        Returns:
            Dict mapping project names to grant opportunities
        """
        projects = ['empathy-ledger', 'justicehub', 'the-harvest', 'act-farm', 'goods']

        all_grants = {}

        for project in projects:
            try:
                grants = await self.find_grants(project)
                all_grants[project] = grants
            except Exception as e:
                print(f"⚠️ Error finding grants for {project}: {e}")
                all_grants[project] = []

        return all_grants

    async def check_deadlines(self, days_ahead: int = 30) -> List[Dict]:
        """
        Check upcoming grant deadlines.

        Args:
            days_ahead: Look ahead this many days

        Returns:
            List of grants with approaching deadlines
        """
        # Mock implementation (real would parse actual deadlines from grant data)
        upcoming = []

        # In real implementation, would:
        # 1. Get all grants from GHL (stored in grant pipeline)
        # 2. Parse deadline dates
        # 3. Filter for those within days_ahead
        # 4. Sort by deadline

        return upcoming

    async def generate_report(
        self,
        funder_name: str,
        period: str,
        project: Optional[str] = None
    ) -> Dict:
        """
        Generate automated grant report for a funder.

        Pulls data from:
        - GHL (contact metrics, pipeline progress)
        - Supabase (platform metrics, outcomes)
        - Notion (activity log, milestones)

        Args:
            funder_name: Name of the funder
            period: Reporting period (e.g., 'Q4 2025', 'Jan 2026')
            project: Specific project (if funder supports single project)

        Returns:
            Report data structure
        """
        report = {
            'funder_name': funder_name,
            'period': period,
            'generated_date': 'mock_date',
            'sections': {}
        }

        # Section 1: Executive Summary
        report['sections']['executive_summary'] = self._generate_executive_summary(project)

        # Section 2: Impact Metrics
        report['sections']['impact_metrics'] = await self._generate_impact_metrics(project)

        # Section 3: Financial Summary
        report['sections']['financial'] = await self._generate_financial_summary(project, period)

        # Section 4: Stories & Testimonials
        report['sections']['stories'] = await self._generate_stories(project)

        # Section 5: Next Steps
        report['sections']['next_steps'] = self._generate_next_steps(project)

        return report

    def _generate_executive_summary(self, project: Optional[str]) -> str:
        """Generate executive summary section (mock)"""
        if project:
            return f"This report covers activities for {project} during the reporting period."
        else:
            return "This report covers activities across all ACT projects during the reporting period."

    async def _generate_impact_metrics(self, project: Optional[str]) -> Dict:
        """Generate impact metrics section"""
        # Mock metrics (real would pull from GHL + Supabase)
        return {
            'contacts_engaged': 150,
            'services_delivered': 45,
            'volunteer_hours': 320,
            'outcomes_achieved': 12,
            'note': 'Mock data - real would aggregate from GHL + Supabase'
        }

    async def _generate_financial_summary(self, project: Optional[str], period: str) -> Dict:
        """Generate financial summary section"""
        # Mock financials (real would pull from GHL + accounting)
        return {
            'grant_amount': 50000,
            'amount_spent': 35000,
            'remaining': 15000,
            'variance': 'On track',
            'note': 'Mock data - real would pull from financial records'
        }

    async def _generate_stories(self, project: Optional[str]) -> List[str]:
        """Generate stories & testimonials section"""
        # Mock stories (real would pull from Empathy Ledger)
        return [
            "Story 1: Impact of program on community member",
            "Story 2: Testimonial from volunteer",
            "Story 3: Success case from program participant"
        ]

    def _generate_next_steps(self, project: Optional[str]) -> List[str]:
        """Generate next steps section"""
        return [
            "Continue program delivery",
            "Expand to new community partners",
            "Measure long-term outcomes"
        ]

    async def run(self, task: str) -> str:
        """
        Execute a grant task based on natural language description.

        Supported tasks:
        - "find grants for [project-name]"
        - "find all grants"
        - "check deadlines"
        - "generate report for [funder] [period]"
        - "show grant portals"

        Args:
            task: Natural language task description

        Returns:
            Human-readable result
        """
        task_lower = task.lower()

        # Find grants for project
        if 'find grants for' in task_lower:
            # Extract project name
            for project in ['empathy-ledger', 'justicehub', 'the-harvest', 'act-farm', 'goods']:
                if project in task_lower:
                    grants = await self.find_grants(project)

                    if grants:
                        grant_list = "\n".join([
                            f"  • {g['title']} (Portal: {g.get('portal', 'Unknown')})\n"
                            f"    Matched keywords: {', '.join(g['matched_keywords'])}\n"
                            f"    Relevance: {g['relevance_score']}/10\n"
                            f"    {g['url']}"
                            for g in grants[:5]  # Top 5
                        ])
                        return f"Found {len(grants)} grants for {project}:\n\n{grant_list}"
                    else:
                        return f"No grants found for {project}"

        # Find all grants
        elif 'find all grants' in task_lower or 'all grants' in task_lower:
            all_grants = await self.find_all_grants()
            total = sum(len(grants) for grants in all_grants.values())

            summary_parts = [f"Found {total} total grants across all projects:\n"]
            for project, grants in all_grants.items():
                summary_parts.append(f"  • {project}: {len(grants)} grants")

            return "\n".join(summary_parts)

        # Check deadlines
        elif 'deadlines' in task_lower or 'due dates' in task_lower:
            deadlines = await self.check_deadlines()

            if deadlines:
                deadline_list = "\n".join([
                    f"  • {d['title']}: Due {d['deadline']}"
                    for d in deadlines
                ])
                return f"Upcoming grant deadlines:\n\n{deadline_list}"
            else:
                return "No upcoming grant deadlines (or feature not implemented in mock mode)"

        # Generate report
        elif 'generate report' in task_lower or 'create report' in task_lower:
            # Extract funder name (simplified - real would use NLP)
            funder_name = "Mock Funder"
            period = "Q4 2025"

            report = await self.generate_report(funder_name, period)

            return (
                f"Generated report for {report['funder_name']} ({report['period']})\n\n"
                f"Sections:\n"
                f"  • Executive Summary\n"
                f"  • Impact Metrics: {report['sections']['impact_metrics']['contacts_engaged']} contacts engaged\n"
                f"  • Financial: ${report['sections']['financial']['amount_spent']:,} spent of ${report['sections']['financial']['grant_amount']:,}\n"
                f"  • Stories: {len(report['sections']['stories'])} testimonials\n"
                f"  • Next Steps: {len(report['sections']['next_steps'])} action items"
            )

        # Show grant portals
        elif 'portals' in task_lower or 'sources' in task_lower:
            portal_list = "\n".join([
                f"  • {p['name']}\n"
                f"    {p['url']}\n"
                f"    Monitored: {p['frequency']}\n"
                f"    Coverage: {p['coverage']}"
                for p in self.grant_portals
            ])
            return f"Grant Portals Monitored:\n\n{portal_list}"

        else:
            return (
                "Unknown grant task. Supported commands:\n"
                "  • find grants for [project-name]\n"
                "  • find all grants\n"
                "  • check deadlines\n"
                "  • generate report for [funder] [period]\n"
                "  • show grant portals"
            )


# Async main for testing
async def main():
    """Test the grant agent"""
    agent = GrantAgent()

    # Test 1: Find grants for Empathy Ledger
    print("\n=== Test 1: Find Grants for Empathy Ledger ===")
    result = await agent.run("find grants for empathy-ledger")
    print(result)

    # Test 2: Show grant portals
    print("\n=== Test 2: Grant Portals ===")
    result = await agent.run("show grant portals")
    print(result)

    # Test 3: Generate report
    print("\n=== Test 3: Generate Report ===")
    result = await agent.run("generate report for Mock Funder Q4 2025")
    print(result)


if __name__ == '__main__':
    import asyncio
    asyncio.run(main())

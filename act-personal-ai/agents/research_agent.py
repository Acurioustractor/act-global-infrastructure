"""Research Agent - Enriches contacts, monitors grants, fills knowledge gaps."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from typing import Dict, List, Optional
from tools.web_search_tool import WebSearchTool
from tools.ghl_tool import GHLTool


class ResearchAgent:
    """
    Research Agent - Enriches contact data and monitors grants.

    Capabilities:
    1. Contact Enrichment:
       - Find LinkedIn profiles for contacts
       - Enrich organization data (website, size, industry)
       - Find social media profiles
       - Research SaaS companies (tech stack, funding)

    2. Grant Monitoring:
       - Monitor Australian grant portals (GrantConnect, QLD Gov, etc.)
       - Match grants to ACT projects based on keywords
       - Track application deadlines
       - Identify new opportunities

    3. Knowledge Gap Filling:
       - When coordinator doesn't know something, research it
       - Fact-check information before responding
       - Find up-to-date information (policies, regulations, etc.)

    Usage:
        agent = ResearchAgent(ghl_tool, web_tool)

        # Enrich a contact
        enriched = await agent.enrich_contact('contact_123')

        # Monitor grants for a project
        grants = await agent.find_grants_for_project('empathy-ledger')

        # Research a question
        answer = await agent.research_question("What is OCAP in Indigenous data governance?")
    """

    def __init__(self, ghl_tool: GHLTool, web_tool: Optional[WebSearchTool] = None):
        self.ghl = ghl_tool
        self.web = web_tool or WebSearchTool()

    async def enrich_contact(self, contact_id: str) -> Dict:
        """
        Enrich a contact with public data from the web.

        Steps:
        1. Get contact from GHL
        2. Search for LinkedIn profile
        3. If organization contact, enrich organization data
        4. Update GHL with enriched data (if in real mode)
        5. Return enrichment summary

        Args:
            contact_id: GHL contact ID

        Returns:
            Dict with enrichment results and updated fields
        """
        # Get contact from GHL
        contact = await self.ghl.get_contact(contact_id)

        name = f"{contact.get('firstName', '')} {contact.get('lastName', '')}".strip()
        email = contact.get('email', '')
        tags = contact.get('tags', [])

        enriched_data = {
            'contact_id': contact_id,
            'name': name,
            'enriched_fields': [],
            'linkedin_found': False,
            'organization_enriched': False
        }

        # Check if this is an organization contact (has 'category:organization' tag)
        is_organization = any('category:organization' in tag or 'lead:saas' in tag for tag in tags)

        if is_organization:
            # This is an organization lead - enrich organization data
            org_name = contact.get('companyName') or name
            org_data = await self.web.enrich_organization(org_name)

            if org_data.get('found'):
                enriched_data['organization_data'] = org_data
                enriched_data['organization_enriched'] = True

                # Update GHL (if not in mock mode)
                if not self.ghl.mock_mode:
                    update_fields = {}
                    if org_data.get('website'):
                        update_fields['website'] = org_data['website']
                    if org_data.get('linkedin_company_url'):
                        update_fields['linkedin_url'] = org_data['linkedin_company_url']

                    if update_fields:
                        await self.ghl.update_contact(contact_id, {'customFields': update_fields})
                        enriched_data['enriched_fields'].extend(update_fields.keys())

        else:
            # This is a person - enrich LinkedIn
            organization = contact.get('companyName')
            linkedin_data = await self.web.enrich_contact_linkedin(name, organization)

            if linkedin_data.get('found'):
                enriched_data['linkedin_url'] = linkedin_data['linkedin_url']
                enriched_data['linkedin_snippet'] = linkedin_data['profile_snippet']
                enriched_data['linkedin_found'] = True

                # Update GHL (if not in mock mode)
                if not self.ghl.mock_mode:
                    await self.ghl.update_contact(contact_id, {
                        'customFields': {'linkedin_url': linkedin_data['linkedin_url']}
                    })
                    enriched_data['enriched_fields'].append('linkedin_url')

        return enriched_data

    async def enrich_all_contacts(self, tags: Optional[List[str]] = None) -> Dict:
        """
        Enrich all contacts in GHL (or filtered by tags).

        Args:
            tags: Optional list of tags to filter contacts

        Returns:
            Dict with summary of enrichment results
        """
        # Get contacts
        filters = {'tags': tags} if tags else {}
        contacts = await self.ghl.search_contacts(filters)

        results = {
            'total_contacts': len(contacts),
            'enriched_count': 0,
            'linkedin_found': 0,
            'organizations_enriched': 0,
            'errors': []
        }

        for contact in contacts:
            try:
                enriched = await self.enrich_contact(contact['id'])

                if enriched.get('linkedin_found') or enriched.get('organization_enriched'):
                    results['enriched_count'] += 1

                if enriched.get('linkedin_found'):
                    results['linkedin_found'] += 1

                if enriched.get('organization_enriched'):
                    results['organizations_enriched'] += 1

            except Exception as e:
                results['errors'].append({
                    'contact_id': contact['id'],
                    'error': str(e)
                })

        return results

    async def find_grants_for_project(self, project_name: str) -> List[Dict]:
        """
        Find relevant grants for an ACT project.

        Keywords by project:
        - Empathy Ledger: storytelling, digital archive, Indigenous, cultural protocols
        - JusticeHub: youth justice, family support, incarceration, reentry
        - The Harvest: community, regenerative, volunteering, food security
        - ACT Farm: regenerative agriculture, conservation, research, tourism

        Args:
            project_name: Project name (empathy-ledger, justicehub, the-harvest, act-farm)

        Returns:
            List of matching grant opportunities
        """
        # Define keywords for each project
        project_keywords = {
            'empathy-ledger': [
                'storytelling', 'digital archive', 'Indigenous', 'cultural protocols',
                'oral history', 'community memory', 'data sovereignty', 'OCAP'
            ],
            'justicehub': [
                'youth justice', 'family support', 'incarceration', 'reentry',
                'justice reform', 'recidivism', 'community corrections', 'restorative justice'
            ],
            'the-harvest': [
                'community', 'regenerative', 'volunteering', 'food security',
                'community garden', 'social enterprise', 'wellbeing', 'mental health'
            ],
            'act-farm': [
                'regenerative agriculture', 'conservation', 'biodiversity', 'research',
                'sustainable tourism', 'Indigenous land management', 'agroforestry'
            ],
            'goods': [
                'Indigenous business', 'cultural enterprise', 'ethical supply chain',
                'native ingredients', 'Indigenous employment', 'social procurement'
            ]
        }

        # Get keywords for this project
        keywords = project_keywords.get(project_name.lower(), [])
        if not keywords:
            raise ValueError(f"Unknown project: {project_name}")

        # Search grant portals
        grants = await self.web.search_grants_australia(keywords)

        # Add project context to each grant
        for grant in grants:
            grant['project'] = project_name
            grant['relevance_score'] = len(grant.get('matched_keywords', []))

        # Sort by relevance (most matched keywords first)
        grants.sort(key=lambda g: g.get('relevance_score', 0), reverse=True)

        return grants

    async def monitor_all_grants(self) -> Dict:
        """
        Monitor grants for ALL ACT projects.

        Returns:
            Dict with grants organized by project
        """
        projects = [
            'empathy-ledger',
            'justicehub',
            'the-harvest',
            'act-farm',
            'goods'
        ]

        all_grants = {}

        for project in projects:
            try:
                grants = await self.find_grants_for_project(project)
                all_grants[project] = grants
            except Exception as e:
                print(f"⚠️ Error finding grants for {project}: {e}")
                all_grants[project] = []

        return all_grants

    async def research_question(self, question: str, max_results: int = 5) -> Dict:
        """
        Research a question using web search.

        Use this when the coordinator doesn't know something and needs
        to find up-to-date information.

        Args:
            question: Question to research
            max_results: Maximum search results to return

        Returns:
            Dict with search results and summary
        """
        results = await self.web.search(question, max_results=max_results)

        return {
            'question': question,
            'results': results,
            'sources': [r['url'] for r in results],
            'summary': self._summarize_search_results(results)
        }

    def _summarize_search_results(self, results: List[Dict]) -> str:
        """Create a text summary of search results"""
        if not results:
            return "No results found."

        summary_parts = []
        for i, result in enumerate(results[:3], 1):  # Top 3 results
            summary_parts.append(
                f"{i}. {result['title']}\n"
                f"   {result['snippet']}\n"
                f"   Source: {result['url']}"
            )

        return "\n\n".join(summary_parts)

    async def run(self, task: str) -> str:
        """
        Execute a research task based on natural language description.

        Supported tasks:
        - "enrich contact [contact_id]"
        - "enrich all contacts [with tags: tag1, tag2]"
        - "find grants for [project-name]"
        - "monitor all grants"
        - "research: [question]"

        Args:
            task: Natural language task description

        Returns:
            Human-readable result
        """
        task_lower = task.lower()

        # Enrich single contact
        if 'enrich contact' in task_lower and 'all' not in task_lower:
            # Extract contact ID (e.g., "enrich contact contact_001")
            parts = task.split()
            if len(parts) >= 3:
                contact_id = parts[2]
                result = await self.enrich_contact(contact_id)

                if result.get('linkedin_found') or result.get('organization_enriched'):
                    return (
                        f"✓ Enriched contact: {result['name']}\n"
                        f"  LinkedIn found: {result.get('linkedin_found', False)}\n"
                        f"  Organization enriched: {result.get('organization_enriched', False)}\n"
                        f"  Updated fields: {', '.join(result.get('enriched_fields', []))}"
                    )
                else:
                    return f"⚠️ No enrichment data found for {result['name']}"

        # Enrich all contacts
        elif 'enrich all' in task_lower:
            # Extract tags if provided (e.g., "enrich all contacts with tags: lead:saas, category:organization")
            tags = None
            if 'tags:' in task_lower:
                tags_part = task.split('tags:')[1].strip()
                tags = [tag.strip() for tag in tags_part.split(',')]

            result = await self.enrich_all_contacts(tags)
            return (
                f"✓ Enriched {result['enriched_count']}/{result['total_contacts']} contacts\n"
                f"  LinkedIn profiles found: {result['linkedin_found']}\n"
                f"  Organizations enriched: {result['organizations_enriched']}\n"
                f"  Errors: {len(result['errors'])}"
            )

        # Find grants for project
        elif 'find grants' in task_lower or 'grants for' in task_lower:
            # Extract project name (e.g., "find grants for empathy-ledger")
            for project in ['empathy-ledger', 'justicehub', 'the-harvest', 'act-farm', 'goods']:
                if project in task_lower:
                    grants = await self.find_grants_for_project(project)
                    if grants:
                        grant_list = "\n".join([
                            f"  • {g['title']} (matched: {', '.join(g['matched_keywords'])})\n"
                            f"    {g['url']}"
                            for g in grants[:5]  # Top 5
                        ])
                        return f"Found {len(grants)} grants for {project}:\n\n{grant_list}"
                    else:
                        return f"No grants found for {project}"

        # Monitor all grants
        elif 'monitor all grants' in task_lower or 'all grants' in task_lower:
            all_grants = await self.monitor_all_grants()
            total = sum(len(grants) for grants in all_grants.values())

            summary_parts = [f"Found {total} total grants across all projects:\n"]
            for project, grants in all_grants.items():
                summary_parts.append(f"  • {project}: {len(grants)} grants")

            return "\n".join(summary_parts)

        # Research question
        elif 'research:' in task_lower or 'search:' in task_lower:
            # Extract question (everything after "research:" or "search:")
            if 'research:' in task_lower:
                question = task.split('research:', 1)[1].strip()
            else:
                question = task.split('search:', 1)[1].strip()

            result = await self.research_question(question)
            return (
                f"Research results for: {question}\n\n"
                f"{result['summary']}\n\n"
                f"Sources:\n" + "\n".join([f"  • {url}" for url in result['sources']])
            )

        else:
            return (
                "Unknown research task. Supported tasks:\n"
                "  • enrich contact [contact_id]\n"
                "  • enrich all contacts [with tags: tag1, tag2]\n"
                "  • find grants for [project-name]\n"
                "  • monitor all grants\n"
                "  • research: [question]"
            )


# Async main for testing
async def main():
    """Test the research agent"""
    from tools.ghl_tool import GHLTool

    ghl_tool = GHLTool()  # Mock mode
    agent = ResearchAgent(ghl_tool)

    # Test 1: Enrich a contact
    print("\n=== Test 1: Enrich Contact ===")
    result = await agent.run("enrich contact contact_001")
    print(result)

    # Test 2: Research a question
    print("\n=== Test 2: Research Question ===")
    result = await agent.run("research: What is OCAP in Indigenous data governance?")
    print(result)

    # Test 3: Find grants for project
    print("\n=== Test 3: Find Grants for Empathy Ledger ===")
    result = await agent.run("find grants for empathy-ledger")
    print(result)


if __name__ == '__main__':
    import asyncio
    asyncio.run(main())

"""Search Agent - Natural language CRM queries and advanced filtering."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from typing import Dict, List, Optional
from tools.ghl_tool import GHLTool


class SearchAgent:
    """
    Search Agent - Natural language CRM queries.

    This agent translates natural language questions into GHL queries,
    making it easy to find contacts without knowing the exact filter syntax.

    Instead of this:
        ghl.search_contacts({
            'tags': ['the-harvest', 'role:volunteer'],
            'customFieldFilters': {'volunteer_hours_total': {'$gte': 50}}
        })

    You can do this:
        agent.search("active volunteers in The Harvest with 50+ hours")

    Natural Language Query Examples:
    - "Show me all active volunteers with 50+ hours"
    - "Find University partners in Empathy Ledger"
    - "Who needs community support in JusticeHub?"
    - "List all Elders across all projects"
    - "Find SaaS leads with high health scores"
    - "Show contacts who attended 3+ events"
    - "Find people interested in conservation"

    Query Understanding:
    - Projects: "empathy ledger", "the harvest", "justicehub", "act farm", "goods"
    - Roles: "volunteer", "elder", "partner", "resident", "storyteller"
    - Engagement: "active", "inactive", "high engagement", "new"
    - Numbers: "50+ hours", "3+ events", "high score (>80)", etc.
    - Interests: "conservation", "storytelling", "justice reform", etc.
    - Categories: "organization", "university", "nonprofit", "artist", etc.

    Usage:
        agent = SearchAgent(ghl_tool)

        # Natural language search
        results = await agent.search("active volunteers in The Harvest with 50+ hours")

        # Get search suggestions
        suggestions = agent.suggest_searches()

        # Parse query (for debugging)
        query = agent.parse_query("find elders in empathy ledger")
    """

    def __init__(self, ghl_tool: GHLTool):
        self.ghl = ghl_tool

        # Define keyword mappings for natural language understanding
        self.project_keywords = {
            'empathy ledger': 'empathy-ledger',
            'empathy-ledger': 'empathy-ledger',
            'ledger': 'empathy-ledger',
            'the harvest': 'the-harvest',
            'the-harvest': 'the-harvest',
            'harvest': 'the-harvest',
            'justicehub': 'justicehub',
            'justice hub': 'justicehub',
            'justice': 'justicehub',
            'act farm': 'act-farm',
            'act-farm': 'act-farm',
            'farm': 'act-farm',
            'goods': 'goods',
        }

        self.role_keywords = {
            'volunteer': 'role:volunteer',
            'volunteers': 'role:volunteer',
            'elder': 'role:elder',
            'elders': 'role:elder',
            'partner': 'role:partner',
            'partners': 'role:partner',
            'resident': 'role:resident',
            'residents': 'role:resident',
            'storyteller': 'role:storyteller',
            'storytellers': 'role:storyteller',
        }

        self.engagement_keywords = {
            'active': 'engagement:active',
            'inactive': 'engagement:inactive',
            'lead': 'engagement:lead',
            'alumni': 'engagement:alumni',
        }

        self.category_keywords = {
            'organization': 'category:organization',
            'organizations': 'category:organization',
            'university': 'category:university',
            'universities': 'category:university',
            'nonprofit': 'category:nonprofit',
            'nonprofits': 'category:nonprofit',
            'government': 'category:government',
            'artist': 'category:artist',
            'artists': 'category:artist',
        }

        self.interest_keywords = {
            'conservation': 'interest:conservation',
            'storytelling': 'interest:storytelling',
            'justice': 'interest:justice',
            'advocacy': 'interest:advocacy',
            'volunteering': 'interest:volunteering',
            'community': 'interest:community',
            'regenerative agriculture': 'interest:regenerative-agriculture',
            'regen ag': 'interest:regenerative-agriculture',
        }

    def parse_query(self, query: str) -> Dict:
        """
        Parse a natural language query into GHL filter format.

        Args:
            query: Natural language query (e.g., "active volunteers with 50+ hours")

        Returns:
            Dict with tags and customFieldFilters for GHL search
        """
        query_lower = query.lower()
        tags = []
        custom_field_filters = {}

        # Extract project tags
        for keyword, tag in self.project_keywords.items():
            if keyword in query_lower:
                if tag not in tags:
                    tags.append(tag)

        # Extract role tags
        for keyword, tag in self.role_keywords.items():
            if keyword in query_lower:
                if tag not in tags:
                    tags.append(tag)

        # Extract engagement tags
        for keyword, tag in self.engagement_keywords.items():
            if keyword in query_lower:
                if tag not in tags:
                    tags.append(tag)

        # Extract category tags
        for keyword, tag in self.category_keywords.items():
            if keyword in query_lower:
                if tag not in tags:
                    tags.append(tag)

        # Extract interest tags
        for keyword, tag in self.interest_keywords.items():
            if keyword in query_lower:
                if tag not in tags:
                    tags.append(tag)

        # Extract numeric filters
        # Pattern: "50+ hours" → volunteer_hours_total >= 50
        if 'hours' in query_lower:
            import re
            match = re.search(r'(\d+)\+?\s*hours', query_lower)
            if match:
                hours = int(match.group(1))
                custom_field_filters['volunteer_hours_total'] = {'$gte': hours}

        # Pattern: "3+ events" → events_attended >= 3
        if 'events' in query_lower:
            import re
            match = re.search(r'(\d+)\+?\s*events', query_lower)
            if match:
                events = int(match.group(1))
                custom_field_filters['events_attended'] = {'$gte': events}

        # Pattern: "3+ stories" → stories_count >= 3
        if 'stories' in query_lower or 'story' in query_lower:
            import re
            match = re.search(r'(\d+)\+?\s*stor(?:y|ies)', query_lower)
            if match:
                stories = int(match.group(1))
                custom_field_filters['stories_count'] = {'$gte': stories}

        # Pattern: "health score > 80" → customer_health_score >= 80
        if 'health score' in query_lower or 'score' in query_lower:
            import re
            match = re.search(r'(?:score|health)\s*[>≥]\s*(\d+)', query_lower)
            if match:
                score = int(match.group(1))
                custom_field_filters['customer_health_score'] = {'$gte': score}

        # Pattern: "arr > 5000" or "revenue > 5000"
        if 'arr' in query_lower or 'revenue' in query_lower:
            import re
            match = re.search(r'(?:arr|revenue)\s*[>≥]\s*(\d+)', query_lower)
            if match:
                arr = int(match.group(1))
                custom_field_filters['arr'] = {'$gte': arr}

        # Build filter dict
        filters = {}
        if tags:
            filters['tags'] = tags
        if custom_field_filters:
            filters['customFieldFilters'] = custom_field_filters

        return filters

    async def search(self, query: str) -> List[Dict]:
        """
        Execute a natural language search query.

        Args:
            query: Natural language query

        Returns:
            List of matching contacts
        """
        filters = self.parse_query(query)

        # If no filters found, return empty list
        if not filters:
            return []

        results = await self.ghl.search_contacts(filters)
        return results

    async def count(self, query: str) -> int:
        """
        Count contacts matching a natural language query.

        Args:
            query: Natural language query

        Returns:
            Number of matching contacts
        """
        results = await self.search(query)
        return len(results)

    def suggest_searches(self) -> List[str]:
        """
        Get suggested search queries based on ACT ecosystem.

        Returns:
            List of example queries users can try
        """
        return [
            # The Harvest queries
            "active volunteers in The Harvest",
            "volunteers with 50+ hours",
            "people interested in conservation",

            # Empathy Ledger queries
            "elders in Empathy Ledger",
            "storytellers with 3+ stories",
            "people interested in storytelling",

            # JusticeHub queries
            "people interested in justice",
            "people needing community support",
            "advocacy partners in JusticeHub",

            # ACT Farm queries
            "residents in ACT Farm",
            "people interested in regenerative agriculture",
            "alumni from ACT Farm",

            # Organization/SaaS queries
            "university partners",
            "organizations in Empathy Ledger",
            "SaaS leads with health score > 80",
            "partners with arr > 5000",

            # Cross-project queries
            "all elders across all projects",
            "all active volunteers",
            "all partners",
        ]

    async def run(self, task: str) -> str:
        """
        Execute a search task based on natural language description.

        Supported tasks:
        - "search: [natural language query]"
        - "count: [natural language query]"
        - "suggest searches"

        Args:
            task: Natural language task description

        Returns:
            Human-readable result
        """
        task_lower = task.lower()

        # Search query
        if task_lower.startswith('search:') or task_lower.startswith('find'):
            # Extract query
            if task_lower.startswith('search:'):
                query = task.split(':', 1)[1].strip()
            elif task_lower.startswith('find'):
                query = task[4:].strip()  # Remove "find"
            else:
                return "Invalid search format. Use: search: [query] or find [query]"

            results = await self.search(query)

            if results:
                # Format results
                result_list = []
                for contact in results[:10]:  # Show first 10
                    name = f"{contact.get('firstName', '')} {contact.get('lastName', '')}".strip()
                    email = contact.get('email', '')
                    tags = ', '.join(contact.get('tags', [])[:3])  # First 3 tags
                    result_list.append(f"  • {name} ({email})\n    Tags: {tags}")

                results_text = "\n".join(result_list)
                more_text = f"\n\n... and {len(results) - 10} more" if len(results) > 10 else ""

                return (
                    f"Found {len(results)} contacts matching: {query}\n\n"
                    f"{results_text}{more_text}"
                )
            else:
                return f"No contacts found matching: {query}"

        # Count query
        elif task_lower.startswith('count:') or task_lower.startswith('how many'):
            # Extract query
            if task_lower.startswith('count:'):
                query = task.split(':', 1)[1].strip()
            elif task_lower.startswith('how many'):
                query = task[8:].strip()  # Remove "how many"
            else:
                return "Invalid count format. Use: count: [query] or how many [query]"

            count = await self.count(query)
            return f"Found {count} contacts matching: {query}"

        # Suggest searches
        elif 'suggest' in task_lower or 'examples' in task_lower:
            suggestions = self.suggest_searches()
            suggestions_text = "\n".join([f"  • {s}" for s in suggestions])
            return f"Example search queries:\n\n{suggestions_text}"

        else:
            return (
                "Unknown search task. Supported commands:\n"
                "  • search: [natural language query]\n"
                "  • find [natural language query]\n"
                "  • count: [natural language query]\n"
                "  • how many [natural language query]\n"
                "  • suggest searches"
            )


# Async main for testing
async def main():
    """Test the search agent"""
    from tools.ghl_tool import GHLTool

    ghl_tool = GHLTool()  # Mock mode
    agent = SearchAgent(ghl_tool)

    # Test 1: Search for volunteers
    print("\n=== Test 1: Search for Active Volunteers ===")
    result = await agent.run("search: active volunteers")
    print(result)

    # Test 2: Count volunteers
    print("\n=== Test 2: Count Volunteers ===")
    result = await agent.run("count: volunteers")
    print(result)

    # Test 3: Search with custom field filter
    print("\n=== Test 3: Search with Hours Filter ===")
    result = await agent.run("find volunteers with 50+ hours")
    print(result)

    # Test 4: Get suggestions
    print("\n=== Test 4: Search Suggestions ===")
    result = await agent.run("suggest searches")
    print(result)


if __name__ == '__main__':
    import asyncio
    asyncio.run(main())

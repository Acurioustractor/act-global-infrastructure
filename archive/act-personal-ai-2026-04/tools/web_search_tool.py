"""Web Search Tool - Search the web and scrape content."""
import os
import sys
from typing import Dict, List, Optional
import httpx
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from tools.base_tool import BaseTool


class WebSearchTool(BaseTool):
    """
    Web search and content scraping tool.

    Capabilities:
    - Search web for information (via DuckDuckGo or Brave Search API)
    - Scrape webpage content
    - Extract structured data from websites
    - Monitor grant portals
    - Enrich contact data with public information

    Week 1-2: Uses DuckDuckGo (free, no API key)
    Week 3+: Can upgrade to Brave Search API (paid, better results)
    """

    def __init__(self):
        super().__init__()
        self.brave_api_key = self.env.get('BRAVE_SEARCH_API_KEY')
        self.use_brave = bool(self.brave_api_key)

        if self.use_brave:
            print("✓ Using Brave Search API (premium)")
        else:
            print("✓ Using DuckDuckGo (free)")

    async def execute(self, action: str, **kwargs):
        """
        Execute a web search action.

        Args:
            action: Action to perform (search, scrape, enrich_linkedin, enrich_organization, monitor_grants)
            **kwargs: Action-specific parameters

        Returns:
            Result of the action
        """
        if action == 'search':
            return await self.search(kwargs.get('query', ''), kwargs.get('max_results', 5))
        elif action == 'scrape':
            return await self.scrape_page(kwargs.get('url', ''))
        elif action == 'enrich_linkedin':
            return await self.enrich_contact_linkedin(
                kwargs.get('name', ''),
                kwargs.get('organization')
            )
        elif action == 'enrich_organization':
            return await self.enrich_organization(kwargs.get('organization_name', ''))
        elif action == 'monitor_grants':
            return await self.search_grants_australia(kwargs.get('keywords', []))
        else:
            raise ValueError(f"Unknown action: {action}")

    async def search(self, query: str, max_results: int = 5) -> List[Dict]:
        """
        Search the web for a query.

        Args:
            query: Search query string
            max_results: Maximum number of results to return (default 5)

        Returns:
            List of search results with title, url, snippet
        """
        if self.use_brave:
            return await self._search_brave(query, max_results)
        else:
            return await self._search_duckduckgo(query, max_results)

    async def _search_brave(self, query: str, max_results: int) -> List[Dict]:
        """Search using Brave Search API (paid, better results)"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://api.search.brave.com/res/v1/web/search',
                headers={'X-Subscription-Token': self.brave_api_key},
                params={'q': query, 'count': max_results}
            )
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get('web', {}).get('results', [])[:max_results]:
            results.append({
                'title': item.get('title', ''),
                'url': item.get('url', ''),
                'snippet': item.get('description', ''),
                'published_date': item.get('age', '')
            })

        return results

    async def _search_duckduckgo(self, query: str, max_results: int) -> List[Dict]:
        """
        Search using DuckDuckGo (free, no API key required).

        Uses ddgs library (lightweight, no browser automation).
        """
        try:
            from ddgs import DDGS
        except ImportError:
            raise ImportError(
                "ddgs not installed. Run: pip install ddgs"
            )

        results = []
        with DDGS() as ddgs:
            for result in ddgs.text(query, max_results=max_results):
                results.append({
                    'title': result.get('title', ''),
                    'url': result.get('href', ''),
                    'snippet': result.get('body', ''),
                    'published_date': None  # DDG doesn't provide dates
                })

        return results

    async def scrape_page(self, url: str) -> Dict:
        """
        Scrape content from a webpage.

        Args:
            url: URL to scrape

        Returns:
            Dict with title, content, links, metadata
        """
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            html = response.text

        # Use BeautifulSoup for parsing
        try:
            from bs4 import BeautifulSoup
        except ImportError:
            raise ImportError(
                "beautifulsoup4 not installed. Run: pip install beautifulsoup4"
            )

        soup = BeautifulSoup(html, 'html.parser')

        # Extract text content (remove scripts, styles)
        for script in soup(['script', 'style']):
            script.decompose()

        text = soup.get_text()
        lines = (line.strip() for line in text.splitlines())
        text = '\n'.join(line for line in lines if line)

        # Extract links
        links = []
        for link in soup.find_all('a', href=True):
            links.append({
                'text': link.get_text(strip=True),
                'url': link['href']
            })

        return {
            'url': url,
            'title': soup.title.string if soup.title else '',
            'content': text,
            'links': links,
            'scraped_at': datetime.now().isoformat()
        }

    async def enrich_contact_linkedin(self, name: str, organization: Optional[str] = None) -> Dict:
        """
        Search for contact's LinkedIn profile.

        Args:
            name: Person's full name
            organization: Optional organization name (improves accuracy)

        Returns:
            Dict with LinkedIn URL, profile summary, or None if not found
        """
        query = f"{name} LinkedIn"
        if organization:
            query += f" {organization}"

        results = await self.search(query, max_results=3)

        # Filter for LinkedIn URLs
        linkedin_results = [
            r for r in results
            if 'linkedin.com/in/' in r['url']
        ]

        if linkedin_results:
            top_result = linkedin_results[0]
            return {
                'linkedin_url': top_result['url'],
                'profile_snippet': top_result['snippet'],
                'found': True
            }
        else:
            return {'found': False}

    async def enrich_organization(self, organization_name: str) -> Dict:
        """
        Enrich organization data with public information.

        Searches for:
        - Official website
        - Company size
        - Industry
        - Funding/revenue (if public)
        - Tech stack (if SaaS company)

        Args:
            organization_name: Name of the organization

        Returns:
            Dict with enriched data
        """
        # Search for organization
        results = await self.search(f"{organization_name} official website", max_results=5)

        enriched_data = {
            'organization_name': organization_name,
            'website': None,
            'description': None,
            'found': False
        }

        if results:
            # First result is usually the official website
            top_result = results[0]
            enriched_data['website'] = top_result['url']
            enriched_data['description'] = top_result['snippet']
            enriched_data['found'] = True

        # Search for LinkedIn company page (has company size, industry)
        linkedin_search = await self.search(
            f"{organization_name} site:linkedin.com/company",
            max_results=3
        )

        linkedin_company = [r for r in linkedin_search if '/company/' in r['url']]
        if linkedin_company:
            enriched_data['linkedin_company_url'] = linkedin_company[0]['url']
            enriched_data['linkedin_snippet'] = linkedin_company[0]['snippet']

        return enriched_data

    async def monitor_grant_portal(self, portal_url: str, keywords: List[str]) -> List[Dict]:
        """
        Monitor a grant portal for opportunities matching keywords.

        Args:
            portal_url: URL of the grant portal
            keywords: List of keywords to match (e.g., ['youth', 'justice', 'community'])

        Returns:
            List of matching grant opportunities
        """
        page_data = await self.scrape_page(portal_url)
        content = page_data['content'].lower()

        # Find links that contain keywords
        matching_grants = []
        for link in page_data['links']:
            link_text = link['text'].lower()
            link_url = link['url']

            # Check if any keyword matches
            if any(keyword.lower() in link_text for keyword in keywords):
                matching_grants.append({
                    'title': link['text'],
                    'url': link_url if link_url.startswith('http') else f"{portal_url.rstrip('/')}/{link_url.lstrip('/')}",
                    'matched_keywords': [kw for kw in keywords if kw.lower() in link_text]
                })

        return matching_grants

    async def search_grants_australia(self, keywords: List[str]) -> List[Dict]:
        """
        Search Australian grant portals for opportunities.

        Searches:
        - GrantConnect (federal government)
        - Queensland Government grants
        - Philanthropy Australia
        - Community grants

        Args:
            keywords: List of keywords (e.g., ['regenerative', 'community', 'Indigenous'])

        Returns:
            List of grant opportunities
        """
        grant_portals = [
            'https://www.grants.gov.au/',  # GrantConnect
            'https://www.qld.gov.au/jobs/business-jobs-industry/support-for-business/grants',  # QLD Gov
        ]

        all_grants = []

        for portal in grant_portals:
            try:
                grants = await self.monitor_grant_portal(portal, keywords)
                all_grants.extend(grants)
            except Exception as e:
                print(f"⚠️ Error scraping {portal}: {e}")
                continue

        return all_grants


# Async main for testing
async def main():
    """Test the web search tool"""
    tool = WebSearchTool()

    # Test 1: Basic search
    print("\n=== Test 1: Basic Search ===")
    results = await tool.search("regenerative agriculture Australia")
    for i, result in enumerate(results, 1):
        print(f"{i}. {result['title']}")
        print(f"   {result['url']}")
        print(f"   {result['snippet'][:100]}...")

    # Test 2: LinkedIn enrichment
    print("\n=== Test 2: LinkedIn Enrichment ===")
    linkedin_data = await tool.enrich_contact_linkedin(
        "Bill Gates",
        "Microsoft"
    )
    print(f"Found: {linkedin_data.get('found')}")
    if linkedin_data.get('found'):
        print(f"URL: {linkedin_data.get('linkedin_url')}")

    # Test 3: Organization enrichment
    print("\n=== Test 3: Organization Enrichment ===")
    org_data = await tool.enrich_organization("Canva")
    print(f"Website: {org_data.get('website')}")
    print(f"Description: {org_data.get('description', '')[:150]}...")


if __name__ == '__main__':
    import asyncio
    asyncio.run(main())

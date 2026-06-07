"""Tests for Search Agent - Natural language CRM queries"""
import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from agents.search_agent import SearchAgent
from tools.ghl_tool import GHLTool


@pytest.fixture
def ghl_tool():
    """Create GHL tool in mock mode"""
    tool = GHLTool()
    assert tool.mock_mode is True, "GHL tool should be in mock mode for testing"
    return tool


@pytest.fixture
def search_agent(ghl_tool):
    """Create search agent"""
    return SearchAgent(ghl_tool)


# ============================================================================
# Query Parsing Tests
# ============================================================================

def test_parse_query_project_tags(search_agent):
    """Test parsing project names into tags"""
    # Test various project name formats
    assert 'the-harvest' in search_agent.parse_query("volunteers in The Harvest")['tags']
    assert 'empathy-ledger' in search_agent.parse_query("storytellers in Empathy Ledger")['tags']
    assert 'justicehub' in search_agent.parse_query("partners in JusticeHub")['tags']
    assert 'act-farm' in search_agent.parse_query("residents at ACT Farm")['tags']


def test_parse_query_role_tags(search_agent):
    """Test parsing roles into tags"""
    assert 'role:volunteer' in search_agent.parse_query("volunteers")['tags']
    assert 'role:elder' in search_agent.parse_query("elders")['tags']
    assert 'role:partner' in search_agent.parse_query("partners")['tags']
    assert 'role:resident' in search_agent.parse_query("residents")['tags']


def test_parse_query_engagement_tags(search_agent):
    """Test parsing engagement levels into tags"""
    assert 'engagement:active' in search_agent.parse_query("active volunteers")['tags']
    assert 'engagement:inactive' in search_agent.parse_query("inactive contacts")['tags']
    assert 'engagement:lead' in search_agent.parse_query("lead contacts")['tags']


def test_parse_query_category_tags(search_agent):
    """Test parsing categories into tags"""
    assert 'category:organization' in search_agent.parse_query("organizations")['tags']
    assert 'category:university' in search_agent.parse_query("university partners")['tags']
    assert 'category:nonprofit' in search_agent.parse_query("nonprofits")['tags']


def test_parse_query_interest_tags(search_agent):
    """Test parsing interests into tags"""
    assert 'interest:conservation' in search_agent.parse_query("interested in conservation")['tags']
    assert 'interest:storytelling' in search_agent.parse_query("interested in storytelling")['tags']
    assert 'interest:justice' in search_agent.parse_query("interested in justice")['tags']


def test_parse_query_volunteer_hours(search_agent):
    """Test parsing volunteer hours filters"""
    filters = search_agent.parse_query("volunteers with 50+ hours")
    assert 'customFieldFilters' in filters
    assert filters['customFieldFilters']['volunteer_hours_total'] == {'$gte': 50}

    # Test without "+" sign
    filters2 = search_agent.parse_query("volunteers with 100 hours")
    assert filters2['customFieldFilters']['volunteer_hours_total'] == {'$gte': 100}


def test_parse_query_events_attended(search_agent):
    """Test parsing events attended filters"""
    filters = search_agent.parse_query("contacts who attended 3+ events")
    assert 'customFieldFilters' in filters
    assert filters['customFieldFilters']['events_attended'] == {'$gte': 3}


def test_parse_query_stories_count(search_agent):
    """Test parsing stories count filters"""
    filters = search_agent.parse_query("storytellers with 5+ stories")
    assert 'customFieldFilters' in filters
    assert filters['customFieldFilters']['stories_count'] == {'$gte': 5}


def test_parse_query_health_score(search_agent):
    """Test parsing health score filters"""
    filters = search_agent.parse_query("partners with health score > 80")
    assert 'customFieldFilters' in filters
    assert filters['customFieldFilters']['customer_health_score'] == {'$gte': 80}


def test_parse_query_arr(search_agent):
    """Test parsing ARR (revenue) filters"""
    filters = search_agent.parse_query("organizations with arr > 5000")
    assert 'customFieldFilters' in filters
    assert filters['customFieldFilters']['arr'] == {'$gte': 5000}


def test_parse_query_combined_filters(search_agent):
    """Test parsing queries with multiple filters"""
    filters = search_agent.parse_query("active volunteers in The Harvest with 50+ hours")

    assert 'the-harvest' in filters['tags']
    assert 'role:volunteer' in filters['tags']
    assert 'engagement:active' in filters['tags']
    assert filters['customFieldFilters']['volunteer_hours_total'] == {'$gte': 50}


def test_parse_query_no_matches(search_agent):
    """Test parsing query with no recognized keywords"""
    filters = search_agent.parse_query("random unrecognized query")
    assert filters == {}


# ============================================================================
# Search Tests
# ============================================================================

@pytest.mark.asyncio
async def test_search_volunteers(search_agent):
    """Test searching for volunteers"""
    results = await search_agent.search("volunteers")

    assert isinstance(results, list)
    # Should find contacts with role:volunteer tag
    for contact in results:
        assert 'role:volunteer' in contact.get('tags', [])


@pytest.mark.asyncio
async def test_search_by_project(search_agent):
    """Test searching by project"""
    results = await search_agent.search("contacts in The Harvest")

    assert isinstance(results, list)
    for contact in results:
        assert 'the-harvest' in contact.get('tags', [])


@pytest.mark.asyncio
async def test_search_with_hours_filter(search_agent):
    """Test searching with volunteer hours filter"""
    results = await search_agent.search("volunteers with 50+ hours")

    assert isinstance(results, list)
    # Should find Michael Brown (contact_005 with 65 hours)
    if results:
        for contact in results:
            hours = contact.get('customFields', {}).get('volunteer_hours_total', 0)
            assert hours >= 50


@pytest.mark.asyncio
async def test_search_no_results(search_agent):
    """Test search that returns no results"""
    results = await search_agent.search("nonexistent category")
    assert results == []


@pytest.mark.asyncio
async def test_count(search_agent):
    """Test counting contacts"""
    count = await search_agent.count("volunteers")
    assert isinstance(count, int)
    assert count >= 0


# ============================================================================
# Natural Language Command Tests
# ============================================================================

@pytest.mark.asyncio
async def test_run_search_command(search_agent):
    """Test 'search:' command"""
    result = await search_agent.run("search: volunteers")

    assert "Found" in result
    assert "contacts" in result.lower() or "contact" in result.lower()


@pytest.mark.asyncio
async def test_run_find_command(search_agent):
    """Test 'find' command"""
    result = await search_agent.run("find volunteers")

    assert "Found" in result


@pytest.mark.asyncio
async def test_run_count_command(search_agent):
    """Test 'count:' command"""
    result = await search_agent.run("count: volunteers")

    assert "Found" in result
    assert "contacts" in result.lower()


@pytest.mark.asyncio
async def test_run_how_many_command(search_agent):
    """Test 'how many' command"""
    result = await search_agent.run("how many volunteers")

    assert "Found" in result


@pytest.mark.asyncio
async def test_run_suggest_searches(search_agent):
    """Test 'suggest searches' command"""
    result = await search_agent.run("suggest searches")

    assert "example" in result.lower() or "queries" in result.lower()
    assert "volunteers" in result.lower()
    assert "elders" in result.lower()


@pytest.mark.asyncio
async def test_run_unknown_command(search_agent):
    """Test unknown command returns help"""
    result = await search_agent.run("do something weird")

    assert "Unknown search task" in result
    assert "search:" in result


# ============================================================================
# Integration Tests
# ============================================================================

@pytest.mark.asyncio
async def test_search_elders(search_agent):
    """Test searching for Elders (cultural protocol awareness)"""
    results = await search_agent.search("elders")

    assert isinstance(results, list)
    # Should find Elder Mary (contact_003)
    elder_found = any(
        'role:elder' in contact.get('tags', [])
        for contact in results
    )
    assert elder_found


@pytest.mark.asyncio
async def test_search_organizations(search_agent):
    """Test searching for organizations"""
    results = await search_agent.search("organizations")

    assert isinstance(results, list)
    for contact in results:
        assert 'category:organization' in contact.get('tags', [])


@pytest.mark.asyncio
async def test_search_complex_query(search_agent):
    """Test complex multi-filter query"""
    result = await search_agent.run(
        "search: active volunteers in The Harvest with 50+ hours"
    )

    assert "Found" in result


@pytest.mark.asyncio
async def test_suggest_searches_returns_list(search_agent):
    """Test that suggest_searches returns useful examples"""
    suggestions = search_agent.suggest_searches()

    assert isinstance(suggestions, list)
    assert len(suggestions) > 0

    # Should include various project queries
    assert any('harvest' in s.lower() for s in suggestions)
    assert any('empathy ledger' in s.lower() for s in suggestions)
    assert any('justicehub' in s.lower() for s in suggestions)
    assert any('act farm' in s.lower() for s in suggestions)


@pytest.mark.asyncio
async def test_full_search_workflow(search_agent):
    """
    Test complete search workflow:
    1. Get suggestions
    2. Execute a search
    3. Count results
    """
    # Step 1: Get suggestions
    suggestions = search_agent.suggest_searches()
    assert len(suggestions) > 0

    # Step 2: Execute first suggestion
    first_suggestion = suggestions[0]
    results = await search_agent.search(first_suggestion)
    assert isinstance(results, list)

    # Step 3: Count with same query
    count = await search_agent.count(first_suggestion)
    assert count == len(results)


# ============================================================================
# Edge Cases
# ============================================================================

@pytest.mark.asyncio
async def test_search_empty_query(search_agent):
    """Test searching with empty query"""
    results = await search_agent.search("")
    assert results == []


@pytest.mark.asyncio
async def test_search_special_characters(search_agent):
    """Test search with special characters (should not crash)"""
    results = await search_agent.search("volunteers !@#$%")
    assert isinstance(results, list)


def test_parse_query_case_insensitive(search_agent):
    """Test that query parsing is case-insensitive"""
    filters1 = search_agent.parse_query("VOLUNTEERS IN THE HARVEST")
    filters2 = search_agent.parse_query("volunteers in the harvest")

    assert filters1 == filters2


@pytest.mark.asyncio
async def test_multiple_projects_in_query(search_agent):
    """Test query mentioning multiple projects"""
    filters = search_agent.parse_query("contacts in The Harvest and Empathy Ledger")

    # Should include both project tags
    assert 'the-harvest' in filters['tags']
    assert 'empathy-ledger' in filters['tags']


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])

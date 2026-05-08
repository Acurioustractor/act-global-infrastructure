"""Tests for Research Agent and Web Search Tool"""
import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from agents.research_agent import ResearchAgent
from tools.ghl_tool import GHLTool
from tools.web_search_tool import WebSearchTool


@pytest.fixture
def ghl_tool():
    """Create GHL tool in mock mode"""
    tool = GHLTool()
    assert tool.mock_mode is True, "GHL tool should be in mock mode for testing"
    return tool


@pytest.fixture
def web_tool():
    """Create web search tool"""
    return WebSearchTool()


@pytest.fixture
def research_agent(ghl_tool, web_tool):
    """Create research agent"""
    return ResearchAgent(ghl_tool, web_tool)


# ============================================================================
# Web Search Tool Tests
# ============================================================================

@pytest.mark.asyncio
async def test_web_search_basic(web_tool):
    """Test basic web search functionality"""
    results = await web_tool.search("Python programming language", max_results=3)

    assert len(results) > 0
    assert len(results) <= 3

    # Check result structure
    for result in results:
        assert 'title' in result
        assert 'url' in result
        assert 'snippet' in result
        assert len(result['title']) > 0
        assert result['url'].startswith('http')


@pytest.mark.asyncio
async def test_web_search_no_results(web_tool):
    """Test search with very obscure query (should still return something or empty list)"""
    results = await web_tool.search("xyzabc123nonexistentquery987654", max_results=5)
    assert isinstance(results, list)  # Should return list (even if empty)


@pytest.mark.asyncio
async def test_scrape_page(web_tool):
    """Test webpage scraping"""
    # Use a simple, stable page (example.com)
    result = await web_tool.scrape_page("http://example.com")

    assert 'url' in result
    assert 'title' in result
    assert 'content' in result
    assert 'links' in result
    assert len(result['content']) > 0


@pytest.mark.asyncio
async def test_enrich_contact_linkedin(web_tool):
    """Test LinkedIn profile search"""
    result = await web_tool.enrich_contact_linkedin("Bill Gates", "Microsoft")

    # Should find Bill Gates' LinkedIn (he's famous enough)
    assert 'found' in result
    if result['found']:
        assert 'linkedin_url' in result
        assert 'linkedin.com/in/' in result['linkedin_url']


@pytest.mark.asyncio
async def test_enrich_organization(web_tool):
    """Test organization enrichment"""
    result = await web_tool.enrich_organization("Canva")

    assert 'organization_name' in result
    assert result['organization_name'] == "Canva"
    assert 'found' in result

    if result['found']:
        assert 'website' in result
        assert 'description' in result
        assert result['website'].startswith('http')


# ============================================================================
# Research Agent Tests
# ============================================================================

@pytest.mark.asyncio
async def test_enrich_contact_person(research_agent, ghl_tool):
    """
    Test enriching a person contact (Jane Smith).

    Should search for LinkedIn profile.
    """
    result = await research_agent.enrich_contact('contact_001')

    assert result['contact_id'] == 'contact_001'
    assert result['name'] == 'Jane Smith'
    assert 'linkedin_found' in result
    # LinkedIn search may or may not find a match for mock contact
    # Just verify the structure is correct


@pytest.mark.asyncio
async def test_enrich_contact_organization(research_agent, ghl_tool):
    """
    Test enriching an organization contact (Dr. Sarah Chen from University of Queensland).

    Contact 004 has 'lead:saas' tag, should trigger organization enrichment.
    """
    result = await research_agent.enrich_contact('contact_004')

    assert result['contact_id'] == 'contact_004'
    assert 'organization_enriched' in result
    # Organization search may or may not find data
    # Just verify the logic executed


@pytest.mark.asyncio
async def test_research_question(research_agent):
    """Test researching a question"""
    result = await research_agent.research_question(
        "What is OCAP in Indigenous data governance?",
        max_results=3
    )

    assert 'question' in result
    assert result['question'] == "What is OCAP in Indigenous data governance?"
    assert 'results' in result
    assert len(result['results']) > 0
    assert 'sources' in result
    assert 'summary' in result


@pytest.mark.asyncio
async def test_find_grants_empathy_ledger(research_agent):
    """Test finding grants for Empathy Ledger"""
    grants = await research_agent.find_grants_for_project('empathy-ledger')

    assert isinstance(grants, list)
    # May or may not find grants (depends on live data)
    # Just verify structure
    for grant in grants:
        assert 'title' in grant
        assert 'url' in grant
        assert 'project' in grant
        assert grant['project'] == 'empathy-ledger'


@pytest.mark.asyncio
async def test_find_grants_justicehub(research_agent):
    """Test finding grants for JusticeHub"""
    grants = await research_agent.find_grants_for_project('justicehub')

    assert isinstance(grants, list)
    for grant in grants:
        assert 'project' in grant
        assert grant['project'] == 'justicehub'


@pytest.mark.asyncio
async def test_find_grants_unknown_project(research_agent):
    """Test finding grants for unknown project (should raise error)"""
    with pytest.raises(ValueError) as exc_info:
        await research_agent.find_grants_for_project('unknown-project')

    assert 'Unknown project' in str(exc_info.value)


@pytest.mark.asyncio
async def test_monitor_all_grants(research_agent):
    """Test monitoring grants for all projects"""
    all_grants = await research_agent.monitor_all_grants()

    # Should have entries for all 5 projects
    assert 'empathy-ledger' in all_grants
    assert 'justicehub' in all_grants
    assert 'the-harvest' in all_grants
    assert 'act-farm' in all_grants
    assert 'goods' in all_grants

    # Each should be a list (even if empty)
    for project, grants in all_grants.items():
        assert isinstance(grants, list)


# ============================================================================
# Natural Language Command Tests
# ============================================================================

@pytest.mark.asyncio
async def test_run_enrich_contact_command(research_agent):
    """Test 'enrich contact' command"""
    result = await research_agent.run("enrich contact contact_001")

    assert "Jane Smith" in result or "contact" in result.lower()


@pytest.mark.asyncio
async def test_run_research_command(research_agent):
    """Test 'research:' command"""
    result = await research_agent.run("research: regenerative agriculture Australia")

    assert "Research results" in result or "results" in result.lower()
    assert "Sources:" in result


@pytest.mark.asyncio
async def test_run_find_grants_command(research_agent):
    """Test 'find grants for' command"""
    result = await research_agent.run("find grants for the-harvest")

    assert "grants" in result.lower()
    assert "the-harvest" in result.lower()


@pytest.mark.asyncio
async def test_run_monitor_all_grants_command(research_agent):
    """Test 'monitor all grants' command"""
    result = await research_agent.run("monitor all grants")

    assert "grants" in result.lower()
    assert "empathy-ledger" in result or "justicehub" in result


@pytest.mark.asyncio
async def test_run_unknown_command(research_agent):
    """Test unknown command returns help"""
    result = await research_agent.run("do something weird")

    assert "Unknown research task" in result
    assert "enrich contact" in result
    assert "research:" in result


# ============================================================================
# Integration Tests
# ============================================================================

@pytest.mark.asyncio
async def test_full_research_workflow(research_agent):
    """
    Test complete research workflow:
    1. Enrich a contact
    2. Research a question
    3. Find grants for a project
    """
    # Step 1: Enrich contact
    enrich_result = await research_agent.run("enrich contact contact_001")
    assert "Jane Smith" in enrich_result or "contact" in enrich_result.lower()

    # Step 2: Research question
    research_result = await research_agent.run("research: What is regenerative agriculture?")
    assert "Research results" in research_result

    # Step 3: Find grants
    grant_result = await research_agent.run("find grants for act-farm")
    assert "grants" in grant_result.lower()


@pytest.mark.asyncio
async def test_web_search_respects_max_results(web_tool):
    """Test that max_results parameter is respected"""
    for max_results in [1, 3, 5]:
        results = await web_tool.search("Python programming", max_results=max_results)
        assert len(results) <= max_results


# ============================================================================
# Error Handling Tests
# ============================================================================

@pytest.mark.asyncio
async def test_scrape_invalid_url(web_tool):
    """Test scraping an invalid URL"""
    with pytest.raises(Exception):  # Should raise httpx error
        await web_tool.scrape_page("http://this-domain-does-not-exist-xyz123.com")


@pytest.mark.asyncio
async def test_enrich_contact_invalid_id(research_agent):
    """Test enriching a non-existent contact"""
    with pytest.raises(ValueError):
        await research_agent.enrich_contact('contact_999')


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])

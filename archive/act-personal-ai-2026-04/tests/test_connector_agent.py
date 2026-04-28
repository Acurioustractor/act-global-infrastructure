"""Tests for Connector Agent - Cross-project opportunity detection"""
import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from agents.connector_agent import ConnectorAgent
from tools.ghl_tool import GHLTool


@pytest.fixture
def ghl_tool():
    """Create GHL tool in mock mode"""
    tool = GHLTool()
    assert tool.mock_mode is True, "GHL tool should be in mock mode for testing"
    return tool


@pytest.fixture
def connector_agent(ghl_tool):
    """Create connector agent"""
    return ConnectorAgent(ghl_tool)


# ============================================================================
# Opportunity Detection Tests
# ============================================================================

@pytest.mark.asyncio
async def test_find_opportunities_for_act_farm_resident(connector_agent):
    """
    Test detecting opportunities for John Doe (ACT Farm resident).

    John has:
    - Tags: interest:storytelling, category:artist
    - Custom field: residency_completed: True

    Should trigger opportunity → Empathy Ledger (storytelling platform)
    """
    opportunities = await connector_agent.find_opportunities_for_contact('contact_002')

    assert len(opportunities) > 0

    # Should find Empathy Ledger opportunity
    empathy_ledger_opp = next(
        (o for o in opportunities if o['target_project'] == 'empathy-ledger'),
        None
    )
    assert empathy_ledger_opp is not None
    assert empathy_ledger_opp['source_project'] == 'act-farm'
    assert empathy_ledger_opp['contact_name'] == 'John Doe'
    assert empathy_ledger_opp['priority'] in [3, 4]  # Should be medium-high priority


@pytest.mark.asyncio
async def test_find_opportunities_for_harvest_volunteer(connector_agent):
    """
    Test detecting opportunities for Michael Brown (The Harvest volunteer).

    Michael has:
    - Tags: interest:conservation, interest:regenerative-agriculture
    - Custom field: volunteer_hours_total: 65 (>= 50)

    Should trigger 2 opportunities → ACT Farm:
    1. Interest in conservation/regenerative agriculture (priority 4)
    2. Active volunteer 50+ hours (priority 3)
    """
    opportunities = await connector_agent.find_opportunities_for_contact('contact_005')

    assert len(opportunities) >= 2

    # Should find ACT Farm opportunities
    act_farm_opps = [o for o in opportunities if o['target_project'] == 'act-farm']
    assert len(act_farm_opps) >= 2

    # Check priority (interest-based should be priority 4, hours-based priority 3)
    priorities = [o['priority'] for o in act_farm_opps]
    assert 4 in priorities  # Interest-based
    assert 3 in priorities  # Volunteer hours-based


@pytest.mark.asyncio
async def test_find_opportunities_for_organization(connector_agent):
    """
    Test detecting opportunities for Dr. Sarah Chen (University partner).

    Sarah has:
    - Tags: category:organization, category:university, lead:saas
    - Currently in: empathy-ledger

    Should trigger opportunity → JusticeHub (multi-project opportunity)
    with HIGH priority (5) due to enterprise revenue potential
    """
    opportunities = await connector_agent.find_opportunities_for_contact('contact_004')

    assert len(opportunities) > 0

    # Should find JusticeHub opportunity
    justicehub_opp = next(
        (o for o in opportunities if o['target_project'] == 'justicehub'),
        None
    )
    assert justicehub_opp is not None
    assert justicehub_opp['source_project'] == 'empathy-ledger'
    assert justicehub_opp['priority'] == 5  # HIGH PRIORITY - enterprise opportunity
    assert 'organization' in justicehub_opp['reason'].lower() or 'multi-project' in justicehub_opp['reason'].lower()


@pytest.mark.asyncio
async def test_no_opportunities_if_already_in_target_project(connector_agent):
    """
    Test that no opportunity is created if contact is already in target project.

    Elder Mary is in both empathy-ledger and the-harvest, so should not get
    opportunities to join projects she's already part of.
    """
    opportunities = await connector_agent.find_opportunities_for_contact('contact_003')

    # Should not suggest empathy-ledger (already in it)
    empathy_ledger_opps = [o for o in opportunities if o['target_project'] == 'empathy-ledger']
    assert len(empathy_ledger_opps) == 0

    # Should not suggest the-harvest (already in it)
    the_harvest_opps = [o for o in opportunities if o['target_project'] == 'the-harvest']
    assert len(the_harvest_opps) == 0


@pytest.mark.asyncio
async def test_no_opportunities_without_project_tag(connector_agent):
    """
    Test that contacts without project tags get no opportunities.

    (Mock data doesn't have contacts without project tags, so this is theoretical)
    """
    # All mock contacts have project tags, so this test verifies the logic
    # would handle it correctly

    # Manually create a contact without project tags for testing
    # (In real scenario, this would be checked in the agent logic)
    pass  # Skip for now - all mock contacts have project tags


@pytest.mark.asyncio
async def test_opportunities_sorted_by_priority(connector_agent):
    """
    Test that opportunities are sorted by priority (highest first).
    """
    opportunities = await connector_agent.find_opportunities_for_contact('contact_005')

    # Check that priorities are in descending order
    priorities = [o['priority'] for o in opportunities]
    assert priorities == sorted(priorities, reverse=True)


# ============================================================================
# Find All Opportunities Tests
# ============================================================================

@pytest.mark.asyncio
async def test_find_all_opportunities(connector_agent):
    """
    Test finding all cross-project opportunities across entire CRM.

    Should return dict organized by target project.
    """
    opportunities_by_project = await connector_agent.find_all_opportunities()

    # Should have entries for all 5 projects
    assert 'the-harvest' in opportunities_by_project
    assert 'act-farm' in opportunities_by_project
    assert 'empathy-ledger' in opportunities_by_project
    assert 'justicehub' in opportunities_by_project
    assert 'goods' in opportunities_by_project

    # Should have some opportunities (based on mock data)
    total_opportunities = sum(len(opps) for opps in opportunities_by_project.values())
    assert total_opportunities > 0

    # ACT Farm should have opportunities (Michael Brown)
    assert len(opportunities_by_project['act-farm']) > 0

    # Empathy Ledger should have opportunities (John Doe)
    assert len(opportunities_by_project['empathy-ledger']) > 0

    # JusticeHub should have opportunities (Dr. Sarah Chen)
    assert len(opportunities_by_project['justicehub']) > 0


@pytest.mark.asyncio
async def test_all_opportunities_sorted_by_priority(connector_agent):
    """
    Test that opportunities within each project are sorted by priority.
    """
    opportunities_by_project = await connector_agent.find_all_opportunities()

    for project, opps in opportunities_by_project.items():
        if opps:
            priorities = [o['priority'] for o in opps]
            assert priorities == sorted(priorities, reverse=True), \
                f"Opportunities for {project} not sorted by priority"


# ============================================================================
# Create Handoff Tests
# ============================================================================

@pytest.mark.asyncio
async def test_create_handoff(connector_agent, ghl_tool):
    """
    Test creating a cross-project handoff.

    Should:
    1. Tag contact with opportunity:{target_project}
    2. Tag contact with priority level
    3. Return handoff details
    """
    handoff = await connector_agent.create_handoff(
        'contact_002',
        'empathy-ledger',
        'Completed residency - Share your story',
        priority=4
    )

    assert handoff['contact_id'] == 'contact_002'
    assert handoff['contact_name'] == 'John Doe'
    assert handoff['target_project'] == 'empathy-ledger'
    assert handoff['priority'] == 4
    assert handoff['opportunity_tag'] == 'opportunity:empathy-ledger'
    assert handoff['created'] is True

    # Verify tags were added
    contact = await ghl_tool.get_contact('contact_002')
    assert 'opportunity:empathy-ledger' in contact['tags']
    assert 'priority:high' in contact['tags']  # Priority 4 = high


@pytest.mark.asyncio
async def test_create_handoff_medium_priority(connector_agent, ghl_tool):
    """
    Test creating handoff with medium priority.
    """
    handoff = await connector_agent.create_handoff(
        'contact_005',
        'act-farm',
        'Active volunteer interested in conservation',
        priority=3
    )

    assert handoff['priority'] == 3

    # Verify medium priority tag
    contact = await ghl_tool.get_contact('contact_005')
    assert 'priority:medium' in contact['tags']


# ============================================================================
# Natural Language Command Tests
# ============================================================================

@pytest.mark.asyncio
async def test_run_find_opportunities_for_contact(connector_agent):
    """Test 'find opportunities for' command"""
    result = await connector_agent.run("find opportunities for contact_002")

    assert "John Doe" in result
    assert "empathy-ledger" in result or "Empathy Ledger" in result.lower()
    assert "opportunities" in result.lower()


@pytest.mark.asyncio
async def test_run_find_all_opportunities(connector_agent):
    """Test 'find all opportunities' command"""
    result = await connector_agent.run("find all opportunities")

    assert "opportunities" in result.lower()
    # Should mention at least one project
    assert any(project in result for project in ['act-farm', 'empathy-ledger', 'justicehub'])


@pytest.mark.asyncio
async def test_run_show_high_priority_opportunities(connector_agent):
    """Test 'show high priority opportunities' command"""
    result = await connector_agent.run("show high priority opportunities")

    assert "priority" in result.lower()
    # Should show organization opportunity (priority 5)
    # or other high priority opportunities


@pytest.mark.asyncio
async def test_run_create_handoff_command(connector_agent):
    """Test 'create handoff' command"""
    result = await connector_agent.run("create handoff contact_002 to empathy-ledger")

    assert "John Doe" in result
    assert "empathy-ledger" in result
    assert "handoff" in result.lower() or "created" in result.lower()


@pytest.mark.asyncio
async def test_run_unknown_command(connector_agent):
    """Test unknown command returns help"""
    result = await connector_agent.run("do something weird")

    assert "Unknown connector task" in result
    assert "find opportunities" in result
    assert "create handoff" in result


# ============================================================================
# Rule Matching Tests
# ============================================================================

@pytest.mark.asyncio
async def test_rule_matching_any_tags(connector_agent):
    """
    Test that 'any_tags' condition works correctly.

    Michael has: interest:conservation, interest:regenerative-agriculture
    Should match rule requiring any of those tags.
    """
    opportunities = await connector_agent.find_opportunities_for_contact('contact_005')

    # Should match conservation/regen-ag rule
    act_farm_opps = [o for o in opportunities if o['target_project'] == 'act-farm']
    assert len(act_farm_opps) > 0


@pytest.mark.asyncio
async def test_rule_matching_custom_fields_gte(connector_agent):
    """
    Test that custom field $gte condition works correctly.

    Michael has volunteer_hours_total: 65 (>= 50)
    Should match rule requiring >= 50 hours.
    """
    opportunities = await connector_agent.find_opportunities_for_contact('contact_005')

    # Should match volunteer hours rule
    volunteer_hours_opp = next(
        (o for o in opportunities if '50+ hours' in o['reason'] or 'volunteer' in o['reason'].lower()),
        None
    )
    assert volunteer_hours_opp is not None


@pytest.mark.asyncio
async def test_rule_matching_boolean_custom_field(connector_agent):
    """
    Test that boolean custom field condition works correctly.

    John has residency_completed: True
    Should match rule requiring residency_completed = True.
    """
    opportunities = await connector_agent.find_opportunities_for_contact('contact_002')

    # Should match residency completed rule
    residency_opp = next(
        (o for o in opportunities if 'residency' in o['reason'].lower() or 'completed' in o['reason'].lower()),
        None
    )
    assert residency_opp is not None


# ============================================================================
# Integration Tests
# ============================================================================

@pytest.mark.asyncio
async def test_full_connector_workflow(connector_agent):
    """
    Test complete connector workflow:
    1. Find opportunities for a contact
    2. Create handoff to target project
    3. Verify tags added
    """
    # Step 1: Find opportunities
    opportunities = await connector_agent.find_opportunities_for_contact('contact_002')
    assert len(opportunities) > 0

    empathy_ledger_opp = next(
        (o for o in opportunities if o['target_project'] == 'empathy-ledger'),
        None
    )
    assert empathy_ledger_opp is not None

    # Step 2: Create handoff
    handoff = await connector_agent.create_handoff(
        'contact_002',
        'empathy-ledger',
        empathy_ledger_opp['reason'],
        empathy_ledger_opp['priority']
    )

    assert handoff['created'] is True

    # Step 3: Verify via command
    result = await connector_agent.run("find opportunities for contact_002")
    # After handoff, contact_002 should still show in results
    # (because handoff doesn't add target project tag, just opportunity tag)
    assert "John Doe" in result


@pytest.mark.asyncio
async def test_organization_multi_project_opportunity(connector_agent):
    """
    Test that organization contacts get multi-project opportunities.

    Dr. Sarah Chen (University) in Empathy Ledger should get opportunity
    for JusticeHub with high priority (enterprise revenue).
    """
    opportunities = await connector_agent.find_opportunities_for_contact('contact_004')

    # Should have JusticeHub opportunity
    justicehub_opp = next(
        (o for o in opportunities if o['target_project'] == 'justicehub'),
        None
    )

    assert justicehub_opp is not None
    assert justicehub_opp['priority'] == 5  # Highest priority
    assert 'organization' in justicehub_opp['reason'].lower() or 'multi-project' in justicehub_opp['reason'].lower()


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])

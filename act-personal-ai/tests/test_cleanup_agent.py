"""Tests for Cleanup Agent and Cultural Protocol Enforcement"""
import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from agents.cleanup_agent import CleanupAgent
from tools.ghl_tool import GHLTool


@pytest.fixture
def ghl_tool():
    """Create GHL tool in mock mode"""
    tool = GHLTool()
    assert tool.mock_mode is True, "GHL tool should be in mock mode for testing"
    return tool


@pytest.fixture
def cleanup_agent(ghl_tool):
    """Create cleanup agent"""
    return CleanupAgent(ghl_tool)


# ============================================================================
# CRITICAL TESTS: Cultural Protocol Enforcement
# ============================================================================

@pytest.mark.asyncio
async def test_blocks_elder_consent_query(ghl_tool):
    """
    CRITICAL: Ensure elder_consent field cannot be queried.

    This test ensures Indigenous data sovereignty is protected at the system level.
    If this test fails, sacred data is at risk.
    """
    with pytest.raises(PermissionError) as exc_info:
        await ghl_tool.search_contacts({
            'customFieldFilters': {'elder_consent': {'$exists': True}}
        })

    assert 'elder_consent' in str(exc_info.value)
    assert 'CULTURAL PROTOCOL VIOLATION' in str(exc_info.value)
    assert 'OCAP' in str(exc_info.value)


@pytest.mark.asyncio
async def test_blocks_sacred_knowledge_query(ghl_tool):
    """
    CRITICAL: Ensure sacred_knowledge field cannot be queried.

    Sacred knowledge must NEVER leave Supabase.
    """
    with pytest.raises(PermissionError) as exc_info:
        await ghl_tool.search_contacts({
            'customFieldFilters': {'sacred_knowledge': {'$exists': True}}
        })

    assert 'sacred_knowledge' in str(exc_info.value)
    assert 'CULTURAL PROTOCOL VIOLATION' in str(exc_info.value)


@pytest.mark.asyncio
async def test_blocks_elder_consent_write(ghl_tool):
    """
    CRITICAL: Ensure elder_consent field cannot be modified.

    Even if somehow in the system, it must never be writeable.
    """
    with pytest.raises(PermissionError) as exc_info:
        await ghl_tool.update_contact('contact_001', {
            'customFields': {'elder_consent': 'some value'}
        })

    assert 'elder_consent' in str(exc_info.value)
    assert 'CULTURAL PROTOCOL VIOLATION' in str(exc_info.value)


@pytest.mark.asyncio
async def test_blocks_sacred_knowledge_write(ghl_tool):
    """
    CRITICAL: Ensure sacred_knowledge field cannot be modified.
    """
    with pytest.raises(PermissionError) as exc_info:
        await ghl_tool.update_contact('contact_001', {
            'customFields': {'sacred_knowledge': 'some value'}
        })

    assert 'sacred_knowledge' in str(exc_info.value)


@pytest.mark.asyncio
async def test_allows_cultural_protocols_read(ghl_tool):
    """
    Cultural protocols field is READ-ONLY.

    Should allow reading (for flagging) but not writing.
    """
    # Reading should work
    contacts = await ghl_tool.search_contacts({
        'tags': ['role:elder']
    })
    assert len(contacts) > 0

    elder = contacts[0]
    assert 'cultural_protocols' in elder.get('customFields', {})

    # Writing should fail
    with pytest.raises(PermissionError) as exc_info:
        await ghl_tool.update_contact(elder['id'], {
            'customFields': {'cultural_protocols': 'modified value'}
        })

    assert 'read-only' in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_cultural_protocol_check_for_elder(cleanup_agent, ghl_tool):
    """
    Test cultural protocol check correctly flags Elder contacts.

    Elder Mary (contact_003) should require cultural review.
    """
    elder = await ghl_tool.get_contact('contact_003')
    check = await cleanup_agent.check_cultural_protocols(elder)

    assert check['requires_review'] is True
    # Reason could mention either Elder or cultural tags (both are correct)
    assert 'Elder' in check['reason'] or 'cultural' in check['reason'].lower()
    assert 'automated_email' in check['actions_blocked']
    assert 'automated_outreach' in check['actions_blocked']
    assert check['contact_name'] == 'Mary Johnson'


@pytest.mark.asyncio
async def test_cultural_protocol_check_for_regular_contact(cleanup_agent, ghl_tool):
    """
    Regular contacts (not Elders, no cultural tags) should not require review.

    Jane Smith (contact_001) is a regular storyteller.
    """
    contact = await ghl_tool.get_contact('contact_001')
    check = await cleanup_agent.check_cultural_protocols(contact)

    assert check['requires_review'] is False
    assert check['reason'] is None
    assert len(check['actions_blocked']) == 0


# ============================================================================
# Cleanup Agent Functionality Tests
# ============================================================================

@pytest.mark.asyncio
async def test_find_duplicates_none(cleanup_agent):
    """
    Test duplicate detection when no duplicates exist.

    Mock data has 5 unique emails, so should return empty dict.
    """
    duplicates = await cleanup_agent.find_duplicates()
    assert len(duplicates) == 0


@pytest.mark.asyncio
async def test_normalize_tags(cleanup_agent):
    """
    Test tag normalization (lowercase, hyphens, deduplication).
    """
    contact = {
        'tags': [
            'Empathy-Ledger',      # Should become: empathy-ledger
            'Role:Storyteller',    # Should become: role:storyteller
            'empathy ledger',      # Should become: empathy-ledger (duplicate)
            'ENGAGEMENT:ACTIVE',   # Should become: engagement:active
            'the harvest'          # Should become: the-harvest
        ]
    }

    normalized = await cleanup_agent.normalize_tags(contact)

    # Check all are lowercase with hyphens
    assert all(tag == tag.lower() for tag in normalized)
    assert all('-' in tag or ':' in tag for tag in normalized)

    # Check deduplication (empathy-ledger appears twice in input)
    assert normalized.count('empathy-ledger') == 1

    # Check specific transformations
    assert 'empathy-ledger' in normalized
    assert 'role:storyteller' in normalized
    assert 'engagement:active' in normalized
    assert 'the-harvest' in normalized


@pytest.mark.asyncio
async def test_fix_missing_fields(cleanup_agent):
    """
    Test filling in missing custom fields with defaults.
    """
    contact = {
        'id': 'test_001',
        'customFields': {
            'stories_count': 5,  # Has value, should not change
            # volunteer_hours_total is missing, should default to 0
        }
    }

    updated = await cleanup_agent.fix_missing_fields(contact)

    # Should preserve existing value
    assert updated['customFields']['stories_count'] == 5

    # Should add default for missing field
    assert updated['customFields']['volunteer_hours_total'] == 0
    assert updated['customFields']['lifetime_donation_value'] == 0


@pytest.mark.asyncio
async def test_normalize_email(cleanup_agent):
    """Test email normalization (lowercase, trimmed)"""
    assert await cleanup_agent.normalize_email('  John.Doe@EXAMPLE.com  ') == 'john.doe@example.com'
    assert await cleanup_agent.normalize_email('JANE@TEST.COM') == 'jane@test.com'
    assert await cleanup_agent.normalize_email('') == ''


@pytest.mark.asyncio
async def test_normalize_phone_australian(cleanup_agent):
    """Test Australian phone number normalization"""
    # Mobile numbers (start with 4)
    assert await cleanup_agent.normalize_phone('0412345678') == '+61 412 345 678'
    assert await cleanup_agent.normalize_phone('+61412345678') == '+61 412 345 678'
    assert await cleanup_agent.normalize_phone('61 412 345 678') == '+61 412 345 678'

    # Landline numbers
    assert await cleanup_agent.normalize_phone('07 3123 4567') == '+61 7 3123 4567'
    assert await cleanup_agent.normalize_phone('0731234567') == '+61 7 3123 4567'

    # Invalid/unparseable should return original
    assert await cleanup_agent.normalize_phone('123') == '123'


@pytest.mark.asyncio
async def test_run_find_duplicates_command(cleanup_agent):
    """Test running 'find duplicates' command"""
    result = await cleanup_agent.run("find duplicates")
    assert "No duplicate" in result or "Found" in result


@pytest.mark.asyncio
async def test_run_cultural_protocol_check_command(cleanup_agent):
    """Test running 'check cultural protocols' command"""
    result = await cleanup_agent.run("check cultural protocols")

    # Should flag Elder Mary (contact_003)
    assert "Flagged" in result or "No contacts" in result
    if "Flagged" in result:
        assert "Mary Johnson" in result
        assert "Elder" in result or "cultural" in result.lower()


@pytest.mark.asyncio
async def test_run_normalize_tags_command(cleanup_agent):
    """Test running 'normalize tags' command"""
    result = await cleanup_agent.run("normalize tags")
    assert "Normalized tags" in result


@pytest.mark.asyncio
async def test_run_unknown_command(cleanup_agent):
    """Test running unknown command returns help"""
    result = await cleanup_agent.run("do something weird")
    assert "Unknown cleanup task" in result
    assert "find duplicates" in result
    assert "check cultural protocols" in result


# ============================================================================
# Integration Tests
# ============================================================================

@pytest.mark.asyncio
async def test_full_cleanup_workflow(cleanup_agent, ghl_tool):
    """
    Test complete cleanup workflow:
    1. Check cultural protocols
    2. Normalize tags
    3. Fix missing fields
    4. Find duplicates
    """
    # Step 1: Check cultural protocols
    cultural_result = await cleanup_agent.run("check cultural protocols")
    assert "Mary Johnson" in cultural_result  # Elder should be flagged

    # Step 2: Normalize tags
    tag_result = await cleanup_agent.run("normalize tags")
    assert "Normalized tags" in tag_result

    # Step 3: Fix missing fields
    field_result = await cleanup_agent.run("fix missing fields")
    assert "Fixed missing fields" in field_result

    # Step 4: Find duplicates
    dup_result = await cleanup_agent.run("find duplicates")
    assert "No duplicate" in dup_result  # Mock data has no duplicates


@pytest.mark.asyncio
async def test_elder_contact_full_protection(ghl_tool, cleanup_agent):
    """
    INTEGRATION TEST: Ensure Elder contact (Mary Johnson) is fully protected.

    This test verifies:
    1. Can read Elder's non-sensitive data
    2. Cultural protocol check flags for review
    3. Cannot access elder_consent or sacred_knowledge
    4. Automated actions are blocked
    """
    # Step 1: Can read Elder contact
    elder = await ghl_tool.get_contact('contact_003')
    assert elder['firstName'] == 'Mary'
    assert 'role:elder' in elder['tags']

    # Step 2: Cultural protocol check flags correctly
    check = await cleanup_agent.check_cultural_protocols(elder)
    assert check['requires_review'] is True
    assert 'automated_email' in check['actions_blocked']

    # Step 3: Cannot access blocked fields
    with pytest.raises(PermissionError):
        await ghl_tool.search_contacts({
            'customFieldFilters': {'elder_consent': {'$exists': True}}
        })

    with pytest.raises(PermissionError):
        await ghl_tool.update_contact('contact_003', {
            'customFields': {'sacred_knowledge': 'test'}
        })

    # Step 4: Can still do safe operations (add non-sensitive tags)
    updated = await ghl_tool.add_tag('contact_003', 'engagement:active')
    assert 'engagement:active' in updated['tags']


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])

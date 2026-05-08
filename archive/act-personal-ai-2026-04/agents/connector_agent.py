"""Connector Agent - Detects cross-project opportunities and creates warm handoffs."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from typing import Dict, List, Optional
from tools.ghl_tool import GHLTool


class ConnectorAgent:
    """
    Connector Agent - Identifies cross-project synergies across ACT ecosystem.

    The ACT ecosystem has 5 interconnected projects. This agent detects when
    a contact in one project would benefit from another project, and creates
    warm handoffs.

    Cross-Project Opportunities:
    1. The Harvest volunteer → ACT Farm workshop (interest in conservation)
    2. ACT Farm resident → Empathy Ledger storyteller (storytelling practice)
    3. Empathy Ledger storyteller → JusticeHub CONTAINED campaign (incarceration experience)
    4. JusticeHub family → The Harvest programs (community support needed)
    5. Organization partner → Multi-project enterprise deal (e.g., university wants both Empathy Ledger + JusticeHub)
    6. Goods customer → The Harvest/ACT Farm (interest in Indigenous products/regenerative agriculture)

    Detection Logic:
    - Tags indicate interests (e.g., interest:conservation → ACT Farm)
    - Custom fields indicate needs (e.g., needs_community_support → The Harvest)
    - Engagement patterns (e.g., attended 3+ events → Invite to residency)
    - Organization type (e.g., university → Research partnerships)

    Actions:
    - Tag contact with cross-project opportunity (e.g., opportunity:act-farm)
    - Create opportunity in target project pipeline
    - Generate warm handoff email (using ACT Voice in Week 5-6)
    - Notify coordinators for both projects

    Usage:
        agent = ConnectorAgent(ghl_tool)

        # Find all cross-project opportunities
        opportunities = await agent.find_all_opportunities()

        # Find opportunities for specific contact
        contact_opportunities = await agent.find_opportunities_for_contact('contact_001')

        # Create handoff to another project
        handoff = await agent.create_handoff('contact_001', 'act-farm', reason='Interested in conservation')
    """

    def __init__(self, ghl_tool: GHLTool):
        self.ghl = ghl_tool

        # Define opportunity detection rules
        self.opportunity_rules = self._define_opportunity_rules()

    def _define_opportunity_rules(self) -> List[Dict]:
        """
        Define rules for detecting cross-project opportunities.

        Each rule has:
        - source_project: Where the contact currently is
        - target_project: Where they might benefit
        - conditions: What triggers this opportunity (tags, custom fields, etc.)
        - reason: Why this is a good fit
        - priority: How important this opportunity is (1-5)
        """
        return [
            # The Harvest → ACT Farm
            {
                'source_project': 'the-harvest',
                'target_project': 'act-farm',
                'conditions': {
                    'any_tags': ['interest:conservation', 'interest:regenerative-agriculture', 'interest:research']
                },
                'reason': 'Interest in conservation/regenerative agriculture - ACT Farm workshops and residencies',
                'priority': 4
            },
            {
                'source_project': 'the-harvest',
                'target_project': 'act-farm',
                'conditions': {
                    'custom_fields': {'volunteer_hours_total': {'$gte': 50}}
                },
                'reason': 'Active volunteer (50+ hours) - Invite to ACT Farm volunteer days',
                'priority': 3
            },

            # ACT Farm → Empathy Ledger
            {
                'source_project': 'act-farm',
                'target_project': 'empathy-ledger',
                'conditions': {
                    'any_tags': ['interest:storytelling', 'interest:writing', 'interest:art', 'category:artist']
                },
                'reason': 'Storytelling/creative practice - Empathy Ledger storyteller platform',
                'priority': 4
            },
            {
                'source_project': 'act-farm',
                'target_project': 'empathy-ledger',
                'conditions': {
                    'custom_fields': {'residency_completed': True}
                },
                'reason': 'Completed residency - Share your story on Empathy Ledger',
                'priority': 3
            },

            # Empathy Ledger → JusticeHub
            {
                'source_project': 'empathy-ledger',
                'target_project': 'justicehub',
                'conditions': {
                    'any_tags': ['interest:justice', 'interest:incarceration', 'category:formerly-incarcerated']
                },
                'reason': 'Justice/incarceration experience - JusticeHub CONTAINED campaign',
                'priority': 5  # HIGH PRIORITY - sensitive topic
            },
            {
                'source_project': 'empathy-ledger',
                'target_project': 'justicehub',
                'conditions': {
                    'any_tags': ['interest:advocacy', 'interest:policy-reform']
                },
                'reason': 'Advocacy interest - JusticeHub campaigns and events',
                'priority': 3
            },

            # JusticeHub → The Harvest
            {
                'source_project': 'justicehub',
                'target_project': 'the-harvest',
                'conditions': {
                    'any_tags': ['needs:community-support', 'category:family']
                },
                'reason': 'Family needing community support - The Harvest programs and connections',
                'priority': 5  # HIGH PRIORITY - urgent need
            },
            {
                'source_project': 'justicehub',
                'target_project': 'the-harvest',
                'conditions': {
                    'any_tags': ['interest:volunteering', 'interest:community']
                },
                'reason': 'Interest in community involvement - The Harvest volunteer program',
                'priority': 3
            },

            # The Harvest → Empathy Ledger
            {
                'source_project': 'the-harvest',
                'target_project': 'empathy-ledger',
                'conditions': {
                    'custom_fields': {'stories_shared_informally': {'$gte': 3}}
                },
                'reason': 'Active storyteller (shared stories at events) - Empathy Ledger platform',
                'priority': 4
            },

            # Organization multi-project opportunities
            {
                'source_project': 'empathy-ledger',
                'target_project': 'justicehub',
                'conditions': {
                    'any_tags': ['category:organization', 'lead:saas', 'category:university']
                },
                'reason': 'Organization partner - Multi-project opportunity (Empathy Ledger + JusticeHub)',
                'priority': 5  # HIGH - enterprise revenue opportunity
            },
            {
                'source_project': 'justicehub',
                'target_project': 'empathy-ledger',
                'conditions': {
                    'any_tags': ['category:organization', 'category:government', 'category:nonprofit']
                },
                'reason': 'Organization interested in justice - Also explore Empathy Ledger for storytelling',
                'priority': 4
            },

            # ACT Farm → The Harvest
            {
                'source_project': 'act-farm',
                'target_project': 'the-harvest',
                'conditions': {
                    'any_tags': ['interest:food-systems', 'interest:community', 'interest:csa']
                },
                'reason': 'Interest in food systems - The Harvest CSA and community programs',
                'priority': 3
            },

            # Goods → The Harvest/ACT Farm
            {
                'source_project': 'goods',
                'target_project': 'the-harvest',
                'conditions': {
                    'any_tags': ['interest:community', 'interest:indigenous-culture']
                },
                'reason': 'Interest in Indigenous products - Connect to The Harvest cultural programs',
                'priority': 3
            },
            {
                'source_project': 'goods',
                'target_project': 'act-farm',
                'conditions': {
                    'any_tags': ['interest:regenerative-agriculture', 'interest:native-ingredients']
                },
                'reason': 'Interest in native ingredients - ACT Farm regenerative agriculture workshops',
                'priority': 3
            },
        ]

    def _check_rule_conditions(self, contact: Dict, rule: Dict) -> bool:
        """
        Check if a contact matches a rule's conditions.

        Args:
            contact: Contact data from GHL
            rule: Opportunity rule with conditions

        Returns:
            True if contact matches all conditions
        """
        conditions = rule['conditions']
        contact_tags = contact.get('tags', [])
        contact_fields = contact.get('customFields', {})

        # Check tag conditions
        if 'any_tags' in conditions:
            required_tags = conditions['any_tags']
            if not any(tag in contact_tags for tag in required_tags):
                return False

        if 'all_tags' in conditions:
            required_tags = conditions['all_tags']
            if not all(tag in contact_tags for tag in required_tags):
                return False

        # Check custom field conditions
        if 'custom_fields' in conditions:
            for field, condition in conditions['custom_fields'].items():
                field_value = contact_fields.get(field)

                # Handle different condition types
                if isinstance(condition, dict):
                    if '$gte' in condition:
                        if not (field_value and field_value >= condition['$gte']):
                            return False
                    elif '$lte' in condition:
                        if not (field_value and field_value <= condition['$lte']):
                            return False
                    elif '$eq' in condition:
                        if field_value != condition['$eq']:
                            return False
                elif isinstance(condition, bool):
                    # Direct boolean check (e.g., residency_completed: True)
                    if field_value != condition:
                        return False
                else:
                    # Direct value check
                    if field_value != condition:
                        return False

        return True

    async def find_opportunities_for_contact(self, contact_id: str) -> List[Dict]:
        """
        Find all cross-project opportunities for a specific contact.

        Args:
            contact_id: GHL contact ID

        Returns:
            List of opportunities with target project, reason, priority
        """
        contact = await self.ghl.get_contact(contact_id)
        contact_tags = contact.get('tags', [])

        # Determine which project(s) the contact is currently in
        current_projects = []
        for tag in contact_tags:
            if tag in ['the-harvest', 'act-farm', 'empathy-ledger', 'justicehub', 'goods']:
                current_projects.append(tag)

        # If no project tags, can't determine opportunities
        if not current_projects:
            return []

        opportunities = []

        # Check each rule
        for rule in self.opportunity_rules:
            # Only check rules for projects the contact is currently in
            if rule['source_project'] in current_projects:
                # Skip if already in target project
                if rule['target_project'] in contact_tags:
                    continue

                # Check if contact matches rule conditions
                if self._check_rule_conditions(contact, rule):
                    opportunities.append({
                        'contact_id': contact_id,
                        'contact_name': f"{contact.get('firstName', '')} {contact.get('lastName', '')}".strip(),
                        'source_project': rule['source_project'],
                        'target_project': rule['target_project'],
                        'reason': rule['reason'],
                        'priority': rule['priority'],
                        'matched_conditions': rule['conditions']
                    })

        # Sort by priority (highest first)
        opportunities.sort(key=lambda o: o['priority'], reverse=True)

        return opportunities

    async def find_all_opportunities(self) -> Dict[str, List[Dict]]:
        """
        Find all cross-project opportunities across the entire CRM.

        Returns:
            Dict organized by target project, with list of opportunities
        """
        all_contacts = await self.ghl.search_contacts({})

        opportunities_by_project = {
            'the-harvest': [],
            'act-farm': [],
            'empathy-ledger': [],
            'justicehub': [],
            'goods': []
        }

        for contact in all_contacts:
            contact_opportunities = await self.find_opportunities_for_contact(contact['id'])

            for opp in contact_opportunities:
                target_project = opp['target_project']
                opportunities_by_project[target_project].append(opp)

        # Sort each project's opportunities by priority
        for project in opportunities_by_project:
            opportunities_by_project[project].sort(key=lambda o: o['priority'], reverse=True)

        return opportunities_by_project

    async def create_handoff(
        self,
        contact_id: str,
        target_project: str,
        reason: str,
        priority: int = 3
    ) -> Dict:
        """
        Create a cross-project handoff for a contact.

        This tags the contact with the opportunity and (in real mode) would:
        - Add contact to target project pipeline
        - Notify coordinators
        - Generate warm handoff email (via ACT Voice in Week 5-6)

        Args:
            contact_id: GHL contact ID
            target_project: Project to hand off to (e.g., 'act-farm')
            reason: Why this is a good fit
            priority: 1-5 priority level

        Returns:
            Dict with handoff details
        """
        contact = await self.ghl.get_contact(contact_id)
        contact_name = f"{contact.get('firstName', '')} {contact.get('lastName', '')}".strip()

        # Tag contact with opportunity
        opportunity_tag = f"opportunity:{target_project}"
        await self.ghl.add_tag(contact_id, opportunity_tag)

        # Tag with priority level
        priority_tag = f"priority:{'high' if priority >= 4 else 'medium' if priority >= 3 else 'low'}"
        await self.ghl.add_tag(contact_id, priority_tag)

        handoff = {
            'contact_id': contact_id,
            'contact_name': contact_name,
            'target_project': target_project,
            'reason': reason,
            'priority': priority,
            'opportunity_tag': opportunity_tag,
            'created': True
        }

        # In real mode (Week 3+), would also:
        # - Create opportunity in target project pipeline
        # - Send notification to target project coordinator
        # - Generate warm handoff email (ACT Voice integration)

        return handoff

    async def run(self, task: str) -> str:
        """
        Execute a connector task based on natural language description.

        Supported tasks:
        - "find opportunities for [contact_id]"
        - "find all opportunities"
        - "create handoff [contact_id] to [project]"
        - "show high priority opportunities"

        Args:
            task: Natural language task description

        Returns:
            Human-readable result
        """
        task_lower = task.lower()

        # Find opportunities for specific contact
        if 'find opportunities for' in task_lower:
            # Extract contact ID
            parts = task.split()
            if len(parts) >= 4:
                contact_id = parts[3]
                opportunities = await self.find_opportunities_for_contact(contact_id)

                if opportunities:
                    opp_list = "\n".join([
                        f"  • {opp['target_project']} (Priority {opp['priority']})\n"
                        f"    {opp['reason']}"
                        for opp in opportunities
                    ])
                    return (
                        f"Found {len(opportunities)} cross-project opportunities for {opportunities[0]['contact_name']}:\n\n"
                        f"{opp_list}"
                    )
                else:
                    return f"No cross-project opportunities found for contact {contact_id}"

        # Find all opportunities
        elif 'find all opportunities' in task_lower or 'all opportunities' in task_lower:
            opportunities_by_project = await self.find_all_opportunities()

            total = sum(len(opps) for opps in opportunities_by_project.values())

            summary_parts = [f"Found {total} total cross-project opportunities:\n"]
            for project, opps in opportunities_by_project.items():
                if opps:
                    high_priority = len([o for o in opps if o['priority'] >= 4])
                    summary_parts.append(
                        f"  • {project}: {len(opps)} opportunities "
                        f"({high_priority} high priority)"
                    )

            return "\n".join(summary_parts)

        # Show high priority opportunities
        elif 'high priority' in task_lower:
            opportunities_by_project = await self.find_all_opportunities()

            high_priority_opps = []
            for project, opps in opportunities_by_project.items():
                high_priority_opps.extend([o for o in opps if o['priority'] >= 4])

            # Sort by priority
            high_priority_opps.sort(key=lambda o: o['priority'], reverse=True)

            if high_priority_opps:
                opp_list = "\n".join([
                    f"  • {opp['contact_name']} → {opp['target_project']} (Priority {opp['priority']})\n"
                    f"    {opp['reason']}"
                    for opp in high_priority_opps[:10]  # Top 10
                ])
                return f"High priority opportunities:\n\n{opp_list}"
            else:
                return "No high priority opportunities found"

        # Create handoff
        elif 'create handoff' in task_lower or 'handoff' in task_lower:
            # Extract contact_id and target project
            # Example: "create handoff contact_001 to act-farm"
            parts = task.split()
            if 'to' in parts:
                to_index = parts.index('to')
                contact_id = parts[to_index - 1]
                target_project = parts[to_index + 1]

                # Find reason from opportunities
                opportunities = await self.find_opportunities_for_contact(contact_id)
                target_opp = next(
                    (o for o in opportunities if o['target_project'] == target_project),
                    None
                )

                if target_opp:
                    handoff = await self.create_handoff(
                        contact_id,
                        target_project,
                        target_opp['reason'],
                        target_opp['priority']
                    )
                    return (
                        f"✓ Created handoff: {handoff['contact_name']} → {target_project}\n"
                        f"  Reason: {handoff['reason']}\n"
                        f"  Priority: {handoff['priority']}\n"
                        f"  Tagged: {handoff['opportunity_tag']}"
                    )
                else:
                    return f"No opportunity found for {contact_id} → {target_project}"

        else:
            return (
                "Unknown connector task. Supported tasks:\n"
                "  • find opportunities for [contact_id]\n"
                "  • find all opportunities\n"
                "  • show high priority opportunities\n"
                "  • create handoff [contact_id] to [project]"
            )


# Async main for testing
async def main():
    """Test the connector agent"""
    from tools.ghl_tool import GHLTool

    ghl_tool = GHLTool()  # Mock mode
    agent = ConnectorAgent(ghl_tool)

    # Test 1: Find opportunities for a contact
    print("\n=== Test 1: Find Opportunities for Jane Smith ===")
    result = await agent.run("find opportunities for contact_001")
    print(result)

    # Test 2: Find all opportunities
    print("\n=== Test 2: Find All Opportunities ===")
    result = await agent.run("find all opportunities")
    print(result)

    # Test 3: Show high priority opportunities
    print("\n=== Test 3: High Priority Opportunities ===")
    result = await agent.run("show high priority opportunities")
    print(result)


if __name__ == '__main__':
    import asyncio
    asyncio.run(main())

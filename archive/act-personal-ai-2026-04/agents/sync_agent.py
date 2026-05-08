"""Sync Agent - Data reconciliation between GHL, Supabase, and Notion."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from typing import Dict, List, Optional
from tools.ghl_tool import GHLTool


class SyncAgent:
    """
    Sync Agent - Reconciles data across GHL, Supabase, and Notion.

    The ACT ecosystem uses multiple data stores:
    - GHL: CRM (contacts, pipelines, workflows)
    - Supabase: Source of truth (storytellers, residencies, services)
    - Notion: Activity log and reporting

    This agent ensures data stays synchronized while respecting:
    - OCAP principles (Indigenous data sovereignty)
    - Privacy walls (family support data stays in GHL)
    - Single source of truth (no duplicate masters)

    Sync Rules:
    1. Storyteller data: Supabase → GHL (one-way, read-only summary)
    2. Volunteer data: GHL ↔ Supabase (bidirectional)
    3. Event registrations: GHL → Notion (activity log)
    4. SaaS customers: Stripe → GHL → Notion
    5. Family support: NEVER syncs (privacy-critical)
    6. Elder consent: NEVER syncs (sacred data)

    Usage:
        agent = SyncAgent(ghl_tool)

        # Check for sync conflicts
        conflicts = await agent.check_conflicts()

        # Sync specific contact
        result = await agent.sync_contact('contact_001', direction='ghl_to_supabase')

        # Reconcile all data
        summary = await agent.reconcile_all()
    """

    def __init__(self, ghl_tool: GHLTool):
        self.ghl = ghl_tool

        # Define sync rules (what can sync, what direction, what fields)
        self.sync_rules = self._define_sync_rules()

        # Track sync conflicts
        self.conflicts = []

    def _define_sync_rules(self) -> Dict:
        """
        Define sync rules for each data type.

        Returns:
            Dict mapping data types to sync configurations
        """
        return {
            # Storytellers: Supabase → GHL (one-way)
            'storyteller': {
                'direction': 'supabase_to_ghl',
                'frequency': 'daily',
                'fields': {
                    'name': 'firstName + lastName',
                    'email': 'email',
                    'supabase_user_id': 'customFields.supabase_user_id',
                    'storyteller_status': 'customFields.storyteller_status',
                    'stories_count': 'customFields.stories_count',
                    # Never sync: story content, consent data, Elder approval
                },
                'tags': ['empathy-ledger', 'role:storyteller'],
                'blocked_fields': [
                    'elder_consent',
                    'sacred_knowledge',
                    'story_content',
                    'cultural_protocols_detail'
                ]
            },

            # Volunteers: GHL ↔ Supabase (bidirectional)
            'volunteer': {
                'direction': 'bidirectional',
                'frequency': 'realtime',
                'fields': {
                    'name': 'firstName + lastName',
                    'email': 'email',
                    'phone': 'phone',
                    'volunteer_hours_total': 'customFields.volunteer_hours_total',
                    'volunteer_interests': 'customFields.volunteer_interests',
                    'volunteer_orientation_completed': 'customFields.volunteer_orientation_completed',
                },
                'tags': ['the-harvest', 'role:volunteer'],
                'conflict_resolution': 'most_recent_update'
            },

            # SaaS Customers: Stripe → GHL → Notion
            'saas_customer': {
                'direction': 'stripe_to_ghl_to_notion',
                'frequency': 'realtime',
                'fields': {
                    'organization_name': 'companyName',
                    'email': 'email',
                    'arr': 'customFields.arr',
                    'customer_health_score': 'customFields.customer_health_score',
                    'subscription_status': 'customFields.subscription_status',
                },
                'tags': ['empathy-ledger', 'category:organization', 'lead:saas'],
            },

            # Event Registrations: GHL → Notion (activity log)
            'event_registration': {
                'direction': 'ghl_to_notion',
                'frequency': 'realtime',
                'fields': {
                    'event_name': 'customFields.event_name',
                    'registration_date': 'customFields.registration_date',
                    'attendance_status': 'customFields.attendance_status',
                },
            },

            # Family Support: NEVER syncs (privacy wall)
            'family_support': {
                'direction': 'none',
                'frequency': 'never',
                'reason': 'Privacy-critical data stays in GHL, never exported',
                'blocked_fields': '*'  # All fields blocked
            },

            # Elder Consent: NEVER syncs (sacred data)
            'elder_consent': {
                'direction': 'none',
                'frequency': 'never',
                'reason': 'Sacred Indigenous data protected by OCAP principles',
                'blocked_fields': '*'  # All fields blocked
            },
        }

    async def check_conflicts(self) -> List[Dict]:
        """
        Check for sync conflicts across GHL and Supabase.

        A conflict occurs when:
        - Same contact exists in both systems with different data
        - Last update timestamp shows divergence
        - Field values don't match

        Returns:
            List of conflicts with details
        """
        conflicts = []

        # Get all contacts from GHL
        all_contacts = await self.ghl.search_contacts({})

        for contact in all_contacts:
            # Skip if no supabase_user_id (not synced)
            supabase_id = contact.get('customFields', {}).get('supabase_user_id')
            if not supabase_id:
                continue

            # Check for field mismatches (mock check - real would query Supabase)
            # For now, just check for obvious conflicts
            if self._has_obvious_conflict(contact):
                conflicts.append({
                    'contact_id': contact['id'],
                    'supabase_id': supabase_id,
                    'conflict_type': 'field_mismatch',
                    'details': 'Email or name mismatch detected',
                    'recommended_action': 'Manual review required'
                })

        return conflicts

    def _has_obvious_conflict(self, contact: Dict) -> bool:
        """
        Check if contact has obvious sync conflicts.

        Args:
            contact: GHL contact data

        Returns:
            True if conflict detected
        """
        # Check for missing required fields
        if not contact.get('email'):
            return True

        # Check for duplicate emails (would conflict in Supabase)
        # (Real implementation would query Supabase)

        return False

    async def sync_contact(
        self,
        contact_id: str,
        direction: str = 'ghl_to_supabase'
    ) -> Dict:
        """
        Sync a specific contact.

        Args:
            contact_id: GHL contact ID or Supabase user ID
            direction: 'ghl_to_supabase', 'supabase_to_ghl', or 'bidirectional'

        Returns:
            Sync result with success/failure and details
        """
        # Get contact from GHL
        contact = await self.ghl.get_contact(contact_id)

        # Determine contact type
        contact_type = self._determine_contact_type(contact)

        # Get sync rules for this type
        rules = self.sync_rules.get(contact_type, {})

        # Check if sync is allowed
        if rules.get('direction') == 'none':
            return {
                'success': False,
                'contact_id': contact_id,
                'reason': rules.get('reason', 'Sync not allowed for this data type'),
                'blocked': True
            }

        # Mock sync (real would make API calls to Supabase)
        sync_result = {
            'success': True,
            'contact_id': contact_id,
            'contact_type': contact_type,
            'direction': direction,
            'fields_synced': list(rules.get('fields', {}).keys()),
            'timestamp': 'mock_timestamp',
            'note': 'Mock sync - real implementation would call Supabase API'
        }

        return sync_result

    def _determine_contact_type(self, contact: Dict) -> str:
        """
        Determine contact type based on tags.

        Args:
            contact: GHL contact data

        Returns:
            Contact type string
        """
        tags = contact.get('tags', [])

        if 'role:storyteller' in tags:
            return 'storyteller'
        elif 'role:volunteer' in tags:
            return 'volunteer'
        elif 'lead:saas' in tags:
            return 'saas_customer'
        elif 'category:family' in tags:
            return 'family_support'
        else:
            return 'unknown'

    async def reconcile_all(self, dry_run: bool = True) -> Dict:
        """
        Reconcile all data across systems.

        Args:
            dry_run: If True, only report what would be synced (don't actually sync)

        Returns:
            Summary of reconciliation results
        """
        summary = {
            'total_contacts': 0,
            'sync_needed': 0,
            'conflicts': 0,
            'blocked': 0,
            'by_type': {},
            'dry_run': dry_run
        }

        # Get all contacts
        all_contacts = await self.ghl.search_contacts({})
        summary['total_contacts'] = len(all_contacts)

        for contact in all_contacts:
            contact_type = self._determine_contact_type(contact)

            # Track by type
            if contact_type not in summary['by_type']:
                summary['by_type'][contact_type] = {
                    'count': 0,
                    'sync_needed': 0,
                    'conflicts': 0,
                    'blocked': 0
                }

            summary['by_type'][contact_type]['count'] += 1

            # Check sync rules
            rules = self.sync_rules.get(contact_type, {})

            if rules.get('direction') == 'none':
                summary['blocked'] += 1
                summary['by_type'][contact_type]['blocked'] += 1
                continue

            # Check for conflicts
            if self._has_obvious_conflict(contact):
                summary['conflicts'] += 1
                summary['by_type'][contact_type]['conflicts'] += 1
                continue

            # Check if sync needed (mock - real would compare timestamps)
            supabase_id = contact.get('customFields', {}).get('supabase_user_id')
            if supabase_id:
                # Has Supabase ID - might need sync
                summary['sync_needed'] += 1
                summary['by_type'][contact_type]['sync_needed'] += 1

                if not dry_run:
                    # Real sync would happen here
                    await self.sync_contact(contact['id'])

        return summary

    async def run(self, task: str) -> str:
        """
        Execute a sync task based on natural language description.

        Supported tasks:
        - "check conflicts"
        - "sync contact [contact_id]"
        - "reconcile all"
        - "show sync rules"

        Args:
            task: Natural language task description

        Returns:
            Human-readable result
        """
        task_lower = task.lower()

        # Check conflicts
        if 'check conflicts' in task_lower or 'find conflicts' in task_lower:
            conflicts = await self.check_conflicts()

            if conflicts:
                conflict_list = "\n".join([
                    f"  • Contact {c['contact_id']} (Supabase: {c['supabase_id']})\n"
                    f"    Type: {c['conflict_type']}\n"
                    f"    Action: {c['recommended_action']}"
                    for c in conflicts
                ])
                return f"Found {len(conflicts)} sync conflicts:\n\n{conflict_list}"
            else:
                return "✓ No sync conflicts detected"

        # Sync specific contact
        elif 'sync contact' in task_lower:
            # Extract contact ID
            parts = task.split()
            if len(parts) >= 3:
                contact_id = parts[2]
                result = await self.sync_contact(contact_id)

                if result['success']:
                    return (
                        f"✓ Synced contact: {contact_id}\n"
                        f"  Type: {result['contact_type']}\n"
                        f"  Direction: {result['direction']}\n"
                        f"  Fields synced: {', '.join(result['fields_synced'])}\n"
                        f"  {result['note']}"
                    )
                else:
                    return (
                        f"✗ Sync blocked for contact: {contact_id}\n"
                        f"  Reason: {result['reason']}"
                    )

        # Reconcile all
        elif 'reconcile' in task_lower or 'sync all' in task_lower:
            dry_run = 'dry run' in task_lower or 'check' in task_lower

            summary = await self.reconcile_all(dry_run=dry_run)

            by_type_text = "\n".join([
                f"  • {contact_type}: {data['count']} total, {data['sync_needed']} need sync, {data['conflicts']} conflicts, {data['blocked']} blocked"
                for contact_type, data in summary['by_type'].items()
            ])

            return (
                f"{'DRY RUN: ' if dry_run else ''}Reconciliation Summary:\n\n"
                f"Total contacts: {summary['total_contacts']}\n"
                f"Sync needed: {summary['sync_needed']}\n"
                f"Conflicts: {summary['conflicts']}\n"
                f"Blocked (privacy): {summary['blocked']}\n\n"
                f"By Type:\n{by_type_text}"
            )

        # Show sync rules
        elif 'sync rules' in task_lower or 'show rules' in task_lower:
            rules_text = []
            for data_type, rules in self.sync_rules.items():
                direction = rules.get('direction', 'unknown')
                frequency = rules.get('frequency', 'unknown')
                blocked = '(BLOCKED)' if direction == 'none' else ''

                rules_text.append(
                    f"  • {data_type}: {direction} @ {frequency} {blocked}"
                )

            return "Sync Rules:\n\n" + "\n".join(rules_text)

        else:
            return (
                "Unknown sync task. Supported commands:\n"
                "  • check conflicts\n"
                "  • sync contact [contact_id]\n"
                "  • reconcile all [dry run]\n"
                "  • show sync rules"
            )


# Async main for testing
async def main():
    """Test the sync agent"""
    from tools.ghl_tool import GHLTool

    ghl_tool = GHLTool()  # Mock mode
    agent = SyncAgent(ghl_tool)

    # Test 1: Check conflicts
    print("\n=== Test 1: Check Conflicts ===")
    result = await agent.run("check conflicts")
    print(result)

    # Test 2: Show sync rules
    print("\n=== Test 2: Sync Rules ===")
    result = await agent.run("show sync rules")
    print(result)

    # Test 3: Reconcile all (dry run)
    print("\n=== Test 3: Reconcile All (Dry Run) ===")
    result = await agent.run("reconcile all dry run")
    print(result)


if __name__ == '__main__':
    import asyncio
    asyncio.run(main())

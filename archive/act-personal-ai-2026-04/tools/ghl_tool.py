"""GoHighLevel API tool (mock for Week 1-2, real API in Week 3)"""
import json
from typing import Dict, Any, List, Optional
from .base_tool import BaseTool


class GHLTool(BaseTool):
    """
    GoHighLevel CRM integration with cultural protocol enforcement.

    Week 1-2: Mock data for testing cultural protocols
    Week 3+: Real GHL API integration
    """

    def __init__(self):
        super().__init__()
        self.mock_mode = self.env.get('ENABLE_GHL_INTEGRATION', 'false').lower() != 'true'
        self.mock_contacts = self._load_mock_data() if self.mock_mode else []

    def _load_mock_data(self) -> List[Dict]:
        """Load mock contact data for testing cultural protocols"""
        return [
            {
                'id': 'contact_001',
                'email': 'jane.smith@example.com',
                'firstName': 'Jane',
                'lastName': 'Smith',
                'phone': '+61412345678',
                'tags': ['empathy-ledger', 'role:storyteller', 'engagement:active'],
                'customFields': {
                    'supabase_user_id': 'uuid-123-storyteller',
                    'storyteller_status': 'Active',
                    'stories_count': 5,
                    'consent_status': 'Full consent',
                    'ai_processing_consent': 'Yes'
                }
            },
            {
                'id': 'contact_002',
                'email': 'john.doe@example.com',
                'firstName': 'John',
                'lastName': 'Doe',
                'phone': '+61423456789',
                'tags': ['act-farm', 'role:resident', 'engagement:alumni', 'interest:storytelling', 'category:artist'],
                'customFields': {
                    'residency_type': 'Creative Residency',
                    'residency_dates': '2025-03-15 to 2025-03-22',
                    'residency_completed': True,
                    'research_focus': 'Environmental art and conservation storytelling'
                }
            },
            {
                'id': 'contact_003',
                'email': 'elder.mary@example.com',
                'firstName': 'Mary',
                'lastName': 'Johnson',
                'phone': '+61434567890',
                'tags': [
                    'empathy-ledger',
                    'the-harvest',
                    'role:elder',
                    'cultural:kabi-kabi',
                    'priority:high',
                    'engagement:active'
                ],
                'customFields': {
                    'supabase_user_id': 'uuid-456-elder',
                    'cultural_protocols': 'Kabi Kabi Elder - requires cultural review for all communications',
                    'elder_review_required': True,
                    'stories_count': 12,
                    'volunteer_hours_total': 240,
                    # NOTE: elder_consent is NEVER in GHL (stays in Supabase)
                    # NOTE: sacred_knowledge is NEVER in GHL (stays in Supabase)
                }
            },
            {
                'id': 'contact_004',
                'email': 'sarah.chen@university.edu.au',
                'firstName': 'Sarah',
                'lastName': 'Chen',
                'phone': '+61445678901',
                'companyName': 'University of Queensland',
                'tags': ['empathy-ledger', 'role:partner', 'engagement:lead', 'category:organization', 'category:university', 'lead:saas'],
                'customFields': {
                    'organization_type': 'University',
                    'estimated_users': 500,
                    'pilot_interest': True,
                    'arr': 6000,  # $500/month subscription
                    'customer_health_score': 85
                }
            },
            {
                'id': 'contact_005',
                'email': 'michael.brown@example.com',
                'firstName': 'Michael',
                'lastName': 'Brown',
                'phone': '+61456789012',
                'tags': ['the-harvest', 'role:volunteer', 'engagement:active', 'interest:conservation', 'interest:regenerative-agriculture'],
                'customFields': {
                    'volunteer_interests': ['Gardening & land care', 'Conservation projects'],
                    'volunteer_hours_total': 65,  # 50+ hours = opportunity for ACT Farm
                    'volunteer_orientation_completed': True,
                    'membership_level': 'Supporter ($100/year)'
                }
            }
        ]

    async def search_contacts(
        self,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict]:
        """
        Search contacts with cultural protocol checks.

        Args:
            filters: {
                'tags': ['empathy-ledger'],
                'customFieldFilters': {'stories_count': {'$gte': 3}}
            }

        Returns:
            List of matching contacts

        Raises:
            PermissionError: If attempting to access blocked fields
        """
        if filters is None:
            filters = {}

        # Check for blocked field access in customFieldFilters
        for field in filters.get('customFieldFilters', {}).keys():
            self.check_cultural_protocol(field, 'read')

        if self.mock_mode:
            # Mock search implementation
            results = self.mock_contacts.copy()

            # Filter by tags
            if 'tags' in filters and filters['tags']:
                results = [
                    c for c in results
                    if any(tag in c.get('tags', []) for tag in filters['tags'])
                ]

            # Filter by custom fields (simple implementation)
            if 'customFieldFilters' in filters:
                for field, condition in filters['customFieldFilters'].items():
                    if '$gte' in condition:
                        results = [
                            c for c in results
                            if c.get('customFields', {}).get(field, 0) >= condition['$gte']
                        ]
                    elif '$eq' in condition:
                        results = [
                            c for c in results
                            if c.get('customFields', {}).get(field) == condition['$eq']
                        ]
                    elif '$exists' in condition:
                        results = [
                            c for c in results
                            if (field in c.get('customFields', {})) == condition['$exists']
                        ]

            return results
        else:
            # Real GHL API call (Week 3+)
            # import httpx
            # response = await self._api_call('POST', '/contacts/search', json=filters)
            # return response['contacts']
            raise NotImplementedError("Real GHL API integration coming in Week 3")

    async def get_contact(self, contact_id: str) -> Dict:
        """
        Get single contact by ID.

        Args:
            contact_id: GHL contact ID

        Returns:
            Contact data

        Raises:
            ValueError: If contact not found
        """
        if self.mock_mode:
            contact = next((c for c in self.mock_contacts if c['id'] == contact_id), None)
            if not contact:
                raise ValueError(f"Contact not found: {contact_id}")

            # Run cultural protocol check
            check = self.check_contact_cultural_protocols(contact)
            if check['requires_review']:
                self.log_cultural_protocol_check(check, 'WARNING')
            return contact
        else:
            raise NotImplementedError("Real GHL API integration coming in Week 3")

    async def update_contact(
        self,
        contact_id: str,
        updates: Dict[str, Any]
    ) -> Dict:
        """
        Update contact with cultural protocol checks.

        Args:
            contact_id: GHL contact ID
            updates: Fields to update (tags, customFields, etc.)

        Returns:
            Updated contact

        Raises:
            PermissionError: If attempting to modify blocked fields
        """
        # Check for blocked field updates
        for field in updates.get('customFields', {}).keys():
            self.check_cultural_protocol(field, 'write')

        if self.mock_mode:
            # Mock update
            contact = await self.get_contact(contact_id)
            if contact:
                # Update tags if provided
                if 'tags' in updates:
                    contact['tags'] = updates['tags']

                # Update custom fields if provided
                if 'customFields' in updates:
                    contact['customFields'].update(updates['customFields'])

                # Log if contact has cultural protocols
                check = self.check_contact_cultural_protocols(contact)
                if check['requires_review']:
                    self.log_cultural_protocol_check(check, 'INFO')

            return contact
        else:
            raise NotImplementedError("Real GHL API integration coming in Week 3")

    async def add_tag(self, contact_id: str, tag: str) -> Dict:
        """Add a single tag to contact"""
        contact = await self.get_contact(contact_id)
        if contact and tag not in contact.get('tags', []):
            tags = contact.get('tags', [])
            tags.append(tag)
            return await self.update_contact(contact_id, {'tags': tags})
        return contact

    async def remove_tag(self, contact_id: str, tag: str) -> Dict:
        """Remove a single tag from contact"""
        contact = await self.get_contact(contact_id)
        if contact and tag in contact.get('tags', []):
            tags = contact.get('tags', [])
            tags.remove(tag)
            return await self.update_contact(contact_id, {'tags': tags})
        return contact

    async def execute(self, action: str, **kwargs) -> Any:
        """
        Execute GHL operation.

        Args:
            action: 'search', 'get', 'update', 'add_tag', 'remove_tag'
            **kwargs: Action-specific parameters

        Returns:
            Action result
        """
        actions = {
            'search': self.search_contacts,
            'get': self.get_contact,
            'update': self.update_contact,
            'add_tag': self.add_tag,
            'remove_tag': self.remove_tag
        }

        if action not in actions:
            raise ValueError(f"Unknown action: {action}. Available: {list(actions.keys())}")

        return await actions[action](**kwargs)

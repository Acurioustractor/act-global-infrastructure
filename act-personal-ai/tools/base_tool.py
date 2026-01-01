"""Base tool class with cultural protocol enforcement for ACT ecosystem"""
import os
from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod


class BaseTool(ABC):
    """
    Base class for all ACT tools with built-in cultural protocol enforcement.

    This class ensures that Indigenous data sovereignty principles (OCAP)
    are enforced at the system level, not just in agent prompts.
    """

    # CRITICAL: Protected fields (cultural data sovereignty)
    # These fields can NEVER be accessed through GHL or any external system
    BLOCKED_FIELDS = [
        'elder_consent',         # Elder consent data stays in Supabase ONLY
        'sacred_knowledge',      # Cultural knowledge protected by OCAP
        # 'cultural_protocols' is read-only (allowed for flagging, not editing)
    ]

    # Read-only fields (can query but never modify)
    READ_ONLY_FIELDS = [
        'cultural_protocols',    # Can read for flagging, never modify
        'supabase_user_id',     # Sync ID, never edit
        'elder_review_required', # Flag only, never edit
    ]

    def __init__(self):
        """Initialize base tool with environment access"""
        self.env = os.environ

    def check_cultural_protocol(
        self,
        field_name: str,
        operation: str = 'read',
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Enforce cultural protocol on field access.

        This is a HARD BLOCK - if this raises PermissionError, the operation
        will not proceed. This protects Indigenous data at the system level.

        Args:
            field_name: Field being accessed
            operation: 'read', 'write', 'delete'
            context: Additional context (contact tags, etc.)

        Raises:
            PermissionError: If field is protected or operation is not allowed
        """
        # Check if field is completely blocked
        if field_name in self.BLOCKED_FIELDS:
            raise PermissionError(
                f"🔒 CULTURAL PROTOCOL VIOLATION\n\n"
                f"Field: '{field_name}'\n"
                f"Operation: {operation}\n\n"
                f"This field contains sacred Indigenous data and is protected by OCAP principles:\n"
                f"- Ownership: Community owns this data\n"
                f"- Control: Community controls access\n"
                f"- Access: Only authorized individuals can access\n"
                f"- Possession: Data stays with the community (Supabase)\n\n"
                f"This data is NEVER queried, modified, or synced to external systems.\n"
                f"Contact: ACT Cultural Advisor for guidance.\n"
            )

        # Check if field is read-only and operation is write/delete
        if field_name in self.READ_ONLY_FIELDS and operation in ['write', 'delete']:
            raise PermissionError(
                f"🔒 CULTURAL PROTOCOL VIOLATION\n\n"
                f"Field: '{field_name}' is read-only\n"
                f"Attempted operation: {operation}\n\n"
                f"This field can be queried for cultural protocol flagging,\n"
                f"but cannot be modified by automation.\n\n"
                f"If this field needs updating, contact: ACT Cultural Advisor\n"
            )

    def check_contact_cultural_protocols(
        self,
        contact: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Check if contact requires cultural protocol review.

        This method analyzes contact data (tags, custom fields) to determine
        if special cultural protocols apply.

        Args:
            contact: Contact data from GHL or other CRM

        Returns:
            {
                'requires_review': bool,
                'reason': str,
                'actions_blocked': List[str],
                'recommended_action': str
            }
        """
        requires_review = False
        reason = None
        blocked_actions = []
        recommended_action = None

        tags = contact.get('tags', [])
        custom_fields = contact.get('customFields', {})

        # Check for Elder tag
        if 'role:elder' in tags or any('elder' in t.lower() for t in tags):
            requires_review = True
            reason = "Contact is tagged as Elder - cultural protocols apply"
            blocked_actions.extend(['automated_email', 'automated_outreach', 'ai_generated_content'])
            recommended_action = "Flag for human review before any communication"

        # Check for elder_review_required custom field
        if custom_fields.get('elder_review_required'):
            requires_review = True
            reason = "Contact has elder_review_required flag set"
            blocked_actions.extend(['automated_email', 'automated_outreach', 'ai_generated_content'])
            recommended_action = "Human approval required before any action"

        # Check for cultural tags
        cultural_tags = [t for t in tags if t.startswith('cultural:')]
        if cultural_tags:
            requires_review = True
            reason = f"Contact has cultural tags: {', '.join(cultural_tags)}"
            blocked_actions.append('bulk_operations')
            recommended_action = "Review cultural context before communication"

        # Check for sacred knowledge flag
        if custom_fields.get('sacred_knowledge'):
            # This should never happen (blocked at query level)
            # But if somehow it's in the data, hard block everything
            requires_review = True
            reason = "CRITICAL: Sacred knowledge detected - FULL BLOCK"
            blocked_actions.extend([
                'read', 'write', 'delete', 'automated_email',
                'automated_outreach', 'ai_generated_content', 'bulk_operations'
            ])
            recommended_action = "IMMEDIATELY escalate to ACT Cultural Advisor"

        return {
            'requires_review': requires_review,
            'reason': reason,
            'actions_blocked': blocked_actions,
            'recommended_action': recommended_action,
            'contact_id': contact.get('id'),
            'contact_name': f"{contact.get('firstName', '')} {contact.get('lastName', '')}".strip()
        }

    @abstractmethod
    async def execute(self, **kwargs) -> Any:
        """
        Execute tool operation (subclasses implement this).

        All subclasses must implement this method to define their specific
        functionality (GHL API calls, web search, file operations, etc.)
        """
        pass

    def log_cultural_protocol_check(
        self,
        check_result: Dict[str, Any],
        log_level: str = 'INFO'
    ) -> None:
        """
        Log cultural protocol check results for audit trail.

        Args:
            check_result: Result from check_contact_cultural_protocols()
            log_level: 'INFO', 'WARNING', 'CRITICAL'
        """
        if check_result['requires_review']:
            symbol = '⚠️' if log_level == 'WARNING' else '🔴' if log_level == 'CRITICAL' else 'ℹ️'
            print(f"\n{symbol} CULTURAL PROTOCOL CHECK\n")
            print(f"Contact: {check_result['contact_name']} ({check_result['contact_id']})")
            print(f"Reason: {check_result['reason']}")
            print(f"Blocked actions: {', '.join(check_result['actions_blocked'])}")
            print(f"Recommended: {check_result['recommended_action']}\n")

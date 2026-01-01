"""
Cleanup Agent - Data quality, deduplication, cultural protocol enforcement

This agent is responsible for maintaining data quality across the ACT ecosystem
while enforcing strict cultural protocols around Indigenous data sovereignty.
"""
from typing import List, Dict, Any
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from tools.ghl_tool import GHLTool


class CleanupAgent:
    """
    ACT Cleanup Agent

    Responsibilities:
    1. Deduplicate GHL contacts (same email = merge records)
    2. Normalize tag spelling (empathy-ledger vs Empathy-Ledger → empathy-ledger)
    3. Fix missing custom fields (volunteer_hours_total = null → 0)
    4. Enforce data quality rules:
       - All emails lowercase
       - Phone numbers formatted: +61 XXX XXX XXX
       - Required fields populated (name, email)
    5. CRITICAL - Cultural Protocol Enforcement:
       - NEVER query/modify fields: elder_consent, sacred_knowledge
       - If contact has cultural:elder-review-required tag, flag for human review
       - Supabase storyteller data is READ-ONLY in GHL (never edit)

    Output: Data quality report with fixes applied.
    """

    def __init__(self, ghl_tool: GHLTool):
        self.ghl = ghl_tool
        self.system_prompt = self._load_system_prompt()

    def _load_system_prompt(self) -> str:
        """Load the cleanup agent's system prompt"""
        return """
You are the Cleanup Agent for ACT Regenerative Innovation Studio.

Your responsibilities:
1. Deduplicate GHL contacts (same email = merge records)
2. Normalize tag spelling (empathy-ledger vs Empathy-Ledger → empathy-ledger)
3. Fix missing custom fields (volunteer_hours_total = null → 0)
4. Enforce data quality rules:
   - All emails lowercase
   - Phone numbers formatted: +61 XXX XXX XXX
   - Required fields populated (name, email)
5. CRITICAL - Cultural Protocol Enforcement:
   - NEVER query/modify fields: elder_consent, sacred_knowledge
   - If contact has cultural:elder-review-required tag, flag for human review
   - Supabase storyteller data is READ-ONLY in GHL (never edit)

Output: Data quality report with fixes applied.
"""

    async def find_duplicates(self) -> Dict[str, List[Dict]]:
        """
        Find duplicate contacts (same email).

        Returns:
            Dict of email → list of duplicate contacts
        """
        all_contacts = await self.ghl.search_contacts({})

        # Group by email (case-insensitive)
        email_groups = {}
        for contact in all_contacts:
            email = contact.get('email', '').lower().strip()
            if not email:
                continue

            if email not in email_groups:
                email_groups[email] = []
            email_groups[email].append(contact)

        # Find duplicates (more than 1 contact per email)
        duplicates = {
            email: contacts
            for email, contacts in email_groups.items()
            if len(contacts) > 1
        }

        return duplicates

    async def normalize_tags(self, contact: Dict) -> List[str]:
        """
        Normalize tag spelling (all lowercase, hyphens instead of spaces).

        Args:
            contact: Contact with tags to normalize

        Returns:
            List of normalized tags (deduplicated)
        """
        normalized = []
        seen = set()

        for tag in contact.get('tags', []):
            # Convert to lowercase
            tag = tag.lower().strip()
            # Replace spaces with hyphens
            tag = tag.replace(' ', '-')
            # Remove multiple consecutive hyphens
            while '--' in tag:
                tag = tag.replace('--', '-')
            # Remove leading/trailing hyphens
            tag = tag.strip('-')

            # Only add if not already seen (deduplication)
            if tag and tag not in seen:
                normalized.append(tag)
                seen.add(tag)

        return normalized

    async def fix_missing_fields(self, contact: Dict) -> Dict:
        """
        Fill in missing custom fields with sensible defaults.

        Args:
            contact: Contact with potentially missing fields

        Returns:
            Contact with filled-in fields
        """
        defaults = {
            # Numeric fields default to 0
            'volunteer_hours_total': 0,
            'stories_count': 0,
            'lifetime_donation_value': 0,

            # Boolean fields default to False
            'volunteer_orientation_completed': False,
            'elder_review_required': False,
            'ndis_participant': False,
            'pilot_interest': False,
        }

        custom_fields = contact.get('customFields', {})
        updated = False

        for field, default_value in defaults.items():
            if field not in custom_fields or custom_fields[field] is None:
                custom_fields[field] = default_value
                updated = True

        if updated:
            contact['customFields'] = custom_fields

        return contact

    async def check_cultural_protocols(self, contact: Dict) -> Dict:
        """
        Check if contact requires cultural protocol review.

        Uses the base tool's cultural protocol checker.

        Returns:
            {
                'requires_review': bool,
                'reason': str,
                'actions_blocked': List[str],
                'recommended_action': str
            }
        """
        return self.ghl.check_contact_cultural_protocols(contact)

    async def normalize_email(self, email: str) -> str:
        """Normalize email to lowercase, trimmed"""
        return email.lower().strip() if email else ''

    async def normalize_phone(self, phone: str) -> str:
        """
        Normalize phone number to Australian format: +61 XXX XXX XXX

        Args:
            phone: Raw phone number

        Returns:
            Formatted phone number or original if can't parse
        """
        if not phone:
            return ''

        # Remove all non-digits
        digits = ''.join(c for c in phone if c.isdigit())

        # Handle Australian numbers
        if digits.startswith('61'):
            # Already has country code
            digits = digits[2:]  # Remove 61
        elif digits.startswith('0'):
            # Remove leading 0
            digits = digits[1:]

        # Format: +61 XXX XXX XXX (mobile) or +61 X XXXX XXXX (landline)
        if len(digits) == 9:
            if digits.startswith('4'):
                # Mobile: +61 4XX XXX XXX
                return f"+61 {digits[0:3]} {digits[3:6]} {digits[6:9]}"
            else:
                # Landline: +61 X XXXX XXXX
                return f"+61 {digits[0]} {digits[1:5]} {digits[5:9]}"

        # If can't parse, return original
        return phone

    async def run(self, task: str) -> str:
        """
        Execute cleanup task based on natural language description.

        Args:
            task: Natural language description (e.g., "Find and merge duplicate contacts")

        Returns:
            Report of actions taken
        """
        task_lower = task.lower()

        if 'duplicate' in task_lower:
            duplicates = await self.find_duplicates()
            if not duplicates:
                return "✅ No duplicate contacts found"

            report = f"⚠️ Found {len(duplicates)} duplicate email(s):\n\n"
            for email, contacts in duplicates.items():
                report += f"  • {email} ({len(contacts)} contacts):\n"
                for contact in contacts:
                    report += f"    - {contact['firstName']} {contact['lastName']} (ID: {contact['id']})\n"
            report += "\n💡 Recommendation: Manually review and merge in GHL UI"
            return report

        elif 'normalize' in task_lower or 'tag' in task_lower:
            all_contacts = await self.ghl.search_contacts({})
            fixed = 0

            for contact in all_contacts:
                normalized_tags = await self.normalize_tags(contact)
                if normalized_tags != contact.get('tags', []):
                    await self.ghl.update_contact(
                        contact['id'],
                        {'tags': normalized_tags}
                    )
                    fixed += 1

            return f"✅ Normalized tags for {fixed} contact(s)"

        elif 'missing' in task_lower or 'field' in task_lower:
            all_contacts = await self.ghl.search_contacts({})
            fixed = 0

            for contact in all_contacts:
                updated = await self.fix_missing_fields(contact)
                if updated['customFields'] != contact.get('customFields', {}):
                    await self.ghl.update_contact(
                        contact['id'],
                        {'customFields': updated['customFields']}
                    )
                    fixed += 1

            return f"✅ Fixed missing fields for {fixed} contact(s)"

        elif 'cultural' in task_lower or 'protocol' in task_lower:
            all_contacts = await self.ghl.search_contacts({})
            flagged = []

            for contact in all_contacts:
                check = await self.check_cultural_protocols(contact)
                if check['requires_review']:
                    flagged.append(check)

            if not flagged:
                return "✅ No contacts requiring cultural protocol review"

            report = f"⚠️ Flagged {len(flagged)} contact(s) for cultural protocol review:\n\n"
            for check in flagged:
                report += f"  • {check['contact_name']} (ID: {check['contact_id']})\n"
                report += f"    Reason: {check['reason']}\n"
                report += f"    Actions blocked: {', '.join(check['actions_blocked'])}\n"
                report += f"    Recommended: {check['recommended_action']}\n\n"

            return report

        elif 'email' in task_lower or 'phone' in task_lower:
            all_contacts = await self.ghl.search_contacts({})
            fixed = 0

            for contact in all_contacts:
                updated_fields = {}

                # Normalize email
                if 'email' in contact:
                    normalized_email = await self.normalize_email(contact['email'])
                    if normalized_email != contact['email']:
                        updated_fields['email'] = normalized_email

                # Normalize phone
                if 'phone' in contact:
                    normalized_phone = await self.normalize_phone(contact['phone'])
                    if normalized_phone != contact['phone']:
                        updated_fields['phone'] = normalized_phone

                if updated_fields:
                    await self.ghl.update_contact(contact['id'], updated_fields)
                    fixed += 1

            return f"✅ Normalized email/phone for {fixed} contact(s)"

        else:
            return """
❓ Unknown cleanup task. Available commands:

• "find duplicates" - Find contacts with same email
• "normalize tags" - Fix tag spelling/formatting
• "fix missing fields" - Fill in null custom fields
• "check cultural protocols" - Flag contacts requiring cultural review
• "normalize email phone" - Standardize email/phone formatting

Try: "find duplicates" or "check cultural protocols"
"""

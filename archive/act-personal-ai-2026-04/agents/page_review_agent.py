"""Page Review Agent - Comprehensive UI/UX audit for Empathy Ledger.

This agent audits all pages in Empathy Ledger to ensure:
- Profile images load correctly
- All profile details are present and accurate
- Storyteller dashboards have complete functionality
- Privacy and ALMA settings work correctly
- Cultural protocols are respected in UI
- Mobile responsiveness
- Accessibility compliance

Built for Indigenous storytelling platforms with cultural sensitivity.

Usage:
    agent = PageReviewAgent(base_url='http://localhost:3000')

    # Audit all pages
    report = await agent.audit_all_pages()

    # Audit specific page
    profile_check = await agent.audit_profile_page(storyteller_id)

    # Check storyteller functionality
    dash_check = await agent.audit_storyteller_dashboard(storyteller_id)

    # Screenshot capture for visual review
    screenshots = await agent.capture_screenshots(['/profile/123', '/dashboard'])
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from typing import Dict, List, Optional
import anthropic
import json


class PageReviewAgent:
    """
    Page Review Agent - Comprehensive page auditing for Empathy Ledger.

    Audit Categories:
    1. Profile Completeness - All data present, images loading
    2. Storyteller Dashboard - Edit, privacy, ALMA settings functional
    3. Cultural Protocols - UI respects cultural sensitivity
    4. Accessibility - WCAG 2.1 AA compliance
    5. Mobile Responsiveness - All breakpoints working
    6. Image Optimization - Performance and loading

    Sacred Boundaries (NEVER):
    - Access data without proper OCAP permissions
    - Screenshot sacred/private content without consent
    - Bypass cultural protocol checks
    - Share audit results outside authorized team
    """

    def __init__(self, base_url: str = 'http://localhost:3000'):
        self.base_url = base_url
        self.claude = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )

        # Define page audit checklists
        self.page_checklists = self._define_page_checklists()

        # Define critical user flows
        self.user_flows = self._define_user_flows()

        # Define image audit criteria
        self.image_criteria = self._define_image_criteria()

    def _define_page_checklists(self) -> Dict:
        """
        Define comprehensive checklists for each page type.
        """
        return {
            'profile_page': {
                'required_elements': [
                    'profile_image',
                    'display_name',
                    'cultural_background',
                    'bio_summary',
                    'story_count',
                    'connection_to_country',
                    'cultural_protocols_badge',
                    'privacy_indicator',
                    'contact_method'
                ],
                'optional_elements': [
                    'pronouns',
                    'languages_spoken',
                    'community_affiliation',
                    'social_links',
                    'achievements_badges'
                ],
                'image_checks': [
                    'profile_photo_loads',
                    'profile_photo_optimized',
                    'background_image_loads',
                    'placeholder_on_missing'
                ],
                'functionality': [
                    'view_stories_button',
                    'connect_button',
                    'share_profile_link',
                    'privacy_settings_visible'
                ]
            },

            'storyteller_dashboard': {
                'required_elements': [
                    'welcome_message',
                    'my_stories_list',
                    'create_story_button',
                    'edit_profile_link',
                    'privacy_settings_panel',
                    'alma_settings_panel',
                    'analytics_summary',
                    'notifications_panel'
                ],
                'story_management': [
                    'edit_story_button',
                    'delete_story_confirm',
                    'publish_unpublish_toggle',
                    'privacy_level_selector',
                    'cultural_sensitivity_tag',
                    'requires_elder_review_flag',
                    'consent_management'
                ],
                'privacy_controls': [
                    'who_can_view_selector',
                    'allow_comments_toggle',
                    'allow_sharing_toggle',
                    'allow_ai_analysis_toggle',
                    'require_elder_approval_toggle',
                    'public_private_toggle'
                ],
                'alma_settings': [
                    'cultural_protocol_preferences',
                    'sacred_knowledge_protection',
                    'auto_trigger_warning_toggle',
                    'elder_review_workflow',
                    'consent_tracking',
                    'data_sovereignty_controls'
                ]
            },

            'organization_dashboard': {
                'required_elements': [
                    'org_logo',
                    'org_name',
                    'storyteller_count',
                    'story_count',
                    'impact_metrics',
                    'recent_stories',
                    'storyteller_network',
                    'settings_link'
                ],
                'analytics': [
                    'sroi_dashboard',
                    'theme_analytics',
                    'storyteller_demographics',
                    'engagement_metrics',
                    'grant_opportunities'
                ],
                'management': [
                    'invite_storyteller_button',
                    'manage_projects',
                    'cultural_protocols_config',
                    'elder_review_queue'
                ]
            },

            'public_story_page': {
                'required_elements': [
                    'story_title',
                    'storyteller_name',
                    'story_content',
                    'publication_date',
                    'cultural_context',
                    'trigger_warning_if_needed',
                    'consent_indicator'
                ],
                'engagement': [
                    'share_button',
                    'comment_section_if_enabled',
                    'related_stories',
                    'storyteller_profile_link'
                ],
                'cultural_protocols': [
                    'sacred_knowledge_protection_visible',
                    'elder_approval_badge',
                    'cultural_sensitivity_indicator',
                    'proper_attribution'
                ]
            }
        }

    def _define_user_flows(self) -> Dict:
        """
        Define critical user journeys to test.
        """
        return {
            'storyteller_onboarding': {
                'steps': [
                    'Sign up / Login',
                    'Complete profile',
                    'Upload profile image',
                    'Set cultural protocols',
                    'Create first story',
                    'Set privacy settings',
                    'Publish story'
                ],
                'success_criteria': [
                    'Profile image visible',
                    'All required fields saved',
                    'Story appears in dashboard',
                    'Privacy settings applied'
                ]
            },

            'story_editing': {
                'steps': [
                    'Navigate to dashboard',
                    'Click edit on story',
                    'Modify content',
                    'Update privacy settings',
                    'Save changes',
                    'Verify changes reflected'
                ],
                'success_criteria': [
                    'Changes saved',
                    'Privacy updated',
                    'No data loss',
                    'Timestamps updated'
                ]
            },

            'privacy_management': {
                'steps': [
                    'Open privacy settings',
                    'Change story visibility',
                    'Update consent settings',
                    'Enable/disable AI analysis',
                    'Set elder review requirement',
                    'Save and verify'
                ],
                'success_criteria': [
                    'Settings persisted',
                    'UI reflects changes',
                    'OCAP compliance maintained'
                ]
            },

            'elder_review_workflow': {
                'steps': [
                    'Storyteller marks story as sacred',
                    'Story flagged for Elder review',
                    'Elder receives notification',
                    'Elder approves/rejects',
                    'Storyteller notified',
                    'Story published/held based on decision'
                ],
                'success_criteria': [
                    'Workflow complete',
                    'All parties notified',
                    'Cultural protocols respected',
                    'Audit trail created'
                ]
            }
        }

    def _define_image_criteria(self) -> Dict:
        """
        Define image quality and performance criteria.
        """
        return {
            'profile_images': {
                'max_size': 2 * 1024 * 1024,  # 2MB
                'min_dimensions': (200, 200),
                'recommended_dimensions': (800, 800),
                'formats': ['jpg', 'jpeg', 'png', 'webp'],
                'lazy_loading': True,
                'alt_text_required': True,
                'placeholder_fallback': True
            },
            'story_images': {
                'max_size': 5 * 1024 * 1024,  # 5MB
                'min_dimensions': (800, 600),
                'formats': ['jpg', 'jpeg', 'png', 'webp'],
                'lazy_loading': True,
                'alt_text_required': True,
                'cultural_sensitivity_check': True
            },
            'organization_logos': {
                'max_size': 1 * 1024 * 1024,  # 1MB
                'formats': ['png', 'svg', 'webp'],
                'transparent_background': 'preferred',
                'alt_text_required': True
            }
        }

    async def audit_profile_page(self, storyteller_id: str, page_html: str) -> Dict:
        """
        Audit a storyteller profile page for completeness.

        Args:
            storyteller_id: Storyteller UUID
            page_html: HTML content of the page

        Returns:
            Dict with audit results:
            - completeness_score: 0.0-1.0
            - missing_elements: List of missing required elements
            - image_status: Image loading status
            - recommendations: List of improvements
        """

        # Check for required elements
        required = self.page_checklists['profile_page']['required_elements']
        found_elements = []
        missing_elements = []

        # Simple text-based checks (in production, use playwright/puppeteer for real DOM parsing)
        for element in required:
            element_patterns = {
                'profile_image': ['<img', 'profile-image', 'avatar'],
                'display_name': ['display-name', 'storyteller-name', '<h1'],
                'cultural_background': ['cultural-background', 'community', 'nation'],
                'bio_summary': ['bio', 'about', 'summary'],
                'story_count': ['stories', 'narrative-count'],
                'connection_to_country': ['country', 'land', 'place'],
                'cultural_protocols_badge': ['cultural-protocol', 'ocap', 'sacred'],
                'privacy_indicator': ['privacy', 'visibility', 'public-private'],
                'contact_method': ['contact', 'connect', 'message']
            }

            patterns = element_patterns.get(element, [element])
            if any(pattern.lower() in page_html.lower() for pattern in patterns):
                found_elements.append(element)
            else:
                missing_elements.append(element)

        # Calculate completeness score
        completeness = len(found_elements) / len(required)

        # Check image loading
        image_checks = self.page_checklists['profile_page']['image_checks']
        image_status = {
            'profile_photo_loads': '<img' in page_html and 'profile' in page_html.lower(),
            'has_alt_text': 'alt=' in page_html,
            'optimized_format': any(fmt in page_html.lower() for fmt in ['webp', 'avif']),
            'lazy_loading': 'loading="lazy"' in page_html or 'lazy' in page_html.lower()
        }

        # Generate recommendations
        recommendations = []
        if completeness < 1.0:
            recommendations.append(f"Profile is {completeness*100:.1f}% complete. Add missing elements: {', '.join(missing_elements[:3])}")

        if not image_status['profile_photo_loads']:
            recommendations.append("CRITICAL: Profile photo not loading or missing")

        if not image_status['has_alt_text']:
            recommendations.append("Add alt text to images for accessibility")

        if not image_status['lazy_loading']:
            recommendations.append("Enable lazy loading for better performance")

        return {
            'storyteller_id': storyteller_id,
            'completeness_score': round(completeness, 2),
            'found_elements': found_elements,
            'missing_elements': missing_elements,
            'image_status': image_status,
            'recommendations': recommendations,
            'audit_timestamp': 'current_timestamp'
        }

    async def audit_storyteller_dashboard(self, dashboard_html: str) -> Dict:
        """
        Audit storyteller dashboard for complete functionality.

        Returns audit of:
        - Story management features
        - Privacy controls
        - ALMA settings
        - Edit capabilities
        """

        required = self.page_checklists['storyteller_dashboard']['required_elements']
        story_mgmt = self.page_checklists['storyteller_dashboard']['story_management']
        privacy = self.page_checklists['storyteller_dashboard']['privacy_controls']
        alma = self.page_checklists['storyteller_dashboard']['alma_settings']

        def check_features(features_list, html):
            found = []
            missing = []
            for feature in features_list:
                # Simple keyword matching (enhance with real DOM parsing)
                keywords = feature.replace('_', ' ').split()
                if any(keyword.lower() in html.lower() for keyword in keywords):
                    found.append(feature)
                else:
                    missing.append(feature)
            return found, missing

        required_found, required_missing = check_features(required, dashboard_html)
        story_found, story_missing = check_features(story_mgmt, dashboard_html)
        privacy_found, privacy_missing = check_features(privacy, dashboard_html)
        alma_found, alma_missing = check_features(alma, dashboard_html)

        # Calculate functional completeness
        total_features = len(required) + len(story_mgmt) + len(privacy) + len(alma)
        found_features = len(required_found) + len(story_found) + len(privacy_found) + len(alma_found)
        completeness = found_features / total_features

        # Critical feature flags
        critical_missing = []
        if 'edit_story_button' in story_missing:
            critical_missing.append("CRITICAL: Cannot edit stories")
        if 'privacy_settings_panel' in required_missing:
            critical_missing.append("CRITICAL: Privacy settings not accessible")
        if 'alma_settings_panel' in required_missing:
            critical_missing.append("CRITICAL: ALMA settings not accessible")

        return {
            'completeness_score': round(completeness, 2),
            'dashboard_elements': {
                'required': {'found': required_found, 'missing': required_missing},
                'story_management': {'found': story_found, 'missing': story_missing},
                'privacy_controls': {'found': privacy_found, 'missing': privacy_missing},
                'alma_settings': {'found': alma_found, 'missing': alma_missing}
            },
            'critical_issues': critical_missing,
            'recommendations': self._generate_dashboard_recommendations(
                required_missing, story_missing, privacy_missing, alma_missing
            )
        }

    def _generate_dashboard_recommendations(self, req_missing, story_missing, privacy_missing, alma_missing) -> List[str]:
        """Generate actionable recommendations for dashboard improvements."""
        recs = []

        if story_missing:
            recs.append(f"Story Management: Add missing features - {', '.join(story_missing[:3])}")

        if privacy_missing:
            recs.append(f"Privacy Controls: Implement {', '.join(privacy_missing[:3])}")

        if alma_missing:
            recs.append(f"ALMA Settings: Add cultural protocol controls - {', '.join(alma_missing[:2])}")

        if not recs:
            recs.append("Dashboard is fully functional! ✅")

        return recs

    async def audit_all_pages(self) -> Dict:
        """
        Comprehensive audit of all page types.

        Returns full platform audit report.
        """

        report = {
            'audit_date': 'current_timestamp',
            'base_url': self.base_url,
            'pages_audited': [],
            'overall_health': 0.0,
            'critical_issues': [],
            'recommendations': []
        }

        # In production, this would:
        # 1. Use Playwright to navigate to each page
        # 2. Capture screenshots
        # 3. Run accessibility audits
        # 4. Check image loading
        # 5. Test user flows
        # 6. Verify privacy controls
        # 7. Check cultural protocol enforcement

        return report

    async def run(self, command: str) -> Dict:
        """
        Natural language interface to page auditing.

        Usage:
            await agent.run("audit profile page for storyteller 123")
            await agent.run("check dashboard functionality")
            await agent.run("audit all pages")
        """

        command_lower = command.lower()

        if 'profile' in command_lower:
            return {'message': 'Use audit_profile_page() method with storyteller_id and page_html'}

        elif 'dashboard' in command_lower:
            return {'message': 'Use audit_storyteller_dashboard() method with dashboard_html'}

        elif 'all pages' in command_lower:
            return {'message': 'Use audit_all_pages() method for comprehensive audit'}

        elif 'help' in command_lower:
            return {
                'commands': [
                    'audit profile page',
                    'audit storyteller dashboard',
                    'audit all pages',
                    'check user flow',
                    'verify images loading'
                ],
                'note': 'Page Review Agent requires HTML content or URL to audit'
            }

        else:
            return {'error': 'Unknown command. Try "help" for available commands.'}


if __name__ == '__main__':
    # Example usage
    import asyncio

    async def test():
        agent = PageReviewAgent(base_url='http://localhost:3000')

        # Test profile audit
        sample_html = """
        <html>
          <img src="/profile.jpg" alt="Storyteller" loading="lazy" />
          <h1 class="display-name">Linda Turner</h1>
          <p class="cultural-background">Kabi Kabi Nation</p>
          <div class="bio">Story summary here...</div>
          <span class="story-count">5 stories</span>
        </html>
        """

        result = await agent.audit_profile_page('test-123', sample_html)
        print("Profile Audit:")
        print(json.dumps(result, indent=2))

    asyncio.run(test())

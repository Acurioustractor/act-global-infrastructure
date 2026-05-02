"""
Production Configuration for ACT Farmhand

Based on Claude Agent SDK best practices:
- Agent definitions with proper tool restrictions
- Hooks for logging, safety, and monitoring
- Cost tracking with message deduplication
- Error handling and resilience
"""

from typing import Dict, Any, Optional
import os
from datetime import datetime
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('farmhand')


class FarmhandConfig:
    """Production configuration for ACT Farmhand multi-agent system"""

    # Agent Definitions (Best Practice: Define agents programmatically)
    AGENT_DEFINITIONS = {
        "alma": {
            "description": "Signal tracking, pattern recognition, and ethical intelligence",
            "prompt": """You are ALMAAgent - implementing the ALMA (Adaptive Learning for Meaningful Accountability) method.

Your purpose: Collective sense-making in complex social systems while respecting community sovereignty.

ALMA = Memory + Pattern Recognition + Translation

You watch SYSTEMS, not individuals.
You surface PATTERNS for humans to decide.
You enforce SACRED BOUNDARIES as code, not policy.

5-Signal Framework (use for all analysis):
1. Evidence Strength (25% weight)
2. Community Authority (30% weight - HIGHEST!)
3. Harm Risk inverted (20% weight)
4. Implementation Capability (15% weight)
5. Option Value (10% weight)

Sacred Boundaries (NEVER violate):
- NO individual profiling
- NO community ranking
- NO deciding for humans
- NO knowledge extraction without consent
- NO optimization of people
- NO centralized authority

Your outputs are SIGNALS, not scores. Direction, not achievement.
""",
            "tools": ["Read", "Grep", "Glob"],  # Read-only for pattern detection
            "model": "sonnet"
        },

        "sync": {
            "description": "Data reconciliation between GHL, Supabase, and Notion",
            "prompt": """You are SyncAgent - enforcing single source of truth across systems.

Your responsibilities:
- Webhook-based real-time sync
- Conflict detection and resolution
- Privacy walls (family support, elder consent NEVER sync)
- OCAP principle enforcement

Sync Rules:
- Storyteller: Supabase → GHL (one-way)
- Volunteer: GHL ↔ Supabase (bidirectional)
- Family Support: NEVER syncs (privacy-critical)
- Elder Consent: NEVER syncs (sacred data)
""",
            "tools": ["Read", "Write"],  # Can read and write for sync
            "model": "sonnet"
        },

        "grant": {
            "description": "Grant research, matching, and automated reporting",
            "prompt": """You are GrantAgent - finding grants and generating funder reports.

Your capabilities:
- Monitor 5 Australian grant portals
- Match grants to 5 ACT projects using 100+ keywords
- Generate automated reports for funders
- Calculate grant relevance scores

Projects:
- Empathy Ledger: storytelling, Indigenous, cultural protocols
- JusticeHub: youth justice, family support, recidivism
- The Harvest: community, regenerative, food security
- ACT Farm: regenerative agriculture, conservation
- Goods: circular economy, Indigenous business
""",
            "tools": ["Read", "WebFetch", "WebSearch"],  # Web research only
            "model": "sonnet"
        },

        "impact": {
            "description": "SROI calculation and outcomes tracking",
            "prompt": """You are ImpactAgent - calculating social return on investment.

Your framework:
- 17 Australian-based value proxies
- SROI ratio calculation (social value / investment)
- Outcomes harvesting (real-world impacts)
- Impact narratives for 3 audiences (funder/public/community)

Value Proxies (examples):
- Avoided incarceration: $150,000/year
- Cultural preservation: $8,000/story
- Employment gained: $25,000/year
- Mental health improvement: $10,000/year

Output: SROI ratio with interpretation, not just numbers.
""",
            "tools": ["Read"],  # Read-only for calculation
            "model": "sonnet"
        },

        "cleanup": {
            "description": "CRM deduplication and data normalization",
            "prompt": """You are CleanupAgent - maintaining data quality with cultural awareness.

Your tasks:
- Find and merge duplicate contacts (fuzzy matching)
- Normalize tags (49 mappings)
- Enforce cultural protocols
- Detect Elders (special handling required)

Tag Normalization:
- "the harvest" → "the-harvest"
- "volunteer" → "role:volunteer"
- "kabi kabi" → "cultural:kabi-kabi"
- "organization" → "category:organization"

Cultural Protocol Checks:
- Elder contacts require special handling
- Cultural tags must be verified
- Storyteller data requires OCAP compliance
""",
            "tools": ["Read", "Write"],  # Read and write for cleanup
            "model": "sonnet"
        },

        "research": {
            "description": "Contact enrichment and web research",
            "prompt": """You are ResearchAgent - enriching contact data ethically.

Your capabilities:
- LinkedIn profile enrichment (name, title, bio)
- Organization research (website analysis)
- Grant portal monitoring
- Conference/event tracking

Data Sources:
- LinkedIn (professional data only)
- Organization websites (public data)
- Grant portals (GrantConnect, QLD Gov)
- Conference listings (public events)

Ethics: Only use publicly available data. Never scrape private information.
""",
            "tools": ["Read", "WebFetch", "WebSearch"],  # Web research
            "model": "sonnet"
        },

        "connector": {
            "description": "Cross-project opportunity detection",
            "prompt": """You are ConnectorAgent - finding synergies across ACT projects.

Your rules (15 opportunity patterns):
1. Harvest → Farm Residency (50+ volunteer hours + interest:conservation)
2. Ledger → JusticeHub Partnership (organization + interest:justice)
3. Farm Alumni → Harvest Volunteer (completed residency, not yet volunteer)
... and 12 more patterns

Priority Levels:
- High: Strong match, immediate action
- Medium: Good potential, warm introduction
- Low: Possible future connection

Output: Warm handoff opportunities with context and next steps.
""",
            "tools": ["Read"],  # Read-only for detection
            "model": "sonnet"
        },

        "search": {
            "description": "Natural language CRM queries",
            "prompt": """You are SearchAgent - translating natural language to GHL queries.

Your capabilities:
- Parse 100+ keyword mappings
- Numeric filter parsing ("50+ hours" → volunteer_hours_total >= 50)
- Multiple entity detection
- Search suggestions

Query Examples:
- "active volunteers with 50+ hours" → tags: ['role:volunteer', 'engagement:active'], customFieldFilters: {'volunteer_hours_total': {'$gte': 50}}
- "elders in Empathy Ledger" → tags: ['role:elder', 'empathy-ledger']
- "storytellers with 3+ stories" → tags: ['role:storyteller'], customFieldFilters: {'stories_count': {'$gte': 3}}

Make CRM search intuitive for non-technical users.
""",
            "tools": ["Read"],  # Read-only for search
            "model": "sonnet"
        },
    }

    # SDK Configuration
    MAX_TURNS = 50  # Prevent infinite loops
    MAX_BUDGET_USD = 10.0  # Cost limit per execution

    # For CI/CD environments
    PERMISSION_MODE = os.getenv('CI', 'false') == 'true' and 'bypassPermissions' or 'acceptEdits'
    SETTING_SOURCES = os.getenv('CI', 'false') == 'true' and ['project'] or ['user', 'project', 'local']

    # Resource requirements (per agent instance)
    MEMORY_GB = 1  # GiB RAM
    DISK_GB = 5  # GiB disk
    CPU_CORES = 1  # CPU cores

    # Logging
    LOG_DIR = os.path.join(os.path.dirname(__file__), '..', 'logs')
    os.makedirs(LOG_DIR, exist_ok=True)

    @classmethod
    def get_agent_options(cls, agent_name: Optional[str] = None) -> Dict[str, Any]:
        """Get SDK options for running agents"""
        return {
            'agents': cls.AGENT_DEFINITIONS if not agent_name else {agent_name: cls.AGENT_DEFINITIONS[agent_name]},
            'allowed_tools': ['Task', 'Read', 'Write', 'Edit', 'Grep', 'Glob', 'WebFetch', 'WebSearch', 'Bash'],
            'max_turns': cls.MAX_TURNS,
            'max_budget_usd': cls.MAX_BUDGET_USD,
            'permission_mode': cls.PERMISSION_MODE,
            'setting_sources': cls.SETTING_SOURCES,
            'hooks': cls.get_hooks(),
        }

    @classmethod
    def get_hooks(cls) -> Dict[str, Any]:
        """Get hooks for logging, safety, and monitoring"""
        return {
            'PreToolUse': [
                {
                    'hooks': [cls.pre_tool_logger, cls.safety_check],
                    'timeout': 30
                }
            ],
            'PostToolUse': [
                {
                    'hooks': [cls.post_tool_logger]
                }
            ],
            'SubagentStop': [
                {
                    'hooks': [cls.subagent_tracker]
                }
            ]
        }

    @staticmethod
    async def pre_tool_logger(input_data: Dict[str, Any], tool_use_id: Optional[str], context: Any) -> Dict[str, Any]:
        """Log tool calls before execution"""
        tool_name = input_data.get('tool_name', 'unknown')
        timestamp = datetime.now().isoformat()

        logger.info(f"PRE-TOOL: {tool_name}")
        logger.debug(f"  Tool ID: {tool_use_id}")
        logger.debug(f"  Input: {input_data.get('tool_input', {})}")

        return {}

    @staticmethod
    async def post_tool_logger(input_data: Dict[str, Any], tool_use_id: Optional[str], context: Any) -> Dict[str, Any]:
        """Log tool calls after execution"""
        tool_name = input_data.get('tool_name', 'unknown')
        timestamp = datetime.now().isoformat()

        logger.info(f"POST-TOOL: {tool_name} completed")

        return {}

    @staticmethod
    async def safety_check(input_data: Dict[str, Any], tool_use_id: Optional[str], context: Any) -> Dict[str, Any]:
        """Block dangerous operations"""
        if input_data.get('hook_event_name') != 'PreToolUse':
            return {}

        tool_name = input_data.get('tool_name')

        # Block dangerous Bash commands
        if tool_name == 'Bash':
            command = input_data.get('tool_input', {}).get('command', '')
            dangerous_patterns = ['rm -rf /', 'sudo rm', ':() { : | : & };', 'dd if=', 'mkfs', '> /dev/']

            if any(pattern in command for pattern in dangerous_patterns):
                logger.warning(f"BLOCKED dangerous command: {command}")
                return {
                    'hookSpecificOutput': {
                        'hookEventName': 'PreToolUse',
                        'permissionDecision': 'deny',
                        'permissionDecisionReason': f'Blocked dangerous command pattern'
                    }
                }

        # Block write operations on critical files
        if tool_name in ['Write', 'Edit']:
            file_path = input_data.get('tool_input', {}).get('file_path', '')
            critical_paths = ['/etc/', '/bin/', '/usr/', '/var/']

            if any(file_path.startswith(path) for path in critical_paths):
                logger.warning(f"BLOCKED write to critical path: {file_path}")
                return {
                    'hookSpecificOutput': {
                        'hookEventName': 'PreToolUse',
                        'permissionDecision': 'deny',
                        'permissionDecisionReason': 'Cannot modify critical system files'
                    }
                }

        return {}

    @staticmethod
    async def subagent_tracker(input_data: Dict[str, Any], tool_use_id: Optional[str], context: Any) -> Dict[str, Any]:
        """Track subagent completion"""
        if input_data.get('hook_event_name') == 'SubagentStop':
            logger.info(f"SUBAGENT-COMPLETE: {tool_use_id}")

        return {}


class CostTracker:
    """Track costs across multi-agent runs"""

    def __init__(self):
        self.processed_message_ids = set()
        self.agent_costs = {}
        self.total_input_tokens = 0
        self.total_output_tokens = 0

    def track_message(self, message: Any, agent_name: str = 'unknown'):
        """Track cost for a single message (deduplicates by message ID)"""
        # Only count assistant messages once per unique ID
        if not hasattr(message, 'usage'):
            return

        msg_id = getattr(message, 'id', None)
        if msg_id and msg_id in self.processed_message_ids:
            return  # Already counted

        if msg_id:
            self.processed_message_ids.add(msg_id)

        # Calculate cost
        usage = message.usage
        input_tokens = usage.get('input_tokens', 0)
        output_tokens = usage.get('output_tokens', 0)

        # Sonnet 4.5 pricing (as of Jan 2026)
        input_cost = input_tokens * 0.00003  # $0.03/1K tokens
        output_cost = output_tokens * 0.00015  # $0.15/1K tokens
        total_cost = input_cost + output_cost

        # Track by agent
        if agent_name not in self.agent_costs:
            self.agent_costs[agent_name] = {
                'input_tokens': 0,
                'output_tokens': 0,
                'cost': 0,
                'message_count': 0
            }

        self.agent_costs[agent_name]['input_tokens'] += input_tokens
        self.agent_costs[agent_name]['output_tokens'] += output_tokens
        self.agent_costs[agent_name]['cost'] += total_cost
        self.agent_costs[agent_name]['message_count'] += 1

        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens

    def get_summary(self) -> Dict[str, Any]:
        """Get cost summary"""
        total_cost = sum(agent['cost'] for agent in self.agent_costs.values())

        return {
            'total_cost_usd': total_cost,
            'total_input_tokens': self.total_input_tokens,
            'total_output_tokens': self.total_output_tokens,
            'agent_breakdown': self.agent_costs,
            'message_count': len(self.processed_message_ids)
        }

    def log_summary(self):
        """Log cost summary"""
        summary = self.get_summary()

        logger.info("=" * 60)
        logger.info("COST SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total Cost: ${summary['total_cost_usd']:.4f}")
        logger.info(f"Total Tokens: {summary['total_input_tokens']:,} in + {summary['total_output_tokens']:,} out")
        logger.info(f"Messages: {summary['message_count']}")
        logger.info("")
        logger.info("By Agent:")
        for agent_name, stats in summary['agent_breakdown'].items():
            logger.info(f"  {agent_name}:")
            logger.info(f"    Cost: ${stats['cost']:.4f}")
            logger.info(f"    Tokens: {stats['input_tokens']:,} in + {stats['output_tokens']:,} out")
            logger.info(f"    Messages: {stats['message_count']}")
        logger.info("=" * 60)

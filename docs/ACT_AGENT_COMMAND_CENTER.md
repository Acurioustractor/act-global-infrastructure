# ACT Agent Command Center
## Multi-Agent Architecture with Unified Management

**Created:** 2026-01-21
**Status:** Design Complete → Ready to Build

---

## Vision

A unified system where:
1. **Multiple specialized agents** handle different domains
2. **One command interface** to interact with all of them
3. **Work flows seamlessly** across Discord, Notion, Signal, WhatsApp, Web Dashboard
4. **Human review** is easy and mobile-friendly

---

## Agent Roster

### Domain-Specific Agents

| Agent | Domain | Capabilities | Autonomy |
|-------|--------|--------------|----------|
| **Ralph** | Long-running Tasks | PRD execution, multi-step workflows | Level 2 (supervised) |
| **Scout** | Research | Codebase analysis, market research, competitive intel | Level 3 (auto) |
| **Scribe** | Content | Blog posts, newsletters, social media, documentation | Level 2 (review) |
| **Ledger** | Finance | Invoicing, expense tracking, Xero sync, R&DTI | Level 1 (suggest) |
| **Cultivator** | Relationships | Partner health, follow-ups, dinner invites | Level 2 (review) |
| **Shepherd** | Projects | Status updates, milestone tracking, blockers | Level 2 (supervised) |
| **Oracle** | Knowledge | Q&A, RAG search, knowledge gaps | Level 3 (auto) |
| **Herald** | Comms | Digest emails, partner updates, announcements | Level 2 (review) |

### Support Agents

| Agent | Role |
|-------|------|
| **Dispatcher** | Routes requests to right agent |
| **Reviewer** | Manages human approval queue |
| **Chronicler** | Captures learnings, updates knowledge |

---

## Channel Architecture

```
                          ┌─────────────────────────────────────┐
                          │      ACT AGENT COMMAND CENTER       │
                          │         (Central Brain)             │
                          └──────────────┬──────────────────────┘
                                         │
           ┌─────────────────────────────┼─────────────────────────────┐
           │                             │                             │
           ▼                             ▼                             ▼
    ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
    │   INPUT     │              │  PROCESSING │              │   OUTPUT    │
    │  CHANNELS   │              │   LAYER     │              │  CHANNELS   │
    └─────────────┘              └─────────────┘              └─────────────┘
           │                             │                             │
    ┌──────┴──────┐              ┌──────┴──────┐              ┌──────┴──────┐
    │             │              │             │              │             │
    │ Discord     │──────────────│ Dispatcher  │──────────────│ Discord     │
    │ Signal      │              │     ↓       │              │ Signal      │
    │ WhatsApp    │              │ Agent Pool  │              │ WhatsApp    │
    │ Voice       │              │     ↓       │              │ Email/GHL   │
    │ Web UI      │              │ Executor    │              │ Notion      │
    │ CLI         │              │     ↓       │              │ Web UI      │
    │             │              │ Reviewer    │              │             │
    └─────────────┘              └─────────────┘              └─────────────┘
```

### Channel Routing Rules

| Input From | Routed To | Output To |
|------------|-----------|-----------|
| Discord @ACT | Dispatcher → Agent | Discord thread |
| Discord voice note | Oracle (transcribe) → Dispatcher | Discord + Notion task |
| Signal message | Dispatcher → Agent | Signal reply |
| WhatsApp team | Dispatcher → Agent | WhatsApp reply |
| Web UI command | Dispatcher → Agent | Web UI + Discord |
| CLI | Direct to agent | CLI + Discord log |

### Approval Channel Preferences

| Urgency | Primary | Fallback |
|---------|---------|----------|
| High (P1) | Signal push + Discord | Web dashboard |
| Medium (P2) | Discord thread | Web dashboard |
| Low (P3) | Web dashboard only | Weekly digest |

---

## Frontend: Agent Command Center

### Pages

#### 1. Dashboard (`/dashboard`)
- Agent status (online/offline, current task)
- Recent activity feed
- Pending approvals count
- Quick command input

#### 2. Agent Roster (`/agents`)
- All agents with status
- Click to see agent's current work
- Enable/disable agents
- Adjust autonomy levels

#### 3. Task Queue (`/tasks`)
- All tasks across all agents
- Filter by: status, agent, priority, source
- Drag to reprioritize
- Click to view/approve

#### 4. Approvals (`/approvals`)
- Items needing human review
- Quick approve/reject buttons
- Inline preview of agent output
- Bulk actions

#### 5. Activity Log (`/log`)
- Everything agents have done
- Searchable, filterable
- Debug view for errors
- Performance metrics

#### 6. Settings (`/settings`)
- Agent configurations
- Channel preferences
- Notification rules
- Autonomy boundaries

### UI Components

```
┌────────────────────────────────────────────────────────────────────────┐
│  🤖 ACT Agent Command Center                    [Ben] [Settings] [?]   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  💬 Ask the agents anything...                          [Send]  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐             │
│  │ 🟢 3 Active   │  │ 🔔 5 Pending  │  │ ✅ 12 Done    │             │
│  │   Agents      │  │   Approvals   │  │   Today       │             │
│  └───────────────┘  └───────────────┘  └───────────────┘             │
│                                                                        │
│  LIVE ACTIVITY                                                         │
│  ─────────────────────────────────────────────────────────────────     │
│  │ 🔍 Scout      │ Researching AusIndustry 2026 changes    [View]     │
│  │ 📝 Scribe     │ Drafting partner digest for Feb        [Review]   │
│  │ 💰 Ledger     │ Waiting: Invoice approval for NIDA     [Approve]  │
│  │ 🤝 Cultivator │ Idle - last ran 2h ago                 [Trigger]  │
│                                                                        │
│  RECENT COMPLETIONS                                                    │
│  ─────────────────────────────────────────────────────────────────     │
│  │ ✅ 10:30 │ Scout     │ Found 5 grant opportunities       [View]    │
│  │ ✅ 09:15 │ Herald    │ Sent morning brief to Discord    [View]    │
│  │ ✅ 08:00 │ Shepherd  │ Updated 3 project statuses       [View]    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Additions

```sql
-- Agent Registry
CREATE TABLE agents (
  id TEXT PRIMARY KEY,              -- 'scout', 'scribe', etc.
  name TEXT NOT NULL,
  domain TEXT NOT NULL,             -- 'research', 'content', 'finance'
  description TEXT,
  autonomy_level INT DEFAULT 2,     -- 1=suggest, 2=supervised, 3=auto
  enabled BOOLEAN DEFAULT TRUE,
  current_task_id UUID,
  last_heartbeat TIMESTAMPTZ,
  config JSONB DEFAULT '{}'
);

-- Unified Task Queue
CREATE TABLE agent_task_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT,                   -- 'research', 'draft', 'calculate', etc.

  -- Assignment
  assigned_agent TEXT REFERENCES agents(id),
  requested_by TEXT,                -- 'ben', 'system', 'discord'
  source TEXT,                      -- 'discord', 'signal', 'web', 'voice', 'scheduled'
  source_id TEXT,                   -- message ID, etc.

  -- Status
  status TEXT DEFAULT 'queued',     -- queued, assigned, working, review, done, failed
  priority INT DEFAULT 2,           -- 1=urgent, 4=low

  -- Execution
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  output JSONB,
  error TEXT,

  -- Review
  needs_review BOOLEAN DEFAULT FALSE,
  reviewed_by TEXT,
  review_decision TEXT,             -- 'approved', 'rejected', 'edited'
  review_feedback TEXT,

  -- Routing
  notify_channels TEXT[],           -- ['discord', 'signal']
  reply_to JSONB,                   -- {channel: 'discord', thread_id: '...'}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channel Messages (for threading)
CREATE TABLE channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,            -- 'discord', 'signal', 'whatsapp'
  channel_id TEXT,                  -- Discord channel ID, phone number, etc.
  message_id TEXT,                  -- Platform's message ID
  thread_id TEXT,                   -- For threading replies
  task_id UUID REFERENCES agent_task_queue(id),
  direction TEXT,                   -- 'inbound', 'outbound'
  content TEXT,
  sender TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Performance (for learning)
CREATE TABLE agent_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT REFERENCES agents(id),
  task_type TEXT,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  avg_duration_ms INT,
  avg_confidence FLOAT,
  actual_success_rate FLOAT,
  last_calculated TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Service Architecture

### 1. Agent Dispatcher (`services/agent-dispatcher.mjs`)
```javascript
// Routes incoming requests to appropriate agent
export async function dispatch(request) {
  const { message, source, context } = request;

  // Analyze intent
  const intent = await analyzeIntent(message);

  // Select agent
  const agent = selectAgent(intent);

  // Create task
  const task = await createTask({
    title: intent.summary,
    description: message,
    assigned_agent: agent.id,
    source,
    priority: intent.urgency,
    notify_channels: getNotifyChannels(source)
  });

  // Acknowledge
  await reply(source, context, `🤖 ${agent.name} is on it...`);

  return task;
}
```

### 2. Agent Heartbeat (`services/agent-heartbeat.mjs`)
```javascript
// Runs every 5 minutes, checks all agents for work
export async function heartbeat() {
  // 1. Check for approved tasks → execute
  const approved = await getApprovedTasks();
  for (const task of approved) {
    await executeTask(task);
  }

  // 2. Check for queued tasks → assign to idle agents
  const queued = await getQueuedTasks();
  const idle = await getIdleAgents();
  for (const task of queued) {
    const agent = matchAgent(task, idle);
    if (agent) await assignTask(task, agent);
  }

  // 3. Check scheduled triggers
  await checkScheduledTasks();

  // 4. Update agent statuses
  await updateAgentHeartbeats();
}
```

### 3. Agent Executor (`services/agent-executor.mjs`)
```javascript
// Actually runs agent work
export async function executeTask(task) {
  const agent = await getAgent(task.assigned_agent);

  // Update status
  await updateTaskStatus(task.id, 'working');
  await notifyChannels(task, `🔄 ${agent.name} working: ${task.title}`);

  // Execute based on agent type
  const result = await agents[agent.id].execute(task);

  // Handle result
  if (agent.autonomy_level === 3 || !result.needs_review) {
    await completeTask(task.id, result);
    await notifyChannels(task, `✅ Done: ${task.title}`);
  } else {
    await markForReview(task.id, result);
    await notifyChannels(task, `👁️ Needs review: ${task.title}`, { buttons: true });
  }
}
```

### 4. Discord Bot (`services/discord-bot.mjs`)
```javascript
// Handles Discord interactions
bot.on('messageCreate', async (message) => {
  // Check for @ACT mention or DM
  if (message.mentions.has(bot.user) || message.channel.type === 'DM') {
    await dispatch({
      message: message.content,
      source: 'discord',
      context: { channel_id: message.channel.id, message_id: message.id }
    });
  }
});

bot.on('interactionCreate', async (interaction) => {
  // Handle approve/reject buttons
  if (interaction.customId.startsWith('approve_')) {
    const taskId = interaction.customId.split('_')[1];
    await approveTask(taskId);
    await interaction.reply('✅ Approved!');
  }
});
```

### 5. Signal Bridge (`services/signal-bridge.mjs`)
```javascript
// Handles Signal messages
export async function handleSignalMessage(message) {
  await dispatch({
    message: message.text,
    source: 'signal',
    context: { phone: message.sender, timestamp: message.timestamp }
  });
}

export async function sendSignalNotification(phone, message, options = {}) {
  if (options.approval) {
    // Include approval instructions
    message += `\n\nReply:\n/approve ${options.taskId}\n/reject ${options.taskId} <reason>`;
  }
  await signal.send(phone, message);
}
```

---

## Implementation Order

### Phase 1: Core Infrastructure (Today)
1. ✅ Database migrations (agents, task_queue, channel_messages)
2. ✅ Agent Dispatcher service
3. ✅ Agent Heartbeat service
4. ✅ Agent Executor service

### Phase 2: Discord Integration (Today)
5. ✅ Discord bot with @ACT mentions
6. ✅ Thread-based task updates
7. ✅ Approve/reject buttons
8. ✅ Voice note → task flow

### Phase 3: Web Dashboard (Tomorrow)
9. Frontend Command Center
10. Live activity feed
11. Approval queue
12. Agent management

### Phase 4: Multi-Channel (This Week)
13. Signal bridge
14. WhatsApp integration
15. Notion task sync
16. Email notifications via GHL

---

## Quick Start

After implementation:

```bash
# Start all services
docker-compose up -d

# Or run individually
node services/agent-heartbeat.mjs &
node services/discord-bot.mjs &
node services/api-server.mjs &

# Open dashboard
open http://localhost:3456/dashboard
```

Then in Discord:
```
@ACT research what grants ACT is eligible for in 2026

@ACT draft a follow-up email to NIDA about Phase 2

@ACT what's the status of The Harvest project?
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Request → task creation | Manual | <5 seconds |
| Task → completion (auto) | N/A | <5 minutes |
| Task → review notification | N/A | <1 minute |
| Approval → execution | Hours/days | <5 minutes |
| % tasks completed without intervention | ~10% | 40% |

"""
ACT Intelligence Center - Streamlit Dashboard
Unified view of agents, knowledge, communications, and relationships.
"""

import streamlit as st
import pandas as pd
from supabase import create_client
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables from project root
import pathlib
project_root = pathlib.Path(__file__).parent.parent.parent
load_dotenv(project_root / '.env.local')

# Page config
st.set_page_config(
    page_title="ACT Intelligence Center",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize Supabase client
@st.cache_resource
def get_supabase():
    url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_ANON_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    if not url:
        st.error("SUPABASE_URL not found in environment")
        st.stop()
    return create_client(url, key)

supabase = get_supabase()

# Custom CSS for dark theme
st.markdown("""
<style>
    .metric-card {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 10px;
        padding: 20px;
        border: 1px solid #0f3460;
    }
    .stMetric {
        background: rgba(15, 52, 96, 0.3);
        padding: 10px;
        border-radius: 8px;
    }
</style>
""", unsafe_allow_html=True)

# Header
st.title("🧠 ACT Intelligence Center")
st.caption(f"Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

# Sidebar navigation
st.sidebar.title("Navigation")
page = st.sidebar.radio("", [
    "🏠 Overview",
    "🤖 Agents",
    "📚 Knowledge",
    "💬 Communications",
    "❤️ Relationships",
    "⚙️ Infrastructure"
])

# Helper functions
@st.cache_data(ttl=30)
def get_agents():
    """Fetch agents with status"""
    result = supabase.table('agents').select('*').execute()
    return result.data if result.data else []

@st.cache_data(ttl=30)
def get_proposals():
    """Fetch pending proposals"""
    result = supabase.table('agent_proposals').select('*').eq('status', 'pending').execute()
    return result.data if result.data else []

@st.cache_data(ttl=30)
def get_activity():
    """Fetch recent agent activity"""
    yesterday = (datetime.now() - timedelta(days=1)).isoformat()
    result = supabase.table('agent_audit_log').select('*').gte('timestamp', yesterday).order('timestamp', desc=True).limit(20).execute()
    return result.data if result.data else []

@st.cache_data(ttl=60)
def get_knowledge_stats():
    """Fetch knowledge statistics"""
    stats = {}

    # Knowledge chunks
    result = supabase.table('knowledge_chunks').select('id', count='exact').execute()
    stats['chunks'] = result.count or 0

    # Entities
    result = supabase.table('canonical_entities').select('id', count='exact').execute()
    stats['entities'] = result.count or 0

    # Entity mappings
    result = supabase.table('entity_mappings').select('id', count='exact').execute()
    stats['identifiers'] = result.count or 0

    return stats

@st.cache_data(ttl=60)
def get_el_stats():
    """Fetch Empathy Ledger stats from EL database"""
    try:
        el_url = os.getenv('EL_SUPABASE_URL')
        el_key = os.getenv('EL_SUPABASE_SERVICE_KEY')
        if el_url and el_key:
            el_client = create_client(el_url, el_key)
            stories = el_client.table('stories').select('id', count='exact').execute()
            storytellers = el_client.table('storytellers').select('id', count='exact').execute()
            return {
                'stories': stories.count or 0,
                'storytellers': storytellers.count or 0
            }
    except:
        pass
    return {'stories': 328, 'storytellers': 239}  # Fallback to known values

@st.cache_data(ttl=30)
def get_communications():
    """Fetch recent communications"""
    result = supabase.table('contact_communications').select('*').order('occurred_at', desc=True).limit(20).execute()
    return result.data if result.data else []

@st.cache_data(ttl=60)
def get_relationship_health():
    """Fetch relationship health summary"""
    result = supabase.table('relationship_health').select('*').execute()
    data = result.data if result.data else []

    hot = len([r for r in data if r.get('temperature', 0) >= 80])
    warm = len([r for r in data if 50 <= r.get('temperature', 0) < 80])
    cool = len([r for r in data if r.get('temperature', 0) < 50])

    return {'total': len(data), 'hot': hot, 'warm': warm, 'cool': cool}

# Page: Overview
if page == "🏠 Overview":
    # Metrics row
    col1, col2, col3, col4 = st.columns(4)

    agents = get_agents()
    proposals = get_proposals()
    knowledge = get_knowledge_stats()
    el_stats = get_el_stats()

    with col1:
        st.metric("Active Agents", len(agents))
    with col2:
        st.metric("Pending Approvals", len(proposals), delta=f"{len([p for p in proposals if p.get('priority') == 'urgent'])} urgent")
    with col3:
        st.metric("Entities", knowledge['entities'])
    with col4:
        st.metric("Stories", el_stats['stories'])

    st.divider()

    # Two column layout
    left, right = st.columns(2)

    with left:
        st.subheader("🤖 Agentic Layer")

        # Agent cards
        for agent in agents[:6]:
            autonomy = {1: "🔴 Manual", 2: "🟡 Supervised", 3: "🟢 Autonomous"}.get(agent.get('autonomy_level', 1), "Unknown")
            status = "🟢" if agent.get('current_task_id') else "⚪"

            with st.container():
                cols = st.columns([1, 3, 2])
                cols[0].write(status)
                cols[1].write(f"**{agent.get('name', 'Unknown')}**")
                cols[2].write(autonomy)

        st.caption(f"Total: {len(agents)} agents")

    with right:
        st.subheader("📚 Knowledge Layer")

        k_col1, k_col2 = st.columns(2)
        with k_col1:
            st.metric("Knowledge Chunks", knowledge['chunks'])
            st.metric("QA Pairs", 232)
        with k_col2:
            st.metric("Identifiers", knowledge['identifiers'])
            st.metric("Vignettes", 31)

    st.divider()

    # Pending Approvals
    st.subheader("⏳ Pending Approvals")

    if proposals:
        for proposal in proposals[:5]:
            with st.expander(f"**{proposal.get('title', 'Untitled')}** - {proposal.get('priority', 'normal')}"):
                st.write(f"**Agent:** {proposal.get('agent_id')}")
                st.write(f"**Created:** {proposal.get('created_at', '')[:10]}")

                reasoning = proposal.get('reasoning', {})
                if reasoning:
                    st.write(f"**Reasoning:** {reasoning.get('details', 'No details')}")

                col1, col2, col3 = st.columns([1, 1, 4])
                if col1.button("✅ Approve", key=f"approve_{proposal['id']}"):
                    supabase.table('agent_proposals').update({'status': 'approved'}).eq('id', proposal['id']).execute()
                    st.cache_data.clear()
                    st.rerun()
                if col2.button("❌ Reject", key=f"reject_{proposal['id']}"):
                    supabase.table('agent_proposals').update({'status': 'rejected'}).eq('id', proposal['id']).execute()
                    st.cache_data.clear()
                    st.rerun()
    else:
        st.info("No pending approvals")

    st.divider()

    # Recent Activity
    st.subheader("📋 Recent Agent Activity")

    activity = get_activity()
    if activity:
        activity_df = pd.DataFrame(activity)[['timestamp', 'agent_id', 'action', 'success']].head(10)
        activity_df['timestamp'] = pd.to_datetime(activity_df['timestamp']).dt.strftime('%H:%M:%S')
        activity_df['status'] = activity_df['success'].map({True: '✅', False: '❌'})
        st.dataframe(activity_df[['timestamp', 'agent_id', 'action', 'status']], use_container_width=True, hide_index=True)
    else:
        st.info("No recent activity")

# Page: Agents
elif page == "🤖 Agents":
    st.header("Agent Management")

    agents = get_agents()
    proposals = get_proposals()

    # Agent overview
    st.subheader("All Agents")

    if agents:
        df = pd.DataFrame(agents)
        df['autonomy'] = df['autonomy_level'].map({1: 'Manual', 2: 'Supervised', 3: 'Autonomous'})
        df['status'] = df['current_task_id'].apply(lambda x: 'Active' if x else 'Idle')

        st.dataframe(
            df[['name', 'domain', 'description', 'autonomy', 'status', 'enabled']],
            use_container_width=True,
            hide_index=True
        )

    st.divider()

    # Proposals by agent
    st.subheader("Pending Proposals by Agent")

    if proposals:
        by_agent = {}
        for p in proposals:
            agent = p.get('agent_id', 'unknown')
            by_agent[agent] = by_agent.get(agent, 0) + 1

        chart_df = pd.DataFrame(list(by_agent.items()), columns=['Agent', 'Proposals'])
        st.bar_chart(chart_df.set_index('Agent'))

# Page: Knowledge
elif page == "📚 Knowledge":
    st.header("Knowledge Base")

    stats = get_knowledge_stats()
    el_stats = get_el_stats()

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Knowledge Chunks", stats['chunks'])
    col2.metric("Entities", stats['entities'])
    col3.metric("Stories", el_stats['stories'])
    col4.metric("Storytellers", el_stats['storytellers'])

    st.divider()

    # Entity search
    st.subheader("Entity Search")
    search = st.text_input("Search entities...")

    if search:
        results = supabase.table('canonical_entities').select('*').ilike('canonical_name', f'%{search}%').limit(20).execute()
        if results.data:
            st.dataframe(pd.DataFrame(results.data), use_container_width=True, hide_index=True)
        else:
            st.info("No results found")

# Page: Communications
elif page == "💬 Communications":
    st.header("Communications")

    comms = get_communications()

    if comms:
        df = pd.DataFrame(comms)

        # Channel breakdown
        st.subheader("By Channel")
        if 'channel' in df.columns:
            channel_counts = df['channel'].value_counts()
            st.bar_chart(channel_counts)

        st.divider()

        # Recent communications
        st.subheader("Recent Communications")
        display_cols = [c for c in ['occurred_at', 'channel', 'subject', 'contact_name'] if c in df.columns]
        st.dataframe(df[display_cols].head(20), use_container_width=True, hide_index=True)
    else:
        st.info("No communications data")

# Page: Relationships
elif page == "❤️ Relationships":
    st.header("Relationship Health")

    health = get_relationship_health()

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total", health['total'])
    col2.metric("🔥 Hot (80+)", health['hot'])
    col3.metric("😊 Warm (50-79)", health['warm'])
    col4.metric("❄️ Cool (<50)", health['cool'])

    st.divider()

    # Health distribution chart
    if health['total'] > 0:
        st.subheader("Temperature Distribution")
        chart_data = pd.DataFrame({
            'Category': ['Hot', 'Warm', 'Cool'],
            'Count': [health['hot'], health['warm'], health['cool']]
        })
        st.bar_chart(chart_data.set_index('Category'))

# Page: Infrastructure
elif page == "⚙️ Infrastructure":
    st.header("Infrastructure Health")

    st.info("Infrastructure monitoring coming soon. For now, use: http://localhost:3456/infrastructure.html")

    # Quick stats
    col1, col2, col3 = st.columns(3)
    col1.metric("Codebases", 10)
    col2.metric("Scripts", 169)
    col3.metric("Database Tables", "45+")

# Auto-refresh
if st.sidebar.checkbox("Auto-refresh (30s)", value=False):
    import time
    time.sleep(30)
    st.rerun()

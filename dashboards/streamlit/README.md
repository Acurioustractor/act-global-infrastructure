# ACT Streamlit Dashboards

Python-first internal dashboards using Streamlit.

## Setup

```bash
cd dashboards/streamlit
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

## Run

```bash
streamlit run intelligence.py
```

Opens at http://localhost:8501

## Dashboards

| File | Purpose |
|------|---------|
| `intelligence.py` | Main Intelligence Center - agents, knowledge, comms, relationships |
| `agents.py` | (planned) Agent detail views and management |
| `knowledge.py` | (planned) Knowledge browser and search |
| `relationships.py` | (planned) Relationship health and cultural calendar |

## Environment

Requires `.env.local` in project root with:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` or `SUPABASE_ANON_KEY`
- `EL_SUPABASE_URL` (optional, for Empathy Ledger stats)
- `EL_SUPABASE_SERVICE_KEY` (optional)

# /query — Supabase Analytics Skill

Run analytics queries against the ACT Supabase database without writing SQL manually.

## Activation

When user says `/query` or asks data questions like:
- "How many contacts were added this week?"
- "Show me the latest communications"
- "What's the project health status?"

## Workflow

1. **Understand the question** — Parse what data the user needs
2. **Find the right tables** — Use `mcp__supabase__list_tables` if unsure
3. **Write and execute SQL** — Use `mcp__supabase__execute_sql` to query
4. **Format results** — Present as a clean table or summary

## Common Queries

### Contacts & Communications
```sql
SELECT count(*) FROM contacts WHERE created_at > now() - interval '7 days';
SELECT * FROM communications ORDER BY created_at DESC LIMIT 10;
```

### Project Health
```sql
SELECT project_name, health_score, updated_at FROM project_health ORDER BY health_score ASC;
```

### Subscriptions & Finance
```sql
SELECT vendor, amount, next_billing_date FROM subscriptions WHERE status = 'active' ORDER BY amount DESC;
```

### Knowledge & Memory
```sql
SELECT type, count(*) FROM learnings GROUP BY type ORDER BY count DESC;
```

## Rules

- Always use `mcp__supabase__execute_sql` for queries — never shell out to psql
- For write operations (INSERT/UPDATE/DELETE), confirm with user first
- Present results as markdown tables when there are <20 rows
- Summarize with counts/aggregates when there are many rows
- If the query fails, check table names with `mcp__supabase__list_tables`

## Tips

- Chain queries: "Show me contacts who haven't been contacted in 30 days AND have active projects"
- Use with `/fix`: "Query the error logs and fix what you find"
- Trend analysis: "Compare this week vs last week for new contacts"

# ACT Search Skill

Search across all ACT ecosystem data - contacts, projects, and stories.

## Commands

### /search [query]
Search across all sources using hybrid semantic + keyword search.

**Examples:**
- `/search youth justice programs`
- `/search grants for indigenous programs`
- `/search Brisbane contacts in education`

### /contacts [query]
Search specifically for contacts in the ACT network.

**Examples:**
- `/contacts foundation managers`
- `/contacts Brisbane`
- `/contacts impact investors`

### /projects [status]
List projects by status.

**Examples:**
- `/projects active`
- `/projects all`

### /grants [topic]
Find grant opportunities matching your criteria.

**Examples:**
- `/grants youth mental health`
- `/grants indigenous cultural programs`
- `/grants community development queensland`

## Usage Notes

- Search uses semantic understanding - describe what you're looking for naturally
- Results are ranked by relevance using hybrid search (AI + keywords)
- Add filters like location, status, or type to narrow results
- For detailed contact info, use the contact ID shown in results

## Data Sources

- **Contacts**: 40K+ LinkedIn connections with strategic scoring
- **Projects**: 70+ ACT projects from Notion
- **Stories**: Community stories from Empathy Ledger

## API Access

This skill connects to the ACT Intelligence Platform API at `INTELLIGENCE_API_URL`.

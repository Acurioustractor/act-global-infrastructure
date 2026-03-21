---
name: implement
description: Skip planning, query schema, implement directly. Use when you want code not plans. Say "/implement [feature description]" to go straight to building.
---

# Implement Directly

No plans. No discovery phases. Build immediately.

## Rules

1. **Do NOT write a plan document.** Do NOT enter plan mode. Start coding.
2. **If you need schema**, query it — then start coding immediately:
   ```sql
   SELECT column_name, data_type FROM information_schema.columns
   WHERE table_name = '<relevant_table>' ORDER BY ordinal_position;
   ```
3. **If you need to understand existing code**, read 1-2 files — then start coding immediately.
4. **If unsure about ONE thing**, ask ONE question — then start coding immediately.
5. **Build in small increments**: implement → type-check → implement → type-check.
6. **Run `npx tsc --noEmit`** after each file change in the relevant app directory.

## Process

1. Read the user's feature description from the arguments
2. Identify the 1-3 files that need changing (read them)
3. If DB work: query schema first (see above)
4. Start writing code immediately
5. Type-check after each file
6. Report what was built when done

## Anti-Patterns (NEVER DO)

- Writing a plan file to `thoughts/shared/plans/`
- Entering plan mode
- Asking more than one clarifying question
- Reading more than 3 files before starting implementation
- Proposing multiple approaches and asking the user to choose

# Git Branching And Worktree Hygiene

This is the operating process for keeping the repo lean.

## Definitions

- Clean worktree: `git status --short` prints nothing.
- Dirty worktree: tracked files are modified, files are staged, or untracked files are visible.
- Ahead branch: local commits exist that have not been pushed.
- Behind branch: remote commits exist that are not local.
- Stale branch: merged or abandoned branch with no active owner.
- Worktree branch: branch checked out in another folder. Do not delete it until that worktree is closed.

## Branch Model

`main` is the only long-lived integration branch.

Short-lived branches should use:

- `codex/<task-slug>` for Codex/agent implementation work.
- `feature/<task-slug>` for human feature work.
- `fix/<bug-slug>` for bug fixes.
- `docs/<topic>` for documentation-only changes.
- `finance/<period-or-topic>` for finance/BAS/reporting work.
- `archive/<date>-<reason>` only when preserving old work before deletion.

Avoid new long-lived branches unless there is a named deployment environment that needs one.

## Start Of Work

1. Run `npm run repo:hygiene`.
2. If the worktree is dirty, either finish the existing task, commit it, or move to a fresh worktree.
3. Create a short-lived branch from updated `origin/main`.
4. Keep the branch scoped to one task.

## During Work

- Commit at task boundaries.
- Do not mix generated outputs, finance reports, and app code in the same commit unless they are part of the same deliverable.
- Do not add new work under `archive/`.
- Do not commit local caches, worktrees, virtualenvs, build outputs, or `.tsbuildinfo`.
- Run the narrowest relevant verification before committing.

## Before Push

1. Run `git status --short`.
2. Run `npm run repo:hygiene`.
3. Run the relevant typecheck/test/build.
4. Stage only the intended files.
5. Commit with a plain task-focused message.
6. Push the branch.

## Weekly Cleanup

1. Run `npm run repo:hygiene`.
2. Delete local branches already merged to `origin/main`.
3. Prune remote-tracking refs after remote branches are deleted.
4. Close unused worktrees.
5. Move unfinished local work into an explicit `wip/<topic>` branch or a named handoff in `thoughts/shared/handoffs/`.

## Cleanup Policy

Never use `git reset --hard`, `git checkout .`, `git restore .`, or recursive deletes to clean the repo unless the exact files and risk are understood.

For unknown changes:

- preserve first;
- classify second;
- delete only after the owner or context is clear.

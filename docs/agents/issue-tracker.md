# Issue Tracker: GitHub

Issues, PRDs, and implementation slices for this repo live in GitHub Issues for `Acurioustractor/act-global-infrastructure`. Use the `gh` CLI from inside this clone so the repository is inferred from `git remote -v`.

## Conventions

- Create an issue: `gh issue create --title "..." --body "..."`
- Read an issue: `gh issue view <number> --comments`
- List issues: `gh issue list --state open --json number,title,body,labels,comments`
- Comment on an issue: `gh issue comment <number> --body "..."`
- Apply or remove labels: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- Close an issue: `gh issue close <number> --comment "..."`

Use heredocs or temporary body files for multi-line issue bodies. Do not inline long Markdown bodies into a shell command.

## Skill Behavior

When a skill says "publish to the issue tracker", create a GitHub issue.

When a skill says "fetch the relevant ticket", run `gh issue view <number> --comments`.

When `/to-prd` creates a PRD, publish it as a GitHub issue and apply the `ready-for-agent` label unless the user says otherwise.

When `/to-issues` creates implementation slices, publish them in dependency order so blocked issues can reference real issue numbers.

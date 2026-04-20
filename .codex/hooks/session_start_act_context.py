#!/usr/bin/env python3

import json
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def get_git_status_counts() -> tuple[int, int]:
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return (0, 0)

    tracked = 0
    untracked = 0
    for line in result.stdout.splitlines():
        if line.startswith("??"):
            untracked += 1
        elif line.strip():
            tracked += 1
    return (tracked, untracked)


def main() -> None:
    payload = json.loads(sys.stdin.read() or "{}")
    source = payload.get("source", "startup")
    cwd = payload.get("cwd", str(REPO_ROOT))
    tracked, untracked = get_git_status_counts()

    lines = [
        "ACT workspace reminder: build new UI and API work in apps/command-center or apps/website; archive/ is read-only reference code.",
        "Before Supabase mutations or debugging, verify the connected project/ref and environment first; use psql for DDL after confirming the target.",
        f"Session source: {source}. Working directory: {cwd}.",
    ]

    if tracked or untracked:
        lines.append(
            f"Dirty worktree detected: {tracked} tracked changes and {untracked} untracked paths. Do not revert or overwrite unrelated work."
        )

    print(
        json.dumps(
            {
                "continue": True,
                "hookSpecificOutput": {
                    "hookEventName": "SessionStart",
                    "additionalContext": " ".join(lines),
                },
            }
        )
    )


if __name__ == "__main__":
    main()

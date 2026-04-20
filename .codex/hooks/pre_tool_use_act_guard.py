#!/usr/bin/env python3

import json
import re
import sys


ARCHIVE_PATH_RE = re.compile(r"(^|[\s'\"=])(?:\./)?archive/")
ARCHIVE_MUTATION_RE = re.compile(
    r"\b("
    r"rm|mv|touch|mkdir|rmdir|truncate|install|rsync|tee|dd|"
    r"git\s+add|git\s+rm|git\s+mv|"
    r"sed\s+-i|perl\s+-pi"
    r")\b"
)
ARCHIVE_REDIRECT_RE = re.compile(r"(?:^|[\s])(?:>|>>).*(?:\./)?archive/")
SUPABASE_RISK_RE = re.compile(r"\bsupabase\s+(?:db\s+(?:push|reset|remote\s+commit)|link)\b")
PROJECT_REF_RE = re.compile(r"--project-ref(?:=|\s+)\S+")
PSQL_RE = re.compile(r"\bpsql\b")
PSQL_FILE_INPUT_RE = re.compile(r"\b(?:-f|--file)(?:=|\s+)\S+")
PIPE_TO_PSQL_RE = re.compile(r"\|\s*psql\b")
PSQL_STDIN_RE = re.compile(r"\bpsql\b[\s\S]*?(?:<<|<\s*\S+)")
DDL_SQL_RE = re.compile(r"\b(?:create|alter|drop|truncate|refresh)\b", re.IGNORECASE)
DESTRUCTIVE_DDL_RE = re.compile(
    r"\b(?:drop\s+(?:table|schema|database|view|materialized\s+view|policy|function|extension|trigger|type)|truncate\s+table?)\b",
    re.IGNORECASE,
)
EXPLICIT_DB_TARGET_RE = re.compile(
    r"(?:postgres(?:ql)?://\S+|\$(?:DATABASE_URL|SUPABASE_DB_URL|MAIN_DB_URL|FARMHAND_DB_URL|POSTGRES_URL|POSTGRES_PRISMA_URL|DIRECT_URL|SUPABASE_CONNECTION_STRING)\b|\b(?:-d|--dbname)(?:=|\s+)\S+|(?:^|[\s;])(?:DATABASE_URL|SUPABASE_DB_URL|MAIN_DB_URL|FARMHAND_DB_URL|POSTGRES_URL|POSTGRES_PRISMA_URL|DIRECT_URL|SUPABASE_CONNECTION_STRING|PGDATABASE)=\S+)",
    re.IGNORECASE,
)
DESTRUCTIVE_DDL_ACK_RE = re.compile(r"(?:^|[\s;])ACT_ALLOW_DESTRUCTIVE_DDL=1(?:[\s;]|$)")


def should_block_archive_mutation(command: str) -> bool:
    return bool(
        ARCHIVE_PATH_RE.search(command)
        and (
            ARCHIVE_MUTATION_RE.search(command)
            or ARCHIVE_REDIRECT_RE.search(command)
            or re.search(r"\bcd\s+(?:\./)?archive(?:/|\b)", command)
        )
    )


def should_block_supabase_command(command: str) -> bool:
    return bool(SUPABASE_RISK_RE.search(command) and not PROJECT_REF_RE.search(command))


def is_psql_write_like(command: str) -> bool:
    return bool(
        DDL_SQL_RE.search(command)
        or PSQL_FILE_INPUT_RE.search(command)
        or PIPE_TO_PSQL_RE.search(command)
        or PSQL_STDIN_RE.search(command)
    )


def has_explicit_db_target(command: str) -> bool:
    return bool(EXPLICIT_DB_TARGET_RE.search(command))


def should_block_psql_targetless_write(command: str) -> bool:
    return bool(PSQL_RE.search(command) and is_psql_write_like(command) and not has_explicit_db_target(command))


def should_block_destructive_psql_ddl(command: str) -> bool:
    return bool(
        PSQL_RE.search(command)
        and DESTRUCTIVE_DDL_RE.search(command)
        and not DESTRUCTIVE_DDL_ACK_RE.search(command)
    )


def main() -> None:
    payload = json.loads(sys.stdin.read() or "{}")
    command = payload.get("tool_input", {}).get("command", "")

    if should_block_archive_mutation(command):
        print(
            "Blocked: archive/ is read-only in this ACT repo. Use archive/ only as reference and make changes in apps/, packages/, scripts/, or docs/ instead.",
            file=sys.stderr,
        )
        raise SystemExit(2)

    if should_block_supabase_command(command):
        print(
            "Blocked: Supabase link/push/reset commands in this repo must include an explicit --project-ref after you verify the target project. Use psql for DDL once the target is confirmed.",
            file=sys.stderr,
        )
        raise SystemExit(2)

    if should_block_psql_targetless_write(command):
        print(
            "Blocked: psql write/DDL commands in this ACT repo must name the target database explicitly via $DATABASE_URL, $SUPABASE_DB_URL, --dbname, or a postgres URI after you verify the destination project/ref.",
            file=sys.stderr,
        )
        raise SystemExit(2)

    if should_block_destructive_psql_ddl(command):
        print(
            "Blocked: destructive DDL via psql requires an explicit target and a one-shot ACT_ALLOW_DESTRUCTIVE_DDL=1 prefix after you confirm the destination. Example: ACT_ALLOW_DESTRUCTIVE_DDL=1 psql \"$DATABASE_URL\" -c 'DROP TABLE ...'",
            file=sys.stderr,
        )
        raise SystemExit(2)


if __name__ == "__main__":
    main()

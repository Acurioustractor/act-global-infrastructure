#!/usr/bin/env python3
"""Regenerate project-codes.ts from the canonical config/project-codes.json.

Run from the repo root:  python3 supabase/functions/intake/regenerate-project-codes.py

The intake function validates every incoming projectCode against this map and returns
400 on an unknown one. Keep it generated — hand-editing it is how the registry and the
runtime drift apart, which is the ACT-BV/ACT-FM bug class.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[3]
SRC = ROOT / "config" / "project-codes.json"
DST = ROOT / "supabase" / "functions" / "intake" / "project-codes.ts"

# comms slugs pinned to a live list today; everything else derives from the code.
PINNED = {
    "ACT-IN": "act", "ACT-HV": "harvest", "ACT-FM": "farm", "ACT-AS": "art",
    "ACT-EL": "empathy-ledger", "ACT-JH": "justicehub", "ACT-GD": "goods",
}

data = json.loads(SRC.read_text())
codes = data.get("codes") or data.get("projects") or data
if not isinstance(codes, dict):
    raise SystemExit(f"unexpected shape in {SRC}")

entries = []
for code, v in codes.items():
    name = v.get("name") if isinstance(v, dict) else str(v)
    slug = PINNED.get(code, code.replace("ACT-", "").lower())
    entries.append(f"  ['{code}', {{ name: {json.dumps(name)}, commsSlug: '{slug}' }}],")

DST.write_text(f"""// GENERATED FILE — do not edit by hand.
// Source: act-global-infrastructure/config/project-codes.json
// Regenerate: supabase/functions/intake/regenerate-project-codes.py
//
// The canonical project registry, {len(codes)} codes. An intake submission carrying a
// projectCode absent from this map is rejected with 400 — it is never silently seated
// into a default project. That silent fallback (route.ts:289 in act-regenerative-studio)
// is what turned correct ACT-FM farm-stay submissions into project:act-in with the
// wrong comms list.
//
// commsSlug is pinned for the seven projects that have a live comms list today and
// derived from the code for the rest; a derived slug never reaches GHL because only
// the newsletter form type writes a comms: tag, and that only in the commerce lane.

export interface ProjectEntry {{
  name: string;
  commsSlug: string;
}}

export const PROJECT_CODES: ReadonlyMap<string, ProjectEntry> = new Map<string, ProjectEntry>([
{chr(10).join(entries)}
]);

/** The namespaced CRM tag for a project. Never a flat tag. */
export function projectTag(code: string): string {{
  return `project:${{code.trim().toLowerCase()}}`;
}}

export function isKnownProjectCode(code: string): boolean {{
  return PROJECT_CODES.has((code ?? '').trim().toUpperCase());
}}
""")
print(f"wrote {DST.relative_to(ROOT)} with {len(codes)} codes")

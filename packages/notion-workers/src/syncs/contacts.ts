/**
 * Contacts sync — mirrors v_canonical_contacts from Supabase into a Notion database.
 *
 * Phase 1 of wiki/decisions/2026-05-14-notion-platform-architecture.md
 *
 * SDK constraints: installed @notionhq/workers is 0.0.85.
 *  - Schema is declared inline on the sync (no separate `worker.database()`)
 *  - No `worker.pacer()` — manual rate-limiting if needed (dataset is small enough that
 *    one paged pass per run finishes well within burst limits)
 *  - "manual" schedule isn't supported; we use mode:"replace" + hourly schedule so each
 *    run does mark-and-sweep against the full dataset. Deletes propagate automatically.
 *
 * Cultural-sensitivity columns from ghl_contacts are deliberately NOT mirrored:
 *   elder_consent, sacred_knowledge*, cultural_nation_details, ocap_*,
 *   detailed_consent_history, elder_review_notes.
 *
 * Reuses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY worker secrets already configured.
 */

import type { Worker } from "@notionhq/workers";
import * as Builder from "@notionhq/workers/builder";
import * as Schema from "@notionhq/workers/schema";

const SELECT_COLS = [
  "ghl_id",
  "full_name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "company_name",
  "tags",
  "projects",
  "last_contact_date",
  "newsletter_consent",
  "is_storyteller",
  "is_elder",
  "empathy_ledger_id",
  "canonical_entity_id",
  "xero_contact_id",
  "updated_at",
].join(",");

type ContactRow = {
  ghl_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  tags: string[] | null;
  projects: string[] | null;
  last_contact_date: string | null;
  newsletter_consent: boolean | null;
  is_storyteller: boolean | null;
  is_elder: boolean | null;
  empathy_ledger_id: string | null;
  canonical_entity_id: string | null;
  xero_contact_id: string | null;
  updated_at: string | null;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function fetchPage(offset: number, limit: number): Promise<ContactRow[]> {
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const url = new URL(
    `${requireEnv("SUPABASE_URL")}/rest/v1/v_canonical_contacts`,
  );
  url.searchParams.set("select", SELECT_COLS);
  url.searchParams.set("order", "ghl_id.asc");
  const r = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Range: `${offset}-${offset + limit - 1}`,
    },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return (await r.json()) as ContactRow[];
}

function bestName(r: ContactRow): string {
  const full = (r.full_name || "").trim();
  if (full) return full;
  const joined = `${r.first_name || ""} ${r.last_name || ""}`.trim();
  if (joined) return joined;
  return r.email || r.ghl_id;
}

function toChange(r: ContactRow) {
  return {
    type: "upsert" as const,
    key: r.ghl_id,
    properties: {
      Name: Builder.title(bestName(r)),
      "GHL ID": Builder.richText(r.ghl_id),
      Email: Builder.richText(r.email || ""),
      Phone: Builder.richText(r.phone || ""),
      Company: Builder.richText(r.company_name || ""),
      Projects: Builder.richText(
        (r.projects || []).filter((p) => p && p.startsWith("ACT-")).join(", "),
      ),
      Tags: Builder.richText((r.tags || []).join(", ")),
      "Last Contact": r.last_contact_date
        ? Builder.date(r.last_contact_date)
        : Builder.date(""),
      "Newsletter Consent": Builder.checkbox(!!r.newsletter_consent),
      Storyteller: Builder.checkbox(!!r.is_storyteller),
      Elder: Builder.checkbox(!!r.is_elder),
      "EL Profile ID": Builder.richText(r.empathy_ledger_id || ""),
      "Xero Contact ID": Builder.richText(r.xero_contact_id || ""),
      "Canonical Entity": Builder.richText(r.canonical_entity_id || ""),
      "Last Synced": Builder.date(new Date().toISOString()),
    },
  };
}

export function registerContactsSync(worker: Worker) {
  worker.sync("contacts", {
    primaryKeyProperty: "GHL ID",
    schema: {
      defaultName: "ACT Contacts (canonical)",
      properties: {
        Name: Schema.title(),
        "GHL ID": Schema.richText(),
        Email: Schema.richText(),
        Phone: Schema.richText(),
        Company: Schema.richText(),
        Projects: Schema.richText(),
        Tags: Schema.richText(),
        "Last Contact": Schema.date(),
        "Newsletter Consent": Schema.checkbox(),
        Storyteller: Schema.checkbox(),
        Elder: Schema.checkbox(),
        "EL Profile ID": Schema.richText(),
        "Xero Contact ID": Schema.richText(),
        "Canonical Entity": Schema.richText(),
        "Last Synced": Schema.date(),
      },
    },
    // Hourly full-dataset refresh. With ~2,079 rows / 500 per page = 5 pages per run,
    // and a single Supabase view query each. Pages chunk via hasMore + nextState.
    mode: "replace",
    schedule: "1h",
    execute: async (state: { offset?: number } | undefined) => {
      const PAGE = 500;
      const offset = state?.offset ?? 0;
      const rows = await fetchPage(offset, PAGE);
      const hasMore = rows.length === PAGE;
      return {
        changes: rows.map(toChange),
        hasMore,
        nextState: hasMore ? { offset: offset + PAGE } : undefined,
      };
    },
  });
}

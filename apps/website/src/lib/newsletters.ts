import "server-only";
import { getSupabaseServerClient } from "./supabase/server";

export type BrandEdition = {
  editionSlug: string;
  subject: string;
  editionPeriod: string | null;
  sentAt: string | null;
  bodyMd: string;
};

type DraftRow = {
  edition_slug: string;
  selected_subject: string | null;
  subject_candidates: string[] | null;
  edition_period: string | null;
  sent_at: string | null;
  body_md: string | null;
};

const COLUMNS =
  "edition_slug, selected_subject, subject_candidates, edition_period, sent_at, body_md";

function toEdition(row: DraftRow): BrandEdition {
  const subject =
    row.selected_subject ||
    (row.subject_candidates && row.subject_candidates[0]) ||
    row.edition_period ||
    "ACT newsletter";
  return {
    editionSlug: row.edition_slug,
    subject,
    editionPeriod: row.edition_period ?? null,
    sentAt: row.sent_at ?? null,
    bodyMd: row.body_md || "",
  };
}

// Sent brand editions only — funder/partner editions are private and never archived.
export async function fetchSentBrandEditions(limit = 60): Promise<BrandEdition[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("newsletter_drafts")
    .select(COLUMNS)
    .eq("audience", "brand")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(limit);
  if (error || !data) {
    if (error) console.error("Failed to fetch brand editions:", error.message);
    return [];
  }
  return (data as DraftRow[]).map(toEdition);
}

export async function fetchBrandEditionBySlug(slug: string): Promise<BrandEdition | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("newsletter_drafts")
    .select(COLUMNS)
    .eq("audience", "brand")
    .eq("status", "sent")
    .eq("edition_slug", slug)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("Failed to fetch brand edition:", error.message);
    return null;
  }
  return toEdition(data as DraftRow);
}

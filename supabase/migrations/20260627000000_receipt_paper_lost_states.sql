-- Receipt acquittal Phase 2 — paper_on_file / lost terminal states.
--
-- Adds two human terminal decisions on bank_statement_lines.receipt_match_status:
--   'paper_on_file' — Ben physically holds the receipt; GST still claimable (tax invoice
--                     exists offline). Suppressed from the chase; not nagged.
--   'lost'          — no receipt exists/recoverable; GST credit forfeited. Suppressed,
--                     tracked for the "GST lost to missing receipts" total.
--
-- There is NO check constraint on receipt_match_status (verified 2026-06-27), so no
-- constraint change is needed — only the evidence view's status mapping.
--
-- The ONLY change to v_finance_bank_line_evidence is two new WHEN branches in the
-- evidence_status CASE (the rest is copied verbatim from pg_get_viewdef). Ordering:
-- an APPROVED digital link still supersedes a paper/lost mark (better evidence wins);
-- below that, paper/lost are terminal and suppress candidate re-surfacing.
--
-- Reversible: re-running the prior view definition (drop the two WHEN lines) restores it.
-- A line is un-marked by setting receipt_match_status back to 'unmatched'.

CREATE OR REPLACE VIEW public.v_finance_bank_line_evidence AS
 WITH candidate_rollup AS (
         SELECT links.bank_line_id,
            count(*) FILTER (WHERE links.link_status = ANY (ARRAY['candidate'::text, 'approved'::text, 'linked_in_xero'::text, 'needs_review'::text]))::integer AS candidate_count,
            max(links.confidence) FILTER (WHERE links.link_status = ANY (ARRAY['candidate'::text, 'approved'::text, 'linked_in_xero'::text, 'needs_review'::text])) AS best_confidence,
            (array_agg(docs.id ORDER BY links.confidence DESC NULLS LAST, links.created_at DESC) FILTER (WHERE links.link_status = ANY (ARRAY['candidate'::text, 'approved'::text, 'linked_in_xero'::text, 'needs_review'::text])))[1] AS best_document_id,
            (array_agg(docs.source ORDER BY links.confidence DESC NULLS LAST, links.created_at DESC) FILTER (WHERE links.link_status = ANY (ARRAY['candidate'::text, 'approved'::text, 'linked_in_xero'::text, 'needs_review'::text])))[1] AS best_source,
            (array_agg(docs.vendor_name ORDER BY links.confidence DESC NULLS LAST, links.created_at DESC) FILTER (WHERE links.link_status = ANY (ARRAY['candidate'::text, 'approved'::text, 'linked_in_xero'::text, 'needs_review'::text])))[1] AS best_vendor_name,
            bool_or(links.link_status = ANY (ARRAY['approved'::text, 'linked_in_xero'::text])) AS has_approved_link,
            jsonb_agg(jsonb_build_object('link_id', links.id, 'document_id', docs.id, 'source', docs.source, 'source_record_id', docs.source_record_id, 'source_table', docs.source_table, 'vendor_name', docs.vendor_name, 'document_number', docs.document_number, 'document_date', docs.document_date, 'received_at', docs.received_at, 'amount_total', docs.amount_total, 'tax_amount', docs.tax_amount, 'currency_code', docs.currency_code, 'attachment_url', docs.attachment_url, 'attachment_storage_path', docs.attachment_storage_path, 'attachment_filename', docs.attachment_filename, 'attachment_content_type', docs.attachment_content_type, 'xero_bank_transaction_id', docs.xero_bank_transaction_id, 'xero_invoice_id', docs.xero_invoice_id, 'status', docs.status, 'link_status', links.link_status, 'match_method', links.match_method, 'confidence', links.confidence, 'rank', links.rank, 'is_best_candidate', links.is_best_candidate, 'vendor_score', links.vendor_score, 'amount_score', links.amount_score, 'date_score', links.date_score, 'amount_delta', links.amount_delta, 'date_delta_days', links.date_delta_days, 'xero_action', links.xero_action, 'review_owner', links.review_owner, 'review_note', links.review_note, 'provenance', links.provenance) ORDER BY links.confidence DESC NULLS LAST, links.rank, links.created_at DESC) FILTER (WHERE links.link_status = ANY (ARRAY['candidate'::text, 'approved'::text, 'linked_in_xero'::text, 'needs_review'::text])) AS receipt_candidates
           FROM finance_receipt_bank_line_links links
             JOIN finance_receipt_documents docs ON docs.id = links.receipt_document_id
          GROUP BY links.bank_line_id
        )
 SELECT bsl.id,
    bsl.date,
    bsl.type,
    bsl.payee,
    bsl.particulars,
    bsl.reference,
    bsl.analysis_code,
    bsl.amount,
    bsl.direction,
    bsl.source,
    bsl.status,
    bsl.bank_account,
    bsl.card_last4,
    bsl.matched_xero_transaction_id,
    bsl.matched_receipt_email_id,
    bsl.project_code,
    bsl.project_source,
    bsl.rd_eligible,
    bsl.notes,
    bsl.receipt_match_id,
    bsl.receipt_match_score,
    bsl.receipt_match_status,
    bsl.xero_transaction_id,
    bsl.xero_tenant_id,
    bsl.lane,
    bsl.lcaa_phase,
    COALESCE(cr.candidate_count, 0) AS candidate_count,
    cr.best_confidence,
    cr.best_document_id,
    cr.best_source,
    cr.best_vendor_name,
    COALESCE(cr.has_approved_link, false) AS has_approved_link,
    COALESCE(cr.receipt_candidates, '[]'::jsonb) AS receipt_candidates,
        CASE
            WHEN bsl.receipt_match_status = 'no_receipt_needed'::text THEN 'no_receipt_needed'::text
            WHEN bsl.receipt_match_status = 'matched'::text THEN 'covered_legacy'::text
            WHEN COALESCE(cr.has_approved_link, false) THEN 'covered_evidence'::text
            WHEN bsl.receipt_match_status = 'paper_on_file'::text THEN 'paper_on_file'::text
            WHEN bsl.receipt_match_status = 'lost'::text THEN 'lost'::text
            WHEN COALESCE(cr.best_confidence, 0::numeric) >= 0.85 THEN 'high_confidence_candidate'::text
            WHEN COALESCE(cr.candidate_count, 0) > 0 THEN 'candidate'::text
            ELSE 'uncovered'::text
        END AS evidence_status
   FROM bank_statement_lines bsl
     LEFT JOIN candidate_rollup cr ON cr.bank_line_id = bsl.id;

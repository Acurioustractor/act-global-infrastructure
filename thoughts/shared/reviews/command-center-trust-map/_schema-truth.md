# Command Center — Schema Ground Truth (verified 2026-05-26)

> Audit reference. All facts below were queried directly against the **shared operational DB**
> `tednluwflfhxyucgwigh` (the one the command-center uses by default via `lib/supabase.ts`).
> Use this to assign verdicts. **Do not re-query what is already answered here.**

## ⚠️ Multi-instance caveat (avoid false "broken" flags)
There are **3 Supabase instances**:
- **Shared** `tednluwflfhxyucgwigh` — command-center default (`lib/supabase.ts`, `supabaseAdmin`). All facts below are from here.
- **EL v2** `yvnuayzslukamizrlhwb` — Empathy Ledger storyteller content. Some storyteller/compendium routes use a **different client** (check the route's import + env var, e.g. a separate `createClient` with `EL_*`/`STORYTELLER_*` URL). If a route reads `storyteller_master_analysis` etc. via the EL client, it is NOT broken — it's a different DB. Flag as ⚠️ verify-instance, don't auto-mark 🔴.
- **Media** `uaxhjzqrdotoahjnxmbj` — public image storage only.

## 🔴 DEAD TABLES — referenced in code but DO NOT EXIST in shared DB (41 of 168, 24%)
Any route whose data depends on one of these returns empty → silent zeros/fallbacks → **🔴 broken** (unless it queries via the EL v2 client — see caveat for the storyteller one).

```
agent_autonomy_transitions, agent_confidence_calibration, agent_insights, agent_learnings,
agent_mistake_patterns, agent_working_memory, asset_maintenance, assets, business_initiatives,
communications, compliance_items, contacts, debt_payments, debt_scenarios, debts, deployments,
donations, financial_variance_notes, gmail_sync_state, grant_financial_tracking, health_checks,
insight_votes, lodgings, memory_consolidation_log, notification_rate_limits, notion_agent_trials,
opportunity_stage_history, procedural_memory, project_impact_analysis, properties,
receipt_gamification_stats, repo_contacts, revenue_stream_entries, seasonal_demand,
storyteller_master_analysis, subscription_alerts, telegram_pending_actions, tracked_documents,
v_cashflow_explained, v_notion_agent_reliability, v_upcoming_renewals
```

Notable: `communications` is dead but `communications_history` (27,186 rows, fresh) is the real table — code mixes both. `contacts` is dead; the real contact store is `ghl_contacts`. `assets` dead; `donations` dead; whole `agent_*` memory layer dead; `debts*` dead; `compliance_items` dead.

## 🟢 EXISTING tables — real column lists (for column-drift detection)
A reference to a column NOT in this list (for these tables) = **🔴 broken** (silent zero / query error).

- **xero_transactions** (3,674 rows): `id, xero_transaction_id, type, contact_name, bank_account, project_code, total, status, date, line_items, synced_at, created_at, has_attachments, updated_at, project_code_source, is_reconciled, entity_code, rd_eligible, rd_category, xero_tenant_id`
  - ⚠️ **SIGN BUG**: all SPEND rows store `total` as **positive**. Expense logic using `total<0` returns $0. Compute by `type`: income=`RECEIVE`, expense=`SPEND`/`SPEND-OVERPAYMENT`; exclude `%-TRANSFER` (real types are `SPEND-TRANSFER`/`RECEIVE-TRANSFER`, NOT `TRANSFER`).
- **xero_invoices** (2,216 rows): `id, xero_id, tenant_id, invoice_number, type, status, contact_id, contact_name, date, due_date, total, subtotal, total_tax, amount_due, amount_paid, currency_code, line_items, has_attachments, reference, url, created_at, updated_at, synced_at, invoice_type, tracking_category_1, tracking_option_1, tracking_category_2, tracking_option_2, contact_xero_id, project_code, fully_paid_date, metadata, project_code_source, entity_code, income_type, xero_tenant_id`
  - Use `type` (ACCREC/ACCPAY), NOT `invoice_type`. PK is `xero_id`.
- **xero_bank_accounts** (count n/a): `id, xero_id, name, code, type, bank_account_number, currency_code, status, current_balance, balance_updated_at, updated_at, created_at`
  - Real cash = sum `current_balance` for **NAB Visa #8815 + ACT Everyday only** (two-account rule). Exclude NM Personal + ACT Maximiser.
- **xero_payments**: `id, xero_payment_id, payment_type, status, invoice_xero_id, invoice_number, account_id, account_name, bank_account_code, bank_account_name, date, amount, currency_code, reference, is_reconciled, has_account, has_validation_errors, bank_amount, raw_payload, synced_at, updated_at`
- **projects** (81 rows): `id, code, name, description, category, tier, importance_weight, status, priority, leads, notion_page_id, notion_pages, ghl_tags, xero_tracking, dext_category, alma_program, lcaa_themes, cultural_protocols, parent_project, metadata, created_at, updated_at, organization_id, act_project_code, external_references, cover_image_url`
- **project_health** (46 rows — only 46 of 81 projects scored): `id, project_code, project_name, overall_score, momentum_score, engagement_score, financial_score, timeline_score, health_status, metrics, alerts, calculated_at, calculation_version, created_at, updated_at`
  - ⚠️ Score column is `overall_score`, NOT `health_score`.
- **project_monthly_financials** (205 rows): `id, project_code, month, revenue, expenses, net, revenue_breakdown, expense_breakdown, fy_ytd_revenue, fy_ytd_expenses, fy_ytd_net, transaction_count, unmapped_count, created_at, updated_at`
- **project_budgets**: `id, project_code, fy_year, month, budget_amount, budget_type, notes, created_at, updated_at, entity_code`
- **opportunities_unified** (15,549 rows — grant-noise polluted): `id, opportunity_type, source_system, source_id, title, description, contact_name, value_low, value_mid, value_high, value_type, stage, probability, project_codes, contact_ids, effort_hours, expected_close, actual_close, url, notes, metadata, created_at, updated_at`
  - ⚠️ NO `value`/`status`/`confidence`/`project_code` columns. Use `value_mid`/`value_high`, `stage`, `probability`, `project_codes` (array).
- **ghl_contacts** (2,276 rows): `id, ghl_id, ghl_location_id, first_name, last_name, full_name, email, phone, company_name, tags, custom_fields, projects, engagement_status, first_contact_date, last_contact_date, ghl_created_at, ghl_updated_at, last_synced_at, sync_status, sync_error, created_at, updated_at, stories_count, published_stories, is_storyteller, is_elder, empathy_ledger_id, el_last_synced_at, auto_created, auto_created_from, first_seen_subject, enrichment_status, source, newsletter_consent, newsletter_consent_at, newsletter_unsubscribed_at, website, canonical_entity_id, xero_contact_id, xero_match_method, xero_matched_at, canonical_contact_id`
- **ghl_opportunities** (500 rows — ⚠️ suspiciously round, possible API page-cap not true count): `id, ghl_id, ghl_contact_id, ghl_pipeline_id, ghl_stage_id, name, pipeline_name, stage_name, status, monetary_value, custom_fields, assigned_to, ghl_created_at, ghl_updated_at, last_synced_at, created_at, updated_at, project_code, xero_invoice_id, received_date, acquittal_due_date, acquittal_status, pile, last_stage_change_at, last_status_change_at`
- **ghl_pipelines**: `id, ghl_id, ghl_location_id, name, stages, last_synced_at, created_at, updated_at`
- **calendar_events** (2,748 rows): `id, google_event_id, google_calendar_id, calendar_name, calendar_color, title, description, start_time, end_time, location, attendees, organizer_email, is_all_day, recurrence_rule, recurring_event_id, status, transparency, visibility, event_type, project_code, detected_project_code, manual_project_code, ghl_contact_ids, attendee_contact_matches, metadata, html_link, etag, synced_at, sync_source, created_at, updated_at, tags`
  - ⚠️ Count-everything bug: filter `status!='cancelled'`, drop `is_all_day`/`transparency='transparent'`, scope work calendars, dedupe recurring.
- **communications_history** (27,186 rows, fresh): `id, ghl_contact_id, channel, direction, from_identity, to_identities, subject, content_preview, full_content_ref, summary, sentiment, topics, action_items, key_decisions, waiting_for_response, response_needed_by, follow_up_date, source_system, source_id, source_thread_id, parent_id, occurred_at, synced_at, enriched_at, created_at, updated_at, contact_email, contact_name, is_reply, has_reply, requires_response, response_received_at, project_code, metadata, project_codes, ai_project_confidence, intelligence_version, outreach_reason, outreach_campaign, dismissed_at, dismissed_reason`
- **receipt_matches** (2,763 rows): `id, source_type, source_id, vendor_name, amount, transaction_date, category, description, status, suggested_email_id, suggested_email_subject, suggested_email_from, suggested_email_date, match_confidence, match_reasons, resolved_at, resolved_by, resolution_notes, week_start, deferred_count, points_awarded, quick_resolve, created_at, updated_at`
- **relationship_health** (1,140 rows): `id, ghl_contact_id, temperature, last_temperature_change, temperature_trend, lcaa_stage, lcaa_stage_confidence, total_touchpoints, inbound_count, outbound_count, avg_response_time_hours, last_inbound_at, last_outbound_at, last_contact_at, days_since_contact, overall_sentiment, sentiment_history, relationship_summary, suggested_actions, risk_flags, calculated_at, created_at, updated_at, email_score, calendar_score, financial_score, pipeline_score, knowledge_score, signal_breakdown, next_meeting_date, open_invoice_amount, snoozed_until`
- **grant_opportunities** (24,977 rows): `id, name, description, amount_min, amount_max, deadline, source, relevance_score, application_status, url, requirements, metadata, created_at, updated_at, provider, program, aligned_projects, categories, focus_areas, fit_score, discovered_by, closes_at, feedback, eligibility_criteria, assessment_criteria, timeline_stages, funder_info, grant_structure, ghl_opportunity_id, requirements_summary, act_readiness, enriched_at, enrichment_source, sources, discovery_method, last_verified_at, grant_type, embedding, embedding_model, embedded_at, target_recipients, foundation_id, program_type, last_deadline_alert_at, geography, source_id, status, pipeline_stage, pile, provider_org_id, goods_relevance_score, goods_relevance_signals, goods_relevance_scored_at, dgr_required, accepts_sole_trader, accepts_pty_ltd, accepts_charity, accepts_unincorporated, eligibility_signals_at`
- **grant_applications**: `id, opportunity_id, application_name, amount_requested, status, started_at, submitted_at, outcome_at, milestones, documents, lead_contact, team_members, outcome_amount, outcome_notes, project_code, notes, created_at, updated_at, ghl_opportunity_id, auto_created, assigned_to, priority, estimated_effort`
- **fundraising_pipeline** (14 rows, ⚠️ STALE since 2026-03-06): `id, name, funder, type, amount, status, probability, expected_date, actual_date, project_codes, stream_id, contact_id, requirements, deadline, notes, created_at, updated_at`
- **revenue_streams**: `id, name, code, category, description, project_codes, status, target_monthly, color, icon, created_at, updated_at`
- **foundations**: `id, acnc_abn, name, type, website, description, total_giving_annual, giving_history, avg_grant_size, grant_range_min, grant_range_max, thematic_focus, geographic_focus, target_recipients, endowment_size, investment_returns, giving_ratio, revenue_sources, parent_company, asx_code, open_programs, acnc_data, last_scraped_at, profile_confidence, created_at, updated_at, giving_philosophy, wealth_source, application_tips, notable_grants, board_members, scraped_urls, enrichment_source, enriched_at, embedding, embedded_at, gs_entity_id, has_dgr, dgr_endorsed_at, abr_entity_type, abr_status, metadata`
- **project_knowledge** (672 rows, fresh): `id, project_code, project_name, knowledge_type, title, content, source_type, source_ref, source_url, voice_note_id, communication_id, recorded_by, recorded_at, participants, contact_ids, summary, topics, sentiment, importance, action_required, action_items, follow_up_date, decision_status, decision_rationale, embedding, created_at, updated_at, metadata, access_count, last_accessed_at, decay_score, consolidation_source_ids, provenance, validation_count, contradiction_count, superseded_by, status, public, published_at, transcript, ai_summary, ai_action_items, meeting_duration_minutes, transcription_status`
- **subscriptions** (68 rows): `id, vendor_name, vendor_email, account_email, account_status, billing_cycle, amount, currency, next_billing_date, category, purpose, project_codes, is_essential, review_status, receipt_automation, dext_supplier_rule, xero_bank_rule, notes, created_at, updated_at, current_login_email, login_url, migration_notes, migrated_at, xero_repeating_invoice_id, discovery_source, discovery_confidence, last_discovery_check, expected_amount, last_payment_date, consecutive_missed_payments, payment_method, entity_code`
- **intelligence_insights** (23 rows): `id, insight_type, title, description, priority, status, data, source_type, source_id, dedup_key, acted_at, dismissed_at, expires_at, created_at, updated_at`

## ⏱ FRESHNESS MAP (today = 2026-05-26)
| Table | Rows | Last updated | Verdict |
|---|---|---|---|
| xero_transactions | 3,674 | 2026-05-26 | 🟢 fresh |
| xero_invoices | 2,216 | 2026-05-26 | 🟢 fresh |
| ghl_contacts | 2,276 | 2026-05-26 | 🟢 fresh |
| ghl_opportunities | 500 | 2026-05-26 | 🟢 fresh but ⚠️ 500-row cap suspect |
| calendar_events | 2,748 | 2026-05-26 | 🟢 fresh |
| communications_history | 27,186 | 2026-05-25 | 🟢 fresh |
| grant_opportunities | 24,977 | 2026-05-26 | 🟢 fresh (grant noise) |
| opportunities_unified | 15,549 | 2026-05-25 | 🟢 fresh (grant noise) |
| project_knowledge | 672 | 2026-05-26 | 🟢 fresh |
| project_health | 46 | 2026-05-25 | 🟢 fresh (but only 46/81 projects) |
| project_monthly_financials | 205 | 2026-05-23 | 🟢 fresh |
| subscriptions | 68 | 2026-05-24 | 🟢 fresh |
| intelligence_insights | 23 | 2026-05-22 | 🟡 4d, low volume |
| financial_snapshots | 17 | 2026-05-06 | 🟡 STALE 20d, 17 rows |
| relationship_health | 1,140 | 2026-04-29 | 🔴 STALE 27d — Supporters/Relationships layer frozen |
| storytellers | 226 | 2026-04-15 | 🔴 STALE 41d |
| fundraising_pipeline | 14 | 2026-03-06 | 🔴 ABANDONED 2.5mo — superseded by opportunities_unified |

## Verdict legend (use these exactly)
- 🟢 **real** — exists, fresh, correct lineage, plausible numbers
- 🟡 **stale** — correct lineage but the feeding pipeline has lagged; note last-updated
- 🟠 **misleading** — runs without error but the logic mis-scopes/over-counts (transfers as revenue, all-entity sums, unfiltered calendar)
- 🔴 **broken** — queries a dead table or non-existent column → silent zero / fallback / error
- ⚫ **not-wired** — UI placeholder / hardcoded constant / TODO; never reads live data
- ⚠️ **unverified** — couldn't determine (e.g. EL-instance question); state the reason, don't guess

-- act_intake: the outbox every ACT intake path lands in before any network call.
--
-- Design source: thoughts/shared/ghl/2026-08-29-ghl-front-door-brief.md §4 (act-regenerative-studio).
-- Schema modelled on the one intake path with a perfect delivery record,
-- cwsyhpiuepvdjtxaozwf.contact_submissions, plus the routing columns.
--
-- Two properties this table exists to hold:
--   1. The row is written BEFORE GHL is called, so a GHL outage loses nothing.
--   2. `lane` is computed server-side and is never read from the request body.
--      A submission whose (project_code, form_type) pair is not on the explicit
--      allowlist resolves to duty_of_care and never reaches GHL at all.
--
-- Deliberately absent: human_status, assigned_to. "Answered" is derived from GHL
-- recording an outbound message dated after the inbound. Any field a person has to
-- maintain by hand rots inside a month.

create table if not exists public.act_intake (
  id                uuid primary key default gen_random_uuid(),
  idempotency_key   text        not null unique,
  site              text        not null,
  project_code      text        not null,
  form_type         text        not null,
  lane              text        not null,
  submitter_email   text,
  submitter_name    text,
  subject           text,
  payload           jsonb       not null,
  ghl_status        text        not null default 'pending',
  ghl_contact_id    text,
  inbox_status      text,
  attempts          int         not null default 0,
  last_attempt_at   timestamptz,
  delivered_at      timestamptz,
  last_error        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint act_intake_lane_check
    check (lane in ('commerce', 'transactional', 'community', 'duty_of_care')),
  constraint act_intake_ghl_status_check
    check (ghl_status in ('pending', 'delivered', 'failed', 'spam', 'excluded_by_lane')),
  constraint act_intake_inbox_status_check
    check (inbox_status is null or inbox_status in ('pending', 'delivered', 'failed')),

  -- A duty_of_care row must never carry a GHL contact id. This is the guard that
  -- makes the exclusion structural rather than conventional: if a future code path
  -- ever tries to write one, the insert fails loudly instead of quietly seating a
  -- storyteller or a clinical referral in the CRM.
  constraint act_intake_duty_of_care_never_reaches_ghl
    check (lane <> 'duty_of_care' or (ghl_contact_id is null and ghl_status = 'excluded_by_lane'))
);

-- The retry job's working set: pending rows under the attempt ceiling, oldest first.
create index if not exists act_intake_retry_idx
  on public.act_intake (created_at)
  where ghl_status = 'pending';

-- The digest's working set.
create index if not exists act_intake_status_created_idx
  on public.act_intake (ghl_status, created_at desc);

create index if not exists act_intake_lane_created_idx
  on public.act_intake (lane, created_at desc);

create index if not exists act_intake_email_idx
  on public.act_intake (lower(submitter_email))
  where submitter_email is not null;

create or replace function public.act_intake_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists act_intake_touch_updated_at on public.act_intake;
create trigger act_intake_touch_updated_at
  before update on public.act_intake
  for each row execute function public.act_intake_touch_updated_at();

-- RLS: service_role only, and it is on with no permissive policy rather than off.
--
-- Stated explicitly because the sibling Goods project had `ALL to authenticated
-- USING(true)` on its intake table, which meant any signed-in account of any kind
-- could read every submission. This table holds duty-of-care rows: storyteller
-- approaches, June's Patch clinical referrals, Goods QR support requests. There is
-- no anon or authenticated read path to it by design. Service role bypasses RLS,
-- so the edge function and the retry job are unaffected.
alter table public.act_intake enable row level security;

revoke all on table public.act_intake from anon, authenticated;

comment on table  public.act_intake is
  'Outbox for every ACT intake path. Row is written before any GHL call. lane is computed server-side, default-deny; a duty_of_care row never reaches GHL.';
comment on column public.act_intake.lane is
  'commerce | transactional | community | duty_of_care. Computed from (project_code, form_type) against an explicit allowlist. NEVER read from the request body.';
comment on column public.act_intake.idempotency_key is
  'sha256(site|form_type|lower(email||phone)|YYYY-MM-DD) unless supplied. Catches the duplicate submission, not the duplicate person — GHL contact dedup handles the latter.';
comment on column public.act_intake.ghl_status is
  'pending | delivered | failed | spam | excluded_by_lane. Spam rows are kept, never deleted, so the gate stays reviewable in one SELECT.';


-- ---------------------------------------------------------------------------------
-- act_duty_of_care_register
--
-- Where an excluded submission actually goes. This is the whole point of the lane: a
-- storyteller approach, a June's Patch clinical referral, a Goods QR support request
-- and an Elder writing about a bed all land here and NOWHERE in the CRM.
--
-- Kept separate from act_intake rather than being a view over it, because the access
-- rules differ: the intake outbox is operational plumbing, this is a register of
-- people we owe something to, and the two should not share a grant.
create table if not exists public.act_duty_of_care_register (
  id               uuid primary key default gen_random_uuid(),
  intake_id        uuid references public.act_intake(id) on delete set null,
  site             text not null,
  project_code     text not null,
  form_type        text not null,
  submitter_email  text,
  submitter_name   text,
  reason           text not null,
  payload          jsonb not null,
  -- Who is looking after this. Nullable on write: the row must land even when nobody
  -- has been assigned yet, because an unassigned duty-of-care row is exactly the thing
  -- that must still be visible.
  assigned_to      text,
  acknowledged_at  timestamptz,
  closed_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists act_doc_register_open_idx
  on public.act_duty_of_care_register (created_at)
  where closed_at is null;

drop trigger if exists act_doc_register_touch_updated_at on public.act_duty_of_care_register;
create trigger act_doc_register_touch_updated_at
  before update on public.act_duty_of_care_register
  for each row execute function public.act_intake_touch_updated_at();

alter table public.act_duty_of_care_register enable row level security;
revoke all on table public.act_duty_of_care_register from anon, authenticated;

comment on table public.act_duty_of_care_register is
  'People the intake spine deliberately kept out of GHL. Service-role only; no anon or authenticated path exists by design.';

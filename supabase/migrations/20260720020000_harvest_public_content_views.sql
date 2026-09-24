-- Public-safe Harvest surfaces over ACT's shared operational data.
-- These views intentionally expose no contact details, drafts, failures or private metrics.

-- Runs with the owner's rights on purpose: anon has no grant on social_posts, so this view
-- is the filter. It exposes published Harvest posts only, never drafts or metrics.
create or replace view public.v_harvest_public_social_posts as
select
  id,
  platform,
  account_name,
  post_type,
  message,
  permalink,
  published_at,
  media
from public.social_posts
where project_code = 'ACT-HV'
  and status = 'published'
  and published_at <= now();

-- security_invoker: the caller's RLS on social_posts applies, so only operators in the
-- owning organisation see these metrics.
create or replace view public.v_harvest_social_performance
with (security_invoker = true) as
select
  date_trunc('month', published_at)::date as month,
  platform,
  count(*)::integer as published_posts,
  count(distinct md5(coalesce(message, '')))::integer as unique_messages,
  sum(coalesce((metrics ->> 'like')::integer, 0))::integer as likes,
  sum(coalesce((metrics ->> 'comment')::integer, 0))::integer as comments,
  sum(coalesce((metrics ->> 'share')::integer, 0))::integer as shares
from public.social_posts
where project_code = 'ACT-HV'
  and status = 'published'
group by date_trunc('month', published_at)::date, platform;

create or replace view public.v_harvest_upcoming_events as
select
  id,
  title,
  date,
  time,
  location,
  category,
  description,
  created_at,
  updated_at
from public.harvest_events
where status = 'approved'
  and date >= current_date;

-- v_harvest_public_stories removed at review (2026-09-25): it published participant names
-- with no consent filter. Add it back only once it filters on a verified consent column
-- and has passed consent-check.

revoke all on public.v_harvest_public_social_posts from public;
revoke all on public.v_harvest_social_performance from public;
revoke all on public.v_harvest_upcoming_events from public;

grant select on public.v_harvest_public_social_posts to anon, authenticated, service_role;
grant select on public.v_harvest_upcoming_events to anon, authenticated, service_role;
grant select on public.v_harvest_social_performance to authenticated, service_role;

comment on view public.v_harvest_public_social_posts is
  'Published Harvest social posts safe for public website use.';
comment on view public.v_harvest_social_performance is
  'Private monthly Harvest social performance rollup for ACT operators.';

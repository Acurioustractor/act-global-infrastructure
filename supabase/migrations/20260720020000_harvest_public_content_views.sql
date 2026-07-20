-- Public-safe Harvest surfaces over ACT's shared operational data.
-- These views intentionally expose no contact details, drafts, failures or private metrics.

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

create or replace view public.v_harvest_social_performance as
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

create or replace view public.v_harvest_public_stories as
select
  id,
  title,
  slug,
  coalesce(excerpt, summary) as excerpt,
  participant_name,
  location,
  themes,
  story_type,
  featured_image_url,
  published_at,
  is_featured
from public.stories
where (is_published = true or status = 'published')
  and coalesce(visibility, 'public') = 'public'
  and tags && array['harvest', 'the-harvest', 'act-hv']::text[];

revoke all on public.v_harvest_public_social_posts from public;
revoke all on public.v_harvest_social_performance from public;
revoke all on public.v_harvest_upcoming_events from public;
revoke all on public.v_harvest_public_stories from public;

grant select on public.v_harvest_public_social_posts to anon, authenticated, service_role;
grant select on public.v_harvest_upcoming_events to anon, authenticated, service_role;
grant select on public.v_harvest_public_stories to anon, authenticated, service_role;
grant select on public.v_harvest_social_performance to authenticated, service_role;

comment on view public.v_harvest_public_social_posts is
  'Published Harvest social posts safe for public website use.';
comment on view public.v_harvest_social_performance is
  'Private monthly Harvest social performance rollup for ACT operators.';

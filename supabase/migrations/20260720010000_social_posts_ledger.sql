-- Canonical read-only social post ledger for ACT dashboards and reporting.

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  project_code text,
  platform text not null,
  source text not null,
  source_account_id text,
  source_post_id text not null,
  account_name text,
  status text,
  post_type text,
  message text,
  permalink text,
  published_at timestamptz,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  media jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  source_metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_posts_source_post_unique unique (source, source_post_id),
  constraint social_posts_platform_check check (
    platform in ('facebook', 'instagram', 'linkedin', 'google', 'youtube',
                 'bluesky', 'threads', 'tiktok', 'pinterest', 'other')
  ),
  constraint social_posts_source_check check (
    source in ('ghl', 'meta_api', 'linkedin_api', 'manual_import')
  )
);

create index if not exists social_posts_org_published_idx
  on public.social_posts (organization_id, published_at desc);
create index if not exists social_posts_project_published_idx
  on public.social_posts (project_id, published_at desc);
create index if not exists social_posts_platform_published_idx
  on public.social_posts (platform, published_at desc);

alter table public.social_posts enable row level security;

grant select on public.social_posts to authenticated;
grant all on public.social_posts to service_role;

drop policy if exists social_posts_authenticated_read on public.social_posts;
create policy social_posts_authenticated_read
  on public.social_posts for select to authenticated
  using (
    organization_id in (
      select po.organization_id
      from public.organizations_profiles po
      where po.public_profile_id = (select auth.uid())
    )
  );

drop policy if exists social_posts_service_role on public.social_posts;
create policy social_posts_service_role
  on public.social_posts for all to service_role
  using (true) with check (true);

comment on table public.social_posts is
  'Canonical read-only ledger of social posts imported from GHL, Meta, LinkedIn, or reviewed manual exports.';

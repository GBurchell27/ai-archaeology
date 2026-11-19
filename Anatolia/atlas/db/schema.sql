-- Accounts for the atlas: saved sites and votes. See docs/accounts.md.
-- Run once on the Neon database, after Neon Auth is enabled (it makes the neon_auth schema this file refers to).
-- It stores an owner id and a site id per row, nothing else: no coordinates, no names, no free text.
-- There is no row level security: the browser never reaches these tables. The atlas's own server routes
-- (app/api/account) do, and every statement they run names the signed-in visitor (lib/account/accountQueries.ts).

-- A site id as the atlas writes it (lib/account/accountSiteId.ts): a Wikidata Q-number or a lower-case slug,
-- at most 80 characters, and not an OpenStreetMap record.
create or replace function public.is_atlas_site_id(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select char_length(candidate) <= 80
    and candidate ~ '^(Q[0-9]+|[a-z0-9]+(-[a-z0-9]+)*)$'
    and candidate !~ '^osm-';
$$;

-- neon_auth."user" is the table Neon Auth keeps its accounts in. Deleting an account deletes its rows here.
create table public.saved_sites (
  user_id uuid not null references neon_auth."user" (id) on delete cascade,
  site_id text not null check (public.is_atlas_site_id(site_id)),
  status text not null check (status in ('want', 'visited')),
  created_at timestamptz not null default now(),
  primary key (user_id, site_id)
);

create table public.site_votes (
  user_id uuid not null references neon_auth."user" (id) on delete cascade,
  site_id text not null check (public.is_atlas_site_id(site_id)),
  created_at timestamptz not null default now(),
  primary key (user_id, site_id)
);

-- The public vote list counts rows per site.
create index site_votes_site_id on public.site_votes (site_id);

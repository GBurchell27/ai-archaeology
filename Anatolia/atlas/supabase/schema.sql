-- Accounts for the atlas: saved sites and votes. See docs/accounts.md.
-- Run once in the SQL editor of a new Supabase project. It stores an owner id and a site id per row, nothing else:
-- no coordinates, no names, no free text.

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

create table public.saved_sites (
  user_id uuid not null references auth.users (id) on delete cascade,
  site_id text not null check (public.is_atlas_site_id(site_id)),
  status text not null check (status in ('want', 'visited')),
  created_at timestamptz not null default now(),
  primary key (user_id, site_id)
);

create table public.site_votes (
  user_id uuid not null references auth.users (id) on delete cascade,
  site_id text not null check (public.is_atlas_site_id(site_id)),
  created_at timestamptz not null default now(),
  primary key (user_id, site_id)
);

-- Row level security: a signed-in visitor reads and writes only their own rows. A visitor who is not signed in reaches neither table.
alter table public.saved_sites enable row level security;
alter table public.site_votes enable row level security;

revoke all on public.saved_sites, public.site_votes from anon, authenticated;
grant select, insert, update, delete on public.saved_sites to authenticated;
grant select, insert, delete on public.site_votes to authenticated;

create policy "read own saved sites" on public.saved_sites
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "add own saved sites" on public.saved_sites
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "change own saved sites" on public.saved_sites
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "remove own saved sites" on public.saved_sites
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "read own votes" on public.site_votes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "add own votes" on public.site_votes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "remove own votes" on public.site_votes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- The public leaderboard. It runs as its owner, so it can count every visitor's votes, and it returns
-- a site id and a total only: never who voted.
create or replace function public.site_vote_counts(max_sites integer default 50)
returns table (site_id text, votes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select vote.site_id, count(*) as votes
  from public.site_votes as vote
  group by vote.site_id
  order by votes desc, vote.site_id
  limit least(greatest(coalesce(max_sites, 50), 1), 200);
$$;

revoke all on function public.site_vote_counts(integer) from public;
grant execute on function public.site_vote_counts(integer) to anon, authenticated;

-- Apply after 202609160004_categories.sql. Stores per-user Expo push tokens.
begin;
create table public.push_tokens (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 expo_token text not null unique check (expo_token like 'ExponentPushToken[%]' or expo_token like 'ExpoPushToken[%]'),
 platform text not null check (platform in ('android','ios')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index push_tokens_user_id on public.push_tokens(user_id);
alter table public.push_tokens enable row level security;
create policy push_tokens_read_own on public.push_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy push_tokens_insert_own on public.push_tokens for insert to authenticated with check (user_id = (select auth.uid()));
create policy push_tokens_update_own on public.push_tokens for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_tokens_delete_own on public.push_tokens for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.push_tokens from anon, authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;
create table public.push_deliveries (
 event_key text primary key,
 created_at timestamptz not null default now()
);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon, authenticated;
commit;
-- Stores the signed-in candidate's selected app appearance.
begin;
alter table public.profiles add column appearance text not null default 'light'
  check (appearance in ('light','dark'));
grant update(appearance) on public.profiles to authenticated;
commit;

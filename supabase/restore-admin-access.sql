-- Restore admin access for the account UID supplied by the project owner.
-- Run in Supabase SQL Editor. Does not change passwords or delete accounts.
begin;
do $$
begin
 if not exists (
  select 1 from auth.users
  where id = '9595a134-f904-4ad4-aaf0-0c56121df642'::uuid
 ) then
  raise exception 'This User UID does not exist in this project. Copy the correct UID from Authentication > Users.';
 end if;
end $$;
insert into public.staff_roles (user_id, role)
values ('9595a134-f904-4ad4-aaf0-0c56121df642', 'admin')
on conflict (user_id) do update set role = excluded.role;
commit;

-- Sign in to Elladria using the email returned below.
select u.id as user_uid, u.email as sign_in_email, r.role,
       u.email_confirmed_at is not null as email_confirmed
from auth.users u
join public.staff_roles r on r.user_id = u.id
where u.id = '9595a134-f904-4ad4-aaf0-0c56121df642'::uuid;

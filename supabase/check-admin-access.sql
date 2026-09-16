-- Read-only check for the admin account. No password or token is returned.
select
 u.id,
 u.email,
 u.email_confirmed_at is not null as email_confirmed,
 coalesce(length(u.encrypted_password),0)>0 as password_is_set,
 exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='email') as email_identity_exists,
 r.role,
 u.banned_until
from auth.users u
left join public.staff_roles r on r.user_id=u.id
where u.id='9595a134-f904-4ad4-aaf0-0c56121df642';

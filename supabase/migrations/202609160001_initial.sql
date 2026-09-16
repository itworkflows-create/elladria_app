-- Run once in Supabase SQL Editor. No existing local data is imported.
begin;
create table public.staff_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('admin','recruiter'))
);
alter table public.staff_roles enable row level security;
create policy own_role on public.staff_roles for select to authenticated using (user_id = (select auth.uid()));
create function public.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.staff_roles where user_id = (select auth.uid()));
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default '' check (length(name) <= 160),
 phone text not null default '' check (length(phone) <= 40),
 created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy profile_read on public.profiles for select to authenticated using (id = (select auth.uid()) or (select public.is_staff()));
create policy profile_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create table public.jobs (
 id text primary key,
 title text not null check(length(title) between 1 and 120),
 company text not null, city text not null, country text not null,
 salary text not null, category text not null, description text not null,
 hours text not null, accommodation text not null, benefits text not null, contract text not null,
 openings integer not null check(openings between 1 and 100000),
 requirements text[] not null check(cardinality(requirements) between 1 and 30),
 icon text not null default 'business-outline' check(icon in ('business-outline','bed-outline','cube-outline')),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 featured boolean not null default false,
 updated_at timestamptz not null default now(),
 check(not featured or status = 'published')
);
create unique index jobs_one_featured on public.jobs(featured) where featured;
alter table public.jobs enable row level security;
create policy jobs_public on public.jobs for select to anon, authenticated using(status = 'published');
create policy jobs_staff on public.jobs for all to authenticated using((select public.is_staff())) with check((select public.is_staff()));
create table public.app_settings (
 id boolean primary key default true check(id),
 content jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy settings_read on public.app_settings for select to anon, authenticated using(true);
create policy settings_staff on public.app_settings for all to authenticated using((select public.is_staff())) with check((select public.is_staff()));
insert into public.app_settings(content) values ('{"heroTitle":"Find your opportunity in Romania","heroDescription":"Explore jobs, plan your office visit, and take the next step in your career.","announcementEnabled":false,"announcementTitle":"","announcementBody":"","supportEmail":"","supportPhone":""}');
create table public.applications (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.profiles(id) on delete cascade,
 job_id text not null references public.jobs(id),
 status text not null default 'Submitted' check(status in ('Submitted','Reviewing','Shortlisted','Rejected')),
 created_at timestamptz not null default now(),
 unique(customer_id, job_id)
);
alter table public.applications enable row level security;
create policy application_read on public.applications for select to authenticated using(customer_id = (select auth.uid()) or (select public.is_staff()));
create policy application_insert on public.applications for insert to authenticated with check(customer_id = (select auth.uid()) and status = 'Submitted' and exists(select 1 from public.jobs where id = job_id and status = 'published'));
create policy application_update on public.applications for update to authenticated using((select public.is_staff())) with check((select public.is_staff()));
create table public.appointments (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.profiles(id) on delete cascade,
 office text not null, date date not null, time time not null,
 reason text not null, notes text not null default '',
 status text not null default 'Upcoming' check(status in ('Upcoming','Completed','Cancelled')),
 created_at timestamptz not null default now()
);
alter table public.appointments enable row level security;
create policy appointment_read on public.appointments for select to authenticated using(customer_id = (select auth.uid()) or (select public.is_staff()));
create policy appointment_insert on public.appointments for insert to authenticated with check(customer_id = (select auth.uid()) and status = 'Upcoming' and date >= current_date);
create policy appointment_update on public.appointments for update to authenticated using((select public.is_staff())) with check((select public.is_staff()));
revoke all on public.staff_roles, public.profiles, public.jobs, public.app_settings, public.applications, public.appointments from anon, authenticated;
grant select on public.jobs, public.app_settings to anon;
grant select on public.staff_roles to authenticated;
grant select, insert, update on public.profiles, public.applications, public.appointments to authenticated;
grant select, insert, update, delete on public.jobs, public.app_settings to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('candidate-documents','candidate-documents',false,10485760,array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
create policy document_read on storage.objects for select to authenticated using(bucket_id = 'candidate-documents' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_staff())));
create policy document_insert on storage.objects for insert to authenticated with check(bucket_id = 'candidate-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy document_delete on storage.objects for delete to authenticated using(bucket_id = 'candidate-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;

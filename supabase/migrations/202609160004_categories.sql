-- Admin-managed category choices, preserving existing job category names.
begin;
create table public.job_categories (
 name text primary key check (length(trim(name)) between 1 and 80 and name=trim(name))
);
create unique index job_categories_case_unique on public.job_categories(lower(name));
insert into public.job_categories(name)
 select distinct on (lower(trim(category))) trim(category) from public.jobs
 order by lower(trim(category)),trim(category);
insert into public.job_categories(name) select v from unnest(array['Manufacturing','Hospitality','Logistics']) v
 where not exists(select 1 from public.job_categories c where lower(c.name)=lower(v));
update public.jobs j set category=c.name from public.job_categories c where lower(trim(j.category))=lower(c.name);
alter table public.job_categories enable row level security;
create policy categories_read on public.job_categories for select to anon,authenticated using(true);
revoke all on public.job_categories from anon,authenticated;
grant select on public.job_categories to anon,authenticated;
alter table public.jobs add constraint jobs_category_managed foreign key(category)
 references public.job_categories(name) on update cascade;

create or replace function public.read_catalog() returns jsonb language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object('revision',s.revision,'content',s.content,'updatedAt',s.updated_at,
 'categories',coalesce((select jsonb_agg(name order by name) from public.job_categories),'[]'::jsonb),
 'jobs',coalesce((select jsonb_agg((to_jsonb(j)-'updated_at'-'image_id') || jsonb_build_object('updatedAt',j.updated_at,'imageId',j.image_id) order by j.updated_at desc) from public.jobs j),'[]'::jsonb))
 from public.app_settings s where id=true;
$$;
create function public.manage_category(expected_revision bigint, operation text, name text, previous_name text default null)
 returns void language plpgsql security definer set search_path = '' as $$
declare current_revision bigint; clean_name text=trim(name);
begin
 if not coalesce(public.is_staff(),false) then raise exception 'Staff access required.'; end if;
 select revision into current_revision from public.app_settings where id=true for update;
 if expected_revision is distinct from current_revision then raise exception 'The catalog changed. Reload latest data before saving.'; end if;
 if clean_name is null or length(clean_name) not between 1 and 80 or lower(clean_name)='all' then raise exception 'Use a category name of 1-80 characters other than All.'; end if;
 if operation='create' then insert into public.job_categories values(clean_name);
 elsif operation='rename' then
  update public.job_categories set name=clean_name where job_categories.name=previous_name;
  if not found then raise exception 'Category no longer exists.'; end if;
 elsif operation='delete' then
  if exists(select 1 from public.jobs where category=clean_name) then raise exception 'This category is used by jobs. Reassign those jobs before removing it.'; end if;
  delete from public.job_categories where job_categories.name=clean_name;
  if not found then raise exception 'Category no longer exists.'; end if;
 else raise exception 'Unsupported category operation.';
 end if;
 update public.app_settings set revision=revision+1,updated_at=now() where id=true;
end $$;
revoke all on function public.manage_category(bigint,text,text,text) from public;
grant execute on function public.manage_category(bigint,text,text,text) to authenticated;
commit;

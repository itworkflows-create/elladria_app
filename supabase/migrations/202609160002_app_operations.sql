-- Apply after 202609160001_initial.sql. Adds the operations used by the app.
begin;
alter table public.app_settings add column revision bigint not null default 1;
alter table public.jobs add column image_id uuid;
alter table public.profiles add column email text not null default '';
alter table public.applications add column job_title text not null default '';
alter table public.applications add column company text not null default '';

-- Email comes from Auth, never a client-supplied profile field.
create function public.sync_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,name,phone,email)
 values(new.id, left(coalesce(new.raw_user_meta_data->>'name',''),160),
 left(coalesce(new.raw_user_meta_data->>'phone',''),40),coalesce(new.email,''))
 on conflict(id) do update set email=excluded.email;
 return new;
end $$;
revoke all on function public.sync_profile() from public;
create trigger sync_auth_profile after insert or update of email on auth.users for each row execute function public.sync_profile();
insert into public.profiles(id,name,phone,email)
 select id,left(coalesce(raw_user_meta_data->>'name',''),160),left(coalesce(raw_user_meta_data->>'phone',''),40),coalesce(email,'') from auth.users
 on conflict(id) do update set email=excluded.email;
revoke insert,update on public.profiles from authenticated;
grant update(name,phone) on public.profiles to authenticated;

create function public.application_snapshot() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 select title,company into new.job_title,new.company from public.jobs where id=new.job_id and status='published';
 if not found then raise exception 'This vacancy is no longer available.'; end if;
 new.created_at=now();
 return new;
end $$;
revoke all on function public.application_snapshot() from public;
create trigger snapshot_job before insert on public.applications for each row execute function public.application_snapshot();
revoke update on public.applications from authenticated;
grant update(status) on public.applications to authenticated;

create unique index appointments_office_slot on public.appointments(office,date,time) where status='Upcoming';
create unique index appointments_customer_slot on public.appointments(customer_id,date,time) where status='Upcoming';
create function public.check_booking() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.office not in ('Colombo HQ','Kandy Branch','Galle Branch')
 or new.time not in ('09:00'::time,'10:00'::time,'10:30'::time,'11:30'::time,'14:00'::time)
 or new.date <= (now() at time zone 'Asia/Colombo')::date
 or new.date > (now() at time zone 'Asia/Colombo')::date + 28
 or extract(isodow from new.date)>5
 or new.reason not in ('Visa Consultation','Document Submission','Interview Preparation','Other Inquiry')
 or length(new.notes)>500 then raise exception 'Choose a valid office, weekday, time and reason within the next four weeks.'; end if;
 new.created_at=now(); return new;
end $$;
revoke all on function public.check_booking() from public;
create trigger check_booking before insert on public.appointments for each row execute function public.check_booking();
revoke update on public.appointments from authenticated;
grant update(status) on public.appointments to authenticated;
create function public.cancel_appointment(appointment_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 update public.appointments set status='Cancelled' where id=appointment_id and customer_id=(select auth.uid()) and status='Upcoming';
 if not found then raise exception 'Appointment is no longer available to cancel.'; end if;
end $$;
revoke all on function public.cancel_appointment(uuid) from public;
grant execute on function public.cancel_appointment(uuid) to authenticated;

-- A single snapshot keeps jobs and their optimistic-lock revision consistent.
create function public.read_catalog() returns jsonb language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object('revision',s.revision,'content',s.content,'updatedAt',s.updated_at,
 'jobs',coalesce((select jsonb_agg((to_jsonb(j)-'updated_at'-'image_id') || jsonb_build_object('updatedAt',j.updated_at,'imageId',j.image_id) order by j.updated_at desc) from public.jobs j),'[]'::jsonb))
 from public.app_settings s where id=true;
$$;
revoke all on function public.read_catalog() from public;
grant execute on function public.read_catalog() to anon,authenticated;

-- All catalog writes serialize on the settings row and reject stale revisions.
revoke insert,update,delete on public.jobs,public.app_settings from authenticated;
create function public.write_catalog(expected_revision bigint, operation text, payload jsonb) returns void
 language plpgsql security definer set search_path = '' as $$
declare current_revision bigint; j public.jobs; jobid text;
begin
 if not coalesce(public.is_staff(),false) then raise exception 'Staff access required.'; end if;
 select revision into current_revision from public.app_settings where id=true for update;
 if expected_revision is distinct from current_revision then raise exception 'The catalog changed. Reload latest data before saving.'; end if;
 if operation='content' then
  if jsonb_typeof(payload) is distinct from 'object'
   or coalesce(length(trim(payload->>'heroTitle')),0) not between 1 and 120
   or coalesce(length(trim(payload->>'heroDescription')),0) not between 1 and 500
   or jsonb_typeof(payload->'announcementEnabled') is distinct from 'boolean'
   or length(coalesce(payload->>'announcementTitle',''))>120
   or length(coalesce(payload->>'announcementBody',''))>1000
   or length(coalesce(payload->>'supportEmail',''))>160
   or length(coalesce(payload->>'supportPhone',''))>40 then raise exception 'Invalid app content.'; end if;
  update public.app_settings set content=payload where id=true;
 elsif operation='delete' then
  delete from public.jobs where id=payload->>'id' and status<>'published';
  if not found then raise exception 'Only an existing unpublished job can be deleted.'; end if;
 elsif operation in ('create','update') then
  j=jsonb_populate_record(null::public.jobs,(payload-'updatedAt'-'imageId') || jsonb_build_object('updated_at',now(),'image_id',payload->'imageId'));
  if j.id !~ '^[a-zA-Z0-9_-]{1,80}$' or j.id is null then raise exception 'Invalid job ID.'; end if;
  if j.featured then update public.jobs set featured=false where featured; end if;
  if operation='create' then insert into public.jobs select j.*;
  else
   update public.jobs set title=j.title,company=j.company,city=j.city,country=j.country,salary=j.salary,
   category=j.category,description=j.description,hours=j.hours,accommodation=j.accommodation,benefits=j.benefits,
   contract=j.contract,openings=j.openings,requirements=j.requirements,icon=j.icon,status=j.status,
   featured=j.featured,updated_at=now(),image_id=j.image_id where id=j.id;
   if not found then raise exception 'Job no longer exists.'; end if;
  end if;
 else raise exception 'Unsupported catalog operation.';
 end if;
 update public.app_settings set revision=revision+1,updated_at=now() where id=true;
end $$;
revoke all on function public.write_catalog(bigint,text,jsonb) from public;
grant execute on function public.write_catalog(bigint,text,jsonb) to authenticated;

-- Read document metadata through existing Storage policies. Paths are user UUID/kind/unique filename.
create function public.list_documents() returns table(id text,owner_id text,name text,mime text,size bigint,kind text,created_at timestamptz)
 language sql stable security invoker set search_path = '' as $$
 select o.name,split_part(o.name,'/',1),substring(split_part(o.name,'/',3) from 38),
 coalesce(o.metadata->>'mimetype','application/octet-stream'),coalesce((o.metadata->>'size')::bigint,0),
 split_part(o.name,'/',2),o.created_at from storage.objects o where bucket_id='candidate-documents';
$$;
revoke all on function public.list_documents() from public;
grant execute on function public.list_documents() to authenticated;

-- Job images are publicly visible; upload only material intended for publication.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('job-images','job-images',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy job_images_staff_insert on storage.objects for insert to authenticated
 with check(bucket_id='job-images' and (select public.is_staff()));
create policy job_images_staff_read on storage.objects for select to authenticated
 using(bucket_id='job-images' and (select public.is_staff()));
create function public.new_upload_id() returns uuid language sql volatile set search_path = '' as $$ select gen_random_uuid(); $$;
revoke all on function public.new_upload_id() from public;
grant execute on function public.new_upload_id() to authenticated;
commit;


import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase, adminSupabase, cloudEnabled } from './supabase';
import { validateContent, validateJob, type Catalog } from './catalog';
import type { CustomerData, AdminActivity, Upload } from './customerTypes';
import { Platform } from 'react-native';
import { customerAuthError } from './sessionPolicy';

type Row = Record<string, any>;
function client(admin = false): SupabaseClient {
  const value = admin ? adminSupabase : supabase;
  if (!value) throw Error('Supabase configuration is missing.');
  return value;
}
export function checked<T extends { data?: unknown; error: { message: string; code?: string } | null }>(result: T): NonNullable<T["data"]> {
  if (result.error) {
    const code = result.error.code;
    throw Error(code === '23505' ? 'This record or appointment slot already exists. Refresh and try again.'
      : code === '23503' ? 'This record is used by an application. Archive the job instead.'
      : result.error.message);
  }
  return result.data as NonNullable<T["data"]>;
}
export async function cloudCatalog(admin = false, signal?: AbortSignal): Promise<Catalog> {
  let query = client(admin).rpc('read_catalog');
  if (signal) query = query.abortSignal(signal);
  const data = checked(await query);
  if (!data || !Array.isArray(data.jobs) || !Number.isSafeInteger(data.revision))
    throw Error('Cloud database setup is incomplete. Apply the app operations migration.');
  return data as Catalog;
}
export async function staffSession() {
  const c = client(true);
  const { data, error } = await c.auth.getUser();
  if (error || !data.user) throw Error('Sign in with your staff account.');
  const role = checked(await c.from('staff_roles').select('role').eq('user_id', data.user.id).maybeSingle());
  if (!role) throw Error(`This account has no staff access. Signed in as ${data.user.email || 'unknown email'}. User UID: ${data.user.id}. Assign a staff role to this exact UID in Supabase, then sign in again.`);
  return data.user;
}
const profile = (r: Row) => ({ id:r.id, name:r.name, phone:r.phone, email:r.email, createdAt:r.created_at });
const application = (r: Row) => ({ id:r.id, customerId:r.customer_id, jobId:r.job_id,
  jobTitle:r.job_title, company:r.company, status:r.status, createdAt:r.created_at });
const appointment = (r: Row) => ({ id:r.id, customerId:r.customer_id, office:r.office, date:r.date,
  time:r.time.slice(0,5), reason:r.reason, notes:r.notes, status:r.status, candidate:'', createdAt:r.created_at });
const document = (r: Row): Upload => ({ id:r.id, ownerId:r.owner_id, name:r.name, mime:r.mime,
  size:Number(r.size), kind:r.kind, createdAt:r.created_at });
async function records(admin = false) {
  const c = client(admin);
  const results = await Promise.all([
    c.from('profiles').select('*'), c.from('applications').select('*'),
    c.from('appointments').select('*'), c.rpc('list_documents'),
  ]);
  const [p,a,b,f] = results.map(result => checked(result) as Row[]);
  return { customers:p.map(profile), applications:a.map(application),
    appointments:b.map(appointment), files:f.map(document) } as AdminActivity;
}
export async function cloudCustomerData(): Promise<CustomerData> {
  const c = client();
  const { data, error } = await c.auth.getUser();
  const authError = customerAuthError(error, !!data.user);
  if (authError) throw authError;
  const all = await records();
  const ownProfile = all.customers.find(p => p.id === data.user!.id);
  if (!ownProfile) throw Error('Your profile is not ready. Apply the app operations migration.');
  return {profile:ownProfile, applications:all.applications.filter(r=>r.customerId===data.user!.id),
    appointments:all.appointments.filter(r=>r.customerId===data.user!.id), files:all.files.filter(r=>r.ownerId===data.user!.id)};
}
export async function cloudAuthenticate(mode: 'register'|'login', fields: Record<string,string>) {
  const c = client();
  if (mode === 'register') {
    const result = await c.auth.signUp({email:fields.email.trim(),password:fields.password,
      options:{data:{name:fields.name.trim(),phone:fields.phone.trim()}}});
    checked(result);
    if (!result.data.session) return false;
  } else checked(await c.auth.signInWithPassword({email:fields.email.trim(),password:fields.password}));
  return true;
}
export async function cloudCustomerRequest(route: string, init: RequestInit = {}) {
  const c = client();
  if (route === '/logout') { checked(await c.auth.signOut()); return null; }
  if (route === '/me') return cloudCustomerData();
  const user = checked(await c.auth.getUser()).user;
  if (!user) throw Object.assign(Error('Sign in to continue.'), {status:401});
  if (route === '/files' && init.method === 'POST') {
    const h = new Headers(init.headers);
    const mime = h.get('Content-Type') || '';
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mime))
      throw Error('Choose a PDF, JPG or PNG file.');
    if (!(init.body instanceof ArrayBuffer) || init.body.byteLength === 0 || init.body.byteLength > 5 * 1024 * 1024)
      throw Error('Choose a non-empty file up to 5 MB.');
    const kind = h.get('X-File-Kind');
    if (kind !== 'CV' && kind !== 'Document') throw Error('Invalid document kind.');
    const name = decodeURIComponent(h.get('X-File-Name') || 'document').replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,160);
    const id = checked(await c.rpc('new_upload_id')) as string;
    checked(await c.storage.from('candidate-documents').upload(`${user.id}/${kind}/${id}-${name}`,
      init.body as ArrayBuffer, { contentType:h.get('Content-Type') || 'application/octet-stream', upsert:false }));
  } else if (route.startsWith('/files/') && init.method === 'DELETE') {
    checked(await c.storage.from('candidate-documents').remove([route.slice('/files/'.length)]));
  } else {
    const body = init.body ? JSON.parse(String(init.body)) : {};
    if (route === '/applications' && init.method === 'POST')
      checked(await c.from('applications').insert({customer_id:user.id,job_id:body.jobId}));
    else if (route === '/appointments' && init.method === 'POST')
      checked(await c.from('appointments').insert({customer_id:user.id,office:body.office,date:body.date,
        time:body.time,reason:body.reason,notes:body.notes || ''}));
    else if (route.startsWith('/appointments/') && init.method === 'PATCH')
      checked(await c.rpc('cancel_appointment',{appointment_id:route.split('/')[2]}));
    else throw Error('Unsupported customer operation.');
  }
  return cloudCustomerData();
}
export async function adminRequest(route: string, init: RequestInit = {}) {
  if (!cloudEnabled) {
    const response = await fetch(route, {credentials:'same-origin', signal:AbortSignal.timeout(12000),...init});
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'Request failed.');
    return result;
  }
  const c = client(true);
  if (route === '/api/admin/session') return {token:(await staffSession()).id};
  if (route === '/api/admin/catalog') return cloudCatalog(true);
  if (route === '/api/admin/activity') return records(true);
  if (route === '/api/admin/categories') {
    const body=JSON.parse(String(init.body || '{}'));
    checked(await c.rpc('manage_category',{expected_revision:body.revision,operation:body.operation,
      name:body.name,previous_name:body.previousName || null}));
    return cloudCatalog(true);
  }
  if (route === '/api/admin/uploads') {
    const h = new Headers(init.headers);
    const id = checked(await c.rpc('new_upload_id')) as string;
    checked(await c.storage.from('job-images').upload(id, init.body as Blob,
      {contentType:h.get('Content-Type') || 'image/jpeg', upsert:false}));
    return {id};
  }
  const body = JSON.parse(String(init.body || '{}'));
  if (route.startsWith('/api/admin/jobs/') || route === '/api/admin/content') {
    const operation = route.endsWith('/content') ? 'content' : init.method === 'DELETE' ? 'delete' : body.create ? 'create':'update';
    const payload = operation === 'content' ? validateContent(body.content)
      : operation === 'delete' ? {id:decodeURIComponent(route.split('/').pop()!)} : validateJob(body.job);
    checked(await c.rpc('write_catalog',{expected_revision:body.revision,operation,payload}));
    const catalog = await cloudCatalog(true);
    if (operation === 'content' && 'announcementEnabled' in payload && payload.announcementEnabled) {
      const push = await c.functions.invoke('send-notification',{
        body:{kind:'announcement',revision:catalog.revision},
      });
      if (push.error) console.warn('Announcement saved, but push delivery failed:', push.error.message);
    }
    return catalog;
  }
  const match = route.match(/^\/api\/admin\/(applications|appointments)\/([^/]+)$/);
  if (match && init.method === 'PATCH') {
    const rows = checked(await c.from(match[1]).update({status:body.status}).eq('id',match[2])
      .eq('status',body.previousStatus).select('id'));
    if (!rows.length) throw Error('This record changed. Refresh before updating.');
    if (match[1] === 'applications') {
      const push = await c.functions.invoke('send-notification',{
        body:{kind:'application',applicationId:match[2]},
      });
      if (push.error) console.warn('Status updated, but push delivery failed:', push.error.message);
    }
    return {ok:true};
  }
  throw Error('Unsupported admin operation.');
}
export function jobImageUrl(id: string, admin = false) {
  if (cloudEnabled) return client(admin).storage.from('job-images').getPublicUrl(id).data.publicUrl;
  if (admin) return '/api/admin/files/'+id;
  const base = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8093` : '');
  return base.replace(/\/$/,'')+'/api/images/'+id;
}
export async function downloadDocument(id: string) {
  if (!cloudEnabled) { window.location.assign('/api/admin/files/'+id); return; }
  const data = checked(await client(true).storage.from('candidate-documents').createSignedUrl(id,60,{download:true}));
  const a = window.document.createElement('a');
  a.href=data.signedUrl; a.rel='noreferrer'; a.click();
}


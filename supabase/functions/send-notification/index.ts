import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' });
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return reply(503, { error: 'Service unavailable.' });
  const bearer = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!bearer) return reply(401, { error: 'Staff sign-in required.' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const verified = await admin.auth.getUser(bearer);
  const userId = verified.data.user?.id;
  if (verified.error || !userId) return reply(401, { error: 'Staff sign-in required.' });
  const role = await admin.from('staff_roles').select('role').eq('user_id', userId).maybeSingle();
  if (role.error || !role.data) return reply(403, { error: 'Staff access required.' });

  let input: { kind?: string; applicationId?: string; revision?: number };
  try {
    const text = await request.text();
    if (text.length > 2048) return reply(400, { error: 'Invalid request.' });
    input = JSON.parse(text);
  } catch {
    return reply(400, { error: 'Invalid request.' });
  }

  let eventKey = '';
  let userIds: string[] | null = null;
  let title = '';
  let body = '';
  let data: Record<string, string> = {};

  if (input.kind === 'application' && typeof input.applicationId === 'string') {
    const result = await admin.from('applications').select('id,customer_id,job_title,company,status')
      .eq('id', input.applicationId).maybeSingle();
    if (result.error || !result.data) return reply(404, { error: 'Application not found.' });
    const item = result.data;
    eventKey = 'application:' + item.id + ':' + item.status;
    userIds = [item.customer_id];
    title = item.status === 'Submitted' ? 'Application received' : 'Application ' + item.status.toLowerCase();
    body = item.job_title + ' at ' + item.company + ': ' + item.status;
    data = { destination: 'profile', applicationId: item.id };
  } else if (input.kind === 'announcement' && Number.isSafeInteger(input.revision)) {
    const result = await admin.from('app_settings').select('content,revision').eq('id', true).single();
    if (result.error) return reply(503, { error: 'Announcement unavailable.' });
    const content = result.data.content as Record<string, unknown>;
    if (!content.announcementEnabled || typeof content.announcementTitle !== 'string' ||
        typeof content.announcementBody !== 'string' || !content.announcementTitle.trim() ||
        !content.announcementBody.trim()) return reply(200, { ok: true, sent: 0 });
    eventKey = 'announcement:' + result.data.revision;
    title = content.announcementTitle.trim();
    body = content.announcementBody.trim();
    data = { destination: 'home' };
  } else {
    return reply(400, { error: 'Unsupported notification.' });
  }

  const claimed = await admin.from('push_deliveries').insert({ event_key: eventKey });
  if (claimed.error?.code === '23505') return reply(200, { ok: true, duplicate: true, sent: 0 });
  if (claimed.error) return reply(503, { error: 'Notification could not be queued.' });

  let tokenQuery = admin.from('push_tokens').select('id,expo_token');
  if (userIds) tokenQuery = tokenQuery.in('user_id', userIds);
  const tokens = await tokenQuery;
  if (tokens.error) {
    await admin.from('push_deliveries').delete().eq('event_key', eventKey);
    return reply(503, { error: 'Notification recipients unavailable.' });
  }
  if (!tokens.data.length) return reply(200, { ok: true, sent: 0 });

  let sent = 0;
  try {
    for (let offset = 0; offset < tokens.data.length; offset += 100) {
      const batch = tokens.data.slice(offset, offset + 100);
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch.map(row => ({
          to: row.expo_token, title, body, data, sound: 'default',
          channelId: 'elladria-updates', priority: 'high',
        }))),
      });
      if (!response.ok) throw new Error('Expo push service rejected the request.');
      const result = await response.json();
      const tickets = Array.isArray(result.data) ? result.data : [result.data];
      const invalidIds = tickets.flatMap((ticket: { details?: { error?: string } }, index: number) =>
        ticket?.details?.error === 'DeviceNotRegistered' ? [batch[index].id] : []);
      if (invalidIds.length) await admin.from('push_tokens').delete().in('id', invalidIds);
      sent += batch.length - invalidIds.length;
    }
    return reply(200, { ok: true, sent });
  } catch {
    await admin.from('push_deliveries').delete().eq('event_key', eventKey);
    return reply(503, { error: 'Push provider unavailable. Retry the update.' });
  }
});
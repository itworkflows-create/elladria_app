type Entry = { name: string; id: string | null };
type Dependencies = {
  authenticate: (token: string, password: string) => Promise<{ id: string }>;
  isStaff: (id: string) => Promise<boolean>;
  list: (prefix: string) => Promise<Entry[]>;
  remove: (paths: string[]) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
};
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const reply = (status: number, body: object) => new Response(JSON.stringify(body), {status, headers});
export function createDeleteAccountHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, {status:204,headers});
    if (request.method !== 'POST') return reply(405, {error:'Use POST.'});
    const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply(401, {error:'Sign in to delete your account.'});
    let body: {password?: unknown; confirmation?: unknown};
    try {
      const text = await request.text();
      if (text.length > 2048) return reply(400, {error:'Invalid request.'});
      body = JSON.parse(text);
      if (!body || body.confirmation !== 'DELETE' || typeof body.password !== 'string' || !body.password || body.password.length > 128)
        return reply(400, {error:'Enter your password and confirm deletion.'});
    } catch {return reply(400, {error:'Invalid request.'});}
    let user: {id:string};
    try {user = await deps.authenticate(token, body.password as string);}
    catch {return reply(401, {error:'Unable to verify your account. Check your password and sign in again.'});}
    try {
      if (await deps.isStaff(user.id)) return reply(403, {error:'Staff accounts must be managed by the administrator.'});
      let batches = 0;
      async function clean(prefix: string, depth = 0): Promise<void> {
        if (depth > 8) throw new Error('Unexpected document folder depth.');
        while (true) {
          if (++batches > 1000) throw new Error('Too many document batches.');
          const entries = await deps.list(prefix);
          if (!entries.length) return;
          const files: string[] = [];
          for (const entry of entries) {
            if (!entry.name || entry.name.includes('/') || entry.name === '.' || entry.name === '..') throw new Error('Invalid document path.');
            const path = prefix + '/' + entry.name;
            if (entry.id) files.push(path);
            else await clean(path, depth + 1);
          }
          if (files.length) await deps.remove(files);
          // Always reread page zero: deleting shifts the remaining objects.
        }
      }
      await clean(user.id);
      // Auth deletion cascades to profile, applications and appointments.
      await deps.deleteUser(user.id);
      return reply(200, {ok:true});
    } catch {
      return reply(503, {error:'Deletion could not be completed. Some documents may already be removed. Please retry or contact support.'});
    }
  };
}

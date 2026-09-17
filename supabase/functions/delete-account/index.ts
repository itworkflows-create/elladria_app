import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { createDeleteAccountHandler } from './handler.ts';

Deno.serve(async (request: Request) => {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !anonKey) return new Response('Service unavailable', {status:503});
  const options = {auth:{persistSession:false,autoRefreshToken:false}};
  const admin = createClient(url, serviceKey, options);
  const auth = createClient(url, anonKey, options);
  const storage = admin.storage.from('candidate-documents');
  return createDeleteAccountHandler({
    async authenticate(token, password) {
      const verified = await admin.auth.getUser(token);
      if (verified.error || !verified.data.user?.email) throw new Error('Invalid session');
      const signedIn = await auth.auth.signInWithPassword({email:verified.data.user.email,password});
      if (signedIn.error || signedIn.data.user?.id !== verified.data.user.id) throw new Error('Invalid password');
      // The reauthentication client is request-local; revoke its extra session.
      if (signedIn.data.session) await admin.auth.admin.signOut(signedIn.data.session.access_token, 'local');
      return {id:verified.data.user.id};
    },
    async isStaff(id) {
      const result = await admin.from('staff_roles').select('user_id').eq('user_id',id).maybeSingle();
      if (result.error) throw result.error;
      return !!result.data;
    },
    async list(prefix) {
      const result = await storage.list(prefix,{limit:100,offset:0,sortBy:{column:'name',order:'asc'}});
      if (result.error) throw result.error;
      return result.data;
    },
    async remove(paths) {
      const result = await storage.remove(paths);
      if (result.error) throw result.error;
    },
    async deleteUser(id) {
      const result = await admin.auth.admin.deleteUser(id);
      if (result.error) throw result.error;
    },
  })(request);
});

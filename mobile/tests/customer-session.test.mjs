import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise,resolve}; }
const settle = () => new Promise(r => setImmediate(r));
function setup(request) {
  const state=[], effects=[], timers=[]; let auth; let index=0;
  const react = {
    useState: initial => { const i=index++; state[i]=initial; return [initial, value => {state[i]=value;}]; },
    useRef: current => ({current}), useEffect: effect => effects.push(effect),
  };
  const modules={
    react,
    './supabase': {cloudEnabled:true, watchSupabaseAppState:()=>()=>{}, supabase:{auth:{onAuthStateChange:cb=>{auth=cb;return {data:{subscription:{unsubscribe(){}}}};}}}},
    './cloudApi': {cloudCustomerRequest:request},
    'react-native': {Platform:{OS:'android'},AppState:{currentState:'active',addEventListener:()=>({remove(){}})}},
    'expo-secure-store':{}, './api':{},
  };
  const exports={};
  const source=ts.transpileModule(fs.readFileSync(new URL('../src/useCustomer.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports,require:name=>{if(!(name in modules))throw Error(name);return modules[name];},setTimeout:cb=>{timers.push(cb);},setInterval:()=>1,clearInterval(){},clearTimeout(){},AbortController});
  const client=exports.useCustomer();const cleanups=effects.map(effect=>effect());
  return {client,state,auth:(event,id)=>auth(event,id?{user:{id}}:null),flush:()=>{const queued=timers.splice(0);queued.forEach(cb=>cb());},close:()=>cleanups.forEach(fn=>fn?.())};
}
const candidate={profile:{id:'a'},applications:[],appointments:[],files:[]};
test('token refresh preserves data and slow refresh requests do not overlap',async()=>{
  let calls=0;let pending=null;
  const h=setup(async()=>{calls++;return pending?pending.promise:candidate;});
  h.auth('INITIAL_SESSION','a');await settle();h.flush();await settle();
  assert.equal(h.state[0],candidate);
  h.auth('TOKEN_REFRESHED','a');assert.equal(h.state[0],candidate);
  pending=deferred();h.flush();const before=calls;
  await h.client.refresh();assert.equal(calls,before);
  pending.resolve(candidate);await settle();h.close();
});
test('a completed mutation cannot restore private data after sign out',async()=>{
  const mutation=deferred();
  const h=setup(route=>route==='/me'?Promise.resolve(candidate):mutation.promise);
  h.auth('INITIAL_SESSION','a');await settle();h.flush();await settle();
  const operation=h.client.action('/applications',{jobId:'j'});
  h.auth('SIGNED_OUT',null);assert.equal(h.state[0],null);
  mutation.resolve(candidate);await operation;
  assert.equal(h.state[0],null);h.close();
});
test('background refresh cannot overwrite an in-flight application',async()=>{
  const mutation=deferred();let reads=0;
  const h=setup(route=>{if(route==='/me'){reads++;return Promise.resolve(candidate);}return mutation.promise;});
  await settle();const before=reads;
  const operation=h.client.action('/applications',{jobId:'j'});
  await h.client.refresh();assert.equal(reads,before);
  const updated={...candidate,applications:[{id:'application'}]};
  mutation.resolve(updated);await operation;assert.equal(h.state[0],updated);h.close();
});

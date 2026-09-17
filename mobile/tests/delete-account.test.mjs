import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeleteAccountHandler } from '../../supabase/functions/delete-account/handler.ts';
const request = (body={password:'correct-password',confirmation:'DELETE'},token='valid') => new Request('https://example/delete-account',{method:'POST',headers:token?{Authorization:'Bearer '+token}:{},body:JSON.stringify(body)});
function setup(options={}) {
 const files=new Set(Array.from({length:205},(_,i)=>'owner/CV/file-'+i));files.add('owner/Document/passport');files.add('other/CV/private');
 const removed=[],deleted=[];
 const deps={
  authenticate:async(token,password)=>{if(token!=='valid'||password!=='correct-password')throw Error('unauthorized');return {id:'owner'};},
  isStaff:async()=>false,
  list:async prefix=>{
   const entries=new Map();for(const file of files){if(!file.startsWith(prefix+'/'))continue;const part=file.slice(prefix.length+1);const name=part.split('/')[0];entries.set(name,{name,id:part.includes('/')?null:name});}
   return [...entries.values()].slice(0,100);
  },
  remove:async paths=>{paths.forEach(p=>{removed.push(p);files.delete(p);});},
  deleteUser:async id=>{deleted.push(id);},...options,
 };
 return {handler:createDeleteAccountHandler(deps),files,removed,deleted};
}
test('deletion rejects missing sessions, wrong passwords, and missing confirmation without changing data',async()=>{
 const h=setup();
 for(const req of [request(undefined,''),request({password:'wrong',confirmation:'DELETE'}),request({password:'correct-password'})])
  assert.ok((await h.handler(req)).status>=400);
 assert.equal(h.removed.length,0);assert.equal(h.deleted.length,0);
});
test('deletion uses the verified identity, cleans all document pages, and leaves other candidates untouched',async()=>{
 const h=setup();const result=await h.handler(request({password:'correct-password',confirmation:'DELETE',userId:'other'}));
 assert.equal(result.status,200);assert.deepEqual(h.deleted,['owner']);assert.equal(h.removed.length,206);
 assert.deepEqual([...h.files],['other/CV/private']);
});
test('staff accounts are blocked before document deletion',async()=>{
 const h=setup({isStaff:async()=>true});assert.equal((await h.handler(request())).status,403);
 assert.equal(h.removed.length,0);assert.equal(h.deleted.length,0);
});
test('storage failures do not delete the account and report possible partial cleanup',async()=>{
 const h=setup({remove:async()=>{throw Error('storage down');}});const result=await h.handler(request());
 assert.equal(result.status,503);assert.match((await result.json()).error,/Some documents/);assert.equal(h.deleted.length,0);
});
test('unexpected storage paths and failed staff checks fail closed',async()=>{
 for(const options of [{list:async()=>[{name:'../other',id:'x'}]},{isStaff:async()=>{throw Error('db down');}}]){
  const h=setup(options);assert.equal((await h.handler(request())).status,503);assert.equal(h.removed.length,0);assert.equal(h.deleted.length,0);
 }
});
test('preflight is permitted and other HTTP methods cannot delete data',async()=>{
 const h=setup();assert.equal((await h.handler(new Request('https://example',{method:'OPTIONS'}))).status,204);
 assert.equal((await h.handler(new Request('https://example'))).status,405);
 assert.equal(h.deleted.length,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync(new URL('../app.config.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const config=JSON.parse(fs.readFileSync(new URL('../app.json',import.meta.url),'utf8')).expo;
function resolve(env) {const exports={};vm.runInNewContext(source,{exports,process:{env}});return exports.default({config});}
const valid={ELLADRIA_RELEASE:'1',EXPO_PUBLIC_BACKEND:'supabase',EXPO_PUBLIC_SUPABASE_URL:'https://example.supabase.co',EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'};
test('release configuration rejects missing backend, insecure URLs and privileged keys',()=>{
  for(const changes of [
    {EXPO_PUBLIC_BACKEND:'local'}, {EXPO_PUBLIC_SUPABASE_URL:undefined},
    {EXPO_PUBLIC_SUPABASE_URL:'http://example.supabase.co'},
    {EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:undefined},
    {EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_secret_example'},
    {EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_YOUR_KEY'},
  ]) assert.throws(()=>resolve({...valid,...changes}));
});
test('release configuration retains identifiers and plugins; local development remains available',()=>{
  assert.equal(resolve(valid).android.package,config.android.package);
  assert.equal(resolve(valid).plugins,config.plugins);
  assert.equal(resolve({}).slug,config.slug);
});

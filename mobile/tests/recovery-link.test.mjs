import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveryCode } from '../src/recoveryLink.ts';
test('recovery only accepts the app callback or the current web origin and exact route',()=>{
  assert.equal(recoveryCode('elladria://reset-password?code=once'),'once');
  assert.equal(recoveryCode('https://app.example/?recovery=1&code=once','https://app.example'),'once');
  for(const url of ['https://attacker.example/?recovery=1&code=bad','elladria://other?code=bad','elladria://reset-password/other?code=bad','invalid','https://app.example/?code=bad'])
    assert.equal(recoveryCode(url,'https://app.example'),null);
});
test('incomplete and expired callbacks give a recoverable error',()=>{
  assert.throws(()=>recoveryCode('elladria://reset-password'),/incomplete/);
  assert.throws(()=>recoveryCode('elladria://reset-password?error=access_denied'),/expired/);
});

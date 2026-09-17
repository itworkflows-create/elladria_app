import test from 'node:test';
import assert from 'node:assert/strict';
import { customerAuthError } from '../src/sessionPolicy.ts';
test('offline, throttled and unavailable auth services do not sign out the candidate', () => {
  for (const error of [{name:'AuthRetryableFetchError', status:0}, {name:'AbortError'}, {status:429}, {status:503}]) {
    const result = customerAuthError(error, false);
    assert.ok(result instanceof Error);
    assert.notEqual(result.status, 401);
    assert.match(result.message, /connection/);
  }
});
test('missing or revoked sessions require sign in', () => {
  for (const error of [null, {name:'AuthSessionMissingError'}, {status:401}, {code:'session_not_found'}]) {
    assert.equal(customerAuthError(error, false).status, 401);
  }
  assert.equal(customerAuthError(null, true), null);
});

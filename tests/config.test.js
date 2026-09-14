import test from 'node:test';
import assert from 'node:assert/strict';
import { isProductionJwtSecretValid } from '../server/config.js';

test('production rejects missing, short and documented template JWT secrets', () => {
  assert.equal(isProductionJwtSecretValid(undefined), false);
  assert.equal(isProductionJwtSecretValid('too-short'), false);
  assert.equal(isProductionJwtSecretValid('development-only-secret-change-me'), false);
  assert.equal(isProductionJwtSecretValid('replace-with-a-long-random-secret-before-production'), false);
});

test('production accepts a sufficiently long non-template JWT secret', () => {
  assert.equal(isProductionJwtSecretValid('c2f535164493e2ff50a288cbc23fa17a25ac488562a80060'), true);
});

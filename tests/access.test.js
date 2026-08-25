import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageCommunity, isStaff } from '../server/access.js';

test('житель не получает права управления поселком', () => {
  assert.equal(isStaff('resident'), false);
  assert.equal(canManageCommunity('resident'), false);
});

test('председатель и администратор могут управлять поселком', () => {
  assert.equal(canManageCommunity('chairman'), true);
  assert.equal(canManageCommunity('administrator'), true);
  assert.equal(isStaff('board_member'), true);
});

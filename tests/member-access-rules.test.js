import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageRole, membershipState, validPassword } from '../server/services/member-access-rules.js';

test('председатель не может назначить технического администратора', () => {
  assert.equal(canManageRole('chairman', 'board_member'), true);
  assert.equal(canManageRole('chairman', 'administrator'), false);
  assert.equal(canManageRole('administrator', 'administrator'), true);
});

test('состояние доступа учитывает подтверждение и блокировку', () => {
  assert.equal(membershipState({ approvedAt: null, suspendedAt: null }), 'PENDING');
  assert.equal(membershipState({ approvedAt: new Date(), suspendedAt: null }), 'ACTIVE');
  assert.equal(membershipState({ approvedAt: new Date(), suspendedAt: new Date() }), 'SUSPENDED');
});

test('пароль приглашенного участника требует буквы и цифры', () => {
  assert.equal(validPassword('ChangeMe123!'), true);
  assert.equal(validPassword('толькобуквы'), false);
  assert.equal(validPassword('short1'), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { publicMemberProfile } from '../server/services/public-profile.js';

const membership = { id: 'member-1', user: { fullName: 'Мария Иванова', email: 'maria@example.test' }, contactPhone: '+79990000000', publicPhone: false, publicEmail: true, properties: [{ street: 'Калинина', number: '12' }], skills: [{ isPublic: true, skill: { name: 'Массаж' } }, { isPublic: false, skill: { name: 'Бухгалтерия' } }] };

test('каталог не раскрывает точный адрес и скрытые навыки', () => {
  const profile = publicMemberProfile(membership);
  assert.deepEqual(profile.streets, ['Калинина']);
  assert.deepEqual(profile.skills, ['Массаж']);
  assert.equal(profile.contact.phone, null);
  assert.equal(profile.contact.email, 'maria@example.test');
});

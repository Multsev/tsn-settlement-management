import test from 'node:test';
import assert from 'node:assert/strict';
import { clearSession, readSession, saveSession } from '../src/session.js';

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
    has: key => values.has(key)
  };
}

test('сессия сохраняется под новым техническим именем продукта', () => {
  const storage = memoryStorage();
  saveSession({ token: 'new-token' }, storage);
  assert.deepEqual(readSession(storage), { token: 'new-token' });
  assert.equal(storage.has('tsn-management.session'), true);
});

test('старая браузерная сессия бесшовно переносится при переименовании', () => {
  const storage = memoryStorage({ 'prozor.session': JSON.stringify({ token: 'legacy-token' }) });
  assert.deepEqual(readSession(storage), { token: 'legacy-token' });
  assert.equal(storage.has('tsn-management.session'), true);
  assert.equal(storage.has('prozor.session'), false);
  clearSession(storage);
  assert.equal(readSession(storage), null);
});

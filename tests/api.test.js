import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, request } from '../src/api.js';

test('клиент API передает JWT и JSON-тело', async () => {
  let received;
  const result = await request('/issues', {
    token: 'signed-token', method: 'POST', body: { title: 'Фонарь' },
    fetcher: async (_url, options) => { received = options; return new Response(JSON.stringify({ id: '1' }), { status: 201 }); }
  });
  assert.equal(result.id, '1');
  assert.equal(received.headers.Authorization, 'Bearer signed-token');
  assert.equal(received.body, '{"title":"Фонарь"}');
});

test('клиент API сообщает понятную ошибку сервера', async () => {
  await assert.rejects(
    request('/issues', { fetcher: async () => new Response(JSON.stringify({ error: 'Нет доступа' }), { status: 403 }) }),
    error => error instanceof ApiError && error.status === 403 && error.message === 'Нет доступа'
  );
});

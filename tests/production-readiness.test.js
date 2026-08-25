import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('PWA имеет standalone manifest и maskable-иконку', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url)));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
});

test('service worker не кэширует приватные API-ответы', async () => {
  const worker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  const apiBranch = worker.slice(worker.indexOf("url.pathname.startsWith('/api/')"), worker.indexOf("request.mode === 'navigate'"));
  assert.match(apiBranch, /fetch\(request\)/);
  assert.doesNotMatch(apiBranch, /cache\.put|caches\.open/);
});

test('production-контейнер имеет readiness и миграции при старте', async () => {
  const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
  const entrypoint = await readFile(new URL('../scripts/docker-entrypoint.sh', import.meta.url), 'utf8');
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(dockerfile, /USER node/);
  assert.match(entrypoint, /prisma migrate deploy/);
  assert.match(entrypoint, /exec node server\/index\.js/);
});
